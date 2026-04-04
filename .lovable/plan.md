

# Fix All 4 Bugs — Step-by-Step Implementation Plan

## Bug 1: Notification Badge on AI Mentor Tab (Small)

### Changes
**`src/pages/Index.tsx`**
- Import `useQuery`, `supabase`, and `Star` from lucide
- For student users, query `ai_mock_exams` where `student_user_id = user.id` and `status = 'scheduled'`
- On the AI Mentor `TabsTrigger`, wrap content in `relative` container and add an `absolute` pulsing golden star (`⭐`) at top-right when count > 0

### Test Cases
- Parent creates mock → student sees pulsing star on AI Mentor tab
- No scheduled exams → no star
- Parent login → no star

---

## Bug 4: Mobile UI + Parent AI Mentor Access (Medium)

### Changes
**`src/components/StudentAIMentorChat.tsx`**
- Fix quick topic buttons: add `whitespace-normal text-xs sm:text-sm min-w-0` so text wraps on small screens instead of overflowing

**`src/components/AIMentorChat.tsx`**
- Restructure parent view into a tabbed interface with 3 sub-tabs:
  - **Create Mock** — existing `ParentMockCreator`
  - **Chat with AI** — reuse `StudentAIMentorChat` (parent can chat)
  - **Exam Results** — new `ParentExamResults` component

**New: `src/components/ParentExamResults.tsx`**
- Query `ai_mock_exams` where `created_by = user.id` and `status = 'completed'`
- For each exam, fetch questions + answers to show score breakdown (correct/total per subject)
- Calendar date picker to filter by date, highlight dates with completed exams

### Test Cases
- Mobile (320px): quick topic buttons wrap text cleanly
- Tablet: buttons fit, readable
- Parent AI Mentor tab shows 3 sub-tabs
- Parent can chat with AI
- Parent can see completed exam results with score breakdown

---

## Bug 2: Mock Exam Scores Not Saved/Displayed (Medium-Large)

### Changes
**`src/components/StudentExamMode.tsx`**
- After `handleSubmit` saves answers and marks exam completed, also insert a row into `mock_exams` table with:
  - Calculated per-subject scores (from questions + answers)
  - `total_score`, `max_score`, `provider = exam.title`, `date = today`, `user_id = student.id`

**`src/components/MockExamTracker.tsx`**
- Role-based behavior using `useAuth()`:
  - **Student**: hide "Add Result" button (read-only), show scores from `mock_exams`
  - **Parent**: keep edit capability
- Add calendar date picker at top to filter scores by date
- Highlight dates that have exam scores in the calendar

**`src/pages/Index.tsx`**
- Add notification badge on Mocks tab when a new completed AI exam exists today (student only)

### Test Cases
- Student submits mock exam → score auto-saved to `mock_exams`
- Student opens Mocks tab → sees latest score, read-only (no Add/Edit)
- Parent opens Mocks tab → can add/edit scores
- Calendar picker filters by date, dates with data highlighted

---

## Bug 3: AI Mentor Credit Limits (Medium-Large)

### Database Migration
Create two new tables:

**`ai_mentor_usage`**: `id`, `user_id` (uuid), `date` (date), `message_count` (int default 0), `created_at`
- RLS: students can read/upsert own rows, parents can read all

**`ai_mentor_settings`**: `id`, `student_user_id` (uuid, unique), `daily_limit` (int default 20), `updated_by` (uuid), `updated_at`
- RLS: parents can manage, students can read own

### Changes
**`src/components/StudentAIMentorChat.tsx`**
- Before sending, fetch today's usage count and daily limit
- At 80% of limit: show warning toast ("Running low on chats today!")
- At 100%: disable input, show friendly message ("Come back tomorrow or ask your parent for more credits")
- Increment `message_count` on each successful send (upsert on `user_id + date`)

**`src/components/AIMentorChat.tsx`** (parent tabs)
- Add a settings section (could be in the Create Mock tab or a 4th tab) with a number input to set the student's daily AI chat limit

### Test Cases
- Student at 80% limit → warning toast
- Student at 100% → input disabled, friendly message
- Next day → counter resets
- Parent sets limit to 30 → student can now send 30 messages
- Parent can view current limit setting

---

## Implementation Order
1. Bug 1 → Bug 4 → Bug 2 → Bug 3
2. Test each bug fix before moving to the next

## Files Summary
| File | Bugs |
|------|------|
| `src/pages/Index.tsx` | 1, 2 |
| `src/components/StudentAIMentorChat.tsx` | 3, 4 |
| `src/components/AIMentorChat.tsx` | 4 |
| `src/components/ParentExamResults.tsx` (new) | 4 |
| `src/components/StudentExamMode.tsx` | 2 |
| `src/components/MockExamTracker.tsx` | 2 |
| DB migration (2 tables) | 3 |

