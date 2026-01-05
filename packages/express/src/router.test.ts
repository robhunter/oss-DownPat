import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createDownpatRouter } from './router.js';
import type { User, Exercise, ExerciseStorage, ConversationStorage, ServerAuthProvider, ExerciseMetadata } from '@downpat/core';
import { MessageType } from '@downpat/core';

const mockUser: User = {
  userId: 'user-1',
  displayName: 'Test User',
  isAdmin: false,
  isSubscriber: true,
};

const adminUser: User = {
  userId: 'admin-1',
  displayName: 'Admin User',
  isAdmin: true,
  isSubscriber: true,
};

const testExercise: Exercise = {
  exerciseId: 'ex-123',
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
  starters: ['Hello'],
};

describe('createDownpatRouter', () => {
  let app: express.Express;
  let mockExerciseStorage: ExerciseStorage;
  let mockConversationStorage: ConversationStorage;
  let mockAuthProvider: ServerAuthProvider;

  beforeEach(() => {
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

    mockConversationStorage = {
      getConversation: vi.fn(),
      createConversation: vi.fn(),
      updateConversation: vi.fn(),
      addMessage: vi.fn(),
      getConversationsByUser: vi.fn(),
      getConversationsByExercise: vi.fn(),
      deleteConversation: vi.fn(),
    };

    mockAuthProvider = {
      validateToken: vi.fn(),
      getDemoUser: vi.fn().mockReturnValue(mockUser),
    };

    const { router } = createDownpatRouter({
      serverAuth: mockAuthProvider,
      exerciseStorage: mockExerciseStorage,
      conversationStorage: mockConversationStorage,
    });

    app = express();
    app.use(express.json());
    app.use('/api', router);
  });

  describe('GET /api/health', () => {
    it('returns health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/exercises', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/exercises');

      expect(res.status).toBe(401);
    });

    it('returns exercises for authenticated user', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(mockUser);
      vi.mocked(mockExerciseStorage.getExercises).mockResolvedValue([testExercise]);

      const res = await request(app)
        .get('/api/exercises')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([testExercise]);
    });
  });

  describe('GET /api/exercises/:id', () => {
    it('returns exercise by ID', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(mockUser);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const res = await request(app)
        .get('/api/exercises/ex-123')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(testExercise);
    });

    it('returns 404 when not found', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(mockUser);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/exercises/non-existent')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/exercises', () => {
    it('creates exercise for admin', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(adminUser);

      const res = await request(app)
        .post('/api/exercises')
        .set('Authorization', 'Bearer admin-token')
        .send(testExercise);

      expect(res.status).toBe(201);
      expect(mockExerciseStorage.createExercise).toHaveBeenCalledWith(testExercise);
    });

    it('returns 403 for non-admin', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/exercises')
        .set('Authorization', 'Bearer user-token')
        .send(testExercise);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/conversations', () => {
    it('creates conversation for subscriber', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(mockUser);
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(testExercise);

      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', 'Bearer valid-token')
        .send({ exerciseId: 'ex-123' });

      expect(res.status).toBe(201);
      expect(mockConversationStorage.createConversation).toHaveBeenCalled();
    });

    it('returns 400 without exerciseId', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('exerciseId or exerciseSlug is required');
    });

    it('returns 403 for non-subscriber', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockResolvedValue({
        ...mockUser,
        isSubscriber: false,
      });

      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', 'Bearer valid-token')
        .send({ exerciseId: 'ex-123' });

      expect(res.status).toBe(403);
    });
  });
});
