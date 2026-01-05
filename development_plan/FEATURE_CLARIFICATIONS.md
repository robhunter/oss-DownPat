# Feature Clarifications

This document clarifies specific features that may be confusing due to similar naming.

## "Talk to Coach" vs "Live Chat"

The Exercise model has two boolean flags that sound similar but are completely different features:

### ✅ KEEP: Talk to Coach (`talkToCoachEnabled`)

**What it is:**
- Text-based chat sidebar/window that appears alongside the main exercise
- Users can ask questions to an AI coach while practicing
- Separate conversation thread from the main exercise conversation
- Coach provides guidance, answers questions, explains concepts

**Configuration** (stored at Organization level):
- `talkToCoachPrompt`: System prompt that defines coach behavior
- `talkToCoachRole`: Display name for the coach (e.g., "Coach", "Mentor", "Guide")
- `talkToCoachStarter`: Initial greeting message from coach

**Implementation:**
- Component: `CoachWindow.tsx` and `CoachChatSection.tsx`
- Uses regular text-based Socket.io messaging
- Separate message store from main conversation
- Toggle-able (user can open/close the coach window)

**Example Use Case:**
```
Main Exercise:
[USER]: I'm not sure how to phrase this feedback
[CONVERSATION]: Try using "I" statements...

Coach Window (separate):
[USER]: What are "I" statements?
[COACH]: "I" statements express your feelings without blame.
         For example, "I feel frustrated when..." instead of
         "You always..."
```

**Why Keep:**
- Valuable feature for providing additional support during exercises
- Text-based, no special infrastructure needed
- Enhances learning experience
- Not tied to mobile or voice

---

### ❌ DROP: Live Chat (`liveChatEnabled`)

**What it is:**
- Real-time voice/audio chat functionality
- Uses microphone for voice input
- Real-time audio streaming to AI
- Real-time speech transcription
- Audio playback of AI responses

**Implementation:**
- Components: `PageLiveChat.tsx`, `PageLiveChatV2.tsx`, `LiveChatBase.tsx`, `LiveChatWindow.tsx`
- Uses Gemini API's audio streaming capabilities
- Requires WebRTC, audio worklets, microphone permissions
- Audio processing with AudioContext API
- Related files: `audioUtils.ts`, `geminiClient.ts`

**Why Drop:**
- Significantly more complex than text-based chat
- Requires real-time audio infrastructure
- Browser compatibility challenges
- Microphone permission handling
- Not core to the educational conversation pattern
- Can be added later if needed

---

## Related Features to Clarify

### Exercise.liveChatEnabled vs "Live Service"

These are **related but separate**:

- **`Exercise.liveChatEnabled`**: Feature flag on exercises for voice chat (DROP)
- **`LiveService`** (in `services/live-service.ts`): Backend service for live chat functionality (DROP)
- **`LiveStore`** (in `stores/live-store.ts`): Data store for live chat (DROP)

All "live" related code should be dropped - it's all part of the real-time voice chat system.

---

## What to Keep vs Drop - Summary Table

| Feature | Flag/Property | Keep/Drop | Reason |
|---------|--------------|-----------|---------|
| Text-based coach sidebar | `talkToCoachEnabled` | ✅ KEEP | Valuable learning support, simple text-based |
| Coach configuration | `talkToCoachPrompt`, `talkToCoachRole`, `talkToCoachStarter` | ✅ KEEP | Required for coach feature |
| Real-time voice chat | `liveChatEnabled` | ❌ DROP | Complex, not core, can add later |
| Live service & store | `LiveService`, `LiveStore` | ❌ DROP | Part of voice chat system |
| Coach window UI | `CoachWindow.tsx`, `CoachChatSection.tsx` | ✅ KEEP | UI for text-based coach |
| Live chat UI | `PageLiveChat.tsx`, etc. | ❌ DROP | UI for voice chat |
| Audio utilities | `audioUtils.ts`, `geminiClient.ts` | ❌ DROP | Only needed for voice |

---

## Code Locations

### Talk to Coach (KEEP)

**Models:**
- `libs/shared/src/lib/models/exercises/exercise.ts` - `talkToCoachEnabled` flag
- `libs/shared/src/lib/models/organization.ts` - Coach configuration properties

**Backend:**
- `apps/server/src/services/conversation-service.ts` - Coach message handling
- Coach messages stored in same conversation but separate thread

**Frontend:**
- `apps/web/src/sections/chat/CoachChatSection.tsx` - Main coach section
- `apps/web/src/components/chat/CoachWindow.tsx` - Coach UI window
- `apps/web/src/api/chat/chatMutations.ts` - `useSendCoachMessage`, `useToggleCoachWindow`
- `apps/web/src/api/chat/chatQueries.ts` - `useGetCoachMessages`

### Live Chat (DROP)

**Models:**
- `libs/shared/src/lib/models/exercises/exercise.ts` - `liveChatEnabled` flag

**Backend:**
- `apps/server/src/services/live-service.ts` - ALL
- `apps/server/src/stores/live-store.ts` - ALL

**Frontend:**
- `apps/web/src/components/pages/PageLiveChat.tsx` - ALL
- `apps/web/src/components/pages/PageLiveChatV2.tsx` - ALL
- `apps/web/src/components/live/LiveChatBase.tsx` - ALL
- `apps/web/src/components/live/LiveChatWindow.tsx` - ALL
- `apps/web/src/components/live/audioUtils.ts` - ALL
- `apps/web/src/components/live/geminiClient.ts` - ALL

---

## Impact on Open Source Packages

### Core Package
- **Keep** `talkToCoachEnabled` in Exercise model
- **Remove** `liveChatEnabled` from Exercise model (or keep as deprecated/unused)

### Conversation Engine
- **Keep** coach message handling logic
- **Remove** live chat/voice integration

### UI Components
- **Include** `CoachWindow` component
- **Exclude** all `LiveChat*` components

### Firebase Storage
- **Keep** coach message storage (same as regular messages with different type)
- **Remove** live chat specific storage

### Example App
- **Demonstrate** talk to coach feature
- **Omit** live chat functionality

---

## Additional Notes

### Message Types for Coach

Coach uses existing message types:
- `MessageType.USER` for user messages to coach
- `MessageType.SIMPLE` or `MessageType.CONVERSATION` for coach responses

No special message types needed - it's just a separate conversation thread.

### Socket.io Usage

Both main exercise conversation and coach conversation use Socket.io for real-time messaging. The coach feature doesn't add any additional transport complexity - it's just another channel.

### Future Voice Support

If voice chat is desired in the future, it can be added as:
- New package: `@downpat-oss/voice-chat` (optional)
- Requires: WebRTC, audio processing, browser APIs
- Integration point: Separate from core conversation engine

---

## Updated Scope for Spec

### In Scope
- ✅ Talk to Coach (text-based sidebar chat)
- ✅ Coach configuration (prompt, role, starter)
- ✅ Coach window UI components
- ✅ Coach message storage and handling

### Out of Scope
- ❌ Live/voice chat (real-time audio)
- ❌ Audio processing utilities
- ❌ Gemini audio API integration
- ❌ Microphone permission handling
- ❌ WebRTC/AudioContext infrastructure
