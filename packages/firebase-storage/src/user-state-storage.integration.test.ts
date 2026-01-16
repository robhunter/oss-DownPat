/**
 * Integration tests for FirebaseUserStateStorage.
 *
 * These tests run against a real Firestore emulator.
 *
 * To run these tests:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Start the emulator: firebase emulators:start --only firestore
 * 3. Run tests: npm test -- --testPathPattern=integration
 *
 * Tests will be skipped if the emulator is not available.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { FirebaseUserStateStorage } from './user-state-storage.js';
import { initializeApp, cert, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const TEST_COLLECTION = 'userState_integration_test';

// Check if emulator is available
async function isEmulatorAvailable(): Promise<boolean> {
  try {
    const [host, port] = EMULATOR_HOST.split(':');
    const response = await fetch(`http://${host}:${port}/`);
    return response.ok || response.status === 404; // Emulator returns 404 for root
  } catch {
    return false;
  }
}

describe('FirebaseUserStateStorage Integration Tests', () => {
  let app: App | null = null;
  let db: Firestore | null = null;
  let storage: FirebaseUserStateStorage | null = null;
  let emulatorAvailable = false;

  beforeAll(async () => {
    emulatorAvailable = await isEmulatorAvailable();

    if (!emulatorAvailable) {
      console.log('Firestore emulator not available - skipping integration tests');
      console.log(`Expected emulator at: ${EMULATOR_HOST}`);
      console.log('Start with: firebase emulators:start --only firestore');
      return;
    }

    // Set emulator host for firebase-admin
    process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;

    // Initialize Firebase Admin with a test project
    app = initializeApp({
      projectId: 'test-project',
    }, `integration-test-${Date.now()}`);

    db = getFirestore(app);
    storage = new FirebaseUserStateStorage(db, TEST_COLLECTION);
  });

  beforeEach(async () => {
    if (!emulatorAvailable || !db) return;

    // Clear the test collection before each test
    const snapshot = await db.collection(TEST_COLLECTION).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  afterAll(async () => {
    if (app) {
      await deleteApp(app);
    }
  });

  describe('getOrCreateUserState', () => {
    it('creates new state for new user', async () => {
      if (!emulatorAvailable || !storage) {
        console.log('Skipping: emulator not available');
        return;
      }

      const state = await storage.getOrCreateUserState('new-user-1');

      expect(state).toEqual({
        userId: 'new-user-1',
        activeConversations: {},
      });

      // Verify it was persisted
      const doc = await db!.collection(TEST_COLLECTION).doc('new-user-1').get();
      expect(doc.exists).toBe(true);
    });

    it('returns existing state for existing user', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      // Pre-create a user state
      await db.collection(TEST_COLLECTION).doc('existing-user').set({
        userId: 'existing-user',
        activeConversations: { 'exercise-1': 'conv-1' },
      });

      const state = await storage.getOrCreateUserState('existing-user');

      expect(state.userId).toBe('existing-user');
      expect(state.activeConversations['exercise-1']).toBe('conv-1');
    });

    it('sanitizes legacy data missing activeConversations field', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      // Simulate legacy data without activeConversations
      await db.collection(TEST_COLLECTION).doc('legacy-user').set({
        userId: 'legacy-user',
        // Note: activeConversations is intentionally missing
      });

      const state = await storage.getOrCreateUserState('legacy-user');

      // Should not crash, should return sanitized state
      expect(state.userId).toBe('legacy-user');
      expect(state.activeConversations).toEqual({});
    });
  });

  describe('setActiveConversation', () => {
    it('sets active conversation for new user', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      await storage.setActiveConversation('user-1', 'exercise-1', 'conv-1');

      const doc = await db.collection(TEST_COLLECTION).doc('user-1').get();
      expect(doc.exists).toBe(true);
      const data = doc.data();
      expect(data?.activeConversations?.['exercise-1']).toBe('conv-1');
    });

    it('sets active conversation for existing user', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      // Pre-create user state
      await db.collection(TEST_COLLECTION).doc('user-2').set({
        userId: 'user-2',
        activeConversations: { 'exercise-old': 'conv-old' },
      });

      await storage.setActiveConversation('user-2', 'exercise-new', 'conv-new');

      const doc = await db.collection(TEST_COLLECTION).doc('user-2').get();
      const data = doc.data();
      // Should preserve existing and add new
      expect(data?.activeConversations?.['exercise-old']).toBe('conv-old');
      expect(data?.activeConversations?.['exercise-new']).toBe('conv-new');
    });

    it('overwrites existing active conversation for same exercise', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      await storage.setActiveConversation('user-3', 'exercise-1', 'conv-1');
      await storage.setActiveConversation('user-3', 'exercise-1', 'conv-2');

      const doc = await db.collection(TEST_COLLECTION).doc('user-3').get();
      const data = doc.data();
      expect(data?.activeConversations?.['exercise-1']).toBe('conv-2');
    });
  });

  describe('getActiveConversation', () => {
    it('returns null for non-existent exercise', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      await db.collection(TEST_COLLECTION).doc('user-4').set({
        userId: 'user-4',
        activeConversations: {},
      });

      const result = await storage.getActiveConversation('user-4', 'non-existent');
      expect(result).toBeNull();
    });

    it('returns conversation ID when set', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      await db.collection(TEST_COLLECTION).doc('user-5').set({
        userId: 'user-5',
        activeConversations: { 'exercise-1': 'conv-123' },
      });

      const result = await storage.getActiveConversation('user-5', 'exercise-1');
      expect(result).toBe('conv-123');
    });
  });

  describe('clearActiveConversation', () => {
    it('clears active conversation', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      await db.collection(TEST_COLLECTION).doc('user-6').set({
        userId: 'user-6',
        activeConversations: { 'exercise-1': 'conv-1', 'exercise-2': 'conv-2' },
      });

      await storage.clearActiveConversation('user-6', 'exercise-1');

      const doc = await db.collection(TEST_COLLECTION).doc('user-6').get();
      const data = doc.data();
      expect(data?.activeConversations?.['exercise-1']).toBeUndefined();
      expect(data?.activeConversations?.['exercise-2']).toBe('conv-2');
    });

    it('handles clearing from non-existent user gracefully', async () => {
      if (!emulatorAvailable || !storage) {
        console.log('Skipping: emulator not available');
        return;
      }

      // Should not throw - if user doesn't exist, there's nothing to clear
      await expect(
        storage.clearActiveConversation('non-existent-user', 'exercise-1')
      ).resolves.not.toThrow();
    });
  });

  describe('concurrent operations', () => {
    it('handles concurrent setActiveConversation calls', async () => {
      if (!emulatorAvailable || !storage || !db) {
        console.log('Skipping: emulator not available');
        return;
      }

      // Simulate concurrent writes for different exercises
      await Promise.all([
        storage.setActiveConversation('concurrent-user', 'exercise-1', 'conv-1'),
        storage.setActiveConversation('concurrent-user', 'exercise-2', 'conv-2'),
        storage.setActiveConversation('concurrent-user', 'exercise-3', 'conv-3'),
      ]);

      const doc = await db.collection(TEST_COLLECTION).doc('concurrent-user').get();
      const data = doc.data();

      // All should be set (transactions should handle conflicts)
      expect(data?.activeConversations?.['exercise-1']).toBe('conv-1');
      expect(data?.activeConversations?.['exercise-2']).toBe('conv-2');
      expect(data?.activeConversations?.['exercise-3']).toBe('conv-3');
    });
  });
});
