import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import { PaymentMethod, SaleStatus } from '../../../shared/types/index.js';

export interface ISaleItem {
  medicineId: Types.ObjectId;
  medicineName: string; // Denormalized for performance
  batchId: Types.ObjectId;
  batchNumber: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discount: number;
  total: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  customerId?: Types.ObjectId;
  items: ISaleItem[];
  subtotal: number;
  totalDiscount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeReturned: number;
  prescriptionId?: Types.ObjectId;
  soldBy: Types.ObjectId;
  counterId?: Types.ObjectId;
  saleType: string;
  saleDate: Date;
  status: SaleStatus;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicineName: {
      type: String,
      required: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryBatch',
      required: true,
    },
    batchNumber: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
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
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (items: ISaleItem[]) => items.length > 0,
        message: 'Sale must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    changeReturned: {
      type: Number,
      default: 0,
      min: 0,
    },
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Prescription',
    },
    soldBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    counterId: {
      type: Schema.Types.ObjectId,
      ref: 'Counter',
    },
    saleType: {
      type: String,
      enum: ['retail', 'wholesale', 'insurance'],
      default: 'retail',
    },
    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SaleStatus),
      default: SaleStatus.COMPLETED,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'sales',
  }
);

// Critical indexes for fast sales queries and reports
saleSchema.index({ invoiceNumber: 1 }, { unique: true });
saleSchema.index({ saleDate: -1 }); // Recent sales first
saleSchema.index({ customerId: 1, saleDate: -1 });
saleSchema.index({ 'items.medicineId': 1, saleDate: -1 }); // Medicine-wise sales
saleSchema.index({ soldBy: 1, saleDate: -1 }); // Employee performance
saleSchema.index({ counterId: 1, saleDate: -1 }); // Counter performance
saleSchema.index({ status: 1, saleDate: -1 });

// Compound index for daily/monthly reports (critical for analytics)
saleSchema.index({
  saleDate: -1,
  status: 1,
  paymentMethod: 1,
});

// Create Sale model for tenant database
export function createSaleModel(connection: mongoose.Connection): Model<ISale> {
  return connection.model<ISale>('Sale', saleSchema);
}

export default saleSchema;

