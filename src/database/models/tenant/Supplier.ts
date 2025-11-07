import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  companyName: string;
  phone: string;
  email?: string;
  address: string;
  licenseNumber?: string;
  creditLimit: number;
  currentDue: number;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  rating: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentDue: {
      type: Number,
      default: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchaseDate: {
      type: Date,
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'suppliers',
  }
);

// Indexes for supplier management
supplierSchema.index({ companyName: 'text', name: 'text' });
supplierSchema.index({ isActive: 1, rating: -1 });
supplierSchema.index({ currentDue: -1 });

// Create Supplier model for tenant database
export function createSupplierModel(connection: mongoose.Connection): Model<ISupplier> {
  return connection.model<ISupplier>('Supplier', supplierSchema);
}

export default supplierSchema;

