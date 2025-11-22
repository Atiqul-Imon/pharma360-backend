import { Router } from 'express';
import salesController from './controller.js';
import { authenticate, authorize, requirePermission } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { posLimiter } from '../../shared/middleware/rateLimiter.js';
import { UserRole, Permissions } from '../../shared/types/index.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

/**
 * POS/Sales routes
 */
router.post(
  '/sales',
  posLimiter,
  requirePermission(Permissions.SALES_CREATE),
  salesController.createSale
);

router.get('/sales', requirePermission(Permissions.SALES_READ), salesController.getSales);

router.get(
  '/sales/today',
  requirePermission(Permissions.REPORTS_VIEW),
  salesController.getTodaysSales
);

router.get(
  '/sales/invoice/:invoiceNumber',
  requirePermission(Permissions.SALES_READ),
  salesController.getSaleByInvoiceNumber
);

router.get('/sales/:id', requirePermission(Permissions.SALES_READ), salesController.getSaleById);

router.post(
  '/sales/:id/return',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.SALES_MANAGE),
  salesController.returnSale
);

/**
 * Reports routes
 */
router.get(
  '/reports/daily',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.REPORTS_VIEW),
  salesController.getDailySalesReport
);

export default router;

