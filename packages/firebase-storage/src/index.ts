export { FirebaseExerciseStorage } from './exercise-storage.js';
export { FirebaseConversationStorage } from './conversation-storage.js';

// Helper functions for easy setup
export {
  initializeFirebaseFromEnv,
  createFirebaseStorage,
  type InitializeFirebaseOptions,
  type CreateFirebaseStorageOptions,
  type DownpatStorage,
} from './helpers.js';
