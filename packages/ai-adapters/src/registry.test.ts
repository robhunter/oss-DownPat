import { describe, it, expect, vi } from 'vitest';
import { AIAdapterRegistry } from './index.js';
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
});
