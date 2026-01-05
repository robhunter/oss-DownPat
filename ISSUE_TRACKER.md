# DownPat Example App - Issue Tracker

## User Stories & Verification Status

### Authentication
| ID | Story | Status | Notes |
|----|-------|--------|-------|
| US-1 | Admin Login - email with "@admin" gets admin badge and Admin nav link | ✅ Verified | shot-scraper verified |
| US-2 | Subscriber Login - regular email, no admin badge, no Admin nav | ✅ Verified | shot-scraper verified |
| US-3 | Logout - ends session, redirects to home | ✅ Verified | |

### Admin: Exercise Management
| ID | Story | Status | Notes |
|----|-------|--------|-------|
| US-4 | Create Exercise - new exercise appears with Draft status | ✅ Verified | API + UI verified |
| US-5 | View Exercise List - ONE entry per exercise, correct status | ✅ Verified | Fixed duplicate issue |
| US-6 | Edit Exercise - changes saved to draft only | ✅ Verified | |
| US-7 | Publish Exercise - status changes to Published, visible to subscribers | ✅ Verified | Fixed - shows green "Published" badge |
| US-8 | Unpublish Exercise - status changes to Draft, hidden from subscribers | ✅ Verified | Returns to yellow "Draft" badge |
| US-9 | Delete Exercise - removed entirely | ✅ Verified | API verified |

### Admin: Testing Exercises
| ID | Story | Status | Notes |
|----|-------|--------|-------|
| US-10 | Test Draft Exercise - admin can chat with draft | ✅ Verified | Test button added, ADMIN TEST badge shown |
| US-11 | Test Published Exercise - admin can chat with published | ✅ Verified | Test button works for published too |

### Subscriber: Browsing & Conversations
| ID | Story | Status | Notes |
|----|-------|--------|-------|
| US-12 | Browse Published Exercises - only published visible | ✅ Verified | shot-scraper verified |
| US-13 | Start Conversation - click exercise to start | ✅ Verified | Fixed socket start-conversation handler |
| US-14 | Chat with AI - send/receive messages with streaming | ✅ Verified | Fixed message-complete handler, AI chat working |
| US-15 | Talk to Coach - sidebar works if enabled | ✅ Verified | Sidebar opens, sends/receives messages |

### Data Integrity
| ID | Story | Status | Notes |
|----|-------|--------|-------|
| US-16 | No Duplicate Entries - publish/unpublish never creates duplicates | ✅ Fixed | Fixed in storage layer |
| US-17 | Draft/Published Separation - edits only affect draft | ✅ Verified | Metadata tracks draft/published IDs |

---

## Resolved Issues

### Issue #1: Publishing Creates Duplicate Entries (FIXED)
- **Reported:** User created exercise, published it, saw two entries
- **Root Cause:**
  1. `getExercises()` returned all exercises including published copies
  2. Published copy kept original exerciseId instead of new ID
- **Fix:**
  1. Filter out `-published` suffixed exercises in `getExercises()`
  2. Set `exerciseId: publishedId` when publishing in `publishExercise()`
  3. Added `/api/downpat/exercises/with-metadata` endpoint for admin UI
- **Files Modified:**
  - `example-app/server/src/index.ts`
  - `packages/express/src/routes/conversations.ts`
- **Status:** ✅ RESOLVED

### Issue #2: Conversation Stuck on Loading (FIXED)
- **Reported:** Clicking "Start Practice" showed infinite loading
- **Root Cause:**
  1. Server socket handler missing `start-conversation` event
  2. Socket auth used handshake token but server expected separate authenticate event
- **Fix:**
  1. Added `start-conversation` handler in `packages/express/src/socket.ts`
  2. Auto-authenticate from `socket.handshake.auth.token`
  3. Route supports both `exerciseSlug` and `exerciseId`
- **Files Modified:**
  - `packages/express/src/socket.ts`
  - `packages/express/src/routes/conversations.ts`
- **Status:** ✅ RESOLVED

### Issue #3: AI Not Responding (FIXED)
- **Reported:** Sending message showed blank AI response
- **Root Cause:**
  1. AI adapter was never wired into the socket handler
  2. `send-message` only saved user message, didn't call AI
  3. Client sent `{ text }` but server expected `{ conversationId, content }`
- **Fix:**
  1. Added AI call in socket `send-message` handler (`packages/express/src/socket.ts`)
  2. Added `aiAdapter` and `defaultModel` to `SocketConfig` interface
  3. Fixed client to send `{ conversationId, content }`
  4. Updated server `index.ts` to pass AI adapter to socket config
- **Files Modified:**
  - `packages/express/src/socket.ts` - Added AI streaming integration
  - `example-app/server/src/index.ts` - Pass AI adapter to socket
  - `example-app/client/src/hooks/useSocket.ts` - Fixed message format
- **Status:** ✅ RESOLVED (AI adapter working, see Issue #5 for final fix)

### Issue #5: Page Crashes After Sending Message (FIXED)
- **Reported:** Page goes blank after sending a message, AI response doesn't complete
- **Root Cause:**
  1. Server emits `message-complete` with no data
  2. Client handler expected `(message: MessageData)` parameter
  3. Client tried to add `undefined` to messages array, causing crash
- **Fix:**
  1. Changed client handler to `socket.on('message-complete', () => { ... })`
  2. Instead of replacing with server message, keep the streamed content and update messageId
- **Files Modified:**
  - `example-app/client/src/hooks/useSocket.ts` - Fixed message-complete handler
- **Status:** ✅ RESOLVED

### Issue #6: Talk to Coach Button Shows When Disabled (FIXED)
- **Reported:** Coach button (💬) visible even when `talkToCoachEnabled: false`
- **Root Cause:**
  1. Server wasn't sending `talkToCoachEnabled` in `conversation-started` socket event
  2. Client had no way to know if coach was enabled for the exercise
- **Fix:**
  1. Added `talkToCoachEnabled` to server socket emit in `packages/express/src/socket.ts`
  2. Updated `ServerToClientEvents` type to include `talkToCoachEnabled`
  3. Added `talkToCoachEnabled` state to `useConversation` hook
  4. Conditionally render coach button in `Conversation.tsx` based on `talkToCoachEnabled`
- **Files Modified:**
  - `packages/express/src/socket.ts` - Added talkToCoachEnabled to conversation-started event
  - `packages/express/src/socket.test.ts` - Added tests for talkToCoachEnabled
  - `example-app/client/src/hooks/useSocket.ts` - Track talkToCoachEnabled state
  - `example-app/client/src/pages/Conversation.tsx` - Conditionally show coach button
- **Status:** ✅ RESOLVED

### Issue #4: Status Badge Shows Wrong State (FIXED)
- **Reported:** Published exercises show "Draft" status
- **Root Cause:** ExerciseList wasn't using metadata to determine status
- **Fix:**
  1. ExerciseList now uses `ExerciseWithMetadata` interface
  2. Status determined by `!!metadata.published`
- **Files Modified:**
  - `packages/admin-ui/src/components/ExerciseList.tsx`
  - `example-app/client/src/pages/admin/ExerciseListPage.tsx`
- **Status:** ✅ RESOLVED

---

## Verification Log

| Timestamp | Story | Action | Result |
|-----------|-------|--------|--------|
| 2026-01-05 | US-1 | shot-scraper admin login | Admin badge + Admin nav visible |
| 2026-01-05 | US-2 | shot-scraper subscriber login | Subscriber badge, no Admin nav |
| 2026-01-05 | US-4-9 | API + shot-scraper CRUD | All CRUD operations work, no duplicates |
| 2026-01-05 | US-12-14 | shot-scraper subscriber flow | Exercise browser shows published, conversation starts |
| 2026-01-05 | US-10-11 | shot-scraper admin test | Test button added, ADMIN TEST badge, chat working |
| 2026-01-05 | US-15 | shot-scraper coach sidebar | Talk to Coach opens, messages sent/received |

