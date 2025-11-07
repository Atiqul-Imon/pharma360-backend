import mongoose, { Schema, Model } from 'mongoose';
import { ITenant } from '../../../shared/types/index.js';

const tenantSchema = new Schema<ITenant>(
  {
    pharmacyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise', 'hospital'],
      default: 'basic',
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trial', 'suspended', 'cancelled'],
      default: 'trial',
      index: true,
    },
    subscriptionStartDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    subscriptionEndDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    settings: {
      language: {
        type: String,
        enum: ['en', 'bn'],
        default: 'en',
      },
      currency: {
        type: String,
        default: 'BDT',
      },
      timezone: {
        type: String,
        default: 'Asia/Dhaka',
      },
      taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
  },
  {
    timestamps: true,
    collection: 'tenants',
  }
);

// Indexes for optimized queries
tenantSchema.index({ subscriptionStatus: 1, subscriptionEndDate: 1 });
tenantSchema.index({ createdAt: -1 });
tenantSchema.index({ isActive: 1, subscriptionPlan: 1 });

// Create Tenant model for admin database
export function createTenantModel(connection: mongoose.Connection): Model<ITenant> {
  return connection.model<ITenant>('Tenant', tenantSchema);
}

export default tenantSchema;

