/**
 * Route configuration for DownPat.
 * Use these constants and configs with your router of choice.
 *
 * @example
 * ```typescript
 * // React Router
 * import { DOWNPAT_PATHS, DownPatRouteConfig, downpatRoutes } from '@downpat/ui-components';
 *
 * function App() {
 *   return (
 *     <Routes>
 *       {downpatRoutes.map(route => (
 *         <Route
 *           key={route.path}
 *           path={route.path}
 *           element={<YourWrapper route={route} />}
 *         />
 *       ))}
 *     </Routes>
 *   );
 * }
 * ```
 */

/**
 * Standard paths for DownPat routes.
 * Use these to ensure consistent URLs across your application.
 */
export const DOWNPAT_PATHS = {
  /** Browse available exercises */
  EXERCISES: '/exercises',
  /** Conversation with a specific exercise (use :slug param) */
  EXERCISE_CONVERSATION: '/exercises/:slug',
  /** Admin dashboard */
  ADMIN_DASHBOARD: '/admin',
  /** Admin exercise list */
  ADMIN_EXERCISES: '/admin/exercises',
  /** Create new exercise */
  ADMIN_EXERCISE_NEW: '/admin/exercises/new',
  /** Edit existing exercise (use :slug param) */
  ADMIN_EXERCISE_EDIT: '/admin/exercises/:slug/edit',
  /** Test exercise as admin (use :slug param) */
  ADMIN_EXERCISE_TEST: '/admin/test/:slug',
} as const;

/**
 * Route requirement levels.
 */
export type RouteRequirement = 'public' | 'authenticated' | 'subscriber' | 'admin';

/**
 * Configuration for a single route.
 */
export interface DownPatRouteConfig {
  /** The path pattern (may include params like :slug) */
  path: string;
  /** Human-readable name for the route */
  name: string;
  /** What level of access is required */
  requirement: RouteRequirement;
  /** Description of what this route is for */
  description: string;
  /** Route parameters (for documentation) */
  params?: string[];
}

/**
 * Standard route configurations for DownPat.
 * Partners can filter, modify, or extend these as needed.
 */
export const downpatRoutes: DownPatRouteConfig[] = [
  {
    path: DOWNPAT_PATHS.EXERCISES,
    name: 'Exercise Browser',
    requirement: 'subscriber',
    description: 'Browse and select from available exercises',
  },
  {
    path: DOWNPAT_PATHS.EXERCISE_CONVERSATION,
    name: 'Exercise Conversation',
    requirement: 'subscriber',
    description: 'Engage in a conversation exercise',
    params: ['slug'],
  },
  {
    path: DOWNPAT_PATHS.ADMIN_DASHBOARD,
    name: 'Admin Dashboard',
    requirement: 'admin',
    description: 'Admin overview and statistics',
  },
  {
    path: DOWNPAT_PATHS.ADMIN_EXERCISES,
    name: 'Exercise Management',
    requirement: 'admin',
    description: 'Manage all exercises',
  },
  {
    path: DOWNPAT_PATHS.ADMIN_EXERCISE_NEW,
    name: 'Create Exercise',
    requirement: 'admin',
    description: 'Create a new exercise',
  },
  {
    path: DOWNPAT_PATHS.ADMIN_EXERCISE_EDIT,
    name: 'Edit Exercise',
    requirement: 'admin',
    description: 'Edit an existing exercise',
    params: ['slug'],
  },
  {
    path: DOWNPAT_PATHS.ADMIN_EXERCISE_TEST,
    name: 'Test Exercise',
    requirement: 'admin',
    description: 'Test an exercise before publishing',
    params: ['slug'],
  },
];

/**
 * Helper to generate a path with parameters filled in.
 *
 * @example
 * ```typescript
 * generatePath(DOWNPAT_PATHS.EXERCISE_CONVERSATION, { slug: 'my-exercise' })
 * // => '/exercises/my-exercise'
 * ```
 */
export function generatePath(path: string, params: Record<string, string>): string {
  let result = path;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(value));
  }
  return result;
}

/**
 * Get routes filtered by requirement level.
 *
 * @example
 * ```typescript
 * // Get only admin routes
 * const adminRoutes = getRoutesByRequirement('admin');
 *
 * // Get routes accessible to subscribers (subscriber + public)
 * const subscriberRoutes = getRoutesByRequirement('subscriber', { includePublic: true });
 * ```
 */
export function getRoutesByRequirement(
  requirement: RouteRequirement,
  options: { includePublic?: boolean } = {}
): DownPatRouteConfig[] {
  const { includePublic = false } = options;

  return downpatRoutes.filter((route) => {
    if (route.requirement === requirement) return true;
    if (includePublic && route.requirement === 'public') return true;
    return false;
  });
}
