import { Router, Response, NextFunction } from 'express';
import adminController from './controller.js';
import { authenticate } from '../../shared/middleware/auth.js';
import { UserRole, AuthRequest } from '../../shared/types/index.js';

const router = Router();

/**
 * Public admin routes (no authentication required)
 */
router.post('/register', adminController.registerAdmin);
router.post('/login', adminController.loginAdmin);

/**
 * Protected admin routes (authentication required)
 */
router.use(authenticate);

// All admin routes require admin role
router.use((req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }
  return next();
});

/**
 * Admin dashboard and management routes
 */
router.get('/dashboard', adminController.getDashboardData);
router.get('/profile', adminController.getProfile);
router.get('/tenants', adminController.getTenants);
router.patch('/tenants/:tenantId/status', adminController.updateTenantStatus);

export default router;

