import type { Exercise, ExerciseMetadata, Conversation } from '@downpat/core';

/**
 * Exercise with its metadata (draft/published status, timestamps)
 */
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
 * Exercise statistics summary
 */
export interface ExerciseStats {
  /** Total number of exercises */
  total: number;
  /** Number of draft exercises */
  draftCount: number;
  /** Number of published exercises */
  publishedCount: number;
}

/**
 * Configuration for the DownPat API client
 */
export interface DownpatClientConfig {
  /** Base URL for the DownPat API (default: '/api/downpat') */
  baseUrl?: string;
  /**
   * Function to get the current auth token.
   * Can be sync or async depending on your token storage mechanism.
   */
  getToken: () => string | null | Promise<string | null>;
  /**
   * Cache TTL in milliseconds (default: 30000ms / 30 seconds).
   * Set to 0 to disable caching.
   */
  cacheTTL?: number;
}

// Re-export core types for convenience
export type { Exercise, ExerciseMetadata, Conversation };
