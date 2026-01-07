import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AdminApp } from './AdminApp.js';
import type { AdminUIConfig } from './config.js';

export interface MountAdminUIOptions extends AdminUIConfig {
  /**
   * Target element to render the admin UI into.
   * Can be an HTMLElement or a CSS selector string.
   */
  target: HTMLElement | string;
}

export interface MountedAdminUI {
  /**
   * Unmount the admin UI and clean up.
   */
  unmount: () => void;

  /**
   * Navigate to a path within the admin UI.
   * Path should be relative to basePath (e.g., '/exercises', '/exercises/new').
   */
  navigate: (path: string) => void;
}

/**
 * Mount the DownPat Admin UI into a target element.
 *
 * @example
 * ```typescript
 * import { mountAdminUI } from '@downpat/admin-ui';
 *
 * const admin = mountAdminUI({
 *   target: '#admin-root',
 *   apiBaseUrl: '/api/downpat',
 *   getAuthToken: async () => localStorage.getItem('token'),
 *   availableModels: ['gpt-4', 'gpt-3.5-turbo'],
 * });
 *
 * // Later, to unmount:
 * admin.unmount();
 * ```
 */
export function mountAdminUI(options: MountAdminUIOptions): MountedAdminUI {
  const { target, ...config } = options;

  // Resolve target element
  const targetElement = typeof target === 'string'
    ? document.querySelector<HTMLElement>(target)
    : target;

  if (!targetElement) {
    throw new Error(`mountAdminUI: Could not find target element: ${target}`);
  }

  // Track navigation callback for external navigation
  let navigateCallback: ((path: string) => void) | null = null;

  const configWithNavigation: AdminUIConfig = {
    ...config,
    onNavigate: (path) => {
      // Store the path for the navigate() method
      if (config.onNavigate) {
        config.onNavigate(path);
      }
    },
  };

  // Create React root and render
  const root: Root = createRoot(targetElement);

  // Create a wrapper component that exposes navigation
  const AdminAppWithRef = () => {
    const [, forceUpdate] = React.useState({});

    React.useEffect(() => {
      navigateCallback = (_path: string) => {
        // Update internal state to trigger re-render with new path
        forceUpdate({});
      };

      return () => {
        navigateCallback = null;
      };
    }, []);

    return <AdminApp config={configWithNavigation} />;
  };

  root.render(<AdminAppWithRef />);

  return {
    unmount: () => {
      root.unmount();
    },
    navigate: (path: string) => {
      if (navigateCallback) {
        navigateCallback(path);
      }
    },
  };
}
