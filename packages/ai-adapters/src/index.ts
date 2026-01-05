/**
 * @downpat/ai-adapters
 *
 * AI provider adapters for DownPat.
 * Supports OpenAI, Anthropic, and Google Gemini.
 */

import type { AIAdapter, AIProviderConfig, ModerationAdapter } from '@downpat/core';

// Export adapters
export { OpenAIAdapter, OpenAIModerationAdapter, createOpenAIAdapter } from './openai-adapter.js';
export { AnthropicAdapter, createAnthropicAdapter } from './anthropic-adapter.js';
export { GeminiAdapter, createGeminiAdapter } from './gemini-adapter.js';

// Re-export types from core
export type {
  AIAdapter,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  AIProviderConfig,
  ModerationAdapter,
  ModerationResult,
} from '@downpat/core';
export { getAvailableModels } from '@downpat/core';

/**
 * Registry of AI adapters.
 * Provides a unified interface for managing multiple providers.
 */
export class AIAdapterRegistry {
  private adapters: Map<string, AIAdapter> = new Map();
  private moderationAdapter: ModerationAdapter | null = null;

  /**
   * Register an adapter for a provider
   */
  registerAdapter(adapter: AIAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  /**
   * Get adapter by provider name
   */
  getAdapter(provider: string): AIAdapter | undefined {
    return this.adapters.get(provider);
  }

  /**
   * Get adapter that supports a specific model
   */
  getAdapterForModel(model: string): AIAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.supportsModel(model)) {
        return adapter;
      }
    }
    return undefined;
  }

  /**
   * Get all registered providers
   */
  getProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all available models from all providers
   */
  getAllModels(): string[] {
    const models: string[] = [];
    for (const adapter of this.adapters.values()) {
      models.push(...adapter.getModels());
    }
    return models;
  }

  /**
   * Set the moderation adapter (only OpenAI is supported)
   */
  setModerationAdapter(adapter: ModerationAdapter): void {
    this.moderationAdapter = adapter;
  }

  /**
   * Get the moderation adapter
   */
  getModerationAdapter(): ModerationAdapter | null {
    return this.moderationAdapter;
  }
}

/**
 * Create an adapter registry from provider configuration.
 * Only creates adapters for providers with API keys configured.
 */
export async function createAdapterRegistry(
  config: AIProviderConfig
): Promise<AIAdapterRegistry> {
  const registry = new AIAdapterRegistry();

  // Create OpenAI adapter if configured
  if (config.openai?.apiKey) {
    const { createOpenAIAdapter } = await import('./openai-adapter.js');
    const { adapter, moderation } = await createOpenAIAdapter(
      config.openai.apiKey,
      config.openai.models,
      config.openai.baseUrl
    );
    registry.registerAdapter(adapter);
    registry.setModerationAdapter(moderation);
  }

  // Create Anthropic adapter if configured
  if (config.anthropic?.apiKey) {
    const { createAnthropicAdapter } = await import('./anthropic-adapter.js');
    const adapter = await createAnthropicAdapter(
      config.anthropic.apiKey,
      config.anthropic.models,
      config.anthropic.baseUrl
    );
    registry.registerAdapter(adapter);
  }

  // Create Gemini adapter if configured
  if (config.gemini?.apiKey) {
    const { createGeminiAdapter } = await import('./gemini-adapter.js');
    const adapter = await createGeminiAdapter(config.gemini.apiKey, config.gemini.models);
    registry.registerAdapter(adapter);
  }

  return registry;
}
