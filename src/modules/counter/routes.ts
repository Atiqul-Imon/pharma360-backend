import { Router } from 'express';
import counterController from './controller.js';
import { authenticate } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { authorize, requirePermission } from '../../shared/middleware/auth.js';
import { Permissions, UserRole } from '../../shared/types/index.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.get(
  '/',
  requirePermission(Permissions.INVENTORY_READ),
  counterController.list
);

router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.INVENTORY_MANAGE),
  counterController.create
);

router.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.INVENTORY_MANAGE),
  counterController.update
);

router.delete(
  '/:id',
  authorize(UserRole.OWNER),
  requirePermission(Permissions.INVENTORY_MANAGE),
  counterController.remove
);

export default router;

