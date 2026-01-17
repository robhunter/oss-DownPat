import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ConversationController } from '@downpat/core';
import type { ConversationStorage, ExerciseStorage, ServerAuthProvider, UserStateStorage, User } from '@downpat/core';
import { createAuthMiddleware, requireSubscriber, type AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Result of resolving an exercise from ID or slug.
 */
interface ExerciseResolutionResult {
  exerciseId: string;
}

/**
 * Resolve exercise ID from either exerciseId or exerciseSlug.
 * @param exerciseId - Direct exercise ID (takes precedence)
 * @param exerciseSlug - Exercise slug to look up
 * @param exerciseStorage - Storage to look up exercise by slug
 * @param user - User making the request (admins can access unpublished)
 * @returns Resolved exercise ID
 * @throws Error with message 'exerciseId or exerciseSlug is required' if neither provided
 * @throws Error with message 'Exercise not found' if slug lookup fails
 */
async function resolveExerciseId(
  exerciseId: string | undefined,
  exerciseSlug: string | undefined,
  exerciseStorage: ExerciseStorage,
  user: User
): Promise<ExerciseResolutionResult> {
  if (exerciseId) {
    return { exerciseId };
  }

  if (!exerciseSlug) {
    throw new Error('exerciseId or exerciseSlug is required');
  }

  // Look up exercise by slug (published only for non-admins)
  const publishedOnly = !user.isAdmin;
  const exercise = await exerciseStorage.getExerciseBySlug(exerciseSlug, publishedOnly);
  if (!exercise) {
    throw new Error('Exercise not found');
  }

  return { exerciseId: exercise.exerciseId };
}

/**
 * Creates Express router for conversation endpoints.
 */
export function createConversationRouter(
  conversationStorage: ConversationStorage,
  exerciseStorage: ExerciseStorage,
  authProvider: ServerAuthProvider,
  userStateStorage?: UserStateStorage
): Router {
  const router = Router();
  const controller = new ConversationController(conversationStorage, exerciseStorage);
  const authMiddleware = createAuthMiddleware(authProvider);

  // GET /conversations - List user's conversations
  router.get(
    '/',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const conversations = await controller.getUserConversations(authReq.user);
        res.json(conversations);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /conversations/:id - Get conversation by ID
  router.get(
    '/:id',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const conversation = await controller.getConversation(req.params.id, authReq.user);
        res.json(conversation);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Conversation not found') {
            res.status(404).json({ error: error.message });
            return;
          }
          if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
            return;
          }
        }
        next(error);
      }
    }
  );

  // POST /conversations - Start new conversation
  router.post(
    '/',
    authMiddleware,
    requireSubscriber,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const { exerciseId, exerciseSlug, query } = req.body;

        const resolved = await resolveExerciseId(
          exerciseId,
          exerciseSlug,
          exerciseStorage,
          authReq.user
        );

        const conversation = await controller.startConversation(
          resolved.exerciseId,
          authReq.user,
          query
        );
        res.status(201).json(conversation);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'exerciseId or exerciseSlug is required') {
            res.status(400).json({ error: error.message });
            return;
          }
          if (error.message === 'Exercise not found') {
            res.status(404).json({ error: error.message });
            return;
          }
          if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
            return;
          }
        }
        next(error);
      }
    }
  );

  // POST /conversations/get-or-start - Get existing active conversation or start new
  // This is the primary endpoint for conversation resumption
  router.post(
    '/get-or-start',
    authMiddleware,
    requireSubscriber,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!userStateStorage) {
          res.status(501).json({
            error: 'Conversation resumption not configured. userStateStorage is required.'
          });
          return;
        }

        const authReq = req as AuthenticatedRequest;
        const { exerciseId, exerciseSlug, query } = req.body;

        const resolved = await resolveExerciseId(
          exerciseId,
          exerciseSlug,
          exerciseStorage,
          authReq.user
        );

        const result = await controller.getOrStartConversation(
          resolved.exerciseId,
          authReq.user,
          userStateStorage,
          query
        );

        // Controller returns { conversation, wasCreated }
        // isResumed is the inverse of wasCreated (resumed = not newly created)
        const isResumed = !result.wasCreated;
        res.json({ ...result.conversation, isResumed });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'exerciseId or exerciseSlug is required') {
            res.status(400).json({ error: error.message });
            return;
          }
          if (error.message === 'Exercise not found') {
            res.status(404).json({ error: error.message });
            return;
          }
          if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
            return;
          }
        }
        next(error);
      }
    }
  );

  // POST /conversations/:id/messages - Add user message
  router.post(
    '/:id/messages',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const { content } = req.body;

        if (!content || typeof content !== 'string') {
          res.status(400).json({ error: 'content is required and must be a string' });
          return;
        }

        const result = await controller.addUserMessage(req.params.id, content, authReq.user);
        res.json(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Conversation not found') {
            res.status(404).json({ error: error.message });
            return;
          }
          if (error.message === 'Conversation is already complete') {
            res.status(400).json({ error: error.message });
            return;
          }
          if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
            return;
          }
        }
        next(error);
      }
    }
  );

  // POST /conversations/:id/complete - Mark conversation as complete
  router.post(
    '/:id/complete',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        await controller.completeConversation(req.params.id, authReq.user);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Conversation not found') {
            res.status(404).json({ error: error.message });
            return;
          }
          if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
            return;
          }
        }
        next(error);
      }
    }
  );

  // DELETE /conversations/:id - Delete conversation
  router.delete(
    '/:id',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        await controller.deleteConversation(req.params.id, authReq.user);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Conversation not found') {
            res.status(404).json({ error: error.message });
            return;
          }
          if (error.message.includes('Unauthorized')) {
            res.status(403).json({ error: error.message });
            return;
          }
        }
        next(error);
      }
    }
  );

  return router;
}
