import { NextFunction, Request, Response } from 'express';
import {
  validateAssignClientAccessPayload,
  validateGetUserRolesParams,
  validateLoginCredentials,
  validateRegisterCredentials,
  validateUserRolesPayload
} from '../src/adapters/http/middlewares/validateCredentials';
import { AppError, ErrorCodes } from '../src/shared/errors/AppError';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

const executeMiddleware = (
  middleware: Middleware,
  input: { body?: unknown; params?: unknown }
): { next: jest.Mock; error?: AppError } => {
  const request = { body: input.body ?? {}, params: input.params ?? {} } as Request;
  const response = {} as Response;
  const nextMock = jest.fn();
  const next = nextMock as unknown as NextFunction;

  middleware(request, response, next);

  return {
    next: nextMock,
    error: nextMock.mock.calls[0]?.[0] as AppError | undefined
  };
};

describe('validateCredentials middleware', () => {
  describe('#validateRegisterCredentials', () => {
    it('should call next without error for a valid payload', () => {
      // Arrange
      const body = { username: 'john', password: 'super-secret', roles: ['admin'] };

      // Act
      const { next, error } = executeMiddleware(validateRegisterCredentials, { body });

      // Assert
      expect(error).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should return VALIDATION_ERROR when username is missing', () => {
      // Arrange
      const body = { password: 'super-secret', roles: ['admin'] };

      // Act
      const { error } = executeMiddleware(validateRegisterCredentials, { body });

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should return VALIDATION_ERROR for SQL-like username content', () => {
      // Arrange
      const body = { username: 'john; DROP TABLE users', password: 'super-secret', roles: ['admin'] };

      // Act
      const { error } = executeMiddleware(validateRegisterCredentials, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username', message: 'Username contains forbidden patterns' })
        ])
      );
    });

    it('should return VALIDATION_ERROR for short password', () => {
      // Arrange
      const body = { username: 'john', password: 'short', roles: ['admin'] };

      // Act
      const { error } = executeMiddleware(validateRegisterCredentials, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password', message: expect.stringContaining('between 8 and 64') })
        ])
      );
    });

    it('should return VALIDATION_ERROR when roles list is missing', () => {
      // Arrange
      const body = { username: 'john', password: 'super-secret' };

      // Act
      const { error } = executeMiddleware(validateRegisterCredentials, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'roles', message: 'Roles list is required' })])
      );
    });

    it('should return VALIDATION_ERROR when role format is invalid', () => {
      // Arrange
      const body = { username: 'john', password: 'super-secret', roles: ['Admin Root'] };

      // Act
      const { error } = executeMiddleware(validateRegisterCredentials, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'roles[0]', message: 'Role format is invalid' })
        ])
      );
    });
  });

  describe('#validateLoginCredentials', () => {
    it('should call next without error for a valid payload', () => {
      // Arrange
      const body = { username: 'john', password: 'super-secret', clientId: 'mobile-app' };

      // Act
      const { next, error } = executeMiddleware(validateLoginCredentials, { body });

      // Assert
      expect(error).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should return VALIDATION_ERROR when clientId is missing', () => {
      // Arrange
      const body = { username: 'john', password: 'super-secret' };

      // Act
      const { error } = executeMiddleware(validateLoginCredentials, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'clientId', message: 'Client ID is required' })])
      );
    });

    it('should return VALIDATION_ERROR when clientId format is invalid', () => {
      // Arrange
      const body = { username: 'john', password: 'super-secret', clientId: 'INVALID CLIENT' };

      // Act
      const { error } = executeMiddleware(validateLoginCredentials, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'clientId', message: 'Client ID format is invalid' })
        ])
      );
    });

    it('should return VALIDATION_ERROR when clientId includes SQL-like content', () => {
      // Arrange
      const body = { username: 'john', password: 'super-secret', clientId: 'app; DELETE FROM sessions' };

      // Act
      const { error } = executeMiddleware(validateLoginCredentials, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'clientId', message: 'Client ID contains forbidden patterns' })
        ])
      );
    });
  });

  describe('#validateAssignClientAccessPayload', () => {
    it('should call next without error for a valid users list', () => {
      // Arrange
      const body = {
        users: [
          { username: 'john', clientIds: ['web-app'] },
          { username: 'ana', clientIds: ['mobile-app', 'admin-portal'] }
        ]
      };

      // Act
      const { next, error } = executeMiddleware(validateAssignClientAccessPayload, { body });

      // Assert
      expect(error).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should return VALIDATION_ERROR when users list is missing', () => {
      // Arrange
      const body = {};

      // Act
      const { error } = executeMiddleware(validateAssignClientAccessPayload, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'users', message: 'Users list is required' })])
      );
    });

    it('should return VALIDATION_ERROR when an item has missing username', () => {
      // Arrange
      const body = {
        users: [{ clientIds: ['web-app'] }]
      };

      // Act
      const { error } = executeMiddleware(validateAssignClientAccessPayload, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'users[0].username', message: 'Username is required' })
        ])
      );
    });

    it('should return VALIDATION_ERROR when clientIds list is empty', () => {
      // Arrange
      const body = {
        users: [{ username: 'john', clientIds: [] }]
      };

      // Act
      const { error } = executeMiddleware(validateAssignClientAccessPayload, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'users[0].clientIds', message: 'Client IDs list is required' })
        ])
      );
    });

    it('should return VALIDATION_ERROR when a client ID is invalid in nested list', () => {
      // Arrange
      const body = {
        users: [{ username: 'john', clientIds: ['INVALID CLIENT'] }]
      };

      // Act
      const { error } = executeMiddleware(validateAssignClientAccessPayload, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'users[0].clientIds[0]',
            message: 'Client ID format is invalid'
          })
        ])
      );
    });
  });

  describe('#validateUserRolesPayload', () => {
    it('should call next without error for a valid payload', () => {
      // Arrange
      const body = { username: 'john', roles: ['admin'] };

      // Act
      const { next, error } = executeMiddleware(validateUserRolesPayload, { body });

      // Assert
      expect(error).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should return VALIDATION_ERROR when username is missing', () => {
      // Arrange
      const body = { roles: ['admin'] };

      // Act
      const { error } = executeMiddleware(validateUserRolesPayload, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username', message: 'Username is required' })
        ])
      );
    });

    it('should return VALIDATION_ERROR when roles are missing', () => {
      // Arrange
      const body = { username: 'john' };

      // Act
      const { error } = executeMiddleware(validateUserRolesPayload, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'roles', message: 'Roles list is required' })
        ])
      );
    });

    it('should return VALIDATION_ERROR when role contains forbidden patterns', () => {
      // Arrange
      const body = { username: 'john', roles: ['admin; DROP TABLE auth.Users'] };

      // Act
      const { error } = executeMiddleware(validateUserRolesPayload, { body });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'roles[0]', message: 'Role contains forbidden patterns' })
        ])
      );
    });
  });

  describe('#validateGetUserRolesParams', () => {
    it('should call next without error for valid username param', () => {
      // Arrange
      const params = { username: 'john' };

      // Act
      const { next, error } = executeMiddleware(validateGetUserRolesParams, { params });

      // Assert
      expect(error).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should return VALIDATION_ERROR when username param is missing', () => {
      // Arrange
      const params = {};

      // Act
      const { error } = executeMiddleware(validateGetUserRolesParams, { params });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username', message: 'Username is required' })
        ])
      );
    });

    it('should return VALIDATION_ERROR for SQL-like username param', () => {
      // Arrange
      const params = { username: 'john; DROP TABLE users' };

      // Act
      const { error } = executeMiddleware(validateGetUserRolesParams, { params });

      // Assert
      expect(error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'username', message: 'Username contains forbidden patterns' })
        ])
      );
    });
  });
});
