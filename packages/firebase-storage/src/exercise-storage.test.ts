import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseExerciseStorage } from './exercise-storage.js';
import type { Exercise, ExerciseMetadata } from '@downpat/core';
import { MessageType } from '@downpat/core';

// Mock Firestore types
type MockDocSnapshot = {
  exists: boolean;
  data: () => unknown;
};

type MockDocRef = {
  get: () => Promise<MockDocSnapshot>;
  set: (data: unknown, options?: { merge: boolean }) => Promise<void>;
  update: (data: unknown) => Promise<void>;
  create: (data: unknown) => Promise<void>;
  delete: () => Promise<void>;
};

type MockTransaction = {
  get: (ref: MockDocRef) => Promise<MockDocSnapshot>;
  create: (ref: MockDocRef, data: unknown) => void;
  set: (ref: MockDocRef, data: unknown) => void;
  update: (ref: MockDocRef, data: unknown) => void;
  delete: (ref: MockDocRef) => void;
};

type MockCollection = {
  doc: (id: string) => MockDocRef;
  get: () => Promise<{ docs: Array<{ data: () => unknown }> }>;
};

type MockFirestore = {
  collection: (name: string) => MockCollection;
  runTransaction: (fn: (txn: MockTransaction) => Promise<void>) => Promise<void>;
  getAll: (...refs: MockDocRef[]) => Promise<MockDocSnapshot[]>;
};

const testExercise: Exercise = {
  exerciseId: 'ex-123',
  exerciseName: 'Test Exercise',
  slug: 'test-exercise',
  maxUserMessages: 10,
  model: 'gpt-4',
  talkToCoachEnabled: false,
  continuationTasks: [
    {
      taskId: 'task-1',
      name: 'Conversation',
      responseType: MessageType.CONVERSATION,
      role: 'Assistant',
      prompt: 'You are a helpful assistant.',
      enabled: true,
    },
  ],
  completionTasks: [],
  welcomeMessage: 'Welcome!',
  guidelines: 'Be helpful.',
  starters: ['Hello'],
};

describe('FirebaseExerciseStorage', () => {
  let mockDb: MockFirestore;
  let storage: FirebaseExerciseStorage;
  let mockDocs: Map<string, unknown>;
  let mockMetadata: Map<string, unknown>;

  beforeEach(() => {
    mockDocs = new Map();
    mockMetadata = new Map();

    const createMockDocRef = (collection: string, id: string): MockDocRef => ({
      get: async () => {
        const store = collection === 'exerciseMetadata' ? mockMetadata : mockDocs;
        const data = store.get(id);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      set: async (data: unknown, _options?: { merge: boolean }) => {
        const store = collection === 'exerciseMetadata' ? mockMetadata : mockDocs;
        store.set(id, data);
      },
      update: async (data: unknown) => {
        const store = collection === 'exerciseMetadata' ? mockMetadata : mockDocs;
        const existing = store.get(id) as Record<string, unknown>;
        store.set(id, { ...existing, ...data });
      },
      create: async (data: unknown) => {
        const store = collection === 'exerciseMetadata' ? mockMetadata : mockDocs;
        if (store.has(id)) {
          throw new Error('Document already exists');
        }
        store.set(id, data);
      },
      delete: async () => {
        const store = collection === 'exerciseMetadata' ? mockMetadata : mockDocs;
        store.delete(id);
      },
    });

    mockDb = {
      collection: (name: string) => ({
        doc: (id: string) => createMockDocRef(name, id),
        get: async () => {
          const store = name === 'exerciseMetadata' ? mockMetadata : mockDocs;
          return {
            docs: Array.from(store.entries()).map(([_id, data]) => ({
              data: () => data,
            })),
          };
        },
      }),
      runTransaction: async (fn: (txn: MockTransaction) => Promise<void>) => {
        const txn: MockTransaction = {
          get: async (ref: MockDocRef) => ref.get(),
          create: (ref: MockDocRef, data: unknown) => {
            ref.create(data);
          },
          set: (ref: MockDocRef, data: unknown) => {
            ref.set(data, { merge: false });
          },
          update: (ref: MockDocRef, data: unknown) => {
            ref.update(data);
          },
          delete: (ref: MockDocRef) => {
            ref.delete();
          },
        };
        await fn(txn);
      },
      getAll: async (...refs: MockDocRef[]) => {
        return Promise.all(refs.map((ref) => ref.get()));
      },
    };

    storage = new FirebaseExerciseStorage(mockDb as unknown as import('firebase-admin/firestore').Firestore);
  });

  describe('getExercise', () => {
    it('returns exercise when found', async () => {
      mockDocs.set('ex-123', testExercise);

      const result = await storage.getExercise('ex-123');

      expect(result).toEqual(testExercise);
    });

    it('returns null when not found', async () => {
      const result = await storage.getExercise('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getExerciseBySlug', () => {
    it('returns draft exercise by default', async () => {
      mockDocs.set('ex-123', testExercise);
      mockMetadata.set('test-exercise', { draft: 'ex-123' });

      const result = await storage.getExerciseBySlug('test-exercise');

      expect(result).toEqual(testExercise);
    });

    it('returns published exercise when publishedOnly is true', async () => {
      const publishedExercise = { ...testExercise, exerciseId: 'ex-123-published' };
      mockDocs.set('ex-123-published', publishedExercise);
      mockMetadata.set('test-exercise', { draft: 'ex-123', published: 'ex-123-published' });

      const result = await storage.getExerciseBySlug('test-exercise', true);

      expect(result).toEqual(publishedExercise);
    });

    it('returns null when slug not found', async () => {
      const result = await storage.getExerciseBySlug('non-existent');

      expect(result).toBeNull();
    });

    it('returns null when publishedOnly is true but no published version', async () => {
      mockMetadata.set('test-exercise', { draft: 'ex-123' });

      const result = await storage.getExerciseBySlug('test-exercise', true);

      expect(result).toBeNull();
    });
  });

  describe('createExercise', () => {
    it('creates exercise and metadata', async () => {
      await storage.createExercise(testExercise);

      expect(mockDocs.has('ex-123')).toBe(true);
      expect(mockMetadata.has('test-exercise')).toBe(true);
      expect((mockMetadata.get('test-exercise') as ExerciseMetadata).draft).toBe('ex-123');
    });

    it('throws when slug already exists', async () => {
      mockMetadata.set('test-exercise', { draft: 'existing-id' });

      await expect(storage.createExercise(testExercise)).rejects.toThrow(
        'Exercise with slug "test-exercise" already exists'
      );
    });
  });

  describe('updateExercise', () => {
    it('updates exercise with merge', async () => {
      mockDocs.set('ex-123', testExercise);

      const updated = { ...testExercise, exerciseName: 'Updated Name' };
      await storage.updateExercise(updated);

      const result = mockDocs.get('ex-123') as Exercise;
      expect(result.exerciseName).toBe('Updated Name');
    });
  });

  describe('publishExercise', () => {
    it('creates published version from draft', async () => {
      mockDocs.set('ex-123', testExercise);
      mockMetadata.set('test-exercise', { draft: 'ex-123' });

      await storage.publishExercise('test-exercise');

      expect(mockDocs.has('ex-123-published')).toBe(true);
      const metadata = mockMetadata.get('test-exercise') as ExerciseMetadata;
      expect(metadata.published).toBe('ex-123-published');
    });

    it('throws when exercise not found', async () => {
      await expect(storage.publishExercise('non-existent')).rejects.toThrow(
        'Exercise not found'
      );
    });
  });

  describe('unpublishExercise', () => {
    it('removes published version', async () => {
      mockDocs.set('ex-123', testExercise);
      mockDocs.set('ex-123-published', { ...testExercise, exerciseId: 'ex-123-published' });
      mockMetadata.set('test-exercise', { draft: 'ex-123', published: 'ex-123-published' });

      await storage.unpublishExercise('test-exercise');

      expect(mockDocs.has('ex-123-published')).toBe(false);
      expect(mockDocs.has('ex-123')).toBe(true);
      const metadata = mockMetadata.get('test-exercise') as ExerciseMetadata;
      expect(metadata.published).toBeNull();
    });

    it('throws when not published', async () => {
      mockMetadata.set('test-exercise', { draft: 'ex-123' });

      await expect(storage.unpublishExercise('test-exercise')).rejects.toThrow(
        'Exercise is not published'
      );
    });
  });

  describe('restoreFromPublished', () => {
    it('copies published to draft', async () => {
      const publishedExercise = {
        ...testExercise,
        exerciseId: 'ex-123-published',
        exerciseName: 'Published Name',
      };
      mockDocs.set('ex-123', testExercise);
      mockDocs.set('ex-123-published', publishedExercise);
      mockMetadata.set('test-exercise', { draft: 'ex-123', published: 'ex-123-published' });

      await storage.restoreFromPublished('test-exercise');

      const draft = mockDocs.get('ex-123') as Exercise;
      expect(draft.exerciseName).toBe('Published Name');
      expect(draft.exerciseId).toBe('ex-123'); // ID should be the draft ID
    });

    it('throws when no published version', async () => {
      mockMetadata.set('test-exercise', { draft: 'ex-123' });

      await expect(storage.restoreFromPublished('test-exercise')).rejects.toThrow(
        'No published version to restore from'
      );
    });
  });

  describe('getExercises', () => {
    it('returns all draft exercises', async () => {
      mockDocs.set('ex-1', { ...testExercise, exerciseId: 'ex-1', slug: 'ex-1' });
      mockDocs.set('ex-2', { ...testExercise, exerciseId: 'ex-2', slug: 'ex-2' });
      mockMetadata.set('ex-1', { draft: 'ex-1' });
      mockMetadata.set('ex-2', { draft: 'ex-2' });

      const result = await storage.getExercises();

      expect(result).toHaveLength(2);
    });

    it('returns empty array when no exercises', async () => {
      const result = await storage.getExercises();

      expect(result).toEqual([]);
    });
  });

  describe('deleteExercise', () => {
    it('deletes draft, published, and metadata', async () => {
      mockDocs.set('ex-123', testExercise);
      mockDocs.set('ex-123-published', { ...testExercise, exerciseId: 'ex-123-published' });
      mockMetadata.set('test-exercise', { draft: 'ex-123', published: 'ex-123-published' });

      await storage.deleteExercise('test-exercise');

      expect(mockDocs.has('ex-123')).toBe(false);
      expect(mockDocs.has('ex-123-published')).toBe(false);
      expect(mockMetadata.has('test-exercise')).toBe(false);
    });

    it('throws when exercise not found', async () => {
      await expect(storage.deleteExercise('non-existent')).rejects.toThrow(
        'Exercise not found'
      );
    });
  });
});
