import { Types } from 'mongoose';
import { getTenantModels } from '../../database/index.js';
import { validate, ValidationError } from '../../shared/utils/validation.js';
import { CreateSupplierDTO, UpdateSupplierDTO, SupplierFilters, SupplierPaymentSummary } from './types.js';

class SupplierService {
  async createSupplier(tenantId: string, data: CreateSupplierDTO): Promise<any> {
    validate(data, {
      name: { required: true, minLength: 2, maxLength: 80 },
      companyName: { required: true, minLength: 2, maxLength: 120 },
      phone: { required: true, phone: true },
      email: { email: true },
      address: { required: true, minLength: 5, maxLength: 250 },
    });

    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new ValidationError({ rating: 'Rating must be between 1 and 5' });
    }

    const models = await getTenantModels(tenantId);

    const existing = await models.Supplier.findOne({
      $or: [{ phone: data.phone }, { companyName: data.companyName }],
    });

    if (existing) {
      if (existing.phone === data.phone) {
        throw new ValidationError({ phone: 'Supplier with this phone already exists' });
      }
      throw new ValidationError({ companyName: 'Supplier with this company name already exists' });
    }

    const supplier = await models.Supplier.create({
      name: data.name,
      companyName: data.companyName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      licenseNumber: data.licenseNumber,
      creditLimit: data.creditLimit ?? 0,
      rating: data.rating ?? 5,
    });

    return supplier;
  }

  async getSuppliers(
    tenantId: string,
    page: number = 1,
    limit: number = 25,
    filters: SupplierFilters = {}
  ): Promise<any> {
    const models = await getTenantModels(tenantId);
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.search) {
      query.$or = [
        { companyName: { $regex: filters.search, $options: 'i' } },
        { name: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.minDue !== undefined || filters.maxDue !== undefined) {
      query.currentDue = {};
      if (filters.minDue !== undefined) {
        query.currentDue.$gte = filters.minDue;
      }
      if (filters.maxDue !== undefined) {
        query.currentDue.$lte = filters.maxDue;
      }
    }

    const [suppliers, total] = await Promise.all([
      models.Supplier.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      models.Supplier.countDocuments(query),
    ]);

    return {
      suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSupplierById(tenantId: string, supplierId: string): Promise<any> {
    const models = await getTenantModels(tenantId);

    const supplier = await models.Supplier.findById(supplierId);

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const summary = await this.getSupplierPurchaseSummary(tenantId, supplierId);

    return { supplier, summary };
  }

  async updateSupplier(
    tenantId: string,
    supplierId: string,
    data: UpdateSupplierDTO
  ): Promise<any> {
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new ValidationError({ rating: 'Rating must be between 1 and 5' });
    }

    const models = await getTenantModels(tenantId);

    if (data.phone) {
      const existing = await models.Supplier.findOne({
        phone: data.phone,
        _id: { $ne: supplierId },
      });

      if (existing) {
        throw new ValidationError({ phone: 'Supplier with this phone already exists' });
      }
    }

    if (data.companyName) {
      const existingCompany = await models.Supplier.findOne({
        companyName: data.companyName,
        _id: { $ne: supplierId },
      });

      if (existingCompany) {
        throw new ValidationError({ companyName: 'Supplier with this company name already exists' });
      }
    }

    const supplier = await models.Supplier.findByIdAndUpdate(
      supplierId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplier;
  }

  async toggleSupplierStatus(
    tenantId: string,
    supplierId: string,
    isActive: boolean
  ): Promise<any> {
    const models = await getTenantModels(tenantId);

    const supplier = await models.Supplier.findByIdAndUpdate(
      supplierId,
      { $set: { isActive } },
      { new: true }
    );

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplier;
  }

  async deleteSupplier(tenantId: string, supplierId: string): Promise<void> {
    const models = await getTenantModels(tenantId);

    const supplier = await models.Supplier.findById(supplierId);

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    if (supplier.currentDue > 0) {
      throw new ValidationError({
        currentDue: 'Cannot delete supplier with outstanding dues',
      });
    }

    const hasPurchases = await models.Purchase.exists({ supplierId });

    if (hasPurchases) {
      throw new ValidationError({
        purchases: 'Cannot delete supplier with purchase history. Deactivate instead.',
      });
    }

    await models.Supplier.findByIdAndDelete(supplierId);
  }

  async getSupplierPurchaseSummary(
    tenantId: string,
    supplierId: string
  ): Promise<SupplierPaymentSummary> {
    const models = await getTenantModels(tenantId);

    const [totals, latestPurchase] = await Promise.all([
      models.Purchase.aggregate([
        { $match: { supplierId: new Types.ObjectId(supplierId) } },
        {
          $group: {
            _id: '$supplierId',
            totalPurchases: { $sum: '$grandTotal' },
            currentDue: { $sum: '$dueAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      models.Purchase.findOne({ supplierId }).sort({ orderDate: -1 }).select('orderDate'),
    ]);

    const summary: SupplierPaymentSummary = {
      currentDue: totals[0]?.currentDue || 0,
      totalPurchases: totals[0]?.totalPurchases || 0,
      purchaseCount: totals[0]?.count || 0,
      lastPurchaseDate: latestPurchase?.orderDate,
    };

    return summary;
  }
}

export default new SupplierService();


