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

// Initialization
export {
  initializeDownpat,
  getDownpatClient,
  updateDownpatToken,
  clearDownpat,
  type DownpatInitConfig,
} from './client/initialization.js';

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
