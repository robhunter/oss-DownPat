import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExerciseEditorPage } from './ExerciseEditorPage.js';
import { AdminProvider } from '../AdminContext.js';
import type { AdminUIConfig } from '../config.js';
import type { Exercise } from '@downpat/core';
import { MessageType } from '@downpat/core';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockExercise: Exercise = {
  exerciseId: 'ex-1',
  exerciseName: 'Test Exercise',
  slug: 'test-exercise',
  model: 'gpt-4',
  maxUserMessages: 10,
  talkToCoachEnabled: false,
  welcomeMessage: 'Welcome to the test!',
  guidelines: 'Be helpful and concise.',
  starters: [{ text: 'Hello', context: '', attributes: {} }, { text: 'Hi there', context: '', attributes: {} }],
  continuationTasks: [{
    taskId: 'conv-1',
    name: 'Conversation',
    responseType: MessageType.CONVERSATION,
    role: 'Assistant',
    prompt: 'You are a helpful assistant.',
    responseSchema: { conversation: 'Respond naturally.' },
    enabled: true,
  }],
  completionTasks: [],
};

const createConfig = (overrides?: Partial<AdminUIConfig>): AdminUIConfig => ({
  apiBaseUrl: '/api/test',
  getAuthToken: async () => 'test-token',
  availableModels: ['gpt-4', 'gpt-3.5-turbo'],
  ...overrides,
});

const renderWithProvider = (
  props: { slug?: string } = {},
  config: AdminUIConfig = createConfig()
) => {
  return render(
    <AdminProvider config={config}>
      <ExerciseEditorPage {...props} />
    </AdminProvider>
  );
};

describe('ExerciseEditorPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('new exercise mode', () => {
    it('should render create form when no slug provided', () => {
      renderWithProvider();

      // There are two "Create New Exercise" - one in header, one in form
      // Check for the page title (h1)
      expect(screen.getByRole('heading', { level: 1, name: 'Create New Exercise' })).toBeInTheDocument();
    });

    it('should not show loading state for new exercise', () => {
      renderWithProvider();

      expect(screen.queryByText('Loading exercise...')).not.toBeInTheDocument();
    });

    it('should show back link', () => {
      renderWithProvider();

      expect(screen.getByText('← Back to Exercises')).toBeInTheDocument();
    });
  });

  describe('edit exercise mode', () => {
    it('should show loading state while fetching exercise', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProvider({ slug: 'test-exercise' });

      expect(screen.getByText('Loading exercise...')).toBeInTheDocument();
    });

    it('should display exercise data after loading', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockExercise),
      });

      renderWithProvider({ slug: 'test-exercise' });

      await waitFor(() => {
        expect(screen.getByText('Edit: Test Exercise')).toBeInTheDocument();
      });

      // Form should be populated with exercise data
      expect(screen.getByDisplayValue('Test Exercise')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Welcome to the test!')).toBeInTheDocument();
    });

    it('should fetch exercise from correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockExercise),
      });

      renderWithProvider({ slug: 'test-exercise' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/test/exercises/by-slug/test-exercise',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-token',
            }),
          })
        );
      });
    });
  });

  describe('error handling', () => {
    it('should show error when exercise fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Exercise not found' }),
      });

      renderWithProvider({ slug: 'non-existent' });

      await waitFor(() => {
        expect(screen.getByText('Exercise not found')).toBeInTheDocument();
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

      renderWithProvider({ slug: 'test-exercise' });

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Dismiss'));

      expect(screen.queryByText('Server error')).not.toBeInTheDocument();
    });

    it('should show error when create submission fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Validation failed' }),
      });

      renderWithProvider();

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      // Fill conversation task fields (required)
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond naturally.' },
      });

      // Submit the form
      fireEvent.click(screen.getByText('Create Exercise'));

      await waitFor(() => {
        expect(screen.getByText('Validation failed')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate back when back link clicked', async () => {
      const onNavigate = vi.fn();
      renderWithProvider({}, createConfig({ onNavigate }));

      fireEvent.click(screen.getByText('← Back to Exercises'));

      expect(onNavigate).toHaveBeenCalledWith('/admin/exercises');
    });

    it('should navigate back when cancel clicked', async () => {
      const onNavigate = vi.fn();
      renderWithProvider({}, createConfig({ onNavigate }));

      fireEvent.click(screen.getByText('Cancel'));

      expect(onNavigate).toHaveBeenCalledWith('/admin/exercises');
    });

    it('should navigate back after successful create', async () => {
      const onNavigate = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ ...mockExercise, exerciseId: 'new-id' }),
      });

      renderWithProvider({}, createConfig({ onNavigate }));

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      // Fill conversation task fields (required)
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond naturally.' },
      });

      fireEvent.click(screen.getByText('Create Exercise'));

      await waitFor(() => {
        expect(onNavigate).toHaveBeenCalledWith('/admin/exercises');
      });
    });

    it('should navigate back after successful update', async () => {
      const onNavigate = vi.fn();

      // First call: load exercise
      // Second call: update exercise
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockExercise),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockExercise),
        });

      renderWithProvider({ slug: 'test-exercise' }, createConfig({ onNavigate }));

      // Wait for exercise to load
      await waitFor(() => {
        expect(screen.getByText('Edit: Test Exercise')).toBeInTheDocument();
      });

      // Update a field
      fireEvent.change(screen.getByDisplayValue('Test Exercise'), {
        target: { value: 'Updated Exercise' },
      });

      // Submit the form
      fireEvent.click(screen.getByText('Update Exercise'));

      await waitFor(() => {
        expect(onNavigate).toHaveBeenCalledWith('/admin/exercises');
      });
    });
  });

  describe('form submission', () => {
    it('should call create API for new exercise', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ ...mockExercise, exerciseId: 'new-id' }),
      });

      renderWithProvider();

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My New Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome to the exercise!' },
      });
      // Fill conversation task fields (required)
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'Be helpful and concise.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond naturally.' },
      });

      fireEvent.click(screen.getByText('Create Exercise'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/test/exercises',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('My New Exercise'),
          })
        );
      });
    });

    it('should call update API for existing exercise', async () => {
      // First call: load exercise
      // Second call: update exercise
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockExercise),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockExercise),
        });

      renderWithProvider({ slug: 'test-exercise' });

      // Wait for exercise to load
      await waitFor(() => {
        expect(screen.getByText('Edit: Test Exercise')).toBeInTheDocument();
      });

      // Submit without changes
      fireEvent.click(screen.getByText('Update Exercise'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/test/exercises/ex-1',
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });
  });

  describe('available models', () => {
    it('should pass available models to ExerciseForm', () => {
      const config = createConfig({ availableModels: ['claude-3', 'gpt-4'] });
      renderWithProvider({}, config);

      const modelSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(modelSelect.options.length).toBe(2);
      expect(modelSelect.options[0].value).toBe('claude-3');
      expect(modelSelect.options[1].value).toBe('gpt-4');
    });
  });
});
