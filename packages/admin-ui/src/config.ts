/**
 * Configuration for the DownPat Admin UI.
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
   */
  availableModels: string[];

  /**
   * Base path for admin routes (e.g., '/admin').
   * Used for internal navigation within the admin UI.
   * @default '/admin'
   */
  basePath?: string;

  /**
   * Callback when navigation occurs.
   * Use this to integrate with your app's router (e.g., react-router, next/router).
   * If not provided, admin UI uses its own internal routing.
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
 */
export interface AdminUIContextValue extends AdminUIConfig {
  /**
   * Current path within the admin UI (relative to basePath)
   */
  currentPath: string;

  /**
   * Navigate to a path within the admin UI
   */
  navigate: (path: string) => void;
}
