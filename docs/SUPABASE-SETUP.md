# Supabase Player Persistence Setup

Project: `hwarofkifzzutqkrmswl`

The `rpg_profiles` table is live with row-level security. Players may read only their own row. Browser clients cannot insert, update, or delete progression; those operations are reserved for the trusted backend service role.

## Required dashboard setting

Anonymous sign-ins are currently disabled. Until this is enabled, the game intentionally runs in guest mode and saves progress only to local storage.

1. Open the Supabase project dashboard.
2. Go to **Authentication -> Providers -> Anonymous**.
3. Enable anonymous sign-ins.
4. Enable Cloudflare Turnstile or another CAPTCHA before public launch to limit automated account creation.

Anonymous accounts use the `authenticated` Postgres role and can later be linked to a permanent identity. Clearing browser storage or changing devices loses an unlinked anonymous identity, so a wallet or email linking flow is still required before mainnet rewards.

## Frontend variables

```text
VITE_SUPABASE_URL=https://hwarofkifzzutqkrmswl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<project publishable key>
```

Publishable keys are safe in the browser when RLS and least-privilege grants are enabled. Never put a Supabase secret or service-role key in a `VITE_` variable.

## Backend variables

```text
SUPABASE_URL=https://hwarofkifzzutqkrmswl.supabase.co
SUPABASE_SECRET_KEY=<server-only secret key>
REQUIRE_RPG_AUTH=true
```

Set backend secrets through Fly secrets, never in Git:

```powershell
cd server
fly secrets set SUPABASE_URL="https://hwarofkifzzutqkrmswl.supabase.co" SUPABASE_SECRET_KEY="YOUR_SERVER_SECRET" REQUIRE_RPG_AUTH="true"
fly deploy
```

Use `REQUIRE_RPG_AUTH=false` only while guest playtesting. With `true`, the WebSocket upgrade rejects players who do not have a valid Supabase session instead of silently creating an insecure local-only player.

## Current security boundary

- Shared combat, resource claims, enemy HP, rewards, and respawns are server-authoritative.
- Authenticated profiles load before the player enters a room and use optimistic revision checks to prevent lost updates.
- Authenticated gold, XP, HP, inventory, bank, quests, purchases, crafting, consumables, appearance, and equipment are validated and persisted by the realtime server.
- Combat style, combat level, weapon power, gathering level, and tool power are derived from the stored profile for authenticated players; forged client values are ignored.
- The profile schema and RLS boundary are deployed. Browser clients have no profile write permission.
- Guest mode continues to use local storage so the game remains testable before anonymous auth is enabled.
- Local storage is not secure enough for tradable or mainnet rewards.

Automated checks:

```powershell
npm run test:profiles
npm run test:auth-server
npm run test:world
```

Do not enable token withdrawals or a player marketplace until wallet linking, withdrawal replay protection, idempotent transaction records, rate limits, and production load testing are complete.
