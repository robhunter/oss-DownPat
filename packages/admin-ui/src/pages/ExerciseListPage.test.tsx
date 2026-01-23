import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ExerciseListPage } from './ExerciseListPage.js';
import { AdminProvider } from '../AdminContext.js';
import type { AdminUIConfig } from '../config.js';
import type { ExerciseWithMetadata } from '../api-client.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockExercises: ExerciseWithMetadata[] = [
  {
    exercise: {
      exerciseId: 'ex-1',
      exerciseName: 'Test Exercise 1',
      slug: 'test-exercise-1',
      model: 'gpt-4',
      maxUserMessages: 10,
      talkToCoachEnabled: false,
      welcomeMessage: 'Welcome',
      guidelines: 'Guidelines',
      starters: [] as { text: string; context: string; attributes: Record<string, string> }[],
      continuationTasks: [],
      completionTasks: [],
    },
    metadata: {
      slug: 'test-exercise-1',
      draftId: 'ex-1',
      publishedId: null,
      lastModified: new Date().toISOString(),
    },
  },
  {
    exercise: {
      exerciseId: 'ex-2',
      exerciseName: 'Test Exercise 2',
      slug: 'test-exercise-2',
      model: 'gpt-4',
      maxUserMessages: 10,
      talkToCoachEnabled: true,
      welcomeMessage: 'Hi',
      guidelines: 'Be helpful',
      starters: [{ text: 'Hello', context: '', attributes: {} }],
      continuationTasks: [],
      completionTasks: [],
    },
    metadata: {
      slug: 'test-exercise-2',
      draftId: 'ex-2',
      publishedId: 'pub-2',
      lastModified: new Date().toISOString(),
    },
  },
];

const createConfig = (overrides?: Partial<AdminUIConfig>): AdminUIConfig => ({
  apiBaseUrl: '/api/test',
  getAuthToken: async () => 'test-token',
  availableModels: ['gpt-4'],
  ...overrides,
});

const renderWithProvider = (config: AdminUIConfig = createConfig()) => {
  return render(
    <AdminProvider config={config}>
      <ExerciseListPage />
    </AdminProvider>
  );
};

describe('ExerciseListPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockExercises),
    });
  });

  describe('loading state', () => {
    it('should show loading state initially', () => {
      renderWithProvider();
      expect(screen.getByText('Loading exercises...')).toBeInTheDocument();
    });

    it('should hide loading state after data loads', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.queryByText('Loading exercises...')).not.toBeInTheDocument();
      });
    });
  });

  describe('exercise list', () => {
    it('should display exercises after loading', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Test Exercise 1')).toBeInTheDocument();
        expect(screen.getByText('Test Exercise 2')).toBeInTheDocument();
      });
    });

    it('should show page title', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Exercises')).toBeInTheDocument();
      });
    });

    it('should show create exercise button', async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Create Exercise')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error message when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('should allow dismissing error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Dismiss'));

      expect(screen.queryByText('Server error')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should navigate to new exercise page when create button clicked', async () => {
      const onNavigate = vi.fn();
      renderWithProvider(createConfig({ onNavigate }));

      await waitFor(() => {
        expect(screen.getByText('Create Exercise')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Exercise'));

      expect(onNavigate).toHaveBeenCalledWith('/admin/exercises/new');
    });
  });

  describe('actions', () => {
    it('should call delete API when delete confirmed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockExercises),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByText('Test Exercise 1')).toBeInTheDocument();
      });

      // Find the table row containing "Test Exercise 1" and click its Delete button
      const exerciseRow = screen.getByText('Test Exercise 1').closest('tr');
      const deleteButton = within(exerciseRow as HTMLElement).getByText('Delete');
      fireEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/test/exercises/test-exercise-1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('test button', () => {
    it('should not show test button when onTestExercise is not provided', async () => {
      renderWithProvider(createConfig({ onTestExercise: undefined }));

      await waitFor(() => {
        expect(screen.getByText('Test Exercise 1')).toBeInTheDocument();
      });

      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should show test button when onTestExercise is provided', async () => {
      const onTestExercise = vi.fn();
      renderWithProvider(createConfig({ onTestExercise }));

      await waitFor(() => {
        expect(screen.getByText('Test Exercise 1')).toBeInTheDocument();
      });

      const testButtons = screen.getAllByText('Test');
      expect(testButtons.length).toBeGreaterThan(0);
    });

    it('should call onTestExercise when test button clicked', async () => {
      const onTestExercise = vi.fn();
      renderWithProvider(createConfig({ onTestExercise }));

      await waitFor(() => {
        expect(screen.getByText('Test Exercise 1')).toBeInTheDocument();
      });

      // Find the table row containing "Test Exercise 1" and click its Test button
      const exerciseRow = screen.getByText('Test Exercise 1').closest('tr');
      const testButton = within(exerciseRow as HTMLElement).getByText('Test');
      fireEvent.click(testButton);

      expect(onTestExercise).toHaveBeenCalledWith('ex-1', 'test-exercise-1');
    });
  });
});
