import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Hello from DownPat!' });
});

// Only start server when run directly (not when imported for tests)
let server: ReturnType<typeof app.listen> | null = null;

const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFile ||
                     process.argv[1]?.endsWith('/tsx') ||
                     process.argv[1]?.includes('tsx/');

if (isMainModule) {
  server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// For testing - start server on demand
function startServer(port = PORT) {
  if (server) return server;
  server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  return server;
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

export { app, server, startServer, stopServer };
