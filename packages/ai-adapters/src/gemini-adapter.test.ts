import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAdapter } from './gemini-adapter.js';

describe('GeminiAdapter', () => {
  const mockModels = {
    generateContent: vi.fn(),
    generateContentStream: vi.fn(),
  };

  const mockClient = {
    models: mockModels,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns provider name', () => {
    const adapter = new GeminiAdapter(mockClient as never);
    expect(adapter.provider).toBe('gemini');
  });

  it('returns available models', () => {
    const adapter = new GeminiAdapter(mockClient as never, ['gemini-2.5-flash', 'gemini-2.5-pro']);
    expect(adapter.getModels()).toEqual(['gemini-2.5-flash', 'gemini-2.5-pro']);
  });

  it('checks if model is supported', () => {
    const adapter = new GeminiAdapter(mockClient as never, ['gemini-2.5-flash', 'gemini-2.5-pro']);
    expect(adapter.supportsModel('gemini-2.5-flash')).toBe(true);
    expect(adapter.supportsModel('gpt-4')).toBe(false);
  });

  it('completes non-streaming request', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: 'Hello from Gemini!',
      candidates: [{ finishReason: 'STOP' }],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      },
    });

    const adapter = new GeminiAdapter(mockClient as never);
    const result = await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.content).toBe('Hello from Gemini!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it('passes model and config to generateContent', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: 'Response',
      candidates: [{ finishReason: 'STOP' }],
    });

    const adapter = new GeminiAdapter(mockClient as never);
    await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
      ],
      maxTokens: 1024,
      temperature: 0.5,
    });

    expect(mockModels.generateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: 'Hello' }] },
      ],
      config: {
        systemInstruction: 'You are helpful.',
        maxOutputTokens: 1024,
        temperature: 0.5,
      },
    });
  });

  it('completes streaming request', async () => {
    const chunks = [
      { text: 'Hello' },
      { text: ' from Gemini!' },
      { text: undefined, candidates: [{ finishReason: 'STOP' }] },
    ];

    mockModels.generateContentStream.mockResolvedValue(
      (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })()
    );

    const adapter = new GeminiAdapter(mockClient as never);
    const receivedChunks: string[] = [];

    const result = await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Hello' }],
      onChunk: (chunk) => receivedChunks.push(chunk),
    });

    expect(result.content).toBe('Hello from Gemini!');
    expect(result.finishReason).toBe('stop');
    expect(receivedChunks).toEqual(['Hello', ' from Gemini!']);
  });

  it('returns usage metadata in streaming mode', async () => {
    const chunks = [
      { text: 'Hello' },
      {
        text: undefined,
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 10,
          totalTokenCount: 15,
        },
      },
    ];

    mockModels.generateContentStream.mockResolvedValue(
      (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })()
    );

    const adapter = new GeminiAdapter(mockClient as never);
    const result = await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Hello' }],
      onChunk: () => {},
    });

    expect(result.usage).toEqual({
      promptTokens: 5,
      completionTokens: 10,
      totalTokens: 15,
    });
  });

  it('handles MAX_TOKENS finish reason', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: 'Truncated...',
      candidates: [{ finishReason: 'MAX_TOKENS' }],
    });

    const adapter = new GeminiAdapter(mockClient as never);
    const result = await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.finishReason).toBe('length');
  });

  it('handles SAFETY finish reason', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: '',
      candidates: [{ finishReason: 'SAFETY' }],
    });

    const adapter = new GeminiAdapter(mockClient as never);
    const result = await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.finishReason).toBe('content_filter');
  });

  it('passes system message as config.systemInstruction', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: 'Response',
      candidates: [{ finishReason: 'STOP' }],
    });

    const adapter = new GeminiAdapter(mockClient as never);
    await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    expect(mockModels.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          systemInstruction: 'You are helpful.',
        }),
      })
    );
  });

  it('concatenates multiple system messages', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: 'Response',
      candidates: [{ finishReason: 'STOP' }],
    });

    const adapter = new GeminiAdapter(mockClient as never);
    await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    expect(mockModels.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          systemInstruction: 'You are helpful.\n\nBe concise.',
        }),
      })
    );
  });

  it('converts assistant role to model role', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: 'Response',
      candidates: [{ finishReason: 'STOP' }],
    });

    const adapter = new GeminiAdapter(mockClient as never);
    await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'How are you?' },
      ],
    });

    expect(mockModels.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }] },
          { role: 'model', parts: [{ text: 'Hi!' }] },
          { role: 'user', parts: [{ text: 'How are you?' }] },
        ],
      })
    );
  });

  it('returns error result on API failure', async () => {
    mockModels.generateContent.mockRejectedValue(new Error('Network error'));

    const adapter = new GeminiAdapter(mockClient as never);
    await expect(
      adapter.complete({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow('Network error');
  });

  it('merges consecutive same-role messages for Gemini alternating turns requirement', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: 'Response',
      candidates: [{ finishReason: 'STOP' }],
    });

    const adapter = new GeminiAdapter(mockClient as never);
    await adapter.complete({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'Are you there?' },
        { role: 'assistant', content: 'Yes!' },
        { role: 'assistant', content: 'How can I help?' },
        { role: 'user', content: 'Thanks' },
      ],
    });

    expect(mockModels.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }, { text: 'Are you there?' }] },
          { role: 'model', parts: [{ text: 'Yes!' }, { text: 'How can I help?' }] },
          { role: 'user', parts: [{ text: 'Thanks' }] },
        ],
      })
    );
  });

  it('throws error when only system messages provided (empty contents)', async () => {
    const adapter = new GeminiAdapter(mockClient as never);

    await expect(
      adapter.complete({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'system', content: 'You are helpful.' }],
      })
    ).rejects.toThrow('At least one non-system message is required');

    expect(mockModels.generateContent).not.toHaveBeenCalled();
  });
});
