// High-level server setup (recommended)
export { createDownpatServer } from './server.js';
export type { CreateDownpatServerConfig, DownpatServerResult } from './server.js';

// Router (lower-level)
export { createDownpatRouter } from './router.js';
export type { DownpatConfig, DownpatRouterResult } from './router.js';

// Socket.io (lower-level)
export { attachSocketIO } from './socket.js';
export type { SocketConfig } from './socket.js';

// Middleware
export {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  requireAdmin,
  requireSubscriber,
} from './middleware/auth.js';
export type { AuthenticatedRequest } from './middleware/auth.js';

// Auth providers
export { createMockAuthProvider } from './auth/mock-provider.js';
export type { MockAuthProviderOptions } from './auth/mock-provider.js';

// Sub-routers (for advanced usage)
export { createExerciseRouter } from './routes/exercises.js';
export { createConversationRouter } from './routes/conversations.js';
