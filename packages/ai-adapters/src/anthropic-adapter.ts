import type {
  AIAdapter,
  AICompletionOptions,
  AICompletionResult,
  AIMessage,
} from '@downpat/core';
import type { Anthropic } from '@anthropic-ai/sdk';

const DEFAULT_ANTHROPIC_MODELS = [
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
  'claude-3-haiku-20240307',
];

/**
 * Anthropic adapter for Claude models.
 * Supports streaming via callbacks.
 *
 * System Message Handling:
 * - Multiple system messages are concatenated with double newlines (\n\n)
 * - This preserves the content of all system messages while conforming to
 *   Anthropic's single system parameter requirement
 * - Example: [{role:'system', content:'A'}, {role:'system', content:'B'}]
 *   becomes system: "A\n\nB"
 */
export class AnthropicAdapter implements AIAdapter {
  readonly provider = 'anthropic';
  private models: string[];
  private client: Anthropic;

  constructor(client: Anthropic, models: string[] = DEFAULT_ANTHROPIC_MODELS) {
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
    const response = await this.client.messages.create(
      {
        model,
        max_tokens: maxTokens ?? 4096,
        temperature: temperature ?? 0.7,
        system: systemContent,
        messages: conversationMessages,
      },
      { signal }
    );

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
  }

  private convertMessages(messages: AIMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
  }

  private async completeStreaming(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    system: string | undefined,
    model: string,
    maxTokens: number,
    temperature: number | undefined,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<AICompletionResult> {
    const stream = this.client.messages.stream(
      {
        model,
        max_tokens: maxTokens,
        temperature: temperature ?? 0.7,
        system,
        messages,
      },
      { signal }
    );

    let content = '';
    let finishReason: AICompletionResult['finishReason'] = 'stop';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError');
      }

      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        content += event.delta.text;
        onChunk(event.delta.text);
      }

      // input_tokens arrive in message_start
      if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
      }

      // stop_reason and output_tokens arrive in message_delta
      if (event.type === 'message_delta') {
        finishReason = this.mapStopReason(event.delta.stop_reason);
        outputTokens = event.usage.output_tokens;
      }
    }

    return {
      content,
      finishReason,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  }

  private mapStopReason(reason?: string | null): AICompletionResult['finishReason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        // Unknown or unhandled stop reasons (e.g., 'tool_use') should be treated as errors
        return reason ? 'error' : 'stop';
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
  });

  return new AnthropicAdapter(client, models);
}
