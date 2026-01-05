import type { Request, Response, NextFunction } from 'express';
import type { ServerAuthProvider, User } from '@downpat/core';

/**
 * Express request with authenticated user.
 */
export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Creates authentication middleware for Express.
 * Validates the Bearer token and attaches the user to the request.
 *
 * @param authProvider - The server auth provider to use for validation
 * @returns Express middleware function
 */
export function createAuthMiddleware(authProvider: ServerAuthProvider) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({ error: 'No authorization header provided' });
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');

      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const user = await authProvider.validateToken(token);
      (req as AuthenticatedRequest).user = user;
      next();
    } catch (error) {
      res.status(401).json({
        error: 'Invalid or expired token',
        message: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  };
}

/**
 * Creates optional authentication middleware.
 * If a token is provided, validates it. Otherwise, allows the request through.
 *
 * @param authProvider - The server auth provider to use for validation
 * @returns Express middleware function
 */
export function createOptionalAuthMiddleware(authProvider: ServerAuthProvider) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (token) {
          const user = await authProvider.validateToken(token);
          (req as AuthenticatedRequest).user = user;
        }
      }

      next();
    } catch {
      // Token was invalid, continue without user
      next();
    }
  };
}

/**
 * Middleware to require admin role.
 * Must be used after auth middleware.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!authReq.user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Middleware to require subscriber role.
 * Must be used after auth middleware.
 */
export function requireSubscriber(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!authReq.user.isSubscriber) {
    res.status(403).json({ error: 'Subscriber access required' });
    return;
  }

  next();
}
