# @downpat/ai-adapters

AI provider adapters for DownPat. Supports OpenAI, Anthropic (Claude), and Google Gemini.

## Installation

```bash
npm install @downpat/ai-adapters
```

### Peer Dependencies

Install only the SDK(s) for the provider(s) you plan to use:

```bash
# For OpenAI
npm install openai

# For Anthropic (Claude)
npm install @anthropic-ai/sdk

# For Google Gemini
npm install @google/generative-ai
```

## Quick Start

The easiest way to use adapters is through the registry:

```typescript
import { createAdapterRegistry } from '@downpat/ai-adapters';

const registry = await createAdapterRegistry({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
});

// Get all available models
const models = registry.getAllModels();

// Find adapter for a specific model
const adapter = registry.getAdapterForModel('gpt-4');

// Generate a completion
const result = await adapter.complete({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
  ],
});

console.log(result.content);
```

## Individual Adapters

You can also create adapters individually:

### OpenAI

```typescript
import { createOpenAIAdapter } from '@downpat/ai-adapters';

const { adapter, moderation } = await createOpenAIAdapter(
  process.env.OPENAI_API_KEY
);

const result = await adapter.complete({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Content moderation
const moderationResult = await moderation.checkContent('Some text to check');
if (moderationResult.flagged) {
  console.log('Content flagged:', moderationResult.categories);
}
```

### Anthropic (Claude)

```typescript
import { createAnthropicAdapter } from '@downpat/ai-adapters';

const adapter = await createAnthropicAdapter(process.env.ANTHROPIC_API_KEY);

const result = await adapter.complete({
  model: 'claude-3-opus-20240229',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
  ],
});
```

### Google Gemini

```typescript
import { createGeminiAdapter } from '@downpat/ai-adapters';

const adapter = await createGeminiAdapter(process.env.GEMINI_API_KEY);

const result = await adapter.complete({
  model: 'gemini-1.5-pro',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
  ],
});
```

## Streaming

All adapters support streaming via the `onChunk` callback:

```typescript
const result = await adapter.complete({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Tell me a story.' }],
  onChunk: (chunk) => {
    process.stdout.write(chunk);
  },
});
```

## API Reference

### `AICompletionOptions`

| Option | Type | Description |
|--------|------|-------------|
| `model` | `string` | Model identifier |
| `messages` | `AIMessage[]` | Conversation messages |
| `maxTokens` | `number?` | Maximum tokens to generate |
| `temperature` | `number?` | Sampling temperature (default: 0.7) |
| `onChunk` | `(chunk: string) => void` | Streaming callback |
| `signal` | `AbortSignal?` | Abort signal for cancellation |

### `AICompletionResult`

| Property | Type | Description |
|----------|------|-------------|
| `content` | `string` | Generated text |
| `finishReason` | `'stop' \| 'length' \| 'content_filter' \| 'error'` | Why generation stopped |
| `usage` | `{ promptTokens, completionTokens, totalTokens }?` | Token usage statistics |

### `AIAdapterRegistry`

| Method | Description |
|--------|-------------|
| `getAllModels()` | Get all available models from all providers |
| `getAdapterForModel(model)` | Find adapter that supports a model |
| `getAdapter(provider)` | Get adapter by provider name |
| `getProviders()` | List registered provider names |
| `getModerationAdapter()` | Get the moderation adapter (if available) |

## Provider-Specific Behaviors

### Anthropic System Messages

Anthropic's API accepts a single `system` parameter. When multiple system messages are provided, they are concatenated with double newlines:

```typescript
// Input messages:
[
  { role: 'system', content: 'You are helpful.' },
  { role: 'system', content: 'Always be concise.' },
  { role: 'user', content: 'Hello' },
]

// Sent to Anthropic as:
// system: "You are helpful.\n\nAlways be concise."
// messages: [{ role: 'user', content: 'Hello' }]
```

### Gemini Message Handling

Gemini requires strictly alternating user/model turns. The adapter automatically merges consecutive same-role messages:

```typescript
// Input messages:
[
  { role: 'user', content: 'Hi' },
  { role: 'user', content: 'Are you there?' },  // consecutive user
]

// Sent to Gemini as:
// contents: [{ role: 'user', parts: [{ text: 'Hi' }, { text: 'Are you there?' }] }]
```

## Custom Models

You can specify custom model lists when creating adapters:

```typescript
const registry = await createAdapterRegistry({
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'],
  },
});
```

## Limitations

### Tool Use Not Supported

These adapters do not support tool/function calling. If a model returns a `tool_calls` finish reason (OpenAI) or similar, the adapter will report `finishReason: 'error'`. This is intentional: when a model expects to call tools, its response is incomplete and waiting for tool results. Since the adapter cannot execute tools, returning `'stop'` would incorrectly indicate successful completion.

If you need tool support, use the provider SDKs directly.

## License

MIT
