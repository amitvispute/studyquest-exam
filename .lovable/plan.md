

# Fix Class Entry Visibility, AI Mentor Badge & Expired Exams

## Issues Found

### 1. Class entries not visible to student (duplicate error)
**Root cause**: There's a `UNIQUE (class_name, date)` constraint on `class_entries` — only ONE entry per class per date. When parent saves for April 8, student can't see it (RLS only allows "read own"), so the UI thinks no entry exists and tries INSERT → duplicate key error. Fix: let students read ALL class entries (shared per-class data) so the upsert finds the existing entry.

### 2. April 20 orphan data
Entry for April 20 in "Amruta Maths Class" was created by student (user 77f8). User wants it deleted.

### 3. AI Mentor star badge shows when no future exam
The query checks `status = 'scheduled'` but doesn't check if `scheduled_end > now()`. There's an old "Practice Test" from April 5 still in `scheduled` status. The badge shows incorrectly.

### 4. Expired scheduled exams should show as "not completed"
Exams where `status = 'scheduled'` and `scheduled_end < now()` should be auto-marked as `expired` and displayed as "Not Completed" in recents.

---

## Changes

### A. Database Migration
1. Add RLS policy: **Students can read all class entries** (SELECT for students, like parents already have)
2. Add RLS policy: **Students can update all class entries** (so student can update a parent-created entry for the same class+date)

### B. Data Cleanup (via insert/update tool)
- DELETE the April 20 entry: `DELETE FROM class_entries WHERE id = '5580437a-6477-434e-8975-1d66fabf0a61'`
- UPDATE expired exams: `UPDATE ai_mock_exams SET status = 'expired' WHERE status = 'scheduled' AND scheduled_end < NOW()`

### C. `src/pages/Index.tsx`
- Fix `pendingExamCount` query: add `.gt("scheduled_end", new Date().toISOString())` to only count future scheduled exams
- The star badge will then correctly hide when no future exams are scheduled

### D. `src/components/StudentExamMode.tsx` (or wherever exam list is rendered)
- Show exams with `status = 'expired'` with a "Not Completed" badge in the recents list

### E. `src/hooks/useClassData.tsx`
- In `upsertEntry`, fetch existing entry directly from DB (not from cached `entries` array) to handle race conditions where the entry was created by another user and is now visible

---

## Files Changed
| File | Change |
|------|--------|
| Migration SQL | Add 2 RLS policies for students on class_entries |
| Data operation | Delete April 20 entry, mark expired exams |
| `src/pages/Index.tsx` | Filter pendingExamCount to future exams only |
| `src/components/StudentExamMode.tsx` | Show expired exams as "Not Completed" |
| `src/hooks/useClassData.tsx` | Fix upsert to find entries from any user |

## Test Cases
| # | Test |
|---|------|
| 1 | Student opens Classes tab → sees entries for 7th and 8th (including parent-created) |
| 2 | Student clicks a date with existing entry → sees read-only saved data, no duplicate error |
| 3 | April 20 data no longer appears |
| 4 | AI Mentor tab star badge gone (no future scheduled exams) |
| 5 | Expired "Practice Test" shows as "Not Completed" in exam history |

