import type {
  AIAdapter,
  AICompletionOptions,
  AICompletionResult,
  AIMessage,
} from '@downpat/core';
import type { GoogleGenAI, Content } from '@google/genai';

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
];

/**
 * Google Gemini adapter using the @google/genai SDK.
 * Supports streaming via callbacks.
 *
 * System Message Handling:
 * - System messages are concatenated and passed via config.systemInstruction
 * - Gemini requires strictly alternating user/model turns, so consecutive
 *   same-role messages are merged automatically
 */
export class GeminiAdapter implements AIAdapter {
  readonly provider = 'gemini';
  private models: string[];
  private client: GoogleGenAI;

  constructor(client: GoogleGenAI, models: string[] = DEFAULT_GEMINI_MODELS) {
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
    const { model, messages, maxTokens, temperature, onChunk, signal } = options;

    // Extract system messages and convert remaining messages to Gemini format
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');
    const contents = this.convertMessages(conversationMessages);

    // Validate that we have at least one non-system message
    if (contents.length === 0) {
      throw new Error('At least one non-system message is required');
    }

    // Build systemInstruction if present
    const systemInstruction = systemMessages.length > 0
      ? systemMessages.map((m) => m.content).join('\n\n')
      : undefined;

    if (onChunk) {
      return await this.completeStreaming(model, contents, systemInstruction, maxTokens, temperature, onChunk, signal);
    }

    // Non-streaming mode
    const response = await this.client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    const text = response.text ?? '';
    const finishReason = this.mapFinishReason(
      response.candidates?.[0]?.finishReason
    );

    return {
      content: text,
      finishReason,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount ?? 0,
            completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: response.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  private convertMessages(messages: AIMessage[]): Content[] {
    // Gemini requires strictly alternating user/model turns, so we merge consecutive same-role messages
    const result: Content[] = [];

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'user' : 'model';
      const lastMessage = result[result.length - 1];

      if (lastMessage && lastMessage.role === role) {
        lastMessage.parts!.push({ text: msg.content });
      } else {
        result.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    return result;
  }

  private async completeStreaming(
    model: string,
    contents: Content[],
    systemInstruction: string | undefined,
    maxTokens: number | undefined,
    temperature: number | undefined,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AICompletionResult> {
    const stream = await this.client.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    let content = '';
    let finishReason: AICompletionResult['finishReason'] = 'stop';
    let usage: AICompletionResult['usage'] | undefined;

    for await (const chunk of stream) {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError');
      }

      const text = chunk.text;
      if (text) {
        content += text;
        onChunk(text);
      }

      if (chunk.candidates?.[0]?.finishReason) {
        finishReason = this.mapFinishReason(chunk.candidates[0].finishReason);
      }

      if (chunk.usageMetadata) {
        usage = {
          promptTokens: chunk.usageMetadata.promptTokenCount ?? 0,
          completionTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: chunk.usageMetadata.totalTokenCount ?? 0,
        };
      }
    }

    return {
      content,
      finishReason,
      usage,
    };
  }

  /**
   * Maps Gemini finish reasons to standardized adapter finish reasons.
   * Values match the FinishReason enum from @google/genai.
   */
  private mapFinishReason(reason?: string): AICompletionResult['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'content_filter';
      case 'OTHER':
        return 'error';
      case 'FINISH_REASON_UNSPECIFIED':
      default:
        return reason ? 'error' : 'stop';
    }
  }
}

/**
 * Factory function to create Gemini adapter from API key.
 * Requires '@google/genai' package to be installed.
 */
export async function createGeminiAdapter(
  apiKey: string,
  models?: string[]
): Promise<GeminiAdapter> {
  const { GoogleGenAI } = await import('@google/genai');
  const client = new GoogleGenAI({ apiKey });

  return new GeminiAdapter(client, models);
}
