import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../src/adapters/http/controllers/AuthController';
import { CreateUser } from '../src/application/use-cases/CreateUser';
import { LoginUser } from '../src/application/use-cases/LoginUser';
import { AssignUserClientAccess } from '../src/application/use-cases/AssignUserClientAccess';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

type ControllerDependencies = {
  createUser: { execute: jest.Mock };
  loginUser: { execute: jest.Mock };
  assignUserClientAccess: { execute: jest.Mock };
};

const buildResponse = (): MockResponse => {
  const response = {
    status: jest.fn(),
    json: jest.fn()
  } as unknown as MockResponse;

  response.status.mockReturnValue(response);
  return response;
};

const buildController = (): { controller: AuthController; deps: ControllerDependencies } => {
  const deps: ControllerDependencies = {
    createUser: { execute: jest.fn() },
    loginUser: { execute: jest.fn() },
    assignUserClientAccess: { execute: jest.fn() }
  };

  const controller = new AuthController(
    deps.createUser as unknown as CreateUser,
    deps.loginUser as unknown as LoginUser,
    deps.assignUserClientAccess as unknown as AssignUserClientAccess
  );

  return { controller, deps };
};

describe('AuthController', () => {
  describe('#register', () => {
    it('should return 201 with created user data', async () => {
      // Arrange
      const { controller, deps } = buildController();
      deps.createUser.execute.mockResolvedValue({ id: 'u1', username: 'john' });
      const request = { body: { username: 'john', password: 'secret-123' } } as Request;
      const response = buildResponse();
      const next = jest.fn() as NextFunction;

      // Act
      await controller.register(request, response, next);

      // Assert
      expect(deps.createUser.execute).toHaveBeenCalledWith({ username: 'john', password: 'secret-123' });
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith({ data: { id: 'u1', username: 'john' } });
      expect(next).not.toHaveBeenCalled();
    });

    it('should forward execution errors to next', async () => {
      // Arrange
      const { controller, deps } = buildController();
      const error = new Error('create-user-error');
      deps.createUser.execute.mockRejectedValue(error);
      const request = { body: { username: 'john', password: 'secret-123' } } as Request;
      const response = buildResponse();
      const next = jest.fn() as NextFunction;

      // Act
      await controller.register(request, response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('#login', () => {
    it('should return 200 with token data', async () => {
      // Arrange
      const { controller, deps } = buildController();
      deps.loginUser.execute.mockResolvedValue({ token: 'jwt-token', sessionId: 'session-1' });
      const request = {
        body: { username: 'john', password: 'secret-123', clientId: 'test' }
      } as Request;
      const response = buildResponse();
      const next = jest.fn() as NextFunction;

      // Act
      await controller.login(request, response, next);

      // Assert
      expect(deps.loginUser.execute).toHaveBeenCalledWith({
        username: 'john',
        password: 'secret-123',
        clientId: 'test'
      });
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({ data: { token: 'jwt-token', sessionId: 'session-1' } });
      expect(next).not.toHaveBeenCalled();
    });

    it('should forward execution errors to next', async () => {
      // Arrange
      const { controller, deps } = buildController();
      const error = new Error('login-error');
      deps.loginUser.execute.mockRejectedValue(error);
      const request = {
        body: { username: 'john', password: 'secret-123', clientId: 'test' }
      } as Request;
      const response = buildResponse();
      const next = jest.fn() as NextFunction;

      // Act
      await controller.login(request, response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('#assignClientAccess', () => {
    it('should return 200 with assignment results', async () => {
      // Arrange
      const { controller, deps } = buildController();
      deps.assignUserClientAccess.execute.mockResolvedValue({
        assignments: [{ userId: 'u1', username: 'john', clientIds: ['test'] }]
      });
      const request = {
        body: { users: [{ username: 'john', clientIds: ['test'] }] }
      } as Request;
      const response = buildResponse();
      const next = jest.fn() as NextFunction;

      // Act
      await controller.assignClientAccess(request, response, next);

      // Assert
      expect(deps.assignUserClientAccess.execute).toHaveBeenCalledWith({
        users: [{ username: 'john', clientIds: ['test'] }]
      });
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        data: { assignments: [{ userId: 'u1', username: 'john', clientIds: ['test'] }] }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should forward execution errors to next', async () => {
      // Arrange
      const { controller, deps } = buildController();
      const error = new Error('assign-access-error');
      deps.assignUserClientAccess.execute.mockRejectedValue(error);
      const request = {
        body: { users: [{ username: 'john', clientIds: ['test'] }] }
      } as Request;
      const response = buildResponse();
      const next = jest.fn() as NextFunction;

      // Act
      await controller.assignClientAccess(request, response, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
