import mongoose, { Schema, Model } from 'mongoose';
import { IUser, UserRole } from '../../../shared/types/index.js';

const userSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
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
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Compound indexes for optimized queries
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, isActive: 1 });
userSchema.index({ email: 1, isActive: 1 });

// Create User model for admin database
export function createUserModel(connection: mongoose.Connection): Model<IUser> {
  return connection.model<IUser>('User', userSchema);
}

export default userSchema;

