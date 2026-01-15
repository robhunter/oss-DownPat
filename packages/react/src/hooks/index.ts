import { useState, useEffect, useCallback } from 'react';
import type { Exercise } from '@downpat/core';
import { getDownpatClient, type ExerciseWithMetadata } from '../client/index.js';

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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getDownpatClient();
      const data = await client.getPublishedExercises();
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  const [exercises, setExercises] = useState<ExerciseWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getDownpatClient();
      const data = await client.getExercisesWithMetadata();
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const publishExercise = useCallback(async (slug: string) => {
    const client = getDownpatClient();
    await client.publishExercise(slug);
    await refetch();
  }, [refetch]);

  const unpublishExercise = useCallback(async (slug: string) => {
    const client = getDownpatClient();
    await client.unpublishExercise(slug);
    await refetch();
  }, [refetch]);

  const deleteExercise = useCallback(async (slug: string) => {
    const client = getDownpatClient();
    await client.deleteExercise(slug);
    await refetch();
  }, [refetch]);

  const restoreExercise = useCallback(async (slug: string) => {
    const client = getDownpatClient();
    await client.restoreExercise(slug);
    await refetch();
  }, [refetch]);

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
  const [exercise, setExercise] = useState<Exercise | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!!slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !slug;

  useEffect(() => {
    if (slug) {
      loadExercise(slug);
    }
  }, [slug]);

  const loadExercise = async (exerciseSlug: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getDownpatClient();
      const data = await client.getExercise(exerciseSlug);
      setExercise(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise');
    } finally {
      setIsLoading(false);
    }
  };

  const saveExercise = useCallback(async (data: Exercise): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const client = getDownpatClient();
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
  }, [isNew]);

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
      const client = getDownpatClient();
      const data = await client.getExerciseStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, isLoading, error, refetch };
}

/**
 * Hook for fetching available AI models.
 */
export function useAvailableModels() {
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const client = getDownpatClient();
        const data = await client.getAvailableModels();
        setModels(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setIsLoading(false);
      }
    };
    fetchModels();
  }, []);

  return { models, isLoading, error };
}
