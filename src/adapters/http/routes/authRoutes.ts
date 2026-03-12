import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import {
  validateAssignClientAccessPayload,
  validateGetUserRolesParams,
  validateLoginCredentials,
  validateRegisterCredentials,
  validateUserRolesPayload
} from '../middlewares/validateCredentials';
import { authenticateRequest, authorizeRoles } from '../middlewares/authorization';
import {
  getAssignClientAccessAllowedRoles,
  getManageUserRolesAllowedRoles,
  getRegisterAllowedRoles
} from '../../../infrastructure/config/authorization';

export const buildAuthRouter = (authController: AuthController): Router => {
  const router = Router();
  const registerAllowedRoles = getRegisterAllowedRoles();
  const assignClientAccessAllowedRoles = getAssignClientAccessAllowedRoles();
  const manageUserRolesAllowedRoles = getManageUserRolesAllowedRoles();

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
  router.post('/users/roles/add',
    authenticateRequest,
    authorizeRoles(manageUserRolesAllowedRoles),
    validateUserRolesPayload,
    authController.addRoles
  );
  router.post('/users/roles/remove',
    authenticateRequest,
    authorizeRoles(manageUserRolesAllowedRoles),
    validateUserRolesPayload,
    authController.removeRoles
  );
  router.get('/users/:username/roles',
    authenticateRequest,
    authorizeRoles(manageUserRolesAllowedRoles),
    validateGetUserRolesParams,
    authController.getUserRoles
  );
  router.post('/login', validateLoginCredentials, authController.login);

  return router;
};
