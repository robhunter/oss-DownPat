import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdminAPIClient, AdminAPIError } from './api-client.js';

describe('AdminAPIClient', () => {
  const mockGetAuthToken = vi.fn();
  let client: ReturnType<typeof createAdminAPIClient>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetAuthToken.mockResolvedValue('test-token');
    client = createAdminAPIClient('/api/downpat', mockGetAuthToken);
    global.fetch = vi.fn();
  });

  describe('request handling', () => {
    it('should include auth token in requests', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await client.getExercises();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/downpat/exercises/with-metadata',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle missing auth token', async () => {
      mockGetAuthToken.mockResolvedValueOnce(null);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await client.getExercises();

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw AdminAPIError on non-ok response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Exercise not found', code: 'NOT_FOUND' }),
      });

      await expect(client.getExercise('missing-slug')).rejects.toThrow(AdminAPIError);
    });

    it('should include status and code in AdminAPIError', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: { field: 'exerciseName' },
        }),
      });

      try {
        await client.createExercise({} as any);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AdminAPIError);
        const apiError = error as AdminAPIError;
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
        await client.getExercises();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AdminAPIError);
        const apiError = error as AdminAPIError;
        expect(apiError.status).toBe(500);
        expect(apiError.message).toBe('Internal Server Error');
      }
    });

    it('should provide helper methods for common status codes', async () => {
      const error = new AdminAPIError({
        message: 'Not found',
        status: 404,
      });

      expect(error.isNotFound()).toBe(true);
      expect(error.isUnauthorized()).toBe(false);
      expect(error.isForbidden()).toBe(false);
      expect(error.isValidationError()).toBe(false);
      expect(error.isStatus(404)).toBe(true);
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
  });

  describe('CRUD operations', () => {
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
});
