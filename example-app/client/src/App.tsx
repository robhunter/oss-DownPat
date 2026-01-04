import { useState, useEffect } from 'react';

function App() {
  const [health, setHealth] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setHealth(data.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    checkHealth();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>DownPat</h1>
        <p style={styles.subtitle}>Open Source Conversational AI Training</p>

        <div style={styles.statusBox}>
          <span style={styles.statusLabel}>API Status:</span>
          {error ? (
            <span style={styles.statusError}>{error}</span>
          ) : (
            <span style={styles.statusSuccess}>{health}</span>
          )}
        </div>

        <div style={styles.info}>
          <p>Milestone 0 - Verification Infrastructure</p>
          <p style={styles.checkmark}>✓ Server running on port 3001</p>
          <p style={styles.checkmark}>✓ Client running on port 5173</p>
          <p style={styles.checkmark}>✓ API proxy working</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '2.5rem',
    color: '#3b82f6',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#6b7280',
    marginBottom: '24px',
  },
  statusBox: {
    backgroundColor: '#f3f4f6',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  statusLabel: {
    fontWeight: 'bold',
    marginRight: '8px',
  },
  statusSuccess: {
    color: '#059669',
  },
  statusError: {
    color: '#dc2626',
  },
  info: {
    textAlign: 'left',
    color: '#4b5563',
  },
  checkmark: {
    color: '#059669',
    marginTop: '8px',
  },
};

export default App;
