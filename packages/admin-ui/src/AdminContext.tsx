import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AdminUIConfig, AdminUIContextValue } from './config.js';
import { createAdminAPIClient, type AdminAPIClient } from './api-client.js';

const AdminContext = createContext<AdminUIContextValue | null>(null);
const APIClientContext = createContext<AdminAPIClient | null>(null);

export interface AdminProviderProps {
  config: AdminUIConfig;
  children: React.ReactNode;
  /** Initial path (defaults to '/') */
  initialPath?: string;
}

/**
 * Provider component for admin UI configuration and state.
 */
export function AdminProvider({
  config,
  children,
  initialPath = '/',
}: AdminProviderProps): React.JSX.Element {
  const [currentPath, setCurrentPath] = useState(initialPath);

  const navigate = useCallback((path: string) => {
    setCurrentPath(path);
    if (config.onNavigate) {
      const fullPath = `${config.basePath || '/admin'}${path}`;
      config.onNavigate(fullPath);
    }
  }, [config]);

  const contextValue = useMemo<AdminUIContextValue>(() => ({
    ...config,
    basePath: config.basePath || '/admin',
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
