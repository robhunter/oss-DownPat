/**
 * User information returned from authentication.
 * This is the common user object used throughout the application.
 */
export interface User {
  /** Unique identifier for the user */
  userId: string;
  /** Display name shown in UI */
  displayName: string;
  /** Whether user has admin privileges (can create/edit exercises) */
  isAdmin: boolean;
  /** Whether user has subscriber access (can start conversations) */
  isSubscriber: boolean;
}
