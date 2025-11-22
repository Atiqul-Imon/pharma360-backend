import { Router } from 'express';
import supplierController from './controller.js';
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
  supplierController.createSupplier.bind(supplierController)
);
router.get(
  '/',
  requirePermission(Permissions.PURCHASES_MANAGE),
  supplierController.getSuppliers.bind(supplierController)
);
router.get(
  '/:id',
  requirePermission(Permissions.PURCHASES_MANAGE),
  supplierController.getSupplierById.bind(supplierController)
);
router.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.PURCHASES_MANAGE),
  supplierController.updateSupplier.bind(supplierController)
);
router.patch(
  '/:id/status',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.PURCHASES_MANAGE),
  supplierController.toggleSupplierStatus.bind(supplierController)
);
router.delete(
  '/:id',
  authorize(UserRole.OWNER),
  requirePermission(Permissions.PURCHASES_MANAGE),
  supplierController.deleteSupplier.bind(supplierController)
);

export default router;


