---
type: concept
title: AI Mentor Chat
description: ai-mentor Deno edge function (Bearer auth, student-only server-side rate limit, post-success usage upsert, streaming SSE via Lovable AI gateway) and the StudentAIMentorChat client component with credit tracking.
tags: [ai, edge-function, supabase, streaming, sse, rate-limit]
---

# AI Mentor Chat

The AI Mentor is an 11+ exam tutor chat. A student types a question and receives
a streamed, markdown-rendered response from the Lovable AI gateway
(`google/gemini-3-flash-preview`). The chat is gated by a parent-configurable
**daily credit limit** enforced server-side. Parents can also use the chat but
bypass the limit.

## Role routing — `AIMentorChat`

`src/components/AIMentorChat.tsx` is the entry rendered in the "AI Mentor" tab.
It branches on `role`:

- **Parent** → `ParentAIMentorView`, a 4-sub-tab layout: Create Mock
<!-- openwiki: broken internal link [../ai-mock-exams.md] file "../ai-mock-exams.md" does not exist. Fix the href or restore the target, then delete this comment. -->
  ([ParentMockCreator](../ai-mock-exams.md)), Chat with AI
<!-- openwiki: broken internal link [../parent-dashboard.md] file "../parent-dashboard.md" does not exist. Fix the href or restore the target, then delete this comment. -->
  (`StudentAIMentorChat`), Exam Results ([ParentExamResults](../parent-dashboard.md)),
<!-- openwiki: broken internal link [../parent-dashboard.md] file "../parent-dashboard.md" does not exist. Fix the href or restore the target, then delete this comment. -->
  Credits ([ParentCreditSettings](../parent-dashboard.md)).
- **Student** → `StudentAIMentorChat`.

Note that the parent's "Chat with AI" sub-tab reuses the same `StudentAIMentorChat`
component — its credit UI is conditionally shown only for students.

## Edge function: `supabase/functions/ai-mentor/index.ts`

A Deno `serve()` handler that proxies chat completion requests to the Lovable AI
gateway with streaming.

### Authentication and input validation

The function requires a `Bearer` Authorization header. It creates a Supabase
client that forwards that header and calls `supabase.auth.getUser()` to resolve
the caller — unauthenticated callers get a 401. The request body must contain a
`messages` array; each message is validated to have a string `content` and a
role of `user` or `assistant`, truncated to the last 30 messages, and each
content is capped at 4000 characters. This is both a safety and cost guard.

> The function pins `@supabase/supabase-js@2.45.0` and uses `getUser()` rather
> than `getClaims()` (which only exists in v2.46+). The `.lovable/plan.md` file
> documents the historical crash this caused and the fix.

### Student-only server-side rate limit

The rate limit is enforced **only for students**. Using the service-role client,
the function:

1. Looks up `user_roles` for `(user_id, role='student')`. If no row exists, the
   caller is treated as a parent and the entire limit block is skipped — **parents
   bypass the daily credit limit**.
2. For students: reads `ai_mentor_settings.daily_limit` for the student
   (default 20) and `ai_mentor_usage.message_count` for today.
3. If `used >= dailyLimit`, returns HTTP 429 ("Daily chat limit reached").

### Post-success usage increment

Usage is incremented **after** a successful upstream AI response, not before —
so a failed/gateway-error request does not consume a credit. For students, the
function manually upserts `ai_mentor_usage`:

- `select` the existing row for `(user_id, today)` via the service-role client.
- If it exists, `update({ message_count: existing + 1 })`.
- Otherwise `insert({ user_id, date: today, message_count: 1 })`.

This manual upsert is used **instead of** the `increment_mentor_usage()` RPC,
which is defined in the schema but never invoked (see
<!-- openwiki: broken internal link [../architecture/data-model.md] file "../architecture/data-model.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[data model](../architecture/data-model.md)).

### AI gateway call and streaming

The function POSTs to `https://ai.gateway.lovable.dev/v1/chat/completions` with
`Authorization: Bearer ${LOVABLE_API_KEY}`, model `google/gemini-3-flash-preview`,
a fixed `SYSTEM_PROMPT` (a supportive 11+ tutor persona that teaches by guiding
rather than giving direct answers), and `stream: true`. It maps gateway errors:
429 → "Rate limits exceeded", 402 → "Payment required". On success it returns the
upstream body directly as `text/event-stream` (a passthrough of the SSE stream).

## Client: `StudentAIMentorChat`

`src/components/StudentAIMentorChat.tsx` is the student-facing chat (also reused
by parents). It manages local `messages` state (not persisted), an input box,
quick-topic buttons, and a streaming parser.

### SSE streaming parser

`sendMessage` builds the message list, POSTs to the edge function URL
(`${VITE_SUPABASE_URL}/functions/v1/ai-mentor`) with the publishable key as the
Bearer token, and reads the `ReadableStream` body chunk by chunk. It splits the
buffer on newlines, skips comments (`:`) and empty lines, and parses `data: ...`
lines as JSON, extracting `choices[0].delta.content`. A `[DONE]` sentinel ends
the stream. Parsed content is appended incrementally to the last assistant
message (or starts a new one), producing a token-by-token typing effect. The
markdown is rendered with `ReactMarkdown`.

### Credit tracking (students only)

The component queries `["ai_mentor_credit_info"]`, which fetches
`ai_mentor_settings.daily_limit` and today's `ai_mentor_usage.message_count` and
returns `{ limit, used }`. The header shows `used/limit`, and the input is
disabled once `used >= limit` ("Daily limit reached"). A near-limit toast warns
when usage crosses 80% of the limit. After each successful send, the client
invalidates the credit-info query to refresh the counter (the authoritative
increment is server-side, so this is a display refresh).

### Active-exam interplay

The component also queries `["student_active_exam"]` (an exam whose
`scheduled_start <= now < scheduled_end`). If one exists, it **renders
<!-- openwiki: broken internal link [../ai-mock-exams.md] file "../ai-mock-exams.md" does not exist. Fix the href or restore the target, then delete this comment. -->
`StudentExamMode` instead of the chat** — see [AI mock exams](../ai-mock-exams.md).
This means a student in an active exam window is forced into exam mode when they
open the AI Mentor tab.

### Exam history

Below the chat, the component renders a "Recent Exam History" section for
<!-- openwiki: broken internal link [../ai-mock-exams.md] file "../ai-mock-exams.md" does not exist. Fix the href or restore the target, then delete this comment. -->
students: completed exams render as [ExamHistoryCard](../ai-mock-exams.md) rows
with score breakdowns and a "Review Results" action; missed (`expired`) exams are
highlighted on a filter calendar. Reviewing an exam loads its questions/answers
and renders `MockExamResults`.

## Credit settings (parent)

`src/components/ParentCreditSettings.tsx` (rendered in the parent AI Mentor →
Credits sub-tab) lets a parent set the student's `daily_limit`. It resolves the
<!-- openwiki: broken internal link [../auth-and-roles.md#single-student-lookup-assumption] file "../auth-and-roles.md" does not exist. Fix the href or restore the target, then delete this comment. -->
student via the [single-student lookup](../auth-and-roles.md#single-student-lookup-assumption),
reads the current `ai_mentor_settings` row and today's usage, and on save
upserts the settings row (`updated_by` = parent id). RLS allows only parents to
manage `ai_mentor_settings`.
