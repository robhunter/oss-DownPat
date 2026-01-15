import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DownpatClient, createDownpatClient } from './client.js';
import { DownpatAPIError } from './errors.js';

describe('DownpatClient', () => {
  const mockGetToken = vi.fn();
  let client: DownpatClient;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetToken.mockReturnValue('test-token');
    client = createDownpatClient({
      baseUrl: '/api/downpat',
      getToken: mockGetToken,
    });
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('authentication', () => {
    it('should include auth token in requests', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await client.getPublishedExercises();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/published',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle missing auth token', async () => {
      mockGetToken.mockReturnValueOnce(null);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await client.getPublishedExercises();

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });

    it('should support async token getter', async () => {
      const asyncClient = createDownpatClient({
        baseUrl: '/api/downpat',
        getToken: async () => 'async-token',
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await asyncClient.getPublishedExercises();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/published',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer async-token',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw DownpatAPIError on non-ok response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Exercise not found', code: 'NOT_FOUND' }),
      });

      await expect(client.getExercise('missing-slug')).rejects.toThrow(DownpatAPIError);
    });

    it('should include status and code in DownpatAPIError', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () =>
          Promise.resolve({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: { field: 'exerciseName' },
          }),
      });

      try {
        await client.createExercise({} as any);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DownpatAPIError);
        const apiError = error as DownpatAPIError;
        expect(apiError.status).toBe(400);
        expect(apiError.code).toBe('VALIDATION_ERROR');
        expect(apiError.details).toEqual({ field: 'exerciseName' });
        expect(apiError.isValidationError()).toBe(true);
      }
    });

    it('should handle non-JSON error responses', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'text/plain' }),
      });

      try {
        await client.getPublishedExercises();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DownpatAPIError);
        const apiError = error as DownpatAPIError;
        expect(apiError.status).toBe(500);
        expect(apiError.message).toBe('Internal Server Error');
      }
    });
  });

  describe('published exercises', () => {
    it('should get published exercises', async () => {
      const mockExercises = [
        { exerciseId: 'ex-1', exerciseName: 'Exercise 1' },
        { exerciseId: 'ex-2', exerciseName: 'Exercise 2' },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockExercises),
      });

      const result = await client.getPublishedExercises();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/published',
        expect.any(Object)
      );
      expect(result).toEqual(mockExercises);
    });

    it('should get a single published exercise', async () => {
      const mockExercise = { exerciseId: 'ex-1', exerciseName: 'Exercise 1' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockExercise),
      });

      const result = await client.getPublishedExercise('test-slug');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/published/test-slug',
        expect.any(Object)
      );
      expect(result).toEqual(mockExercise);
    });
  });

  describe('admin exercises', () => {
    it('should get exercises with metadata', async () => {
      const mockExercises = [
        {
          exercise: { exerciseId: 'ex-1', exerciseName: 'Exercise 1' },
          metadata: { slug: 'exercise-1', status: 'draft' },
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockExercises),
      });

      const result = await client.getExercisesWithMetadata();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/with-metadata',
        expect.any(Object)
      );
      expect(result).toEqual(mockExercises);
    });

    it('should create exercise', async () => {
      const newExercise = { exerciseId: 'new-1', exerciseName: 'New Exercise' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(newExercise),
      });

      const result = await client.createExercise(newExercise as any);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newExercise),
        })
      );
      expect(result).toEqual(newExercise);
    });

    it('should update exercise', async () => {
      const updates = { exerciseName: 'Updated Name' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ exerciseId: 'ex-1', ...updates }),
      });

      await client.updateExercise('ex-1', updates);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/ex-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });

    it('should delete exercise', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.deleteExercise('test-slug');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/test-slug',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should publish exercise', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.publishExercise('test-slug');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/test-slug/publish',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should unpublish exercise', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.unpublishExercise('test-slug');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/test-slug/unpublish',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should restore exercise', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.restoreExercise('test-slug');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/test-slug/restore',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('client-side slicing', () => {
    const mockExercises = Array.from({ length: 75 }, (_, i) => ({
      exercise: { exerciseId: `ex-${i}`, exerciseName: `Exercise ${i}` },
      metadata: { slug: `exercise-${i}` },
    }));

    beforeEach(() => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockExercises),
      });
    });

    it('should return sliced results with default limit', async () => {
      const result = await client.getExercisesSliced();

      expect(result.items).toHaveLength(50);
      expect(result.total).toBe(75);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(true);
    });

    it('should support custom limit and offset', async () => {
      const result = await client.getExercisesSliced({ limit: 20, offset: 60 });

      expect(result.items).toHaveLength(15); // Only 15 remaining
      expect(result.total).toBe(75);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(60);
      expect(result.hasMore).toBe(false);
    });

    it('should cache results for subsequent calls', async () => {
      await client.getExercisesSliced({ limit: 10, offset: 0 });
      await client.getExercisesSliced({ limit: 10, offset: 10 });

      // Should only fetch once due to cache
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache on mutations', async () => {
      // First fetch to populate cache
      await client.getExercisesSliced({ limit: 10, offset: 0 });
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Create triggers cache clear
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ exerciseId: 'new' }),
      });
      await client.createExercise({} as any);

      // Next fetch should hit API again
      await client.getExercisesSliced({ limit: 10, offset: 0 });
      expect(global.fetch).toHaveBeenCalledTimes(3); // original + create + refetch
    });
  });

  describe('conversations', () => {
    it('should start conversation', async () => {
      const mockConversation = { conversationId: 'conv-1' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConversation),
      });

      const result = await client.startConversation('test-slug');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/conversations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ exerciseSlug: 'test-slug' }),
        })
      );
      expect(result).toEqual(mockConversation);
    });

    it('should get conversation by ID', async () => {
      const mockConversation = { conversationId: 'conv-1' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConversation),
      });

      const result = await client.getConversation('conv-1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/conversations/conv-1',
        expect.any(Object)
      );
      expect(result).toEqual(mockConversation);
    });

    it('should get user conversations', async () => {
      const mockConversations = [{ conversationId: 'conv-1' }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockConversations),
      });

      const result = await client.getMyConversations();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/conversations',
        expect.any(Object)
      );
      expect(result).toEqual(mockConversations);
    });
  });

  describe('stats and models', () => {
    it('should get exercise stats', async () => {
      const mockStats = { total: 10, draftCount: 3, publishedCount: 7 };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockStats),
      });

      const result = await client.getExerciseStats();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/stats',
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });

    it('should get available models', async () => {
      const mockModels = ['gpt-4', 'gpt-4o', 'claude-3'];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockModels),
      });

      const result = await client.getAvailableModels();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/models',
        expect.any(Object)
      );
      expect(result).toEqual(mockModels);
    });
  });
});
