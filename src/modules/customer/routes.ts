import { Router } from 'express';
import customerController from './controller.js';
import { authenticate, authorize, requirePermission } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { UserRole, Permissions } from '../../shared/types/index.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.post(
  '/customers',
  requirePermission(Permissions.CUSTOMERS_CREATE),
  customerController.createCustomer
);
router.get(
  '/customers',
  requirePermission(Permissions.CUSTOMERS_READ),
  customerController.getCustomers
);
router.get(
  '/customers/phone/:phone',
  requirePermission(Permissions.CUSTOMERS_READ),
  customerController.getCustomerByPhone
);
router.get(
  '/customers/:id',
  requirePermission(Permissions.CUSTOMERS_READ),
  customerController.getCustomerById
);
router.put(
  '/customers/:id',
  requirePermission(Permissions.CUSTOMERS_UPDATE),
  customerController.updateCustomer
);
router.delete(
  '/customers/:id',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.CUSTOMERS_MANAGE),
  customerController.deleteCustomer
);
router.post(
  '/customers/:id/pay-due',
  requirePermission(Permissions.CUSTOMERS_UPDATE),
  customerController.addDuePayment
);
router.get(
  '/customers/:id/purchases',
  requirePermission(Permissions.CUSTOMERS_READ),
  customerController.getPurchaseHistory
);

export default router;

