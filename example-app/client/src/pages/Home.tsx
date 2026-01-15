import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

/**
 * Landing page for the example app.
 * Landing pages are app-specific (branding, marketing copy, demo credentials).
 */
export function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>Welcome to DownPat</h1>
        <p style={styles.subtitle}>
          Open source conversational AI training platform for practicing skills through realistic roleplay scenarios.
        </p>

        <div style={styles.actions}>
          {isAuthenticated ? (
            <>
              <Link to="/downpat/exercises" style={styles.primaryBtn}>
                Browse Exercises
              </Link>
              {user?.isAdmin && (
                <Link to="/downpat/admin" style={styles.secondaryBtn}>
                  Admin Dashboard
                </Link>
              )}
            </>
          ) : (
            <Link to="/login" style={styles.primaryBtn}>
              Get Started
            </Link>
          )}
        </div>
      </div>

      <div style={styles.features}>
        <div style={styles.feature}>
          <div style={styles.featureIcon}>🎯</div>
          <h3 style={styles.featureTitle}>Practice Real Scenarios</h3>
          <p style={styles.featureDesc}>
            Train with AI-powered roleplay exercises designed for sales, customer service, and more.
          </p>
        </div>

        <div style={styles.feature}>
          <div style={styles.featureIcon}>💬</div>
          <h3 style={styles.featureTitle}>Talk to Coach</h3>
          <p style={styles.featureDesc}>
            Get real-time coaching feedback and tips while practicing your conversations.
          </p>
        </div>

        <div style={styles.feature}>
          <div style={styles.featureIcon}>📊</div>
          <h3 style={styles.featureTitle}>Track Progress</h3>
          <p style={styles.featureDesc}>
            Review your conversation history and see your improvement over time.
          </p>
        </div>
      </div>

      <div style={styles.infoBox}>
        <h2 style={styles.infoTitle}>Demo Credentials</h2>
        <p style={styles.infoText}>
          <strong>Admin user:</strong> Use any email containing "@admin" (e.g., demo@admin.com)
        </p>
        <p style={styles.infoText}>
          <strong>Regular user:</strong> Use any other email (e.g., demo@user.com)
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 0',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '60px',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: 'var(--downpat-neutral-900, #111827)',
    marginBottom: '16px',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: 'var(--downpat-neutral-600, #4b5563)',
    maxWidth: '600px',
    margin: '0 auto 32px',
  },
  actions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  primaryBtn: {
    padding: '12px 32px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
  },
  secondaryBtn: {
    padding: '12px 32px',
    backgroundColor: 'white',
    color: 'var(--downpat-primary-600, #2563eb)',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '1rem',
    border: '2px solid var(--downpat-primary-500, #3b82f6)',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '60px',
  },
  feature: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '8px',
    color: 'var(--downpat-neutral-800, #1f2937)',
  },
  featureDesc: {
    color: 'var(--downpat-neutral-600, #4b5563)',
    lineHeight: '1.6',
  },
  infoBox: {
    backgroundColor: 'var(--downpat-primary-50, #eff6ff)',
    border: '1px solid var(--downpat-primary-200, #bfdbfe)',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  infoTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--downpat-primary-700, #1d4ed8)',
    marginBottom: '12px',
  },
  infoText: {
    color: 'var(--downpat-primary-800, #1e40af)',
    marginBottom: '8px',
  },
};
