import { Response, NextFunction } from 'express';
import purchaseService from './service.js';
import { AuthRequest, UserRole } from '../../shared/types/index.js';
import {
  createdResponse,
  errorResponse,
  paginatedResponse,
  successResponse,
} from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/validation.js';
import { PurchaseFilters } from './types.js';
import { mapCreatePurchaseDTO } from './mapper.js';

class PurchaseController {
  async createPurchase(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId || !req.user?.id) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      if (![UserRole.OWNER, UserRole.ADMIN].includes(req.user.role)) {
        return errorResponse(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      }

      const dto = mapCreatePurchaseDTO(req.body);

      const purchase = await purchaseService.createPurchase(
        req.user.tenantId,
        req.user.id,
        dto
      );

      return createdResponse(res, purchase, 'Purchase order created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.toResponse());
      }
      next(error);
    }
  }

  async getPurchases(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 25;

      const filters: PurchaseFilters = {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: typeof req.query.status === 'string' ? (req.query.status as any) : undefined,
        paymentStatus:
          typeof req.query.paymentStatus === 'string'
            ? (req.query.paymentStatus as any)
            : undefined,
        supplierId: typeof req.query.supplierId === 'string' ? req.query.supplierId : undefined,
        startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
        endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
      };

      const { purchases, pagination } = await purchaseService.getPurchases(
        req.user.tenantId,
        page,
        limit,
        filters
      );

      return paginatedResponse(
        res,
        purchases,
        pagination.page,
        pagination.limit,
        pagination.total
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.toResponse());
      }
      next(error);
    }
  }

  async getPurchaseById(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      const purchase = await purchaseService.getPurchaseById(req.user.tenantId, req.params.id);
      return successResponse(res, purchase);
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.toResponse());
      }
      next(error);
    }
  }

  async receivePurchase(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId || !req.user?.id) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      if (![UserRole.OWNER, UserRole.ADMIN].includes(req.user.role)) {
        return errorResponse(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      }

      const purchase = await purchaseService.receivePurchase(
        req.user.tenantId,
        req.user.id,
        req.params.id,
        req.body
      );

      return successResponse(res, purchase, 'Purchase received successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.toResponse());
      }
      next(error);
    }
  }

  async recordPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId || !req.user?.id) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      if (![UserRole.OWNER, UserRole.ADMIN].includes(req.user.role)) {
        return errorResponse(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      }

      const purchase = await purchaseService.recordPayment(
        req.user.tenantId,
        req.user.id,
        req.params.id,
        req.body
      );

      return successResponse(res, purchase, 'Payment recorded successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.toResponse());
      }
      next(error);
    }
  }

  async cancelPurchase(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      if (![UserRole.OWNER, UserRole.ADMIN].includes(req.user.role)) {
        return errorResponse(res, 'Insufficient permissions', 403, 'FORBIDDEN');
      }

      const purchase = await purchaseService.cancelPurchase(
        req.user.tenantId,
        req.params.id,
        req.body?.reason
      );

      return successResponse(res, purchase, 'Purchase cancelled successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }
}

export default new PurchaseController();


