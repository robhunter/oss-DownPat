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
  _id: string;
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
  // Use Record to allow storing partial/legacy data for testing
  let mockDocs: Map<string, Record<string, unknown>>;

  beforeEach(() => {
    mockDocs = new Map();

    const createMockDocRef = (id: string): MockDocRef => ({
      _id: id,
      get: vi.fn(async () => {
        const data = mockDocs.get(id);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      }),
      set: vi.fn(async (data: unknown, options?: { merge: boolean }) => {
        const newData = data as Record<string, unknown>;

        if (options?.merge) {
          const existing = mockDocs.get(id) || { userId: id, activeConversations: {} };
          // set with merge: true does shallow merge of top-level fields
          // It does NOT support dot notation keys for deep merging
          const merged = { ...existing };

          for (const [key, value] of Object.entries(newData)) {
            merged[key] = value;
          }
          mockDocs.set(id, merged);
        } else {
          // Overwrite completely
          mockDocs.set(id, data as Record<string, unknown>);
        }
      }),
      update: vi.fn(async (data: unknown) => {
        const existing = mockDocs.get(id);
        if (!existing) {
          // Simulate Firestore NOT_FOUND error (code 5)
          const error = new Error('NOT_FOUND: Document does not exist') as Error & { code: number };
          error.code = 5;
          throw error;
        }

        const updates = data as Record<string, unknown>;
        for (const [key, value] of Object.entries(updates)) {
          if (key.startsWith('activeConversations.')) {
            // Strict behavior: update with dot notation on missing parent field should fail
            // This matches conservative Firestore behavior assumption
            if (!existing.activeConversations) {
              const error = new Error('NOT_FOUND: activeConversations field does not exist') as Error & { code: number };
              error.code = 5;
              throw error;
            }
            const exerciseId = key.replace('activeConversations.', '');
            const activeConvs = existing.activeConversations as Record<string, string>;
            // Check for FieldValue.delete()
            const valueStr = String(value?.constructor?.name || '');
            if (value === null || valueStr.includes('Delete') || valueStr.includes('Transform') || (value as any)?._methodName === 'deleteField') {
              delete activeConvs[exerciseId];
            } else {
              activeConvs[exerciseId] = value as string;
            }
          } else if (key === 'activeConversations') {
             existing.activeConversations = value as Record<string, string>;
          }
        }
      }),
    });

    mockDb = {
      collection: vi.fn((name: string) => ({
        doc: vi.fn((id: string) => createMockDocRef(id)),
      })),
      runTransaction: vi.fn(async (updateFunction) => {
        const transaction = {
          get: async (ref: any) => ref.get(),
          set: (ref: any, data: any, options: any) => ref.set(data, options),
          update: (ref: any, data: any) => ref.update(data),
          delete: (ref: any) => ref.delete(), // Not used but good to have
        };
        return updateFunction(transaction);
      }),
    } as unknown as MockFirestore;

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

    it('should sanitize legacy data missing activeConversations field', async () => {
      // Simulate legacy data without activeConversations
      mockDocs.set('legacy-user', {
        userId: 'legacy-user',
        // Note: activeConversations is intentionally missing
      });

      const state = await storage.getOrCreateUserState('legacy-user');

      // Should not crash, should return sanitized state with empty activeConversations
      expect(state.userId).toBe('legacy-user');
      expect(state.activeConversations).toEqual({});
    });

    it('should sanitize data with null activeConversations', async () => {
      // Simulate corrupted data with null activeConversations
      mockDocs.set('corrupted-user', {
        userId: 'corrupted-user',
        activeConversations: null,
      });

      const state = await storage.getOrCreateUserState('corrupted-user');

      // Should not crash, should return sanitized state with empty activeConversations
      expect(state.userId).toBe('corrupted-user');
      expect(state.activeConversations).toEqual({});
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

    it('should handle legacy user missing activeConversations field', async () => {
      // Simulate legacy data without activeConversations
      mockDocs.set('legacy-user', {
        userId: 'legacy-user',
        // Note: activeConversations is intentionally missing
      });

      // Should not crash - should use set() instead of update()
      await storage.setActiveConversation('legacy-user', 'exercise-1', 'conv-1');

      const state = mockDocs.get('legacy-user');
      expect((state?.activeConversations as Record<string, string>)?.['exercise-1']).toBe('conv-1');
    });

    it('should handle legacy user with null activeConversations', async () => {
      // Simulate corrupted data with null activeConversations
      mockDocs.set('corrupted-user', {
        userId: 'corrupted-user',
        activeConversations: null,
      });

      // Should not crash - should use set() instead of update()
      await storage.setActiveConversation('corrupted-user', 'exercise-1', 'conv-1');

      const state = mockDocs.get('corrupted-user');
      expect((state?.activeConversations as Record<string, string>)?.['exercise-1']).toBe('conv-1');
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
      expect((state?.activeConversations as Record<string, string>)?.['exercise-1']).toBeUndefined();
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
      expect((state?.activeConversations as Record<string, string>)['exercise-1']).toBeUndefined();
      expect((state?.activeConversations as Record<string, string>)['exercise-2']).toBe('conv-2');
    });

    it('should handle non-existent user gracefully', async () => {
      // User document doesn't exist - should not throw
      await expect(
        storage.clearActiveConversation('non-existent-user', 'exercise-1')
      ).resolves.not.toThrow();
    });
  });
});
