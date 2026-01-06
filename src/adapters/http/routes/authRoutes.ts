import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateCredentials } from '../middlewares/validateCredentials';

export const buildAuthRouter = (authController: AuthController): Router => {
  const router = Router();

  router.post('/users', validateCredentials, authController.register);
  router.post('/login', validateCredentials, authController.login);

  return router;
};