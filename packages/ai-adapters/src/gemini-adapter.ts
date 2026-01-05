import type {
  AIAdapter,
  AICompletionOptions,
  AICompletionResult,
  AIMessage,
} from '@downpat/core';

// Types for Gemini SDK (to avoid requiring it at compile time)
interface GeminiClient {
  getGenerativeModel(params: { model: string }): GeminiModel;
}

interface GeminiModel {
  generateContent(params: { contents: GeminiContent[] }): Promise<GeminiResponse>;
  generateContentStream(params: { contents: GeminiContent[] }): Promise<GeminiStreamResponse>;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  response: {
    text(): string;
    candidates?: Array<{
      finishReason?: string;
    }>;
    usageMetadata?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
  };
}

interface GeminiStreamResponse {
  stream: AsyncIterable<{
    text(): string;
    candidates?: Array<{
      finishReason?: string;
    }>;
  }>;
}

const DEFAULT_GEMINI_MODELS = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];

/**
 * Google Gemini adapter for Gemini models.
 * Supports streaming via callbacks.
 */
export class GeminiAdapter implements AIAdapter {
  readonly provider = 'gemini';
  private models: string[];
  private client: GeminiClient;

  constructor(client: GeminiClient, models: string[] = DEFAULT_GEMINI_MODELS) {
    this.client = client;
    this.models = models;
  }

  getModels(): string[] {
    return [...this.models];
  }

  supportsModel(model: string): boolean {
    return this.models.includes(model);
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const { model, messages, onChunk, signal } = options;

    // Convert messages to Gemini format
    const contents = this.convertMessages(messages);
    const geminiModel = this.client.getGenerativeModel({ model });

    if (onChunk) {
      // Streaming mode
      return this.completeStreaming(geminiModel, contents, onChunk, signal);
    }

    // Non-streaming mode
    const response = await geminiModel.generateContent({ contents });
    const text = response.response.text();
    const finishReason = this.mapFinishReason(
      response.response.candidates?.[0]?.finishReason
    );

    return {
      content: text,
      finishReason,
      usage: response.response.usageMetadata
        ? {
            promptTokens: response.response.usageMetadata.promptTokenCount,
            completionTokens: response.response.usageMetadata.candidatesTokenCount,
            totalTokens: response.response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  private convertMessages(messages: AIMessage[]): GeminiContent[] {
    // Gemini doesn't have a system role, so we prepend system message to first user message
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    return conversationMessages.map((msg, index) => {
      let content = msg.content;

      // Prepend system message to first user message
      if (index === 0 && systemMessage && msg.role === 'user') {
        content = `${systemMessage.content}\n\n${content}`;
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: content }],
      };
    });
  }

  private async completeStreaming(
    model: GeminiModel,
    contents: GeminiContent[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AICompletionResult> {
    const result = await model.generateContentStream({ contents });

    let content = '';
    let finishReason: AICompletionResult['finishReason'] = 'stop';

    for await (const chunk of result.stream) {
      if (signal?.aborted) {
        finishReason = 'error';
        break;
      }

      const text = chunk.text();
      if (text) {
        content += text;
        onChunk(text);
      }

      if (chunk.candidates?.[0]?.finishReason) {
        finishReason = this.mapFinishReason(chunk.candidates[0].finishReason);
      }
    }

    return {
      content,
      finishReason,
    };
  }

  private mapFinishReason(reason?: string): AICompletionResult['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}

/**
 * Factory function to create Gemini adapter from API key.
 * Requires '@google/generative-ai' package to be installed.
 */
export async function createGeminiAdapter(
  apiKey: string,
  models?: string[]
): Promise<GeminiAdapter> {
  // Dynamically import Gemini to avoid requiring it at compile time
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const client = new GoogleGenerativeAI(apiKey) as unknown as GeminiClient;

  return new GeminiAdapter(client, models);
}
