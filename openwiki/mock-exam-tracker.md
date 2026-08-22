---
type: concept
title: Manual Mock Exam Tracker
description: mock_exams table, useMockExams hook CRUD, MockExamTracker add/edit/delete with inline card rows, score badge thresholds, and the 7-day default filter.
tags: [mock-exams, react-query, hooks, crud]
---

# Manual Mock Exam Tracker

The Mocks tab (rendered by `src/components/MockExamTracker.tsx`) tracks
**manually-entered** mock exam results — typically scores from external practice
papers or real exam providers. This is distinct from the
<!-- openwiki: broken internal link [../ai-mock-exams.md] file "../ai-mock-exams.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[AI-generated mock exams](../ai-mock-exams.md), though the two share the same
`mock_exams` table: when a student completes an AI exam, `StudentExamMode` writes
a summary row here so it appears alongside manual entries.

## Data: `mock_exams`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users`, owner |
| `date` | date | exam date |
| `provider` | text | e.g. "Bond", "CGP", or an AI exam title |
| `english_score` / `maths_score` / `vr_score` / `nvr_score` | int (nullable) | per-subject scores |
| `total_score` | int (nullable) | aggregate |
| `max_score` | int | defaults to 400 |
| `notes` | text | freeform |

RLS: owner read/insert/update/delete; parents can read all, update all, and
delete any. Students can read all (added by migration `20260409130357`). See
<!-- openwiki: broken internal link [../architecture/data-model.md] file "../architecture/data-model.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[data model](../architecture/data-model.md).

## `useMockExams` hook

`src/hooks/useMockExams.tsx` exposes a full CRUD surface via React Query:

- **Query** `["mock_exams"]` — all rows ordered by `date` desc; enabled when
  `user` exists.
- **`addMock`** — inserts with `user_id` forced to the current user.
- **`updateMock`** — updates by `id`.
- **`deleteMock`** — deletes by `id`.

Every mutation invalidates `["mock_exams"]` on success.

## `MockExamTracker` component

Both parents and students use this component. It renders a header with a date
filter and an "Add Result" toggle that expands an inline form. The form collects
date, provider, four subject scores, total, max (default 400), and notes.

The component reads `role` from `useAuth` (`isParent = role === "parent"`).
**Both roles can add results** (the "Add Result" button is always shown), but
the **edit and delete buttons are parent-only**: per-row edit/delete actions are
gated behind `isParent`, so students can only view and add, not modify or remove
existing results.

### Add / edit flow

- **Add**: `handleSubmit` builds a payload (nullable scores where the input is
  empty), calls `addMock.mutate`, resets the form, and toasts on success.
- **Edit**: `handleEdit(mock)` populates the form from an existing row and sets
  `editingId`; submit then calls `updateMock.mutate({ id, ...payload })`.

### Delete flow

Deletion is confirmed via an `AlertDialog`. `confirmDelete` calls
`deleteMock.mutate(deleteTarget.id)`; on success it also appends a human-readable
label to a local `deletionLog` state (an in-memory undo-style record, not
persisted).

### Default 7-day filter

When no filter date is selected, the list shows only mocks within the last 7
days (`isAfter(new Date(m.date), subDays(now, 7))`). Selecting a date via the
calendar popover filters to that exact date; a "Clear filter" action restores the
7-day view. Calendar dates that have scores are highlighted
(`modifiers={{ hasScore: mockDates }}`).

### Score badge thresholds

`getScoreBadge(score, max)` computes a percentage (treating `max === 100` as
already-a-percentage) and renders a badge: green (`bg-success`) at ≥85%,
amber (`bg-warning`) below. This 85% threshold is the app-wide "good score"
cutoff, reused across the daily-practice and AI-exam results views.

### Inline card rows

Unlike the AI-exam history (which uses the dedicated `ExamHistoryCard`), manual
mock results are rendered inline within `MockExamTracker` as `<Card>` rows
showing provider, date, scores, and edit/delete actions. There is no separate
card component for manual mocks.

## Relationship to AI mock exams

<!-- openwiki: broken internal link [../ai-mock-exams.md] file "../ai-mock-exams.md" does not exist. Fix the href or restore the target, then delete this comment. -->
The [AI mock exam](../ai-mock-exams.md) submission path writes into this same
`mock_exams` table with `provider` set to the AI exam's title and per-subject
correct counts. So a completed AI exam appears as a row here, but its detailed
question-level review lives in the AI-exam components (`MockExamResults`,
`ExamHistoryCard`).
