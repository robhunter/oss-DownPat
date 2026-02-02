# @downpat/core

## 0.0.2

### Patch Changes

- Upgrade AI provider SDKs: OpenAI ^4→^6, Anthropic ^0.20→^0.72, Gemini @google/generative-ai→@google/genai. Add model routing to dispatch requests to correct provider based on exercise model.
- Add custom error classes (NotFoundError, UnauthorizedError, ValidationError) to @downpat/core. Express routes now use instanceof checks instead of fragile error message string matching.
