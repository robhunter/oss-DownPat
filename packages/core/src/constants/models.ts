/**
 * Default AI models shown in UI dropdowns when availableModels is not specified.
 * Used by @downpat/react and @downpat/admin-ui for consistent defaults.
 */
export const DEFAULT_AVAILABLE_MODELS = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4o',
  'gpt-4o-mini',
  'claude-sonnet-4-5-20250929',
] as const;

export type DefaultAvailableModel = (typeof DEFAULT_AVAILABLE_MODELS)[number];
