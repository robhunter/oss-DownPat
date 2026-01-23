import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@downpat/core';
import { initializeDownpat, updateDownpatToken, clearDownpat } from '@downpat/react';

/**
 * Authentication provider for the example app.
 * Authentication is app-specific - this won't be part of DownPat packages.
 */

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const TOKEN_KEY = 'downpat_token';
const USER_KEY = 'downpat_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize DownPat client once on mount
  // Use localStorage directly so the token getter always has current value
  useEffect(() => {
    initializeDownpat({
      getToken: () => localStorage.getItem(TOKEN_KEY),
    });
  }, []);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Update token in DownPat (for Socket.io)
        updateDownpatToken(savedToken);
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        clearDownpat();
      }
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string) => {
    // Demo login - in production this would call your auth API
    const response = await fetch('/api/downpat/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    // Update token in DownPat
    updateDownpatToken(data.token);

    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Clear DownPat state
    clearDownpat();
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
