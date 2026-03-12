export type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>> | string | null;

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_CLIENT: 'INVALID_CLIENT',
  CLIENT_ACCESS_DENIED: 'CLIENT_ACCESS_DENIED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details: ErrorDetails;

  constructor({ code, message, status = 500, details = null }: { code: ErrorCode; message: string; status?: number; details?: ErrorDetails }) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
