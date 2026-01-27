import { useState, useEffect, useCallback } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ControlledAdminApp } from './AdminApp.js';
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
   * Programmatically navigate to a path within the admin UI.
   *
   * Use this for external navigation control (e.g., syncing with browser URL).
   * Path should be relative to basePath (e.g., '/exercises', '/exercises/new').
   *
   * Note: This updates the internal routing state directly. Unlike internal
   * navigation, this does NOT trigger the onNavigate callback (since you're
   * already in control of the navigation from outside).
   *
   * @example
   * ```typescript
   * // Navigate to edit page when URL changes
   * window.addEventListener('popstate', () => {
   *   const path = window.location.pathname.replace('/admin', '');
   *   admin.navigate(path);
   * });
   * ```
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
 *   // availableModels is optional, defaults to DEFAULT_AVAILABLE_MODELS from @downpat/core
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

  // Create React root and render
  const root: Root = createRoot(targetElement);

  // Create a wrapper component that manages path state and exposes navigation
  const AdminAppWithRef = () => {
    const [currentPath, setCurrentPath] = useState('/');
    const basePath = config.basePath || '/admin';

    const handleNavigate = useCallback((fullPath: string) => {
      // AdminContext.navigate passes the full path (basePath + relativePath)
      // We need to extract the relative path for internal routing
      const relativePath = fullPath.startsWith(basePath)
        ? fullPath.slice(basePath.length) || '/'
        : fullPath;
      setCurrentPath(relativePath);
      // Notify host app of navigation (with full path)
      if (config.onNavigate) {
        config.onNavigate(fullPath);
      }
    }, [basePath]);

    useEffect(() => {
      navigateCallback = (path: string) => {
        setCurrentPath(path);
      };

      return () => {
        navigateCallback = null;
      };
    }, []);

    const configWithNavigation: AdminUIConfig = {
      ...config,
      onNavigate: handleNavigate,
    };

    return <ControlledAdminApp config={configWithNavigation} path={currentPath} />;
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
