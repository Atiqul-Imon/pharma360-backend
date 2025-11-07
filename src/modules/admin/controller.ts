import { Response, NextFunction } from 'express';
import adminService from './service.js';
import { AuthRequest } from '../../shared/types/index.js';
import { successResponse, createdResponse, errorResponse, paginatedResponse } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/validation.js';

class AdminController {
  /**
   * Register new admin
   */
  async registerAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const result = await adminService.registerAdmin(req.body);
      return createdResponse(res, result, 'Admin registered successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  /**
   * Admin login
   */
  async loginAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const result = await adminService.loginAdmin(req.body);
      return successResponse(res, result, 'Login successful');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS', error.errors);
      }
      next(error);
    }
  }

  /**
   * Get admin dashboard data
   */
  async getDashboardData(_req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const data = await adminService.getDashboardData();
      return successResponse(res, data, 'Dashboard data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tenants
   */
  async getTenants(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const result = await adminService.getTenants(page, limit, search);
      return paginatedResponse(
        res,
        result.tenants,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        'Tenants retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update tenant status
   */
  async updateTenantStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const { tenantId } = req.params;
      const { status } = req.body;

      const result = await adminService.updateTenantStatus(tenantId, status);
      return successResponse(res, result, 'Tenant status updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Tenant not found') {
        return errorResponse(res, 'Tenant not found', 404, 'TENANT_NOT_FOUND');
      }
      next(error);
    }
  }

  /**
   * Get admin profile
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const admin = {
        id: req.user?.id,
        role: req.user?.role,
        tenantId: req.user?.tenantId,
      };
      return successResponse(res, admin, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();

