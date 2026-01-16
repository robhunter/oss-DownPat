import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import type { User } from '@downpat/core';
import { createDownpatServer, createMockAuthProvider } from '@downpat/express';
import { createFirebaseStorage } from '@downpat/firebase-storage';
import { createAdapterRegistryFromEnv } from '@downpat/ai-adapters';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Hello from DownPat!' });
});

/**
 * Simple demo auth endpoint.
 * Emails containing "@admin" get admin privileges.
 * Any other email gets subscriber access.
 */
app.post('/api/downpat/auth/login', (req, res): void => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  // Simple demo auth based on email domain
  const isAdmin = email.toLowerCase().includes('@admin');
  const displayName = email.split('@')[0].replace(/[._-]/g, ' ');

  const user: User = {
    userId: isAdmin ? 'admin-user' : 'demo-user',
    displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
    isAdmin,
    isSubscriber: true,
  };

  const token = isAdmin ? 'admin-token' : 'demo-token';

  res.json({ token, user });
});

/**
 * Mock Auth Provider for development.
 * In production, replace with Firebase Auth or your own implementation.
 */
const mockAuthProvider = createMockAuthProvider();

/**
 * Initialize and start the server.
 */
async function startServer() {
  // Create storage (auto-detects test mode for in-memory)
  const { exerciseStorage, conversationStorage, userStateStorage } = createFirebaseStorage();

  // Create AI adapter registry (auto-detects API keys from environment)
  const aiRegistry = await createAdapterRegistryFromEnv();

  // Log available AI models
  const availableModels = aiRegistry.getAllModels();
  if (availableModels.length > 0) {
    console.log('Available AI models:', availableModels.join(', '));
  } else {
    console.log('No AI providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.');
  }

  // Get AI adapter (uses preference order: openai > anthropic > gemini)
  const aiAdapter = aiRegistry.getDefaultAdapter();
  const moderationAdapter = aiRegistry.getModerationAdapter();

  // Create DownPat server with all routes and Socket.io
  const { httpServer } = createDownpatServer(app, {
    serverAuth: mockAuthProvider,
    exerciseStorage,
    conversationStorage,
    userStateStorage,
    aiAdapter,
    moderationAdapter: moderationAdapter ?? undefined,
    defaultModel: 'gpt-4',
    availableModels,
  });

  // Start listening
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/downpat`);
    if (aiAdapter) {
      console.log('AI adapter configured for conversations');
    }
    if (moderationAdapter) {
      console.log('Moderation adapter configured for content filtering');
    } else {
      console.log('Warning: No moderation adapter - content will not be filtered');
    }
  });

  return httpServer;
}

// For testing - exports
export { app, mockAuthProvider };

// Start server when run directly
import { fileURLToPath } from 'url';

const currentFile = fileURLToPath(import.meta.url);
const isMainModule =
  process.argv[1] === currentFile ||
  process.argv[1]?.endsWith('/tsx') ||
  process.argv[1]?.includes('tsx/');

if (isMainModule) {
  startServer();
}

// For testing - start server on demand
let server: ReturnType<typeof import('http').createServer> | null = null;

export function startTestServer(port = PORT): void {
  if (server) return;
  startServer().then((s) => {
    server = s;
  });
}

export function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}
