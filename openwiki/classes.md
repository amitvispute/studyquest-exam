---
type: concept
title: Class Schedule and Diary
description: class_schedules and class_entries tables, useClassData hook, ClassSchedule component, shared cross-user entry upsert, and parent schedule management.
tags: [classes, react-query, hooks, schedule]
---

# Class Schedule and Diary

The Classes tab tracks two real-world tutoring classes for the student —
"Amruta Maths Class" and "Newell Class" — each rendered by a
`src/components/ClassSchedule.tsx` card. The model is a shared diary: a parent
schedules future class dates, and either role can log the topics, homework, and
notes for a given class date.

## Data model

### `class_schedules` — parent-scheduled dates

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users` (the scheduling parent) |
| `class_name` | text | e.g. "Amruta Maths Class" |
| `scheduled_date` | date | a planned class date |
| | | `UNIQUE(user_id, class_name, scheduled_date)` |

RLS: owner read; parents read all; **parents** insert and delete; students can
read all class schedules (migration `20260403185905`).

### `class_entries` — per-date class diary

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `auth.users` (the original author) |
| `class_name` | text | |
| `date` | date | |
| `topics_covered` | text | |
| `homework` | text | |
| `notes` | text | |
| `completed` | boolean | set true on upsert |
| | | `UNIQUE(class_name, date)` |

RLS: owner read/update/delete; **parents** read all and can delete any; **students
can read all and update all** class entries (migrations `20260409122644`).
This permissive update policy exists because `class_entries` has a
`UNIQUE(class_name, date)` constraint, so two users editing the same class+date
must update the same row rather than insert duplicates — see the upsert logic
below.

## `useClassData` hook

`src/hooks/useClassData.tsx` is parameterized by `className` and returns two
queries plus four mutations:

- **Queries**: `["class_schedules", className]` and `["class_entries",
  className]`, both filtered by `class_name`, entries ordered by `date` desc.
  Enabled when `user` exists.
- **`addScheduleDate(date)`** / **`removeScheduleDate(date)`** — parent-only
  insert/delete of a scheduled date; invalidate the schedules query.
- **`upsertEntry({ date, topics_covered, homework, notes })`** — the key
  operation. Because of the `UNIQUE(class_name, date)` constraint, it cannot
  use a naive insert. Instead it:
  1. Selects any existing row for `(class_name, date)` **directly from the DB**
     (not the cache) — explicitly to handle cross-user entries.
  2. If found, updates that row's topics/homework/notes and sets
     `completed: true`.
  3. Otherwise inserts a new row with the current user as `user_id`.

  This direct-from-DB lookup is necessary because the React Query cache may not
  contain an entry authored by the other role, and RLS allows students to update
  any class entry for the same class+date.
- **`deleteEntry(id)`** — deletes by id; invalidates the entries query.

## `ClassSchedule` component

`src/components/ClassSchedule.tsx` receives `className`, `teacher`, `subject`,
`icon`, `accentClass`, and `canManageSchedule` (set true only for parents in
`Index.tsx`).

- **Calendar**: a `react-day-picker` calendar highlights scheduled dates.
  Clicking a scheduled date opens a `Dialog` to view/edit the diary entry for
  that date. Adding/removing scheduled dates (parent only, when
  `canManageSchedule`) is done by toggling dates on the calendar.
- **Entry dialog**: shows `topics_covered`, `homework`, and `notes` fields.
  When a student opens an already-completed entry, the dialog opens read-only
  (`setReadOnly(isStudent && !!existing?.completed)`), preserving the parent's
  ability to be the last editor of record. Saving calls `upsertEntry`.
- **Delete**: an `AlertDialog` confirms entry deletion via `deleteEntry`; like
  the mock tracker, a local `deletionLog` records deleted entries in memory.

## How the two classes are wired

`Index.tsx` renders two `ClassSchedule` cards in a 2-column grid, one per class,
both visible to both roles but with `canManageSchedule={isParent}`:

```tsx
<ClassSchedule className="Amruta Maths Class" teacher="Amruta" subject="Maths" ... canManageSchedule={isParent} />
<ClassSchedule className="Newell Class" teacher="Newell" subject="11+ Prep" ... canManageSchedule={isParent} />
```

The class names are hardcoded; there is no UI to add new classes. The
`UNIQUE(class_name, date)` constraint and the shared-diary RLS policies make
this a single-household shared notebook between parent and student.
