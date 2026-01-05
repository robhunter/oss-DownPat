import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import type { User, ServerAuthProvider, ExerciseStorage, ConversationStorage } from '@downpat/core';
import { createDownpatRouter, attachSocketIO } from '@downpat/express';
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
 * Mock Auth Provider for development.
 * In production, replace with Firebase Auth or your own implementation.
 */
const mockAuthProvider: ServerAuthProvider = {
  validateToken: async (token: string): Promise<User> => {
    // For demo purposes, accept any token
    // In production, validate against Firebase Auth or your auth system
    if (token === 'demo-token') {
      return {
        userId: 'demo-user',
        displayName: 'Demo User',
        isAdmin: false,
        isSubscriber: true,
      };
    }

    if (token === 'admin-token') {
      return {
        userId: 'admin-user',
        displayName: 'Admin User',
        isAdmin: true,
        isSubscriber: true,
      };
    }

    throw new Error('Invalid token');
  },
  getDemoUser: () => ({
    userId: 'demo-user',
    displayName: 'Demo User',
    isAdmin: false,
    isSubscriber: true,
  }),
};

/**
 * In-memory storage for development.
 * In production, use FirebaseExerciseStorage and FirebaseConversationStorage.
 */
const exercises = new Map();
const exerciseMetadata = new Map();
const conversations = new Map();

const mockExerciseStorage: ExerciseStorage = {
  async getExercise(exerciseId: string) {
    return exercises.get(exerciseId) || null;
  },
  async getExerciseBySlug(slug: string, publishedOnly?: boolean) {
    const metadata = exerciseMetadata.get(slug);
    if (!metadata) return null;
    if (publishedOnly) {
      return metadata.published ? exercises.get(metadata.published) || null : null;
    }
    return exercises.get(metadata.draft) || null;
  },
  async getExerciseMetadata(slug: string) {
    return exerciseMetadata.get(slug) || null;
  },
  async getExercises() {
    return Array.from(exercises.values());
  },
  async createExercise(exercise) {
    exercises.set(exercise.exerciseId, exercise);
    exerciseMetadata.set(exercise.slug, {
      draft: exercise.exerciseId,
    });
  },
  async updateExercise(exercise) {
    exercises.set(exercise.exerciseId, exercise);
  },
  async publishExercise(slug: string) {
    const metadata = exerciseMetadata.get(slug);
    if (!metadata) throw new Error('Exercise not found');
    const draft = exercises.get(metadata.draft);
    const publishedId = `${metadata.draft}-published`;
    exercises.set(publishedId, { ...draft });
    exerciseMetadata.set(slug, { ...metadata, published: publishedId });
  },
  async unpublishExercise(slug: string) {
    const metadata = exerciseMetadata.get(slug);
    if (!metadata?.published) throw new Error('Exercise not published');
    exercises.delete(metadata.published);
    exerciseMetadata.set(slug, { draft: metadata.draft });
  },
  async restoreFromPublished(slug: string) {
    const metadata = exerciseMetadata.get(slug);
    if (!metadata?.published) throw new Error('No published version');
    const published = exercises.get(metadata.published);
    exercises.set(metadata.draft, { ...published });
  },
  async deleteExercise(slug: string) {
    const metadata = exerciseMetadata.get(slug);
    if (metadata) {
      exercises.delete(metadata.draft);
      if (metadata.published) exercises.delete(metadata.published);
      exerciseMetadata.delete(slug);
    }
  },
};

const mockConversationStorage: ConversationStorage = {
  async getConversation(conversationId: string) {
    return conversations.get(conversationId) || null;
  },
  async getConversationsByUser(userId: string) {
    return Array.from(conversations.values()).filter((c: { userId: string }) => c.userId === userId);
  },
  async getConversationsByExercise(exerciseId: string) {
    return Array.from(conversations.values()).filter((c: { exerciseId: string }) => c.exerciseId === exerciseId);
  },
  async createConversation(conversation) {
    conversations.set(conversation.conversationId, conversation);
  },
  async updateConversation(conversationId: string, updates) {
    const conversation = conversations.get(conversationId);
    if (conversation) {
      Object.assign(conversation, updates);
    }
  },
  async addMessage(conversationId: string, message) {
    const conversation = conversations.get(conversationId);
    if (conversation) {
      conversation.messages.push(message);
    }
  },
  async deleteConversation(conversationId: string) {
    conversations.delete(conversationId);
  },
};

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
  // Create AI adapter registry
  const aiRegistry = await createAdapterRegistry(aiConfig);

  // Create DownPat router
  const downpat = createDownpatRouter({
    serverAuth: mockAuthProvider,
    exerciseStorage: mockExerciseStorage,
    conversationStorage: mockConversationStorage,
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

  return { downpat, aiRegistry };
}

// Only start server when run directly (not when imported for tests)
let server: ReturnType<typeof createServer> | null = null;

const currentFile = fileURLToPath(import.meta.url);
const isMainModule =
  process.argv[1] === currentFile ||
  process.argv[1]?.endsWith('/tsx') ||
  process.argv[1]?.includes('tsx/');

if (isMainModule) {
  initializeDownpat().then(() => {
    const httpServer = createServer(app);

    // Attach Socket.io for real-time conversation
    attachSocketIO(httpServer, {
      serverAuth: mockAuthProvider,
      exerciseStorage: mockExerciseStorage,
      conversationStorage: mockConversationStorage,
    });

    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api/downpat`);
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

export { app, server, startServer, stopServer, mockAuthProvider, mockExerciseStorage };
