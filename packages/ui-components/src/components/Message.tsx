import React from 'react';
import { MessageType } from '@downpat/core';
import { Avatar } from './Avatar.js';

export interface MessageData {
  messageId: string;
  type: MessageType;
  role: string;
  content: string;
  timestamp: string;
}

export interface MessageProps {
  /** The message to display */
  message: MessageData;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show timestamp (default: true) */
  showTimestamp?: boolean;
  /** Whether to show avatar (default: true) */
  showAvatar?: boolean;
}

/**
 * Parse content for display based on message type.
 * STARTER messages contain JSON with text, context, and attributes - only display 'text'.
 */
function getDisplayContent(message: MessageData): string {
  if (message.type === MessageType.STARTER) {
    try {
      const parsed = JSON.parse(message.content) as { text?: string };
      // Check for explicit 'text' property - empty string is valid (context-only starters)
      return 'text' in parsed ? (parsed.text ?? '') : message.content;
    } catch {
      // If not valid JSON, return content as-is (backwards compatibility)
      return message.content;
    }
  }
  return message.content;
}

/**
 * Renders a single message in the conversation.
 * Styling varies based on message type.
 */
export function Message({
  message,
  className = '',
  showTimestamp = true,
  showAvatar = true,
}: MessageProps): React.JSX.Element {
  const style = getMessageStyle(message.type);
  const displayContent = getDisplayContent(message);

  return (
    <div
      className={`downpat-message downpat-message-${message.type.toLowerCase()} ${className}`}
      style={{
        padding: '16px',
        borderRadius: '8px',
        maxWidth: '80%',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {showAvatar && <Avatar displayName={message.role} size={36} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 500,
              fontSize: '14px',
              color: 'var(--downpat-text-secondary, #6b7280)',
            }}
          >
            {message.role}
            {getTypeLabel(message.type) && (
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  fontWeight: 400,
                  color: 'var(--downpat-text-secondary, #9ca3af)',
                }}
              >
                {getTypeLabel(message.type)}
              </span>
            )}
          </div>
          <div
            style={{
              marginTop: '4px',
              color: 'var(--downpat-text, #1f2937)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {displayContent}
          </div>
          {showTimestamp && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--downpat-text-secondary, #9ca3af)',
              }}
            >
              {formatTimestamp(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get inline styles based on message type.
 */
function getMessageStyle(type: MessageType): React.CSSProperties {
  switch (type) {
    case MessageType.USER:
      return {
        backgroundColor: 'var(--downpat-user-bg, #eff6ff)',
        marginLeft: 'auto',
      };
    case MessageType.CONVERSATION:
      return {
        backgroundColor: 'var(--downpat-conversation-bg, #f9fafb)',
      };
    case MessageType.COMMENTARY:
      return {
        backgroundColor: 'var(--downpat-commentary-bg, #fef3c7)',
        borderLeft: '4px solid #f59e0b',
      };
    case MessageType.SUMMARY:
      return {
        backgroundColor: 'var(--downpat-summary-bg, #d1fae5)',
        borderLeft: '4px solid #10b981',
      };
    case MessageType.SIMPLE:
      return {
        backgroundColor: 'var(--downpat-conversation-bg, #f9fafb)',
      };
    case MessageType.MODERATION:
      return {
        backgroundColor: 'var(--downpat-moderation-bg, #fee2e2)',
        borderLeft: '4px solid #ef4444',
      };
    case MessageType.STARTER:
      return {
        backgroundColor: 'var(--downpat-conversation-bg, #f9fafb)',
      };
    case MessageType.CONTEXT:
      return {
        backgroundColor: 'var(--downpat-context-bg, #e0e7ff)',
        fontSize: '14px',
      };
    default:
      return {
        backgroundColor: 'var(--downpat-conversation-bg, #f9fafb)',
      };
  }
}

/**
 * Get optional type label for non-conversation messages.
 */
function getTypeLabel(type: MessageType): string | null {
  switch (type) {
    case MessageType.COMMENTARY:
      return '(Commentary)';
    case MessageType.SUMMARY:
      return '(Summary)';
    case MessageType.MODERATION:
      return '(Moderation)';
    default:
      return null;
  }
}

/**
 * Format timestamp for display.
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}
