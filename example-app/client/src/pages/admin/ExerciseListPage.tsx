import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExerciseList } from '@downpat/admin-ui';
import { getAPI, type ExerciseWithMetadata } from '../../lib/api';
import type { Exercise } from '@downpat/core';

/**
 * =============================================================================
 * MOVE TO: @downpat/admin-ui (page component)
 *          @downpat/react (hooks, route config)
 *
 * This entire page should be provided by DownPat as <ExerciseListPage />.
 * The data fetching, CRUD handlers (publish/unpublish/delete/restore), and
 * page layout are all DownPat-specific boilerplate.
 *
 * Page component lives in @downpat/admin-ui:
 *   import { ExerciseListPage } from '@downpat/admin-ui';
 *
 * But apps won't import it directly - they'll use createDownpatRoutes() from
 * @downpat/react which wires everything up automatically.
 * =============================================================================
 */
export function ExerciseListPage() {
  /**
   * MOVE TO: @downpat/react (as a React hook)
   *   const {
   *     exercises,
   *     isLoading,
   *     error,
   *     publishExercise,
   *     unpublishExercise,
   *     deleteExercise,
   *     restoreExercise,
   *   } = useExerciseAdmin();
   *
   * The hook should handle all the try/catch, loading states, and refetching.
   */
  const [exercisesWithMetadata, setExercisesWithMetadata] = useState<ExerciseWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setIsLoading(true);
      const api = getAPI();
      const data = await api.getExercisesWithMetadata();
      setExercisesWithMetadata(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * MOVE TO: @downpat/react (as part of useExerciseAdmin hook)
   * These handlers are pure DownPat boilerplate. Every app will have the exact
   * same publish/unpublish/delete/restore handlers. Should be part of the hook.
   */
  const handlePublish = async (slug: string) => {
    try {
      const api = getAPI();
      await api.publishExercise(slug);
      await loadExercises();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const handleUnpublish = async (slug: string) => {
    try {
      const api = getAPI();
      await api.unpublishExercise(slug);
      await loadExercises();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unpublish');
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      const api = getAPI();
      await api.deleteExercise(slug);
      await loadExercises();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  /**
   * MOVE TO: @downpat/react (navigation handled by route config)
   * When createDownpatRoutes() generates these pages, it will know the
   * basePath and can wire up navigation automatically. The page components
   * will receive navigation callbacks that already have correct paths.
   *
   * TODO: These paths will become /downpat/admin/exercises/:slug/edit, etc.
   */
  const handleEdit = (exercise: Exercise) => {
    navigate(`/admin/exercises/${exercise.slug}/edit`);
  };

  const handleTest = (exercise: Exercise) => {
    // Navigate to conversation page - admin can test any exercise (draft or published)
    navigate(`/admin/test/${exercise.slug}`);
  };

  const handleRestore = async (slug: string) => {
    try {
      const api = getAPI();
      await api.restoreExercise(slug);
      await loadExercises();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore');
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <p>Loading exercises...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Exercises</h1>
          <p style={styles.subtitle}>Manage your practice exercises</p>
        </div>
        <Link to="/admin/exercises/new" style={styles.createBtn}>
          + Create Exercise
        </Link>
      </div>

      {error && (
        <div style={styles.error}>
          <p>{error}</p>
          <button onClick={loadExercises} style={styles.retryBtn}>
            Try Again
          </button>
        </div>
      )}

      {exercisesWithMetadata.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📝</div>
          <h2 style={styles.emptyTitle}>No Exercises Yet</h2>
          <p style={styles.emptyText}>
            Create your first exercise to start building practice scenarios.
          </p>
          <Link to="/admin/exercises/new" style={styles.createBtnLarge}>
            Create Your First Exercise
          </Link>
        </div>
      ) : (
        <div style={styles.listContainer}>
          <ExerciseList
            exercises={exercisesWithMetadata}
            onEdit={handleEdit}
            onTest={handleTest}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={handleDelete}
            onRestore={handleRestore}
          />
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'var(--downpat-neutral-900, #111827)',
    marginBottom: '4px',
  },
  subtitle: {
    color: 'var(--downpat-neutral-600, #4b5563)',
  },
  createBtn: {
    padding: '10px 20px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--downpat-danger-600, #dc2626)',
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
    margin: '0 auto 24px',
  },
  createBtnLarge: {
    display: 'inline-block',
    padding: '12px 32px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  listContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
};
