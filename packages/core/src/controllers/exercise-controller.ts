import { Exercise, User } from '../types/index.js';
import { ExerciseStorage } from '../interfaces/index.js';

/**
 * Framework-agnostic exercise controller.
 * Handles exercise CRUD operations with authentication.
 */
export class ExerciseController {
  constructor(private storage: ExerciseStorage) {}

  /**
   * Create a new exercise.
   * @param exercise - The exercise to create
   * @param user - The authenticated user
   * @throws if user is not an admin
   */
  async createExercise(exercise: Exercise, user: User): Promise<Exercise> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can create exercises');
    }

    await this.storage.createExercise(exercise);
    return exercise;
  }

  /**
   * Get an exercise by ID.
   * @param exerciseId - The exercise ID
   * @param user - The authenticated user
   */
  async getExercise(exerciseId: string, _user: User): Promise<Exercise> {
    const exercise = await this.storage.getExercise(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // All authenticated users can view exercises
    // Could add more granular access control here if needed
    return exercise;
  }

  /**
   * Get an exercise by slug.
   * @param slug - The exercise slug
   * @param user - The authenticated user
   * @param publishedOnly - If true, only return published version
   */
  async getExerciseBySlug(
    slug: string,
    _user: User,
    publishedOnly = false
  ): Promise<Exercise> {
    const exercise = await this.storage.getExerciseBySlug(slug, publishedOnly);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    return exercise;
  }

  /**
   * Get all exercises.
   * @param user - The authenticated user
   */
  async getExercises(_user: User): Promise<Exercise[]> {
    return this.storage.getExercises();
  }

  /**
   * Update an exercise.
   * @param exercise - The exercise with updated fields
   * @param user - The authenticated user
   * @throws if user is not an admin
   */
  async updateExercise(exercise: Exercise, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can update exercises');
    }

    await this.storage.updateExercise(exercise);
  }

  /**
   * Publish an exercise.
   * @param slug - The exercise slug
   * @param user - The authenticated user
   * @throws if user is not an admin
   */
  async publishExercise(slug: string, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can publish exercises');
    }

    await this.storage.publishExercise(slug);
  }

  /**
   * Unpublish an exercise.
   * @param slug - The exercise slug
   * @param user - The authenticated user
   * @throws if user is not an admin
   */
  async unpublishExercise(slug: string, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can unpublish exercises');
    }

    await this.storage.unpublishExercise(slug);
  }

  /**
   * Restore draft from published version.
   * @param slug - The exercise slug
   * @param user - The authenticated user
   * @throws if user is not an admin
   */
  async restoreFromPublished(slug: string, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can restore exercises');
    }

    await this.storage.restoreFromPublished(slug);
  }

  /**
   * Delete an exercise.
   * @param slug - The exercise slug
   * @param user - The authenticated user
   * @throws if user is not an admin
   */
  async deleteExercise(slug: string, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can delete exercises');
    }

    await this.storage.deleteExercise(slug);
  }
}
