import { Request } from 'express';
import { Types } from 'mongoose';

// User roles
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  STAFF = 'staff',
}

export const Permissions = {
  ALL: '*',
  SALES_READ: 'sales.read',
  SALES_CREATE: 'sales.create',
  SALES_MANAGE: 'sales.manage',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_MANAGE: 'inventory.manage',
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_MANAGE: 'customers.manage',
  PURCHASES_MANAGE: 'purchases.manage',
  REPORTS_VIEW: 'reports.view',
  USERS_MANAGE: 'users.manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

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
export enum SubscriptionPlan {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  HOSPITAL = 'hospital',
}

export interface ITenant {
  _id: Types.ObjectId;
  pharmacyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  licenseNumber: string;
  subscriptionPlan: SubscriptionPlan;
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

export enum CounterStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
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
  MEDICINE_SEARCH: (tenantId: string, hash: string) => `medicines:search:${tenantId}:${hash}`,
  MEDICINE_SEARCH_PATTERN: (tenantId: string) => `medicines:search:${tenantId}:*`,
  INVENTORY_SUMMARY: (tenantId: string) => `inventory:summary:${tenantId}`,
  SALES_TODAY: (tenantId: string) => `sales:today:${tenantId}`,
  LOW_STOCK_ALERTS: (tenantId: string) => `alerts:lowstock:${tenantId}`,
  EXPIRY_ALERTS: (tenantId: string) => `alerts:expiry:${tenantId}`,
  SUPPLIER_LIST: (tenantId: string, hash: string) => `suppliers:list:${tenantId}:${hash}`,
  SUPPLIER_LIST_PATTERN: (tenantId: string) => `suppliers:list:${tenantId}:*`,
  USER: (id: string) => `user:${id}`,
  TENANT: (id: string) => `tenant:${id}`,
  CACHE_STATS: (tenantId: string, tag: string) => `cache:stats:${tenantId}:${tag}`,
};

// Cache TTL (in seconds)
export const CacheTTL = {
  MEDICINE: 3600, // 1 hour
  MEDICINE_LIST: 1800, // 30 minutes
  MEDICINE_SEARCH: 600, // 10 minutes
  INVENTORY_SUMMARY: 300, // 5 minutes
  SALES_TODAY: 3600, // 1 hour
  ALERTS: 1800, // 30 minutes
  USER: 3600, // 1 hour
  TENANT: 7200, // 2 hours
  SUPPLIER_LIST: 600, // 10 minutes
};

export default {
  UserRole,
  MedicineCategory,
  MedicineSchedule,
  InventoryStatus,
  CounterStatus,
  PaymentMethod,
  SaleStatus,
  PurchaseStatus,
  PaymentStatus,
  PrescriptionStatus,
  SubscriptionPlan,
  CacheKeys,
  CacheTTL,
};

