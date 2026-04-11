

# Student AI Mock Exam History with Calendar

## Current State
The student's "AI Mentor" tab shows `StudentExamMode` which displays:
- Active/live exams (take exam UI)
- Upcoming scheduled exams
- Recently completed exam (single "Review Last Exam Results" button)
- Expired/missed exams

All are shown in a flat list with no historical browsing or calendar navigation.

## Proposed Layout

```text
┌─────────────────────────────────────────────────┐
│  📅 Upcoming Mock Exams                         │
│  ┌───────────────────────────────────────────┐   │
│  │ Mock Test 12-Apr — 12 Apr, 14:00          │   │
│  │ Mock Test 15-Apr — 15 Apr, 10:00          │   │
│  └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  📊 Recent Exam History (last 7 days)           │
│  ┌───────────────────────────────────────────┐   │
│  │ ✅ Mock Test 11-Apr     11 Apr  18/23 78% │   │
│  │    Eng: 5/6 Maths: 4/5 VR: 5/6 NVR: 4/6  │   │
│  │                          [Review Results]  │   │
│  ├───────────────────────────────────────────┤   │
│  │ ❌ Mock Test 10-Apr     10 Apr    Missed   │   │
│  │    Status: Not Completed                   │   │
│  ├───────────────────────────────────────────┤   │
│  │ ✅ Mock Test 09-Apr     09 Apr  21/25 84% │   │
│  │    Eng: 6/7 Maths: 5/6 VR: 5/6 NVR: 5/6  │   │
│  │                          [Review Results]  │   │
│  └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  📆 Exam History Calendar                       │
│  ┌───────────────────────────────────────────┐   │
│  │       < April 2026 >                      │   │
│  │  Mo Tu We Th Fr Sa Su                     │   │
│  │         1  2  3  4  5                     │   │
│  │   6  7  8 [9] 10 [11] 12                 │   │
│  │  13 14 15 16 17 18 19                     │   │
│  │  ...                                      │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  Selected: 09 Apr 2026                          │
│  ┌───────────────────────────────────────────┐   │
│  │ ✅ Mock Test 09-Apr     21/25  84%        │   │
│  │    Eng: 6/7 Maths: 5/6 VR: 5/6 NVR: 5/6  │   │
│  │                          [Review Results]  │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Behavior

- **Top section**: Only `scheduled` exams (future start time) — same as current "Upcoming"
- **Recent History** (middle): Completed + expired exams from the last 7 days, sorted newest first. Each card shows title, date, status badge (Completed/Missed), score breakdown for completed ones, and a "Review Results" button
- **Calendar** (bottom): Uses shadcn `Calendar` component. Dates with exams are highlighted (green dot for completed, red for missed). Clicking a highlighted date shows that day's exam details below the calendar
- When a **live exam** is active, the full exam-taking UI replaces everything (current behavior preserved)

## Technical Details

### Changes to `StudentExamMode.tsx`
- Split exams into: `scheduled` (future), `recentHistory` (completed/expired in last 7 days), `allHistory` (completed/expired, all time)
- Add `selectedDate` state for calendar interaction
- Add calendar with `modifiers` to highlight exam dates
- Add exam detail cards for recent history and calendar-selected dates
- Fetch score data from `ai_mock_answers` for completed exams to show subject breakdowns

### No database or RLS changes needed
All data is already accessible via existing `ai_mock_exams` + `ai_mock_answers` SELECT policies for students.

### Files to modify
| File | Change |
|------|--------|
| `src/components/StudentExamMode.tsx` | Restructure the "no active exam" view into 3 sections: scheduled, recent history, calendar history |

