import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getDownPatToken, onTokenChange } from '../auth/token.js';
import type { MessageData } from '../components/Message.js';
import type { Conversation } from '@downpat/core';

interface UseSocketOptions {
  autoConnect?: boolean;
  url?: string;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for managing Socket.io connection to DownPat server.
 * Uses the token provided via provideDownPatToken().
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true, url } = options;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    const token = getDownPatToken();
    if (!token) {
      setError('No auth token provided. Call provideDownPatToken() first.');
      return;
    }

    tokenRef.current = token;
    const socketUrl = url || (typeof window !== 'undefined' ? window.location.origin : '');

    const newSocket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    newSocket.on('authenticated', (data: { success: boolean; error?: string }) => {
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.error || 'Authentication failed');
      }
    });

    newSocket.on('connect_error', (err) => {
      setError(err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [url]);

  const disconnect = useCallback(() => {
    socket?.close();
    setSocket(null);
    setIsConnected(false);
    setIsAuthenticated(false);
  }, [socket]);

  useEffect(() => {
    if (autoConnect) {
      const token = getDownPatToken();
      if (token) {
        const cleanup = connect();
        return cleanup;
      }
    }
    return undefined;
  }, [autoConnect, connect]);

  // Subscribe to token changes and reconnect when token changes
  useEffect(() => {
    const unsubscribe = onTokenChange((newToken) => {
      // Token changed - need to reconnect with new token
      if (socket) {
        disconnect();
      }
      if (newToken) {
        connect();
      }
    });

    return unsubscribe;
  }, [socket, connect, disconnect]);

  return {
    socket,
    isConnected,
    isAuthenticated,
    error,
    connect,
    disconnect,
  };
}

// Hook for managing a conversation session
interface UseConversationOptions {
  slug: string;
  socketUrl?: string;
}

export interface UseConversationReturn {
  conversation: Conversation | null;
  messages: MessageData[];
  coachMessages: MessageData[];
  isLoading: boolean;
  isStreaming: boolean;
  isCoachStreaming: boolean;
  isComplete: boolean;
  error: string | null;
  talkToCoachEnabled: boolean;
  sendMessage: (text: string) => void;
  sendCoachMessage: (text: string) => void;
  startNewConversation: () => void;
}

/**
 * Hook for managing a full conversation session.
 * Handles starting conversations, streaming messages, commentary, and moderation.
 */
export function useConversation({ slug, socketUrl }: UseConversationOptions): UseConversationReturn {
  const { socket, isConnected } = useSocket({ url: socketUrl });
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [coachMessages, setCoachMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCoachStreaming, setIsCoachStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [talkToCoachEnabled, setTalkToCoachEnabled] = useState(false);
  const streamingMessageRef = useRef<string>('');
  const streamingCommentaryRef = useRef<string>('');
  const streamingCoachRef = useRef<string>('');

  // Start conversation when socket connects
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Request to start conversation
    socket.emit('start-conversation', { slug });

    // Handle conversation started
    socket.on('conversation-started', (data: { conversationId: string; messages: MessageData[]; talkToCoachEnabled: boolean }) => {
      setConversation({ conversationId: data.conversationId, messages: data.messages } as Conversation);
      setMessages(data.messages);
      setTalkToCoachEnabled(data.talkToCoachEnabled ?? false);
      setIsLoading(false);
    });

    // Handle incoming message chunks (streaming)
    socket.on('message-chunk', (data: { chunk: string }) => {
      setIsStreaming(true);
      streamingMessageRef.current += data.chunk;

      // Update the streaming placeholder message specifically by messageId
      // This prevents race conditions with commentary chunks
      setMessages((prev) => {
        return prev.map((m) =>
          m.messageId === 'streaming'
            ? { ...m, content: streamingMessageRef.current }
            : m
        );
      });
    });

    // Handle message complete
    socket.on('message-complete', () => {
      setIsStreaming(false);
      streamingMessageRef.current = '';
      // The streaming message already has content from chunks
      // Just update messageId to make it permanent
      setMessages((prev) => {
        return prev.map((m) =>
          m.messageId === 'streaming'
            ? { ...m, messageId: `ai-${Date.now()}` }
            : m
        );
      });
    });

    // Handle new message added (full message, not streaming)
    socket.on('message-added', (message: MessageData) => {
      setMessages((prev) => [...prev, message]);
    });

    // Handle errors
    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      setIsStreaming(false);
    });

    // Handle commentary chunks (coaching feedback)
    socket.on('commentary-chunk', (data: { chunk: string; role: string }) => {
      streamingCommentaryRef.current += data.chunk;

      // Add or update streaming commentary message
      setMessages((prev) => {
        const existingCommentary = prev.find((m) => m.messageId === 'streaming-commentary');
        if (existingCommentary) {
          return prev.map((m) =>
            m.messageId === 'streaming-commentary'
              ? { ...m, content: streamingCommentaryRef.current }
              : m
          );
        }
        // Add new commentary message
        return [
          ...prev,
          {
            messageId: 'streaming-commentary',
            type: 'COMMENTARY' as MessageData['type'],
            role: data.role,
            content: streamingCommentaryRef.current,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    });

    // Handle commentary complete
    socket.on('commentary-complete', () => {
      streamingCommentaryRef.current = '';
      // Finalize the commentary message ID
      setMessages((prev) => {
        return prev.map((m) =>
          m.messageId === 'streaming-commentary'
            ? { ...m, messageId: `commentary-${Date.now()}` }
            : m
        );
      });
    });

    // Handle moderation warnings
    socket.on('message-moderated', (data: { flagged: boolean; categories: string[]; message: string; isComplete: boolean }) => {
      // Remove the AI placeholder since we won't be getting a response
      // and add a moderation message instead
      setMessages((prev) => {
        // Filter out the streaming placeholder
        const filtered = prev.filter((m) => m.messageId !== 'streaming');
        // Add moderation message
        return [
          ...filtered,
          {
            messageId: `moderation-${Date.now()}`,
            type: 'MODERATION' as MessageData['type'],
            role: 'System',
            content: data.message,
            timestamp: new Date().toISOString(),
          },
        ];
      });
      setIsStreaming(false);
      // Moderation ends the conversation
      if (data.isComplete) {
        setIsComplete(true);
      }
    });

    // Handle coach message chunks (streaming)
    socket.on('coach-message-chunk', (data: { chunk: string }) => {
      setIsCoachStreaming(true);
      streamingCoachRef.current += data.chunk;

      // Update the streaming coach message
      setCoachMessages((prev) => {
        return prev.map((m) =>
          m.messageId === 'streaming-coach'
            ? { ...m, content: streamingCoachRef.current }
            : m
        );
      });
    });

    // Handle coach message complete
    socket.on('coach-message-complete', (data: { content: string }) => {
      setIsCoachStreaming(false);
      streamingCoachRef.current = '';

      // Finalize the coach message
      setCoachMessages((prev) => {
        return prev.map((m) =>
          m.messageId === 'streaming-coach'
            ? { ...m, messageId: `coach-${Date.now()}`, content: data.content }
            : m
        );
      });
    });

    return () => {
      socket.off('conversation-started');
      socket.off('message-chunk');
      socket.off('message-complete');
      socket.off('message-added');
      socket.off('error');
      socket.off('commentary-chunk');
      socket.off('commentary-complete');
      socket.off('message-moderated');
      socket.off('coach-message-chunk');
      socket.off('coach-message-complete');
    };
  }, [socket, isConnected, slug]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!socket || !isConnected || !conversation) return;

      // Add user message immediately
      const userMessage: MessageData = {
        messageId: `user-${Date.now()}`,
        type: 'USER' as MessageData['type'],
        role: 'You',
        content: text,
        timestamp: new Date().toISOString(),
      };

      // Add placeholder for AI response
      const aiPlaceholder: MessageData = {
        messageId: 'streaming',
        type: 'CONVERSATION' as MessageData['type'],
        role: 'AI',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, aiPlaceholder]);
      streamingMessageRef.current = '';

      // Send via socket with conversationId and content
      socket.emit('send-message', {
        conversationId: conversation.conversationId,
        content: text
      });
    },
    [socket, isConnected, conversation]
  );

  const sendCoachMessage = useCallback(
    (text: string) => {
      if (!socket || !isConnected || !conversation) return;

      // Add user's coach message immediately
      const userMessage: MessageData = {
        messageId: `coach-user-${Date.now()}`,
        type: 'USER' as MessageData['type'],
        role: 'You',
        content: text,
        timestamp: new Date().toISOString(),
      };

      // Add placeholder for coach response
      const coachPlaceholder: MessageData = {
        messageId: 'streaming-coach',
        type: 'SIMPLE' as MessageData['type'],
        role: 'Coach',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setCoachMessages((prev) => [...prev, userMessage, coachPlaceholder]);
      streamingCoachRef.current = '';

      // Send to server with conversationId
      socket.emit('send-coach-message', {
        conversationId: conversation.conversationId,
        content: text,
      });
    },
    [socket, isConnected, conversation]
  );

  const startNewConversation = useCallback(() => {
    if (!socket || !isConnected) return;

    // Reset all state for new conversation
    setMessages([]);
    setCoachMessages([]);
    setConversation(null);
    setIsComplete(false);
    setError(null);
    setIsLoading(true);
    setIsStreaming(false);
    setIsCoachStreaming(false);
    streamingMessageRef.current = '';
    streamingCommentaryRef.current = '';
    streamingCoachRef.current = '';

    // Request new conversation with same slug
    socket.emit('start-conversation', { slug });
  }, [socket, isConnected, slug]);

  return {
    conversation,
    messages,
    coachMessages,
    isLoading,
    isStreaming,
    isCoachStreaming,
    isComplete,
    error,
    talkToCoachEnabled,
    sendMessage,
    sendCoachMessage,
    startNewConversation,
  };
}
