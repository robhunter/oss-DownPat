import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExerciseController } from './exercise-controller.js';
import { Exercise, User } from '../types/index.js';
import { ExerciseStorage } from '../interfaces/index.js';
import { MessageType } from '../constants/index.js';

// Test fixtures
const adminUser: User = {
  userId: 'admin-1',
  displayName: 'Admin User',
  isAdmin: true,
  isSubscriber: true,
};

const regularUser: User = {
  userId: 'user-1',
  displayName: 'Regular User',
  isAdmin: false,
  isSubscriber: true,
};

const testExercise: Exercise = {
  exerciseId: 'exercise-1',
  exerciseName: 'Test Exercise',
  slug: 'test-exercise',
  maxUserMessages: 10,
  model: 'gpt-4',
  talkToCoachEnabled: false,
  continuationTasks: [
    {
      taskId: 'task-1',
      name: 'Conversation',
      responseType: MessageType.CONVERSATION,
      role: 'Assistant',
      prompt: 'You are a helpful assistant.',
      enabled: true,
    },
  ],
  completionTasks: [],
  welcomeMessage: 'Welcome!',
  guidelines: 'Be helpful.',
  starters: [{ text: 'Hello', context: '', attributes: {} }],
};

describe('ExerciseController', () => {
  let mockStorage: ExerciseStorage;
  let controller: ExerciseController;

  beforeEach(() => {
    mockStorage = {
      getExercise: vi.fn(),
      getExerciseBySlug: vi.fn(),
      createExercise: vi.fn(),
      updateExercise: vi.fn(),
      publishExercise: vi.fn(),
      unpublishExercise: vi.fn(),
      restoreFromPublished: vi.fn(),
      getExerciseMetadata: vi.fn(),
      getExercises: vi.fn(),
      deleteExercise: vi.fn(),
    };
    controller = new ExerciseController(mockStorage);
  });

  describe('createExercise', () => {
    it('allows admin to create exercise', async () => {
      await controller.createExercise(testExercise, adminUser);

      expect(mockStorage.createExercise).toHaveBeenCalledWith(testExercise);
    });

    it('prevents non-admin from creating exercise', async () => {
      await expect(
        controller.createExercise(testExercise, regularUser)
      ).rejects.toThrow('Unauthorized');

      expect(mockStorage.createExercise).not.toHaveBeenCalled();
    });
  });

  describe('getExercise', () => {
    it('returns exercise when found', async () => {
      vi.mocked(mockStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.getExercise('exercise-1', regularUser);

      expect(result).toEqual(testExercise);
    });

    it('throws when exercise not found', async () => {
      vi.mocked(mockStorage.getExercise).mockResolvedValue(null);

      await expect(
        controller.getExercise('non-existent', regularUser)
      ).rejects.toThrow('Exercise not found');
    });
  });

  describe('updateExercise', () => {
    it('allows admin to update exercise', async () => {
      vi.mocked(mockStorage.getExercise).mockResolvedValue(testExercise);

      await controller.updateExercise(testExercise, adminUser);

      expect(mockStorage.updateExercise).toHaveBeenCalledWith(testExercise);
    });

    it('prevents non-admin from updating exercise', async () => {
      await expect(
        controller.updateExercise(testExercise, regularUser)
      ).rejects.toThrow('Unauthorized');
    });

    it('throws when exercise not found', async () => {
      vi.mocked(mockStorage.getExercise).mockResolvedValue(null);

      await expect(
        controller.updateExercise(testExercise, adminUser)
      ).rejects.toThrow('Exercise not found');
    });

    it('prevents changing the slug', async () => {
      vi.mocked(mockStorage.getExercise).mockResolvedValue(testExercise);

      const updatedExercise = { ...testExercise, slug: 'new-slug' };

      await expect(
        controller.updateExercise(updatedExercise, adminUser)
      ).rejects.toThrow('Cannot change exercise slug: slug is immutable');

      expect(mockStorage.updateExercise).not.toHaveBeenCalled();
    });
  });

  describe('publishExercise', () => {
    it('allows admin to publish exercise', async () => {
      await controller.publishExercise('test-exercise', adminUser);

      expect(mockStorage.publishExercise).toHaveBeenCalledWith('test-exercise');
    });

    it('prevents non-admin from publishing exercise', async () => {
      await expect(
        controller.publishExercise('test-exercise', regularUser)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('unpublishExercise', () => {
    it('allows admin to unpublish exercise', async () => {
      await controller.unpublishExercise('test-exercise', adminUser);

      expect(mockStorage.unpublishExercise).toHaveBeenCalledWith('test-exercise');
    });

    it('prevents non-admin from unpublishing exercise', async () => {
      await expect(
        controller.unpublishExercise('test-exercise', regularUser)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('restoreFromPublished', () => {
    it('allows admin to restore from published', async () => {
      await controller.restoreFromPublished('test-exercise', adminUser);

      expect(mockStorage.restoreFromPublished).toHaveBeenCalledWith('test-exercise');
    });

    it('prevents non-admin from restoring', async () => {
      await expect(
        controller.restoreFromPublished('test-exercise', regularUser)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteExercise', () => {
    it('allows admin to delete exercise', async () => {
      await controller.deleteExercise('test-exercise', adminUser);

      expect(mockStorage.deleteExercise).toHaveBeenCalledWith('test-exercise');
    });

    it('prevents non-admin from deleting exercise', async () => {
      await expect(
        controller.deleteExercise('test-exercise', regularUser)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getExercises', () => {
    it('returns all exercises', async () => {
      vi.mocked(mockStorage.getExercises).mockResolvedValue([testExercise]);

      const result = await controller.getExercises(regularUser);

      expect(result).toEqual([testExercise]);
    });
  });
});
