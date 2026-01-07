import { Conversation, ConversationMetadata, Message } from '../types/conversation.js';

/**
 * Storage interface for conversations.
 * Implement this to use a custom database backend.
 * Default implementation: @downpat/firebase-storage
 */
export interface ConversationStorage {
  /**
   * Get conversation metadata by ID (without messages).
   * Use this for ownership checks and status queries to avoid loading full message history.
   * @param conversationId - The conversation ID
   * @returns The conversation metadata or null if not found
   */
  getConversationMetadata(conversationId: string): Promise<ConversationMetadata | null>;

  /**
   * Get full conversation by ID (including messages).
   * @param conversationId - The conversation ID
   * @returns The conversation or null if not found
   */
  getConversation(conversationId: string): Promise<Conversation | null>;

  /**
   * Create a new conversation.
   * @param conversation - The conversation to create
   */
  createConversation(conversation: Conversation): Promise<void>;

  /**
   * Add a message to a conversation.
   * @param conversationId - The conversation ID
   * @param message - The message to add
   */
  addMessage(conversationId: string, message: Message): Promise<void>;

  /**
   * Update conversation metadata (e.g., isComplete, userMessageCount).
   * @param conversationId - The conversation ID
   * @param updates - Fields to update
   * @returns The updated conversation
   */
  updateConversation(
    conversationId: string,
    updates: Partial<Pick<Conversation, 'isComplete' | 'userMessageCount' | 'updatedAt'>>
  ): Promise<Conversation>;

  /**
   * Get all conversations for a user.
   * @param userId - The user ID
   * @returns Array of conversations
   */
  getConversationsByUser(userId: string): Promise<Conversation[]>;

  /**
   * Get all conversations for an exercise.
   * @param exerciseId - The exercise ID
   * @returns Array of conversations
   */
  getConversationsByExercise(exerciseId: string): Promise<Conversation[]>;

  /**
   * Delete a conversation.
   * @param conversationId - The conversation ID
   */
  deleteConversation(conversationId: string): Promise<void>;
}
