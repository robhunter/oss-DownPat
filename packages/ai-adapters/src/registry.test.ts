import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AIAdapterRegistry,
  ModelRouter,
  createAdapterRegistryFromEnv,
  DEFAULT_PROVIDER_PREFERENCE,
  ENV_VAR_NAMES,
} from './index.js';
import type { AIAdapter, ModerationAdapter } from '@downpat/core';

describe('AIAdapterRegistry', () => {
  const createMockAdapter = (provider: string, models: string[]): AIAdapter => ({
    provider,
    getModels: () => models,
    supportsModel: (model) => models.includes(model),
    complete: vi.fn(),
  });

  const createMockModerationAdapter = (): ModerationAdapter => ({
    checkContent: vi.fn(),
  });

  it('registers and retrieves adapter by provider', () => {
    const registry = new AIAdapterRegistry();
    const adapter = createMockAdapter('openai', ['gpt-4']);

    registry.registerAdapter(adapter);

    expect(registry.getAdapter('openai')).toBe(adapter);
    expect(registry.getAdapter('anthropic')).toBeUndefined();
  });

  it('returns all registered providers', () => {
    const registry = new AIAdapterRegistry();
    registry.registerAdapter(createMockAdapter('openai', ['gpt-4']));
    registry.registerAdapter(createMockAdapter('anthropic', ['claude-3-opus']));

    const providers = registry.getProviders();

    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toHaveLength(2);
  });

  it('returns all models from all providers', () => {
    const registry = new AIAdapterRegistry();
    registry.registerAdapter(createMockAdapter('openai', ['gpt-4', 'gpt-3.5-turbo']));
    registry.registerAdapter(createMockAdapter('anthropic', ['claude-3-opus']));

    const models = registry.getAllModels();

    expect(models).toContain('gpt-4');
    expect(models).toContain('gpt-3.5-turbo');
    expect(models).toContain('claude-3-opus');
    expect(models).toHaveLength(3);
  });

  it('finds adapter for specific model', () => {
    const registry = new AIAdapterRegistry();
    const openaiAdapter = createMockAdapter('openai', ['gpt-4', 'gpt-3.5-turbo']);
    const anthropicAdapter = createMockAdapter('anthropic', ['claude-3-opus']);

    registry.registerAdapter(openaiAdapter);
    registry.registerAdapter(anthropicAdapter);

    expect(registry.getAdapterForModel('gpt-4')).toBe(openaiAdapter);
    expect(registry.getAdapterForModel('claude-3-opus')).toBe(anthropicAdapter);
    expect(registry.getAdapterForModel('unknown-model')).toBeUndefined();
  });

  it('sets and retrieves moderation adapter', () => {
    const registry = new AIAdapterRegistry();
    const moderationAdapter = createMockModerationAdapter();

    expect(registry.getModerationAdapter()).toBeNull();

    registry.setModerationAdapter(moderationAdapter);

    expect(registry.getModerationAdapter()).toBe(moderationAdapter);
  });

  it('handles empty registry', () => {
    const registry = new AIAdapterRegistry();

    expect(registry.getProviders()).toEqual([]);
    expect(registry.getAllModels()).toEqual([]);
    expect(registry.getAdapterForModel('gpt-4')).toBeUndefined();
  });

  it('overwrites adapter when registering same provider twice', () => {
    const registry = new AIAdapterRegistry();
    const adapter1 = createMockAdapter('openai', ['gpt-4']);
    const adapter2 = createMockAdapter('openai', ['gpt-4o']);

    registry.registerAdapter(adapter1);
    registry.registerAdapter(adapter2);

    expect(registry.getAdapter('openai')).toBe(adapter2);
    expect(registry.getAllModels()).toEqual(['gpt-4o']);
  });

  describe('getDefaultAdapter', () => {
    it('returns undefined for empty registry', () => {
      const registry = new AIAdapterRegistry();
      expect(registry.getDefaultAdapter()).toBeUndefined();
    });

    it('returns first adapter by default preference order', () => {
      const registry = new AIAdapterRegistry();
      const anthropicAdapter = createMockAdapter('anthropic', ['claude-3-opus']);
      const openaiAdapter = createMockAdapter('openai', ['gpt-4']);

      // Register anthropic first, but openai should be preferred
      registry.registerAdapter(anthropicAdapter);
      registry.registerAdapter(openaiAdapter);

      expect(registry.getDefaultAdapter()).toBe(openaiAdapter);
    });

    it('falls back to second preference if first not available', () => {
      const registry = new AIAdapterRegistry();
      const anthropicAdapter = createMockAdapter('anthropic', ['claude-3-opus']);

      registry.registerAdapter(anthropicAdapter);

      expect(registry.getDefaultAdapter()).toBe(anthropicAdapter);
    });

    it('respects custom provider preference', () => {
      const registry = new AIAdapterRegistry();
      const anthropicAdapter = createMockAdapter('anthropic', ['claude-3-opus']);
      const openaiAdapter = createMockAdapter('openai', ['gpt-4']);

      registry.registerAdapter(openaiAdapter);
      registry.registerAdapter(anthropicAdapter);
      registry.setProviderPreference(['anthropic', 'openai', 'gemini']);

      expect(registry.getDefaultAdapter()).toBe(anthropicAdapter);
    });

    it('falls back to any available adapter if none in preference', () => {
      const registry = new AIAdapterRegistry();
      const geminiAdapter = createMockAdapter('gemini', ['gemini-pro']);

      registry.registerAdapter(geminiAdapter);
      registry.setProviderPreference(['custom-provider']);

      expect(registry.getDefaultAdapter()).toBe(geminiAdapter);
    });
  });
});

describe('createAdapterRegistryFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear all API keys
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates empty registry when no API keys set', async () => {
    const registry = await createAdapterRegistryFromEnv();

    expect(registry.getProviders()).toEqual([]);
    expect(registry.getAllModels()).toEqual([]);
  });

  it('creates OpenAI adapter when OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    const registry = await createAdapterRegistryFromEnv();

    expect(registry.getProviders()).toContain('openai');
    expect(registry.getAdapter('openai')).toBeDefined();
  });

  it('creates Anthropic adapter when ANTHROPIC_API_KEY is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    const registry = await createAdapterRegistryFromEnv();

    expect(registry.getProviders()).toContain('anthropic');
    expect(registry.getAdapter('anthropic')).toBeDefined();
  });

  it('creates Gemini adapter when GEMINI_API_KEY is set', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const registry = await createAdapterRegistryFromEnv();

    expect(registry.getProviders()).toContain('gemini');
    expect(registry.getAdapter('gemini')).toBeDefined();
  });

  it('creates multiple adapters when multiple keys set', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    const registry = await createAdapterRegistryFromEnv();

    expect(registry.getProviders()).toContain('openai');
    expect(registry.getProviders()).toContain('anthropic');
    expect(registry.getProviders()).toHaveLength(2);
  });

  it('applies custom provider preference', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    const registry = await createAdapterRegistryFromEnv({
      providerPreference: ['anthropic', 'openai'],
    });

    const defaultAdapter = registry.getDefaultAdapter();
    expect(defaultAdapter?.provider).toBe('anthropic');
  });

  it('supports custom env var names', async () => {
    process.env.MY_CUSTOM_OPENAI_KEY = 'test-key';

    const registry = await createAdapterRegistryFromEnv({
      envVarNames: { openai: 'MY_CUSTOM_OPENAI_KEY' },
    });

    expect(registry.getProviders()).toContain('openai');
  });
});

describe('ModelRouter', () => {
  const createMockAdapter = (provider: string, models: string[]): AIAdapter => ({
    provider,
    getModels: () => models,
    supportsModel: (model) => models.includes(model),
    complete: vi.fn().mockResolvedValue({
      content: `response from ${provider}`,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    }),
  });

  it('returns all models from all providers', () => {
    const registry = new AIAdapterRegistry();
    registry.registerAdapter(createMockAdapter('openai', ['gpt-4', 'gpt-4o']));
    registry.registerAdapter(createMockAdapter('anthropic', ['claude-3-opus']));

    const router = registry.createModelRouter();

    expect(router.getModels()).toEqual(['gpt-4', 'gpt-4o', 'claude-3-opus']);
  });

  it('reports provider as "multi"', () => {
    const registry = new AIAdapterRegistry();
    const router = registry.createModelRouter();

    expect(router.provider).toBe('multi');
  });

  it('supports models from any registered provider', () => {
    const registry = new AIAdapterRegistry();
    registry.registerAdapter(createMockAdapter('openai', ['gpt-4']));
    registry.registerAdapter(createMockAdapter('anthropic', ['claude-3-opus']));

    const router = registry.createModelRouter();

    expect(router.supportsModel('gpt-4')).toBe(true);
    expect(router.supportsModel('claude-3-opus')).toBe(true);
    expect(router.supportsModel('unknown-model')).toBe(false);
  });

  it('routes complete() to the correct provider based on model', async () => {
    const registry = new AIAdapterRegistry();
    const openaiAdapter = createMockAdapter('openai', ['gpt-4']);
    const anthropicAdapter = createMockAdapter('anthropic', ['claude-3-opus']);

    registry.registerAdapter(openaiAdapter);
    registry.registerAdapter(anthropicAdapter);

    const router = registry.createModelRouter();

    await router.complete({ model: 'gpt-4', messages: [] });
    expect(openaiAdapter.complete).toHaveBeenCalledWith({ model: 'gpt-4', messages: [] });
    expect(anthropicAdapter.complete).not.toHaveBeenCalled();

    await router.complete({ model: 'claude-3-opus', messages: [] });
    expect(anthropicAdapter.complete).toHaveBeenCalledWith({ model: 'claude-3-opus', messages: [] });
  });

  it('throws descriptive error for unsupported model', async () => {
    const registry = new AIAdapterRegistry();
    registry.registerAdapter(createMockAdapter('openai', ['gpt-4']));

    const router = registry.createModelRouter();

    await expect(router.complete({ model: 'nonexistent', messages: [] })).rejects.toThrow(
      "No adapter found for model 'nonexistent'. Available models: gpt-4"
    );
  });

  it('routes completeWithTool() to the correct provider', async () => {
    const registry = new AIAdapterRegistry();
    const openaiAdapter = createMockAdapter('openai', ['gpt-4']);
    openaiAdapter.completeWithTool = vi.fn().mockResolvedValue({
      arguments: { result: 'tool result' },
      finishReason: 'tool_calls',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    });

    registry.registerAdapter(openaiAdapter);
    const router = registry.createModelRouter();

    const tool = { name: 'test', description: 'test', parameters: { result: { type: 'string' as const } } };
    await router.completeWithTool!({ model: 'gpt-4', messages: [], tool });

    expect(openaiAdapter.completeWithTool).toHaveBeenCalled();
  });

  it('throws when adapter lacks completeWithTool', async () => {
    const registry = new AIAdapterRegistry();
    const adapter = createMockAdapter('anthropic', ['claude-3-opus']);
    // adapter has no completeWithTool method

    registry.registerAdapter(adapter);
    const router = registry.createModelRouter();

    const tool = { name: 'test', description: 'test', parameters: { answer: { type: 'string' as const } } };

    await expect(
      router.completeWithTool!({ model: 'claude-3-opus', messages: [], tool })
    ).rejects.toThrow("Adapter 'anthropic' does not support tool calling for model 'claude-3-opus'");
  });

  it('returns ModelRouter instance from createModelRouter()', () => {
    const registry = new AIAdapterRegistry();
    const router = registry.createModelRouter();

    expect(router).toBeInstanceOf(ModelRouter);
  });
});

describe('constants', () => {
  it('exports DEFAULT_PROVIDER_PREFERENCE', () => {
    expect(DEFAULT_PROVIDER_PREFERENCE).toEqual(['openai', 'anthropic', 'gemini']);
  });

  it('exports ENV_VAR_NAMES', () => {
    expect(ENV_VAR_NAMES).toEqual({
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      gemini: 'GEMINI_API_KEY',
    });
  });
});
