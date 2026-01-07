import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  MessageSchema,
  ConversationSchema,
  TaskSchema,
  ExerciseSchema,
  CreateExerciseInputSchema,
  validate,
  safeValidate,
} from './index.js';
import { MessageType } from '../constants/message-types.js';

describe('Zod Schemas', () => {
  describe('UserSchema', () => {
    it('validates a valid user', () => {
      const user = {
        userId: 'user-1',
        displayName: 'Test User',
        isAdmin: false,
        isSubscriber: true,
      };
      expect(() => UserSchema.parse(user)).not.toThrow();
    });

    it('accepts optional isDemo field', () => {
      const user = {
        userId: 'user-1',
        displayName: 'Demo User',
        isAdmin: false,
        isSubscriber: false,
        isDemo: true,
      };
      const result = UserSchema.parse(user);
      expect(result.isDemo).toBe(true);
    });

    it('rejects empty userId', () => {
      const user = {
        userId: '',
        displayName: 'Test',
        isAdmin: false,
        isSubscriber: false,
      };
      const result = safeValidate(UserSchema, user);
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const user = { userId: 'user-1' };
      const result = safeValidate(UserSchema, user);
      expect(result.success).toBe(false);
    });
  });

  describe('MessageSchema', () => {
    const validMessage = {
      messageId: 'msg-1',
      type: MessageType.USER,
      role: 'User',
      content: 'Hello',
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    it('validates a valid message', () => {
      expect(() => MessageSchema.parse(validMessage)).not.toThrow();
    });

    it('accepts optional taskId', () => {
      const msg = { ...validMessage, taskId: 'task-1' };
      const result = MessageSchema.parse(msg);
      expect(result.taskId).toBe('task-1');
    });

    it('rejects invalid timestamp format', () => {
      const msg = { ...validMessage, timestamp: 'not-a-date' };
      const result = safeValidate(MessageSchema, msg);
      expect(result.success).toBe(false);
    });

    it('rejects invalid message type', () => {
      const msg = { ...validMessage, type: 'INVALID_TYPE' };
      const result = safeValidate(MessageSchema, msg);
      expect(result.success).toBe(false);
    });
  });

  describe('ConversationSchema', () => {
    const validConversation = {
      conversationId: 'conv-1',
      exerciseId: 'ex-1',
      userId: 'user-1',
      messages: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      isComplete: false,
      userMessageCount: 0,
    };

    it('validates a valid conversation', () => {
      expect(() => ConversationSchema.parse(validConversation)).not.toThrow();
    });

    it('validates conversation with messages', () => {
      const conv = {
        ...validConversation,
        messages: [{
          messageId: 'msg-1',
          type: MessageType.USER,
          role: 'User',
          content: 'Hi',
          timestamp: '2024-01-01T00:00:00.000Z',
        }],
      };
      const result = ConversationSchema.parse(conv);
      expect(result.messages).toHaveLength(1);
    });

    it('rejects negative userMessageCount', () => {
      const conv = { ...validConversation, userMessageCount: -1 };
      const result = safeValidate(ConversationSchema, conv);
      expect(result.success).toBe(false);
    });
  });

  describe('TaskSchema', () => {
    const baseTask = {
      taskId: 'task-1',
      name: 'Test Task',
      role: 'Assistant',
      prompt: 'You are helpful.',
      enabled: true,
    };

    it('validates a conversation task', () => {
      const task = { ...baseTask, responseType: MessageType.CONVERSATION };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('validates a commentary task', () => {
      const task = { ...baseTask, responseType: MessageType.COMMENTARY };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('validates a summary task', () => {
      const task = { ...baseTask, responseType: MessageType.SUMMARY };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('validates a simple task', () => {
      const task = { ...baseTask, responseType: MessageType.SIMPLE };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('rejects invalid responseType', () => {
      const task = { ...baseTask, responseType: 'INVALID' };
      const result = safeValidate(TaskSchema, task);
      expect(result.success).toBe(false);
    });
  });

  describe('ExerciseSchema', () => {
    const validExercise = {
      exerciseId: 'ex-1',
      exerciseName: 'Test Exercise',
      slug: 'test-exercise',
      maxUserMessages: 5,
      model: 'gpt-4',
      talkToCoachEnabled: false,
      continuationTasks: [{
        taskId: 'task-1',
        name: 'Convo',
        responseType: MessageType.CONVERSATION,
        role: 'Assistant',
        prompt: 'Be helpful.',
        enabled: true,
      }],
      completionTasks: [],
      welcomeMessage: 'Welcome!',
      guidelines: 'Be nice.',
      starters: ['Hi'],
    };

    it('validates a valid exercise', () => {
      expect(() => ExerciseSchema.parse(validExercise)).not.toThrow();
    });

    it('accepts valid slug formats', () => {
      const slugs = ['test', 'test-exercise', 'test-123', '123-test'];
      for (const slug of slugs) {
        const ex = { ...validExercise, slug };
        expect(() => ExerciseSchema.parse(ex)).not.toThrow();
      }
    });

    it('rejects invalid slug formats', () => {
      const invalidSlugs = ['Test', 'test_exercise', 'test exercise', 'test.exercise'];
      for (const slug of invalidSlugs) {
        const ex = { ...validExercise, slug };
        const result = safeValidate(ExerciseSchema, ex);
        expect(result.success).toBe(false);
      }
    });

    it('rejects non-positive maxUserMessages', () => {
      const ex = { ...validExercise, maxUserMessages: 0 };
      const result = safeValidate(ExerciseSchema, ex);
      expect(result.success).toBe(false);
    });

    it('accepts optional status field', () => {
      const ex = { ...validExercise, status: 'draft' as const };
      const result = ExerciseSchema.parse(ex);
      expect(result.status).toBe('draft');
    });
  });

  describe('CreateExerciseInputSchema', () => {
    it('allows optional exerciseId', () => {
      const input = {
        exerciseName: 'New Exercise',
        slug: 'new-exercise',
        maxUserMessages: 3,
        model: 'gpt-4',
        talkToCoachEnabled: true,
        continuationTasks: [],
        completionTasks: [],
        welcomeMessage: 'Hi',
        guidelines: 'Guidelines',
        starters: [],
      };
      expect(() => CreateExerciseInputSchema.parse(input)).not.toThrow();
    });
  });

  describe('validate helper', () => {
    it('returns validated data on success', () => {
      const user = {
        userId: 'u1',
        displayName: 'Test',
        isAdmin: false,
        isSubscriber: true,
      };
      const result = validate(UserSchema, user);
      expect(result).toEqual(user);
    });

    it('throws on invalid data', () => {
      expect(() => validate(UserSchema, {})).toThrow();
    });
  });

  describe('safeValidate helper', () => {
    it('returns success true with data on valid input', () => {
      const user = {
        userId: 'u1',
        displayName: 'Test',
        isAdmin: false,
        isSubscriber: true,
      };
      const result = safeValidate(UserSchema, user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(user);
      }
    });

    it('returns success false with error on invalid input', () => {
      const result = safeValidate(UserSchema, {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
