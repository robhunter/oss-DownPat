/**
 * AI Adapter Interface
 * Implement this interface to add support for additional AI providers.
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  model: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Callback for streaming responses */
  onChunk?: (chunk: string) => void;
  /** Signal for aborting the request */
  signal?: AbortSignal;
}

/**
 * Tool parameter definition for structured output
 */
export interface AIToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array';
  description?: string;
  enum?: string[];
  items?: { type: string };
}

/**
 * Tool definition for function calling
 */
export interface AITool {
  name: string;
  description?: string;
  parameters: Record<string, AIToolParameter>;
  required?: string[];
}

/**
 * Callbacks for streaming tool call fields
 */
export interface AIToolCallbacks {
  [fieldName: string]: (chunk: string) => void;
}

/**
 * Options for tool-based completion with streaming
 */
export interface AIToolCompletionOptions {
  model: string;
  messages: AIMessage[];
  tool: AITool;
  maxTokens?: number;
  temperature?: number;
  /** Callbacks for streaming specific fields from the tool response */
  callbacks?: AIToolCallbacks;
  /** Signal for aborting the request */
  signal?: AbortSignal;
}

/**
 * Result from a tool-based completion
 */
export interface AIToolCompletionResult {
  /** Parsed tool arguments */
  arguments: Record<string, unknown>;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AICompletionResult {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI Adapter interface for language model providers.
 * Implementations should handle streaming and non-streaming completions.
 */
export interface AIAdapter {
  /**
   * Get the provider name (e.g., 'openai', 'anthropic', 'gemini')
   */
  readonly provider: string;

  /**
   * Get available models for this provider
   */
  getModels(): string[];

  /**
   * Check if a specific model is supported
   */
  supportsModel(model: string): boolean;

  /**
   * Generate a completion (with optional streaming)
   */
  complete(options: AICompletionOptions): Promise<AICompletionResult>;

  /**
   * Generate a completion using tool/function calling with streaming support.
   * Allows streaming individual fields from the tool response.
   * Optional - adapters that don't support tool calling can omit this.
   */
  completeWithTool?(options: AIToolCompletionOptions): Promise<AIToolCompletionResult>;
}

/**
 * Configuration for AI providers
 */
export interface AIProviderConfig {
  openai?: {
    apiKey: string;
    models?: string[];
    baseUrl?: string;
  };
  anthropic?: {
    apiKey: string;
    models?: string[];
    baseUrl?: string;
  };
  gemini?: {
    apiKey: string;
    models?: string[];
  };
}

/**
 * Get available models from configured providers.
 *
 * @deprecated Use `registry.getAllModels()` from @downpat/ai-adapters instead.
 * The adapter registry is the authoritative source of available models.
 *
 * This function only returns models explicitly specified in the config.
 * It no longer provides hardcoded fallback defaults - adapters define their own defaults.
 */
export function getAvailableModels(config: AIProviderConfig): string[] {
  const models: string[] = [];

  if (config.openai?.apiKey && config.openai.models) {
    models.push(...config.openai.models);
  }
  if (config.anthropic?.apiKey && config.anthropic.models) {
    models.push(...config.anthropic.models);
  }
  if (config.gemini?.apiKey && config.gemini.models) {
    models.push(...config.gemini.models);
  }

  return models;
}

/**
 * Moderation result from content checking
 */
export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
}

/**
 * Moderation adapter interface (currently only OpenAI is supported)
 */
export interface ModerationAdapter {
  /**
   * Check content for policy violations
   */
  checkContent(text: string): Promise<ModerationResult>;
}
