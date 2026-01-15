import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownpatClient, createDownpatClient } from './DownpatClient';

describe('DownpatClient', () => {
  let client: DownpatClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    client = createDownpatClient({
      getToken: () => 'test-token',
    });
  });

  it('should create a client instance', () => {
    expect(client).toBeInstanceOf(DownpatClient);
  });

  it('should include auth header when token is present', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await client.getPublishedExercises();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/downpat/exercises/published',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('should throw on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(client.getPublishedExercises()).rejects.toThrow('Unauthorized');
  });

  it('should use custom baseUrl when provided', async () => {
    const customClient = createDownpatClient({
      baseUrl: '/custom/api',
      getToken: () => null,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await customClient.getPublishedExercises();

    expect(mockFetch).toHaveBeenCalledWith(
      '/custom/api/exercises/published',
      expect.anything()
    );
  });
});
