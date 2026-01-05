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
   * Creates or updates the published version with current draft content.
   * @param slug - The exercise slug
   */
  publishExercise(slug: string): Promise<void>;

  /**
   * Unpublish exercise (remove published version, keep draft).
   * @param slug - The exercise slug
   */
  unpublishExercise(slug: string): Promise<void>;

  /**
   * Restore draft from published version.
   * Overwrites draft with published content.
   * @param slug - The exercise slug
   * @throws if no published version exists
   */
  restoreFromPublished(slug: string): Promise<void>;

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
   * Delete an exercise and its metadata.
   * @param slug - The exercise slug
   */
  deleteExercise(slug: string): Promise<void>;
}
