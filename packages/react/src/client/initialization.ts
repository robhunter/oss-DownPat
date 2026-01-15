import { provideDownPatToken, clearDownPatToken } from '@downpat/ui-components';
import { DownpatClient, createDownpatClient } from './DownpatClient.js';

/**
 * Configuration for initializing DownPat
 */
export interface DownpatInitConfig {
  /** Base URL for the DownPat API (default: '/api/downpat') */
  baseUrl?: string;
  /** Function to get the current auth token */
  getToken: () => string | null;
}

// Singleton client instance
let clientInstance: DownpatClient | null = null;

/**
 * Initialize the DownPat client.
 *
 * This sets up both the API client and the Socket.io token for real-time
 * conversation features. Call this once during app initialization.
 *
 * @example
 * ```typescript
 * // In your auth provider or app initialization:
 * initializeDownpat({
 *   getToken: () => localStorage.getItem('auth_token'),
 * });
 * ```
 */
export function initializeDownpat(config: DownpatInitConfig): DownpatClient {
  clientInstance = createDownpatClient(config);

  // Also set up token for Socket.io (ui-components uses this)
  const token = config.getToken();
  if (token) {
    provideDownPatToken(token);
  }

  return clientInstance;
}

/**
 * Get the initialized DownPat client.
 *
 * @throws Error if initializeDownpat() hasn't been called
 *
 * @example
 * ```typescript
 * const client = getDownpatClient();
 * const exercises = await client.getPublishedExercises();
 * ```
 */
export function getDownpatClient(): DownpatClient {
  if (!clientInstance) {
    throw new Error(
      'DownPat client not initialized. Call initializeDownpat() first.'
    );
  }
  return clientInstance;
}

/**
 * Update the auth token.
 *
 * Call this when the user logs in or the token changes.
 */
export function updateDownpatToken(token: string | null): void {
  if (token) {
    provideDownPatToken(token);
  } else {
    clearDownPatToken();
  }
}

/**
 * Clear the DownPat client and token.
 *
 * Call this when the user logs out.
 */
export function clearDownpat(): void {
  clientInstance = null;
  clearDownPatToken();
}
