import { Response, NextFunction } from 'express';
import counterService from './service.js';
import { AuthRequest } from '../../shared/types/index.js';
import { createdResponse, errorResponse, successResponse } from '../../shared/utils/response.js';
import { ValidationError } from '../../shared/utils/validation.js';
import { CreateCounterDTO, UpdateCounterDTO, CounterFilters } from './types.js';

class CounterController {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      const filters: CounterFilters = {
        status: typeof req.query.status === 'string' ? (req.query.status as any) : undefined,
      };

      const counters = await counterService.getCounters(req.user.tenantId, filters);
      return successResponse(res, counters);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      const counter = await counterService.createCounter(
        req.user.tenantId,
        req.body as CreateCounterDTO
      );

      return createdResponse(res, counter, 'Counter created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId || !req.params?.id) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      const counter = await counterService.updateCounter(
        req.user.tenantId,
        req.params.id,
        req.body as UpdateCounterDTO
      );

      return successResponse(res, counter, 'Counter updated successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    try {
      if (!req.user?.tenantId || !req.params?.id) {
        return errorResponse(res, 'Tenant context missing', 400, 'NO_TENANT');
      }

      await counterService.deleteCounter(req.user.tenantId, req.params.id);
      return successResponse(res, { success: true }, 'Counter removed successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
      }
      next(error);
    }
  }
}

export default new CounterController();

