import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../../../shared/errors/AppError';

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
const CLIENT_ID_MIN = 3;
const CLIENT_ID_MAX = 50;
const ROLE_MIN = 2;
const ROLE_MAX = 30;

const sqlPattern = /(--|;|\/\*|\*\/|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i;
const clientIdPattern = /^[a-z0-9][a-z0-9._-]*$/;
const rolePattern = /^[a-z][a-z0-9_-]*$/;

const hasSqlInjection = (value: string): boolean => sqlPattern.test(value);

const validateUsername = (
  username: unknown,
  errors: Array<{ field: string; message: string }>,
  field: string = 'username'
): void => {
  if (typeof username !== 'string' || username.trim().length === 0) {
    errors.push({ field, message: 'Username is required' });
    return;
  }

  const length = username.trim().length;
  if (length < USERNAME_MIN || length > USERNAME_MAX) {
    errors.push({ field, message: `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters` });
  }
  if (hasSqlInjection(username)) {
    errors.push({ field, message: 'Username contains forbidden patterns' });
  }
};

const validateRolesArray = (
  roles: unknown,
  errors: Array<{ field: string; message: string }>,
  fieldPrefix: string = 'roles'
): void => {
  if (!Array.isArray(roles) || roles.length === 0) {
    errors.push({ field: fieldPrefix, message: 'Roles list is required' });
    return;
  }

  roles.forEach((role, index) => {
    const field = `${fieldPrefix}[${index}]`;

    if (typeof role !== 'string' || role.trim().length === 0) {
      errors.push({ field, message: 'Role is required' });
      return;
    }

    const normalized = role.trim();
    if (normalized.length < ROLE_MIN || normalized.length > ROLE_MAX) {
      errors.push({ field, message: `Role must be between ${ROLE_MIN} and ${ROLE_MAX} characters` });
    }

    if (!rolePattern.test(normalized)) {
      errors.push({ field, message: 'Role format is invalid' });
    }

    if (hasSqlInjection(role)) {
      errors.push({ field, message: 'Role contains forbidden patterns' });
    }
  });
};

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
  const { username, password, roles } = req.body as { username?: unknown; password?: unknown; roles?: unknown };
  const errors = validateBaseCredentials(username, password);
  validateRolesArray(roles, errors);

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

export const validateAssignClientAccessPayload = (req: Request, _res: Response, next: NextFunction): void => {
  const { users } = req.body as {
    users?: unknown;
  };

  const errors: Array<{ field: string; message: string }> = [];

  if (!Array.isArray(users) || users.length === 0) {
    errors.push({ field: 'users', message: 'Users list is required' });
  }

  if (Array.isArray(users)) {
    users.forEach((entry, index) => {
      const path = `users[${index}]`;
      const candidate = entry as { username?: unknown; clientIds?: unknown };
      validateUsername(candidate.username, errors, `${path}.username`);

      if (!Array.isArray(candidate.clientIds) || candidate.clientIds.length === 0) {
        errors.push({ field: `${path}.clientIds`, message: 'Client IDs list is required' });
        return;
      }

      candidate.clientIds.forEach((clientId, clientIndex) => {
        const clientPath = `${path}.clientIds[${clientIndex}]`;

        if (typeof clientId !== 'string' || clientId.trim().length === 0) {
          errors.push({ field: clientPath, message: 'Client ID is required' });
          return;
        }

        const normalized = clientId.trim();
        if (normalized.length < CLIENT_ID_MIN || normalized.length > CLIENT_ID_MAX) {
          errors.push({ field: clientPath, message: `Client ID must be between ${CLIENT_ID_MIN} and ${CLIENT_ID_MAX} characters` });
        }

        if (!clientIdPattern.test(normalized)) {
          errors.push({ field: clientPath, message: 'Client ID format is invalid' });
        }

        if (hasSqlInjection(clientId)) {
          errors.push({ field: clientPath, message: 'Client ID contains forbidden patterns' });
        }
      });
    });
  }

  throwIfValidationErrors(errors, next);
  if (errors.length > 0) {
    return;
  }

  return next();
};

export const validateUserRolesPayload = (req: Request, _res: Response, next: NextFunction): void => {
  const { username, roles } = req.body as {
    username?: unknown;
    roles?: unknown;
  };

  const errors: Array<{ field: string; message: string }> = [];
  validateUsername(username, errors);
  validateRolesArray(roles, errors);

  throwIfValidationErrors(errors, next);
  if (errors.length > 0) {
    return;
  }

  return next();
};

export const validateGetUserRolesParams = (req: Request, _res: Response, next: NextFunction): void => {
  const { username } = req.params as { username?: unknown };
  const errors: Array<{ field: string; message: string }> = [];

  validateUsername(username, errors, 'username');

  throwIfValidationErrors(errors, next);
  if (errors.length > 0) {
    return;
  }

  return next();
};
