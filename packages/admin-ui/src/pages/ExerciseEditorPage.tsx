import React, { useState, useEffect, useCallback } from 'react';
import type { Exercise } from '@downpat/core';
import { ExerciseForm } from '../components/ExerciseForm.js';
import { useAdminContext, useAdminAPI } from '../AdminContext.js';

/** Toast notification state */
interface Toast {
  message: string;
  type: 'success' | 'error';
}

/** Auto-dismissing toast notification */
function ToastNotification({ message, type, onClose }: Toast & { onClose: () => void }): React.JSX.Element {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`downpat-toast downpat-toast--${type}`}>
      <span>{message}</span>
      <button onClick={onClose} className="downpat-toast-close" aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}

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
  const [toast, setToast] = useState<Toast | null>(null);

  const loadExercise = useCallback(async (exerciseSlug: string) => {
    try {
      setError(null);
      const data = await api.getExercise(exerciseSlug);
      setExercise(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!isNew && slug) {
      loadExercise(slug);
    }
  }, [isNew, slug, loadExercise]);

  const handleSubmit = useCallback(async (data: Exercise) => {
    setIsSubmitting(true);
    setError(null);
    setToast(null);

    try {
      if (isNew) {
        await api.createExercise(data);
      } else {
        await api.updateExercise(data.exerciseId, data);
      }
      setToast({ message: 'Exercise saved successfully', type: 'success' });
      // Update local exercise state to reflect saved data
      setExercise(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save exercise';
      setError(message);
      setToast({ message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [api, isNew]);

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

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
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
