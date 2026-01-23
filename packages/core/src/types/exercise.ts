import { Task } from './task.js';

/**
 * A conversation starter prompt that can be selected at the start of a conversation.
 * Starters are selected server-side (randomly or by query params) and displayed
 * as the first message to the user.
 */
export interface Starter {
  /** The main starter text shown to the user */
  text: string;
  /** Additional context for the AI about this starter scenario */
  context: string;
  /** Key-value pairs for filtering starters by URL query params */
  attributes: Record<string, string>;
}

/**
 * Metadata for tracking draft/published versions of an exercise.
 * At least one of draft or published must be present.
 * - Draft only: unpublished exercise
 * - Published only: published with no pending changes
 * - Both: published with pending draft changes
 */
export interface ExerciseMetadata {
  /** Exercise ID of the draft version (undefined if no pending changes) */
  draft?: string;
  /** Exercise ID of the published version (undefined if not published) */
  published?: string;
}

/**
 * An exercise defines a conversational training scenario.
 */
export interface Exercise {
  /** Unique identifier */
  exerciseId: string;
  /** Human-readable name */
  exerciseName: string;
  /** URL-friendly slug for the exercise */
  slug: string;
  /** Maximum number of user messages before conversation ends */
  maxUserMessages: number;
  /** AI model to use (e.g., 'gpt-4', 'claude-3-sonnet') */
  model: string;
  /** Whether the Talk to Coach sidebar is enabled */
  talkToCoachEnabled: boolean;

  /**
   * Tasks that run after each user message.
   * Typically includes ConversationTask and optionally CommentaryTask.
   */
  continuationTasks: Task[];

  /**
   * Tasks that run when the conversation completes.
   * Typically includes SummaryTask.
   */
  completionTasks: Task[];

  /** Welcome message shown at the start of the conversation */
  welcomeMessage: string;
  /** Guidelines/context for the AI */
  guidelines: string;
  /** Conversation starter prompts that can be selected at conversation start */
  starters: Starter[];

  /** Version status of this exercise instance */
  status?: 'draft' | 'published';
  /** Display priority (lower = higher priority) */
  priority?: number;
  /** When the exercise was created */
  createdAt?: string;
  /** When the exercise was last updated */
  updatedAt?: string;
  /** When the exercise was published (only set on published versions) */
  publishedAt?: string;
}

/**
 * Exercise data for creating a new exercise.
 * Omits system-generated fields.
 */
export type CreateExerciseInput = Omit<Exercise, 'exerciseId' | 'createdAt' | 'updatedAt'> & {
  exerciseId?: string;
};

/**
 * Exercise data for updating an existing exercise.
 */
export type UpdateExerciseInput = Partial<Omit<Exercise, 'exerciseId'>> & {
  exerciseId: string;
};
