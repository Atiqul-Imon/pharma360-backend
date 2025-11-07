import { Router } from 'express';
import purchaseController from './controller.js';
import { authenticate, authorize } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { UserRole } from '../../shared/types/index.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.MANAGER, UserRole.PHARMACIST),
  purchaseController.createPurchase.bind(purchaseController)
);

router.get('/', purchaseController.getPurchases.bind(purchaseController));
router.get('/:id', purchaseController.getPurchaseById.bind(purchaseController));

router.post(
  '/:id/receive',
  authorize(UserRole.OWNER, UserRole.MANAGER, UserRole.PHARMACIST),
  purchaseController.receivePurchase.bind(purchaseController)
);

router.post(
  '/:id/payments',
  authorize(UserRole.OWNER, UserRole.MANAGER),
  purchaseController.recordPayment.bind(purchaseController)
);

router.post(
  '/:id/cancel',
  authorize(UserRole.OWNER, UserRole.MANAGER),
  purchaseController.cancelPurchase.bind(purchaseController)
);

export default router;


