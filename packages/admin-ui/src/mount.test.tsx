import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountAdminUI } from './mount.js';

// Mock the ControlledAdminApp
vi.mock('./AdminApp.js', () => ({
  ControlledAdminApp: ({ path }: { path: string }) => (
    <div data-testid="controlled-admin-app" data-path={path}>
      Mock Admin App
    </div>
  ),
}));

describe('mountAdminUI', () => {
  let container: HTMLElement;

  const defaultOptions = {
    apiBaseUrl: '/api/test',
    getAuthToken: async () => 'test-token',
    availableModels: ['gpt-4'],
  };

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'admin-root';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('mounting', () => {
    it('should mount to an HTMLElement target', async () => {
      let admin: ReturnType<typeof mountAdminUI>;

      await act(async () => {
        admin = mountAdminUI({
          ...defaultOptions,
          target: container,
        });
      });

      expect(container.innerHTML).toContain('Mock Admin App');

      await act(async () => {
        admin.unmount();
      });
    });

    it('should mount to a CSS selector target', async () => {
      let admin: ReturnType<typeof mountAdminUI>;

      await act(async () => {
        admin = mountAdminUI({
          ...defaultOptions,
          target: '#admin-root',
        });
      });

      expect(container.innerHTML).toContain('Mock Admin App');

      await act(async () => {
        admin.unmount();
      });
    });

    it('should throw error for invalid selector', () => {
      expect(() => {
        mountAdminUI({
          ...defaultOptions,
          target: '#non-existent',
        });
      }).toThrow('mountAdminUI: Could not find target element: #non-existent');
    });

    it('should throw error for null element', () => {
      expect(() => {
        mountAdminUI({
          ...defaultOptions,
          target: null as unknown as HTMLElement,
        });
      }).toThrow();
    });
  });

  describe('unmount', () => {
    it('should unmount and clean up', async () => {
      let admin: ReturnType<typeof mountAdminUI>;

      await act(async () => {
        admin = mountAdminUI({
          ...defaultOptions,
          target: container,
        });
      });

      expect(container.innerHTML).toContain('Mock Admin App');

      await act(async () => {
        admin.unmount();
      });

      // After unmount, the container should be empty
      expect(container.innerHTML).toBe('');
    });

    it('should be safe to call unmount multiple times', async () => {
      let admin: ReturnType<typeof mountAdminUI>;

      await act(async () => {
        admin = mountAdminUI({
          ...defaultOptions,
          target: container,
        });
      });

      await act(async () => {
        admin.unmount();
      });

      // Second unmount should not throw
      expect(() => admin.unmount()).not.toThrow();
    });
  });

  describe('navigate', () => {
    it('should update the path when navigate is called', async () => {
      let admin: ReturnType<typeof mountAdminUI>;

      await act(async () => {
        admin = mountAdminUI({
          ...defaultOptions,
          target: container,
        });
      });

      // Initial path should be /
      expect(container.querySelector('[data-path="/"]')).toBeInTheDocument();

      // Navigate to a new path
      await act(async () => {
        admin.navigate('/exercises/new');
      });

      expect(container.querySelector('[data-path="/exercises/new"]')).toBeInTheDocument();

      await act(async () => {
        admin.unmount();
      });
    });

    it('should handle multiple navigations', async () => {
      let admin: ReturnType<typeof mountAdminUI>;

      await act(async () => {
        admin = mountAdminUI({
          ...defaultOptions,
          target: container,
        });
      });

      await act(async () => {
        admin.navigate('/exercises');
      });
      expect(container.querySelector('[data-path="/exercises"]')).toBeInTheDocument();

      await act(async () => {
        admin.navigate('/exercises/test/edit');
      });
      expect(container.querySelector('[data-path="/exercises/test/edit"]')).toBeInTheDocument();

      await act(async () => {
        admin.unmount();
      });
    });

    it('should not throw when called after unmount', async () => {
      let admin: ReturnType<typeof mountAdminUI>;

      await act(async () => {
        admin = mountAdminUI({
          ...defaultOptions,
          target: container,
        });
      });

      await act(async () => {
        admin.unmount();
      });

      // Navigate after unmount should not throw
      expect(() => admin.navigate('/exercises')).not.toThrow();
    });
  });

  describe('return value', () => {
    it('should return object with unmount and navigate functions', async () => {
      let admin: ReturnType<typeof mountAdminUI>;

      await act(async () => {
        admin = mountAdminUI({
          ...defaultOptions,
          target: container,
        });
      });

      expect(typeof admin.unmount).toBe('function');
      expect(typeof admin.navigate).toBe('function');

      await act(async () => {
        admin.unmount();
      });
    });
  });
});
