import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import {
  validateAssignClientAccessPayload,
  validateLoginCredentials,
  validateRegisterCredentials
} from '../middlewares/validateCredentials';
import { authenticateRequest, authorizeRoles } from '../middlewares/authorization';
import {
  getAssignClientAccessAllowedRoles,
  getRegisterAllowedRoles
} from '../../../infrastructure/config/authorization';

export const buildAuthRouter = (authController: AuthController): Router => {
  const router = Router();
  const registerAllowedRoles = getRegisterAllowedRoles();
  const assignClientAccessAllowedRoles = getAssignClientAccessAllowedRoles();

  router.post('/users',
    authenticateRequest,
    authorizeRoles(registerAllowedRoles),
    validateRegisterCredentials,
    authController.register
  );
  router.post('/users/client-access',
    authenticateRequest,
    authorizeRoles(assignClientAccessAllowedRoles),
    validateAssignClientAccessPayload,
    authController.assignClientAccess
  );
  router.post('/login', validateLoginCredentials, authController.login);

  return router;
};
