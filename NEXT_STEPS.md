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

### 6. Package Scope & Naming

**Decision**: What npm organization/scope should we use?

**Your Choice**:
- [ ] **@downpat/*** (requires npm org ownership)
- [ ] **@downpat-oss/*** (clearly marks as open source)
- [ ] **No scope** (e.g., `downpat-core`, `downpat-ui`)
- [ ] **Other**: _____________________

**Your Decision**: _____________________

**Package Names** (based on your scope choice):
- Core: _____________________
- Exercise Manager: _____________________
- Conversation Engine: _____________________
- Firebase Storage: _____________________
- UI Components: _____________________
- Admin UI: _____________________

---

## HIGH PRIORITY DECISIONS

### 7. Exercise Manager Architecture

**Decision**: Should exercise-manager be backend-only, isomorphic, or split?

- [ ] **Backend only**: Server-side CRUD operations only
- [ ] **Isomorphic**: Works on both client and server
- [ ] **Split packages**: Core logic + backend API + frontend client

**Your Decision**: _____________________

---

### 8. UI Component Approach

**Decision**: How should we provide UI components?

- [ ] **Styled components**: Pre-styled with TailwindCSS (easy to use)
- [ ] **Unstyled/headless**: Logic only, users style (maximum flexibility)
- [ ] **Hybrid**: Unstyled primitives + styled examples
- [ ] **Multiple packages**: Both styled and unstyled versions

**Your Decision**: _____________________

**TailwindCSS requirement**:
- [ ] Required
- [ ] Optional (provide vanilla CSS alternative)
- [ ] Not used (different styling approach)

**Radix UI dependency**:
- [ ] Bundle with components
- [ ] Peer dependency (user installs)
- [ ] Don't use Radix

---

### 9. Theming System

**Decision**: How much of the theming system should we include?

Current system has elaborate multi-tenant theme factory with CSS variables.

- [ ] **Full system**: Keep theme factory, color generation, multiple themes
- [ ] **Simple**: One default theme + CSS variable customization guide
- [ ] **Unstyled**: No theming, host app styles everything
- [ ] **Minimal**: Just CSS variables, no factory

**Your Decision**: _____________________

**Default themes to include**: _____________________

---

### 10. Demo Link Generation

**Decision**: Where should demo links be generated?

- [ ] **Backend only**: Server generates links (more secure)
- [ ] **Client-side allowed**: Frontend can create demo codes
- [ ] **Configurable**: Support both modes

**Your Decision**: _____________________

---

## MEDIUM PRIORITY DECISIONS

### 11. Message Types

**Decision**: Keep all 10 message types or simplify?

Current types: CONTEXT, MODERATION, STARTER, USER, CONVERSATION, COMMENTARY, EXTRACT, SIMPLE, SIMULATE, SUMMARY

**Your choices** (check all that apply):
- [ ] Keep all 10
- [ ] Drop EXTRACT
- [ ] Drop SIMPLE
- [ ] Drop SIMULATE
- [ ] Drop MODERATION
- [ ] Other changes: _____________________

---

### 12. Exercise Versioning

**Decision**: Include exercise versioning system?

- [ ] Keep full versioning (versions, metadata, LATEST constant)
- [ ] Simple version number only
- [ ] No versioning

**Your Decision**: _____________________

---

### 13. Exercise Examples

**Decision**: Include exercise examples feature?

Examples show users what good conversations look like and provide AI context.

- [ ] Include full example system
- [ ] Simplified examples (text only)
- [ ] Drop examples

**Your Decision**: _____________________

---

### 14. Content Moderation

**Decision**: Include content moderation adapter?

- [ ] Include as core feature
- [ ] Make it optional/pluggable
- [ ] Drop entirely (users implement if needed)

**Your Decision**: _____________________

---

### 15. Rate Limiting

**Decision**: Built-in rate limiting for AI calls?

- [ ] Built-in rate limiting (configurable)
- [ ] Provide utilities, users implement
- [ ] No rate limiting (users handle at infrastructure level)

**Your Decision**: _____________________

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

### 17. Testing Tools

- [ ] Keep Jest + React Testing Library
- [ ] Vitest + Testing Library (faster, modern)
- [ ] Mix: Vitest for packages, Jest for app

**Your Decision**: _____________________

**E2E Testing**:
- [ ] Playwright
- [ ] Cypress
- [ ] None initially

---

### 18. Documentation Platform

- [ ] README files only
- [ ] Dedicated docs site (Docusaurus, VitePress, etc.)
- [ ] Both README + docs site

**Your Decision**: _____________________

---

### 19. Component Styling Dependencies

**Radix UI**:
- [ ] Bundle with components
- [ ] Peer dependency

**TailwindCSS**:
- [ ] Required
- [ ] Peer dependency
- [ ] Optional

**Your Decisions**: _____________________

---

### 20. License

**Decision**: Which open source license?

- [ ] MIT (most permissive, maximizes adoption)
- [ ] Apache 2.0 (patent grant, more formal)
- [ ] GPL/AGPL (copyleft, derivative works must be open)
- [ ] Other: _____________________

**Your Decision**: _____________________

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
- **Scope**: _____________________
- **Core Package Name**: _____________________

### Features
- **Task System**: Drop ExtractTask, keep all other tasks ✅
- **Message Types**: Drop EXTRACT, others TBD _____________________
- **Versioning**: _____________________
- **Examples**: _____________________
- **Moderation**: _____________________

### UI Approach
- **Component Style**: _____________________
- **Theming**: _____________________
- **TailwindCSS**: _____________________
- **Radix UI**: _____________________

### Example App
- **Framework**: Vanilla Node.js + Express (backend) + React (frontend)
- **Auth Provider**: _____________________

### Testing & Tools
- **Test Framework**: _____________________
- **E2E Tool**: _____________________
- **Docs Platform**: _____________________

### Legal
- **License**: _____________________

---

## Ready to Implement?

Once all critical decisions are made:

1. Share your decisions
2. I (or another agent) can create detailed implementation plan
3. Set up repository structure
4. Begin code extraction and refactoring

---

**Questions or need clarification on any decision?** Just ask!
