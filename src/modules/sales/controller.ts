import { Response, NextFunction } from 'express';
import salesService from './service.js';
import { AuthRequest } from '../../shared/types/index.js';
import { successResponse, createdResponse, errorResponse, paginatedResponse } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/validation.js';

class SalesController {
  /**
   * Create new sale (POS transaction)
   */
  async createSale(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId || !req.user?.id) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const sale = await salesService.createSale(req.user.tenantId, req.user.id, req.body);
      return createdResponse(res, sale, 'Sale completed successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      if ((error as Error).message.includes('Insufficient stock')) {
        return errorResponse(res, (error as Error).message, 400, 'INSUFFICIENT_STOCK');
      }
      next(error);
    }
  }

  /**
   * Get sale by ID
   */
  async getSaleById(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const sale = await salesService.getSaleById(req.user.tenantId, req.params.id);
      return successResponse(res, sale);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sale by invoice number
   */
  async getSaleByInvoiceNumber(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const sale = await salesService.getSaleByInvoiceNumber(req.user.tenantId, req.params.invoiceNumber);
      return successResponse(res, sale);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all sales with filters
   */
  async getSales(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const filters: any = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.customerId) {
        filters.customerId = req.query.customerId;
      }
      
      if (req.query.paymentMethod) {
        filters.paymentMethod = req.query.paymentMethod;
      }
      
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const result = await salesService.getSales(req.user.tenantId, page, limit, filters);

      return paginatedResponse(
        res,
        result.sales,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Return/Refund sale
   */
  async returnSale(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const sale = await salesService.returnSale(req.user.tenantId, req.params.id, req.body);
      return successResponse(res, sale, 'Sale returned successfully');
    } catch (error) {
      if ((error as Error).message.includes('already returned') || (error as Error).message.includes('exceeds')) {
        return errorResponse(res, (error as Error).message, 400, 'INVALID_RETURN');
      }
      next(error);
    }
  }

  /**
   * Get today's sales summary
   */
  async getTodaysSales(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const summary = await salesService.getTodaysSales(req.user.tenantId);
      return successResponse(res, summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get daily sales report
   */
  async getDailySalesReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const report = await salesService.getDailySalesReport(req.user.tenantId, date);
      return successResponse(res, report);
    } catch (error) {
      next(error);
    }
  }
}

export default new SalesController();

