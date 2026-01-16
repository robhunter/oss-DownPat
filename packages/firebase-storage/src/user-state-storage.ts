import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserState, UserStateStorage } from '@downpat/core';

/**
 * Firebase implementation of UserStateStorage.
 *
 * Data structure:
 * - userState/{userId} - UserState documents
 *   - userId: string
 *   - activeConversations: { [exerciseId]: conversationId }
 */
export class FirebaseUserStateStorage implements UserStateStorage {
  private collection: string;

  constructor(
    private db: Firestore,
    collection = 'userState'
  ) {
    this.collection = collection;
  }

  /**
   * Sanitize raw Firestore data into a valid UserState.
   * Ensures activeConversations exists even if missing from stored data.
   */
  private sanitizeUserState(userId: string, data: FirebaseFirestore.DocumentData | undefined): UserState {
    return {
      userId,
      activeConversations: data?.activeConversations ?? {},
    };
  }

  async getOrCreateUserState(userId: string): Promise<UserState> {
    const docRef = this.db.collection(this.collection).doc(userId);
    const doc = await docRef.get();

    if (doc.exists) {
      return this.sanitizeUserState(userId, doc.data());
    }

    // Use transaction to safely create if not exists
    return this.db.runTransaction(async (t: Transaction) => {
      const tDoc = await t.get(docRef);
      if (tDoc.exists) {
        return this.sanitizeUserState(userId, tDoc.data());
      }
      const newState: UserState = {
        userId,
        activeConversations: {},
      };
      t.set(docRef, newState);
      return newState;
    });
  }

  async setActiveConversation(
    userId: string,
    exerciseId: string,
    conversationId: string
  ): Promise<void> {
    const docRef = this.db.collection(this.collection).doc(userId);

    // Use transaction to safely update nested field without overwriting other conversations
    await this.db.runTransaction(async (t: Transaction) => {
      const doc = await t.get(docRef);
      const data = doc.data();

      if (!doc.exists || !data?.activeConversations) {
        // Document doesn't exist OR activeConversations field is missing (legacy data)
        // Use set to create/initialize the structure
        const existingConversations = data?.activeConversations ?? {};
        t.set(docRef, {
          userId,
          activeConversations: {
            ...existingConversations,
            [exerciseId]: conversationId,
          },
        });
      } else {
        // Document exists with activeConversations - safe to use update with dot notation
        t.update(docRef, {
          [`activeConversations.${exerciseId}`]: conversationId,
        });
      }
    });
  }

  async getActiveConversation(
    userId: string,
    exerciseId: string
  ): Promise<string | null> {
    const state = await this.getOrCreateUserState(userId);
    return state.activeConversations[exerciseId] || null;
  }

  async clearActiveConversation(
    userId: string,
    exerciseId: string
  ): Promise<void> {
    const docRef = this.db.collection(this.collection).doc(userId);

    try {
      await docRef.update({
        [`activeConversations.${exerciseId}`]: FieldValue.delete(),
      });
    } catch (error) {
      // If document doesn't exist, there's nothing to clear - that's fine
      if ((error as { code?: number }).code === 5) {
        // Firestore NOT_FOUND error code
        return;
      }
      throw error;
    }
  }
}