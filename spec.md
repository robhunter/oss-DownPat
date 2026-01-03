# DownPat Open Source Migration Specification

## Executive Summary

This specification outlines the plan to extract core functionality from the DownPat legacy codebase and release it as open-source npm packages. The goal is to create reusable packages for:
- Exercise/prompt creation and management
- AI-powered conversational interactions with multiple conversation patterns
- Admin interface for exercise management
- User-facing conversation UI components

The extracted functionality will be packaged as npm packages with an example application demonstrating integration.

---

## Table of Contents

1. [Background](#background)
2. [Scope](#scope)
3. [Architecture Overview](#architecture-overview)
4. [Key Questions to Address](#key-questions-to-address)
5. [Proposed Package Structure](#proposed-package-structure)
6. [Implementation Phases](#implementation-phases)
7. [Testing Strategy](#testing-strategy)
8. [Documentation Requirements](#documentation-requirements)

---

## Background

### About DownPat

DownPat was a platform that hosted educational prompts based on books and other materials from non-fiction experts. Key features included:

- **Exercise Creation**: Experts could create AI-powered conversational exercises with various patterns (one-on-one, with commentary, with summaries)
- **Multi-tenant Architecture**: Each expert had a custom subdomain with branded theming
- **Payment Integration**: Stripe-based subscriptions
- **Conversation Management**: Users could interact with exercises, with conversations stored in Firebase
- **Admin Interface**: Exercise creation, demo link generation, organization management
- **Real-time Interaction**: Socket.io-based streaming AI responses

### Current Tech Stack

**Backend:**
- Node.js 22.x + Express.js
- Firebase Admin SDK (Auth, Firestore)
- Socket.io
- Multiple LLM providers (Anthropic, OpenAI, Google Gemini, Groq)

**Frontend:**
- React 18 + Vite
- TypeScript
- TailwindCSS + Radix UI
- React Query
- Firebase Client SDK

**Shared:**
- NX Monorepo
- Zod validation
- Multi-tenant theming system

---

## Scope

### In Scope

1. **Exercise Creation & Management**
   - Exercise definition (tasks, guidelines, starters, welcome messages)
   - Exercise versioning
   - Exercise metadata management
   - Starter message configuration

2. **Conversation Patterns**
   - One-on-one conversations (ConversationTask)
   - Conversations with commentary (CommentaryTask)
   - Conversations with summaries (SummaryTask)
   - Extract tasks
   - Simulate tasks

3. **Anonymous/Unauthenticated Access**
   - Demo link functionality
   - Public conversation access
   - Message limits for anonymous users

4. **Admin Interface**
   - Exercise creation UI
   - Exercise editing UI
   - Starter message management
   - Demo link generation

5. **User-facing Conversation UI**
   - Message display components
   - Chat interface
   - Message actions (rate, regenerate, report)
   - Message type rendering (user, conversation, commentary, summary, etc.)

6. **AI Integration**
   - Adapter interface for LLM providers
   - Support for multiple AI providers
   - Structured response handling
   - Streaming responses

7. **Firebase Integration**
   - Conversation storage
   - Exercise storage
   - Demo link storage
   - Basic authentication hooks

8. **Theming/Styling**
   - Customizable conversation UI styling
   - Theme provider pattern
   - CSS variable-based theming

### Out of Scope (To Be Dropped)

1. **Payment Processing**
   - Stripe integration
   - Subscription management
   - Payment stores
   - Subscription-related UI

2. **Mobile Support**
   - SmartBanner components
   - Mobile-specific code
   - React Native dependencies

3. **Multi-tenant Subdomain System**
   - Subdomain parsing and routing
   - Organization-specific subdomains
   - Multiple organization management
   - Assumption: Single organization per host application

4. **ExtractTask/Schema Extraction** ✅ DECIDED TO DROP
   - ExtractTask class and MessageType.EXTRACT
   - Structured data extraction to custom schemas
   - PDF download of extracted data
   - Note: `responseSchema` for other tasks (Conversation, Commentary, Summary) is KEPT

5. **Additional Features**
   - Waitlist management
   - Team management
   - Job listings
   - Live chat coaching
   - Email notifications
   - Organization file uploads
   - Feedback system
   - Creator onboarding

---

## Architecture Overview

### Current Legacy Architecture

```
.DownPatNode/
├── apps/
│   ├── server/          # Express backend
│   └── web/             # React frontend
└── libs/
    ├── shared/          # Models, constants, validations, themes
    └── ui/              # Reusable UI components
```

### Package Architecture

```
@downpat/
├── core/                # Types, constants, controllers (framework-agnostic)
├── exercise-manager/    # Exercise creation and management logic
├── conversation-engine/ # Conversation logic, AI adapters, message handling
├── firebase-storage/    # Firebase integration layer (recommended)
├── express/             # Express integration (HTTP routes + Socket.io)
├── ui-components/       # React UI components for conversations
├── admin-ui/            # React UI components for admin interface
└── example-app/         # Example Node.js + Express + React app showing integration
```

**Note**: All 6 critical architectural decisions are now complete. Package structure is finalized.

---

## Key Questions to Address

### 1. Package Boundaries & Dependencies

#### Q1.1: Core Package Design
- **Question**: What should be included in the `@downpat/core` package?
- **Context**: Need to determine minimal shared types, constants, and utilities
- **Options**:
  - A) Minimal: Only TypeScript interfaces/types (Exercise, Conversation, Message, Task)
  - B) Moderate: Types + constants (MessageType, SupportedModels) + basic utilities
  - C) Comprehensive: All shared code from libs/shared
- **Dependencies**: All other packages will depend on this
- **Recommendation Needed**: Which approach balances reusability vs. package bloat?

#### Q1.2: Exercise Manager Package Scope
- **Question**: Should `@downpat/exercise-manager` be backend-only, frontend-only, or isomorphic?
- **Context**: Currently exercise logic spans server services, stores, and frontend APIs
- **Options**:
  - A) Backend-only: Exercise CRUD operations, versioning logic (requires separate frontend package)
  - B) Isomorphic: Exercise business logic that works on both client and server
  - C) Split: `exercise-manager` (isomorphic) + `exercise-api` (backend) + `exercise-client` (frontend)
- **Considerations**:
  - How much logic can/should be shared between client and server?
  - Do we need server-side validation separate from client-side?
  - Should exercise creation happen client-side or server-side?

#### Q1.3: Conversation Engine Architecture
- **Question**: How should the conversation engine be structured regarding AI provider adapters?
- **Context**: Current code has adapters for OpenAI, Anthropic, Gemini, Groq
- **Options**:
  - A) Include all adapters in one package
  - B) Core conversation engine + separate adapter packages (plugin architecture)
  - C) Conversation engine with "bring your own adapter" interface
- **Considerations**:
  - Bundle size for users who only need one provider
  - Maintenance burden of supporting all providers
  - Should we support all current providers or just OpenAI/Anthropic?

#### Q1.4: Firebase Coupling
- **Question**: Should Firebase be a hard requirement or an optional storage backend?
- **Context**: User said "okay to require Firebase" but we should verify this is the best approach
- **Decision**: ✅ **Storage abstraction with Firebase as the official/recommended implementation**
  - Create storage interfaces in `@downpat/core`
  - Implement Firebase storage in `@downpat/firebase-storage` (recommended package)
  - Allow community/users to implement other backends if needed
- **Rationale**:
  - **Default path is simple**: Most users install firebase-storage, provide credentials, done
  - **Fresh Firebase DB**: Users get free Firebase credentials, we handle all storage
  - **No DB migration burden**: Users don't add our data to their existing databases
  - **Future-proof**: Interface allows PostgreSQL/MongoDB implementations later if needed
  - **Better architecture**: Clear contracts, easier testing, clean boundaries
  - **Minimal extra work**: ~5-10% more effort for significant architectural benefits
- **User's reasoning**:
  - Most users won't have Firebase already
  - If users have existing DBs, adding our schema is too burdensome
  - Better to provide fresh Firebase credentials and we handle everything
  - Storage abstraction allows flexibility without complicating the default path

#### Q1.5: UI Component Package Structure
- **Question**: How should UI components be organized?
- **Context**: Current codebase has libs/ui (generic components) and app-specific components
- **Options**:
  - A) Single `@downpat/ui` package with all components
  - B) Split: `@downpat/ui-primitives` (generic) + `@downpat/conversation-ui` (domain-specific)
  - C) Three packages: primitives, conversation-ui, admin-ui
- **Considerations**:
  - Users may want conversation UI without admin UI
  - Should we bring Radix UI components or require users to install?
  - What about TailwindCSS dependency?

### 2. Authentication & Authorization

#### Q2.1: Authentication Interface Design ✅ DECIDED
- **Decision**: Token-based authentication with client/server provider pattern
- **Selected**: Option A (Auth interface/contract that host app implements)
- **Implementation**:
  ```typescript
  // Client-side: Provides opaque auth tokens
  interface ClientAuthProvider {
    getToken(): Promise<string | null>
    onAuthChange(callback: (hasAuth: boolean) => void): () => void
  }

  // Server-side: Validates tokens and returns user data
  interface ServerAuthProvider {
    validateToken(token: string): Promise<User>
    getDemoUser(): User
  }

  // User model
  interface User {
    userId: string        // Unique identifier
    displayName: string   // Display name for UI
    isAdmin: boolean      // Can access admin interface, view all conversations
    isSubscriber: boolean // Can start new conversations
  }
  ```
- **Key Decisions**:
  - **Opaque tokens**: Works with JWT, session tokens, API keys, Firebase tokens, etc.
  - **Server-side validation**: Never trust client userId, always validate server-side
  - **Token refresh**: Single retry pattern (validate → fail → get fresh token → retry)
  - **No caching**: Fresh validation on every request
  - **Demo mode**: No token required, uses shared "demo-user" ID
- **Rationale**: Security (server validates), flexibility (any auth system), simplicity (clear interfaces)
- **See**: AUTH_INTEGRATION.md for complete implementation guide

#### Q2.2: Authorization Model ✅ DECIDED
- **Decision**: Simple role-based access control via User model
- **Access Control Rules**:
  - **Conversation access**: Owner + admins can view (packages enforce via userId check)
  - **Start conversation**: Subscribers only (`isSubscriber: true`), demo users bypass this check
  - **Admin UI**: Admins only (`isAdmin: true`)
  - **Exercise creation**: Admins only (`isAdmin: true`)
  - **Exercise viewing**: All authenticated users can view exercises
- **Implementation**: Packages handle access control checks using User properties
- **Flexibility**: Host apps control roles by setting `isAdmin` and `isSubscriber` in `validateToken()`
- **Rationale**: Simple, secure, sufficient for most use cases

#### Q2.3: Demo/Anonymous Access ✅ DECIDED
- **Decision**: Simplified demo mode with shared demo user
- **Implementation**:
  - No authentication token required for demo users
  - Shared userId: "demo-user"
  - Demo conversations ARE stored in database (for quality control)
  - Demo users marked with `isAdmin: false` and `isSubscriber: false`
  - Demo users bypass subscription checks (can start conversations)
  - Demo users can only access their own conversations (not other demos)
- **Demo Link Generation**:
  - Simple approach: Just a demo code/link
  - No usage tracking or limits in v1 (can be added later)
  - Host app can generate demo links as needed
- **Rationale**: Simplicity, security (conversations stored for review), flexibility (host controls demo access)

### 3. Exercise & Conversation Features

#### Q3.1: Task/Schema System ✅ DECIDED
- **Decision**: Drop ExtractTask, keep all other tasks with their responseSchema
- **Selected**: Option B (Drop only specialized schema-based completion tasks)
- **What ExtractTask is**:
  - Completion task that extracts structured data from conversations into custom schemas
  - AI fills in schema fields (e.g., `{problemStatement: string, solution: string, ...}`)
  - Displays message with download button to export data as PDF
  - Used for specialized templates (e.g., Lean Canvas forms)
  - Constructor: `new ExtractTask(role: string, schema: Record<string, string>)`
- **What we're dropping**:
  - `ExtractTask` class (`.DownPatNode/libs/shared/src/lib/models/tasks/extract-task.ts`)
  - `MessageType.EXTRACT` message type
  - `ExtractMessage` UI component with PDF download
  - PDF template system for extracted schemas
  - Extract schema parsing in exercise creation form
- **What we're keeping**:
  - ✅ `responseSchema` for other tasks (ConversationTask, CommentaryTask, SummaryTask)
  - ✅ All core conversation patterns unchanged
  - ✅ ConversationTask, CommentaryTask, SummaryTask, SimulateTask
- **Rationale**: ExtractTask is specialized for specific use cases, adds PDF dependency, not core to conversational training

#### Q3.2: Message Types ✅ PARTIALLY DECIDED
- **Context**: Current system has: CONTEXT, MODERATION, STARTER, USER, CONVERSATION, COMMENTARY, EXTRACT, SIMPLE, SIMULATE, SUMMARY
- **Decided**: Drop EXTRACT message type (goes with ExtractTask decision above)
- **Still to decide**:
  - Keep MODERATION? (content moderation feature)
  - Keep SIMPLE? (simple AI responses without structure)
  - Keep SIMULATE? (AI-generated simulated user messages)
  - Simplify to fewer core types?

#### Q3.3: Exercise Versioning ✅ DECIDED
- **Decision**: Simplified draft/published versioning (two versions max)
- **Selected**: Custom option - Draft/Published only (simpler than current system)
- **Implementation**:
  - Two exercise documents: draft (always editable) + published (read-only)
  - No version history, no arbitrary version names
  - Operations: Create (draft only), Edit (draft only), Publish (copy draft→published), Restore (copy published→draft with warning)
- **Rationale**: Solves the core problem (edit without affecting live exercise) without the complexity of unlimited versions
- **Impact**: Significant code simplification, clearer mental model for users

#### Q3.4: Exercise Examples ✅ DECIDED
- **Decision**: Drop examples for v1
- **Selected**: Option C - Drop examples entirely
- **Rationale**:
  - Simplifies v1 implementation (fewer models, stores, UI components)
  - Not blocking - exercises work fine with good guidelines/prompts
  - Few-shot learning can be achieved through well-written task prompts
  - Can be added in v2 if users request it
- **Impact**: Removes Example model, ExampleStore, and example management UI (~5-10 files)

### 4. AI Integration

#### Q4.1: Which AI Providers? ✅ DECIDED
- **Decision**: Support OpenAI, Anthropic, and Google Gemini with dynamic provider availability
- **Selected**: Option A (modified) - Three providers with flexible configuration
- **Included Providers**:
  - ✅ OpenAI (GPT models)
  - ✅ Anthropic (Claude models)
  - ✅ Google Gemini
  - ❌ Groq (dropped - users can implement via adapter interface if needed)
- **Key Requirement**: Dynamic provider availability based on configured API keys
  - Host apps configure only the providers they want to use
  - UI dynamically shows only configured providers in exercise creation
  - Model selection dropdown filtered to available providers
  - **No requirement to provide keys for all three providers**
- **Implementation**:
  ```typescript
  // Example: Host only provides OpenAI key
  const config = {
    aiProviders: {
      openai: { apiKey: process.env.OPENAI_API_KEY }
      // anthropic and gemini not configured
    }
  }
  // Result: Only OpenAI models appear in exercise creation UI
  ```
- **Rationale**: Covers most use cases, flexible, no lock-in, manageable maintenance

#### Q4.2: Streaming vs Non-Streaming ✅ DECIDED
- **Decision**: Streaming required (Option A)
- **Rationale**:
  - Essential for good UX with AI responses
  - Real-time feedback as AI generates text
  - Matches current implementation
  - Users expect streaming for modern AI chat interfaces
- **Implementation**: All AI responses stream via Socket.io callbacks

#### Q4.3: Socket.io Dependency ✅ DECIDED
- **Decision**: Require Socket.io (Option A)
- **Selected**: Socket.io only, no SSE or HTTP streaming alternatives in v1
- **Architecture**: Express integration with controller pattern
  - **Core packages**: Framework-agnostic controllers (no Express dependencies)
  - **Express package**: Thin wrapper providing HTTP routes + Socket.io integration
  - **Integration**: Host adds router to existing Express server, attaches Socket.io to same HTTP server
  - **Same origin**: Single server, single port, no CORS issues
- **Framework Requirements**:
  - v1 requires Express (or Express-compatible framework)
  - Future: Can add `@downpat/nextjs`, `@downpat/fastify` adapters
  - No refactoring needed: Controller pattern keeps core framework-agnostic
- **Socket.io Benefits**:
  - Built-in fallbacks (automatically uses long-polling if WebSockets blocked)
  - Auto-reconnection logic
  - Bidirectional communication (needed for chat)
  - Matches current codebase
- **Rationale**: Same-origin deployment, Socket.io's robustness, Express widely used, extensible architecture

#### Q4.4: AI Adapter Configuration ✅ PARTIALLY DECIDED
- **Decision**: Programmatic configuration with dynamic provider availability
- **Requirements** (based on Q4.1 decision):
  - Host apps provide configuration object with API keys for desired providers
  - Only configured providers are available in the system
  - No requirement to configure all three providers
  - Dynamic UI filtering based on configured providers
- **Configuration Pattern**:
  ```typescript
  const aiConfig = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      // optional: organization, timeout, etc.
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY
    }
    // gemini not configured - won't appear in UI
  }
  ```
- **Security Considerations**:
  - API keys should NEVER be in client code
  - Configuration happens server-side only
  - Guide users on environment variable best practices
  - Document secure key management patterns
- **Still to decide**: Specific configuration API design

### 5. Storage & Data Management

#### Q5.1: Firestore Schema
- **Question**: Should we document/freeze a Firestore schema or allow customization?
- **Context**: Current code has specific collection structure (conversations, exercises, examples, demos, users)
- **Options**:
  - A) Fixed schema with clear documentation
  - B) Configurable collection names
  - C) Allow schema customization via configuration
- **Considerations**:
  - Flexibility vs. simplicity
  - Migration path if schema needs to change
  - How do we handle schema versioning?

#### Q5.2: User Storage
- **Question**: Should our packages manage user data or assume host app handles it?
- **Context**: Current code has user store with profile data
- **Specific Questions**:
  - Do we need to store user profiles?
  - Or just reference user IDs from host app's auth system?
  - What user metadata do we need (displayName, email)?
- **Options**:
  - A) Package manages minimal user data (ID, display name)
  - B) Host app provides user data via callbacks/hooks
  - C) No user storage, just IDs

#### Q5.3: Conversation Ownership & Privacy
- **Question**: How do we ensure users can only access their own conversations?
- **Context**: Current code has conversation ownership checks in Gatekeeper
- **Options**:
  - A) Firestore security rules (documented patterns)
  - B) Server-side enforcement via middleware
  - C) Both client-side (Firestore rules) and server-side checks
- **User Requirement**: "expose an interface to them such that they can keep conversations secure by user"

#### Q5.4: Data Retention
- **Question**: Should we provide data retention/cleanup utilities?
- **Context**: Demo conversations, old conversations, expired demo links
- **Specific Questions**:
  - Should demo conversations auto-expire?
  - Should old conversations be archived/deleted?
  - Who manages data retention policies?
- **Options**:
  - A) Provide utilities, host app decides policies
  - B) Built-in retention policies (configurable)
  - C) No retention management (host app's responsibility)

### 6. UI & Theming

#### Q6.1: Theming System
- **Question**: How much of the theming system should we include?
- **Context**: Current code has elaborate multi-tenant theme system with CSS variable generation
- **Specific Questions**:
  - Keep the theme factory and color generation?
  - Keep multiple pre-built themes or just one default?
  - How does host app customize appearance?
- **User Requirement**: "the host application needs to be able to provide styling such that the conversation screens match the look and feel of their site"
- **Options**:
  - A) Full theme system (factory, CSS variables, multiple themes)
  - B) Single default theme + customization guide
  - C) Unstyled components (headless UI) + styling example
  - D) CSS variables only, simple theming

#### Q6.2: TailwindCSS Dependency
- **Question**: Should we require TailwindCSS or make it optional?
- **Context**: Current UI heavily uses Tailwind classes
- **Options**:
  - A) Require Tailwind (simplest, maintains current approach)
  - B) Provide both Tailwind and vanilla CSS versions
  - C) CSS modules instead of Tailwind
  - D) Styled-components or similar CSS-in-JS
- **Considerations**:
  - Many React projects use Tailwind
  - Some projects don't want Tailwind
  - What about Tailwind config merging?

#### Q6.3: Component Customization
- **Question**: How should users customize UI components?
- **Context**: Host apps may want different layouts, colors, typography
- **Options**:
  - A) Prop-based customization (colors, sizes via props)
  - B) CSS class customization (className props)
  - C) Component composition (export primitives, users build layout)
  - D) Render props / slots pattern
  - E) Unstyled components (headless UI pattern)

#### Q6.4: Radix UI Dependency
- **Question**: Should we keep Radix UI components or make them optional?
- **Context**: libs/ui is built on Radix UI primitives
- **Options**:
  - A) Keep Radix as peer dependency (user installs)
  - B) Bundle Radix (included in package)
  - C) Make Radix optional, provide unstyled alternatives
- **Considerations**:
  - Radix provides excellent accessibility
  - Adds to bundle size
  - Some users may have different component libraries

### 7. Admin Interface

#### Q7.1: Admin UI Framework
- **Question**: Should admin UI be framework-agnostic or React-specific?
- **Context**: Current admin UI is React-based
- **Options**:
  - A) React components only
  - B) Web components (framework-agnostic)
  - C) Both React and web components
  - D) Headless API, users build their own UI
- **Considerations**:
  - React is most common for admin interfaces
  - Framework-agnostic increases reach but adds complexity
  - Some users may want Vue/Svelte/etc.

#### Q7.2: Admin Features
- **Question**: Which admin features are essential vs. nice-to-have?
- **Context**: Current admin interface has many features
- **Essential**:
  - Exercise creation
  - Exercise editing
  - Starter message management
  - Demo link generation (?)
- **Nice-to-Have**:
  - Exercise preview
  - Conversation analytics/viewing
  - User management
  - Bulk operations
- **Question**: What's the minimum viable admin UI?

#### Q7.3: Admin Authorization
- **Question**: How do we identify admin users?
- **Context**: Current code checks if user is in ActiveAdmin set
- **User Requirement**: "we need a way to leverage their authentication solution to identify what users are admins"
- **Options**:
  - A) Host app provides isAdmin callback/hook
  - B) Admin role in user metadata
  - C) Separate admin credential system
  - D) No built-in auth, host app wraps admin UI with auth

### 8. Example Application

#### Q8.1: Example App Framework
- **Question**: What framework should the example app use?
- **Context**: Example app should be as simple as possible to understand
- **Decision**: ✅ **Vanilla Node.js + Express + React**
  - Backend: Simple Express server
  - Frontend: React with minimal build setup (create-react-app or similar)
  - No meta-frameworks (Next.js, Remix, etc.)
  - No complex build tools (Vite, webpack configs, etc.)
- **Rationale**:
  - Clearest demonstration of package integration
  - No magic - shows exactly what's happening
  - Easiest to understand and modify
  - Matches "as simple as possible" goal
  - Users can add complexity in their own apps

#### Q8.2: Example App Scope
- **Question**: What should the example app demonstrate?
- **Must Show**:
  - Exercise creation (admin view)
  - Conversation interaction (user view)
  - Authentication integration
  - Firebase setup
  - Theming/styling customization
- **Nice to Show**:
  - Multiple exercise types
  - Demo/anonymous access
  - Multiple AI providers
  - Test examples
- **Question**: Minimal example or comprehensive showcase?

#### Q8.3: Example App Authentication
- **Question**: Which auth provider should example app use?
- **Context**: Need to show auth integration without mandating Firebase Auth
- **Options**:
  - A) Firebase Auth (easiest, already using Firebase for storage)
  - B) Passport.js (popular Express middleware, many strategies)
  - C) Clerk (modern, good DX)
  - D) Simple custom auth with JWT (show integration pattern clearly)
- **Considerations**:
  - Should demonstrate auth integration pattern
  - Should be easy to swap out
  - Don't want to force users into specific auth provider
  - Firebase Auth is simplest since we're already using Firebase

### 9. Testing Strategy

#### Q9.1: Test Coverage Requirements
- **Question**: What level of test coverage do we need?
- **Context**: User mentioned "healthy test practices" with unit + integration tests
- **For Packages**:
  - Core: What percentage coverage? Which critical paths?
  - Exercise Manager: Test exercise CRUD, versioning?
  - Conversation Engine: Test message flow, AI adapter mocks?
  - UI Components: Visual regression? Interaction testing?
- **For Example App**:
  - Unit tests for business logic?
  - Integration tests for full flows?
  - E2E tests for critical paths?

#### Q9.2: Testing Infrastructure
- **Question**: Which testing tools should we use?
- **Current Stack**: Jest, React Testing Library
- **Options**:
  - A) Keep Jest + RTL (matches legacy)
  - B) Vitest + Testing Library (faster, modern)
  - C) Playwright for E2E
  - D) Storybook for component testing
- **Considerations**:
  - Consistency across packages
  - Developer experience
  - CI/CD integration

#### Q9.3: AI Adapter Testing
- **Question**: How do we test AI adapter integrations?
- **Challenges**: Real API calls are expensive and slow
- **Options**:
  - A) Mock all AI responses
  - B) Record/replay actual responses
  - C) Dedicated test API keys with limits
  - D) Mix of mocks for unit tests, real calls for integration
- **Considerations**:
  - Need to verify actual API compatibility
  - Can't break tests when API changes
  - Cost of running tests

#### Q9.4: Firebase Testing
- **Question**: How do we test Firebase integration?
- **Options**:
  - A) Firebase emulator suite
  - B) Mock Firestore
  - C) Real test Firestore project
  - D) Abstract storage layer, test both mocks and real
- **Considerations**:
  - Emulator is free but requires setup
  - Mocks may not catch real Firebase issues
  - Real project costs money

### 10. Documentation

#### Q10.1: Documentation Scope
- **Question**: What documentation is required for launch?
- **Per Package**:
  - API documentation (JSDoc/TypeDoc)?
  - Integration guides?
  - Migration guides (from legacy)?
  - Troubleshooting?
- **Overall**:
  - Architecture overview
  - Getting started guide
  - Best practices
  - Security considerations
- **Example App**:
  - Setup instructions
  - Code walkthrough
  - Deployment guide

#### Q10.2: Documentation Platform
- **Question**: Where should documentation be hosted?
- **Options**:
  - A) README files in each package
  - B) Dedicated docs site (Docusaurus, VitePress, etc.)
  - C) GitHub Wiki
  - D) Both README + docs site
- **Considerations**:
  - Searchability
  - Versioning
  - Maintenance burden

#### Q10.3: API Documentation Generation
- **Question**: Should we use automated API doc generation?
- **Options**:
  - A) TSDoc/TypeDoc from code comments
  - B) Hand-written API docs
  - C) Both generated + hand-written
- **Considerations**:
  - Generated docs can get stale with code
  - Hand-written is more effort but better UX
  - Balance between automation and quality

### 11. Package Publishing & Maintenance

#### Q11.1: Package Naming
- **Question**: What should the npm scope be?
- **Options**:
  - A) `@downpat/*` (requires npm org ownership)
  - B) `@downpat/*` (clearly marks as open source)
  - C) No scope, just `downpat-core`, etc.
- **Considerations**:
  - Scope availability
  - Branding
  - Future-proofing

#### Q11.2: Versioning Strategy
- **Question**: How should we version packages?
- **Options**:
  - A) Independent versioning (each package has own version)
  - B) Lockstep versioning (all packages same version)
  - C) Semantic versioning with major version sync
- **Tools**: Lerna, Changesets, nx release
- **Considerations**:
  - Breaking changes in one package
  - User upgrade experience

#### Q11.3: Release Cadence
- **Question**: How often should we release updates?
- **Initial Release**: MVP feature set
- **Post-Release**:
  - Regular scheduled releases?
  - Release on demand when features ready?
  - LTS versions?
- **Considerations**:
  - Stability vs. new features
  - User upgrade burden
  - Maintenance capacity

#### Q11.4: Backward Compatibility
- **Question**: What's our policy on breaking changes?
- **Options**:
  - A) Strict semantic versioning (breaking = major bump)
  - B) Deprecation warnings before removal
  - C) Migration guides for breaking changes
  - D) All of the above
- **Considerations**:
  - Users need stability
  - Need flexibility to improve
  - Clear communication of changes

### 12. Security & Privacy

#### Q12.1: Secrets Management
- **Question**: How do we guide users on API key security?
- **Context**: AI provider API keys must be kept secure
- **Documentation Needed**:
  - Never put keys in client code
  - Environment variable best practices
  - Key rotation procedures
  - Rate limiting considerations
- **Question**: Should packages enforce any security practices?

#### Q12.2: Input Sanitization
- **Question**: Should we sanitize user input before sending to AI?
- **Context**: Current code uses sanitize-html
- **Considerations**:
  - Prevent prompt injection
  - Remove malicious HTML/scripts
  - Balance security vs. functionality
- **Options**:
  - A) Built-in sanitization (opinionated)
  - B) Optional sanitization (configurable)
  - C) No sanitization (user's responsibility)

#### Q12.3: Content Moderation
- **Question**: Should we include the content moderation adapter?
- **Context**: Current code has ModerationAdapter for flagging inappropriate content
- **Options**:
  - A) Include moderation as core feature
  - B) Make moderation optional/pluggable
  - C) Drop moderation (users implement if needed)
- **Considerations**:
  - May be important for public-facing apps
  - Adds dependency and complexity
  - Different orgs have different moderation needs

#### Q12.4: Rate Limiting
- **Question**: Should packages include rate limiting for AI calls?
- **Context**: Prevent abuse, control costs
- **Options**:
  - A) Built-in rate limiting (configurable)
  - B) Rate limiting utilities (users implement)
  - C) No rate limiting (users handle at infrastructure level)
- **Considerations**:
  - Important for demo/anonymous access
  - Different users have different limits
  - May be handled by API gateway

### 13. Licensing & Legal

#### Q13.1: License Choice
- **Question**: Which open source license should we use?
- **Options**:
  - A) MIT (most permissive, simple)
  - B) Apache 2.0 (patent grant, more formal)
  - C) GPL/AGPL (copyleft, requires derivative works to be open)
- **Considerations**:
  - Maximize adoption (permissive licenses)
  - Patent protection
  - Company's legal requirements

#### Q13.2: Dependency Licenses
- **Question**: Do we need to audit dependency licenses?
- **Context**: Ensure all dependencies are compatible with our license
- **Action Items**:
  - List all dependencies
  - Check each license
  - Document any restrictions
  - Replace incompatible dependencies if needed

#### Q13.3: Attribution & Credits
- **Question**: How should we handle attribution?
- **Context**: Extracting from closed-source company code
- **Considerations**:
  - Credit original developers?
  - Mention DownPat origin?
  - Contributor guidelines for future

### 14. Migration & Adoption

#### Q14.1: Migration Path
- **Question**: Do we need to support migration from legacy DownPat?
- **Context**: Any existing DownPat users who want to move to open source version?
- **If Yes**:
  - Data migration tools (Firestore schema changes?)
  - Code migration guide
  - Feature parity checklist
- **If No**:
  - Can ignore legacy compatibility
  - Focus on clean API design

#### Q14.2: Breaking Changes from Legacy
- **Question**: What major differences from legacy should we document?
- **Known Changes**:
  - No multi-tenant/subdomain support
  - No payment integration
  - Different auth integration pattern
  - Simplified organization model
  - No mobile support
- **Documentation**: Migration guide, breaking changes list

---

## Proposed Package Structure

Based on the questions above, here's an initial proposal for package organization:

### Package: `@downpat/core`

**Purpose**: Shared types, interfaces, constants, and **framework-agnostic controllers**

**Contents**:
- TypeScript interfaces (Exercise, Conversation, Message, Task, etc.)
- **Storage interfaces** (ConversationStorage, ExerciseStorage, etc.)
- **Auth interfaces** (ClientAuthProvider, ServerAuthProvider, User)
- **Controllers** (ExerciseController, ConversationController - framework-agnostic business logic)
- Enums and constants (MessageType, SupportedModels, etc.)
- Utility functions (UUID generation, etc.)
- Zod validation schemas

**Key Architectural Decision**: Controllers contain all business logic with NO framework dependencies (no Express, no HTTP concepts). This enables framework adapters without refactoring.

**Dependencies**: Minimal (zod, maybe lodash)

**Exports**:
```typescript
// Types
export { Exercise, Conversation, Message, Task, ... }

// Storage Interfaces (implemented by storage packages)
export interface ConversationStorage {
  save(conversation: Conversation): Promise<void>
  get(id: string): Promise<Conversation>
  getByUser(userId: string): Promise<Conversation[]>
  delete(id: string): Promise<void>
}

export interface ExerciseStorage {
  save(exercise: Exercise): Promise<void>
  get(id: string): Promise<Exercise>
  list(): Promise<Exercise[]>
  delete(id: string): Promise<void>
}

// Auth Interfaces (see AUTH_INTEGRATION.md)
export interface ServerAuthProvider {
  validateToken(token: string): Promise<User>
  getDemoUser(): User
}

export interface User {
  userId: string
  displayName: string
  isAdmin: boolean
  isSubscriber: boolean
}

// Framework-Agnostic Controllers
export class ExerciseController {
  constructor(storage: ExerciseStorage, auth: ServerAuthProvider) { ... }
  async createExercise(data: Exercise, user: User): Promise<Exercise>
  async getExercise(id: string, user: User): Promise<Exercise>
  async listExercises(user: User): Promise<Exercise[]>
  // ... pure business logic, no HTTP/framework code
}

export class ConversationController {
  constructor(storage: ConversationStorage, auth: ServerAuthProvider, aiProviders: AIProviderConfig) { ... }
  async startConversation(exerciseId: string, user: User): Promise<Conversation>
  async continueConversation(conversationId: string, message: string, user: User, streamCallback?: StreamCallback): Promise<void>
  // ... pure business logic, no HTTP/framework code
}

// Constants
export { MessageType, SupportedModels, ... }
// Utilities
export { UUIDUtil, ... }
// Validations
export { ExerciseSchema, ConversationSchema, ... }
```

---

### Package: `@downpat/exercise-manager`

**Purpose**: Exercise creation, management, and versioning logic

**Contents**:
- Exercise CRUD operations
- Exercise version management
- Starter message management
- Exercise validation
- Exercise metadata handling

**Dependencies**:
- `@downpat/core` (for types and storage interfaces)
- Storage implementation (user provides, e.g., `@downpat/firebase-storage`)

**Exports**:
```typescript
export class ExerciseManager {
  createExercise(exercise: Exercise): Promise<Exercise>
  updateExercise(id: string, updates: Partial<Exercise>): Promise<Exercise>
  getExercise(id: string): Promise<Exercise>
  deleteExercise(id: string): Promise<void>
  // ... etc
}
```

**Questions**:
- Isomorphic or server-only?
- How does it interact with storage layer?

---

### Package: `@downpat/conversation-engine`

**Purpose**: Conversation logic, message handling, AI integration

**Contents**:
- Conversation orchestration
- Message flow management
- Task execution logic
- AI adapter interface
- AI provider adapters (OpenAI, Anthropic, etc.)
- Streaming response handling
- Message formatting and filtering

**Dependencies**:
- `@downpat/core` (for types and storage interfaces)
- Storage implementation (user provides, e.g., `@downpat/firebase-storage`)
- AI provider SDKs (OpenAI, Anthropic, etc.)
- (TBD based on transport decisions - socket.io?)

**Exports**:
```typescript
export class ConversationEngine {
  startConversation(exerciseId: string, userId: string): Promise<Conversation>
  continueConversation(conversationId: string, userMessage: string): Promise<Message[]>
  // ... etc
}

export interface AIAdapter {
  executeTasks(...): Promise<AdapterResponse[][]>
  chat(...): Promise<string>
}

export { OpenAIAdapter, AnthropicAdapter, ... }
```

**Questions**:
- How does streaming work?
- Which adapters to include?
- How does it interact with storage?

---

### Package: `@downpat/firebase-storage`

**Purpose**: Official Firebase/Firestore implementation of storage interfaces (recommended)

**Contents**:
- Conversation store implementation
- Exercise store implementation
- Demo link store implementation
- User store implementation (if needed)
- Firestore initialization utilities
- Security rules documentation
- Migration scripts (if needed)

**Dependencies**:
- `@downpat/core` (for storage interfaces)
- `firebase-admin` (server)
- `firebase` (client)

**Exports**:
```typescript
// Implements interfaces from @downpat/core
export class FirebaseConversationStorage implements ConversationStorage {
  save(conversation: Conversation): Promise<void>
  get(id: string): Promise<Conversation>
  getByUser(userId: string): Promise<Conversation[]>
  delete(id: string): Promise<void>
}

export class FirebaseExerciseStorage implements ExerciseStorage { ... }
export class FirebaseDemoStorage implements DemoStorage { ... }
```

**Note**: This is the **recommended** storage implementation. Most users will use this package.

---

### Package: `@downpat/express`

**Purpose**: Express integration providing HTTP routes and Socket.io setup (thin wrapper around core controllers)

**Contents**:
- Express Router factory
- Socket.io integration
- HTTP request/response handling
- Authentication middleware
- Error handling middleware
- Route definitions for all endpoints

**Key Architecture**: Thin wrapper that extracts data from Express requests, calls core controllers, formats responses

**Dependencies**:
- `@downpat/core` (for controllers and types)
- `express` (peer dependency)
- `socket.io` (for streaming)

**Exports**:
```typescript
export function createDownpatRouter(config: DownpatConfig): DownpatRouter {
  // Creates Express router with all endpoints
  // Returns: { router: express.Router, controllers, attachSocketIO }
}

export interface DownpatConfig {
  storage: {
    conversations: ConversationStorage
    exercises: ExerciseStorage
    demos: DemoStorage
  }
  serverAuth: ServerAuthProvider
  aiProviders: {
    openai?: { apiKey: string }
    anthropic?: { apiKey: string }
    gemini?: { apiKey: string }
  }
}

export interface DownpatRouter {
  router: express.Router  // Mount with app.use('/api/downpat', router)
  controllers: {
    exercise: ExerciseController
    conversation: ConversationController
  }
  attachSocketIO(httpServer: http.Server): void  // Sets up Socket.io
}
```

**Usage Example**:
```javascript
const express = require('express');
const { createDownpatRouter } = require('@downpat/express');

const app = express();

// Create router
const downpat = createDownpatRouter({
  storage: {
    conversations: new FirebaseConversationStorage(firebaseApp),
    exercises: new FirebaseExerciseStorage(firebaseApp),
    demos: new FirebaseDemoStorage(firebaseApp)
  },
  serverAuth: myServerAuthProvider,
  aiProviders: {
    openai: { apiKey: process.env.OPENAI_API_KEY }
  }
});

// Mount routes
app.use('/api/downpat', downpat.router);

// Start server with Socket.io
const server = app.listen(3000);
downpat.attachSocketIO(server);
```

**Routes Provided**:
- `POST /exercises` - Create exercise (admin only)
- `GET /exercises` - List exercises
- `GET /exercises/:id` - Get exercise
- `PUT /exercises/:id` - Update exercise (admin only)
- `DELETE /exercises/:id` - Delete exercise (admin only)
- `POST /conversations` - Start conversation
- `GET /conversations/:id` - Get conversation
- `GET /conversations` - List user's conversations

**Socket.io Events**:
- `continue-chat` - Send message, receive streaming response
- `stream-response` - Emitted as AI generates response
- `stream-complete` - Emitted when response finished

**Future Packages**:
- `@downpat/nextjs` - Next.js API route handlers (same controllers, different wrapper)
- `@downpat/fastify` - Fastify integration (same controllers, different wrapper)

---

### Package: `@downpat/ui-components`

**Purpose**: React UI components for conversation interface

**Contents**:
- ChatMessages component
- ChatMessage component
- Message type renderers (UserMessage, PartnerMessage, CommentaryMessage, etc.)
- Message actions (rate, regenerate, report)
- Chat input component
- Loading states
- Theme provider

**Dependencies**:
- `@downpat/core`
- React
- Radix UI (peer dependency?)
- TailwindCSS (peer dependency?)

**Exports**:
```typescript
export { ChatMessages, ChatMessage, ChatInput }
export { UserMessage, PartnerMessage, CommentaryMessage, ... }
export { ThemeProvider, useTheme }
export { ChatMessageActions }
```

**Questions**:
- Styled or unstyled?
- Tailwind required?
- How much customization?

---

### Package: `@downpat/admin-ui`

**Purpose**: React UI components for admin/exercise management

**Contents**:
- Exercise creation form
- Exercise editor
- Starter message editor
- Exercise list/grid
- Demo link generator
- Preview components

**Dependencies**:
- `@downpat/core`
- `@downpat/exercise-manager`
- React
- Form library (react-hook-form?)
- UI components (Radix UI?)

**Exports**:
```typescript
export { ExerciseCreator, ExerciseEditor }
export { StarterMessageEditor }
export { ExerciseList, ExerciseCard }
export { DemoLinkGenerator }
```

**Questions**:
- Integrated forms or headless?
- Validation handling?

---

### Package: `@downpat/react-hooks` (Optional)

**Purpose**: React hooks for common operations

**Contents**:
- `useConversation` - Manage conversation state
- `useExercise` - Fetch/manage exercises
- `useAuth` - Auth integration
- `useSocket` - Socket connection (if applicable)

**Dependencies**:
- `@downpat/core`
- `@downpat/conversation-engine`
- `@downpat/exercise-manager`
- React

**Exports**:
```typescript
export function useConversation(conversationId: string) { ... }
export function useExercise(exerciseId: string) { ... }
export function useAuth() { ... }
```

---

### Example App: `downpat-example-app`

**Purpose**: Reference implementation showing integration (as simple as possible)

**Tech Stack**:
- Backend: Node.js + Express
- Frontend: React (simple setup, create-react-app or similar)
- TypeScript
- TailwindCSS or vanilla CSS
- Firebase (Firestore + Auth)
- One AI provider (OpenAI or Anthropic)
- **No meta-frameworks**: Keep it simple and clear

**Features**:
- User authentication
- Exercise creation (admin view)
- Exercise list
- Conversation interface
- Demo/anonymous access
- Theming example

**Structure**:
```
example-app/
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── config/           # Configuration
│   │   └── server.js         # Express app
│   └── package.json
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # App-specific components
│   │   ├── pages/            # Page components
│   │   ├── lib/              # Integration code
│   │   └── index.js          # React entry point
│   ├── public/               # Static assets
│   └── package.json
├── tests/                     # Integration & E2E tests
└── README.md                  # Setup guide
```

---

## Implementation Phases

### Phase 0: Planning & Setup (Current Phase)
- [ ] Answer all key questions in this spec
- [ ] Get stakeholder approval on decisions
- [ ] Set up repository structure
- [ ] Configure build tools (NX, TypeScript, etc.)
- [ ] Set up CI/CD pipeline
- [ ] Choose and document license

### Phase 1: Core Package
- [ ] Extract and clean core types/interfaces
- [ ] Set up validation schemas
- [ ] Create utility functions
- [ ] Write unit tests
- [ ] Document APIs
- [ ] Publish v0.1.0

### Phase 2: Storage Layer
- [ ] Design storage interface
- [ ] Implement Firebase storage package
- [ ] Write storage tests (with emulator)
- [ ] Document Firestore schema
- [ ] Document security rules
- [ ] Publish v0.1.0

### Phase 3: Exercise Manager
- [ ] Extract exercise business logic
- [ ] Implement CRUD operations
- [ ] Add versioning (if included)
- [ ] Write unit tests
- [ ] Integration tests with storage
- [ ] Document API
- [ ] Publish v0.1.0

### Phase 4: Conversation Engine
- [ ] Extract conversation orchestration logic
- [ ] Implement task execution
- [ ] Port AI adapters
- [ ] Add streaming support (if included)
- [ ] Write adapter tests (mocked)
- [ ] Integration tests
- [ ] Document AI integration
- [ ] Publish v0.1.0

### Phase 5: UI Components - Conversation
- [ ] Extract and clean conversation UI components
- [ ] Set up theming system
- [ ] Implement message renderers
- [ ] Add message actions
- [ ] Write component tests
- [ ] Create Storybook stories
- [ ] Document customization
- [ ] Publish v0.1.0

### Phase 6: Admin UI Components
- [ ] Extract and clean admin UI components
- [ ] Create exercise forms
- [ ] Implement editors
- [ ] Write component tests
- [ ] Create Storybook stories
- [ ] Document usage
- [ ] Publish v0.1.0

### Phase 7: Example Application
- [ ] Set up Next.js/Vite project
- [ ] Integrate all packages
- [ ] Implement authentication
- [ ] Create admin pages
- [ ] Create conversation pages
- [ ] Add demo/anonymous access
- [ ] Write integration tests
- [ ] Write comprehensive README
- [ ] Deploy demo instance

### Phase 8: Documentation & Polish
- [ ] Create documentation site
- [ ] Write getting started guide
- [ ] Write integration guides
- [ ] Document best practices
- [ ] Create video tutorials (optional)
- [ ] Write migration guide (if needed)
- [ ] Security audit
- [ ] Performance optimization

### Phase 9: Release
- [ ] Final testing across all packages
- [ ] Security audit
- [ ] License compliance check
- [ ] Publish all packages to npm
- [ ] Tag v1.0.0 release on GitHub
- [ ] Announce release
- [ ] Monitor for issues

---

## Testing Strategy

### Unit Tests (All Packages)
- **Tool**: Jest or Vitest
- **Coverage Target**: 80%+ for core logic
- **Focus**:
  - Business logic
  - Utilities
  - Validation
  - Edge cases

### Integration Tests
- **Tool**: Jest/Vitest
- **Focus**:
  - Package interactions
  - Firebase integration (with emulator)
  - AI adapter integration (mocked)
  - End-to-end flows

### Component Tests (UI Packages)
- **Tool**: React Testing Library
- **Focus**:
  - Component rendering
  - User interactions
  - State management
  - Accessibility

### E2E Tests (Example App)
- **Tool**: Playwright
- **Focus**:
  - Critical user flows
  - Exercise creation
  - Conversation flow
  - Auth flow
  - Cross-browser compatibility

### Visual Regression (UI Packages)
- **Tool**: Storybook + Chromatic (optional)
- **Focus**:
  - Component appearance
  - Theme variations
  - Responsive layouts

---

## Documentation Requirements

### Per Package Documentation

#### README.md
- Package description
- Installation instructions
- Quick start example
- Basic usage
- Link to full docs

#### API Documentation
- All public APIs documented
- TypeScript types documented
- Examples for each major function
- Common use cases

#### CHANGELOG.md
- Version history
- Breaking changes highlighted
- Migration guides for major versions

### Overall Documentation

#### Getting Started Guide
- Prerequisites
- Installation
- Basic setup
- First exercise creation
- First conversation

#### Architecture Overview
- System design
- Package relationships
- Data flow
- Key concepts

#### Integration Guides
- Firebase setup
- Authentication integration
- AI provider setup
- Theming customization
- Deployment

#### Best Practices
- Security considerations
- Performance optimization
- Error handling
- Testing strategies

#### API Reference
- Complete API docs for all packages
- Searchable
- With examples

#### Example App Walkthrough
- Code tour
- Architecture decisions
- Customization points

---

## Success Criteria

### Functional Requirements
- [ ] Can create and edit exercises
- [ ] Can have conversations with exercises
- [ ] Supports at least 2 AI providers
- [ ] Supports anonymous/demo access
- [ ] Admin UI works
- [ ] User UI works
- [ ] Firebase integration works
- [ ] Auth integration works
- [ ] Theming customization works

### Quality Requirements
- [ ] 80%+ test coverage on packages
- [ ] All packages have documentation
- [ ] Example app runs without errors
- [ ] Example app is well-documented
- [ ] No security vulnerabilities
- [ ] No license conflicts
- [ ] TypeScript types are complete
- [ ] Accessibility standards met (WCAG 2.1 AA)

### Developer Experience
- [ ] Clear installation process
- [ ] Good error messages
- [ ] Helpful TypeScript types
- [ ] Example code available
- [ ] Active documentation

### Performance
- [ ] Conversation responses < 500ms (non-streaming)
- [ ] UI renders < 100ms
- [ ] Bundle size reasonable (< 100kb per package gzipped)

---

## Open Questions Summary

The following questions MUST be answered before implementation begins:

### Critical (Block Implementation)
1. ✅ **Storage abstraction**: Storage interface with Firebase as official implementation
2. ✅ **Auth pattern**: Token-based (client provides tokens, server validates)
3. ✅ **Schema/Task system**: Drop ExtractTask (schema extraction to PDF)
4. ✅ **AI providers**: OpenAI, Anthropic, Gemini (dynamic availability based on config)
5. ✅ **Streaming**: Socket.io required, Express integration with controller pattern
6. ✅ **Package scope**: `@downpat/` for all packages

### High Priority (Affect Architecture)
7. **Exercise manager**: Backend-only, isomorphic, or split?
8. **UI framework**: Styled, unstyled, or hybrid approach?
9. **Theming**: Full theme system or simple CSS variables?
10. **Admin auth**: How do host apps designate admins?
11. **Demo access**: Backend or client-side demo link generation?

### Medium Priority (Affect Features)
12. **Message types**: Keep all or simplify?
13. **Exercise versioning**: Keep, simplify, or drop?
14. **Exercise examples**: Keep or drop?
15. **Content moderation**: Include, optional, or drop?
16. **Rate limiting**: Built-in or user's responsibility?

### Lower Priority (Can Decide During Implementation)
17. **Example app framework**: Next.js or Vite?
18. **Testing tools**: Jest or Vitest?
19. **Documentation platform**: README or dedicated site?
20. **Radix UI**: Bundle or peer dependency?

---

## Next Steps

1. **Review this spec** with stakeholders
2. **Answer all critical questions** before proceeding
3. **Make architectural decisions** on high-priority questions
4. **Refine package structure** based on answers
5. **Create detailed implementation plan** for Phase 1
6. **Set up repository** and development environment
7. **Begin Phase 1 implementation**

---

## Notes for Implementation Agent

### Code Extraction Guidelines
- Preserve existing business logic where possible
- Remove all payment-related code
- Remove all mobile-specific code
- Remove all subdomain/multi-tenant specific code
- Simplify organization model (single org assumption)
- Update imports/dependencies to match new package structure
- Ensure no secrets in extracted code
- Add proper error handling where missing
- Add TypeScript types where missing
- Follow existing code style and patterns

### Testing Guidelines
- Write tests as you extract code
- Use Firebase emulator for storage tests
- Mock AI providers for conversation tests
- Test error cases
- Test edge cases
- Ensure backward compatibility within major versions

### Documentation Guidelines
- Document as you build
- Include JSDoc comments on public APIs
- Write README for each package
- Include runnable examples
- Document breaking changes from legacy
- Note any assumptions or limitations

---

## Appendix A: Current Codebase Analysis

(Comprehensive codebase analysis from exploration is preserved for reference)

### File Locations Reference

#### Core Models
- Exercise: `.DownPatNode/libs/shared/src/lib/models/exercises/exercise.ts`
- Conversation: `.DownPatNode/libs/shared/src/lib/models/conversation.ts`
- Message: `.DownPatNode/libs/shared/src/lib/models/messages/message.ts`
- Tasks: `.DownPatNode/libs/shared/src/lib/models/tasks/*.ts`

#### Backend Services
- Conversation: `.DownPatNode/apps/server/src/services/conversation-service.ts`
- Exercise: `.DownPatNode/apps/server/src/services/exercise-service.ts`
- Admin: `.DownPatNode/apps/server/src/services/admin-service.ts`

#### Frontend Components
- Chat: `.DownPatNode/apps/web/src/components/chat/`
- Exercise: `.DownPatNode/apps/web/src/components/exercise/`
- Admin: `.DownPatNode/apps/web/src/components/pages/PageCreatorDashboard.tsx`

#### AI Integration
- Adapters: `.DownPatNode/apps/server/src/adapters/`
- Interface: `.DownPatNode/apps/server/src/adapters/adapter-interface.ts`

#### Storage
- Stores: `.DownPatNode/apps/server/src/stores/`
- Firebase Init: `.DownPatNode/apps/server/src/firebase.ts`

### Dependencies to Review
- Which can stay?
- Which need updating?
- Which should be peer dependencies?
- Any security vulnerabilities?

---

**End of Specification**

*This specification is a living document. As questions are answered and decisions are made, this document should be updated to reflect the current plan.*
