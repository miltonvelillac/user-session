import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { AppError, ErrorCodes } from '../src/shared/errors/AppError';
import { authenticateRequest, AuthenticatedRequest, authorizeRoles } from '../src/adapters/http/middlewares/authorization';

const buildRequest = (authorization?: string): AuthenticatedRequest => {
  return {
    header: jest.fn().mockReturnValue(authorization)
  } as unknown as AuthenticatedRequest;
};

const runMiddleware = (
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  request: Request
): { nextMock: jest.Mock; error?: AppError } => {
  const nextMock = jest.fn();
  middleware(request, {} as Response, nextMock as unknown as NextFunction);
  return { nextMock, error: nextMock.mock.calls[0]?.[0] as AppError | undefined };
};

describe('authorization middleware', () => {
  describe('#authenticateRequest', () => {
    it('should attach auth context and call next for valid token', () => {
      // Arrange
      process.env.JWT_SECRET = 'test-secret';
      const token = jwt.sign(
        { username: 'john', roles: ['admin'] },
        'test-secret',
        { subject: 'user-1' }
      );
      const request = buildRequest(`Bearer ${token}`);

      // Act
      const { nextMock, error } = runMiddleware(authenticateRequest, request as Request);

      // Assert
      expect(error).toBeUndefined();
      expect(nextMock).toHaveBeenCalledWith();
      expect(request.auth).toEqual({ userId: 'user-1', username: 'john', roles: ['admin'] });
    });

    it('should return UNAUTHORIZED when authorization header is missing', () => {
      // Arrange
      const request = buildRequest(undefined);

      // Act
      const { error } = runMiddleware(authenticateRequest, request as Request);

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error?.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error?.status).toBe(401);
    });

    it('should return UNAUTHORIZED when token is invalid', () => {
      // Arrange
      process.env.JWT_SECRET = 'test-secret';
      const request = buildRequest('Bearer invalid-token');

      // Act
      const { error } = runMiddleware(authenticateRequest, request as Request);

      // Assert
      expect(error?.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error?.status).toBe(401);
    });

    it('should return UNAUTHORIZED when token lacks required claims', () => {
      // Arrange
      process.env.JWT_SECRET = 'test-secret';
      const token = jwt.sign({ roles: ['admin'] }, 'test-secret');
      const request = buildRequest(`Bearer ${token}`);

      // Act
      const { error } = runMiddleware(authenticateRequest, request as Request);

      // Assert
      expect(error?.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error?.status).toBe(401);
    });
  });

  describe('#authorizeRoles', () => {
    it('should call next when authenticated user has at least one allowed role', () => {
      // Arrange
      const request = {
        auth: { userId: 'u1', username: 'john', roles: ['admin'] }
      } as unknown as Request;
      const middleware = authorizeRoles(['admin', 'super-admin']);

      // Act
      const { nextMock, error } = runMiddleware(middleware, request);

      // Assert
      expect(error).toBeUndefined();
      expect(nextMock).toHaveBeenCalledWith();
    });

    it('should return UNAUTHORIZED when request is not authenticated', () => {
      // Arrange
      const request = {} as Request;
      const middleware = authorizeRoles(['admin']);

      // Act
      const { error } = runMiddleware(middleware, request);

      // Assert
      expect(error?.code).toBe(ErrorCodes.UNAUTHORIZED);
      expect(error?.status).toBe(401);
    });

    it('should return FORBIDDEN when user lacks allowed roles', () => {
      // Arrange
      const request = {
        auth: { userId: 'u1', username: 'john', roles: ['seller'] }
      } as unknown as Request;
      const middleware = authorizeRoles(['admin']);

      // Act
      const { error } = runMiddleware(middleware, request);

      // Assert
      expect(error?.code).toBe(ErrorCodes.FORBIDDEN);
      expect(error?.status).toBe(403);
      expect(error?.details).toEqual({ requiredRoles: ['admin'] });
    });
  });
});
