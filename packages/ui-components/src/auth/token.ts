const STORAGE_KEY = 'downpat_token';

let memoryToken: string | null = null;

// Simple event emitter for token changes
type TokenChangeListener = (token: string | null) => void;
const tokenChangeListeners: Set<TokenChangeListener> = new Set();

/**
 * Subscribe to token changes.
 * Called when provideDownPatToken or clearDownPatToken is invoked.
 *
 * @param listener - Callback to invoke when token changes
 * @returns Unsubscribe function
 */
export function onTokenChange(listener: TokenChangeListener): () => void {
  tokenChangeListeners.add(listener);
  return () => {
    tokenChangeListeners.delete(listener);
  };
}

function notifyTokenChange(token: string | null): void {
  tokenChangeListeners.forEach((listener) => {
    try {
      listener(token);
    } catch (e) {
      console.error('Token change listener error:', e);
    }
  });
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__downpat_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Provide a token for DownPat to use for authentication.
 * Call this after your auth system has authenticated the user.
 *
 * @param token - The auth token, or null/undefined to clear
 */
export function provideDownPatToken(token: string | null | undefined): void {
  // Normalize undefined to null for consistent handling
  const normalizedToken = token ?? null;
  memoryToken = normalizedToken;

  if (isLocalStorageAvailable()) {
    if (normalizedToken === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, normalizedToken);
    }
  }

  // Notify listeners of token change
  notifyTokenChange(normalizedToken);
}

/**
 * Get the current DownPat auth token.
 * Returns the token from localStorage if available, otherwise from memory.
 *
 * @returns The current token, or null if not set
 */
export function getDownPatToken(): string | null {
  if (isLocalStorageAvailable()) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      memoryToken = stored;
      return stored;
    }
  }
  return memoryToken;
}

/**
 * Clear the DownPat auth token.
 * Call this when the user logs out.
 */
export function clearDownPatToken(): void {
  memoryToken = null;

  if (isLocalStorageAvailable()) {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Notify listeners of token change
  notifyTokenChange(null);
}
