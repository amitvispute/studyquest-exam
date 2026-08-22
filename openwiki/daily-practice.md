---
type: concept
title: Daily Practice Tracking
description: daily_logs table, useDailyLogs hook, DailyLogForm, streak calculation, LevelProgress levels, RecentScores, WeeklyReport chart, and parent weekly summary dashboard.
tags: [daily-logs, react-query, hooks, gamification, charts]
---

# Daily Practice Tracking

The daily-practice subsystem lets the student record per-subject study activity
(minutes, questions answered, score) each day. It powers the gamified Dashboard
(streaks, levels), the per-day score breakdown, and the weekly comparison chart.
Parents see an aggregated weekly summary instead of the entry form.

## Data: `daily_logs`

The `daily_logs` table (migration `20260403181700`) stores one row per
subject-log per day:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users`, owner |
| `date` | date | defaults to `CURRENT_DATE` |
| `subject` | text | one of `english`, `maths`, `vr`, `nvr` |
| `minutes` | int | study minutes |
| `questions` | int | questions attempted |
| `score` | int | percentage score |

RLS: owner read/insert/update/delete; parents read all (oversight). See
<!-- openwiki: broken internal link [../architecture/data-model.md] file "../architecture/data-model.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[data model](../architecture/data-model.md).

## `useDailyLogs` hook

`src/hooks/useDailyLogs.tsx` wraps the table with TanStack React Query:

- **Query** `["daily_logs"]` — selects all rows for the current user ordered by
  `date` desc, limited to 100. Enabled when `user` exists.
- **Mutation** `addLogs` — inserts an array of `{ subject, minutes, questions,
  score }` entries for **today** (the hook forces `date` to today's ISO date,
  ignoring any caller-supplied date). On success it invalidates
  `["daily_logs"]`.

Returns `{ logs, isLoading, addLogs }`. The hook does not expose update or delete
mutations (deletion/editing of daily logs is not a UI feature, though RLS
permits it).

## `DailyLogForm` component

`src/components/DailyLogForm.tsx` is a student-only form. It renders four subject
buttons (English, Maths, VR, NVR); tapping one expands an inline panel with
`Minutes`, `Questions`, and `Score` inputs. The submit handler collects only
subjects where `questions` is non-empty, parses integers (defaulting to 0),
calls `onSubmit(entries)`, and resets the form.

`Index.tsx` wires `handleLogSubmit` to call `addLogs.mutate(entries, ...)` and
shows a success toast. The form's `isSubmitting` prop is bound to
`addLogs.isPending`.

## Streak calculation

The streak is computed **client-side** in `Index.tsx` from the loaded `logs`:

1. Build a sorted-descending list of unique log dates. Uniqueness is enforced
   with `[...new Set(logs.map((l) => l.date))]`, so multiple logs on the same
   day (e.g. one per subject) collapse into a single streak day.
2. Walk backward from today: for each `i`, compare the `i`-th unique date
   against `format(subDays(now, i), "yyyy-MM-dd")`.
3. If it matches, increment the streak. A special fallback at `i === 0` allows
   the first entry to count if it matches *yesterday* rather than today (so a
   streak isn't reset the moment midnight passes without a new log yet), then
   continues the walk from there.
4. The loop breaks on the first non-matching date.

The `date` field comes from `daily_logs.date`, a server `date` column
defaulting to `CURRENT_DATE` (server day), formatted `yyyy-MM-dd`. Because the
streak compares these string dates against `subDays(now, i)` computed in the
**browser timezone**, a timezone mismatch between the Postgres server day and
the client day could shift which log counts as "today." A log today is required
for a non-zero streak unless the yesterday-fallback triggers.

The resulting `streak` number feeds `StreakWidget`, which renders a 7-segment bar
where the count of lit bars equals `streak % 7` (so a 9-day streak lights 2
bars), and `ParentSummaryDashboard`, which receives the same value as a prop.

## Level progress

`src/components/LevelProgress.tsx` maps cumulative `totalQuestions` (sum across
all logs) to a gamified level:

| Level | Threshold (questions) | Emoji |
|---|---|---|
| Starter | 0 | 🌱 |
| Explorer | 50 | 🧭 |
| Scholar | 150 | 📚 |
| Champion | 300 | 🏆 |
| Master | 500 | 🎓 |
| Legend | 1000 | ⭐ |

The component selects the current level by **iterating the ladder in reverse**
(from Legend down to Starter) and picking the first (i.e. highest) level whose
threshold `totalQuestions` meets or exceeds. The progress bar fills according
to the percentage toward the next level:

```
progress = (totalQuestions - current.threshold)
           / (next.threshold - current.threshold) * 100
```

capped with `Math.min(progress, 100)`. Boundary behavior: below 50 questions the
student stays at Starter (0% toward Explorer); at Legend (≥1000, no `nextLevel`)
progress shows 100% and the "N more to reach" hint is hidden. The widget shows
how many more questions are needed to advance. This is purely presentational —
there is no server-side level state, and `totalQuestions` is derived **only** from
`daily_logs` (not from AI mock exam answers).

## `RecentScores`

`src/components/RecentScores.tsx` shows a per-day, per-subject score grid for a
selected date (defaulting to today). It filters `logs` (passed from `Index.tsx`)
by the chosen date, then aggregates per subject: average score, total questions,
total minutes. Each subject card is color-coded — green at ≥85%, amber below.
A calendar popover lets the user pick any date.

## `WeeklyReport`

`src/components/WeeklyReport.tsx` renders a Recharts bar chart comparing the
four subjects over the trailing 7 days. `Index.tsx` computes the `weeklyData`
array: for each subject it sums `questions` and averages `score` across logs
dated within the last 7 days. The chart also surfaces a "focus tip" naming the
weakest subject (`data.reduce` for the minimum average score). Summary cards
show total 7-day questions and overall average score (green ≥85%, amber below).

## `ParentSummaryDashboard`

For parents, the Dashboard tab replaces the student widgets with
`src/components/ParentSummaryDashboard.tsx`, which receives `logs`, `streak`, and
`totalQuestions`. It renders:

- Four summary cards: 7-day questions, average score, streak, all-time
  questions.
- A Recharts `LineChart` of daily question counts over the last 7 days (the
  `dailyChart` memo pre-seeds 7 zero-buckets so missing days still appear).

This component composes on the **main Dashboard tab** (the parent branch of
`Index.tsx`), not under the AI Mentor tab.

## Relationship to other systems

<!-- openwiki: broken internal link [../ai-mock-exams.md] file "../ai-mock-exams.md" does not exist. Fix the href or restore the target, then delete this comment. -->
Daily practice is independent of the [AI mock exam](../ai-mock-exams.md) system,
but the two share the `mock_exams` table: when a student submits an AI exam,
`StudentExamMode` writes a summary row into `mock_exams` (provider = exam title,
per-subject correct counts). That row then appears in the
<!-- openwiki: broken internal link [../mock-exam-tracker.md] file "../mock-exam-tracker.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[manual mock tracker](../mock-exam-tracker.md) alongside manually-entered
provider scores.
