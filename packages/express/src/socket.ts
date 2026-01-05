import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { ConversationStorage, ExerciseStorage, ServerAuthProvider, User } from '@downpat/core';
import { ConversationController } from '@downpat/core';

/**
 * Socket.io configuration options.
 */
export interface SocketConfig {
  /** Server-side authentication provider */
  serverAuth: ServerAuthProvider;
  /** Conversation storage implementation */
  conversationStorage: ConversationStorage;
  /** Exercise storage implementation */
  exerciseStorage: ExerciseStorage;
  /** CORS origins to allow (default: '*') */
  corsOrigin?: string | string[];
}

/**
 * Socket data stored per connection.
 */
interface SocketData {
  user: User | null;
}

/**
 * Attaches Socket.io to an HTTP server for real-time conversation updates.
 *
 * @param httpServer - The HTTP server to attach to
 * @param config - Socket configuration
 * @returns The Socket.io server instance
 */
export function attachSocketIO(httpServer: HTTPServer, config: SocketConfig): SocketServer {
  const io = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: {
      origin: config.corsOrigin ?? '*',
      methods: ['GET', 'POST'],
    },
  });

  const controller = new ConversationController(
    config.conversationStorage,
    config.exerciseStorage
  );

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.data.user = null;

    // Handle authentication
    socket.on('authenticate', async (token: string) => {
      try {
        const user = await config.serverAuth.validateToken(token);
        socket.data.user = user;
        socket.emit('authenticated', { success: true, user });
        console.log('Socket authenticated:', socket.id, user.userId);
      } catch (error) {
        socket.emit('authenticated', {
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    });

    // Join a conversation room for updates
    socket.on('join-conversation', async (conversationId: string) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // Verify user has access to this conversation
        await controller.getConversation(conversationId, socket.data.user);
        socket.join(`conversation:${conversationId}`);
        socket.emit('joined-conversation', { conversationId });
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to join conversation',
        });
      }
    });

    // Leave a conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Handle sending a message (will be used for streaming AI responses)
    socket.on('send-message', async (data: { conversationId: string; content: string }) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        const result = await controller.addUserMessage(
          data.conversationId,
          data.content,
          socket.data.user
        );

        // Broadcast to all users in the conversation room
        io.to(`conversation:${data.conversationId}`).emit('message-added', {
          conversationId: data.conversationId,
          conversation: result.conversation,
          isComplete: result.isComplete,
        });
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to send message',
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

/**
 * Events the client can send to the server.
 */
interface ClientToServerEvents {
  authenticate: (token: string) => void;
  'join-conversation': (conversationId: string) => void;
  'leave-conversation': (conversationId: string) => void;
  'send-message': (data: { conversationId: string; content: string }) => void;
}

/**
 * Events the server can send to the client.
 */
interface ServerToClientEvents {
  authenticated: (result: { success: boolean; user?: User; error?: string }) => void;
  'joined-conversation': (data: { conversationId: string }) => void;
  'message-added': (data: {
    conversationId: string;
    conversation: import('@downpat/core').Conversation;
    isComplete: boolean;
  }) => void;
  'message-chunk': (data: { chunk: string }) => void;
  'message-complete': () => void;
  error: (data: { message: string }) => void;
}
