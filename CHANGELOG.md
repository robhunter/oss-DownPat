# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

### Fixed

### Changed
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
