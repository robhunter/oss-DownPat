import React, { useState, useCallback } from 'react';
import type { Exercise, Task, BaseTask } from '@downpat/core';
import { MessageType } from '@downpat/core';
import { generateId, generateSlug } from '@downpat/core';

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
   * Use getAvailableModels() from @downpat/core to get models based on your AI config.
   */
  availableModels: string[];
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

  // Show blocking alert if no models are configured
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

  const [formData, setFormData] = useState<Partial<Exercise>>(() => ({
    exerciseId: exercise?.exerciseId || generateId(),
    exerciseName: exercise?.exerciseName || '',
    slug: exercise?.slug || '',
    maxUserMessages: exercise?.maxUserMessages || 10,
    model: exercise?.model || (hasModels ? availableModels[0] : ''),
    talkToCoachEnabled: exercise?.talkToCoachEnabled || false,
    continuationTasks: exercise?.continuationTasks || [],
    completionTasks: exercise?.completionTasks || [],
    welcomeMessage: exercise?.welcomeMessage || '',
    guidelines: exercise?.guidelines || '',
    starters: exercise?.starters || [''],
  }));

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
      case 'guidelines':
        if (!value || (typeof value === 'string' && !value.trim())) {
          return 'Guidelines are required';
        }
        break;
    }
    return null;
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof Exercise]);
    setErrors((prev) => ({ ...prev, [field]: error || '' }));
  }, [formData, validateField]);

  const validateForm = useCallback((): boolean => {
    const requiredFields = ['exerciseName', 'slug', 'welcomeMessage', 'guidelines'];
    const newErrors: Record<string, string> = {};
    let isValid = true;

    for (const field of requiredFields) {
      const error = validateField(field, formData[field as keyof Exercise]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched(Object.fromEntries(requiredFields.map((f) => [f, true])));
    return isValid;
  }, [formData, validateField]);

  const updateField = useCallback(<K extends keyof Exercise>(
    field: K,
    value: Exercise[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Auto-generate slug from exercise name
  const handleNameChange = useCallback((name: string) => {
    updateField('exerciseName', name);
    if (!exercise) {
      // Only auto-generate slug for new exercises
      updateField('slug', generateSlug(name));
    }
  }, [exercise, updateField]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const finalExercise: Exercise = {
      exerciseId: formData.exerciseId!,
      exerciseName: formData.exerciseName!,
      slug: formData.slug!,
      maxUserMessages: formData.maxUserMessages!,
      model: formData.model,
      talkToCoachEnabled: formData.talkToCoachEnabled!,
      continuationTasks: formData.continuationTasks!,
      completionTasks: formData.completionTasks!,
      welcomeMessage: formData.welcomeMessage!,
      guidelines: formData.guidelines!,
      starters: formData.starters!.filter((s) => s.trim()),
    };

    onSubmit(finalExercise);
  };

  const addStarter = () => {
    updateField('starters', [...(formData.starters || []), '']);
  };

  const updateStarter = (index: number, value: string) => {
    const newStarters = [...(formData.starters || [])];
    newStarters[index] = value;
    updateField('starters', newStarters);
  };

  const removeStarter = (index: number) => {
    const newStarters = (formData.starters || []).filter((_, i) => i !== index);
    updateField('starters', newStarters.length > 0 ? newStarters : ['']);
  };

  const addContinuationTask = () => {
    const newTask: ConversationTask = {
      taskId: generateId(),
      name: 'New Task',
      responseType: MessageType.CONVERSATION,
      role: 'Assistant',
      prompt: '',
      enabled: true,
    };
    updateField('continuationTasks', [...(formData.continuationTasks || []), newTask]);
  };

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
            onBlur={() => handleBlur('exerciseName')}
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
            onBlur={() => handleBlur('slug')}
            onChange={(e) => updateField('slug', e.target.value)}
            placeholder="exercise-slug"
            required
            className={`downpat-input ${touched.slug && errors.slug ? 'downpat-input--error' : ''}`}
            pattern="[a-z0-9\-]+"
            title="Lowercase letters, numbers, and hyphens only"
          />
          {touched.slug && errors.slug ? (
            <small className="downpat-field-error-text">{errors.slug}</small>
          ) : (
            <small className="downpat-help-text">URL-friendly identifier (auto-generated from name)</small>
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
            onBlur={() => handleBlur('welcomeMessage')}
            placeholder="Message shown when conversation starts..."
            rows={3}
            className={`downpat-textarea ${touched.welcomeMessage && errors.welcomeMessage ? 'downpat-textarea--error' : ''}`}
          />
          {touched.welcomeMessage && errors.welcomeMessage && (
            <small className="downpat-field-error-text">{errors.welcomeMessage}</small>
          )}
        </div>

        <div className="downpat-field">
          <label className="downpat-label">Guidelines *</label>
          <textarea
            value={formData.guidelines}
            onChange={(e) => updateField('guidelines', e.target.value)}
            onBlur={() => handleBlur('guidelines')}
            placeholder="Guidelines for the AI..."
            rows={4}
            className={`downpat-textarea ${touched.guidelines && errors.guidelines ? 'downpat-textarea--error' : ''}`}
          />
          {touched.guidelines && errors.guidelines && (
            <small className="downpat-field-error-text">{errors.guidelines}</small>
          )}
        </div>

        <div className="downpat-field">
          <label className="downpat-label">Conversation Starters</label>
          {formData.starters?.map((starter, index) => (
            <div key={index} className="downpat-starter-row">
              <input
                type="text"
                value={starter}
                onChange={(e) => updateStarter(index, e.target.value)}
                placeholder={`Starter ${index + 1}`}
                className="downpat-input downpat-starter-input"
              />
              {formData.starters!.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStarter(index)}
                  className="downpat-btn downpat-btn--remove"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addStarter} className="downpat-btn downpat-btn--add">
            + Add Starter
          </button>
        </div>
      </section>

      {/* Tasks */}
      <section className="downpat-form-section">
        <h3 className="downpat-section-title">Continuation Tasks</h3>
        <small className="downpat-help-text">
          Tasks that run after each user message
        </small>

        {formData.continuationTasks?.length === 0 ? (
          <p className="downpat-empty-state">No tasks configured</p>
        ) : (
          formData.continuationTasks?.map((task, index) => (
            <TaskEditor
              key={task.taskId}
              task={task as BaseTask}
              onChange={(updated) => {
                const newTasks = [...(formData.continuationTasks || [])] as Task[];
                newTasks[index] = updated as Task;
                updateField('continuationTasks', newTasks);
              }}
              onRemove={() => {
                updateField(
                  'continuationTasks',
                  (formData.continuationTasks || []).filter((_, i) => i !== index)
                );
              }}
            />
          ))
        )}

        <button type="button" onClick={addContinuationTask} className="downpat-btn downpat-btn--add">
          + Add Task
        </button>
      </section>

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

// Task Editor sub-component
interface TaskEditorProps {
  task: BaseTask;
  onChange: (task: BaseTask) => void;
  onRemove: () => void;
}

function TaskEditor({ task, onChange, onRemove }: TaskEditorProps): React.JSX.Element {
  return (
    <div className="downpat-task-editor">
      <div className="downpat-task-header">
        <div className="downpat-task-header-left">
          <input
            type="checkbox"
            checked={task.enabled}
            onChange={(e) => onChange({ ...task, enabled: e.target.checked })}
            className="downpat-checkbox"
          />
          <input
            type="text"
            value={task.name}
            onChange={(e) => onChange({ ...task, name: e.target.value })}
            className="downpat-input downpat-input--medium"
            placeholder="Task name"
          />
        </div>
        <button type="button" onClick={onRemove} className="downpat-btn downpat-btn--remove">
          Remove
        </button>
      </div>

      <div className="downpat-task-grid">
        <div>
          <label className="downpat-label downpat-label--small">Response Type</label>
          <select
            value={task.responseType}
            onChange={(e) => onChange({ ...task, responseType: e.target.value as MessageType })}
            className="downpat-select"
          >
            <option value={MessageType.CONVERSATION}>Conversation</option>
            <option value={MessageType.COMMENTARY}>Commentary</option>
            <option value={MessageType.SUMMARY}>Summary</option>
            <option value={MessageType.SIMPLE}>Simple (Coach)</option>
          </select>
        </div>
        <div>
          <label className="downpat-label downpat-label--small">Role</label>
          <input
            type="text"
            value={task.role}
            onChange={(e) => onChange({ ...task, role: e.target.value })}
            className="downpat-input"
            placeholder="Assistant"
          />
        </div>
      </div>

      <div>
        <label className="downpat-label downpat-label--small">Prompt</label>
        <textarea
          value={task.prompt}
          onChange={(e) => onChange({ ...task, prompt: e.target.value })}
          rows={3}
          className="downpat-textarea"
          placeholder="AI prompt for this task..."
        />
      </div>

      {/* Message Filter Section */}
      <div className="downpat-task-filter-section">
        <label className="downpat-label downpat-label--small">
          Message Filter (Context Window)
        </label>

        <div className="downpat-task-grid downpat-task-grid--three">
          <div>
            <label className="downpat-label downpat-label--tiny">Max Messages</label>
            <input
              type="number"
              value={task.messageFilter?.maxMessages ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                onChange({
                  ...task,
                  messageFilter: { ...task.messageFilter, maxMessages: val },
                });
              }}
              className="downpat-input downpat-input--small"
              placeholder="All"
              min={1}
            />
          </div>

          <div>
            <label className="downpat-label downpat-label--tiny">Include Types</label>
            <select
              multiple
              value={task.messageFilter?.includeTypes ?? []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (opt) => opt.value as MessageType);
                onChange({
                  ...task,
                  messageFilter: { ...task.messageFilter, includeTypes: selected.length > 0 ? selected : undefined },
                });
              }}
              className="downpat-select downpat-select--multi"
            >
              {Object.values(MessageType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="downpat-label downpat-label--tiny">Exclude Types</label>
            <select
              multiple
              value={task.messageFilter?.excludeTypes ?? []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (opt) => opt.value as MessageType);
                onChange({
                  ...task,
                  messageFilter: { ...task.messageFilter, excludeTypes: selected.length > 0 ? selected : undefined },
                });
              }}
              className="downpat-select downpat-select--multi"
            >
              {Object.values(MessageType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <small className="downpat-help-text">
          Configure which messages are included in AI context. Hold Ctrl/Cmd to select multiple types.
        </small>
      </div>
    </div>
  );
}
