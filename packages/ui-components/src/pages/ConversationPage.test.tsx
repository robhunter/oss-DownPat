import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock scrollIntoView since jsdom doesn't implement it
Element.prototype.scrollIntoView = vi.fn();

// Mock the useConversation hook
const mockStartNewConversation = vi.fn();
const mockSendMessage = vi.fn();
const mockSendCoachMessage = vi.fn();

vi.mock('../hooks/useSocket.js', () => ({
  useConversation: vi.fn(() => ({
    messages: [
      { messageId: 'msg-1', content: 'Hello', type: 'STARTER', role: 'Assistant', timestamp: new Date().toISOString() },
    ],
    coachMessages: [],
    isLoading: false,
    isStreaming: false,
    isCoachStreaming: false,
    isComplete: false,
    error: null,
    talkToCoachEnabled: false,
    sendMessage: mockSendMessage,
    sendCoachMessage: mockSendCoachMessage,
    startNewConversation: mockStartNewConversation,
  })),
}));

import { ConversationPage } from './ConversationPage.js';
import { useConversation } from '../hooks/useSocket.js';

describe('ConversationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('New Conversation button', () => {
    it('renders New Conversation button in header', () => {
      render(<ConversationPage slug="test-exercise" />);

      const button = screen.getByRole('button', { name: 'New Conversation' });
      expect(button).toBeInTheDocument();
    });

    it('calls startNewConversation when header button is clicked', () => {
      render(<ConversationPage slug="test-exercise" />);

      const button = screen.getByRole('button', { name: 'New Conversation' });
      fireEvent.click(button);

      expect(mockStartNewConversation).toHaveBeenCalledTimes(1);
    });

    it('renders Start New Conversation button when conversation is complete', () => {
      vi.mocked(useConversation).mockReturnValue({
        messages: [
          { messageId: 'msg-1', content: 'Hello', type: 'STARTER', role: 'Assistant', timestamp: new Date().toISOString() },
        ],
        coachMessages: [],
        isLoading: false,
        isStreaming: false,
        isCoachStreaming: false,
        isComplete: true,
        error: null,
        talkToCoachEnabled: false,
        sendMessage: mockSendMessage,
        sendCoachMessage: mockSendCoachMessage,
        startNewConversation: mockStartNewConversation,
      });

      render(<ConversationPage slug="test-exercise" />);

      const button = screen.getByRole('button', { name: 'Start New Conversation' });
      expect(button).toBeInTheDocument();
    });

    it('calls startNewConversation when complete section button is clicked', () => {
      vi.mocked(useConversation).mockReturnValue({
        messages: [
          { messageId: 'msg-1', content: 'Hello', type: 'STARTER', role: 'Assistant', timestamp: new Date().toISOString() },
        ],
        coachMessages: [],
        isLoading: false,
        isStreaming: false,
        isCoachStreaming: false,
        isComplete: true,
        error: null,
        talkToCoachEnabled: false,
        sendMessage: mockSendMessage,
        sendCoachMessage: mockSendCoachMessage,
        startNewConversation: mockStartNewConversation,
      });

      render(<ConversationPage slug="test-exercise" />);

      const button = screen.getByRole('button', { name: 'Start New Conversation' });
      fireEvent.click(button);

      expect(mockStartNewConversation).toHaveBeenCalledTimes(1);
    });

    it('shows conversation ended message when complete', () => {
      vi.mocked(useConversation).mockReturnValue({
        messages: [],
        coachMessages: [],
        isLoading: false,
        isStreaming: false,
        isCoachStreaming: false,
        isComplete: true,
        error: null,
        talkToCoachEnabled: false,
        sendMessage: mockSendMessage,
        sendCoachMessage: mockSendCoachMessage,
        startNewConversation: mockStartNewConversation,
      });

      render(<ConversationPage slug="test-exercise" />);

      expect(screen.getByText('This conversation has ended.')).toBeInTheDocument();
    });

    it('button has correct CSS class for e2e targeting', () => {
      render(<ConversationPage slug="test-exercise" />);

      const button = screen.getByRole('button', { name: 'New Conversation' });
      expect(button).toHaveClass('downpat-new-conversation-btn');
    });
  });

  describe('loading state', () => {
    it('shows loading state when isLoading is true', () => {
      vi.mocked(useConversation).mockReturnValue({
        messages: [],
        coachMessages: [],
        isLoading: true,
        isStreaming: false,
        isCoachStreaming: false,
        isComplete: false,
        error: null,
        talkToCoachEnabled: false,
        sendMessage: mockSendMessage,
        sendCoachMessage: mockSendCoachMessage,
        startNewConversation: mockStartNewConversation,
      });

      render(<ConversationPage slug="test-exercise" />);

      expect(screen.getByText('Starting conversation...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when error exists', () => {
      vi.mocked(useConversation).mockReturnValue({
        messages: [],
        coachMessages: [],
        isLoading: false,
        isStreaming: false,
        isCoachStreaming: false,
        isComplete: false,
        error: 'Connection failed',
        talkToCoachEnabled: false,
        sendMessage: mockSendMessage,
        sendCoachMessage: mockSendCoachMessage,
        startNewConversation: mockStartNewConversation,
      });

      render(<ConversationPage slug="test-exercise" />);

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });
});
