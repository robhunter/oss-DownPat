import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise } from '@downpat/core';
import { ExerciseForm } from '../components/ExerciseForm.js';
import { useAdminContext, useAdminAPI } from '../AdminContext.js';
import type { ExerciseMetadata } from '../api-client.js';

/** Toast notification state */
interface Toast {
  message: string;
  type: 'success' | 'error';
}

/** Auto-dismissing toast notification rendered in a portal at document body */
function ToastNotification({ message, type, onClose }: Toast & { onClose: () => void }): React.JSX.Element | null {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Render in a portal to escape any parent z-index/overflow constraints
  return createPortal(
    <div className="downpat-toast-container">
      <div className={`downpat-toast downpat-toast--${type}`}>
        <span>{message}</span>
        <button onClick={onClose} className="downpat-toast-close" aria-label="Dismiss">
          &times;
        </button>
      </div>
    </div>,
    document.body
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
  const { navigate, availableModels, onTestExercise } = useAdminContext();
  const api = useAdminAPI();

  // Track whether we're creating vs editing - starts based on slug prop
  // but switches to false once we've successfully created
  const [isNew, setIsNew] = useState(!slug);

  const [exercise, setExercise] = useState<Exercise | undefined>(undefined);
  const [metadata, setMetadata] = useState<ExerciseMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(!!slug);
  // Counter to force form remount when exercise data is externally reset (e.g., restore)
  const [formKey, setFormKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | 'restore' | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  // Helper to fetch exercise data (used by loadExercise and handleRestore)
  const fetchExerciseData = useCallback(async (exerciseSlug: string) => {
    const [data, meta] = await Promise.all([
      api.getExercise(exerciseSlug),
      api.getExerciseMetadata(exerciseSlug),
    ]);
    return { exercise: data, metadata: meta };
  }, [api]);

  const loadExercise = useCallback(async (exerciseSlug: string) => {
    try {
      setError(null);
      const { exercise: data, metadata: meta } = await fetchExerciseData(exerciseSlug);
      setExercise(data);
      setMetadata(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise');
    } finally {
      setIsLoading(false);
    }
  }, [fetchExerciseData]);

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
        // Switch to edit mode after successful create
        setIsNew(false);
      } else {
        await api.updateExercise(data.exerciseId, data);
      }
      setToast({ message: 'Exercise saved successfully', type: 'success' });
      // Update local exercise state to reflect saved data
      setExercise(data);
      // Refresh metadata so publish actions reflect current state
      const meta = await api.getExerciseMetadata(data.slug);
      setMetadata(meta);
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

  const handlePublish = useCallback(async () => {
    if (!slug) return;
    setIsActionPending(true);
    setError(null);
    try {
      await api.publishExercise(slug);
      setToast({ message: 'Exercise published successfully', type: 'success' });
      // Reload metadata to reflect new state
      const meta = await api.getExerciseMetadata(slug);
      setMetadata(meta);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish exercise';
      setError(message);
      setToast({ message, type: 'error' });
    } finally {
      setIsActionPending(false);
      setConfirmAction(null);
    }
  }, [api, slug]);

  const handleUnpublish = useCallback(async () => {
    if (!slug) return;
    setIsActionPending(true);
    setError(null);
    try {
      await api.unpublishExercise(slug);
      setToast({ message: 'Exercise unpublished successfully', type: 'success' });
      // Reload metadata to reflect new state
      const meta = await api.getExerciseMetadata(slug);
      setMetadata(meta);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unpublish exercise';
      setError(message);
      setToast({ message, type: 'error' });
    } finally {
      setIsActionPending(false);
      setConfirmAction(null);
    }
  }, [api, slug]);

  const handleRestore = useCallback(async () => {
    if (!slug) return;
    setIsActionPending(true);
    setError(null);
    try {
      await api.restoreExercise(slug);
      const { exercise: data, metadata: meta } = await fetchExerciseData(slug);
      // Update all state together to ensure form remounts with new data
      setExercise(data);
      setMetadata(meta);
      setFormKey((k) => k + 1);
      setToast({ message: 'Exercise restored from published version', type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore exercise';
      setError(message);
      setToast({ message, type: 'error' });
    } finally {
      setIsActionPending(false);
      setConfirmAction(null);
    }
  }, [api, slug, fetchExerciseData]);

  const executeConfirmedAction = useCallback(() => {
    switch (confirmAction) {
      case 'publish':
        handlePublish();
        break;
      case 'unpublish':
        handleUnpublish();
        break;
      case 'restore':
        handleRestore();
        break;
    }
  }, [confirmAction, handlePublish, handleUnpublish, handleRestore]);

  // Derived state for button visibility
  const hasDraft = metadata?.draft != null;
  const hasPublished = metadata?.published != null;
  const canPublish = hasDraft;
  const canUnpublish = hasPublished;
  const canRestore = hasDraft && hasPublished;

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

      {/* Actions - only shown when editing */}
      {!isNew && exercise && (
        <div className="downpat-publish-actions">
          {onTestExercise && (
            <button
              type="button"
              onClick={() => onTestExercise(exercise.exerciseId, exercise.slug)}
              className="downpat-btn downpat-btn--secondary"
              title="Test this exercise in a conversation"
            >
              Test
            </button>
          )}
          {metadata && canPublish && (
            <button
              type="button"
              onClick={() => setConfirmAction('publish')}
              disabled={isActionPending}
              className="downpat-btn downpat-btn--warning"
            >
              Publish
            </button>
          )}
          {metadata && canUnpublish && (
            <button
              type="button"
              onClick={() => setConfirmAction('unpublish')}
              disabled={isActionPending}
              className="downpat-btn downpat-btn--warning"
            >
              Unpublish
            </button>
          )}
          {metadata && canRestore && (
            <button
              type="button"
              onClick={() => setConfirmAction('restore')}
              disabled={isActionPending}
              className="downpat-btn downpat-btn--destructive"
            >
              Restore from Published
            </button>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="downpat-modal-overlay">
          <div className="downpat-modal">
            <h3 className="downpat-modal-title">
              {confirmAction === 'publish' && 'Publish Exercise?'}
              {confirmAction === 'unpublish' && 'Unpublish Exercise?'}
              {confirmAction === 'restore' && 'Restore from Published?'}
            </h3>
            <p className="downpat-modal-message">
              {confirmAction === 'publish' &&
                'This will make the current draft available to all users. The draft will be deleted.'}
              {confirmAction === 'unpublish' &&
                'This will remove the exercise from public view. A new draft will be created from the published version.'}
              {confirmAction === 'restore' &&
                'This will discard the current draft and replace it with the published version. This action cannot be undone.'}
            </p>
            <div className="downpat-modal-actions">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isActionPending}
                className="downpat-btn downpat-btn--secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                disabled={isActionPending}
                className={`downpat-btn ${confirmAction === 'restore' ? 'downpat-btn--destructive' : 'downpat-btn--warning'}`}
              >
                {isActionPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="downpat-admin-form-container">
        <ExerciseForm
          key={formKey}
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
