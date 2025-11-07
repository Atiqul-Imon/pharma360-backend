import { Router } from 'express';
import inventoryController from './controller.js';
import { authenticate, authorize } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { UserRole } from '../../shared/types/index.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

/**
 * Medicine routes
 */
router.post(
  '/medicines',
  authorize(UserRole.OWNER, UserRole.MANAGER),
  inventoryController.createMedicine
);

router.get('/medicines', inventoryController.getMedicines);

router.get('/medicines/search', inventoryController.searchMedicines);

router.get('/medicines/barcode/:barcode', inventoryController.getMedicineByBarcode);

router.get('/medicines/:id', inventoryController.getMedicineById);

router.put(
  '/medicines/:id',
  authorize(UserRole.OWNER, UserRole.MANAGER),
  inventoryController.updateMedicine
);

router.delete(
  '/medicines/:id',
  authorize(UserRole.OWNER),
  inventoryController.deleteMedicine
);

/**
 * Batch routes
 */
router.post(
  '/batches',
  authorize(UserRole.OWNER, UserRole.MANAGER),
  inventoryController.addBatch
);

router.get('/batches/medicine/:medicineId', inventoryController.getBatchesByMedicine);

router.get('/batches/:id', inventoryController.getBatchById);

router.put(
  '/batches/:id',
  authorize(UserRole.OWNER, UserRole.MANAGER),
  inventoryController.updateBatch
);

/**
 * Summary and alerts routes
 */
router.get('/summary', inventoryController.getInventorySummary);

router.get('/alerts/expiry', inventoryController.getExpiryAlerts);

router.get('/alerts/low-stock', inventoryController.getLowStockAlerts);

export default router;

