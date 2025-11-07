import { PaymentMethod, PaymentStatus, PurchaseStatus } from '../../shared/types/index.js';

export interface PurchaseItemInput {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  freeQuantity?: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  expiryDate: string | Date;
  alertThreshold?: number;
  notes?: string;
}

export interface CreatePurchaseDTO {
  supplierId: string;
  supplierInvoiceNumber?: string;
  orderDate?: string | Date;
  expectedDeliveryDate?: string | Date;
  items: PurchaseItemInput[];
  discount?: number;
  tax?: number;
  amountPaid?: number;
  initialPaymentMethod?: PaymentMethod;
  notes?: string;
}

export interface ReceivePurchaseItemDTO {
  medicineId: string;
  batchNumber: string;
  quantityReceived?: number;
  freeQuantityReceived?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  expiryDate?: string | Date;
  notes?: string;
  alertThreshold?: number;
}

export interface ReceivePurchaseDTO {
  receivedDate?: string | Date;
  notes?: string;
  items?: ReceivePurchaseItemDTO[];
}

export interface RecordPurchasePaymentDTO {
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt?: string | Date;
  reference?: string;
  note?: string;
}

export interface PurchaseFilters {
  status?: PurchaseStatus;
  paymentStatus?: PaymentStatus;
  supplierId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  search?: string;
}


