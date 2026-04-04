

# Fix Missing UI Elements After Publishing

## Root Cause

The `useAuth` hook has a race condition: it sets `loading = false` **before** `fetchUserData` completes. This means `role` is `null` when components first render. While React should re-render when `role` arrives, there are two compounding issues:

1. In `onAuthStateChange`, `fetchUserData` is deferred via `setTimeout(..., 0)`, and `setLoading(false)` runs immediately
2. In `getSession`, `fetchUserData` is called but not awaited before `setLoading(false)`

This causes all role-dependent UI (calendar filter button, edit pencil icon, parent AI mentor tabs) to render with `role === null` initially. On slower connections (like the published site vs local preview), this gap is more pronounced and can cause components to mount without role data.

## Fix

### `src/hooks/useAuth.tsx`
- Await `fetchUserData` before setting `loading = false` in the `getSession` path
- Remove `setTimeout` wrapper in `onAuthStateChange` — just call `fetchUserData` directly (without `await` to avoid the Supabase deadlock issue, but set loading false only after role is fetched)
- Add a dedicated `roleLoaded` tracking: don't set `loading = false` until both session AND role are resolved

```text
Flow before:
  getSession → setLoading(false) → fetchUserData (async, unresolved)
  
Flow after:
  getSession → fetchUserData (await) → setLoading(false)
```

### No changes needed to other files
The MockExamTracker, AIMentorChat, and ParentExamResults components are coded correctly — they just need `role` to be available when they render.

## Files
| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Fix loading state to wait for role fetch |

## Test Cases
| # | Test | Expected |
|---|------|----------|
| 1 | Login as parent, go to Mocks tab | Calendar filter button and edit pencil visible |
| 2 | Login as parent, go to AI Mentor tab | Four sub-tabs shown (Create, Chat, Results, Credits) |
| 3 | Login as student, go to Mocks tab | Calendar filter button visible, no edit pencil |
| 4 | Refresh page while logged in | All role-specific UI appears without flicker |

