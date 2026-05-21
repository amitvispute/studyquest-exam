## Problem

The AI Mentor edge function crashes with:
`TypeError: supabase.auth.getClaims is not a function`

`getClaims()` was added in `@supabase/supabase-js` v2.46+, but the function pins `@supabase/supabase-js@2.45.0`, so the method doesn't exist at runtime → 500 → chat fails to load/send.

## Fix

Replace the `getClaims(token)` call with `getUser()`, which exists in v2.45 and also validates the JWT against Supabase Auth using the `Authorization` header already attached to the client.

### File: `supabase/functions/ai-mentor/index.ts`

Replace this block:
```ts
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const userId = claimsData.claims.sub as string;
```

With:
```ts
const { data: userData, error: userError } = await supabase.auth.getUser();
if (userError || !userData?.user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const userId = userData.user.id;
```

No other changes — rate-limit logic, usage increment, and streaming response all keep working since they only depend on `userId`.

## Verify

1. Function auto-deploys after the edit.
2. Open the AI Mentor tab and send a test message.
3. Confirm: 200 streaming response, no `getClaims` error in edge logs, `ai_mentor_usage.message_count` increments for the student.
