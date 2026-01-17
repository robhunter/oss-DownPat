import type { Exercise, Conversation } from '@downpat/core';
import { DownpatAPIError } from './errors.js';
import type {
  DownpatClientConfig,
  ExerciseWithMetadata,
  ExerciseStats,
  SliceParams,
  SlicedResponse,
} from './types.js';

const DEFAULT_CACHE_TTL = 30000; // 30 seconds

/**
 * API client for communicating with the DownPat server.
 *
 * This client handles all HTTP requests to the DownPat API endpoints
 * with proper error handling, caching, and pagination support.
 * Authentication is handled via a token getter function provided at construction.
 *
 * @example
 * ```typescript
 * const client = createDownpatClient({
 *   getToken: () => localStorage.getItem('token'),
 * });
 *
 * // Get published exercises (for subscribers)
 * const exercises = await client.getPublishedExercises();
 *
 * // Get all exercises with metadata (for admins)
 * const allExercises = await client.getExercisesWithMetadata();
 * ```
 */
export class DownpatClient {
  private baseUrl: string;
  private getToken: () => string | null | Promise<string | null>;
  private cacheTTL: number;

  // Cache for exercises (used by slicing/pagination)
  private exerciseCache: ExerciseWithMetadata[] | null = null;
  private cacheTimestamp = 0;

  constructor(config: DownpatClientConfig) {
    this.baseUrl = config.baseUrl ?? '/api/downpat';
    this.getToken = config.getToken;
    this.cacheTTL = config.cacheTTL ?? DEFAULT_CACHE_TTL;
  }

  /**
   * Clear the internal cache. Useful after mutations.
   */
  clearCache(): void {
    this.exerciseCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Internal request method with proper error handling.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await Promise.resolve(this.getToken());

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
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
          errorBody = (await response.json()) as Record<string, unknown>;
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

      throw new DownpatAPIError({
        message,
        status: response.status,
        code: typeof errorBody.code === 'string' ? errorBody.code : undefined,
        details:
          typeof errorBody.details === 'object'
            ? (errorBody.details as Record<string, unknown>)
            : undefined,
      });
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  // =========================================================================
  // Exercise endpoints - Admin
  // =========================================================================

  /**
   * Get all exercises (admin only).
   */
  async getExercises(): Promise<Exercise[]> {
    return this.request<Exercise[]>('GET', '/exercises');
  }

  /**
   * Get all exercises with metadata (admin only).
   * Results are cached for slicing/pagination operations.
   */
  async getExercisesWithMetadata(): Promise<ExerciseWithMetadata[]> {
    const exercises = await this.request<ExerciseWithMetadata[]>(
      'GET',
      '/exercises/with-metadata'
    );
    // Update cache
    this.exerciseCache = exercises;
    this.cacheTimestamp = Date.now();
    return exercises;
  }

  /**
   * Get exercises with client-side slicing from a cached dataset.
   * Note: This fetches ALL exercises from the server (with caching),
   * then returns a slice. Use for UI pagination, not for reducing server load.
   */
  async getExercisesSliced(
    params?: SliceParams
  ): Promise<SlicedResponse<ExerciseWithMetadata>> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    // Use cache if fresh, otherwise fetch
    const now = Date.now();
    if (
      !this.exerciseCache ||
      this.cacheTTL === 0 ||
      now - this.cacheTimestamp > this.cacheTTL
    ) {
      this.exerciseCache = await this.request<ExerciseWithMetadata[]>(
        'GET',
        '/exercises/with-metadata'
      );
      this.cacheTimestamp = now;
    }

    const total = this.exerciseCache.length;
    const items = this.exerciseCache.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      items,
      total,
      limit,
      offset,
      hasMore,
    };
  }

  /**
   * Get a single exercise by slug (admin only).
   * Returns the draft version of the exercise.
   */
  async getExercise(slug: string): Promise<Exercise> {
    return this.request<Exercise>('GET', `/exercises/by-slug/${slug}`);
  }

  /**
   * Create a new exercise (admin only).
   */
  async createExercise(exercise: Exercise): Promise<Exercise> {
    const result = await this.request<Exercise>('POST', '/exercises', exercise);
    this.clearCache();
    return result;
  }

  /**
   * Update an existing exercise (admin only).
   */
  async updateExercise(
    exerciseId: string,
    exercise: Partial<Exercise>
  ): Promise<Exercise> {
    const result = await this.request<Exercise>(
      'PUT',
      `/exercises/${exerciseId}`,
      exercise
    );
    this.clearCache();
    return result;
  }

  /**
   * Delete an exercise (admin only).
   */
  async deleteExercise(slug: string): Promise<void> {
    await this.request<void>('DELETE', `/exercises/${slug}`);
    this.clearCache();
  }

  /**
   * Publish an exercise (admin only).
   */
  async publishExercise(slug: string): Promise<void> {
    await this.request<void>('POST', `/exercises/${slug}/publish`);
    this.clearCache();
  }

  /**
   * Unpublish an exercise (admin only).
   */
  async unpublishExercise(slug: string): Promise<void> {
    await this.request<void>('POST', `/exercises/${slug}/unpublish`);
    this.clearCache();
  }

  /**
   * Restore an exercise from published version (admin only).
   */
  async restoreExercise(slug: string): Promise<void> {
    await this.request<void>('POST', `/exercises/${slug}/restore`);
    this.clearCache();
  }

  // =========================================================================
  // Exercise endpoints - Published (for subscribers)
  // =========================================================================

  /**
   * Get all published exercises.
   */
  async getPublishedExercises(): Promise<Exercise[]> {
    return this.request<Exercise[]>('GET', '/exercises/published');
  }

  /**
   * Get a single published exercise by slug.
   */
  async getPublishedExercise(slug: string): Promise<Exercise> {
    return this.request<Exercise>('GET', `/exercises/published/${slug}`);
  }

  // =========================================================================
  // Conversation endpoints
  // =========================================================================

  /**
   * Start a new conversation for an exercise.
   */
  async startConversation(exerciseSlug: string): Promise<Conversation> {
    return this.request<Conversation>('POST', '/conversations', {
      exerciseSlug,
    });
  }

  /**
   * Get an existing active conversation or start a new one.
   * This is the primary method for conversation resumption.
   *
   * @param exerciseSlug - The exercise slug to get/start conversation for
   * @param query - Optional query params for starter selection (e.g., { difficulty: 'hard' })
   * @returns The conversation with isResumed flag indicating if it's an existing conversation
   */
  async getOrStartConversation(
    exerciseSlug: string,
    query?: Record<string, string>
  ): Promise<Conversation & { isResumed: boolean }> {
    return this.request<Conversation & { isResumed: boolean }>(
      'POST',
      '/conversations/get-or-start',
      { exerciseSlug, query }
    );
  }

  /**
   * Get a conversation by ID.
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    return this.request<Conversation>('GET', `/conversations/${conversationId}`);
  }

  /**
   * Get all conversations for the current user.
   */
  async getMyConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('GET', '/conversations');
  }

  // =========================================================================
  // Stats and metadata endpoints
  // =========================================================================

  /**
   * Get exercise statistics (admin only).
   */
  async getExerciseStats(): Promise<ExerciseStats> {
    return this.request<ExerciseStats>('GET', '/stats');
  }

  /**
   * Get available AI models.
   */
  async getAvailableModels(): Promise<string[]> {
    return this.request<string[]>('GET', '/models');
  }
}

/**
 * Create a new DownPat API client instance.
 *
 * @example
 * ```typescript
 * // With sync token getter
 * const client = createDownpatClient({
 *   getToken: () => localStorage.getItem('token'),
 * });
 *
 * // With async token getter
 * const client = createDownpatClient({
 *   getToken: async () => {
 *     const session = await getSession();
 *     return session?.accessToken ?? null;
 *   },
 * });
 *
 * const exercises = await client.getPublishedExercises();
 * ```
 */
export function createDownpatClient(config: DownpatClientConfig): DownpatClient {
  return new DownpatClient(config);
}
