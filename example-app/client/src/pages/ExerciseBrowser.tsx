import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAPI } from '../lib/api';
import type { Exercise } from '@downpat/core';

/**
 * =============================================================================
 * MOVE TO: @downpat/ui-components (page component)
 *          @downpat/react (hooks, route config)
 *
 * This entire page component should be provided by DownPat as <ExerciseBrowserPage />.
 * The data fetching, loading states, error handling, and grid display are all
 * DownPat-specific and not customizable per app.
 *
 * Page component lives in @downpat/ui-components:
 *   import { ExerciseBrowserPage } from '@downpat/ui-components';
 *
 * But apps won't import it directly - they'll use createDownpatRoutes() from
 * @downpat/react which wires everything up automatically.
 * =============================================================================
 */
export function ExerciseBrowser() {
  /**
   * MOVE TO: @downpat/react (as a React hook)
   * This loading/error/data pattern should be a hook:
   *   const { exercises, isLoading, error, refetch } = usePublishedExercises();
   */
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const api = getAPI();
      const data = await api.getPublishedExercises();
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <p>Loading exercises...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>{error}</p>
        <button onClick={loadExercises} style={styles.retryBtn}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Practice Exercises</h1>
        <p style={styles.subtitle}>
          Choose an exercise to start practicing your conversational skills
        </p>
      </div>

      {exercises.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📚</div>
          <h2 style={styles.emptyTitle}>No Exercises Available</h2>
          <p style={styles.emptyText}>
            No exercises have been published yet. Check back later or contact an administrator.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {exercises.map((exercise) => (
            <div key={exercise.exerciseId} style={styles.card}>
              <h3 style={styles.cardTitle}>{exercise.exerciseName}</h3>
              <p style={styles.cardDesc}>{exercise.welcomeMessage}</p>

              <div style={styles.cardMeta}>
                <span style={styles.cardModel}>{exercise.model}</span>
                {exercise.talkToCoachEnabled && (
                  <span style={styles.coachBadge}>Coach Available</span>
                )}
              </div>

              <Link to={`/exercises/${exercise.slug}`} style={styles.startBtn}>
                Start Practice
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px 0',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'var(--downpat-neutral-900, #111827)',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--downpat-neutral-600, #4b5563)',
    fontSize: '1.125rem',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 0',
    color: 'var(--downpat-neutral-500, #6b7280)',
  },
  error: {
    textAlign: 'center',
    padding: '60px 0',
    color: 'var(--downpat-danger-600, #dc2626)',
  },
  retryBtn: {
    marginTop: '16px',
    padding: '8px 24px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--downpat-neutral-700, #374151)',
    marginBottom: '8px',
  },
  emptyText: {
    color: 'var(--downpat-neutral-500, #6b7280)',
    maxWidth: '400px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--downpat-neutral-900, #111827)',
    marginBottom: '8px',
  },
  cardDesc: {
    color: 'var(--downpat-neutral-600, #4b5563)',
    lineHeight: '1.6',
    flex: 1,
    marginBottom: '16px',
  },
  cardMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  cardModel: {
    backgroundColor: 'var(--downpat-neutral-100, #f3f4f6)',
    color: 'var(--downpat-neutral-600, #4b5563)',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  coachBadge: {
    backgroundColor: 'var(--downpat-success-100, #d1fae5)',
    color: 'var(--downpat-success-700, #047857)',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  startBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
};
