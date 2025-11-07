import { Types } from 'mongoose';
import { getTenantModels } from '../../database/index.js';
import { redisManager } from '../../database/redis.js';
import { io } from '../../server.js';
import { validate, ValidationError } from '../../shared/utils/validation.js';
import { CacheKeys, PaymentMethod, SaleStatus } from '../../shared/types/index.js';
import { CreateSaleDTO, ReturnSaleDTO, SaleFilters, DailySalesReport } from './types.js';

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

    // For local development without replica set, we'll use individual operations
    // In production with replica set, transactions would be ideal
    
    try {
      // Process each item and update inventory
      const saleItems = [];
      let subtotal = 0;

      for (const item of data.items) {
        // Get batch details
        const batch = await models.InventoryBatch.findById(item.batchId);
        
        if (!batch) {
          throw new Error(`Batch not found: ${item.batchId}`);
        }

        if (batch.quantity < item.quantity) {
          const medicine = await models.Medicine.findById(batch.medicineId);
          throw new ValidationError({
            items: `Insufficient stock for ${medicine?.name}. Available: ${batch.quantity}`,
          });
        }

        // Get medicine details
        const medicine = await models.Medicine.findById(item.medicineId);
        
        if (!medicine) {
          throw new Error(`Medicine not found: ${item.medicineId}`);
        }

        // Calculate item total
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

        // Update batch quantity (without session for local development)
        batch.quantity -= item.quantity;
        await batch.save();
      }

      // Calculate totals
      const totalDiscount = data.totalDiscount || 0;
      const tax = 0; // Can be calculated based on tenant settings
      const grandTotal = subtotal - totalDiscount + tax;

      // Validate payment
      if (data.amountPaid < grandTotal && data.paymentMethod !== PaymentMethod.CREDIT) {
        throw new ValidationError({ amountPaid: 'Insufficient payment amount' });
      }

      const changeReturned = data.paymentMethod === PaymentMethod.CREDIT ? 0 : data.amountPaid - grandTotal;

      // Generate invoice number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await models.Sale.countDocuments({
        createdAt: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      });
      const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;

      // Create sale (without session for local development)
      const sale = await models.Sale.create({
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
        saleType: data.saleType || 'retail',
        saleDate: new Date(),
        status: SaleStatus.COMPLETED,
      });

      // Update customer stats if customer ID provided (without session)
      if (data.customerId) {
        await models.Customer.findByIdAndUpdate(
          data.customerId,
          {
            $inc: {
              totalPurchases: grandTotal,
              loyaltyPoints: Math.floor(grandTotal / 100), // 1 point per 100 BDT
              ...(data.paymentMethod === PaymentMethod.CREDIT && { dueAmount: grandTotal }),
            },
            $set: { lastPurchaseDate: new Date() },
          }
        );
      }

      // Invalidate caches
      await this.invalidateSalesCache(tenantId);

      // Emit real-time update via Socket.IO
      io.to(`tenant:${tenantId}`).emit('sale-created', {
        invoiceNumber: sale.invoiceNumber,
        grandTotal: sale.grandTotal,
      });

      // Emit inventory update
      io.to(`tenant:${tenantId}`).emit('inventory-updated');

      return sale;
    } catch (error) {
      // In case of error, we could implement rollback logic here
      // For now, we'll just throw the error
      throw error;
    }
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

    const sale = await models.Sale.findById(saleId);
    
    if (!sale) {
      throw new Error('Sale not found');
    }

    if (sale.status === SaleStatus.RETURNED) {
      throw new Error('Sale already fully returned');
    }

    try {
      let totalReturnAmount = 0;

      for (const returnItem of data.items) {
        const saleItem = sale.items[returnItem.saleItemIndex];
        
        if (!saleItem) {
          throw new Error(`Invalid item index: ${returnItem.saleItemIndex}`);
        }

        if (returnItem.quantity > saleItem.quantity) {
          throw new Error(`Return quantity exceeds sold quantity for item`);
        }

        // Return stock to inventory (without session for local development)
        await models.InventoryBatch.findByIdAndUpdate(
          saleItem.batchId,
          { $inc: { quantity: returnItem.quantity } }
        );

        // Calculate return amount
        const returnAmount = (saleItem.total / saleItem.quantity) * returnItem.quantity;
        totalReturnAmount += returnAmount;

        // Update sale item quantity
        saleItem.quantity -= returnItem.quantity;
        saleItem.total -= returnAmount;
      }

      // Update sale status
      const allItemsReturned = sale.items.every((item) => item.quantity === 0);
      sale.status = allItemsReturned ? SaleStatus.RETURNED : SaleStatus.PARTIAL_RETURN;
      sale.grandTotal -= totalReturnAmount;

      await sale.save();

      // Update customer stats (without session)
      if (sale.customerId) {
        await models.Customer.findByIdAndUpdate(
          sale.customerId,
          {
            $inc: {
              totalPurchases: -totalReturnAmount,
              loyaltyPoints: -Math.floor(totalReturnAmount / 100),
            },
          }
        );
      }

      // Invalidate caches
      await this.invalidateSalesCache(tenantId);

      // Emit real-time update
      io.to(`tenant:${tenantId}`).emit('sale-returned', {
        invoiceNumber: sale.invoiceNumber,
        returnAmount: totalReturnAmount,
      });
      io.to(`tenant:${tenantId}`).emit('inventory-updated');

      return sale;
    } catch (error) {
      // In case of error, we could implement rollback logic here
      throw error;
    }
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

