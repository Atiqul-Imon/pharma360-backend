import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ICounterSequence extends Document {
  scope: string;
  date: string;
  sequence: number;
  updatedAt: Date;
}

const counterSequenceSchema = new Schema<ICounterSequence>(
  {
    scope: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: 'counter_sequences',
  }
);

counterSequenceSchema.index({ scope: 1, date: 1 }, { unique: true });

export function createCounterSequenceModel(
  connection: mongoose.Connection
): Model<ICounterSequence> {
  return connection.model<ICounterSequence>('CounterSequence', counterSequenceSchema);
}

export default counterSequenceSchema;

