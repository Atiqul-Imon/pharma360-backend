export interface CreateSupplierDTO {
  name: string;
  companyName: string;
  phone: string;
  email?: string;
  address: string;
  licenseNumber?: string;
  creditLimit?: number;
  rating?: number;
}

export interface UpdateSupplierDTO {
  name?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  licenseNumber?: string;
  creditLimit?: number;
  rating?: number;
  isActive?: boolean;
}

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
  minDue?: number;
  maxDue?: number;
}

export interface SupplierPaymentSummary {
  currentDue: number;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  purchaseCount: number;
}


