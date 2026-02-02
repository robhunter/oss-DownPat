/**
 * Custom error classes for DownPat domain errors.
 * These map cleanly to HTTP status codes in the Express routes.
 */

/**
 * Resource not found (exercise, conversation, message).
 * Maps to HTTP 404.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Authorization failure (not admin, not owner, not subscriber).
 * Maps to HTTP 403.
 */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Validation or business logic error (immutable slug, already complete, missing field).
 * Maps to HTTP 400.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
