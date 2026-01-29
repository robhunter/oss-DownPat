import { describe, it, expect, vi } from 'vitest';
import { AnthropicAdapter } from './anthropic-adapter.js';

describe('AnthropicAdapter', () => {
  const mockClient = {
    messages: {
      create: vi.fn(),
      stream: vi.fn(),
    },
  };

  it('returns provider name', () => {
    const adapter = new AnthropicAdapter(mockClient);
    expect(adapter.provider).toBe('anthropic');
  });

  it('returns available models', () => {
    const adapter = new AnthropicAdapter(mockClient, ['claude-3-opus', 'claude-3-sonnet']);
    expect(adapter.getModels()).toEqual(['claude-3-opus', 'claude-3-sonnet']);
  });

  it('checks if model is supported', () => {
    const adapter = new AnthropicAdapter(mockClient, ['claude-3-opus', 'claude-3-sonnet']);
    expect(adapter.supportsModel('claude-3-opus')).toBe(true);
    expect(adapter.supportsModel('gpt-4')).toBe(false);
  });

  it('completes non-streaming request', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Hello from Claude!' }],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 5,
      },
    });

    const adapter = new AnthropicAdapter(mockClient);
    const result = await adapter.complete({
      model: 'claude-3-opus',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    expect(result.content).toBe('Hello from Claude!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it('completes streaming request', async () => {
    const events = [
      {
        type: 'message_start',
        message: { usage: { input_tokens: 10 } },
      },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: ' from Claude!' } },
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: 5 },
      },
      { type: 'message_stop' },
    ];

    mockClient.messages.stream.mockReturnValue(
      (async function* () {
        for (const event of events) {
          yield event;
        }
      })()
    );

    const adapter = new AnthropicAdapter(mockClient);
    const receivedChunks: string[] = [];

    const result = await adapter.complete({
      model: 'claude-3-opus',
      messages: [{ role: 'user', content: 'Hello' }],
      onChunk: (chunk) => receivedChunks.push(chunk),
    });

    expect(result.content).toBe('Hello from Claude!');
    expect(result.finishReason).toBe('stop');
    expect(receivedChunks).toEqual(['Hello', ' from Claude!']);
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it('handles max_tokens stop reason', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Truncated...' }],
      stop_reason: 'max_tokens',
      usage: { input_tokens: 10, output_tokens: 100 },
    });

    const adapter = new AnthropicAdapter(mockClient);
    const result = await adapter.complete({
      model: 'claude-3-opus',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.finishReason).toBe('length');
  });

  it('handles stop_sequence stop reason', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
      stop_reason: 'stop_sequence',
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const adapter = new AnthropicAdapter(mockClient);
    const result = await adapter.complete({
      model: 'claude-3-opus',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.finishReason).toBe('stop');
  });

  it('separates system message from conversation', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const adapter = new AnthropicAdapter(mockClient);
    await adapter.complete({
      model: 'claude-3-opus',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ],
    });

    // Check that system message was passed separately
    expect(mockClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a helpful assistant.',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      }),
      { signal: undefined }
    );
  });

  it('concatenates multiple system messages', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const adapter = new AnthropicAdapter(mockClient);
    await adapter.complete({
      model: 'claude-3-opus',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'system', content: 'Always be concise.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    // Check that system messages were concatenated
    expect(mockClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a helpful assistant.\n\nAlways be concise.',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
      { signal: undefined }
    );
  });

  it('returns error result on API failure', async () => {
    mockClient.messages.create.mockRejectedValue(new Error('Network error'));

    const adapter = new AnthropicAdapter(mockClient);
    await expect(
      adapter.complete({
        model: 'claude-3-opus',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow('Network error');
  });
});
