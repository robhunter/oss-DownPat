# Package Consolidation Plan

## Goal

Make it trivially easy for partners to add DownPat to their existing application. Partners should be able to integrate with minimal boilerplate - the packages should handle the complex logic.

---

## Current State

Partners must currently write significant code themselves:
- **310+ lines** of socket event handling (`useSocket.ts`)
- Route definitions for all pages
- Page composition (wiring hooks to UI components)
- Custom server routes for exercise fetching

---

## Proposed Changes

### 1. Move `useSocket` and `useConversation` Hooks → `@downpat/ui-components`

**Priority: HIGH**

The conversation hooks are the most complex client-side code and every partner needs them identically.

**What to move:**
- `useSocket()` - Socket.io connection with auto-reconnect, auth handling
- `useConversation({ slug })` - Full conversation state management including:
  - Starting conversations
  - Streaming message chunks
  - Commentary events
  - Moderation events
  - `isComplete` state

**Partner usage after:**
```tsx
import { useConversation } from '@downpat/ui-components';

function MyConversation({ slug }) {
  const { messages, sendMessage, isStreaming, isComplete } = useConversation({ slug });
  // Just render UI, all socket logic handled
}
```

---

### 2. Add `provideDownPatToken()` Client Utility → `@downpat/ui-components`

**Priority: HIGH**

Partners have their own auth systems. We just need them to give us a token when their user authenticates.

**What to add:**
```typescript
// @downpat/ui-components
export function provideDownPatToken(token: string | null): void;
export function getDownPatToken(): string | null;
export function clearDownPatToken(): void;
```

**How it works:**
- Stores token in a known location (localStorage key or module state)
- `useSocket` hook reads from this location
- Partners call `provideDownPatToken(token)` after their auth flow completes

**Partner usage:**
```tsx
// In partner's auth callback
import { provideDownPatToken } from '@downpat/ui-components';

async function handleLogin() {
  const { token } = await myAuthSystem.login();
  provideDownPatToken(token);  // That's it - DownPat now has auth
}

function handleLogout() {
  myAuthSystem.logout();
  clearDownPatToken();
}
```

---

### 3. Export Pre-built Page Components → `@downpat/ui-components`

**Priority: MEDIUM**

Provide ready-to-use page components that partners can mount at their routes.

**What to add:**
- `<ConversationPage slug={slug} onBack={fn} />` - Full conversation UI with input, messages, coach sidebar
- `<ExerciseBrowserPage onSelectExercise={fn} />` - Browse published exercises
- `<AdminExerciseListPage />` - Admin exercise management
- `<AdminExerciseEditorPage slug={slug} />` - Create/edit exercises

**Partner usage:**
```tsx
// Partner just mounts at their routes
<Route path="/practice/:slug" element={<ConversationPage />} />
<Route path="/exercises" element={<ExerciseBrowserPage />} />
```

---

### 4. Optional: Export Route Configuration → `@downpat/ui-components`

**Priority: LOW**

For partners who want zero-config routing.

**What to add:**
```tsx
// Option A: Route constants
export const DOWNPAT_PATHS = {
  exercises: '/exercises',
  conversation: '/exercises/:slug',
  adminExercises: '/admin/exercises',
  adminExerciseNew: '/admin/exercises/new',
  adminExerciseEdit: '/admin/exercises/:slug/edit',
  adminTest: '/admin/test/:slug',
};

// Option B: Pre-configured routes component
export function DownpatRoutes({ basePath = '' }) {
  return (
    <Routes>
      <Route path={`${basePath}/exercises`} element={<ExerciseBrowserPage />} />
      <Route path={`${basePath}/exercises/:slug`} element={<ConversationPage />} />
      {/* ... */}
    </Routes>
  );
}
```

---

### 5. Add Missing Server Routes → `@downpat/express`

**Priority: MEDIUM**

The express router should include all routes partners need, not just some.

**Routes to add to `createDownpatRouter()`:**
- `GET /exercises/published` - List published exercises (for subscribers)
- `GET /exercises/published/:slug` - Get single published exercise
- `GET /exercises/with-metadata` - List exercises with draft/published status (for admin)

These are currently hand-written in the example app server.

---

### 6. Add In-Memory Storage → `@downpat/core`

**Priority: LOW**

Useful for development and testing without Firebase.

**What to add:**
```typescript
// @downpat/core
export function createInMemoryStorage(): {
  exerciseStorage: ExerciseStorage;
  conversationStorage: ConversationStorage;
};
```

---

### 7. Add Mock Auth Provider → `@downpat/express`

**Priority: LOW**

Useful for development and demos.

**What to add:**
```typescript
// @downpat/express
export function createMockAuthProvider(): ServerAuthProvider;
```

Accepts `demo-token` and `admin-token` for testing.

---

## Target Partner Experience

### Server Setup (Before)
```typescript
// ~150 lines of setup, custom routes, storage implementation
```

### Server Setup (After)
```typescript
import express from 'express';
import { createDownpatRouter, attachSocketIO, createMockAuthProvider } from '@downpat/express';
import { createInMemoryStorage } from '@downpat/core';

const app = express();
const { exerciseStorage, conversationStorage } = createInMemoryStorage();

const downpat = createDownpatRouter({
  serverAuth: createMockAuthProvider(), // or their real auth
  exerciseStorage,
  conversationStorage,
});

app.use('/api/downpat', downpat.router);
attachSocketIO(server, { /* same config */ });
```

### Client Setup (Before)
```typescript
// 310+ lines of socket handling
// Route definitions
// Page composition
// Auth context
```

### Client Setup (After)
```tsx
import { provideDownPatToken, ConversationPage, ExerciseBrowserPage } from '@downpat/ui-components';

// After partner's login:
provideDownPatToken(userToken);

// Routes:
<Route path="/exercises" element={<ExerciseBrowserPage />} />
<Route path="/exercises/:slug" element={<ConversationPage />} />
```

---

## Implementation Order

1. **`provideDownPatToken()` utility** - Simple, unblocks other work
2. **Move hooks to package** - Biggest complexity reduction
3. **Add missing server routes** - Completes the API
4. **Pre-built page components** - Nice-to-have convenience
5. **In-memory storage / mock auth** - Development helpers

---

## Not Included (Host App Responsibility)

- **Authentication UI** - Login forms, signup, etc.
- **Token acquisition** - How partner gets tokens from their auth system
- **Layout / Navigation** - Partner's app shell
- **Home page / Branding** - Partner's marketing
- **User management** - Partner's user database
