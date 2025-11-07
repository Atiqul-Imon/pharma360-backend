import { Response, NextFunction } from 'express';
import supplierService from './service.js';
import { AuthRequest, UserRole } from '../../shared/types/index.js';
import { createdResponse, errorResponse, paginatedResponse, successResponse } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/validation.js';

class SupplierController {
  async createSupplier(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      if (![UserRole.OWNER, UserRole.MANAGER].includes(req.user.role)) {
        return errorResponse(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      }

      const supplier = await supplierService.createSupplier(req.user.tenantId, req.body);
      return createdResponse(res, supplier, 'Supplier created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  async getSuppliers(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 25;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const minDue = req.query.minDue ? Number(req.query.minDue) : undefined;
      const maxDue = req.query.maxDue ? Number(req.query.maxDue) : undefined;

      const { suppliers, pagination } = await supplierService.getSuppliers(
        req.user.tenantId,
        page,
        limit,
        {
          search: typeof req.query.search === 'string' ? req.query.search : undefined,
          isActive,
          minDue,
          maxDue,
        }
      );

      return paginatedResponse(res, suppliers, pagination.page, pagination.limit, pagination.total);
    } catch (error) {
      next(error);
    }
  }

  async getSupplierById(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const result = await supplierService.getSupplierById(req.user.tenantId, req.params.id);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateSupplier(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      if (![UserRole.OWNER, UserRole.MANAGER].includes(req.user.role)) {
        return errorResponse(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      }

      const supplier = await supplierService.updateSupplier(
        req.user.tenantId,
        req.params.id,
        req.body
      );

      return successResponse(res, supplier, 'Supplier updated successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  async toggleSupplierStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      if (![UserRole.OWNER, UserRole.MANAGER].includes(req.user.role)) {
        return errorResponse(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      }

      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return errorResponse(res, 'isActive flag is required', 400, 'VALIDATION_ERROR');
      }

      const supplier = await supplierService.toggleSupplierStatus(
        req.user.tenantId,
        req.params.id,
        isActive
      );

      return successResponse(
        res,
        supplier,
        isActive ? 'Supplier activated successfully' : 'Supplier deactivated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteSupplier(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      if (req.user.role !== UserRole.OWNER) {
        return errorResponse(res, 'Only owner can delete suppliers', 403, 'FORBIDDEN');
      }

      await supplierService.deleteSupplier(req.user.tenantId, req.params.id);
      return successResponse(res, { deleted: true }, 'Supplier deleted successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }
}

export default new SupplierController();


