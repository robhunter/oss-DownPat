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

### 3. "Schema Step" Clarification

**Decision**: What exactly should we drop?

Current understanding of responseSchema usage:
- All tasks use `responseSchema` to define expected AI response structure
- ConversationTask: `{conversation: string}`
- CommentaryTask: `{commentary: string, grade: string}`
- SummaryTask: `{summary: string, grade: string}`

**What does "schema step" refer to?**

- [ ] **Option A**: Drop entire responseSchema system (major change, AI returns plain text)
- [ ] **Option B**: Drop only specialized completion/schema tasks, keep core patterns
- [ ] **Option C**: Drop a specific task type (which one? _______)
- [ ] **Option D**: Keep everything, "schema step" was misunderstood

**Your Decision**: _____________________

**Clarification Needed**:
- Do you want to keep ConversationTask, CommentaryTask, SummaryTask as-is?
- Or should we simplify the task system?
- Is there a specific feature you're thinking of?

---

### 4. AI Provider Support

**Decision**: Which AI providers should we support?

Current code has adapters for:
- OpenAI (GPT models)
- Anthropic (Claude models)
- Google Gemini
- Groq

**Your Choice**:
- [ ] **Option A**: All four providers
  - Pros: Maximum flexibility
  - Cons: More maintenance, testing, bundle size

- [ ] **Option B**: OpenAI + Anthropic only
  - Pros: Covers most use cases, manageable maintenance
  - Cons: Users wanting Gemini/Groq need to add themselves

- [ ] **Option C**: OpenAI only
  - Pros: Simplest, most widely used
  - Cons: Limited flexibility

- [ ] **Option D**: Adapter interface only, users implement
  - Pros: Most flexible, smallest package
  - Cons: More work for users

**Your Decision**: _____________________

**Initial Release**: _____________________

**Future Additions**: _____________________

---

### 5. Streaming & Real-time Transport

**Decision**: How should we handle real-time AI response streaming?

Current implementation uses Socket.io for streaming responses.

**Your Choice**:
- [ ] **Option A**: Require Socket.io
  - Pros: Matches current code, bidirectional
  - Cons: Infrastructure requirement

- [ ] **Option B**: Support multiple transports (Socket.io, SSE, HTTP streaming)
  - Pros: Flexible
  - Cons: More complexity

- [ ] **Option C**: Non-streaming only
  - Pros: Simpler
  - Cons: Worse UX for long responses

- [ ] **Option D**: Streaming optional, support both

**Your Decision**: _____________________

**If streaming, preferred transport**: _____________________

**Fallback for non-streaming environments**: _____________________

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
- **Streaming**: _____________________
- **AI Providers**: _____________________

### Package Scope
- **Scope**: _____________________
- **Core Package Name**: _____________________

### Features
- **Task System**: _____________________
- **Message Types**: _____________________
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
