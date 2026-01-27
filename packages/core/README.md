# @downpat/core

Core types, interfaces, and utilities for DownPat - an AI-powered conversational training platform.

## Installation

```bash
npm install @downpat/core
```

**Note:** You typically don't need to install this directly. It's included as a dependency of `@downpat/express` and `@downpat/react`.

## What's Included

- **Types**: `Exercise`, `Conversation`, `Message`, `User`, `Task`, etc.
- **Interfaces**: `ExerciseStorage`, `ConversationStorage`, `UserStateStorage`, `AIAdapter`
- **Utilities**: Message formatting, validation schemas (Zod)
- **Constants**: Message types, default available models

## Usage

```typescript
import type { Exercise, Message, User } from '@downpat/core';
import { MessageType, DEFAULT_AVAILABLE_MODELS } from '@downpat/core';

// Type your data
const message: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello!',
  type: MessageType.USER,
  timestamp: new Date(),
};
```

## Documentation

See the [main repository](https://github.com/robhunter/oss-DownPat) for full documentation.

## License

MIT
