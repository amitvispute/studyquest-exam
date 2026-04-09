

# Fix: Student Can't See Parent-Entered Mock Exam Data

## Problem
When a parent enters mock exam results, the `user_id` column is set to the parent's ID. The student's SELECT policy only allows reading rows where `auth.uid() = user_id`, so parent-entered data is invisible to the student.

## Root Cause
Missing RLS policy — there's no "Students can read all mock exams" policy (same issue that was fixed for `class_entries` earlier).

## Fix
Add one RLS policy via migration:

```sql
CREATE POLICY "Students can read all mock exams"
ON public.mock_exams
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'student'::app_role));
```

## Files Changed
| File | Change |
|------|--------|
| Migration SQL | Add student SELECT policy on `mock_exams` |

No code changes needed — the query in `useMockExams.tsx` already fetches all rows; it's purely the RLS blocking visibility.

## Test
1. Parent enters mock exam for 09-Apr
2. Student logs in → Mocks tab → sees the 09-Apr entry in recents

