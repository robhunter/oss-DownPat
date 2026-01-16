import type { UserState } from '../types/user-state.js';
import type { UserStateStorage } from '../interfaces/user-state-storage.js';

/**
 * In-memory implementation of UserStateStorage.
 * Useful for development and testing. Data is lost when process restarts.
 *
 * @example
 * ```typescript
 * import { InMemoryUserStateStorage } from '@downpat/core';
 *
 * const userStateStorage = new InMemoryUserStateStorage();
 * await userStateStorage.setActiveConversation('user-1', 'exercise-1', 'conv-1');
 * const conversationId = await userStateStorage.getActiveConversation('user-1', 'exercise-1');
 * ```
 */
export class InMemoryUserStateStorage implements UserStateStorage {
  private states: Map<string, UserState> = new Map();

  async getOrCreateUserState(userId: string): Promise<UserState> {
    let state = this.states.get(userId);
    if (!state) {
      state = { userId, activeConversations: {} };
      this.states.set(userId, state);
    }
    return state;
  }

  async setActiveConversation(
    userId: string,
    exerciseId: string,
    conversationId: string
  ): Promise<void> {
    const state = await this.getOrCreateUserState(userId);
    state.activeConversations[exerciseId] = conversationId;
  }

  async getActiveConversation(
    userId: string,
    exerciseId: string
  ): Promise<string | null> {
    const state = await this.getOrCreateUserState(userId);
    return state.activeConversations[exerciseId] || null;
  }

  async clearActiveConversation(
    userId: string,
    exerciseId: string
  ): Promise<void> {
    const state = await this.getOrCreateUserState(userId);
    delete state.activeConversations[exerciseId];
  }

  /**
   * Clear all user state data. Useful for testing.
   */
  clear(): void {
    this.states.clear();
  }
}
