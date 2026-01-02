# DownPat Open Source Migration - Project Documentation

This directory contains comprehensive documentation and specifications for extracting core functionality from the DownPat legacy codebase and releasing it as open-source npm packages.

## 📚 Documentation Index

### Start Here
1. **[SUMMARY.md](SUMMARY.md)** - Quick overview, critical questions, and key findings
   - Read this first for a high-level understanding
   - Contains the 6 critical questions that must be answered
   - Provides architectural insights and technical highlights

### Deep Dive
2. **[spec.md](spec.md)** - Complete specification with detailed questions
   - Comprehensive analysis of what to build
   - 20 key questions organized by priority
   - Proposed package structure
   - Implementation phases
   - Testing strategy
   - Success criteria

### Technical Details
3. **[CONVERSATION_PATTERNS.md](CONVERSATION_PATTERNS.md)** - Deep dive into conversation patterns
   - Detailed explanation of the task system
   - All conversation patterns with examples
   - Message types and filtering logic
   - Response schema system
   - UI display patterns
   - Implementation notes

4. **[CODE_REFERENCE.md](CODE_REFERENCE.md)** - Quick reference for navigating the codebase
   - Directory structure overview
   - Critical files with keep/drop recommendations
   - Code patterns and examples
   - Priority files for extraction
   - Testing file locations

### Action Items
5. **[NEXT_STEPS.md](NEXT_STEPS.md)** - Decision checklist and action plan
   - Step-by-step decision checklist
   - All decisions organized by priority
   - Decision summary template
   - Next actions after decisions are made

## 🎯 What We're Building

We're creating a set of open-source npm packages that enable developers to build AI-powered conversational training and practice applications. Core features:

- **Exercise Creation**: Define AI-powered conversational exercises with various patterns
- **Conversation Patterns**:
  - Simple one-on-one conversations
  - Conversations with real-time coaching/commentary
  - Conversations with end summaries
  - Simulation scenarios
- **Admin Interface**: UI for creating and managing exercises
- **User Interface**: Conversation UI components
- **Anonymous Access**: Demo/public sharing functionality
- **Multi-AI Support**: OpenAI, Anthropic, Gemini (dynamic availability)

## 📦 Proposed Package Structure

```
@downpat-oss/
├── core                 # Types, constants, controllers (framework-agnostic)
├── exercise-manager     # Exercise creation and management
├── conversation-engine  # Conversation logic and AI adapters
├── firebase-storage     # Firebase implementation (recommended storage)
├── express              # Express integration (HTTP routes + Socket.io)
├── ui-components        # React conversation UI components
├── admin-ui            # React admin UI components
└── example-app         # Reference implementation
```

## 🚀 Quick Start (For Implementation)

### Phase 0: Decision Making (Current)
1. Read [SUMMARY.md](SUMMARY.md)
2. Review critical questions
3. Work through [NEXT_STEPS.md](NEXT_STEPS.md) checklist
4. Make all critical decisions
5. Document decisions in NEXT_STEPS.md

### Phase 1: Planning
1. Update [spec.md](spec.md) with final decisions
2. Create detailed package specifications
3. Set up repository structure
4. Configure build tools and CI/CD

### Phase 2+: Implementation
See [spec.md](spec.md) for detailed implementation phases

## ⚠️ Critical Decisions

Before implementation can begin, these 6 critical questions must be answered:

1. ✅ **Storage Architecture**: Storage abstraction with Firebase as official implementation
2. ✅ **Authentication Pattern**: Token-based (client provides tokens, server validates)
3. ✅ **"Schema Step" Clarification**: Drop ExtractTask (structured data extraction to PDF)
4. ✅ **AI Provider Support**: OpenAI, Anthropic, Gemini (dynamic availability based on configured keys)
5. ✅ **Streaming & Transport**: Socket.io required, Express integration with controller pattern
6. ⏳ **Package Scope**: What npm scope/naming to use?

See [SUMMARY.md](SUMMARY.md) for details on each question and [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) for the complete authentication guide.

## 📋 What's In vs Out

### ✅ In Scope
- Exercise creation & management
- Multiple conversation patterns (conversation, commentary, summary)
- AI integration (adapter pattern for multiple providers)
- Firebase/Firestore storage
- Demo/anonymous access
- Admin UI for exercise management
- User-facing conversation UI
- Theming/customization
- React components library

### ❌ Out of Scope (Dropping)
- Payment/Stripe integration
- Mobile support (SmartBanner, mobile-specific code)
- Multi-tenant subdomain system
- Email notifications
- Waitlist management
- Team management
- **Real-time voice/audio chat** (liveChatEnabled - microphone-based voice chat)
  - ⚠️ **KEEPING**: Text-based "Talk to Coach" sidebar (talkToCoachEnabled)
- Job listings
- File uploads
- **ExtractTask/Schema extraction** (structured data extraction to PDF templates)

## 🏗️ Current Codebase Structure

The legacy codebase is located in `.DownPatNode/` directory:

```
.DownPatNode/
├── apps/
│   ├── server/          # Express backend
│   │   └── src/
│   │       ├── adapters/      # AI provider integrations
│   │       ├── services/      # Business logic
│   │       ├── stores/        # Firebase data access
│   │       ├── helpers/       # Domain utilities
│   │       └── permissions/   # Authorization
│   │
│   └── web/             # React frontend
│       └── src/
│           ├── api/           # React Query integration
│           ├── components/    # UI components
│           ├── providers/     # Context providers
│           └── sections/      # Page sections
│
└── libs/
    ├── shared/          # Models, constants, validations
    └── ui/              # Reusable UI component library
```

See [CODE_REFERENCE.md](CODE_REFERENCE.md) for detailed file-by-file breakdown.

## 🔑 Key Technical Insights

### Conversation Flow
```
User Input
  → Conversation Service
  → Task Execution
  → AI Adapter
  → Streaming Response
  → Firestore Storage
```

### Task System
Exercises define tasks that execute at different points:
- **Continuation Tasks**: After each user message
- **Completion Tasks**: When max messages reached
- **Simulation Tasks**: For role-reversal scenarios

Each task specifies:
- Response type (conversation, commentary, summary, etc.)
- AI role and prompt
- Message filters (what history to show AI)
- Response schema (structured output format)

### Message Types
- **USER**: User input
- **CONVERSATION**: AI conversational response
- **COMMENTARY**: AI coaching/feedback
- **SUMMARY**: End-of-conversation summary
- **STARTER**: Initial conversation prompt
- **CONTEXT**: Background information
- And more...

See [CONVERSATION_PATTERNS.md](CONVERSATION_PATTERNS.md) for comprehensive details.

## 🧪 Testing Strategy

### Packages
- **Unit tests**: 80%+ coverage for core logic
- **Integration tests**: Package interactions
- **Component tests**: UI components with React Testing Library
- **Visual regression**: Storybook + Chromatic (optional)

### Example App
- **Unit tests**: Business logic
- **Integration tests**: Full flows
- **E2E tests**: Critical user paths (Playwright)

## 📖 Documentation Requirements

Each package will include:
- README with installation and quick start
- API documentation (TSDoc)
- Usage examples
- CHANGELOG

Overall project will have:
- Getting started guide
- Architecture overview
- Integration guides
- Best practices
- API reference

## 🤝 Next Steps

1. **Review** [SUMMARY.md](SUMMARY.md) and [spec.md](spec.md)
2. **Answer** critical questions in [NEXT_STEPS.md](NEXT_STEPS.md)
3. **Discuss** any concerns or additional considerations
4. **Decide** on high and medium priority questions
5. **Begin** implementation once decisions are finalized

## 📞 Questions?

If you need clarification on:
- **Architecture decisions**: See [spec.md](spec.md)
- **Conversation patterns**: See [CONVERSATION_PATTERNS.md](CONVERSATION_PATTERNS.md)
- **Codebase navigation**: See [CODE_REFERENCE.md](CODE_REFERENCE.md)
- **What to do next**: See [NEXT_STEPS.md](NEXT_STEPS.md)

## 📂 Document Purposes

| Document | Purpose | When to Read |
|----------|---------|--------------|
| README.md (this file) | Overview and navigation | Start here |
| SUMMARY.md | Quick overview and critical questions | First read |
| spec.md | Complete specification | Detailed planning |
| CONVERSATION_PATTERNS.md | Deep dive on conversation features | Understanding core functionality |
| CODE_REFERENCE.md | Navigate legacy codebase | During implementation |
| NEXT_STEPS.md | Decision checklist | Making architectural decisions |

## 🎓 Understanding the Legacy System

The DownPat platform's core innovation is its **task-based conversation system** that enables:

1. **Educational Conversations**: Not just chatbots, but structured learning experiences
2. **Real-time Coaching**: AI provides feedback as users practice
3. **Structured Assessment**: Grading and summary based on performance
4. **Flexible Patterns**: Different interaction modes for different learning goals
5. **Multi-AI Support**: Works with various LLM providers

This system is particularly valuable for:
- Sales training (practice pitches, objection handling)
- Management training (difficult conversations, feedback)
- Customer service training (handling complaints, de-escalation)
- Interpersonal skills (conflict resolution, negotiation)
- Any domain where practice with feedback improves performance

## ✨ Key Design Principles for Open Source Version

1. **Flexibility**: Support different auth providers, storage backends, UI frameworks
2. **Simplicity**: Start with single-tenant, drop unnecessary features
3. **Modularity**: Packages can be used independently
4. **Developer Experience**: Clear APIs, good documentation, helpful errors
5. **Testing**: Comprehensive tests for reliability
6. **Security**: Guide users on best practices, secure defaults

## 🎯 Success Metrics

The open source version will be successful if it:
- ✅ Enables developers to create conversational training apps
- ✅ Works with their choice of auth and hosting
- ✅ Provides excellent documentation and examples
- ✅ Has comprehensive test coverage
- ✅ Is easy to customize and extend
- ✅ Maintains security best practices

---

**Ready to begin?** Start with [SUMMARY.md](SUMMARY.md) and work through [NEXT_STEPS.md](NEXT_STEPS.md)!
