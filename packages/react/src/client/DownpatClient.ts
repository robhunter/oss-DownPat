import type { Exercise, Conversation, ExerciseMetadata } from '@downpat/core';

/**
 * Configuration for the DownPat API client
 */
export interface DownpatClientConfig {
  /** Base URL for the DownPat API (default: '/api/downpat') */
  baseUrl?: string;
  /** Function to get the current auth token */
  getToken: () => string | null;
}

/**
 * Exercise with its metadata (draft/published status, timestamps)
 */
export interface ExerciseWithMetadata {
  exercise: Exercise;
  metadata: ExerciseMetadata;
}

/**
 * API client for communicating with the DownPat server.
 *
 * This client handles all HTTP requests to the DownPat API endpoints.
 * Authentication is handled via a token getter function provided at construction.
 */
export class DownpatClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(config: DownpatClientConfig) {
    this.baseUrl = config.baseUrl ?? '/api/downpat';
    this.getToken = config.getToken;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // =========================================================================
  // Exercise endpoints - Admin
  // =========================================================================

  /** Get all exercises (admin only) */
  async getExercises(): Promise<Exercise[]> {
    return this.fetch<Exercise[]>('/exercises');
  }

  /** Get all exercises with metadata (admin only) */
  async getExercisesWithMetadata(): Promise<ExerciseWithMetadata[]> {
    return this.fetch<ExerciseWithMetadata[]>('/exercises/with-metadata');
  }

  /** Get a single exercise by slug (admin only) */
  async getExercise(slug: string): Promise<Exercise> {
    return this.fetch<Exercise>(`/exercises/by-slug/${slug}`);
  }

  /** Create a new exercise (admin only) */
  async createExercise(exercise: Exercise): Promise<Exercise> {
    return this.fetch<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(exercise),
    });
  }

  /** Update an existing exercise (admin only) */
  async updateExercise(exerciseId: string, exercise: Exercise): Promise<void> {
    await this.fetch(`/exercises/${exerciseId}`, {
      method: 'PUT',
      body: JSON.stringify(exercise),
    });
  }

  /** Delete an exercise (admin only) */
  async deleteExercise(slug: string): Promise<void> {
    await this.fetch(`/exercises/${slug}`, { method: 'DELETE' });
  }

  /** Publish an exercise (admin only) */
  async publishExercise(slug: string): Promise<void> {
    await this.fetch(`/exercises/${slug}/publish`, { method: 'POST' });
  }

  /** Unpublish an exercise (admin only) */
  async unpublishExercise(slug: string): Promise<void> {
    await this.fetch(`/exercises/${slug}/unpublish`, { method: 'POST' });
  }

  /** Restore an exercise from published version (admin only) */
  async restoreExercise(slug: string): Promise<void> {
    await this.fetch(`/exercises/${slug}/restore`, { method: 'POST' });
  }

  // =========================================================================
  // Exercise endpoints - Published (for subscribers)
  // =========================================================================

  /** Get all published exercises */
  async getPublishedExercises(): Promise<Exercise[]> {
    return this.fetch<Exercise[]>('/exercises/published');
  }

  /** Get a single published exercise by slug */
  async getPublishedExercise(slug: string): Promise<Exercise> {
    return this.fetch<Exercise>(`/exercises/published/${slug}`);
  }

  // =========================================================================
  // Conversation endpoints
  // =========================================================================

  /** Start a new conversation for an exercise */
  async startConversation(exerciseSlug: string): Promise<Conversation> {
    return this.fetch<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ exerciseSlug }),
    });
  }

  /** Get a conversation by ID */
  async getConversation(conversationId: string): Promise<Conversation> {
    return this.fetch<Conversation>(`/conversations/${conversationId}`);
  }

  /** Get all conversations for the current user */
  async getMyConversations(): Promise<Conversation[]> {
    return this.fetch<Conversation[]>('/conversations');
  }

  // =========================================================================
  // Stats and metadata endpoints
  // =========================================================================

  /** Get exercise statistics (admin only) */
  async getExerciseStats(): Promise<{ total: number; draftCount: number; publishedCount: number }> {
    return this.fetch('/exercises/stats');
  }

  /** Get available AI models */
  async getAvailableModels(): Promise<string[]> {
    return this.fetch('/models');
  }
}

/**
 * Create a new DownPat API client instance.
 *
 * @example
 * ```typescript
 * const client = createDownpatClient({
 *   getToken: () => localStorage.getItem('token'),
 * });
 *
 * const exercises = await client.getPublishedExercises();
 * ```
 */
export function createDownpatClient(config: DownpatClientConfig): DownpatClient {
  return new DownpatClient(config);
}
