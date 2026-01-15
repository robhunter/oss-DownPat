import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the client module before importing hooks
const mockClient = {
  getPublishedExercises: vi.fn(),
  getExercisesWithMetadata: vi.fn(),
  getExercise: vi.fn(),
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
  publishExercise: vi.fn(),
  unpublishExercise: vi.fn(),
  deleteExercise: vi.fn(),
  restoreExercise: vi.fn(),
  getExerciseStats: vi.fn(),
  getAvailableModels: vi.fn(),
};

vi.mock('../client/index.js', () => ({
  getDownpatClient: vi.fn(() => mockClient),
}));

// Import after mocking
import {
  usePublishedExercises,
  useExerciseAdmin,
  useExerciseEditor,
  useExerciseStats,
  useAvailableModels,
} from './index.js';

describe('usePublishedExercises', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch exercises on mount', async () => {
    const mockExercises = [
      { exerciseId: 'ex-1', exerciseName: 'Exercise 1' },
      { exerciseId: 'ex-2', exerciseName: 'Exercise 2' },
    ];
    mockClient.getPublishedExercises.mockResolvedValueOnce(mockExercises);

    const { result } = renderHook(() => usePublishedExercises());

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.exercises).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.exercises).toEqual(mockExercises);
    expect(result.current.error).toBeNull();
    expect(mockClient.getPublishedExercises).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    mockClient.getPublishedExercises.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePublishedExercises());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.exercises).toEqual([]);
  });

  it('should handle non-Error exceptions', async () => {
    mockClient.getPublishedExercises.mockRejectedValueOnce('String error');

    const { result } = renderHook(() => usePublishedExercises());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load exercises');
  });

  it('should refetch when refetch is called', async () => {
    const initialExercises = [{ exerciseId: 'ex-1', exerciseName: 'Exercise 1' }];
    const updatedExercises = [
      { exerciseId: 'ex-1', exerciseName: 'Exercise 1' },
      { exerciseId: 'ex-2', exerciseName: 'Exercise 2' },
    ];

    mockClient.getPublishedExercises
      .mockResolvedValueOnce(initialExercises)
      .mockResolvedValueOnce(updatedExercises);

    const { result } = renderHook(() => usePublishedExercises());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.exercises).toEqual(initialExercises);

    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.exercises).toEqual(updatedExercises);
    expect(mockClient.getPublishedExercises).toHaveBeenCalledTimes(2);
  });
});

describe('useExerciseAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch exercises with metadata on mount', async () => {
    const mockExercises = [
      {
        exercise: { exerciseId: 'ex-1', exerciseName: 'Exercise 1' },
        metadata: { slug: 'exercise-1', status: 'draft' },
      },
    ];
    mockClient.getExercisesWithMetadata.mockResolvedValueOnce(mockExercises);

    const { result } = renderHook(() => useExerciseAdmin());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.exercises).toEqual(mockExercises);
    expect(result.current.error).toBeNull();
  });

  it('should publish exercise and refetch', async () => {
    const initialExercises = [
      {
        exercise: { exerciseId: 'ex-1' },
        metadata: { slug: 'exercise-1', status: 'draft' },
      },
    ];
    const updatedExercises = [
      {
        exercise: { exerciseId: 'ex-1' },
        metadata: { slug: 'exercise-1', status: 'published' },
      },
    ];

    mockClient.getExercisesWithMetadata
      .mockResolvedValueOnce(initialExercises)
      .mockResolvedValueOnce(updatedExercises);
    mockClient.publishExercise.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useExerciseAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.publishExercise('exercise-1');
    });

    expect(mockClient.publishExercise).toHaveBeenCalledWith('exercise-1');
    expect(mockClient.getExercisesWithMetadata).toHaveBeenCalledTimes(2);
    expect(result.current.exercises).toEqual(updatedExercises);
  });

  it('should unpublish exercise and refetch', async () => {
    mockClient.getExercisesWithMetadata.mockResolvedValue([]);
    mockClient.unpublishExercise.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useExerciseAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.unpublishExercise('exercise-1');
    });

    expect(mockClient.unpublishExercise).toHaveBeenCalledWith('exercise-1');
  });

  it('should delete exercise and refetch', async () => {
    mockClient.getExercisesWithMetadata.mockResolvedValue([]);
    mockClient.deleteExercise.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useExerciseAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteExercise('exercise-1');
    });

    expect(mockClient.deleteExercise).toHaveBeenCalledWith('exercise-1');
  });

  it('should restore exercise and refetch', async () => {
    mockClient.getExercisesWithMetadata.mockResolvedValue([]);
    mockClient.restoreExercise.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useExerciseAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.restoreExercise('exercise-1');
    });

    expect(mockClient.restoreExercise).toHaveBeenCalledWith('exercise-1');
  });

  it('should handle fetch errors', async () => {
    mockClient.getExercisesWithMetadata.mockRejectedValueOnce(new Error('Admin error'));

    const { result } = renderHook(() => useExerciseAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Admin error');
  });
});

describe('useExerciseEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('new exercise mode', () => {
    it('should start with no exercise and not loading for new exercise', () => {
      const { result } = renderHook(() => useExerciseEditor(undefined));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.exercise).toBeUndefined();
      expect(result.current.isNew).toBe(true);
    });

    it('should create new exercise on save', async () => {
      const newExercise = { exerciseId: 'new-1', exerciseName: 'New Exercise' };
      mockClient.createExercise.mockResolvedValueOnce(newExercise);

      const { result } = renderHook(() => useExerciseEditor(undefined));

      let success: boolean = false;
      await act(async () => {
        success = await result.current.saveExercise(newExercise as any);
      });

      expect(success).toBe(true);
      expect(mockClient.createExercise).toHaveBeenCalledWith(newExercise);
      expect(mockClient.updateExercise).not.toHaveBeenCalled();
    });
  });

  describe('edit exercise mode', () => {
    it('should fetch exercise on mount when slug provided', async () => {
      const mockExercise = { exerciseId: 'ex-1', exerciseName: 'Existing Exercise' };
      mockClient.getExercise.mockResolvedValueOnce(mockExercise);

      const { result } = renderHook(() => useExerciseEditor('existing-exercise'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isNew).toBe(false);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.exercise).toEqual(mockExercise);
      expect(mockClient.getExercise).toHaveBeenCalledWith('existing-exercise');
    });

    it('should update exercise on save', async () => {
      const existingExercise = { exerciseId: 'ex-1', exerciseName: 'Existing' };
      const updatedExercise = { exerciseId: 'ex-1', exerciseName: 'Updated' };

      mockClient.getExercise.mockResolvedValueOnce(existingExercise);
      mockClient.updateExercise.mockResolvedValueOnce(updatedExercise);

      const { result } = renderHook(() => useExerciseEditor('existing'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.saveExercise(updatedExercise as any);
      });

      expect(success).toBe(true);
      expect(mockClient.updateExercise).toHaveBeenCalledWith('ex-1', updatedExercise);
      expect(mockClient.createExercise).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      mockClient.getExercise.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useExerciseEditor('missing'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Not found');
      expect(result.current.exercise).toBeUndefined();
    });

    it('should handle save error', async () => {
      const existingExercise = { exerciseId: 'ex-1', exerciseName: 'Existing' };
      mockClient.getExercise.mockResolvedValueOnce(existingExercise);
      mockClient.updateExercise.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useExerciseEditor('existing'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.saveExercise(existingExercise as any);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Save failed');
    });

    it('should track isSubmitting state during save', async () => {
      const existingExercise = { exerciseId: 'ex-1', exerciseName: 'Existing' };
      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      mockClient.getExercise.mockResolvedValueOnce(existingExercise);
      mockClient.updateExercise.mockReturnValueOnce(updatePromise);

      const { result } = renderHook(() => useExerciseEditor('existing'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSubmitting).toBe(false);

      // Start save without awaiting
      act(() => {
        result.current.saveExercise(existingExercise as any);
      });

      // Should be submitting
      expect(result.current.isSubmitting).toBe(true);

      // Resolve the update
      await act(async () => {
        resolveUpdate!(existingExercise);
        await updatePromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });
});

describe('useExerciseStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch stats on mount', async () => {
    const mockStats = { total: 10, draftCount: 3, publishedCount: 7 };
    mockClient.getExerciseStats.mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useExerciseStats());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    mockClient.getExerciseStats.mockRejectedValueOnce(new Error('Stats error'));

    const { result } = renderHook(() => useExerciseStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Stats error');
    expect(result.current.stats).toBeNull();
  });

  it('should refetch stats when refetch called', async () => {
    const initialStats = { total: 10, draftCount: 3, publishedCount: 7 };
    const updatedStats = { total: 12, draftCount: 4, publishedCount: 8 };

    mockClient.getExerciseStats
      .mockResolvedValueOnce(initialStats)
      .mockResolvedValueOnce(updatedStats);

    const { result } = renderHook(() => useExerciseStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(initialStats);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.stats).toEqual(updatedStats);
    expect(mockClient.getExerciseStats).toHaveBeenCalledTimes(2);
  });
});

describe('useAvailableModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch models on mount', async () => {
    const mockModels = ['gpt-4', 'gpt-4o', 'claude-3'];
    mockClient.getAvailableModels.mockResolvedValueOnce(mockModels);

    const { result } = renderHook(() => useAvailableModels());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.models).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models).toEqual(mockModels);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    mockClient.getAvailableModels.mockRejectedValueOnce(new Error('Models error'));

    const { result } = renderHook(() => useAvailableModels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Models error');
    expect(result.current.models).toEqual([]);
  });

  it('should handle non-Error exceptions', async () => {
    mockClient.getAvailableModels.mockRejectedValueOnce({ code: 'UNKNOWN' });

    const { result } = renderHook(() => useAvailableModels());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load models');
  });
});
