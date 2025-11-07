import { Router } from 'express';
import supplierController from './controller.js';
import { authenticate, authorize } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { UserRole } from '../../shared/types/index.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.post('/', authorize(UserRole.OWNER, UserRole.MANAGER), supplierController.createSupplier.bind(supplierController));
router.get('/', supplierController.getSuppliers.bind(supplierController));
router.get('/:id', supplierController.getSupplierById.bind(supplierController));
router.put('/:id', authorize(UserRole.OWNER, UserRole.MANAGER), supplierController.updateSupplier.bind(supplierController));
router.patch('/:id/status', authorize(UserRole.OWNER, UserRole.MANAGER), supplierController.toggleSupplierStatus.bind(supplierController));
router.delete('/:id', authorize(UserRole.OWNER), supplierController.deleteSupplier.bind(supplierController));

export default router;


