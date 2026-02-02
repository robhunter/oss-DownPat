# Project Development Standards

## Shared Workflow Standards

Follow all guidelines in `.claude-tools/instructions/`. These are portable standards shared across projects:
- `chainlink.md` — Issue tracking workflow
- `definition-of-done.md` — Verification, approval, and completion standards
- `general-guidelines.md` — User approval, context compaction, frustration handling
- `github-prs.md` — Git commit rules and stacked PR workflow
- `pr-reviews.md` — Automated PR self-review workflow
- `parallel-agents.md` — Parallel subagent workspace isolation

## Guidelines

When writing code:
- All tests (unit and e2e) tests must pass.
- Keep in mind this code will be reviewed by a strict reviewer.
- Ensure that the server is running and accessible.
- Legacy code is available at .DownPatNode. When in doubt, check the source.

If the user is repeating themselves, suggest updating claude.md with their guidance.

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

## Common Pitfalls

- When asked a design question ("What do you need to do...?"), discuss the approach before implementing
- When adding to .gitignore, check if files are already tracked (`git rm --cached`)
- After modifying workspace packages, rebuild them (`npm run build --workspace=@downpat/...`)
- When making API-level changes, consider if UI changes are also needed
- When configuring test behavior, check both unit tests (vitest) AND e2e tests (playwright)
- Debug root causes rather than adding fallbacks/workarounds
