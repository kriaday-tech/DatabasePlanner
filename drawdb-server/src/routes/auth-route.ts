import { Router } from 'express';
import AuthController from '../controllers/auth-controller';
import { authenticate } from '../middleware/auth';
import {
  validateRegistration,
  validateLogin,
  checkValidation,
} from '../middleware/validation';

const router = Router();

// Public routes
router.post(
  '/register',
  validateRegistration,
  checkValidation,
  AuthController.register,
);

router.post('/login', validateLogin, checkValidation, AuthController.login);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);

router.put('/profile', authenticate, AuthController.updateProfile);

router.put('/password', authenticate, AuthController.changePassword);

export const authRouter = router;
export default authRouter;

