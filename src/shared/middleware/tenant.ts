import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index.js';
import { mongoDBManager } from '../../database/mongodb.js';
import { errorResponse } from '../utils/response.js';

/**
 * Tenant context middleware
 * Attaches tenant database connection to request
 */
export async function tenantContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    if (!req.user?.tenantId) {
      return errorResponse(res, 'Tenant ID not found', 400, 'NO_TENANT_ID');
    }

    // Get or create tenant database connection
    await mongoDBManager.getTenantConnection(req.user.tenantId);

    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    return errorResponse(res, 'Failed to establish tenant context', 500, 'TENANT_CONTEXT_ERROR');
  }
}

export default { tenantContext };

