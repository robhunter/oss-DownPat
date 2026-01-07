import type { Exercise, ExerciseMetadata } from '@downpat/core';

export interface ExerciseWithMetadata {
  exercise: Exercise;
  metadata: ExerciseMetadata;
}

export interface AdminAPIClient {
  /** Get all exercises with their metadata */
  getExercises(): Promise<ExerciseWithMetadata[]>;

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
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  return {
    async getExercises(): Promise<ExerciseWithMetadata[]> {
      // Use the with-metadata endpoint for admin listing
      return request<ExerciseWithMetadata[]>('GET', '/exercises/with-metadata');
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
