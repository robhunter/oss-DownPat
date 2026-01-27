# DownPat

Open source conversational AI training platform for building immersive learning experiences.

## Overview

DownPat provides a complete toolkit for building AI-powered training applications where users practice conversations with AI coaches. It supports multiple message types (conversation, commentary, summaries), real-time updates via Socket.io, and comprehensive admin tools.

## Packages

| Package | Description |
|---------|-------------|
| `@downpat/express` | Express router, Socket.io, and AI adapters (server) |
| `@downpat/react` | React components, hooks, and routing (client) |
| `@downpat/firebase-storage` | Firebase Firestore storage implementation |
| `@downpat/core` | Core types and interfaces (included automatically) |
| `@downpat/ai-adapters` | OpenAI, Anthropic, and Gemini adapters (included in express) |
| `@downpat/ui-components` | React UI components (included in react) |
| `@downpat/admin-ui` | Admin interface components (included in react) |
| `@downpat/api-client` | API client for server communication (included in react) |

## Quick Start

### Installation

```bash
# Server
npm install @downpat/express @downpat/firebase-storage

# Client
npm install @downpat/react
```

That's it! All other packages are included as dependencies.

### Server Setup

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

// Initialize DownPat with all dependencies
const { httpServer } = await createDownpatServer({
  app,
  basePath: '/api/downpat',
  serverAuth: createMockAuthProvider(), // Replace with real auth in production
  exerciseStorage,
  conversationStorage,
  userStateStorage,
  aiAdapters,
});

httpServer.listen(3001);
```

### Client Setup

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DownpatRoutes } from '@downpat/react';
import '@downpat/ui-components/styles';
import '@downpat/admin-ui/styles';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Your app routes */}
        <Route path="/" element={<Home />} />

        {/* DownPat routes */}
        <Route
          path="/downpat/*"
          element={
            <DownpatRoutes
              authWrapper={YourProtectedRoute}
              adminAuthWrapper={YourAdminRoute}
              basePath="/downpat"
              getAuthToken={async () => localStorage.getItem('token')}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### AI Integration

```typescript
import { createAdapterRegistry } from '@downpat/ai-adapters';

const registry = await createAdapterRegistry({
  openai: { apiKey: process.env.OPENAI_API_KEY },
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  gemini: { apiKey: process.env.GEMINI_API_KEY },
});

// Use any configured provider
const adapter = registry.getAdapterForModel('gpt-4');
const result = await adapter.complete({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
  onChunk: (chunk) => console.log(chunk), // Streaming
});
```

## Core Concepts

### Message Types

- **USER** - User messages
- **CONVERSATION** - AI responses visible to the user
- **COMMENTARY** - Coach feedback (can be hidden/shown)
- **SUMMARY** - Conversation summaries
- **SIMPLE** - Simple coach messages (Talk to Coach feature)
- **MODERATION** - Content moderation results
- **STARTER** - Conversation starters
- **CONTEXT** - Contextual information

### Exercises

Exercises define training scenarios with guidelines, welcome messages, conversation starters, and AI tasks.

### Draft/Published Workflow

Exercises support a draft/published workflow - changes are saved to drafts, then published to make live.

## Development

### Prerequisites

- Node.js 18+
- npm 8+

### Setup

```bash
# Clone and install
git clone https://github.com/your-org/downpat.git
cd downpat
npm install

# Build all packages
npm run build --workspaces

# Run tests (191 tests across all packages)
npm test --workspaces
```

### Running the Example App

```bash
# Start the development server (port 3001)
npm run dev:server

# In another terminal, start the client (port 5173)
npm run dev:client
```

Open http://localhost:5173 in your browser.

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for GPT models and moderation
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models
- `GEMINI_API_KEY` - Google API key for Gemini models

## Project Structure

```
packages/
├── core/              # Types, interfaces, controllers
├── firebase-storage/  # Firestore storage implementation
├── express/           # Express router & Socket.io
├── ui-components/     # React components & theme generator
├── admin-ui/          # Admin components
└── ai-adapters/       # AI provider adapters

example-app/
├── server/            # Express API server
└── client/            # React + Vite client
```

## Verification

See [VERIFICATION.md](VERIFICATION.md) for testing and browser verification instructions.

## License

MIT
