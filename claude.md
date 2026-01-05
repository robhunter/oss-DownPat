# Claude Code Guidance

## Milestone Workflow

1. Complete one milestone at a time
2. Fully verify before proceeding to the next milestone via unit tests, integration tests, AND inspecting browser screenshots with shot_scraper.
3. Proceed through each step in the plan unless you've hit a wall and require human intervention to proceed

## Verification Requirements

Every milestone must pass:

```bash
# Run tests
npm test

# Start server (terminal 1)
npm run dev:server

# Start client (terminal 2)
npm run dev:client

# Browser verification (captures screenshot)
npm run verify:browser
```

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
