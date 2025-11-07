import { Router } from 'express';
import customerController from './controller.js';
import { authenticate, authorize } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { UserRole } from '../../shared/types/index.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.post('/customers', customerController.createCustomer);
router.get('/customers', customerController.getCustomers);
router.get('/customers/phone/:phone', customerController.getCustomerByPhone);
router.get('/customers/:id', customerController.getCustomerById);
router.put('/customers/:id', customerController.updateCustomer);
router.delete('/customers/:id', authorize(UserRole.OWNER, UserRole.MANAGER), customerController.deleteCustomer);
router.post('/customers/:id/pay-due', customerController.addDuePayment);
router.get('/customers/:id/purchases', customerController.getPurchaseHistory);

export default router;

