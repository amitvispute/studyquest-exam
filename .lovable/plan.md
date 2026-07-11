# Debug "Missing required fields" on mock exam creation

## What we know

- The toast wording ("Missing required fields") comes from the **edge function** `supabase/functions/generate-mock-exam/index.ts`, not client-side validation.
- The request reached the function, passed auth + parent-role checks, then failed the `if (!title || !subjects?.length || !student_user_id || !scheduled_start || !scheduled_end)` guard.
- DB confirms a `student` role user exists and the parent has read access to `user_roles`, so `studentId` on the client should be populated.
- Recent edge function logs show only boot lines — the actual invocation logs were rotated out, so we can't see which specific field was null.

## Step 1 — Add diagnostic logging (edge function)

In `supabase/functions/generate-mock-exam/index.ts`, right after `await req.json()`, log which fields are missing (without leaking full content):

```ts
console.log("generate-mock-exam payload keys:", {
  hasTitle: !!title,
  subjectsLen: Array.isArray(subjects) ? subjects.length : null,
  hasStudentId: !!student_user_id,
  hasStart: !!scheduled_start,
  hasEnd: !!scheduled_end,
  numQuestions: num_questions,
});
```

Also change the 400 response body to echo which field failed, so the user's toast is immediately actionable:

```ts
const missing = [
  !title && "title",
  !subjects?.length && "subjects",
  !student_user_id && "student_user_id",
  !scheduled_start && "scheduled_start",
  !scheduled_end && "scheduled_end",
].filter(Boolean);
if (missing.length) {
  return new Response(JSON.stringify({ error: `Missing: ${missing.join(", ")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
}
```

Deploy, ask the user to retry, then read logs / the new toast to identify the exact missing field.

## Step 2 — Fix the root cause once identified

Likely candidates and their fixes:

- **`student_user_id` null** — `ParentMockCreator.tsx` queries `user_roles` with `.single()`; if the query rejected we silently fall to null. Switch to `.maybeSingle()` and surface an error if no student is found.
- **`subjects` empty** — already guarded client-side; if backend still sees empty, the shape/name is wrong (unlikely, they match).
- **`scheduled_start` / `scheduled_end` invalid** — if `startTime`/`endTime` were cleared, `new Date(...).toISOString()` throws before the fetch, so this would show a different error. Not likely.
- **`title` empty** — client already trims and blocks; ruled out unless whitespace-only.

Once the log names the culprit, the fix is a one-line client or server correction.

## Files touched

- `supabase/functions/generate-mock-exam/index.ts` (logging + specific error message)
- Possibly `src/components/ParentMockCreator.tsx` (depends on Step 2 result)

## Not in scope

- The pre-existing `claude-sonnet-4-6` / `max_tokens` issues — separate bug, only reached after this validation passes.
- Any schema, RLS, or auth changes.
