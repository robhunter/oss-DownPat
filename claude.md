# Project Development Standards

## Guidelines

When writing code:
- Keep track of issues using chainlink (https://github.com/dollspace-gay/chainlink).  Break up large issues (tasks that will result in more than a couple hundred lines of code).
- All tests (unit and e2e) tests must pass.
- For any verification step the user must perform, you should perform it first and make sure it's working.
- Keep in mind this code will be reviewed by a strict reviewer.
- Ensure that the server is running and accessible.
- Legacy code is available at .DownPatNode. When in doubt, check the source.

If the user is repeating themselves, suggest updating claude.md with their guidance.

## Definition of Done

The user's time is much, much more valuable than yours.  Do not EVER ask the user to do something that you could do.  For verification steps, you should complete the exact same verification steps yourself BEFORE asking the user to do so.  If there's a verification step that you cannot perform, try to develop a plan to be able to perform it.  If you ask the user to perform a verification step that you have not verified first, you MUST explain why you could not verify it yourself.

You should ask the user to approve an important design decision or dangerous change (ex: deleting data).  You should NEVER conclude that a task is complete or ask the user to verify a change without first verifying it yourself.

## Chainlink Issue Tracking (MANDATORY)

All development work MUST be tracked using chainlink. No exceptions.

### Session Workflow
```bash
# Start every work session
chainlink session start

# Mark what you're working on
chainlink session work <issue_id>

# Add discoveries/notes as you work
chainlink comment <issue_id> "Found: ..."

# End session with handoff notes
chainlink session end --notes "Completed X, Y pending"
```

### Issue Management
```bash
# Create issues
chainlink create "Issue title" -p <low|medium|high|critical>
chainlink subissue <parent_id> "Subtask title"

# Track dependencies
chainlink block <blocked_id> <blocker_id>
chainlink unblock <blocked_id> <blocker_id>

# Find work
chainlink ready          # Issues with no open blockers
chainlink next           # Suggested next issue
chainlink list           # All open issues
chainlink tree           # Hierarchical view

# Update progress
chainlink update <id> -s <open|in_progress|review|closed>
chainlink close <id>
chainlink comment <id> "Progress update..."

# Milestones
chainlink milestone create "v1.0"
chainlink milestone add <milestone_id> <issue_id>
```

### Rules
1. **Create issues BEFORE starting work** - No undocumented changes
2. **Use `session work`** - Always mark current focus
3. **Add comments** - Document discoveries, blockers, decisions
4. **Close with notes** - Future you will thank present you
5. **Large features** - Break into subissues, never exceed 500 lines per file

---

## Git Usage (MANDATORY)

You should commit changes as you progress.  Each commit should ideally address only a single chainlink task/subtask - try to make smaller, more easily reviewable commits.

CRITICAL: DO NOT EDIT GIT HISTORY WITHOUT EXPLICIT USER PERMISSION. EVERY GIT HISTORY EDIT NEEDS NEW, EXPLICIT PERMISSION.

CRITICAL: NEVER run `gh auth setup-git` or modify the global git config (`~/.gitconfig`). The global git config is shared with the user's host machine via the container filesystem. Modifying it (e.g., adding a credential helper) will break the user's local git setup (SSH auth, credentials, etc.). If you need to push via `gh`, use `gh pr create` or `gh api` directly — these use `gh`'s own auth token without modifying git config.

### Stacked PRs (Preferred Workflow)

For multi-part features, use **stacked PRs** instead of one large PR:

**Why stack PRs:**
- Smaller PRs are easier to review (target 200-400 lines of diff)
- Reviewers can approve early parts while later parts are still in progress
- Feedback on one layer doesn't block progress on others
- Each PR has a focused scope and clear purpose

**When to split into stacked PRs:**
- Feature touches multiple layers (data model → business logic → API → tests)
- Total diff would exceed 500 lines
- Logical separation exists (e.g., "add module" vs "integrate module")
- Different parts could be reviewed by different people

**How to create a stack:**
```bash
# Start from main
git checkout main && git pull

# Create first PR branch
git checkout -b feature-1-foundation
# ... make changes, commit, push
gh pr create --base main --title "Add foundation for X"

# Create second PR branch FROM the first
git checkout -b feature-2-integration
# ... make changes, commit, push
gh pr create --base feature-1-foundation --title "Integrate X into Y"

# Create third PR branch FROM the second
git checkout -b feature-3-tests
# ... make changes, commit, push
gh pr create --base feature-2-integration --title "Add tests for X integration"
```

**Naming convention:** `feature-N-description` where N indicates stack order.

**When earlier PRs change:**
If PR #1 needs changes after review, update the entire stack:
```bash
# Fix issues on PR #1's branch
git checkout feature-1-foundation
# ... make fixes, commit, push

# Rebase PR #2 onto updated PR #1
git checkout feature-2-integration
git rebase feature-1-foundation
git push --force-with-lease

# Rebase PR #3 onto updated PR #2
git checkout feature-3-tests
git rebase feature-2-integration
git push --force-with-lease
```

**Merging order:** PRs must merge bottom-up. After PR #1 merges to main, update PR #2's base to main. GitHub will auto-update the diff.


### Self-Review Workflow

When a PR is ready for review, run the automated review process before asking the user.

**Running Reviews:**
```bash
# Initial review (can approve if no blockers)
.claude-tools/scripts/review-pr.sh start <pr-url>

# Follow-up review (cannot approve, for iteration)
.claude-tools/scripts/review-pr.sh continue <pr-url>
```

**Review Loop:**
1. Push branch, create PR
2. Run `.claude-tools/scripts/review-pr.sh start <pr-url>`
3. Parse output for blockers/nits/acks
4. **Assess validity** of each comment:
   - Is it correct or hallucinated?
   - Is it already addressed?
   - Is it a real issue or style preference?
5. Fix valid issues; prefer fixing partially-valid over deferring
6. Post overview comment summarizing changes/rationale
7. Reply to **every** inline comment (even "not addressing because X")
8. Push fixes
9. Run `.claude-tools/scripts/review-pr.sh start <pr-url>` again
10. Repeat until exit condition

**Exit Conditions:**
- **Success**: `start review` returns no blockers → ready to merge
- **Circuit breaker**: 5 `start review` iterations → escalate to user
- **Impasse**: hallucinations, repetitions, fundamental disagreement → escalate with summary

**When to Escalate vs Self-Resolve:**

| Self-resolve | Escalate |
|--------------|----------|
| Clear bugs, missing null checks | Design disagreements |
| Valid style feedback | Ambiguous requirements |
| Missing tests | Reviewer asks for changes you believe are wrong |
| Partially-valid issues (prefer fix) | After 5 iterations |

**Responding to Comments:**
- Post ONE overview comment summarizing all changes and rationale
- Reply to EVERY inline comment individually:
  - If fixed: "Fixed in <commit>"
  - If not fixing: Explain why (design choice, out of scope, disagree)
  - If partially fixed: Explain what was done and what wasn't
- Use `gh pr comment` for overview, `gh api` for inline replies

**Credential Separation:**
The review script uses separate GitHub credentials for Gemini, stored at `~/.config/gemini-gh-token` (override with `GEMINI_GH_TOKEN_FILE` env var). This keeps Claude's and Gemini's GitHub access isolated.


---

## Test Coverage (MANDATORY)

### Requirements
- **Minimum 80% line coverage** for all new code
- **100% coverage** for public API functions
- **All bug fixes** must include a regression test

### Required Test Types
1. **Unit tests** - Test individual functions in isolation
2. **Integration tests** - Test module interactions
3. **Doc tests** - All public API examples must be tested

---

## Data Collection & Persistence

- NEVER delete data files (*.db, collected samples) without explicit user approval

## When User Expresses Frustration

- STOP and re-read their previous messages
- Their frustration likely means you missed a requirement
- Verify understanding before writing more code

## Milestone Workflow

1. Complete one milestone at a time
2. Fully verify before proceeding to the next milestone via unit tests, integration tests, AND inspecting browser screenshots with shot-scraper
3. Proceed through each step in the plan unless you've hit a wall and require human intervention to proceed

## Verification Requirements

Every milestone must pass:

```bash
# Run tests
npm test

# Start both servers (backgrounds automatically)
npm run dev

# Or start separately:
# npm run dev:server  (API on port 3001)
# npm run dev:client  (Vite on port 5173)

# Browser verification (captures screenshot)
shot-scraper http://localhost:5173 -o /tmp/screenshot.png --wait 2000
```

## Validation Strategies

### 1. API Integration Tests
Test data integrity via curl commands:
```bash
# Login as admin
curl -X POST http://localhost:3001/api/downpat/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@admin.com"}'

# Create exercise (with token)
curl -X POST http://localhost:3001/api/downpat/exercises \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{"exerciseId":"...", ...}'

# List exercises and verify count/status
curl http://localhost:3001/api/downpat/exercises \
  -H "Authorization: Bearer admin-token"
```

### 2. Visual Verification with shot-scraper
Take screenshots at key user flow points:
```bash
# Home page (logged out)
shot-scraper http://localhost:5173 -o /tmp/home.png --wait 2000

# With JavaScript interaction (login, navigation)
shot-scraper http://localhost:5173/login -o /tmp/login.png --wait 2000

# Execute JS to interact with page
shot-scraper http://localhost:5173 -o /tmp/result.png --wait 3000 \
  --javascript "document.querySelector('button').click()"
```

### 3. Component Unit Tests
Vitest tests for React components in `src/**/*.test.tsx`:
- Correct rendering of states (Draft vs Published)
- Protected route behavior
- Form validation

### 4. Socket.io Chat Testing
Two approaches:

**Visual (shot-scraper):**
```bash
# Navigate to conversation, interact via JS, screenshot result
shot-scraper "http://localhost:5173/exercises/test-exercise" \
  -o /tmp/chat.png --wait 5000 \
  --javascript "
    document.querySelector('input').value = 'Hello';
    document.querySelector('button[type=submit]').click();
  "
```

**API-level (Node.js script):**
```javascript
// test-socket.js
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001', { auth: { token: 'demo-token' } });
socket.emit('start-conversation', { slug: 'test-exercise' });
socket.on('conversation-started', (data) => console.log('Started:', data));
```

### 5. End-to-End Flow Verification
For each user story, verify:
1. API returns expected data
2. Screenshot shows expected UI state
3. No console errors (check via shot-scraper JS execution)

## Port Configuration

- **5173** - Only port exposed to user (Vite client)
- **3001** - API server (internal, proxied through Vite)

User accesses the app via `localhost:5173`. Vite proxies `/api/*` and `/socket.io/*` to the server internally.

## Key Files

- `development_plan/IMPLEMENTATION_PLAN.md` - Detailed milestone specs
- `VERIFICATION.md` - Testing instructions
- `.env` - Environment variables (Firebase, OpenAI keys)

## Platform Note

If `npm test` fails with platform errors (darwin vs linux), reinstall:
```bash
rm -rf node_modules package-lock.json && npm install
```

## After Context Compaction

  When a conversation is resumed from a summary:
  1. **Do NOT automatically continue with "next steps"** mentioned in the summary
  2. Summaries describe what was *planned*, not what was *approved*
  3. Before starting any new phase or major work item, confirm with the user
  4. When in doubt, ask: "The summary mentions X as next. Should I proceed?"

## Common Pitfalls

- When asked a design question ("What do you need to do...?"), discuss the approach before implementing
- When adding to .gitignore, check if files are already tracked (`git rm --cached`)
- After modifying workspace packages, rebuild them (`npm run build --workspace=@downpat/...`)
- When making API-level changes, consider if UI changes are also needed
- When configuring test behavior, check both unit tests (vitest) AND e2e tests (playwright)
- Debug root causes rather than adding fallbacks/workarounds
- NEVER run `gh auth setup-git` or modify `~/.gitconfig` — it's shared with the user's host machine and will break their local git auth
