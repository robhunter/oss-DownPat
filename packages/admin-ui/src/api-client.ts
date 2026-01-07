import type { Exercise, ExerciseMetadata } from '@downpat/core';

export interface ExerciseWithMetadata {
  exercise: Exercise;
  metadata: ExerciseMetadata;
}

/**
 * Parameters for slicing cached data.
 */
export interface SliceParams {
  /** Maximum number of items to return (default: 50) */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
}

/**
 * Response wrapper for sliced data.
 * Note: This is CLIENT-SIDE slicing of cached data, not true server-side pagination.
 * All data is fetched from the server, then sliced locally.
 */
export interface SlicedResponse<T> {
  /** Array of items for the current slice */
  items: T[];
  /** Total number of items in the full dataset */
  total: number;
  /** Number of items requested */
  limit: number;
  /** Current offset */
  offset: number;
  /** Whether there are more items after this slice */
  hasMore: boolean;
}

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
export class AdminAPIError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** Error code from API response */
  readonly code?: string;
  /** Additional error details */
  readonly details?: Record<string, unknown>;

  constructor(response: APIErrorResponse) {
    super(response.message);
    this.name = 'AdminAPIError';
    this.status = response.status;
    this.code = response.code;
    this.details = response.details;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdminAPIError);
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

export interface AdminAPIClient {
  /** Get all exercises with their metadata */
  getExercises(): Promise<ExerciseWithMetadata[]>;

  /**
   * Get exercises with pagination support.
   * Note: Currently implements client-side pagination. Server-side pagination
   * requires backend updates to the storage interface.
   */
  getExercisesPaginated(params?: PaginationParams): Promise<PaginatedResponse<ExerciseWithMetadata>>;

  /** Get a single exercise by slug */
  getExercise(slug: string): Promise<Exercise>;

  /** Create a new exercise */
  createExercise(exercise: Exercise): Promise<Exercise>;

  /** Update an existing exercise */
  updateExercise(exerciseId: string, exercise: Partial<Exercise>): Promise<Exercise>;

  /** Delete an exercise */
  deleteExercise(slug: string): Promise<void>;

  /** Publish an exercise */
  publishExercise(slug: string): Promise<void>;

  /** Unpublish an exercise */
  unpublishExercise(slug: string): Promise<void>;

  /** Restore draft from published version */
  restoreExercise(slug: string): Promise<void>;
}

/**
 * Create an API client for admin operations.
 */
export function createAdminAPIClient(
  apiBaseUrl: string,
  getAuthToken: () => Promise<string | null>
): AdminAPIClient {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      // Try to parse error response as JSON
      let errorBody: Record<string, unknown> = {};
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        try {
          errorBody = await response.json();
        } catch {
          // JSON parsing failed, use empty object
        }
      }

      // Extract error information with fallbacks
      const message =
        (typeof errorBody.message === 'string' ? errorBody.message : null) ||
        (typeof errorBody.error === 'string' ? errorBody.error : null) ||
        response.statusText ||
        `Request failed with status ${response.status}`;

      throw new AdminAPIError({
        message,
        status: response.status,
        code: typeof errorBody.code === 'string' ? errorBody.code : undefined,
        details: typeof errorBody.details === 'object' ? errorBody.details as Record<string, unknown> : undefined,
      });
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Cache for client-side pagination
  let exerciseCache: ExerciseWithMetadata[] | null = null;
  let cacheTimestamp = 0;
  const CACHE_TTL = 30000; // 30 seconds

  return {
    async getExercises(): Promise<ExerciseWithMetadata[]> {
      // Use the with-metadata endpoint for admin listing
      const exercises = await request<ExerciseWithMetadata[]>('GET', '/exercises/with-metadata');
      // Update cache
      exerciseCache = exercises;
      cacheTimestamp = Date.now();
      return exercises;
    },

    /**
     * Get exercises with client-side slicing from a cached dataset.
     * Note: This fetches ALL exercises from the server (with caching),
     * then returns a slice. Use for UI pagination, not for reducing server load.
     */
    async getExercisesSliced(params?: SliceParams): Promise<SlicedResponse<ExerciseWithMetadata>> {
      const limit = params?.limit ?? 50;
      const offset = params?.offset ?? 0;

      // Use cache if fresh, otherwise fetch
      const now = Date.now();
      if (!exerciseCache || now - cacheTimestamp > CACHE_TTL) {
        exerciseCache = await request<ExerciseWithMetadata[]>('GET', '/exercises/with-metadata');
        cacheTimestamp = now;
      }

      const total = exerciseCache.length;
      const items = exerciseCache.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        items,
        total,
        limit,
        offset,
        hasMore,
      };
    },

    async getExercise(slug: string): Promise<Exercise> {
      return request<Exercise>('GET', `/exercises/${slug}`);
    },

    async createExercise(exercise: Exercise): Promise<Exercise> {
      return request<Exercise>('POST', '/exercises', exercise);
    },

    async updateExercise(exerciseId: string, exercise: Partial<Exercise>): Promise<Exercise> {
      return request<Exercise>('PUT', `/exercises/${exerciseId}`, exercise);
    },

    async deleteExercise(slug: string): Promise<void> {
      return request<void>('DELETE', `/exercises/${slug}`);
    },

    async publishExercise(slug: string): Promise<void> {
      return request<void>('POST', `/exercises/${slug}/publish`);
    },

    async unpublishExercise(slug: string): Promise<void> {
      return request<void>('POST', `/exercises/${slug}/unpublish`);
    },

    async restoreExercise(slug: string): Promise<void> {
      return request<void>('POST', `/exercises/${slug}/restore`);
    },
  };
}
