import { Conversation, ConversationMetadata, Message, User, ConversationTask, Task, isConversationTask } from '../types/index.js';
import { MessageType } from '../constants/index.js';
import { ConversationStorage, ExerciseStorage, UserStateStorage } from '../interfaces/index.js';
import {
  generateId,
  selectStarter,
  starterToMessages,
  createWelcomeMessage,
} from '../utils/index.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../errors.js';

/**
 * Check if a user can start conversations.
 * Subscribers and demo users are allowed.
 */
function canStartConversation(user: User): boolean {
  return user.isSubscriber || user.isDemo === true;
}

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
   * @param query - Optional query params for starter selection
   * @throws if user is not a subscriber or demo user
   * @throws if exercise is not found
   */
  async startConversation(
    exerciseId: string,
    user: User,
    query?: Record<string, string>
  ): Promise<Conversation> {
    if (!canStartConversation(user)) {
      throw new UnauthorizedError('Unauthorized: Only subscribers can start conversations');
    }

    const exercise = await this.exerciseStorage.getExercise(exerciseId);
    if (!exercise) {
      throw new NotFoundError('Exercise not found');
    }

    // Build initial messages array with welcome and starter messages
    const messages: Message[] = [];

    // Add welcome message if it exists
    if (exercise.welcomeMessage) {
      messages.push(createWelcomeMessage(exercise.welcomeMessage));
    }

    // Add starter messages if starters are defined
    if (exercise.starters && exercise.starters.length > 0) {
      const selectedStarter = selectStarter(exercise.starters, query);
      if (selectedStarter) {
        // Find conversation task to get the default role for starter messages
        const conversationTask = (exercise.continuationTasks || []).find(
          (task: Task) => task.enabled && isConversationTask(task)
        ) as ConversationTask | undefined;
        const defaultRole = conversationTask?.role || 'Assistant';

        // starterToMessages returns array: [CONTEXT message (if context exists), STARTER message]
        messages.push(...starterToMessages(selectedStarter, defaultRole));
      }
    }

    const now = new Date().toISOString();
    const conversation: Conversation = {
      conversationId: generateId(),
      exerciseId,
      userId: user.userId,
      messages,
      createdAt: now,
      updatedAt: now,
      isComplete: false,
      userMessageCount: 0,
    };

    await this.conversationStorage.createConversation(conversation);
    return conversation;
  }

  /**
   * Verify user has access to a conversation (ownership check).
   * Uses lightweight metadata fetch to avoid loading full message history.
   * @param conversationId - The conversation ID
   * @param user - The authenticated user
   * @throws if conversation is not found or user doesn't own it
   */
  private async verifyAccess(conversationId: string, user: User): Promise<ConversationMetadata> {
    const metadata = await this.conversationStorage.getConversationMetadata(conversationId);
    if (!metadata) {
      throw new NotFoundError('Conversation not found');
    }

    // Users can only access their own conversations (unless admin)
    if (metadata.userId !== user.userId && !user.isAdmin) {
      throw new UnauthorizedError('Unauthorized: Cannot access this conversation');
    }

    return metadata;
  }

  /**
   * Get a conversation by ID.
   * @param conversationId - The conversation ID
   * @param user - The authenticated user
   * @throws if conversation is not found or user doesn't own it
   */
  async getConversation(conversationId: string, user: User): Promise<Conversation> {
    // First verify access with lightweight metadata check
    await this.verifyAccess(conversationId, user);

    // Now fetch full conversation (we know it exists and user has access)
    const conversation = await this.conversationStorage.getConversation(conversationId);
    return conversation!;
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
    // Use metadata check for initial access verification
    const metadata = await this.verifyAccess(conversationId, user);

    if (metadata.isComplete) {
      throw new ValidationError('Conversation is already complete');
    }

    // Get exercise to check max messages
    const exercise = await this.exerciseStorage.getExercise(metadata.exerciseId);
    if (!exercise) {
      throw new NotFoundError('Exercise not found');
    }

    const message: Message = {
      messageId: generateId(),
      type: MessageType.USER,
      role: user.displayName,
      content,
      timestamp: new Date().toISOString(),
    };

    await this.conversationStorage.addMessage(conversationId, message);

    const newUserMessageCount = metadata.userMessageCount + 1;
    const isComplete = newUserMessageCount >= exercise.maxUserMessages;

    // updateConversation now returns the updated conversation
    const updated = await this.conversationStorage.updateConversation(conversationId, {
      userMessageCount: newUserMessageCount,
      isComplete,
      updatedAt: new Date().toISOString(),
    });

    return {
      conversation: updated,
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
    // Verify user owns the conversation (lightweight check)
    await this.verifyAccess(conversationId, user);

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
    // Verify user owns the conversation (lightweight check)
    await this.verifyAccess(conversationId, user);

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
    // Verify user owns the conversation (lightweight check)
    await this.verifyAccess(conversationId, user);

    await this.conversationStorage.deleteConversation(conversationId);
  }

  /**
   * Get an existing active conversation or start a new one.
   * This is the primary method for conversation resumption.
   *
   * Logic:
   * 1. Check userStateStorage for activeConversations[exerciseId]
   * 2. If found, fetch the conversation
   * 3. If conversation exists and is NOT complete, return it
   * 4. Otherwise, create new conversation and update activeConversations
   *
   * @param exerciseId - The exercise ID
   * @param user - The authenticated user
   * @param userStateStorage - Storage for tracking active conversations
   * @param query - Optional query params for starter selection (only used when creating new)
   * @returns Object with conversation and wasCreated flag
   */
  async getOrStartConversation(
    exerciseId: string,
    user: User,
    userStateStorage: UserStateStorage,
    query?: Record<string, string>
  ): Promise<{ conversation: Conversation; wasCreated: boolean }> {
    if (!canStartConversation(user)) {
      throw new UnauthorizedError('Unauthorized: Only subscribers can start conversations');
    }

    // Check for existing active conversation
    const activeConversationId = await userStateStorage.getActiveConversation(
      user.userId,
      exerciseId
    );

    if (activeConversationId) {
      // Try to fetch the existing conversation
      const existingConversation = await this.conversationStorage.getConversation(
        activeConversationId
      );

      // Resume if exists and not complete
      if (existingConversation && !existingConversation.isComplete) {
        return { conversation: existingConversation, wasCreated: false };
      }

      // Conversation was completed or deleted - clear the stale reference
      if (!existingConversation || existingConversation.isComplete) {
        await userStateStorage.clearActiveConversation(user.userId, exerciseId);
      }
    }

    // Create new conversation (with welcome/starter messages)
    const conversation = await this.startConversation(exerciseId, user, query);

    // Update active conversation tracking
    await userStateStorage.setActiveConversation(
      user.userId,
      exerciseId,
      conversation.conversationId
    );

    return { conversation, wasCreated: true };
  }

  /**
   * Edit a user message in a conversation.
   * All messages after the edited message are discarded (AI responses will be regenerated).
   *
   * @param conversationId - The conversation ID
   * @param messageId - The ID of the message to edit
   * @param newContent - The new content for the message
   * @param user - The authenticated user
   * @returns The updated conversation and the index of the edited message
   */
  async editMessage(
    conversationId: string,
    messageId: string,
    newContent: string,
    user: User
  ): Promise<{ conversation: Conversation; editedMessageIndex: number }> {
    // Verify access and get metadata
    const metadata = await this.verifyAccess(conversationId, user);

    if (metadata.isComplete) {
      throw new ValidationError('Cannot edit a completed conversation');
    }

    // Fetch full conversation to get messages
    const conversation = await this.conversationStorage.getConversation(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    // Find the message to edit - must be a USER message
    const messageIndex = conversation.messages.findIndex(
      (m) => m.messageId === messageId && m.type === MessageType.USER
    );

    if (messageIndex === -1) {
      throw new NotFoundError('User message not found');
    }

    // Keep messages up to (not including) the edited message
    const messagesBeforeEdit = conversation.messages.slice(0, messageIndex);

    // Create the edited message with new content and timestamp
    const editedMessage: Message = {
      ...conversation.messages[messageIndex],
      content: newContent,
      timestamp: new Date().toISOString(),
    };

    // New messages array: everything before + edited message (discards everything after)
    const newMessages = [...messagesBeforeEdit, editedMessage];

    // Recalculate user message count from the new messages array
    const newUserMessageCount = newMessages.filter((m) => m.type === MessageType.USER).length;

    // Update conversation with truncated messages
    const updatedConversation = await this.conversationStorage.updateConversation(
      conversationId,
      {
        messages: newMessages,
        userMessageCount: newUserMessageCount,
        updatedAt: new Date().toISOString(),
      }
    );

    return { conversation: updatedConversation, editedMessageIndex: messageIndex };
  }

  /**
   * Explicitly finish a conversation, marking it as complete.
   * This clears the active conversation tracking if userStateStorage is provided.
   *
   * @param conversationId - The conversation ID
   * @param user - The authenticated user
   * @param userStateStorage - Optional storage for clearing active conversation tracking
   * @returns The updated conversation
   */
  async finishConversation(
    conversationId: string,
    user: User,
    userStateStorage?: UserStateStorage
  ): Promise<Conversation> {
    // Verify access and get metadata
    const metadata = await this.verifyAccess(conversationId, user);

    if (metadata.isComplete) {
      throw new ValidationError('Conversation is already complete');
    }

    // Mark as complete
    const updatedConversation = await this.conversationStorage.updateConversation(
      conversationId,
      {
        isComplete: true,
        updatedAt: new Date().toISOString(),
      }
    );

    // Clear active conversation tracking if storage is provided
    if (userStateStorage) {
      await userStateStorage.clearActiveConversation(user.userId, metadata.exerciseId);
    }

    return updatedConversation;
  }
}
