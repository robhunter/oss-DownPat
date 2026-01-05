import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationController } from './conversation-controller.js';
import { Conversation, User, Exercise, Message } from '../types/index.js';
import { ConversationStorage, ExerciseStorage } from '../interfaces/index.js';
import { MessageType } from '../constants/index.js';

// Test fixtures
const subscriberUser: User = {
  userId: 'user-1',
  displayName: 'Test User',
  isAdmin: false,
  isSubscriber: true,
};

const nonSubscriberUser: User = {
  userId: 'user-2',
  displayName: 'Free User',
  isAdmin: false,
  isSubscriber: false,
};

const adminUser: User = {
  userId: 'admin-1',
  displayName: 'Admin User',
  isAdmin: true,
  isSubscriber: true,
};

const testExercise: Exercise = {
  exerciseId: 'exercise-1',
  exerciseName: 'Test Exercise',
  slug: 'test-exercise',
  maxUserMessages: 3,
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
  welcomeMessage: 'Welcome to the exercise!',
  guidelines: 'Be helpful.',
  starters: ['Hello'],
};

const testConversation: Conversation = {
  conversationId: 'conv-1',
  exerciseId: 'exercise-1',
  userId: 'user-1',
  messages: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  isComplete: false,
  userMessageCount: 0,
};

describe('ConversationController', () => {
  let mockConversationStorage: ConversationStorage;
  let mockExerciseStorage: ExerciseStorage;
  let controller: ConversationController;

  beforeEach(() => {
    mockConversationStorage = {
      getConversation: vi.fn(),
      createConversation: vi.fn(),
      updateConversation: vi.fn(),
      addMessage: vi.fn(),
      getConversationsByUser: vi.fn(),
      deleteConversation: vi.fn(),
    };

    mockExerciseStorage = {
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

    controller = new ConversationController(mockConversationStorage, mockExerciseStorage);
  });

  describe('startConversation', () => {
    it('creates a new conversation for subscriber', async () => {
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.startConversation('exercise-1', subscriberUser);

      expect(result.exerciseId).toBe('exercise-1');
      expect(result.userId).toBe('user-1');
      expect(result.isComplete).toBe(false);
      expect(result.userMessageCount).toBe(0);
      expect(result.messages).toHaveLength(1); // Welcome message
      expect(result.messages[0].type).toBe(MessageType.STARTER);
      expect(result.messages[0].content).toBe('Welcome to the exercise!');
      expect(mockConversationStorage.createConversation).toHaveBeenCalled();
    });

    it('prevents non-subscriber from starting conversation', async () => {
      await expect(
        controller.startConversation('exercise-1', nonSubscriberUser)
      ).rejects.toThrow('Unauthorized');

      expect(mockConversationStorage.createConversation).not.toHaveBeenCalled();
    });

    it('throws when exercise not found', async () => {
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(null);

      await expect(
        controller.startConversation('non-existent', subscriberUser)
      ).rejects.toThrow('Exercise not found');
    });
  });

  describe('getConversation', () => {
    it('returns conversation for owner', async () => {
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      const result = await controller.getConversation('conv-1', subscriberUser);

      expect(result).toEqual(testConversation);
    });

    it('allows admin to access any conversation', async () => {
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      const result = await controller.getConversation('conv-1', adminUser);

      expect(result).toEqual(testConversation);
    });

    it('prevents non-owner from accessing conversation', async () => {
      const otherUser: User = { ...subscriberUser, userId: 'other-user' };
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      await expect(
        controller.getConversation('conv-1', otherUser)
      ).rejects.toThrow('Unauthorized');
    });

    it('throws when conversation not found', async () => {
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(null);

      await expect(
        controller.getConversation('non-existent', subscriberUser)
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('addUserMessage', () => {
    it('adds message and updates count', async () => {
      vi.mocked(mockConversationStorage.getConversation)
        .mockResolvedValueOnce(testConversation)
        .mockResolvedValueOnce({ ...testConversation, userMessageCount: 1 });
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.addUserMessage('conv-1', 'Hello!', subscriberUser);

      expect(result.isComplete).toBe(false);
      expect(mockConversationStorage.addMessage).toHaveBeenCalled();
      expect(mockConversationStorage.updateConversation).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({ userMessageCount: 1 })
      );
    });

    it('marks conversation complete when max messages reached', async () => {
      const almostCompleteConvo = { ...testConversation, userMessageCount: 2 };
      vi.mocked(mockConversationStorage.getConversation)
        .mockResolvedValueOnce(almostCompleteConvo)
        .mockResolvedValueOnce({ ...almostCompleteConvo, userMessageCount: 3, isComplete: true });
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.addUserMessage('conv-1', 'Final message', subscriberUser);

      expect(result.isComplete).toBe(true);
      expect(mockConversationStorage.updateConversation).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({ isComplete: true, userMessageCount: 3 })
      );
    });

    it('throws when conversation is already complete', async () => {
      const completeConvo = { ...testConversation, isComplete: true };
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(completeConvo);

      await expect(
        controller.addUserMessage('conv-1', 'Too late', subscriberUser)
      ).rejects.toThrow('Conversation is already complete');
    });
  });

  describe('addAIMessage', () => {
    it('adds AI message to conversation', async () => {
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      const message = {
        type: MessageType.CONVERSATION,
        role: 'Assistant',
        content: 'Hello! How can I help?',
      };

      const result = await controller.addAIMessage('conv-1', message, subscriberUser);

      expect(result.messageId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.content).toBe('Hello! How can I help?');
      expect(mockConversationStorage.addMessage).toHaveBeenCalled();
    });
  });

  describe('getUserConversations', () => {
    it('returns all conversations for user', async () => {
      vi.mocked(mockConversationStorage.getConversationsByUser).mockResolvedValue([testConversation]);

      const result = await controller.getUserConversations(subscriberUser);

      expect(result).toEqual([testConversation]);
      expect(mockConversationStorage.getConversationsByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('completeConversation', () => {
    it('marks conversation as complete', async () => {
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      await controller.completeConversation('conv-1', subscriberUser);

      expect(mockConversationStorage.updateConversation).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({ isComplete: true })
      );
    });
  });

  describe('deleteConversation', () => {
    it('deletes conversation for owner', async () => {
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      await controller.deleteConversation('conv-1', subscriberUser);

      expect(mockConversationStorage.deleteConversation).toHaveBeenCalledWith('conv-1');
    });

    it('allows admin to delete any conversation', async () => {
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      await controller.deleteConversation('conv-1', adminUser);

      expect(mockConversationStorage.deleteConversation).toHaveBeenCalledWith('conv-1');
    });
  });
});
