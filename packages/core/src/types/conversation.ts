import { MessageType } from '../constants/message-types.js';

/**
 * A message in a conversation.
 */
export interface Message {
  /** Unique identifier for this message */
  messageId: string;
  /** Type of message (determines display and processing) */
  type: MessageType;
  /** Role/persona that sent this message */
  role: string;
  /** Message content */
  content: string;
  /** When the message was created */
  timestamp: string;
  /** ID of the task that generated this message (for AI messages) */
  taskId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Lightweight conversation metadata without messages.
 * Used for ownership checks and status queries without loading full message history.
 */
export interface ConversationMetadata {
  /** Unique identifier */
  conversationId: string;
  /** ID of the exercise this conversation is for */
  exerciseId: string;
  /** ID of the user having this conversation */
  userId: string;
  /** When the conversation was started */
  createdAt: string;
  /** When the conversation was last updated */
  updatedAt?: string;
  /** Whether the conversation is complete */
  isComplete: boolean;
  /** Number of user messages sent */
  userMessageCount: number;
}

/**
 * A conversation is a series of messages between a user and AI.
 */
export interface Conversation extends ConversationMetadata {
  /** All messages in the conversation */
  messages: Message[];
}

/**
 * Data for creating a new conversation.
 */
export interface CreateConversationInput {
  exerciseId: string;
  userId: string;
}

/**
 * Data for adding a message to a conversation.
 */
export interface AddMessageInput {
  conversationId: string;
  type: MessageType;
  role: string;
  content: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}
