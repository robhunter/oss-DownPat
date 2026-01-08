import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { User, ExerciseStorage, ConversationStorage } from '@downpat/core';
import { createInMemoryStorage } from '@downpat/core';
import { createDownpatRouter, attachSocketIO, createMockAuthProvider } from '@downpat/express';
import { FirebaseExerciseStorage, FirebaseConversationStorage } from '@downpat/firebase-storage';
import { createAdapterRegistry, type AIProviderConfig } from '@downpat/ai-adapters';

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
 * Initialize Firebase Admin SDK.
 * Uses GOOGLE_APPLICATION_CREDENTIALS environment variable for service account.
 */
function initializeFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credentialsBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is required');
  }

  if (credentialsBase64) {
    // Use base64-encoded credentials (for Docker/CI)
    const serviceAccount = JSON.parse(
      Buffer.from(credentialsBase64, 'base64').toString('utf8')
    );
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  } else if (credentialsPath) {
    // Use file path credentials
    initializeApp({
      credential: cert(credentialsPath),
      projectId,
    });
  } else {
    throw new Error(
      'Either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_BASE64 must be set'
    );
  }

  return getFirestore();
}

/**
 * Storage selection based on NODE_ENV.
 * - test: in-memory storage
 * - development/production: Firebase storage
 */
let exerciseStorage: ExerciseStorage;
let conversationStorage: ConversationStorage;

function getStorage() {
  if (!exerciseStorage || !conversationStorage) {
    if (process.env.NODE_ENV === 'test') {
      const storage = createInMemoryStorage();
      exerciseStorage = storage.exerciseStorage;
      conversationStorage = storage.conversationStorage;
    } else {
      const db = initializeFirebase();
      exerciseStorage = new FirebaseExerciseStorage(db);
      conversationStorage = new FirebaseConversationStorage(db);
    }
  }
  return { exerciseStorage, conversationStorage };
}

/**
 * AI Provider Configuration.
 * In production, set these via environment variables.
 */
const aiConfig: AIProviderConfig = {
  openai: process.env.OPENAI_API_KEY
    ? { apiKey: process.env.OPENAI_API_KEY }
    : undefined,
  anthropic: process.env.ANTHROPIC_API_KEY
    ? { apiKey: process.env.ANTHROPIC_API_KEY }
    : undefined,
  gemini: process.env.GEMINI_API_KEY
    ? { apiKey: process.env.GEMINI_API_KEY }
    : undefined,
};

/**
 * Initialize DownPat router
 */
async function initializeDownpat() {
  // Initialize storage (lazy initialization)
  const { exerciseStorage, conversationStorage } = getStorage();

  // Create AI adapter registry
  const aiRegistry = await createAdapterRegistry(aiConfig);

  // Create DownPat router
  const downpat = createDownpatRouter({
    serverAuth: mockAuthProvider,
    exerciseStorage,
    conversationStorage,
  });

  // Mount DownPat API routes
  app.use('/api/downpat', downpat.router);

  // Log available AI models
  const availableModels = aiRegistry.getAllModels();
  if (availableModels.length > 0) {
    console.log('Available AI models:', availableModels.join(', '));
  } else {
    console.log('No AI providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.');
  }

  return { downpat, aiRegistry, exerciseStorage, conversationStorage };
}

// Only start server when run directly (not when imported for tests)
let server: ReturnType<typeof createServer> | null = null;

const currentFile = fileURLToPath(import.meta.url);
const isMainModule =
  process.argv[1] === currentFile ||
  process.argv[1]?.endsWith('/tsx') ||
  process.argv[1]?.includes('tsx/');

if (isMainModule) {
  initializeDownpat().then(({ aiRegistry, exerciseStorage, conversationStorage }) => {
    const httpServer = createServer(app);

    // Get AI adapter (prefer OpenAI, fall back to any available)
    const aiAdapter = aiRegistry.getAdapterForModel('gpt-4') ||
                      aiRegistry.getAdapterForModel('gpt-4o') ||
                      aiRegistry.getAdapterForModel('gpt-3.5-turbo');

    // Get moderation adapter (OpenAI provides one)
    const moderationAdapter = aiRegistry.getModerationAdapter();

    // Attach Socket.io for real-time conversation
    attachSocketIO(httpServer, {
      serverAuth: mockAuthProvider,
      exerciseStorage,
      conversationStorage,
      aiAdapter,
      moderationAdapter: moderationAdapter || undefined,
      defaultModel: 'gpt-4',
    });

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

    server = httpServer;
  });
}

// For testing - start server on demand
function startServer(port = PORT): void {
  if (server) return;

  const httpServer = createServer(app);
  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  server = httpServer;
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

export { app, server, startServer, stopServer, mockAuthProvider, getStorage };
