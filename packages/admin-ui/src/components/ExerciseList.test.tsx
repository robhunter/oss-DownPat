import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Exercise } from '@downpat/core';
import { ExerciseList, type ExerciseWithMetadata } from './ExerciseList.js';

const createExerciseWithMetadata = (
  overrides?: Partial<Exercise>,
  published = false
): ExerciseWithMetadata => ({
  exercise: {
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
    starters: [{ text: 'Hello', context: '', attributes: {} }],
    ...overrides,
  },
  metadata: {
    draft: 'ex-123',
    published: published ? 'ex-123-published' : undefined,
  },
});

describe('ExerciseList', () => {
  const defaultProps = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders empty state when no exercises', () => {
    render(<ExerciseList exercises={[]} {...defaultProps} />);

    expect(screen.getByText('No exercises yet')).toBeInTheDocument();
  });

  it('renders exercise list', () => {
    const exercises = [
      createExerciseWithMetadata({ exerciseId: 'ex-1', exerciseName: 'Exercise 1', slug: 'exercise-1' }),
      createExerciseWithMetadata({ exerciseId: 'ex-2', exerciseName: 'Exercise 2', slug: 'exercise-2' }),
    ];

    render(<ExerciseList exercises={exercises} {...defaultProps} />);

    expect(screen.getByText('Exercise 1')).toBeInTheDocument();
    expect(screen.getByText('Exercise 2')).toBeInTheDocument();
  });

  it('shows Draft status for unpublished exercises', () => {
    render(
      <ExerciseList
        exercises={[createExerciseWithMetadata({}, false)]}
        {...defaultProps}
      />
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows Published status for published exercises', () => {
    render(
      <ExerciseList
        exercises={[createExerciseWithMetadata({}, true)]}
        {...defaultProps}
      />
    );

    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    const exercise = createExerciseWithMetadata();

    render(
      <ExerciseList exercises={[exercise]} {...defaultProps} onEdit={onEdit} />
    );

    fireEvent.click(screen.getByText('Edit'));

    expect(onEdit).toHaveBeenCalledWith(exercise.exercise);
  });

  it('requires confirmation for delete', () => {
    const onDelete = vi.fn();
    const exercise = createExerciseWithMetadata();

    render(
      <ExerciseList exercises={[exercise]} {...defaultProps} onDelete={onDelete} />
    );

    // First click shows confirm
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();

    // Second click confirms
    fireEvent.click(screen.getByText('Confirm Delete'));
    expect(onDelete).toHaveBeenCalledWith('test-exercise');
  });

  it('cancels delete confirmation', () => {
    const onDelete = vi.fn();
    const exercise = createExerciseWithMetadata();

    render(
      <ExerciseList exercises={[exercise]} {...defaultProps} onDelete={onDelete} />
    );

    fireEvent.click(screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('displays model information', () => {
    const exercise = createExerciseWithMetadata({ model: 'claude-3-opus' });

    render(<ExerciseList exercises={[exercise]} {...defaultProps} />);

    expect(screen.getByText('claude-3-opus')).toBeInTheDocument();
  });
});
