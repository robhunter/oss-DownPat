# Publish/Restore Semantics Refactor

## Overview

Refactor the exercise publishing model to simplify draft/published state management, then move publish/restore controls from the exercise list to the exercise detail page.

## New Storage Model

### States

| State | Meaning |
|-------|---------|
| Draft only | New/unpublished exercise |
| Published only | Live, no pending changes |
| Draft + Published | Live with pending edits |

### Transitions

- **Publish**: Copy draft → published, delete draft
- **Start editing published**: Create draft from published
- **Restore**: Delete draft (revert to published-only)
- **Unpublish**: Move published → draft

### Benefits

- "Has draft changes" = simply check if draft exists when published exists
- Restore = just delete draft
- Clearer what version you're editing
- Less ambiguity about state

---

## Implementation Phases

### Phase 1: Storage Model Changes

**Goal:** Implement the "delete draft on publish" model at the storage layer.

**Changes:**

1. **`packages/core/src/storage/in-memory.ts`**
   - `publishExercise`: Copy draft to published, then delete draft
   - `unpublishExercise`: Convert published → draft (move, don't copy)
   - `restoreFromPublished`: Simply delete the draft
   - Add `createDraftFromPublished(slug)`: Create draft copy from published (for editing)

2. **`packages/core/src/interfaces/exercise-storage.ts`**
   - Add `createDraftFromPublished(slug): Promise<void>` to interface
   - Update JSDoc comments to reflect new behavior

3. **`packages/core/src/storage/in-memory.test.ts`**
   - Test: publish deletes draft
   - Test: unpublish moves published to draft
   - Test: restore deletes draft when published exists
   - Test: createDraftFromPublished creates draft from published
   - Test: createDraftFromPublished fails if draft already exists
   - Test: createDraftFromPublished fails if no published version

4. **`packages/firebase/...`** (if Firebase storage exists)
   - Same changes as in-memory

**Deliverable:** Storage layer tests pass, API contracts updated.

---

### Phase 2: Remove Publish/Restore from ExerciseList

**Goal:** Clean up the list page before adding to detail page.

**Changes:**

1. **`packages/admin-ui/src/components/ExerciseList.tsx`**
   - Remove Publish, Unpublish, Restore buttons
   - Remove `confirmRestore` state
   - Remove `handleRestore` function
   - Remove `onPublish`, `onUnpublish`, `onRestore` from props interface

2. **`packages/admin-ui/src/pages/ExerciseListPage.tsx`**
   - Remove `handlePublish`, `handleUnpublish`, `handleRestore`
   - Stop passing those props

3. **`packages/admin-ui/src/components/ExerciseList.test.tsx`**
   - Remove tests for publish/unpublish/restore buttons
   - Update prop mocks

4. **`packages/admin-ui/src/styles/admin-ui.css`**
   - Remove or mark unused button styles (cleanup)

**Deliverable:** List page shows only Edit/Test/Delete. Tests pass.

---

### Phase 3: Add Publish/Restore to ExerciseDetailPage

**Goal:** Add the publishing controls to the detail page with proper UX.

**Changes:**

1. **`packages/admin-ui/src/pages/ExerciseDetailPage.tsx`** (or equivalent)
   - Fetch exercise metadata to know draft/published state
   - Add button row above "Update Exercise"
   - Publish button (when draft exists) - secondary/warning style
   - Unpublish button (when published exists) - secondary/warning style
   - Restore button (when both draft AND published exist) - destructive style
   - Confirmation dialogs for all three actions
   - Call API methods, refresh state on success

2. **`packages/admin-ui/src/styles/admin-ui.css`**
   - Styles for the publishing button row
   - Ensure destructive button style exists

3. **Tests for ExerciseDetailPage**
   - Test button visibility based on state
   - Test confirmation flow
   - Test API calls on confirm

**Deliverable:** Full publishing workflow from detail page. All tests pass.

---

## Button Styling

| Button | Style | Notes |
|--------|-------|-------|
| Publish | Secondary/Warning | Not the primary action |
| Unpublish | Secondary/Warning | Same as publish |
| Restore | Destructive (red) | Discards work |
| Update Exercise | Primary | Main action on page |
