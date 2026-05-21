## Problem
GitHub is the source of truth for the publish build. After you removed `.env` from GitHub, the production bundle was built without `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, so `createClient(undefined, undefined)` throws `supabaseUrl is required` and the page is blank. Lovable's preview still works because preview injects these vars at dev time.

Lovable has **no Settings panel for frontend build env vars**:
- Cloud → Secrets = runtime only (edge functions), never reaches the browser bundle.
- Workspace Build Secrets = only for `npm install` (private registries).
- Only `.env` feeds Vite's `import.meta.env`.

## Fix
Add a `define` block in `vite.config.ts` that uses `loadEnv` first (so local `.env` still wins) and falls back to the public Supabase URL + anon key when env is absent. The GitHub-sourced publish build will then always have valid values baked in.

### Why this is safe
- `VITE_SUPABASE_URL` is a public endpoint.
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key) is designed to ship in every browser bundle — every Supabase/Firebase app does this. Security is enforced by RLS policies, not by hiding the anon key.
- No service role key, no secret token is touched.

## Changes
- **`vite.config.ts`** — wrap config in the function form, call `loadEnv(mode, process.cwd(), '')`, and add:
  ```ts
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://gztffbygqnxhgaxhvlrk.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || '<anon key>'),
  }
  ```

## Out of scope
- `src/integrations/supabase/client.ts` (auto-generated, not edited).
- `.env`, `.gitignore`, edge functions, RLS — all unchanged.

## Verification
After implementing, click Publish → Update, reload `studyquest-exam.lovable.app`, and confirm the app renders with no `supabaseUrl is required` error in DevTools.
