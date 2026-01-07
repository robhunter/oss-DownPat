# Verification Guide

This guide shows both human developers (on Mac) and AI coding agents (in Docker) how to verify their work.

## Goal

Ensure that:
1. Tests run in both Docker and Mac
2. Example app runs in both environments
3. Browser actually works (CSS loaded, JavaScript executing)

## Running Tests

### Agent (in Docker)

```bash
npm test
```

**Expected output:**
```
✓ test/setup.test.ts (2 tests)
✓ example-app/server/src/index.test.ts (1 test)
✓ example-app/client/src/App.test.tsx (2 tests)

Test Files  3 passed (3)
     Tests  5 passed (5)
```

### Human (on Mac)

Same command:
```bash
npm test
```

### Troubleshooting Tests

**Issue**: Tests hang in Docker
- **Solution**: The Vitest config is set up to avoid hanging. If tests still hang, try:
  ```bash
  npm test -- --no-threads
  ```

**Issue**: Module not found errors
- **Solution**: Run `npm install` first to install all dependencies

## Running the Example App

### Starting the Server

```bash
npm run dev:server
```

**Expected output:**
```
Server running on http://localhost:3001
```

**Verify with curl:**
```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","message":"Hello from DownPat!"}
```

### Starting the Client

In a separate terminal:
```bash
npm run dev:client
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

## Browser Verification (shot-scraper)

The `verify-browser.sh` script takes a screenshot of the running application to verify:
- CSS is properly loaded
- JavaScript is executing
- The page renders correctly

### Prerequisites

1. Install shot-scraper (Python tool):
   ```bash
   pip install shot-scraper
   shot-scraper install  # Downloads Chromium
   ```

2. Both server and client must be running

### Running Browser Verification

```bash
npm run verify:browser
# or directly:
./scripts/verify-browser.sh
```

**Expected output:**
```
🌐 Verifying browser experience...
Checking API server on port 3001...
✓ API server is running
Checking client on port 5173...
✓ Client is running
Taking screenshot...
✓ Screenshot captured successfully (xxxxx bytes)

📸 Screenshot saved to: verification-screenshots/app.png

✅ Browser verification PASSED
```

### What to Check in the Screenshot

The screenshot should show:
- [ ] White card centered on gray background
- [ ] "DownPat" title in blue
- [ ] "Open Source Conversational AI Training" subtitle
- [ ] API Status showing "Hello from DownPat!"
- [ ] Three green checkmarks for verification items

### Admin UI Verification

After logging in as admin, verify the admin pages render correctly:

```bash
# Take screenshot of admin exercise form (requires login first)
shot-scraper http://localhost:5173/admin/exercises/new -o /tmp/admin-form.png --wait 3000
```

The admin form should show:
- [ ] Styled form inputs with proper borders and spacing
- [ ] Section headers ("Basic Information", "Content", "Tasks", "Settings")
- [ ] Blue primary buttons
- [ ] Proper label styling

### Troubleshooting Browser Verification

**Issue**: `shot-scraper: command not found`
- **Solution**: Install with `pip install shot-scraper && shot-scraper install`

**Issue**: Screenshot is blank or very small
- **Solution**: The `--wait 2000` flag waits 2 seconds for the page to load. If the page is slow, increase this value.

**Issue**: "Connection refused" errors
- **Solution**: Make sure both server (port 3001) and client (port 5173) are running

## Complete Verification Checklist

Run these commands in order to fully verify the setup:

```bash
# 1. Install dependencies
npm install

# 2. Run tests
npm test

# 3. Start server (in terminal 1)
npm run dev:server

# 4. Start client (in terminal 2)
npm run dev:client

# 5. Manual curl check
curl http://localhost:3001/api/health

# 6. Browser verification (requires shot-scraper)
npm run verify:browser

# 7. Visual inspection
# Open verification-screenshots/app.png and verify it looks correct
```

## For AI Agents

When implementing new milestones:

1. **After writing code**: Run `npm test` to verify tests pass
2. **After UI changes**: Run the browser verification script
3. **Document issues**: If something doesn't work, note it in the PR/commit message
4. **Include screenshots**: Attach the verification screenshot when submitting work

## For Human Developers

1. **Review screenshots**: AI agents will include verification screenshots - review them
2. **Run locally**: Pull changes and run the full verification checklist
3. **Check the browser**: Open http://localhost:5173 in your browser to see the actual experience
4. **Report issues**: If verification passes but something looks wrong, file an issue
