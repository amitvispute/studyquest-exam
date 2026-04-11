

# Restructure Student AI Mentor: Recent History Below Chat, Calendar as Filter Button

## Current State
- `StudentAIMentorChat` renders `StudentExamMode` at the top (which shows upcoming exams, recent history for 7 days, and a full inline calendar)
- The chat widget sits below all of that
- This makes the page very long and pushes the chat down

## Proposed Layout

```text
┌─────────────────────────────────────────────────┐
│  📅 Upcoming Mock Exams (if any)                │
│  Mock Test 15-Apr — 15 Apr, 10:00               │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐    │
│  │  ✨ 11+ Mentor Chat                     │    │
│  │  [chat messages area]                    │    │
│  │  [input bar]                             │    │
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│  📊 Recent Exam History          [📅 Filter]    │
│  ┌───────────────────────────────────────────┐  │
│  │ ✅ Mock 11-Apr  18/23 78%  [Review]       │  │
│  │ ❌ Mock 10-Apr  Missed                    │  │
│  │ ✅ Mock 09-Apr  21/25 84%  [Review]       │  │
│  │ ✅ Mock 08-Apr  19/23 83%  [Review]       │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  (Calendar opens as popover from Filter button,  │
│   same pattern as Parent Exam Results)           │
└─────────────────────────────────────────────────┘
```

## Key Changes

1. **Move recent exam history BELOW the chat** — currently it's above the chat inside `StudentExamMode`. The upcoming banner stays on top.

2. **Show only 4 most recent exams** in the visible list. Older exams accessible only via the calendar filter button.

3. **Replace the full inline calendar with a popover filter button** — same pattern as `ParentExamResults.tsx`: a "Filter by date" button with `CalendarIcon` that opens a `Popover` containing the `Calendar` component with highlighted exam dates. When a date is selected, show that date's exams instead of the default 4.

## Technical Implementation

### `StudentExamMode.tsx`
- Remove the inline calendar section (Section 3)
- Remove the "Recent Exam History" section (Section 2) — this will move to `StudentAIMentorChat`
- Keep only: active exam UI + upcoming exams banner (Section 1)

### `StudentAIMentorChat.tsx`
- Import `ExamHistoryCard`, `Calendar`, `Popover`, `CalendarIcon`, date utils
- Add queries for completed/expired exams, questions, and answers (reuse the pattern from current `StudentExamMode`)
- Below the chat widget, render:
  - Header row: "📊 Recent Exam History" + filter button (Popover with Calendar)
  - Default view: latest 4 exams (completed + expired)
  - Filtered view: exams matching selected date
- Calendar modifiers: green for completed, red for missed (same as parent pattern)

### No database changes needed

| File | Change |
|------|--------|
| `src/components/StudentExamMode.tsx` | Strip down to only upcoming banner + active exam UI |
| `src/components/StudentAIMentorChat.tsx` | Add recent exam history section below chat with calendar popover filter |

