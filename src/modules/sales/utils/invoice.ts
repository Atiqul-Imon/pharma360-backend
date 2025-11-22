import { Model, ClientSession } from 'mongoose';
import { ICounterSequence } from '../../../database/models/tenant/CounterSequence.js';

export async function generateInvoiceNumber(
  counterModel: Model<ICounterSequence>,
  session: ClientSession
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  const counter = await counterModel.findOneAndUpdate(
    { scope: 'sale', date: dateStr },
    { $inc: { sequence: 1 } },
    {
      upsert: true,
      new: true,
      session,
      setDefaultsOnInsert: true,
    }
  );

  const sequence = counter.sequence;
  return `INV-${dateStr}-${String(sequence).padStart(4, '0')}`;
}

