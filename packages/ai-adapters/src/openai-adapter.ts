import type {
  AIAdapter,
  AICompletionOptions,
  AICompletionResult,
  ModerationAdapter,
  ModerationResult,
} from '@downpat/core';
import type { OpenAI } from 'openai';

const DEFAULT_OPENAI_MODELS = ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'];

/**
 * OpenAI adapter for chat completions.
 * Supports streaming via callbacks.
 */
export class OpenAIAdapter implements AIAdapter {
  readonly provider = 'openai';
  private models: string[];
  private client: OpenAI;

  constructor(client: OpenAI, models: string[] = DEFAULT_OPENAI_MODELS) {
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

    const openaiMessages = messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));

    if (onChunk) {
      // Streaming mode
      return await this.completeStreaming(
        openaiMessages,
        model,
        maxTokens,
        temperature,
        onChunk,
        signal
      );
    }

    // Non-streaming mode
    const response = await this.client.chat.completions.create(
      {
        model,
        messages: openaiMessages,
        max_tokens: maxTokens,
        temperature: temperature ?? 0.7,
      },
      { signal }
    );

    const choice = response.choices[0];
    const content = choice?.message?.content || '';
    const finishReason = this.mapFinishReason(choice?.finish_reason);

    return {
      content,
      finishReason,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async completeStreaming(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string,
    maxTokens: number | undefined,
    temperature: number | undefined,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AICompletionResult> {
    const stream = await this.client.chat.completions.create(
      {
        model,
        messages,
        max_tokens: maxTokens,
        temperature: temperature ?? 0.7,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal }
    );

    let content = '';
    let finishReason: AICompletionResult['finishReason'] = 'stop';
    let usage: AICompletionResult['usage'] | undefined;

    for await (const chunk of stream) {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError');
      }

      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        content += delta;
        onChunk(delta);
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = this.mapFinishReason(chunk.choices[0].finish_reason);
      }

      // Usage is sent in the final chunk when stream_options.include_usage is true
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }

    return {
      content,
      finishReason,
      usage,
    };
  }

  private mapFinishReason(reason?: string): AICompletionResult['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        // Unknown or unhandled finish reasons (e.g., 'tool_calls') should be treated as errors
        return reason ? 'error' : 'stop';
    }
  }
}

/**
 * OpenAI moderation adapter for content policy checking.
 */
export class OpenAIModerationAdapter implements ModerationAdapter {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  async checkContent(text: string): Promise<ModerationResult> {
    const response = await this.client.moderations.create({
      input: text,
    });

    const result = response.results[0];

    return {
      flagged: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores,
    };
  }
}

/**
 * Factory function to create OpenAI adapter from API key.
 * Requires 'openai' package to be installed.
 */
export async function createOpenAIAdapter(
  apiKey: string,
  models?: string[],
  baseUrl?: string
): Promise<{ adapter: OpenAIAdapter; moderation: OpenAIModerationAdapter }> {
  // Dynamically import OpenAI to avoid requiring it at compile time
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
  });

  return {
    adapter: new OpenAIAdapter(client, models),
    moderation: new OpenAIModerationAdapter(client),
  };
}
