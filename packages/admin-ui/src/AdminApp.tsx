import React from 'react';
import { AdminProvider, useAdminContext } from './AdminContext.js';
import { ExerciseListPage } from './pages/ExerciseListPage.js';
import { ExerciseEditorPage } from './pages/ExerciseEditorPage.js';
import type { AdminUIConfig } from './config.js';

export interface AdminAppProps {
  config: AdminUIConfig;
}

/**
 * Main admin application component.
 * Handles internal routing and renders the appropriate page.
 */
export function AdminApp({ config }: AdminAppProps): React.JSX.Element {
  return (
    <AdminProvider config={config}>
      <div className="downpat-admin-app">
        <AdminRouter />
      </div>
    </AdminProvider>
  );
}

/**
 * Route definition for internal routing.
 */
interface Route {
  /** Path pattern - use :param for dynamic segments */
  pattern: string;
  /** Component to render, receives extracted params */
  render: (params: Record<string, string>) => React.JSX.Element;
}

/**
 * Match a path against a pattern and extract params.
 * Pattern uses :param syntax for dynamic segments.
 * Returns null if no match, otherwise returns extracted params.
 */
function matchPath(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      // Dynamic segment - extract param
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      // Static segment - must match exactly
      return null;
    }
  }

  return params;
}

/**
 * Admin routes configuration.
 * Routes are matched in order - first match wins.
 */
const routes: Route[] = [
  {
    pattern: '/exercises/new',
    render: () => <ExerciseEditorPage />,
  },
  {
    pattern: '/exercises/:slug/edit',
    render: (params) => <ExerciseEditorPage slug={params.slug} />,
  },
  {
    pattern: '/exercises',
    render: () => <ExerciseListPage />,
  },
  {
    pattern: '/',
    render: () => <ExerciseListPage />,
  },
];

/**
 * Internal router component that renders pages based on current path.
 */
function AdminRouter(): React.JSX.Element {
  const { currentPath } = useAdminContext();

  // Find first matching route
  for (const route of routes) {
    const params = matchPath(currentPath, route.pattern);
    if (params !== null) {
      return route.render(params);
    }
  }

  // Default: show exercise list
  return <ExerciseListPage />;
}

/**
 * Controlled admin app for integration with external routers.
 * Use this when you want to control routing externally.
 */
export interface ControlledAdminAppProps {
  config: AdminUIConfig;
  /** Current path (relative to basePath) */
  path: string;
}

export function ControlledAdminApp({ config, path }: ControlledAdminAppProps): React.JSX.Element {
  return (
    <AdminProvider config={config} path={path}>
      <div className="downpat-admin-app">
        <AdminRouter />
      </div>
    </AdminProvider>
  );
}
