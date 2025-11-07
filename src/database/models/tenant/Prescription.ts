import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import { PrescriptionStatus } from '../../../shared/types/index.js';

export interface IPrescriptionMedication {
  medicineId?: Types.ObjectId;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface IPrescription extends Document {
  customerId: Types.ObjectId;
  doctorId?: Types.ObjectId;
  prescriptionNumber: string;
  uploadedImage?: string;
  medications: IPrescriptionMedication[];
  diagnosis?: string;
  notes?: string;
  prescriptionDate: Date;
  validUntil: Date;
  status: PrescriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionMedicationSchema = new Schema<IPrescriptionMedication>(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const prescriptionSchema = new Schema<IPrescription>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    prescriptionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    uploadedImage: {
      type: String,
      trim: true,
    },
    medications: {
      type: [prescriptionMedicationSchema],
      required: true,
      validate: {
        validator: (meds: IPrescriptionMedication[]) => meds.length > 0,
        message: 'Prescription must have at least one medication',
      },
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    prescriptionDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PrescriptionStatus),
      default: PrescriptionStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'prescriptions',
  }
);

// Indexes for prescription management
prescriptionSchema.index({ customerId: 1, prescriptionDate: -1 });
prescriptionSchema.index({ prescriptionNumber: 1 }, { unique: true });
prescriptionSchema.index({ status: 1, validUntil: 1 });
prescriptionSchema.index({ prescriptionDate: -1, status: 1 });

// Create Prescription model for tenant database
export function createPrescriptionModel(connection: mongoose.Connection): Model<IPrescription> {
  return connection.model<IPrescription>('Prescription', prescriptionSchema);
}

export default prescriptionSchema;

