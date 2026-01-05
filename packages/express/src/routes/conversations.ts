import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ConversationController } from '@downpat/core';
import type { ConversationStorage, ExerciseStorage, ServerAuthProvider } from '@downpat/core';
import { createAuthMiddleware, requireSubscriber, type AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Creates Express router for conversation endpoints.
 */
export function createConversationRouter(
  conversationStorage: ConversationStorage,
  exerciseStorage: ExerciseStorage,
  authProvider: ServerAuthProvider
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
        const { exerciseId, exerciseSlug } = req.body;

        // Support both exerciseId and exerciseSlug for flexibility
        let resolvedExerciseId = exerciseId;
        if (!resolvedExerciseId && exerciseSlug) {
          // Look up exercise by slug (published only for subscribers)
          const exercise = await exerciseStorage.getExerciseBySlug(exerciseSlug, true);
          if (!exercise) {
            res.status(404).json({ error: 'Exercise not found' });
            return;
          }
          resolvedExerciseId = exercise.exerciseId;
        }

        if (!resolvedExerciseId) {
          res.status(400).json({ error: 'exerciseId or exerciseSlug is required' });
          return;
        }

        const conversation = await controller.startConversation(resolvedExerciseId, authReq.user);
        res.status(201).json(conversation);
      } catch (error) {
        if (error instanceof Error) {
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
