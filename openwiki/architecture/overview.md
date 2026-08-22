---
type: overview
title: Architecture Overview
description: Tech stack, app shell, providers, routing, role gating, build/test commands, environment and secrets, and the test-coverage gap for the StudyQuest Vite + React + Supabase app.
tags: [architecture, react, vite, supabase, configuration]
---

# Architecture Overview

StudyQuest is a single-page application that helps a 10–11 year old student
("Pareet") prepare for Grammar School 11+ entrance exams. It is a Lovable-generated
Vite + React + TypeScript app backed by Supabase (Postgres + Auth + Deno Edge
Functions). The UI is **role-based**: a `parent` configures AI mock exams and
credit limits; a `student` logs daily practice, takes scheduled AI exams, and
chats with an AI mentor under a daily credit limit.

## Tech stack

| Layer | Technology |
|---|---|
| Build tool | Vite 5 (`@vitejs/plugin-react-swc`) |
| UI framework | React 18, TypeScript 5 |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Data fetching | TanStack React Query 5 |
| Routing | react-router-dom 6 |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |
| AI | Lovable AI gateway (`ai.gateway.lovable.dev`, model `google/gemini-3-flash-preview`) |
| Charts | Recharts |
| Markdown | react-markdown (for AI mentor responses) |
| Forms | react-hook-form, zod |
| Testing | Vitest (jsdom) + Testing Library; Playwright (config only, no specs) |

## App shell and providers

The app is mounted from `src/main.tsx`, which renders `src/App.tsx` into
`#root` (see `index.html`). `App.tsx` composes the provider hierarchy:

```
QueryClientProvider (single shared QueryClient)
└─ TooltipProvider
   ├─ Toaster (shadcn/ui)
   ├─ Sonner (toast notifications)
   └─ BrowserRouter
      └─ AuthProvider
         └─ Routes
            ├─ "/"  → ProtectedRoute → Index
            ├─ "/auth" → AuthRoute → Auth
            └─ "*"  → NotFound
```

`ProtectedRoute` and `AuthRoute` use the [auth context](../auth-and-roles.md) to
gate routes: unauthenticated users hitting `/` are redirected to `/auth`;
already-authenticated users hitting `/auth` are redirected to `/`.

The single `QueryClient` is created once at module scope (`new QueryClient()`),
so all data hooks share one cache and one default configuration (no custom
`defaultOptions` are set).

## Main authenticated page

`src/pages/Index.tsx` is the post-login shell. It renders a header (display name,
role badge, sign-out) and a five-tab `Tabs` control whose contents differ by role:

| Tab | Parent sees | Student sees |
|---|---|---|
| Dashboard | [ParentSummaryDashboard](../parent-dashboard.md) + RecentScores | StreakWidget, LevelProgress, DailyLogForm, RecentScores |
| Mocks | [MockExamTracker](../mock-exam-tracker.md) (manual results) | MockExamTracker |
| Classes | Two [ClassSchedule](../classes.md) cards (can manage dates) | Two ClassSchedule cards (read-only schedule) |
| Weekly | WeeklyReport chart | WeeklyReport chart |
| AI Mentor | [Parent AIMentorChat view](../ai-mentor.md) (4 sub-tabs) | [StudentAIMentorChat](../ai-mentor.md) |

A `CountdownWidget` (target `2026-09-14`) always appears at the top of the
Dashboard tab. Badge notifications on the tabs surface pending/completed AI
exams for students (see [AI mock exams](../ai-mock-exams.md)).

## Project layout

```
src/
  main.tsx, App.tsx, index.css, App.css
  pages/        Index, Auth, NotFound
  components/   domain widgets + ai-mentor/mock/class components
  components/ui/  shadcn/ui primitives (Radix-based)
  hooks/        useAuth, useDailyLogs, useMockExams, useClassData, use-mobile, use-toast
  integrations/supabase/  client.ts (typed client), types.ts (generated Database types)
  lib/utils.ts  cn() helper
  test/         setup.ts, example.test.ts (placeholder)
supabase/
  config.toml   project_id binding
  functions/    ai-mentor/, generate-mock-exam/ (Deno edge functions)
  migrations/   15 SQL files (schema + RLS + triggers + RPC)
```

## Build, dev, and test commands

| Intent | Command |
|---|---|
| Dev server (port 8080) | `bun run dev` (or `npm run dev`) → `vite` |
| Production build | `bun run build` → `vite build` |
| Dev-mode build | `bun run build:dev` |
| Preview build | `bun run preview` → `vite preview` |
| Lint | `bun run lint` → `eslint .` |
| Unit tests (once) | `bun run test` → `vitest run` |
| Unit tests (watch) | `bun run test:watch` → `vitest` |

`vite.config.ts` aliases `@` → `./src` and dedupes React / React Query packages.
The dev server binds `host: "::"` on port 8080 with the HMR overlay disabled. In
development mode the `lovable-tagger` plugin is active (component tagging).

`vitest.config.ts` runs in `jsdom` with globals enabled and the setup file
`src/test/setup.ts` (which polyfills `window.matchMedia` and registers
`@testing-library/jest-dom`).

## Environment and secrets

### Client (Vite) — `.env`

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://gztffbygqnxhgaxhvlrk.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (used as the public client key) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref (informational) |

The client is created in `src/integrations/supabase/client.ts` with
`localStorage` session persistence, `autoRefreshToken: true`, and typed against the
generated `Database` type in `types.ts`.

### Edge functions — Deno env vars

| Variable | Used by | Purpose |
|---|---|---|
| `LOVABLE_API_KEY` | `ai-mentor`, `generate-mock-exam` | Authenticates to the Lovable AI gateway |
| `SUPABASE_URL` | `ai-mentor`, `generate-mock-exam` | Supabase project URL |
| `SUPABASE_ANON_KEY` | `ai-mentor` | Creates a client that forwards the caller's `Authorization` header (used for `getUser()`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `ai-mentor`, `generate-mock-exam` | Bypasses RLS for rate-limit reads/writes and exam/question inserts |

### AI gateway upstream

Both edge functions POST to `https://ai.gateway.lovable.dev/v1/chat/completions`
with model `google/gemini-3-flash-preview`. The `ai-mentor` function streams the
response (`stream: true`) as Server-Sent Events; `generate-mock-exam` uses a
function/tool-call (`save_questions`) to obtain structured questions.

### Supabase project binding

`supabase/config.toml` contains only `project_id = "gztffbygqnxhgaxhvlrk"` — there
is no local function configuration beyond the project ref.

## Test-coverage gap

The repository has **near-total absence of behavioral tests**. This is a known
gap; the invariants described throughout this wiki are evidenced by source code
and migrations, not by automated tests:

- The only unit test is `src/test/example.test.ts` — a placeholder
  (`expect(true).toBe(true)`).
- No tests exist for RLS policies, the `compute_is_correct` trigger, the SSE
  streaming parser, the AI-exam lifecycle state machine, or the AI-exam→
  `mock_exams` bridge write.
- `playwright.config.ts` and `playwright-fixture.ts` exist (via
  `lovable-agent-playwright-config`), but **no e2e spec files** are present.

See the [quickstart backlog](../quickstart.md#backlog-and-deferrals) for tracked deferrals.
