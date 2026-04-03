

# Revamp Subject Score Visualization

Replace the current list-based `RecentScores` component with a tile-based layout showing each subject as a distinct card with today's score prominently displayed, plus a calendar dropdown for historical lookups.

## Design

```text
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ 📖       │  │ 🔢       │  │ 🧩       │  │ 🔷       │
│ English  │  │ Maths    │  │ VR       │  │ NVR      │
│          │  │          │  │          │  │          │
│  82%     │  │  91%     │  │  --      │  │  78%     │
│ 20 Qs    │  │ 15 Qs    │  │ No data  │  │ 10 Qs    │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
                    [ 📅 Today ▾ ]
```

- 4 subject tiles in a `grid-cols-2 md:grid-cols-4` grid
- Each tile: emoji, subject name, large score %, questions count
- Color-coded: green border/text if ≥85%, amber if <85%, muted if no data
- Below the grid: a single calendar date picker button (defaults to "Today")
- Selecting a past date updates all 4 tiles to show that date's scores

## Changes

### `src/components/RecentScores.tsx` — Full rewrite
- Replace vertical list with 4 subject tile cards
- Group entries by subject for the selected date
- Each tile shows: emoji, label, score (or "--"), question count, minutes
- Calendar popover at top-right to pick date
- Tile click does nothing (display only)

### `src/pages/Index.tsx` — No changes needed
Already passes `entries` to `RecentScores`.

## Technical Notes
- Reuse existing `Calendar` and `Popover` components
- Keep the same `ScoreEntry` interface — no data changes needed
- If multiple logs exist for the same subject on one date, average the scores and sum the questions/minutes

