{
  "blockers": [
    {
      "file": "packages/admin-ui/src/index.ts",
      "line_start": 1,
      "line_end": 10,
      "type": "Missing Feature",
      "message": "Promised components are AWOL. Where is `DemoLinkGenerator`? The spec explicitly lists 'Demo link generation' as an essential admin feature.",
      "evidence": "Exports only include ExerciseForm and ExerciseList. Spec required: DemoLinkGenerator.",
      "fix_suggestion": "Implement DemoLinkGenerator component and export it."
    },
    {
      "file": "packages/admin-ui/src/components/ExerciseForm.tsx",
      "line_start": 255,
      "line_end": 316,
      "type": "Data Loss",
      "message": "The TaskEditor ignores `messageFilter`. You went to the trouble of defining it in Core, but Admin UI decided users don't need to configure context windows or message exclusion. Genius.",
      "evidence": "TaskEditor component renders name, responseType, role, and prompt inputs, but completely omits messageFilter fields defined in BaseTask.",
      "fix_suggestion": "Add inputs for `messageFilter` (includeTypes, excludeTypes, maxMessages) to the TaskEditor."
    },
    {
      "file": "packages/admin-ui/src/components/ExerciseForm.tsx",
      "line_start": 286,
      "line_end": 313,
      "type": "Architecture Violation",
      "message": "Hardcoded inline styles? In 2026? The spec specifically requires theming support ('host application needs to be able to provide styling'). This inline garbage is unthemeable.",
      "evidence": "style={{ ...inputStyle, fontWeight: 500, width: '200px' }} ... style={textareaStyle}",
      "fix_suggestion": "Replace inline styles with CSS classes or a proper styling solution that supports the generated theme (e.g. CSS variables defined in ui-components)."
    },
    {
      "file": "packages/admin-ui/src/components/ExerciseForm.tsx",
      "line_start": 26,
      "line_end": 26,
      "type": "Source of Truth Violation",
      "message": "Hardcoded model list contradicts Core and Adapters. Use the platform's configuration, not a magical string array that will inevitably be outdated.",
      "evidence": "DEFAULT_MODELS = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'] vs Core's getAvailableModels()",
      "fix_suggestion": "Remove DEFAULT_MODELS. Require `availableModels` prop. Host app must populate it using `getAvailableModels(config)` from @downpat/core."
    }
  ],
  "nits": [
    {
      "file": "packages/admin-ui/src/components/ExerciseForm.tsx",
      "line_start": 8,
      "line_end": 12,
      "type": "Type Gymnastics",
      "message": "Reinventing the `Task` type wheel because you couldn't figure out how to use the union type in a form? `EditableTask` is just `BaseTask` with extra steps.",
      "evidence": "type EditableTask = Omit<BaseTask, 'responseType'> & { ... }",
      "fix_suggestion": "Use the Task union type properly or a discriminating union form state."
    },
    {
      "file": "packages/admin-ui/src/components/ExerciseList.tsx",
      "line_start": 50,
      "line_end": 60,
      "type": "UX/UI",
      "message": "Spec promised `ExerciseCard`, you delivered a table. Tables are fine, but don't lie in the exports.",
      "evidence": "export { ExerciseList } ... returns <table>",
      "fix_suggestion": "Either implement ExerciseCard for grid view or update the spec/exports to reflect reality."
    }
  ],
  "unsupported": [
    {
      "file": "packages/admin-ui/src/components/ExerciseForm.tsx",
      "line_start": 68,
      "line_end": 86,
      "type": "Validation",
      "message": "Cannot verify if `onSubmit` handles API errors because I can't see the usage code, but the form itself has zero error handling state (only `isSubmitting`). If the server rejects the slug, the user stares at a spinner forever?",
      "evidence": "No error state in ExerciseForm."
    }
  ],
  "summary": "This package is a prototype masquerading as a library. You missed an entire feature (DemoLinkGenerator), crippled another (Task filters), hardcoded the styles, and duplicated model definitions. Fix the blockers before publishing."
}