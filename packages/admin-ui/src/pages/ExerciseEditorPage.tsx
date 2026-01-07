import React, { useState, useEffect, useCallback } from 'react';
import type { Exercise } from '@downpat/core';
import { ExerciseForm } from '../components/ExerciseForm.js';
import { useAdminContext, useAdminAPI } from '../AdminContext.js';

export interface ExerciseEditorPageProps {
  /** Slug of exercise to edit, or undefined for new exercise */
  slug?: string;
}

/**
 * Page component for creating and editing exercises.
 */
export function ExerciseEditorPage({ slug }: ExerciseEditorPageProps): React.JSX.Element {
  const { navigate, availableModels } = useAdminContext();
  const api = useAdminAPI();

  const isNew = !slug;

  const [exercise, setExercise] = useState<Exercise | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && slug) {
      loadExercise(slug);
    }
  }, [isNew, slug]);

  const loadExercise = async (exerciseSlug: string) => {
    try {
      setError(null);
      const data = await api.getExercise(exerciseSlug);
      setExercise(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async (data: Exercise) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isNew) {
        await api.createExercise(data);
      } else {
        await api.updateExercise(data.exerciseId, data);
      }
      navigate('/exercises');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exercise');
      setIsSubmitting(false);
    }
  }, [api, isNew, navigate]);

  const handleCancel = useCallback(() => {
    navigate('/exercises');
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="downpat-admin-page">
        <div className="downpat-admin-loading">Loading exercise...</div>
      </div>
    );
  }

  return (
    <div className="downpat-admin-page">
      <div className="downpat-admin-header">
        <button
          onClick={() => navigate('/exercises')}
          className="downpat-admin-back-link"
        >
          &larr; Back to Exercises
        </button>
        <h1 className="downpat-admin-title">
          {isNew ? 'Create New Exercise' : `Edit: ${exercise?.exerciseName}`}
        </h1>
      </div>

      {error && (
        <div className="downpat-admin-error">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="downpat-admin-error-dismiss">
            Dismiss
          </button>
        </div>
      )}

      <div className="downpat-admin-form-container">
        <ExerciseForm
          exercise={exercise}
          availableModels={availableModels}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
