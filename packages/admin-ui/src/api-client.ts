/**
 * Re-export API client from @downpat/api-client for backwards compatibility.
 * This file maintains the existing interface while delegating to the shared implementation.
 */

// Re-export the error class with both names for backwards compatibility
export {
  DownpatAPIError as AdminAPIError,
  DownpatAPIError,
} from '@downpat/api-client';

// Re-export types
export type {
  APIErrorResponse,
  ExerciseWithMetadata,
  SliceParams,
  SlicedResponse,
} from '@downpat/api-client';

// Re-export the client class
export { DownpatClient } from '@downpat/api-client';

// Import for the interface and factory
import {
  DownpatClient,
  type ExerciseWithMetadata,
  type SliceParams,
  type SlicedResponse,
} from '@downpat/api-client';
import type { Exercise } from '@downpat/core';

/**
 * Admin API client interface.
 * This interface is maintained for backwards compatibility.
 */
export interface AdminAPIClient {
  /** Get all exercises with their metadata */
  getExercises(): Promise<ExerciseWithMetadata[]>;

  /**
   * Get exercises with client-side slicing from a cached dataset.
   * Note: This fetches ALL exercises from the server (with caching),
   * then returns a slice. Use for UI pagination, not for reducing server load.
   */
  getExercisesSliced(params?: SliceParams): Promise<SlicedResponse<ExerciseWithMetadata>>;

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
 *
 * @example
 * ```typescript
 * const client = createAdminAPIClient('/api/downpat', async () => {
 *   return localStorage.getItem('token');
 * });
 *
 * const exercises = await client.getExercises();
 * ```
 */
export function createAdminAPIClient(
  apiBaseUrl: string,
  getAuthToken: () => Promise<string | null>
): AdminAPIClient {
  const client = new DownpatClient({
    baseUrl: apiBaseUrl,
    getToken: getAuthToken,
  });

  // Return an object that implements the AdminAPIClient interface
  // by delegating to the DownpatClient methods
  return {
    getExercises: () => client.getExercisesWithMetadata(),
    getExercisesSliced: (params) => client.getExercisesSliced(params),
    getExercise: (slug) => client.getExercise(slug),
    createExercise: (exercise) => client.createExercise(exercise),
    updateExercise: (exerciseId, exercise) => client.updateExercise(exerciseId, exercise),
    deleteExercise: (slug) => client.deleteExercise(slug),
    publishExercise: (slug) => client.publishExercise(slug),
    unpublishExercise: (slug) => client.unpublishExercise(slug),
    restoreExercise: (slug) => client.restoreExercise(slug),
  };
}
