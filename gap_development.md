# Development Plan: Critical Gaps

Implementation order:
1. User State Storage (Gap #2)
2. Conversation Persistence & Resumption (Gap #1)
3. Socket.io Edit & Finish Events (Gap #3)

---

## Phase 1: User State Storage

### Overview

Create a minimal user state storage layer to track `activeConversations` per user. This is intentionally minimal - we only store what DownPat needs internally, not user profile data.

### 1.1 Define UserState Type

**File:** `packages/core/src/types/user-state.ts` (new file)

```typescript
/**
 * Minimal internal state tracked by DownPat for each user.
 * This is NOT the full User object - that comes from the host app.
 * We only persist what we need for conversation tracking.
 */
export interface UserState {
  userId: string;
  /** Map of exerciseId -> conversationId for active (non-finished) conversations */
  activeConversations: Record<string, string>;
}
```

**Export from:** `packages/core/src/types/index.ts`

### 1.2 Define UserStateStorage Interface

**File:** `packages/core/src/interfaces/user-state-storage.ts` (new file)

```typescript
import { UserState } from '../types/user-state';

export interface UserStateStorage {
  /**
   * Get user state, creating empty state if user doesn't exist.
   * Returns { userId, activeConversations: {} } for new users.
   */
  getOrCreateUserState(userId: string): Promise<UserState>;

  /**
   * Set the active conversation for an exercise.
   * Called when starting a new conversation.
   */
  setActiveConversation(
    userId: string,
    exerciseId: string,
    conversationId: string
  ): Promise<void>;

  /**
   * Get the active conversation ID for an exercise, if any.
   * Returns null if no active conversation exists.
   */
  getActiveConversation(
    userId: string,
    exerciseId: string
  ): Promise<string | null>;

  /**
   * Clear the active conversation for an exercise.
   * Called when a conversation is explicitly finished (optional -
   * we can also just let getOrStartConversation check the finished flag).
   */
  clearActiveConversation(
    userId: string,
    exerciseId: string
  ): Promise<void>;
}
```

**Export from:** `packages/core/src/interfaces/index.ts`

### 1.3 Firebase Implementation

**File:** `packages/firebase-storage/src/user-state-storage.ts` (new file)

```typescript
import { Firestore } from 'firebase-admin/firestore';
import { UserState, UserStateStorage } from '@downpat/core';

export class FirebaseUserStateStorage implements UserStateStorage {
  private db: Firestore;
  private collection: string;

  constructor(db: Firestore, collection = 'userState') {
    this.db = db;
    this.collection = collection;
  }

  async getOrCreateUserState(userId: string): Promise<UserState> {
    const doc = await this.db.collection(this.collection).doc(userId).get();

    if (!doc.exists) {
      const newState: UserState = {
        userId,
        activeConversations: {},
      };
      await this.db.collection(this.collection).doc(userId).set(newState);
      return newState;
    }

    return doc.data() as UserState;
  }

  async setActiveConversation(
    userId: string,
    exerciseId: string,
    conversationId: string
  ): Promise<void> {
    await this.db.collection(this.collection).doc(userId).set(
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
    const { FieldValue } = await import('firebase-admin/firestore');
    await this.db.collection(this.collection).doc(userId).update({
      [`activeConversations.${exerciseId}`]: FieldValue.delete(),
    });
  }
}
```

**Export from:** `packages/firebase-storage/src/index.ts`

### 1.4 In-Memory Implementation (for testing)

**File:** `packages/core/src/storage/in-memory-user-state.ts` (new file)

```typescript
import { UserState, UserStateStorage } from '../interfaces/user-state-storage';

export class InMemoryUserStateStorage implements UserStateStorage {
  private states: Map<string, UserState> = new Map();

  async getOrCreateUserState(userId: string): Promise<UserState> {
    if (!this.states.has(userId)) {
      this.states.set(userId, { userId, activeConversations: {} });
    }
    return this.states.get(userId)!;
  }

  async setActiveConversation(
    userId: string,
    exerciseId: string,
    conversationId: string
  ): Promise<void> {
    const state = await this.getOrCreateUserState(userId);
    state.activeConversations[exerciseId] = conversationId;
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
    const state = await this.getOrCreateUserState(userId);
    delete state.activeConversations[exerciseId];
  }

  // Test helper
  clear(): void {
    this.states.clear();
  }
}
```

### 1.5 Update Server Configuration

**File:** `packages/express/src/types.ts` - Add to `DownpatServerConfig`:

```typescript
export interface DownpatServerConfig {
  // ... existing fields
  userStateStorage: UserStateStorage;
}
```

**File:** `packages/express/src/router.ts` - Accept userStateStorage in config

### 1.6 Tests

- Unit tests for `InMemoryUserStateStorage`
- Unit tests for `FirebaseUserStateStorage` (with mocked Firestore)
- Integration test: set/get/clear active conversation flow

---

## Phase 2: Conversation Persistence & Resumption

### Overview

Implement `getOrStartConversation` logic that checks for an active, non-finished conversation before creating a new one.

### 2.1 Update ConversationController

**File:** `packages/core/src/controllers/conversation-controller.ts`

Add new method:

```typescript
/**
 * Get an existing active conversation or start a new one.
 *
 * Logic:
 * 1. Check userStateStorage for activeConversations[exerciseId]
 * 2. If found, fetch the conversation
 * 3. If conversation exists and is NOT complete, return it
 * 4. Otherwise, create new conversation and update activeConversations
 */
async getOrStartConversation(
  exerciseId: string,
  user: User,
  userStateStorage: UserStateStorage
): Promise<Conversation> {
  // Check for existing active conversation
  const activeConversationId = await userStateStorage.getActiveConversation(
    user.userId,
    exerciseId
  );

  if (activeConversationId) {
    const existingConversation = await this.conversationStorage.getConversation(
      activeConversationId
    );

    // Resume if exists and not complete
    if (existingConversation && !existingConversation.isComplete) {
      return existingConversation;
    }
  }

  // Create new conversation
  const conversation = await this.startConversation(exerciseId, user);

  // Update active conversation tracking
  await userStateStorage.setActiveConversation(
    user.userId,
    exerciseId,
    conversation.conversationId
  );

  return conversation;
}
```

### 2.2 Add REST Endpoint

**File:** `packages/express/src/routes/conversations.ts`

Add new endpoint:

```typescript
// POST /conversations/get-or-start
// Body: { exerciseId: string } or { exerciseSlug: string }
router.post('/get-or-start', requireSubscriber, async (req, res, next) => {
  try {
    const user = req.user!;
    let exerciseId = req.body.exerciseId;

    // Resolve slug to ID if needed
    if (!exerciseId && req.body.exerciseSlug) {
      const exercise = await config.exerciseStorage.getExerciseBySlug(
        req.body.exerciseSlug,
        !user.isAdmin // publishedOnly for non-admins
      );
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      exerciseId = exercise.exerciseId;
    }

    const conversation = await controller.getOrStartConversation(
      exerciseId,
      user,
      config.userStateStorage
    );

    res.json(conversation);
  } catch (error) {
    next(error);
  }
});
```

### 2.3 Update Socket.io `start-conversation` Event

**File:** `packages/express/src/socket.ts`

Modify `start-conversation` handler to use `getOrStartConversation`:

```typescript
socket.on('start-conversation', async (data: { slug: string; query?: Record<string, string> }) => {
  try {
    if (!socket.data.user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const exercise = await config.exerciseStorage.getExerciseBySlug(
      data.slug,
      !socket.data.user.isAdmin
    );

    if (!exercise) {
      socket.emit('error', { message: 'Exercise not found' });
      return;
    }

    // Use getOrStartConversation instead of always creating new
    const conversation = await controller.getOrStartConversation(
      exercise.exerciseId,
      socket.data.user,
      config.userStateStorage
    );

    // Join the conversation room
    socket.join(`conversation:${conversation.conversationId}`);

    // Check if this is a resumed conversation (has messages already)
    const isResumed = conversation.messages.length > 0;

    if (!isResumed) {
      // New conversation - add welcome message and starter
      // ... existing welcome/starter logic ...
    }

    socket.emit('conversation-started', {
      conversationId: conversation.conversationId,
      messages: conversation.messages,
      talkToCoachEnabled: exercise.talkToCoachEnabled ?? false,
      isResumed, // Let client know if this was resumed
    });
  } catch (error) {
    socket.emit('error', { message: error.message });
  }
});
```

### 2.4 Add `join-conversation` Socket Event

For resuming real-time updates on an existing conversation (e.g., after page refresh):

```typescript
socket.on('join-conversation', async (data: { conversationId: string }) => {
  try {
    if (!socket.data.user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const conversation = await controller.getConversation(
      data.conversationId,
      socket.data.user
    );

    if (!conversation) {
      socket.emit('error', { message: 'Conversation not found' });
      return;
    }

    // Join the room for real-time updates
    socket.join(`conversation:${conversation.conversationId}`);

    // Get exercise for talkToCoachEnabled flag
    const exercise = await config.exerciseStorage.getExercise(
      conversation.exerciseId
    );

    socket.emit('conversation-joined', {
      conversationId: conversation.conversationId,
      messages: conversation.messages,
      isComplete: conversation.isComplete,
      talkToCoachEnabled: exercise?.talkToCoachEnabled ?? false,
    });
  } catch (error) {
    socket.emit('error', { message: error.message });
  }
});
```

### 2.5 Update API Client

**File:** `packages/api-client/src/client.ts`

Add method:

```typescript
async getOrStartConversation(exerciseSlug: string): Promise<Conversation> {
  const response = await this.fetch('/conversations/get-or-start', {
    method: 'POST',
    body: JSON.stringify({ exerciseSlug }),
  });
  return response.json();
}
```

### 2.6 Update React Hooks

**File:** `packages/ui-components/src/hooks/useSocket.ts`

Update `useConversation` hook to:
1. Accept optional `conversationId` for resuming
2. Use `join-conversation` when resuming existing conversation
3. Emit `isResumed` state to consuming components

```typescript
export function useConversation({
  slug,
  conversationId, // New: optional ID for resuming
  socketUrl,
  getToken,
}: UseConversationOptions): UseConversationReturn {
  // ...

  useEffect(() => {
    if (conversationId) {
      // Resume existing conversation
      socket.emit('join-conversation', { conversationId });
    } else if (slug) {
      // Start new or get existing for this exercise
      socket.emit('start-conversation', { slug });
    }
  }, [socket, slug, conversationId]);

  // Handle both conversation-started and conversation-joined
  useEffect(() => {
    const handleStarted = (data) => {
      setConversation({ conversationId: data.conversationId, ... });
      setMessages(data.messages);
      setIsResumed(data.isResumed ?? false);
    };

    const handleJoined = (data) => {
      setConversation({ conversationId: data.conversationId, ... });
      setMessages(data.messages);
      setIsComplete(data.isComplete);
      setIsResumed(true);
    };

    socket.on('conversation-started', handleStarted);
    socket.on('conversation-joined', handleJoined);

    return () => {
      socket.off('conversation-started', handleStarted);
      socket.off('conversation-joined', handleJoined);
    };
  }, [socket]);
}
```

### 2.7 Tests

- Unit test: `getOrStartConversation` returns existing active conversation
- Unit test: `getOrStartConversation` creates new when active is complete
- Unit test: `getOrStartConversation` creates new when no active exists
- Integration test: Full flow with socket events
- E2E test: Navigate away and back, conversation persists

---

## Phase 3: Socket.io Edit & Finish Events

### Overview

Add `edit-message` and `finish-conversation` socket events based on legacy implementation.

### 3.1 Update ConversationController

**File:** `packages/core/src/controllers/conversation-controller.ts`

Add methods:

```typescript
/**
 * Edit a user message in a conversation.
 * Discards all messages after the edited message (AI responses will be regenerated).
 */
async editMessage(
  conversationId: string,
  messageId: string,
  newContent: string,
  user: User
): Promise<{ conversation: Conversation; editedMessageIndex: number }> {
  // Validate ownership
  const metadata = await this.conversationStorage.getConversationMetadata(conversationId);
  if (!metadata || (metadata.userId !== user.userId && !user.isAdmin)) {
    throw new Error('Unauthorized');
  }

  const conversation = await this.conversationStorage.getConversation(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.isComplete) {
    throw new Error('Cannot edit a completed conversation');
  }

  // Find the message to edit
  const messageIndex = conversation.messages.findIndex(
    m => m.messageId === messageId && m.type === 'USER'
  );

  if (messageIndex === -1) {
    throw new Error('User message not found');
  }

  // Keep messages up to (not including) the edited message
  const messagesBeforeEdit = conversation.messages.slice(0, messageIndex);

  // Create the edited message
  const editedMessage: Message = {
    ...conversation.messages[messageIndex],
    content: newContent,
    timestamp: new Date().toISOString(),
  };

  // Update conversation with truncated messages + edited message
  const updatedConversation = await this.conversationStorage.updateConversation(
    conversationId,
    {
      messages: [...messagesBeforeEdit, editedMessage],
      userMessageCount: messagesBeforeEdit.filter(m => m.type === 'USER').length + 1,
    }
  );

  return { conversation: updatedConversation, editedMessageIndex: messageIndex };
}

/**
 * Mark a conversation as complete and run completion tasks.
 */
async finishConversation(
  conversationId: string,
  user: User
): Promise<Conversation> {
  // Validate ownership
  const metadata = await this.conversationStorage.getConversationMetadata(conversationId);
  if (!metadata || (metadata.userId !== user.userId && !user.isAdmin)) {
    throw new Error('Unauthorized');
  }

  const conversation = await this.conversationStorage.getConversation(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.isComplete) {
    throw new Error('Conversation is already complete');
  }

  // Mark as complete
  const updatedConversation = await this.conversationStorage.updateConversation(
    conversationId,
    { isComplete: true }
  );

  return updatedConversation;
}
```

### 3.2 Add Socket Events

**File:** `packages/express/src/socket.ts`

```typescript
/**
 * Edit a previous user message.
 * All messages after the edited message are discarded.
 * The AI will regenerate responses.
 */
socket.on('edit-message', async (data: {
  conversationId: string;
  messageId: string;
  content: string;
}) => {
  try {
    if (!socket.data.user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { conversation, editedMessageIndex } = await controller.editMessage(
      data.conversationId,
      data.messageId,
      data.content,
      socket.data.user
    );

    // Notify client that messages were truncated
    socket.emit('messages-truncated', {
      conversationId: data.conversationId,
      messages: conversation.messages,
      editedMessageIndex,
    });

    // Get exercise for AI regeneration
    const exercise = await config.exerciseStorage.getExercise(
      conversation.exerciseId
    );

    if (!exercise) {
      socket.emit('error', { message: 'Exercise not found' });
      return;
    }

    // Regenerate AI response (similar to send-message flow)
    if (config.aiAdapter && exercise.continuationTasks?.length > 0) {
      // ... AI response generation with streaming ...
      // Same pattern as send-message handler
    }
  } catch (error) {
    socket.emit('error', { message: error.message });
  }
});

/**
 * Explicitly finish a conversation.
 * Runs completion tasks if defined.
 */
socket.on('finish-conversation', async (data: { conversationId: string }) => {
  try {
    if (!socket.data.user) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const conversation = await controller.finishConversation(
      data.conversationId,
      socket.data.user
    );

    // Get exercise for completion tasks
    const exercise = await config.exerciseStorage.getExercise(
      conversation.exerciseId
    );

    // Run completion tasks if defined
    if (config.aiAdapter && exercise?.completionTasks?.length > 0) {
      for (const task of exercise.completionTasks) {
        // Execute each completion task with streaming
        // ... similar to continuation task execution ...
      }
    }

    // Notify completion
    socket.emit('conversation-finished', {
      conversationId: data.conversationId,
      isComplete: true,
    });

    // Broadcast to room (for any other connected clients)
    socket.to(`conversation:${data.conversationId}`).emit('conversation-finished', {
      conversationId: data.conversationId,
      isComplete: true,
    });
  } catch (error) {
    socket.emit('error', { message: error.message });
  }
});
```

### 3.3 Update Client Hooks

**File:** `packages/ui-components/src/hooks/useSocket.ts`

Add to `useConversation` hook:

```typescript
const editMessage = useCallback((messageId: string, newContent: string) => {
  if (!socket || !conversation) return;

  socket.emit('edit-message', {
    conversationId: conversation.conversationId,
    messageId,
    content: newContent,
  });
}, [socket, conversation]);

const finishConversation = useCallback(() => {
  if (!socket || !conversation) return;

  socket.emit('finish-conversation', {
    conversationId: conversation.conversationId,
  });
}, [socket, conversation]);

// Handle events
useEffect(() => {
  const handleTruncated = (data) => {
    setMessages(data.messages);
    setIsStreaming(true); // AI will regenerate
  };

  const handleFinished = (data) => {
    setIsComplete(true);
  };

  socket.on('messages-truncated', handleTruncated);
  socket.on('conversation-finished', handleFinished);

  return () => {
    socket.off('messages-truncated', handleTruncated);
    socket.off('conversation-finished', handleFinished);
  };
}, [socket]);

return {
  // ... existing returns
  editMessage,
  finishConversation,
};
```

### 3.4 Tests

- Unit test: `editMessage` truncates messages correctly
- Unit test: `editMessage` rejects non-USER messages
- Unit test: `editMessage` rejects completed conversations
- Unit test: `finishConversation` marks conversation complete
- Unit test: `finishConversation` rejects already-complete conversations
- Integration test: Edit message → AI regenerates response
- Integration test: Finish conversation → completion tasks run

---

## Summary Checklist

### Phase 1: User State Storage
- [ ] Create `UserState` type in `@downpat/core`
- [ ] Create `UserStateStorage` interface in `@downpat/core`
- [ ] Implement `InMemoryUserStateStorage` in `@downpat/core`
- [ ] Implement `FirebaseUserStateStorage` in `@downpat/firebase-storage`
- [ ] Update `DownpatServerConfig` to include `userStateStorage`
- [ ] Write unit tests
- [ ] Update example-app to use new storage

### Phase 2: Conversation Persistence
- [ ] Add `getOrStartConversation` to `ConversationController`
- [ ] Add `POST /conversations/get-or-start` endpoint
- [ ] Update `start-conversation` socket event to use new logic
- [ ] Add `join-conversation` socket event
- [ ] Update `DownpatClient` with new method
- [ ] Update `useConversation` hook for resumption
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E test for persistence flow

### Phase 3: Edit & Finish Events
- [ ] Add `editMessage` to `ConversationController`
- [ ] Add `finishConversation` to `ConversationController`
- [ ] Add `edit-message` socket event
- [ ] Add `finish-conversation` socket event
- [ ] Update `useConversation` hook with new methods
- [ ] Write unit tests
- [ ] Write integration tests
