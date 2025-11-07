import { Router } from 'express';
import authController from './controller.js';
import { authenticate, authorize } from '../../shared/middleware/auth.js';
import { authLimiter } from '../../shared/middleware/rateLimiter.js';
import { UserRole } from '../../shared/types/index.js';

const router = Router();

/**
 * Public routes
 */
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

/**
 * Protected routes (require authentication)
 */
router.get('/profile', authenticate, authController.getProfile);
router.post('/change-password', authenticate, authController.changePassword);

/**
 * User management routes (require specific roles)
 */
router.post(
  '/users',
  authenticate,
  authorize(UserRole.OWNER, UserRole.MANAGER),
  authController.createUser
);

router.get(
  '/users',
  authenticate,
  authorize(UserRole.OWNER, UserRole.MANAGER),
  authController.getUsers
);

router.get(
  '/users/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.MANAGER),
  authController.getUserById
);

router.put(
  '/users/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.MANAGER),
  authController.updateUser
);

router.delete(
  '/users/:id',
  authenticate,
  authorize(UserRole.OWNER),
  authController.deleteUser
);

export default router;

