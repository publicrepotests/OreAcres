# Ore Acres

A Solana-themed idle miner prototype with plots, shops, cosmetics, rewards, and a multiplayer-friendly world layout.

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

The `server/` folder contains a lightweight websocket starter for multiplayer.

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

The current server is intentionally minimal:

- Keeps player state in memory
- Broadcasts joins, leaves, and movement updates
- Exposes a `/healthz` endpoint for load checks

That is enough to wire the client to realtime multiplayer next, without changing the hosting plan again.

## Suggested environment variables

Client:

- `VITE_MULTIPLAYER_WS_URL` - websocket URL for the Fly service

Server:

- `PORT` - runtime port used by Fly
- `ALLOWED_ORIGIN` - optional client origin allowlist
- `PAYMENT_MINT_ADDRESS` - the pump.fun token mint used for item pricing
- `PAYMENT_RESERVE_TOKEN_ACCOUNT` - main reward reserve token account
- `PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT` - future rewards reserve token account
- `PAYMENT_OPS_TOKEN_ACCOUNT` - ops / maintenance token account
- `PAYMENT_RESERVE_BPS` - default `8000`
- `PAYMENT_REWARD_RESERVE_BPS` - default `1000`
- `PAYMENT_OPS_BPS` - default `1000`
- `PAYMENT_TOKEN_PRICE_USD_OVERRIDE` - optional fallback USD price per token
- `BIRDEYE_API_KEY` - optional price API key if you want live token pricing
- `BIRDEYE_PRICE_URL` - optional price endpoint override

Client can optionally also use:

- `VITE_PAYMENT_API_URL` - base URL for the Fly server if it differs from the websocket URL
- `VITE_SOLANA_RPC_URL` - RPC URL used to submit token payments, defaults to mainnet-beta

## Notes

Solana is used here as the economy theme and wallet identity layer. The in-game resource loop can stay off-chain while the multiplayer state lives on Fly.

See [ECONOMY.md](/mnt/c/Users/shane/Documents/Codex/2026-06-23/can/ECONOMY.md) for the launch pricing bands, reward caps, and reserve split plan.
