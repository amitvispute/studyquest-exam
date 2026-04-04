

# Fix Mock Exam Save Confirmation & History Display

## Issues
1. **StudentExamMode**: Saves to `mock_exams` but doesn't show a "results saved" toast separately from "Exam submitted" — and doesn't invalidate `mock_exams` query key, so the Mocks tab won't refresh.
2. **MockExamTracker**: Only parents can add results — students should also be able to submit external test center results. Once submitted, students see read-only. Parents can add and edit.
3. **Default view** should show last 7 days, older via calendar with highlighted dates.
4. **No `updateMock`** mutation exists for parent editing.

## Changes

### 1. `src/components/StudentExamMode.tsx`
- After inserting into `mock_exams` (line ~147-158), add error handling with `toast.error` if insert fails, and explicit `toast.success("Results saved successfully! ✅")` on success
- Add `queryClient.invalidateQueries({ queryKey: ["mock_exams"] })` after successful insert so the Mocks tab immediately shows the new result

### 2. `src/hooks/useMockExams.tsx`
- Add `updateMock` mutation for parent edits (update by `id`)
- Return `updateMock` from the hook

### 3. `src/components/MockExamTracker.tsx`
- **Both roles** can see the "Add Result" button and submit form
- **Student**: result cards are read-only (no Edit button)
- **Parent**: result cards show an "Edit" button; clicking it pre-fills the form for that mock; submit calls `updateMock`
- **Default view** (no filter): show only last 7 days of results
- **Calendar filter**: highlight dates with scores; selecting a date shows that day's results; "Clear" returns to 7-day view
- Add `editingId` state for parent edit flow
- Success toast: already shows "Mock exam result saved! 📝" — keep this

## Files
| File | Change |
|------|--------|
| `src/components/StudentExamMode.tsx` | Add error handling on mock_exams insert, success toast, invalidate `mock_exams` query |
| `src/hooks/useMockExams.tsx` | Add `updateMock` mutation |
| `src/components/MockExamTracker.tsx` | Both roles can add, student read-only after save, parent can edit, 7-day default, calendar filter |

## Test Cases
| # | Test | Expected |
|---|------|----------|
| 1 | Student completes AI mock exam | "Results saved successfully! ✅" toast appears |
| 2 | Student opens Mocks tab after | New result visible in recent history |
| 3 | Student manually adds external test result | Form works, toast confirms, result appears read-only |
| 4 | Parent adds result | Works as before |
| 5 | Parent clicks Edit on a result | Form pre-fills, save updates the record |
| 6 | Default view (no filter) | Shows last 7 days only |
| 7 | Calendar filter on older date | Shows that date's results, dates with data highlighted |

