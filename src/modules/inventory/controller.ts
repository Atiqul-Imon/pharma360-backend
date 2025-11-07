import { Response, NextFunction } from 'express';
import inventoryService from './service.js';
import { AuthRequest } from '../../shared/types/index.js';
import { successResponse, createdResponse, errorResponse, paginatedResponse } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/validation.js';

class InventoryController {
  /**
   * Create new medicine
   */
  async createMedicine(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const medicine = await inventoryService.createMedicine(req.user.tenantId, req.body);
      return createdResponse(res, medicine, 'Medicine created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  /**
   * Get all medicines
   */
  async getMedicines(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      const result = await inventoryService.getMedicines(
        req.user.tenantId,
        page,
        limit,
        search,
        category,
        isActive
      );

      return paginatedResponse(
        res,
        result.medicines,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get medicine by ID
   */
  async getMedicineById(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const medicine = await inventoryService.getMedicineById(req.user.tenantId, req.params.id);
      return successResponse(res, medicine);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get medicine by barcode
   */
  async getMedicineByBarcode(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const barcode = req.params.barcode;
      const medicine = await inventoryService.getMedicineByBarcode(req.user.tenantId, barcode);
      return successResponse(res, medicine);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search medicines
   */
  async searchMedicines(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query) {
        return errorResponse(res, 'Search query is required', 400, 'MISSING_QUERY');
      }

      const medicines = await inventoryService.searchMedicines(req.user.tenantId, query, limit);
      return successResponse(res, medicines);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update medicine
   */
  async updateMedicine(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const medicine = await inventoryService.updateMedicine(req.user.tenantId, req.params.id, req.body);
      return successResponse(res, medicine, 'Medicine updated successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  /**
   * Delete medicine
   */
  async deleteMedicine(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      await inventoryService.deleteMedicine(req.user.tenantId, req.params.id);
      return successResponse(res, null, 'Medicine deleted successfully');
    } catch (error) {
      if ((error as Error).message.includes('Cannot delete')) {
        return errorResponse(res, (error as Error).message, 400, 'CANNOT_DELETE');
      }
      next(error);
    }
  }

  /**
   * Add inventory batch
   */
  async addBatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const batch = await inventoryService.addBatch(req.user.tenantId, req.body);
      return createdResponse(res, batch, 'Inventory batch added successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  /**
   * Get batches by medicine
   */
  async getBatchesByMedicine(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const batches = await inventoryService.getBatchesByMedicine(req.user.tenantId, req.params.medicineId);
      return successResponse(res, batches);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get batch by ID
   */
  async getBatchById(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const batch = await inventoryService.getBatchById(req.user.tenantId, req.params.id);
      return successResponse(res, batch);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update batch
   */
  async updateBatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const batch = await inventoryService.updateBatch(req.user.tenantId, req.params.id, req.body);
      return successResponse(res, batch, 'Batch updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const summary = await inventoryService.getInventorySummary(req.user.tenantId);
      return successResponse(res, summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expiry alerts
   */
  async getExpiryAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const days = parseInt(req.query.days as string) || 90;
      const alerts = await inventoryService.getExpiryAlerts(req.user.tenantId, days);
      return successResponse(res, alerts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
      }

      const alerts = await inventoryService.getLowStockAlerts(req.user.tenantId);
      return successResponse(res, alerts);
    } catch (error) {
      next(error);
    }
  }
}

export default new InventoryController();

