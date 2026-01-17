import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationController } from './conversation-controller.js';
import { Conversation, User, Exercise } from '../types/index.js';
import { ConversationStorage, ExerciseStorage, UserStateStorage } from '../interfaces/index.js';
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
  starters: [{ text: 'Hello', context: '', attributes: {} }],
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

// Metadata is conversation without messages
const testConversationMetadata = {
  conversationId: testConversation.conversationId,
  exerciseId: testConversation.exerciseId,
  userId: testConversation.userId,
  createdAt: testConversation.createdAt,
  updatedAt: testConversation.updatedAt,
  isComplete: testConversation.isComplete,
  userMessageCount: testConversation.userMessageCount,
};

describe('ConversationController', () => {
  let mockConversationStorage: ConversationStorage;
  let mockExerciseStorage: ExerciseStorage;
  let controller: ConversationController;

  beforeEach(() => {
    mockConversationStorage = {
      getConversationMetadata: vi.fn(),
      getConversation: vi.fn(),
      createConversation: vi.fn(),
      updateConversation: vi.fn(),
      addMessage: vi.fn(),
      getConversationsByUser: vi.fn(),
      getConversationsByExercise: vi.fn(),
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
    it('creates a new conversation for subscriber with welcome and starter messages', async () => {
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.startConversation('exercise-1', subscriberUser);

      expect(result.exerciseId).toBe('exercise-1');
      expect(result.userId).toBe('user-1');
      expect(result.isComplete).toBe(false);
      expect(result.userMessageCount).toBe(0);
      // Controller now adds welcome message and starter message
      expect(result.messages.length).toBeGreaterThan(0);
      // First message should be the welcome message with WELCOME type
      expect(result.messages[0].content).toBe(testExercise.welcomeMessage);
      expect(result.messages[0].type).toBe(MessageType.WELCOME);
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
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(testConversationMetadata);
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      const result = await controller.getConversation('conv-1', subscriberUser);

      expect(result).toEqual(testConversation);
    });

    it('allows admin to access any conversation', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(testConversationMetadata);
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      const result = await controller.getConversation('conv-1', adminUser);

      expect(result).toEqual(testConversation);
    });

    it('prevents non-owner from accessing conversation', async () => {
      const otherUser: User = { ...subscriberUser, userId: 'other-user' };
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(testConversationMetadata);

      await expect(
        controller.getConversation('conv-1', otherUser)
      ).rejects.toThrow('Unauthorized');
    });

    it('throws when conversation not found', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(null);

      await expect(
        controller.getConversation('non-existent', subscriberUser)
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('addUserMessage', () => {
    it('adds message and updates count', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(testConversationMetadata);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);
      const updatedConversation = { ...testConversation, userMessageCount: 1 };
      vi.mocked(mockConversationStorage.updateConversation).mockResolvedValue(updatedConversation);

      const result = await controller.addUserMessage('conv-1', 'Hello!', subscriberUser);

      expect(result.isComplete).toBe(false);
      expect(mockConversationStorage.addMessage).toHaveBeenCalled();
      expect(mockConversationStorage.updateConversation).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({ userMessageCount: 1 })
      );
    });

    it('marks conversation complete when max messages reached', async () => {
      const almostCompleteMetadata = { ...testConversationMetadata, userMessageCount: 2 };
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(almostCompleteMetadata);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);
      const updatedConversation = { ...testConversation, userMessageCount: 3, isComplete: true };
      vi.mocked(mockConversationStorage.updateConversation).mockResolvedValue(updatedConversation);

      const result = await controller.addUserMessage('conv-1', 'Final message', subscriberUser);

      expect(result.isComplete).toBe(true);
      expect(mockConversationStorage.updateConversation).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({ isComplete: true, userMessageCount: 3 })
      );
    });

    it('throws when conversation is already complete', async () => {
      const completeMetadata = { ...testConversationMetadata, isComplete: true };
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(completeMetadata);

      await expect(
        controller.addUserMessage('conv-1', 'Too late', subscriberUser)
      ).rejects.toThrow('Conversation is already complete');
    });
  });

  describe('addAIMessage', () => {
    it('adds AI message to conversation', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(testConversationMetadata);

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
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(testConversationMetadata);

      await controller.completeConversation('conv-1', subscriberUser);

      expect(mockConversationStorage.updateConversation).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({ isComplete: true })
      );
    });
  });

  describe('deleteConversation', () => {
    it('deletes conversation for owner', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(testConversationMetadata);

      await controller.deleteConversation('conv-1', subscriberUser);

      expect(mockConversationStorage.deleteConversation).toHaveBeenCalledWith('conv-1');
    });

    it('allows admin to delete any conversation', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(testConversationMetadata);

      await controller.deleteConversation('conv-1', adminUser);

      expect(mockConversationStorage.deleteConversation).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('getOrStartConversation', () => {
    let mockUserStateStorage: UserStateStorage;

    beforeEach(() => {
      mockUserStateStorage = {
        getOrCreateUserState: vi.fn(),
        setActiveConversation: vi.fn(),
        getActiveConversation: vi.fn(),
        clearActiveConversation: vi.fn(),
      };
    });

    it('returns existing active conversation with wasCreated=false', async () => {
      // Mock an existing active conversation
      vi.mocked(mockUserStateStorage.getActiveConversation).mockResolvedValue('conv-1');
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(testConversation);

      const result = await controller.getOrStartConversation(
        'exercise-1',
        subscriberUser,
        mockUserStateStorage
      );

      expect(result.conversation).toEqual(testConversation);
      expect(result.wasCreated).toBe(false);
      expect(mockUserStateStorage.getActiveConversation).toHaveBeenCalledWith('user-1', 'exercise-1');
      // Should NOT create a new conversation
      expect(mockConversationStorage.createConversation).not.toHaveBeenCalled();
      // Should NOT update active conversation (it's already set)
      expect(mockUserStateStorage.setActiveConversation).not.toHaveBeenCalled();
    });

    it('creates new conversation with wasCreated=true when active is complete', async () => {
      const completedConversation = { ...testConversation, isComplete: true };
      vi.mocked(mockUserStateStorage.getActiveConversation).mockResolvedValue('conv-1');
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(completedConversation);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.getOrStartConversation(
        'exercise-1',
        subscriberUser,
        mockUserStateStorage
      );

      // Should clear the stale reference
      expect(mockUserStateStorage.clearActiveConversation).toHaveBeenCalledWith('user-1', 'exercise-1');
      // Should create a new conversation
      expect(mockConversationStorage.createConversation).toHaveBeenCalled();
      // Should set the new active conversation
      expect(mockUserStateStorage.setActiveConversation).toHaveBeenCalledWith(
        'user-1',
        'exercise-1',
        result.conversation.conversationId
      );
      expect(result.conversation.isComplete).toBe(false);
      expect(result.wasCreated).toBe(true);
    });

    it('creates new conversation with wasCreated=true when no active exists', async () => {
      vi.mocked(mockUserStateStorage.getActiveConversation).mockResolvedValue(null);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.getOrStartConversation(
        'exercise-1',
        subscriberUser,
        mockUserStateStorage
      );

      // Should create a new conversation
      expect(mockConversationStorage.createConversation).toHaveBeenCalled();
      // Should set the new active conversation
      expect(mockUserStateStorage.setActiveConversation).toHaveBeenCalledWith(
        'user-1',
        'exercise-1',
        result.conversation.conversationId
      );
      expect(result.wasCreated).toBe(true);
    });

    it('creates new conversation with wasCreated=true when active was deleted', async () => {
      // Active reference exists but conversation was deleted
      vi.mocked(mockUserStateStorage.getActiveConversation).mockResolvedValue('deleted-conv');
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(null);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.getOrStartConversation(
        'exercise-1',
        subscriberUser,
        mockUserStateStorage
      );

      // Should clear the stale reference
      expect(mockUserStateStorage.clearActiveConversation).toHaveBeenCalledWith('user-1', 'exercise-1');
      // Should create a new conversation
      expect(mockConversationStorage.createConversation).toHaveBeenCalled();
      expect(mockUserStateStorage.setActiveConversation).toHaveBeenCalled();
      // Result should be a new conversation
      expect(result.conversation.exerciseId).toBe('exercise-1');
      expect(result.wasCreated).toBe(true);
    });

    it('prevents non-subscriber from using getOrStartConversation', async () => {
      await expect(
        controller.getOrStartConversation('exercise-1', nonSubscriberUser, mockUserStateStorage)
      ).rejects.toThrow('Unauthorized');

      expect(mockUserStateStorage.getActiveConversation).not.toHaveBeenCalled();
      expect(mockConversationStorage.createConversation).not.toHaveBeenCalled();
    });

    it('allows demo user to use getOrStartConversation', async () => {
      const demoUser: User = { ...nonSubscriberUser, isDemo: true };
      vi.mocked(mockUserStateStorage.getActiveConversation).mockResolvedValue(null);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const result = await controller.getOrStartConversation(
        'exercise-1',
        demoUser,
        mockUserStateStorage
      );

      expect(result.conversation.exerciseId).toBe('exercise-1');
      expect(result.wasCreated).toBe(true);
      expect(mockConversationStorage.createConversation).toHaveBeenCalled();
    });
  });
});
