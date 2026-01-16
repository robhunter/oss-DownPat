/**
 * Minimal internal state tracked by DownPat for each user.
 * This is NOT the full User object - that comes from the host app.
 * We only persist what we need for conversation tracking.
 */
export interface UserState {
  /** Unique identifier for the user */
  userId: string;
  /** Map of exerciseId -> conversationId for active (non-finished) conversations */
  activeConversations: Record<string, string>;
}
