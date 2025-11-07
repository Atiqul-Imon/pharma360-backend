import { Request, Response, NextFunction } from 'express';
import authService from './service.js';
import { AuthRequest } from '../../shared/types/index.js';
import { successResponse, createdResponse, errorResponse } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/validation.js';

class AuthController {
  /**
   * Register new pharmacy tenant
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const result = await authService.registerTenant(req.body);
      return createdResponse(res, result, 'Pharmacy registered successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const result = await authService.login(req.body);
      return successResponse(res, result, 'Login successful');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      if ((error as Error).message.includes('inactive') || (error as Error).message.includes('Subscription')) {
        return errorResponse(res, (error as Error).message, 403, 'ACCOUNT_INACTIVE');
      }
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const user = await authService.getUserById(req.user.id);
      return successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new user (staff)
   */
  async createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const user = await authService.createUser(req.user.tenantId, req.body);
      return createdResponse(res, user, 'User created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  /**
   * Get all users for current tenant
   */
  async getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await authService.getUsersByTenant(req.user.tenantId, page, limit);
      
      return successResponse(res, result.users, undefined);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const user = await authService.getUserById(req.params.id);
      return successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   */
  async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      const user = await authService.updateUser(req.params.id, req.body);
      return successResponse(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      await authService.changePassword(req.user.id, req.body);
      return successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      await authService.deleteUser(req.params.id);
      return successResponse(res, null, 'User deleted successfully');
    } catch (error) {
      if ((error as Error).message.includes('Cannot delete')) {
        return errorResponse(res, (error as Error).message, 400, 'CANNOT_DELETE');
      }
      next(error);
    }
  }
}

export default new AuthController();

