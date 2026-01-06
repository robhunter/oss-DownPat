import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { ConversationStorage, ExerciseStorage, ServerAuthProvider, User, AIAdapter, AIMessage, Task } from '@downpat/core';
import { ConversationController, MessageType, isCommentaryTask } from '@downpat/core';

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
  /** AI adapter for generating responses */
  aiAdapter?: AIAdapter;
  /** Default AI model to use */
  defaultModel?: string;
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

  io.on('connection', async (socket) => {
    console.log('Socket connected:', socket.id);
    socket.data.user = null;

    // Try to authenticate from handshake auth token
    const handshakeToken = socket.handshake.auth?.token;
    if (handshakeToken) {
      try {
        const user = await config.serverAuth.validateToken(handshakeToken);
        socket.data.user = user;
        socket.emit('authenticated', { success: true, user });
        console.log('Socket authenticated:', socket.id, user.userId);
      } catch (error) {
        socket.emit('authenticated', {
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    }

    // Also handle explicit authentication event (for backwards compatibility)
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

    // Start a new conversation by exercise slug
    socket.on('start-conversation', async (data: { slug: string }) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // Look up exercise by slug (published only for non-admins)
        const publishedOnly = !socket.data.user.isAdmin;
        const exercise = await config.exerciseStorage.getExerciseBySlug(data.slug, publishedOnly);
        if (!exercise) {
          socket.emit('error', { message: 'Exercise not found' });
          return;
        }

        // Create the conversation
        const conversation = await controller.startConversation(exercise.exerciseId, socket.data.user);

        // Join the conversation room
        socket.join(`conversation:${conversation.conversationId}`);

        // Emit conversation started with messages and exercise settings
        socket.emit('conversation-started', {
          conversationId: conversation.conversationId,
          messages: conversation.messages || [],
          talkToCoachEnabled: exercise.talkToCoachEnabled ?? false,
        });
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to start conversation',
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

    // Handle sending a message and getting AI response
    socket.on('send-message', async (data: { conversationId: string; content: string }) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // 1. Add user message
        const result = await controller.addUserMessage(
          data.conversationId,
          data.content,
          socket.data.user
        );

        // 2. Get conversation and exercise for AI context
        const conversation = result.conversation;
        const exercise = await config.exerciseStorage.getExercise(conversation.exerciseId);

        if (!exercise) {
          socket.emit('error', { message: 'Exercise not found' });
          return;
        }

        // 3. If we have an AI adapter, generate response
        if (config.aiAdapter) {
          const model = exercise.model || config.defaultModel || 'gpt-4';

          // Build messages for AI
          const aiMessages: AIMessage[] = [
            {
              role: 'system',
              content: exercise.guidelines || `You are an AI assistant for the exercise: ${exercise.exerciseName}`,
            },
          ];

          // Add conversation history
          for (const msg of conversation.messages) {
            if (msg.type === MessageType.USER) {
              aiMessages.push({ role: 'user', content: msg.content });
            } else if (msg.type === MessageType.CONVERSATION) {
              aiMessages.push({ role: 'assistant', content: msg.content });
            }
          }

          // 4. Stream AI response
          let fullContent = '';

          try {
            await config.aiAdapter.complete({
              model,
              messages: aiMessages,
              maxTokens: 1024,
              temperature: 0.7,
              onChunk: (chunk: string) => {
                fullContent += chunk;
                socket.emit('message-chunk', { chunk });
              },
            });

            // 5. Save AI message
            await controller.addAIMessage(
              data.conversationId,
              {
                type: MessageType.CONVERSATION,
                role: 'AI',
                content: fullContent,
              },
              socket.data.user!
            );

            // 6. Emit message complete
            socket.emit('message-complete');

            // 7. Process commentary tasks from continuationTasks
            const commentaryTasks = (exercise.continuationTasks || []).filter(
              (task: Task) => task.enabled && isCommentaryTask(task)
            );

            if (commentaryTasks.length > 0) {
              // Fetch updated conversation for commentary context
              const updatedConversation = await controller.getConversation(data.conversationId, socket.data.user!);

              for (const commentaryTask of commentaryTasks) {
                try {
                  // Build messages for commentary AI
                  const commentaryMessages: AIMessage[] = [
                    {
                      role: 'system',
                      content: commentaryTask.prompt,
                    },
                  ];

                  // Add conversation history for commentary context
                  for (const msg of updatedConversation.messages) {
                    if (msg.type === MessageType.USER) {
                      commentaryMessages.push({ role: 'user', content: msg.content });
                    } else if (msg.type === MessageType.CONVERSATION) {
                      commentaryMessages.push({ role: 'assistant', content: msg.content });
                    }
                    // Optionally include previous commentary
                    if (msg.type === MessageType.COMMENTARY) {
                      commentaryMessages.push({ role: 'assistant', content: `[Previous Commentary]: ${msg.content}` });
                    }
                  }

                // Stream commentary response
                let commentaryContent = '';
                await config.aiAdapter.complete({
                  model,
                  messages: commentaryMessages,
                  maxTokens: 512,
                  temperature: 0.7,
                  onChunk: (chunk: string) => {
                    commentaryContent += chunk;
                    socket.emit('commentary-chunk', { chunk, role: commentaryTask.role });
                  },
                });

                // Save commentary message
                await controller.addAIMessage(
                  data.conversationId,
                  {
                    type: MessageType.COMMENTARY,
                    role: commentaryTask.role,
                    content: commentaryContent,
                  },
                  socket.data.user!
                );

                // Emit commentary complete
                socket.emit('commentary-complete', { role: commentaryTask.role });
              } catch (commentaryError) {
                console.error('[Socket] Commentary error:', commentaryError);
                // Don't fail the whole message if commentary fails
              }
              }
            }
          } catch (aiError) {
            console.error('AI error:', aiError);
            socket.emit('error', {
              message: 'Failed to generate AI response',
            });
          }
        } else {
          // No AI adapter - just acknowledge the message
          socket.emit('message-added', {
            conversationId: data.conversationId,
            conversation: result.conversation,
            isComplete: result.isComplete,
          });
        }
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
  'start-conversation': (data: { slug: string }) => void;
  'join-conversation': (conversationId: string) => void;
  'leave-conversation': (conversationId: string) => void;
  'send-message': (data: { conversationId: string; content: string }) => void;
}

/**
 * Events the server can send to the client.
 */
interface ServerToClientEvents {
  authenticated: (result: { success: boolean; user?: User; error?: string }) => void;
  'conversation-started': (data: { conversationId: string; messages: import('@downpat/core').Message[]; talkToCoachEnabled: boolean }) => void;
  'joined-conversation': (data: { conversationId: string }) => void;
  'message-added': (data: {
    conversationId: string;
    conversation: import('@downpat/core').Conversation;
    isComplete: boolean;
  }) => void;
  'message-chunk': (data: { chunk: string }) => void;
  'message-complete': () => void;
  'commentary-chunk': (data: { chunk: string; role: string }) => void;
  'commentary-complete': (data: { role: string }) => void;
  error: (data: { message: string }) => void;
}
