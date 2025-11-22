import mongoose, { Schema, Model, Document } from 'mongoose';
import { CounterStatus } from '../../../shared/types/index.js';

export interface ICounter extends Document {
  name: string;
  status: CounterStatus;
  isDefault: boolean;
  lastSessionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const counterSchema = new Schema<ICounter>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(CounterStatus),
      default: CounterStatus.ACTIVE,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    lastSessionAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'counters',
  }
);

counterSchema.index({ name: 1 }, { unique: true });
counterSchema.index({ status: 1 });

export function createCounterModel(connection: mongoose.Connection): Model<ICounter> {
  return connection.model<ICounter>('Counter', counterSchema);
}

export default counterSchema;

