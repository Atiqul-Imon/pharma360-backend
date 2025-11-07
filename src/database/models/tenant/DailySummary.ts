import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface ITopSellingMedicine {
  medicineId: Types.ObjectId;
  medicineName: string;
  quantity: number;
  revenue: number;
}

export interface IDailySummary extends Document {
  date: Date;
  totalSales: number;
  totalProfit: number;
  itemsSold: number;
  uniqueCustomers: number;
  totalPurchases: number;
  topSellingMedicines: ITopSellingMedicine[];
  cashSales: number;
  cardSales: number;
  mobileBankingSales: number;
  creditSales: number;
  createdAt: Date;
  updatedAt: Date;
}

const topSellingMedicineSchema = new Schema<ITopSellingMedicine>(
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
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    revenue: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const dailySummarySchema = new Schema<IDailySummary>(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
      index: true,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    itemsSold: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueCustomers: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    topSellingMedicines: {
      type: [topSellingMedicineSchema],
      default: [],
    },
    cashSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    cardSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    mobileBankingSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditSales: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'daily_summaries',
  }
);

// Indexes for analytics
dailySummarySchema.index({ date: -1 }); // Recent summaries first
dailySummarySchema.index({ date: 1, totalSales: -1 });

// Create DailySummary model for tenant database
export function createDailySummaryModel(connection: mongoose.Connection): Model<IDailySummary> {
  return connection.model<IDailySummary>('DailySummary', dailySummarySchema);
}

export default dailySummarySchema;

