import type { Exercise, ExerciseMetadata, Conversation, Message } from '../types/index.js';
import type { ExerciseStorage, ConversationStorage } from '../interfaces/index.js';

/**
 * Creates in-memory storage implementations for development and testing.
 * Data is lost when the process restarts.
 *
 * @example
 * ```typescript
 * import { createInMemoryStorage } from '@downpat/core';
 *
 * const { exerciseStorage, conversationStorage } = createInMemoryStorage();
 *
 * const downpat = createDownpatRouter({
 *   exerciseStorage,
 *   conversationStorage,
 *   serverAuth: myAuthProvider,
 * });
 * ```
 */
export function createInMemoryStorage(): {
  exerciseStorage: ExerciseStorage;
  conversationStorage: ConversationStorage;
} {
  const exercises = new Map<string, Exercise>();
  const exerciseMetadata = new Map<string, ExerciseMetadata>();
  const conversations = new Map<string, Conversation>();

  const exerciseStorage: ExerciseStorage = {
    async getExercise(exerciseId: string) {
      return exercises.get(exerciseId) || null;
    },

    async getExerciseBySlug(slug: string, publishedOnly?: boolean) {
      const metadata = exerciseMetadata.get(slug);
      if (!metadata) return null;
      if (publishedOnly) {
        return metadata.published ? exercises.get(metadata.published) || null : null;
      }
      return exercises.get(metadata.draft) || null;
    },

    async getExerciseMetadata(slug: string) {
      return exerciseMetadata.get(slug) || null;
    },

    async getExercises() {
      // Only return draft exercises, not published copies
      const allExercises = Array.from(exercises.values());
      return allExercises.filter((e) =>
        e.exerciseId && !e.exerciseId.endsWith('-published')
      );
    },

    async getExercisesWithMetadata() {
      const result: Array<{ exercise: Exercise; metadata: ExerciseMetadata }> = [];
      for (const [_slug, metadata] of exerciseMetadata.entries()) {
        const exercise = exercises.get(metadata.draft);
        if (exercise) {
          result.push({ exercise, metadata });
        }
      }
      return result;
    },

    async getPublishedExercises() {
      const publishedExercises: Exercise[] = [];
      for (const [_slug, metadata] of exerciseMetadata.entries()) {
        if (metadata.published) {
          const exercise = exercises.get(metadata.published);
          if (exercise) {
            publishedExercises.push(exercise);
          }
        }
      }
      return publishedExercises;
    },

    async createExercise(exercise: Exercise) {
      exercises.set(exercise.exerciseId, exercise);
      exerciseMetadata.set(exercise.slug, {
        draft: exercise.exerciseId,
      });
    },

    async updateExercise(exercise: Exercise) {
      exercises.set(exercise.exerciseId, exercise);
    },

    async publishExercise(slug: string) {
      const metadata = exerciseMetadata.get(slug);
      if (!metadata) throw new Error('Exercise not found');
      const draft = exercises.get(metadata.draft);
      if (!draft) throw new Error('Draft exercise not found');
      const publishedId = `${metadata.draft}-published`;
      // Set exerciseId to publishedId so filtering works correctly
      exercises.set(publishedId, { ...draft, exerciseId: publishedId });
      exerciseMetadata.set(slug, { ...metadata, published: publishedId });
    },

    async unpublishExercise(slug: string) {
      const metadata = exerciseMetadata.get(slug);
      if (!metadata?.published) throw new Error('Exercise not published');
      exercises.delete(metadata.published);
      exerciseMetadata.set(slug, { draft: metadata.draft });
    },

    async restoreFromPublished(slug: string) {
      const metadata = exerciseMetadata.get(slug);
      if (!metadata?.published) throw new Error('No published version');
      const published = exercises.get(metadata.published);
      if (!published) throw new Error('Published exercise not found');
      exercises.set(metadata.draft, { ...published, exerciseId: metadata.draft });
    },

    async deleteExercise(slug: string) {
      const metadata = exerciseMetadata.get(slug);
      if (metadata) {
        exercises.delete(metadata.draft);
        if (metadata.published) exercises.delete(metadata.published);
        exerciseMetadata.delete(slug);
      }
    },
  };

  const conversationStorage: ConversationStorage = {
    async getConversation(conversationId: string) {
      return conversations.get(conversationId) || null;
    },

    async getConversationsByUser(userId: string) {
      return Array.from(conversations.values()).filter((c) => c.userId === userId);
    },

    async getConversationsByExercise(exerciseId: string) {
      return Array.from(conversations.values()).filter((c) => c.exerciseId === exerciseId);
    },

    async createConversation(conversation: Conversation) {
      conversations.set(conversation.conversationId, conversation);
    },

    async updateConversation(conversationId: string, updates: Partial<Conversation>) {
      const conversation = conversations.get(conversationId);
      if (conversation) {
        Object.assign(conversation, updates);
      }
    },

    async addMessage(conversationId: string, message: Message) {
      const conversation = conversations.get(conversationId);
      if (conversation) {
        conversation.messages.push(message);
      }
    },

    async deleteConversation(conversationId: string) {
      conversations.delete(conversationId);
    },
  };

  return { exerciseStorage, conversationStorage };
}
