# DownPat Conversation Patterns - Detailed Analysis

## Overview

The DownPat platform supports multiple conversation patterns through its **Task** system. Each exercise can define different types of tasks that execute at different points in the conversation lifecycle.

## Core Concepts

### Task Types

Tasks are defined in the exercise configuration and determine how the AI responds to user messages. Each task specifies:
- **responseType**: What type of message this generates (MessageType enum)
- **role**: The AI's persona/role in this task
- **prompt**: Instructions for the AI
- **messageFilters**: Which message types to filter from history before sending to AI
- **responseSchema**: Expected structure of AI response (JSON schema)
- **includeGuidelines**: Whether to include exercise guidelines in prompt

### Task Execution Points

1. **Continuation Tasks**: Execute after each user message during the conversation
2. **Completion Tasks**: Execute when conversation reaches max messages
3. **Simulation Tasks**: Execute for simulation exercises (user practices responding to AI scenarios)

## Message Types

```typescript
enum MessageType {
  // User-generated messages
  CONTEXT     // Background/context information
  MODERATION  // Content moderation warnings
  STARTER     // Initial prompt/starter message
  USER        // User's input message

  // AI-generated messages (from tasks)
  CONVERSATION // AI partner's conversational response
  COMMENTARY   // AI feedback/coaching commentary
  EXTRACT      // ❌ DROPPING - Structured data extraction to PDF
  SIMPLE       // Simple AI response
  SIMULATE     // AI-generated simulated user message
  SUMMARY      // End-of-conversation summary
}
```

## Pattern 1: Simple One-on-One Conversation

### Configuration
```typescript
Exercise {
  continuationTasks: [
    new ConversationTask(
      role: "Helpful Assistant",
      prompt: "Respond naturally to the user",
      conversationDescription: "Natural conversational response"
    )
  ],
  completionTasks: [],
  simulationTasks: []
}
```

### Behavior
- User sends message
- AI responds with natural conversation
- No feedback or grading
- Continues until max messages reached

### Example Flow
```
[USER]: Hello, I need help with a difficult conversation
[CONVERSATION]: I'd be happy to help you prepare. What's the situation?
[USER]: I need to give feedback to my employee about their performance
[CONVERSATION]: That's an important conversation. What specific concerns do you have?
```

### Task Details: ConversationTask
```typescript
class ConversationTask {
  responseType: MessageType.CONVERSATION
  messageFilters: [MessageType.COMMENTARY, MessageType.SUMMARY]
  responseSchema: {
    conversation: "string description of expected response"
  }
  includeGuidelines: false
}
```

**Key Feature**: Filters out COMMENTARY and SUMMARY messages so AI only sees USER and CONVERSATION messages in history.

---

## Pattern 2: Conversation with Commentary

### Configuration
```typescript
Exercise {
  continuationTasks: [
    new ConversationTask(...),  // First: generate conversation response
    new CommentaryTask(         // Second: provide feedback on user's message
      role: "Coach",
      prompt: "Provide feedback on the user's response",
      commentaryDescription: "Constructive feedback",
      gradeDescription: "Grade from A+ to F"
    )
  ],
  completionTasks: [],
  simulationTasks: []
}
```

### Behavior
- User sends message
- AI generates conversational response
- AI generates commentary/feedback
- Commentary includes grade
- Both messages saved and displayed
- Continues until max messages

### Example Flow
```
[USER]: I think I should tell him "Your work isn't good enough"
[CONVERSATION]: That's direct. How do you think he'll respond to that?
[COMMENTARY]: Consider softer language. Saying "not good enough" can feel like an
              attack. Try focusing on specific behaviors rather than judgments.
              Grade: C+

[USER]: You're right. Maybe I could say "I've noticed some areas for improvement"
[CONVERSATION]: That's better! That opens a dialogue. What specific areas?
[COMMENTARY]: Great improvement! You're focusing on growth rather than criticism.
              This shows you want to help, not punish. Grade: A-
```

### Task Details: CommentaryTask
```typescript
class CommentaryTask {
  responseType: MessageType.COMMENTARY
  messageFilters: [MessageType.SUMMARY]
  responseSchema: {
    commentary: "string description of feedback",
    grade: "string description of grading criteria"
  }
  includeGuidelines: true  // AI sees exercise guidelines when providing feedback
}
```

**Key Feature**: Provides real-time coaching after each user message. UI can display commentary inline or separately.

---

## Pattern 3: Conversation with End Summary

### Configuration
```typescript
Exercise {
  continuationTasks: [
    new ConversationTask(...)  // Just conversation during practice
  ],
  completionTasks: [
    new SummaryTask(           // When max messages reached
      role: "Coach",
      prompt: "Summarize the conversation and provide overall feedback",
      summaryDescription: "Comprehensive summary of what happened",
      gradeDescription: "Overall grade for the conversation"
    )
  ],
  simulationTasks: []
}
```

### Behavior
- User and AI have back-and-forth conversation
- No commentary during conversation
- When max messages reached, AI generates summary
- Summary includes overall grade
- Conversation marked as finished

### Example Flow
```
[USER]: I want to practice asking for a raise
[CONVERSATION]: Great! Let me play your manager. What's your opening?
[USER]: I think I deserve more money
[CONVERSATION]: Okay... why do you think that?
[USER]: I've been here a year and work hard
[CONVERSATION]: Can you be more specific about your accomplishments?
[USER]: I finished the Peterson project ahead of schedule and under budget
[CONVERSATION]: That's a good example. What else?

... (conversation continues until max messages) ...

[SUMMARY]: You showed improvement throughout this practice conversation. Initially,
           you led with what you wanted rather than what you've contributed. By the
           end, you were citing specific accomplishments and quantifiable results.

           Key strengths:
           - Specific examples (Peterson project)
           - Quantifiable results (ahead of schedule, under budget)

           Areas to improve:
           - Lead with value, not demands
           - Prepare 3-5 concrete examples before the conversation
           - Practice discussing your future contributions, not just past work

           Overall Grade: B+

           You're ready for this conversation. Just remember to lead with your
           contributions and stay confident!
```

### Task Details: SummaryTask
```typescript
class SummaryTask {
  responseType: MessageType.SUMMARY
  messageFilters: []  // Sees all messages in conversation
  responseSchema: {
    summary: "string description of what to summarize",
    grade: "string description of grading criteria"
  }
  includeGuidelines: true  // AI sees exercise guidelines when summarizing
}
```

**Key Feature**: Provides holistic feedback at the end. Useful for letting users practice without interruption, then reviewing performance.

---

## Pattern 4: Combined Commentary + Summary

### Configuration
```typescript
Exercise {
  continuationTasks: [
    new ConversationTask(...),
    new CommentaryTask(...)     // Real-time feedback during conversation
  ],
  completionTasks: [
    new SummaryTask(...)         // Overall summary at the end
  ],
  simulationTasks: []
}
```

### Behavior
- Combines patterns 2 and 3
- Real-time commentary after each user message
- Summary with overall grade at the end
- Most comprehensive feedback option

### Use Case
For in-depth training where users benefit from both:
- Immediate correction (commentary)
- Big-picture review (summary)

---

## Pattern 5: Simulation (Reversed Roles)

### Configuration
```typescript
Exercise {
  continuationTasks: [],
  completionTasks: [],
  simulationTasks: [
    new SimulateTask(
      role: "Difficult Customer",
      prompt: "Present a customer service scenario and wait for user's response",
      simulateDescription: "Challenging scenario description"
    )
  ]
}
```

### Behavior
- AI presents scenarios
- User practices responding
- User is the one being evaluated
- Different from conversation where user initiates

### Example Flow
```
[SIMULATE]: You receive a call: "I've been on hold for 20 minutes! This is
            ridiculous! I want to speak to your manager RIGHT NOW!"

[USER]: I understand you're frustrated. I apologize for the wait. How can I
        help you today?

[SIMULATE]: "How can you help? By getting me someone who actually knows what
            they're doing! This is the third time I've called about this!"

[USER]: I can definitely help you with this issue. Can you tell me what's been
        happening so I can make sure we resolve it today?
```

### Task Details: SimulateTask
```typescript
class SimulateTask {
  responseType: MessageType.SIMULATE
  messageFilters: [MessageType.COMMENTARY, MessageType.SUMMARY]
  responseSchema: {
    simulate: "string description of scenario to present"
  }
  includeGuidelines: false
}
```

**Key Feature**: Role reversal - AI drives the scenario, user responds. Good for practicing handling difficult situations.

---

## Advanced Patterns

### Multiple Tasks Per Execution Point

You can have multiple continuation tasks that execute in sequence:

```typescript
continuationTasks: [
  new ConversationTask(...),     // 1. Generate response
  new CommentaryTask(...),       // 2. Provide feedback
  // Note: ExtractTask removed in open source version
]
```

This would generate multiple messages after each user input:
1. Conversational response
2. Commentary/feedback

**Note**: The legacy codebase also had `ExtractTask` for extracting structured data to PDF templates, but this feature is being dropped from the open source version.

### Conditional Task Execution

Tasks can be designed to only execute under certain conditions (this may need custom logic):
- Only provide commentary on certain message numbers
- Only summarize if conversation reached certain depth
- Escalate difficulty in simulations based on user performance

---

## Message Filtering Logic

### Why Message Filtering Matters

When sending conversation history to the AI, we often want to filter what it sees:

**Example**: In a conversation with commentary, if we send ALL messages to the ConversationTask:
```
[USER]: Hello
[CONVERSATION]: Hi there!
[COMMENTARY]: Good start, but could be more enthusiastic. Grade: B
[USER]: How are you?
```

The AI generating the next CONVERSATION response would see its own COMMENTARY, which could be confusing. Instead, we filter:

**What ConversationTask sees**:
```
[USER]: Hello
[CONVERSATION]: Hi there!
[USER]: How are you?
```

**What CommentaryTask sees** (different filter):
```
[USER]: Hello
[CONVERSATION]: Hi there!
[COMMENTARY]: Good start, but could be more enthusiastic. Grade: B
[USER]: How are you?
[CONVERSATION]: (just generated)
```

### Filter Rules

- `ConversationTask`: Filters out COMMENTARY and SUMMARY (sees clean conversation)
- `CommentaryTask`: Filters out SUMMARY (sees conversation + previous commentary)
- `SummaryTask`: No filter (sees everything)
- `SimulateTask`: Filters out COMMENTARY and SUMMARY (clean simulation flow)

---

## Response Schema System

### Purpose

The `responseSchema` field tells the AI what structure to return. This enables:
1. **Structured parsing**: Extract specific fields from AI response
2. **Validation**: Ensure AI returns expected data
3. **Multiple outputs**: Get conversation + grade + metadata in one call
4. **Consistency**: Same schema enforced across all exercises

### Example: Commentary Schema

```typescript
responseSchema: {
  commentary: "Provide constructive feedback on the user's response",
  grade: "Assign a letter grade from A+ to F based on effectiveness"
}
```

AI returns structured JSON:
```json
{
  "commentary": "You made good eye contact and your tone was friendly...",
  "grade": "B+"
}
```

System parses this and creates ServerMessage with:
- `text`: The commentary text
- `grade`: The grade value
- `type`: MessageType.COMMENTARY

### Schema Types

**ConversationSchema**:
```typescript
{ conversation: string }
```

**CommentarySchema**:
```typescript
{
  commentary: string,
  grade: string
}
```

**SummarySchema**:
```typescript
{
  summary: string,
  grade: string
}
```

**ExtractSchema** ❌ DROPPING:
```typescript
// ExtractTask and ExtractSchema being dropped from open source version
// This was used for extracting structured data to PDF templates
{
  extract: string  // or custom schema: Record<string, string>
}
```

**SimulateSchema**:
```typescript
{
  simulate: string
}
```

---

## UI Display Patterns

### Display Commentary Inline

```
┌─────────────────────────────────────────┐
│ [USER AVATAR] You                       │
│ "I think I should tell him his work     │
│  isn't good enough"                     │
│                                         │
│   ┌─ COMMENTARY ─────────────────┐     │
│   │ 🎓 Consider softer language... │     │
│   │ Grade: C+                     │     │
│   └───────────────────────────────┘     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│                    [AI AVATAR] Partner  │
│     "That's direct. How do you think    │
│      he'll respond to that?"            │
└─────────────────────────────────────────┘
```

### Toggle Commentary Visibility

Allow users to hide/show commentary:
```
[Toggle: Show Feedback ☑️]

With feedback shown:
  USER → COMMENTARY → CONVERSATION

With feedback hidden:
  USER → CONVERSATION
```

### Summary as Dialog/Modal

```
┌────────────────────────────────────────┐
│        🎓 Conversation Summary         │
├────────────────────────────────────────┤
│                                        │
│  Grade: B+                             │
│                                        │
│  You showed improvement throughout...  │
│                                        │
│  Key strengths:                        │
│  • Specific examples                   │
│  • Quantifiable results                │
│                                        │
│  Areas to improve:                     │
│  • Lead with value                     │
│  • Prepare examples in advance         │
│                                        │
│         [Practice Again] [Done]        │
└────────────────────────────────────────┘
```

---

## Implementation Notes

### Task Execution Flow

```
User sends message
    ↓
Save to Firestore
    ↓
Fetch Exercise + Conversation History
    ↓
For each continuation task:
    ↓
  Filter messages based on task.messageFilters
    ↓
  Format messages for AI provider
    ↓
  Execute task via adapter.executeTasks()
    ↓
  Parse response using task.responseSchema
    ↓
  Create ServerMessage with appropriate type
    ↓
  Save to Firestore
    ↓
  Stream to client via Socket.io
    ↓
Check if max messages reached
    ↓
If yes, execute completion tasks
    ↓
Mark conversation as finished
```

### Code Location References

**Task Definitions**:
- `.DownPatNode/libs/shared/src/lib/models/tasks/conversation-task.ts`
- `.DownPatNode/libs/shared/src/lib/models/tasks/commentary-task.ts`
- `.DownPatNode/libs/shared/src/lib/models/tasks/summary-task.ts`
- `.DownPatNode/libs/shared/src/lib/models/tasks/simulate-task.ts`
- `.DownPatNode/libs/shared/src/lib/models/tasks/extract-task.ts`

**Task Execution**:
- `.DownPatNode/apps/server/src/services/conversation-service.ts` (executeTasks method)

**Message Rendering**:
- `.DownPatNode/apps/web/src/components/chat/messages/types/`
  - `UserMessage.tsx`
  - `PartnerMessage.tsx` (renders CONVERSATION type)
  - `CommentaryMessage.tsx`
  - `SummaryMessage.tsx`
  - etc.

---

## Decision: ExtractTask ("Schema Step") Dropped ✅

### What's Being Dropped

**ExtractTask** - the "schema step" functionality - has been identified and will be **dropped** from the open source version:

**What ExtractTask Does**:
- Completion task that extracts structured data from conversations into custom schemas
- AI fills in schema fields based on conversation (e.g., `{problemStatement: string, solution: string}`)
- Used for specialized templates like Lean Canvas forms
- Displays as message with download button to export data as PDF
- Constructor: `new ExtractTask(role: string, schema: Record<string, string>)`

**What We're Dropping**:
- `ExtractTask` class (`.DownPatNode/libs/shared/src/lib/models/tasks/extract-task.ts`)
- `MessageType.EXTRACT` message type
- `ExtractMessage` UI component with PDF download
- PDF template system for extracted schemas
- Extract schema parsing in exercise creation

**What We're Keeping**:
- ✅ `responseSchema` for core tasks (ConversationTask, CommentaryTask, SummaryTask)
- ✅ All core conversation patterns unchanged
- ✅ Structured responses for conversation, commentary, and summary

**Rationale**: ExtractTask is specialized for specific use cases (form filling), adds PDF generation complexity, and is not core to conversational training functionality.

---

## Key Takeaways

1. **Flexibility**: Task system allows unlimited pattern combinations
2. **Structured Data**: Response schemas enable rich feedback (grades, metadata)
3. **Message Filtering**: Essential for coherent AI context
4. **UI Customization**: Different display options for different use cases
5. **Extensibility**: New patterns can be created by defining new Task types

This system is the **core value proposition** of DownPat - it's what makes it more than just a chatbot. The ability to provide structured, pedagogical feedback through multiple conversation patterns is unique and valuable for educational/training applications.
