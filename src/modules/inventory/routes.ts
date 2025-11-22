import { Router } from 'express';
import inventoryController from './controller.js';
import { authenticate, authorize, requirePermission } from '../../shared/middleware/auth.js';
import { tenantContext } from '../../shared/middleware/tenant.js';
import { UserRole, Permissions } from '../../shared/types/index.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantContext);

/**
 * Medicine routes
 */
router.post(
  '/medicines',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.INVENTORY_MANAGE),
  inventoryController.createMedicine
);

router.get(
  '/medicines',
  requirePermission(Permissions.INVENTORY_READ),
  inventoryController.getMedicines
);

router.get(
  '/medicines/search',
  requirePermission(Permissions.INVENTORY_READ),
  inventoryController.searchMedicines
);

router.get(
  '/medicines/barcode/:barcode',
  requirePermission(Permissions.INVENTORY_READ),
  inventoryController.getMedicineByBarcode
);

router.get(
  '/medicines/:id',
  requirePermission(Permissions.INVENTORY_READ),
  inventoryController.getMedicineById
);

router.put(
  '/medicines/:id',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.INVENTORY_MANAGE),
  inventoryController.updateMedicine
);

router.delete(
  '/medicines/:id',
  authorize(UserRole.OWNER),
  requirePermission(Permissions.INVENTORY_MANAGE),
  inventoryController.deleteMedicine
);

/**
 * Batch routes
 */
router.post(
  '/batches',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.INVENTORY_MANAGE),
  inventoryController.addBatch
);

router.get(
  '/batches/medicine/:medicineId',
  requirePermission(Permissions.INVENTORY_READ),
  inventoryController.getBatchesByMedicine
);

router.get(
  '/batches/:id',
  requirePermission(Permissions.INVENTORY_READ),
  inventoryController.getBatchById
);

router.put(
  '/batches/:id',
  authorize(UserRole.OWNER, UserRole.ADMIN),
  requirePermission(Permissions.INVENTORY_MANAGE),
  inventoryController.updateBatch
);

/**
 * Summary and alerts routes
 */
router.get('/summary', requirePermission(Permissions.REPORTS_VIEW), inventoryController.getInventorySummary);

router.get('/alerts/expiry', requirePermission(Permissions.REPORTS_VIEW), inventoryController.getExpiryAlerts);

router.get('/alerts/low-stock', requirePermission(Permissions.REPORTS_VIEW), inventoryController.getLowStockAlerts);

export default router;

