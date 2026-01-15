import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

/**
 * Login page for the example app.
 * Login pages are app-specific (auth provider, branding, form fields).
 */
export function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page user was trying to access
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/downpat/exercises';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (type: 'admin' | 'user') => {
    const quickEmail = type === 'admin' ? 'demo@admin.com' : 'demo@user.com';
    setEmail(quickEmail);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sign In</h1>
        <p style={styles.subtitle}>Enter your email to access DownPat</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={isLoading} style={styles.submitBtn}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>Quick Login</span>
        </div>

        <div style={styles.quickButtons}>
          <button
            type="button"
            onClick={() => handleQuickLogin('admin')}
            style={styles.quickBtn}
          >
            Login as Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('user')}
            style={styles.quickBtn}
          >
            Login as User
          </button>
        </div>

        <div style={styles.hint}>
          <strong>Hint:</strong> Emails with "@admin" get admin access. Any other email gets subscriber access.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 150px)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: 'var(--downpat-neutral-900, #111827)',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    color: 'var(--downpat-neutral-600, #4b5563)',
    textAlign: 'center',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontWeight: '500',
    color: 'var(--downpat-neutral-700, #374151)',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid var(--downpat-neutral-300, #d1d5db)',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
  },
  error: {
    backgroundColor: 'var(--downpat-danger-50, #fef2f2)',
    color: 'var(--downpat-danger-700, #b91c1c)',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '0.875rem',
  },
  submitBtn: {
    padding: '12px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    gap: '16px',
  },
  dividerText: {
    color: 'var(--downpat-neutral-500, #6b7280)',
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
  },
  quickButtons: {
    display: 'flex',
    gap: '12px',
  },
  quickBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: 'var(--downpat-neutral-100, #f3f4f6)',
    border: '1px solid var(--downpat-neutral-300, #d1d5db)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--downpat-neutral-700, #374151)',
  },
  hint: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: 'var(--downpat-neutral-50, #f9fafb)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: 'var(--downpat-neutral-600, #4b5563)',
  },
};
