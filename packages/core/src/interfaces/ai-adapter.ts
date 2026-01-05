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
 * Get available models from configured providers
 */
export function getAvailableModels(config: AIProviderConfig): string[] {
  const models: string[] = [];

  if (config.openai?.apiKey) {
    models.push(...(config.openai.models || ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']));
  }
  if (config.anthropic?.apiKey) {
    models.push(...(config.anthropic.models || ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']));
  }
  if (config.gemini?.apiKey) {
    models.push(...(config.gemini.models || ['gemini-pro', 'gemini-1.5-pro']));
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
