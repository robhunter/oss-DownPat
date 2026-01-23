import React, { useState, useEffect, useCallback } from 'react';
import { ExerciseList } from '../components/ExerciseList.js';
import { useAdminContext, useAdminAPI } from '../AdminContext.js';
import type { ExerciseWithMetadata } from '../api-client.js';

/**
 * Page component for listing and managing exercises.
 */
export function ExerciseListPage(): React.JSX.Element {
  const { navigate, onTestExercise } = useAdminContext();
  const api = useAdminAPI();

  const [exercises, setExercises] = useState<ExerciseWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadExercises = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getExercises();
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleEdit = useCallback((exercise: { slug: string }) => {
    navigate(`/exercises/${exercise.slug}/edit`);
  }, [navigate]);

  const handleTest = useCallback((exercise: { exerciseId: string; slug: string }) => {
    if (onTestExercise) {
      onTestExercise(exercise.exerciseId, exercise.slug);
    }
  }, [onTestExercise]);

  const handleDelete = useCallback(async (slug: string) => {
    setActionLoading(true);
    try {
      await api.deleteExercise(slug);
      await loadExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setActionLoading(false);
    }
  }, [api, loadExercises]);

  if (isLoading) {
    return (
      <div className="downpat-admin-page">
        <div className="downpat-admin-loading">Loading exercises...</div>
      </div>
    );
  }

  return (
    <div className="downpat-admin-page">
      <div className="downpat-admin-header">
        <h1 className="downpat-admin-title">Exercises</h1>
        <button
          onClick={() => navigate('/exercises/new')}
          className="downpat-btn downpat-btn--primary"
        >
          Create Exercise
        </button>
      </div>

      {error && (
        <div className="downpat-admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="downpat-admin-error-dismiss">
            Dismiss
          </button>
        </div>
      )}

      <ExerciseList
        exercises={exercises}
        onEdit={handleEdit}
        onTest={onTestExercise ? handleTest : undefined}
        onDelete={handleDelete}
        isLoading={actionLoading}
      />
    </div>
  );
}
