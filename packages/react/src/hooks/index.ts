import { useState, useEffect, useCallback, useContext } from 'react';
import type { Exercise } from '@downpat/core';
import {
  getDownpatClient,
  DownpatContext,
  type ExerciseWithMetadata,
  type DownpatClient,
} from '../client/index.js';

/**
 * Internal hook to get the client from context or fall back to singleton.
 * Prefers context when available for proper dependency injection.
 */
function useClient(): DownpatClient {
  const context = useContext(DownpatContext);
  // If we have context, use it. Otherwise fall back to singleton.
  if (context) {
    return context.client;
  }
  return getDownpatClient();
}

/**
 * Hook for fetching published exercises.
 *
 * @example
 * ```tsx
 * function ExerciseBrowser() {
 *   const { exercises, isLoading, error, refetch } = usePublishedExercises();
 *
 *   if (isLoading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error}</p>;
 *
 *   return exercises.map(e => <ExerciseCard key={e.exerciseId} exercise={e} />);
 * }
 * ```
 */
export function usePublishedExercises() {
  const client = useClient();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.getPublishedExercises();
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { exercises, isLoading, error, refetch };
}

/**
 * Hook for admin exercise management.
 *
 * Provides CRUD operations for exercises with automatic state management.
 */
export function useExerciseAdmin() {
  const client = useClient();
  const [exercises, setExercises] = useState<ExerciseWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.getExercisesWithMetadata();
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const publishExercise = useCallback(async (slug: string) => {
    await client.publishExercise(slug);
    await refetch();
  }, [client, refetch]);

  const unpublishExercise = useCallback(async (slug: string) => {
    await client.unpublishExercise(slug);
    await refetch();
  }, [client, refetch]);

  const deleteExercise = useCallback(async (slug: string) => {
    await client.deleteExercise(slug);
    await refetch();
  }, [client, refetch]);

  const restoreExercise = useCallback(async (slug: string) => {
    await client.restoreExercise(slug);
    await refetch();
  }, [client, refetch]);

  return {
    exercises,
    isLoading,
    error,
    refetch,
    publishExercise,
    unpublishExercise,
    deleteExercise,
    restoreExercise,
  };
}

/**
 * Hook for editing a single exercise.
 *
 * @param slug - Exercise slug (undefined for new exercise)
 */
export function useExerciseEditor(slug: string | undefined) {
  const client = useClient();
  const [exercise, setExercise] = useState<Exercise | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!!slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !slug;

  useEffect(() => {
    if (slug) {
      const loadExercise = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const data = await client.getExercise(slug);
          setExercise(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load exercise');
        } finally {
          setIsLoading(false);
        }
      };
      loadExercise();
    }
  }, [slug, client]);

  const saveExercise = useCallback(async (data: Exercise): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (isNew) {
        await client.createExercise(data);
      } else {
        await client.updateExercise(data.exerciseId, data);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exercise');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [client, isNew]);

  return {
    exercise,
    isLoading,
    isSubmitting,
    error,
    isNew,
    saveExercise,
  };
}

/**
 * Hook for fetching exercise statistics (admin dashboard).
 */
export function useExerciseStats() {
  const client = useClient();
  const [stats, setStats] = useState<{
    total: number;
    draftCount: number;
    publishedCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.getExerciseStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, isLoading, error, refetch };
}

/**
 * Hook for fetching available AI models.
 */
export function useAvailableModels() {
  const client = useClient();
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await client.getAvailableModels();
        setModels(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setIsLoading(false);
      }
    };
    fetchModels();
  }, [client]);

  return { models, isLoading, error };
}
