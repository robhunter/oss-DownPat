import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminApp, ControlledAdminApp } from './AdminApp.js';
import type { AdminUIConfig } from './config.js';

// Mock the page components to simplify testing
vi.mock('./pages/ExerciseListPage.js', () => ({
  ExerciseListPage: () => <div data-testid="exercise-list-page">Exercise List</div>,
}));

vi.mock('./pages/ExerciseEditorPage.js', () => ({
  ExerciseEditorPage: ({ slug }: { slug?: string }) => (
    <div data-testid="exercise-editor-page">
      {slug ? `Edit: ${slug}` : 'New Exercise'}
    </div>
  ),
}));

const mockConfig: AdminUIConfig = {
  apiBaseUrl: '/api/test',
  getAuthToken: async () => 'test-token',
  availableModels: ['gpt-4'],
};

describe('AdminApp', () => {
  it('should render with default path showing exercise list', () => {
    render(<AdminApp config={mockConfig} />);

    expect(screen.getByTestId('exercise-list-page')).toBeInTheDocument();
  });
});

describe('ControlledAdminApp', () => {
  it('should render exercise list for /exercises path', () => {
    render(<ControlledAdminApp config={mockConfig} path="/exercises" />);

    expect(screen.getByTestId('exercise-list-page')).toBeInTheDocument();
  });

  it('should render exercise list for root path', () => {
    render(<ControlledAdminApp config={mockConfig} path="/" />);

    expect(screen.getByTestId('exercise-list-page')).toBeInTheDocument();
  });

  it('should render new exercise form for /exercises/new path', () => {
    render(<ControlledAdminApp config={mockConfig} path="/exercises/new" />);

    expect(screen.getByTestId('exercise-editor-page')).toBeInTheDocument();
    expect(screen.getByText('New Exercise')).toBeInTheDocument();
  });

  it('should render edit form for /exercises/:slug/edit path', () => {
    render(<ControlledAdminApp config={mockConfig} path="/exercises/my-exercise/edit" />);

    expect(screen.getByTestId('exercise-editor-page')).toBeInTheDocument();
    expect(screen.getByText('Edit: my-exercise')).toBeInTheDocument();
  });

  it('should extract slug from edit path correctly', () => {
    render(<ControlledAdminApp config={mockConfig} path="/exercises/test-slug-123/edit" />);

    expect(screen.getByText('Edit: test-slug-123')).toBeInTheDocument();
  });

  it('should default to exercise list for unknown paths', () => {
    render(<ControlledAdminApp config={mockConfig} path="/unknown/path" />);

    expect(screen.getByTestId('exercise-list-page')).toBeInTheDocument();
  });

  it('should update when path prop changes', () => {
    const { rerender } = render(<ControlledAdminApp config={mockConfig} path="/" />);

    expect(screen.getByTestId('exercise-list-page')).toBeInTheDocument();

    rerender(<ControlledAdminApp config={mockConfig} path="/exercises/new" />);

    expect(screen.getByTestId('exercise-editor-page')).toBeInTheDocument();
  });
});

describe('Route matching', () => {
  it('should prioritize /exercises/new over /exercises/:slug/edit', () => {
    // This tests that "new" is not captured as a slug
    render(<ControlledAdminApp config={mockConfig} path="/exercises/new" />);

    expect(screen.getByText('New Exercise')).toBeInTheDocument();
  });

  it('should handle paths with hyphens in slug', () => {
    render(<ControlledAdminApp config={mockConfig} path="/exercises/my-long-slug-name/edit" />);

    expect(screen.getByText('Edit: my-long-slug-name')).toBeInTheDocument();
  });

  it('should handle paths with numbers in slug', () => {
    render(<ControlledAdminApp config={mockConfig} path="/exercises/exercise-123/edit" />);

    expect(screen.getByText('Edit: exercise-123')).toBeInTheDocument();
  });
});
