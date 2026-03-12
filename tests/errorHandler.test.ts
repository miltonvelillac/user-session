import { NextFunction, Request, Response } from 'express';
import { errorHandler } from '../src/adapters/http/middlewares/errorHandler';
import { AppError, ErrorCodes } from '../src/shared/errors/AppError';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const buildResponse = (): MockResponse => {
  const response = {
    status: jest.fn(),
    json: jest.fn()
  } as unknown as MockResponse;

  response.status.mockReturnValue(response);
  return response;
};

describe('errorHandler', () => {
  describe('#errorHandler', () => {
    it('should return AppError payload and status when AppError is provided', () => {
      // Arrange
      const error = new AppError({
        code: ErrorCodes.FORBIDDEN,
        message: 'Insufficient role permissions',
        status: 403,
        details: { requiredRoles: ['admin'] }
      });
      const response = buildResponse();

      // Act
      errorHandler(error, {} as Request, response, jest.fn() as NextFunction);

      // Assert
      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.FORBIDDEN,
          message: 'Insufficient role permissions',
          details: { requiredRoles: ['admin'] }
        }
      });
    });

    it('should return 503 DATABASE_UNAVAILABLE for SQL connection errors', () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const dbError = {
        name: 'ConnectionError',
        code: 'ESOCKET',
        message: 'Failed to connect to 192.168.10.10:53220'
      };
      const response = buildResponse();
      const request = { method: 'POST', originalUrl: '/api/login', url: '/api/login' } as Request;

      // Act
      errorHandler(dbError, request, response, jest.fn() as NextFunction);

      // Assert
      expect(response.status).toHaveBeenCalledWith(503);
      expect(response.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.DATABASE_UNAVAILABLE,
          message: 'Database unavailable',
          details: null
        }
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[DB_UNAVAILABLE]',
        expect.objectContaining({
          method: 'POST',
          path: '/api/login',
          error: expect.objectContaining({
            name: 'ConnectionError',
            code: 'ESOCKET',
            message: 'Failed to connect to 192.168.10.10:53220'
          })
        })
      );
      consoleErrorSpy.mockRestore();
    });

    it('should return 500 INTERNAL_ERROR for unknown errors', () => {
      // Arrange
      const error = new Error('unexpected failure');
      const response = buildResponse();

      // Act
      errorHandler(error, {} as Request, response, jest.fn() as NextFunction);

      // Assert
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Internal server error',
          details: null
        }
      });
    });
  });
});
