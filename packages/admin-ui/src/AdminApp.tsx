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
 * Internal router component that renders pages based on current path.
 */
function AdminRouter(): React.JSX.Element {
  const { currentPath } = useAdminContext();

  // Parse the current path to determine which page to render
  // Paths are relative to basePath (e.g., '/exercises', '/exercises/new')

  // Exercise editor: /exercises/:slug/edit
  const editMatch = currentPath.match(/^\/exercises\/([^/]+)\/edit$/);
  if (editMatch) {
    return <ExerciseEditorPage slug={editMatch[1]} />;
  }

  // New exercise: /exercises/new
  if (currentPath === '/exercises/new') {
    return <ExerciseEditorPage />;
  }

  // Exercise list: /exercises or /
  if (currentPath === '/exercises' || currentPath === '/') {
    return <ExerciseListPage />;
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
    <AdminProvider config={config} initialPath={path}>
      <div className="downpat-admin-app">
        <AdminRouter />
      </div>
    </AdminProvider>
  );
}
