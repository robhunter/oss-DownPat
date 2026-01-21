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
 * Response schema for conversation task tool calls.
 */
export interface ConversationResponseSchema {
  /** Description of expected conversation response for AI tool call */
  conversation: string;
}

/**
 * Response schema for commentary task tool calls.
 */
export interface CommentaryResponseSchema {
  /** Description of expected commentary for AI tool call */
  commentary: string;
  /** Description of expected grade for AI tool call */
  grade: string;
}

/**
 * Response schema for summary task tool calls.
 */
export interface SummaryResponseSchema {
  /** Description of expected summary for AI tool call */
  summary: string;
  /** Description of expected grade for AI tool call */
  grade: string;
}

/**
 * Base interface for shared task properties.
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
 * Guidelines are NOT included in conversation prompts.
 */
export interface ConversationTask extends BaseTask {
  responseType: MessageType.CONVERSATION;
  /** Schema describing the expected response format for AI tool calls */
  responseSchema: ConversationResponseSchema;
}

/**
 * Task for generating coaching commentary.
 * Provides real-time feedback on user performance.
 * Guidelines ARE included in commentary prompts by default.
 */
export interface CommentaryTask extends BaseTask {
  responseType: MessageType.COMMENTARY;
  /** Schema describing the expected response format for AI tool calls */
  responseSchema: CommentaryResponseSchema;
  /** Whether to include exercise guidelines in the prompt (default: true) */
  includeGuidelines: boolean;
}

/**
 * Task for generating end-of-conversation summaries.
 * Provides assessment and feedback after conversation completes.
 * Guidelines ARE included in summary prompts by default.
 */
export interface SummaryTask extends BaseTask {
  responseType: MessageType.SUMMARY;
  /** Schema describing the expected response format for AI tool calls */
  responseSchema: SummaryResponseSchema;
  /** Whether to include exercise guidelines in the prompt (default: true) */
  includeGuidelines: boolean;
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

/**
 * Default message filter for conversation tasks.
 * Excludes commentary and summary messages from AI context.
 */
export const DEFAULT_CONVERSATION_FILTER: MessageFilter = {
  excludeTypes: [MessageType.COMMENTARY, MessageType.SUMMARY],
};

/**
 * Default message filter for commentary tasks.
 * Excludes summary messages from AI context.
 */
export const DEFAULT_COMMENTARY_FILTER: MessageFilter = {
  excludeTypes: [MessageType.SUMMARY],
};

/**
 * Default message filter for summary tasks.
 * Includes all message types in AI context.
 */
export const DEFAULT_SUMMARY_FILTER: MessageFilter = {};

/**
 * Creates a new ConversationTask with sensible defaults.
 */
export function createConversationTask(
  taskId: string,
  role: string,
  prompt: string,
  responseDescription: string,
): ConversationTask {
  return {
    taskId,
    name: 'Conversation',
    responseType: MessageType.CONVERSATION,
    role,
    prompt,
    responseSchema: { conversation: responseDescription },
    messageFilter: DEFAULT_CONVERSATION_FILTER,
    enabled: true,
  };
}

/**
 * Creates a new CommentaryTask with sensible defaults.
 */
export function createCommentaryTask(
  taskId: string,
  role: string,
  prompt: string,
  commentaryDescription: string,
  gradeDescription: string,
): CommentaryTask {
  return {
    taskId,
    name: 'Commentary',
    responseType: MessageType.COMMENTARY,
    role,
    prompt,
    responseSchema: { commentary: commentaryDescription, grade: gradeDescription },
    messageFilter: DEFAULT_COMMENTARY_FILTER,
    includeGuidelines: true,
    enabled: true,
  };
}

/**
 * Creates a new SummaryTask with sensible defaults.
 */
export function createSummaryTask(
  taskId: string,
  role: string,
  prompt: string,
  summaryDescription: string,
  gradeDescription: string,
): SummaryTask {
  return {
    taskId,
    name: 'Summary',
    responseType: MessageType.SUMMARY,
    role,
    prompt,
    responseSchema: { summary: summaryDescription, grade: gradeDescription },
    messageFilter: DEFAULT_SUMMARY_FILTER,
    includeGuidelines: true,
    enabled: true,
  };
}
