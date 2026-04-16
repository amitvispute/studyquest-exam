

## Diagnosis

The user reports "AI Mentor feature is not loading at all." No client logs (user is on `/auth`) and no edge function logs (function hasn't been hit recently). Reviewing `StudentAIMentorChat.tsx`, I found likely culprits introduced by recent changes:

### Likely root causes

1. **`.single()` in credit-info query throws** (lines 71, 77 of `StudentAIMentorChat.tsx`)
   - For a student with no `ai_mentor_settings` row or no `ai_mentor_usage` row for today, Supabase `.single()` returns a `PGRST116` error.
   - The promise's destructure `{ data: settings }` works (data is null) but the error is silently lost — except both calls share the query function, and any unhandled access pattern can cause issues. More importantly, this is fragile and inconsistent with the rest of the code which uses `.maybeSingle()`.

2. **`StudentExamMode` rendered twice** — once at line 319 inside `StudentAIMentorChat` (for upcoming banner) and again at line 299 (when `activeExam` exists). When `activeExam` is truthy, line 299 returns `<StudentExamMode />` standalone — fine. But for non-active state, line 319 renders it. Both share the `student_exams` query key with the parent component, which is fine. Not a crash, but double-rendering risk.

3. **Edge function model name** — `google/gemini-3-flash-preview` is correct per the gateway docs, so this is OK.

4. **`enabled: !!user && isStudent`** for credit info — if `role` is briefly `null` during auth load, `isStudent` is false and query stays disabled. Fine.

The most actionable fix is **#1**: replace `.single()` with `.maybeSingle()` in the credit-info query so missing rows don't throw.

## Plan

### Fix 1 — Use `.maybeSingle()` for credit-info query
File: `src/components/StudentAIMentorChat.tsx` (lines ~67–77)

Replace both `.single()` with `.maybeSingle()` so a brand-new student (no settings, no usage today) doesn't trigger a thrown error that masks the chat UI.

### Fix 2 — Guard against query errors and add a fallback
Add a small `staleTime` and ensure `creditInfo` defaults are robust. Already defaults to `{ limit: 20, used: 0 }` via `?? 20`/`?? 0`, but with `.single()` throwing, the default never applied.

### Fix 3 — Verify with logs
After the fix, ask the user to open the AI Mentor tab so we can read console/network logs and edge-function logs to confirm chat sends work (and rate-limit accounting still increments).

### Files to modify
| File | Change |
|------|--------|
| `src/components/StudentAIMentorChat.tsx` | Change two `.single()` → `.maybeSingle()` in `ai_mentor_credit_info` query |

No DB or edge function changes needed.

