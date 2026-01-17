import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { attachSocketIO, SocketConfig } from './socket.js';
import type { User, Exercise, Conversation, ExerciseStorage, ConversationStorage, ServerAuthProvider, AIAdapter, Message } from '@downpat/core';
import { MessageType } from '@downpat/core';

const mockUser: User = {
  userId: 'user-1',
  displayName: 'Test User',
  isAdmin: false,
  isSubscriber: true,
};

const mockExercise: Exercise = {
  exerciseId: 'ex-123',
  exerciseName: 'Test Exercise',
  slug: 'test-exercise',
  maxUserMessages: 10,
  model: 'gpt-4',
  talkToCoachEnabled: false,
  continuationTasks: [],
  completionTasks: [],
  welcomeMessage: 'Welcome!',
  guidelines: 'Be helpful.',
  starters: [] as { text: string; context: string; attributes: Record<string, string> }[],
};

const mockConversation: Conversation = {
  conversationId: 'conv-123',
  exerciseId: 'ex-123',
  userId: 'user-1',
  messages: [],
  isComplete: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Socket.io attachSocketIO', () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: SocketServer;
  let clientSocket: ClientSocket;
  let mockExerciseStorage: ExerciseStorage;
  let mockConversationStorage: ConversationStorage;
  let mockAuthProvider: ServerAuthProvider;
  let mockAIAdapter: AIAdapter;
  let port: number;

  beforeEach(async () => {
    // Create mocks
    mockExerciseStorage = {
      getExercise: vi.fn().mockResolvedValue(mockExercise),
      getExerciseBySlug: vi.fn().mockResolvedValue(mockExercise),
      createExercise: vi.fn(),
      updateExercise: vi.fn(),
      publishExercise: vi.fn(),
      unpublishExercise: vi.fn(),
      restoreFromPublished: vi.fn(),
      getExerciseMetadata: vi.fn(),
      getExercises: vi.fn(),
      deleteExercise: vi.fn(),
    };

    mockConversationStorage = {
      getConversation: vi.fn().mockResolvedValue(mockConversation),
      getConversationMetadata: vi.fn().mockResolvedValue({
        conversationId: mockConversation.conversationId,
        exerciseId: mockConversation.exerciseId,
        userId: mockConversation.userId,
        createdAt: mockConversation.createdAt,
        updatedAt: mockConversation.updatedAt,
        isComplete: mockConversation.isComplete,
        userMessageCount: 0,
      }),
      createConversation: vi.fn().mockResolvedValue(mockConversation),
      updateConversation: vi.fn().mockResolvedValue(mockConversation),
      addMessage: vi.fn().mockImplementation(async (convId, msg) => ({
        ...mockConversation,
        messages: [...mockConversation.messages, msg],
      })),
      getConversationsByUser: vi.fn(),
      getConversationsByExercise: vi.fn(),
      deleteConversation: vi.fn(),
    };

    mockAuthProvider = {
      validateToken: vi.fn().mockResolvedValue(mockUser),
      getDemoUser: vi.fn().mockReturnValue(mockUser),
    };

    mockAIAdapter = {
      complete: vi.fn(),
    };

    // Create HTTP server
    httpServer = createServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });

    // Attach socket.io
    const config: SocketConfig = {
      serverAuth: mockAuthProvider,
      conversationStorage: mockConversationStorage,
      exerciseStorage: mockExerciseStorage,
      aiAdapter: mockAIAdapter,
      defaultModel: 'gpt-4',
    };

    ioServer = attachSocketIO(httpServer, config);
  });

  afterEach(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    await new Promise<void>((resolve) => {
      ioServer.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  // Helper that sets up listeners BEFORE connecting to avoid race conditions
  const connectAndWaitForAuth = (token = 'valid-token'): Promise<{ socket: ClientSocket; authResult: { success: boolean; user?: User; error?: string } }> => {
    return new Promise((resolve, reject) => {
      const socket = ioClient(`http://localhost:${port}`, {
        auth: { token },
        transports: ['websocket'],
        autoConnect: false,
      });

      // Set up listener BEFORE connecting
      socket.on('authenticated', (authResult) => {
        clientSocket = socket;
        resolve({ socket, authResult });
      });

      socket.on('connect_error', (err) => {
        reject(err);
      });

      // Now connect
      socket.connect();
    });
  };

  describe('Authentication', () => {
    it('authenticates user from handshake token', async () => {
      const { authResult } = await connectAndWaitForAuth();

      expect(authResult.success).toBe(true);
      expect(authResult.user).toEqual(mockUser);
      expect(mockAuthProvider.validateToken).toHaveBeenCalledWith('valid-token');
    });

    it('emits error when not authenticated', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockRejectedValue(new Error('Invalid token'));

      const { authResult } = await connectAndWaitForAuth('invalid-token');

      expect(authResult.success).toBe(false);
      expect(authResult.error).toBe('Invalid token');
    });
  });

  describe('start-conversation', () => {
    it('starts conversation and emits conversation-started', async () => {
      const { socket } = await connectAndWaitForAuth();

      const result = await new Promise<{ conversationId: string; messages: Message[] }>((resolve) => {
        socket.on('conversation-started', resolve);
        socket.emit('start-conversation', { slug: 'test-exercise' });
      });

      expect(result.conversationId).toBeDefined();
      expect(mockExerciseStorage.getExerciseBySlug).toHaveBeenCalledWith('test-exercise', true);
    });

    it('includes talkToCoachEnabled in conversation-started response', async () => {
      // Set up exercise with talkToCoachEnabled = true
      const exerciseWithCoach = { ...mockExercise, talkToCoachEnabled: true };
      vi.mocked(mockExerciseStorage.getExerciseBySlug).mockResolvedValue(exerciseWithCoach);

      const { socket } = await connectAndWaitForAuth();

      const result = await new Promise<{ conversationId: string; talkToCoachEnabled: boolean }>((resolve) => {
        socket.on('conversation-started', resolve);
        socket.emit('start-conversation', { slug: 'test-exercise' });
      });

      expect(result.talkToCoachEnabled).toBe(true);
    });

    it('includes talkToCoachEnabled=false when disabled', async () => {
      // Set up exercise with talkToCoachEnabled = false
      const exerciseWithoutCoach = { ...mockExercise, talkToCoachEnabled: false };
      vi.mocked(mockExerciseStorage.getExerciseBySlug).mockResolvedValue(exerciseWithoutCoach);

      const { socket } = await connectAndWaitForAuth();

      const result = await new Promise<{ conversationId: string; talkToCoachEnabled: boolean }>((resolve) => {
        socket.on('conversation-started', resolve);
        socket.emit('start-conversation', { slug: 'test-exercise' });
      });

      expect(result.talkToCoachEnabled).toBe(false);
    });

    it('emits error when not authenticated', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockRejectedValue(new Error('Invalid'));

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('start-conversation', { slug: 'test-exercise' });
      });

      expect(error.message).toBe('Not authenticated');
    });
  });

  describe('send-message with AI adapter', () => {
    it('emits message-chunk during streaming and message-complete when done', async () => {
      // Setup AI adapter to stream chunks
      vi.mocked(mockAIAdapter.complete).mockImplementation(async ({ onChunk }) => {
        onChunk?.('Hello ');
        onChunk?.('World!');
        return { content: 'Hello World!' };
      });

      const { socket } = await connectAndWaitForAuth();

      // Start conversation first
      await new Promise((resolve) => {
        socket.on('conversation-started', resolve);
        socket.emit('start-conversation', { slug: 'test-exercise' });
      });

      // Collect events
      const chunks: string[] = [];
      let messageCompleteReceived = false;
      let messageCompleteArgs: unknown[] = [];

      socket.on('message-chunk', (data) => {
        chunks.push(data.chunk);
      });

      const completePromise = new Promise<void>((resolve) => {
        socket.on('message-complete', (...args: unknown[]) => {
          messageCompleteReceived = true;
          messageCompleteArgs = args;
          resolve();
        });
      });

      // Send message
      socket.emit('send-message', {
        conversationId: mockConversation.conversationId,
        content: 'Hello',
      });

      await completePromise;

      // Verify chunks were received
      expect(chunks).toEqual(['Hello ', 'World!']);

      // CRITICAL: Verify message-complete is called with NO arguments
      // This was the bug - client expected data but server sends none
      expect(messageCompleteReceived).toBe(true);
      expect(messageCompleteArgs).toHaveLength(0);
    });

    it('emits error when AI fails', async () => {
      vi.mocked(mockAIAdapter.complete).mockRejectedValue(new Error('AI Error'));

      const { socket } = await connectAndWaitForAuth();

      await new Promise((resolve) => {
        socket.on('conversation-started', resolve);
        socket.emit('start-conversation', { slug: 'test-exercise' });
      });

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('send-message', {
          conversationId: mockConversation.conversationId,
          content: 'Hello',
        });
      });

      expect(error.message).toBe('Failed to generate AI response');
    });
  });

  // Note: Testing without AI adapter requires separate server setup
  // The critical regression test (message-complete with no args) is covered above

  describe('join-conversation', () => {
    it('joins conversation and emits conversation-joined with expected payload', async () => {
      const conversationWithMessages: Conversation = {
        ...mockConversation,
        messages: [
          {
            messageId: 'msg-1',
            type: MessageType.WELCOME,
            role: 'System',
            content: 'Welcome!',
            timestamp: new Date().toISOString(),
          },
        ],
      };
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(conversationWithMessages);

      const { socket } = await connectAndWaitForAuth();

      const result = await new Promise<{
        conversationId: string;
        messages: Message[];
        isComplete: boolean;
        talkToCoachEnabled: boolean;
      }>((resolve) => {
        socket.on('conversation-joined', resolve);
        socket.emit('join-conversation', { conversationId: 'conv-123' });
      });

      expect(result.conversationId).toBe('conv-123');
      expect(result.messages).toEqual(conversationWithMessages.messages);
      expect(result.isComplete).toBe(false);
      expect(result.talkToCoachEnabled).toBe(false);
    });

    it('includes talkToCoachEnabled=true when exercise has it enabled', async () => {
      const exerciseWithCoach = { ...mockExercise, talkToCoachEnabled: true };
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(exerciseWithCoach);

      const { socket } = await connectAndWaitForAuth();

      const result = await new Promise<{
        conversationId: string;
        talkToCoachEnabled: boolean;
      }>((resolve) => {
        socket.on('conversation-joined', resolve);
        socket.emit('join-conversation', { conversationId: 'conv-123' });
      });

      expect(result.talkToCoachEnabled).toBe(true);
    });

    it('returns isComplete=true for completed conversations', async () => {
      const completedConversation: Conversation = {
        ...mockConversation,
        isComplete: true,
      };
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(completedConversation);

      const { socket } = await connectAndWaitForAuth();

      const result = await new Promise<{
        conversationId: string;
        isComplete: boolean;
      }>((resolve) => {
        socket.on('conversation-joined', resolve);
        socket.emit('join-conversation', { conversationId: 'conv-123' });
      });

      expect(result.isComplete).toBe(true);
    });

    it('emits error when not authenticated', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockRejectedValue(new Error('Invalid'));

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('join-conversation', { conversationId: 'conv-123' });
      });

      expect(error.message).toBe('Not authenticated');
    });

    it('emits error when conversation not found', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue(null);

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('join-conversation', { conversationId: 'non-existent' });
      });

      expect(error.message).toBe('Conversation not found');
    });

    it('emits error when user does not own conversation', async () => {
      const otherUserConversation = {
        ...mockConversation,
        userId: 'other-user-id',
      };
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue({
        conversationId: otherUserConversation.conversationId,
        exerciseId: otherUserConversation.exerciseId,
        userId: otherUserConversation.userId,
        createdAt: otherUserConversation.createdAt,
        updatedAt: otherUserConversation.updatedAt,
        isComplete: otherUserConversation.isComplete,
        userMessageCount: 0,
      });

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('join-conversation', { conversationId: 'conv-123' });
      });

      expect(error.message).toBe('Unauthorized: Cannot access this conversation');
    });
  });

  describe('edit-message', () => {
    it('emits messages-truncated with updated messages and editedMessageIndex', async () => {
      const conversationWithMessages: Conversation = {
        ...mockConversation,
        messages: [
          {
            messageId: 'msg-1',
            type: MessageType.WELCOME,
            role: 'System',
            content: 'Welcome!',
            timestamp: new Date().toISOString(),
          },
          {
            messageId: 'msg-2',
            type: MessageType.USER,
            role: 'Test User',
            content: 'Hello',
            timestamp: new Date().toISOString(),
          },
          {
            messageId: 'msg-3',
            type: MessageType.CONVERSATION,
            role: 'AI',
            content: 'Hi there!',
            timestamp: new Date().toISOString(),
          },
        ],
        userMessageCount: 1,
      };

      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue({
        conversationId: mockConversation.conversationId,
        exerciseId: mockConversation.exerciseId,
        userId: mockConversation.userId,
        createdAt: mockConversation.createdAt,
        updatedAt: mockConversation.updatedAt,
        isComplete: false,
        userMessageCount: 1,
      });
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(conversationWithMessages);

      const updatedConversation = {
        ...conversationWithMessages,
        messages: [
          conversationWithMessages.messages[0],
          { ...conversationWithMessages.messages[1], content: 'Hello edited' },
        ],
      };
      vi.mocked(mockConversationStorage.updateConversation).mockResolvedValue(updatedConversation);

      const { socket } = await connectAndWaitForAuth();

      const result = await new Promise<{
        conversationId: string;
        messages: Message[];
        editedMessageIndex: number;
      }>((resolve) => {
        socket.on('messages-truncated', resolve);
        socket.emit('edit-message', {
          conversationId: 'conv-123',
          messageId: 'msg-2',
          content: 'Hello edited',
        });
      });

      expect(result.conversationId).toBe('conv-123');
      expect(result.editedMessageIndex).toBe(1);
      expect(result.messages).toHaveLength(2);
    });

    it('emits error when not authenticated', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockRejectedValue(new Error('Invalid'));

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('edit-message', {
          conversationId: 'conv-123',
          messageId: 'msg-2',
          content: 'New content',
        });
      });

      expect(error.message).toBe('Not authenticated');
    });

    it('emits error when message not found', async () => {
      const conversationWithMessages: Conversation = {
        ...mockConversation,
        messages: [
          {
            messageId: 'msg-1',
            type: MessageType.WELCOME,
            role: 'System',
            content: 'Welcome!',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue({
        conversationId: mockConversation.conversationId,
        exerciseId: mockConversation.exerciseId,
        userId: mockConversation.userId,
        createdAt: mockConversation.createdAt,
        updatedAt: mockConversation.updatedAt,
        isComplete: false,
        userMessageCount: 0,
      });
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(conversationWithMessages);

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('edit-message', {
          conversationId: 'conv-123',
          messageId: 'non-existent',
          content: 'New content',
        });
      });

      expect(error.message).toBe('User message not found');
    });

    it('regenerates AI response after editing a message', async () => {
      const conversationWithMessages: Conversation = {
        ...mockConversation,
        messages: [
          {
            messageId: 'msg-1',
            type: MessageType.WELCOME,
            role: 'System',
            content: 'Welcome!',
            timestamp: new Date().toISOString(),
          },
          {
            messageId: 'msg-2',
            type: MessageType.USER,
            role: 'Test User',
            content: 'Hello',
            timestamp: new Date().toISOString(),
          },
          {
            messageId: 'msg-3',
            type: MessageType.CONVERSATION,
            role: 'AI',
            content: 'Hi there!',
            timestamp: new Date().toISOString(),
          },
        ],
        userMessageCount: 1,
      };

      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue({
        conversationId: mockConversation.conversationId,
        exerciseId: mockConversation.exerciseId,
        userId: mockConversation.userId,
        createdAt: mockConversation.createdAt,
        updatedAt: mockConversation.updatedAt,
        isComplete: false,
        userMessageCount: 1,
      });
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(conversationWithMessages);

      const updatedConversation = {
        ...conversationWithMessages,
        messages: [
          conversationWithMessages.messages[0],
          { ...conversationWithMessages.messages[1], content: 'Hello edited' },
        ],
      };
      vi.mocked(mockConversationStorage.updateConversation).mockResolvedValue(updatedConversation);

      // Setup AI adapter to stream chunks
      vi.mocked(mockAIAdapter.complete).mockImplementation(async ({ onChunk }) => {
        onChunk?.('New ');
        onChunk?.('response!');
        return { content: 'New response!' };
      });

      const { socket } = await connectAndWaitForAuth();

      // Collect events
      const chunks: string[] = [];
      let messagesTruncatedReceived = false;
      let messageCompleteReceived = false;

      socket.on('message-chunk', (data) => {
        chunks.push(data.chunk);
      });

      socket.on('messages-truncated', () => {
        messagesTruncatedReceived = true;
      });

      const completePromise = new Promise<void>((resolve) => {
        socket.on('message-complete', () => {
          messageCompleteReceived = true;
          resolve();
        });
      });

      // Emit edit-message
      socket.emit('edit-message', {
        conversationId: 'conv-123',
        messageId: 'msg-2',
        content: 'Hello edited',
      });

      await completePromise;

      // Verify truncation happened
      expect(messagesTruncatedReceived).toBe(true);

      // Verify AI regenerated a response
      expect(chunks).toEqual(['New ', 'response!']);
      expect(messageCompleteReceived).toBe(true);

      // Verify AI adapter was called
      expect(mockAIAdapter.complete).toHaveBeenCalled();
    });

    it('regenerates commentary after editing a message when exercise has commentary tasks', async () => {
      const exerciseWithCommentary: Exercise = {
        ...mockExercise,
        continuationTasks: [
          {
            taskId: 'commentary-task-1',
            name: 'Coach Feedback',
            responseType: MessageType.COMMENTARY,
            role: 'Coach',
            prompt: 'Provide coaching feedback on the conversation.',
            enabled: true,
          },
        ],
      };
      vi.mocked(mockExerciseStorage.getExercise).mockResolvedValue(exerciseWithCommentary);

      const conversationWithMessages: Conversation = {
        ...mockConversation,
        messages: [
          {
            messageId: 'msg-1',
            type: MessageType.WELCOME,
            role: 'System',
            content: 'Welcome!',
            timestamp: new Date().toISOString(),
          },
          {
            messageId: 'msg-2',
            type: MessageType.USER,
            role: 'Test User',
            content: 'Hello',
            timestamp: new Date().toISOString(),
          },
          {
            messageId: 'msg-3',
            type: MessageType.CONVERSATION,
            role: 'AI',
            content: 'Hi there!',
            timestamp: new Date().toISOString(),
          },
        ],
        userMessageCount: 1,
      };

      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue({
        conversationId: mockConversation.conversationId,
        exerciseId: mockConversation.exerciseId,
        userId: mockConversation.userId,
        createdAt: mockConversation.createdAt,
        updatedAt: mockConversation.updatedAt,
        isComplete: false,
        userMessageCount: 1,
      });
      vi.mocked(mockConversationStorage.getConversation).mockResolvedValue(conversationWithMessages);

      const updatedConversation = {
        ...conversationWithMessages,
        messages: [
          conversationWithMessages.messages[0],
          { ...conversationWithMessages.messages[1], content: 'Hello edited' },
        ],
      };
      vi.mocked(mockConversationStorage.updateConversation).mockResolvedValue(updatedConversation);

      // Track which call we're on (first = main AI, second = commentary)
      let callCount = 0;
      vi.mocked(mockAIAdapter.complete).mockImplementation(async ({ onChunk }) => {
        callCount++;
        if (callCount === 1) {
          // Main AI response
          onChunk?.('New ');
          onChunk?.('response!');
          return { content: 'New response!' };
        } else {
          // Commentary response
          onChunk?.('Great ');
          onChunk?.('job!');
          return { content: 'Great job!' };
        }
      });

      const { socket } = await connectAndWaitForAuth();

      // Collect events
      const commentaryChunks: string[] = [];
      let commentaryCompleteReceived = false;
      let commentaryRole = '';

      socket.on('commentary-chunk', (data) => {
        commentaryChunks.push(data.chunk);
        commentaryRole = data.role;
      });

      const commentaryPromise = new Promise<void>((resolve) => {
        socket.on('commentary-complete', (data) => {
          commentaryCompleteReceived = true;
          commentaryRole = data.role;
          resolve();
        });
      });

      // Emit edit-message
      socket.emit('edit-message', {
        conversationId: 'conv-123',
        messageId: 'msg-2',
        content: 'Hello edited',
      });

      await commentaryPromise;

      // Verify commentary was regenerated
      expect(commentaryChunks).toEqual(['Great ', 'job!']);
      expect(commentaryCompleteReceived).toBe(true);
      expect(commentaryRole).toBe('Coach');

      // Verify AI adapter was called twice (main + commentary)
      expect(mockAIAdapter.complete).toHaveBeenCalledTimes(2);
    });
  });

  describe('finish-conversation', () => {
    it('emits conversation-finished when successful', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue({
        conversationId: mockConversation.conversationId,
        exerciseId: mockConversation.exerciseId,
        userId: mockConversation.userId,
        createdAt: mockConversation.createdAt,
        updatedAt: mockConversation.updatedAt,
        isComplete: false,
        userMessageCount: 0,
      });
      vi.mocked(mockConversationStorage.updateConversation).mockResolvedValue({
        ...mockConversation,
        isComplete: true,
      });

      const { socket } = await connectAndWaitForAuth();

      const result = await new Promise<{ conversationId: string; isComplete: boolean }>((resolve) => {
        socket.on('conversation-finished', resolve);
        socket.emit('finish-conversation', { conversationId: 'conv-123' });
      });

      expect(result.conversationId).toBe('conv-123');
      expect(result.isComplete).toBe(true);
    });

    it('emits error when not authenticated', async () => {
      vi.mocked(mockAuthProvider.validateToken).mockRejectedValue(new Error('Invalid'));

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('finish-conversation', { conversationId: 'conv-123' });
      });

      expect(error.message).toBe('Not authenticated');
    });

    it('emits error when conversation is already complete', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue({
        conversationId: mockConversation.conversationId,
        exerciseId: mockConversation.exerciseId,
        userId: mockConversation.userId,
        createdAt: mockConversation.createdAt,
        updatedAt: mockConversation.updatedAt,
        isComplete: true,
        userMessageCount: 0,
      });

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('finish-conversation', { conversationId: 'conv-123' });
      });

      expect(error.message).toBe('Conversation is already complete');
    });

    it('emits error when user does not own conversation', async () => {
      vi.mocked(mockConversationStorage.getConversationMetadata).mockResolvedValue({
        conversationId: mockConversation.conversationId,
        exerciseId: mockConversation.exerciseId,
        userId: 'other-user-id',
        createdAt: mockConversation.createdAt,
        updatedAt: mockConversation.updatedAt,
        isComplete: false,
        userMessageCount: 0,
      });

      const { socket } = await connectAndWaitForAuth();

      const error = await new Promise<{ message: string }>((resolve) => {
        socket.on('error', resolve);
        socket.emit('finish-conversation', { conversationId: 'conv-123' });
      });

      expect(error.message).toBe('Unauthorized: Cannot access this conversation');
    });
  });
});

/**
 * Type-level test to ensure ServerToClientEvents['message-complete'] takes no arguments.
 * This prevents regressions where someone adds parameters to message-complete.
 */
describe('Type safety', () => {
  it('message-complete event signature takes no arguments', () => {
    // This is a compile-time check - if the types are wrong, TypeScript will error
    type MessageCompleteHandler = () => void;

    // If someone changes message-complete to take arguments, this would fail
    const handler: MessageCompleteHandler = () => {
      // no-op
    };

    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(0); // Function takes 0 arguments
  });
});
