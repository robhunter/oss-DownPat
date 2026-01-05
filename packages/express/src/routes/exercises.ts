import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ExerciseController } from '@downpat/core';
import type { ExerciseStorage, ServerAuthProvider } from '@downpat/core';
import { createAuthMiddleware, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Creates Express router for exercise endpoints.
 */
export function createExerciseRouter(
  storage: ExerciseStorage,
  authProvider: ServerAuthProvider
): Router {
  const router = Router();
  const controller = new ExerciseController(storage);
  const authMiddleware = createAuthMiddleware(authProvider);

  // GET /exercises - List all exercises
  router.get(
    '/',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const exercises = await controller.getExercises(authReq.user);
        res.json(exercises);
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /exercises/:id - Get exercise by ID
  router.get(
    '/:id',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const exercise = await controller.getExercise(req.params.id, authReq.user);
        res.json(exercise);
      } catch (error) {
        if (error instanceof Error && error.message === 'Exercise not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        next(error);
      }
    }
  );

  // GET /exercises/by-slug/:slug - Get exercise by slug
  router.get(
    '/by-slug/:slug',
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const publishedOnly = req.query.publishedOnly === 'true';
        const exercise = await controller.getExerciseBySlug(
          req.params.slug,
          authReq.user,
          publishedOnly
        );
        res.json(exercise);
      } catch (error) {
        if (error instanceof Error && error.message === 'Exercise not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        next(error);
      }
    }
  );

  // POST /exercises - Create new exercise (admin only)
  router.post(
    '/',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const exercise = await controller.createExercise(req.body, authReq.user);
        res.status(201).json(exercise);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          res.status(403).json({ error: error.message });
          return;
        }
        next(error);
      }
    }
  );

  // PUT /exercises/:id - Update exercise (admin only)
  router.put(
    '/:id',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        await controller.updateExercise({ ...req.body, exerciseId: req.params.id }, authReq.user);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          res.status(403).json({ error: error.message });
          return;
        }
        next(error);
      }
    }
  );

  // POST /exercises/:slug/publish - Publish exercise (admin only)
  router.post(
    '/:slug/publish',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        await controller.publishExercise(req.params.slug, authReq.user);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          res.status(403).json({ error: error.message });
          return;
        }
        next(error);
      }
    }
  );

  // POST /exercises/:slug/unpublish - Unpublish exercise (admin only)
  router.post(
    '/:slug/unpublish',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        await controller.unpublishExercise(req.params.slug, authReq.user);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          res.status(403).json({ error: error.message });
          return;
        }
        next(error);
      }
    }
  );

  // POST /exercises/:slug/restore - Restore from published (admin only)
  router.post(
    '/:slug/restore',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        await controller.restoreFromPublished(req.params.slug, authReq.user);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          res.status(403).json({ error: error.message });
          return;
        }
        next(error);
      }
    }
  );

  // DELETE /exercises/:slug - Delete exercise (admin only)
  router.delete(
    '/:slug',
    authMiddleware,
    requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        await controller.deleteExercise(req.params.slug, authReq.user);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          res.status(403).json({ error: error.message });
          return;
        }
        next(error);
      }
    }
  );

  return router;
}
