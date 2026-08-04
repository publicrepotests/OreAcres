# Ore Acres MMO Playtest Guide

## Local launch

Use two terminals from the repository root.

```powershell
npm run dev
```

```powershell
cd server
npm start
```

Open `http://localhost:5173/game?room=lobby`. A second browser in the same room should show the other player.

## Controls

- Move: `WASD`, arrow keys, or click a destination
- Interact: `E`, `Space`, or the bottom action button
- Inventory: `I`
- Equipment and appearance: `G`
- Skills: `K`
- Quests: `Q`
- Activities, daily contracts, milestones, and collection log: `J`
- Shops: `B`
- World map: `M`
- Close a panel: `Esc`
- Focus world chat: `Enter`

## Current vertical slice

- Shared Orehaven and Briarwild overworld across a 1536x2048 map
- Directional layered player animation with skin, hair, dye, armor, tool, and weapon customization
- Melee, ranged, and magic combat with line of sight, attack range, enemy pursuit, and attack animations
- Ten skills, NPC dialogue, shops, equipment requirements, consumables, banking, and crafting
- Three quest chapters with 31 deterministic states covering combat, gathering, and crafting
- Fifteen contested gathering nodes with server-owned rewards and respawns
- Nineteen persistent enemies, including animated skeletons and spell-casting witches
- Cooperative Auric Slime world event with contribution rewards and a weighted loot pool
- Four UTC-daily contracts, eight lifetime milestones, and claim-ready menu badges
- Enemy-specific weighted loot across all nineteen creatures, with eleven collectibles and four rare/epic equipment drops
- Permanent collection-log credit that survives banking, equipping, consuming, and future trading
- Server-authoritative trophy selling with modest gold values and equipped-item protection
- Room-wide chat with recent history, join/leave notices, and in-world speech bubbles
- Server-authoritative profiles persisted through Supabase when account authentication is configured
- Tight object-specific collisions with tested roads, entrances, gates, docks, and bridges

## Verification

```powershell
npm run build
npm run test:rpg
```

The suite verifies map connectivity and collision-safe approaches, client/server quest and loot parity, UTC activity resets, collection persistence, authenticated movement and combat authority, melee/ranged/line-of-sight rules, hostile pursuit and ranged enemy attacks, duplicate-session handling, contested rewards, one-time chapter and contract rewards, chat abuse limits, and cooperative world-event payouts.

## Collision checklist

- Walk through the keep door and every town gate.
- Follow the full south road into Briarwild without leaving the visible path.
- Circle each town building closely; roofs can overlap the character visually, but invisible space should not block the road.
- Cross the Moonwater dock and both Moonfen bridges near each visible edge.
- Approach Lyra, every gathering node, and every enemy without walking through a structure.
- Confirm ranged and magic attacks fail when a wall or cliff blocks line of sight.

## Production gate

Authenticated progression is server-authoritative and can persist through Supabase, but the game remains a playtest until production environment variables, RLS, backups, rate limiting, observability, and wallet/payment reconciliation have all been verified in the deployed environment. Guest saves remain browser-local and are not suitable for valuable rewards.
