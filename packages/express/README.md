# @downpat/express

Express.js server integration for DownPat - includes REST API routes, Socket.io real-time messaging, and AI adapter integration.

## Installation

```bash
npm install @downpat/express @downpat/firebase-storage
```

## Quick Start

```typescript
import express from 'express';
import { createDownpatServer, createMockAuthProvider } from '@downpat/express';
import { createFirebaseStorage } from '@downpat/firebase-storage';
import { createAdapterRegistryFromEnv } from '@downpat/ai-adapters';

const app = express();
app.use(express.json());

// Create storage
const { exerciseStorage, conversationStorage, userStateStorage } = createFirebaseStorage();

// Create AI adapter registry (auto-detects API keys from environment)
const aiAdapters = await createAdapterRegistryFromEnv();

// Initialize DownPat
const { httpServer } = await createDownpatServer({
  app,
  basePath: '/api/downpat',
  serverAuth: createMockAuthProvider(), // Replace with real auth in production
  exerciseStorage,
  conversationStorage,
  userStateStorage,
  aiAdapters,
});

httpServer.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
```

## What's Included

- **createDownpatServer()**: High-level server setup with all dependencies
- **createDownpatRouter()**: Lower-level router for custom setups
- **attachSocketIO()**: Real-time messaging via Socket.io
- **createMockAuthProvider()**: Development/testing auth provider
- **AI Adapters**: OpenAI, Anthropic, and Gemini support (via `@downpat/ai-adapters`)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exercises` | List published exercises |
| GET | `/exercises/:slug` | Get exercise by slug |
| GET | `/exercises/with-metadata` | List all exercises (admin) |
| POST | `/exercises` | Create exercise (admin) |
| PUT | `/exercises/:id` | Update exercise (admin) |
| DELETE | `/exercises/:slug` | Delete exercise (admin) |
| POST | `/exercises/:slug/publish` | Publish exercise (admin) |
| GET | `/models` | List available AI models |

## Socket.io Events

- `start-conversation`: Begin a new conversation
- `join-conversation`: Resume existing conversation
- `send-message`: Send user message
- `message`: Receive AI response (streamed)

## Production Considerations

### Rate Limiting

`@downpat/express` does not include rate limiting middleware. This is intentional — rate limiting strategies vary widely by deployment (API gateway, reverse proxy, application-level) and bundling one would likely conflict with your existing setup.

You should add rate limiting before exposing the server to untrusted traffic. For example, with `express-rate-limit`:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});

app.use('/api/downpat', limiter);
```

At minimum, rate limit the authentication and conversation creation endpoints to prevent brute-force and abuse.

### Multi-Tab / Multi-Device Streaming

AI response streaming is coordinated per Socket.io connection. Each browser tab or device opens its own connection with an independent stream tracker. This means:

- Within a single tab, rapid messages correctly abort the previous AI stream before starting a new one.
- Across multiple tabs or devices on the same conversation, each connection streams independently. This can result in duplicate AI responses being saved if the same user sends messages from two tabs simultaneously.

If your application needs cross-connection coordination (e.g., ensuring only one AI stream runs per conversation globally), you'll need to implement a shared stream registry (e.g., backed by Redis) and integrate it with the Socket.io layer.

## Documentation

See the [main repository](https://github.com/robhunter/oss-DownPat) for full documentation.

## License

MIT
