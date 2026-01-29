import type {
  AIAdapter,
  AICompletionOptions,
  AICompletionResult,
  AIMessage,
} from '@downpat/core';
import type { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';

const DEFAULT_GEMINI_MODELS = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];

/**
 * Prepend system messages as the first user content entry.
 * The Gemini v0.2.x SDK does not support a dedicated systemInstruction parameter,
 * so we fold system messages into the conversation as a leading user turn.
 */
function prependSystemContent(
  systemMessages: AIMessage[],
  contents: Content[]
): Content[] {
  if (systemMessages.length === 0) return contents;

  const systemText = systemMessages.map((m) => m.content).join('\n\n');
  const first = contents[0];

  // If the first message is already from the user, merge the system text in
  if (first && first.role === 'user') {
    return [
      { role: 'user', parts: [{ text: systemText }, ...first.parts] },
      ...contents.slice(1),
    ];
  }

  // Otherwise prepend a new user turn with the system text
  return [{ role: 'user', parts: [{ text: systemText }] }, ...contents];
}

/**
 * Google Gemini adapter for Gemini models.
 * Supports streaming via callbacks.
 */
export class GeminiAdapter implements AIAdapter {
  readonly provider = 'gemini';
  private models: string[];
  private client: GoogleGenerativeAI;

  constructor(client: GoogleGenerativeAI, models: string[] = DEFAULT_GEMINI_MODELS) {
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

    // Extract system messages and convert remaining messages to Gemini format
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');
    const contents = this.convertMessages(conversationMessages);
    const geminiModel = this.client.getGenerativeModel({ model });

    // Validate that we have at least one non-system message
    if (contents.length === 0) {
      throw new Error('At least one non-system message is required');
    }

    // Prepend system messages into the conversation contents
    const allContents = prependSystemContent(systemMessages, contents);

    if (onChunk) {
      // Streaming mode
      return await this.completeStreaming(geminiModel, allContents, onChunk, signal);
    }

    // Non-streaming mode
    const response = await geminiModel.generateContent({ contents: allContents });
    const text = response.response.text();
    const finishReason = this.mapFinishReason(
      response.response.candidates?.[0]?.finishReason
    );

    return {
      content: text,
      finishReason,
    };
  }

  private convertMessages(messages: AIMessage[]): Content[] {
    // Convert messages to Gemini format (system messages should be filtered out before calling this)
    // Gemini requires strictly alternating user/model turns, so we merge consecutive same-role messages
    const result: Content[] = [];

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'user' : 'model';
      const lastMessage = result[result.length - 1];

      if (lastMessage && lastMessage.role === role) {
        // Merge with previous message of same role
        lastMessage.parts.push({ text: msg.content });
      } else {
        // Start new message
        result.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    return result;
  }

  private async completeStreaming(
    model: GenerativeModel,
    contents: Content[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AICompletionResult> {
    const result = await model.generateContentStream({ contents });

    let content = '';
    let finishReason: AICompletionResult['finishReason'] = 'stop';

    for await (const chunk of result.stream) {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError');
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

  /**
   * Maps Gemini finish reasons to standardized adapter finish reasons.
   * Uses string literals to avoid static imports of the optional peer dependency.
   * Values match the FinishReason enum from @google/generative-ai.
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
        // Unspecified or unknown finish reasons
        return reason ? 'error' : 'stop';
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
  const client = new GoogleGenerativeAI(apiKey);

  return new GeminiAdapter(client, models);
}
