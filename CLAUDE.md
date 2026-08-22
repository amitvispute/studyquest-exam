# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

StudyQuest is a Lovable-generated Vite + React + TypeScript SPA backed by
Supabase (Postgres + Auth + Deno Edge Functions), built to help a student
prepare for the UK 11+ grammar school entrance exam. The UI is role-based:
a `parent` schedules AI mock exams and sets credit limits; a `student` logs
daily practice, takes scheduled AI exams, and chats with an AI mentor under a
daily credit limit. Deployed at https://studyquest-exam.lovable.app.

## Commands

| Intent | Command |
|---|---|
| Dev server (port 8080) | `npm run dev` (or `bun run dev`) → `vite` |
| Production build | `npm run build` → `vite build` |
| Dev-mode build | `npm run build:dev` |
| Preview build | `npm run preview` |
| Lint | `npm run lint` → `eslint .` |
| Unit tests (once) | `npm run test` → `vitest run` |
| Unit tests (watch) | `npm run test:watch` → `vitest` |
| Single test file | `npx vitest run src/test/example.test.ts` |

`vite.config.ts` aliases `@` → `./src`. `vitest.config.ts` runs in `jsdom`
with globals enabled, using `src/test/setup.ts` (polyfills `window.matchMedia`,
registers `@testing-library/jest-dom`).

`playwright.config.ts` exists but **no e2e spec files are present** — do not
assume Playwright coverage exists.

## Architecture

### App shell

`src/main.tsx` renders `src/App.tsx`, which composes:
`QueryClientProvider` (single shared `QueryClient`) → `TooltipProvider` →
`Toaster`/`Sonner` → `BrowserRouter` → `AuthProvider` → `Routes`
(`/` → `ProtectedRoute` → `Index`; `/auth` → `AuthRoute` → `Auth`; `*` → `NotFound`).
`ProtectedRoute`/`AuthRoute` gate on the auth context, redirecting
unauthenticated users away from `/` and authenticated users away from `/auth`.

`src/pages/Index.tsx` is the post-login shell: a header plus a five-tab view
(Dashboard, Mocks, Classes, Weekly, AI Mentor) whose contents differ by role
(parent gets management views; student gets practice/logging views).

### Data layer — Supabase + RLS

Every table has **row-level security** enabled, built around a
`has_role(_user_id, _role)` `SECURITY DEFINER` function. The ownership model
layers: self-ownership (own `user_id` rows), parent-overseer (parents read/write
across all student-shared tables), and student read-across (students can read
all class schedules/entries and mock exams — this is a single-shared-household
model, not multi-tenant). `supabase/migrations/` (15 files) both creates the
schema and iteratively **tightens** RLS over time — read the migration history
before assuming a policy is static.

Key server-side invariants:
- `handle_new_user()` (trigger on `auth.users` insert) creates `profiles` +
  `user_roles` rows from signup metadata (`display_name`, `role`, defaulting
  to `student`).
- `compute_is_correct()` (`BEFORE INSERT` trigger on `ai_mock_answers`)
  **overwrites** any client-supplied `is_correct` value with a server-computed
  comparison against `ai_mock_questions.correct_answer` — a student cannot
  self-grade. Don't "fix" a client-side grading path expecting it to be
  authoritative.
- `increment_mentor_usage()` RPC is defined and typed but **dead code** — the
  `ai-mentor` edge function does a manual select-then-upsert instead. Don't
  assume it's wired up just because it's typed in `types.ts`.
- Role assignment (`user_roles`) is hardened against privilege escalation:
  authenticated users cannot insert/update/delete their own role row; only the
  service role / signup trigger can.

Generated types live in `src/integrations/supabase/types.ts`; the typed client
(localStorage session persistence, `autoRefreshToken: true`) is in
`src/integrations/supabase/client.ts`.

### Edge functions (Deno, `supabase/functions/`)

`ai-mentor` and `generate-mock-exam` both call the Lovable AI gateway
(`https://ai.gateway.lovable.dev/v1/chat/completions`, model
`google/gemini-3-flash-preview`) using `LOVABLE_API_KEY`. `ai-mentor` streams
its response as SSE; `generate-mock-exam` uses a tool-call (`save_questions`)
to force structured output. Both use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
for their respective writes (mentor usage tracking; exam/question inserts).
A third function, `mcp`, exposes MCP tools (`whoami`, `log-study-session`,
`list-recent-logs`, `list-mock-exams` — see `src/lib/mcp/`).

### Environment variables

Client (`.env`, Vite-exposed): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`.

Edge functions (Deno env): `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
(forwards caller's `Authorization` header for `getUser()`), `SUPABASE_SERVICE_ROLE_KEY`.

### Test coverage gap

There is **near-total absence of behavioral tests** — `src/test/example.test.ts`
is a placeholder, and no Playwright specs exist despite the config being present.
Nothing exercises RLS policies, `compute_is_correct`, the SSE streaming parser,
or the AI-exam lifecycle. Treat the codebase and migrations as the source of
truth, not test coverage, when reasoning about behavior.

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
