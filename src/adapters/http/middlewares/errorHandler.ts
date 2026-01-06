import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../../../shared/errors/AppError';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
      details: null
    }
  });
};