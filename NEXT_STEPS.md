# Next Steps - Decision Checklist

## How to Use This Document

This checklist helps you make the critical decisions needed before implementation. Work through each section, make your decisions, and update this document with your choices.

---

## CRITICAL DECISIONS (Must Answer Before Starting)

### 1. Storage Architecture ✅ DECIDED

**Decision**: Create storage interface with Firebase as official/recommended implementation

- [x] **Selected**: Storage abstraction + Firebase implementation
  - Define interfaces in `@downpat-oss/core`
  - Implement in `@downpat-oss/firebase-storage` (recommended)
  - Allow community implementations for other databases

**Rationale**:
- Simple default path: Install firebase-storage, provide credentials, done
- Users get fresh Firebase DB (free), we handle all storage
- No burden of adding our schema to existing databases
- Future-proof: Allows alternatives without complicating default
- Better architecture: Clear contracts, testable, clean boundaries
- Minimal extra work (~5-10%) for significant benefits

**Impact**:
- Affects: All packages get clean storage abstraction
- Default users: Simple Firebase setup, no schema management
- Advanced users: Can implement storage interface for other DBs
- Architecture: Better separation of concerns, easier testing

---

### 2. Authentication Integration ✅ DECIDED

**Decision**: Token-based authentication with client/server provider pattern

- [x] **Selected**: Two-sided authentication pattern
  - **Client-side**: `ClientAuthProvider` provides opaque tokens
  - **Server-side**: `ServerAuthProvider` validates tokens and returns user data
  - Opaque tokens (host validates however they want - JWT, session, API key, etc.)

```typescript
// Client provides tokens
interface ClientAuthProvider {
  getToken(): Promise<string | null>
  onAuthChange(callback: (hasAuth: boolean) => void): () => void
}

// Server validates tokens and extracts user info
interface ServerAuthProvider {
  validateToken(token: string): Promise<User>
  getDemoUser(): User
}

// User model
interface User {
  userId: string
  displayName: string
  isAdmin: boolean
  isSubscriber: boolean
}
```

**Rationale**:
- **Security**: Tokens validated server-side, never trust client userId
- **Flexibility**: Opaque tokens work with any auth system (Firebase, Auth0, custom JWT, sessions)
- **Simple demo**: No token required for demo users
- **Token refresh**: Single retry pattern (validate → fail → get fresh token → retry)
- **Fresh validation**: No caching, validate on every request

**Access Control Rules**:
- **Conversation access**: Owner + admins can view
- **Start conversation**: Subscribers only (demo users bypass this check)
- **Admin UI**: Admins only
- **Exercise creation**: Admins only

**Impact**:
- Host apps implement both client and server auth providers
- Packages handle validation logic and access control
- Demo mode works without authentication
- See AUTH_INTEGRATION.md for complete implementation guide

---

### 3. "Schema Step" Clarification ✅ DECIDED

**Decision**: Drop ExtractTask (structured data extraction feature)

- [x] **Selected**: Drop ExtractTask and EXTRACT message type
  - **What it is**: Completion task that extracts structured data from conversations into custom schemas
  - **How it works**: AI fills in schema fields (e.g., Lean Canvas template) based on conversation
  - **Display**: Shows message with download button to get extracted data as PDF
  - **Schema format**: `Record<string, string>` with field names and descriptions

**What we're dropping**:
- `ExtractTask` class and all related code
- `MessageType.EXTRACT` message type
- `ExtractMessage` UI component
- PDF template system for extracted data
- Extract schema parsing/validation in exercise creation

**What we're keeping**:
- ✅ `responseSchema` for other tasks (ConversationTask, CommentaryTask, SummaryTask)
- ✅ Core conversation patterns remain unchanged
- ✅ All other task types and message types

**Rationale**:
- Specialized feature for specific use cases (e.g., Lean Canvas forms)
- Adds complexity with PDF templates and schema management
- Not core to basic conversational training functionality
- Can be added back as optional extension if needed

**Impact**: Simplifies task system, removes PDF generation dependency, cleaner core feature set

---

### 4. AI Provider Support ✅ DECIDED

**Decision**: Support OpenAI, Anthropic, and Google Gemini with dynamic provider availability

- [x] **Selected**: Three providers with optional configuration
  - **Include**: OpenAI, Anthropic (Claude), Google Gemini
  - **Drop**: Groq (users can add if needed via adapter interface)

**Key Requirement - Dynamic Provider Availability**:
```typescript
// Host app provides only the API keys they want to use
const config = {
  aiProviders: {
    openai: { apiKey: process.env.OPENAI_API_KEY },
    // anthropic not configured
    // gemini not configured
  }
}

// UI automatically shows only configured providers
// In exercise creation: Only OpenAI models appear in dropdown
// No requirement to provide keys for all providers
```

**Implementation**:
- Packages include adapters for all three providers
- Host app configures which providers to enable (via API keys)
- Exercise creation UI dynamically shows only configured providers
- Model selection dropdown filtered based on available providers
- No errors if providers are missing - just don't show them

**Examples**:
- **Host provides only OpenAI key**: Only GPT models in UI
- **Host provides OpenAI + Anthropic**: Both GPT and Claude models available
- **Host provides all three**: All models available

**Rationale**:
- Covers most use cases (OpenAI, Anthropic, Gemini are most popular)
- Flexible: Hosts choose their preferred provider(s)
- No lock-in: Can switch or add providers later
- Manageable maintenance burden
- Groq users can implement custom adapter if needed

**Impact**: Adapter interface, provider configuration system, dynamic UI filtering

---

### 5. Streaming & Real-time Transport ✅ DECIDED

**Decision**: Streaming required via Socket.io only

- [x] **Selected**: Option A - Require Socket.io for streaming
  - Streaming is essential for good UX with AI responses
  - Socket.io only (no SSE, no HTTP streaming alternatives in v1)
  - Socket.io has built-in fallbacks (long-polling) for environments where WebSockets are blocked

**Architecture - Express Integration with Controller Pattern**:

```typescript
// @downpat-oss/core (framework-agnostic controllers)
export class ConversationController {
  async continueConversation(conversationId, message, user) {
    // Business logic - no framework dependencies
  }
}

// @downpat-oss/express (thin HTTP wrapper)
export function createDownpatRouter(config) {
  const controller = new ConversationController(...);
  const router = express.Router();

  // REST endpoints
  router.post('/conversations/:id/messages', async (req, res) => {
    const user = await config.serverAuth.validateToken(req.headers.authorization);
    const result = await controller.continueConversation(...);
    res.json(result);
  });

  return { router, controller };
}

export function attachSocketIO(httpServer, config) {
  const io = new Server(httpServer);
  const controller = new ConversationController(...);

  io.on('connection', (socket) => {
    socket.on('continue-chat', async (data) => {
      // Stream AI responses via Socket.io
    });
  });

  return io;
}

// Host's server.js
const app = express();
const downpat = createDownpatRouter(config);
app.use('/api/downpat', downpat.router);

const server = app.listen(3000);
downpat.attachSocketIO(server); // Same server, same origin
```

**Framework Requirements**:
- **v1**: Requires Express (or Express-compatible framework)
- **Future**: Can add `@downpat-oss/nextjs`, `@downpat-oss/fastify` adapters
- **No refactoring needed**: Core controllers are framework-agnostic
- **Custom frameworks**: Advanced users can implement their own adapters

**Rationale**:
- **Same origin**: No CORS issues, simpler deployment
- **Socket.io benefits**: Bidirectional, auto-reconnect, built-in fallbacks
- **Single server**: Frontend and backend on same process/port
- **Matches current code**: Less migration work
- **Express widely used**: Acceptable requirement for v1
- **Extensible**: Controller pattern allows future framework adapters

**Impact**:
- Express dependency for v1
- Core packages use controller pattern (framework-agnostic)
- Express package is thin wrapper around controllers
- Future framework support via new adapter packages

---

### 6. Package Scope & Naming ✅ DECIDED

**Decision**: Use `@downpat/` scope

- [x] **Selected**: `@downpat/*` scope
  - Clean, professional naming
  - Matches branding
  - Requires npm organization ownership (create if needed)

**Package Names**:
- **Core**: `@downpat/core`
- **Express**: `@downpat/express`
- **Exercise Manager**: `@downpat/exercise-manager`
- **Conversation Engine**: `@downpat/conversation-engine`
- **Firebase Storage**: `@downpat/firebase-storage`
- **UI Components**: `@downpat/ui-components`
- **Admin UI**: `@downpat/admin-ui`

**Prerequisites**:
- Create/own npm organization: `@downpat`
- Register organization on npmjs.com if not already owned

**Rationale**:
- Clean, short package names
- Professional branding
- Consistent with project name
- Clear ownership

**Impact**: All packages published under `@downpat` scope

---

## HIGH PRIORITY DECISIONS

### 7. Exercise Manager Architecture ✅ RESOLVED

**Decision**: Not needed as separate package - logic lives in core controllers

- [x] **Backend only** (via ExerciseController in `@downpat/core`)
  - ExerciseController contains all business logic (framework-agnostic)
  - Express package provides HTTP routes (thin wrapper)
  - Admin UI provides React components (forms/dashboard)

**Rationale**: Controller pattern (from streaming decision) already handles this. No need for separate `exercise-manager` or `conversation-engine` packages.

**Package Structure Updated**:
```
@downpat/
├── core          # ExerciseController + ConversationController (business logic)
├── express       # HTTP routes + Socket.io (thin wrapper)
├── admin-ui      # Admin dashboard React components
```

**Status**: Resolved by controller pattern decision

---

### 8. UI Component Approach ✅ DECIDED

**Decision**: Styled components pre-styled with TailwindCSS

- [x] **Styled components**: Pre-styled with TailwindCSS (easy to use)
  - Components come with built-in styles using Tailwind classes
  - Users can customize via CSS variables for color schemes
  - TailwindCSS is a peer dependency (users must install)
  - Dark mode support via CSS variables

**TailwindCSS requirement**:
- [x] **Peer dependency** (required - users must install TailwindCSS)
  - Host app includes TailwindCSS
  - Our components use Tailwind utility classes
  - No bundled CSS to avoid conflicts

**Radix UI dependency**:
- [x] **Don't use Radix** (keep dependencies minimal)
  - Current codebase uses 19 Radix packages
  - Only Avatar and Slot components used in core conversation UI
  - **Avatar replacement**: Simple div showing user initials (no email/gravatar)
  - **Slot**: Not needed - use standard composition patterns

**Critical Requirement - Color Customization**:
```css
/* Host app provides CSS variables for theming */
:root {
  --downpat-primary: #3b82f6;
  --downpat-background: #ffffff;
  --downpat-text: #1f2937;
  /* etc. */
}

[data-theme="dark"] {
  --downpat-background: #1f2937;
  --downpat-text: #f9fafb;
  /* etc. */
}
```

**Rationale**:
- **Easiest to use**: Users get working UI out of the box
- **Customizable**: CSS variables allow color scheme changes without forking components
- **Minimal deps**: No Radix reduces bundle size and complexity
- **Tailwind peer dep**: Avoids version conflicts, lets host control Tailwind config
- **Simple Avatar**: Initials in colored circle, no external services needed

**Impact**:
- TailwindCSS required in host app
- No Radix UI dependencies
- Provide default color scheme + CSS variable documentation
- Simple Avatar component showing user initials

---

### 9. Theming System ✅ DECIDED

**Decision**: Ship default theme + theme generator utility

- [x] **Default theme**: Complete theme using Tailwind color palette (works out of the box)
- [x] **Theme generator utility**: Helper function to generate full themes from 3-5 base colors
- [x] **CSS variable override**: Advanced users can manually override any variables

**Implementation**:

```typescript
// Default theme ships with @downpat/ui-components
// Uses Tailwind's blue palette as default
:root {
  --downpat-primary-50: #eff6ff;
  --downpat-primary-500: #3b82f6;
  --downpat-primary-900: #1e3a8a;
  /* ... complete set of variables */
}

// Theme generator utility (in @downpat/core or separate @downpat/theme-generator)
import { generateTheme } from '@downpat/core';

const customTheme = generateTheme({
  primary: '#8b5cf6',      // Brand purple
  secondary: '#06b6d4',    // Brand cyan
  success: '#10b981',      // Optional
  danger: '#ef4444',       // Optional
  neutral: '#6b7280'       // Optional
});

// Apply theme (returns CSS variable declarations)
// Host app includes in their CSS or applies via JavaScript
```

**Customization Levels**:

1. **No customization**: Use default theme (blue) - zero config
2. **Basic branding**: Use theme generator with 2-3 brand colors - simple
3. **Full control**: Manually override any/all CSS variables - advanced

**Documentation needed**:
- Default theme color reference
- Theme generator API documentation
- Examples of each customization level
- Dark mode implementation guide

**Rationale**:
- **Easy default**: Works immediately with good-looking blue theme
- **Easy customization**: Generate brand-matched theme with 3-5 colors
- **Advanced control**: Override individual variables if needed
- **Manageable maintenance**: One generator to maintain vs complex factory

**Impact**:
- Include theme generator in core package (or separate optional package)
- Document all CSS variables in README
- Provide theme generator examples
- Show dark mode implementation pattern

---

### 10. Demo Link Generation ✅ DECIDED - DEFERRED

**Decision**: Deferred from initial release

- [x] **Deferred**: Demo link functionality is not critical for initial milestone
  - Can be added in a future release
  - Focus on core exercise and conversation functionality first

**Rationale**: Simplify initial release scope. Demo links can be added later if needed.

**Previous decision (for future reference)**: Backend only approach was planned - server generates links via admin-only endpoint

---

## MEDIUM PRIORITY DECISIONS

### 11. Message Types ✅ DECIDED

**Decision**: Keep core types + SIMPLE + optional MODERATION

Current types: CONTEXT, MODERATION, STARTER, USER, CONVERSATION, COMMENTARY, EXTRACT, SIMPLE, SIMULATE, SUMMARY

**Final message types to include**:

- [x] **Core types** (required):
  - USER - User messages
  - CONVERSATION - AI conversational responses
  - COMMENTARY - AI coaching/feedback
  - SUMMARY - End-of-conversation summaries
  - CONTEXT - Background information
  - STARTER - Initial conversation prompts

- [x] **SIMPLE** (required):
  - Simple AI responses for "Talk to Coach" feature
  - Used by talkToCoachEnabled sidebar chat
  - Validated in conversation service (SIMPLE + USER only for coach chat)

- [x] **MODERATION** (toggleable):
  - Content moderation warnings
  - Toggleable feature (enabled/disabled globally via admin panel)
  - Hardcoded to use OpenAI moderation API
  - **Must implement in v1**: Admin UI toggle for global moderation setting

**Dropped types**:
- [x] Drop EXTRACT (structured data extraction - decided with ExtractTask)
- [x] Drop SIMULATE (AI-generated simulated user messages - not needed for v1)

**Rationale**:
- **SIMPLE required**: Essential for "Talk to Coach" feature we're keeping
- **MODERATION toggleable**: Safety feature for public-facing apps, enabled/disabled per organization
- **SIMULATE dropped**: Specialized feature, can be added later if needed

**Impact**:
- Message type handling for 8 types total
- Admin panel needs moderation toggle (new UI work)
- Moderation configuration tied to OpenAI API key availability
- Talk to Coach validates SIMPLE + USER message types only

---

### 12. Exercise Versioning ✅ DECIDED

**Decision**: Simplified draft/published versioning (two versions max)

- [x] **Simplified versioning**: Draft and Published only (replacing complex multi-version system)
  - Two separate exercise documents (draft + published)
  - No arbitrary version names
  - No version history array

**Data Structure:**
```typescript
// Simplified from current system
ExerciseMetadata {
  draft: string       // Exercise ID of draft version (always editable)
  published?: string  // Exercise ID of published version (optional, read-only)
}

// Remove these:
// ❌ latest: string
// ❌ versions: ExerciseVersion[]
// ❌ arbitrary version names
```

**Core Operations:**
1. **Create**: Only draft exists (`published` is null)
2. **Edit**: Admin can only edit draft (never published directly)
3. **Publish**: Copy draft document → published document
4. **Restore from published**: Copy published → draft (with warning if draft has unsaved changes)
5. **Republish**: Copy draft → published (overwrites previous published)

**Implementation Changes:**

**Models & Helpers:**
- Update `ExerciseMetadata`: Change `latest` → `draft`, remove `versions[]`
- Simplify `ExerciseMetadataHelper`: Remove version array logic
- Remove or simplify `ExerciseVersion` model

**Store Layer (exercise-store.ts):**
- ✅ `createExercise()`: Already only creates draft - just rename field
- ✅ `getExercisesByOrganization()`: Already uses `.latest` - rename to `.draft`
- 🔄 `publishExercise()`: Modify to copy draft → published
- ❌ `createExerciseVersion()`: **Remove entirely** (no longer needed)
- ➕ `restoreFromPublished()`: **New method** - copy published → draft

**Service Layer:**
- Remove arbitrary version parameter support
- Simplify to draft vs published toggle only

**Admin UI:**
- ❌ Remove version creation interface (no more arbitrary versions)
- ➕ Add "Restore from Published" button (with warning for unsaved changes)
- 🔄 Simplify version selector: Draft/Published toggle instead of dropdown
- 🔄 Simplify publish flow: Just "Publish Draft" button

**Migration:**
- No migration needed (fresh deployment)

**Rationale:**
- **Problem solved**: Can edit draft without affecting live published exercise
- **Simpler**: Only two states (draft, published) vs unlimited versions
- **No complexity**: No version naming, no unbounded arrays, no arbitrary version selection
- **Current system issues**: Complex version management was source of bugs
- **Two documents**: Clean separation, draft edits never affect published

**Impact:**
- Significant code simplification (remove ~100+ lines of version management)
- Simpler admin UI (remove version creation, simplify selectors)
- Better UX (clear draft/published mental model vs arbitrary versions)
- Estimated implementation: 8-12 hours total

---

### 13. Exercise Examples ✅ DECIDED

**Decision**: Drop examples for v1

- [x] **Drop examples entirely** - Can be added in v2 if needed
  - Remove Example model
  - Remove ExampleStore
  - Remove example UI components
  - Admins provide good guidelines/prompts instead

**Rationale**:
- **Simplifies v1**: Fewer models, stores, and UI components to build
- **Not blocking**: Exercises work fine without examples via good guidelines
- **Few-shot learning**: Can be achieved through well-written prompts in tasks
- **Can add later**: If users request it, examples can be added in v2 without breaking changes

**What we're dropping**:
- Example model and validation
- ExampleStore (Firestore collection)
- Example creation/editing UI in admin panel
- Example display in exercise preview
- Example-based few-shot learning (AI context from examples)

**Impact**:
- Removes ~5-10 files from implementation
- Simpler admin UI (no example management)
- Admins focus on writing clear guidelines and task prompts
- Reduces initial scope and development time

---

### 14. Content Moderation ✅ DECIDED

**Decision**: Toggleable feature with global on/off switch (must implement in v1)

- [x] **Toggleable moderation** - Enabled/disabled globally per organization
  - Global toggle in admin panel (organization-level setting)
  - Hardcoded to use OpenAI moderation API (no pluggable interface)
  - When enabled, checks user messages for policy violations
  - Returns MODERATION message type with warnings/blocks
  - **Must be implemented in v1** (not optional to skip)

**Implementation:**
- Include OpenAI moderation adapter in core packages
- Default: Disabled (organizations enable as needed)
- Admin UI: Global toggle to enable/disable moderation
- Configuration: Requires OpenAI API key (in addition to chat model keys)
- Behavior: When enabled, all user messages checked before processing
- No pluggable interface - always uses OpenAI moderation API

**Rationale:**
- **Safety feature**: Essential for public-facing applications
- **Toggleable**: Not all use cases need moderation (internal training, controlled environments)
- **Simple implementation**: Hardcoded to OpenAI (no adapter interface complexity)
- **Must ship in v1**: Core safety feature, not deferrable
- **Consistent with Q11**: Aligns with MODERATION message type decision

**Impact:**
- Implement OpenAI moderation adapter (required in v1)
- Add admin UI toggle (new work, required in v1)
- Document OpenAI moderation API requirement
- Default disabled but must be available to toggle on

---

### 15. Rate Limiting ✅ DECIDED

**Decision**: No built-in rate limiting for v1

- [x] **No rate limiting** - Rely on API provider limits and budgets
  - Not implementing custom rate limiting in packages
  - Users rely on API provider controls (OpenAI, Anthropic, Gemini)
  - Can be added in v2 if users request it

**Rationale:**
- **API provider limits**: OpenAI, Anthropic, and Gemini all have built-in rate limits and budget controls
- **Infrastructure concern**: Better handled at API gateway or cloud provider level
- **Complexity vs value**: Custom rate limiting adds significant complexity for minimal benefit
- **User control**: API keys already have budget limits and usage alerts
- **Simplifies v1**: One less system to build and maintain

**What users can do for rate limiting:**
- Set budget limits on their API provider accounts
- Use API gateway rate limiting (if needed)
- Monitor usage via provider dashboards
- Set up alerts for high usage

**Impact:**
- No rate limiting code in packages
- Documentation recommends API provider budget controls
- Simpler implementation, faster development

---

## LOWER PRIORITY DECISIONS

### 16. Example App Framework

- [x] **Vanilla Node.js + Express + React** (simplest, clearest example)
  - Backend: Express server
  - Frontend: React with simple build setup (create-react-app or similar)
  - No meta-frameworks (Next.js, Remix, etc.)
  - No complex build tools beyond what React needs

**Your Decision**: Vanilla Node.js + Express + React (keep it simple)

---

### 17. Testing Tools ✅ DECIDED

**Decision**: Vitest + Testing Library for all packages

- [x] **Vitest + Testing Library** - Modern, fast, great DX
  - Vitest for unit/integration tests
  - React Testing Library for component tests
  - Compatible with Jest APIs (easy migration from legacy code)
  - Native ESM support, faster execution
  - Better watch mode and developer experience

**E2E Testing**:
- **Playwright** (recommended for example app if needed)
- Can be added later based on need

**Rationale:**
- **Modern standard**: Vitest is the current standard for new TypeScript projects
- **Performance**: Significantly faster than Jest, especially in watch mode
- **Better DX**: Clearer error messages, better HMR integration
- **Jest compatible**: Can reuse Jest patterns and expectations
- **TypeScript-first**: Built with TypeScript in mind

**Impact:**
- All packages use Vitest for testing
- Test configuration simpler than Jest
- Faster CI/CD builds
- Better local development experience

---

### 18. Documentation Platform ✅ DECIDED

**Decision**: README files only for v1

- [x] **README files only** - Comprehensive package documentation
  - Each package gets detailed README with examples
  - API documentation via TSDoc comments
  - Lives with code (easier to maintain and keep in sync)
  - Can add dedicated docs site in v2 if needed

**What each README should include:**
- Installation instructions
- Quick start guide
- API reference
- Usage examples
- Configuration options
- Troubleshooting

**Project-level documentation:**
- Root README with overall architecture
- AUTH_INTEGRATION.md (authentication guide)
- Individual package READMEs for specifics

**Rationale:**
- **Simpler for v1**: No docs infrastructure to build/maintain
- **Lives with code**: Documentation stays in sync with implementation
- **Developer-friendly**: Developers expect good README files
- **Sufficient for launch**: Can add docs site later if project grows
- **Lower maintenance**: No separate docs deployment pipeline

**Impact:**
- Focus on writing excellent README files
- Use TSDoc for inline API documentation
- No docs site infrastructure needed
- Can add Docusaurus/VitePress in v2 if adoption warrants it

---

### 19. Component Styling Dependencies ✅ CONSOLIDATED

**Status**: This is a duplicate of Question 8 (UI Component Approach)

See Question 8 for decision on TailwindCSS and Radix UI dependencies.

---

### 20. License ✅ DECIDED

**Decision**: MIT License

- [x] **MIT** - Most permissive, maximizes adoption
  - Simple and widely understood
  - No restrictions on commercial use
  - Compatible with all other licenses
  - Standard choice for developer tools and libraries

**Rationale:**
- **Maximum adoption**: No restrictions discourage potential users
- **Commercial-friendly**: Companies can use without legal concerns
- **Simple**: Easy to understand, no complex requirements
- **Standard**: Most npm packages use MIT
- **Trust**: Well-established and trusted by developers

**License text:**
```
MIT License

Copyright (c) [year] [copyright holder]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

[standard MIT license text]
```

**Impact:**
- Add LICENSE file to root and all packages
- Include license header in package.json files
- Note license in all README files

---

## ADDITIONAL CONSIDERATIONS

### Features to Definitely Drop

Confirm these should be dropped:
- [ ] All payment/Stripe integration ✓
- [ ] Mobile support (SmartBanner, etc.) ✓
- [ ] Multi-tenant subdomain system ✓
- [ ] Email notifications ✓
- [ ] Waitlist management ✓
- [ ] Team management ✓
- [ ] Live chat coaching ✓
- [ ] Job listings ✓
- [ ] File uploads ✓
- [ ] Feedback system ✓

### Single Organization Assumption

Confirm understanding:
- [ ] Each host application = one organization ✓
- [ ] No subdomain routing ✓
- [ ] Simpler organization model ✓
- [ ] Host app handles any multi-tenancy needs ✓

### Testing Requirements

Confirm testing approach:
- [ ] Unit tests for packages (80%+ coverage)
- [ ] Integration tests for example app
- [ ] E2E tests for critical flows
- [ ] Component tests for UI packages
- [ ] Document testing best practices

---

## REMAINING DECISIONS SUMMARY

### ✅ ALL DECISIONS COMPLETE! (19/19 questions)

1. Storage Architecture
2. Authentication Integration
3. "Schema Step" Clarification
4. AI Provider Support
5. Streaming & Real-time Transport
6. Package Scope & Naming
7. Exercise Manager Architecture (resolved by controller pattern)
8. UI Component Approach (styled components with Tailwind + CSS variables)
9. Theming System (default theme + generator utility)
10. Demo Link Generation (deferred from initial release)
11. Message Types (keep core + SIMPLE + toggleable MODERATION, drop SIMULATE)
12. Exercise Versioning (simplified draft/published only)
13. Exercise Examples (drop for v1)
14. Content Moderation (toggleable with global toggle, must implement in v1)
15. Rate Limiting (no built-in rate limiting, rely on API provider limits)
16. Example App Framework (Vanilla Node.js + Express + React)
17. Testing Tools (Vitest + Testing Library)
18. Documentation Platform (README files only for v1)
19. Component Styling Dependencies (consolidated with Q8)
20. License (MIT)

**🎉 All critical, high, medium, and lower priority questions are complete!**

---

## ONCE DECISIONS ARE MADE

### Next Actions

1. **Review Decisions**
   - [ ] Review all decisions above
   - [ ] Ensure consistency across choices
   - [ ] Document rationale for key decisions

2. **Update Spec**
   - [ ] Update spec.md with final decisions
   - [ ] Remove answered questions
   - [ ] Add any new questions that arose

3. **Create Implementation Plan**
   - [ ] Define package structure based on decisions
   - [ ] Plan extraction order
   - [ ] Identify dependencies between packages
   - [ ] Create detailed Phase 1 plan

4. **Set Up Repository**
   - [ ] Create GitHub repository
   - [ ] Set up monorepo structure (NX, Turborepo, or npm workspaces?)
   - [ ] Configure TypeScript
   - [ ] Set up linting/formatting
   - [ ] Configure CI/CD

5. **Begin Implementation**
   - [ ] Start with Phase 1: Core package
   - [ ] Extract and refactor code
   - [ ] Write tests as you go
   - [ ] Document APIs

---

## DECISION SUMMARY

Once you've made your decisions, fill out this summary:

### Core Architecture
- **Storage**: Storage abstraction with Firebase as official implementation ✅
- **Auth Pattern**: Token-based (client provides tokens, server validates) ✅
- **Streaming**: Socket.io required, Express integration ✅
- **AI Providers**: OpenAI, Anthropic, Gemini (dynamic availability) ✅

### Package Scope
- **Scope**: `@downpat/` ✅
- **Core Package Name**: `@downpat/core` ✅
- **All Packages**: `@downpat/core`, `@downpat/express`, `@downpat/firebase-storage`, `@downpat/ui-components`, `@downpat/admin-ui`

### Features
- **Task System**: Drop ExtractTask, keep all other tasks ✅
- **Message Types**: Keep core + SIMPLE + MODERATION (toggleable), drop EXTRACT + SIMULATE ✅
- **Versioning**: Simplified draft/published only (two documents, no version history) ✅
- **Examples**: Drop for v1 (can add in v2 if requested) ✅
- **Moderation**: Toggleable (global on/off via admin panel, hardcoded to OpenAI, must implement in v1) ✅

### UI Approach
- **Component Style**: Styled components pre-styled with TailwindCSS ✅
- **Theming**: Default theme + generator utility (3-5 colors → full theme) ✅
- **TailwindCSS**: Peer dependency (required) ✅
- **Radix UI**: Not using (replace Avatar with initials, skip other Radix components) ✅
- **Dark Mode**: Supported via CSS variables ✅

### Example App
- **Framework**: Vanilla Node.js + Express (backend) + React (frontend)
- **Auth Provider**: _____________________

### Testing & Tools
- **Test Framework**: Vitest + Testing Library ✅
- **E2E Tool**: Playwright (recommended for example app if needed) ✅
- **Docs Platform**: README files only for v1 ✅

### Legal
- **License**: MIT ✅

---

## Ready to Implement?

Once all critical decisions are made:

1. Share your decisions
2. I (or another agent) can create detailed implementation plan
3. Set up repository structure
4. Begin code extraction and refactoring

---

**Questions or need clarification on any decision?** Just ask!
