import type { Exercise, Conversation, User } from '@downpat/core';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateExerciseInput {
  name: string;
  slug: string;
  description: string;
  model: string;
  systemPrompt: string;
  task: {
    taskDescription: string;
    talkToCoachEnabled: boolean;
  };
  guidelines: string[];
  starters: string[];
}

export interface UpdateExerciseInput extends Partial<CreateExerciseInput> {
  exerciseId: string;
}

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

  // Auth
  async login(email: string): Promise<LoginResponse> {
    return this.fetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Exercises - Admin
  async getExercises(): Promise<Exercise[]> {
    return this.fetch<Exercise[]>('/exercises');
  }

  async getExercise(slug: string): Promise<Exercise> {
    return this.fetch<Exercise>(`/exercises/${slug}`);
  }

  async createExercise(exercise: CreateExerciseInput): Promise<Exercise> {
    return this.fetch<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(exercise),
    });
  }

  async updateExercise(slug: string, exercise: UpdateExerciseInput): Promise<Exercise> {
    return this.fetch<Exercise>(`/exercises/${slug}`, {
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
