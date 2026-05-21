# Plan

## What I’ll fix
1. Update the AI Mentor chat client to send the signed-in user’s access token instead of the publishable key in the `Authorization` header.
2. Keep the edge function auth check as a user-token validation step, since the current 401 is caused by the wrong client header rather than the function logic itself.
3. Re-check the request flow with logs so the AI Mentor loads and sends messages successfully end-to-end.

## Why this is failing
- The browser is currently calling the AI Mentor function with:
  - `Authorization: Bearer <publishable key>`
- That value is not the logged-in user’s session token.
- Backend auth therefore sees a token without a valid user `sub` claim and returns `401 Unauthorized`.
- The logs already confirm this with `invalid claim: missing sub claim`.

## Files to update
- `src/components/StudentAIMentorChat.tsx`

## Technical details
- Replace the hardcoded auth header source:
  - from `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
  - to the current session access token from the auth client/session
- Prefer using the existing auth state from `useAuth()` if the session is already available there.
- If needed, fall back to `supabase.auth.getSession()` before sending the request.
- Preserve the current streaming response handling and credit refresh behavior.

## Verification
1. Open AI Mentor as an authenticated student.
2. Send a message.
3. Confirm the function call no longer returns 401.
4. Confirm the assistant streams a response and usage tracking updates normally.