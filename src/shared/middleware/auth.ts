import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types/index.js';
import { verifyToken } from '../utils/encryption.js';
import { errorResponse } from '../utils/response.js';

/**
 * Authentication middleware
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken<{
        id: string;
        tenantId: string;
        role: UserRole;
        permissions: string[];
      }>(token);

      req.user = {
        id: decoded.id,
        tenantId: decoded.tenantId,
        role: decoded.role,
        permissions: decoded.permissions,
      };

      next();
    } catch (error) {
      if ((error as Error).name === 'TokenExpiredError') {
        return errorResponse(res, 'Token expired', 401, 'TOKEN_EXPIRED');
      }
      return errorResponse(res, 'Invalid token', 401, 'INVALID_TOKEN');
    }
  } catch (error) {
    return errorResponse(res, 'Authentication failed', 401, 'AUTH_FAILED');
  }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        'Insufficient permissions',
        403,
        'FORBIDDEN',
        { requiredRoles: allowedRoles, userRole: req.user.role }
      );
    }

    next();
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      return errorResponse(
        res,
        'Insufficient permissions',
        403,
        'FORBIDDEN',
        { requiredPermissions, userPermissions: req.user.permissions }
      );
    }

    next();
  };
}

export default { authenticate, authorize, requirePermission };

