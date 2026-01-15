import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, startTestServer, stopServer } from './index.js';

describe('Server', () => {
  beforeAll(() => {
    startTestServer(3099); // Use different port to avoid conflicts
  });

  afterAll(() => {
    stopServer();
  });

  it('should respond to health check', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'Hello from DownPat!',
    });
  });
});
