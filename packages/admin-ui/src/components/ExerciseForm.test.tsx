import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageType } from '@downpat/core';
import type { Exercise } from '@downpat/core';
import { ExerciseForm } from './ExerciseForm.js';

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
    render(<ExerciseForm onSubmit={onSubmit} />);

    expect(screen.getByText('Create New Exercise')).toBeInTheDocument();
    expect(screen.getByText('Create Exercise')).toBeInTheDocument();
  });

  it('renders edit form when exercise provided', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm exercise={createExercise()} onSubmit={onSubmit} />);

    expect(screen.getByText('Edit Exercise')).toBeInTheDocument();
    expect(screen.getByText('Update Exercise')).toBeInTheDocument();
  });

  it('populates form with existing exercise data', () => {
    const exercise = createExercise();
    const onSubmit = vi.fn();
    render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} />);

    expect(screen.getByDisplayValue('Test Exercise')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test-exercise')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Welcome!')).toBeInTheDocument();
  });

  it('calls onSubmit with exercise data', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
      target: { value: 'My Exercise' },
    });

    fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseName: 'My Exercise',
      })
    );
  });

  it('calls onCancel when cancel button clicked', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables submit button when submitting', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} isSubmitting={true} />);

    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('auto-generates slug from name for new exercises', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
      target: { value: 'My New Exercise' },
    });

    expect(screen.getByDisplayValue('my-new-exercise')).toBeInTheDocument();
  });

  it('allows adding starters', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('+ Add Starter'));

    // Should now have 2 starter inputs
    const starterInputs = screen.getAllByPlaceholderText(/Starter/);
    expect(starterInputs.length).toBe(2);
  });

  it('allows adding continuation tasks', () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm onSubmit={onSubmit} />);

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
});
