# DownPat Open Source Migration - Summary

## What We're Building

We're extracting the core functionality from the DownPat legacy codebase to create open-source npm packages that allow developers to:

1. **Create AI-powered conversational exercises** with different interaction patterns
2. **Build user-facing conversation interfaces** where users interact with these exercises
3. **Provide admin interfaces** for exercise creation and management
4. **Support anonymous/demo access** for public sharing

## Key Findings from Codebase Analysis

### What We're Keeping

**Core Conversation Features:**
- Exercise creation with tasks, guidelines, starters, and welcome messages
- Multiple conversation patterns:
  - **ConversationTask**: One-on-one conversations
  - **CommentaryTask**: Conversations with AI feedback/commentary
  - **SummaryTask**: Conversations with end summaries
  - Extract and Simulate tasks
- Message types: USER, CONVERSATION, COMMENTARY, SUMMARY, CONTEXT, STARTER, etc.
- Real-time streaming AI responses
- Message actions (rate, regenerate, report)

**AI Integration:**
- Adapter pattern supporting multiple providers (OpenAI, Anthropic, Gemini, Groq)
- Structured response handling
- Example-based prompting

**Storage:**
- Firebase/Firestore for conversations, exercises, demo links
- Conversation ownership and privacy

**UI Components:**
- Chat interface with message type renderers
- Exercise creation/editing forms
- Demo link generation
- Theming/customization system

### What We're Dropping

**Infrastructure:**
- Payment/Stripe integration (all subscription code)
- Multi-tenant subdomain system (single org assumption)
- Mobile support (SmartBanner components, etc.)
- Email notifications
- Waitlist management
- Team management
- **Real-time voice/audio chat** (`liveChatEnabled` - voice chat with microphone)
  - ⚠️ Note: **Text-based "Talk to Coach"** feature (`talkToCoachEnabled`) should be KEPT
- Job listings
- Organization file uploads

**Specific Features:**
- "Schema step" functionality (needs clarification on what exactly this means)
- Possibly content moderation (needs decision)
- Possibly exercise versioning (needs decision)

## Proposed Architecture

### NPM Packages

```
@downpat-oss/
├── core                 # Types, interfaces, constants, utilities
├── exercise-manager     # Exercise CRUD and management
├── conversation-engine  # Conversation logic and AI adapters
├── firebase-storage     # Firebase/Firestore integration
├── ui-components        # React components for conversations
├── admin-ui            # React components for exercise management
└── react-hooks         # Optional: React hooks for common operations
```

### Example Application

A simple vanilla Node.js + Express + React app demonstrating integration of all packages, including:
- Backend: Node.js + Express server
- Frontend: React (create-react-app or similar simple setup)
- User authentication (pluggable, not Firebase-specific)
- Exercise creation (admin view)
- Conversation interface (user view)
- Demo/anonymous access
- Theming customization
- **Goal**: As simple as possible - no meta-frameworks, just the basics

## Critical Questions That Need Answers

I've identified **20 key questions** that must be answered before implementation. Here are the most critical:

### 1. Storage Layer (CRITICAL) ✅ DECIDED
**Decision**: Storage abstraction with Firebase as the official/recommended implementation

**Approach**:
- Define storage interfaces in `@downpat-oss/core` (ConversationStorage, ExerciseStorage, etc.)
- Implement Firebase in `@downpat-oss/firebase-storage` (official, recommended package)
- Allow community to implement other backends (PostgreSQL, MongoDB) if needed

**Rationale**:
- **Simple default**: Users install firebase-storage, provide credentials, we handle everything
- **Fresh Firebase DB**: Free credentials, no schema setup, no migration burden
- **Future-proof**: Interface allows alternatives without complicating the default path
- **Better architecture**: Clear contracts, testable, clean package boundaries
- **Minimal overhead**: ~5-10% extra work for significant long-term benefits

**Impact**: Clean architecture with simple default path for 90% of users

### 2. Authentication Pattern (CRITICAL)
**Question**: How do we integrate with host application authentication?

You mentioned host apps should handle auth, but we need to define:
- What interface do we expose for auth integration?
- How do host apps tell us if a user is authenticated?
- How do they designate admin users?
- How does anonymous/demo access work?

**Impact**: Affects security, API design, example app

### 3. "Schema Step" Clarification (CRITICAL)
**Question**: What exactly is the "schema step" functionality to drop?

Current understanding:
- All tasks have a `responseSchema` field that defines expected AI response structure
- ConversationTask expects: `{conversation: string}`
- CommentaryTask expects: `{commentary: string, grade: string}`
- SummaryTask expects: `{summary: string, grade: string}`

Is "schema step" referring to:
- A) The entire structured response system (drop all schemas)?
- B) A specific type of completion task that generates structured data?
- C) Something else?

**Impact**: Affects core conversation functionality

### 4. AI Providers (CRITICAL)
**Question**: Which AI providers should we support initially?

Options:
- All four (OpenAI, Anthropic, Gemini, Groq)
- Just OpenAI + Anthropic (most popular)
- Just OpenAI (simplest)
- Provide interface, let users implement

**Impact**: Maintenance burden, testing requirements, bundle size

### 5. Streaming & Transport (CRITICAL)
**Question**: How do we handle real-time streaming responses?

Current code uses Socket.io for streaming. Options:
- Require Socket.io
- Support multiple transports (Socket.io, SSE, HTTP streaming)
- Non-streaming only (simpler but worse UX)

**Impact**: Infrastructure requirements, user experience, complexity

### 6. Package Scope/Naming (CRITICAL)
**Question**: What npm scope should we use?

Options:
- `@downpat/*`
- `@downpat-oss/*`
- No scope (e.g., `downpat-core`)

**Impact**: Publishing, branding, availability

## Other Important Decisions Needed

### High Priority (Affect Architecture)

7. **Exercise Manager Structure**: Backend-only, isomorphic, or split packages?
8. **UI Approach**: Styled components, unstyled/headless, or hybrid?
9. **Theming System**: Full theme factory or simple CSS variables?
10. **Demo Link Generation**: Backend or client-side?

### Medium Priority (Affect Features)

11. **Message Types**: Keep all 10 types or simplify?
12. **Exercise Versioning**: Keep, simplify, or drop?
13. **Exercise Examples**: Keep or drop?
14. **Content Moderation**: Include, make optional, or drop?
15. **Rate Limiting**: Built-in or user responsibility?

### Lower Priority (Can Decide During Implementation)

16. **Example App Framework**: Vanilla Node.js + Express + React (simple setup)
17. **Testing Tools**: Jest or Vitest?
18. **Documentation Platform**: README files or dedicated site?
19. **Radix UI**: Bundle or peer dependency?
20. **TailwindCSS**: Required or optional?

## What Happens Next

### Recommended Process

1. **Review the spec.md file** - It contains detailed analysis and all questions
2. **Answer the 6 critical questions** - These block implementation
3. **Make decisions on high-priority questions** - These affect architecture
4. **Refine package structure** based on your answers
5. **I (or another Claude agent) can then**:
   - Create detailed implementation plan
   - Set up repository structure
   - Begin extracting and refactoring code
   - Build the packages
   - Create the example app
   - Write tests and documentation

### What I've Provided

- **spec.md**: Comprehensive specification with all questions, proposed architecture, implementation phases, testing strategy, and documentation requirements
- **This summary**: Quick overview and critical questions
- **Codebase analysis**: Detailed understanding of current architecture

## Key Architectural Insights

### Conversation Flow
```
User Input → Conversation Service → Task Execution → AI Adapter → Streaming Response
                                                           ↓
                                                      Firestore Storage
```

### Current Package Structure (Legacy)
```
libs/shared/     # 300+ files of models, constants, themes, validations
libs/ui/         # 34 reusable Radix-based components
apps/server/     # Express backend with services, stores, adapters
apps/web/        # React frontend with pages and components
```

### Proposed Extraction Strategy
- Extract shared models → `@downpat-oss/core`
- Extract server services/stores → `@downpat-oss/exercise-manager` + `conversation-engine`
- Extract Firebase code → `@downpat-oss/firebase-storage`
- Extract UI components → `@downpat-oss/ui-components` + `admin-ui`
- Create new example app showing integration

## Technical Highlights

### Exercise Structure
An exercise contains:
- **Basic info**: name, slug, priority
- **Configuration**: max messages, AI model, feature flags
- **Content**: welcome message, guidelines
- **Starters**: Initial conversation prompts
- **Tasks**: Continuation tasks (during), completion tasks (at end), simulation tasks

### Conversation Patterns

**Pattern 1: Simple Conversation**
- User and AI exchange messages
- No feedback or grading
- Message filters hide commentary/summary

**Pattern 2: With Commentary**
- After each user message, AI provides feedback
- Includes grade assessment
- Commentary appears inline with conversation

**Pattern 3: With Summary**
- Normal conversation flow
- At completion, AI generates summary
- Includes overall grade
- Can reference exercise guidelines

### Message Flow
1. User sends message → Firestore
2. Conversation service retrieves exercise + conversation history
3. Service filters messages per task requirements
4. AI adapter executes tasks (with streaming callbacks)
5. Responses saved to Firestore
6. Frontend receives streaming updates via Socket.io
7. UI renders messages by type

### Demo/Anonymous Access
- Demo links have unique codes and message limits
- Conversations tagged with demo code
- No authentication required
- Can be revoked by admins
- Useful for public sharing and testing

## Files to Reference

All the code is in `.DownPatNode/` directory. Key files:

- **Models**: `.DownPatNode/libs/shared/src/lib/models/`
- **Tasks**: `.DownPatNode/libs/shared/src/lib/models/tasks/`
- **Services**: `.DownPatNode/apps/server/src/services/`
- **Adapters**: `.DownPatNode/apps/server/src/adapters/`
- **UI Components**: `.DownPatNode/apps/web/src/components/`
- **Stores**: `.DownPatNode/apps/server/src/stores/`

## Ready for Your Feedback

Please review spec.md and let me know:
1. Your answers to the 6 critical questions
2. Any decisions on the high/medium priority questions
3. Any concerns or additional considerations
4. Whether the proposed package structure makes sense
5. If there's anything I missed or misunderstood

Once we align on the architecture and key decisions, we can start the implementation work!
