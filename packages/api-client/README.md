# @downpat/api-client

HTTP API client for communicating with DownPat servers.

## Installation

```bash
npm install @downpat/api-client
```

**Note:** You typically don't need to install this directly. It's included as a dependency of `@downpat/react`.

## What's Included

- **DownpatAPIClient**: Full-featured API client for exercises, conversations, and admin operations
- **Error handling**: Typed error classes for API failures

## Usage

```typescript
import { DownpatAPIClient } from '@downpat/api-client';

const client = new DownpatAPIClient({
  baseUrl: '/api/downpat',
  getAuthToken: async () => localStorage.getItem('token'),
});

// Fetch published exercises
const exercises = await client.getPublishedExercises();

// Get exercise by slug
const exercise = await client.getExercise('my-exercise');

// Admin operations
const allExercises = await client.getExercisesWithMetadata();
await client.createExercise(exerciseData);
await client.publishExercise('exercise-slug');
```

## Documentation

See the [main repository](https://github.com/robhunter/oss-DownPat) for full documentation.

## License

MIT
