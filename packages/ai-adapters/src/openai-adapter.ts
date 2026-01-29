import type {
  AIAdapter,
  AICompletionOptions,
  AICompletionResult,
  AIToolCompletionOptions,
  AIToolCompletionResult,
  ModerationAdapter,
  ModerationResult,
} from '@downpat/core';
import type { OpenAI } from 'openai';
import { initializeParserState, parseJsonToken } from './streaming-json-parser.js';

const DEFAULT_OPENAI_MODELS = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
];

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

  /**
   * Maps OpenAI finish reasons to standardized adapter finish reasons.
   *
   * Note on 'tool_calls': When the model returns 'tool_calls', it expects the caller
   * to execute tools and continue the conversation. Since this adapter does not support
   * tool use, 'tool_calls' is mapped to 'error' because the interaction cannot complete
   * successfully - the model's response is incomplete and waiting for tool results that
   * will never arrive. Returning 'stop' would incorrectly indicate a successful completion.
   */
  private mapFinishReason(reason?: string): AICompletionResult['finishReason'] {
    switch (reason) {
      case 'stop':
      case 'tool_calls':
        // tool_calls is expected when using tools - it's a successful completion
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return reason ? 'error' : 'stop';
    }
  }

  /**
   * Generate a completion using tool/function calling with streaming support.
   * Streams individual fields from the tool response via callbacks.
   */
  async completeWithTool(options: AIToolCompletionOptions): Promise<AIToolCompletionResult> {
    const { model, messages, tool, maxTokens, temperature, callbacks, signal } = options;

    const openaiMessages = messages.map((msg) => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));

    // Build the tool definition for OpenAI
    const openaiTool = {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Object.entries(tool.parameters).map(([key, param]) => [
              key,
              {
                type: param.type,
                description: param.description,
                enum: param.enum,
                items: param.items,
              },
            ])
          ),
          required: tool.required || Object.keys(tool.parameters),
        },
      },
    };

    const hasCallbacks = callbacks && Object.keys(callbacks).length > 0;

    if (hasCallbacks) {
      return await this.completeWithToolStreaming(
        openaiMessages,
        openaiTool,
        model,
        maxTokens,
        temperature,
        callbacks,
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
        tools: [openaiTool],
        tool_choice: { type: 'function', function: { name: tool.name } },
      },
      { signal }
    );

    const choice = response.choices[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    const argsString = toolCall?.function?.arguments || '{}';
    const finishReason = this.mapFinishReason(choice?.finish_reason);

    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = JSON.parse(argsString) as Record<string, unknown>;
    } catch {
      // If parsing fails, return empty object
    }

    return {
      arguments: parsedArgs,
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

  private async completeWithToolStreaming(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    tool: {
      type: 'function';
      function: {
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
      };
    },
    model: string,
    maxTokens: number | undefined,
    temperature: number | undefined,
    callbacks: Record<string, (chunk: string) => void>,
    signal?: AbortSignal
  ): Promise<AIToolCompletionResult> {
    const stream = await this.client.chat.completions.create(
      {
        model,
        messages,
        max_tokens: maxTokens,
        temperature: temperature ?? 0.7,
        tools: [tool],
        tool_choice: { type: 'function', function: { name: tool.function.name } },
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal }
    );

    const response: Record<string, string> = {};
    const parserState = initializeParserState();
    let finishReason: AIToolCompletionResult['finishReason'] = 'stop';
    let usage: AIToolCompletionResult['usage'] | undefined;

    for await (const chunk of stream) {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError');
      }

      // Extract tool call arguments delta
      const toolCallDelta = chunk.choices[0]?.delta?.tool_calls?.[0];
      const argsDelta = toolCallDelta?.function?.arguments;

      if (argsDelta) {
        // Parse the streaming JSON and call callbacks for registered fields
        parseJsonToken(argsDelta, response, parserState, callbacks);
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = this.mapFinishReason(chunk.choices[0].finish_reason);
      }

      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }

    return {
      arguments: response as Record<string, unknown>,
      finishReason,
      usage,
    };
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
