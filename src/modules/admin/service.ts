import { Types } from 'mongoose';
import { getAdminModels } from '../../database/index.js';
import { validate, ValidationError } from '../../shared/utils/validation.js';
import { hashPassword, comparePassword, generateToken, generateRefreshToken } from '../../shared/utils/encryption.js';
import { AdminLoginDTO, AdminRegisterDTO, TenantStats, AdminDashboardData } from './types.js';

class AdminService {
  /**
   * Register new admin user
   */
  async registerAdmin(data: AdminRegisterDTO): Promise<any> {
    validate(data, {
      name: { required: true, minLength: 2 },
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      confirmPassword: { required: true },
      companyName: { required: true, minLength: 2 },
    });

    if (data.password !== data.confirmPassword) {
      throw new ValidationError({ confirmPassword: 'Passwords do not match' });
    }

    const models = getAdminModels();

    // Check if admin already exists
    const existingAdmin = await models.User.findOne({ email: data.email });
    if (existingAdmin) {
      throw new ValidationError({ email: 'Admin with this email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create admin user (use a dummy tenantId for admin users)
    const admin = await models.User.create({
      tenantId: new Types.ObjectId(), // Admin users get a dummy tenantId
      name: data.name,
      email: data.email,
      phone: '', // Admin doesn't need phone for now
      password: hashedPassword,
      role: 'admin' as any,
      isActive: true,
    });

    // Generate tokens
    const tokens = {
      accessToken: generateToken({
        id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
      }),
      refreshToken: generateRefreshToken({
        id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
      }),
    };

    return {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      tokens,
    };
  }

  /**
   * Admin login
   */
  async loginAdmin(data: AdminLoginDTO): Promise<any> {
    validate(data, {
      email: { required: true, email: true },
      password: { required: true },
    });

    const models = getAdminModels();

    // Find admin user
    const admin = await models.User.findOne({ 
      email: data.email, 
      role: 'admin',
      isActive: true 
    }).select('+password');

    if (!admin) {
      throw new ValidationError({ email: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, admin.password);
    if (!isPasswordValid) {
      throw new ValidationError({ email: 'Invalid email or password' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate tokens
    const tokens = {
      accessToken: generateToken({
        id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
      }),
      refreshToken: generateRefreshToken({
        id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
      }),
    };

    return {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
      tokens,
    };
  }

  /**
   * Get admin dashboard data
   */
  async getDashboardData(): Promise<AdminDashboardData> {
    const models = getAdminModels();

    // Get tenant statistics
    const stats = await this.getTenantStats();

    // Get recent tenants
    const recentTenants = await models.Tenant.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get top performing tenants (mock data for now)
    const topPerformingTenants = await models.Tenant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Mock revenue chart data (last 30 days)
    const revenueChart = this.generateMockRevenueChart();

    // Mock tenant growth chart (last 12 months)
    const tenantGrowthChart = this.generateMockTenantGrowthChart();

    return {
      stats,
      recentTenants: recentTenants.map(tenant => ({
        _id: tenant._id.toString(),
        pharmacyName: tenant.pharmacyName,
        ownerName: tenant.ownerName,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        licenseNumber: tenant.licenseNumber,
        status: tenant.isActive ? 'active' : 'inactive',
        createdAt: tenant.createdAt,
        lastLogin: tenant.createdAt, // Tenant doesn't have lastLogin, use createdAt
        userCount: 1, // Mock data
        totalSales: Math.floor(Math.random() * 1000), // Mock data
        totalRevenue: Math.floor(Math.random() * 50000), // Mock data
        plan: 'Basic',
        subscriptionStatus: 'active',
      })),
      topPerformingTenants: topPerformingTenants.map(tenant => ({
        _id: tenant._id.toString(),
        pharmacyName: tenant.pharmacyName,
        ownerName: tenant.ownerName,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        licenseNumber: tenant.licenseNumber,
        status: tenant.isActive ? 'active' : 'inactive',
        createdAt: tenant.createdAt,
        lastLogin: tenant.createdAt, // Tenant doesn't have lastLogin, use createdAt
        userCount: Math.floor(Math.random() * 5) + 1,
        totalSales: Math.floor(Math.random() * 2000),
        totalRevenue: Math.floor(Math.random() * 100000),
        plan: ['Basic', 'Pro', 'Enterprise'][Math.floor(Math.random() * 3)],
        subscriptionStatus: 'active',
      })),
      revenueChart,
      tenantGrowthChart,
    };
  }

  /**
   * Get tenant statistics
   */
  private async getTenantStats(): Promise<TenantStats> {
    const models = getAdminModels();

    const [totalTenants, activeTenants, totalUsers] = await Promise.all([
      models.Tenant.countDocuments(),
      models.Tenant.countDocuments({ isActive: true }),
      models.User.countDocuments({ role: { $ne: 'admin' } }),
    ]);

    return {
      totalTenants,
      activeTenants,
      inactiveTenants: totalTenants - activeTenants,
      totalUsers,
      totalSales: Math.floor(Math.random() * 10000), // Mock data
      totalRevenue: Math.floor(Math.random() * 500000), // Mock data
      newTenantsThisMonth: Math.floor(Math.random() * 20), // Mock data
      newTenantsThisWeek: Math.floor(Math.random() * 5), // Mock data
    };
  }

  /**
   * Generate mock revenue chart data
   */
  private generateMockRevenueChart() {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 10000) + 5000,
        tenants: Math.floor(Math.random() * 10) + 5,
      });
    }
    
    return data;
  }

  /**
   * Generate mock tenant growth chart data
   */
  private generateMockTenantGrowthChart() {
    const data = [];
    const today = new Date();
    let totalTenants = 0;
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      
      const newTenants = Math.floor(Math.random() * 15) + 5;
      totalTenants += newTenants;
      
      data.push({
        date: date.toISOString().substring(0, 7), // YYYY-MM format
        newTenants,
        totalTenants,
      });
    }
    
    return data;
  }

  /**
   * Get all tenants with pagination
   */
  async getTenants(page: number = 1, limit: number = 20, search?: string): Promise<any> {
    const models = getAdminModels();
    const skip = (page - 1) * limit;

    const query: any = {};
    if (search) {
      query.$or = [
        { pharmacyName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      models.Tenant.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      models.Tenant.countDocuments(query),
    ]);

    return {
      tenants: tenants.map(tenant => ({
        _id: tenant._id.toString(),
        pharmacyName: tenant.pharmacyName,
        ownerName: tenant.ownerName,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        licenseNumber: tenant.licenseNumber,
        status: tenant.isActive ? 'active' : 'inactive',
        createdAt: tenant.createdAt,
        lastLogin: tenant.createdAt, // Tenant doesn't have lastLogin, use createdAt
        userCount: 1, // Mock data
        totalSales: Math.floor(Math.random() * 1000),
        totalRevenue: Math.floor(Math.random() * 50000),
        plan: 'Basic',
        subscriptionStatus: 'active',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update tenant status
   */
  async updateTenantStatus(tenantId: string, status: 'active' | 'inactive' | 'suspended'): Promise<any> {
    const models = getAdminModels();

    const tenant = await models.Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenant.isActive = status === 'active';
    await tenant.save();

    return {
      _id: tenant._id.toString(),
      pharmacyName: tenant.pharmacyName,
      status: tenant.isActive ? 'active' : 'inactive',
    };
  }
}

export default new AdminService();

