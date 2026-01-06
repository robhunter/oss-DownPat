import { useState, useRef, useEffect } from 'react';
import { MessageList } from '../components/MessageList.js';
import { TalkToCoachSidebar } from '../components/TalkToCoachSidebar.js';
import { useConversation } from '../hooks/useSocket.js';

export interface ConversationPageProps {
  /** Exercise slug to start conversation with */
  slug: string;
  /** Optional title to display (defaults to formatted slug) */
  title?: string;
  /** Callback when user clicks back */
  onBack?: () => void;
  /** Text for back button */
  backText?: string;
  /** Show admin test badge */
  isAdminTest?: boolean;
  /** Optional socket URL override */
  socketUrl?: string;
}

/**
 * Full-featured conversation page component.
 * Handles message display, input, streaming, and Talk to Coach sidebar.
 */
export function ConversationPage({
  slug,
  title,
  onBack,
  backText = '← Back',
  isAdminTest = false,
  socketUrl,
}: ConversationPageProps) {
  const [input, setInput] = useState('');
  const [showCoach, setShowCoach] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    coachMessages,
    isLoading,
    isStreaming,
    isComplete,
    error,
    talkToCoachEnabled,
    sendMessage,
    sendCoachMessage,
  } = useConversation({ slug, socketUrl });

  const displayTitle = title || slug.replace(/-/g, ' ');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    sendMessage(input.trim());
    setInput('');
  };

  const handleCoachMessage = (text: string) => {
    // Send to server - the hook handles adding messages and streaming
    sendCoachMessage(text);
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Starting conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          {onBack && (
            <button onClick={onBack} style={styles.backBtn}>
              {backText.replace('← ', '')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          {onBack && (
            <button onClick={onBack} style={styles.backLink}>
              {backText}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={styles.title}>{displayTitle}</h1>
            {isAdminTest && (
              <span style={styles.testBadge}>Admin Test</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={styles.messagesContainer}>
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isComplete ? (
          <div style={styles.conversationComplete}>
            <p>This conversation has ended.</p>
            {onBack && (
              <button onClick={onBack} style={styles.backBtn}>
                {backText.replace('← ', '')}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.inputContainer}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isStreaming}
              style={styles.input}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              style={{
                ...styles.sendBtn,
                ...((!input.trim() || isStreaming) ? styles.sendBtnDisabled : {}),
              }}
            >
              {isStreaming ? 'Sending...' : 'Send'}
            </button>
          </form>
        )}
      </div>

      {/* Coach Toggle Button - only show if Talk to Coach is enabled */}
      {talkToCoachEnabled && !showCoach && (
        <button
          onClick={() => setShowCoach(true)}
          style={styles.coachToggle}
          title="Talk to Coach"
        >
          <span role="img" aria-label="chat">💬</span>
        </button>
      )}

      {/* Talk to Coach Sidebar - only render if enabled */}
      {talkToCoachEnabled && (
        <TalkToCoachSidebar
          messages={coachMessages}
          onSendMessage={handleCoachMessage}
          isOpen={showCoach}
          onToggle={() => setShowCoach(!showCoach)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100%',
    minHeight: '400px',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '0 20px',
  },
  header: {
    padding: '16px 0',
    borderBottom: '1px solid var(--downpat-neutral-200, #e5e7eb)',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: 'var(--downpat-primary-600, #2563eb)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginBottom: '8px',
    padding: 0,
    textAlign: 'left',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--downpat-neutral-900, #111827)',
    margin: 0,
    textTransform: 'capitalize',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0',
  },
  inputContainer: {
    display: 'flex',
    gap: '12px',
    padding: '16px 0',
    borderTop: '1px solid var(--downpat-neutral-200, #e5e7eb)',
    backgroundColor: 'var(--downpat-background, #f9fafb)',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid var(--downpat-neutral-300, #d1d5db)',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
  },
  sendBtn: {
    padding: '12px 24px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  sendBtnDisabled: {
    backgroundColor: 'var(--downpat-neutral-300, #d1d5db)',
    cursor: 'not-allowed',
  },
  coachToggle: {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 50,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: '300px',
  },
  loading: {
    textAlign: 'center',
    color: 'var(--downpat-neutral-500, #6b7280)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: '300px',
  },
  error: {
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  backBtn: {
    marginTop: '16px',
    padding: '8px 24px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  conversationComplete: {
    padding: '24px',
    textAlign: 'center',
    borderTop: '1px solid var(--downpat-neutral-200, #e5e7eb)',
    backgroundColor: 'var(--downpat-neutral-100, #f3f4f6)',
    color: 'var(--downpat-neutral-600, #4b5563)',
  },
  testBadge: {
    padding: '4px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
};
