import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../../../shared/errors/AppError';

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
const CLIENT_ID_MIN = 3;
const CLIENT_ID_MAX = 50;

const sqlPattern = /(--|;|\/\*|\*\/|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i;
const clientIdPattern = /^[a-z0-9][a-z0-9._-]*$/;

const hasSqlInjection = (value: string): boolean => sqlPattern.test(value);

const validateBaseCredentials = (username: unknown, password: unknown): Array<{ field: string; message: string }> => {
  const errors: Array<{ field: string; message: string }> = [];

  if (typeof username !== 'string' || username.trim().length === 0) {
    errors.push({ field: 'username', message: 'Username is required' });
  }

  if (typeof password !== 'string' || password.trim().length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (typeof username === 'string') {
    const length = username.trim().length;
    if (length < USERNAME_MIN || length > USERNAME_MAX) {
      errors.push({ field: 'username', message: `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters` });
    }
    if (hasSqlInjection(username)) {
      errors.push({ field: 'username', message: 'Username contains forbidden patterns' });
    }
  }

  if (typeof password === 'string') {
    const length = password.length;
    if (length < PASSWORD_MIN || length > PASSWORD_MAX) {
      errors.push({ field: 'password', message: `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters` });
    }
    if (hasSqlInjection(password)) {
      errors.push({ field: 'password', message: 'Password contains forbidden patterns' });
    }
  }

  return errors;
};

const throwIfValidationErrors = (
  errors: Array<{ field: string; message: string }>,
  next: NextFunction
): void => {
  if (errors.length > 0) {
    next(new AppError({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation error',
      status: 400,
      details: errors
    }));
    return;
  }
};

export const validateRegisterCredentials = (req: Request, _res: Response, next: NextFunction): void => {
  const { username, password } = req.body as { username?: unknown; password?: unknown };
  const errors = validateBaseCredentials(username, password);
  throwIfValidationErrors(errors, next);
  if (errors.length > 0) {
    return;
  }

  return next();
};

export const validateLoginCredentials = (req: Request, _res: Response, next: NextFunction): void => {
  const { username, password, clientId } = req.body as {
    username?: unknown;
    password?: unknown;
    clientId?: unknown;
  };

  const errors = validateBaseCredentials(username, password);

  if (typeof clientId !== 'string' || clientId.trim().length === 0) {
    errors.push({ field: 'clientId', message: 'Client ID is required' });
  }

  if (typeof clientId === 'string') {
    const normalized = clientId.trim();

    if (normalized.length < CLIENT_ID_MIN || normalized.length > CLIENT_ID_MAX) {
      errors.push({ field: 'clientId', message: `Client ID must be between ${CLIENT_ID_MIN} and ${CLIENT_ID_MAX} characters` });
    }

    if (!clientIdPattern.test(normalized)) {
      errors.push({ field: 'clientId', message: 'Client ID format is invalid' });
    }

    if (hasSqlInjection(clientId)) {
      errors.push({ field: 'clientId', message: 'Client ID contains forbidden patterns' });
    }
  }

  throwIfValidationErrors(errors, next);
  if (errors.length > 0) {
    return;
  }

  return next();
};
