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
 */
export function ExerciseList({
  exercises,
  onEdit,
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
      <div
        className={`downpat-exercise-list ${className}`}
        style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        <p style={{ color: '#6b7280', fontSize: '16px' }}>No exercises yet</p>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>
          Create your first exercise to get started
        </p>
      </div>
    );
  }

  return (
    <div className={`downpat-exercise-list ${className}`}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={headerStyle}>Exercise</th>
            <th style={headerStyle}>Status</th>
            <th style={headerStyle}>Model</th>
            <th style={{ ...headerStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exercises.map(({ exercise, metadata }) => {
            const isPublished = !!metadata.published;
            const slug = exercise.slug;

            return (
              <tr key={exercise.exerciseId} style={rowStyle}>
                <td style={cellStyle}>
                  <div style={{ fontWeight: 500 }}>{exercise.exerciseName}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>/{slug}</div>
                </td>
                <td style={cellStyle}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: isPublished ? '#d1fae5' : '#fef3c7',
                      color: isPublished ? '#065f46' : '#92400e',
                    }}
                  >
                    {isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td style={cellStyle}>
                  <span style={{ fontSize: '13px', color: '#4b5563' }}>{exercise.model}</span>
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onEdit(exercise)}
                      disabled={isLoading}
                      style={actionButtonStyle}
                    >
                      Edit
                    </button>

                    {isPublished ? (
                      <>
                        <button
                          onClick={() => onUnpublish(slug)}
                          disabled={isLoading}
                          style={{ ...actionButtonStyle, color: '#dc2626' }}
                        >
                          Unpublish
                        </button>
                        {confirmRestore === slug ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleRestore(slug)}
                              disabled={isLoading}
                              style={{ ...actionButtonStyle, backgroundColor: '#fef3c7', color: '#92400e' }}
                            >
                              Confirm Restore
                            </button>
                            <button
                              onClick={() => setConfirmRestore(null)}
                              style={actionButtonStyle}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRestore(slug)}
                            disabled={isLoading}
                            style={{ ...actionButtonStyle, color: '#7c3aed' }}
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
                        style={{ ...actionButtonStyle, color: '#059669' }}
                      >
                        Publish
                      </button>
                    )}

                    {confirmDelete === slug ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleDelete(slug)}
                          disabled={isLoading}
                          style={{ ...actionButtonStyle, backgroundColor: '#fee2e2', color: '#dc2626' }}
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={actionButtonStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(slug)}
                        disabled={isLoading}
                        style={{ ...actionButtonStyle, color: '#dc2626' }}
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

// Styles
const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: 'white',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: '#6b7280',
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
};

const rowStyle: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
};

const cellStyle: React.CSSProperties = {
  padding: '16px',
  verticalAlign: 'middle',
};

const actionButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '13px',
  fontWeight: 500,
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  backgroundColor: 'white',
  cursor: 'pointer',
  color: '#374151',
  fontFamily: 'inherit',
};
