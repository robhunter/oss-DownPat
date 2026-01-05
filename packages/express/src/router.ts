import { Router } from 'express';
import type { ExerciseStorage, ConversationStorage, ServerAuthProvider } from '@downpat/core';
import { createExerciseRouter } from './routes/exercises.js';
import { createConversationRouter } from './routes/conversations.js';

/**
 * Configuration for creating a DownPat router.
 */
export interface DownpatConfig {
  /** Server-side authentication provider */
  serverAuth: ServerAuthProvider;
  /** Exercise storage implementation */
  exerciseStorage: ExerciseStorage;
  /** Conversation storage implementation */
  conversationStorage: ConversationStorage;
}

/**
 * Result of creating a DownPat router.
 */
export interface DownpatRouterResult {
  /** The Express router with all DownPat routes */
  router: Router;
}

/**
 * Creates an Express router with all DownPat API routes.
 *
 * Routes included:
 * - GET /exercises - List all exercises
 * - GET /exercises/:id - Get exercise by ID
 * - GET /exercises/by-slug/:slug - Get exercise by slug
 * - POST /exercises - Create exercise (admin only)
 * - PUT /exercises/:id - Update exercise (admin only)
 * - POST /exercises/:slug/publish - Publish exercise (admin only)
 * - POST /exercises/:slug/unpublish - Unpublish exercise (admin only)
 * - POST /exercises/:slug/restore - Restore from published (admin only)
 * - DELETE /exercises/:slug - Delete exercise (admin only)
 * - GET /conversations - List user's conversations
 * - GET /conversations/:id - Get conversation by ID
 * - POST /conversations - Start new conversation
 * - POST /conversations/:id/messages - Add message to conversation
 * - POST /conversations/:id/complete - Mark conversation complete
 * - DELETE /conversations/:id - Delete conversation
 *
 * @param config - The configuration for the router
 * @returns Object containing the router
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createDownpatRouter } from '@downpat/express';
 * import { FirebaseExerciseStorage, FirebaseConversationStorage } from '@downpat/firebase-storage';
 *
 * const app = express();
 * app.use(express.json());
 *
 * const { router } = createDownpatRouter({
 *   serverAuth: myAuthProvider,
 *   exerciseStorage: new FirebaseExerciseStorage(firestore),
 *   conversationStorage: new FirebaseConversationStorage(firestore),
 * });
 *
 * app.use('/api/downpat', router);
 *
 * app.listen(3001);
 * ```
 */
export function createDownpatRouter(config: DownpatConfig): DownpatRouterResult {
  const router = Router();

  // Mount sub-routers
  router.use(
    '/exercises',
    createExerciseRouter(config.exerciseStorage, config.serverAuth)
  );

  router.use(
    '/conversations',
    createConversationRouter(
      config.conversationStorage,
      config.exerciseStorage,
      config.serverAuth
    )
  );

  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return { router };
}
