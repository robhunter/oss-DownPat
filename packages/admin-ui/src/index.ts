// Components
export { ExerciseForm } from './components/ExerciseForm.js';
export type { ExerciseFormProps } from './components/ExerciseForm.js';

export { ExerciseList } from './components/ExerciseList.js';
export type { ExerciseListProps, ExerciseWithMetadata } from './components/ExerciseList.js';

// Re-export useful types from core
export type { Exercise, ExerciseMetadata, Task, ConversationTask } from '@downpat/core';
export { MessageType, generateId, generateSlug } from '@downpat/core';
