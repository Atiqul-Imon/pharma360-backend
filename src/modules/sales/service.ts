import { Types } from 'mongoose';
import { getTenantModels } from '../../database/index.js';
import { mongoDBManager } from '../../database/mongodb.js';
import { redisManager } from '../../database/redis.js';
import { io } from '../../server.js';
import { validate, ValidationError } from '../../shared/utils/validation.js';
import { CacheKeys, InventoryStatus, PaymentMethod, SaleStatus, CounterStatus } from '../../shared/types/index.js';
import { CreateSaleDTO, ReturnSaleDTO, SaleFilters, DailySalesReport } from './types.js';
import { generateInvoiceNumber } from './utils/invoice.js';
import { invalidateCacheByPattern } from '../../shared/utils/cache.js';

class SalesService {
  /**
   * Create new sale (POS transaction)
   */
  async createSale(tenantId: string, userId: string, data: CreateSaleDTO): Promise<any> {
    // Validate input
    validate(data, {
      items: { required: true },
      paymentMethod: { required: true },
      amountPaid: { required: true, min: 0 },
    });

    if (!data.items || data.items.length === 0) {
      throw new ValidationError({ items: 'At least one item is required' });
    }

    const models = await getTenantModels(tenantId);
    const connection = await mongoDBManager.getTenantConnection(tenantId);
    const session = await connection.startSession();

    let saleResult: any;
    let attempts = 0;

    try {
      while (attempts < 3) {
        attempts += 1;
        try {
          await session.withTransaction(
            async () => {
              const now = new Date();
              const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

              const saleItems: any[] = [];
              let subtotal = 0;

              for (const item of data.items) {
                const batch = await models.InventoryBatch.findById(item.batchId).session(session);

                if (!batch) {
                  throw new ValidationError({ items: `Batch not found: ${item.batchId}` });
                }

                if (batch.quantity < item.quantity) {
                  const medicineLookup = await models.Medicine.findById(batch.medicineId).session(session);
                  throw new ValidationError({
                    items: `Insufficient stock for ${medicineLookup?.name ?? 'selected medicine'}. Available: ${batch.quantity}`,
                  });
                }

                const medicine = await models.Medicine.findById(item.medicineId).session(session);

                if (!medicine) {
                  throw new ValidationError({ items: `Medicine not found: ${item.medicineId}` });
                }

                const sellingPrice = item.sellingPrice || batch.sellingPrice;
                const discount = item.discount || 0;
                const itemTotal = sellingPrice * item.quantity - discount;

                saleItems.push({
                  medicineId: medicine._id,
                  medicineName: medicine.name,
                  batchId: batch._id,
                  batchNumber: batch.batchNumber,
                  quantity: item.quantity,
                  mrp: batch.mrp,
                  sellingPrice,
                  discount,
                  total: itemTotal,
                });

                subtotal += itemTotal;

                batch.quantity -= item.quantity;

                if (batch.quantity === 0) {
                  batch.status = InventoryStatus.OUT_OF_STOCK;
                } else if (batch.expiryDate < now) {
                  batch.status = InventoryStatus.EXPIRED;
                } else if (batch.expiryDate < thirtyDaysFromNow) {
                  batch.status = InventoryStatus.NEAR_EXPIRY;
                } else {
                  batch.status = InventoryStatus.ACTIVE;
                }

                await batch.save({ session });
              }

              const totalDiscount = data.totalDiscount || 0;
              const tax = 0;
              const grandTotal = subtotal - totalDiscount + tax;

              if (data.amountPaid < grandTotal && data.paymentMethod !== PaymentMethod.CREDIT) {
                throw new ValidationError({ amountPaid: 'Insufficient payment amount' });
              }

              const changeReturned =
                data.paymentMethod === PaymentMethod.CREDIT ? 0 : data.amountPaid - grandTotal;

              const invoiceNumber = await generateInvoiceNumber(models.CounterSequence, session);

              let counterId = data.counterId;
              let counter = null;

              if (counterId) {
                counter = await models.Counter.findOne({
                  _id: counterId,
                  status: CounterStatus.ACTIVE,
                }).session(session);
              } else {
                counter = await models.Counter.findOne({
                  isDefault: true,
                  status: CounterStatus.ACTIVE,
                }).session(session);

                if (counter) {
                  counterId = (counter._id as Types.ObjectId).toString();
                }
              }

              if (!counter || !counterId) {
                throw new ValidationError({
                  counterId: 'No active counter available. Please create or activate a counter.',
                });
              }

              const [saleDoc] = await models.Sale.create(
                [
                  {
                    invoiceNumber,
                    customerId: data.customerId ? new Types.ObjectId(data.customerId) : undefined,
                    items: saleItems,
                    subtotal,
                    totalDiscount,
                    tax,
                    grandTotal,
                    paymentMethod: data.paymentMethod,
                    amountPaid: data.amountPaid,
                    changeReturned,
                    prescriptionId: data.prescriptionId ? new Types.ObjectId(data.prescriptionId) : undefined,
                    soldBy: new Types.ObjectId(userId),
                    counterId: new Types.ObjectId(counterId),
                    saleType: data.saleType || 'retail',
                    saleDate: new Date(),
                    status: SaleStatus.COMPLETED,
                  },
                ],
                { session }
              );

              counter.lastSessionAt = new Date();
              await counter.save({ session });

              if (data.customerId) {
                await models.Customer.findByIdAndUpdate(
                  data.customerId,
                  {
                    $inc: {
                      totalPurchases: grandTotal,
                      loyaltyPoints: Math.floor(grandTotal / 100),
                      ...(data.paymentMethod === PaymentMethod.CREDIT && { dueAmount: grandTotal }),
                    },
                    $set: { lastPurchaseDate: new Date() },
                  },
                  { session }
                );
              }

              saleResult = saleDoc;
            },
            {
              readConcern: { level: 'snapshot' },
              writeConcern: { w: 'majority' },
            }
          );
          break;
        } catch (error: any) {
          if (error?.errorLabels?.includes('TransientTransactionError') && attempts < 3) {
            continue;
          }
          throw error;
        }
      }
    } finally {
      await session.endSession();
    }

    if (!saleResult) {
      throw new Error('Failed to complete sale transaction');
    }

    await this.invalidateSalesCache(tenantId);
    await invalidateCacheByPattern([CacheKeys.MEDICINE_SEARCH_PATTERN(tenantId)]);

    io.to(`tenant:${tenantId}`).emit('sale-created', {
      invoiceNumber: saleResult.invoiceNumber,
      grandTotal: saleResult.grandTotal,
    });

    io.to(`tenant:${tenantId}`).emit('inventory-updated');

    return saleResult;
  }

  /**
   * Get sale by ID
   */
  async getSaleById(tenantId: string, saleId: string): Promise<any> {
    const models = await getTenantModels(tenantId);

    const sale = await models.Sale.findById(saleId).populate([
      { path: 'customerId', select: 'name phone' },
      { path: 'prescriptionId', select: 'prescriptionNumber' },
    ]);

    if (!sale) {
      throw new Error('Sale not found');
    }

    return sale;
  }

  /**
   * Get sale by invoice number
   */
  async getSaleByInvoiceNumber(tenantId: string, invoiceNumber: string): Promise<any> {
    const models = await getTenantModels(tenantId);

    const sale = await models.Sale.findOne({ invoiceNumber }).populate([
      { path: 'customerId', select: 'name phone' },
      { path: 'prescriptionId', select: 'prescriptionNumber' },
    ]);

    if (!sale) {
      throw new Error('Sale not found');
    }

    return sale;
  }

  /**
   * Get sales with filters and pagination
   */
  async getSales(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    filters?: SaleFilters
  ): Promise<any> {
    const models = await getTenantModels(tenantId);
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters?.startDate || filters?.endDate) {
      query.saleDate = {};
      if (filters.startDate) query.saleDate.$gte = filters.startDate;
      if (filters.endDate) query.saleDate.$lte = filters.endDate;
    }

    if (filters?.customerId) {
      query.customerId = new Types.ObjectId(filters.customerId);
    }

    if (filters?.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.soldBy) {
      query.soldBy = new Types.ObjectId(filters.soldBy);
    }

    const [sales, total] = await Promise.all([
      models.Sale.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ saleDate: -1 })
        .populate('customerId', 'name phone'),
      models.Sale.countDocuments(query),
    ]);

    return {
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Return/Refund sale
   */
  async returnSale(tenantId: string, saleId: string, data: ReturnSaleDTO): Promise<any> {
    const models = await getTenantModels(tenantId);
    const connection = await mongoDBManager.getTenantConnection(tenantId);
    const session = await connection.startSession();

    let updatedSale: any;
    let totalReturnAmount = 0;

    try {
      await session.withTransaction(
        async () => {
          const sale = await models.Sale.findById(saleId).session(session);

          if (!sale) {
            throw new Error('Sale not found');
          }

          if (sale.status === SaleStatus.RETURNED) {
            throw new Error('Sale already fully returned');
          }

          for (const returnItem of data.items) {
            const saleItem = sale.items[returnItem.saleItemIndex];

            if (!saleItem) {
              throw new Error(`Invalid item index: ${returnItem.saleItemIndex}`);
            }

            if (returnItem.quantity > saleItem.quantity) {
              throw new ValidationError({ items: 'Return quantity exceeds sold quantity' });
            }

            const batch = await models.InventoryBatch.findById(saleItem.batchId).session(session);

            if (!batch) {
              throw new Error('Inventory batch not found for return');
            }

            batch.quantity += returnItem.quantity;

            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            if (batch.quantity === 0) {
              batch.status = InventoryStatus.OUT_OF_STOCK;
            } else if (batch.expiryDate < now) {
              batch.status = InventoryStatus.EXPIRED;
            } else if (batch.expiryDate < thirtyDaysFromNow) {
              batch.status = InventoryStatus.NEAR_EXPIRY;
            } else {
              batch.status = InventoryStatus.ACTIVE;
            }

            await batch.save({ session });

            const returnAmount = (saleItem.total / saleItem.quantity) * returnItem.quantity;
            totalReturnAmount += returnAmount;

            saleItem.quantity -= returnItem.quantity;
            saleItem.total -= returnAmount;
          }

          const allItemsReturned = sale.items.every((item) => item.quantity === 0);
          sale.status = allItemsReturned ? SaleStatus.RETURNED : SaleStatus.PARTIAL_RETURN;
          sale.grandTotal -= totalReturnAmount;

          await sale.save({ session });

          if (sale.customerId) {
            await models.Customer.findByIdAndUpdate(
              sale.customerId,
              {
                $inc: {
                  totalPurchases: -totalReturnAmount,
                  loyaltyPoints: -Math.floor(totalReturnAmount / 100),
                },
              },
              { session }
            );
          }

          updatedSale = sale;
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
        }
      );
    } finally {
      await session.endSession();
    }

    await this.invalidateSalesCache(tenantId);
    await invalidateCacheByPattern([CacheKeys.MEDICINE_SEARCH_PATTERN(tenantId)]);

    if (!updatedSale) {
      throw new Error('Failed to process sale return');
    }

    io.to(`tenant:${tenantId}`).emit('sale-returned', {
      invoiceNumber: updatedSale.invoiceNumber,
      returnAmount: totalReturnAmount,
    });
    io.to(`tenant:${tenantId}`).emit('inventory-updated');

    return updatedSale;
  }

  /**
   * Get today's sales summary
   */
  async getTodaysSales(tenantId: string): Promise<any> {
    // Try cache first
    const cacheKey = CacheKeys.SALES_TODAY(tenantId);
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const models = await getTenantModels(tenantId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const summary = await models.Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: today, $lt: tomorrow },
          status: { $ne: SaleStatus.RETURNED },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          totalOrders: { $sum: 1 },
          cashSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', PaymentMethod.CASH] }, '$grandTotal', 0],
            },
          },
          cardSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', PaymentMethod.CARD] }, '$grandTotal', 0],
            },
          },
          mobileBankingSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', PaymentMethod.MOBILE_BANKING] }, '$grandTotal', 0],
            },
          },
          creditSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', PaymentMethod.CREDIT] }, '$grandTotal', 0],
            },
          },
        },
      },
    ]);

    const result = summary[0] || {
      totalSales: 0,
      totalOrders: 0,
      cashSales: 0,
      cardSales: 0,
      mobileBankingSales: 0,
      creditSales: 0,
    };

    result.averageOrderValue = result.totalOrders > 0 ? result.totalSales / result.totalOrders : 0;

    // Cache for 1 hour
    await redisManager.set(cacheKey, result, 3600);

    return result;
  }

  /**
   * Get daily sales report
   */
  async getDailySalesReport(tenantId: string, date: Date): Promise<DailySalesReport> {
    const models = await getTenantModels(tenantId);
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [summary, topSelling] = await Promise.all([
      models.Sale.aggregate([
        {
          $match: {
            saleDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: SaleStatus.RETURNED },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$grandTotal' },
            totalOrders: { $sum: 1 },
            cashSales: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', PaymentMethod.CASH] }, '$grandTotal', 0],
              },
            },
            cardSales: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', PaymentMethod.CARD] }, '$grandTotal', 0],
              },
            },
            mobileBankingSales: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', PaymentMethod.MOBILE_BANKING] }, '$grandTotal', 0],
              },
            },
            creditSales: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', PaymentMethod.CREDIT] }, '$grandTotal', 0],
              },
            },
          },
        },
      ]),
      models.Sale.aggregate([
        {
          $match: {
            saleDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: SaleStatus.RETURNED },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.medicineId',
            medicineName: { $first: '$items.medicineName' },
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const summaryData = summary[0] || {
      totalSales: 0,
      totalOrders: 0,
      cashSales: 0,
      cardSales: 0,
      mobileBankingSales: 0,
      creditSales: 0,
    };

    return {
      date,
      totalSales: summaryData.totalSales,
      totalOrders: summaryData.totalOrders,
      averageOrderValue: summaryData.totalOrders > 0 ? summaryData.totalSales / summaryData.totalOrders : 0,
      cashSales: summaryData.cashSales,
      cardSales: summaryData.cardSales,
      mobileBankingSales: summaryData.mobileBankingSales,
      creditSales: summaryData.creditSales,
      topSellingMedicines: topSelling.map((item) => ({
        medicineId: item._id.toString(),
        medicineName: item.medicineName,
        quantitySold: item.quantitySold,
        revenue: item.revenue,
      })),
    };
  }

  /**
   * Invalidate sales cache
   */
  private async invalidateSalesCache(tenantId: string): Promise<void> {
    await redisManager.del(CacheKeys.SALES_TODAY(tenantId));
  }
}

export default new SalesService();

