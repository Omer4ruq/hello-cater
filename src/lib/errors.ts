/**
 * Application errors.
 *
 * Every error carries a machine-readable code and an explicitly
 * user-safe message. Internal details stay in `cause` and are logged
 * server-side but never serialised to a client response.
 */
export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'rate_limited'
  | 'payment_failed'
  | 'integration_unavailable'
  | 'internal';

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 422,
  conflict: 409,
  rate_limited: 429,
  payment_failed: 402,
  integration_unavailable: 503,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, options: { details?: unknown; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
    this.details = options.details;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}

export const unauthenticated = (m = 'You need to sign in to continue.') => new AppError('unauthenticated', m);
export const forbidden = (m = 'You do not have access to this resource.') => new AppError('forbidden', m);
export const notFound = (m = 'We could not find what you were looking for.') => new AppError('not_found', m);
export const invalid = (m: string, details?: unknown) => new AppError('validation_failed', m, { details });
export const conflict = (m: string) => new AppError('conflict', m);

/** Never leaks internals: unknown errors become a generic 500. */
export function toPublicError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError('internal', 'Something went wrong on our side. Please try again.', {
    cause: error,
  });
}
