## Goal
Enable asymmetric (ES256) JWT signing on the project's Supabase auth so MCP OAuth clients (ChatGPT, Claude, Codex, etc.) can complete sign-in against the newly wired MCP server.

## Why
MCP OAuth requires the authorization server to sign the OIDC ID token with an asymmetric key. This project is still on the legacy symmetric HS256 secret, which means `/oauth/token` refuses to issue an ID token and MCP sign-in fails with "HS256 is not supported for ID token signing". The rest of the MCP setup (tools, consent route, `configure_oauth_server`, deployed `mcp` function) is already in place and won't work end-to-end until this is done.

## What runs
A single call to `supabase--migrate_signing_keys`. It:
- Is idempotent — no-op if an asymmetric key is already active.
- Otherwise activates an existing standby ES256 key, or imports the legacy secret and creates + activates a new ES256 key.
- Keeps existing HS256-signed user sessions verifying until they naturally expire, so nobody is signed out.

## Impact
- No schema changes, no table changes, no code changes.
- No user-visible behavior change in the app itself.
- After it runs, MCP OAuth sign-in via external clients will succeed.

## Verification after approval
1. Re-run `supabase--debug_oauth_server` and confirm an asymmetric signing key is now present.
2. Optionally test a connection from an MCP client to `https://gztffbygqnxhgaxhvlrk.supabase.co/functions/v1/mcp` and confirm the OAuth handshake completes at the consent screen.
