# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

### Fixed

### Changed
- Fix async getToken handling in DownpatContext (#56)
- Fix code review blockers from server-side refactor (#51)
- Update React hooks to use Context instead of singleton (#55)
- Wrap DownpatRoutes with DownpatProvider (#54)
- Fix getExercise method - uses slug but calls ID endpoint (#53)
- Fix stats endpoint path mismatch in api-client (#52)
- Refactor example-app: Move DownPat-specific code to packages (#10)
- Update example-app server to use createDownpatServer() from @downpat/express (#35)
- Update @downpat/express with higher-level server setup (#19)
- Add GET /api/downpat/models endpoint to expose available AI models (#29)
- Add GET /api/downpat/exercises/stats endpoint for dashboard (#28)
- Add createDownpatServer() higher-level helper that combines router + Socket.io setup (#27)
- Update @downpat/ai-adapters with helper functions (#18)
- Add getDefaultAdapter() method to registry with configurable preference order (#26)
- Add createAdapterRegistryFromEnv() that auto-detects API keys (#25)
- Add createFirebaseStorage() helper that auto-detects env and uses in-memory for test (#24)
- Add initializeFirebaseFromEnv() helper function (#23)
- Address code review feedback for @downpat/react (#46)
- Replace inline styles with CSS module in ExerciseBrowserPage (#50)
- Replace singleton pattern with React Context for client initialization (#49)
- Add unit tests for createDownpatRoutes (routing logic, components) (#48)
- Add unit tests for React hooks module (usePublishedExercises, useExerciseAdmin, etc.) (#47)
- Extract @downpat/api-client shared package (#39)
- Verify all tests pass and app works end-to-end (#45)
- Add unit tests for @downpat/api-client (#44)
- Update @downpat/react to use @downpat/api-client (#43)
- Update @downpat/admin-ui to use @downpat/api-client (#42)
- Consolidate DownpatClient + AdminAPIClient into unified implementation (#41)
- Create @downpat/api-client package structure (#40)
- Move admin page components to @downpat/admin-ui (#21)
- Move page components to @downpat/ui-components (#20)
- Update example-app to use new packages and /downpat/* routes (#22)
- Create ExerciseEditorPage component with load/save built-in (#33)
- Create ExerciseListPage component with CRUD handlers built-in (#32)
- Create AdminDashboardPage component with stats fetching built-in (#31)
- Create ExerciseBrowserPage component with data fetching built-in (#30)
- Add useAvailableModels() hook that fetches from /api/downpat/models (#38)
- Remove redundant page files from example-app after migration (#37)
- Update all hardcoded paths to use /downpat/* namespace (#36)
- Update example-app to use createDownpatRoutes() from @downpat/react (#34)
- Create @downpat/react package (#11)
- Update @downpat/firebase-storage with helper functions (#17)
- Create initializeDownpat() single initialization function for token setup (#16)
- Create createDownpatRoutes() route builder with basePath and auth wrapper config (#15)
- Create React hooks: usePublishedExercises, useExerciseAdmin, useExerciseEditor, useExerciseStats (#14)
- Move DownpatAPI client class to @downpat/react (#13)
- Create package structure and build config for @downpat/react (#12)
