---
type: concept
title: Design System
description: Tailwind CSS tokens, shadcn/ui primitives, custom gradients and animations, success/warning thresholds, and the 85% good-score cutoff used across StudyQuest.
tags: [design-system, tailwind, shadcn, theming]
---

# Design System

StudyQuest uses Tailwind CSS 3 with CSS-variable-based theming and a shadcn/ui
component library (Radix primitives) generated via `components.json`. The visual
language is a warm, encouraging study app: deep navy primary, soft cream
background, and semantic success/warning colors tied to an 85% "good score"
threshold that recurs across the app.

## Configuration

- `tailwind.config.ts` — `darkMode: ["class"]`, content globs for `pages`,
  `components`, `app`, and `src`. Extends colors to CSS variables, sets `Inter`
  as the font, and registers `tailwindcss-animate`.
- `src/index.css` — defines `:root` and `.dark` CSS variable blocks (HSL triplets
  without the `hsl()` wrapper so Tailwind can compose them), plus custom gradient
  and animation utilities.
- `components.json` — shadcn/ui config: `style: default`, `baseColor: slate`,
  `cssVariables: true`, aliases mapping `@/components`, `@/lib/utils`, etc.
- `src/lib/utils.ts` — exports `cn()`, the `clsx` + `tailwind-merge` class merger
  used throughout the components.

## Color tokens

| Token | Light | Purpose |
|---|---|---|
| `--background` / `--foreground` | warm cream / dark navy | base surface |
| `--primary` / `--primary-foreground` | navy / cream | headers, CTAs |
| `--card` | white | card surfaces |
| `--success` / `--success-foreground` | green | ≥85% scores, completions |
| `--warning` / `--warning-foreground` | amber | below-85% scores |
| `--destructive` / `--destructive-foreground` | red | errors, "Missed" exams |
| `--streak` / `--streak-glow` | orange-red | streak flame gradient |

The `.dark` variant remaps these to a dark navy palette. Dark mode is class-based
(`darkMode: ["class"]`); `next-themes` is a dependency, though the app primarily
targets the light theme.

## Custom gradients and utilities

Defined in `src/index.css` under `@layer utilities`:

- `.gradient-primary` — navy gradient used for headers and the chat/creator cards.
- `.gradient-success` — green gradient for level progress bars.
- `.gradient-streak` — orange/red gradient for the streak bar.
- `.shadow-card` / `.shadow-card-hover` — soft card shadows.
- `.animate-flame` — a scale/rotate keyframe animation for the streak 🔥 emoji.
- `.animate-pulse-glow` — a pulsing box-shadow glow.

An `input, textarea, select { font-size: 16px !important }` rule prevents iOS
auto-zoom on input focus.

## shadcn/ui primitives

`src/components/ui/` contains the full shadcn/ui set (accordion, alert-dialog,
avatar, badge, button, calendar, card, carousel, chart, checkbox, command,
dialog, drawer, dropdown-menu, form, input, label, popover, progress, scroll-area,
select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs,
textarea, toast, tooltip, etc.). These are Radix-based primitives customized with
the project's tokens. Domain components compose these primitives rather than
raw HTML.

## The 85% good-score threshold

A recurring convention: a score percentage of **85% or above** is rendered with
`success` (green) styling; below 85% uses `warning` (amber). This appears in:

- `MockExamTracker.getScoreBadge` — manual mock score badges.
- `MockExamResults` — overall and per-subject result styling.
- `RecentScores` — per-subject daily score cards.
- `WeeklyReport` / `ParentSummaryDashboard` — average-score summary cards.

`LevelProgress` uses a separate threshold table (50/150/300/500/1000 questions)
for gamification, unrelated to the 85% score cutoff.
