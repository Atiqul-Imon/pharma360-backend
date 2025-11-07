import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import { PurchaseStatus, PaymentStatus, PaymentMethod } from '../../../shared/types/index.js';

export interface IPurchaseItem {
  medicineId: Types.ObjectId;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  freeQuantity: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  expiryDate: Date;
  receivedQuantity: number;
  receivedFreeQuantity: number;
  total: number;
  alertThreshold?: number;
  notes?: string;
}

export interface IPurchasePayment {
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: Date;
  reference?: string;
  note?: string;
  recordedBy: Types.ObjectId;
}

export interface IPurchase extends Document {
  purchaseOrderNumber: string;
  supplierInvoiceNumber?: string;
  supplierId: Types.ObjectId;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  items: IPurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  dueAmount: number;
  paymentStatus: PaymentStatus;
  status: PurchaseStatus;
  createdBy: Types.ObjectId;
  receivedBy?: Types.ObjectId;
  payments: IPurchasePayment[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseItemSchema = new Schema<IPurchaseItem>(
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
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    freeQuantity: {
      type: Number,
      default: 0,
      min: 0,
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
    expiryDate: {
      type: Date,
      required: true,
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    receivedFreeQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    alertThreshold: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

const purchasePaymentSchema = new Schema<IPurchasePayment>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    paidAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 250,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  { _id: false, timestamps: false }
);

const purchaseSchema = new Schema<IPurchase>(
  {
    purchaseOrderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    supplierInvoiceNumber: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    receivedDate: {
      type: Date,
    },
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: {
        validator: (items: IPurchaseItem[]) => items.length > 0,
        message: 'Purchase must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
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
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    payments: {
      type: [purchasePaymentSchema],
      default: [],
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PurchaseStatus),
      default: PurchaseStatus.ORDERED,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: 'purchases',
  }
);

// Indexes for purchase management
purchaseSchema.index({ purchaseOrderNumber: 1 }, { unique: true });
purchaseSchema.index({ supplierId: 1, orderDate: -1 });
purchaseSchema.index({ paymentStatus: 1, dueAmount: -1 });
purchaseSchema.index({ status: 1, orderDate: -1 });
purchaseSchema.index({ orderDate: -1, status: 1 });
purchaseSchema.index({ expectedDeliveryDate: 1, status: 1 });
purchaseSchema.index({ supplierInvoiceNumber: 1 });

// Create Purchase model for tenant database
export function createPurchaseModel(connection: mongoose.Connection): Model<IPurchase> {
  return connection.model<IPurchase>('Purchase', purchaseSchema);
}

export default purchaseSchema;

