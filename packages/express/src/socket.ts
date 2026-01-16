import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { ConversationStorage, ExerciseStorage, UserStateStorage, ServerAuthProvider, User, AIAdapter, AIMessage, Task, ModerationAdapter, Starter, Message } from '@downpat/core';
import { ConversationController, MessageType, isCommentaryTask, generateId } from '@downpat/core';

/**
 * Select a starter from the available starters based on query params.
 * If query params match starter attributes, filters to matching starters.
 * Only checks query params that exist in the starter's attributes (ignores
 * unrelated params like UTM tracking codes).
 * Returns a randomly selected starter from the filtered (or full) list.
 */
function selectStarter(starters: Starter[], query: Record<string, string> = {}): Starter | null {
  if (!starters || starters.length === 0) {
    return null;
  }

  // If query params are provided, filter starters by matching attributes
  if (Object.keys(query).length > 0) {
    const filtered = starters.filter((starter) => {
      // Only check query params that exist in this starter's attributes
      // This allows unrelated params (UTM, tracking, etc.) to be ignored
      for (const key in starter.attributes) {
        if (key in query) {
          const queryValue = query[key]?.toLowerCase();
          const attrValue = starter.attributes[key]?.toLowerCase();
          if (queryValue !== attrValue) {
            return false;
          }
        }
      }
      return true;
    });

    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
    // If no matches, fall back to random from all starters
  }

  return starters[Math.floor(Math.random() * starters.length)];
}

/**
 * Create Messages from a Starter.
 * Returns an array of messages:
 * - If context exists, a CONTEXT message is created first (for AI context, not displayed to user)
 * - Then a STARTER message with the full starter object as JSON content
 *
 * The JSON format allows passing all starter data (text, context, attributes) to the AI.
 * The UI should parse the JSON and display only the 'text' field.
 */
function starterToMessages(starter: Starter): Message[] {
  const messages: Message[] = [];
  const timestamp = new Date().toISOString();

  // If context exists, create a CONTEXT message first
  // This provides scenario context to the AI but is filtered from user display
  if (starter.context && starter.context.trim()) {
    messages.push({
      messageId: generateId(),
      type: MessageType.CONTEXT,
      role: 'System',
      content: starter.context,
      timestamp,
    });
  }

  // Create the STARTER message with full starter object as JSON
  // This includes text, context, and all attributes for the AI
  const starterContent = JSON.stringify({
    text: starter.text,
    context: starter.context || '',
    ...starter.attributes,
  });

  // Get role from attributes if 'name' is provided, otherwise default to 'Assistant'
  const role = starter.attributes?.name || 'Assistant';

  messages.push({
    messageId: generateId(),
    type: MessageType.STARTER,
    role,
    content: starterContent,
    timestamp,
  });

  return messages;
}

/**
 * Parse starter content from a STARTER message.
 * Returns the parsed object or null if parsing fails.
 */
function parseStarterContent(content: string): { text: string; context?: string; [key: string]: unknown } | null {
  try {
    return JSON.parse(content) as { text: string; context?: string; [key: string]: unknown };
  } catch {
    // If not valid JSON, treat content as plain text (backwards compatibility)
    return { text: content };
  }
}

/**
 * Create a welcome Message.
 */
function createWelcomeMessage(welcomeText: string): Message {
  return {
    messageId: generateId(),
    type: MessageType.STARTER,
    role: 'System',
    content: welcomeText,
    timestamp: new Date().toISOString(),
  };
}

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

    // Start a new conversation by exercise slug
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

        // Create the conversation
        const conversation = await controller.startConversation(exercise.exerciseId, socket.data.user);

        // Add the first message(s): welcome message first, then starter if defined
        // Note: addMessage modifies conversation.messages in-place for in-memory storage,
        // so we don't need to push separately

        // Always add welcome message first if it exists
        if (exercise.welcomeMessage) {
          const welcomeMessage = createWelcomeMessage(exercise.welcomeMessage);
          await config.conversationStorage.addMessage(conversation.conversationId, welcomeMessage);
        }

        // Then add starter messages if starters are defined
        if (exercise.starters && exercise.starters.length > 0) {
          const selectedStarter = selectStarter(exercise.starters, data.query);
          if (selectedStarter) {
            // starterToMessages returns array: [CONTEXT message (if context exists), STARTER message]
            const starterMessages = starterToMessages(selectedStarter);
            for (const msg of starterMessages) {
              await config.conversationStorage.addMessage(conversation.conversationId, msg);
            }
          }
        }

        // Fetch updated conversation to get messages (storage may have added them)
        const updatedConversation = await config.conversationStorage.getConversation(conversation.conversationId);

        // Join the conversation room
        socket.join(`conversation:${conversation.conversationId}`);

        // Emit conversation started with messages and exercise settings
        socket.emit('conversation-started', {
          conversationId: conversation.conversationId,
          messages: updatedConversation?.messages || [],
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
  'join-conversation': (conversationId: string) => void;
  'leave-conversation': (conversationId: string) => void;
  'send-message': (data: { conversationId: string; content: string }) => void;
  'send-coach-message': (data: { conversationId: string; content: string }) => void;
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
  'coach-message-chunk': (data: { chunk: string }) => void;
  'coach-message-complete': (data: { content: string }) => void;
  'message-moderated': (data: { flagged: boolean; categories: string[]; message: string; isComplete: boolean }) => void;
  error: (data: { message: string }) => void;
}
