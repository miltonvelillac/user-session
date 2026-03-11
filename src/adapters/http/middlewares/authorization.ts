import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AppError, ErrorCodes } from '../../../shared/errors/AppError';

export type AuthContext = {
  userId: string;
  username: string;
  roles: string[];
};

export type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};

const getBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const parseRoles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((role): role is string => typeof role === 'string');
};

export const authenticateRequest = (req: Request, _res: Response, next: NextFunction): void => {
  const token = getBearerToken(req.header('authorization'));
  if (!token) {
    next(new AppError({
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Authentication token is required',
      status: 401
    }));
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret) as JwtPayload & { username?: unknown; roles?: unknown };

    const userId = typeof decoded.sub === 'string' ? decoded.sub : null;
    const username = typeof decoded.username === 'string' ? decoded.username : null;
    const roles = parseRoles(decoded.roles);

    if (!userId || !username) {
      throw new AppError({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid authentication token',
        status: 401
      });
    }

    const authenticatedRequest = req as AuthenticatedRequest;
    authenticatedRequest.auth = { userId, username, roles };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError({
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Invalid authentication token',
      status: 401
    }));
  }
};

export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authenticatedRequest = req as AuthenticatedRequest;
    if (!authenticatedRequest.auth) {
      next(new AppError({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Authentication token is required',
        status: 401
      }));
      return;
    }

    const hasAllowedRole = authenticatedRequest.auth.roles.some(role => allowedRoles.includes(role));
    if (!hasAllowedRole) {
      next(new AppError({
        code: ErrorCodes.FORBIDDEN,
        message: 'Insufficient role permissions',
        status: 403,
        details: {
          requiredRoles: allowedRoles
        }
      }));
      return;
    }

    next();
  };
};
