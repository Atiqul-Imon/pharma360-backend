import mongoose, { Schema, Model, Document } from 'mongoose';
import { MedicineCategory, MedicineSchedule } from '../../../shared/types/index.js';

export interface IMedicine extends Document {
  name: string;
  genericName: string;
  manufacturer: string;
  category: MedicineCategory;
  strength: string;
  unit: string;
  barcode?: string;
  minStockLevel: number;
  maxStockLevel?: number;
  shelf?: string;
  schedule?: MedicineSchedule;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    manufacturer: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(MedicineCategory),
      required: true,
      index: true,
    },
    strength: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: undefined,
      set: (value: string | undefined | null) => {
        // Convert empty strings, null, or undefined to undefined to work properly with sparse index
        if (value === null || value === undefined) {
          return undefined;
        }
        const trimmed = String(value).trim();
        return trimmed === '' ? undefined : trimmed;
      },
    },
    minStockLevel: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
    },
    maxStockLevel: {
      type: Number,
      min: 0,
    },
    shelf: {
      type: String,
      trim: true,
    },
    schedule: {
      type: String,
      enum: Object.values(MedicineSchedule),
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'medicines',
  }
);

// Critical indexes for super-fast queries
medicineSchema.index({ barcode: 1 }, { unique: true, sparse: true });
medicineSchema.index({ name: 'text', genericName: 'text' }); // Full-text search
medicineSchema.index({ category: 1, isActive: 1 });
medicineSchema.index({ genericName: 1, manufacturer: 1 });
medicineSchema.index({ isActive: 1, category: 1 });

// Create Medicine model for tenant database
export function createMedicineModel(connection: mongoose.Connection): Model<IMedicine> {
  return connection.model<IMedicine>('Medicine', medicineSchema);
}

export default medicineSchema;

