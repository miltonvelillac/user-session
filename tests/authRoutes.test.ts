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

      const authController = {
        register: jest.fn(),
        assignClientAccess: jest.fn(),
        login: jest.fn()
      };

      let buildAuthRouter: ((controller: unknown) => unknown) | undefined;

      jest.isolateModules(() => {
        jest.doMock('express', () => ({ Router }));
        jest.doMock('../src/adapters/http/middlewares/validateCredentials', () => ({
          validateRegisterCredentials,
          validateAssignClientAccessPayload,
          validateLoginCredentials
        }));

        ({ buildAuthRouter } = require('../src/adapters/http/routes/authRoutes'));
      });

      // Act
      const result = buildAuthRouter!(authController);

      // Assert
      expect(Router).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledTimes(3);
      expect(post).toHaveBeenNthCalledWith(1, '/users', validateRegisterCredentials, authController.register);
      expect(post).toHaveBeenNthCalledWith(2, '/users/client-access', validateAssignClientAccessPayload, authController.assignClientAccess);
      expect(post).toHaveBeenNthCalledWith(3, '/login', validateLoginCredentials, authController.login);
      expect(result).toBe(router);
    });
  });
});
