import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../../../shared/errors/AppError';

const isDatabaseUnavailableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    originalError?: unknown;
  };

  const dbUnavailableCodes = new Set(['ESOCKET', 'ETIMEOUT', 'ELOGIN', 'ENOTOPEN', 'ECONNCLOSED']);
  const currentCode = typeof candidate.code === 'string' ? candidate.code : null;
  if (currentCode && dbUnavailableCodes.has(currentCode)) {
    return true;
  }

  const currentName = typeof candidate.name === 'string' ? candidate.name : '';
  if (currentName === 'ConnectionError') {
    return true;
  }

  const currentMessage = typeof candidate.message === 'string' ? candidate.message : '';
  if (/failed to connect|could not connect|connection is closed/i.test(currentMessage)) {
    return true;
  }

  if (candidate.originalError) {
    return isDatabaseUnavailableError(candidate.originalError);
  }

  return false;
};

const toErrorLog = (error: unknown): Record<string, unknown> => {
  if (!error || typeof error !== 'object') {
    return { raw: error };
  }

  const candidate = error as {
    name?: unknown;
    code?: unknown;
    message?: unknown;
    originalError?: unknown;
  };

  return {
    name: typeof candidate.name === 'string' ? candidate.name : null,
    code: typeof candidate.code === 'string' ? candidate.code : null,
    message: typeof candidate.message === 'string' ? candidate.message : null,
    originalError: candidate.originalError ? toErrorLog(candidate.originalError) : null
  };
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
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

  if (isDatabaseUnavailableError(err)) {
    console.error('[DB_UNAVAILABLE]', {
      method: req.method,
      path: req.originalUrl || req.url,
      error: toErrorLog(err)
    });

    res.status(503).json({
      error: {
        code: ErrorCodes.DATABASE_UNAVAILABLE,
        message: 'Database unavailable',
        details: null
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
