// Constants
export {
  MessageType,
  VISIBLE_MESSAGE_TYPES,
  COACHING_MESSAGE_TYPES,
} from './constants/index.js';

// Types
export type {
  User,
  MessageFilter,
  BaseTask,
  ConversationTask,
  CommentaryTask,
  SummaryTask,
  SimpleTask,
  Task,
  ExerciseMetadata,
  Exercise,
  CreateExerciseInput,
  UpdateExerciseInput,
  Message,
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
