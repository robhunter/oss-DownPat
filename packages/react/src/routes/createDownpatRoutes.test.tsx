import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

// Mock the hooks module
vi.mock('../hooks/index.js', () => ({
  usePublishedExercises: vi.fn(() => ({
    exercises: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

// Mock ConversationPage from ui-components
vi.mock('@downpat/ui-components', () => ({
  ConversationPage: vi.fn(({ slug, onBack, backText, isAdminTest }: {
    slug: string;
    onBack: () => void;
    backText: string;
    isAdminTest?: boolean;
  }) => (
    <div data-testid="conversation-page">
      <span data-testid="conversation-slug">{slug}</span>
      <span data-testid="conversation-back-text">{backText}</span>
      <span data-testid="conversation-is-admin-test">{isAdminTest ? 'true' : 'false'}</span>
      <button onClick={onBack}>Back</button>
    </div>
  )),
  provideDownPatToken: vi.fn(),
  clearDownPatToken: vi.fn(),
}));

// Mock ControlledAdminApp from admin-ui
vi.mock('@downpat/admin-ui', () => ({
  ControlledAdminApp: vi.fn(({ config, path }: { config: unknown; path: string }) => (
    <div data-testid="admin-app">
      <span data-testid="admin-path">{path}</span>
    </div>
  )),
}));

import { usePublishedExercises } from '../hooks/index.js';
import {
  createDownpatRouteObjects,
  DownpatRoutes,
  type DownpatRoutesConfig,
} from './createDownpatRoutes.js';

// Simple auth wrapper for testing
const TestAuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="auth-wrapper">{children}</div>
);

const TestAdminAuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="admin-auth-wrapper">{children}</div>
);

const defaultConfig: DownpatRoutesConfig = {
  authWrapper: TestAuthWrapper,
  adminAuthWrapper: TestAdminAuthWrapper,
  basePath: '/downpat',
  apiBaseUrl: '/api/downpat',
  getAuthToken: async () => 'test-token',
  availableModels: ['gpt-4', 'gpt-4o'],
};

// Helper to render routes at a specific path
function renderAtPath(path: string, config: DownpatRoutesConfig = defaultConfig) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/downpat/*" element={<DownpatRoutes {...config} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('createDownpatRouteObjects', () => {
  it('should return array of route objects', () => {
    const routes = createDownpatRouteObjects(defaultConfig);

    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBe(4);
  });

  it('should create exercises route', () => {
    const routes = createDownpatRouteObjects(defaultConfig);
    const exercisesRoute = routes.find(r => r.path === 'exercises');

    expect(exercisesRoute).toBeDefined();
    expect(exercisesRoute?.element).toBeDefined();
  });

  it('should create exercises/:slug route', () => {
    const routes = createDownpatRouteObjects(defaultConfig);
    const conversationRoute = routes.find(r => r.path === 'exercises/:slug');

    expect(conversationRoute).toBeDefined();
  });

  it('should create admin/test/:slug route', () => {
    const routes = createDownpatRouteObjects(defaultConfig);
    const testRoute = routes.find(r => r.path === 'admin/test/:slug');

    expect(testRoute).toBeDefined();
  });

  it('should create admin/* route', () => {
    const routes = createDownpatRouteObjects(defaultConfig);
    const adminRoute = routes.find(r => r.path === 'admin/*');

    expect(adminRoute).toBeDefined();
  });

  it('should use default values when not provided', () => {
    const minimalConfig: DownpatRoutesConfig = {
      authWrapper: TestAuthWrapper,
      getAuthToken: async () => 'token',
    };

    const routes = createDownpatRouteObjects(minimalConfig);
    expect(routes.length).toBe(4);
  });

  it('should fall back to authWrapper when adminAuthWrapper not provided', () => {
    const configWithoutAdminAuth: DownpatRoutesConfig = {
      authWrapper: TestAuthWrapper,
      getAuthToken: async () => 'token',
    };

    // This should not throw
    const routes = createDownpatRouteObjects(configWithoutAdminAuth);
    expect(routes.length).toBe(4);
  });
});

describe('ExerciseBrowserPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render exercises list', () => {
    const mockExercises = [
      { exerciseId: 'ex-1', exerciseName: 'Exercise 1', slug: 'exercise-1' },
      { exerciseId: 'ex-2', exerciseName: 'Exercise 2', slug: 'exercise-2' },
    ];

    vi.mocked(usePublishedExercises).mockReturnValue({
      exercises: mockExercises,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderAtPath('/downpat/exercises');

    expect(screen.getByText('Exercises')).toBeInTheDocument();
    expect(screen.getByText('Exercise 1')).toBeInTheDocument();
    expect(screen.getByText('Exercise 2')).toBeInTheDocument();
  });

  it('should render welcomeMessage as description when present', () => {
    const mockExercises = [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Exercise 1',
        slug: 'exercise-1',
        welcomeMessage: 'Welcome to this practice session!',
      },
      {
        exerciseId: 'ex-2',
        exerciseName: 'Exercise 2',
        slug: 'exercise-2',
        welcomeMessage: '',
      },
    ];

    vi.mocked(usePublishedExercises).mockReturnValue({
      exercises: mockExercises,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderAtPath('/downpat/exercises');

    expect(screen.getByText('Welcome to this practice session!')).toBeInTheDocument();
    // Empty welcomeMessage should not render
    expect(screen.queryAllByText('Exercise 2').length).toBe(1);
  });

  it('should show loading state', () => {
    vi.mocked(usePublishedExercises).mockReturnValue({
      exercises: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderAtPath('/downpat/exercises');

    expect(screen.getByText('Loading exercises...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(usePublishedExercises).mockReturnValue({
      exercises: [],
      isLoading: false,
      error: 'Failed to fetch',
      refetch: vi.fn(),
    });

    renderAtPath('/downpat/exercises');

    expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument();
  });

  it('should show empty state when no exercises', () => {
    vi.mocked(usePublishedExercises).mockReturnValue({
      exercises: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderAtPath('/downpat/exercises');

    expect(screen.getByText('No exercises available.')).toBeInTheDocument();
  });

  it('should wrap content in auth wrapper', () => {
    vi.mocked(usePublishedExercises).mockReturnValue({
      exercises: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderAtPath('/downpat/exercises');

    expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument();
  });
});

describe('ConversationPageWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ConversationPage with slug from URL params', () => {
    renderAtPath('/downpat/exercises/test-exercise');

    expect(screen.getByTestId('conversation-page')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-slug')).toHaveTextContent('test-exercise');
  });

  it('should pass correct backText for subscriber route', () => {
    renderAtPath('/downpat/exercises/my-exercise');

    expect(screen.getByTestId('conversation-back-text')).toHaveTextContent('← Back to Exercises');
    expect(screen.getByTestId('conversation-is-admin-test')).toHaveTextContent('false');
  });

  it('should wrap content in auth wrapper', () => {
    renderAtPath('/downpat/exercises/test-exercise');

    expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument();
  });
});

describe('Admin Test Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ConversationPage for admin test with isAdminTest=true', () => {
    renderAtPath('/downpat/admin/test/test-exercise');

    expect(screen.getByTestId('conversation-page')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-slug')).toHaveTextContent('test-exercise');
    expect(screen.getByTestId('conversation-is-admin-test')).toHaveTextContent('true');
  });

  it('should pass correct backText for admin test route', () => {
    renderAtPath('/downpat/admin/test/my-exercise');

    expect(screen.getByTestId('conversation-back-text')).toHaveTextContent('← Back to Admin');
  });

  it('should wrap content in admin auth wrapper', () => {
    renderAtPath('/downpat/admin/test/test-exercise');

    expect(screen.getByTestId('admin-auth-wrapper')).toBeInTheDocument();
  });
});

describe('AdminWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ControlledAdminApp', () => {
    renderAtPath('/downpat/admin/exercises');

    expect(screen.getByTestId('admin-app')).toBeInTheDocument();
  });

  it('should extract admin-relative path from URL', () => {
    renderAtPath('/downpat/admin/exercises');

    expect(screen.getByTestId('admin-path')).toHaveTextContent('/exercises');
  });

  it('should handle nested admin paths', () => {
    renderAtPath('/downpat/admin/exercises/new');

    expect(screen.getByTestId('admin-path')).toHaveTextContent('/exercises/new');
  });

  it('should default to / for admin root', () => {
    renderAtPath('/downpat/admin');

    expect(screen.getByTestId('admin-path')).toHaveTextContent('/');
  });

  it('should wrap content in admin auth wrapper', () => {
    renderAtPath('/downpat/admin/exercises');

    expect(screen.getByTestId('admin-auth-wrapper')).toBeInTheDocument();
  });
});

describe('DownpatRoutes component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePublishedExercises).mockReturnValue({
      exercises: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('should render null for unmatched routes', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/downpat/unknown-route']}>
        <Routes>
          <Route path="/downpat/*" element={<DownpatRoutes {...defaultConfig} />} />
        </Routes>
      </MemoryRouter>
    );

    // With unmatched routes, useRoutes returns null
    expect(container.querySelector('[data-testid="auth-wrapper"]')).toBeNull();
    expect(container.querySelector('[data-testid="admin-app"]')).toBeNull();
  });

  it('should work with custom basePath', () => {
    const customConfig: DownpatRoutesConfig = {
      ...defaultConfig,
      basePath: '/custom',
    };

    render(
      <MemoryRouter initialEntries={['/custom/exercises']}>
        <Routes>
          <Route path="/custom/*" element={<DownpatRoutes {...customConfig} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument();
  });
});
