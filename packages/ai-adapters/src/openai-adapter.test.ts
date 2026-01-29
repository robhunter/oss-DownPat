import { describe, it, expect, vi } from 'vitest';
import { OpenAIAdapter, OpenAIModerationAdapter } from './openai-adapter.js';

describe('OpenAIAdapter', () => {
  const mockClient = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
    moderations: {
      create: vi.fn(),
    },
  };

  it('returns provider name', () => {
    const adapter = new OpenAIAdapter(mockClient);
    expect(adapter.provider).toBe('openai');
  });

  it('returns available models', () => {
    const adapter = new OpenAIAdapter(mockClient, ['gpt-4', 'gpt-3.5-turbo']);
    expect(adapter.getModels()).toEqual(['gpt-4', 'gpt-3.5-turbo']);
  });

  it('checks if model is supported', () => {
    const adapter = new OpenAIAdapter(mockClient, ['gpt-4', 'gpt-3.5-turbo']);
    expect(adapter.supportsModel('gpt-4')).toBe(true);
    expect(adapter.supportsModel('claude-3')).toBe(false);
  });

  it('completes non-streaming request', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: { content: 'Hello, world!' },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    });

    const adapter = new OpenAIAdapter(mockClient);
    const result = await adapter.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.content).toBe('Hello, world!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it('completes streaming request with usage data', async () => {
    const chunks = [
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ', world!' } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
      // Final chunk with usage (sent when stream_options.include_usage is true)
      {
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
    ];

    mockClient.chat.completions.create.mockResolvedValue(
      (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })()
    );

    const adapter = new OpenAIAdapter(mockClient);
    const receivedChunks: string[] = [];

    const result = await adapter.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      onChunk: (chunk) => receivedChunks.push(chunk),
    });

    expect(result.content).toBe('Hello, world!');
    expect(result.finishReason).toBe('stop');
    expect(receivedChunks).toEqual(['Hello', ', world!']);
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });

    // Verify stream_options was passed
    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: true,
        stream_options: { include_usage: true },
      }),
      { signal: undefined }
    );
  });

  it('handles content filter finish reason', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: { content: '' },
          finish_reason: 'content_filter',
        },
      ],
    });

    const adapter = new OpenAIAdapter(mockClient);
    const result = await adapter.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.finishReason).toBe('content_filter');
  });

  it('handles length finish reason', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: { content: 'Truncated...' },
          finish_reason: 'length',
        },
      ],
    });

    const adapter = new OpenAIAdapter(mockClient);
    const result = await adapter.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.finishReason).toBe('length');
  });

  it('passes max_completion_tokens instead of max_tokens', async () => {
    mockClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: { content: 'Done' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
    });

    const adapter = new OpenAIAdapter(mockClient);
    await adapter.complete({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hi' }],
      maxTokens: 256,
    });

    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ max_completion_tokens: 256 }),
      expect.anything()
    );
    // Ensure old parameter name is not sent
    const callArgs = mockClient.chat.completions.create.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('max_tokens');
  });

  it('returns error result on API failure', async () => {
    mockClient.chat.completions.create.mockRejectedValue(new Error('Network error'));

    const adapter = new OpenAIAdapter(mockClient);
    await expect(
      adapter.complete({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow('Network error');
  });
});

describe('OpenAIModerationAdapter', () => {
  const mockClient = {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
    moderations: {
      create: vi.fn(),
    },
  };

  it('checks content for violations', async () => {
    mockClient.moderations.create.mockResolvedValue({
      results: [
        {
          flagged: true,
          categories: { violence: true, harassment: false },
          category_scores: { violence: 0.95, harassment: 0.1 },
        },
      ],
    });

    const adapter = new OpenAIModerationAdapter(mockClient);
    const result = await adapter.checkContent('Test content');

    expect(result.flagged).toBe(true);
    expect(result.categories).toEqual({ violence: true, harassment: false });
    expect(result.categoryScores).toEqual({ violence: 0.95, harassment: 0.1 });
  });

  it('coerces null category values to false', async () => {
    mockClient.moderations.create.mockResolvedValue({
      results: [
        {
          flagged: false,
          categories: { violence: false, illicit: null, 'illicit/violent': null, harassment: true },
          category_scores: { violence: 0.01, illicit: 0.0, 'illicit/violent': 0.0, harassment: 0.8 },
        },
      ],
    });

    const adapter = new OpenAIModerationAdapter(mockClient);
    const result = await adapter.checkContent('Test content');

    expect(result.categories).toEqual({
      violence: false,
      illicit: false,
      'illicit/violent': false,
      harassment: true,
    });
    expect(result.categoryScores).toEqual({
      violence: 0.01,
      illicit: 0.0,
      'illicit/violent': 0.0,
      harassment: 0.8,
    });
  });

  it('returns safe result for clean content', async () => {
    mockClient.moderations.create.mockResolvedValue({
      results: [
        {
          flagged: false,
          categories: { violence: false, harassment: false },
          category_scores: { violence: 0.01, harassment: 0.02 },
        },
      ],
    });

    const adapter = new OpenAIModerationAdapter(mockClient);
    const result = await adapter.checkContent('Hello, world!');

    expect(result.flagged).toBe(false);
  });
});
