import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dateOfBirth?: Date;
  gender?: string;
  loyaltyPoints: number;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  dueAmount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPurchaseDate: {
      type: Date,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'vip'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'customers',
  }
);

// Indexes for fast customer lookup
customerSchema.index({ phone: 1 }, { unique: true, sparse: true });
customerSchema.index({ name: 'text', phone: 'text' }); // Full-text search
customerSchema.index({ loyaltyPoints: -1 }); // Top customers
customerSchema.index({ dueAmount: -1 }); // Outstanding dues
customerSchema.index({ status: 1, totalPurchases: -1 });

// Create Customer model for tenant database
export function createCustomerModel(connection: mongoose.Connection): Model<ICustomer> {
  return connection.model<ICustomer>('Customer', customerSchema);
}

export default customerSchema;

