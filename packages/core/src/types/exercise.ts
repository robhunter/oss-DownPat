import { Task } from './task.js';

/**
 * Metadata for tracking draft/published versions of an exercise.
 * Each exercise has a draft version and optionally a published version.
 */
export interface ExerciseMetadata {
  /** Exercise ID of the draft version */
  draft: string;
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
  /** Conversation starter prompts user can choose from */
  starters: string[];

  /** Display priority (lower = higher priority) */
  priority?: number;
  /** When the exercise was created */
  createdAt?: string;
  /** When the exercise was last updated */
  updatedAt?: string;
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
