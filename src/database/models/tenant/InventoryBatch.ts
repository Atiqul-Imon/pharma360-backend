import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import { InventoryStatus } from '../../../shared/types/index.js';

export interface IInventoryBatch extends Document {
  medicineId: Types.ObjectId;
  batchNumber: string;
  expiryDate: Date;
  purchaseDate: Date;
  supplierId?: Types.ObjectId;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  initialQuantity: number;
  alertThreshold: number;
  status: InventoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryBatchSchema = new Schema<IInventoryBatch>(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    initialQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    alertThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(InventoryStatus),
      default: InventoryStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'inventory_batches',
  }
);

// Critical compound indexes for POS performance and inventory management
inventoryBatchSchema.index({ medicineId: 1, expiryDate: 1, quantity: 1 });
inventoryBatchSchema.index({ expiryDate: 1, status: 1 }); // Expiry alerts
inventoryBatchSchema.index({ quantity: 1, status: 1 }); // Low stock
inventoryBatchSchema.index({ status: 1, medicineId: 1 });
inventoryBatchSchema.index({ medicineId: 1, status: 1, expiryDate: 1 });
inventoryBatchSchema.index({ batchNumber: 1, medicineId: 1 }, { unique: true });

// Pre-save hook to auto-update status based on quantity and expiry
inventoryBatchSchema.pre('save', function (next) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (this.quantity === 0) {
    this.status = InventoryStatus.OUT_OF_STOCK;
  } else if (this.expiryDate < now) {
    this.status = InventoryStatus.EXPIRED;
  } else if (this.expiryDate < thirtyDaysFromNow) {
    this.status = InventoryStatus.NEAR_EXPIRY;
  } else {
    this.status = InventoryStatus.ACTIVE;
  }

  next();
});

// Create InventoryBatch model for tenant database
export function createInventoryBatchModel(connection: mongoose.Connection): Model<IInventoryBatch> {
  return connection.model<IInventoryBatch>('InventoryBatch', inventoryBatchSchema);
}

export default inventoryBatchSchema;

