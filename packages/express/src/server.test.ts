import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type {
  ExerciseStorage,
  ConversationStorage,
  ServerAuthProvider,
  Exercise,
  ExerciseMetadata,
} from '@downpat/core';
import { createDownpatServer } from './server.js';

// Mock ServerAuthProvider
const createMockAuthProvider = (): ServerAuthProvider => ({
  validateToken: vi.fn().mockResolvedValue({
    userId: 'test-user',
    displayName: 'Test User',
    isAdmin: true,
    isSubscriber: true,
  }),
});

// Mock ExerciseStorage
const createMockExerciseStorage = (): ExerciseStorage => ({
  getExercise: vi.fn(),
  getExerciseBySlug: vi.fn(),
  getExercises: vi.fn().mockResolvedValue([]),
  getExercisesWithMetadata: vi.fn().mockResolvedValue([]),
  getPublishedExercises: vi.fn().mockResolvedValue([]),
  getExerciseMetadata: vi.fn(),
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
  publishExercise: vi.fn(),
  unpublishExercise: vi.fn(),
  restoreFromPublished: vi.fn(),
  deleteExercise: vi.fn(),
});

// Mock ConversationStorage
const createMockConversationStorage = (): ConversationStorage => ({
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  getUserConversations: vi.fn().mockResolvedValue([]),
  addMessage: vi.fn(),
  updateConversation: vi.fn(),
  deleteConversation: vi.fn(),
});

describe('createDownpatServer', () => {
  let app: express.Express;
  let mockAuthProvider: ServerAuthProvider;
  let mockExerciseStorage: ExerciseStorage;
  let mockConversationStorage: ConversationStorage;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockAuthProvider = createMockAuthProvider();
    mockExerciseStorage = createMockExerciseStorage();
    mockConversationStorage = createMockConversationStorage();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create server with default mount path', () => {
    const result = createDownpatServer(app, {
      serverAuth: mockAuthProvider,
      exerciseStorage: mockExerciseStorage,
      conversationStorage: mockConversationStorage,
    });

    expect(result.httpServer).toBeDefined();
    expect(result.io).toBeDefined();
    expect(result.router).toBeDefined();
    expect(result.availableModels).toEqual([]);
  });

  it('should return provided available models', () => {
    const models = ['gpt-4', 'gpt-4o', 'claude-3-opus'];
    const result = createDownpatServer(app, {
      serverAuth: mockAuthProvider,
      exerciseStorage: mockExerciseStorage,
      conversationStorage: mockConversationStorage,
      availableModels: models,
    });

    expect(result.availableModels).toEqual(models);
  });

  describe('GET /models endpoint', () => {
    it('should return available models', async () => {
      const models = ['gpt-4', 'claude-3-opus'];
      createDownpatServer(app, {
        serverAuth: mockAuthProvider,
        exerciseStorage: mockExerciseStorage,
        conversationStorage: mockConversationStorage,
        availableModels: models,
      });

      const response = await request(app)
        .get('/api/downpat/models')
        .expect(200);

      expect(response.body).toEqual({ models });
    });

    it('should return empty array when no models configured', async () => {
      createDownpatServer(app, {
        serverAuth: mockAuthProvider,
        exerciseStorage: mockExerciseStorage,
        conversationStorage: mockConversationStorage,
      });

      const response = await request(app)
        .get('/api/downpat/models')
        .expect(200);

      expect(response.body).toEqual({ models: [] });
    });

    it('should work with custom mount path', async () => {
      createDownpatServer(app, {
        serverAuth: mockAuthProvider,
        exerciseStorage: mockExerciseStorage,
        conversationStorage: mockConversationStorage,
        availableModels: ['gpt-4'],
        mountPath: '/custom/api',
      });

      const response = await request(app)
        .get('/custom/api/models')
        .expect(200);

      expect(response.body).toEqual({ models: ['gpt-4'] });
    });
  });

  describe('GET /stats endpoint', () => {
    it('should return exercise statistics', async () => {
      const mockExercisesWithMetadata: Array<{ exercise: Exercise; metadata: ExerciseMetadata }> = [
        {
          exercise: { exerciseId: '1', exerciseName: 'Test 1', slug: 'test-1', guidelines: '' },
          metadata: { draft: '1', published: '1-published' },
        },
        {
          exercise: { exerciseId: '2', exerciseName: 'Test 2', slug: 'test-2', guidelines: '' },
          metadata: { draft: '2', published: null },
        },
        {
          exercise: { exerciseId: '3', exerciseName: 'Test 3', slug: 'test-3', guidelines: '' },
          metadata: { draft: '3', published: '3-published' },
        },
      ];

      vi.mocked(mockExerciseStorage.getExercisesWithMetadata).mockResolvedValue(mockExercisesWithMetadata);

      createDownpatServer(app, {
        serverAuth: mockAuthProvider,
        exerciseStorage: mockExerciseStorage,
        conversationStorage: mockConversationStorage,
      });

      const response = await request(app)
        .get('/api/downpat/stats')
        .expect(200);

      expect(response.body).toEqual({
        total: 3,
        published: 2,
        draft: 1,
      });
    });

    it('should return zeros when no exercises', async () => {
      vi.mocked(mockExerciseStorage.getExercisesWithMetadata).mockResolvedValue([]);

      createDownpatServer(app, {
        serverAuth: mockAuthProvider,
        exerciseStorage: mockExerciseStorage,
        conversationStorage: mockConversationStorage,
      });

      const response = await request(app)
        .get('/api/downpat/stats')
        .expect(200);

      expect(response.body).toEqual({
        total: 0,
        published: 0,
        draft: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockExerciseStorage.getExercisesWithMetadata).mockRejectedValue(
        new Error('Database connection failed')
      );

      createDownpatServer(app, {
        serverAuth: mockAuthProvider,
        exerciseStorage: mockExerciseStorage,
        conversationStorage: mockConversationStorage,
      });

      const response = await request(app)
        .get('/api/downpat/stats')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Database connection failed',
      });
    });
  });

  describe('health endpoint', () => {
    it('should return health status', async () => {
      createDownpatServer(app, {
        serverAuth: mockAuthProvider,
        exerciseStorage: mockExerciseStorage,
        conversationStorage: mockConversationStorage,
      });

      const response = await request(app)
        .get('/api/downpat/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
