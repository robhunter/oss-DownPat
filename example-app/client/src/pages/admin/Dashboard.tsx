import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAPI } from '../../lib/api';
import type { Exercise } from '@downpat/core';

export function AdminDashboard() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const api = getAPI();
      const data = await api.getExercises();
      setExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const publishedCount = exercises.filter(e => e.exerciseId.includes('-published')).length;
  const draftCount = exercises.length - publishedCount;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <p style={styles.subtitle}>Manage your DownPat exercises and content</p>
      </div>

      <div style={styles.cards}>
        <Link to="/admin/exercises" style={styles.card}>
          <div style={styles.cardIcon}>📝</div>
          <div style={styles.cardContent}>
            <h3 style={styles.cardTitle}>Exercises</h3>
            {isLoading ? (
              <p style={styles.cardValue}>Loading...</p>
            ) : (
              <>
                <p style={styles.cardValue}>{exercises.length} total</p>
                <p style={styles.cardMeta}>
                  {draftCount} drafts, {publishedCount} published
                </p>
              </>
            )}
          </div>
          <div style={styles.cardArrow}>→</div>
        </Link>

        <div style={styles.card}>
          <div style={styles.cardIcon}>💬</div>
          <div style={styles.cardContent}>
            <h3 style={styles.cardTitle}>Conversations</h3>
            <p style={styles.cardValue}>--</p>
            <p style={styles.cardMeta}>Active sessions</p>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>👥</div>
          <div style={styles.cardContent}>
            <h3 style={styles.cardTitle}>Users</h3>
            <p style={styles.cardValue}>--</p>
            <p style={styles.cardMeta}>Registered users</p>
          </div>
        </div>
      </div>

      <div style={styles.quickActions}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionButtons}>
          <Link to="/admin/exercises/new" style={styles.actionBtn}>
            + Create New Exercise
          </Link>
          <Link to="/admin/exercises" style={styles.actionBtnSecondary}>
            View All Exercises
          </Link>
        </div>
      </div>

      <div style={styles.infoSection}>
        <h2 style={styles.sectionTitle}>Getting Started</h2>
        <div style={styles.infoGrid}>
          <div style={styles.infoCard}>
            <h4 style={styles.infoTitle}>1. Create an Exercise</h4>
            <p style={styles.infoText}>
              Define the scenario, AI persona, and coaching guidelines for your practice exercise.
            </p>
          </div>
          <div style={styles.infoCard}>
            <h4 style={styles.infoTitle}>2. Test as Draft</h4>
            <p style={styles.infoText}>
              Try your exercise before publishing to ensure it works as expected.
            </p>
          </div>
          <div style={styles.infoCard}>
            <h4 style={styles.infoTitle}>3. Publish</h4>
            <p style={styles.infoText}>
              When ready, publish your exercise to make it available to subscribers.
            </p>
          </div>
        </div>
      </div>
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
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'box-shadow 0.2s',
  },
  cardIcon: {
    fontSize: '2.5rem',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--downpat-neutral-700, #374151)',
    marginBottom: '4px',
  },
  cardValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--downpat-neutral-900, #111827)',
    margin: 0,
  },
  cardMeta: {
    fontSize: '0.875rem',
    color: 'var(--downpat-neutral-500, #6b7280)',
    margin: 0,
  },
  cardArrow: {
    fontSize: '1.5rem',
    color: 'var(--downpat-neutral-400, #9ca3af)',
  },
  quickActions: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--downpat-neutral-800, #1f2937)',
    marginBottom: '16px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '12px 24px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  actionBtnSecondary: {
    padding: '12px 24px',
    backgroundColor: 'white',
    color: 'var(--downpat-primary-600, #2563eb)',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    border: '2px solid var(--downpat-primary-500, #3b82f6)',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  infoCard: {
    padding: '16px',
    backgroundColor: 'var(--downpat-neutral-50, #f9fafb)',
    borderRadius: '8px',
  },
  infoTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--downpat-neutral-800, #1f2937)',
    marginBottom: '8px',
  },
  infoText: {
    fontSize: '0.875rem',
    color: 'var(--downpat-neutral-600, #4b5563)',
    lineHeight: '1.5',
    margin: 0,
  },
};
