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
  /** Welcome message shown at start of conversation (plain text) */
  WELCOME = 'WELCOME',
  /** Conversation starter prompt (JSON with text, context, attributes) */
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
  MessageType.CONTEXT,
  MessageType.WELCOME,
  MessageType.STARTER,
  MessageType.USER,
  MessageType.CONVERSATION,
  MessageType.MODERATION,
  MessageType.COMMENTARY,
] as const;

/**
 * Message types that are shown in the coaching sidebar.
 */
export const COACHING_MESSAGE_TYPES = [
  MessageType.COMMENTARY,
  MessageType.SIMPLE,
  MessageType.SUMMARY,
] as const;
