import type { Firestore } from 'firebase-admin/firestore';
import type { Conversation, Message, ConversationStorage } from '@downpat/core';

/**
 * Firebase implementation of ConversationStorage.
 *
 * Data structure:
 * - conversations/{conversationId} - Conversation documents with embedded messages
 */
export class FirebaseConversationStorage implements ConversationStorage {
  private collection: string = 'conversations';

  constructor(private db: Firestore) {}

  async getConversation(conversationId: string): Promise<Conversation | null> {
    const doc = await this.db.collection(this.collection).doc(conversationId).get();
    return doc.exists ? (doc.data() as Conversation) : null;
  }

  async createConversation(conversation: Conversation): Promise<void> {
    await this.db
      .collection(this.collection)
      .doc(conversation.conversationId)
      .create(conversation);
  }

  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<void> {
    await this.db.collection(this.collection).doc(conversationId).update(updates);
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    const conversationRef = this.db.collection(this.collection).doc(conversationId);

    await this.db.runTransaction(async (txn) => {
      const doc = await txn.get(conversationRef);
      if (!doc.exists) {
        throw new Error('Conversation not found');
      }

      const conversation = doc.data() as Conversation;
      const messages = [...conversation.messages, message];

      txn.update(conversationRef, {
        messages,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as Conversation);
  }

  async getConversationsByExercise(exerciseId: string): Promise<Conversation[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('exerciseId', '==', exerciseId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as Conversation);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.db.collection(this.collection).doc(conversationId).delete();
  }
}
