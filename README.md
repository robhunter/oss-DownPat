# DownPat

Open source conversational AI training platform.

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start the API server (port 3001)
npm run dev:server

# Start the React client (port 5173) - in a separate terminal
npm run dev:client
```

Open http://localhost:5173 in your browser.

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Firebase service account JSON
- `OPENAI_API_KEY` - Required for AI conversations and moderation

## Project Structure

```
├── packages/              # @downpat/* npm packages (future milestones)
├── example-app/
│   ├── server/            # Express API server (port 3001)
│   └── client/            # React + Vite client (port 5173)
├── scripts/               # Verification scripts
└── development_plan/      # Implementation documentation
```

## Verification

See [VERIFICATION.md](VERIFICATION.md) for testing and browser verification instructions.

## Development Documentation

See [development_plan/](development_plan/) for architecture decisions and implementation plans.

## License

MIT
