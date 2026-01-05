import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../components/AuthProvider';
import type { MessageData } from '@downpat/ui-components';
import type { Conversation } from '@downpat/core';

interface UseSocketOptions {
  autoConnect?: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true } = options;
  const { token, isAuthenticated: hasAuth } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!token) return;

    const newSocket = io(window.location.origin, {
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
  }, [token]);

  const disconnect = useCallback(() => {
    socket?.close();
    setSocket(null);
    setIsConnected(false);
    setIsAuthenticated(false);
  }, [socket]);

  useEffect(() => {
    if (autoConnect && hasAuth && token) {
      const cleanup = connect();
      return cleanup;
    }
  }, [autoConnect, hasAuth, token, connect]);

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
}

interface UseConversationReturn {
  conversation: Conversation | null;
  messages: MessageData[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  sendCoachMessage: (text: string) => void;
}

export function useConversation({ slug }: UseConversationOptions): UseConversationReturn {
  const { socket, isConnected } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingMessageRef = useRef<string>('');

  // Start conversation when socket connects
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Request to start conversation
    socket.emit('start-conversation', { slug });

    // Handle conversation started
    socket.on('conversation-started', (data: { conversationId: string; messages: MessageData[] }) => {
      setConversation({ conversationId: data.conversationId, messages: data.messages } as Conversation);
      setMessages(data.messages);
      setIsLoading(false);
    });

    // Handle incoming message chunks (streaming)
    socket.on('message-chunk', (chunk: string) => {
      setIsStreaming(true);
      streamingMessageRef.current += chunk;

      // Update the last AI message with the streamed content
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.type !== 'USER') {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: streamingMessageRef.current },
          ];
        }
        return prev;
      });
    });

    // Handle message complete
    socket.on('message-complete', (message: MessageData) => {
      setIsStreaming(false);
      streamingMessageRef.current = '';
      setMessages((prev) => {
        // Replace the streaming placeholder with the final message
        const updated = prev.filter((m) => m.messageId !== 'streaming');
        return [...updated, message];
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

    return () => {
      socket.off('conversation-started');
      socket.off('message-chunk');
      socket.off('message-complete');
      socket.off('message-added');
      socket.off('error');
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
      if (!socket || !isConnected) return;
      socket.emit('send-coach-message', { text });
    },
    [socket, isConnected]
  );

  return {
    conversation,
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    sendCoachMessage,
  };
}
