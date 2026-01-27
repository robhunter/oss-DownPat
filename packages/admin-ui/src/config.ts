/**
 * Configuration for the DownPat Admin UI.
 *
 * ## Navigation Architecture
 *
 * The admin UI manages its own routing state internally. This allows it to work
 * as a self-contained module without requiring a specific router library.
 *
 * - **Internal navigation**: The admin UI tracks the current path and renders
 *   the appropriate page. Users can navigate via links and buttons within the UI.
 *
 * - **onNavigate callback**: A notification hook that fires when navigation occurs.
 *   Use this to sync with your app's router (update URL, browser history, etc.).
 *   This is one-way notification, not a control mechanism.
 *
 * - **External navigation**: Use the `navigate()` method returned by `mountAdminUI()`
 *   to programmatically navigate from outside the admin UI.
 */
export interface AdminUIConfig {
  /**
   * Base URL for API requests (e.g., '/api/downpat' or 'https://api.example.com/downpat')
   */
  apiBaseUrl: string;

  /**
   * Function to get the current auth token.
   * Called before each API request.
   */
  getAuthToken: () => Promise<string | null>;

  /**
   * Available AI models for exercise configuration.
   * These are shown in the model dropdown when creating/editing exercises.
   * @default ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet']
   */
  availableModels?: string[];

  /**
   * Base path for admin routes (e.g., '/admin').
   * Used for constructing full paths in onNavigate callbacks.
   * @default '/admin'
   */
  basePath?: string;

  /**
   * Notification callback when navigation occurs within the admin UI.
   *
   * This is called whenever the user navigates (clicks a link, submits a form, etc.)
   * so you can sync with your app's router. The path includes the basePath prefix.
   *
   * Note: This is a notification, not a control mechanism. The admin UI manages
   * its own routing state internally. To navigate programmatically, use the
   * `navigate()` method returned by `mountAdminUI()`.
   *
   * @example
   * ```typescript
   * onNavigate: (path) => {
   *   window.history.pushState(null, '', path);
   * }
   * ```
   */
  onNavigate?: (path: string) => void;

  /**
   * Callback when user clicks "Test" on an exercise.
   * If not provided, test button is hidden.
   */
  onTestExercise?: (exerciseId: string, slug: string) => void;
}

/**
 * Context for accessing admin configuration throughout the admin UI.
 * Note: Optional config fields are guaranteed to have values in context (defaults applied).
 */
export interface AdminUIContextValue extends Omit<AdminUIConfig, 'availableModels' | 'basePath'> {
  /**
   * Available AI models (default applied if not provided in config)
   */
  availableModels: string[];

  /**
   * Base path for admin routes (default applied if not provided in config)
   */
  basePath: string;

  /**
   * Current path within the admin UI (relative to basePath)
   */
  currentPath: string;

  /**
   * Navigate to a path within the admin UI
   */
  navigate: (path: string) => void;
}
