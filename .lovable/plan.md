

# Fix: Delete Mistaken AI Mock Exams + Add Parent Delete Option

## Issues

1. **Two mistaken AI mock exams created today** — "AI Generated Mock" and "Mock Test 09-Apr". "Mock Test 09-Apr" has 0 questions generated (explains why student can't interact with it). Both need deletion.
2. **Student can't start live exam** — "Mock Test 09-Apr" has `status: in_progress` but **zero questions** were generated for it. The edge function likely failed silently. The other exam "AI Generated Mock" has 30 questions but its time window (13:23–13:58) has already passed.
3. **No delete option for parent on scheduled AI mock exams** — `ParentMockCreator.tsx` shows scheduled exams but has no way to delete them.

## Plan

### Step 1: Delete the two mistaken exams (data operation)
Delete from `ai_mock_questions` and `ai_mock_answers` where exam_id matches, then delete from `ai_mock_exams`:
- `7cc21953-...` ("Mock Test 09-Apr" — 0 questions, stuck in_progress)
- `52bc061f-...` ("AI Generated Mock" — window expired)

### Step 2: Add delete button to ParentMockCreator
In `ParentMockCreator.tsx`, add a `Trash2` icon next to each exam in the scheduled list. Clicking it opens an `AlertDialog` confirmation. On confirm, delete the exam's questions, answers, then the exam itself. Show a success toast.

### Step 3: RLS — parent already has DELETE via "Parents can manage own created exams" (ALL policy) on `ai_mock_exams`
Need to add DELETE policies for `ai_mock_questions` and `ai_mock_answers` so that cascading cleanup works from the client. Alternatively, delete questions/answers via the exam cascade — but there are no foreign keys with CASCADE. So we need explicit DELETE policies for parents on those tables.

## Changes

| Target | Change |
|--------|--------|
| Data: `ai_mock_questions`, `ai_mock_answers`, `ai_mock_exams` | Delete the two mistaken exams and their related data |
| Migration SQL | Add DELETE policies for parents on `ai_mock_questions` and `ai_mock_answers` |
| `src/components/ParentMockCreator.tsx` | Add Trash2 icon per exam, AlertDialog confirmation, delete handler with cascading deletes, success toast |

## Test
1. Two mistaken exams no longer appear for parent or student
2. Parent can delete any scheduled exam via trash icon with confirmation
3. Student view unaffected — no delete controls visible

