/**
 * Model Coverage Tests
 *
 * Verifies that all models in DEFAULT_AVAILABLE_MODELS (used by UI dropdowns)
 * are supported by at least one adapter with default configuration.
 *
 * This prevents mismatches where the UI shows a model that no adapter can handle.
 */
import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_AVAILABLE_MODELS } from '@downpat/core';
import { OpenAIAdapter } from './openai-adapter.js';
import { AnthropicAdapter } from './anthropic-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';

describe('Model Coverage', () => {
  // Create adapters with mock clients and default model lists
  const mockOpenAIClient = {
    chat: { completions: { create: vi.fn() } },
    moderations: { create: vi.fn() },
  };

  const mockAnthropicClient = {
    messages: { create: vi.fn(), stream: vi.fn() },
  };

  const mockGeminiClient = {
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(),
      generateContentStream: vi.fn(),
    })),
  };

  // Create adapters with their default model lists (no custom models passed)
  const openaiAdapter = new OpenAIAdapter(mockOpenAIClient as never);
  const anthropicAdapter = new AnthropicAdapter(mockAnthropicClient as never);
  const geminiAdapter = new GeminiAdapter(mockGeminiClient as never);

  const allAdapters = [openaiAdapter, anthropicAdapter, geminiAdapter];

  describe('DEFAULT_AVAILABLE_MODELS coverage', () => {
    it.each([...DEFAULT_AVAILABLE_MODELS])(
      'model "%s" is supported by at least one adapter',
      (model) => {
        const supportingAdapter = allAdapters.find((adapter) =>
          adapter.supportsModel(model)
        );

        expect(supportingAdapter).toBeDefined();
        if (supportingAdapter) {
          expect(supportingAdapter.supportsModel(model)).toBe(true);
        }
      }
    );

    it('all UI default models have adapter coverage', () => {
      const unsupportedModels: string[] = [];

      for (const model of DEFAULT_AVAILABLE_MODELS) {
        const hasSupport = allAdapters.some((adapter) =>
          adapter.supportsModel(model)
        );
        if (!hasSupport) {
          unsupportedModels.push(model);
        }
      }

      expect(unsupportedModels).toEqual([]);
    });
  });

  describe('Adapter default models', () => {
    it('OpenAI adapter has default models', () => {
      const models = openaiAdapter.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it('Anthropic adapter has default models', () => {
      const models = anthropicAdapter.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it('Gemini adapter has default models', () => {
      const models = geminiAdapter.getModels();
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
