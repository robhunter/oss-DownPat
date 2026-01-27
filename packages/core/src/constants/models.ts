/**
 * Default AI models shown in UI dropdowns when availableModels is not specified.
 * Used by @downpat/react and @downpat/admin-ui for consistent defaults.
 */
export const DEFAULT_AVAILABLE_MODELS = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'] as const;

export type DefaultAvailableModel = (typeof DEFAULT_AVAILABLE_MODELS)[number];
