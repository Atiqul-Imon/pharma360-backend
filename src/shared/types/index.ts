import { Request } from 'express';
import { Types } from 'mongoose';

// User roles
export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  PHARMACIST = 'pharmacist',
  CASHIER = 'cashier',
}

// User interface
export interface IUser {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tenant interface
export interface ITenant {
  _id: Types.ObjectId;
  pharmacyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  licenseNumber: string;
  subscriptionPlan: 'basic' | 'professional' | 'enterprise' | 'hospital';
  subscriptionStatus: 'active' | 'trial' | 'suspended' | 'cancelled';
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  isActive: boolean;
  settings: {
    language: 'en' | 'bn';
    currency: string;
    timezone: string;
    taxRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Extended Request with user and tenant info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: UserRole;
    permissions: string[];
  };
  tenant?: ITenant;
}

// API Response format
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Pagination params
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Medicine Category
export enum MedicineCategory {
  TABLET = 'Tablet',
  CAPSULE = 'Capsule',
  SYRUP = 'Syrup',
  INJECTION = 'Injection',
  CREAM = 'Cream',
  OINTMENT = 'Ointment',
  DROP = 'Drop',
  SPRAY = 'Spray',
  INHALER = 'Inhaler',
  OTHER = 'Other',
}

// Medicine Schedule (Bangladesh Pharmacy Council)
export enum MedicineSchedule {
  H = 'H', // High alert
  G = 'G', // General
  X = 'X', // Controlled substance
}

// Inventory Status
export enum InventoryStatus {
  ACTIVE = 'active',
  NEAR_EXPIRY = 'near_expiry',
  EXPIRED = 'expired',
  OUT_OF_STOCK = 'out_of_stock',
}

// Payment Method
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE_BANKING = 'mobile_banking',
  CREDIT = 'credit',
}

// Sale Status
export enum SaleStatus {
  COMPLETED = 'completed',
  RETURNED = 'returned',
  PARTIAL_RETURN = 'partial_return',
}

// Purchase Status
export enum PurchaseStatus {
  ORDERED = 'ordered',
  RECEIVED = 'received',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Payment Status
export enum PaymentStatus {
  PAID = 'paid',
  PARTIAL = 'partial',
  PENDING = 'pending',
}

// Prescription Status
export enum PrescriptionStatus {
  ACTIVE = 'active',
  FULFILLED = 'fulfilled',
  EXPIRED = 'expired',
}

// Cache keys
export const CacheKeys = {
  MEDICINE: (id: string) => `medicine:${id}`,
  MEDICINE_LIST: (tenantId: string) => `medicines:${tenantId}`,
  INVENTORY_SUMMARY: (tenantId: string) => `inventory:summary:${tenantId}`,
  SALES_TODAY: (tenantId: string) => `sales:today:${tenantId}`,
  LOW_STOCK_ALERTS: (tenantId: string) => `alerts:lowstock:${tenantId}`,
  EXPIRY_ALERTS: (tenantId: string) => `alerts:expiry:${tenantId}`,
  USER: (id: string) => `user:${id}`,
  TENANT: (id: string) => `tenant:${id}`,
};

// Cache TTL (in seconds)
export const CacheTTL = {
  MEDICINE: 3600, // 1 hour
  MEDICINE_LIST: 1800, // 30 minutes
  INVENTORY_SUMMARY: 300, // 5 minutes
  SALES_TODAY: 3600, // 1 hour
  ALERTS: 1800, // 30 minutes
  USER: 3600, // 1 hour
  TENANT: 7200, // 2 hours
};

export default {
  UserRole,
  MedicineCategory,
  MedicineSchedule,
  InventoryStatus,
  PaymentMethod,
  SaleStatus,
  PurchaseStatus,
  PaymentStatus,
  PrescriptionStatus,
  CacheKeys,
  CacheTTL,
};

