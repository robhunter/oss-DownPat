// Main client
export { DownpatClient, createDownpatClient } from './client.js';

// Error classes
export { DownpatAPIError, AdminAPIError } from './errors.js';
export type { APIErrorResponse } from './errors.js';

// Types
export type {
  DownpatClientConfig,
  ExerciseWithMetadata,
  ExerciseStats,
  SliceParams,
  SlicedResponse,
  Exercise,
  ExerciseMetadata,
  Conversation,
} from './types.js';
