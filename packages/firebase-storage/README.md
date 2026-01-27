# @downpat/firebase-storage

Firebase/Firestore storage implementation for DownPat.

## Installation

```bash
npm install @downpat/firebase-storage
```

## Quick Start

```typescript
import { createFirebaseStorage, initializeFirebaseFromEnv } from '@downpat/firebase-storage';

// Initialize Firebase from environment variables
// Reads FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
initializeFirebaseFromEnv();

// Create storage instances
const { exerciseStorage, conversationStorage, userStateStorage } = createFirebaseStorage();

// Use with @downpat/express
import { createDownpatServer } from '@downpat/express';

await createDownpatServer({
  app,
  exerciseStorage,
  conversationStorage,
  userStateStorage,
  // ... other config
});
```

## What's Included

- **FirebaseExerciseStorage**: CRUD operations for exercises with draft/published workflow
- **FirebaseConversationStorage**: Conversation and message persistence
- **FirebaseUserStateStorage**: User state tracking (active conversations, preferences)
- **createFirebaseStorage()**: Factory function that auto-detects test mode

## Environment Variables

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Optional: Path to service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Test Mode

When `NODE_ENV=test`, `createFirebaseStorage()` returns in-memory implementations for testing without Firebase.

## Documentation

See the [main repository](https://github.com/robhunter/oss-DownPat) for full documentation.

## License

MIT
