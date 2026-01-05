import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageType } from '@downpat/core';
import { MessageList } from './MessageList.js';
import type { MessageData } from './Message.js';

const createMessages = (): MessageData[] => [
  {
    messageId: 'msg-1',
    type: MessageType.STARTER,
    role: 'System',
    content: 'Welcome to the exercise!',
    timestamp: '2024-01-01T12:00:00.000Z',
  },
  {
    messageId: 'msg-2',
    type: MessageType.USER,
    role: 'User',
    content: 'Hello!',
    timestamp: '2024-01-01T12:01:00.000Z',
  },
  {
    messageId: 'msg-3',
    type: MessageType.CONVERSATION,
    role: 'Assistant',
    content: 'Hi there!',
    timestamp: '2024-01-01T12:02:00.000Z',
  },
];

describe('MessageList', () => {
  it('renders messages', () => {
    render(<MessageList messages={createMessages()} />);
    expect(screen.getByText('Welcome to the exercise!')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    render(<MessageList messages={[]} />);
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('filters out CONTEXT messages', () => {
    const messagesWithContext: MessageData[] = [
      ...createMessages(),
      {
        messageId: 'msg-4',
        type: MessageType.CONTEXT,
        role: 'System',
        content: 'This should be hidden',
        timestamp: '2024-01-01T12:03:00.000Z',
      },
    ];
    render(<MessageList messages={messagesWithContext} />);
    expect(screen.queryByText('This should be hidden')).not.toBeInTheDocument();
  });

  it('applies custom filter', () => {
    const customFilter = (msg: MessageData) => msg.type !== MessageType.STARTER;
    render(<MessageList messages={createMessages()} filterMessages={customFilter} />);
    expect(screen.queryByText('Welcome to the exercise!')).not.toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MessageList messages={createMessages()} className="custom-list" />
    );
    expect(container.querySelector('.custom-list')).toBeInTheDocument();
  });

  it('passes showTimestamps to messages', () => {
    render(<MessageList messages={createMessages()} showTimestamps={false} />);
    // Messages should still render
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('passes showAvatars to messages', () => {
    render(<MessageList messages={createMessages()} showAvatars={false} />);
    // No avatars should be rendered
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
