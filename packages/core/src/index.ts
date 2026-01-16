// Constants
export {
  MessageType,
  VISIBLE_MESSAGE_TYPES,
  COACHING_MESSAGE_TYPES,
} from './constants/index.js';

// Types
export type {
  User,
  UserState,
  MessageFilter,
  BaseTask,
  ConversationTask,
  CommentaryTask,
  SummaryTask,
  SimpleTask,
  Task,
  Starter,
  ExerciseMetadata,
  Exercise,
  CreateExerciseInput,
  UpdateExerciseInput,
  Message,
  ConversationMetadata,
  Conversation,
  CreateConversationInput,
  AddMessageInput,
} from './types/index.js';

export {
  isConversationTask,
  isCommentaryTask,
  isSummaryTask,
  isSimpleTask,
} from './types/index.js';

// Interfaces
export type {
  ExerciseStorage,
  ConversationStorage,
  UserStateStorage,
  ClientAuthProvider,
  ServerAuthProvider,
  AIAdapter,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  AIProviderConfig,
  ModerationResult,
  ModerationAdapter,
} from './interfaces/index.js';

export { getAvailableModels } from './interfaces/index.js';

// Controllers
export { ExerciseController } from './controllers/index.js';
export { ConversationController } from './controllers/index.js';

// Utilities
export { generateId, generateSlug } from './utils/index.js';

// Storage
export { createInMemoryStorage } from './storage/index.js';
export { InMemoryUserStateStorage } from './storage/index.js';

// Validation Schemas
export {
  // Schema objects
  MessageTypeSchema,
  UserSchema,
  MessageSchema,
  AddMessageInputSchema,
  ConversationSchema,
  CreateConversationInputSchema,
  MessageFilterSchema,
  BaseTaskSchema,
  ConversationTaskSchema,
  CommentaryTaskSchema,
  SummaryTaskSchema,
  SimpleTaskSchema,
  TaskSchema,
  StarterSchema,
  ExerciseStatusSchema,
  ExerciseMetadataSchema,
  ExerciseSchema,
  CreateExerciseInputSchema,
  UpdateExerciseInputSchema,
  // Validation helpers
  validate,
  safeValidate,
} from './schemas/index.js';

export type {
  UserInput,
  MessageInput,
  ConversationInput,
  TaskInput,
  StarterInput,
  ExerciseInput,
} from './schemas/index.js';
