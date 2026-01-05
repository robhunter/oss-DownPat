// Router
export { createDownpatRouter } from './router.js';
export type { DownpatConfig, DownpatRouterResult } from './router.js';

// Socket.io
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

// Sub-routers (for advanced usage)
export { createExerciseRouter } from './routes/exercises.js';
export { createConversationRouter } from './routes/conversations.js';
