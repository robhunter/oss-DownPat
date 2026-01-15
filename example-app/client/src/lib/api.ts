import type { Exercise, Conversation, User, ExerciseMetadata } from '@downpat/core';

// =============================================================================
// MOVE TO: @downpat/react
//
// This ENTIRE FILE should be provided by DownPat. The API client is DownPat-specific
// and every integrator will need these exact same methods. Integrators should only
// need to:
//
//   import { createDownpatClient } from '@downpat/react';
//   const api = createDownpatClient({
//     baseUrl: '/api/downpat',
//     getToken: () => myAuthToken,
//   });
//
// The @downpat/react package should export:
// - DownpatClient class with all exercise/conversation methods
// - React hooks like useExercises(), usePublishedExercises(), etc.
// - Types like ExerciseWithMetadata
// - Route builder (createDownpatRoutes)
// =============================================================================

export interface ExerciseWithMetadata {
  exercise: Exercise;
  metadata: ExerciseMetadata;
}

/**
 * KEEP IN: example-app (or app's responsibility)
 * LoginResponse type may vary per app's auth implementation.
 * However, the User type from @downpat/core is standard.
 */
export interface LoginResponse {
  token: string;
  user: User;
}

/**
 * MOVE TO: @downpat/react
 *
 * This entire class is DownPat-specific boilerplate that every app will need.
 * Methods like getExercises, createExercise, publishExercise are all tied to
 * DownPat's API routes and should be provided by the library.
 */
class DownpatAPI {
  private getToken: () => string | null;

  constructor(getToken: () => string | null) {
    this.getToken = getToken;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const res = await fetch(`/api/downpat${path}`, {
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

  /**
   * KEEP IN: example-app
   * The login method is app-specific. Apps will have their own auth flows
   * (Firebase Auth, Auth0, custom, etc.). This should NOT be in DownPat.
   */
  // Auth
  async login(email: string): Promise<LoginResponse> {
    return this.fetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // =========================================================================
  // ALL METHODS BELOW should be in @downpat/client
  // These directly map to DownPat's API routes and are not app-specific.
  // =========================================================================

  // Exercises - Admin
  async getExercises(): Promise<Exercise[]> {
    return this.fetch<Exercise[]>('/exercises');
  }

  async getExercisesWithMetadata(): Promise<ExerciseWithMetadata[]> {
    return this.fetch<ExerciseWithMetadata[]>('/exercises/with-metadata');
  }

  async getExercise(slug: string): Promise<Exercise> {
    return this.fetch<Exercise>(`/exercises/by-slug/${slug}`);
  }

  async createExercise(exercise: Exercise): Promise<Exercise> {
    return this.fetch<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(exercise),
    });
  }

  async updateExercise(exerciseId: string, exercise: Exercise): Promise<void> {
    await this.fetch(`/exercises/${exerciseId}`, {
      method: 'PUT',
      body: JSON.stringify(exercise),
    });
  }

  async deleteExercise(slug: string): Promise<void> {
    await this.fetch(`/exercises/${slug}`, { method: 'DELETE' });
  }

  async publishExercise(slug: string): Promise<void> {
    await this.fetch(`/exercises/${slug}/publish`, { method: 'POST' });
  }

  async unpublishExercise(slug: string): Promise<void> {
    await this.fetch(`/exercises/${slug}/unpublish`, { method: 'POST' });
  }

  async restoreExercise(slug: string): Promise<void> {
    await this.fetch(`/exercises/${slug}/restore`, { method: 'POST' });
  }

  // Exercises - Published (for subscribers)
  async getPublishedExercises(): Promise<Exercise[]> {
    return this.fetch<Exercise[]>('/exercises/published');
  }

  async getPublishedExercise(slug: string): Promise<Exercise> {
    return this.fetch<Exercise>(`/exercises/published/${slug}`);
  }

  // Conversations
  async startConversation(exerciseSlug: string): Promise<Conversation> {
    return this.fetch<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ exerciseSlug }),
    });
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.fetch<Conversation>(`/conversations/${conversationId}`);
  }

  async getMyConversations(): Promise<Conversation[]> {
    return this.fetch<Conversation[]>('/conversations');
  }
}

/**
 * MOVE TO: @downpat/react
 * The singleton pattern and initialization should be in the package.
 * Apps should be able to:
 *
 *   import { initializeDownpatClient, useDownpatClient } from '@downpat/react';
 *
 *   // In app initialization:
 *   initializeDownpatClient({ getToken: () => myToken });
 *
 *   // In components:
 *   const client = useDownpatClient(); // hook that returns the client
 *   const exercises = await client.getPublishedExercises();
 */
// Singleton instance - will be initialized with token getter
let apiInstance: DownpatAPI | null = null;

export function initializeAPI(getToken: () => string | null): DownpatAPI {
  apiInstance = new DownpatAPI(getToken);
  return apiInstance;
}

export function getAPI(): DownpatAPI {
  if (!apiInstance) {
    throw new Error('API not initialized. Call initializeAPI first.');
  }
  return apiInstance;
}

export { DownpatAPI };
