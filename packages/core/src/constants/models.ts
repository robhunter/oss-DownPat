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
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
  'claude-3-haiku-20240307',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
] as const;

export type DefaultAvailableModel = (typeof DEFAULT_AVAILABLE_MODELS)[number];
