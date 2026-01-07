import type {
  AIAdapter,
  AICompletionOptions,
  AICompletionResult,
  AIMessage,
} from '@downpat/core';

// Types for Anthropic SDK (to avoid requiring it at compile time)
interface AnthropicClient {
  messages: {
    create(params: unknown): Promise<unknown>;
    stream(params: unknown): AsyncIterable<unknown>;
  };
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicStreamEvent {
  type: string;
  delta?: { text?: string };
  message?: {
    stop_reason?: string;
    usage?: { input_tokens: number; output_tokens: number };
  };
}

interface AnthropicResponse {
  content: Array<{ text: string; type: string }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

const DEFAULT_ANTHROPIC_MODELS = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];

/**
 * Anthropic adapter for Claude models.
 * Supports streaming via callbacks.
 */
export class AnthropicAdapter implements AIAdapter {
  readonly provider = 'anthropic';
  private models: string[];
  private client: AnthropicClient;

  constructor(client: AnthropicClient, models: string[] = DEFAULT_ANTHROPIC_MODELS) {
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

    // Anthropic requires separating system messages from conversation
    // Concatenate all system messages to preserve context
    const systemMessages = messages.filter((m) => m.role === 'system');
    const systemContent = systemMessages.length > 0
      ? systemMessages.map((m) => m.content).join('\n\n')
      : undefined;
    const conversationMessages = this.convertMessages(
      messages.filter((m) => m.role !== 'system')
    );

    try {
      if (onChunk) {
        // Streaming mode
        return await this.completeStreaming(
          conversationMessages,
          systemContent,
          model,
          maxTokens ?? 4096,
          temperature,
          onChunk,
          signal
        );
      }

      // Non-streaming mode
      const response = (await this.client.messages.create({
        model,
        max_tokens: maxTokens ?? 4096,
        temperature: temperature ?? 0.7,
        system: systemContent,
        messages: conversationMessages,
      })) as AnthropicResponse;

      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return {
        content,
        finishReason: this.mapStopReason(response.stop_reason),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (error) {
      // Return error result for API failures
      return {
        content: '',
        finishReason: 'error',
      };
    }
  }

  private convertMessages(messages: AIMessage[]): AnthropicMessage[] {
    return messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
  }

  private async completeStreaming(
    messages: AnthropicMessage[],
    system: string | undefined,
    model: string,
    maxTokens: number,
    temperature: number | undefined,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AICompletionResult> {
    const stream = this.client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature: temperature ?? 0.7,
      system,
      messages,
    }) as AsyncIterable<AnthropicStreamEvent>;

    let content = '';
    let finishReason: AICompletionResult['finishReason'] = 'stop';
    let usage: AICompletionResult['usage'] | undefined;

    for await (const event of stream) {
      if (signal?.aborted) {
        finishReason = 'error';
        break;
      }

      if (event.type === 'content_block_delta' && event.delta?.text) {
        content += event.delta.text;
        onChunk(event.delta.text);
      }

      if (event.type === 'message_stop' && event.message) {
        finishReason = this.mapStopReason(event.message.stop_reason);
        if (event.message.usage) {
          usage = {
            promptTokens: event.message.usage.input_tokens,
            completionTokens: event.message.usage.output_tokens,
            totalTokens: event.message.usage.input_tokens + event.message.usage.output_tokens,
          };
        }
      }
    }

    return {
      content,
      finishReason,
      usage,
    };
  }

  private mapStopReason(reason?: string): AICompletionResult['finishReason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }
}

/**
 * Factory function to create Anthropic adapter from API key.
 * Requires '@anthropic-ai/sdk' package to be installed.
 */
export async function createAnthropicAdapter(
  apiKey: string,
  models?: string[],
  baseUrl?: string
): Promise<AnthropicAdapter> {
  // Dynamically import Anthropic to avoid requiring it at compile time
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({
    apiKey,
    baseURL: baseUrl,
  }) as unknown as AnthropicClient;

  return new AnthropicAdapter(client, models);
}
