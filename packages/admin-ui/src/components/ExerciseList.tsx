import React, { useState } from 'react';
import type { Exercise, ExerciseMetadata } from '@downpat/core';

export interface ExerciseWithMetadata {
  exercise: Exercise;
  metadata: ExerciseMetadata;
}

export interface ExerciseListProps {
  /** Array of exercises with their metadata */
  exercises: ExerciseWithMetadata[];
  /** Callback when edit button is clicked */
  onEdit: (exercise: Exercise) => void;
  /** Callback when test button is clicked */
  onTest?: (exercise: Exercise) => void;
  /** Callback when publish button is clicked */
  onPublish: (slug: string) => void;
  /** Callback when unpublish button is clicked */
  onUnpublish: (slug: string) => void;
  /** Callback when restore button is clicked */
  onRestore: (slug: string) => void;
  /** Callback when delete button is clicked */
  onDelete: (slug: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether actions are loading */
  isLoading?: boolean;
}

/**
 * Displays a list of exercises with admin actions.
 *
 * Requires CSS: import '@downpat/admin-ui/styles';
 */
export function ExerciseList({
  exercises,
  onEdit,
  onTest,
  onPublish,
  onUnpublish,
  onRestore,
  onDelete,
  className = '',
  isLoading = false,
}: ExerciseListProps): React.JSX.Element {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const handleDelete = (slug: string) => {
    if (confirmDelete === slug) {
      onDelete(slug);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(slug);
    }
  };

  const handleRestore = (slug: string) => {
    if (confirmRestore === slug) {
      onRestore(slug);
      setConfirmRestore(null);
    } else {
      setConfirmRestore(slug);
    }
  };

  if (exercises.length === 0) {
    return (
      <div className={`downpat-exercise-list downpat-exercise-list--empty ${className}`}>
        <p>No exercises yet</p>
        <p>Create your first exercise to get started</p>
      </div>
    );
  }

  return (
    <div className={`downpat-exercise-list ${className}`}>
      <table className="downpat-table">
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Status</th>
            <th>Model</th>
            <th className="downpat-table th--right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map(({ exercise, metadata }) => {
            const isPublished = !!metadata.published;
            const slug = exercise.slug;

            return (
              <tr key={exercise.exerciseId}>
                <td>
                  <div className="downpat-exercise-name">{exercise.exerciseName}</div>
                  <div className="downpat-exercise-slug">/{slug}</div>
                </td>
                <td>
                  <span
                    className={`downpat-status-badge ${
                      isPublished ? 'downpat-status-badge--published' : 'downpat-status-badge--draft'
                    }`}
                  >
                    {isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td>
                  <span className="downpat-exercise-model">{exercise.model}</span>
                </td>
                <td className="downpat-table td--right">
                  <div className="downpat-action-buttons">
                    <button
                      onClick={() => onEdit(exercise)}
                      disabled={isLoading}
                      className="downpat-action-btn"
                    >
                      Edit
                    </button>

                    {onTest && (
                      <button
                        onClick={() => onTest(exercise)}
                        disabled={isLoading}
                        className="downpat-action-btn downpat-action-btn--test"
                        title="Test this exercise in a conversation"
                      >
                        Test
                      </button>
                    )}

                    {isPublished ? (
                      <>
                        <button
                          onClick={() => onUnpublish(slug)}
                          disabled={isLoading}
                          className="downpat-action-btn downpat-action-btn--unpublish"
                        >
                          Unpublish
                        </button>
                        {confirmRestore === slug ? (
                          <div className="downpat-confirm-group">
                            <button
                              onClick={() => handleRestore(slug)}
                              disabled={isLoading}
                              className="downpat-action-btn downpat-action-btn--confirm-restore"
                            >
                              Confirm Restore
                            </button>
                            <button
                              onClick={() => setConfirmRestore(null)}
                              className="downpat-action-btn"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRestore(slug)}
                            disabled={isLoading}
                            className="downpat-action-btn downpat-action-btn--restore"
                            title="Restore draft from published version"
                          >
                            Restore
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => onPublish(slug)}
                        disabled={isLoading}
                        className="downpat-action-btn downpat-action-btn--publish"
                      >
                        Publish
                      </button>
                    )}

                    {confirmDelete === slug ? (
                      <div className="downpat-confirm-group">
                        <button
                          onClick={() => handleDelete(slug)}
                          disabled={isLoading}
                          className="downpat-action-btn downpat-action-btn--confirm"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="downpat-action-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(slug)}
                        disabled={isLoading}
                        className="downpat-action-btn downpat-action-btn--delete"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
