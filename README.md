# Ore Acres

A browser-based fantasy MMO playtest with a Solana-themed optional economy. Players explore Orehaven and Briarwild together, complete quests, fight roaming creatures, gather resources, craft equipment, customize layered characters, participate in cooperative rare-spawn events, and chase permanent collection-log discoveries. The frontier includes animated rats, wolves, ember tusk boars, slimes, skeletons, treants, and spell-casting witches.

## What to deploy where

- **Cloudflare Pages**: the React client in this repo
- **Fly.io**: the realtime multiplayer server

This split keeps the front end fast and cheap on Cloudflare while giving us a place to run long-lived websocket connections on Fly.

## Local development

Install the client dependencies and run the game:

```bash
npm install
npm run dev
```

## Cloudflare Pages

Use these settings when creating the Pages project:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

If you connect the repo through GitHub, Cloudflare will handle deploys automatically on each push.

## Fly.io

The `server/` folder contains the authoritative WebSocket runtime for shared movement, enemies, gathering nodes, quests, rewards, and persisted player profiles.

```bash
cd server
npm install
npm run dev
```

Deploy it to Fly from the `server/` directory:

```bash
cd server
fly launch
fly deploy
```

The server exposes `/healthz` for deployment checks and can use Supabase for authenticated profile persistence. See [SUPABASE-SETUP.md](/mnt/c/Users/shane/Documents/Codex/2026-06-23/can/docs/SUPABASE-SETUP.md) before enabling account-backed progression.

Local realm administration is available at `http://localhost:5173/admin.html`. The console can inspect live sessions, safely edit player progression, recover world state, and browse Supabase-backed profiles. See [ADMIN-CONSOLE.md](/mnt/c/Users/shane/Documents/Codex/2026-06-23/can/docs/ADMIN-CONSOLE.md) for local startup and production security.

## Game verification

Run the production build and complete deterministic RPG suite before deployment:

```bash
npm run build
npm run test:rpg
```

The deterministic suite covers world connectivity, quest rules, daily activities, weighted loot parity, profile persistence, authenticated combat, chat, hostile AI, and cooperative events. See [MMO-PLAYTEST.md](/mnt/c/Users/shane/Documents/Codex/2026-06-23/can/docs/MMO-PLAYTEST.md) for controls, multiplayer checks, and the manual collision route.

## Suggested environment variables

Client:

- `VITE_MULTIPLAYER_WS_URL` - websocket URL for the Fly service

Server:

- `PORT` - runtime port used by Fly
- `ALLOWED_ORIGIN` - optional client origin allowlist
- `ADMIN_API_TOKEN` - required secret for non-local realm-console access
- `ADMIN_AUDIT_FILE` - optional persistent JSONL audit-log path
- `PAYMENT_MINT_ADDRESS` - the pump.fun token mint used for item pricing
- `PAYMENT_RESERVE_OWNER_WALLET` - main treasury/reward reserve owner wallet
- `PAYMENT_REWARD_RESERVE_OWNER_WALLET` - reward-reserve sink owner wallet
- `PAYMENT_OPS_OWNER_WALLET` - ops / maintenance owner wallet
- `PAYMENT_RESERVE_TOKEN_ACCOUNT` - optional pre-created token account override
- `PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT` - optional pre-created token account override
- `PAYMENT_OPS_TOKEN_ACCOUNT` - optional pre-created token account override
- `PAYMENT_RESERVE_BPS` - default `8000`
- `PAYMENT_REWARD_RESERVE_BPS` - default `1000`
- `PAYMENT_OPS_BPS` - default `1000`
- `PAYMENT_TOKEN_PRICE_USD_OVERRIDE` - optional fallback USD price per token
- `BIRDEYE_API_KEY` - optional price API key if you want live token pricing
- `BIRDEYE_PRICE_URL` - optional price endpoint override

Current test/planning payment structure:

- `PAYMENT_MINT_ADDRESS`: `7eTsoXT3HA2rCu1vF61CkvTJbA5bnh9pDgnB2vqMpump`
- `PAYMENT_RESERVE_OWNER_WALLET`: `B3VZNSnWYGCZ1ZcydfSKvzjrL1UsYXWG5HTbgHAKaVjX`
- `PAYMENT_REWARD_RESERVE_OWNER_WALLET`: `39DYX1oRUHCuQg9zFhB5HW8pJ3WhBeNXmZYyzVWf9Cao`
- `PAYMENT_OPS_OWNER_WALLET`: `GrKAPcrb45WoxdxEwxoXyhbZmLWGoADwNsGGpWNmA4XC`

The checkout transaction derives associated token accounts for owner wallets automatically. You only need pre-created token-account env vars if you want to override the default ATA flow.

Client can optionally also use:

- `VITE_PAYMENT_API_URL` - base URL for the Fly server if it differs from the websocket URL
- `VITE_SOLANA_RPC_URL` - RPC URL used to submit token payments, defaults to mainnet-beta
- `VITE_ADMIN_API_URL` - HTTPS origin for the protected realm admin API

## Notes

Solana is used here as the economy theme and wallet identity layer. The in-game resource loop can stay off-chain while the multiplayer state lives on Fly.

See [ECONOMY.md](/mnt/c/Users/shane/Documents/Codex/2026-06-23/can/ECONOMY.md) for the launch pricing bands, reward caps, and reserve split plan.
