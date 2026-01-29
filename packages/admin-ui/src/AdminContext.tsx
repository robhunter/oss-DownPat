import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AdminUIConfig, AdminUIContextValue } from './config.js';
import { createAdminAPIClient, type AdminAPIClient } from './api-client.js';

const AdminContext = createContext<AdminUIContextValue | null>(null);
const APIClientContext = createContext<AdminAPIClient | null>(null);

export interface AdminProviderProps {
  config: AdminUIConfig;
  children: React.ReactNode;
  /** Initial path for uncontrolled mode (defaults to '/') */
  initialPath?: string;
  /** Controlled path - when provided, overrides internal state */
  path?: string;
}

/**
 * Provider component for admin UI configuration and state.
 * Supports both controlled (path prop) and uncontrolled (initialPath) modes.
 */
export function AdminProvider({
  config,
  children,
  initialPath = '/',
  path,
}: AdminProviderProps): React.JSX.Element {
  const [internalPath, setInternalPath] = useState(initialPath);

  // Use controlled path if provided, otherwise use internal state
  const currentPath = path !== undefined ? path : internalPath;

  const navigate = useCallback((newPath: string) => {
    setInternalPath(newPath);
    if (config.onNavigate) {
      const fullPath = `${config.basePath || '/admin'}${newPath}`;
      config.onNavigate(fullPath);
    }
  }, [config]);

  const contextValue = useMemo<AdminUIContextValue>(() => ({
    ...config,
    basePath: config.basePath || '/admin',
    availableModels: config.availableModels || [],
    currentPath,
    navigate,
  }), [config, currentPath, navigate]);

  const apiClient = useMemo(() =>
    createAdminAPIClient(config.apiBaseUrl, config.getAuthToken),
    [config.apiBaseUrl, config.getAuthToken]
  );

  return (
    <AdminContext.Provider value={contextValue}>
      <APIClientContext.Provider value={apiClient}>
        {children}
      </APIClientContext.Provider>
    </AdminContext.Provider>
  );
}

/**
 * Hook to access admin configuration and navigation.
 */
export function useAdminContext(): AdminUIContextValue {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return context;
}

/**
 * Hook to access the admin API client.
 */
export function useAdminAPI(): AdminAPIClient {
  const client = useContext(APIClientContext);
  if (!client) {
    throw new Error('useAdminAPI must be used within an AdminProvider');
  }
  return client;
}
