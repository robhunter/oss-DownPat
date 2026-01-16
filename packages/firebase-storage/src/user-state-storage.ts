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

  async getOrCreateUserState(userId: string): Promise<UserState> {
    const docRef = this.db.collection(this.collection).doc(userId);
    const doc = await docRef.get();

    if (doc.exists) {
      return doc.data() as UserState;
    }

    // Use transaction to safely create if not exists
    return this.db.runTransaction(async (t: Transaction) => {
      const tDoc = await t.get(docRef);
      if (tDoc.exists) {
        return tDoc.data() as UserState;
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
      if (!doc.exists) {
        t.set(docRef, {
          userId,
          activeConversations: {
            [exerciseId]: conversationId,
          },
        });
      } else {
        // update() supports dot notation for nested fields
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

    await docRef.update({
      [`activeConversations.${exerciseId}`]: FieldValue.delete(),
    });
  }
}