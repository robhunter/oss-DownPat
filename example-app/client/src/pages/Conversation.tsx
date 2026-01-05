import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageList, TalkToCoachSidebar, type MessageData, MessageType } from '@downpat/ui-components';
import { useConversation } from '../hooks/useSocket';

interface ConversationProps {
  isAdminTest?: boolean;
}

export function Conversation({ isAdminTest = false }: ConversationProps) {
  const { slug } = useParams<{ slug: string }>();
  const backLink = isAdminTest ? '/admin/exercises' : '/exercises';
  const backText = isAdminTest ? '← Back to Admin' : '← Back to Exercises';
  const [input, setInput] = useState('');
  const [showCoach, setShowCoach] = useState(false);
  const [coachMessages, setCoachMessages] = useState<MessageData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    sendCoachMessage,
  } = useConversation({ slug: slug || '' });

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
    // Add user's coach message
    const userMsg: MessageData = {
      messageId: `coach-user-${Date.now()}`,
      type: MessageType.USER,
      role: 'You',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setCoachMessages((prev) => [...prev, userMsg]);

    // Send to server
    sendCoachMessage(text);

    // Simulate coach response (in real app, this would come from the server)
    setTimeout(() => {
      const coachMsg: MessageData = {
        messageId: `coach-${Date.now()}`,
        type: MessageType.SIMPLE,
        role: 'Coach',
        content: 'Great question! Let me help you with that...',
        timestamp: new Date().toISOString(),
      };
      setCoachMessages((prev) => [...prev, coachMsg]);
    }, 1000);
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
          <Link to={backLink} style={styles.backBtn}>
            {isAdminTest ? 'Back to Admin' : 'Back to Exercises'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <Link to={backLink} style={styles.backLink}>
            {backText}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={styles.title}>{slug?.replace(/-/g, ' ')}</h1>
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
      </div>

      {/* Coach Toggle Button */}
      {!showCoach && (
        <button
          onClick={() => setShowCoach(true)}
          style={styles.coachToggle}
          title="Talk to Coach"
        >
          💬
        </button>
      )}

      {/* Talk to Coach Sidebar */}
      <TalkToCoachSidebar
        messages={coachMessages}
        onSendMessage={handleCoachMessage}
        isOpen={showCoach}
        onToggle={() => setShowCoach(!showCoach)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 112px)',
    marginLeft: '-20px',
    marginRight: '-20px',
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
    color: 'var(--downpat-primary-600, #2563eb)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    marginBottom: '8px',
    display: 'inline-block',
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
    height: 'calc(100vh - 150px)',
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
    height: 'calc(100vh - 150px)',
  },
  error: {
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  backBtn: {
    display: 'inline-block',
    marginTop: '16px',
    padding: '8px 24px',
    backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
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
