/**
 * @downpat/react - React integration for DownPat
 *
 * This package provides:
 * - DownpatClient: API client for communicating with the DownPat server
 * - React hooks: usePublishedExercises, useExerciseAdmin, useExerciseEditor, etc.
 * - createDownpatRoutes: Route builder for React Router
 * - initializeDownpat: Single initialization function for token setup
 */

// Re-export types from core that consumers will need
export type {
  Exercise,
  Conversation,
  Message,
  User,
  ExerciseMetadata,
} from '@downpat/core';

// Client exports
export {
  DownpatClient,
  createDownpatClient,
  type DownpatClientConfig,
  type ExerciseWithMetadata,
} from './client/DownpatClient.js';

// Initialization (legacy singleton - prefer DownpatProvider)
export {
  initializeDownpat,
  getDownpatClient,
  updateDownpatToken,
  clearDownpat,
  isDownpatInitialized,
  type DownpatInitConfig,
} from './client/initialization.js';

// Context-based client (recommended)
export {
  DownpatProvider,
  useDownpatClient,
  useDownpatToken,
  useHasDownpatContext,
  type DownpatProviderConfig,
} from './client/DownpatContext.js';

// Hook exports
export {
  usePublishedExercises,
  useExerciseAdmin,
  useExerciseEditor,
  useExerciseStats,
  useAvailableModels,
} from './hooks/index.js';

// Route builder
export {
  createDownpatRoutes,
  createDownpatRouteObjects,
  DownpatRoutes,
} from './routes/createDownpatRoutes.js';
export type { DownpatRoutesConfig } from './routes/createDownpatRoutes.js';
