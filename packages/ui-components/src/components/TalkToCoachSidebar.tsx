import React, { useState, useRef, useEffect } from 'react';
import { MessageType } from '@downpat/core';
import { Message, type MessageData } from './Message.js';

export interface TalkToCoachSidebarProps {
  /** Array of coach messages to display */
  messages: MessageData[];
  /** Callback when user sends a message */
  onSendMessage: (content: string) => void;
  /** Whether the sidebar is open */
  isOpen: boolean;
  /** Callback to toggle sidebar visibility */
  onToggle: () => void;
  /** Whether to show a loading indicator */
  isLoading?: boolean;
  /** Placeholder text for input (default: "Ask the coach...") */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Collapsible sidebar for Talk to Coach feature.
 * Shows only SIMPLE and USER type messages (coach responses).
 */
export function TalkToCoachSidebar({
  messages,
  onSendMessage,
  isOpen,
  onToggle,
  isLoading = false,
  placeholder = 'Ask the coach...',
  className = '',
}: TalkToCoachSidebarProps): React.JSX.Element {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Filter to only show coach-related messages
  const coachMessages = messages.filter(
    (msg) => msg.type === MessageType.SIMPLE || msg.type === MessageType.USER
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [coachMessages.length, isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !isLoading) {
      onSendMessage(trimmed);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Collapsed button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={`downpat-coach-toggle ${className}`}
        style={{
          position: 'fixed',
          right: '16px',
          bottom: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'transform 0.2s, background-color 0.2s',
        }}
        aria-label="Open Talk to Coach"
        title="Talk to Coach"
      >
        💬
      </button>
    );
  }

  // Expanded sidebar
  return (
    <aside
      className={`downpat-coach-sidebar ${className}`}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        height: '100%',
        width: '320px',
        backgroundColor: 'var(--downpat-background, white)',
        borderLeft: '1px solid var(--downpat-border, #e5e7eb)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid var(--downpat-border, #e5e7eb)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--downpat-text, #1f2937)',
          }}
        >
          Talk to Coach
        </h2>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: 'var(--downpat-text-secondary, #6b7280)',
            padding: '4px',
            lineHeight: 1,
          }}
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {coachMessages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--downpat-text-secondary, #9ca3af)',
              padding: '32px 16px',
            }}
          >
            Ask the coach a question about your conversation or request feedback.
          </div>
        ) : (
          coachMessages.map((msg) => (
            <Message
              key={msg.messageId}
              message={msg}
              showTimestamp={false}
              showAvatar={false}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '16px',
          borderTop: '1px solid var(--downpat-border, #e5e7eb)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={2}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--downpat-border, #d1d5db)',
              resize: 'none',
              fontSize: '14px',
              fontFamily: 'inherit',
              backgroundColor: isLoading ? '#f9fafb' : 'white',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--downpat-primary-500, #3b82f6)',
              color: 'white',
              border: 'none',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !input.trim() ? 0.5 : 1,
              fontSize: '14px',
              fontWeight: 500,
              alignSelf: 'flex-end',
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </aside>
  );
}
