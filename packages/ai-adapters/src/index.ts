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

// Export streaming JSON parser utilities
export {
  initializeParserState,
  parseJsonToken,
  type ParserState,
} from './streaming-json-parser.js';

// Re-export types from core
export type {
  AIAdapter,
  AIMessage,
  AICompletionOptions,
  AICompletionResult,
  AIProviderConfig,
  ModerationAdapter,
  ModerationResult,
  AIToolParameter,
  AITool,
  AIToolCallbacks,
  AIToolCompletionOptions,
  AIToolCompletionResult,
} from '@downpat/core';
export { getAvailableModels } from '@downpat/core';

/**
 * Default preference order for selecting AI adapters.
 * OpenAI is preferred for reliability and feature completeness.
 */
export const DEFAULT_PROVIDER_PREFERENCE = ['openai', 'anthropic', 'gemini'] as const;

/**
 * Standard environment variable names for API keys.
 */
export const ENV_VAR_NAMES = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
} as const;

/**
 * Registry of AI adapters.
 * Provides a unified interface for managing multiple providers.
 */
export class AIAdapterRegistry {
  private adapters: Map<string, AIAdapter> = new Map();
  private moderationAdapter: ModerationAdapter | null = null;
  private providerPreference: readonly string[] = DEFAULT_PROVIDER_PREFERENCE;

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

  /**
   * Set the provider preference order for getDefaultAdapter().
   *
   * @param preference - Array of provider names in order of preference
   *
   * @example
   * ```typescript
   * // Prefer Anthropic over OpenAI
   * registry.setProviderPreference(['anthropic', 'openai', 'gemini']);
   * ```
   */
  setProviderPreference(preference: readonly string[]): void {
    this.providerPreference = preference;
  }

  /**
   * Get the default adapter based on provider preference.
   *
   * Returns the first available adapter according to the preference order.
   * Use setProviderPreference() to customize the order.
   *
   * @returns The preferred available adapter, or undefined if none available
   *
   * @example
   * ```typescript
   * const registry = await createAdapterRegistryFromEnv();
   * const adapter = registry.getDefaultAdapter();
   * if (adapter) {
   *   const result = await adapter.complete(messages);
   * }
   * ```
   */
  getDefaultAdapter(): AIAdapter | undefined {
    // Try providers in preference order
    for (const provider of this.providerPreference) {
      const adapter = this.adapters.get(provider);
      if (adapter) {
        return adapter;
      }
    }
    // Fall back to any available adapter
    const firstAdapter = this.adapters.values().next();
    return firstAdapter.done ? undefined : firstAdapter.value;
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

/**
 * Options for createAdapterRegistryFromEnv.
 */
export interface CreateAdapterRegistryFromEnvOptions {
  /**
   * Provider preference order for getDefaultAdapter().
   * Defaults to ['openai', 'anthropic', 'gemini'].
   */
  providerPreference?: readonly string[];

  /**
   * Override environment variable names for API keys.
   */
  envVarNames?: Partial<typeof ENV_VAR_NAMES>;
}

/**
 * Create an adapter registry by auto-detecting API keys from environment variables.
 *
 * Checks for standard environment variables:
 * - OPENAI_API_KEY
 * - ANTHROPIC_API_KEY
 * - GEMINI_API_KEY
 *
 * Only creates adapters for providers with configured API keys.
 *
 * @example
 * ```typescript
 * import { createAdapterRegistryFromEnv } from '@downpat/ai-adapters';
 *
 * // Auto-detect API keys from environment
 * const registry = await createAdapterRegistryFromEnv();
 *
 * // Get the best available adapter
 * const adapter = registry.getDefaultAdapter();
 *
 * // Check available models
 * console.log('Available models:', registry.getAllModels());
 * ```
 *
 * @example
 * ```typescript
 * // With custom provider preference (prefer Anthropic)
 * const registry = await createAdapterRegistryFromEnv({
 *   providerPreference: ['anthropic', 'openai', 'gemini'],
 * });
 * ```
 */
export async function createAdapterRegistryFromEnv(
  options: CreateAdapterRegistryFromEnvOptions = {}
): Promise<AIAdapterRegistry> {
  const envVars = { ...ENV_VAR_NAMES, ...options.envVarNames };

  const config: AIProviderConfig = {};

  // Check for OpenAI API key
  const openaiKey = process.env[envVars.openai];
  if (openaiKey) {
    config.openai = { apiKey: openaiKey };
  }

  // Check for Anthropic API key
  const anthropicKey = process.env[envVars.anthropic];
  if (anthropicKey) {
    config.anthropic = { apiKey: anthropicKey };
  }

  // Check for Gemini API key
  const geminiKey = process.env[envVars.gemini];
  if (geminiKey) {
    config.gemini = { apiKey: geminiKey };
  }

  const registry = await createAdapterRegistry(config);

  // Set provider preference if specified
  if (options.providerPreference) {
    registry.setProviderPreference(options.providerPreference);
  }

  return registry;
}
