import { Server as SocketServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { ConversationStorage, ExerciseStorage, UserStateStorage, ServerAuthProvider, User, AIAdapter, AIMessage, Task, ModerationAdapter, Conversation, Exercise, Message, ConversationTask, CommentaryTask, SummaryTask, AITool, AIToolCallbacks } from '@downpat/core';
import { ConversationController, MessageType, isCommentaryTask, isSummaryTask, isConversationTask, parseStarterContent } from '@downpat/core';

/**
 * Default model to use when neither exercise.model nor config.defaultModel is set.
 * Centralized here to avoid hardcoding in multiple places.
 */
const DEFAULT_MODEL = 'gpt-4';

/**
 * Build the system prompt for a task.
 * For tasks with includeGuidelines=true, prepends exercise guidelines to the task prompt.
 */
function buildTaskPrompt(task: CommentaryTask | SummaryTask, guidelines: string): string {
  let prompt = task.prompt;

  if (task.includeGuidelines && guidelines) {
    prompt = `${guidelines}\n\n${prompt}`;
  }

  return prompt;
}

/**
 * Tool definition for commentary responses with grade.
 */
const COMMENTARY_TOOL: AITool = {
  name: 'commentary',
  description: 'Provide coaching commentary on the conversation with a grade assessment',
  parameters: {
    commentary: {
      type: 'string',
      description: 'Your coaching feedback and commentary on the conversation',
    },
    grade: {
      type: 'string',
      description: 'Assessment of the user\'s performance',
      enum: ['good', 'okay', 'needs improvement'],
    },
  },
  required: ['commentary', 'grade'],
};

/**
 * Parse commentary/summary response to extract grade and content (fallback for non-tool responses).
 * Expected format:
 * GRADE: good|okay|needs improvement
 * [actual commentary/summary text]
 */
function parseGradedResponse(response: string): { grade: string | null; content: string } {
  const lines = response.trim().split('\n');
  const firstLine = lines[0]?.trim() || '';

  // Check if first line matches grade format
  const gradeMatch = firstLine.match(/^GRADE:\s*(good|okay|needs improvement)$/i);

  if (gradeMatch) {
    const grade = gradeMatch[1].toLowerCase();
    const content = lines.slice(1).join('\n').trim();
    return { grade, content };
  }

  // No grade found, return full response as content
  return { grade: null, content: response };
}

/**
 * Build AI messages array from conversation history.
 * Uses the conversation task's prompt if available, otherwise falls back to a default message.
 * Note: exercise.guidelines are NOT used here - they are only for Commentary, Summary, and Talk to Coach tasks.
 */
function buildAIMessagesFromConversation(
  conversation: Conversation,
  exercise: Exercise,
  conversationTask?: ConversationTask
): AIMessage[] {
  // Use conversation task prompt if provided, otherwise use a default
  // Note: guidelines are intentionally NOT used here per UI design
  const systemPrompt = conversationTask?.prompt
    || `You are an AI assistant for the exercise: ${exercise.exerciseName}`;

  const aiMessages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of conversation.messages) {
    if (msg.type === MessageType.USER) {
      aiMessages.push({ role: 'user', content: msg.content });
    } else if (msg.type === MessageType.CONVERSATION) {
      aiMessages.push({ role: 'assistant', content: msg.content });
    } else if (msg.type === MessageType.CONTEXT) {
      aiMessages.push({ role: 'system', content: `Context: ${msg.content}` });
    } else if (msg.type === MessageType.STARTER) {
      const parsed = parseStarterContent(msg.content);
      if (parsed) {
        aiMessages.push({ role: 'assistant', content: JSON.stringify(parsed) });
      }
    }
  }

  return aiMessages;
}

/**
 * Build AI messages for commentary/summary tasks.
 * Includes previous commentary messages for context.
 * The system prompt should already have guidelines prepended if needed (via buildTaskPrompt).
 */
function buildCoachingMessages(
  messages: Message[],
  systemPrompt: string
): AIMessage[] {
  const aiMessages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.type === MessageType.USER) {
      aiMessages.push({ role: 'user', content: msg.content });
    } else if (msg.type === MessageType.CONVERSATION) {
      aiMessages.push({ role: 'assistant', content: msg.content });
    } else if (msg.type === MessageType.CONTEXT) {
      aiMessages.push({ role: 'system', content: `Context: ${msg.content}` });
    } else if (msg.type === MessageType.STARTER) {
      const parsed = parseStarterContent(msg.content);
      if (parsed) {
        aiMessages.push({ role: 'assistant', content: JSON.stringify(parsed) });
      }
    } else if (msg.type === MessageType.COMMENTARY) {
      aiMessages.push({ role: 'assistant', content: `[Previous Commentary]: ${msg.content}` });
    }
  }

  return aiMessages;
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

    // Track active AI stream controllers per conversation to prevent race conditions
    // When a new stream starts, abort any existing stream for the same conversation
    const activeStreams = new Map<string, AbortController>();

    /**
     * Get or create an AbortController for a conversation's AI stream.
     * Aborts any existing stream for the same conversation first.
     */
    const getStreamController = (conversationId: string): AbortController => {
      // Abort any existing stream for this conversation
      const existing = activeStreams.get(conversationId);
      if (existing) {
        existing.abort();
      }
      // Create and store new controller
      const controller = new AbortController();
      activeStreams.set(conversationId, controller);
      return controller;
    };

    /**
     * Clean up the stream controller after completion.
     */
    const clearStreamController = (conversationId: string, controller: AbortController): void => {
      // Only clear if this is still the active controller (wasn't replaced by a newer one)
      if (activeStreams.get(conversationId) === controller) {
        activeStreams.delete(conversationId);
      }
    };

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
          const result = await controller.getOrStartConversation(
            exercise.exerciseId,
            socket.data.user,
            config.userStateStorage,
            data.query
          );
          conversation = result.conversation;
          // isResumed is the inverse of wasCreated (resumed = not newly created)
          isResumed = !result.wasCreated;
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
          const model = exercise.model || config.defaultModel || DEFAULT_MODEL;

          // Find conversation task for system prompt
          const conversationTask = (exercise.continuationTasks || []).find(
            (task: Task) => task.enabled && isConversationTask(task)
          ) as ConversationTask | undefined;

          const aiMessages = buildAIMessagesFromConversation(conversation, exercise, conversationTask);

          // Get stream controller (aborts any existing stream for this conversation)
          const streamController = getStreamController(data.conversationId);

          // Find commentary tasks to run in parallel with conversation
          const commentaryTasks = (exercise.continuationTasks || []).filter(
            (task: Task) => task.enabled && isCommentaryTask(task)
          ) as CommentaryTask[];

          // Build commentary messages now (before conversation response changes the conversation)
          const commentaryMessagesMap = new Map<CommentaryTask, AIMessage[]>();
          for (const commentaryTask of commentaryTasks) {
            const systemPrompt = buildTaskPrompt(commentaryTask, exercise.guidelines || '');
            commentaryMessagesMap.set(commentaryTask, buildCoachingMessages(conversation.messages, systemPrompt));
          }

          // 4. Stream AI response and commentary in PARALLEL
          let fullContent = '';

          try {
            // Create conversation promise
            const conversationPromise = config.aiAdapter.complete({
              model,
              messages: aiMessages,
              maxTokens: 1024,
              temperature: 0.7,
              signal: streamController.signal,
              onChunk: (chunk: string) => {
                fullContent += chunk;
                socket.emit('message-chunk', { chunk });
              },
            });

            // Create commentary promises (run in parallel)
            // Capture adapter reference for use in async closure
            const aiAdapter = config.aiAdapter;
            const commentaryPromises = commentaryTasks.map(async (commentaryTask) => {
              const commentaryMessages = commentaryMessagesMap.get(commentaryTask)!;

              // Check if adapter supports tool calling for streaming with grade
              if (aiAdapter.completeWithTool) {
                // Use tool calling for streaming commentary with grade
                const callbacks: AIToolCallbacks = {
                  commentary: (chunk: string) => {
                    socket.emit('commentary-chunk', { chunk, role: commentaryTask.role });
                  },
                };

                const result = await aiAdapter.completeWithTool({
                  model,
                  messages: commentaryMessages,
                  tool: COMMENTARY_TOOL,
                  maxTokens: 512,
                  temperature: 0.7,
                  callbacks,
                  signal: streamController.signal,
                });

                const commentaryContent = (result.arguments.commentary as string) || '';
                const grade = (result.arguments.grade as string) || null;

                return { commentaryTask, commentaryContent, grade };
              } else {
                // Fallback: non-streaming with text parsing for grade
                const result = await aiAdapter.complete({
                  model,
                  messages: commentaryMessages,
                  maxTokens: 512,
                  temperature: 0.7,
                  signal: streamController.signal,
                });

                const { grade, content: commentaryContent } = parseGradedResponse(result.content);
                return { commentaryTask, commentaryContent, grade };
              }
            });

            // Wait for conversation to complete
            await conversationPromise;

            // 5. Save AI message
            await controller.addAIMessage(
              data.conversationId,
              {
                type: MessageType.CONVERSATION,
                role: conversationTask?.role || 'AI',
                content: fullContent,
              },
              socket.data.user!
            );

            // 6. Emit message complete
            socket.emit('message-complete');

            // 7. Wait for all commentary tasks to complete and save them
            const commentaryResults = await Promise.allSettled(commentaryPromises);

            for (const result of commentaryResults) {
              if (result.status === 'fulfilled') {
                const { commentaryTask, commentaryContent, grade } = result.value;

                try {
                  // Save commentary message with grade in metadata
                  await controller.addAIMessage(
                    data.conversationId,
                    {
                      type: MessageType.COMMENTARY,
                      role: commentaryTask.role,
                      content: commentaryContent,
                      metadata: grade ? { grade } : undefined,
                    },
                    socket.data.user!
                  );

                  // Emit commentary complete with content and grade
                  socket.emit('commentary-complete', {
                    role: commentaryTask.role,
                    content: commentaryContent,
                    grade: grade || undefined,
                  });
                } catch (saveError) {
                  console.error('[Socket] Error saving commentary:', saveError);
                }
              } else {
                console.error('[Socket] Commentary task failed:', result.reason);
              }
            }

            // Clean up stream controller after successful completion
            clearStreamController(data.conversationId, streamController);
          } catch (aiError) {
            // Clean up stream controller on error
            clearStreamController(data.conversationId, streamController);

            // Don't emit error if this was an intentional abort (new stream started)
            if (aiError instanceof Error && aiError.name === 'AbortError') {
              console.log('[Socket] AI stream aborted for conversation:', data.conversationId);
              return;
            }

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
          const model = exercise.model || config.defaultModel || DEFAULT_MODEL;

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

    // Edit a previous user message (truncates all messages after it)
    socket.on('edit-message', async (data: {
      conversationId: string;
      messageId: string;
      content: string;
    }) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // Check moderation on the edited content (same as send-message)
        if (config.moderationAdapter) {
          try {
            const moderationResult = await config.moderationAdapter.checkContent(data.content);
            if (moderationResult.flagged) {
              const flaggedCategories = Object.entries(moderationResult.categories)
                .filter(([, flagged]) => flagged)
                .map(([category]) => category);

              socket.emit('error', {
                message: `Edit rejected: content flagged for ${flaggedCategories.join(', ')}`,
              });
              return; // Don't apply the edit
            }
          } catch (moderationError) {
            console.error('Moderation check failed during edit:', moderationError);
            // Continue with edit if moderation check fails
          }
        }

        // Edit the message (truncates everything after it)
        const { conversation, editedMessageIndex } = await controller.editMessage(
          data.conversationId,
          data.messageId,
          data.content,
          socket.data.user
        );

        // Notify client that messages were truncated
        socket.emit('messages-truncated', {
          conversationId: data.conversationId,
          messages: conversation.messages,
          editedMessageIndex,
        });

        // Get exercise for AI regeneration
        const exercise = await config.exerciseStorage.getExercise(conversation.exerciseId);
        if (!exercise) {
          socket.emit('error', { message: 'Exercise not found' });
          return;
        }

        // Regenerate AI response if adapter is available
        if (config.aiAdapter) {
          const model = exercise.model || config.defaultModel || DEFAULT_MODEL;

          // Find conversation task for system prompt
          const conversationTask = (exercise.continuationTasks || []).find(
            (task: Task) => task.enabled && isConversationTask(task)
          ) as ConversationTask | undefined;

          const aiMessages = buildAIMessagesFromConversation(conversation, exercise, conversationTask);

          // Get stream controller (aborts any existing stream for this conversation)
          const streamController = getStreamController(data.conversationId);

          // Find commentary tasks to run in parallel with conversation
          const commentaryTasks = (exercise.continuationTasks || []).filter(
            (task: Task) => task.enabled && isCommentaryTask(task)
          ) as CommentaryTask[];

          // Build commentary messages now (before conversation response changes the conversation)
          const commentaryMessagesMap = new Map<CommentaryTask, AIMessage[]>();
          for (const commentaryTask of commentaryTasks) {
            const systemPrompt = buildTaskPrompt(commentaryTask, exercise.guidelines || '');
            commentaryMessagesMap.set(commentaryTask, buildCoachingMessages(conversation.messages, systemPrompt));
          }

          // Stream AI response and commentary in PARALLEL
          let fullContent = '';

          try {
            // Create conversation promise
            const conversationPromise = config.aiAdapter.complete({
              model,
              messages: aiMessages,
              maxTokens: 1024,
              temperature: 0.7,
              signal: streamController.signal,
              onChunk: (chunk: string) => {
                fullContent += chunk;
                socket.emit('message-chunk', { chunk });
              },
            });

            // Create commentary promises (run in parallel)
            // Capture adapter reference for use in async closures
            const aiAdapter = config.aiAdapter;
            const commentaryPromises = commentaryTasks.map(async (commentaryTask) => {
              const commentaryMessages = commentaryMessagesMap.get(commentaryTask)!;

              // Check if adapter supports tool calling for streaming with grade
              if (aiAdapter.completeWithTool) {
                // Use tool calling for streaming commentary with grade
                const callbacks: AIToolCallbacks = {
                  commentary: (chunk: string) => {
                    socket.emit('commentary-chunk', { chunk, role: commentaryTask.role });
                  },
                };

                const result = await aiAdapter.completeWithTool({
                  model,
                  messages: commentaryMessages,
                  tool: COMMENTARY_TOOL,
                  maxTokens: 512,
                  temperature: 0.7,
                  callbacks,
                  signal: streamController.signal,
                });

                const commentaryContent = (result.arguments.commentary as string) || '';
                const grade = (result.arguments.grade as string) || null;

                return { commentaryTask, commentaryContent, grade };
              } else {
                // Fallback: non-streaming with text parsing for grade
                const result = await aiAdapter.complete({
                  model,
                  messages: commentaryMessages,
                  maxTokens: 512,
                  temperature: 0.7,
                  signal: streamController.signal,
                });

                const { grade, content: commentaryContent } = parseGradedResponse(result.content);
                return { commentaryTask, commentaryContent, grade };
              }
            });

            // Wait for conversation to complete
            await conversationPromise;

            // Save AI message
            await controller.addAIMessage(
              data.conversationId,
              {
                type: MessageType.CONVERSATION,
                role: conversationTask?.role || 'AI',
                content: fullContent,
              },
              socket.data.user!
            );

            // Emit message complete
            socket.emit('message-complete');

            // Wait for all commentary tasks to complete and save them
            const commentaryResults = await Promise.allSettled(commentaryPromises);

            for (const result of commentaryResults) {
              if (result.status === 'fulfilled') {
                const { commentaryTask, commentaryContent, grade } = result.value;

                try {
                  // Save commentary message with grade in metadata
                  await controller.addAIMessage(
                    data.conversationId,
                    {
                      type: MessageType.COMMENTARY,
                      role: commentaryTask.role,
                      content: commentaryContent,
                      metadata: grade ? { grade } : undefined,
                    },
                    socket.data.user!
                  );

                  // Emit commentary complete with content and grade
                  socket.emit('commentary-complete', {
                    role: commentaryTask.role,
                    content: commentaryContent,
                    grade: grade || undefined,
                  });
                } catch (saveError) {
                  console.error('[Socket] Error saving commentary during edit:', saveError);
                }
              } else {
                console.error('[Socket] Commentary task failed during edit:', result.reason);
              }
            }

            // Clean up stream controller after successful completion
            clearStreamController(data.conversationId, streamController);
          } catch (aiError) {
            // Clean up stream controller on error
            clearStreamController(data.conversationId, streamController);

            // Don't emit error if this was an intentional abort (new stream started)
            if (aiError instanceof Error && aiError.name === 'AbortError') {
              console.log('[Socket] AI stream aborted during edit for conversation:', data.conversationId);
              return;
            }

            console.error('AI error during edit regeneration:', aiError);
            socket.emit('error', { message: 'Failed to regenerate AI response' });
          }
        } else {
          // No AI adapter - signal completion so client doesn't hang waiting
          // Client adds a streaming placeholder on messages-truncated, so we need to signal it's done
          socket.emit('message-complete');
        }
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to edit message',
        });
      }
    });

    // Explicitly finish a conversation
    socket.on('finish-conversation', async (data: { conversationId: string }) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // 1. Verify access and get conversation (without marking complete yet)
        const conversation = await controller.getConversation(data.conversationId, socket.data.user);

        if (conversation.isComplete) {
          socket.emit('error', { message: 'Conversation is already complete' });
          return;
        }

        // 2. Get exercise for completion tasks
        const exercise = await config.exerciseStorage.getExercise(conversation.exerciseId);

        // 3. Run completion tasks BEFORE marking complete
        // This ensures tasks run even if server crashes - conversation won't be falsely marked done
        if (config.aiAdapter && exercise?.completionTasks && exercise.completionTasks.length > 0) {
          const model = exercise.model || config.defaultModel || DEFAULT_MODEL;

          for (const task of exercise.completionTasks) {
            if (!task.enabled) continue;

            try {
              // Build system prompt - include guidelines for summary tasks if includeGuidelines is true
              let systemPrompt = task.prompt;
              if (isSummaryTask(task)) {
                systemPrompt = buildTaskPrompt(task, exercise.guidelines || '');
              }

              // Build messages for completion task
              const completionMessages = buildCoachingMessages(
                conversation.messages,
                systemPrompt
              );

              // Stream completion task response
              let completionContent = '';
              await config.aiAdapter.complete({
                model,
                messages: completionMessages,
                maxTokens: 1024,
                temperature: 0.7,
                onChunk: (chunk: string) => {
                  completionContent += chunk;
                  socket.emit('completion-chunk', { chunk, role: task.role });
                },
              });

              // Save completion message
              await controller.addAIMessage(
                data.conversationId,
                {
                  type: task.responseType,
                  role: task.role,
                  content: completionContent,
                },
                socket.data.user!
              );

              socket.emit('completion-complete', { role: task.role });
            } catch (taskError) {
              console.error('[Socket] Completion task error:', taskError);
              // Notify client that this task failed (don't fail the whole finish)
              socket.emit('completion-task-error', {
                role: task.role,
                error: taskError instanceof Error ? taskError.message : 'Completion task failed',
              });
            }
          }
        }

        // 4. NOW mark conversation as complete (after tasks have run)
        await controller.finishConversation(
          data.conversationId,
          socket.data.user,
          config.userStateStorage
        );

        // 5. Notify completion
        socket.emit('conversation-finished', {
          conversationId: data.conversationId,
          isComplete: true,
        });

        // Broadcast to room (for any other connected clients)
        socket.to(`conversation:${data.conversationId}`).emit('conversation-finished', {
          conversationId: data.conversationId,
          isComplete: true,
        });
      } catch (error) {
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to finish conversation',
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
      // Abort any active AI streams for this socket
      for (const controller of activeStreams.values()) {
        controller.abort();
      }
      activeStreams.clear();
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
  'edit-message': (data: { conversationId: string; messageId: string; content: string }) => void;
  'finish-conversation': (data: { conversationId: string }) => void;
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
  'commentary-complete': (data: { role: string; content?: string; grade?: string }) => void;
  'coach-message-chunk': (data: { chunk: string }) => void;
  'coach-message-complete': (data: { content: string }) => void;
  'message-moderated': (data: { flagged: boolean; categories: string[]; message: string; isComplete: boolean }) => void;
  'messages-truncated': (data: {
    conversationId: string;
    messages: import('@downpat/core').Message[];
    editedMessageIndex: number;
  }) => void;
  'conversation-finished': (data: { conversationId: string; isComplete: boolean }) => void;
  'completion-chunk': (data: { chunk: string; role: string }) => void;
  'completion-complete': (data: { role: string }) => void;
  'completion-task-error': (data: { role: string; error: string }) => void;
  error: (data: { message: string }) => void;
}
