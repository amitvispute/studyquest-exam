

# StudyQuest Major Feature Upgrade

This plan covers a significant restructuring of the app with role-specific experiences and an AI-powered mock exam system.

## Summary of Changes

1. **Fix countdown** — Target 14th September 2026
2. **Student dashboard redesign** — Compact practice log tiles side-by-side, recent scores filtered by date
3. **Parent dashboard redesign** — Summary-only view with data visualizations
4. **AI Mock Exam System** — Parents create AI-generated mock exams, students take them in-app with timed review

---

## 1. Countdown Fix
**File:** `src/components/CountdownWidget.tsx`
- Change default target date from `2025-09-14` to `2026-09-14`

## 2. Student Dashboard Redesign

### Practice Log — Compact Tiles
**File:** `src/components/DailyLogForm.tsx`
- Redesign from vertical stacked layout to a horizontal grid of 4 clickable subject tiles (2×2 on mobile, 4×1 on tablet)
- Each tile shows the subject emoji and label; clicking opens an expandable section or dialog to enter minutes, questions, score
- Collapsed state shows a compact card; expanded state reveals the 3 input fields

### Recent Scores — Date Filter
**File:** `src/components/RecentScores.tsx`
- Default view: show only today's scores
- Add a date picker (calendar popover) to select a different date and view that day's scores
- Filter logic changes from "last 10" to "scores for selected date"

## 3. Parent Dashboard Redesign
**File:** `src/pages/Index.tsx`
- When `role === "parent"`, the Dashboard tab shows a summary-only view instead of the practice log form
- Summary includes: total questions this week, average score, subject-wise breakdown chart, streak, and level progress
- Reuse and enhance the `WeeklyReport` component with additional visualizations (e.g., a line chart of daily scores over the past 7 days)
- Hide `DailyLogForm` and show a new `ParentSummaryDashboard` component

**New file:** `src/components/ParentSummaryDashboard.tsx`
- Daily activity chart (questions per day, line or area chart)
- Subject-wise score heatmap or radar chart
- Streak and level widgets (reused)
- "Needs attention" callout for subjects below 85%

## 4. AI Mock Exam System

This is the largest change — a full mock exam workflow.

### Database Changes (3 new tables)

**Table: `ai_mock_exams`**
- `id` (uuid, PK), `created_by` (uuid, parent user), `student_user_id` (uuid), `title` (text), `subjects` (text[]), `topics` (text), `num_questions` (int), `scheduled_start` (timestamptz), `scheduled_end` (timestamptz), `status` (text: 'scheduled' | 'in_progress' | 'completed' | 'reviewed'), `created_at` (timestamptz)
- RLS: Parents can CRUD their own; students can SELECT where `student_user_id = auth.uid()`

**Table: `ai_mock_questions`**
- `id` (uuid, PK), `exam_id` (uuid, FK to ai_mock_exams), `question_number` (int), `question_text` (text), `options` (jsonb — array of 4 options), `correct_answer` (text), `subject` (text), `topic` (text)
- RLS: Accessible to parent creator and assigned student

**Table: `ai_mock_answers`**
- `id` (uuid, PK), `exam_id` (uuid, FK), `question_id` (uuid, FK), `student_answer` (text), `is_correct` (boolean), `submitted_at` (timestamptz)
- RLS: Student can INSERT/SELECT own; parent can SELECT

### Edge Function: `generate-mock-exam`
**New file:** `supabase/functions/generate-mock-exam/index.ts`
- Accepts: subjects, topics, num_questions, student_user_id, scheduled_start, scheduled_end, title
- Uses Lovable AI (gemini-3-flash-preview) with tool calling to generate structured questions (multiple choice with 4 options each)
- Inserts the exam and questions into the database
- Returns the exam ID

### Parent AI Mentor — Mock Creator
**File:** `src/components/AIMentorChat.tsx` (or new `src/components/ParentMockCreator.tsx`)
- When `role === "parent"`, the AI Mentor tab shows a "Create Mock Exam" form instead of the chat
- Form fields: subject checkboxes (English, Maths, VR, NVR), topics text input, number of questions (dropdown: 10/20/30/50), date picker, start time, end time, student name (auto-filled as "Pareet")
- On submit, calls the `generate-mock-exam` edge function
- Shows list of scheduled/past mock exams with status

### Student AI Mentor — Exam Mode
**File:** `src/components/AIMentorChat.tsx` (restructured)
- On load, check if there's a scheduled mock exam for the current student where `now()` is between `scheduled_start` and `scheduled_end`
- **If exam is active:**
  - Hide the normal chat interface (tips, tricks, puzzles, help all disabled)
  - Show the mock exam title and a banner: "Mock Exam in Progress"
  - Display questions one at a time or all at once (paginated)
  - Student selects answers (radio buttons for multiple choice)
  - "Submit All Answers" button — only enabled when all questions are answered
  - After submission: results are calculated and stored; student can review answers until `scheduled_end`
  - After `scheduled_end`: review mode is locked, results are final
- **If no active exam:**
  - Show a notification banner if there's an upcoming scheduled exam (e.g., "Mock exam scheduled for tomorrow at 2:00 PM")
  - Normal AI Mentor chat works as usual

### Exam Results
**New file:** `src/components/MockExamResults.tsx`
- Shows after all answers are submitted
- Breakdown: total correct, per-subject scores, percentage
- Colour-coded: green ≥85%, amber <85%
- Review mode: shows each question with student's answer and correct answer (within time window)

## Files to Create
- `src/components/ParentSummaryDashboard.tsx`
- `src/components/ParentMockCreator.tsx`
- `src/components/StudentExamMode.tsx`
- `src/components/MockExamResults.tsx`
- `supabase/functions/generate-mock-exam/index.ts`

## Files to Modify
- `src/components/CountdownWidget.tsx` — update target date
- `src/components/DailyLogForm.tsx` — compact tile layout
- `src/components/RecentScores.tsx` — date picker filter
- `src/components/AIMentorChat.tsx` — role-based branching
- `src/pages/Index.tsx` — parent vs student dashboard views

## Implementation Order
1. Database migrations (3 tables + RLS)
2. Countdown fix + student dashboard UI (tiles, date picker)
3. Parent summary dashboard
4. Edge function for AI question generation
5. Parent mock creator UI
6. Student exam mode + results UI

