import { Types } from 'mongoose';
import { MedicineCategory, MedicineSchedule, InventoryStatus } from '../../shared/types/index.js';

export interface CreateMedicineDTO {
  name: string;
  genericName: string;
  manufacturer: string;
  category: MedicineCategory;
  strength: string;
  unit: string;
  barcode?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  shelf?: string;
  schedule?: MedicineSchedule;
}

export interface UpdateMedicineDTO {
  name?: string;
  genericName?: string;
  manufacturer?: string;
  category?: MedicineCategory;
  strength?: string;
  unit?: string;
  barcode?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  shelf?: string;
  schedule?: MedicineSchedule;
  isActive?: boolean;
}

export interface CreateBatchDTO {
  medicineId: string;
  batchNumber: string;
  expiryDate: Date | string;
  purchaseDate?: Date | string;
  supplierId?: string;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  alertThreshold?: number;
}

export interface UpdateBatchDTO {
  quantity?: number;
  sellingPrice?: number;
  status?: InventoryStatus;
}

export interface InventorySummary {
  totalMedicines: number;
  totalBatches: number;
  totalStockValue: number;
  lowStockCount: number;
  nearExpiryCount: number;
  expiredCount: number;
  outOfStockCount: number;
}

export interface ExpiryAlert {
  medicineId: Types.ObjectId;
  medicineName: string;
  batchId: Types.ObjectId;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  daysUntilExpiry: number;
}

export interface LowStockAlert {
  medicineId: Types.ObjectId;
  medicineName: string;
  currentStock: number;
  minStockLevel: number;
  batchesCount: number;
}

// No default export needed - types are exported individually

