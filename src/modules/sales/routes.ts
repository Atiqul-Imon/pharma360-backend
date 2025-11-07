import { Router } from 'express';
import salesController from './controller.js';
import { authenticate, authorize } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { posLimiter } from '../../shared/middleware/rateLimiter.js';
import { UserRole } from '../../shared/types/index.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

/**
 * POS/Sales routes
 */
router.post('/sales', posLimiter, salesController.createSale);

router.get('/sales', salesController.getSales);

router.get('/sales/today', salesController.getTodaysSales);

router.get('/sales/invoice/:invoiceNumber', salesController.getSaleByInvoiceNumber);

router.get('/sales/:id', salesController.getSaleById);

router.post(
  '/sales/:id/return',
  authorize(UserRole.OWNER, UserRole.MANAGER),
  salesController.returnSale
);

/**
 * Reports routes
 */
router.get(
  '/reports/daily',
  authorize(UserRole.OWNER, UserRole.MANAGER),
  salesController.getDailySalesReport
);

export default router;

