import { PaymentMethod, SaleStatus } from '../../shared/types/index.js';

export interface SaleItemDTO {
  medicineId: string;
  batchId: string;
  quantity: number;
  sellingPrice?: number;  // Optional, will use batch price if not provided
  discount?: number;
}

export interface CreateSaleDTO {
  customerId?: string;
  items: SaleItemDTO[];
  totalDiscount?: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  prescriptionId?: string;
  saleType?: 'retail' | 'wholesale' | 'insurance';
  counterId?: string;
}

export interface ReturnSaleDTO {
  items: {
    saleItemIndex: number;
    quantity: number;
    reason?: string;
  }[];
}

export interface SaleFilters {
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  paymentMethod?: PaymentMethod;
  status?: SaleStatus;
  soldBy?: string;
}

export interface DailySalesReport {
  date: Date;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  cashSales: number;
  cardSales: number;
  mobileBankingSales: number;
  creditSales: number;
  topSellingMedicines: Array<{
    medicineId: string;
    medicineName: string;
    quantitySold: number;
    revenue: number;
  }>;
}

// No default export needed - types are exported individually

