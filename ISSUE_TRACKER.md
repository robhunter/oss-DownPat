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
| US-10 | Test Draft Exercise - admin can chat with draft | ⏳ Pending | Feature to be implemented |
| US-11 | Test Published Exercise - admin can chat with published | ⏳ Pending | Feature to be implemented |

### Subscriber: Browsing & Conversations
| ID | Story | Status | Notes |
|----|-------|--------|-------|
| US-12 | Browse Published Exercises - only published visible | ✅ Verified | shot-scraper verified |
| US-13 | Start Conversation - click exercise to start | ✅ Verified | Fixed socket start-conversation handler |
| US-14 | Chat with AI - send/receive messages with streaming | ✅ Verified | Welcome message displays correctly |
| US-15 | Talk to Coach - sidebar works if enabled | ⏳ Pending | UI exists, backend needs testing |

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

### Issue #3: Status Badge Shows Wrong State (FIXED)
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

