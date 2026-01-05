import React, { useRef, useEffect } from 'react';
import { VISIBLE_MESSAGE_TYPES } from '@downpat/core';
import { Message, type MessageData } from './Message.js';

export interface MessageListProps {
  /** Array of messages to display */
  messages: MessageData[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to auto-scroll to bottom on new messages (default: true) */
  autoScroll?: boolean;
  /** Filter function for which messages to show */
  filterMessages?: (message: MessageData) => boolean;
  /** Whether to show timestamps (default: true) */
  showTimestamps?: boolean;
  /** Whether to show avatars (default: true) */
  showAvatars?: boolean;
}

/**
 * Renders a scrollable list of messages.
 * Automatically filters to visible message types and auto-scrolls on updates.
 */
export function MessageList({
  messages,
  className = '',
  autoScroll = true,
  filterMessages,
  showTimestamps = true,
  showAvatars = true,
}: MessageListProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (autoScroll && listRef.current && messages.length > prevLengthRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevLengthRef.current = messages.length;
  }, [messages.length, autoScroll]);

  // Filter messages to show only visible types, plus any custom filter
  const visibleMessages = messages.filter((msg) => {
    // Cast to readonly array of MessageType for includes check
    const isVisibleType = (VISIBLE_MESSAGE_TYPES as readonly string[]).includes(msg.type);
    if (filterMessages) {
      return isVisibleType && filterMessages(msg);
    }
    return isVisibleType;
  });

  return (
    <div
      ref={listRef}
      className={`downpat-message-list ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        overflowY: 'auto',
        height: '100%',
      }}
    >
      {visibleMessages.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--downpat-text-secondary, #9ca3af)',
            padding: '32px',
          }}
        >
          No messages yet
        </div>
      ) : (
        visibleMessages.map((msg) => (
          <Message
            key={msg.messageId}
            message={msg}
            showTimestamp={showTimestamps}
            showAvatar={showAvatars}
          />
        ))
      )}
    </div>
  );
}
