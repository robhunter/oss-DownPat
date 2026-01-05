import { Conversation, Message, User } from '../types/index.js';
import { MessageType } from '../constants/index.js';
import { ConversationStorage, ExerciseStorage } from '../interfaces/index.js';
import { generateId } from '../utils/index.js';

/**
 * Framework-agnostic conversation controller.
 * Handles conversation operations with authentication.
 */
export class ConversationController {
  constructor(
    private conversationStorage: ConversationStorage,
    private exerciseStorage: ExerciseStorage
  ) {}

  /**
   * Start a new conversation.
   * @param exerciseId - The exercise to start a conversation for
   * @param user - The authenticated user
   * @throws if user is not a subscriber
   * @throws if exercise is not found
   */
  async startConversation(exerciseId: string, user: User): Promise<Conversation> {
    if (!user.isSubscriber) {
      throw new Error('Unauthorized: Only subscribers can start conversations');
    }

    const exercise = await this.exerciseStorage.getExercise(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    const now = new Date().toISOString();
    const conversation: Conversation = {
      conversationId: generateId(),
      exerciseId,
      userId: user.userId,
      messages: [],
      createdAt: now,
      updatedAt: now,
      isComplete: false,
      userMessageCount: 0,
    };

    // Add welcome message if present
    if (exercise.welcomeMessage) {
      const welcomeMessage: Message = {
        messageId: generateId(),
        type: MessageType.STARTER,
        role: 'System',
        content: exercise.welcomeMessage,
        timestamp: now,
      };
      conversation.messages.push(welcomeMessage);
    }

    await this.conversationStorage.createConversation(conversation);
    return conversation;
  }

  /**
   * Get a conversation by ID.
   * @param conversationId - The conversation ID
   * @param user - The authenticated user
   * @throws if conversation is not found or user doesn't own it
   */
  async getConversation(conversationId: string, user: User): Promise<Conversation> {
    const conversation = await this.conversationStorage.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Users can only access their own conversations (unless admin)
    if (conversation.userId !== user.userId && !user.isAdmin) {
      throw new Error('Unauthorized: Cannot access this conversation');
    }

    return conversation;
  }

  /**
   * Add a user message to a conversation.
   * @param conversationId - The conversation ID
   * @param content - The message content
   * @param user - The authenticated user
   * @returns The updated conversation and whether it's now complete
   */
  async addUserMessage(
    conversationId: string,
    content: string,
    user: User
  ): Promise<{ conversation: Conversation; isComplete: boolean }> {
    const conversation = await this.getConversation(conversationId, user);

    if (conversation.isComplete) {
      throw new Error('Conversation is already complete');
    }

    // Get exercise to check max messages
    const exercise = await this.exerciseStorage.getExercise(conversation.exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    const message: Message = {
      messageId: generateId(),
      type: MessageType.USER,
      role: user.displayName,
      content,
      timestamp: new Date().toISOString(),
    };

    await this.conversationStorage.addMessage(conversationId, message);

    const newUserMessageCount = conversation.userMessageCount + 1;
    const isComplete = newUserMessageCount >= exercise.maxUserMessages;

    await this.conversationStorage.updateConversation(conversationId, {
      userMessageCount: newUserMessageCount,
      isComplete,
      updatedAt: new Date().toISOString(),
    });

    // Return updated conversation
    const updated = await this.conversationStorage.getConversation(conversationId);
    return {
      conversation: updated!,
      isComplete,
    };
  }

  /**
   * Add an AI message to a conversation.
   * @param conversationId - The conversation ID
   * @param message - The message to add
   * @param user - The authenticated user (for authorization)
   */
  async addAIMessage(
    conversationId: string,
    message: Omit<Message, 'messageId' | 'timestamp'>,
    user: User
  ): Promise<Message> {
    // Verify user owns the conversation
    await this.getConversation(conversationId, user);

    const fullMessage: Message = {
      ...message,
      messageId: generateId(),
      timestamp: new Date().toISOString(),
    };

    await this.conversationStorage.addMessage(conversationId, fullMessage);
    await this.conversationStorage.updateConversation(conversationId, {
      updatedAt: new Date().toISOString(),
    });

    return fullMessage;
  }

  /**
   * Get all conversations for the current user.
   * @param user - The authenticated user
   */
  async getUserConversations(user: User): Promise<Conversation[]> {
    return this.conversationStorage.getConversationsByUser(user.userId);
  }

  /**
   * Mark a conversation as complete.
   * @param conversationId - The conversation ID
   * @param user - The authenticated user
   */
  async completeConversation(conversationId: string, user: User): Promise<void> {
    // Verify user owns the conversation
    await this.getConversation(conversationId, user);

    await this.conversationStorage.updateConversation(conversationId, {
      isComplete: true,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete a conversation.
   * @param conversationId - The conversation ID
   * @param user - The authenticated user
   */
  async deleteConversation(conversationId: string, user: User): Promise<void> {
    // Verify user owns the conversation (or is admin)
    await this.getConversation(conversationId, user);

    await this.conversationStorage.deleteConversation(conversationId);
  }
}
