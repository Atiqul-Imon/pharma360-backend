/**
 * Database models export
 * Provides centralized access to all database models
 */

import { mongoDBManager } from './mongodb.js';

// Admin models
import { createTenantModel } from './models/admin/Tenant.js';
import { createUserModel } from './models/admin/User.js';

// Tenant models
import { createMedicineModel } from './models/tenant/Medicine.js';
import { createInventoryBatchModel } from './models/tenant/InventoryBatch.js';
import { createSaleModel } from './models/tenant/Sale.js';
import { createCustomerModel } from './models/tenant/Customer.js';
import { createPurchaseModel } from './models/tenant/Purchase.js';
import { createPrescriptionModel } from './models/tenant/Prescription.js';
import { createSupplierModel } from './models/tenant/Supplier.js';
import { createDoctorModel } from './models/tenant/Doctor.js';
import { createDailySummaryModel } from './models/tenant/DailySummary.js';

/**
 * Get admin database models
 */
export function getAdminModels() {
  const connection = mongoDBManager.getAdminConnection();

  return {
    Tenant: createTenantModel(connection),
    User: createUserModel(connection),
  };
}

/**
 * Get tenant database models
 */
export async function getTenantModels(tenantId: string) {
  const connection = await mongoDBManager.getTenantConnection(tenantId);

  return {
    Medicine: createMedicineModel(connection),
    InventoryBatch: createInventoryBatchModel(connection),
    Sale: createSaleModel(connection),
    Customer: createCustomerModel(connection),
    Purchase: createPurchaseModel(connection),
    Prescription: createPrescriptionModel(connection),
    Supplier: createSupplierModel(connection),
    Doctor: createDoctorModel(connection),
    DailySummary: createDailySummaryModel(connection),
  };
}

export default {
  getAdminModels,
  getTenantModels,
};

