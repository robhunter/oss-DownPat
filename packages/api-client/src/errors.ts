/**
 * Structured error response from the API.
 */
export interface APIErrorResponse {
  /** Error message */
  message: string;
  /** Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  code?: string;
  /** HTTP status code */
  status: number;
  /** Additional error details (e.g., field-specific validation errors) */
  details?: Record<string, unknown>;
}

/**
 * Custom error class for API errors with structured information.
 */
export class DownpatAPIError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** Error code from API response */
  readonly code?: string;
  /** Additional error details */
  readonly details?: Record<string, unknown>;

  constructor(response: APIErrorResponse) {
    super(response.message);
    this.name = 'DownpatAPIError';
    this.status = response.status;
    this.code = response.code;
    this.details = response.details;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DownpatAPIError);
    }
  }

  /**
   * Check if this is a specific HTTP status error.
   */
  isStatus(status: number): boolean {
    return this.status === status;
  }

  /**
   * Check if this is a not found error (404).
   */
  isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Check if this is an unauthorized error (401).
   */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Check if this is a forbidden error (403).
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Check if this is a validation error (400 or 422).
   */
  isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }
}

/**
 * @deprecated Use DownpatAPIError instead. Alias for backwards compatibility.
 */
export const AdminAPIError = DownpatAPIError;
