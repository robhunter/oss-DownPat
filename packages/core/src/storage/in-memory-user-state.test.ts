import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserStateStorage } from './in-memory-user-state.js';

describe('InMemoryUserStateStorage', () => {
  let storage: InMemoryUserStateStorage;

  beforeEach(() => {
    storage = new InMemoryUserStateStorage();
  });

  describe('getOrCreateUserState', () => {
    it('should create new state for new user', async () => {
      const state = await storage.getOrCreateUserState('user-1');

      expect(state).toEqual({
        userId: 'user-1',
        activeConversations: {},
      });
    });

    it('should return existing state for existing user', async () => {
      // Create initial state
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');

      // Get state again
      const state = await storage.getOrCreateUserState('user-1');

      expect(state.userId).toBe('user-1');
      expect(state.activeConversations['exercise-1']).toBe('conv-1');
    });

    it('should create independent state for different users', async () => {
      const state1 = await storage.getOrCreateUserState('user-1');
      const state2 = await storage.getOrCreateUserState('user-2');

      expect(state1.userId).toBe('user-1');
      expect(state2.userId).toBe('user-2');
      expect(state1).not.toBe(state2);
    });
  });

  describe('setActiveConversation', () => {
    it('should set active conversation for user and exercise', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');

      const conversationId = await storage.getActiveConversation('user-1', 'exercise-1');
      expect(conversationId).toBe('conv-1');
    });

    it('should overwrite existing active conversation', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-2');

      const conversationId = await storage.getActiveConversation('user-1', 'exercise-1');
      expect(conversationId).toBe('conv-2');
    });

    it('should handle multiple exercises per user', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');
      await storage.setActiveConversation('user-1', 'exercise-2', 'conv-2');

      const conv1 = await storage.getActiveConversation('user-1', 'exercise-1');
      const conv2 = await storage.getActiveConversation('user-1', 'exercise-2');

      expect(conv1).toBe('conv-1');
      expect(conv2).toBe('conv-2');
    });

    it('should create user state if it does not exist', async () => {
      await storage.setActiveConversation('new-user', 'exercise-1', 'conv-1');

      const state = await storage.getOrCreateUserState('new-user');
      expect(state.userId).toBe('new-user');
      expect(state.activeConversations['exercise-1']).toBe('conv-1');
    });
  });

  describe('getActiveConversation', () => {
    it('should return null for non-existent exercise', async () => {
      await storage.getOrCreateUserState('user-1');

      const conversationId = await storage.getActiveConversation('user-1', 'non-existent');
      expect(conversationId).toBeNull();
    });

    it('should return null for new user', async () => {
      const conversationId = await storage.getActiveConversation('new-user', 'exercise-1');
      expect(conversationId).toBeNull();
    });

    it('should return conversation ID if set', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-123');

      const conversationId = await storage.getActiveConversation('user-1', 'exercise-1');
      expect(conversationId).toBe('conv-123');
    });
  });

  describe('clearActiveConversation', () => {
    it('should clear active conversation', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');
      await storage.clearActiveConversation('user-1', 'exercise-1');

      const conversationId = await storage.getActiveConversation('user-1', 'exercise-1');
      expect(conversationId).toBeNull();
    });

    it('should not affect other exercises', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');
      await storage.setActiveConversation('user-1', 'exercise-2', 'conv-2');

      await storage.clearActiveConversation('user-1', 'exercise-1');

      const conv1 = await storage.getActiveConversation('user-1', 'exercise-1');
      const conv2 = await storage.getActiveConversation('user-1', 'exercise-2');

      expect(conv1).toBeNull();
      expect(conv2).toBe('conv-2');
    });

    it('should not throw when clearing non-existent conversation', async () => {
      await storage.getOrCreateUserState('user-1');

      await expect(
        storage.clearActiveConversation('user-1', 'non-existent')
      ).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all user state data', async () => {
      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');
      await storage.setActiveConversation('user-2', 'exercise-1', 'conv-2');

      storage.clear();

      const state1 = await storage.getOrCreateUserState('user-1');
      const state2 = await storage.getOrCreateUserState('user-2');

      expect(state1.activeConversations).toEqual({});
      expect(state2.activeConversations).toEqual({});
    });
  });
});
