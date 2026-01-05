# Verification Plan

This document outlines the verification approach for each user story. All stories must be verified before being marked complete.

## Verification Techniques

| Technique | Description |
|-----------|-------------|
| **API** | Direct curl commands to test backend endpoints |
| **shot-scraper** | Automated browser screenshots with JavaScript execution |
| **Server Logs** | Console output to confirm events/errors |

### Verification Strategy

All UI verification uses this pattern:

1. **Setup via API** - Create test data with curl (exercises, publish state, etc.)
2. **Navigate directly** - Go to specific URL (e.g., `/admin/exercises`) instead of clicking through
3. **Login via JS** - Simple script to fill email and submit
4. **One action per screenshot** - Click button, wait, capture result
5. **Visual confirmation** - I inspect the screenshot to verify expected state

Example for verifying Publish button:
```bash
# 1. API: Create exercise in draft state
curl -X POST http://localhost:3001/api/downpat/exercises ...

# 2. Screenshot: Admin list showing Draft badge
shot-scraper http://localhost:5173/admin/exercises -o step1-draft.png \
  --javascript '[login script]'

# 3. API: Publish the exercise
curl -X POST http://localhost:3001/api/downpat/exercises/SLUG/publish ...

# 4. Screenshot: Admin list showing Published badge
shot-scraper http://localhost:5173/admin/exercises -o step2-published.png \
  --javascript '[login script]'

# 5. I inspect both screenshots to confirm badge changed from Draft to Published
```

### When Manual Testing is Required

Only when there's a **known bug** that prevents automation from working. Currently:
- None - all critical paths can be verified via shot-scraper

## User Stories - Verification Plan

### Authentication (US-1 to US-3)

| ID | Story | Steps | Expected Result | Status |
|----|-------|-------|-----------------|--------|
| US-1 | Admin Login | 1. Navigate to /login 2. Enter "test@admin.com" 3. Submit 4. Screenshot | Admin badge visible, "Admin" nav link present | ✅ Verified |
| US-2 | Subscriber Login | 1. Navigate to /login 2. Enter "test@user.com" 3. Submit 4. Screenshot | "Subscriber" badge, NO "Admin" nav link | ✅ Verified |
| US-3 | Logout | 1. Login 2. Click Logout 3. Screenshot | Redirected to home, no user badge visible | ✅ Verified |

### Admin: Exercise Management (US-4 to US-9)

| ID | Story | Steps | Expected Result | Status |
|----|-------|-------|-----------------|--------|
| US-4 | Create Exercise | 1. API: POST /exercises 2. Screenshot /admin/exercises showing new exercise | Draft badge visible, exercise name correct | ✅ Verified |
| US-5 | View Exercise List | 1. API: Create 2 exercises 2. Screenshot list | Exactly 2 entries, one per exercise, no duplicates | ✅ Verified |
| US-6 | Edit Exercise | 1. API: Create exercise 2. Screenshot /admin/exercises/SLUG/edit 3. Screenshot after save | Edit form loads, changes persist | ✅ Verified |
| US-7 | Publish Exercise | 1. API: Create exercise 2. Screenshot (Draft) 3. API: Publish 4. Screenshot (Published) | Badge changes from yellow "Draft" to green "Published" | ✅ Verified |
| US-8 | Unpublish Exercise | 1. API: Create + publish 2. Screenshot (Published) 3. API: Unpublish 4. Screenshot (Draft) | Badge changes from green "Published" to yellow "Draft" | ✅ Verified |
| US-9 | Delete Exercise | 1. API: Create exercise 2. Screenshot showing exercise 3. API: Delete 4. Screenshot showing removed | ✅ Verified |

### Admin: Testing Exercises (US-10 to US-11)

| ID | Story | Steps | Expected Result | Status |
|----|-------|-------|-----------------|--------|
| US-10 | Test Draft Exercise | 1. API: Create draft exercise 2. Login as admin 3. Navigate to conversation with draft 4. Screenshot chat | Admin can access and chat with unpublished exercise | ⏳ Feature pending - needs "Test" button |
| US-11 | Test Published Exercise | 1. API: Create + publish 2. Login as admin 3. Start conversation 4. Screenshot chat | Admin can chat with published exercise | ⏳ Depends on US-14 |

### Subscriber: Browsing & Conversations (US-12 to US-15)

| ID | Story | Steps | Expected Result | Status |
|----|-------|-------|-----------------|--------|
| US-12 | Browse Published Exercises | 1. API: Create + publish exercise 2. Login as subscriber 3. Screenshot /exercises | Only published exercises visible, draft exercises hidden | ✅ Verified |
| US-13 | Start Conversation | 1. API: Create + publish 2. Login as subscriber 3. Click "Start Practice" 4. Screenshot conversation page | Welcome message displayed, input ready | ✅ Verified |
| US-14 | Chat with AI | 1. Start conversation 2. Type message 3. Click Send 4. Screenshot response | AI responds with streamed content | ✅ Verified |
| US-15 | Talk to Coach | 1. In conversation 2. Click coach button 3. Send coach message 4. Screenshot | Coach sidebar opens, response shown | ⏳ Pending |

### Data Integrity (US-16 to US-17)

| ID | Story | Steps | Expected Result | Status |
|----|-------|-------|-----------------|--------|
| US-16 | No Duplicate Entries | 1. API: Create exercise 2. API: Publish 3. Screenshot admin list | Exactly 1 entry with Published badge, no duplicates | ✅ Fixed |
| US-17 | Draft/Published Separation | 1. API: Create + publish 2. API: Edit draft 3. API: GET published 4. Compare | Published version unchanged after draft edit | ✅ Verified |

---

## Critical Path

The following stories MUST work for a functional demo:

1. **US-1** - Admin can login ✅
2. **US-2** - Subscriber can login ✅
3. **US-4** - Admin can create exercise ✅
4. **US-7** - Admin can publish exercise ✅
5. **US-12** - Subscriber can see published exercises ✅
6. **US-13** - Subscriber can start conversation ✅
7. **US-14** - Subscriber can chat with AI ✅

---

## Execution Order

1. ~~**Fix US-14** - Reproduce error, fix root cause~~ ✅ Fixed
2. ~~**Verify US-1 to US-3** - Authentication flows~~ ✅ Complete
3. ~~**Verify US-4 to US-9** - Exercise CRUD~~ ✅ Complete
4. ~~**Verify US-12 to US-14** - Subscriber conversation flow~~ ✅ Complete
5. ~~**Verify US-16 to US-17** - Data integrity~~ ✅ Complete

---

## Login Script (reusable)

```javascript
// Admin login - use for /admin/* pages
const adminLogin = `
(async () => {
  const emailInput = document.querySelector("input[type=email]");
  if (emailInput) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(emailInput, "test@admin.com");
    emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    document.querySelector("button").click();
    await new Promise(r => setTimeout(r, 1500));
  }
})()
`;

// Subscriber login - use for /exercises/* pages
const subscriberLogin = `
(async () => {
  const emailInput = document.querySelector("input[type=email]");
  if (emailInput) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(emailInput, "test@user.com");
    emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    document.querySelector("button").click();
    await new Promise(r => setTimeout(r, 1500));
  }
})()
`;
```

---

## Verification Log

| Date | Story | Result | Notes |
|------|-------|--------|-------|
| 2026-01-05 | US-14 | FAIL | Page errored twice on sending "hello" |
| 2026-01-05 | US-14 | CODE FIX | AI adapter wired into socket, message format fixed |
| 2026-01-05 | US-1-3 | PASS | Authentication verified via shot-scraper |
| 2026-01-05 | US-4-9 | PASS | Exercise CRUD verified via API + shot-scraper |
| 2026-01-05 | US-12-13 | PASS | Browse exercises, start conversation verified |
| 2026-01-05 | US-16-17 | PASS | No duplicates, draft/published separation confirmed |
| 2026-01-05 | US-14 | PASS | AI responds with streamed content, chat working |
| 2026-01-05 | US-14 | BUG FIX | Fixed message-complete handler expecting undefined message data |
| 2026-01-05 | US-14 | VERIFIED | Complete AI response displayed, page stable after send |
