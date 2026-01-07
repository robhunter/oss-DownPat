import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Exercise } from '@downpat/core';
import { ExerciseForm } from './ExerciseForm.js';

const DEFAULT_MODELS = ['gpt-4', 'gpt-3.5-turbo'];

const createExercise = (): Exercise => ({
  exerciseId: 'ex-123',
  exerciseName: 'Test Exercise',
  slug: 'test-exercise',
  maxUserMessages: 10,
  model: 'gpt-4',
  talkToCoachEnabled: false,
  continuationTasks: [],
  completionTasks: [],
  welcomeMessage: 'Welcome!',
  guidelines: 'Be helpful',
  starters: ['Hello'],
});

describe('ExerciseForm', () => {
  it('renders create form when no exercise provided', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

    expect(screen.getByText('Create New Exercise')).toBeInTheDocument();
    expect(screen.getByText('Create Exercise')).toBeInTheDocument();
  });

  it('renders edit form when exercise provided', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm exercise={createExercise()} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

    expect(screen.getByText('Edit Exercise')).toBeInTheDocument();
    expect(screen.getByText('Update Exercise')).toBeInTheDocument();
  });

  it('populates form with existing exercise data', () => {
    const exercise = createExercise();
    const onSubmit = vi.fn();
    render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

    expect(screen.getByDisplayValue('Test Exercise')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test-exercise')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Welcome!')).toBeInTheDocument();
  });

  it('calls onSubmit with exercise data', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

    // Fill all required fields
    fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
      target: { value: 'My Exercise' },
    });
    fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
      target: { value: 'Welcome to the exercise!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Guidelines for the AI...'), {
      target: { value: 'Be helpful and concise.' },
    });

    fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseName: 'My Exercise',
        welcomeMessage: 'Welcome to the exercise!',
        guidelines: 'Be helpful and concise.',
      })
    );
  });

  it('calls onCancel when cancel button clicked', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} onCancel={onCancel} availableModels={DEFAULT_MODELS} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables submit button when submitting', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} isSubmitting={true} availableModels={DEFAULT_MODELS} />);

    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('auto-generates slug from name for new exercises', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

    fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
      target: { value: 'My New Exercise' },
    });

    expect(screen.getByDisplayValue('my-new-exercise')).toBeInTheDocument();
  });

  it('allows adding starters', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

    fireEvent.click(screen.getByText('+ Add Starter'));

    // Should now have 2 starter inputs
    const starterInputs = screen.getAllByPlaceholderText(/Starter/);
    expect(starterInputs.length).toBe(2);
  });

  it('allows adding continuation tasks', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

    expect(screen.getByText('No tasks configured')).toBeInTheDocument();

    fireEvent.click(screen.getByText('+ Add Task'));

    expect(screen.queryByText('No tasks configured')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('New Task')).toBeInTheDocument();
  });

  it('renders available models', () => {
    const onSubmit = vi.fn();
    const models = ['custom-model-1', 'custom-model-2'];
    render(<ExerciseForm onSubmit={onSubmit} availableModels={models} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe('custom-model-1');
  });

  describe('validation', () => {
    it('should not submit when exercise name is empty', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill all fields except exercise name
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Guidelines for the AI...'), {
        target: { value: 'Be helpful.' },
      });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Exercise name is required')).toBeInTheDocument();
    });

    it('should not submit when welcome message is empty', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill all fields except welcome message
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Guidelines for the AI...'), {
        target: { value: 'Be helpful.' },
      });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Welcome message is required')).toBeInTheDocument();
    });

    it('should not submit when guidelines is empty', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill all fields except guidelines
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Guidelines are required')).toBeInTheDocument();
    });

    it('should show error on blur for empty required field', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      const nameInput = screen.getByPlaceholderText('Enter exercise name');
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);

      expect(screen.getByText('Exercise name is required')).toBeInTheDocument();
    });

    it('should show error for invalid slug format', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Manually set an invalid slug
      const slugInput = screen.getByPlaceholderText('exercise-slug');
      fireEvent.change(slugInput, { target: { value: 'Invalid Slug!' } });
      fireEvent.blur(slugInput);

      expect(screen.getByText('Slug must contain only lowercase letters, numbers, and hyphens')).toBeInTheDocument();
    });

    it('should clear error when field becomes valid', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      const nameInput = screen.getByPlaceholderText('Enter exercise name');

      // Trigger error
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);
      expect(screen.getByText('Exercise name is required')).toBeInTheDocument();

      // Fill the field and blur to clear error
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
      fireEvent.blur(nameInput);

      expect(screen.queryByText('Exercise name is required')).not.toBeInTheDocument();
    });

    it('should validate all fields on submit', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      // All validation errors should appear
      expect(screen.getByText('Exercise name is required')).toBeInTheDocument();
      expect(screen.getByText('Welcome message is required')).toBeInTheDocument();
      expect(screen.getByText('Guidelines are required')).toBeInTheDocument();
    });
  });

  describe('no models available', () => {
    it('should show configuration error when no models available', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={[]} />);

      expect(screen.getByText('Configuration Required')).toBeInTheDocument();
      expect(screen.getByText(/No AI models are available/)).toBeInTheDocument();
    });

    it('should show Go Back button when onCancel is provided', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} onCancel={onCancel} availableModels={[]} />);

      expect(screen.getByText('Go Back')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Go Back'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should not show Go Back button when onCancel is not provided', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={[]} />);

      expect(screen.queryByText('Go Back')).not.toBeInTheDocument();
    });
  });

  describe('starters', () => {
    it('should allow removing starters', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Add a starter first
      fireEvent.click(screen.getByText('+ Add Starter'));

      // Now we have 2 starters, so Remove buttons should appear
      const removeButtons = screen.getAllByText('Remove');
      expect(removeButtons.length).toBe(2);

      // Remove one
      fireEvent.click(removeButtons[0]);

      // Should be back to 1 starter
      const starterInputs = screen.getAllByPlaceholderText(/Starter/);
      expect(starterInputs.length).toBe(1);
    });

    it('should keep at least one starter', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      exercise.starters = ['Single'];
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Single starter - no remove button should appear
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });

  describe('continuation tasks', () => {
    it('should allow removing tasks', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Add a task
      fireEvent.click(screen.getByText('+ Add Task'));
      expect(screen.getByDisplayValue('New Task')).toBeInTheDocument();

      // Remove the task
      fireEvent.click(screen.getByText('Remove'));

      // Should show empty state again
      expect(screen.getByText('No tasks configured')).toBeInTheDocument();
    });

    it('should allow editing task name', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Add a task
      fireEvent.click(screen.getByText('+ Add Task'));

      // Edit the task name
      const nameInput = screen.getByDisplayValue('New Task');
      fireEvent.change(nameInput, { target: { value: 'My Custom Task' } });

      expect(screen.getByDisplayValue('My Custom Task')).toBeInTheDocument();
    });

    it('should allow toggling task enabled state', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Add a task
      fireEvent.click(screen.getByText('+ Add Task'));

      // Task is enabled by default
      const checkboxes = screen.getAllByRole('checkbox');
      const taskCheckbox = checkboxes.find((cb) => {
        const parent = cb.closest('.downpat-task-header');
        return parent !== null;
      });

      expect(taskCheckbox).toBeDefined();
      expect(taskCheckbox).toBeChecked();

      // Toggle it off
      fireEvent.click(taskCheckbox!);
      expect(taskCheckbox).not.toBeChecked();
    });
  });

  describe('form data', () => {
    it('should submit with correct maxUserMessages', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Guidelines for the AI...'), {
        target: { value: 'Be helpful.' },
      });

      // Change maxUserMessages
      const maxMessagesInput = screen.getByDisplayValue('10');
      fireEvent.change(maxMessagesInput, { target: { value: '25' } });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          maxUserMessages: 25,
        })
      );
    });

    it('should submit with selected model', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={['gpt-4', 'gpt-3.5-turbo', 'claude-3']} />);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Guidelines for the AI...'), {
        target: { value: 'Be helpful.' },
      });

      // Change model
      const modelSelect = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(modelSelect, { target: { value: 'claude-3' } });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3',
        })
      );
    });

    it('should toggle talkToCoachEnabled', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Guidelines for the AI...'), {
        target: { value: 'Be helpful.' },
      });

      // Enable talk to coach
      const checkbox = screen.getByLabelText('Enable Talk to Coach');
      fireEvent.click(checkbox);

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          talkToCoachEnabled: true,
        })
      );
    });

    it('should filter empty starters from submission', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Guidelines for the AI...'), {
        target: { value: 'Be helpful.' },
      });

      // Add starters
      fireEvent.click(screen.getByText('+ Add Starter'));
      const starterInputs = screen.getAllByPlaceholderText(/Starter/);
      fireEvent.change(starterInputs[0], { target: { value: 'First starter' } });
      // Leave second starter empty

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          starters: ['First starter'],
        })
      );
    });
  });
});
