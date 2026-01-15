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

// Singleton client instance (for non-context usage)
let clientInstance: DownpatClient | null = null;

/**
 * Initialize the DownPat client (singleton pattern).
 *
 * This sets up both the API client and the Socket.io token for real-time
 * conversation features. Call this once during app initialization.
 *
 * **Note:** For React applications, prefer using `<DownpatProvider>` instead.
 * This function is provided for backwards compatibility and non-React usage.
 *
 * @example
 * ```typescript
 * // In your auth provider or app initialization:
 * initializeDownpat({
 *   getToken: () => localStorage.getItem('auth_token'),
 * });
 * ```
 *
 * @deprecated Prefer using DownpatProvider for better testability and React integration
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
 * Get the initialized DownPat client (singleton).
 *
 * **Note:** For React components, prefer using `useDownpatClient()` hook instead.
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
      'DownPat client not initialized. Call initializeDownpat() first, ' +
      'or use DownpatProvider with useDownpatClient() hook.'
    );
  }
  return clientInstance;
}

/**
 * Update the auth token (singleton).
 *
 * Call this when the user logs in or the token changes.
 *
 * **Note:** When using DownpatProvider, use useDownpatToken() hook instead.
 */
export function updateDownpatToken(token: string | null): void {
  if (token) {
    provideDownPatToken(token);
  } else {
    clearDownPatToken();
  }
}

/**
 * Clear the DownPat client and token (singleton).
 *
 * Call this when the user logs out.
 */
export function clearDownpat(): void {
  clientInstance = null;
  clearDownPatToken();
}

/**
 * Check if the singleton client is initialized.
 *
 * Useful for components that need to work with both context and singleton patterns.
 */
export function isDownpatInitialized(): boolean {
  return clientInstance !== null;
}

// For testing: allow resetting the singleton
export function _resetForTesting(): void {
  clientInstance = null;
}
