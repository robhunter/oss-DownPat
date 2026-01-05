/**
 * Message types for conversation messages.
 * Each type determines how the message is displayed and processed.
 */
export enum MessageType {
  // System types
  /** Background context for AI (not shown to user) */
  CONTEXT = 'CONTEXT',
  /** Content moderation warning */
  MODERATION = 'MODERATION',
  /** Conversation starter prompt */
  STARTER = 'STARTER',

  // User input
  /** User's message */
  USER = 'USER',

  // AI responses
  /** Main conversational response from AI character */
  CONVERSATION = 'CONVERSATION',
  /** Coaching/feedback commentary (shown separately) */
  COMMENTARY = 'COMMENTARY',
  /** Simple response for Talk to Coach sidebar */
  SIMPLE = 'SIMPLE',
  /** End-of-conversation summary */
  SUMMARY = 'SUMMARY',
}

/**
 * Message types that are visible to the user in the main conversation.
 */
export const VISIBLE_MESSAGE_TYPES = [
  MessageType.STARTER,
  MessageType.USER,
  MessageType.CONVERSATION,
  MessageType.MODERATION,
] as const;

/**
 * Message types that are shown in the coaching sidebar.
 */
export const COACHING_MESSAGE_TYPES = [
  MessageType.COMMENTARY,
  MessageType.SIMPLE,
  MessageType.SUMMARY,
] as const;
