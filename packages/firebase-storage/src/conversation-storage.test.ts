import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseConversationStorage } from './conversation-storage.js';
import type { Conversation, Message } from '@downpat/core';
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
  update: (ref: MockDocRef, data: unknown) => void;
};

type MockQuery = {
  orderBy: (field: string, direction?: string) => MockQuery;
  get: () => Promise<{ docs: Array<{ data: () => unknown }> }>;
};

type MockCollection = {
  doc: (id: string) => MockDocRef;
  where: (field: string, op: string, value: string) => MockQuery;
};

type MockFirestore = {
  collection: (name: string) => MockCollection;
  runTransaction: (fn: (txn: MockTransaction) => Promise<void>) => Promise<void>;
};

const testConversation: Conversation = {
  conversationId: 'conv-123',
  exerciseId: 'ex-123',
  userId: 'user-1',
  messages: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isComplete: false,
  userMessageCount: 0,
};

const testMessage: Message = {
  messageId: 'msg-1',
  type: MessageType.USER,
  role: 'Test User',
  content: 'Hello!',
  timestamp: '2024-01-01T00:01:00.000Z',
};

describe('FirebaseConversationStorage', () => {
  let mockDb: MockFirestore;
  let storage: FirebaseConversationStorage;
  let mockDocs: Map<string, unknown>;

  beforeEach(() => {
    mockDocs = new Map();

    const createMockDocRef = (id: string): MockDocRef => ({
      get: async () => {
        const data = mockDocs.get(id);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      set: async (data: unknown, _options?: { merge: boolean }) => {
        mockDocs.set(id, data);
      },
      update: async (data: unknown) => {
        const existing = mockDocs.get(id) as Record<string, unknown>;
        mockDocs.set(id, { ...existing, ...data });
      },
      create: async (data: unknown) => {
        if (mockDocs.has(id)) {
          throw new Error('Document already exists');
        }
        mockDocs.set(id, data);
      },
      delete: async () => {
        mockDocs.delete(id);
      },
    });

    mockDb = {
      collection: (_name: string) => ({
        doc: (id: string) => createMockDocRef(id),
        where: (field: string, _op: string, value: string) => ({
          orderBy: (_orderField: string, _direction?: string) => ({
            get: async () => {
              const matchingDocs = Array.from(mockDocs.values()).filter((doc) => {
                const d = doc as Record<string, unknown>;
                return d[field] === value;
              });
              return {
                docs: matchingDocs.map((data) => ({
                  data: () => data,
                })),
              };
            },
          }),
        }),
      }),
      runTransaction: async (fn: (txn: MockTransaction) => Promise<void>) => {
        const txn: MockTransaction = {
          get: async (ref: MockDocRef) => ref.get(),
          update: (ref: MockDocRef, data: unknown) => {
            ref.update(data);
          },
        };
        await fn(txn);
      },
    };

    storage = new FirebaseConversationStorage(
      mockDb as unknown as import('firebase-admin/firestore').Firestore
    );
  });

  describe('getConversation', () => {
    it('returns conversation when found', async () => {
      mockDocs.set('conv-123', testConversation);

      const result = await storage.getConversation('conv-123');

      expect(result).toEqual(testConversation);
    });

    it('returns null when not found', async () => {
      const result = await storage.getConversation('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createConversation', () => {
    it('creates conversation', async () => {
      await storage.createConversation(testConversation);

      expect(mockDocs.has('conv-123')).toBe(true);
      expect(mockDocs.get('conv-123')).toEqual(testConversation);
    });

    it('throws when conversation already exists', async () => {
      mockDocs.set('conv-123', testConversation);

      await expect(storage.createConversation(testConversation)).rejects.toThrow(
        'Document already exists'
      );
    });
  });

  describe('updateConversation', () => {
    it('updates conversation fields', async () => {
      mockDocs.set('conv-123', testConversation);

      await storage.updateConversation('conv-123', { isComplete: true });

      const updated = mockDocs.get('conv-123') as Conversation;
      expect(updated.isComplete).toBe(true);
      expect(updated.conversationId).toBe('conv-123');
    });
  });

  describe('addMessage', () => {
    it('adds message to conversation', async () => {
      mockDocs.set('conv-123', testConversation);

      await storage.addMessage('conv-123', testMessage);

      const updated = mockDocs.get('conv-123') as Conversation;
      expect(updated.messages).toHaveLength(1);
      expect(updated.messages[0]).toEqual(testMessage);
    });

    it('appends message to existing messages', async () => {
      const existingMessage: Message = {
        messageId: 'msg-0',
        type: MessageType.STARTER,
        role: 'System',
        content: 'Welcome!',
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      mockDocs.set('conv-123', { ...testConversation, messages: [existingMessage] });

      await storage.addMessage('conv-123', testMessage);

      const updated = mockDocs.get('conv-123') as Conversation;
      expect(updated.messages).toHaveLength(2);
      expect(updated.messages[0]).toEqual(existingMessage);
      expect(updated.messages[1]).toEqual(testMessage);
    });

    it('throws when conversation not found', async () => {
      await expect(storage.addMessage('non-existent', testMessage)).rejects.toThrow(
        'Conversation not found'
      );
    });
  });

  describe('getConversationsByUser', () => {
    it('returns conversations for user', async () => {
      mockDocs.set('conv-1', { ...testConversation, conversationId: 'conv-1', userId: 'user-1' });
      mockDocs.set('conv-2', { ...testConversation, conversationId: 'conv-2', userId: 'user-1' });
      mockDocs.set('conv-3', { ...testConversation, conversationId: 'conv-3', userId: 'user-2' });

      const result = await storage.getConversationsByUser('user-1');

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.userId === 'user-1')).toBe(true);
    });

    it('returns empty array when no conversations', async () => {
      const result = await storage.getConversationsByUser('no-conversations');

      expect(result).toEqual([]);
    });
  });

  describe('getConversationsByExercise', () => {
    it('returns conversations for exercise', async () => {
      mockDocs.set('conv-1', { ...testConversation, conversationId: 'conv-1', exerciseId: 'ex-1' });
      mockDocs.set('conv-2', { ...testConversation, conversationId: 'conv-2', exerciseId: 'ex-1' });
      mockDocs.set('conv-3', { ...testConversation, conversationId: 'conv-3', exerciseId: 'ex-2' });

      const result = await storage.getConversationsByExercise('ex-1');

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.exerciseId === 'ex-1')).toBe(true);
    });
  });

  describe('deleteConversation', () => {
    it('deletes conversation', async () => {
      mockDocs.set('conv-123', testConversation);

      await storage.deleteConversation('conv-123');

      expect(mockDocs.has('conv-123')).toBe(false);
    });
  });
});
