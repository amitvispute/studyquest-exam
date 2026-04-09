

# Fix: Student Class Details Save Confirmation

## Problem
Student saves class details and gets no confirmation toast. Data IS actually saving to the database (confirmed by querying), but the success/error feedback is unreliable.

## Root Cause
The `handleSaveEntry` in `ClassSchedule.tsx` has no `onError` callback, so if anything goes wrong the student sees nothing. Additionally, there's a potential timing issue where the global `onSuccess` in the mutation definition (which invalidates queries) may conflict with the inline `onSuccess` callback.

## Fix

### `src/components/ClassSchedule.tsx`
- Add `onError` callback to `handleSaveEntry` to show an error toast if save fails
- This ensures the student always gets feedback — either success or error

### `src/hooks/useClassData.tsx`
- Add `onError` callback to the `upsertEntry` mutation definition for consistent error handling
- Ensure query invalidation and toast don't race

## Changes Summary
| File | Change |
|------|--------|
| `src/components/ClassSchedule.tsx` | Add `onError` handler with error toast in `handleSaveEntry` |
| `src/hooks/useClassData.tsx` | Add `onError` to mutation for fallback error handling |

## Test
1. Login as student → open a class → click scheduled date → fill details → save
2. Expect "saved" toast to appear
3. Re-open same date → should show read-only with saved data

