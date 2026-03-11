import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateLoginCredentials, validateRegisterCredentials } from '../middlewares/validateCredentials';

export const buildAuthRouter = (authController: AuthController): Router => {
  const router = Router();

  router.post('/users', validateRegisterCredentials, authController.register);
  router.post('/login', validateLoginCredentials, authController.login);

  return router;
};
