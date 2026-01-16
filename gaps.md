# Legacy vs Current Implementation Gaps

Based on comprehensive analysis comparing `.DownPatNode` (legacy) with the current implementation.

---

## CRITICAL - Must Fix Before Release

### 1. Conversation Persistence & Resumption

| Legacy | Current |
|--------|---------|
| `activeConversations` map in user document tracks one active conversation per exercise | No active conversation tracking |
| `getOrStartConversation()` - Smart resume or create new | Only `startConversation()` - always creates new |
| Conversation history UI with pagination (`ConversationToken`) | `getUserConversations()` exists but no UI integration |
| Three retrieval strategies: URL param, query params, smart resume | Single strategy: always new |

**Impact**: Users lose all progress when navigating away or refreshing.

**Key Legacy Files**:
- `/workspace/.DownPatNode/apps/server/src/stores/conversation-store.ts` - Firestore persistence
- `/workspace/.DownPatNode/apps/server/src/services/conversation-service.ts` - Business logic with `getOrStartConversation()`
- `/workspace/.DownPatNode/libs/shared/src/lib/models/meta-user.ts` - User with `activeConversations` map
- `/workspace/.DownPatNode/apps/web/src/api/chat/chatQueries.ts` - `conversationLoader()` with three retrieval strategies

**Legacy Flow**:
1. User visits exercise page
2. `conversationLoader()` checks URL for `?conversationId` param
3. If no param, calls `getOrStartConversation(subdomain, slug, version)`
4. Server checks `user.activeConversations[exerciseId]`
5. If exists and not finished, returns existing conversation
6. If not, creates new and updates `activeConversations`

---

### 2. User State Storage (Minimal)

| Legacy | Current |
|--------|---------|
| Full `MetaUser` with email, subscriptions, activeConversations | Minimal `User` type (userId, displayName, role flags only) |
| Firestore-backed UserStore | No user persistence in framework |

**What We Need**: Minimal user state storage for internal tracking only:
- `userId` - Required for linking to conversations
- `activeConversations: Record<string, string>` - Map of exerciseId → conversationId

**What We Do NOT Store** (comes from host app at runtime):
- `displayName` - Host app provides this
- `isSubscriber` / `isAdmin` / `isDemo` - Host app controls roles, can change anytime
- `email` - Not our concern

**Key Legacy Files**:
- `/workspace/.DownPatNode/libs/shared/src/lib/models/meta-user.ts` - User with `activeConversations` map
- `/workspace/.DownPatNode/apps/server/src/stores/user-store.ts` - User persistence

---

### 3. Socket.io: Edit & Finish Events

| Legacy | Current | Status |
|--------|---------|--------|
| `edit-chat` - Edit previous messages | No edit functionality | **CRITICAL** |
| `finish-chat` - Explicit conversation ending | Only implicit via moderation | **CRITICAL** |
| `simulate-chat` - Test AI responses | No simulation support | Iceboxed |
| Demo mode socket authentication | No demo mode in sockets | Iceboxed |

**Key Legacy Files**:
- `/workspace/.DownPatNode/apps/server/src/socket-provider.ts` - All socket events

---

## BELOW THE LINE - Not Before Release

### Exercise Task Types

| Legacy | Current |
|--------|---------|
| 6 task types (Conversation, Commentary, Summary, Simulate, Extract, Simple) | 4 task types (Conversation, Commentary, Summary, Simple) |
| `SimulateTask` for role-play scenarios | Missing |
| `ExtractTask` for structured data extraction | Missing |
| `liveChatEnabled` flag | Missing |

---

### Exercise Versioning

| Legacy | Current |
|--------|---------|
| Unlimited named versions ("1.0", "2.0", "beta") | Simple draft/published only |
| `latest` always points to most recent draft | Metadata-based tracking |
| Version history preserved | Only current draft + published |

---

### Demo & Sharing Features

| Legacy | Current |
|--------|---------|
| `generateDemoLink()` - Shareable demo URLs | Not implemented |
| `startDemoConversation()` - External demos | Not implemented |
| Demo codes for exercises | Not implemented |

---

### Additional Conversation Features

| Legacy | Current |
|--------|---------|
| `saveAsExample()` - Save conversations as examples | Not implemented |
| Message ratings/feedback | Not implemented |
| Daily message quotas per org | Not implemented |
| Conversation pagination (`ConversationToken`) | Basic list only |

---

### Multi-Organization Support

| Legacy | Current |
|--------|---------|
| Subdomain-based multi-tenancy | Single-organization only |
| Organization-scoped exercises and conversations | All data in single namespace |
| Per-org subscriptions and quotas | No subscription management |

---

### Subscription & Billing

| Legacy | Current |
|--------|---------|
| Stripe integration with `customerId` | Not implemented |
| Subscription lifecycle management | Simple `isSubscriber` flag |
| Per-org subscription tracking | Not implemented |

---

## CURRENT IMPROVEMENTS (Better in New Code)

| Feature | Improvement |
|---------|-------------|
| **Message Streaming** | Token-by-token streaming vs full message (better UX) |
| **Room Architecture** | Conversation-based rooms vs user-only rooms |
| **Multi-role Feedback** | Commentary + main response simultaneously |
| **Content Moderation** | Real-time flagging with immediate feedback |
| **Starter Selection** | Advanced query parameter filtering |
| **Slug Immutability** | Enforced after creation (prevents broken links) |
| **Timestamps** | Auto-managed createdAt/updatedAt |
| **Token Refresh** | Automatic handling in React hooks |

---

## Implementation Plan

### Phase 1: Critical Gaps
1. **User state storage** - Minimal storage for `userId` + `activeConversations` map
2. **`getOrStartConversation()` endpoint** - Smart resume logic using activeConversations
3. **`join-conversation` socket event** - Resume real-time updates for existing conversation
4. **`edit-chat` socket event** - Edit previous messages
5. **`finish-chat` socket event** - Explicit conversation ending
6. **Conversation history UI** - List user's past conversations with resume capability
