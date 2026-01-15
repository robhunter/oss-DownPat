/**
 * Re-export API client from @downpat/api-client.
 *
 * This module re-exports the shared DownPat API client for use in React applications.
 * For full documentation, see @downpat/api-client.
 */

// Re-export the main client class and factory
export { DownpatClient, createDownpatClient } from '@downpat/api-client';

// Re-export error class
export { DownpatAPIError } from '@downpat/api-client';

// Re-export all types
export type {
  DownpatClientConfig,
  ExerciseWithMetadata,
  ExerciseStats,
  SliceParams,
  SlicedResponse,
  Exercise,
  ExerciseMetadata,
  Conversation,
} from '@downpat/api-client';
