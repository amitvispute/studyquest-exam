

# Visual Mockup: Delete Icon & Deletion Log

## Mock Exam Card (Parent View)

```text
┌─────────────────────────────────────────────┐
│  GL Assessment                   285/400    │
│  08 Apr 2026                      71%       │
│                                  ✏️  🗑️     │
│  Eng: 72  Maths: 68  VR: 75  NVR: 70       │
│  Good attempt, needs VR practice            │
└─────────────────────────────────────────────┘

  ✏️ = existing pencil edit icon
  🗑️ = NEW red trash icon (same size as pencil)
```

Clicking 🗑️ opens a confirmation dialog:

```text
┌─────────────────────────────────────┐
│  Delete Mock Exam Result            │
│                                     │
│  Are you sure you want to delete    │
│  the GL Assessment result for       │
│  08 Apr 2026? This cannot be undone.│
│                                     │
│         [Cancel]   [Delete]         │
│                     (red)           │
└─────────────────────────────────────┘
```

After deletion, at the bottom of the recents list:

```text
┌─────────────────────────────────────────────┐
│  Recent Results                             │
│  ─────────────────────────────────────      │
│  (remaining exam cards...)                  │
│                                             │
│  ─── Deletion Log ───                       │
│  🗑️ GL Assessment for 08 Apr was deleted    │
│  🗑️ Bond Paper for 05 Apr was deleted       │
└─────────────────────────────────────────────┘
```

## Class Entry Card (Parent View)

```text
┌─────────────────────────────────────────────┐
│  08 Apr 2026                     Done  🗑️   │
│  📖 Topics: Fractions, Decimals             │
│  ✏️ Homework: Page 25-30                    │
│  📝 Good progress today                     │
└─────────────────────────────────────────────┘
```

The 🗑️ sits next to the "Done" badge on the top-right. Same confirmation dialog pattern. After deletion:

```text
│  Recent Classes                             │
│  ─────────────────────────────────────      │
│  (remaining class entry cards...)           │
│                                             │
│  ─── Deletion Log ───                       │
│  🗑️ Amruta Maths entry for 08 Apr deleted  │
└─────────────────────────────────────────────┘
```

## Student View (No Changes)

Students see the same cards but **without** the ✏️ or 🗑️ icons — no edit or delete capability.

## Styling Notes
- Trash icon: `Trash2` from lucide-react, `h-4 w-4`, red-tinted on hover (`text-destructive`)
- Deletion log entries: `text-sm text-muted-foreground italic`, separated by a thin border-top
- Confirmation dialog: uses existing `AlertDialog` component with destructive variant button

