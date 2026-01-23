import { Exercise, ExerciseMetadata } from '../types/exercise.js';

/**
 * Storage interface for exercises.
 * Implement this to use a custom database backend.
 * Default implementation: @downpat/firebase-storage
 */
export interface ExerciseStorage {
  /**
   * Get exercise by ID.
   * @param exerciseId - The exercise ID
   * @returns The exercise or null if not found
   */
  getExercise(exerciseId: string): Promise<Exercise | null>;

  /**
   * Get exercise by slug.
   * @param slug - The exercise slug
   * @param publishedOnly - If true, only return if published version exists
   * @returns The exercise or null if not found
   */
  getExerciseBySlug(slug: string, publishedOnly?: boolean): Promise<Exercise | null>;

  /**
   * Create a new exercise (draft only).
   * @param exercise - The exercise to create
   */
  createExercise(exercise: Exercise): Promise<void>;

  /**
   * Update a draft exercise.
   * @param exercise - The exercise with updated fields
   */
  updateExercise(exercise: Exercise): Promise<void>;

  /**
   * Publish draft to published version.
   * Creates or updates the published version with current draft content,
   * then deletes the draft. After this, only the published version exists.
   * @param slug - The exercise slug
   * @throws if no draft exists
   */
  publishExercise(slug: string): Promise<void>;

  /**
   * Unpublish exercise by converting published to draft.
   * After this, only the draft version exists (no published).
   * @param slug - The exercise slug
   * @throws if no published version exists
   */
  unpublishExercise(slug: string): Promise<void>;

  /**
   * Restore to published version by deleting draft.
   * After this operation, only the published version exists.
   * @param slug - The exercise slug
   * @throws if no published version exists
   * @throws if no draft exists (nothing to restore from)
   */
  restoreFromPublished(slug: string): Promise<void>;

  /**
   * Create a draft from the published version for editing.
   * Use this when editing a published-only exercise.
   * @param slug - The exercise slug
   * @throws if no published version exists
   * @throws if draft already exists
   */
  createDraftFromPublished(slug: string): Promise<void>;

  /**
   * Get exercise metadata by slug.
   * @param slug - The exercise slug
   * @returns Metadata with draft/published IDs or null if not found
   */
  getExerciseMetadata(slug: string): Promise<ExerciseMetadata | null>;

  /**
   * Get all exercises.
   * @returns Array of all draft exercises
   */
  getExercises(): Promise<Exercise[]>;

  /**
   * Get all exercises with their metadata.
   * Used for admin UI to show draft/published status.
   * @returns Array of exercises with their metadata
   */
  getExercisesWithMetadata(): Promise<Array<{ exercise: Exercise; metadata: ExerciseMetadata }>>;

  /**
   * Get all published exercises.
   * Used for subscriber browsing.
   * @returns Array of published exercises
   */
  getPublishedExercises(): Promise<Exercise[]>;

  /**
   * Delete an exercise and its metadata.
   * @param slug - The exercise slug
   */
  deleteExercise(slug: string): Promise<void>;
}
