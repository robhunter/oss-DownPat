import React, { createContext, useContext, useMemo, useEffect, useCallback, useState } from 'react';
import { provideDownPatToken, clearDownPatToken } from '@downpat/ui-components';
import { DownpatClient, createDownpatClient } from './DownpatClient.js';

/**
 * Configuration for the DownPat provider
 */
export interface DownpatProviderConfig {
  /** Base URL for the DownPat API (default: '/api/downpat') */
  baseUrl?: string;
  /** Function to get the current auth token (can be async) */
  getToken: () => string | null | Promise<string | null>;
  /** Current auth token (optional, for reactive updates) */
  token?: string | null;
}

interface DownpatContextValue {
  client: DownpatClient;
  updateToken: (token: string | null) => void;
}

const DownpatContext = createContext<DownpatContextValue | null>(null);

/**
 * Provider component that initializes and provides the DownPat client.
 *
 * This is the recommended way to use DownPat in React applications.
 * It provides the client via context and handles token updates automatically.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { token } = useAuth();
 *
 *   return (
 *     <DownpatProvider
 *       getToken={() => token}
 *       token={token}
 *     >
 *       <MyApp />
 *     </DownpatProvider>
 *   );
 * }
 * ```
 */
export function DownpatProvider({
  children,
  baseUrl,
  getToken,
  token,
}: DownpatProviderConfig & { children: React.ReactNode }) {
  // Track internal token state for provider (used for reactive updates)
  const [, setCurrentToken] = useState<string | null>(() => token ?? getToken());

  // Create client - memoized to avoid recreation
  const client = useMemo(() => {
    return createDownpatClient({
      baseUrl,
      getToken,
    });
  }, [baseUrl, getToken]);

  // Update token callback
  const updateToken = useCallback((newToken: string | null) => {
    setCurrentToken(newToken);
    if (newToken) {
      provideDownPatToken(newToken);
    } else {
      clearDownPatToken();
    }
  }, []);

  // Sync token prop changes to internal state and Socket.io
  useEffect(() => {
    if (token !== undefined) {
      updateToken(token);
    }
  }, [token, updateToken]);

  // Initial token setup
  useEffect(() => {
    const initialToken = getToken();
    if (initialToken) {
      provideDownPatToken(initialToken);
    }
    return () => {
      clearDownPatToken();
    };
  }, [getToken]);

  const value = useMemo(() => ({
    client,
    updateToken,
  }), [client, updateToken]);

  return (
    <DownpatContext.Provider value={value}>
      {children}
    </DownpatContext.Provider>
  );
}

/**
 * Hook to access the DownPat client from context.
 *
 * Must be used within a DownpatProvider.
 *
 * @example
 * ```tsx
 * function ExerciseList() {
 *   const client = useDownpatClient();
 *   const [exercises, setExercises] = useState([]);
 *
 *   useEffect(() => {
 *     client.getPublishedExercises().then(setExercises);
 *   }, [client]);
 *
 *   return <ul>{exercises.map(e => <li key={e.exerciseId}>{e.exerciseName}</li>)}</ul>;
 * }
 * ```
 *
 * @throws Error if used outside of DownpatProvider
 */
export function useDownpatClient(): DownpatClient {
  const context = useContext(DownpatContext);
  if (!context) {
    throw new Error(
      'useDownpatClient must be used within a DownpatProvider. ' +
      'Wrap your app with <DownpatProvider> or use initializeDownpat() for non-context usage.'
    );
  }
  return context.client;
}

/**
 * Hook to access token update function from context.
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const updateToken = useDownpatToken();
 *
 *   const handleLogin = async () => {
 *     const token = await login();
 *     updateToken(token);
 *   };
 *
 *   return <button onClick={handleLogin}>Login</button>;
 * }
 * ```
 */
export function useDownpatToken(): (token: string | null) => void {
  const context = useContext(DownpatContext);
  if (!context) {
    throw new Error(
      'useDownpatToken must be used within a DownpatProvider.'
    );
  }
  return context.updateToken;
}

/**
 * Hook to check if DownpatProvider is available.
 *
 * Useful for components that can work with or without context.
 */
export function useHasDownpatContext(): boolean {
  const context = useContext(DownpatContext);
  return context !== null;
}

// Export context for testing
export { DownpatContext };
