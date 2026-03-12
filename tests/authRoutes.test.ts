describe('buildAuthRouter', () => {
  describe('#buildAuthRouter', () => {
    it('should register all routes with expected middleware and handlers', () => {
      // Arrange
      jest.resetModules();

      const post = jest.fn();
      const router = { post };
      const Router = jest.fn(() => router);

      const validateRegisterCredentials = jest.fn();
      const validateAssignClientAccessPayload = jest.fn();
      const validateLoginCredentials = jest.fn();
      const validateUserRolesPayload = jest.fn();
      const authenticateRequest = jest.fn();
      const registerRoleGuard = jest.fn();
      const assignRoleGuard = jest.fn();
      const addRolesGuard = jest.fn();
      const removeRolesGuard = jest.fn();
      const authorizeRoles = jest
        .fn()
        .mockReturnValueOnce(registerRoleGuard)
        .mockReturnValueOnce(assignRoleGuard)
        .mockReturnValueOnce(addRolesGuard)
        .mockReturnValueOnce(removeRolesGuard);
      const getRegisterAllowedRoles = jest.fn(() => ['admin']);
      const getAssignClientAccessAllowedRoles = jest.fn(() => ['admin', 'super-admin']);
      const getManageUserRolesAllowedRoles = jest.fn(() => ['super-admin']);

      const authController = {
        register: jest.fn(),
        assignClientAccess: jest.fn(),
        addRoles: jest.fn(),
        removeRoles: jest.fn(),
        login: jest.fn()
      };

      let buildAuthRouter: ((controller: unknown) => unknown) | undefined;

      jest.isolateModules(() => {
        jest.doMock('express', () => ({ Router }));
        jest.doMock('../src/adapters/http/middlewares/validateCredentials', () => ({
          validateRegisterCredentials,
          validateAssignClientAccessPayload,
          validateLoginCredentials,
          validateUserRolesPayload
        }));
        jest.doMock('../src/adapters/http/middlewares/authorization', () => ({
          authenticateRequest,
          authorizeRoles
        }));
        jest.doMock('../src/infrastructure/config/authorization', () => ({
          getRegisterAllowedRoles,
          getAssignClientAccessAllowedRoles,
          getManageUserRolesAllowedRoles
        }));

        ({ buildAuthRouter } = require('../src/adapters/http/routes/authRoutes'));
      });

      // Act
      const result = buildAuthRouter!(authController);

      // Assert
      expect(Router).toHaveBeenCalledTimes(1);
      expect(getRegisterAllowedRoles).toHaveBeenCalledTimes(1);
      expect(getAssignClientAccessAllowedRoles).toHaveBeenCalledTimes(1);
      expect(getManageUserRolesAllowedRoles).toHaveBeenCalledTimes(1);
      expect(authorizeRoles).toHaveBeenNthCalledWith(1, ['admin']);
      expect(authorizeRoles).toHaveBeenNthCalledWith(2, ['admin', 'super-admin']);
      expect(authorizeRoles).toHaveBeenNthCalledWith(3, ['super-admin']);
      expect(authorizeRoles).toHaveBeenNthCalledWith(4, ['super-admin']);
      expect(post).toHaveBeenCalledTimes(5);
      expect(post).toHaveBeenNthCalledWith(
        1,
        '/users',
        authenticateRequest,
        registerRoleGuard,
        validateRegisterCredentials,
        authController.register
      );
      expect(post).toHaveBeenNthCalledWith(
        2,
        '/users/client-access',
        authenticateRequest,
        assignRoleGuard,
        validateAssignClientAccessPayload,
        authController.assignClientAccess
      );
      expect(post).toHaveBeenNthCalledWith(
        3,
        '/users/roles/add',
        authenticateRequest,
        addRolesGuard,
        validateUserRolesPayload,
        authController.addRoles
      );
      expect(post).toHaveBeenNthCalledWith(
        4,
        '/users/roles/remove',
        authenticateRequest,
        removeRolesGuard,
        validateUserRolesPayload,
        authController.removeRoles
      );
      expect(post).toHaveBeenNthCalledWith(5, '/login', validateLoginCredentials, authController.login);
      expect(result).toBe(router);
    });
  });
});
