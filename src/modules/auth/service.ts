import { Types } from 'mongoose';
import { getAdminModels } from '../../database/index.js';
import { hashPassword, comparePassword, generateToken, generateRefreshToken } from '../../shared/utils/encryption.js';
import { validate, ValidationError } from '../../shared/utils/validation.js';
import { UserRole } from '../../shared/types/index.js';
import { RegisterTenantDTO, LoginDTO, CreateUserDTO, UpdateUserDTO, ChangePasswordDTO, AuthResponse } from './types.js';

class AuthService {
  /**
   * Register new pharmacy (tenant) with owner account
   */
  async registerTenant(data: RegisterTenantDTO): Promise<AuthResponse> {
    // Validate input
    validate(data, {
      pharmacyName: { required: true, minLength: 3, maxLength: 100 },
      ownerName: { required: true, minLength: 3, maxLength: 100 },
      email: { required: true, email: true },
      phone: { required: true, phone: true },
      address: { required: true, minLength: 10 },
      licenseNumber: { required: true, minLength: 5 },
      password: { required: true, minLength: 8 },
      confirmPassword: { required: true },
    });

    // Check password match
    if (data.password !== data.confirmPassword) {
      throw new ValidationError({ confirmPassword: 'Passwords do not match' });
    }

    const { Tenant, User } = getAdminModels();

    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ValidationError({ email: 'Email already registered' });
    }

    // Check if license number already exists
    const existingTenant = await Tenant.findOne({ licenseNumber: data.licenseNumber });
    if (existingTenant) {
      throw new ValidationError({ licenseNumber: 'License number already registered' });
    }

    // Create tenant
    const subscriptionPlan = data.subscriptionPlan || 'basic';
    const trialPeriodDays = 30;
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + trialPeriodDays);

    const tenant = await Tenant.create({
      pharmacyName: data.pharmacyName,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      licenseNumber: data.licenseNumber,
      subscriptionPlan,
      subscriptionStatus: 'trial',
      subscriptionStartDate: new Date(),
      subscriptionEndDate,
      isActive: true,
      settings: {
        language: 'en',
        currency: 'BDT',
        timezone: 'Asia/Dhaka',
        taxRate: 0,
      },
    });

    // Create owner user account
    const hashedPassword = await hashPassword(data.password);
    
    const user = await User.create({
      tenantId: tenant._id,
      name: data.ownerName,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      role: UserRole.OWNER,
      permissions: ['*'], // Owner has all permissions
      isActive: true,
    });

    // Generate tokens
    const tokens = this.generateTokens(user._id.toString(), tenant._id.toString(), user.role, user.permissions);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: tenant._id.toString(),
        pharmacyName: tenant.pharmacyName,
      },
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    // Validate input
    validate(data, {
      email: { required: true, email: true },
      password: { required: true },
    });

    const { User, Tenant } = getAdminModels();

    // Find user with password field included
    const user = await User.findOne({ email: data.email, isActive: true }).select('+password');
    
    if (!user) {
      throw new ValidationError({ email: 'Invalid email or password' });
    }

    // Compare password
    const isPasswordValid = await comparePassword(data.password, user.password);
    
    if (!isPasswordValid) {
      throw new ValidationError({ password: 'Invalid email or password' });
    }

    // Get tenant info
    const tenant = await Tenant.findById(user.tenantId);
    
    if (!tenant || !tenant.isActive) {
      throw new Error('Pharmacy account is inactive. Please contact support.');
    }

    // Check subscription status
    if (tenant.subscriptionStatus === 'suspended' || tenant.subscriptionStatus === 'cancelled') {
      throw new Error('Subscription is inactive. Please renew your subscription.');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = this.generateTokens(user._id.toString(), tenant._id.toString(), user.role, user.permissions);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: tenant._id.toString(),
        pharmacyName: tenant.pharmacyName,
      },
      tokens,
    };
  }

  /**
   * Create new user (staff member)
   */
  async createUser(tenantId: string, data: CreateUserDTO): Promise<any> {
    // Validate input
    validate(data, {
      name: { required: true, minLength: 3, maxLength: 100 },
      email: { required: true, email: true },
      phone: { required: true, phone: true },
      password: { required: true, minLength: 8 },
      role: { required: true },
    });

    const { User } = getAdminModels();

    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ValidationError({ email: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await User.create({
      tenantId: new Types.ObjectId(tenantId),
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      role: data.role,
      permissions: data.permissions || this.getDefaultPermissions(data.role),
      isActive: true,
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    const { User } = getAdminModels();
    
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Get all users for a tenant
   */
  async getUsersByTenant(tenantId: string, page: number = 1, limit: number = 20): Promise<any> {
    const { User } = getAdminModels();
    
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find({ tenantId: new Types.ObjectId(tenantId) })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments({ tenantId: new Types.ObjectId(tenantId) }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserDTO): Promise<any> {
    const { User } = getAdminModels();
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId: string, data: ChangePasswordDTO): Promise<void> {
    // Validate input
    validate(data, {
      currentPassword: { required: true },
      newPassword: { required: true, minLength: 8 },
      confirmPassword: { required: true },
    });

    if (data.newPassword !== data.confirmPassword) {
      throw new ValidationError({ confirmPassword: 'Passwords do not match' });
    }

    const { User } = getAdminModels();
    
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(data.currentPassword, user.password);
    
    if (!isPasswordValid) {
      throw new ValidationError({ currentPassword: 'Current password is incorrect' });
    }

    // Hash new password
    user.password = await hashPassword(data.newPassword);
    await user.save();
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const { User } = getAdminModels();
    
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Cannot delete owner
    if (user.role === UserRole.OWNER) {
      throw new Error('Cannot delete pharmacy owner account');
    }

    await User.findByIdAndDelete(userId);
  }

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(userId: string, tenantId: string, role: UserRole, permissions: string[]) {
    const payload = {
      id: userId,
      tenantId,
      role,
      permissions,
    };

    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get default permissions based on role
   */
  private getDefaultPermissions(role: UserRole): string[] {
    switch (role) {
      case UserRole.OWNER:
        return ['*'];
      case UserRole.MANAGER:
        return ['sales', 'inventory', 'customers', 'reports', 'purchases', 'users.read'];
      case UserRole.PHARMACIST:
        return ['sales', 'inventory.read', 'customers', 'prescriptions'];
      case UserRole.CASHIER:
        return ['sales', 'inventory.read', 'customers.read'];
      default:
        return [];
    }
  }
}

export default new AuthService();

