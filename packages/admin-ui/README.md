# @downpat/admin-ui

React admin UI components for managing DownPat exercises. This package provides a self-contained admin interface that can be mounted into any React application.

## Installation

```bash
npm install @downpat/admin-ui
```

### Peer Dependencies

- `react` >= 18.0.0
- `react-dom` >= 18.0.0 (optional, required for `mountAdminUI`)

## Quick Start

### Option 1: Mount Function (Recommended)

The simplest way to add the admin UI to your application:

```typescript
import { mountAdminUI } from '@downpat/admin-ui';
import '@downpat/admin-ui/styles';

const admin = mountAdminUI({
  target: '#admin-root',
  apiBaseUrl: '/api/downpat',
  getAuthToken: async () => localStorage.getItem('token'),
  availableModels: ['gpt-4', 'gpt-3.5-turbo'],
  basePath: '/admin',
  onNavigate: (path) => {
    // Sync with your router (optional)
    window.history.pushState(null, '', path);
  },
});

// Navigate programmatically
admin.navigate('/exercises/new');

// Clean up when done
admin.unmount();
```

### Option 2: React Component

For more control, use the React components directly:

```tsx
import { AdminApp } from '@downpat/admin-ui';
import '@downpat/admin-ui/styles';

function AdminPage() {
  return (
    <AdminApp
      config={{
        apiBaseUrl: '/api/downpat',
        getAuthToken: async () => localStorage.getItem('token'),
        availableModels: ['gpt-4', 'gpt-3.5-turbo'],
      }}
    />
  );
}
```

### Option 3: Controlled Routing

If you want to control routing externally (e.g., with react-router):

```tsx
import { ControlledAdminApp } from '@downpat/admin-ui';
import '@downpat/admin-ui/styles';
import { useLocation } from 'react-router-dom';

function AdminPage() {
  const location = useLocation();
  const adminPath = location.pathname.replace('/admin', '') || '/';

  return (
    <ControlledAdminApp
      config={{
        apiBaseUrl: '/api/downpat',
        getAuthToken: async () => localStorage.getItem('token'),
        availableModels: ['gpt-4', 'gpt-3.5-turbo'],
        onNavigate: (path) => navigate(path),
      }}
      path={adminPath}
    />
  );
}
```

## Configuration

### AdminUIConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `apiBaseUrl` | `string` | Yes | Base URL for API requests (e.g., `/api/downpat`) |
| `getAuthToken` | `() => Promise<string \| null>` | Yes | Function to get the current auth token |
| `availableModels` | `string[]` | No | AI models available for exercise configuration (default: `['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet']`) |
| `basePath` | `string` | No | Base path for admin routes (default: `/admin`) |
| `onNavigate` | `(path: string) => void` | No | Callback when navigation occurs |
| `onTestExercise` | `(exerciseId: string, slug: string) => void` | No | Callback when user clicks "Test" on an exercise |

## Styling

Import the CSS file to apply default styles:

```typescript
import '@downpat/admin-ui/styles';
```

### CSS Variables

Customize the appearance by overriding CSS variables:

```css
:root {
  --downpat-admin-input-bg: #ffffff;
  --downpat-admin-input-border: #d1d5db;
  --downpat-admin-input-focus: #3b82f6;
  --downpat-admin-btn-primary-bg: #3b82f6;
  --downpat-admin-btn-primary-hover: #2563eb;
}
```

### Dark Mode

The admin UI supports dark mode via `[data-theme="dark"]` or `.dark` class:

```html
<html data-theme="dark">
```

### CSS Namespace

All CSS classes use the `downpat-` prefix to avoid conflicts with your application styles:

- `.downpat-admin-app` - Main container
- `.downpat-exercise-form` - Form wrapper
- `.downpat-btn`, `.downpat-input`, etc. - UI elements

This BEM-like naming convention minimizes collision risk without requiring CSS Modules. If you need complete style isolation, wrap the admin UI in a Shadow DOM container.

## API Requirements

The admin UI expects these API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exercises/with-metadata` | List all exercises with metadata |
| GET | `/exercises/:slug` | Get single exercise |
| POST | `/exercises` | Create exercise |
| PUT | `/exercises/:exerciseId` | Update exercise |
| DELETE | `/exercises/:slug` | Delete exercise |
| POST | `/exercises/:slug/publish` | Publish exercise |
| POST | `/exercises/:slug/unpublish` | Unpublish exercise |
| POST | `/exercises/:slug/restore` | Restore draft from published |

All endpoints require `Authorization: Bearer <token>` header.

## Available Exports

### Main Exports

- `mountAdminUI(options)` - Mount admin UI into a DOM element
- `AdminApp` - Main React component with internal routing
- `ControlledAdminApp` - React component with external routing control

### Hooks

- `useAdminContext()` - Access admin config and navigation
- `useAdminAPI()` - Access the API client

### Low-level Components

For advanced customization:

- `ExerciseForm` - Exercise create/edit form
- `ExerciseList` - Exercise listing table
- `ExerciseListPage` - Full list page
- `ExerciseEditorPage` - Full editor page

### Utilities

- `createAdminAPIClient(apiBaseUrl, getAuthToken)` - Create API client instance

## Navigation Architecture

The admin UI manages its own routing state internally:

- **Internal navigation**: Users navigate via links and buttons within the UI
- **`onNavigate` callback**: Notification hook for syncing with your router (one-way)
- **`navigate()` method**: For programmatic navigation from outside the admin UI

```typescript
const admin = mountAdminUI({ ... });

// Listen for URL changes and sync
window.addEventListener('popstate', () => {
  const path = window.location.pathname.replace('/admin', '');
  admin.navigate(path);
});
```

## Routes

| Path | Description |
|------|-------------|
| `/` or `/exercises` | Exercise list |
| `/exercises/new` | Create new exercise |
| `/exercises/:slug/edit` | Edit existing exercise |

## Client-Side Slicing

The API client supports slicing cached data for UI pagination via `getExercisesSliced()`:

```typescript
import { createAdminAPIClient } from '@downpat/admin-ui';

const api = createAdminAPIClient('/api/downpat', getToken);

// Get first slice (50 items by default)
const slice1 = await api.getExercisesSliced();
console.log(slice1.items, slice1.total, slice1.hasMore);

// Get next slice
const slice2 = await api.getExercisesSliced({ limit: 50, offset: 50 });
```

**Important**: This is CLIENT-SIDE slicing with a 30-second cache. All exercises are fetched from the server, then sliced locally. This is useful for UI pagination but does NOT reduce server load. True server-side pagination would require backend support.

## Known Limitations

- **Query parameters**: The internal router does not parse query parameters
- **Trailing slashes**: `/exercises/` and `/exercises` are treated differently
- **No server-side pagination**: `getExercisesSliced()` fetches all data then slices client-side; true server-side pagination requires backend support

For applications with complex routing needs, use `ControlledAdminApp` with your preferred router.

## License

MIT
