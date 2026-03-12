import { AppError, ErrorCodes } from '../src/shared/errors/AppError';

describe('AppError', () => {
  describe('#constructor', () => {
    it('should assign default status and details when not provided', () => {
      // Arrange
      const payload = {
        code: ErrorCodes.INVALID_CLIENT,
        message: 'Invalid client'
      };

      // Act
      const error = new AppError(payload);

      // Assert
      expect(error.code).toBe(ErrorCodes.INVALID_CLIENT);
      expect(error.message).toBe('Invalid client');
      expect(error.status).toBe(500);
      expect(error.details).toBeNull();
    });

    it('should assign provided status and details', () => {
      // Arrange
      const payload = {
        code: ErrorCodes.CLIENT_ACCESS_DENIED,
        message: 'Access denied',
        status: 403,
        details: { userId: 'u1', clientId: 'test' }
      };

      // Act
      const error = new AppError(payload);

      // Assert
      expect(error.code).toBe(ErrorCodes.CLIENT_ACCESS_DENIED);
      expect(error.message).toBe('Access denied');
      expect(error.status).toBe(403);
      expect(error.details).toEqual({ userId: 'u1', clientId: 'test' });
    });
  });

  describe('#ErrorCodes', () => {
    it('should expose new error codes used in authentication flow', () => {
      // Arrange
      const codes = ErrorCodes;

      // Act
      const values = Object.values(codes);

      // Assert
      expect(values).toContain('INVALID_CLIENT');
      expect(values).toContain('CLIENT_ACCESS_DENIED');
      expect(values).toContain('UNAUTHORIZED');
      expect(values).toContain('FORBIDDEN');
      expect(values).toContain('DATABASE_UNAVAILABLE');
      expect(values).toContain('VALIDATION_ERROR');
    });
  });
});
