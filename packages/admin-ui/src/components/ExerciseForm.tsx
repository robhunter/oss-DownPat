import React, { useState, useCallback } from 'react';
import type { Exercise, Task, ConversationTask, BaseTask } from '@downpat/core';
import { MessageType } from '@downpat/core';
import { generateId, generateSlug } from '@downpat/core';

// Internal task type that allows any response type for editing
// Includes role and prompt fields from ConversationTask for form editing
type EditableTask = Omit<BaseTask, 'responseType'> & {
  responseType: MessageType;
  role: string;
  prompt: string;
};

export interface ExerciseFormProps {
  /** Initial exercise data for editing (undefined for new exercise) */
  exercise?: Exercise;
  /** Callback when form is submitted */
  onSubmit: (exercise: Exercise) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
  /** Available AI models to choose from */
  availableModels?: string[];
}

const DEFAULT_MODELS = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'];

/**
 * Form for creating and editing exercises.
 */
export function ExerciseForm({
  exercise,
  onSubmit,
  onCancel,
  isSubmitting = false,
  availableModels = DEFAULT_MODELS,
}: ExerciseFormProps): React.JSX.Element {
  const [formData, setFormData] = useState<Partial<Exercise>>(() => ({
    exerciseId: exercise?.exerciseId || generateId(),
    exerciseName: exercise?.exerciseName || '',
    slug: exercise?.slug || '',
    maxUserMessages: exercise?.maxUserMessages || 10,
    model: exercise?.model || availableModels[0] || 'gpt-4',
    talkToCoachEnabled: exercise?.talkToCoachEnabled || false,
    continuationTasks: exercise?.continuationTasks || [],
    completionTasks: exercise?.completionTasks || [],
    welcomeMessage: exercise?.welcomeMessage || '',
    guidelines: exercise?.guidelines || '',
    starters: exercise?.starters || [''],
  }));

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

    const finalExercise: Exercise = {
      exerciseId: formData.exerciseId!,
      exerciseName: formData.exerciseName!,
      slug: formData.slug!,
      maxUserMessages: formData.maxUserMessages!,
      model: formData.model!,
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
    <form onSubmit={handleSubmit} className="downpat-exercise-form" style={{ maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 600 }}>
        {exercise ? 'Edit Exercise' : 'Create New Exercise'}
      </h2>

      {/* Basic Info */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={sectionTitleStyle}>Basic Information</h3>

        <div style={fieldStyle}>
          <label style={labelStyle}>Exercise Name *</label>
          <input
            type="text"
            value={formData.exerciseName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter exercise name"
            required
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Slug *</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            placeholder="exercise-slug"
            required
            style={inputStyle}
            pattern="[a-z0-9\-]+"
            title="Lowercase letters, numbers, and hyphens only"
          />
          <small style={helpTextStyle}>URL-friendly identifier (auto-generated from name)</small>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>AI Model *</label>
          <select
            value={formData.model}
            onChange={(e) => updateField('model', e.target.value)}
            required
            style={inputStyle}
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Max User Messages *</label>
          <input
            type="number"
            value={formData.maxUserMessages}
            onChange={(e) => updateField('maxUserMessages', parseInt(e.target.value, 10))}
            min={1}
            max={100}
            required
            style={{ ...inputStyle, width: '120px' }}
          />
          <small style={helpTextStyle}>
            Conversation will end after this many user messages
          </small>
        </div>
      </section>

      {/* Content */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={sectionTitleStyle}>Content</h3>

        <div style={fieldStyle}>
          <label style={labelStyle}>Welcome Message</label>
          <textarea
            value={formData.welcomeMessage}
            onChange={(e) => updateField('welcomeMessage', e.target.value)}
            placeholder="Message shown when conversation starts..."
            rows={3}
            style={textareaStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Guidelines</label>
          <textarea
            value={formData.guidelines}
            onChange={(e) => updateField('guidelines', e.target.value)}
            placeholder="Guidelines for the AI..."
            rows={4}
            style={textareaStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Conversation Starters</label>
          {formData.starters?.map((starter, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={starter}
                onChange={(e) => updateStarter(index, e.target.value)}
                placeholder={`Starter ${index + 1}`}
                style={{ ...inputStyle, flex: 1 }}
              />
              {formData.starters!.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStarter(index)}
                  style={removeButtonStyle}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addStarter} style={addButtonStyle}>
            + Add Starter
          </button>
        </div>
      </section>

      {/* Tasks */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={sectionTitleStyle}>Continuation Tasks</h3>
        <small style={{ ...helpTextStyle, display: 'block', marginBottom: '16px' }}>
          Tasks that run after each user message
        </small>

        {formData.continuationTasks?.length === 0 ? (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No tasks configured</p>
        ) : (
          formData.continuationTasks?.map((task, index) => (
            <TaskEditor
              key={task.taskId}
              task={task as EditableTask}
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

        <button type="button" onClick={addContinuationTask} style={addButtonStyle}>
          + Add Task
        </button>
      </section>

      {/* Settings */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={sectionTitleStyle}>Settings</h3>

        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="talkToCoach"
            checked={formData.talkToCoachEnabled}
            onChange={(e) => updateField('talkToCoachEnabled', e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <label htmlFor="talkToCoach" style={{ ...labelStyle, marginBottom: 0 }}>
            Enable Talk to Coach
          </label>
        </div>
      </section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...buttonStyle,
            backgroundColor: '#3b82f6',
            color: 'white',
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          {isSubmitting ? 'Saving...' : exercise ? 'Update Exercise' : 'Create Exercise'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{ ...buttonStyle, backgroundColor: '#f3f4f6' }}
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
  task: EditableTask;
  onChange: (task: EditableTask) => void;
  onRemove: () => void;
}

function TaskEditor({ task, onChange, onRemove }: TaskEditorProps): React.JSX.Element {

  return (
    <div
      style={{
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={task.enabled}
            onChange={(e) => onChange({ ...task, enabled: e.target.checked })}
          />
          <input
            type="text"
            value={task.name}
            onChange={(e) => onChange({ ...task, name: e.target.value })}
            style={{ ...inputStyle, fontWeight: 500, width: '200px' }}
            placeholder="Task name"
          />
        </div>
        <button type="button" onClick={onRemove} style={removeButtonStyle}>
          Remove
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ ...labelStyle, fontSize: '12px' }}>Response Type</label>
          <select
            value={task.responseType}
            onChange={(e) => onChange({ ...task, responseType: e.target.value as MessageType })}
            style={inputStyle}
          >
            <option value={MessageType.CONVERSATION}>Conversation</option>
            <option value={MessageType.COMMENTARY}>Commentary</option>
            <option value={MessageType.SUMMARY}>Summary</option>
            <option value={MessageType.SIMPLE}>Simple (Coach)</option>
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: '12px' }}>Role</label>
          <input
            type="text"
            value={task.role}
            onChange={(e) => onChange({ ...task, role: e.target.value })}
            style={inputStyle}
            placeholder="Assistant"
          />
        </div>
      </div>

      <div>
        <label style={{ ...labelStyle, fontSize: '12px' }}>Prompt</label>
        <textarea
          value={task.prompt}
          onChange={(e) => onChange({ ...task, prompt: e.target.value })}
          rows={3}
          style={textareaStyle}
          placeholder="AI prompt for this task..."
        />
      </div>
    </div>
  );
}

// Styles
const fieldStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: 500,
  fontSize: '14px',
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '80px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  marginBottom: '16px',
  paddingBottom: '8px',
  borderBottom: '1px solid #e5e7eb',
};

const helpTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  marginTop: '4px',
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 500,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const addButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: '8px 16px',
  fontSize: '13px',
  backgroundColor: '#e5e7eb',
  color: '#374151',
};

const removeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: '6px 12px',
  fontSize: '12px',
  backgroundColor: '#fee2e2',
  color: '#dc2626',
};
