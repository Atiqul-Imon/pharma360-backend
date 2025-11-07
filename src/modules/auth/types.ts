import { UserRole } from '../../shared/types/index.js';

export interface RegisterTenantDTO {
  // Pharmacy/Tenant info
  pharmacyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  licenseNumber: string;
  
  // Owner account info
  password: string;
  confirmPassword: string;
  
  // Subscription
  subscriptionPlan?: 'basic' | 'professional' | 'enterprise' | 'hospital';
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  permissions?: string[];
}

export interface UpdateUserDTO {
  name?: string;
  phone?: string;
  role?: UserRole;
  permissions?: string[];
  isActive?: boolean;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    tenantId: string;
    pharmacyName: string;
  };
  tokens: AuthTokens;
}

// No default export needed - types are exported individually

