import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Exercise, ConversationTask, CommentaryTask, SummaryTask } from '@downpat/core';
import { MessageType } from '@downpat/core';
import { ExerciseForm } from './ExerciseForm.js';

const DEFAULT_MODELS = ['gpt-4', 'gpt-3.5-turbo'];

const createConversationTask = (): ConversationTask => ({
  taskId: 'conv-1',
  name: 'Conversation',
  responseType: MessageType.CONVERSATION,
  role: 'Assistant',
  prompt: 'You are helpful.',
  responseSchema: { conversation: 'Respond naturally.' },
  enabled: true,
});

const createCommentaryTask = (): CommentaryTask => ({
  taskId: 'comment-1',
  name: 'Commentary',
  responseType: MessageType.COMMENTARY,
  role: 'Coach',
  prompt: 'Provide feedback.',
  responseSchema: { commentary: 'Give feedback.', grade: 'Rate 1-5.' },
  includeGuidelines: true,
  enabled: true,
});

const createSummaryTask = (): SummaryTask => ({
  taskId: 'summary-1',
  name: 'Summary',
  responseType: MessageType.SUMMARY,
  role: 'Coach',
  prompt: 'Summarize the conversation.',
  responseSchema: { summary: 'Summarize.', grade: 'Final grade.' },
  includeGuidelines: true,
  enabled: true,
});

const createExercise = (): Exercise => ({
  exerciseId: 'ex-123',
  exerciseName: 'Test Exercise',
  slug: 'test-exercise',
  maxUserMessages: 10,
  model: 'gpt-4',
  talkToCoachEnabled: false,
  continuationTasks: [createConversationTask()],
  completionTasks: [],
  welcomeMessage: 'Welcome!',
  guidelines: 'Be helpful',
  starters: [{ text: 'Hello', context: '', attributes: {} }],
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
    fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
      target: { value: 'Be helpful and concise.' },
    });

    // Fill conversation task fields (required)
    fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
      target: { value: 'Customer' },
    });
    fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
      target: { value: 'You are a customer.' },
    });
    fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
      target: { value: 'Respond in character.' },
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

    // Should now have 2 starter text areas (using the new StarterEditor placeholder)
    const starterInputs = screen.getAllByPlaceholderText('Opening message shown to the user...');
    expect(starterInputs.length).toBe(2);
  });

  it('renders available models', () => {
    const onSubmit = vi.fn();
    const models = ['custom-model-1', 'custom-model-2'];
    render(<ExerciseForm onSubmit={onSubmit} availableModels={models} />);

    // Find the model select by label
    const modelSelect = screen.getByRole('combobox');
    expect(modelSelect).toBeInTheDocument();
    expect((modelSelect as HTMLSelectElement).options.length).toBe(2);
    expect((modelSelect as HTMLSelectElement).options[0].value).toBe('custom-model-1');
  });

  describe('validation', () => {
    it('should not submit when exercise name is empty', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill all fields except exercise name
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
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
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Welcome message is required')).toBeInTheDocument();
    });

    it('should not submit when conversation prompt is empty', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill basic fields but leave conversation prompt empty
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Conversation prompt is required')).toBeInTheDocument();
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
      expect(screen.getByText('Conversation role is required')).toBeInTheDocument();
    });

    it('should validate conversation task fields on submit', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill basic required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
      // Should show conversation task validation errors
      expect(screen.getByText('Conversation role is required')).toBeInTheDocument();
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
      const starterInputs = screen.getAllByPlaceholderText('Opening message shown to the user...');
      expect(starterInputs.length).toBe(1);
    });

    it('should keep at least one starter', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      exercise.starters = [{ text: 'Single', context: '', attributes: {} }];
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Single starter - no remove button should appear
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });

  describe('conversation task section', () => {
    it('should display conversation task section', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      expect(screen.getByText('Conversation Task')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Who is the user talking to?')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Instructions for the AI during conversation...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...')).toBeInTheDocument();
    });

    it('should populate conversation task fields from existing exercise', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      expect(screen.getByDisplayValue('Assistant')).toBeInTheDocument();
      expect(screen.getByDisplayValue('You are helpful.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Respond naturally.')).toBeInTheDocument();
    });
  });

  describe('commentary task section', () => {
    it('should show Add Commentary Task button by default', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      expect(screen.getByText('+ Add Commentary Task')).toBeInTheDocument();
    });

    it('should show commentary section when Add Commentary Task is clicked', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('+ Add Commentary Task'));

      expect(screen.getByText('Commentary Task')).toBeInTheDocument();
      expect(screen.getByText('Remove Commentary')).toBeInTheDocument();
    });

    it('should hide commentary section when Remove Commentary is clicked', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Add commentary section
      fireEvent.click(screen.getByText('+ Add Commentary Task'));
      expect(screen.getByText('Commentary Task')).toBeInTheDocument();

      // Remove commentary section
      fireEvent.click(screen.getByText('Remove Commentary'));
      expect(screen.queryByText('Commentary Task')).not.toBeInTheDocument();
      expect(screen.getByText('+ Add Commentary Task')).toBeInTheDocument();
    });

    it('should show commentary section when exercise has commentary task', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      exercise.continuationTasks.push(createCommentaryTask());
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      expect(screen.getByText('Commentary Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Coach')).toBeInTheDocument();
    });
  });

  describe('summary task section', () => {
    it('should show Add Summary Task button by default', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      expect(screen.getByText('+ Add Summary Task')).toBeInTheDocument();
    });

    it('should show summary section when Add Summary Task is clicked', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('+ Add Summary Task'));

      expect(screen.getByText('Summary Task')).toBeInTheDocument();
      expect(screen.getByText('Remove Summary')).toBeInTheDocument();
    });

    it('should hide summary section when Remove Summary is clicked', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Add summary section
      fireEvent.click(screen.getByText('+ Add Summary Task'));
      expect(screen.getByText('Summary Task')).toBeInTheDocument();

      // Remove summary section
      fireEvent.click(screen.getByText('Remove Summary'));
      expect(screen.queryByText('Summary Task')).not.toBeInTheDocument();
      expect(screen.getByText('+ Add Summary Task')).toBeInTheDocument();
    });

    it('should show summary section when exercise has summary task', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      exercise.completionTasks.push(createSummaryTask());
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      expect(screen.getByText('Summary Task')).toBeInTheDocument();
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
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'You are a customer.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond in character.' },
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
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'You are a customer.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond in character.' },
      });

      // Change model
      const modelSelect = screen.getByRole('combobox');
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
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'You are a customer.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond in character.' },
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
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'You are a customer.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond in character.' },
      });

      // Add starters - the new StarterEditor uses textarea with different placeholder
      fireEvent.click(screen.getByText('+ Add Starter'));
      const starterInputs = screen.getAllByPlaceholderText('Opening message shown to the user...');
      fireEvent.change(starterInputs[0], { target: { value: 'First starter' } });
      // Leave second starter empty

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          starters: [{ text: 'First starter', context: '', attributes: {} }],
        })
      );
    });

    it('should include conversation task in continuationTasks', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill all required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'You are a customer.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond in character.' },
      });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          continuationTasks: expect.arrayContaining([
            expect.objectContaining({
              responseType: MessageType.CONVERSATION,
              role: 'Customer',
              prompt: 'You are a customer.',
              responseSchema: { conversation: 'Respond in character.' },
            }),
          ]),
        })
      );
    });

    it('should include commentary task when enabled', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'You are a customer.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond in character.' },
      });

      // Add commentary task
      fireEvent.click(screen.getByText('+ Add Commentary Task'));

      // Fill commentary fields
      const roleInputs = screen.getAllByPlaceholderText('Who is providing commentary? Ex: Coach');
      fireEvent.change(roleInputs[0], { target: { value: 'Expert Coach' } });

      const promptTextareas = screen.getAllByPlaceholderText('Instructions for generating commentary...');
      fireEvent.change(promptTextareas[0], { target: { value: 'Provide helpful feedback.' } });

      const commentaryDescTextareas = screen.getAllByPlaceholderText('Description of expected commentary response...');
      fireEvent.change(commentaryDescTextareas[0], { target: { value: 'Describe the commentary.' } });

      const gradeDescTextareas = screen.getAllByPlaceholderText('Description of how to grade performance...');
      fireEvent.change(gradeDescTextareas[0], { target: { value: 'Rate 1-5.' } });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          continuationTasks: expect.arrayContaining([
            expect.objectContaining({
              responseType: MessageType.COMMENTARY,
              role: 'Expert Coach',
              prompt: 'Provide helpful feedback.',
              responseSchema: { commentary: 'Describe the commentary.', grade: 'Rate 1-5.' },
              includeGuidelines: true,
            }),
          ]),
        })
      );
    });

    it('should include summary task in completionTasks when enabled', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'My Exercise' },
      });
      fireEvent.change(screen.getByPlaceholderText('Message shown when conversation starts...'), {
        target: { value: 'Welcome!' },
      });
      fireEvent.change(screen.getByPlaceholderText('Shared guidelines for coaching tasks...'), {
        target: { value: 'Be helpful.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Who is the user talking to?'), {
        target: { value: 'Customer' },
      });
      fireEvent.change(screen.getByPlaceholderText('Instructions for the AI during conversation...'), {
        target: { value: 'You are a customer.' },
      });
      fireEvent.change(screen.getByPlaceholderText('Description of expected conversation response for AI tool call...'), {
        target: { value: 'Respond in character.' },
      });

      // Add summary task
      fireEvent.click(screen.getByText('+ Add Summary Task'));

      // Fill summary fields
      fireEvent.change(screen.getByPlaceholderText('Who is providing the summary? Ex: Coach'), { target: { value: 'Evaluator' } });
      fireEvent.change(screen.getByPlaceholderText('Instructions for generating summary...'), { target: { value: 'Summarize the conversation.' } });
      fireEvent.change(screen.getByPlaceholderText('Description of expected summary response...'), { target: { value: 'Provide a summary.' } });
      fireEvent.change(screen.getByPlaceholderText('Description of how to grade overall performance...'), { target: { value: 'Final grade.' } });

      fireEvent.submit(screen.getByText('Create Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          completionTasks: expect.arrayContaining([
            expect.objectContaining({
              responseType: MessageType.SUMMARY,
              role: 'Evaluator',
              prompt: 'Summarize the conversation.',
              responseSchema: { summary: 'Provide a summary.', grade: 'Final grade.' },
              includeGuidelines: true,
            }),
          ]),
        })
      );
    });
  });
});
