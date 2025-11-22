import { Router } from 'express';
import purchaseController from './controller.js';
import { authenticate, authorize, requirePermission } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { UserRole, Permissions } from '../../shared/types/index.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.PURCHASES_MANAGE),
  purchaseController.createPurchase.bind(purchaseController)
);

router.get(
  '/',
  requirePermission(Permissions.PURCHASES_MANAGE),
  purchaseController.getPurchases.bind(purchaseController)
);
router.get(
  '/:id',
  requirePermission(Permissions.PURCHASES_MANAGE),
  purchaseController.getPurchaseById.bind(purchaseController)
);

router.post(
  '/:id/receive',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.PURCHASES_MANAGE),
  purchaseController.receivePurchase.bind(purchaseController)
);

router.post(
  '/:id/payments',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.PURCHASES_MANAGE),
  purchaseController.recordPayment.bind(purchaseController)
);

router.post(
  '/:id/cancel',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.PURCHASES_MANAGE),
  purchaseController.cancelPurchase.bind(purchaseController)
);

export default router;


