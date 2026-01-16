import type { UserState } from '../types/user-state.js';

/**
 * Storage interface for user state.
 * Tracks active conversations per user for resumption.
 * Implement this to use a custom database backend.
 * Default implementation: @downpat/firebase-storage
 */
export interface UserStateStorage {
  /**
   * Get user state, creating empty state if user doesn't exist.
   * @param userId - The user ID
   * @returns UserState with activeConversations (empty object for new users)
   */
  getOrCreateUserState(userId: string): Promise<UserState>;

  /**
   * Set the active conversation for an exercise.
   * Called when starting a new conversation.
   * @param userId - The user ID
   * @param exerciseId - The exercise ID
   * @param conversationId - The conversation ID to set as active
   */
  setActiveConversation(
    userId: string,
    exerciseId: string,
    conversationId: string
  ): Promise<void>;

  /**
   * Get the active conversation ID for an exercise, if any.
   * @param userId - The user ID
   * @param exerciseId - The exercise ID
   * @returns The active conversation ID or null if none exists
   */
  getActiveConversation(
    userId: string,
    exerciseId: string
  ): Promise<string | null>;

  /**
   * Clear the active conversation for an exercise.
   * Called when a conversation is explicitly finished.
   * @param userId - The user ID
   * @param exerciseId - The exercise ID
   */
  clearActiveConversation(userId: string, exerciseId: string): Promise<void>;
}
