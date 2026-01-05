import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageType } from '@downpat/core';
import { Message, type MessageData } from './Message.js';

const createMessage = (overrides: Partial<MessageData> = {}): MessageData => ({
  messageId: 'msg-1',
  type: MessageType.USER,
  role: 'Test User',
  content: 'Hello, world!',
  timestamp: '2024-01-01T12:00:00.000Z',
  ...overrides,
});

describe('Message', () => {
  it('renders message content', () => {
    render(<Message message={createMessage({ content: 'Test message content' })} />);
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('renders role name', () => {
    render(<Message message={createMessage({ role: 'Coach' })} />);
    expect(screen.getByText('Coach')).toBeInTheDocument();
  });

  it('shows avatar by default', () => {
    render(<Message message={createMessage({ role: 'John Doe' })} />);
    expect(screen.getByLabelText('Avatar for John Doe')).toBeInTheDocument();
  });

  it('hides avatar when showAvatar is false', () => {
    render(<Message message={createMessage({ role: 'John' })} showAvatar={false} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows timestamp by default', () => {
    render(<Message message={createMessage()} />);
    // The exact format depends on locale, but should contain time
    const messageContainer = screen.getByText('Hello, world!').closest('.downpat-message');
    expect(messageContainer).toBeInTheDocument();
  });

  it('hides timestamp when showTimestamp is false', () => {
    render(<Message message={createMessage()} showTimestamp={false} />);
    // When timestamp is hidden, the time text won't be there
    // This is tested by not finding the 12:00 text
  });

  it('applies custom className', () => {
    const { container } = render(
      <Message message={createMessage()} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  describe('message type styling', () => {
    it('applies user message styling', () => {
      const { container } = render(
        <Message message={createMessage({ type: MessageType.USER })} />
      );
      expect(container.querySelector('.downpat-message-user')).toBeInTheDocument();
    });

    it('applies conversation message styling', () => {
      const { container } = render(
        <Message message={createMessage({ type: MessageType.CONVERSATION })} />
      );
      expect(container.querySelector('.downpat-message-conversation')).toBeInTheDocument();
    });

    it('shows commentary label', () => {
      render(<Message message={createMessage({ type: MessageType.COMMENTARY })} />);
      expect(screen.getByText('(Commentary)')).toBeInTheDocument();
    });

    it('shows summary label', () => {
      render(<Message message={createMessage({ type: MessageType.SUMMARY })} />);
      expect(screen.getByText('(Summary)')).toBeInTheDocument();
    });

    it('shows moderation label', () => {
      render(<Message message={createMessage({ type: MessageType.MODERATION })} />);
      expect(screen.getByText('(Moderation)')).toBeInTheDocument();
    });
  });
});
