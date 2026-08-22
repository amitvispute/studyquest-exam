---
type: concept
title: Parent Dashboard and Tools
description: Parent-specific views across the Dashboard and AI Mentor tabs, ParentSummaryDashboard on the main tab, and ParentMockCreator, ParentExamResults, ParentCreditSettings under the AI Mentor parent sub-tabs.
tags: [parent, dashboard, components]
---

# Parent Dashboard and Tools

The parent experience is spread across two of the five main tabs. The **Dashboard**
tab shows an aggregated weekly summary of the student's activity; the **AI
Mentor** tab is a 4-sub-tab control center for creating AI exams, chatting,
reviewing results, and managing the student's chat credit limit.

## Main Dashboard tab — `ParentSummaryDashboard`

`src/components/ParentSummaryDashboard.tsx` is rendered on the main Dashboard tab
in the parent branch of `Index.tsx` (alongside `RecentScores`). It receives
`logs`, `streak`, and `totalQuestions` (all computed in `Index.tsx` from the
shared `useDailyLogs` data) and renders:

- **Four summary cards**: 7-day questions, average score (green ≥85% / amber
  below), streak, and all-time questions.
- **Daily Activity chart**: a Recharts `LineChart` of daily question counts over
  the last 7 days. The `dailyChart` memo pre-seeds 7 zero-buckets so days with no
  activity still appear on the chart.

This component composes **on the main Dashboard tab**, not under the AI Mentor tab.

## AI Mentor tab — `ParentAIMentorView`

`src/components/AIMentorChat.tsx` renders `ParentAIMentorView` for parents — a
4-column tab layout:

| Sub-tab | Component | Purpose |
|---|---|---|
<!-- openwiki: broken internal link [../ai-mock-exams.md] file "../ai-mock-exams.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Create | [ParentMockCreator](../ai-mock-exams.md) | Schedule and generate an AI exam |
<!-- openwiki: broken internal link [../ai-mentor.md] file "../ai-mentor.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Chat with AI | [StudentAIMentorChat](../ai-mentor.md) | Reuses the student chat (parents bypass the credit limit) |
| Exam Results | ParentExamResults | Review completed AI exams |
| Credits | ParentCreditSettings | Set the student's daily chat limit |

### `ParentExamResults`

`src/components/ParentExamResults.tsx` shows the parent's completed AI exams
(`ai_mock_exams` where `created_by = user.id` and `status = "completed"`). It
fetches all questions and answers for those exams in two batched queries and
aggregates per-exam and per-subject correct/total counts. A calendar popover
filters exams by date. This gives the parent a read-only analytical view of how
the student did on AI-generated exams (distinct from the
<!-- openwiki: broken internal link [../mock-exam-tracker.md] file "../mock-exam-tracker.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[manual mock tracker](../mock-exam-tracker.md), which shows provider scores).

### `ParentCreditSettings`

`src/components/ParentCreditSettings.tsx` manages the student's
`ai_mentor_settings.daily_limit`. It resolves the student via the
<!-- openwiki: broken internal link [../auth-and-roles.md#single-student-lookup-assumption] file "../auth-and-roles.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[single-student lookup](../auth-and-roles.md#single-student-lookup-assumption),
reads the current settings row and today's usage, and on save upserts the
settings row with `updated_by` set to the parent. RLS permits only parents to
manage `ai_mentor_settings`. The authoritative credit enforcement is
<!-- openwiki: broken internal link [../ai-mentor.md] file "../ai-mentor.md" does not exist. Fix the href or restore the target, then delete this comment. -->
server-side in the [ai-mentor](../ai-mentor.md) edge function; this component is
the configuration surface.

## What the parent does not see

Parents do **not** see the student-only dashboard widgets (`StreakWidget`,
`LevelProgress`, `DailyLogForm`) — the Dashboard tab branches on `isParent`.
Parents also cannot take AI exams (that is a student action via
`StudentExamMode`), though they create and delete them and review results.
