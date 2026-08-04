# Orehaven Realm Console

The realm console is available at `http://localhost:5173/admin.html` while the local frontend and realtime server are running.

## Local use

Start the realtime backend:

```powershell
cd C:\Users\shane\Documents\Codex\2026-06-23\can\server
npm start
```

Start the frontend in another terminal:

```powershell
cd C:\Users\shane\Documents\Codex\2026-06-23\can
npm run dev -- --host 0.0.0.0
```

Open:

- Game: `http://localhost:5173/game?room=lobby`
- Realm console: `http://localhost:5173/admin.html`

Requests arriving from the local machine are allowed without an admin token. Guest playtest edits are synchronized to the online browser and saved in its local RPG save. Supabase-authenticated edits are normalized, revision checked, persisted by the server, and synchronized live.

## Production security

Never expose the production admin API without a long random token:

```powershell
fly secrets set ADMIN_API_TOKEN="GENERATE_A_LONG_RANDOM_SECRET"
```

Set `VITE_ADMIN_API_URL` to the HTTPS origin of the Fly realtime service when the frontend and backend use different origins. Enter the token in the console after opening it; the value is kept in browser session storage and is not compiled into the frontend.

The backend writes administrative mutations to `ore-acres-admin-audit.jsonl` by default. Override the path with `ADMIN_AUDIT_FILE` if production needs a persistent mounted volume or log collector.

## Available controls

- Inspect online rooms and live player sessions.
- Edit normalized authenticated profiles with optimistic revision protection.
- Apply partial patches to online guest playtest profiles.
- Edit gold, mint balance, HP, skill XP, inventory, bank, equipment, quests, progression, customization, and position.
- Fully heal players or move them to collision-validated destinations.
- Browse and edit offline Supabase profiles.
- Broadcast realm notices.
- Recover stuck enemy and resource states.
- Disconnect a live session with a reason.
- Review recent audit entries.

Run the dedicated server test with `npm run test:admin`.
