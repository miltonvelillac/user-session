import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../../../shared/errors/AppError';

export const notFound = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError({
    code: ErrorCodes.NOT_FOUND,
    message: 'Route not found',
    status: 404
  }));
};