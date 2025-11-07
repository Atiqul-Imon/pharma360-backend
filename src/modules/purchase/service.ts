import { Types } from 'mongoose';
import { getTenantModels } from '../../database/index.js';
import { redisManager } from '../../database/redis.js';
import { io } from '../../server.js';
import {
  validate,
  ValidationError,
  isValidObjectId,
} from '../../shared/utils/validation.js';
import { CacheKeys, PaymentStatus, PurchaseStatus } from '../../shared/types/index.js';
import {
  CreatePurchaseDTO,
  PurchaseItemInput,
  ReceivePurchaseDTO,
  ReceivePurchaseItemDTO,
  RecordPurchasePaymentDTO,
  PurchaseFilters,
} from './types.js';

class PurchaseService {
  private resolvePaymentStatus(grandTotal: number, amountPaid: number): PaymentStatus {
    if (amountPaid >= grandTotal) {
      return PaymentStatus.PAID;
    }

    if (amountPaid > 0) {
      return PaymentStatus.PARTIAL;
    }

    return PaymentStatus.PENDING;
  }

  private async generatePurchaseOrderNumber(models: any, orderDate: Date): Promise<string> {
    const date = new Date(orderDate);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await models.Purchase.countDocuments({
      orderDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const dateStr = startOfDay.toISOString().slice(0, 10).replace(/-/g, '');
    return `PO-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  private normalizeItems(items: PurchaseItemInput[]): PurchaseItemInput[] {
    if (!items || items.length === 0) {
      throw new ValidationError({ items: 'At least one medicine is required' });
    }

    return items.map((item) => ({
      ...item,
      freeQuantity: item.freeQuantity ?? 0,
      alertThreshold: item.alertThreshold ?? undefined,
      notes: item.notes?.trim() || undefined,
    }));
  }

  async createPurchase(
    tenantId: string,
    userId: string,
    data: CreatePurchaseDTO
  ): Promise<any> {
    validate(
      {
        supplierId: data.supplierId,
        discount: data.discount ?? 0,
        tax: data.tax ?? 0,
        amountPaid: data.amountPaid ?? 0,
      },
      {
        supplierId: { required: true },
        discount: { min: 0 },
        tax: { min: 0 },
        amountPaid: { min: 0 },
      }
    );

    if (!isValidObjectId(data.supplierId)) {
      throw new ValidationError({ supplierId: 'Invalid supplier ID' });
    }

    const items = this.normalizeItems(data.items);
    const models = await getTenantModels(tenantId);

    const supplier = await models.Supplier.findById(data.supplierId);
    if (!supplier) {
      throw new ValidationError({ supplierId: 'Supplier not found' });
    }

    if (!supplier.isActive) {
      throw new ValidationError({ supplierId: 'Supplier is inactive' });
    }

    const orderDate = data.orderDate ? new Date(data.orderDate) : new Date();
    if (Number.isNaN(orderDate.getTime())) {
      throw new ValidationError({ orderDate: 'Invalid order date' });
    }

    const expectedDeliveryDate = data.expectedDeliveryDate
      ? new Date(data.expectedDeliveryDate)
      : undefined;
    if (expectedDeliveryDate && Number.isNaN(expectedDeliveryDate.getTime())) {
      throw new ValidationError({ expectedDeliveryDate: 'Invalid expected delivery date' });
    }

    const purchaseItems = [];
    let subtotal = 0;

    const seenBatchKeys = new Set<string>();

    for (const item of items) {
      if (!isValidObjectId(item.medicineId)) {
        throw new ValidationError({ medicineId: 'Invalid medicine ID provided' });
      }

      const medicine = (await models.Medicine.findById(item.medicineId)) as any;
      if (!medicine) {
        throw new ValidationError({ items: `Medicine not found: ${item.medicineId}` });
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ValidationError({
          items: `Quantity must be greater than zero for ${medicine.name}`,
        });
      }

      const freeQuantity = Number(item.freeQuantity ?? 0);
      if (!Number.isFinite(freeQuantity) || freeQuantity < 0) {
        throw new ValidationError({
          items: `Free quantity cannot be negative for ${medicine.name}`,
        });
      }

      const purchasePrice = Number(item.purchasePrice);
      if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
        throw new ValidationError({
          items: `Purchase price must be zero or greater for ${medicine.name}`,
        });
      }

      const sellingPrice = Number(item.sellingPrice);
      if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
        throw new ValidationError({
          items: `Selling price must be zero or greater for ${medicine.name}`,
        });
      }

      const mrp = Number(item.mrp);
      if (!Number.isFinite(mrp) || mrp < 0) {
        throw new ValidationError({ items: `MRP must be zero or greater for ${medicine.name}` });
      }

      const expiryDate = new Date(item.expiryDate);
      if (Number.isNaN(expiryDate.getTime())) {
        throw new ValidationError({
          items: `Invalid expiry date for ${medicine.name}`,
        });
      }

      if (!item.batchNumber?.trim()) {
        throw new ValidationError({
          items: `Batch number is required for ${medicine.name}`,
        });
      }

      const batchKey = `${medicine._id.toString()}::${item.batchNumber.trim()}`;
      if (seenBatchKeys.has(batchKey)) {
        throw new ValidationError({
          items: `Duplicate batch number ${item.batchNumber} for ${medicine.name}`,
        });
      }
      seenBatchKeys.add(batchKey);

      const lineTotal = quantity * purchasePrice;

      purchaseItems.push({
        medicineId: medicine._id,
        medicineName: medicine.name,
        batchNumber: item.batchNumber.trim(),
        quantity,
        freeQuantity,
        purchasePrice,
        sellingPrice,
        mrp,
        expiryDate,
        receivedQuantity: 0,
        receivedFreeQuantity: 0,
        total: lineTotal,
        alertThreshold: item.alertThreshold,
        notes: item.notes,
      });

      subtotal += lineTotal;
    }

    const discount = Number(data.discount ?? 0);
    const tax = Number(data.tax ?? 0);
    const amountPaid = Number(data.amountPaid ?? 0);

    if (discount > subtotal) {
      throw new ValidationError({ discount: 'Discount cannot exceed subtotal' });
    }

    const grandTotal = subtotal - discount + tax;
    if (grandTotal < 0) {
      throw new ValidationError({ grandTotal: 'Grand total cannot be negative' });
    }

    if (amountPaid > grandTotal) {
      throw new ValidationError({ amountPaid: 'Amount paid cannot exceed grand total' });
    }

    if (amountPaid > 0 && !data.initialPaymentMethod) {
      throw new ValidationError({
        initialPaymentMethod: 'Payment method is required when amount paid is provided',
      });
    }

    const dueAmount = Math.max(0, grandTotal - amountPaid);
    const paymentStatus = this.resolvePaymentStatus(grandTotal, amountPaid);

    const purchaseOrderNumber = await this.generatePurchaseOrderNumber(models, orderDate);

    const purchase = await models.Purchase.create({
      purchaseOrderNumber,
      supplierInvoiceNumber: data.supplierInvoiceNumber?.trim() || undefined,
      supplierId: new Types.ObjectId(data.supplierId),
      orderDate,
      expectedDeliveryDate,
      items: purchaseItems,
      subtotal,
      discount,
      tax,
      grandTotal,
      amountPaid,
      dueAmount,
      paymentStatus,
      status: PurchaseStatus.ORDERED,
      createdBy: new Types.ObjectId(userId),
      notes: data.notes?.trim(),
      payments:
        amountPaid > 0
          ? [
              {
                amount: amountPaid,
                paymentMethod: data.initialPaymentMethod,
                paidAt: new Date(),
                recordedBy: new Types.ObjectId(userId),
              },
            ]
          : [],
    });

    await models.Supplier.findByIdAndUpdate(
      data.supplierId,
      {
        $inc: {
          totalPurchases: grandTotal,
          currentDue: dueAmount,
        },
        $set: {
          lastPurchaseDate: orderDate,
        },
      },
      { new: true }
    );

    io.to(`tenant:${tenantId}`).emit('purchase-created', {
      purchaseOrderNumber,
      grandTotal,
      supplier: {
        id: supplier._id,
        name: supplier.companyName,
      },
    });

    return purchase;
  }

  async getPurchases(
    tenantId: string,
    page: number = 1,
    limit: number = 25,
    filters: PurchaseFilters = {}
  ): Promise<any> {
    const models = await getTenantModels(tenantId);
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    if (filters.supplierId) {
      if (!isValidObjectId(filters.supplierId)) {
        throw new ValidationError({ supplierId: 'Invalid supplier filter' });
      }
      query.supplierId = new Types.ObjectId(filters.supplierId);
    }

    if (filters.startDate || filters.endDate) {
      query.orderDate = {};
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (Number.isNaN(startDate.getTime())) {
          throw new ValidationError({ startDate: 'Invalid start date filter' });
        }
        query.orderDate.$gte = startDate;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (Number.isNaN(endDate.getTime())) {
          throw new ValidationError({ endDate: 'Invalid end date filter' });
        }
        query.orderDate.$lte = endDate;
      }
    }

    if (filters.search) {
      query.$or = [
        { purchaseOrderNumber: { $regex: filters.search, $options: 'i' } },
        { supplierInvoiceNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [purchases, total] = await Promise.all([
      models.Purchase.find(query)
        .populate('supplierId', 'companyName phone')
        .sort({ orderDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      models.Purchase.countDocuments(query),
    ]);

    return {
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPurchaseById(tenantId: string, purchaseId: string): Promise<any> {
    if (!isValidObjectId(purchaseId)) {
      throw new ValidationError({ purchaseId: 'Invalid purchase ID' });
    }

    const models = await getTenantModels(tenantId);
    const purchase = await models.Purchase.findById(purchaseId).populate('supplierId', 'companyName phone email address');

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    return purchase;
  }

  private applyReceiveItemUpdates(purchase: any, updates: ReceivePurchaseItemDTO[]) {
    const updateMap = new Map<string, ReceivePurchaseItemDTO>();

    for (const update of updates) {
      if (!isValidObjectId(update.medicineId)) {
        throw new ValidationError({ medicineId: 'Invalid medicine ID in receive payload' });
      }
      const key = `${update.medicineId}::${update.batchNumber}`;
      updateMap.set(key, update);
    }

    purchase.items.forEach((item: any) => {
      const key = `${item.medicineId.toString()}::${item.batchNumber}`;
      const update = updateMap.get(key);
      if (update) {
        if (update.quantityReceived !== undefined) {
          if (update.quantityReceived < 0) {
            throw new ValidationError({
              quantityReceived: `Quantity received cannot be negative for ${item.medicineName}`,
            });
          }
          item.receivedQuantity = update.quantityReceived;
        }

        if (update.freeQuantityReceived !== undefined) {
          if (update.freeQuantityReceived < 0) {
            throw new ValidationError({
              freeQuantityReceived: `Free quantity received cannot be negative for ${item.medicineName}`,
            });
          }
          item.receivedFreeQuantity = update.freeQuantityReceived;
        }

        if (update.purchasePrice !== undefined) {
          if (update.purchasePrice < 0) {
            throw new ValidationError({
              purchasePrice: `Purchase price cannot be negative for ${item.medicineName}`,
            });
          }
          item.purchasePrice = update.purchasePrice;
        }

        if (update.sellingPrice !== undefined) {
          if (update.sellingPrice < 0) {
            throw new ValidationError({
              sellingPrice: `Selling price cannot be negative for ${item.medicineName}`,
            });
          }
          item.sellingPrice = update.sellingPrice;
        }

        if (update.mrp !== undefined) {
          if (update.mrp < 0) {
            throw new ValidationError({
              mrp: `MRP cannot be negative for ${item.medicineName}`,
            });
          }
          item.mrp = update.mrp;
        }

        if (update.expiryDate) {
          const expiry = new Date(update.expiryDate);
          if (Number.isNaN(expiry.getTime())) {
            throw new ValidationError({
              expiryDate: `Invalid expiry date for ${item.medicineName}`,
            });
          }
          item.expiryDate = expiry;
        }

        if (update.alertThreshold !== undefined) {
          if (update.alertThreshold < 0) {
            throw new ValidationError({
              alertThreshold: `Alert threshold cannot be negative for ${item.medicineName}`,
            });
          }
          item.alertThreshold = update.alertThreshold;
        }

        if (update.notes !== undefined) {
          item.notes = update.notes?.trim() || undefined;
        }
      }

      if (!item.receivedQuantity) {
        item.receivedQuantity = item.quantity;
      }

      if (item.receivedFreeQuantity === undefined || item.receivedFreeQuantity === null) {
        item.receivedFreeQuantity = item.freeQuantity || 0;
      }

      item.total = item.receivedQuantity * item.purchasePrice;
    });
  }

  async receivePurchase(
    tenantId: string,
    userId: string,
    purchaseId: string,
    data: ReceivePurchaseDTO
  ): Promise<any> {
    if (!isValidObjectId(purchaseId)) {
      throw new ValidationError({ purchaseId: 'Invalid purchase ID' });
    }

    const models = await getTenantModels(tenantId);
    const purchase = await models.Purchase.findById(purchaseId);

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new ValidationError({ status: 'Cannot receive a cancelled purchase order' });
    }

    if (purchase.status === PurchaseStatus.RECEIVED || purchase.status === PurchaseStatus.COMPLETED) {
      throw new ValidationError({ status: 'Purchase already received' });
    }

    if (data.items?.length) {
      this.applyReceiveItemUpdates(purchase, data.items);
    } else {
      purchase.items.forEach((item: any) => {
        item.receivedQuantity = item.receivedQuantity || item.quantity;
        item.receivedFreeQuantity =
          item.receivedFreeQuantity ?? item.freeQuantity ?? 0;
        item.total = (item.receivedQuantity || item.quantity) * item.purchasePrice;
      });
    }

    const receiveDate = data.receivedDate ? new Date(data.receivedDate) : new Date();
    if (Number.isNaN(receiveDate.getTime())) {
      throw new ValidationError({ receivedDate: 'Invalid received date' });
    }

    for (const item of purchase.items) {
      const totalReceived = (item.receivedQuantity || 0) + (item.receivedFreeQuantity || 0);

      if (totalReceived <= 0) {
        continue;
      }

      const existingBatch = await models.InventoryBatch.findOne({
        medicineId: item.medicineId,
        batchNumber: item.batchNumber,
      });

      if (existingBatch) {
        existingBatch.quantity += totalReceived;
        existingBatch.initialQuantity += totalReceived;
        existingBatch.purchasePrice = item.purchasePrice;
        existingBatch.mrp = item.mrp;
        existingBatch.sellingPrice = item.sellingPrice;
        existingBatch.expiryDate = item.expiryDate;
        existingBatch.alertThreshold = item.alertThreshold ?? existingBatch.alertThreshold;
        existingBatch.supplierId = purchase.supplierId;
        existingBatch.purchaseDate = receiveDate;
        await existingBatch.save();
      } else {
        await models.InventoryBatch.create({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          purchaseDate: receiveDate,
          supplierId: purchase.supplierId,
          purchasePrice: item.purchasePrice,
          mrp: item.mrp,
          sellingPrice: item.sellingPrice,
          quantity: totalReceived,
          initialQuantity: totalReceived,
          alertThreshold: item.alertThreshold,
        });
      }
    }

    purchase.status =
      purchase.dueAmount > 0 ? PurchaseStatus.RECEIVED : PurchaseStatus.COMPLETED;
    purchase.receivedDate = receiveDate;
    purchase.receivedBy = new Types.ObjectId(userId);
    if (data.notes) {
      purchase.notes = data.notes.trim();
    }

    purchase.markModified('items');
    await purchase.save();

    await models.Supplier.findByIdAndUpdate(purchase.supplierId, {
      $set: { lastPurchaseDate: receiveDate },
    });

    const summaryDate = new Date(receiveDate);
    summaryDate.setHours(0, 0, 0, 0);

    await models.DailySummary.findOneAndUpdate(
      { date: summaryDate },
      {
        $setOnInsert: { date: summaryDate },
        $inc: { totalPurchases: purchase.grandTotal },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Promise.all([
      redisManager.del(CacheKeys.INVENTORY_SUMMARY(tenantId)),
      redisManager.del(CacheKeys.LOW_STOCK_ALERTS(tenantId)),
      redisManager.del(CacheKeys.EXPIRY_ALERTS(tenantId)),
      redisManager.del(CacheKeys.MEDICINE_LIST(tenantId)),
    ]);

    io.to(`tenant:${tenantId}`).emit('purchase-received', {
      purchaseOrderNumber: purchase.purchaseOrderNumber,
      grandTotal: purchase.grandTotal,
      status: purchase.status,
    });

    io.to(`tenant:${tenantId}`).emit('inventory-updated');

    return purchase;
  }

  async recordPayment(
    tenantId: string,
    userId: string,
    purchaseId: string,
    data: RecordPurchasePaymentDTO
  ): Promise<any> {
    if (!isValidObjectId(purchaseId)) {
      throw new ValidationError({ purchaseId: 'Invalid purchase ID' });
    }

    validate(
      { amount: data.amount },
      {
        amount: { required: true, min: 0.01 },
      }
    );

    const models = await getTenantModels(tenantId);
    const purchase = await models.Purchase.findById(purchaseId);

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new ValidationError({ status: 'Cannot add payment to a cancelled purchase' });
    }

    if (purchase.paymentStatus === PaymentStatus.PAID || purchase.dueAmount <= 0) {
      throw new ValidationError({ amount: 'Purchase is already fully paid' });
    }

    if (data.amount > purchase.dueAmount) {
      throw new ValidationError({ amount: 'Payment exceeds remaining due amount' });
    }

    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) {
      throw new ValidationError({ paidAt: 'Invalid payment date' });
    }

    if (!data.paymentMethod) {
      throw new ValidationError({ paymentMethod: 'Payment method is required' });
    }

    purchase.payments.push({
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paidAt,
      reference: data.reference?.trim(),
      note: data.note?.trim(),
      recordedBy: new Types.ObjectId(userId),
    });

    purchase.amountPaid += data.amount;
    purchase.dueAmount = Math.max(0, purchase.grandTotal - purchase.amountPaid);
    purchase.paymentStatus = this.resolvePaymentStatus(
      purchase.grandTotal,
      purchase.amountPaid
    );

    if (
      purchase.status === PurchaseStatus.RECEIVED &&
      purchase.paymentStatus === PaymentStatus.PAID
    ) {
      purchase.status = PurchaseStatus.COMPLETED;
    }

    await purchase.save();

    await models.Supplier.findByIdAndUpdate(purchase.supplierId, {
      $inc: { currentDue: -data.amount },
    });

    return purchase;
  }

  async cancelPurchase(
    tenantId: string,
    purchaseId: string,
    reason?: string
  ): Promise<any> {
    if (!isValidObjectId(purchaseId)) {
      throw new ValidationError({ purchaseId: 'Invalid purchase ID' });
    }

    const models = await getTenantModels(tenantId);
    const purchase = await models.Purchase.findById(purchaseId);

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new ValidationError({ status: 'Purchase already cancelled' });
    }

    if (
      purchase.status === PurchaseStatus.RECEIVED ||
      purchase.status === PurchaseStatus.COMPLETED
    ) {
      throw new ValidationError({ status: 'Cannot cancel a received purchase order' });
    }

    const dueAdjustment = purchase.dueAmount;
    const purchaseAdjustment = purchase.grandTotal;

    purchase.status = PurchaseStatus.CANCELLED;
    purchase.paymentStatus = PaymentStatus.PENDING;
    purchase.notes = reason
      ? `${purchase.notes ? `${purchase.notes}\n` : ''}Cancelled: ${reason}`
      : purchase.notes;

    await purchase.save();

    await models.Supplier.findByIdAndUpdate(purchase.supplierId, {
      $inc: {
        currentDue: -dueAdjustment,
        totalPurchases: -purchaseAdjustment,
      },
    });

    return purchase;
  }
}

export default new PurchaseService();


