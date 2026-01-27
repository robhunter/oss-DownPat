# @downpat/ui-components

React UI components for DownPat conversations.

## Installation

```bash
npm install @downpat/ui-components
```

**Note:** You typically don't need to install this directly. It's included as a dependency of `@downpat/react`.

## Quick Start

```tsx
import { ConversationPage } from '@downpat/ui-components';
import '@downpat/ui-components/styles';

function MyConversation() {
  return (
    <ConversationPage
      slug="my-exercise"
      onBack={() => navigate('/exercises')}
      backText="← Back to Exercises"
    />
  );
}
```

## What's Included

### Components
- **ConversationPage**: Full-featured conversation interface
- **MessageList**: Display conversation messages
- **MessageInput**: User input with send button
- **CoachPanel**: Collapsible coach feedback panel

### Hooks
- **useConversation()**: Manage conversation state and Socket.io connection

### Utilities
- **provideDownPatToken()**: Set auth token for Socket.io
- **clearDownPatToken()**: Clear auth token

## Styling

Import the default styles:

```tsx
import '@downpat/ui-components/styles';
```

Customize with CSS variables:

```css
:root {
  --downpat-primary: #3b82f6;
  --downpat-background: #ffffff;
  --downpat-text: #1f2937;
}
```

## Documentation

See the [main repository](https://github.com/robhunter/oss-DownPat) for full documentation.

## License

MIT
