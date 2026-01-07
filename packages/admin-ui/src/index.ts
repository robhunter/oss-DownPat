// ============================================
// Main Entry Point - Self-contained Admin UI
// ============================================

// Mount function for easy integration
export { mountAdminUI } from './mount.js';
export type { MountAdminUIOptions, MountedAdminUI } from './mount.js';

// Admin App components for React integration
export { AdminApp, ControlledAdminApp } from './AdminApp.js';
export type { AdminAppProps, ControlledAdminAppProps } from './AdminApp.js';

// Configuration
export type { AdminUIConfig, AdminUIContextValue } from './config.js';

// Context and hooks
export { AdminProvider, useAdminContext, useAdminAPI } from './AdminContext.js';
export type { AdminProviderProps } from './AdminContext.js';

// API Client
export { createAdminAPIClient } from './api-client.js';
export type { AdminAPIClient, ExerciseWithMetadata } from './api-client.js';

// Page components (for advanced customization)
export { ExerciseListPage } from './pages/ExerciseListPage.js';
export { ExerciseEditorPage } from './pages/ExerciseEditorPage.js';
export type { ExerciseEditorPageProps } from './pages/ExerciseEditorPage.js';

// ============================================
// Low-level Components (for advanced customization)
// ============================================

export { ExerciseForm } from './components/ExerciseForm.js';
export type { ExerciseFormProps } from './components/ExerciseForm.js';

export { ExerciseList } from './components/ExerciseList.js';
export type { ExerciseListProps } from './components/ExerciseList.js';

// ============================================
// Re-exports from @downpat/core
// ============================================

export type { Exercise, ExerciseMetadata, Task, ConversationTask } from '@downpat/core';
export { MessageType, generateId, generateSlug } from '@downpat/core';
