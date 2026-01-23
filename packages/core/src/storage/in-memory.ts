import type { Exercise, ExerciseMetadata, Conversation, ConversationMetadata, Message } from '../types/index.js';
import type { ExerciseStorage, ConversationStorage, UserStateStorage } from '../interfaces/index.js';
import { InMemoryUserStateStorage } from './in-memory-user-state.js';

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
  userStateStorage: UserStateStorage;
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
      // Return draft if exists, otherwise published (for editing published-only exercises)
      if (metadata.draft) {
        return exercises.get(metadata.draft) || null;
      }
      return metadata.published ? exercises.get(metadata.published) || null : null;
    },

    async getExerciseMetadata(slug: string) {
      return exerciseMetadata.get(slug) || null;
    },

    async getExercises() {
      // Return the "editable" version of each exercise (draft if exists, otherwise published)
      const result: Exercise[] = [];
      for (const metadata of exerciseMetadata.values()) {
        if (metadata.draft) {
          const draft = exercises.get(metadata.draft);
          if (draft) result.push(draft);
        } else if (metadata.published) {
          const published = exercises.get(metadata.published);
          if (published) result.push(published);
        }
      }
      return result;
    },

    async getExercisesWithMetadata() {
      const result: Array<{ exercise: Exercise; metadata: ExerciseMetadata }> = [];
      for (const metadata of exerciseMetadata.values()) {
        // Return draft if exists, otherwise published
        const exerciseId = metadata.draft || metadata.published;
        if (exerciseId) {
          const exercise = exercises.get(exerciseId);
          if (exercise) {
            result.push({ exercise, metadata });
          }
        }
      }
      return result;
    },

    async getPublishedExercises() {
      const publishedExercises: Exercise[] = [];
      for (const metadata of exerciseMetadata.values()) {
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
      exercises.set(exercise.exerciseId, { ...exercise, status: 'draft' });
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
      if (!metadata.draft) throw new Error('No draft to publish');
      const draft = exercises.get(metadata.draft);
      if (!draft) throw new Error('Draft exercise not found');

      // Create or update published version with status and timestamp
      const publishedId = metadata.published || `${metadata.draft}-published`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _stripped, ...draftData } = draft;
      exercises.set(publishedId, {
        ...draftData,
        exerciseId: publishedId,
        status: 'published',
        publishedAt: new Date().toISOString(),
      });

      // Delete draft and update metadata
      exercises.delete(metadata.draft);
      exerciseMetadata.set(slug, { published: publishedId });
    },

    async unpublishExercise(slug: string) {
      const metadata = exerciseMetadata.get(slug);
      if (!metadata?.published) throw new Error('Exercise not published');
      const published = exercises.get(metadata.published);
      if (!published) throw new Error('Published exercise not found');

      // Convert published to draft - strip publishedAt since drafts shouldn't have it
      const draftId = metadata.published.replace('-published', '');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _stripped, ...publishedData } = published;
      exercises.set(draftId, { ...publishedData, exerciseId: draftId, status: 'draft' });

      // Delete published and update metadata
      exercises.delete(metadata.published);
      exerciseMetadata.set(slug, { draft: draftId });
    },

    async restoreFromPublished(slug: string) {
      const metadata = exerciseMetadata.get(slug);
      if (!metadata?.published) throw new Error('No published version');
      if (!metadata.draft) throw new Error('No draft to restore from');

      // Simply delete the draft - published remains
      exercises.delete(metadata.draft);
      exerciseMetadata.set(slug, { published: metadata.published });
    },

    async createDraftFromPublished(slug: string) {
      const metadata = exerciseMetadata.get(slug);
      if (!metadata?.published) throw new Error('No published version');
      if (metadata.draft) throw new Error('Draft already exists');
      const published = exercises.get(metadata.published);
      if (!published) throw new Error('Published exercise not found');

      // Create draft from published - strip publishedAt since drafts shouldn't have it
      const draftId = metadata.published.replace('-published', '');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publishedAt: _stripped, ...publishedData } = published;
      exercises.set(draftId, { ...publishedData, exerciseId: draftId, status: 'draft' });
      exerciseMetadata.set(slug, { ...metadata, draft: draftId });
    },

    async deleteExercise(slug: string) {
      const metadata = exerciseMetadata.get(slug);
      if (metadata) {
        if (metadata.draft) exercises.delete(metadata.draft);
        if (metadata.published) exercises.delete(metadata.published);
        exerciseMetadata.delete(slug);
      }
    },
  };

  const conversationStorage: ConversationStorage = {
    async getConversationMetadata(conversationId: string): Promise<ConversationMetadata | null> {
      const conversation = conversations.get(conversationId);
      if (!conversation) return null;
      // Return metadata without messages
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { messages: _, ...metadata } = conversation;
      return metadata;
    },

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

    async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<Conversation> {
      const conversation = conversations.get(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      Object.assign(conversation, updates);
      return conversation;
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

  const userStateStorage = new InMemoryUserStateStorage();

  return { exerciseStorage, conversationStorage, userStateStorage };
}
