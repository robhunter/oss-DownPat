import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Create mock socket before importing the hook
const mockHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!mockHandlers[event]) mockHandlers[event] = [];
    mockHandlers[event].push(handler);
  }),
  off: vi.fn((event: string) => {
    delete mockHandlers[event];
  }),
  emit: vi.fn(),
  close: vi.fn(),
  connected: true,
};

// Helper to trigger mock socket events
function triggerSocketEvent(event: string, ...args: unknown[]) {
  mockHandlers[event]?.forEach(h => h(...args));
}

// Clear handlers between tests
function clearMockHandlers() {
  Object.keys(mockHandlers).forEach(key => delete mockHandlers[key]);
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('../auth/token.js', () => ({
  getDownPatToken: vi.fn(() => 'test-token'),
  onTokenChange: vi.fn(() => () => {}),
}));

// Import after mocking
import { useConversation } from './useSocket.js';

describe('useConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMockHandlers();
    mockSocket.connected = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startNewConversation', () => {
    it('returns startNewConversation function in hook result', () => {
      const { result } = renderHook(() => useConversation({ slug: 'test-exercise' }));
      expect(typeof result.current.startNewConversation).toBe('function');
    });

    it('emits start-conversation with slug when called after connection', async () => {
      const { result } = renderHook(() => useConversation({ slug: 'my-exercise' }));

      // Simulate socket connect and authentication
      act(() => {
        triggerSocketEvent('connect');
        triggerSocketEvent('authenticated', { success: true, user: { userId: 'user-1' } });
      });

      // Clear emit calls from initial connection
      mockSocket.emit.mockClear();

      // Call startNewConversation
      act(() => {
        result.current.startNewConversation();
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('start-conversation', { slug: 'my-exercise', forceNew: true });
    });

    it('resets isLoading to true when starting new conversation', async () => {
      const { result } = renderHook(() => useConversation({ slug: 'test-exercise' }));

      // Simulate socket connect, auth, and conversation started
      act(() => {
        triggerSocketEvent('connect');
        triggerSocketEvent('authenticated', { success: true, user: { userId: 'user-1' } });
      });

      act(() => {
        triggerSocketEvent('conversation-started', {
          conversationId: 'conv-1',
          messages: [{ messageId: 'msg-1', content: 'Hello', type: 'STARTER', role: 'Assistant', timestamp: new Date().toISOString() }],
          talkToCoachEnabled: false,
        });
      });

      // Verify conversation loaded
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages).toHaveLength(1);

      // Start new conversation
      act(() => {
        result.current.startNewConversation();
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('clears messages when starting new conversation', async () => {
      const { result } = renderHook(() => useConversation({ slug: 'test-exercise' }));

      // Simulate connection and conversation with messages
      act(() => {
        triggerSocketEvent('connect');
        triggerSocketEvent('authenticated', { success: true, user: { userId: 'user-1' } });
      });

      act(() => {
        triggerSocketEvent('conversation-started', {
          conversationId: 'conv-1',
          messages: [
            { messageId: 'msg-1', content: 'Hello', type: 'STARTER', role: 'Assistant', timestamp: new Date().toISOString() },
            { messageId: 'msg-2', content: 'Hi there', type: 'USER', role: 'You', timestamp: new Date().toISOString() },
          ],
          talkToCoachEnabled: false,
        });
      });

      expect(result.current.messages).toHaveLength(2);

      // Start new conversation
      act(() => {
        result.current.startNewConversation();
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('clears conversation state when starting new conversation', async () => {
      const { result } = renderHook(() => useConversation({ slug: 'test-exercise' }));

      // Simulate connection and conversation started
      act(() => {
        triggerSocketEvent('connect');
        triggerSocketEvent('authenticated', { success: true, user: { userId: 'user-1' } });
      });

      act(() => {
        triggerSocketEvent('conversation-started', {
          conversationId: 'conv-123',
          messages: [],
          talkToCoachEnabled: true,
        });
      });

      expect(result.current.conversation?.conversationId).toBe('conv-123');

      // Start new conversation
      act(() => {
        result.current.startNewConversation();
      });

      expect(result.current.conversation).toBeNull();
    });

    it('resets isComplete to false when starting new conversation', async () => {
      const { result } = renderHook(() => useConversation({ slug: 'test-exercise' }));

      // Simulate connection and conversation started
      act(() => {
        triggerSocketEvent('connect');
        triggerSocketEvent('authenticated', { success: true, user: { userId: 'user-1' } });
      });

      act(() => {
        triggerSocketEvent('conversation-started', {
          conversationId: 'conv-1',
          messages: [],
          talkToCoachEnabled: false,
        });
      });

      // Simulate moderation marking conversation complete
      act(() => {
        triggerSocketEvent('message-moderated', {
          flagged: true,
          categories: ['harassment'],
          message: 'Content flagged',
          isComplete: true,
        });
      });

      expect(result.current.isComplete).toBe(true);

      // Start new conversation
      act(() => {
        result.current.startNewConversation();
      });

      expect(result.current.isComplete).toBe(false);
    });

    it('clears error when starting new conversation', async () => {
      const { result } = renderHook(() => useConversation({ slug: 'test-exercise' }));

      // Simulate connection
      act(() => {
        triggerSocketEvent('connect');
        triggerSocketEvent('authenticated', { success: true, user: { userId: 'user-1' } });
      });

      // Simulate conversation started first
      act(() => {
        triggerSocketEvent('conversation-started', {
          conversationId: 'conv-1',
          messages: [],
          talkToCoachEnabled: false,
        });
      });

      // Simulate error
      act(() => {
        triggerSocketEvent('error', { message: 'Something went wrong' });
      });

      expect(result.current.error).toBe('Something went wrong');

      // Start new conversation
      act(() => {
        result.current.startNewConversation();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
