# Claude Code Guidance

## Milestone Workflow

1. Complete one milestone at a time
2. Fully verify before proceeding to the next milestone via unit tests, integration tests, AND inspecting browser screenshots with shot-scraper
3. Proceed through each step in the plan unless you've hit a wall and require human intervention to proceed

## Verification Requirements

Every milestone must pass:

```bash
# Run tests
npm test

# Start server (terminal 1)
npm run dev:server

# Start client (terminal 2)
npm run dev:client -- --host 0.0.0.0

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
