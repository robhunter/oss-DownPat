export { FirebaseExerciseStorage } from './exercise-storage.js';
export { FirebaseConversationStorage } from './conversation-storage.js';
export { FirebaseUserStateStorage } from './user-state-storage.js';

// Helper functions for easy setup
export {
  initializeFirebaseFromEnv,
  createFirebaseStorage,
  type InitializeFirebaseOptions,
  type CreateFirebaseStorageOptions,
  type DownpatStorage,
} from './helpers.js';
