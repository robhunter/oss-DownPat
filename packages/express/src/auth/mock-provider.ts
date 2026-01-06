import type { ServerAuthProvider, User } from '@downpat/core';

/**
 * Configuration options for the mock auth provider.
 */
export interface MockAuthProviderOptions {
  /**
   * Custom token-to-user mappings.
   * If not provided, uses default demo-token and admin-token.
   */
  tokens?: Record<string, User>;

  /**
   * Custom demo user for anonymous access.
   * If not provided, uses default demo user.
   */
  demoUser?: User;
}

/**
 * Default demo user for anonymous access.
 */
const DEFAULT_DEMO_USER: User = {
  userId: 'demo-user',
  displayName: 'Demo User',
  isAdmin: false,
  isSubscriber: true,
};

/**
 * Default admin user.
 */
const DEFAULT_ADMIN_USER: User = {
  userId: 'admin-user',
  displayName: 'Admin User',
  isAdmin: true,
  isSubscriber: true,
};

/**
 * Default token mappings.
 */
const DEFAULT_TOKENS: Record<string, User> = {
  'demo-token': DEFAULT_DEMO_USER,
  'admin-token': DEFAULT_ADMIN_USER,
};

/**
 * Creates a mock auth provider for development and testing.
 * This provider accepts predefined tokens and returns corresponding users.
 *
 * @example
 * ```typescript
 * import { createMockAuthProvider } from '@downpat/express';
 *
 * // Use with default tokens (demo-token, admin-token)
 * const authProvider = createMockAuthProvider();
 *
 * // Or with custom tokens
 * const authProvider = createMockAuthProvider({
 *   tokens: {
 *     'test-token': { userId: 'test', displayName: 'Test', isAdmin: false, isSubscriber: true },
 *   },
 *   demoUser: { userId: 'anon', displayName: 'Anonymous', isAdmin: false, isSubscriber: false },
 * });
 *
 * const downpat = createDownpatRouter({
 *   serverAuth: authProvider,
 *   exerciseStorage,
 *   conversationStorage,
 * });
 * ```
 *
 * @param options - Configuration options
 * @returns A ServerAuthProvider implementation
 */
export function createMockAuthProvider(options: MockAuthProviderOptions = {}): ServerAuthProvider {
  const tokens = options.tokens ?? DEFAULT_TOKENS;
  const demoUser = options.demoUser ?? DEFAULT_DEMO_USER;

  return {
    validateToken: async (token: string): Promise<User> => {
      const user = tokens[token];
      if (user) {
        return user;
      }
      throw new Error('Invalid token');
    },

    getDemoUser: () => demoUser,
  };
}
