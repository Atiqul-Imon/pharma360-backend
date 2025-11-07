import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IDoctor extends Document {
  name: string;
  specialization: string;
  phone: string;
  email?: string;
  hospitalName?: string;
  registrationNumber: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
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
    hospitalName: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'doctors',
  }
);

// Indexes for doctor management
doctorSchema.index({ name: 'text', specialization: 'text' });
doctorSchema.index({ registrationNumber: 1 }, { unique: true });
doctorSchema.index({ isActive: 1, specialization: 1 });

// Create Doctor model for tenant database
export function createDoctorModel(connection: mongoose.Connection): Model<IDoctor> {
  return connection.model<IDoctor>('Doctor', doctorSchema);
}

export default doctorSchema;

