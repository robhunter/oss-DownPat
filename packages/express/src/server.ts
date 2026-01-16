import { createServer, type Server as HTTPServer } from 'http';
import type { Express, Router } from 'express';
import type {
  ExerciseStorage,
  ConversationStorage,
  UserStateStorage,
  ServerAuthProvider,
  AIAdapter,
  ModerationAdapter,
} from '@downpat/core';
import { createDownpatRouter } from './router.js';
import { attachSocketIO } from './socket.js';
import type { Server as SocketIOServer } from 'socket.io';

/**
 * Configuration for createDownpatServer.
 */
export interface CreateDownpatServerConfig {
  /**
   * Server-side authentication provider.
   * Required - implement this based on your auth system.
   */
  serverAuth: ServerAuthProvider;

  /**
   * Exercise storage implementation.
   * Use createFirebaseStorage() from @downpat/firebase-storage for easy setup.
   */
  exerciseStorage: ExerciseStorage;

  /**
   * Conversation storage implementation.
   * Use createFirebaseStorage() from @downpat/firebase-storage for easy setup.
   */
  conversationStorage: ConversationStorage;

  /**
   * User state storage implementation.
   * Tracks active conversations per user for resumption.
   * Use createFirebaseStorage() from @downpat/firebase-storage for easy setup.
   */
  userStateStorage?: UserStateStorage;

  /**
   * AI adapter for generating responses.
   * Use registry.getDefaultAdapter() from @downpat/ai-adapters.
   */
  aiAdapter?: AIAdapter;

  /**
   * Moderation adapter for content filtering.
   * Use registry.getModerationAdapter() from @downpat/ai-adapters.
   */
  moderationAdapter?: ModerationAdapter;

  /**
   * Default AI model to use for conversations.
   * Can be overridden per-exercise.
   */
  defaultModel?: string;

  /**
   * Available AI models for the /models endpoint.
   * If not provided, returns empty array.
   */
  availableModels?: string[];

  /**
   * Mount path for DownPat routes.
   * @default '/api/downpat'
   */
  mountPath?: string;

  /**
   * CORS origins for Socket.io.
   * @default '*'
   */
  corsOrigin?: string | string[];
}

/**
 * Result of createDownpatServer.
 */
export interface DownpatServerResult {
  /**
   * HTTP server with Socket.io attached.
   * Ready to call httpServer.listen(port).
   */
  httpServer: HTTPServer;

  /**
   * Socket.io server instance.
   */
  io: SocketIOServer;

  /**
   * Express router with all DownPat routes.
   * Already mounted at mountPath on the Express app.
   */
  router: Router;

  /**
   * Available AI models (for admin UI).
   */
  availableModels: string[];
}

/**
 * Create a complete DownPat server with HTTP routes and Socket.io.
 *
 * This is the recommended high-level API for setting up DownPat.
 * It combines router creation and Socket.io attachment in one call.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createDownpatServer } from '@downpat/express';
 * import { createFirebaseStorage } from '@downpat/firebase-storage';
 * import { createAdapterRegistryFromEnv } from '@downpat/ai-adapters';
 *
 * const app = express();
 * app.use(express.json());
 *
 * // Your app's custom routes
 * app.get('/', (req, res) => res.send('Hello!'));
 *
 * // Set up storage and AI
 * const storage = createFirebaseStorage();
 * const aiRegistry = await createAdapterRegistryFromEnv();
 *
 * // Create DownPat server (one function call!)
 * const { httpServer, availableModels } = createDownpatServer(app, {
 *   serverAuth: myAuthProvider,
 *   exerciseStorage: storage.exerciseStorage,
 *   conversationStorage: storage.conversationStorage,
 *   aiAdapter: aiRegistry.getDefaultAdapter(),
 *   moderationAdapter: aiRegistry.getModerationAdapter() ?? undefined,
 *   availableModels: aiRegistry.getAllModels(),
 * });
 *
 * httpServer.listen(3001, () => {
 *   console.log('Server running on port 3001');
 *   console.log('Available models:', availableModels.join(', '));
 * });
 * ```
 */
export function createDownpatServer(
  app: Express,
  config: CreateDownpatServerConfig
): DownpatServerResult {
  const {
    serverAuth,
    exerciseStorage,
    conversationStorage,
    userStateStorage,
    aiAdapter,
    moderationAdapter,
    defaultModel,
    availableModels = [],
    mountPath = '/api/downpat',
    corsOrigin,
  } = config;

  // Create the DownPat router
  const { router } = createDownpatRouter({
    serverAuth,
    exerciseStorage,
    conversationStorage,
    userStateStorage,
  });

  // Add utility endpoints BEFORE mounting router (to avoid conflicts with subrouters)
  // These endpoints don't require authentication

  // GET /models - Returns available AI models
  app.get(`${mountPath}/models`, (_req, res) => {
    res.json({ models: availableModels });
  });

  // GET /stats - Returns exercise statistics
  app.get(`${mountPath}/stats`, async (_req, res) => {
    try {
      const exercises = await exerciseStorage.getExercisesWithMetadata();
      const stats = {
        total: exercises.length,
        published: exercises.filter(e => e.metadata.published).length,
        draft: exercises.filter(e => !e.metadata.published).length,
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get stats',
      });
    }
  });

  // Mount router
  app.use(mountPath, router);

  // Create HTTP server
  const httpServer = createServer(app);

  // Attach Socket.io
  const io = attachSocketIO(httpServer, {
    serverAuth,
    exerciseStorage,
    conversationStorage,
    userStateStorage,
    aiAdapter,
    moderationAdapter,
    defaultModel,
    corsOrigin,
  });

  return {
    httpServer,
    io,
    router,
    availableModels,
  };
}
