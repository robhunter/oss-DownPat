import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryStorage } from './in-memory.js';
import type { ExerciseStorage } from '../interfaces/index.js';
import type { Exercise } from '../types/index.js';

describe('InMemoryExerciseStorage', () => {
  let storage: ExerciseStorage;

  const createTestExercise = (slug: string, id?: string): Exercise => ({
    exerciseId: id || `exercise-${slug}`,
    slug,
    exerciseName: `Test Exercise: ${slug}`,
    welcomeMessage: 'Welcome',
    guidelines: 'Be helpful',
    model: 'gpt-4',
    maxUserMessages: 10,
    starters: [],
    continuationTasks: [],
    completionTasks: [],
    talkToCoachEnabled: false,
  });

  beforeEach(() => {
    const { exerciseStorage } = createInMemoryStorage();
    storage = exerciseStorage;
  });

  describe('createExercise', () => {
    it('should create a new exercise as draft', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);

      const metadata = await storage.getExerciseMetadata('test-slug');
      expect(metadata).toEqual({ draft: 'exercise-test-slug' });
    });

    it('should be retrievable by slug', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);

      const retrieved = await storage.getExerciseBySlug('test-slug');
      expect(retrieved).toEqual({ ...exercise, status: 'draft' });
    });
  });

  describe('publishExercise', () => {
    it('should copy draft to published and delete draft', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      const metadata = await storage.getExerciseMetadata('test-slug');
      expect(metadata?.draft).toBeUndefined();
      expect(metadata?.published).toBe('exercise-test-slug-published');
    });

    it('should set status to published and publishedAt timestamp', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      const published = await storage.getExerciseBySlug('test-slug', true);
      expect(published?.status).toBe('published');
      expect(published?.publishedAt).toBeDefined();
      expect(typeof published?.publishedAt).toBe('string');
    });

    it('should make exercise available via getPublishedExercises', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      const published = await storage.getPublishedExercises();
      expect(published).toHaveLength(1);
      expect(published[0].slug).toBe('test-slug');
      expect(published[0].status).toBe('published');
      expect(published[0].publishedAt).toBeDefined();
    });

    it('should throw if no draft exists', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      // Now no draft exists - should throw
      await expect(storage.publishExercise('test-slug')).rejects.toThrow('No draft to publish');
    });

    it('should throw if exercise not found', async () => {
      await expect(storage.publishExercise('non-existent')).rejects.toThrow('Exercise not found');
    });

    it('should update existing published when republishing', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      // Create a new draft and publish again
      await storage.createDraftFromPublished('test-slug');
      const draft = await storage.getExerciseBySlug('test-slug');
      await storage.updateExercise({ ...draft!, exerciseName: 'Updated Name' });
      await storage.publishExercise('test-slug');

      const published = await storage.getExerciseBySlug('test-slug', true);
      expect(published?.exerciseName).toBe('Updated Name');
    });
  });

  describe('unpublishExercise', () => {
    it('should convert published to draft', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.unpublishExercise('test-slug');

      const metadata = await storage.getExerciseMetadata('test-slug');
      expect(metadata?.draft).toBe('exercise-test-slug');
      expect(metadata?.published).toBeUndefined();
    });

    it('should set status to draft and strip publishedAt', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      // Verify published has publishedAt
      const published = await storage.getExerciseBySlug('test-slug', true);
      expect(published?.publishedAt).toBeDefined();

      await storage.unpublishExercise('test-slug');

      const draft = await storage.getExerciseBySlug('test-slug');
      expect(draft?.status).toBe('draft');
      expect(draft?.publishedAt).toBeUndefined();
    });

    it('should remove from published exercises', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.unpublishExercise('test-slug');

      const published = await storage.getPublishedExercises();
      expect(published).toHaveLength(0);
    });

    it('should throw if not published', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);

      await expect(storage.unpublishExercise('test-slug')).rejects.toThrow('Exercise not published');
    });
  });

  describe('restoreFromPublished', () => {
    it('should delete draft and keep only published', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');

      // Modify the draft
      const draft = await storage.getExerciseBySlug('test-slug');
      await storage.updateExercise({ ...draft!, exerciseName: 'Draft Changes' });

      // Restore - should delete draft
      await storage.restoreFromPublished('test-slug');

      const metadata = await storage.getExerciseMetadata('test-slug');
      expect(metadata?.draft).toBeUndefined();
      expect(metadata?.published).toBeDefined();

      // Should return published version now
      const current = await storage.getExerciseBySlug('test-slug');
      expect(current?.exerciseName).toBe('Test Exercise: test-slug');
    });

    it('should throw if no published version', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);

      await expect(storage.restoreFromPublished('test-slug')).rejects.toThrow('No published version');
    });

    it('should throw if no draft to restore from', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      // No draft exists
      await expect(storage.restoreFromPublished('test-slug')).rejects.toThrow('No draft to restore from');
    });
  });

  describe('createDraftFromPublished', () => {
    it('should create draft from published', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');

      const metadata = await storage.getExerciseMetadata('test-slug');
      expect(metadata?.draft).toBe('exercise-test-slug');
      expect(metadata?.published).toBe('exercise-test-slug-published');
    });

    it('should set draft status and strip publishedAt', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      // Verify published has publishedAt
      const published = await storage.getExerciseBySlug('test-slug', true);
      expect(published?.status).toBe('published');
      expect(published?.publishedAt).toBeDefined();

      await storage.createDraftFromPublished('test-slug');

      // Draft should have draft status and no publishedAt
      const draft = await storage.getExerciseBySlug('test-slug');
      expect(draft?.status).toBe('draft');
      expect(draft?.publishedAt).toBeUndefined();

      // Published should still have its status and publishedAt
      const publishedAfter = await storage.getExerciseBySlug('test-slug', true);
      expect(publishedAfter?.status).toBe('published');
      expect(publishedAfter?.publishedAt).toBeDefined();
    });

    it('should allow editing the draft independently', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');

      const draft = await storage.getExerciseBySlug('test-slug');
      await storage.updateExercise({ ...draft!, exerciseName: 'Modified Draft' });

      // Draft should have new name
      const updatedDraft = await storage.getExerciseBySlug('test-slug');
      expect(updatedDraft?.exerciseName).toBe('Modified Draft');

      // Published should still have original
      const published = await storage.getExerciseBySlug('test-slug', true);
      expect(published?.exerciseName).toBe('Test Exercise: test-slug');
    });

    it('should throw if no published version', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);

      await expect(storage.createDraftFromPublished('test-slug')).rejects.toThrow('No published version');
    });

    it('should throw if draft already exists', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');

      // Now both draft and published exist - should throw
      await expect(storage.createDraftFromPublished('test-slug')).rejects.toThrow('Draft already exists');
    });
  });

  describe('getExerciseBySlug', () => {
    it('should return draft when both exist', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');

      const draft = await storage.getExerciseBySlug('test-slug');
      await storage.updateExercise({ ...draft!, exerciseName: 'Draft Version' });

      const result = await storage.getExerciseBySlug('test-slug');
      expect(result?.exerciseName).toBe('Draft Version');
    });

    it('should return published when only published exists', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      const result = await storage.getExerciseBySlug('test-slug');
      expect(result?.exerciseId).toBe('exercise-test-slug-published');
    });

    it('should return published when publishedOnly is true', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');

      const result = await storage.getExerciseBySlug('test-slug', true);
      expect(result?.exerciseId).toBe('exercise-test-slug-published');
    });

    it('should return null when publishedOnly is true but not published', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);

      const result = await storage.getExerciseBySlug('test-slug', true);
      expect(result).toBeNull();
    });
  });

  describe('getExercises', () => {
    it('should return draft when only draft exists', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);

      const exercises = await storage.getExercises();
      expect(exercises).toHaveLength(1);
      expect(exercises[0].exerciseId).toBe('exercise-test-slug');
    });

    it('should return published when only published exists', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      const exercises = await storage.getExercises();
      expect(exercises).toHaveLength(1);
      expect(exercises[0].exerciseId).toBe('exercise-test-slug-published');
    });

    it('should return draft when both exist', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');

      const exercises = await storage.getExercises();
      expect(exercises).toHaveLength(1);
      expect(exercises[0].exerciseId).toBe('exercise-test-slug');
    });
  });

  describe('getExercisesWithMetadata', () => {
    it('should return exercise with metadata when only draft', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);

      const results = await storage.getExercisesWithMetadata();
      expect(results).toHaveLength(1);
      expect(results[0].exercise.exerciseId).toBe('exercise-test-slug');
      expect(results[0].metadata).toEqual({ draft: 'exercise-test-slug' });
    });

    it('should return exercise with metadata when only published', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');

      const results = await storage.getExercisesWithMetadata();
      expect(results).toHaveLength(1);
      expect(results[0].exercise.exerciseId).toBe('exercise-test-slug-published');
      expect(results[0].metadata).toEqual({ published: 'exercise-test-slug-published' });
    });

    it('should return draft with full metadata when both exist', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');

      const results = await storage.getExercisesWithMetadata();
      expect(results).toHaveLength(1);
      expect(results[0].exercise.exerciseId).toBe('exercise-test-slug');
      expect(results[0].metadata).toEqual({
        draft: 'exercise-test-slug',
        published: 'exercise-test-slug-published',
      });
    });
  });

  describe('deleteExercise', () => {
    it('should delete draft only exercise', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.deleteExercise('test-slug');

      const metadata = await storage.getExerciseMetadata('test-slug');
      expect(metadata).toBeNull();
    });

    it('should delete published only exercise', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.deleteExercise('test-slug');

      const metadata = await storage.getExerciseMetadata('test-slug');
      expect(metadata).toBeNull();
    });

    it('should delete both draft and published', async () => {
      const exercise = createTestExercise('test-slug');
      await storage.createExercise(exercise);
      await storage.publishExercise('test-slug');
      await storage.createDraftFromPublished('test-slug');
      await storage.deleteExercise('test-slug');

      const metadata = await storage.getExerciseMetadata('test-slug');
      expect(metadata).toBeNull();

      const exercises = await storage.getExercises();
      expect(exercises).toHaveLength(0);
    });
  });
});
