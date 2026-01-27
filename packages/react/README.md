# @downpat/react

React integration for DownPat - includes API client, hooks, routing, and pre-built pages.

## Installation

```bash
npm install @downpat/react
```

This is the main client-side package. It includes:
- `@downpat/ui-components` - Conversation UI components
- `@downpat/admin-ui` - Admin dashboard components
- `@downpat/api-client` - HTTP client

## Quick Start

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DownpatRoutes } from '@downpat/react';
import '@downpat/ui-components/styles';
import '@downpat/admin-ui/styles';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Your app routes */}
        <Route path="/" element={<Home />} />

        {/* DownPat routes - handles exercises, conversations, and admin */}
        <Route
          path="/downpat/*"
          element={
            <DownpatRoutes
              authWrapper={ProtectedRoute}
              adminAuthWrapper={AdminRoute}
              basePath="/downpat"
              getAuthToken={async () => localStorage.getItem('token')}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

## What's Included

### Route Builder
- **DownpatRoutes**: Pre-built routes for exercises, conversations, and admin

### Hooks
- **usePublishedExercises()**: Fetch published exercises
- **useExerciseAdmin()**: CRUD operations for exercises
- **useExerciseEditor()**: Load/save exercise drafts
- **useAvailableModels()**: Fetch available AI models

### Context
- **DownpatProvider**: Context provider for API client
- **useDownpatClient()**: Access the API client

## Routes Provided

| Path | Description |
|------|-------------|
| `/exercises` | Exercise browser |
| `/exercises/:slug` | Conversation page |
| `/admin` | Admin dashboard |
| `/admin/exercises/new` | Create exercise |
| `/admin/exercises/:slug/edit` | Edit exercise |
| `/admin/test/:slug` | Test exercise as admin |

## Documentation

See the [main repository](https://github.com/robhunter/oss-DownPat) for full documentation.

## License

MIT
