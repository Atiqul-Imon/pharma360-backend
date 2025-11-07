import { Response, NextFunction } from 'express';
import customerService from './service.js';
import { AuthRequest } from '../../shared/types/index.js';
import { successResponse, createdResponse, errorResponse, paginatedResponse } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/validation.js';

class CustomerController {
  async createCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      const customer = await customerService.createCustomer(req.user.tenantId, req.body);
      return createdResponse(res, customer, 'Customer created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  async getCustomers(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;

      const result = await customerService.getCustomers(req.user.tenantId, page, limit, search);
      return paginatedResponse(res, result.customers, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      next(error);
    }
  }

  async getCustomerById(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      const customer = await customerService.getCustomerById(req.user.tenantId, req.params.id);
      return successResponse(res, customer);
    } catch (error) {
      next(error);
    }
  }

  async getCustomerByPhone(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      const customer = await customerService.getCustomerByPhone(req.user.tenantId, req.params.phone);
      return successResponse(res, customer);
    } catch (error) {
      next(error);
    }
  }

  async updateCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      const customer = await customerService.updateCustomer(req.user.tenantId, req.params.id, req.body);
      return successResponse(res, customer, 'Customer updated successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  async deleteCustomer(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      await customerService.deleteCustomer(req.user.tenantId, req.params.id);
      return successResponse(res, null, 'Customer deleted successfully');
    } catch (error) {
      if ((error as Error).message.includes('outstanding dues')) {
        return errorResponse(res, (error as Error).message, 400, 'HAS_DUES');
      }
      next(error);
    }
  }

  async addDuePayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      const customer = await customerService.addDuePayment(req.user.tenantId, req.params.id, req.body);
      return successResponse(res, customer, 'Payment recorded successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  async getPurchaseHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await customerService.getCustomerPurchaseHistory(req.user.tenantId, req.params.id, page, limit);
      return paginatedResponse(res, result.sales, result.pagination.page, result.pagination.limit, result.pagination.total);
    } catch (error) {
      next(error);
    }
  }
}

export default new CustomerController();

