
## Issue found
The app is most likely not actually stuck on the `/auth` page itself. It is getting stuck on the global loading screen from `ProtectedRoute` because `useAuth` keeps `loading = true` while it waits for `user_roles` + `profiles` queries.

### Root cause in current code
`src/hooks/useAuth.tsx` has two risky patterns:
1. `onAuthStateChange` is `async` and `await`s `fetchUserData(...)`
2. `getSession().then(async ...)` also waits for `fetchUserData(...)` before clearing `loading`

If role/profile fetch is slow, fails, or runs before auth is fully restored, `loading` never clears, so `/` never redirects to `/auth`.

## Fix plan

### 1) Refactor auth bootstrapping
Update `src/hooks/useAuth.tsx` so auth initialization is split into 2 phases:
- **Phase A:** restore session/user only
- **Phase B:** fetch `role` and `displayName` separately after session is ready

This means:
- `loading` should represent only “is auth session bootstrapping?”
- role/profile loading should not block routing

### 2) Remove async work from `onAuthStateChange`
Change the auth listener to:
- synchronously set `session` and `user`
- never `await` profile/role queries inside the callback

Then use a separate `useEffect` that runs when `user?.id` changes to load:
- `user_roles.role`
- `profiles.display_name`

### 3) Make auth resilient
In the user-data fetch effect:
- add `try/catch/finally`
- if profile/role fetch fails, set them to `null` instead of blocking the app
- clear role/displayName immediately on sign-out
- avoid stale updates if auth state changes mid-request

### 4) Keep route guards simple
`src/App.tsx`
- `ProtectedRoute` should wait only for auth bootstrap
- once bootstrap completes:
  - if no user → redirect to `/auth`
  - if user exists → render app even if role is still loading
- `AuthRoute` can stay mostly as-is

### 5) Prevent follow-on auth timing bugs
For data hooks/pages that rely on a logged-in user, keep queries gated with `enabled: !!user`.
If needed, add an explicit `authReady` flag from `useAuth` so downstream queries only run after session restore.

## Files to update
- `src/hooks/useAuth.tsx` — main fix
- `src/App.tsx` — ensure routing depends only on auth readiness
- Possibly role-sensitive components/hooks if any still assume `role` is available immediately after session restore

## Test cases
1. Open `/` while logged out → loading screen appears briefly, then redirects to `/auth`
2. Open `/auth` while logged out → login/signup form shows immediately
3. Refresh the app while logged in → dashboard loads, no infinite loading
4. Sign out from dashboard → returns to `/auth`
5. Log in as parent → parent UI appears after load
6. Log in as student → student UI appears after load
7. Simulate missing/slow profile data → app still renders instead of hanging

## Technical details
- Do **not** `await` database work inside `supabase.auth.onAuthStateChange`
- Treat session restoration and profile lookup as separate concerns
- Route blocking should depend on session readiness, not role/profile readiness
- No database schema changes are needed for this fix
