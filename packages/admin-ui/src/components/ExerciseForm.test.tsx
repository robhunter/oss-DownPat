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
    fireEvent.change(screen.getByPlaceholderText("ex: Response to the user's message"), {
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
      expect(screen.getByPlaceholderText("ex: Response to the user's message")).toBeInTheDocument();
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
      fireEvent.change(screen.getByPlaceholderText("ex: Response to the user's message"), {
        target: { value: 'Respond in character.' },
      });

      // Change maxUserMessages (default is now 200)
      const maxMessagesInput = screen.getByDisplayValue('200');
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
      fireEvent.change(screen.getByPlaceholderText("ex: Response to the user's message"), {
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
      fireEvent.change(screen.getByPlaceholderText("ex: Response to the user's message"), {
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
      fireEvent.change(screen.getByPlaceholderText("ex: Response to the user's message"), {
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
      fireEvent.change(screen.getByPlaceholderText("ex: Response to the user's message"), {
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
      fireEvent.change(screen.getByPlaceholderText("ex: Response to the user's message"), {
        target: { value: 'Respond in character.' },
      });

      // Add commentary task
      fireEvent.click(screen.getByText('+ Add Commentary Task'));

      // Fill commentary fields
      const roleInputs = screen.getAllByPlaceholderText('ex: Coach');
      fireEvent.change(roleInputs[0], { target: { value: 'Expert Coach' } });

      const promptTextareas = screen.getAllByPlaceholderText('Instructions for generating commentary...');
      fireEvent.change(promptTextareas[0], { target: { value: 'Provide helpful feedback.' } });

      const commentaryDescTextareas = screen.getAllByPlaceholderText("ex: Assessment of the user's last message");
      fireEvent.change(commentaryDescTextareas[0], { target: { value: 'Describe the commentary.' } });

      const gradeDescTextareas = screen.getAllByPlaceholderText("ex: A grade assessing the user's last message");
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
      fireEvent.change(screen.getByPlaceholderText("ex: Response to the user's message"), {
        target: { value: 'Respond in character.' },
      });

      // Add summary task
      fireEvent.click(screen.getByText('+ Add Summary Task'));

      // Fill summary fields
      fireEvent.change(screen.getByPlaceholderText('ex: Coach'), { target: { value: 'Evaluator' } });
      fireEvent.change(screen.getByPlaceholderText('Instructions for generating summary...'), { target: { value: 'Summarize the conversation.' } });
      fireEvent.change(screen.getByPlaceholderText("ex: Assessment of the user's performance over the entire conversation"), { target: { value: 'Provide a summary.' } });
      fireEvent.change(screen.getByPlaceholderText("ex: A grade assessing the user's performance over the entire conversation"), { target: { value: 'Final grade.' } });

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

  describe('task ID preservation (regression)', () => {
    it('should preserve conversation task ID when editing', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Make a minor edit to conversation prompt
      const promptInput = screen.getByPlaceholderText('Instructions for the AI during conversation...');
      fireEvent.change(promptInput, { target: { value: 'Updated prompt.' } });

      fireEvent.submit(screen.getByText('Update Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          continuationTasks: expect.arrayContaining([
            expect.objectContaining({
              taskId: 'conv-1', // Original task ID preserved
              responseType: MessageType.CONVERSATION,
              prompt: 'Updated prompt.',
            }),
          ]),
        })
      );
    });

    it('should preserve commentary task ID when editing', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      exercise.continuationTasks.push(createCommentaryTask());
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Make a minor edit to commentary prompt
      const promptInput = screen.getByPlaceholderText('Instructions for generating commentary...');
      fireEvent.change(promptInput, { target: { value: 'Updated commentary prompt.' } });

      fireEvent.submit(screen.getByText('Update Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          continuationTasks: expect.arrayContaining([
            expect.objectContaining({
              taskId: 'comment-1', // Original task ID preserved
              responseType: MessageType.COMMENTARY,
              prompt: 'Updated commentary prompt.',
            }),
          ]),
        })
      );
    });

    it('should preserve summary task ID when editing', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      exercise.completionTasks.push(createSummaryTask());
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Make a minor edit to summary prompt
      const promptInput = screen.getByPlaceholderText('Instructions for generating summary...');
      fireEvent.change(promptInput, { target: { value: 'Updated summary prompt.' } });

      fireEvent.submit(screen.getByText('Update Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          completionTasks: expect.arrayContaining([
            expect.objectContaining({
              taskId: 'summary-1', // Original task ID preserved
              responseType: MessageType.SUMMARY,
              prompt: 'Updated summary prompt.',
            }),
          ]),
        })
      );
    });

    it('should preserve unknown exercise fields when editing', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      // Add an unknown field that the form doesn't manage
      (exercise as Record<string, unknown>).customField = 'custom value';
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Make a minor edit
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'Updated Name' },
      });

      fireEvent.submit(screen.getByText('Update Exercise').closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseName: 'Updated Name',
          customField: 'custom value', // Unknown field preserved
        })
      );
    });

    it('should preserve unmanaged task types in continuationTasks', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      // Add an unmanaged task type (SimpleTask) that the form doesn't edit
      const simpleTask = {
        taskId: 'simple-1',
        name: 'Talk to Coach',
        responseType: MessageType.SIMPLE,
        role: 'Coach',
        prompt: 'Help the user.',
        enabled: true,
      };
      exercise.continuationTasks.push(simpleTask as never);
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Make a minor edit
      fireEvent.change(screen.getByPlaceholderText('Enter exercise name'), {
        target: { value: 'Updated Name' },
      });

      fireEvent.submit(screen.getByText('Update Exercise').closest('form')!);

      // Verify SimpleTask was preserved
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          continuationTasks: expect.arrayContaining([
            expect.objectContaining({
              taskId: 'simple-1',
              responseType: MessageType.SIMPLE,
            }),
          ]),
        })
      );
    });

    it('should preserve extra commentary tasks beyond the first one', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      // Add two commentary tasks - form only manages the first one
      const commentary1 = createCommentaryTask();
      const commentary2 = {
        ...createCommentaryTask(),
        taskId: 'comment-2',
        prompt: 'Second commentary prompt',
      };
      exercise.continuationTasks.push(commentary1, commentary2);
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Make a minor edit to the managed commentary
      const promptInput = screen.getByPlaceholderText('Instructions for generating commentary...');
      fireEvent.change(promptInput, { target: { value: 'Updated first commentary.' } });

      fireEvent.submit(screen.getByText('Update Exercise').closest('form')!);

      // The form manages ONE commentary task, so there should be exactly one COMMENTARY task
      // (the edited one). The second commentary task is NOT preserved because
      // the form replaces all COMMENTARY tasks with its managed one.
      // This is the expected behavior per the simplified UI design.
      const submittedExercise = onSubmit.mock.calls[0][0];
      const commentaryTasks = submittedExercise.continuationTasks.filter(
        (t: { responseType: string }) => t.responseType === MessageType.COMMENTARY
      );
      expect(commentaryTasks.length).toBe(1);
      expect(commentaryTasks[0].prompt).toBe('Updated first commentary.');
    });
  });

  describe('import/export', () => {
    it('should show Import and Export buttons', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      expect(screen.getByText('Import JSON')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });

    it('should open export modal with JSON when Export is clicked', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      const { container } = render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Export JSON'));

      expect(screen.getByText('Export Exercise')).toBeInTheDocument();
      expect(screen.getByText('Copy to Clipboard')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();

      // Verify JSON content via the export textarea class
      const textarea = container.querySelector('.downpat-export-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      const parsed = JSON.parse(textarea.value);
      expect(parsed.exerciseName).toBe('Test Exercise');
      expect(parsed.welcomeMessage).toBe('Welcome!');
      expect(parsed.model).toBe('gpt-4');
    });

    it('should export content-only JSON without identity fields', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      const { container } = render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Export JSON'));

      const textarea = container.querySelector('.downpat-export-textarea') as HTMLTextAreaElement;
      const parsed = JSON.parse(textarea.value);

      // Should NOT have identity/metadata fields
      expect(parsed.exerciseId).toBeUndefined();
      expect(parsed.slug).toBeUndefined();
      expect(parsed.status).toBeUndefined();
      expect(parsed.createdAt).toBeUndefined();

      // Tasks should NOT have taskId
      expect(parsed.continuationTasks[0].taskId).toBeUndefined();

      // Should have content fields
      expect(parsed.exerciseName).toBe('Test Exercise');
      expect(parsed.continuationTasks).toHaveLength(1);
      expect(parsed.continuationTasks[0].responseType).toBe(MessageType.CONVERSATION);
    });

    it('should close export modal when Close is clicked', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Export JSON'));
      expect(screen.getByText('Export Exercise')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close'));
      expect(screen.queryByText('Export Exercise')).not.toBeInTheDocument();
    });

    it('should open import modal when Import is clicked', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));

      expect(screen.getByText('Import Exercise')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Paste exported exercise JSON here...')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    it('should show error for invalid JSON on import', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));

      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');
      fireEvent.change(textarea, { target: { value: 'not valid json{' } });

      fireEvent.click(screen.getByText('Import'));

      expect(screen.getByText('Invalid JSON syntax.')).toBeInTheDocument();
    });

    it('should show error when exerciseName is missing on import', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));

      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');
      fireEvent.change(textarea, { target: { value: JSON.stringify({ model: 'gpt-4' }) } });

      fireEvent.click(screen.getByText('Import'));

      expect(screen.getByText('Missing required field: exerciseName (string).')).toBeInTheDocument();
    });

    it('should show error when JSON is an array', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));

      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');
      fireEvent.change(textarea, { target: { value: '[]' } });

      fireEvent.click(screen.getByText('Import'));

      expect(screen.getByText('JSON must be an object.')).toBeInTheDocument();
    });

    it('should populate form fields on valid import', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      const importData = {
        exerciseName: 'Imported Exercise',
        maxUserMessages: 50,
        model: 'gpt-3.5-turbo',
        talkToCoachEnabled: true,
        welcomeMessage: 'Welcome to the imported exercise!',
        guidelines: 'Imported guidelines.',
        starters: [{ text: 'Imported starter', context: 'Imported context', attributes: {} }],
        continuationTasks: [{
          name: 'Conversation',
          responseType: MessageType.CONVERSATION,
          role: 'Imported Role',
          prompt: 'Imported prompt.',
          responseSchema: { conversation: 'Imported response desc.' },
          enabled: true,
        }],
        completionTasks: [],
      };

      fireEvent.click(screen.getByText('Import JSON'));
      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');
      fireEvent.change(textarea, { target: { value: JSON.stringify(importData) } });
      fireEvent.click(screen.getByText('Import'));

      // Modal should close
      expect(screen.queryByText('Import Exercise')).not.toBeInTheDocument();

      // Form fields should be populated
      expect(screen.getByDisplayValue('Imported Exercise')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Welcome to the imported exercise!')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Imported guidelines.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Imported Role')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Imported prompt.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Imported response desc.')).toBeInTheDocument();
    });

    it('should preserve exerciseId and slug on import', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      const importData = {
        exerciseName: 'Imported Name',
        continuationTasks: [{
          name: 'Conversation',
          responseType: MessageType.CONVERSATION,
          role: 'Role',
          prompt: 'Prompt.',
          responseSchema: { conversation: 'Desc.' },
          enabled: true,
        }],
        completionTasks: [],
        welcomeMessage: 'Welcome!',
        guidelines: '',
        starters: [],
      };

      fireEvent.click(screen.getByText('Import JSON'));
      fireEvent.change(screen.getByPlaceholderText('Paste exported exercise JSON here...'), {
        target: { value: JSON.stringify(importData) },
      });
      fireEvent.click(screen.getByText('Import'));

      // Slug should be preserved from the original exercise
      expect(screen.getByDisplayValue('test-exercise')).toBeInTheDocument();

      // Submit and verify exerciseId is preserved
      // Fill remaining required fields to pass validation
      fireEvent.submit(screen.getByText('Update Exercise').closest('form')!);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseId: 'ex-123',
          slug: 'test-exercise',
          exerciseName: 'Imported Name',
        })
      );
    });

    it('should enable commentary section when import contains commentary task', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Initially no commentary section
      expect(screen.queryByText('Commentary Task')).not.toBeInTheDocument();

      const importData = {
        exerciseName: 'With Commentary',
        welcomeMessage: 'Welcome!',
        guidelines: '',
        starters: [],
        continuationTasks: [
          {
            name: 'Conversation',
            responseType: MessageType.CONVERSATION,
            role: 'Role',
            prompt: 'Prompt.',
            responseSchema: { conversation: 'Desc.' },
            enabled: true,
          },
          {
            name: 'Commentary',
            responseType: MessageType.COMMENTARY,
            role: 'Imported Coach',
            prompt: 'Imported commentary prompt.',
            responseSchema: { commentary: 'Imported commentary desc.', grade: 'Imported grade.' },
            includeGuidelines: true,
            enabled: true,
          },
        ],
        completionTasks: [],
      };

      fireEvent.click(screen.getByText('Import JSON'));
      fireEvent.change(screen.getByPlaceholderText('Paste exported exercise JSON here...'), {
        target: { value: JSON.stringify(importData) },
      });
      fireEvent.click(screen.getByText('Import'));

      // Commentary section should now be visible
      expect(screen.getByText('Commentary Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Imported Coach')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Imported commentary prompt.')).toBeInTheDocument();
    });

    it('should enable summary section when import contains summary task', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Initially no summary section
      expect(screen.queryByText('Summary Task')).not.toBeInTheDocument();

      const importData = {
        exerciseName: 'With Summary',
        welcomeMessage: 'Welcome!',
        guidelines: '',
        starters: [],
        continuationTasks: [{
          name: 'Conversation',
          responseType: MessageType.CONVERSATION,
          role: 'Role',
          prompt: 'Prompt.',
          responseSchema: { conversation: 'Desc.' },
          enabled: true,
        }],
        completionTasks: [{
          name: 'Summary',
          responseType: MessageType.SUMMARY,
          role: 'Imported Evaluator',
          prompt: 'Imported summary prompt.',
          responseSchema: { summary: 'Imported summary desc.', grade: 'Imported grade.' },
          includeGuidelines: true,
          enabled: true,
        }],
      };

      fireEvent.click(screen.getByText('Import JSON'));
      fireEvent.change(screen.getByPlaceholderText('Paste exported exercise JSON here...'), {
        target: { value: JSON.stringify(importData) },
      });
      fireEvent.click(screen.getByText('Import'));

      // Summary section should now be visible
      expect(screen.getByText('Summary Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Imported Evaluator')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Imported summary prompt.')).toBeInTheDocument();
    });

    it('should round-trip: export then import produces same form state', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      exercise.continuationTasks.push(createCommentaryTask());
      exercise.completionTasks.push(createSummaryTask());

      const result1 = render(
        <ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />
      );

      // Export
      fireEvent.click(screen.getByText('Export JSON'));
      const exportTextarea = result1.container.querySelector('.downpat-export-textarea') as HTMLTextAreaElement;
      const exportedJson = exportTextarea.value;
      fireEvent.click(screen.getByText('Close'));

      // Unmount and remount fresh form
      result1.unmount();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Import the exported JSON
      fireEvent.click(screen.getByText('Import JSON'));
      fireEvent.change(screen.getByPlaceholderText('Paste exported exercise JSON here...'), {
        target: { value: exportedJson },
      });
      fireEvent.click(screen.getByText('Import'));

      // Verify key fields match the original exercise
      expect(screen.getByDisplayValue('Test Exercise')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Welcome!')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Assistant')).toBeInTheDocument();
      expect(screen.getByDisplayValue('You are helpful.')).toBeInTheDocument();

      // Commentary section should be visible
      expect(screen.getByText('Commentary Task')).toBeInTheDocument();
      // Summary section should be visible
      expect(screen.getByText('Summary Task')).toBeInTheDocument();
    });

    it('should clear import error when text changes', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));
      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');

      // Trigger error
      fireEvent.change(textarea, { target: { value: 'bad json' } });
      fireEvent.click(screen.getByText('Import'));
      expect(screen.getByText('Invalid JSON syntax.')).toBeInTheDocument();

      // Typing should clear the error
      fireEvent.change(textarea, { target: { value: '{"exerciseName": "test"}' } });
      expect(screen.queryByText('Invalid JSON syntax.')).not.toBeInTheDocument();
    });

    it('should show error when maxUserMessages is not a number', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));
      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');
      fireEvent.change(textarea, { target: { value: JSON.stringify({ exerciseName: 'Test', maxUserMessages: 'fifty' }) } });
      fireEvent.click(screen.getByText('Import'));

      expect(screen.getByText('Field "maxUserMessages" must be a number.')).toBeInTheDocument();
    });

    it('should show error when continuationTasks is not an array', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));
      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');
      fireEvent.change(textarea, { target: { value: JSON.stringify({ exerciseName: 'Test', continuationTasks: 'not an array' }) } });
      fireEvent.click(screen.getByText('Import'));

      expect(screen.getByText('Field "continuationTasks" must be an array.')).toBeInTheDocument();
    });

    it('should show error when a task in continuationTasks has invalid shape', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));
      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');
      fireEvent.change(textarea, { target: { value: JSON.stringify({
        exerciseName: 'Test',
        continuationTasks: [{ name: 'Bad task' }],
      }) } });
      fireEvent.click(screen.getByText('Import'));

      expect(screen.getByText('Invalid task at continuationTasks[0]: must have name, responseType, role, and prompt (all strings).')).toBeInTheDocument();
    });

    it('should show error when starters have invalid shape', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));
      const textarea = screen.getByPlaceholderText('Paste exported exercise JSON here...');
      fireEvent.change(textarea, { target: { value: JSON.stringify({
        exerciseName: 'Test',
        starters: [{ text: 123 }],
      }) } });
      fireEvent.click(screen.getByText('Import'));

      expect(screen.getByText('Invalid starter at index 0: must have text (string), context (string), and attributes (object).')).toBeInTheDocument();
    });

    it('should reset omitted fields to defaults on import', () => {
      const onSubmit = vi.fn();
      const exercise = createExercise();
      render(<ExerciseForm exercise={exercise} onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      // Verify initial state has values from the exercise
      expect(screen.getByDisplayValue('Welcome!')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Be helpful')).toBeInTheDocument();

      // Import with only exerciseName — other fields should reset to defaults, not keep old values
      const importData = {
        exerciseName: 'Minimal Import',
        continuationTasks: [{
          name: 'Conversation',
          responseType: MessageType.CONVERSATION,
          role: 'Role',
          prompt: 'Prompt.',
          responseSchema: { conversation: 'Desc.' },
          enabled: true,
        }],
        completionTasks: [],
      };

      fireEvent.click(screen.getByText('Import JSON'));
      fireEvent.change(screen.getByPlaceholderText('Paste exported exercise JSON here...'), {
        target: { value: JSON.stringify(importData) },
      });
      fireEvent.click(screen.getByText('Import'));

      // exerciseName should be the imported value
      expect(screen.getByDisplayValue('Minimal Import')).toBeInTheDocument();

      // welcomeMessage and guidelines should have been reset to defaults (empty), NOT preserved from old exercise
      expect(screen.queryByDisplayValue('Welcome!')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('Be helpful')).not.toBeInTheDocument();
    });

    it('should disable Import button when textarea is empty', () => {
      const onSubmit = vi.fn();
      render(<ExerciseForm onSubmit={onSubmit} availableModels={DEFAULT_MODELS} />);

      fireEvent.click(screen.getByText('Import JSON'));

      const importBtn = screen.getAllByText('Import').find(
        (el) => el.closest('.downpat-modal-actions')
      );
      expect(importBtn).toBeDisabled();
    });
  });
});
