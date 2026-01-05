import { MessageType } from '../constants/message-types.js';

/**
 * Filter configuration for selecting which messages to include in AI context.
 */
export interface MessageFilter {
  /** Include messages of these types */
  includeTypes?: MessageType[];
  /** Exclude messages of these types */
  excludeTypes?: MessageType[];
  /** Maximum number of messages to include */
  maxMessages?: number;
}

/**
 * Base interface for all task types.
 * Tasks define how AI should respond at different points in a conversation.
 */
export interface BaseTask {
  /** Unique identifier for this task */
  taskId: string;
  /** Human-readable name for this task */
  name: string;
  /** The type of message this task produces */
  responseType: MessageType;
  /** Role/persona for the AI to adopt */
  role: string;
  /** System prompt/instructions for the AI */
  prompt: string;
  /** Filter for selecting which messages to include in context */
  messageFilter?: MessageFilter;
  /** Whether this task is enabled */
  enabled: boolean;
}

/**
 * Task for generating conversational responses.
 * Used for the main AI character in a conversation.
 */
export interface ConversationTask extends BaseTask {
  responseType: MessageType.CONVERSATION;
}

/**
 * Task for generating coaching commentary.
 * Provides real-time feedback on user performance.
 */
export interface CommentaryTask extends BaseTask {
  responseType: MessageType.COMMENTARY;
}

/**
 * Task for generating end-of-conversation summaries.
 * Provides assessment and feedback after conversation completes.
 */
export interface SummaryTask extends BaseTask {
  responseType: MessageType.SUMMARY;
}

/**
 * Task for generating simple responses.
 * Used for Talk to Coach sidebar interactions.
 */
export interface SimpleTask extends BaseTask {
  responseType: MessageType.SIMPLE;
}

/**
 * Union type of all task types.
 */
export type Task = ConversationTask | CommentaryTask | SummaryTask | SimpleTask;

/**
 * Type guard to check if a task is a ConversationTask.
 */
export function isConversationTask(task: Task): task is ConversationTask {
  return task.responseType === MessageType.CONVERSATION;
}

/**
 * Type guard to check if a task is a CommentaryTask.
 */
export function isCommentaryTask(task: Task): task is CommentaryTask {
  return task.responseType === MessageType.COMMENTARY;
}

/**
 * Type guard to check if a task is a SummaryTask.
 */
export function isSummaryTask(task: Task): task is SummaryTask {
  return task.responseType === MessageType.SUMMARY;
}

/**
 * Type guard to check if a task is a SimpleTask.
 */
export function isSimpleTask(task: Task): task is SimpleTask {
  return task.responseType === MessageType.SIMPLE;
}
