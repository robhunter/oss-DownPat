import React from 'react';
import { useRoutes, useParams, useNavigate, useLocation } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { ConversationPage } from '@downpat/ui-components';
import { ControlledAdminApp } from '@downpat/admin-ui';
import type { AdminUIConfig } from '@downpat/admin-ui';
import { usePublishedExercises } from '../hooks/index.js';

/**
 * Configuration for creating DownPat routes
 */
export interface DownpatRoutesConfig {
  /**
   * Component to wrap protected routes (subscriber-level access).
   * Should handle authentication and redirect to login if needed.
   *
   * @example
   * ```tsx
   * authWrapper: ({ children }) => (
   *   <ProtectedRoute>{children}</ProtectedRoute>
   * )
   * ```
   */
  authWrapper: React.ComponentType<{ children: React.ReactNode }>;

  /**
   * Component to wrap admin-only routes.
   * Should handle admin authentication and redirect if not admin.
   * Falls back to authWrapper if not provided.
   *
   * @example
   * ```tsx
   * adminAuthWrapper: ({ children }) => (
   *   <ProtectedRoute requireAdmin>{children}</ProtectedRoute>
   * )
   * ```
   */
  adminAuthWrapper?: React.ComponentType<{ children: React.ReactNode }>;

  /**
   * Base path for all DownPat routes (default: '/downpat')
   *
   * Routes will be:
   * - {basePath}/exercises - Exercise browser
   * - {basePath}/exercises/:slug - Conversation
   * - {basePath}/admin/* - Admin UI (with internal routing)
   */
  basePath?: string;

  /**
   * API base URL for admin operations (default: '/api/downpat')
   */
  apiBaseUrl?: string;

  /**
   * Function to get the current auth token.
   * Called before each API request.
   */
  getAuthToken: () => Promise<string | null>;

  /**
   * Available AI models for exercise configuration.
   * If not provided, defaults to common models.
   */
  availableModels?: string[];
}

/**
 * Simple exercise browser component.
 * Lists published exercises with links to start conversations.
 */
function ExerciseBrowserPage({ basePath }: { basePath: string }) {
  const { exercises, isLoading, error } = usePublishedExercises();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading exercises...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Exercises</h1>
      {exercises.length === 0 ? (
        <p style={styles.empty}>No exercises available.</p>
      ) : (
        <div style={styles.grid}>
          {exercises.map((exercise) => (
            <div
              key={exercise.exerciseId}
              style={styles.card}
              onClick={() => navigate(`${basePath}/exercises/${exercise.slug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`${basePath}/exercises/${exercise.slug}`);
                }
              }}
            >
              <h2 style={styles.cardTitle}>{exercise.exerciseName}</h2>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper for ConversationPage that extracts slug from URL params.
 */
function ConversationPageWrapper({
  basePath,
  isAdminTest = false,
}: {
  basePath: string;
  isAdminTest?: boolean;
}) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  if (!slug) {
    return <div>Exercise not found</div>;
  }

  return (
    <ConversationPage
      slug={slug}
      onBack={() => navigate(isAdminTest ? `${basePath}/admin/exercises` : `${basePath}/exercises`)}
      backText={isAdminTest ? '← Back to Admin' : '← Back to Exercises'}
      isAdminTest={isAdminTest}
    />
  );
}

/**
 * Wrapper for admin UI that integrates with React Router.
 */
function AdminWrapper({
  basePath,
  apiBaseUrl,
  availableModels,
  getAuthToken,
}: {
  basePath: string;
  apiBaseUrl: string;
  availableModels: string[];
  getAuthToken: () => Promise<string | null>;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the admin-relative path
  const adminBasePath = `${basePath}/admin`;
  const currentPath = location.pathname.startsWith(adminBasePath)
    ? location.pathname.slice(adminBasePath.length) || '/'
    : '/';

  const config: AdminUIConfig = {
    apiBaseUrl,
    availableModels,
    getAuthToken,
    onNavigate: (path: string) => {
      // Convert admin-relative paths to full paths
      navigate(`${adminBasePath}${path}`);
    },
    onTestExercise: (_exerciseId: string, slug: string) => {
      navigate(`${basePath}/admin/test/${slug}`);
    },
  };

  return <ControlledAdminApp config={config} path={currentPath} />;
}

/**
 * Create route configuration objects for DownPat routes.
 * Returns an array of route objects compatible with React Router's useRoutes.
 */
export function createDownpatRouteObjects(config: DownpatRoutesConfig): RouteObject[] {
  const {
    authWrapper: AuthWrapper,
    adminAuthWrapper: AdminAuthWrapper = config.authWrapper,
    basePath = '/downpat',
    apiBaseUrl = '/api/downpat',
    getAuthToken,
    availableModels = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'],
  } = config;

  // Routes are relative - they're rendered inside a parent route at basePath/*
  return [
    // Exercise browser
    {
      path: 'exercises',
      element: (
        <AuthWrapper>
          <ExerciseBrowserPage basePath={basePath} />
        </AuthWrapper>
      ),
    },
    // Conversation
    {
      path: 'exercises/:slug',
      element: (
        <AuthWrapper>
          <ConversationPageWrapper basePath={basePath} />
        </AuthWrapper>
      ),
    },
    // Admin test route (must be before admin/* to match first)
    {
      path: 'admin/test/:slug',
      element: (
        <AdminAuthWrapper>
          <ConversationPageWrapper basePath={basePath} isAdminTest />
        </AdminAuthWrapper>
      ),
    },
    // Admin routes (catch-all for internal routing)
    {
      path: 'admin/*',
      element: (
        <AdminAuthWrapper>
          <AdminWrapper
            basePath={basePath}
            apiBaseUrl={apiBaseUrl}
            availableModels={availableModels}
            getAuthToken={getAuthToken}
          />
        </AdminAuthWrapper>
      ),
    },
  ];
}

/**
 * Component that renders DownPat routes using useRoutes.
 *
 * @example
 * ```tsx
 * import { DownpatRoutes } from '@downpat/react';
 *
 * function App() {
 *   return (
 *     <BrowserRouter>
 *       <Routes>
 *         <Route path="/" element={<Home />} />
 *         <Route path="/*" element={
 *           <DownpatRoutes
 *             authWrapper={ProtectedRoute}
 *             adminAuthWrapper={AdminRoute}
 *             getAuthToken={async () => token}
 *           />
 *         } />
 *       </Routes>
 *     </BrowserRouter>
 *   );
 * }
 * ```
 */
export function DownpatRoutes(config: DownpatRoutesConfig): React.ReactElement | null {
  const routes = createDownpatRouteObjects(config);
  return useRoutes(routes);
}

/**
 * Create DownPat routes for React Router.
 *
 * @deprecated Use DownpatRoutes component or createDownpatRouteObjects instead.
 * This function returns route configuration objects for use with useRoutes.
 */
export function createDownpatRoutes(config: DownpatRoutesConfig): RouteObject[] {
  return createDownpatRouteObjects(config);
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '600',
    marginBottom: '24px',
    color: 'var(--downpat-neutral-900, #111827)',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: 'var(--downpat-neutral-500, #6b7280)',
  },
  error: {
    textAlign: 'center',
    padding: '48px',
    color: 'var(--downpat-error-600, #dc2626)',
  },
  empty: {
    textAlign: 'center',
    padding: '48px',
    color: 'var(--downpat-neutral-500, #6b7280)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
    border: '1px solid var(--downpat-neutral-200, #e5e7eb)',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '8px',
    color: 'var(--downpat-neutral-900, #111827)',
  },
};
