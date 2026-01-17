import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { ConversationStorage, ExerciseStorage, UserStateStorage, ServerAuthProvider, User, AIAdapter, AIMessage, Task, ModerationAdapter } from '@downpat/core';
import { ConversationController, MessageType, isCommentaryTask, parseStarterContent } from '@downpat/core';

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
  /** User state storage implementation (for conversation resumption) */
  userStateStorage?: UserStateStorage;
  /** AI adapter for generating responses */
  aiAdapter?: AIAdapter;
  /** Moderation adapter for content filtering */
  moderationAdapter?: ModerationAdapter;
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

    // Start a new conversation by exercise slug (or resume existing if userStateStorage is configured)
    socket.on('start-conversation', async (data: { slug: string; query?: Record<string, string> }) => {
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

        let conversation;
        let isResumed = false;

        // Use getOrStartConversation if userStateStorage is available (enables resumption)
        // The controller now handles adding welcome/starter messages for new conversations
        if (config.userStateStorage) {
          conversation = await controller.getOrStartConversation(
            exercise.exerciseId,
            socket.data.user,
            config.userStateStorage,
            data.query
          );
          // A resumed conversation has user messages (welcome/starter don't count)
          // New conversations will have messages (welcome/starter) but userMessageCount = 0
          isResumed = conversation.userMessageCount > 0;
        } else {
          // Fall back to always creating new conversation
          conversation = await controller.startConversation(
            exercise.exerciseId,
            socket.data.user,
            data.query
          );
        }

        // Join the conversation room
        socket.join(`conversation:${conversation.conversationId}`);

        // Emit conversation started with messages and exercise settings
        socket.emit('conversation-started', {
          conversationId: conversation.conversationId,
          messages: conversation.messages,
          talkToCoachEnabled: exercise.talkToCoachEnabled ?? false,
          isResumed,
        });
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to start conversation',
        });
      }
    });

    // Join a conversation room for updates (used for resuming real-time updates on existing conversation)
    socket.on('join-conversation', async (data: { conversationId: string }) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // Verify user has access and get full conversation
        const conversation = await controller.getConversation(data.conversationId, socket.data.user);

        // Get exercise for talkToCoachEnabled flag
        const exercise = await config.exerciseStorage.getExercise(conversation.exerciseId);

        // Join the room for real-time updates
        socket.join(`conversation:${data.conversationId}`);

        // Emit full conversation data (similar to conversation-started but for resumption)
        socket.emit('conversation-joined', {
          conversationId: conversation.conversationId,
          messages: conversation.messages,
          isComplete: conversation.isComplete,
          talkToCoachEnabled: exercise?.talkToCoachEnabled ?? false,
        });
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
        // 0. Check moderation if adapter is available
        if (config.moderationAdapter) {
          try {
            const moderationResult = await config.moderationAdapter.checkContent(data.content);
            if (moderationResult.flagged) {
              // Get flagged categories for the message
              const flaggedCategories = Object.entries(moderationResult.categories)
                .filter(([, flagged]) => flagged)
                .map(([category]) => category);

              // Add user message first (so they can see what they sent)
              await controller.addUserMessage(
                data.conversationId,
                data.content,
                socket.data.user
              );

              // Add moderation message
              const moderationMessage = `Your message was flagged for: ${flaggedCategories.join(', ')}. Please keep the conversation appropriate.`;
              await controller.addAIMessage(
                data.conversationId,
                {
                  type: MessageType.MODERATION,
                  role: 'System',
                  content: moderationMessage,
                },
                socket.data.user
              );

              // Mark conversation as complete - moderation ends the conversation
              await config.conversationStorage.updateConversation(data.conversationId, {
                isComplete: true,
                updatedAt: new Date().toISOString(),
              });

              // Emit moderation event to client with isComplete flag
              socket.emit('message-moderated', {
                flagged: true,
                categories: flaggedCategories,
                message: moderationMessage,
                isComplete: true,
              });

              return; // Don't proceed with AI response
            }
          } catch (moderationError) {
            console.error('Moderation check failed:', moderationError);
            // Continue with message processing if moderation fails
          }
        }

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
            } else if (msg.type === MessageType.CONTEXT) {
              // CONTEXT messages provide scenario context to the AI
              aiMessages.push({ role: 'system', content: `Context: ${msg.content}` });
            } else if (msg.type === MessageType.STARTER) {
              // STARTER messages contain the full starter object as JSON
              // Parse and include for AI context (includes text, context, and attributes)
              const parsed = parseStarterContent(msg.content);
              if (parsed) {
                aiMessages.push({ role: 'assistant', content: JSON.stringify(parsed) });
              }
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
                    } else if (msg.type === MessageType.CONTEXT) {
                      commentaryMessages.push({ role: 'system', content: `Context: ${msg.content}` });
                    } else if (msg.type === MessageType.STARTER) {
                      const parsed = parseStarterContent(msg.content);
                      if (parsed) {
                        commentaryMessages.push({ role: 'assistant', content: JSON.stringify(parsed) });
                      }
                    } else if (msg.type === MessageType.COMMENTARY) {
                      // Include previous commentary
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

    // Handle coach messages (Talk to Coach feature)
    socket.on('send-coach-message', async (data: { conversationId: string; content: string }) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // Get conversation and exercise for context
        const conversation = await controller.getConversation(data.conversationId, socket.data.user);
        const exercise = await config.exerciseStorage.getExercise(conversation.exerciseId);

        if (!exercise) {
          socket.emit('error', { message: 'Exercise not found' });
          return;
        }

        // If we have an AI adapter, generate coach response
        if (config.aiAdapter) {
          const model = exercise.model || config.defaultModel || 'gpt-4';

          // Build messages for coach AI
          const coachMessages: AIMessage[] = [
            {
              role: 'system',
              content: `You are a helpful coach assisting a learner who is practicing: "${exercise.exerciseName}".
Your role is to:
- Answer questions about the exercise and how to approach it
- Provide tips and guidance without doing the work for them
- Encourage and support their learning
- Help them understand concepts they're struggling with

Be concise, supportive, and focused on helping them learn.`,
            },
          ];

          // Add conversation context (so coach knows what's been discussed)
          coachMessages.push({
            role: 'system',
            content: `Here is the conversation so far for context:\n${conversation.messages.map(m => `${m.role}: ${m.content}`).join('\n')}`,
          });

          // Add the user's coach question
          coachMessages.push({ role: 'user', content: data.content });

          // Stream coach response
          let fullCoachContent = '';

          try {
            await config.aiAdapter.complete({
              model,
              messages: coachMessages,
              maxTokens: 512,
              temperature: 0.7,
              onChunk: (chunk: string) => {
                fullCoachContent += chunk;
                socket.emit('coach-message-chunk', { chunk });
              },
            });

            // Emit coach message complete with full content
            socket.emit('coach-message-complete', { content: fullCoachContent });
          } catch (aiError) {
            console.error('Coach AI error:', aiError);
            socket.emit('error', {
              message: 'Failed to generate coach response',
            });
          }
        } else {
          // No AI adapter - send a default response
          socket.emit('coach-message-complete', {
            content: 'Coach responses require an AI adapter to be configured.',
          });
        }
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to send coach message',
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
  'start-conversation': (data: { slug: string; query?: Record<string, string> }) => void;
  'join-conversation': (data: { conversationId: string }) => void;
  'leave-conversation': (conversationId: string) => void;
  'send-message': (data: { conversationId: string; content: string }) => void;
  'send-coach-message': (data: { conversationId: string; content: string }) => void;
}

/**
 * Events the server can send to the client.
 */
interface ServerToClientEvents {
  authenticated: (result: { success: boolean; user?: User; error?: string }) => void;
  'conversation-started': (data: {
    conversationId: string;
    messages: import('@downpat/core').Message[];
    talkToCoachEnabled: boolean;
    isResumed: boolean;
  }) => void;
  'conversation-joined': (data: {
    conversationId: string;
    messages: import('@downpat/core').Message[];
    isComplete: boolean;
    talkToCoachEnabled: boolean;
  }) => void;
  'message-added': (data: {
    conversationId: string;
    conversation: import('@downpat/core').Conversation;
    isComplete: boolean;
  }) => void;
  'message-chunk': (data: { chunk: string }) => void;
  'message-complete': () => void;
  'commentary-chunk': (data: { chunk: string; role: string }) => void;
  'commentary-complete': (data: { role: string }) => void;
  'coach-message-chunk': (data: { chunk: string }) => void;
  'coach-message-complete': (data: { content: string }) => void;
  'message-moderated': (data: { flagged: boolean; categories: string[]; message: string; isComplete: boolean }) => void;
  error: (data: { message: string }) => void;
}
