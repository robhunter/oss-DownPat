import { User } from '../types/user.js';

/**
 * Client-side authentication provider.
 * Implement this to integrate with your authentication system.
 *
 * @example
 * // Firebase Auth implementation
 * const firebaseAuth: ClientAuthProvider = {
 *   async getToken() {
 *     const user = firebase.auth().currentUser;
 *     return user ? user.getIdToken() : null;
 *   },
 *   onAuthChange(callback) {
 *     return firebase.auth().onAuthStateChanged(user => callback(!!user));
 *   }
 * };
 */
export interface ClientAuthProvider {
  /**
   * Get current auth token.
   * @returns Token string or null if not authenticated
   */
  getToken(): Promise<string | null>;

  /**
   * Subscribe to auth state changes.
   * @param callback - Called with true when authenticated, false otherwise
   * @returns Unsubscribe function
   */
  onAuthChange(callback: (hasAuth: boolean) => void): () => void;
}

/**
 * Server-side authentication provider.
 * Implement this to validate tokens and get user information.
 *
 * @example
 * // Firebase Admin implementation
 * const firebaseAuth: ServerAuthProvider = {
 *   async validateToken(token) {
 *     const decoded = await admin.auth().verifyIdToken(token);
 *     return {
 *       userId: decoded.uid,
 *       displayName: decoded.name || 'User',
 *       isAdmin: decoded.admin === true,
 *       isSubscriber: decoded.subscriber === true
 *     };
 *   },
 *   getDemoUser() {
 *     return {
 *       userId: 'demo-user',
 *       displayName: 'Demo User',
 *       isAdmin: false,
 *       isSubscriber: true
 *     };
 *   }
 * };
 */
export interface ServerAuthProvider {
  /**
   * Validate token and return user information.
   * @param token - The auth token to validate
   * @returns User information
   * @throws if token is invalid
   */
  validateToken(token: string): Promise<User>;

  /**
   * Get demo user for anonymous access.
   * @returns A shared demo user object
   */
  getDemoUser(): User;
}
