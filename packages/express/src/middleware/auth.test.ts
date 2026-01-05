import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { ServerAuthProvider, User } from '@downpat/core';
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  requireAdmin,
  requireSubscriber,
  type AuthenticatedRequest,
} from './auth.js';

const mockUser: User = {
  userId: 'user-1',
  displayName: 'Test User',
  isAdmin: false,
  isSubscriber: true,
};

const adminUser: User = {
  userId: 'admin-1',
  displayName: 'Admin User',
  isAdmin: true,
  isSubscriber: true,
};

describe('createAuthMiddleware', () => {
  let mockAuthProvider: ServerAuthProvider;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockAuthProvider = {
      validateToken: vi.fn(),
      getDemoUser: vi.fn(),
    };

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    nextFn = vi.fn();
  });

  it('returns 401 when no authorization header', async () => {
    const middleware = createAuthMiddleware(mockAuthProvider);

    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No authorization header provided' });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('returns 401 when token is empty', async () => {
    mockReq.headers = { authorization: 'Bearer ' };
    const middleware = createAuthMiddleware(mockAuthProvider);

    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('attaches user and calls next on valid token', async () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(mockUser);
    const middleware = createAuthMiddleware(mockAuthProvider);

    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockAuthProvider.validateToken).toHaveBeenCalledWith('valid-token');
    expect((mockReq as AuthenticatedRequest).user).toEqual(mockUser);
    expect(nextFn).toHaveBeenCalled();
  });

  it('returns 401 on invalid token', async () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    vi.mocked(mockAuthProvider.validateToken).mockRejectedValue(new Error('Invalid token'));
    const middleware = createAuthMiddleware(mockAuthProvider);

    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
      message: 'Invalid token',
    });
    expect(nextFn).not.toHaveBeenCalled();
  });
});

describe('createOptionalAuthMiddleware', () => {
  let mockAuthProvider: ServerAuthProvider;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockAuthProvider = {
      validateToken: vi.fn(),
      getDemoUser: vi.fn(),
    };

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    nextFn = vi.fn();
  });

  it('calls next without user when no auth header', async () => {
    const middleware = createOptionalAuthMiddleware(mockAuthProvider);

    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect((mockReq as AuthenticatedRequest).user).toBeUndefined();
    expect(nextFn).toHaveBeenCalled();
  });

  it('attaches user when valid token provided', async () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    vi.mocked(mockAuthProvider.validateToken).mockResolvedValue(mockUser);
    const middleware = createOptionalAuthMiddleware(mockAuthProvider);

    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect((mockReq as AuthenticatedRequest).user).toEqual(mockUser);
    expect(nextFn).toHaveBeenCalled();
  });

  it('continues without user on invalid token', async () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    vi.mocked(mockAuthProvider.validateToken).mockRejectedValue(new Error('Invalid'));
    const middleware = createOptionalAuthMiddleware(mockAuthProvider);

    await middleware(mockReq as Request, mockRes as Response, nextFn);

    expect((mockReq as AuthenticatedRequest).user).toBeUndefined();
    expect(nextFn).toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFn = vi.fn();
  });

  it('returns 401 when no user', () => {
    requireAdmin(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not admin', () => {
    mockReq.user = mockUser;

    requireAdmin(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Admin access required' });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('calls next when user is admin', () => {
    mockReq.user = adminUser;

    requireAdmin(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
  });
});

describe('requireSubscriber', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFn = vi.fn();
  });

  it('returns 401 when no user', () => {
    requireSubscriber(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  });

  it('returns 403 when user is not subscriber', () => {
    mockReq.user = { ...mockUser, isSubscriber: false };

    requireSubscriber(mockReq as Request, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Subscriber access required' });
  });

  it('calls next when user is subscriber', () => {
    mockReq.user = mockUser;

    requireSubscriber(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
  });
});
