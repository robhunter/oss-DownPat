import React, { useState, useCallback } from 'react';
import type {
  Exercise,
  Starter,
  ConversationTask,
  CommentaryTask,
  SummaryTask,
} from '@downpat/core';
import { MessageType } from '@downpat/core';
import {
  generateId,
  generateSlug,
  createConversationTask,
  createCommentaryTask,
  createSummaryTask,
} from '@downpat/core';

/** Create an empty starter with default values */
function createEmptyStarter(): Starter {
  return { text: '', context: '', attributes: {} };
}

/** Omit specified keys from an object */
function omitKeys<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key as keyof T];
  }
  return result;
}

export interface ExerciseFormProps {
  /** Initial exercise data for editing (undefined for new exercise) */
  exercise?: Exercise;
  /** Callback when form is submitted */
  onSubmit: (exercise: Exercise) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
  /**
   * Available AI models to choose from.
   * Use registry.getAllModels() from @downpat/ai-adapters to get models from configured adapters.
   */
  availableModels: string[];
}

/** State for Conversation task fields */
interface ConversationFields {
  role: string;
  prompt: string;
  responseDescription: string;
}

/** State for Commentary task fields */
interface CommentaryFields {
  role: string;
  prompt: string;
  commentaryDescription: string;
  gradeDescription: string;
}

/** State for Summary task fields */
interface SummaryFields {
  role: string;
  prompt: string;
  summaryDescription: string;
  gradeDescription: string;
}

/** Extract conversation task fields and ID from existing tasks */
function extractConversationTask(tasks: ConversationTask[]): { taskId: string | null; fields: ConversationFields } {
  const task = tasks.find((t) => t.responseType === MessageType.CONVERSATION);
  return {
    taskId: task?.taskId || null,
    fields: {
      role: task?.role || '',
      prompt: task?.prompt || '',
      responseDescription: task?.responseSchema?.conversation || '',
    },
  };
}

/** Extract commentary task fields and ID from existing tasks */
function extractCommentaryTask(tasks: CommentaryTask[]): { taskId: string | null; fields: CommentaryFields } | null {
  const task = tasks.find((t) => t.responseType === MessageType.COMMENTARY) as CommentaryTask | undefined;
  if (!task) return null;
  return {
    taskId: task.taskId,
    fields: {
      role: task.role,
      prompt: task.prompt,
      commentaryDescription: task.responseSchema?.commentary || '',
      gradeDescription: task.responseSchema?.grade || '',
    },
  };
}

/** Extract summary task fields and ID from existing tasks */
function extractSummaryTask(tasks: SummaryTask[]): { taskId: string | null; fields: SummaryFields } | null {
  const task = tasks.find((t) => t.responseType === MessageType.SUMMARY) as SummaryTask | undefined;
  if (!task) return null;
  return {
    taskId: task.taskId,
    fields: {
      role: task.role,
      prompt: task.prompt,
      summaryDescription: task.responseSchema?.summary || '',
      gradeDescription: task.responseSchema?.grade || '',
    },
  };
}

/**
 * Form for creating and editing exercises.
 *
 * Requires CSS: import '@downpat/admin-ui/styles';
 */
export function ExerciseForm({
  exercise,
  onSubmit,
  onCancel,
  isSubmitting = false,
  availableModels,
}: ExerciseFormProps): React.JSX.Element {
  const hasModels = availableModels.length > 0;

  // Basic exercise fields
  const [formData, setFormData] = useState(() => ({
    exerciseId: exercise?.exerciseId || generateId(),
    exerciseName: exercise?.exerciseName || '',
    slug: exercise?.slug || '',
    maxUserMessages: exercise?.maxUserMessages || 10,
    model: exercise?.model || (hasModels ? availableModels[0] : ''),
    talkToCoachEnabled: exercise?.talkToCoachEnabled || false,
    welcomeMessage: exercise?.welcomeMessage || '',
    guidelines: exercise?.guidelines || '',
    starters: exercise?.starters || [createEmptyStarter()],
  }));

  // Conversation task fields and ID (always visible, required)
  const existingConversation = extractConversationTask((exercise?.continuationTasks || []) as ConversationTask[]);
  const [conversationTaskId] = useState<string | null>(existingConversation.taskId);
  const [conversationFields, setConversationFields] = useState<ConversationFields>(existingConversation.fields);

  // Commentary task fields and ID (optional, hidden by default)
  const existingCommentary = extractCommentaryTask((exercise?.continuationTasks || []) as CommentaryTask[]);
  const [commentaryTaskId] = useState<string | null>(existingCommentary?.taskId || null);
  const [showCommentary, setShowCommentary] = useState(existingCommentary !== null);
  const [commentaryFields, setCommentaryFields] = useState<CommentaryFields>(
    existingCommentary?.fields || { role: '', prompt: '', commentaryDescription: '', gradeDescription: '' }
  );

  // Summary task fields and ID (optional, hidden by default)
  const existingSummary = extractSummaryTask((exercise?.completionTasks || []) as SummaryTask[]);
  const [summaryTaskId] = useState<string | null>(existingSummary?.taskId || null);
  const [showSummary, setShowSummary] = useState(existingSummary !== null);
  const [summaryFields, setSummaryFields] = useState<SummaryFields>(
    existingSummary?.fields || { role: '', prompt: '', summaryDescription: '', gradeDescription: '' }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((field: string, value: unknown): string | null => {
    switch (field) {
      case 'exerciseName':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Exercise name is required';
        }
        break;
      case 'slug':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Slug is required';
        }
        if (typeof value === 'string' && !/^[a-z0-9-]+$/.test(value)) {
          return 'Slug must contain only lowercase letters, numbers, and hyphens';
        }
        break;
      case 'welcomeMessage':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Welcome message is required';
        }
        break;
      // Conversation task validation
      case 'conversationRole':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Conversation role is required';
        }
        break;
      case 'conversationPrompt':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Conversation prompt is required';
        }
        break;
      case 'conversationResponseDescription':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Conversation response description is required';
        }
        break;
    }
    return null;
  }, []);

  const handleBlur = useCallback((field: string, value: unknown) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error || '' }));
  }, [validateField]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Basic fields
    const basicFields: [string, unknown][] = [
      ['exerciseName', formData.exerciseName],
      ['slug', formData.slug],
      ['welcomeMessage', formData.welcomeMessage],
    ];

    for (const [field, value] of basicFields) {
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    // Conversation task fields (always required)
    const conversationValidations: [string, unknown][] = [
      ['conversationRole', conversationFields.role],
      ['conversationPrompt', conversationFields.prompt],
      ['conversationResponseDescription', conversationFields.responseDescription],
    ];

    for (const [field, value] of conversationValidations) {
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    // Commentary task fields (all-or-nothing if shown)
    if (showCommentary) {
      if (!commentaryFields.role.trim()) {
        newErrors['commentaryRole'] = 'Commentary role is required';
        isValid = false;
      }
      if (!commentaryFields.prompt.trim()) {
        newErrors['commentaryPrompt'] = 'Commentary prompt is required';
        isValid = false;
      }
      if (!commentaryFields.commentaryDescription.trim()) {
        newErrors['commentaryDescription'] = 'Commentary description is required';
        isValid = false;
      }
      if (!commentaryFields.gradeDescription.trim()) {
        newErrors['commentaryGradeDescription'] = 'Commentary grade description is required';
        isValid = false;
      }
    }

    // Summary task fields (all-or-nothing if shown)
    if (showSummary) {
      if (!summaryFields.role.trim()) {
        newErrors['summaryRole'] = 'Summary role is required';
        isValid = false;
      }
      if (!summaryFields.prompt.trim()) {
        newErrors['summaryPrompt'] = 'Summary prompt is required';
        isValid = false;
      }
      if (!summaryFields.summaryDescription.trim()) {
        newErrors['summaryDescription'] = 'Summary description is required';
        isValid = false;
      }
      if (!summaryFields.gradeDescription.trim()) {
        newErrors['summaryGradeDescription'] = 'Summary grade description is required';
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched(Object.fromEntries(Object.keys(newErrors).map((f) => [f, true])));
    return isValid;
  }, [formData, conversationFields, commentaryFields, summaryFields, showCommentary, showSummary, validateField]);

  const updateField = useCallback(<K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Auto-generate slug from exercise name
  const handleNameChange = useCallback((name: string) => {
    updateField('exerciseName', name);
    if (!exercise) {
      updateField('slug', generateSlug(name));
    }
  }, [exercise, updateField]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Build continuation tasks by merging:
    // 1. Preserve any tasks we don't manage (not CONVERSATION or COMMENTARY)
    // 2. Add/update the tasks we do manage
    const unmanagedContinuationTasks = (exercise?.continuationTasks || []).filter(
      (t) => t.responseType !== MessageType.CONVERSATION && t.responseType !== MessageType.COMMENTARY
    );

    const managedConversationTask = createConversationTask(
      conversationTaskId || generateId(),
      conversationFields.role,
      conversationFields.prompt,
      conversationFields.responseDescription,
    );

    const continuationTasks = [
      ...unmanagedContinuationTasks,
      managedConversationTask,
      ...(showCommentary ? [createCommentaryTask(
        commentaryTaskId || generateId(),
        commentaryFields.role,
        commentaryFields.prompt,
        commentaryFields.commentaryDescription,
        commentaryFields.gradeDescription,
      )] : []),
    ];

    // Build completion tasks by merging:
    // 1. Preserve any tasks we don't manage (not SUMMARY)
    // 2. Add/update the tasks we do manage
    const unmanagedCompletionTasks = (exercise?.completionTasks || []).filter(
      (t) => t.responseType !== MessageType.SUMMARY
    );

    const completionTasks = [
      ...unmanagedCompletionTasks,
      ...(showSummary ? [createSummaryTask(
        summaryTaskId || generateId(),
        summaryFields.role,
        summaryFields.prompt,
        summaryFields.summaryDescription,
        summaryFields.gradeDescription,
      )] : []),
    ];

    // Spread original exercise to preserve any fields the form doesn't manage,
    // then override with the fields this form controls
    const finalExercise: Exercise = {
      ...exercise,
      exerciseId: formData.exerciseId,
      exerciseName: formData.exerciseName,
      slug: formData.slug,
      maxUserMessages: formData.maxUserMessages,
      model: formData.model,
      talkToCoachEnabled: formData.talkToCoachEnabled,
      continuationTasks,
      completionTasks,
      welcomeMessage: formData.welcomeMessage,
      guidelines: formData.guidelines,
      starters: formData.starters.filter((s) => s.text.trim()),
    };

    onSubmit(finalExercise);
  };

  const addStarter = () => {
    updateField('starters', [...formData.starters, createEmptyStarter()]);
  };

  const updateStarter = (index: number, updates: Partial<Starter>) => {
    const newStarters = [...formData.starters];
    newStarters[index] = { ...newStarters[index], ...updates };
    updateField('starters', newStarters);
  };

  const removeStarter = (index: number) => {
    const newStarters = formData.starters.filter((_, i) => i !== index);
    updateField('starters', newStarters.length > 0 ? newStarters : [createEmptyStarter()]);
  };

  const handleAddCommentary = () => {
    setShowCommentary(true);
    setCommentaryFields({ role: 'Coach', prompt: '', commentaryDescription: '', gradeDescription: '' });
  };

  const handleRemoveCommentary = () => {
    setShowCommentary(false);
    setCommentaryFields({ role: '', prompt: '', commentaryDescription: '', gradeDescription: '' });
    // Clear any commentary-related errors
    setErrors((prev) => omitKeys(prev, ['commentaryRole', 'commentaryPrompt', 'commentaryDescription', 'commentaryGradeDescription']) as Record<string, string>);
  };

  const handleAddSummary = () => {
    setShowSummary(true);
    setSummaryFields({ role: 'Coach', prompt: '', summaryDescription: '', gradeDescription: '' });
  };

  const handleRemoveSummary = () => {
    setShowSummary(false);
    setSummaryFields({ role: '', prompt: '', summaryDescription: '', gradeDescription: '' });
    // Clear any summary-related errors
    setErrors((prev) => omitKeys(prev, ['summaryRole', 'summaryPrompt', 'summaryDescription', 'summaryGradeDescription']) as Record<string, string>);
  };

  // Show blocking alert if no models are configured (after all hooks)
  if (!hasModels) {
    return (
      <div className="downpat-exercise-form">
        <div className="downpat-config-error">
          <div className="downpat-config-error-icon">⚠️</div>
          <h3 className="downpat-config-error-title">Configuration Required</h3>
          <p className="downpat-config-error-message">
            No AI models are available. Please configure at least one model before creating exercises.
          </p>
          <p className="downpat-config-error-hint">
            Pass the <code>availableModels</code> prop with your configured AI models.
          </p>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="downpat-btn downpat-btn--secondary"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="downpat-exercise-form">
      <h2>
        {exercise ? 'Edit Exercise' : 'Create New Exercise'}
      </h2>

      {/* Basic Info */}
      <section className="downpat-form-section">
        <h3 className="downpat-section-title">Basic Information</h3>

        <div className="downpat-field">
          <label className="downpat-label">Exercise Name *</label>
          <input
            type="text"
            value={formData.exerciseName}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => handleBlur('exerciseName', formData.exerciseName)}
            placeholder="Enter exercise name"
            required
            className={`downpat-input ${touched.exerciseName && errors.exerciseName ? 'downpat-input--error' : ''}`}
          />
          {touched.exerciseName && errors.exerciseName && (
            <small className="downpat-field-error-text">{errors.exerciseName}</small>
          )}
        </div>

        <div className="downpat-field">
          <label className="downpat-label">Slug *</label>
          <input
            type="text"
            value={formData.slug}
            onBlur={() => !exercise && handleBlur('slug', formData.slug)}
            onChange={(e) => !exercise && updateField('slug', e.target.value)}
            placeholder="exercise-slug"
            required
            readOnly={!!exercise}
            className={`downpat-input ${touched.slug && errors.slug ? 'downpat-input--error' : ''} ${exercise ? 'downpat-input--readonly' : ''}`}
            pattern="[a-z0-9\-]+"
            title="Lowercase letters, numbers, and hyphens only"
          />
          {touched.slug && errors.slug ? (
            <small className="downpat-field-error-text">{errors.slug}</small>
          ) : (
            <small className="downpat-help-text">
              {exercise ? 'Slug cannot be changed after creation' : 'URL-friendly identifier (auto-generated from name)'}
            </small>
          )}
        </div>

        <div className="downpat-field">
          <label className="downpat-label">AI Model *</label>
          <select
            value={formData.model}
            onChange={(e) => updateField('model', e.target.value)}
            required
            className="downpat-select"
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="downpat-field">
          <label className="downpat-label">Max User Messages *</label>
          <input
            type="number"
            value={formData.maxUserMessages}
            onChange={(e) => updateField('maxUserMessages', parseInt(e.target.value, 10))}
            min={1}
            max={100}
            required
            className="downpat-input downpat-input--narrow"
          />
          <small className="downpat-help-text">
            Conversation will end after this many user messages
          </small>
        </div>
      </section>

      {/* Content */}
      <section className="downpat-form-section">
        <h3 className="downpat-section-title">Content</h3>

        <div className="downpat-field">
          <label className="downpat-label">Welcome Message *</label>
          <textarea
            value={formData.welcomeMessage}
            onChange={(e) => updateField('welcomeMessage', e.target.value)}
            onBlur={() => handleBlur('welcomeMessage', formData.welcomeMessage)}
            placeholder="Message shown when conversation starts..."
            rows={3}
            className={`downpat-textarea ${touched.welcomeMessage && errors.welcomeMessage ? 'downpat-textarea--error' : ''}`}
          />
          {touched.welcomeMessage && errors.welcomeMessage && (
            <small className="downpat-field-error-text">{errors.welcomeMessage}</small>
          )}
        </div>

        <div className="downpat-field">
          <label className="downpat-label">Conversation Starters</label>
          <small className="downpat-help-text">
            Opening scenario messages shown to users. A random starter is selected when the conversation begins.
          </small>
          {formData.starters.map((starter, index) => (
            <StarterEditor
              key={index}
              starter={starter}
              index={index}
              onChange={(updates) => updateStarter(index, updates)}
              onRemove={() => removeStarter(index)}
              canRemove={formData.starters.length > 1}
            />
          ))}
          <button type="button" onClick={addStarter} className="downpat-btn downpat-btn--add">
            + Add Starter
          </button>
        </div>
      </section>

      {/* Shared Instructions */}
      <section className="downpat-form-section">
        <h3 className="downpat-section-title">Shared Instructions</h3>
        <small className="downpat-help-text downpat-section-description">
          Guidelines that are shared with Commentary, Summary, and Talk to Coach tasks (but not the Conversation task).
        </small>

        <div className="downpat-field">
          <label className="downpat-label">Guidelines</label>
          <textarea
            value={formData.guidelines}
            onChange={(e) => updateField('guidelines', e.target.value)}
            placeholder="Shared guidelines for coaching tasks..."
            rows={6}
            className="downpat-textarea"
          />
        </div>
      </section>

      {/* Conversation Task (Always Visible) */}
      <section className="downpat-form-section">
        <h3 className="downpat-section-title">Conversation Task</h3>
        <small className="downpat-help-text downpat-section-description">
          Configure how the AI engages in conversation with users.
        </small>

        <div className="downpat-field">
          <label className="downpat-label">Role *</label>
          <input
            type="text"
            value={conversationFields.role}
            onChange={(e) => setConversationFields((prev) => ({ ...prev, role: e.target.value }))}
            onBlur={() => handleBlur('conversationRole', conversationFields.role)}
            placeholder="Who is the user talking to?"
            className={`downpat-input ${touched.conversationRole && errors.conversationRole ? 'downpat-input--error' : ''}`}
          />
          {touched.conversationRole && errors.conversationRole && (
            <small className="downpat-field-error-text">{errors.conversationRole}</small>
          )}
        </div>

        <div className="downpat-field">
          <label className="downpat-label">Prompt *</label>
          <textarea
            value={conversationFields.prompt}
            onChange={(e) => setConversationFields((prev) => ({ ...prev, prompt: e.target.value }))}
            onBlur={() => handleBlur('conversationPrompt', conversationFields.prompt)}
            placeholder="Instructions for the AI during conversation..."
            rows={12}
            className={`downpat-textarea ${touched.conversationPrompt && errors.conversationPrompt ? 'downpat-textarea--error' : ''}`}
          />
          {touched.conversationPrompt && errors.conversationPrompt && (
            <small className="downpat-field-error-text">{errors.conversationPrompt}</small>
          )}
        </div>

        <div className="downpat-field">
          <label className="downpat-label">Response Description *</label>
          <textarea
            value={conversationFields.responseDescription}
            onChange={(e) => setConversationFields((prev) => ({ ...prev, responseDescription: e.target.value }))}
            onBlur={() => handleBlur('conversationResponseDescription', conversationFields.responseDescription)}
            placeholder="Description of expected conversation response for AI tool call..."
            rows={4}
            className={`downpat-textarea ${touched.conversationResponseDescription && errors.conversationResponseDescription ? 'downpat-textarea--error' : ''}`}
          />
          {touched.conversationResponseDescription && errors.conversationResponseDescription && (
            <small className="downpat-field-error-text">{errors.conversationResponseDescription}</small>
          )}
        </div>
      </section>

      {/* Commentary Task (Optional) */}
      {showCommentary ? (
        <section className="downpat-form-section">
          <div className="downpat-section-header">
            <h3 className="downpat-section-title">Commentary Task</h3>
            <button
              type="button"
              onClick={handleRemoveCommentary}
              className="downpat-btn downpat-btn--remove downpat-btn--small"
            >
              Remove Commentary
            </button>
          </div>
          <small className="downpat-help-text downpat-section-description">
            Provides real-time feedback and grading after each user message.
          </small>

          <div className="downpat-field">
            <label className="downpat-label">Role *</label>
            <input
              type="text"
              value={commentaryFields.role}
              onChange={(e) => setCommentaryFields((prev) => ({ ...prev, role: e.target.value }))}
              placeholder="Who is providing commentary? Ex: Coach"
              className={`downpat-input ${errors.commentaryRole ? 'downpat-input--error' : ''}`}
            />
            {errors.commentaryRole && (
              <small className="downpat-field-error-text">{errors.commentaryRole}</small>
            )}
          </div>

          <div className="downpat-field">
            <label className="downpat-label">Prompt *</label>
            <textarea
              value={commentaryFields.prompt}
              onChange={(e) => setCommentaryFields((prev) => ({ ...prev, prompt: e.target.value }))}
              placeholder="Instructions for generating commentary..."
              rows={12}
              className={`downpat-textarea ${errors.commentaryPrompt ? 'downpat-textarea--error' : ''}`}
            />
            {errors.commentaryPrompt && (
              <small className="downpat-field-error-text">{errors.commentaryPrompt}</small>
            )}
          </div>

          <div className="downpat-field">
            <label className="downpat-label">Commentary Description *</label>
            <textarea
              value={commentaryFields.commentaryDescription}
              onChange={(e) => setCommentaryFields((prev) => ({ ...prev, commentaryDescription: e.target.value }))}
              placeholder="Description of expected commentary response..."
              rows={4}
              className={`downpat-textarea ${errors.commentaryDescription ? 'downpat-textarea--error' : ''}`}
            />
            {errors.commentaryDescription && (
              <small className="downpat-field-error-text">{errors.commentaryDescription}</small>
            )}
          </div>

          <div className="downpat-field">
            <label className="downpat-label">Grade Description *</label>
            <textarea
              value={commentaryFields.gradeDescription}
              onChange={(e) => setCommentaryFields((prev) => ({ ...prev, gradeDescription: e.target.value }))}
              placeholder="Description of how to grade performance..."
              rows={4}
              className={`downpat-textarea ${errors.commentaryGradeDescription ? 'downpat-textarea--error' : ''}`}
            />
            {errors.commentaryGradeDescription && (
              <small className="downpat-field-error-text">{errors.commentaryGradeDescription}</small>
            )}
          </div>
        </section>
      ) : (
        <div className="downpat-add-section">
          <button type="button" onClick={handleAddCommentary} className="downpat-btn downpat-btn--add">
            + Add Commentary Task
          </button>
        </div>
      )}

      {/* Summary Task (Optional) */}
      {showSummary ? (
        <section className="downpat-form-section">
          <div className="downpat-section-header">
            <h3 className="downpat-section-title">Summary Task</h3>
            <button
              type="button"
              onClick={handleRemoveSummary}
              className="downpat-btn downpat-btn--remove downpat-btn--small"
            >
              Remove Summary
            </button>
          </div>
          <small className="downpat-help-text downpat-section-description">
            Provides a final assessment when the conversation ends.
          </small>

          <div className="downpat-field">
            <label className="downpat-label">Role *</label>
            <input
              type="text"
              value={summaryFields.role}
              onChange={(e) => setSummaryFields((prev) => ({ ...prev, role: e.target.value }))}
              placeholder="Who is providing the summary? Ex: Coach"
              className={`downpat-input ${errors.summaryRole ? 'downpat-input--error' : ''}`}
            />
            {errors.summaryRole && (
              <small className="downpat-field-error-text">{errors.summaryRole}</small>
            )}
          </div>

          <div className="downpat-field">
            <label className="downpat-label">Prompt *</label>
            <textarea
              value={summaryFields.prompt}
              onChange={(e) => setSummaryFields((prev) => ({ ...prev, prompt: e.target.value }))}
              placeholder="Instructions for generating summary..."
              rows={12}
              className={`downpat-textarea ${errors.summaryPrompt ? 'downpat-textarea--error' : ''}`}
            />
            {errors.summaryPrompt && (
              <small className="downpat-field-error-text">{errors.summaryPrompt}</small>
            )}
          </div>

          <div className="downpat-field">
            <label className="downpat-label">Summary Description *</label>
            <textarea
              value={summaryFields.summaryDescription}
              onChange={(e) => setSummaryFields((prev) => ({ ...prev, summaryDescription: e.target.value }))}
              placeholder="Description of expected summary response..."
              rows={4}
              className={`downpat-textarea ${errors.summaryDescription ? 'downpat-textarea--error' : ''}`}
            />
            {errors.summaryDescription && (
              <small className="downpat-field-error-text">{errors.summaryDescription}</small>
            )}
          </div>

          <div className="downpat-field">
            <label className="downpat-label">Grade Description *</label>
            <textarea
              value={summaryFields.gradeDescription}
              onChange={(e) => setSummaryFields((prev) => ({ ...prev, gradeDescription: e.target.value }))}
              placeholder="Description of how to grade overall performance..."
              rows={4}
              className={`downpat-textarea ${errors.summaryGradeDescription ? 'downpat-textarea--error' : ''}`}
            />
            {errors.summaryGradeDescription && (
              <small className="downpat-field-error-text">{errors.summaryGradeDescription}</small>
            )}
          </div>
        </section>
      ) : (
        <div className="downpat-add-section">
          <button type="button" onClick={handleAddSummary} className="downpat-btn downpat-btn--add">
            + Add Summary Task
          </button>
        </div>
      )}

      {/* Settings */}
      <section className="downpat-form-section">
        <h3 className="downpat-section-title">Settings</h3>

        <div className="downpat-field downpat-checkbox-field">
          <input
            type="checkbox"
            id="talkToCoach"
            checked={formData.talkToCoachEnabled}
            onChange={(e) => updateField('talkToCoachEnabled', e.target.checked)}
            className="downpat-checkbox"
          />
          <label htmlFor="talkToCoach" className="downpat-label">
            Enable Talk to Coach
          </label>
        </div>
      </section>

      {/* Actions */}
      <div className="downpat-form-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="downpat-btn downpat-btn--primary"
        >
          {isSubmitting ? 'Saving...' : exercise ? 'Update Exercise' : 'Create Exercise'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="downpat-btn downpat-btn--secondary"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// Starter Editor sub-component
interface StarterEditorProps {
  starter: Starter;
  index: number;
  onChange: (updates: Partial<Starter>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function StarterEditor({ starter, index, onChange, onRemove, canRemove }: StarterEditorProps): React.JSX.Element {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editMode, setEditMode] = useState<'gui' | 'json'>('gui');
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Convert starter to JSON string for JSON editor
  const starterToJson = (s: Starter): string => {
    return JSON.stringify({ text: s.text, context: s.context, attributes: s.attributes }, null, 2);
  };

  // Switch to JSON mode
  const switchToJson = () => {
    setJsonValue(starterToJson(starter));
    setJsonError(null);
    setEditMode('json');
  };

  // Switch to GUI mode
  const switchToGui = () => {
    // Try to parse current JSON and apply it
    if (jsonValue.trim()) {
      try {
        const parsed = JSON.parse(jsonValue);
        onChange({
          text: parsed.text || '',
          context: parsed.context || '',
          attributes: parsed.attributes || {},
        });
        setJsonError(null);
      } catch {
        // Keep GUI mode but show error
        setJsonError('Invalid JSON - changes not applied');
      }
    }
    setEditMode('gui');
  };

  // Handle JSON textarea change
  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    try {
      const parsed = JSON.parse(value);
      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) {
        setJsonError('JSON must be an object');
        return;
      }
      setJsonError(null);
      // Apply changes immediately
      onChange({
        text: parsed.text || '',
        context: parsed.context || '',
        attributes: typeof parsed.attributes === 'object' ? parsed.attributes : {},
      });
    } catch {
      setJsonError('Invalid JSON syntax');
    }
  };

  return (
    <div className="downpat-starter-editor">
      <div className="downpat-starter-header">
        <span className="downpat-starter-label">Starter {index + 1}</span>
        <div className="downpat-starter-actions">
          <button
            type="button"
            onClick={editMode === 'gui' ? switchToJson : switchToGui}
            className="downpat-btn downpat-btn--small downpat-btn--text"
          >
            {editMode === 'gui' ? 'Edit JSON' : 'Edit Fields'}
          </button>
          {editMode === 'gui' && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="downpat-btn downpat-btn--small downpat-btn--text"
            >
              {showAdvanced ? 'Hide Options' : 'Show Options'}
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="downpat-btn downpat-btn--small downpat-btn--remove"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {editMode === 'json' ? (
        <div className="downpat-field">
          <label className="downpat-label downpat-label--small">JSON</label>
          <textarea
            value={jsonValue}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder='{"text": "...", "context": "...", "attributes": {}}'
            rows={8}
            className={`downpat-textarea downpat-textarea--monospace ${jsonError ? 'downpat-textarea--error' : ''}`}
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
          {jsonError && (
            <small className="downpat-help-text downpat-help-text--error" style={{ color: '#dc2626' }}>
              {jsonError}
            </small>
          )}
          <small className="downpat-help-text">
            Edit starter as JSON for easy copy/paste. Changes apply automatically.
          </small>
        </div>
      ) : (
        <>
          <div className="downpat-field">
            <label className="downpat-label downpat-label--small">Text *</label>
            <textarea
              value={starter.text}
              onChange={(e) => onChange({ text: e.target.value })}
              placeholder="Opening message shown to the user..."
              rows={2}
              className="downpat-textarea"
            />
          </div>

          {showAdvanced && (
            <>
              <div className="downpat-field">
                <label className="downpat-label downpat-label--small">Context</label>
                <textarea
                  value={starter.context}
                  onChange={(e) => onChange({ context: e.target.value })}
                  placeholder="Additional context for the AI about this scenario (not shown to user)..."
                  rows={2}
                  className="downpat-textarea"
                />
                <small className="downpat-help-text">
                  Private context for the AI to understand the scenario
                </small>
              </div>

              <div className="downpat-field">
                <label className="downpat-label downpat-label--small">Attributes</label>
                <small className="downpat-help-text">
                  Key-value pairs for filtering starters via URL query params (e.g., ?difficulty=easy)
                </small>
                <AttributesEditor
                  attributes={starter.attributes}
                  onChange={(attributes) => onChange({ attributes })}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Attributes Editor sub-component for starter attributes
interface AttributesEditorProps {
  attributes: Record<string, string>;
  onChange: (attributes: Record<string, string>) => void;
}

function AttributesEditor({ attributes, onChange }: AttributesEditorProps): React.JSX.Element {
  const entries = Object.entries(attributes);

  const addAttribute = () => {
    onChange({ ...attributes, '': '' });
  };

  const updateAttribute = (oldKey: string, newKey: string, value: string) => {
    const newAttrs = { ...attributes };
    if (oldKey !== newKey) {
      delete newAttrs[oldKey];
    }
    newAttrs[newKey] = value;
    onChange(newAttrs);
  };

  const removeAttribute = (key: string) => {
    const newAttrs = { ...attributes };
    delete newAttrs[key];
    onChange(newAttrs);
  };

  return (
    <div className="downpat-attributes-editor">
      {entries.map(([key, value], idx) => (
        <div key={idx} className="downpat-attribute-row">
          <input
            type="text"
            value={key}
            onChange={(e) => updateAttribute(key, e.target.value, value)}
            placeholder="Key"
            className="downpat-input downpat-input--small"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => updateAttribute(key, key, e.target.value)}
            placeholder="Value"
            className="downpat-input downpat-input--small"
          />
          <button
            type="button"
            onClick={() => removeAttribute(key)}
            className="downpat-btn downpat-btn--small downpat-btn--remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addAttribute}
        className="downpat-btn downpat-btn--small downpat-btn--add"
      >
        + Add Attribute
      </button>
    </div>
  );
}
