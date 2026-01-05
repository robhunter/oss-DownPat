# DownPat Open Source - Implementation Plan

## 🎯 Overview

This implementation plan builds the DownPat open source packages based on all architectural decisions documented in [NEXT_STEPS.md](NEXT_STEPS.md). The plan is organized into milestones that can be executed sequentially, with Milestone 0 establishing verification infrastructure for both human and agent developers.

**Reference Documentation:**
- [NEXT_STEPS.md](NEXT_STEPS.md) - All architectural decisions
- [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) - Authentication implementation guide
- [CONVERSATION_PATTERNS.md](CONVERSATION_PATTERNS.md) - Task system details

---

## 📋 Package Structure (from NEXT_STEPS.md)

```
@downpat/
├── core                 # Types, constants, controllers (framework-agnostic)
├── express              # Express integration (HTTP routes + Socket.io)
├── firebase-storage     # Firebase implementation (recommended storage)
├── ui-components        # React conversation UI components
├── admin-ui            # React admin UI components
└── example-app         # Reference implementation
```

---

## 🏢 Architecture Notes

### Single Organization Model

This open source release uses a **single-organization model** (not multi-tenant). Each deployment serves one organization.

**Key implications:**
- One Firebase project per deployment
- No subdomain-based routing
- No organization switching
- Storage interfaces don't require orgId parameter (simplified from original multi-tenant design)
- All data lives in a single namespace within the Firebase project

### Build Tooling

**Vite** is used for the React client application (example-app and UI component development). This is acceptable as Vite was already used in the original codebase. The example-app runs on port 5173 (Vite default), while the API server runs on port 3001.

---

## 🚀 MILESTONE 0: Verification Infrastructure Setup

**Goal:** Establish verification tools that work for both agent (Docker) and human (Mac) to confidently validate work throughout implementation.

**Why First:** This is a **prototype for future coding agents**, documenting how to properly verify work beyond simple curl requests. Solves three key gaps:
1. ✅ Agent can run tests in Docker
2. ✅ Human can run tests on Mac
3. ✅ Agent can verify browser experience (CSS loaded, JS executing)

### 0.1: Repository Setup

**Tasks:**
- [ ] Create new repository (not in .DownPatNode)
- [ ] Initialize npm workspace monorepo
- [ ] Set up TypeScript configuration (shared tsconfig.json)
- [ ] Configure ESLint and Prettier
- [ ] Add .gitignore
- [ ] Add MIT LICENSE file
- [ ] Create initial README.md

**Directory Structure:**
```
downpat-oss/
├── packages/
│   └── (packages will go here)
├── example-app/
│   ├── server/
│   └── client/
├── package.json         # Workspace root
├── tsconfig.json        # Shared TypeScript config
├── .eslintrc.js
├── .prettierrc
├── LICENSE (MIT)
└── README.md
```

**Verification:**
- Agent: Run `npm install` in Docker, verify no errors
- Human: Run `npm install` on Mac, verify no errors

---

### 0.2: Testing Infrastructure

**Tasks:**
- [ ] Install Vitest + Testing Library dependencies
- [ ] Create shared Vitest config (`vitest.config.ts`)
- [ ] Set up test utilities
- [ ] Create `npm test` script that works in Docker and on Mac
- [ ] Write sample test to verify setup

**Dependencies:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^23.0.0"
  }
}
```

**Vitest Config (vitest.config.ts):**
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

**Verification:**
- Agent (Docker): `npm test` runs and passes
- Human (Mac): `npm test` runs and passes
- Document any Docker-specific issues in VERIFICATION.md

---

### 0.3: Example App Scaffold

**Tasks:**
- [ ] Create example-app/server (Express backend)
- [ ] Create example-app/client (React frontend)
- [ ] Set up build scripts
- [ ] Configure to run on port 5173 (Vite default, Docker port forward)
- [ ] Add "Hello World" API endpoint
- [ ] Add basic React UI with button interaction

**Example App Structure:**
```
example-app/
├── server/
│   ├── src/
│   │   └── index.ts          # Express server (API on port 3001)
│   ├── package.json
│   └── tsconfig.json
└── client/
    ├── src/
    │   ├── main.tsx           # React entry point
    │   ├── App.tsx            # Basic UI with button
    │   └── index.css          # Tailwind imports
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

**Server (example-app/server/src/index.ts):**
```typescript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;  // API server port (client runs on 5173)

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hello from DownPat!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Client (example-app/client/src/App.tsx):**
```typescript
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [health, setHealth] = useState<string>('');

  const checkHealth = async () => {
    const res = await fetch('http://localhost:3001/api/health');
    const data = await res.json();
    setHealth(data.message);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600">
        DownPat Example App
      </h1>

      <div className="mt-4">
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Clicked {count} times
        </button>
      </div>

      <div className="mt-4">
        <button
          onClick={checkHealth}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Check Server
        </button>
        {health && <p className="mt-2">Server says: {health}</p>}
      </div>
    </div>
  );
}

export default App;
```

**Tailwind Setup (example-app/client/src/index.css):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Verification:**
- Agent (Docker): `npm run dev:server` starts on port 3001 (API)
- Agent (Docker): `npm run dev:client` starts on port 5173 (UI)
- Human (Mac): Same commands work
- Both can access http://localhost:5173 (UI) and http://localhost:3001 (API)

---

### 0.4: Browser Verification with shot-scraper

**Tasks:**
- [ ] Install shot-scraper on Mac (human)
- [ ] Install shot-scraper in Docker (agent)
- [ ] Create verification script
- [ ] Take screenshot of example app
- [ ] Verify CSS is loaded (button is blue, not unstyled)
- [ ] Verify JavaScript is working (button click increments counter)
- [ ] Document process in VERIFICATION.md

**Installation:**

Mac (human):
```bash
brew install shot-scraper
```

Docker (agent) - add to Dockerfile or install script:
```bash
pip install shot-scraper
playwright install chromium
```

**Verification Script (scripts/verify-browser.sh):**
```bash
#!/bin/bash
set -e

echo "🌐 Verifying browser experience..."

# Ensure API server is running
curl -f http://localhost:3001/api/health || {
  echo "❌ API server not running on port 3001"
  exit 1
}

# Ensure client is running (check if Vite dev server responds)
curl -f http://localhost:5173 || {
  echo "❌ Client not running on port 5173"
  exit 1
}

# Take screenshot of the client UI (port 5173)
shot-scraper http://localhost:5173 \
  --output verification-screenshots/app.png \
  --width 1280 \
  --height 800 \
  --wait 2000

echo "✅ Screenshot saved to verification-screenshots/app.png"

# Verify screenshot exists and is not empty
if [ ! -f verification-screenshots/app.png ]; then
  echo "❌ Screenshot not created"
  exit 1
fi

# Check file size (should be > 10KB if rendered properly)
SIZE=$(wc -c < verification-screenshots/app.png)
if [ $SIZE -lt 10000 ]; then
  echo "❌ Screenshot too small ($SIZE bytes) - likely not rendered"
  exit 1
fi

echo "✅ Browser verification complete!"
echo "👀 Review screenshot: open verification-screenshots/app.png"
```

**Verification Checklist (VERIFICATION.md will document):**
- [ ] Screenshot shows styled page (blue button visible)
- [ ] Text is readable (not default browser font only)
- [ ] Layout is correct (Tailwind applied)
- [ ] No console errors in screenshot

---

### 0.5: Create VERIFICATION.md

**Note:** VERIFICATION.md is a **separate file** in the repository root, not part of this implementation plan. It serves as standalone documentation for both human developers and AI coding agents.

**Tasks:**
- [ ] Create VERIFICATION.md file in repository root
- [ ] Document how agent runs tests in Docker
- [ ] Document how human runs tests on Mac
- [ ] Document browser verification process
- [ ] Include troubleshooting section
- [ ] Add examples of what "good" looks like

**VERIFICATION.md Contents:**

```markdown
# Verification Guide

This guide shows both human developers (on Mac) and AI coding agents (in Docker) how to verify their work.

## 🎯 Goal

Ensure that:
1. ✅ Tests run in both Docker and Mac
2. ✅ Example app runs in both environments
3. ✅ Browser actually works (CSS loaded, JavaScript executing)

## 🧪 Running Tests

### Agent (in Docker)

```bash
npm test
```

**Expected output:**
```
✓ example.test.ts (1 test)
   ✓ sample test passes

Test Files  1 passed (1)
     Tests  1 passed (1)
```

### Human (on Mac)

Same command:
```bash
npm test
```

### Troubleshooting Tests

**Issue**: Tests hang in Docker
- **Solution**: Use `:direct` scripts if available, or check NX cache issues

**Issue**: jsdom errors
- **Solution**: Verify `jsdom` is installed: `npm install --save-dev jsdom`

---

## 🚀 Running Example App

### Agent (in Docker)

Terminal 1 - Server:
```bash
cd example-app/server
npm run dev
```

Terminal 2 - Client:
```bash
cd example-app/client
npm run dev
```

**Server runs on**: http://localhost:3001 (API)
**Client runs on**: http://localhost:5173 (UI - Vite default, Docker forwarded port)

### Human (on Mac)

Same commands work. App is accessible at same URLs.

### Troubleshooting App

**Issue**: Port 5173 not accessible from Docker
- **Solution**: Verify port 5173 is forwarded in Docker config

**Issue**: CORS errors
- **Solution**: Ensure server has `cors()` middleware enabled

---

## 🌐 Browser Verification (Critical!)

**Why:** `curl` requests can return 200 OK even when CSS fails to load or JavaScript is broken. We need to verify the actual browser experience.

### Setup (One-time)

**Human (Mac):**
```bash
brew install shot-scraper
```

**Agent (Docker):**
```bash
pip install shot-scraper
playwright install chromium
```

### Verification Process

1. **Start the app** (both server and client)

2. **Wait for app to be ready** (2-3 seconds)

3. **Run verification script:**
   ```bash
   ./scripts/verify-browser.sh
   ```

4. **Check the screenshot:**
   ```bash
   open verification-screenshots/app.png
   ```

### What "Good" Looks Like

✅ **Good screenshot:**
- Blue button is visible (Tailwind CSS loaded)
- Text is styled (font, colors applied)
- Layout is correct (padding, spacing)
- No blank white page

❌ **Bad screenshot:**
- Unstyled HTML (default Times New Roman font)
- No colors (black text on white only)
- No button styling (plain HTML button)
- Blank or error page

### Example Verification

```bash
# Good output
🌐 Verifying browser experience...
✅ Server is running
✅ Screenshot saved to verification-screenshots/app.png
✅ Screenshot is 45KB (properly rendered)
✅ Browser verification complete!
👀 Review screenshot: open verification-screenshots/app.png
```

### Manual Checks (Human)

After screenshot verification, human should manually test:
1. Click the counter button → count increments
2. Click "Check Server" → message appears
3. No console errors in browser dev tools

---

## 📝 Testing Checklist

Before considering work complete, verify:

- [ ] `npm test` passes in Docker
- [ ] `npm test` passes on Mac
- [ ] `npm run dev:server` starts without errors
- [ ] `npm run dev:client` starts without errors
- [ ] curl http://localhost:3001/api/health returns 200 OK
- [ ] shot-scraper screenshot shows styled page
- [ ] Screenshot shows blue button (CSS loaded)
- [ ] Screenshot file is > 10KB (not blank/error)
- [ ] Manual browser test: counter button works
- [ ] Manual browser test: server health check works

---

## 🔧 Common Issues

### Docker-specific Issues

**Issue**: Playwright fails in Docker
```
Error: browserType.launch: Executable doesn't exist
```
**Solution**: Install Chromium dependencies
```bash
playwright install-deps chromium
playwright install chromium
```

**Issue**: Tests timeout in Docker
**Solution**: Increase timeout in vitest.config.ts:
```typescript
test: {
  testTimeout: 30000
}
```

### Mac-specific Issues

**Issue**: shot-scraper not found
**Solution**: Install via Homebrew:
```bash
brew install shot-scraper
```

**Issue**: Port already in use
**Solution**: Kill process on port 5173:
```bash
lsof -ti:5173 | xargs kill -9
```

---

## 📸 Screenshot Examples

### Good Example
![Good Screenshot](verification-screenshots/good-example.png)
- Styled button (blue with rounded corners)
- Proper spacing and layout
- Custom fonts applied

### Bad Example
![Bad Screenshot](verification-screenshots/bad-example.png)
- Unstyled HTML only
- No CSS loaded
- Default browser appearance

---

## ✅ Success Criteria

You can confidently say "it works" when:
1. All tests pass (both environments)
2. App runs (both environments)
3. Screenshot shows styled, interactive UI
4. Manual browser test confirms JavaScript works
```

---

### 0.6: Unit Tests for Example App

**Tasks:**
- [ ] Write tests for server health endpoint
- [ ] Write tests for React App component
- [ ] Verify tests pass in Docker and Mac
- [ ] Document test patterns

**Server Test (example-app/server/src/index.test.ts):**
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Import or recreate app setup
const app = express();
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hello from DownPat!' });
});

describe('Health Endpoint', () => {
  it('returns OK status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'Hello from DownPat!'
    });
  });
});
```

**Client Test (example-app/client/src/App.test.tsx):**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders title', () => {
    render(<App />);
    expect(screen.getByText(/DownPat Example App/i)).toBeInTheDocument();
  });

  it('increments counter on button click', () => {
    render(<App />);
    const button = screen.getByText(/Clicked 0 times/i);

    fireEvent.click(button);

    expect(screen.getByText(/Clicked 1 times/i)).toBeInTheDocument();
  });
});
```

**Verification:**
- Agent: `npm test` passes all tests
- Human: `npm test` passes all tests
- Both: Test output is clear and readable

---

### Milestone 0 Completion Criteria

✅ **All checks must pass before proceeding to Milestone 1:**

**Repository:**
- [ ] Git repository initialized
- [ ] npm workspace configured
- [ ] TypeScript compiles without errors
- [ ] Linting passes

**Testing:**
- [ ] Vitest installed and configured
- [ ] `npm test` works in Docker
- [ ] `npm test` works on Mac
- [ ] Sample tests pass in both environments

**Example App:**
- [ ] Server runs on port 3001 (API)
- [ ] Client builds and runs
- [ ] Health endpoint returns 200 OK
- [ ] React UI renders with Tailwind styles
- [ ] Button click increments counter
- [ ] "Check Server" button fetches data

**Browser Verification:**
- [ ] shot-scraper installed (Docker and Mac)
- [ ] `verify-browser.sh` script works
- [ ] Screenshot shows styled page (CSS loaded)
- [ ] Screenshot shows blue button
- [ ] Screenshot file is > 10KB

**Documentation:**
- [ ] VERIFICATION.md created
- [ ] Testing process documented
- [ ] Browser verification documented
- [ ] Troubleshooting section complete
- [ ] Examples of "good" vs "bad" included

**Human Validation:**
- [ ] Human reviews screenshot
- [ ] Human manually tests app in browser
- [ ] Human confirms JavaScript works (counter increments)
- [ ] No console errors in browser dev tools

---

## 🎯 MILESTONE 1: Core Package Foundation

**Goal:** Build `@downpat/core` with types, interfaces, and framework-agnostic controllers.

**Dependencies:** Milestone 0 complete

### 1.1: Package Setup

**Tasks:**
- [ ] Create `packages/core` directory
- [ ] Initialize package.json with `@downpat/core`
- [ ] Set up TypeScript
- [ ] Configure build (tsc)
- [ ] Add Vitest for testing

**Package Structure:**
```
packages/core/
├── src/
│   ├── index.ts
│   ├── types/
│   ├── constants/
│   ├── controllers/
│   ├── interfaces/
│   └── utils/
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Verification:**
- [ ] `npm run build` compiles TypeScript
- [ ] `npm test` runs (no tests yet)
- [ ] Package can be imported in example-app

---

### 1.2: Core Types & Interfaces

**Reference:** See [CONVERSATION_PATTERNS.md](CONVERSATION_PATTERNS.md) for message types and task details.

**Tasks:**
- [ ] Define User model (from AUTH_INTEGRATION.md)
- [ ] Define Exercise model
- [ ] Define Conversation model
- [ ] Define Message model
- [ ] Define Task interfaces (ConversationTask, CommentaryTask, SummaryTask)
- [ ] Define MessageType enum (drop EXTRACT, keep SIMPLE, MODERATION)
- [ ] Define storage interfaces

**Files:**
```
src/types/
├── user.ts           # User model
├── exercise.ts       # Exercise, ExerciseMetadata
├── conversation.ts   # Conversation, Message
├── task.ts           # Task interface and implementations
└── index.ts          # Re-exports

src/constants/
├── message-types.ts  # MessageType enum
└── index.ts
```

**User Type (from AUTH_INTEGRATION.md):**
```typescript
export interface User {
  userId: string;
  displayName: string;
  isAdmin: boolean;
  isSubscriber: boolean;
}
```

**MessageType (from NEXT_STEPS.md Q11):**
```typescript
export enum MessageType {
  // System types
  CONTEXT = 'CONTEXT',
  MODERATION = 'MODERATION',
  STARTER = 'STARTER',

  // User input
  USER = 'USER',

  // AI responses
  CONVERSATION = 'CONVERSATION',
  COMMENTARY = 'COMMENTARY',
  SIMPLE = 'SIMPLE',        // For Talk to Coach
  SUMMARY = 'SUMMARY',

  // Dropped: EXTRACT, SIMULATE
}
```

**Exercise Model (simplified draft/published versioning from NEXT_STEPS.md Q12):**
```typescript
export interface ExerciseMetadata {
  draft: string;          // Exercise ID of draft version
  published?: string;     // Exercise ID of published version (optional)
}

export interface Exercise {
  exerciseId: string;
  exerciseName: string;
  slug: string;
  maxUserMessages: number;
  model: string;          // AI model to use
  talkToCoachEnabled: boolean;

  // Tasks (drop ExtractTask and SimulateTask per NEXT_STEPS.md Q3, Q11)
  continuationTasks: Task[];
  completionTasks: Task[];

  // Content
  welcomeMessage: string;
  guidelines: string;
  starters: string[];

  // Metadata
  priority?: number;
}
```

**Verification:**
- [ ] All types compile without errors
- [ ] Types match decisions in NEXT_STEPS.md
- [ ] No references to dropped features (EXTRACT, Examples)

---

### 1.3: Storage Interfaces

**Reference:** NEXT_STEPS.md Q1 - Storage abstraction with Firebase implementation

**Tasks:**
- [ ] Define ConversationStorage interface
- [ ] Define ExerciseStorage interface
- [ ] Define DemoStorage interface
- [ ] Add JSDoc comments

**Files:**
```
src/interfaces/
├── conversation-storage.ts
├── exercise-storage.ts
├── demo-storage.ts
└── index.ts
```

**Example Interface:**
```typescript
/**
 * Storage interface for exercises.
 * Implement this to use a custom database backend.
 * Default implementation: @downpat/firebase-storage
 */
export interface ExerciseStorage {
  /**
   * Get exercise by ID
   */
  getExercise(exerciseId: string): Promise<Exercise | null>;

  /**
   * Create new exercise (draft only)
   */
  createExercise(exercise: Exercise): Promise<void>;

  /**
   * Update draft exercise
   */
  updateExercise(exercise: Exercise): Promise<void>;

  /**
   * Publish draft to published version
   */
  publishExercise(slug: string): Promise<void>;

  /**
   * Unpublish exercise (remove published version, keep draft)
   */
  unpublishExercise(slug: string): Promise<void>;

  /**
   * Restore draft from published version
   * @throws if no published version exists
   */
  restoreFromPublished(slug: string): Promise<void>;

  /**
   * Get exercise metadata by slug
   */
  getExerciseMetadata(slug: string): Promise<ExerciseMetadata | null>;

  /**
   * Get all exercises
   */
  getExercises(): Promise<Exercise[]>;
}
```

**Verification:**
- [ ] All interfaces defined
- [ ] JSDoc comments complete
- [ ] Interfaces match storage abstraction decision

---

### 1.4: Auth Provider Interfaces

**Reference:** AUTH_INTEGRATION.md

**Tasks:**
- [ ] Define ClientAuthProvider interface
- [ ] Define ServerAuthProvider interface
- [ ] Add usage examples in comments

**Files:**
```
src/interfaces/
├── auth.ts
└── index.ts
```

**Content (from AUTH_INTEGRATION.md):**
```typescript
/**
 * Client-side authentication provider.
 * Provides opaque tokens to the server.
 */
export interface ClientAuthProvider {
  /**
   * Get current auth token.
   * Returns null if user is not authenticated.
   */
  getToken(): Promise<string | null>;

  /**
   * Subscribe to auth state changes.
   * Callback receives true when user is authenticated, false otherwise.
   * Returns unsubscribe function.
   */
  onAuthChange(callback: (hasAuth: boolean) => void): () => void;
}

/**
 * Server-side authentication provider.
 * Validates tokens and returns user information.
 */
export interface ServerAuthProvider {
  /**
   * Validate token and return user information.
   * @throws if token is invalid
   */
  validateToken(token: string): Promise<User>;

  /**
   * Get demo user (for anonymous access).
   * Returns a shared demo user object.
   */
  getDemoUser(): User;
}
```

**Verification:**
- [ ] Interfaces match AUTH_INTEGRATION.md
- [ ] Types are correct
- [ ] JSDoc explains usage

---

### 1.5: Framework-Agnostic Controllers

**Reference:** NEXT_STEPS.md Q5 - Controller pattern for framework independence

**Tasks:**
- [ ] Create ExerciseController
- [ ] Create ConversationController
- [ ] Add unit tests for controllers
- [ ] No framework dependencies (no Express, no Next.js)

**Files:**
```
src/controllers/
├── exercise-controller.ts
├── conversation-controller.ts
└── index.ts
```

**ExerciseController:**
```typescript
import { Exercise, ExerciseMetadata, User } from '../types';
import { ExerciseStorage } from '../interfaces';
import { ServerAuthProvider } from '../interfaces';

/**
 * Framework-agnostic exercise controller.
 * Handles exercise CRUD operations with authentication.
 */
export class ExerciseController {
  constructor(
    private storage: ExerciseStorage,
    private auth: ServerAuthProvider
  ) {}

  async createExercise(exercise: Exercise, user: User): Promise<Exercise> {
    // Verify user is admin
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can create exercises');
    }

    await this.storage.createExercise(exercise);
    return exercise;
  }

  async getExercise(exerciseId: string, user: User): Promise<Exercise> {
    const exercise = await this.storage.getExercise(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Access control: admins can view all, others need ownership check
    if (!user.isAdmin) {
      // Additional checks here
    }

    return exercise;
  }

  async updateExercise(exercise: Exercise, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can update exercises');
    }

    await this.storage.updateExercise(exercise);
  }

  async publishExercise(slug: string, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can publish exercises');
    }

    await this.storage.publishExercise(slug);
  }

  async unpublishExercise(slug: string, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can unpublish exercises');
    }

    await this.storage.unpublishExercise(slug);
  }

  async restoreFromPublished(slug: string, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new Error('Unauthorized: Only admins can restore exercises');
    }

    // Note: Should warn user if draft has unsaved changes (UI responsibility)
    await this.storage.restoreFromPublished(slug);
  }
}
```

**ConversationController (basic structure):**
```typescript
export class ConversationController {
  constructor(
    private conversationStorage: ConversationStorage,
    private exerciseStorage: ExerciseStorage,
    private auth: ServerAuthProvider
  ) {}

  async startConversation(
    exerciseId: string,
    user: User
  ): Promise<Conversation> {
    // Verify user is subscriber (or demo user)
    if (!user.isSubscriber) {
      throw new Error('Unauthorized: Only subscribers can start conversations');
    }

    const exercise = await this.exerciseStorage.getExercise(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Create conversation
    const conversation = {
      conversationId: generateId(),
      exerciseId,
      userId: user.userId,
      messages: [],
      createdAt: new Date().toISOString()
    };

    await this.conversationStorage.createConversation(conversation);
    return conversation;
  }

  // More methods in later milestones
}
```

**Tests:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { ExerciseController } from './exercise-controller';

describe('ExerciseController', () => {
  it('allows admin to create exercise', async () => {
    const mockStorage = {
      createExercise: vi.fn()
    };
    const mockAuth = { /* mock auth */ };

    const controller = new ExerciseController(mockStorage, mockAuth);
    const admin = { isAdmin: true, userId: '1', displayName: 'Admin', isSubscriber: true };
    const exercise = { /* exercise data */ };

    await controller.createExercise(exercise, admin);

    expect(mockStorage.createExercise).toHaveBeenCalledWith(exercise, '1');
  });

  it('prevents non-admin from creating exercise', async () => {
    const controller = new ExerciseController({} as any, {} as any);
    const user = { isAdmin: false, userId: '2', displayName: 'User', isSubscriber: true };

    await expect(
      controller.createExercise({} as any, user)
    ).rejects.toThrow('Unauthorized');
  });
});
```

**Verification:**
- [ ] Controllers have no framework dependencies
- [ ] Tests pass
- [ ] Access control enforced
- [ ] Matches controller pattern from NEXT_STEPS.md Q5

---

### Milestone 1 Completion Criteria

- [ ] `@downpat/core` package builds successfully
- [ ] All types and interfaces defined
- [ ] No references to dropped features (EXTRACT, Examples)
- [ ] Controllers are framework-agnostic
- [ ] Unit tests pass (80%+ coverage)
- [ ] Can import package in example-app
- [ ] Documentation (README.md) complete
- [ ] shot-scraper verification not applicable (no UI changes)

---

## 📦 MILESTONE 2: Firebase Storage Implementation

**Goal:** Implement `@downpat/firebase-storage` package as the official storage backend.

**Dependencies:** Milestone 1 complete

### 2.1: Package Setup

**Tasks:**
- [ ] Create `packages/firebase-storage` directory
- [ ] Initialize package.json with `@downpat/firebase-storage`
- [ ] Add dependency on `@downpat/core`
- [ ] Add Firebase Admin SDK dependency
- [ ] Configure TypeScript and Vitest

**Dependencies:**
```json
{
  "dependencies": {
    "@downpat/core": "workspace:*",
    "firebase-admin": "^12.0.0"
  }
}
```

---

### 2.2: Storage Implementations

**Tasks:**
- [ ] Implement ExerciseStorage interface
- [ ] Implement ConversationStorage interface
- [ ] Implement DemoStorage interface
- [ ] Add Firestore collection helpers
- [ ] Handle draft/published versioning (NEXT_STEPS.md Q12)

**Files:**
```
packages/firebase-storage/
├── src/
│   ├── index.ts
│   ├── exercise-storage.ts
│   ├── conversation-storage.ts
│   ├── demo-storage.ts
│   └── firestore-client.ts
├── package.json
└── tsconfig.json
```

**Exercise Storage (draft/published handling):**
```typescript
import { ExerciseStorage, Exercise, ExerciseMetadata } from '@downpat/core';
import { Firestore } from 'firebase-admin/firestore';

/**
 * Firebase implementation of ExerciseStorage.
 *
 * Data structure (single-org, no orgId needed):
 * - exercises/{exerciseId} - Exercise documents
 * - exerciseMetadata/{slug} - Maps slug to draft/published exercise IDs
 */
export class FirebaseExerciseStorage implements ExerciseStorage {
  constructor(private db: Firestore) {}

  async createExercise(exercise: Exercise): Promise<void> {
    const exerciseRef = this.db.collection('exercises').doc(exercise.exerciseId);
    const metadataRef = this.db.collection('exerciseMetadata').doc(exercise.slug);

    await this.db.runTransaction(async (txn) => {
      // Check if slug already exists
      const existingMetadata = await txn.get(metadataRef);
      if (existingMetadata.exists) {
        throw new Error(`Exercise with slug "${exercise.slug}" already exists`);
      }

      // Create exercise document
      txn.create(exerciseRef, {
        ...exercise,
        createdAt: new Date().toISOString()
      });

      // Create metadata document
      txn.create(metadataRef, {
        draft: exercise.exerciseId,
        // published: undefined (not published yet)
      } as ExerciseMetadata);
    });
  }

  async getExercise(exerciseId: string): Promise<Exercise | null> {
    const doc = await this.db.collection('exercises').doc(exerciseId).get();
    return doc.exists ? (doc.data() as Exercise) : null;
  }

  async getExerciseMetadata(slug: string): Promise<ExerciseMetadata | null> {
    const doc = await this.db.collection('exerciseMetadata').doc(slug).get();
    return doc.exists ? (doc.data() as ExerciseMetadata) : null;
  }

  async getExercises(): Promise<Exercise[]> {
    // Get all draft exercises
    const metadataSnapshot = await this.db.collection('exerciseMetadata').get();
    const draftIds = metadataSnapshot.docs.map(doc => doc.data().draft);

    if (draftIds.length === 0) return [];

    const exerciseRefs = draftIds.map(id => this.db.collection('exercises').doc(id));
    const exerciseDocs = await this.db.getAll(...exerciseRefs);

    return exerciseDocs
      .filter(doc => doc.exists)
      .map(doc => doc.data() as Exercise);
  }

  async updateExercise(exercise: Exercise): Promise<void> {
    await this.db.collection('exercises').doc(exercise.exerciseId).set(exercise, { merge: true });
  }

  async publishExercise(slug: string): Promise<void> {
    const metadataRef = this.db.collection('exerciseMetadata').doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata;

      if (!metadata) {
        throw new Error('Exercise not found');
      }

      // Copy draft to published document
      const draftRef = this.db.collection('exercises').doc(metadata.draft);
      const draftDoc = await txn.get(draftRef);

      if (!draftDoc.exists) {
        throw new Error('Draft exercise not found');
      }

      // Create new published document (or update existing)
      const publishedId = metadata.published || `${metadata.draft}-published`;
      const publishedRef = this.db.collection('exercises').doc(publishedId);

      txn.set(publishedRef, draftDoc.data()!);

      // Update metadata
      txn.update(metadataRef, {
        draft: metadata.draft,
        published: publishedId
      });
    });
  }

  async unpublishExercise(slug: string): Promise<void> {
    const metadataRef = this.db.collection('exerciseMetadata').doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata;

      if (!metadata) {
        throw new Error('Exercise not found');
      }

      if (!metadata.published) {
        throw new Error('Exercise is not published');
      }

      // Remove published document
      const publishedRef = this.db.collection('exercises').doc(metadata.published);
      txn.delete(publishedRef);

      // Update metadata (remove published reference, keep draft)
      txn.update(metadataRef, {
        draft: metadata.draft,
        published: null
      });
    });
  }

  async restoreFromPublished(slug: string): Promise<void> {
    // Copy published → draft
    // Should warn if draft has unsaved changes (UI responsibility, not here)

    const metadataRef = this.db.collection('exerciseMetadata').doc(slug);

    await this.db.runTransaction(async (txn) => {
      const metadataDoc = await txn.get(metadataRef);
      const metadata = metadataDoc.data() as ExerciseMetadata;

      if (!metadata?.published) {
        throw new Error('No published version to restore from');
      }

      // Copy published data to draft
      const publishedRef = this.db.collection('exercises').doc(metadata.published);
      const publishedDoc = await txn.get(publishedRef);

      if (!publishedDoc.exists) {
        throw new Error('Published exercise not found');
      }

      const draftRef = this.db.collection('exercises').doc(metadata.draft);
      txn.set(draftRef, publishedDoc.data()!);
    });
  }
}
```

**Verification:**
- [ ] All storage interfaces implemented
- [ ] Draft/published versioning works correctly
- [ ] Tests pass (can use Firebase emulator)
- [ ] No references to dropped features

---

### 2.3: Integration Tests

**Tasks:**
- [ ] Set up Firebase emulator for testing
- [ ] Write integration tests for storage implementations
- [ ] Test draft/published workflow
- [ ] Test restore with warning scenario

**Firebase Emulator Setup:**
```json
// firebase.json
{
  "emulators": {
    "firestore": {
      "port": 8080
    }
  }
}
```

**Test Example:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FirebaseExerciseStorage } from './exercise-storage';

describe('FirebaseExerciseStorage', () => {
  let storage: FirebaseExerciseStorage;
  let db: Firestore;

  beforeAll(() => {
    // Connect to emulator
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    const app = initializeApp({ projectId: 'test-project' });
    db = getFirestore(app);
    storage = new FirebaseExerciseStorage(db);
  });

  it('creates draft exercise', async () => {
    const exercise = {
      exerciseId: 'test-1',
      slug: 'test-exercise',
      // ... other fields
    };

    await storage.createExercise(exercise, 'org-1');

    const metadata = await storage.getExerciseMetadata('org-1', 'test-exercise');
    expect(metadata?.draft).toBe('test-1');
    expect(metadata?.published).toBeUndefined();
  });

  it('publishes draft exercise', async () => {
    // Create draft first
    await storage.createExercise({ exerciseId: 'draft-1', slug: 'pub-test' }, 'org-1');

    // Publish
    await storage.publishExercise('org-1', 'pub-test');

    const metadata = await storage.getExerciseMetadata('org-1', 'pub-test');
    expect(metadata?.draft).toBe('draft-1');
    expect(metadata?.published).toBeDefined();
  });
});
```

**Verification:**
- [ ] Integration tests pass
- [ ] Firebase emulator works in Docker and Mac
- [ ] Draft/published workflow tested

---

### Milestone 2 Completion Criteria

- [ ] `@downpat/firebase-storage` builds successfully
- [ ] All storage interfaces implemented
- [ ] Integration tests pass (Firebase emulator)
- [ ] Draft/published versioning works
- [ ] Package can be imported in example-app
- [ ] README.md complete with setup instructions

---

## 🌐 MILESTONE 3: Express Integration

**Goal:** Build `@downpat/express` package with HTTP routes and Socket.io integration.

**Dependencies:** Milestones 1 and 2 complete

### 3.1: Package Setup

**Tasks:**
- [ ] Create `packages/express` directory
- [ ] Add dependencies on `@downpat/core`
- [ ] Add Express and Socket.io dependencies
- [ ] Configure TypeScript and Vitest

**Dependencies:**
```json
{
  "dependencies": {
    "@downpat/core": "workspace:*",
    "express": "^4.18.0",
    "socket.io": "^4.6.0",
    "cors": "^2.8.5"
  },
  "peerDependencies": {
    "@downpat/firebase-storage": "workspace:*"
  },
  "devDependencies": {
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

### 3.2: HTTP Router

**Tasks:**
- [ ] Create Express router factory
- [ ] Add exercise CRUD endpoints
- [ ] Add conversation endpoints
- [ ] Add authentication middleware
- [ ] Integrate controllers from core

**Files:**
```
packages/express/
├── src/
│   ├── index.ts
│   ├── router.ts
│   ├── socket.ts
│   ├── middleware/
│   │   └── auth.ts
│   └── routes/
│       ├── exercises.ts
│       └── conversations.ts
```

**Router Factory (from NEXT_STEPS.md Q5):**
```typescript
import express from 'express';
import { ExerciseController, ConversationController } from '@downpat/core';
import type { ServerAuthProvider, ExerciseStorage, ConversationStorage } from '@downpat/core';

export interface DownpatConfig {
  serverAuth: ServerAuthProvider;
  exerciseStorage: ExerciseStorage;
  conversationStorage: ConversationStorage;
  // AI provider config will come later
}

export function createDownpatRouter(config: DownpatConfig) {
  const router = express.Router();

  // Create controllers
  const exerciseController = new ExerciseController(
    config.exerciseStorage,
    config.serverAuth
  );

  const conversationController = new ConversationController(
    config.conversationStorage,
    config.exerciseStorage,
    config.serverAuth
  );

  // Auth middleware
  const authMiddleware = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const user = await config.serverAuth.validateToken(token);
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Exercise routes
  router.get('/exercises/:id', authMiddleware, async (req, res) => {
    try {
      const exercise = await exerciseController.getExercise(
        req.params.id,
        req.user
      );
      res.json(exercise);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  router.post('/exercises', authMiddleware, async (req, res) => {
    try {
      const exercise = await exerciseController.createExercise(
        req.body,
        req.user
      );
      res.status(201).json(exercise);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  // More routes...

  return { router, exerciseController, conversationController };
}
```

**Usage Example (for example-app):**
```typescript
import express from 'express';
import { createDownpatRouter } from '@downpat/express';
import { FirebaseExerciseStorage } from '@downpat/firebase-storage';

const app = express();

// Create router
const downpat = createDownpatRouter({
  serverAuth: myAuthProvider,
  exerciseStorage: new FirebaseExerciseStorage(firestore),
  conversationStorage: new FirebaseConversationStorage(firestore)
});

// Mount router
app.use('/api/downpat', downpat.router);

app.listen(3001);  // API server
```

**Verification:**
- [ ] Router factory works
- [ ] Endpoints return correct responses
- [ ] Authentication middleware works
- [ ] Controllers are called correctly

---

### 3.3: Socket.io Integration

**Reference:** NEXT_STEPS.md Q5 - Socket.io for streaming

**Tasks:**
- [ ] Create Socket.io server factory
- [ ] Add authentication for Socket.io
- [ ] Add conversation streaming events
- [ ] Integrate with ConversationController

**Socket.io Factory:**
```typescript
import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { DownpatConfig } from './router';

export function attachSocketIO(httpServer: HTTPServer, config: DownpatConfig) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Configure appropriately
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Authenticate socket connection
    socket.on('authenticate', async (token: string) => {
      try {
        const user = await config.serverAuth.validateToken(token);
        socket.data.user = user;
        socket.emit('authenticated', { success: true });
      } catch (error) {
        socket.emit('authenticated', { success: false, error: error.message });
      }
    });

    // Handle conversation messages
    socket.on('send-message', async (data: { conversationId: string, message: string }) => {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // Stream AI response via callback
        const controller = new ConversationController(/* ... */);

        await controller.continueConversation(
          data.conversationId,
          data.message,
          socket.data.user,
          (chunk) => {
            // Stream chunk to client
            socket.emit('message-chunk', { chunk });
          }
        );

        socket.emit('message-complete');
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}
```

**Usage (example-app):**
```typescript
const server = app.listen(3001);  // API server

// Attach Socket.io to same server (same origin)
const io = attachSocketIO(server, downpatConfig);
```

**Verification:**
- [ ] Socket.io server starts
- [ ] Authentication works
- [ ] Messages can be sent
- [ ] Streaming callbacks work (mock for now)

---

### 3.4: Integration with Example App

**Tasks:**
- [ ] Update example-app to use `@downpat/express`
- [ ] Add exercise creation endpoint
- [ ] Add conversation UI (basic)
- [ ] Test full flow: create exercise → start conversation → send message

**Example App Server Update:**
```typescript
import express from 'express';
import { createDownpatRouter, attachSocketIO } from '@downpat/express';
import { FirebaseExerciseStorage, FirebaseConversationStorage } from '@downpat/firebase-storage';
import admin from 'firebase-admin';

// Initialize Firebase
admin.initializeApp(/* config */);
const db = admin.firestore();

// Create mock auth provider for testing
const mockAuthProvider = {
  validateToken: async (token: string) => ({
    userId: 'test-user',
    displayName: 'Test User',
    isAdmin: true,
    isSubscriber: true
  }),
  getDemoUser: () => ({
    userId: 'demo-user',
    displayName: 'Demo User',
    isAdmin: false,
    isSubscriber: true
  })
};

// Create DownPat router
const downpat = createDownpatRouter({
  serverAuth: mockAuthProvider,
  exerciseStorage: new FirebaseExerciseStorage(db),
  conversationStorage: new FirebaseConversationStorage(db)
});

const app = express();
app.use(express.json());
app.use(cors());

// Mount DownPat API
app.use('/api/downpat', downpat.router);

// Start server
const server = app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});

// Attach Socket.io
attachSocketIO(server, {
  serverAuth: mockAuthProvider,
  exerciseStorage: new FirebaseExerciseStorage(db),
  conversationStorage: new FirebaseConversationStorage(db)
});
```

**Verification:**
- [ ] Example app starts
- [ ] Can create exercise via API
- [ ] Can fetch exercise
- [ ] Socket.io connects
- [ ] Browser verification shows no errors

---

### Milestone 3 Completion Criteria

- [ ] `@downpat/express` builds successfully
- [ ] HTTP router works
- [ ] Socket.io integration works
- [ ] Example app uses packages
- [ ] Tests pass
- [ ] Browser verification (shot-scraper) shows no errors
- [ ] Can create/fetch exercises via API
- [ ] README.md complete

---

## 🎨 MILESTONE 4: UI Components Package

**Goal:** Build `@downpat/ui-components` with React conversation UI.

**Dependencies:** Milestones 1-3 complete

### 4.1: Package Setup

**Reference:** NEXT_STEPS.md Q8 - Styled components with Tailwind

**Tasks:**
- [ ] Create `packages/ui-components` directory
- [ ] Add React and Tailwind dependencies
- [ ] Configure build (Vite library mode)
- [ ] Set up Vitest + React Testing Library

**Dependencies:**
```json
{
  "dependencies": {
    "@downpat/core": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**Tailwind Config (no Radix per NEXT_STEPS.md Q8):**
```typescript
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // CSS variables for theming (NEXT_STEPS.md Q9)
        primary: 'var(--downpat-primary)',
        background: 'var(--downpat-background)',
        text: 'var(--downpat-text)',
        // More colors...
      }
    }
  },
  plugins: []
}
```

---

### 4.2: Core UI Components

**Reference:** NEXT_STEPS.md Q8 - Replace Avatar with initials, no Radix

**Tasks:**
- [ ] Create UserAvatar component (initials, no Radix)
- [ ] Create Button component (styled with Tailwind)
- [ ] Create TextArea component
- [ ] Create basic layout components

**Files:**
```
packages/ui-components/
├── src/
│   ├── index.ts
│   ├── components/
│   │   ├── Avatar.tsx         # Initials only, no Radix
│   │   ├── Button.tsx
│   │   ├── TextArea.tsx
│   │   └── Message.tsx
│   └── styles/
│       └── default-theme.css  # Default blue theme
```

**Avatar Component (no Radix, initials only):**
```typescript
import React from 'react';

interface AvatarProps {
  displayName: string;
  className?: string;
}

/**
 * Simple avatar showing user initials.
 * No Radix UI - just a div with initials.
 */
export function Avatar({ displayName, className = '' }: AvatarProps) {
  // Get initials from display name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate color from name (deterministic)
  const getColorClass = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const initials = getInitials(displayName);
  const colorClass = getColorClass(displayName);

  return (
    <div
      className={`
        flex items-center justify-center
        w-10 h-10 rounded-full
        text-white font-medium text-sm
        ${colorClass}
        ${className}
      `}
    >
      {initials}
    </div>
  );
}
```

**Avatar Test:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('shows initials from display name', () => {
    render(<Avatar displayName="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('handles single name', () => {
    render(<Avatar displayName="Alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows first two initials only', () => {
    render(<Avatar displayName="John Peter Smith" />);
    expect(screen.getByText('JP')).toBeInTheDocument();
  });
});
```

**Verification:**
- [ ] Avatar shows initials correctly
- [ ] No Radix dependencies
- [ ] Tests pass
- [ ] Tailwind styles applied

---

### 4.3: Message Components

**Reference:** CONVERSATION_PATTERNS.md for message types

**Tasks:**
- [ ] Create MessageList component
- [ ] Create message renderers for each type (USER, CONVERSATION, COMMENTARY, SUMMARY, SIMPLE, MODERATION)
- [ ] Add message actions (rate, regenerate, report)
- [ ] Style with Tailwind

**Message Component:**
```typescript
import React from 'react';
import { MessageType } from '@downpat/core';
import { Avatar } from './Avatar';

interface MessageProps {
  message: {
    id: string;
    type: MessageType;
    role: string;
    text: string;
    timestamp: string;
  };
}

export function Message({ message }: MessageProps) {
  // Different styling based on message type
  const getMessageStyle = () => {
    switch (message.type) {
      case MessageType.USER:
        return 'bg-blue-50 ml-auto';
      case MessageType.CONVERSATION:
        return 'bg-gray-50';
      case MessageType.COMMENTARY:
        return 'bg-yellow-50 border-l-4 border-yellow-400';
      case MessageType.SUMMARY:
        return 'bg-green-50 border-l-4 border-green-400';
      case MessageType.SIMPLE:
        return 'bg-gray-50';
      case MessageType.MODERATION:
        return 'bg-red-50 border-l-4 border-red-400';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className={`p-4 rounded-lg max-w-2xl ${getMessageStyle()}`}>
      <div className="flex items-start gap-3">
        <Avatar displayName={message.role} />
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-700">
            {message.role}
          </div>
          <div className="mt-1 text-gray-900">
            {message.text}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Verification:**
- [ ] All message types render correctly
- [ ] Styling matches message type
- [ ] Avatar shows initials
- [ ] Tests pass

---

### 4.4: Talk to Coach Sidebar

**Reference:** README.md mentions "Text-based 'Talk to Coach' sidebar (talkToCoachEnabled)" is kept.

**Tasks:**
- [ ] Create TalkToCoachSidebar component
- [ ] Create TalkToCoachInput component
- [ ] Style sidebar with collapsible behavior
- [ ] Integrate with conversation context

**TalkToCoachSidebar Component:**
```typescript
import React, { useState } from 'react';
import { MessageType } from '@downpat/core';
import { Message } from './Message';

interface TalkToCoachProps {
  messages: Array<{
    id: string;
    type: MessageType;
    role: string;
    text: string;
    timestamp: string;
  }>;
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function TalkToCoachSidebar({
  messages,
  onSendMessage,
  isOpen,
  onToggle
}: TalkToCoachProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 bottom-4 bg-primary-500 text-white p-3 rounded-full shadow-lg"
        aria-label="Open Talk to Coach"
      >
        💬
      </button>
    );
  }

  return (
    <aside className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg border-l flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Talk to Coach</h2>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages
          .filter(m => m.type === MessageType.SIMPLE || m.type === MessageType.USER)
          .map(msg => (
            <Message key={msg.id} message={msg} />
          ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the coach..."
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            className="bg-primary-500 text-white px-4 py-2 rounded-lg"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
```

**Verification:**
- [ ] Sidebar opens/closes correctly
- [ ] Messages display in sidebar
- [ ] Input sends messages
- [ ] Uses SIMPLE message type for coach responses
- [ ] Tests pass

---

### 4.5: Default Theme (CSS Variables)

**Reference:** NEXT_STEPS.md Q9 - Default theme + generator utility

**Tasks:**
- [ ] Create default theme CSS file
- [ ] Define all CSS variables
- [ ] Use Tailwind's blue palette
- [ ] Add dark mode support

**Default Theme (src/styles/default-theme.css):**
```css
/**
 * DownPat Default Theme
 * Based on Tailwind blue palette
 */

:root {
  /* Primary colors (blue) */
  --downpat-primary-50: #eff6ff;
  --downpat-primary-100: #dbeafe;
  --downpat-primary-200: #bfdbfe;
  --downpat-primary-300: #93c5fd;
  --downpat-primary-400: #60a5fa;
  --downpat-primary-500: #3b82f6;  /* Main primary */
  --downpat-primary-600: #2563eb;
  --downpat-primary-700: #1d4ed8;
  --downpat-primary-800: #1e40af;
  --downpat-primary-900: #1e3a8a;

  /* Semantic colors */
  --downpat-background: #ffffff;
  --downpat-text: #1f2937;
  --downpat-text-secondary: #6b7280;
  --downpat-border: #e5e7eb;

  /* Message type colors */
  --downpat-user-bg: #eff6ff;
  --downpat-conversation-bg: #f9fafb;
  --downpat-commentary-bg: #fef3c7;
  --downpat-summary-bg: #d1fae5;
  --downpat-moderation-bg: #fee2e2;
}

/* Dark mode */
[data-theme="dark"] {
  --downpat-background: #1f2937;
  --downpat-text: #f9fafb;
  --downpat-text-secondary: #d1d5db;
  --downpat-border: #374151;

  --downpat-user-bg: #1e3a8a;
  --downpat-conversation-bg: #374151;
  --downpat-commentary-bg: #92400e;
  --downpat-summary-bg: #065f46;
  --downpat-moderation-bg: #7f1d1d;
}
```

**Verification:**
- [ ] CSS variables defined
- [ ] Tailwind uses variables correctly
- [ ] Dark mode works
- [ ] Default blue theme looks good

---

### 4.6: Integration with Example App

**Tasks:**
- [ ] Update example-app client to use `@downpat/ui-components`
- [ ] Show sample messages
- [ ] Test all message types
- [ ] Verify with shot-scraper

**Example App Client Update:**
```typescript
import { Message } from '@downpat/ui-components';
import '@downpat/ui-components/dist/style.css';

const sampleMessages = [
  {
    id: '1',
    type: MessageType.USER,
    role: 'User',
    text: 'Hello, I need help with my sales pitch.',
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    type: MessageType.CONVERSATION,
    role: 'Sales Coach',
    text: 'I\'d be happy to help! Tell me about your product.',
    timestamp: new Date().toISOString()
  },
  {
    id: '3',
    type: MessageType.COMMENTARY,
    role: 'Coach',
    text: 'Good engagement! The user is asking the right questions.',
    timestamp: new Date().toISOString()
  }
];

function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Message Types Demo</h1>
      <div className="space-y-4">
        {sampleMessages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}
```

**Browser Verification (shot-scraper):**
- [ ] Run `./scripts/verify-browser.sh`
- [ ] Screenshot shows styled messages
- [ ] Avatar initials visible
- [ ] Different message types have different backgrounds
- [ ] CSS is properly loaded
- [ ] Screenshot file > 50KB (properly rendered)

---

### Milestone 4 Completion Criteria

- [ ] `@downpat/ui-components` builds successfully
- [ ] Avatar component works (initials only, no Radix)
- [ ] All message types render correctly
- [ ] Talk to Coach sidebar component works
- [ ] Default theme CSS included
- [ ] Dark mode supported
- [ ] Tests pass
- [ ] Example app shows UI components
- [ ] shot-scraper verification passes
- [ ] Human verifies screenshot looks good
- [ ] README.md complete with usage examples

---

## 🎨 MILESTONE 5: Admin UI Package

**Goal:** Build `@downpat/admin-ui` with exercise creation/management UI.

**Dependencies:** Milestone 4 complete

### 5.1: Package Setup

Similar to ui-components package setup.

### 5.2: Exercise Form Components

**Tasks:**
- [ ] Create ExerciseForm component
- [ ] Add task configuration UI
- [ ] Add guidelines/starters editors
- [ ] Support draft/published workflow

### 5.3: Exercise List/Dashboard

**Tasks:**
- [ ] Create ExerciseList component
- [ ] Show draft/published status
- [ ] Add publish/restore actions
- [ ] Add warning for restore (unsaved changes)

**Restore Warning (from NEXT_STEPS.md Q12):**
```typescript
function RestoreButton({ exercise, onRestore }) {
  const [showWarning, setShowWarning] = useState(false);

  const handleRestore = () => {
    if (!showWarning) {
      setShowWarning(true);
      return;
    }

    onRestore();
  };

  if (showWarning) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
        <p className="text-sm text-yellow-800 mb-2">
          ⚠️ This will overwrite your current draft with the published version.
          Any unsaved changes will be lost.
        </p>
        <div className="flex gap-2">
          <button onClick={handleRestore} className="btn-danger">
            Yes, Restore from Published
          </button>
          <button onClick={() => setShowWarning(false)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={handleRestore} className="btn-primary">
      Restore from Published
    </button>
  );
}
```

### 5.4: Moderation Toggle

**Reference:** NEXT_STEPS.md Q14 - Toggleable moderation

**Tasks:**
- [ ] Create moderation settings UI
- [ ] Add global toggle
- [ ] Show OpenAI API key requirement
- [ ] Add help text explaining feature

**Moderation Settings Component:**
```typescript
function ModerationSettings({ config, onUpdate }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Content Moderation</h3>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="checkbox"
          checked={config.moderationEnabled}
          onChange={(e) => onUpdate({ moderationEnabled: e.target.checked })}
          className="w-4 h-4"
        />
        <label className="text-sm font-medium">
          Enable content moderation
        </label>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        When enabled, all user messages are checked for policy violations
        using OpenAI's moderation API. Requires OpenAI API key.
      </p>

      {config.moderationEnabled && !config.openaiApiKey && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ Moderation is enabled but no OpenAI API key is configured.
            Moderation will not work until you add an OpenAI API key.
          </p>
        </div>
      )}
    </div>
  );
}
```

### Milestone 5 Completion Criteria

- [ ] `@downpat/admin-ui` builds successfully
- [ ] Exercise creation form works
- [ ] Draft/published workflow works
- [ ] Restore warning shows correctly
- [ ] Moderation toggle works
- [ ] Tests pass
- [ ] Browser verification passes
- [ ] README.md complete

---

## 🤖 MILESTONE 6: AI Provider Integration

**Goal:** Implement AI adapters for OpenAI, Anthropic, and Gemini.

**Dependencies:** Milestones 1-3 complete

**Reference:** NEXT_STEPS.md Q4 - Three providers with dynamic availability

### 6.1: AI Adapter Interface

**Tasks:**
- [ ] Define AIAdapter interface in core
- [ ] Add streaming callback support
- [ ] Define provider configuration

### 6.2: Provider Implementations

**Tasks:**
- [ ] Implement OpenAI adapter
- [ ] Implement Anthropic adapter
- [ ] Implement Gemini adapter
- [ ] Add streaming support for all
- [ ] Add error handling

### 6.3: Dynamic Provider Availability

**Reference:** NEXT_STEPS.md Q4 - Only show configured providers

**Tasks:**
- [ ] Add provider detection based on API keys
- [ ] Filter UI dropdowns to show only available providers
- [ ] Add admin UI for provider configuration

**Provider Configuration:**
```typescript
export interface AIProviderConfig {
  openai?: {
    apiKey: string;
    models: string[];  // e.g., ['gpt-4', 'gpt-3.5-turbo']
  };
  anthropic?: {
    apiKey: string;
    models: string[];  // e.g., ['claude-3-opus', 'claude-3-sonnet']
  };
  gemini?: {
    apiKey: string;
    models: string[];  // e.g., ['gemini-pro']
  };
}

// Only show models for configured providers
export function getAvailableModels(config: AIProviderConfig): string[] {
  const models: string[] = [];

  if (config.openai?.apiKey) {
    models.push(...config.openai.models);
  }
  if (config.anthropic?.apiKey) {
    models.push(...config.anthropic.models);
  }
  if (config.gemini?.apiKey) {
    models.push(...config.gemini.models);
  }

  return models;
}
```

### 6.4: Moderation Adapter

**Reference:** NEXT_STEPS.md Q14 - Hardcoded to OpenAI

**Tasks:**
- [ ] Implement OpenAI moderation adapter
- [ ] Add to conversation flow (when enabled)
- [ ] Return MODERATION message type
- [ ] Add tests

**Moderation Integration:**
```typescript
export class ModerationAdapter {
  constructor(private openaiKey: string) {}

  async checkContent(text: string): Promise<ModerationResult> {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`
      },
      body: JSON.stringify({ input: text })
    });

    const data = await response.json();

    return {
      flagged: data.results[0].flagged,
      categories: data.results[0].categories,
      categoryScores: data.results[0].category_scores
    };
  }
}
```

### Milestone 6 Completion Criteria

- [ ] All three AI adapters implemented
- [ ] Streaming works for all providers
- [ ] Dynamic provider availability works
- [ ] Moderation adapter works
- [ ] Tests pass
- [ ] Example app can use AI providers (with mock keys for testing)

---

## 🔧 MILESTONE 7: Theme Generator Utility

**Goal:** Implement theme generator for easy customization.

**Dependencies:** Milestone 4 complete

**Reference:** NEXT_STEPS.md Q9 - Generate theme from 3-5 colors

### 7.1: Theme Generator Function

**Tasks:**
- [ ] Create generateTheme function
- [ ] Generate shades from base colors
- [ ] Return CSS variable declarations
- [ ] Add TypeScript types

**Implementation:**
```typescript
import chroma from 'chroma-js';

export interface ThemeColors {
  primary: string;
  secondary?: string;
  success?: string;
  danger?: string;
  neutral?: string;
}

export interface GeneratedTheme {
  css: string;
  variables: Record<string, string>;
}

export function generateTheme(colors: ThemeColors): GeneratedTheme {
  const variables: Record<string, string> = {};

  // Generate shades for primary color
  if (colors.primary) {
    const primaryScale = chroma.scale([
      chroma(colors.primary).brighten(2),
      colors.primary,
      chroma(colors.primary).darken(2)
    ]).colors(10);

    primaryScale.forEach((color, i) => {
      const shade = (i + 1) * 100;
      variables[`--downpat-primary-${shade}`] = color;
    });
  }

  // Generate CSS
  const css = `:root {\n${
    Object.entries(variables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')
  }\n}`;

  return { css, variables };
}
```

### 7.2: Documentation and Examples

**Tasks:**
- [ ] Add usage examples to README
- [ ] Show how to apply theme
- [ ] Document all supported colors

### Milestone 7 Completion Criteria

- [ ] Theme generator works
- [ ] Can generate from 3-5 colors
- [ ] Output is valid CSS
- [ ] Documentation complete
- [ ] Tests pass

---

## 📚 MILESTONE 8: Documentation & Examples

**Goal:** Complete documentation for all packages.

**Dependencies:** All previous milestones complete

**Reference:** NEXT_STEPS.md Q18 - README files only

### 8.1: Package READMEs

**Tasks:**
- [ ] Write README for each package
- [ ] Include installation instructions
- [ ] Add usage examples
- [ ] Document API with TSDoc
- [ ] Add troubleshooting sections

### 8.2: Root Documentation

**Tasks:**
- [ ] Create comprehensive root README
- [ ] Link to AUTH_INTEGRATION.md
- [ ] Link to VERIFICATION.md
- [ ] Add architecture diagram
- [ ] Add getting started guide

### 8.3: Example App Documentation

**Tasks:**
- [ ] Document how to run example app
- [ ] Show different auth provider implementations
- [ ] Include Firebase setup guide
- [ ] Add customization examples

### Milestone 8 Completion Criteria

- [ ] All packages have READMEs
- [ ] Root README complete
- [ ] Getting started guide clear
- [ ] Auth integration documented
- [ ] Verification documented
- [ ] Examples work

---

## 🧪 MILESTONE 9: Testing & Quality

**Goal:** Achieve 80%+ test coverage and production readiness.

**Dependencies:** All previous milestones complete

### 9.1: Test Coverage

**Tasks:**
- [ ] Unit tests for all packages (80%+ coverage)
- [ ] Integration tests for workflows
- [ ] E2E tests for example app (Playwright)
- [ ] Run coverage reports

### 9.2: Quality Checks

**Tasks:**
- [ ] Linting passes
- [ ] TypeScript strict mode
- [ ] No console errors in browser
- [ ] Accessibility checks
- [ ] Performance checks

### 9.3: Browser Verification Final Check

**Tasks:**
- [ ] shot-scraper on all major features
- [ ] Manual testing by human
- [ ] Verify all JavaScript works
- [ ] Verify all CSS loads
- [ ] Check dark mode

### Milestone 9 Completion Criteria

- [ ] 80%+ test coverage
- [ ] All tests pass
- [ ] Linting passes
- [ ] Browser verification passes
- [ ] No console errors
- [ ] Human validates all features work

---

## 🚀 MILESTONE 10: Publishing & Release

**Goal:** Publish packages to npm and release v1.0.0.

**Dependencies:** Milestone 9 complete

### 10.1: Prepare for Publishing

**Tasks:**
- [ ] Add LICENSE to all packages (MIT)
- [ ] Add CHANGELOG.md files
- [ ] Bump versions to 1.0.0
- [ ] Add package.json metadata (description, keywords, etc.)
- [ ] Create npm organization `@downpat`

### 10.2: Publish Packages

**Tasks:**
- [ ] Publish `@downpat/core`
- [ ] Publish `@downpat/firebase-storage`
- [ ] Publish `@downpat/express`
- [ ] Publish `@downpat/ui-components`
- [ ] Publish `@downpat/admin-ui`
- [ ] Verify all packages on npm

### 10.3: GitHub Release

**Tasks:**
- [ ] Create GitHub release v1.0.0
- [ ] Add release notes
- [ ] Tag release
- [ ] Update README with install instructions

### Milestone 10 Completion Criteria

- [ ] All packages published to npm
- [ ] GitHub release created
- [ ] Documentation updated
- [ ] Example app works with published packages
- [ ] v1.0.0 is live!

---

## 📋 Summary: Milestone Dependencies

```
M0: Verification Setup (FIRST - Required for all others)
  ↓
M1: Core Package ──────────┐
  ↓                        │
M2: Firebase Storage       │
  ↓                        │
M3: Express Integration ───┤
  ↓                        │
M4: UI Components ─────────┤
  ↓                        │
M5: Admin UI              │
  ↓                        │
M6: AI Providers ──────────┤
  ↓                        │
M7: Theme Generator ───────┘
  ↓
M8: Documentation
  ↓
M9: Testing & Quality
  ↓
M10: Publishing
```

---

## ✅ Success Criteria for Entire Project

The DownPat open source project is ready for v1.0.0 when:

**Architecture:**
- ✅ All architectural decisions from NEXT_STEPS.md implemented
- ✅ Storage abstraction works
- ✅ Token-based auth works
- ✅ Controller pattern implemented
- ✅ No dropped features present (EXTRACT, Examples, SIMULATE)

**Packages:**
- ✅ All 5 packages build and publish successfully
- ✅ Example app works with all packages
- ✅ Can install via npm

**Testing:**
- ✅ 80%+ test coverage
- ✅ All tests pass in Docker and Mac
- ✅ Browser verification passes
- ✅ Human validates all features

**Documentation:**
- ✅ All READMEs complete
- ✅ VERIFICATION.md documents agent/human workflows
- ✅ AUTH_INTEGRATION.md guides auth implementation
- ✅ Getting started guide works

**Verification (Critical for Agent Prototype):**
- ✅ Agent can run tests in Docker
- ✅ Human can run tests on Mac
- ✅ Agent can verify browser with shot-scraper
- ✅ shot-scraper screenshots show CSS loaded
- ✅ shot-scraper screenshots show JavaScript working
- ✅ No more "curl shows 200 OK but page is broken" issues

---

## 🎯 Next Steps

1. **Review this plan** - Ensure all decisions from NEXT_STEPS.md are reflected
2. **Start Milestone 0** - Set up verification infrastructure first
3. **Iterate through milestones** - Each milestone is a working checkpoint
4. **Document as you go** - VERIFICATION.md is critical for future agents
5. **Celebrate v1.0.0!** 🎉

---

**Questions or clarifications needed before starting?**
