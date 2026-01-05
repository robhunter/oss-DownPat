import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ExerciseForm } from '@downpat/admin-ui';
import { getAPI } from '../../lib/api';
import type { Exercise } from '@downpat/core';

export function ExerciseEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = !slug || slug === 'new';

  const [exercise, setExercise] = useState<Exercise | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available models (from AI adapters)
  const availableModels = ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'];

  useEffect(() => {
    if (!isNew && slug) {
      loadExercise(slug);
    }
  }, [isNew, slug]);

  const loadExercise = async (exerciseSlug: string) => {
    try {
      const api = getAPI();
      const data = await api.getExercise(exerciseSlug);
      setExercise(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: Exercise) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const api = getAPI();

      if (isNew) {
        // Create new exercise - pass the Exercise directly
        await api.createExercise(data);
      } else {
        // Update existing exercise
        await api.updateExercise(data.exerciseId, data);
      }

      navigate('/admin/exercises');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exercise');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/exercises');
  };

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <p>Loading exercise...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/admin/exercises" style={styles.backLink}>
          ← Back to Exercises
        </Link>
        <h1 style={styles.title}>
          {isNew ? 'Create New Exercise' : `Edit: ${exercise?.exerciseName}`}
        </h1>
      </div>

      {error && (
        <div style={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <div style={styles.formContainer}>
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px 0',
    maxWidth: '800px',
  },
  header: {
    marginBottom: '24px',
  },
  backLink: {
    color: 'var(--downpat-primary-600, #2563eb)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    display: 'inline-block',
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: 'var(--downpat-neutral-900, #111827)',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 0',
    color: 'var(--downpat-neutral-500, #6b7280)',
  },
  error: {
    backgroundColor: 'var(--downpat-danger-50, #fef2f2)',
    color: 'var(--downpat-danger-700, #b91c1c)',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
};
