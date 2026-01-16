import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { ExerciseStorage, ConversationStorage, UserStateStorage } from '@downpat/core';
import { createInMemoryStorage } from '@downpat/core';
import { FirebaseExerciseStorage } from './exercise-storage.js';
import { FirebaseConversationStorage } from './conversation-storage.js';
import { FirebaseUserStateStorage } from './user-state-storage.js';

/**
 * Options for initializing Firebase from environment variables.
 */
export interface InitializeFirebaseOptions {
  /**
   * Firebase project ID. Defaults to FIREBASE_PROJECT_ID env var.
   */
  projectId?: string;

  /**
   * Path to service account JSON file. Defaults to GOOGLE_APPLICATION_CREDENTIALS env var.
   */
  credentialsPath?: string;

  /**
   * Base64-encoded service account JSON. Defaults to FIREBASE_SERVICE_ACCOUNT_BASE64 env var.
   * Takes precedence over credentialsPath if both are provided.
   */
  credentialsBase64?: string;
}

/**
 * Initialize Firebase Admin SDK from environment variables.
 *
 * Supports two credential formats:
 * 1. Base64-encoded service account JSON (FIREBASE_SERVICE_ACCOUNT_BASE64)
 * 2. File path to service account JSON (GOOGLE_APPLICATION_CREDENTIALS)
 *
 * If Firebase is already initialized, returns the existing Firestore instance.
 *
 * @example
 * ```typescript
 * import { initializeFirebaseFromEnv } from '@downpat/firebase-storage';
 *
 * // Uses env vars: FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_BASE64
 * const db = initializeFirebaseFromEnv();
 * ```
 *
 * @example
 * ```typescript
 * // With explicit options (overrides env vars)
 * const db = initializeFirebaseFromEnv({
 *   projectId: 'my-project',
 *   credentialsPath: '/path/to/service-account.json',
 * });
 * ```
 *
 * @throws Error if required environment variables are missing
 */
export function initializeFirebaseFromEnv(options: InitializeFirebaseOptions = {}): Firestore {
  // Return existing Firestore instance if already initialized
  if (getApps().length > 0) {
    return getFirestore();
  }

  const projectId = options.projectId ?? process.env.FIREBASE_PROJECT_ID;
  const credentialsPath = options.credentialsPath ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credentialsBase64 = options.credentialsBase64 ?? process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!projectId) {
    throw new Error(
      'Firebase project ID is required. Set FIREBASE_PROJECT_ID environment variable ' +
      'or pass projectId option.'
    );
  }

  let app: App;

  if (credentialsBase64) {
    // Use base64-encoded credentials (preferred for Docker/CI)
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(credentialsBase64, 'base64').toString('utf8')
      );
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } catch (error) {
      throw new Error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64. Ensure it contains valid base64-encoded JSON.'
      );
    }
  } else if (credentialsPath) {
    // Use file path credentials
    app = initializeApp({
      credential: cert(credentialsPath),
      projectId,
    });
  } else {
    throw new Error(
      'Firebase credentials are required. Set either:\n' +
      '  - FIREBASE_SERVICE_ACCOUNT_BASE64 (base64-encoded service account JSON)\n' +
      '  - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON file)'
    );
  }

  return getFirestore(app);
}

/**
 * Storage instances returned by createFirebaseStorage.
 */
export interface DownpatStorage {
  exerciseStorage: ExerciseStorage;
  conversationStorage: ConversationStorage;
  userStateStorage: UserStateStorage;
}

/**
 * Options for creating Firebase storage.
 */
export interface CreateFirebaseStorageOptions extends InitializeFirebaseOptions {
  /**
   * Force in-memory storage regardless of environment.
   * Useful for testing.
   */
  forceInMemory?: boolean;
}

/**
 * Create DownPat storage instances.
 *
 * Automatically selects storage backend based on environment:
 * - NODE_ENV=test: Uses in-memory storage (no Firebase required)
 * - Otherwise: Uses Firebase storage
 *
 * @example
 * ```typescript
 * import { createFirebaseStorage } from '@downpat/firebase-storage';
 *
 * // Auto-detects: in-memory for tests, Firebase for dev/prod
 * const { exerciseStorage, conversationStorage } = createFirebaseStorage();
 * ```
 *
 * @example
 * ```typescript
 * // Force in-memory storage (useful for specific test scenarios)
 * const storage = createFirebaseStorage({ forceInMemory: true });
 * ```
 */
export function createFirebaseStorage(options: CreateFirebaseStorageOptions = {}): DownpatStorage {
  const useInMemory = options.forceInMemory || process.env.NODE_ENV === 'test';

  if (useInMemory) {
    return createInMemoryStorage();
  }

  const db = initializeFirebaseFromEnv(options);
  return {
    exerciseStorage: new FirebaseExerciseStorage(db),
    conversationStorage: new FirebaseConversationStorage(db),
    userStateStorage: new FirebaseUserStateStorage(db),
  };
}
