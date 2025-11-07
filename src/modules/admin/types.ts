export interface AdminLoginDTO {
  email: string;
  password: string;
}

export interface AdminRegisterDTO {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
}

export interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  totalUsers: number;
  totalSales: number;
  totalRevenue: number;
  newTenantsThisMonth: number;
  newTenantsThisWeek: number;
}

export interface TenantSummary {
  _id: string;
  pharmacyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  licenseNumber: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLoginAt?: Date;
  userCount: number;
  totalSales: number;
  totalRevenue: number;
  plan: string;
  subscriptionStatus: 'active' | 'expired' | 'cancelled';
}

export interface AdminDashboardData {
  stats: TenantStats;
  recentTenants: TenantSummary[];
  topPerformingTenants: TenantSummary[];
  revenueChart: Array<{
    date: string;
    revenue: number;
    tenants: number;
  }>;
  tenantGrowthChart: Array<{
    date: string;
    newTenants: number;
    totalTenants: number;
  }>;
}
