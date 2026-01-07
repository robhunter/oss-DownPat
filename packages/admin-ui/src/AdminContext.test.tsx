import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AdminProvider, useAdminContext, useAdminAPI } from './AdminContext.js';
import type { AdminUIConfig } from './config.js';

const mockConfig: AdminUIConfig = {
  apiBaseUrl: '/api/test',
  getAuthToken: async () => 'test-token',
  availableModels: ['gpt-4', 'gpt-3.5-turbo'],
  basePath: '/admin',
};

// Test component that uses the context
function TestConsumer() {
  const ctx = useAdminContext();
  return (
    <div>
      <span data-testid="current-path">{ctx.currentPath}</span>
      <span data-testid="base-path">{ctx.basePath}</span>
      <span data-testid="models">{ctx.availableModels.join(',')}</span>
      <button onClick={() => ctx.navigate('/exercises/new')}>Navigate</button>
    </div>
  );
}

function APITestConsumer() {
  const api = useAdminAPI();
  return (
    <div>
      <span data-testid="has-api">{api ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('AdminProvider', () => {
  it('should provide config values to children', () => {
    render(
      <AdminProvider config={mockConfig}>
        <TestConsumer />
      </AdminProvider>
    );

    expect(screen.getByTestId('models').textContent).toBe('gpt-4,gpt-3.5-turbo');
    expect(screen.getByTestId('base-path').textContent).toBe('/admin');
  });

  it('should default basePath to /admin', () => {
    const configWithoutBasePath = { ...mockConfig, basePath: undefined };
    render(
      <AdminProvider config={configWithoutBasePath}>
        <TestConsumer />
      </AdminProvider>
    );

    expect(screen.getByTestId('base-path').textContent).toBe('/admin');
  });

  it('should start with initialPath', () => {
    render(
      <AdminProvider config={mockConfig} initialPath="/exercises/new">
        <TestConsumer />
      </AdminProvider>
    );

    expect(screen.getByTestId('current-path').textContent).toBe('/exercises/new');
  });

  it('should default initialPath to /', () => {
    render(
      <AdminProvider config={mockConfig}>
        <TestConsumer />
      </AdminProvider>
    );

    expect(screen.getByTestId('current-path').textContent).toBe('/');
  });

  it('should use controlled path when provided', () => {
    render(
      <AdminProvider config={mockConfig} path="/exercises/test/edit">
        <TestConsumer />
      </AdminProvider>
    );

    expect(screen.getByTestId('current-path').textContent).toBe('/exercises/test/edit');
  });

  it('should update when controlled path changes', () => {
    const { rerender } = render(
      <AdminProvider config={mockConfig} path="/exercises">
        <TestConsumer />
      </AdminProvider>
    );

    expect(screen.getByTestId('current-path').textContent).toBe('/exercises');

    rerender(
      <AdminProvider config={mockConfig} path="/exercises/new">
        <TestConsumer />
      </AdminProvider>
    );

    expect(screen.getByTestId('current-path').textContent).toBe('/exercises/new');
  });

  it('should call onNavigate callback when navigating', () => {
    const onNavigate = vi.fn();
    const configWithCallback = { ...mockConfig, onNavigate };

    render(
      <AdminProvider config={configWithCallback}>
        <TestConsumer />
      </AdminProvider>
    );

    act(() => {
      screen.getByText('Navigate').click();
    });

    expect(onNavigate).toHaveBeenCalledWith('/admin/exercises/new');
  });

  it('should provide API client', () => {
    render(
      <AdminProvider config={mockConfig}>
        <APITestConsumer />
      </AdminProvider>
    );

    expect(screen.getByTestId('has-api').textContent).toBe('yes');
  });
});

describe('useAdminContext', () => {
  it('should throw when used outside provider', () => {
    // Suppress error output for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAdminContext must be used within an AdminProvider');

    consoleSpy.mockRestore();
  });
});

describe('useAdminAPI', () => {
  it('should throw when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<APITestConsumer />);
    }).toThrow('useAdminAPI must be used within an AdminProvider');

    consoleSpy.mockRestore();
  });
});
