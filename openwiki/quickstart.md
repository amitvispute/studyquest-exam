---
type: quickstart
title: StudyQuest Wiki Quickstart
description: Entry point to the StudyQuest repository wiki — a Vite React Supabase app for tracking a student's 11+ Grammar School exam preparation with an AI mentor and AI-generated mock exams.
tags: [quickstart, navigation, overview]
---

# StudyQuest Wiki Quickstart

StudyQuest is a **Grammar School Exam Tracker & AI Mentor** — a Vite + React +
TypeScript + Supabase single-page application that helps a 10-11 year old
student ("Pareet") prepare for 11+ entrance exams on 14th September. It is a
Lovable-generated app with a two-role model (parent / student), a Supabase
Postgres backend with row-level security, and two Deno edge functions for AI
chat and AI-generated mock exams.

## High-level map

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->
```text
flowchart TD
    Browser["Browser (Vite SPA)"] --> App["src/App.tsx<br/>Router + Guards"]
    App --> Auth["useAuth<br/>(Supabase session + role)"]
    App --> Index["src/pages/Index.tsx<br/>5-tab shell"]
    Index --> Dash["Dashboard tab"]
    Index --> Mocks["Mocks tab"]
    Index --> Classes["Classes tab"]
    Index --> Weekly["Weekly tab"]
    Index --> Mentor["AI Mentor tab"]
    Dash -.reads.-> DailyLogs["daily_logs"]
    Mocks -.reads.-> MockExams["mock_exams"]
    Classes -.reads.-> ClassData["class_schedules / class_entries"]
    Mentor --> StudentChat["StudentAIMentorChat"]
    StudentChat -->|"POST /functions/v1/ai-mentor"| AiMentorFn["ai-mentor edge fn"]
    AiMentorFn -->|"stream SSE"| LovableAI["Lovable AI gateway<br/>gemini-3-flash"]
    Mentor --> ParentCreate["ParentMockCreator"]
    ParentCreate -->|"POST /functions/v1/generate-mock-exam"| GenExamFn["generate-mock-exam edge fn"]
    GenExamFn -->|"tool-calling"| LovableAI
    GenExamFn -.writes.-> AiExams["ai_mock_exams / questions"]
    StudentChat --> StudentExamMode["StudentExamMode"]
    StudentExamMode -.writes.-> AiAnswers["ai_mock_answers"]
    StudentExamMode -.writes.-> MockExams
    subgraph Supabase["Supabase Postgres (RLS)"]
      DailyLogs
      MockExams
      ClassData
      AiExams
      AiAnswers
    end
```

The diagram above shows the runtime relationship between the browser SPA, the
Supabase database (all tables RLS-protected), and the two edge functions that
proxy to the Lovable AI gateway.

## How to navigate this wiki

| If you want to understand… | Read |
|---|---|
| The whole system at a glance, build/test commands, env vars | [Architecture Overview](architecture/overview.md) |
| The database schema, RLS policies, triggers, RPCs | [Database Schema and RLS](architecture/data-model.md) |
| Login, signup, role enum, route guards, parent-vs-student | [Authentication and Roles](auth-and-roles.md) |
| Daily practice logging, streaks, levels, weekly chart | [Daily Practice Tracking](daily-practice.md) |
| Manual mock exam results (CRUD, scores) | [Manual Mock Exam Tracker](mock-exam-tracker.md) |
| Class schedule + shared diary | [Class Schedule and Diary](classes.md) |
| The AI chat edge function, SSE streaming, credit limit | [AI Mentor Chat](ai-mentor.md) |
| AI-generated mock exams, lifecycle, generation, taking, review | [AI Mock Exams](ai-mock-exams.md) |
| Parent-specific dashboard, exam results, credit settings | [Parent Dashboard and Tools](parent-dashboard.md) |
| Tailwind tokens, shadcn/ui, the 85% threshold | [Design System](design-system.md) |

## Core concepts

- **Two roles**: `parent` and `student` (Postgres enum `app_role`). Roles are
  stored in `user_roles`, fetched post-auth in `useAuth`, and enforced by RLS.
  See [Authentication and Roles](auth-and-roles.md).
- **Two kinds of "mock exam"**: manually-entered provider scores in `mock_exams`
  ([tracker](mock-exam-tracker.md)) vs. AI-generated question-level exams in
  `ai_mock_exams`/`ai_mock_questions`/`ai_mock_answers`
  ([AI mock exams](ai-mock-exams.md)). A completed AI exam writes a summary row
  into `mock_exams`, bridging the two.
- **Two edge functions**: `ai-mentor` (Bearer-auth, student-only rate-limited,
  streaming chat) and `generate-mock-exam` (no caller auth, service-role writes,
  AI tool-calling question generation). Both call the Lovable AI gateway.
- **Server-side grading**: the `compute_is_correct` trigger recomputes
  `is_correct` on insert, so students cannot self-grade. See
  [data model](architecture/data-model.md).

## Task routing

| Change area | Key files / symbols | Validation |
|---|---|---|
| Add a daily-log field | `useDailyLogs.tsx`, `daily_logs` migration, `types.ts` (regenerate) | `bun run test` |
| Change a streak rule | `Index.tsx` `streak` useMemo | `bun run test` |
| Add a Dashboard widget | `pages/Index.tsx` (role branch) | `bun run dev` |
| Modify AI chat behavior | `supabase/functions/ai-mentor/index.ts` (`SYSTEM_PROMPT`) | manual: open AI Mentor tab, send a message |
| Change credit limit logic | `ai-mentor/index.ts` rate-limit block, `ParentCreditSettings.tsx` | manual: send 21st message as student |
| Add an AI exam status | `ai_mock_exams` migration, `StudentExamMode.tsx`, `StudentAIMentorChat.tsx` | `bun run test` + manual |
| Change an RLS policy | a new migration in `supabase/migrations/` | manual: test both roles |
| Add a Tailwind token | `src/index.css`, `tailwind.config.ts` | `bun run dev` |
| Add a UI primitive | `src/components/ui/` (shadcn) | `bun run test` |

## Build, dev, test

- **Dev server**: `bun run dev` (Vite on port 8080) or `npm run dev`.
- **Build**: `bun run build` (`vite build`).
- **Lint**: `bun run lint` (eslint).
- **Unit tests**: `bun run test` (Vitest, jsdom, setup in `src/test/setup.ts`).
- **Preview**: `bun run preview`.
- Edge functions are deployed to Supabase (Deno) and invoked at
  `${VITE_SUPABASE_URL}/functions/v1/<name>`.

## Environment and secrets

**Client** (`.env`, all `VITE_`-prefixed, exposed to the browser):

- `VITE_SUPABASE_URL` — Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key.
- `VITE_SUPABASE_PROJECT_ID` — project id.

**Edge functions** (Supabase Deno env, server-only):

- `LOVABLE_API_KEY` — authenticates to the Lovable AI gateway.
- `SUPABASE_URL` — project URL.
- `SUPABASE_ANON_KEY` — used by the `ai-mentor` client to forward the caller's
  Authorization header and resolve the user.
- `SUPABASE_SERVICE_ROLE_KEY` — used by both functions to bypass RLS for writes.

**AI gateway**: both functions POST to
`https://ai.gateway.lovable.dev/v1/chat/completions` with model
`google/gemini-3-flash-preview`. See [Architecture Overview](architecture/overview.md)
for the project binding (`supabase/config.toml`).

> ⚠️ Do not commit secrets. The `.env` file in the repo contains only public
> client keys (anon key); the service-role and Lovable keys are server-side
> Supabase secrets.

## Backlog and deferrals

- **Behavioral test coverage is minimal.** The only test is
  `src/test/example.test.ts` (`expect(true).toBe(true)`). Material invariants —
  RLS policies, the `compute_is_correct` trigger, the SSE streaming parser, the
  exam lifecycle state machine, and the AI-exam → `mock_exams` bridge write — are
  **unverified by tests** and are evidenced only by source and migrations.
  `playwright.config.ts` and `playwright-fixture.ts` exist (Lovable agent
  config) but no e2e spec files are present. Source anchors:
  `src/test/example.test.ts`, `src/test/setup.ts`, `playwright.config.ts`.
  Reason for deferral: no existing tests to document beyond the placeholder.

## OpenWiki maintenance

The scheduled GitHub Actions workflow (`.github/workflows/openwiki-update.yml`)
refreshes this wiki daily via `openwiki code --update`. Do not hand-edit
generated OpenWiki pages unless explicitly asked; prefer updating source code
and docs and letting OpenWiki regenerate. See `AGENTS.md` for agent instructions.
