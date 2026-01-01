# DownPat Codebase - Quick Reference Guide

## Directory Structure Overview

```
.DownPatNode/
├── apps/
│   ├── server/          # Backend Express application
│   │   └── src/
│   │       ├── adapters/       # AI provider integrations
│   │       ├── services/       # Business logic layer
│   │       ├── stores/         # Data access layer (Firebase)
│   │       ├── helpers/        # Domain utilities
│   │       ├── permissions/    # Authorization logic
│   │       ├── utils/          # General utilities
│   │       ├── errors/         # Error classes
│   │       ├── email/          # Email templates
│   │       ├── logging/        # Winston logger
│   │       ├── __tests__/      # Backend tests
│   │       ├── server.ts       # Express setup
│   │       ├── socket-provider.ts  # Socket.io setup
│   │       ├── firebase.ts     # Firebase Admin init
│   │       └── bootstrap.ts    # App entry point
│   │
│   └── web/             # Frontend React application
│       └── src/
│           ├── api/            # API integration (React Query)
│           ├── components/     # React components
│           ├── sections/       # Large page sections
│           ├── layout/         # Layout wrappers
│           ├── providers/      # Context providers
│           ├── config/         # App configuration
│           ├── data/           # Static data
│           ├── themes/         # Generated CSS themes
│           ├── __tests__/      # Frontend tests
│           ├── App.tsx         # Main app component
│           └── index.tsx       # React entry point
│
└── libs/
    ├── shared/          # Shared code (models, constants, utils)
    │   └── src/lib/
    │       ├── models/         # TypeScript classes
    │       ├── constants/      # Enums and constants
    │       ├── validations/    # Zod schemas
    │       ├── themes/         # Theme system
    │       ├── utils/          # Shared utilities
    │       ├── responses/      # API response types
    │       ├── requests/       # API request types
    │       └── tailwind/       # Tailwind config
    │
    └── ui/              # Reusable UI components
        └── src/lib/
            ├── ui/             # 34 React components
            ├── form/           # Form components
            ├── hooks/          # Custom hooks
            ├── pallette/       # Color utilities
            ├── assets/         # SVG icons
            └── .storybook/     # Storybook config
```

---

## Critical Files for Open Source Extraction

### Core Models (libs/shared)

#### Exercise System
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `models/exercises/exercise.ts` | Main Exercise class | ✅ KEEP |
| `models/exercises/exercise-version.ts` | Version management | ❓ DECIDE |
| `models/exercises/exercise-metadata.ts` | Version metadata | ❓ DECIDE |
| `models/exercises/exercise-description.ts` | Exercise descriptions | ✅ KEEP |
| `models/exercises/meta-exercise.ts` | Exercise with metadata | ✅ KEEP |

#### Conversation System
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `models/conversation.ts` | Conversation class | ✅ KEEP |
| `models/conversation-history.ts` | History wrapper | ✅ KEEP |
| `models/conversation-token.ts` | Pagination token | ✅ KEEP |

#### Message System
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `models/messages/message.ts` | Base Message class | ✅ KEEP |
| `models/messages/server-message.ts` | ServerMessage with streaming | ✅ KEEP |
| `constants/message-types.ts` | MessageType enum | ✅ KEEP |

#### Task System
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `models/tasks/task.ts` | Task interface | ✅ KEEP |
| `models/tasks/conversation-task.ts` | One-on-one conversation | ✅ KEEP |
| `models/tasks/commentary-task.ts` | With feedback/grading | ✅ KEEP |
| `models/tasks/summary-task.ts` | End summary | ✅ KEEP |
| `models/tasks/extract-task.ts` | Extract key points | ❓ DECIDE |
| `models/tasks/simulate-task.ts` | Simulation scenarios | ❓ DECIDE |

#### Other Core Models
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `models/example.ts` | Exercise examples | ❓ DECIDE |
| `models/starter.ts` | Starter prompts | ✅ KEEP |
| `models/demo-link.ts` | Demo/anonymous access | ✅ KEEP |
| `models/rating.ts` | Message ratings (thumbs) | ✅ KEEP |
| `models/book.ts` | Book resources | ❌ DROP |

#### User & Organization (Simplified)
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `models/meta-user.ts` | User with metadata | ⚠️ SIMPLIFY |
| `models/organization.ts` | Organization config | ⚠️ SIMPLIFY |
| `models/public-organization.ts` | Public org data | ⚠️ SIMPLIFY |
| `models/meta-organization.ts` | Org with metadata | ⚠️ SIMPLIFY |
| `models/organization-file.ts` | File uploads | ❌ DROP |

#### Payment/Subscription (Drop All)
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `models/subscription/*.ts` | All subscription models | ❌ DROP |

#### Waitlist (Drop All)
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `models/creator-waitlist.ts` | Creator waitlist | ❌ DROP |
| `models/user-waitlist.ts` | User waitlist | ❌ DROP |

#### Constants
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `constants/exercise-types.ts` | Exercise type enum | ✅ KEEP |
| `constants/message-types.ts` | Message type enum | ✅ KEEP |
| `constants/supported-models.ts` | LLM model enum | ✅ KEEP |
| `constants/thumbs.ts` | Rating types | ✅ KEEP |
| `constants/subdomains.ts` | Org subdomains | ❌ DROP |
| `constants/strings/` | UI text strings | ⚠️ REVIEW |

#### Validations
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `validations/exercise.ts` | Exercise validation | ✅ KEEP |
| `validations/chat.ts` | Chat validation | ✅ KEEP |
| `validations/exercise-description.ts` | Description validation | ✅ KEEP |
| `validations/demo-link.ts` | Demo link validation | ✅ KEEP |
| `validations/user.ts` | User validation | ⚠️ SIMPLIFY |
| `validations/auth.ts` | Auth validation | ⚠️ ADAPT |
| `validations/feedback.ts` | Feedback validation | ❌ DROP |

#### Utilities
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `utils/uuid-util.ts` | UUID generation | ✅ KEEP |
| `utils/subdomain-util.ts` | Subdomain parsing | ❌ DROP |
| `utils/user-util.ts` | User utilities | ⚠️ REVIEW |

#### Theme System
| Directory | Purpose | Keep/Drop |
|-----------|---------|-----------|
| `themes/types/` | Theme TypeScript types | ❓ DECIDE |
| `themes/defaults/` | Theme factory & colors | ❓ DECIDE |
| `themes/configs/` | 19 org-specific themes | ⚠️ SIMPLIFY TO 1 |

---

### Backend Server (apps/server)

#### AI Adapters (Keep)
| File | Purpose | Lines | Keep/Drop |
|------|---------|-------|-----------|
| `adapters/adapter-interface.ts` | Adapter contract | 70 | ✅ KEEP |
| `adapters/adapter-factory.ts` | Factory pattern | ~100 | ✅ KEEP |
| `adapters/adapter-util.ts` | Shared utilities | ~200 | ✅ KEEP |
| `adapters/openai-adapter.ts` | OpenAI integration | ~400 | ✅ KEEP |
| `adapters/anthropic-adapter.ts` | Claude integration | ~400 | ✅ KEEP |
| `adapters/gemini-adapter.ts` | Gemini integration | ~400 | ❓ DECIDE |
| `adapters/groq-adapter.ts` | Groq integration | ~400 | ❓ DECIDE |
| `adapters/moderation-adapter.ts` | Content moderation | ~150 | ❓ DECIDE |

#### Services (Core Business Logic)
| File | Purpose | Lines | Keep/Drop |
|------|---------|-------|-----------|
| `services/conversation-service.ts` | Conversation logic (includes text-based coach) | 1400+ | ✅ KEEP (refactor) |
| `services/exercise-service.ts` | Exercise management | ~600 | ✅ KEEP (refactor) |
| `services/admin-service.ts` | Admin operations | ~400 | ⚠️ ADAPT |
| `services/user-service.ts` | User management | ~300 | ⚠️ ADAPT |
| `services/subscription-service.ts` | Subscription logic | ~500 | ❌ DROP |
| `services/organization-service.ts` | Org management | ~400 | ⚠️ SIMPLIFY |
| `services/live-service.ts` | Live/voice chat | ~300 | ❌ DROP (voice only) |
| `services/exercise-description-service.ts` | Descriptions | ~200 | ✅ KEEP |
| `services/waitlist-service.ts` | Waitlist | ~200 | ❌ DROP |

#### Stores (Firebase Integration)
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `stores/conversation-store.ts` | Conversation CRUD | ✅ KEEP |
| `stores/exercise-store.ts` | Exercise CRUD | ✅ KEEP |
| `stores/example-store.ts` | Examples CRUD | ❓ DECIDE |
| `stores/demo-store.ts` | Demo links CRUD | ✅ KEEP |
| `stores/exercise-description-store.ts` | Descriptions | ✅ KEEP |
| `stores/user-store.ts` | User CRUD | ⚠️ ADAPT |
| `stores/organization-store.ts` | Org CRUD | ⚠️ SIMPLIFY |
| `stores/admin-store.ts` | Admin config | ⚠️ ADAPT |
| `stores/payment-store.ts` | Payments | ❌ DROP |
| `stores/team-store.ts` | Teams | ❌ DROP |
| `stores/user-waitlist-store.ts` | User waitlist | ❌ DROP |
| `stores/creator-waitlist-store.ts` | Creator waitlist | ❌ DROP |
| `stores/feedback-store.ts` | Feedback | ❌ DROP |
| `stores/live-store.ts` | Live chat | ❌ DROP |
| `stores/cloud-storage-store.ts` | File uploads | ❌ DROP |

#### Helpers
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `helpers/conversation-helper.ts` | Conversation utilities | ✅ KEEP |
| `helpers/exercise-helper.ts` | Exercise utilities | ✅ KEEP |
| `helpers/exercise-metadata-helper.ts` | Metadata utilities | ❓ DECIDE |
| `helpers/demo-helper.ts` | Demo utilities | ✅ KEEP |
| `helpers/exercise-description-helper.ts` | Description utilities | ✅ KEEP |
| `helpers/user-helper.ts` | User utilities | ⚠️ ADAPT |
| `helpers/organization-helper.ts` | Org utilities | ⚠️ SIMPLIFY |
| `helpers/meta-user-helper.ts` | Meta user utilities | ⚠️ ADAPT |
| `helpers/creator-waitlist-helper.ts` | Waitlist utilities | ❌ DROP |

#### Permissions
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `permissions/gatekeeper.ts` | Authorization checks | ⚠️ ADAPT |

#### Utils
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `utils/authorization-util.ts` | Firebase token verification | ⚠️ ADAPT |
| `utils/validation-util.ts` | Data validation | ✅ KEEP |
| `utils/message-util.ts` | Message processing | ✅ KEEP |
| `utils/subscription-util.ts` | Subscription logic | ❌ DROP |
| `utils/error-handler.ts` | Error handling | ✅ KEEP |

#### Core Server Files
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `server.ts` | Express setup & routes | ⚠️ REFACTOR |
| `socket-provider.ts` | Socket.io setup | ✅ KEEP |
| `firebase.ts` | Firebase Admin init | ✅ KEEP |
| `bootstrap.ts` | App entry point | ⚠️ REFACTOR |
| `logging/logger.ts` | Winston logger | ✅ KEEP |
| `errors/*.ts` | Error classes | ✅ KEEP |
| `email/*.ts` | Email templates | ❌ DROP |

---

### Frontend Web (apps/web)

#### API Integration (React Query)
| Directory | Purpose | Keep/Drop |
|-----------|---------|-----------|
| `api/chat/` | Chat queries & mutations | ✅ KEEP |
| `api/exercises/` | Exercise APIs | ✅ KEEP |
| `api/demo/` | Demo link APIs | ✅ KEEP |
| `api/user/` | User APIs | ⚠️ ADAPT |
| `api/organization/` | Org APIs | ⚠️ SIMPLIFY |
| `api/payments/` | Payment APIs | ❌ DROP |
| `api/signup/` | Signup APIs | ⚠️ ADAPT |
| `api/waitlist/` | Waitlist APIs | ❌ DROP |
| `api/jobs/` | Job APIs | ❌ DROP |
| `api/organization-files/` | File upload APIs | ❌ DROP |

#### Components - Chat (Keep)
| Directory/File | Purpose | Keep/Drop |
|----------------|---------|-----------|
| `components/chat/messages/ChatMessages.tsx` | Message container | ✅ KEEP |
| `components/chat/messages/ChatMessage.tsx` | Message wrapper | ✅ KEEP |
| `components/chat/messages/types/UserMessage.tsx` | User message | ✅ KEEP |
| `components/chat/messages/types/PartnerMessage.tsx` | AI response | ✅ KEEP |
| `components/chat/messages/types/CoachMessage.tsx` | Coach message | ✅ KEEP |
| `components/chat/messages/types/SummaryMessage.tsx` | Summary | ✅ KEEP |
| `components/chat/messages/types/CommentaryMessage.tsx` | Commentary | ✅ KEEP |
| `components/chat/messages/types/ExtractMessage.tsx` | Extract | ❓ DECIDE |
| `components/chat/messages/types/ContextMessage.tsx` | Context | ✅ KEEP |
| `components/chat/messages/types/ModerationMessage.tsx` | Moderation | ❓ DECIDE |
| `components/chat/messages/actions/ChatActions.tsx` | Action buttons | ✅ KEEP |
| `components/chat/messages/actions/ChatRating.tsx` | Rate message | ✅ KEEP |
| `components/chat/messages/actions/ChatRegenerate.tsx` | Regenerate | ✅ KEEP |
| `components/chat/messages/actions/ChatReport.tsx` | Report | ✅ KEEP |
| `components/chat/messages/actions/ChatEdit.tsx` | Edit message | ✅ KEEP |
| `components/chat/messages/actions/ChatFeedback.tsx` | Feedback | ❓ DECIDE |

#### Components - Exercise (Keep)
| File | Purpose | Keep/Drop |
|------|---------|-----------|
| `components/exercise/CreateExercise.tsx` | Exercise builder | ✅ KEEP |
| `components/exercise/EditStarters.tsx` | Starter editor | ✅ KEEP |
| `components/exercise/ExerciseCard.tsx` | Exercise card | ✅ KEEP |
| `components/exercise/partials/TableOfContents.tsx` | TOC | ✅ KEEP |

#### Components - Other
| Directory | Purpose | Keep/Drop |
|-----------|---------|-----------|
| `components/demo-link/` | Demo link UI | ✅ KEEP |
| `components/chat/CoachWindow.tsx` | Text-based coach sidebar | ✅ KEEP |
| `components/auth/` | Auth UI | ⚠️ ADAPT |
| `components/navigation/` | Nav components | ⚠️ ADAPT |
| `components/user/` | User profile | ⚠️ ADAPT |
| `components/organization/` | Org settings | ⚠️ SIMPLIFY |
| `components/payments/` | Payment UI | ❌ DROP |
| `components/live/` | **Voice chat** (audio/microphone) | ❌ DROP |
| `components/team/` | Team management | ❌ DROP |
| `components/smart-banner/` | Mobile banner | ❌ DROP |
| `components/jobs/` | Job listings | ❌ DROP |
| `components/onboarding/` | Onboarding | ❌ DROP |
| `components/landing/` | Landing pages | ❌ DROP |
| `components/security/` | Security settings | ❌ DROP |
| `components/file-upload/` | File uploads | ❌ DROP |
| `components/errors/` | Error pages | ✅ KEEP |
| `components/home/` | Dashboard | ⚠️ ADAPT |

#### Pages
| Directory | Purpose | Keep/Drop |
|-----------|---------|-----------|
| `components/pages/PageChat.tsx` | Chat page (includes text coach) | ✅ KEEP |
| `components/pages/PageCreateExercise.tsx` | Create exercise | ✅ KEEP |
| `components/pages/PageEditExercise.tsx` | Edit exercise | ✅ KEEP |
| `components/pages/PageCreatorDashboard.tsx` | Admin dashboard | ⚠️ ADAPT |
| `components/pages/PageExercises.tsx` | Exercise list | ✅ KEEP |
| `components/pages/PageCreateDemoLink.tsx` | Demo link gen | ✅ KEEP |
| `components/pages/PageLiveChat.tsx` | **Voice chat page** | ❌ DROP |
| `components/pages/PageLiveChatV2.tsx` | **Voice chat page v2** | ❌ DROP |
| Most other pages | Various | ❌ DROP |

#### Providers
| Directory | Purpose | Keep/Drop |
|-----------|---------|-----------|
| `providers/auth/` | Auth context | ⚠️ ADAPT |
| `providers/socket/` | Socket.io context | ✅ KEEP |
| `providers/query/` | React Query setup | ✅ KEEP |
| `providers/theme/` | Theme context | ❓ DECIDE |
| `providers/http/` | Axios setup | ✅ KEEP |

#### Sections
| Directory | Purpose | Keep/Drop |
|-----------|---------|-----------|
| `sections/chat/` | Chat sections | ✅ KEEP |
| `sections/exercise/` | Exercise sections | ✅ KEEP |
| `sections/home/` | Dashboard | ⚠️ ADAPT |
| `sections/account/` | Account | ⚠️ ADAPT |
| `sections/payments/` | Payments | ❌ DROP |
| `sections/organization/` | Org settings | ⚠️ SIMPLIFY |
| `sections/team/` | Team | ❌ DROP |
| Most others | Various | ❌ DROP |

---

### UI Library (libs/ui)

All 34 components in `libs/ui/src/lib/ui/` should be **evaluated individually**:

**Definitely Keep** (Core conversation UI):
- UiButton
- UiCard
- UiDialog
- UiLabel
- UiTextInput
- UiTextarea
- UiToast/UiToaster
- UiScrollArea

**Probably Keep** (Admin/forms):
- UiAccordion
- UiCheckbox
- UiSelect
- UiTabs
- UiDropdownMenu
- UiPopover

**Maybe Keep** (Nice-to-have):
- UiAvatar
- UiTooltip
- UiSkeleton
- UiSeparator
- UiChip
- UiImage
- UiLink
- UiModal
- UiSheet
- UiTable

**Can Drop** (Not needed):
- UiCarousel (probably not needed)
- UiCollapsible (can use Accordion)
- UiHoverCard (not essential)
- UiPagination (if not needed)
- UiPasswordInput (host app handles auth)
- UiProgress (not essential)
- UiSwitch/UiToggle/UiToggleGroup (if not used)
- UiRadioGroup (if not used)

---

## Key Code Patterns

### Service → Store Pattern

```typescript
// Service (business logic)
class ConversationService {
  constructor(conversationStore: ConversationStore) {
    this.conversationStore = conversationStore;
  }

  async getConversation(id: string) {
    const convoHelper = await this.conversationStore.getConversation(id);
    // Business logic here
    return convoHelper.getConversation();
  }
}

// Store (data access)
class ConversationStore {
  constructor() {
    this.db = admin.firestore().collection('conversations');
  }

  async getConversation(id: string) {
    const doc = await this.db.doc(id).get();
    return ConversationHelper.fromJson(doc.data());
  }
}
```

### Helper Pattern

```typescript
// Helpers wrap models and provide transformation logic
class ConversationHelper {
  private conversation: Conversation;

  constructor(conversation: Conversation) {
    this.conversation = conversation;
  }

  static fromJson(json: any): ConversationHelper {
    return new ConversationHelper(
      new Conversation(/* parse json */)
    );
  }

  getConversation(): Conversation {
    return this.conversation;
  }

  toJson(): any {
    return JSON.parse(JSON.stringify(this.conversation));
  }
}
```

### React Query Pattern

```typescript
// Query
export const useGetExercise = (exerciseId: string) => {
  return useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => getExercise(exerciseId),
  });
};

// Mutation
export const useCreateExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      queryClient.invalidateQueries(['exercises']);
    },
  });
};
```

---

## Priority Files for Initial Extraction

### Phase 1: Core Models (Start Here)
1. `libs/shared/src/lib/models/exercises/exercise.ts`
2. `libs/shared/src/lib/models/tasks/*.ts`
3. `libs/shared/src/lib/models/conversation.ts`
4. `libs/shared/src/lib/models/messages/*.ts`
5. `libs/shared/src/lib/constants/message-types.ts`
6. `libs/shared/src/lib/constants/supported-models.ts`

### Phase 2: AI Integration
7. `apps/server/src/adapters/adapter-interface.ts`
8. `apps/server/src/adapters/adapter-factory.ts`
9. `apps/server/src/adapters/openai-adapter.ts`
10. `apps/server/src/adapters/anthropic-adapter.ts`

### Phase 3: Storage Layer
11. `apps/server/src/firebase.ts`
12. `apps/server/src/stores/conversation-store.ts`
13. `apps/server/src/stores/exercise-store.ts`
14. `apps/server/src/helpers/conversation-helper.ts`
15. `apps/server/src/helpers/exercise-helper.ts`

### Phase 4: Business Logic
16. `apps/server/src/services/conversation-service.ts`
17. `apps/server/src/services/exercise-service.ts`
18. `apps/server/src/socket-provider.ts`

### Phase 5: UI Components
19. `apps/web/src/components/chat/messages/ChatMessages.tsx`
20. `apps/web/src/components/chat/messages/types/*.tsx`
21. `apps/web/src/components/exercise/CreateExercise.tsx`
22. `libs/ui/src/lib/ui/` (select components)

---

## Testing Files to Reference

### Backend Tests
- `apps/server/src/__tests__/services/conversation-service.test.ts` - Examples of testing conversation logic
- `apps/server/src/__tests__/stores/conversation-store.test.ts` - Examples of testing Firebase integration
- `apps/server/src/__tests__/adapters/` - Examples of testing AI adapters (if exists)

### Frontend Tests
- `apps/web/src/__tests__/api/exercises/exerciseQueries.spec.tsx` - API testing examples
- `apps/web/src/__tests__/components/` - Component testing examples

---

## Configuration Files to Review

- `package.json` - Dependencies to keep/drop
- `tsconfig.base.json` - TypeScript config
- `nx.json` - NX configuration (may not need in new structure)
- `jest.config.cjs` - Jest setup
- `.env` - Environment variables (note what's needed)

---

## Notes

- **Lines of code** are approximate estimates
- **Keep/Drop** decisions are recommendations, pending answers to spec questions
- **⚠️ ADAPT** means significantly modify for new architecture
- **❓ DECIDE** means needs explicit decision before proceeding

---

This reference should help navigate the codebase during extraction and refactoring work.
