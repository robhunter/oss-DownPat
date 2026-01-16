import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseUserStateStorage } from './user-state-storage.js';
import type { UserState } from '@downpat/core';

// Mock Firestore types
type MockDocSnapshot = {
  exists: boolean;
  data: () => unknown;
};

type MockDocRef = {
  get: () => Promise<MockDocSnapshot>;
  set: (data: unknown, options?: { merge: boolean }) => Promise<void>;
  update: (data: unknown) => Promise<void>;
};

type MockCollection = {
  doc: (id: string) => MockDocRef;
};

type MockFirestore = {
  collection: (name: string) => MockCollection;
};

describe('FirebaseUserStateStorage', () => {
  let mockDb: MockFirestore;
  let storage: FirebaseUserStateStorage;
  let mockDocs: Map<string, UserState>;

  beforeEach(() => {
    mockDocs = new Map();

    const createMockDocRef = (id: string): MockDocRef => ({
      get: vi.fn(async () => {
        const data = mockDocs.get(id);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      }),
      set: vi.fn(async (data: unknown, options?: { merge: boolean }) => {
        if (options?.merge) {
          const existing = mockDocs.get(id) || { userId: id, activeConversations: {} };
          // Handle dot notation for nested fields
          const newData = data as Record<string, unknown>;
          const merged: UserState = { ...existing };

          for (const [key, value] of Object.entries(newData)) {
            if (key.startsWith('activeConversations.')) {
              const exerciseId = key.replace('activeConversations.', '');
              merged.activeConversations[exerciseId] = value as string;
            } else if (key === 'userId') {
              merged.userId = value as string;
            } else if (key === 'activeConversations') {
              merged.activeConversations = value as Record<string, string>;
            }
          }
          mockDocs.set(id, merged);
        } else {
          mockDocs.set(id, data as UserState);
        }
      }),
      update: vi.fn(async (data: unknown) => {
        const existing = mockDocs.get(id);
        if (!existing) {
          throw new Error('Document does not exist');
        }
        // Handle FieldValue.delete() mock
        const updates = data as Record<string, unknown>;
        for (const [key, value] of Object.entries(updates)) {
          if (key.startsWith('activeConversations.')) {
            const exerciseId = key.replace('activeConversations.', '');
            // FieldValue.delete() creates a DeleteTransform object
            // Check if it's a sentinel value (has constructor name DeleteTransform or similar)
            const valueStr = String(value?.constructor?.name || '');
            if (value === null || valueStr.includes('Delete') || valueStr.includes('Transform')) {
              delete existing.activeConversations[exerciseId];
            } else {
              existing.activeConversations[exerciseId] = value as string;
            }
          }
        }
      }),
    });

    mockDb = {
      collection: vi.fn((name: string) => ({
        doc: vi.fn((id: string) => createMockDocRef(id)),
      })),
    } as MockFirestore;

    storage = new FirebaseUserStateStorage(mockDb as unknown as import('firebase-admin/firestore').Firestore);
  });

  describe('getOrCreateUserState', () => {
    it('should create new state for new user', async () => {
      const state = await storage.getOrCreateUserState('user-1');

      expect(state).toEqual({
        userId: 'user-1',
        activeConversations: {},
      });

      // Verify it was saved
      expect(mockDocs.get('user-1')).toEqual({
        userId: 'user-1',
        activeConversations: {},
      });
    });

    it('should return existing state for existing user', async () => {
      // Pre-populate with existing state
      mockDocs.set('user-1', {
        userId: 'user-1',
        activeConversations: { 'exercise-1': 'conv-1' },
      });

      const state = await storage.getOrCreateUserState('user-1');

      expect(state.userId).toBe('user-1');
      expect(state.activeConversations['exercise-1']).toBe('conv-1');
    });

    it('should use correct collection', async () => {
      await storage.getOrCreateUserState('user-1');

      expect(mockDb.collection).toHaveBeenCalledWith('userState');
    });

    it('should use custom collection name if provided', async () => {
      const customStorage = new FirebaseUserStateStorage(
        mockDb as unknown as import('firebase-admin/firestore').Firestore,
        'customCollection'
      );

      await customStorage.getOrCreateUserState('user-1');

      expect(mockDb.collection).toHaveBeenCalledWith('customCollection');
    });
  });

  describe('setActiveConversation', () => {
    it('should set active conversation using merge', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');

      const state = mockDocs.get('user-1');
      expect(state?.activeConversations['exercise-1']).toBe('conv-1');
    });

    it('should overwrite existing active conversation', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-2');

      const state = mockDocs.get('user-1');
      expect(state?.activeConversations['exercise-1']).toBe('conv-2');
    });

    it('should handle multiple exercises per user', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');
      await storage.setActiveConversation('user-1', 'exercise-2', 'conv-2');

      const state = mockDocs.get('user-1');
      expect(state?.activeConversations['exercise-1']).toBe('conv-1');
      expect(state?.activeConversations['exercise-2']).toBe('conv-2');
    });
  });

  describe('getActiveConversation', () => {
    it('should return null for non-existent exercise', async () => {
      // Pre-populate user but not this exercise
      mockDocs.set('user-1', {
        userId: 'user-1',
        activeConversations: {},
      });

      const conversationId = await storage.getActiveConversation('user-1', 'non-existent');
      expect(conversationId).toBeNull();
    });

    it('should return conversation ID if set', async () => {
      mockDocs.set('user-1', {
        userId: 'user-1',
        activeConversations: { 'exercise-1': 'conv-123' },
      });

      const conversationId = await storage.getActiveConversation('user-1', 'exercise-1');
      expect(conversationId).toBe('conv-123');
    });

    it('should create user state if not exists and return null', async () => {
      const conversationId = await storage.getActiveConversation('new-user', 'exercise-1');

      expect(conversationId).toBeNull();
      // User state should be created
      expect(mockDocs.get('new-user')).toEqual({
        userId: 'new-user',
        activeConversations: {},
      });
    });
  });

  describe('clearActiveConversation', () => {
    it('should clear active conversation', async () => {
      mockDocs.set('user-1', {
        userId: 'user-1',
        activeConversations: { 'exercise-1': 'conv-1' },
      });

      // Mock FieldValue.delete()
      const mockFieldValue = { _methodName: 'deleteField' };
      vi.doMock('firebase-admin/firestore', () => ({
        FieldValue: {
          delete: () => mockFieldValue,
        },
      }));

      await storage.clearActiveConversation('user-1', 'exercise-1');

      const state = mockDocs.get('user-1');
      expect(state?.activeConversations['exercise-1']).toBeUndefined();
    });

    it('should not affect other exercises', async () => {
      mockDocs.set('user-1', {
        userId: 'user-1',
        activeConversations: {
          'exercise-1': 'conv-1',
          'exercise-2': 'conv-2',
        },
      });

      await storage.clearActiveConversation('user-1', 'exercise-1');

      const state = mockDocs.get('user-1');
      expect(state?.activeConversations['exercise-1']).toBeUndefined();
      expect(state?.activeConversations['exercise-2']).toBe('conv-2');
    });
  });
});
