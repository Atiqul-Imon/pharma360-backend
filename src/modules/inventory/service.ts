import { Types } from 'mongoose';
import { getTenantModels } from '../../database/index.js';
import { redisManager } from '../../database/redis.js';
import { validate, ValidationError, isValidBarcode } from '../../shared/utils/validation.js';
import { CacheKeys, CacheTTL, InventoryStatus } from '../../shared/types/index.js';
import { buildCacheHash, invalidateCacheByPattern, swrFetch } from '../../shared/utils/cache.js';
import {
  CreateMedicineDTO,
  UpdateMedicineDTO,
  CreateBatchDTO,
  UpdateBatchDTO,
  InventorySummary,
  ExpiryAlert,
  LowStockAlert,
} from './types.js';

class InventoryService {
  /**
   * Create new medicine
   */
  async createMedicine(tenantId: string, data: CreateMedicineDTO): Promise<any> {
    // Validate input
    validate(data, {
      name: { required: true, minLength: 2, maxLength: 200 },
      genericName: { required: true, minLength: 2, maxLength: 200 },
      manufacturer: { required: true, minLength: 2, maxLength: 100 },
      category: { required: true },
      strength: { required: true, minLength: 1, maxLength: 50 },
      unit: { required: true, minLength: 1, maxLength: 50 },
      minStockLevel: { min: 0 },
    });

    // Normalize barcode: convert empty strings to undefined
    const normalizedBarcode = data.barcode?.trim() || undefined;
    
    // Validate barcode only if provided
    if (normalizedBarcode) {
      if (!isValidBarcode(normalizedBarcode)) {
        throw new ValidationError({ barcode: 'Invalid barcode format. Barcode must be 8-13 digits.' });
      }
    }

    const models = await getTenantModels(tenantId);

    // Check for duplicate barcode only if provided
    if (normalizedBarcode) {
      const existing = await models.Medicine.findOne({ barcode: normalizedBarcode });
      if (existing) {
        throw new ValidationError({ barcode: 'Barcode already exists' });
      }
    }

    // Create medicine with normalized barcode (undefined if empty)
    const medicineData: any = {
      ...data,
      barcode: normalizedBarcode, // This will be undefined if not provided
      minStockLevel: data.minStockLevel || 10,
      isActive: true,
    };

    // Remove barcode from data if it's undefined to avoid saving empty strings
    if (medicineData.barcode === undefined) {
      delete medicineData.barcode;
    }

    const medicine = await models.Medicine.create(medicineData);

    // Invalidate cache
    await redisManager.del(CacheKeys.MEDICINE_LIST(tenantId));
    await invalidateCacheByPattern([CacheKeys.MEDICINE_SEARCH_PATTERN(tenantId)]);

    return medicine;
  }

  /**
   * Get all medicines with pagination and search
   */
  async getMedicines(
    tenantId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
    category?: string,
    isActive?: boolean
  ): Promise<any> {
    const models = await getTenantModels(tenantId);
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Search filter
    if (search) {
      filter.$text = { $search: search };
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Active filter
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const [medicines, total] = await Promise.all([
      models.Medicine.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      models.Medicine.countDocuments(filter),
    ]);

    return {
      medicines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get medicine by ID
   */
  async getMedicineById(tenantId: string, medicineId: string): Promise<any> {
    // Try cache first
    const cacheKey = CacheKeys.MEDICINE(medicineId);
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const models = await getTenantModels(tenantId);
    const medicine = await models.Medicine.findById(medicineId);

    if (!medicine) {
      throw new Error('Medicine not found');
    }

    // Cache the result
    await redisManager.set(cacheKey, medicine, CacheTTL.MEDICINE);

    return medicine;
  }

  /**
   * Get medicine by barcode
   */
  async getMedicineByBarcode(tenantId: string, barcode: string): Promise<any> {
    const models = await getTenantModels(tenantId);
    const medicine = await models.Medicine.findOne({ barcode, isActive: true });

    if (!medicine) {
      throw new Error('Medicine not found');
    }

    return medicine;
  }

  /**
   * Update medicine
   */
  async updateMedicine(tenantId: string, medicineId: string, data: UpdateMedicineDTO): Promise<any> {
    const models = await getTenantModels(tenantId);

    // Prepare update data (excluding barcode for now)
    const updateData: any = { ...data };
    const updateOperation: any = { $set: {} };

    // Handle barcode separately
    if (data.barcode !== undefined) {
      // Normalize barcode: convert empty strings to undefined
      const normalizedBarcode = data.barcode?.trim() || undefined;
      
      if (normalizedBarcode) {
        // Validate barcode if provided
        if (!isValidBarcode(normalizedBarcode)) {
          throw new ValidationError({ barcode: 'Invalid barcode format. Barcode must be 8-13 digits.' });
        }

        // Check for duplicate barcode
        const existing = await models.Medicine.findOne({
          barcode: normalizedBarcode,
          _id: { $ne: medicineId },
        });
        if (existing) {
          throw new ValidationError({ barcode: 'Barcode already exists' });
        }

        // Set barcode
        updateOperation.$set.barcode = normalizedBarcode;
      } else {
        // Unset barcode if empty string was provided
        updateOperation.$unset = { barcode: '' };
      }
      
      // Remove barcode from updateData since we're handling it separately
      delete updateData.barcode;
    }

    // Add other fields to $set
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateOperation.$set[key] = updateData[key];
      }
    });

    // Build the final update operation
    const finalUpdate: any = {};
    if (Object.keys(updateOperation.$set).length > 0) {
      finalUpdate.$set = updateOperation.$set;
    }
    if (updateOperation.$unset) {
      finalUpdate.$unset = updateOperation.$unset;
    }

    // If no updates, return existing medicine
    if (Object.keys(finalUpdate).length === 0) {
      const medicine = await models.Medicine.findById(medicineId);
      if (!medicine) {
        throw new Error('Medicine not found');
      }
      return medicine;
    }

    const medicine = await models.Medicine.findByIdAndUpdate(
      medicineId,
      finalUpdate,
      { new: true, runValidators: true }
    );

    if (!medicine) {
      throw new Error('Medicine not found');
    }

    // Invalidate cache
    await redisManager.del(CacheKeys.MEDICINE(medicineId));
    await redisManager.del(CacheKeys.MEDICINE_LIST(tenantId));
    await invalidateCacheByPattern([CacheKeys.MEDICINE_SEARCH_PATTERN(tenantId)]);

    return medicine;
  }

  /**
   * Delete medicine
   */
  async deleteMedicine(tenantId: string, medicineId: string): Promise<void> {
    const models = await getTenantModels(tenantId);

    // Check if medicine has inventory
    const batchCount = await models.InventoryBatch.countDocuments({
      medicineId: new Types.ObjectId(medicineId),
      quantity: { $gt: 0 },
    });

    if (batchCount > 0) {
      throw new Error('Cannot delete medicine with existing stock. Please clear inventory first.');
    }

    await models.Medicine.findByIdAndDelete(medicineId);

    // Invalidate cache
    await redisManager.del(CacheKeys.MEDICINE(medicineId));
    await redisManager.del(CacheKeys.MEDICINE_LIST(tenantId));
    await invalidateCacheByPattern([CacheKeys.MEDICINE_SEARCH_PATTERN(tenantId)]);
  }

  /**
   * Add inventory batch
   */
  async addBatch(tenantId: string, data: CreateBatchDTO): Promise<any> {
    // Validate input
    validate(data, {
      medicineId: { required: true },
      batchNumber: { required: true, minLength: 1, maxLength: 50 },
      expiryDate: { required: true },
      purchasePrice: { required: true, min: 0 },
      mrp: { required: true, min: 0 },
      sellingPrice: { required: true, min: 0 },
      quantity: { required: true, min: 1 },
    });

    const models = await getTenantModels(tenantId);

    // Verify medicine exists
    const medicine = await models.Medicine.findById(data.medicineId);
    if (!medicine) {
      throw new Error('Medicine not found');
    }

    // Check for duplicate batch number for same medicine
    const existing = await models.InventoryBatch.findOne({
      medicineId: new Types.ObjectId(data.medicineId),
      batchNumber: data.batchNumber,
    });

    if (existing) {
      throw new ValidationError({ batchNumber: 'Batch number already exists for this medicine' });
    }

    // Create batch
    const batch = await models.InventoryBatch.create({
      ...data,
      initialQuantity: data.quantity,
      alertThreshold: data.alertThreshold || medicine.minStockLevel,
      purchaseDate: data.purchaseDate || new Date(),
    });

    // Invalidate cache
    await this.invalidateInventoryCache(tenantId);

    return batch;
  }

  /**
   * Get all batches for a medicine
   */
  async getBatchesByMedicine(tenantId: string, medicineId: string): Promise<any> {
    const models = await getTenantModels(tenantId);

    const batches = await models.InventoryBatch.find({
      medicineId: new Types.ObjectId(medicineId),
    })
      .sort({ expiryDate: 1, createdAt: -1 })
      .populate('supplierId', 'companyName');

    return batches;
  }

  /**
   * Get batch by ID
   */
  async getBatchById(tenantId: string, batchId: string): Promise<any> {
    const models = await getTenantModels(tenantId);

    const batch = await models.InventoryBatch.findById(batchId).populate([
      { path: 'medicineId', select: 'name genericName manufacturer' },
      { path: 'supplierId', select: 'companyName' },
    ]);

    if (!batch) {
      throw new Error('Batch not found');
    }

    return batch;
  }

  /**
   * Update batch
   */
  async updateBatch(tenantId: string, batchId: string, data: UpdateBatchDTO): Promise<any> {
    const models = await getTenantModels(tenantId);

    const batch = await models.InventoryBatch.findByIdAndUpdate(
      batchId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!batch) {
      throw new Error('Batch not found');
    }

    // Invalidate cache
    await this.invalidateInventoryCache(tenantId);

    return batch;
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary(tenantId: string): Promise<InventorySummary> {
    // Try cache first
    const cacheKey = CacheKeys.INVENTORY_SUMMARY(tenantId);
    const cached = await redisManager.get<InventorySummary>(cacheKey);

    if (cached) {
      return cached;
    }

    const models = await getTenantModels(tenantId);

    const [
      totalMedicines,
      totalBatches,
      stockValue,
      lowStockCount,
      nearExpiryCount,
      expiredCount,
      outOfStockCount,
    ] = await Promise.all([
      models.Medicine.countDocuments({ isActive: true }),
      models.InventoryBatch.countDocuments({ quantity: { $gt: 0 } }),
      models.InventoryBatch.aggregate([
        { $match: { quantity: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$quantity', '$purchasePrice'] } },
          },
        },
      ]),
      models.InventoryBatch.countDocuments({
        quantity: { $gt: 0, $lte: 10 },
        status: InventoryStatus.ACTIVE,
      }),
      models.InventoryBatch.countDocuments({ status: InventoryStatus.NEAR_EXPIRY }),
      models.InventoryBatch.countDocuments({ status: InventoryStatus.EXPIRED }),
      models.InventoryBatch.countDocuments({ status: InventoryStatus.OUT_OF_STOCK }),
    ]);

    const summary: InventorySummary = {
      totalMedicines,
      totalBatches,
      totalStockValue: stockValue[0]?.total || 0,
      lowStockCount,
      nearExpiryCount,
      expiredCount,
      outOfStockCount,
    };

    // Cache for 5 minutes
    await redisManager.set(cacheKey, summary, CacheTTL.INVENTORY_SUMMARY);

    return summary;
  }

  /**
   * Get expiry alerts
   */
  async getExpiryAlerts(tenantId: string, days: number = 90): Promise<ExpiryAlert[]> {
    // Try cache first
    const cacheKey = CacheKeys.EXPIRY_ALERTS(tenantId);
    const cached = await redisManager.get<ExpiryAlert[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const models = await getTenantModels(tenantId);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const batches = await models.InventoryBatch.find({
      expiryDate: { $lte: futureDate },
      quantity: { $gt: 0 },
      status: { $in: [InventoryStatus.ACTIVE, InventoryStatus.NEAR_EXPIRY] },
    })
      .populate('medicineId', 'name genericName')
      .sort({ expiryDate: 1 })
      .limit(100);

    const alerts: ExpiryAlert[] = batches.map((batch: any) => {
      const daysUntilExpiry = Math.ceil(
        (batch.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        medicineId: batch.medicineId._id,
        medicineName: batch.medicineId.name,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: batch.quantity,
        daysUntilExpiry,
      };
    });

    // Cache for 30 minutes
    await redisManager.set(cacheKey, alerts, CacheTTL.ALERTS);

    return alerts;
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(tenantId: string): Promise<LowStockAlert[]> {
    // Try cache first
    const cacheKey = CacheKeys.LOW_STOCK_ALERTS(tenantId);
    const cached = await redisManager.get<LowStockAlert[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const models = await getTenantModels(tenantId);

    const alerts = await models.Medicine.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'inventory_batches',
          localField: '_id',
          foreignField: 'medicineId',
          as: 'batches',
        },
      },
      {
        $addFields: {
          totalStock: {
            $sum: {
              $map: {
                input: '$batches',
                as: 'batch',
                in: '$$batch.quantity',
              },
            },
          },
          batchesCount: { $size: '$batches' },
        },
      },
      {
        $match: {
          $expr: { $lt: ['$totalStock', '$minStockLevel'] },
        },
      },
      {
        $project: {
          medicineId: '$_id',
          medicineName: '$name',
          currentStock: '$totalStock',
          minStockLevel: 1,
          batchesCount: 1,
        },
      },
      { $sort: { currentStock: 1 } },
      { $limit: 100 },
    ]);

    // Cache for 30 minutes
    await redisManager.set(cacheKey, alerts, CacheTTL.ALERTS);

    return alerts;
  }

  /**
   * Search medicines (optimized for POS)
   */
  async searchMedicines(tenantId: string, query: string, limit: number = 20): Promise<any> {
    const cacheHash = buildCacheHash({ query, limit });
    const cacheKey = CacheKeys.MEDICINE_SEARCH(tenantId, cacheHash);

    const { data } = await swrFetch(
      cacheKey,
      async () => {
        const models = await getTenantModels(tenantId);

        const medicines = await models.Medicine.find({
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { genericName: { $regex: query, $options: 'i' } },
            { barcode: query },
          ],
          isActive: true,
        })
          .limit(limit)
          .select('name genericName manufacturer category strength unit barcode');

        const medicinesWithStock = await Promise.all(
          medicines.map(async (medicine) => {
            const batches = await models.InventoryBatch.find({
              medicineId: medicine._id,
              quantity: { $gt: 0 },
              status: InventoryStatus.ACTIVE,
            })
              .sort({ expiryDate: 1 })
              .select('batchNumber expiryDate quantity mrp sellingPrice');

            const totalStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);

            return {
              ...medicine.toObject(),
              totalStock,
              batches: batches.slice(0, 5),
            };
          })
        );

        return medicinesWithStock;
      },
      {
        ttlSeconds: CacheTTL.MEDICINE_SEARCH,
        staleSeconds: Math.floor(CacheTTL.MEDICINE_SEARCH / 2),
        tenantId,
        tag: 'medicine:search',
      }
    );

    return data;
  }

  /**
   * Invalidate inventory cache
   */
  private async invalidateInventoryCache(tenantId: string): Promise<void> {
    await Promise.all([
      redisManager.del(CacheKeys.INVENTORY_SUMMARY(tenantId)),
      redisManager.del(CacheKeys.LOW_STOCK_ALERTS(tenantId)),
      redisManager.del(CacheKeys.EXPIRY_ALERTS(tenantId)),
      redisManager.del(CacheKeys.MEDICINE_LIST(tenantId)),
      invalidateCacheByPattern([CacheKeys.MEDICINE_SEARCH_PATTERN(tenantId)]),
    ]);
  }
}

export default new InventoryService();

