import { describe, it, expect, vi } from 'vitest';
import { GeminiAdapter } from './gemini-adapter.js';

describe('GeminiAdapter', () => {
  const mockModel = {
    generateContent: vi.fn(),
    generateContentStream: vi.fn(),
  };

  const mockClient = {
    getGenerativeModel: vi.fn(() => mockModel),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getGenerativeModel.mockReturnValue(mockModel);
  });

  it('returns provider name', () => {
    const adapter = new GeminiAdapter(mockClient);
    expect(adapter.provider).toBe('gemini');
  });

  it('returns available models', () => {
    const adapter = new GeminiAdapter(mockClient, ['gemini-pro', 'gemini-1.5-pro']);
    expect(adapter.getModels()).toEqual(['gemini-pro', 'gemini-1.5-pro']);
  });

  it('checks if model is supported', () => {
    const adapter = new GeminiAdapter(mockClient, ['gemini-pro', 'gemini-1.5-pro']);
    expect(adapter.supportsModel('gemini-pro')).toBe(true);
    expect(adapter.supportsModel('gpt-4')).toBe(false);
  });

  it('completes non-streaming request', async () => {
    mockModel.generateContent.mockResolvedValue({
      response: {
        text: () => 'Hello from Gemini!',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      },
    });

    const adapter = new GeminiAdapter(mockClient);
    const result = await adapter.complete({
      model: 'gemini-pro',
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

  it('completes streaming request', async () => {
    const chunks = [
      { text: () => 'Hello' },
      { text: () => ' from Gemini!' },
      { text: () => '', candidates: [{ finishReason: 'STOP' }] },
    ];

    mockModel.generateContentStream.mockResolvedValue({
      stream: (async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })(),
    });

    const adapter = new GeminiAdapter(mockClient);
    const receivedChunks: string[] = [];

    const result = await adapter.complete({
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hello' }],
      onChunk: (chunk) => receivedChunks.push(chunk),
    });

    expect(result.content).toBe('Hello from Gemini!');
    expect(result.finishReason).toBe('stop');
    expect(receivedChunks).toEqual(['Hello', ' from Gemini!']);
  });

  it('handles MAX_TOKENS finish reason', async () => {
    mockModel.generateContent.mockResolvedValue({
      response: {
        text: () => 'Truncated...',
        candidates: [{ finishReason: 'MAX_TOKENS' }],
      },
    });

    const adapter = new GeminiAdapter(mockClient);
    const result = await adapter.complete({
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.finishReason).toBe('length');
  });

  it('handles SAFETY finish reason', async () => {
    mockModel.generateContent.mockResolvedValue({
      response: {
        text: () => '',
        candidates: [{ finishReason: 'SAFETY' }],
      },
    });

    const adapter = new GeminiAdapter(mockClient);
    const result = await adapter.complete({
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(result.finishReason).toBe('content_filter');
  });

  it('passes system message as systemInstruction parameter', async () => {
    mockModel.generateContent.mockResolvedValue({
      response: {
        text: () => 'Response',
        candidates: [{ finishReason: 'STOP' }],
      },
    });

    const adapter = new GeminiAdapter(mockClient);
    await adapter.complete({
      model: 'gemini-pro',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    expect(mockModel.generateContent).toHaveBeenCalledWith({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ],
      systemInstruction: {
        parts: [{ text: 'You are helpful.' }],
      },
    });
  });

  it('converts assistant role to model role', async () => {
    mockModel.generateContent.mockResolvedValue({
      response: {
        text: () => 'Response',
        candidates: [{ finishReason: 'STOP' }],
      },
    });

    const adapter = new GeminiAdapter(mockClient);
    await adapter.complete({
      model: 'gemini-pro',
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'How are you?' },
      ],
    });

    expect(mockModel.generateContent).toHaveBeenCalledWith({
      contents: [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi!' }] },
        { role: 'user', parts: [{ text: 'How are you?' }] },
      ],
      systemInstruction: undefined,
    });
  });

  it('returns error result on API failure', async () => {
    mockModel.generateContent.mockRejectedValue(new Error('Network error'));

    const adapter = new GeminiAdapter(mockClient);
    const result = await adapter.complete({
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.content).toBe('');
    expect(result.finishReason).toBe('error');
  });
});
