import type { Firestore } from 'firebase-admin/firestore';
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

    if (!doc.exists) {
      const newState: UserState = {
        userId,
        activeConversations: {},
      };
      await docRef.set(newState);
      return newState;
    }

    return doc.data() as UserState;
  }

  async setActiveConversation(
    userId: string,
    exerciseId: string,
    conversationId: string
  ): Promise<void> {
    const docRef = this.db.collection(this.collection).doc(userId);

    await docRef.set(
      {
        userId,
        [`activeConversations.${exerciseId}`]: conversationId,
      },
      { merge: true }
    );
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
