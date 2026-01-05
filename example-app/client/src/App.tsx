import { useState, useEffect } from 'react';
import {
  MessageList,
  Avatar,
  TalkToCoachSidebar,
  generateTheme,
  applyTheme,
  MessageType,
  type MessageData,
} from '@downpat/ui-components';
import '@downpat/ui-components/styles';

// Sample messages to demonstrate the message components
const sampleMessages: MessageData[] = [
  {
    messageId: '1',
    type: MessageType.STARTER,
    role: 'System',
    content: 'Welcome to DownPat! This is a demonstration of the conversation UI components.',
    timestamp: new Date().toISOString(),
  },
  {
    messageId: '2',
    type: MessageType.USER,
    role: 'You',
    content: 'Hi! I would like to practice my sales pitch for a new software product.',
    timestamp: new Date().toISOString(),
  },
  {
    messageId: '3',
    type: MessageType.CONVERSATION,
    role: 'Sales Coach',
    content: "Great! I'm here to help you practice. Tell me about your software product - what problem does it solve?",
    timestamp: new Date().toISOString(),
  },
  {
    messageId: '4',
    type: MessageType.COMMENTARY,
    role: 'Coach Feedback',
    content: "Good opening question! You're guiding the conversation effectively.",
    timestamp: new Date().toISOString(),
  },
  {
    messageId: '5',
    type: MessageType.USER,
    role: 'You',
    content: "Our product is a project management tool that uses AI to automatically prioritize tasks based on deadlines and team capacity.",
    timestamp: new Date().toISOString(),
  },
  {
    messageId: '6',
    type: MessageType.CONVERSATION,
    role: 'Sales Coach',
    content: "That sounds interesting! What makes your AI prioritization different from other tools on the market?",
    timestamp: new Date().toISOString(),
  },
];

const coachMessages: MessageData[] = [
  {
    messageId: 'c1',
    type: MessageType.SIMPLE,
    role: 'Coach',
    content: 'Remember to focus on the unique value proposition of your product.',
    timestamp: new Date().toISOString(),
  },
];

function App() {
  const [health, setHealth] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const [customPrimary, setCustomPrimary] = useState('#3b82f6');

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

  const handleApplyTheme = () => {
    const theme = generateTheme({ primary: customPrimary });
    applyTheme(theme);
  };

  return (
    <div style={styles.container}>
      <div style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>DownPat</h1>
            <p style={styles.subtitle}>Open Source Conversational AI Training</p>
          </div>

          {/* API Status */}
          <div style={styles.statusBox}>
            <span style={styles.statusLabel}>API:</span>
            {error ? (
              <span style={styles.statusError}>{error}</span>
            ) : (
              <span style={styles.statusSuccess}>{health}</span>
            )}
          </div>
        </header>

        {/* Theme Customization */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Theme Generator</h2>
          <p style={styles.sectionDesc}>Generate a custom theme from a primary color:</p>
          <div style={styles.themeControls}>
            <input
              type="color"
              value={customPrimary}
              onChange={(e) => setCustomPrimary(e.target.value)}
              style={styles.colorPicker}
            />
            <input
              type="text"
              value={customPrimary}
              onChange={(e) => setCustomPrimary(e.target.value)}
              style={styles.colorInput}
            />
            <button onClick={handleApplyTheme} style={styles.button}>
              Apply Theme
            </button>
          </div>
        </section>

        {/* Avatar Demo */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Avatar Component</h2>
          <div style={styles.avatarRow}>
            <Avatar displayName="John Doe" />
            <Avatar displayName="Alice Smith" />
            <Avatar displayName="Sales Coach" />
            <Avatar displayName="Demo User" />
          </div>
        </section>

        {/* Message List Demo */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Conversation Messages</h2>
          <p style={styles.sectionDesc}>
            Various message types: User, Conversation, Commentary, and Starter
          </p>
          <div style={styles.messageContainer}>
            <MessageList messages={sampleMessages} />
          </div>
        </section>

        {/* Talk to Coach Toggle */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Talk to Coach Sidebar</h2>
          <button
            onClick={() => setShowCoach(!showCoach)}
            style={styles.button}
          >
            {showCoach ? 'Hide Coach' : 'Show Coach'}
          </button>
        </section>
      </div>

      {/* Talk to Coach Sidebar */}
      <TalkToCoachSidebar
        messages={coachMessages}
        onSendMessage={(text) => console.log('Sent to coach:', text)}
        isOpen={showCoach}
        onToggle={() => setShowCoach(!showCoach)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--downpat-background, #f9fafb)',
    color: 'var(--downpat-foreground, #1f2937)',
  },
  main: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerContent: {},
  title: {
    fontSize: '2rem',
    color: 'var(--downpat-primary-600, #2563eb)',
    margin: 0,
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--downpat-neutral-500, #6b7280)',
    margin: '4px 0 0 0',
  },
  statusBox: {
    backgroundColor: 'var(--downpat-neutral-100, #f3f4f6)',
    padding: '8px 16px',
    borderRadius: '8px',
  },
  statusLabel: {
    fontWeight: 'bold',
    marginRight: '8px',
  },
  statusSuccess: {
    color: 'var(--downpat-success-600, #059669)',
  },
  statusError: {
    color: 'var(--downpat-danger-600, #dc2626)',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    marginTop: 0,
    marginBottom: '8px',
    color: 'var(--downpat-neutral-800, #1f2937)',
  },
  sectionDesc: {
    color: 'var(--downpat-neutral-500, #6b7280)',
    marginBottom: '16px',
  },
  themeControls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  colorPicker: {
    width: '48px',
    height: '48px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  colorInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--downpat-neutral-300, #d1d5db)',
    fontFamily: 'monospace',
    width: '100px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  avatarRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  messageContainer: {
    backgroundColor: 'var(--downpat-neutral-50, #f9fafb)',
    borderRadius: '8px',
    padding: '16px',
    maxHeight: '500px',
    overflow: 'auto',
  },
};

export default App;
