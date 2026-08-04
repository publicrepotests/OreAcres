import { useCallback, useEffect, useState } from "react";

type AdminProfile = {
  displayName: string;
  progress: Record<string, unknown>;
  revision: number;
};

type AdminPlayer = {
  id: string;
  userId: string | null;
  roomId: string;
  name: string;
  authMode: "guest" | "supabase";
  online: boolean;
  x: number;
  y: number;
  action: string;
  direction: string;
  lastSeenAt: number;
  profile: AdminProfile | null;
};

type AuditEntry = {
  id: string;
  at: number;
  actor: string;
  action: string;
  target: string;
  detail: Record<string, unknown>;
};

type AdminStatus = {
  ok: boolean;
  localAccess: boolean;
  remoteTokenConfigured: boolean;
  persistence: "supabase" | "guest-only";
  startedAt: number;
  uptimeSeconds: number;
  rooms: Array<{ id: string; players: number; plots: number }>;
  players: AdminPlayer[];
  audit: AuditEntry[];
};

type ConsoleTab = "overview" | "players" | "profiles" | "world" | "audit";

const SKILLS = ["attack", "defense", "hitpoints", "range", "magic", "mining", "woodcutting", "fishing", "smithing", "crafting"];

function apiBase() {
  const explicit = (import.meta.env.VITE_ADMIN_API_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return `${location.protocol}//${location.hostname}:8080`;
  return location.origin;
}

function elapsed(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function pretty(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseObject(value: string) {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Editor value must be a JSON object.");
  return parsed as Record<string, unknown>;
}

export function AdminConsole() {
  const [token, setToken] = useState(() => sessionStorage.getItem("orehaven-admin-token") ?? "");
  const [tab, setTab] = useState<ConsoleTab>("overview");
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [profiles, setProfiles] = useState<Array<AdminProfile & { userId: string; createdAt?: string; updatedAt?: string }>>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [editorName, setEditorName] = useState("");
  const [editorX, setEditorX] = useState("");
  const [editorY, setEditorY] = useState("");
  const [editorJson, setEditorJson] = useState("{}");
  const [notice, setNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [roomId, setRoomId] = useState("lobby");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Connecting to realm services...");
  const [error, setError] = useState("");

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    if (init?.body) headers.set("content-type", "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);
    const response = await fetch(`${apiBase()}${path}`, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    return payload as T;
  }, [token]);

  const refresh = useCallback(async (quiet = false) => {
    try {
      const next = await request<AdminStatus>("/api/admin/status");
      setStatus(next);
      setError("");
      if (!quiet) setMessage(`Connected to ${next.rooms.length || 0} active realm${next.rooms.length === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect to the admin API.");
    }
  }, [request]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(true), 3_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const selectedPlayer = status?.players.find((player) => player.id === selectedPlayerId) ?? null;
  const selectedProfile = profiles.find((profile) => profile.userId === selectedProfileId) ?? null;

  useEffect(() => {
    if (!selectedPlayer) return;
    setEditorName(selectedPlayer.name);
    setEditorX(String(selectedPlayer.x));
    setEditorY(String(selectedPlayer.y));
    setEditorJson(pretty(selectedPlayer.profile?.progress ?? {}));
    setNotice("");
  }, [selectedPlayerId, selectedPlayer?.profile?.revision]);

  useEffect(() => {
    if (!selectedProfile) return;
    setEditorName(selectedProfile.displayName);
    setEditorJson(pretty(selectedProfile.progress));
  }, [selectedProfileId, selectedProfile?.revision]);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setMessage(label);
      await refresh(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Admin operation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function savePlayer() {
    if (!selectedPlayer) return;
    const body: Record<string, unknown> = {
      displayName: editorName,
      position: { x: Number(editorX), y: Number(editorY) },
      notice: notice || undefined,
    };
    if (selectedPlayer.profile) {
      body.progress = parseObject(editorJson);
      body.expectedRevision = selectedPlayer.profile.revision;
    } else {
      body.patch = parseObject(editorJson);
    }
    await run(`Saved ${editorName}.`, async () => {
      await request(`/api/admin/players/${selectedPlayer.id}`, { method: "PATCH", body: JSON.stringify(body) });
    });
  }

  async function quickPlayerPatch(patch: Record<string, unknown>, label: string) {
    if (!selectedPlayer) return;
    await run(label, async () => {
      await request(`/api/admin/players/${selectedPlayer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ patch, expectedRevision: selectedPlayer.profile?.revision }),
      });
    });
  }

  async function teleport(x: number, y: number, label: string) {
    if (!selectedPlayer) return;
    await run(label, async () => {
      await request(`/api/admin/players/${selectedPlayer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ position: { x, y }, expectedRevision: selectedPlayer.profile?.revision }),
      });
    });
  }

  async function disconnectPlayer() {
    if (!selectedPlayer || !window.confirm(`Disconnect ${selectedPlayer.name} from ${selectedPlayer.roomId}?`)) return;
    await run(`Disconnected ${selectedPlayer.name}.`, async () => {
      await request(`/api/admin/players/${selectedPlayer.id}`, { method: "DELETE", body: JSON.stringify({ reason: "Disconnected from the realm console." }) });
      setSelectedPlayerId("");
    });
  }

  async function loadProfiles() {
    await run("Profile index refreshed.", async () => {
      const data = await request<{ profiles: typeof profiles }>(`/api/admin/profiles?query=${encodeURIComponent(query)}&limit=150`);
      setProfiles(data.profiles);
    });
  }

  async function saveProfile() {
    if (!selectedProfile) return;
    await run(`Saved ${editorName}.`, async () => {
      const data = await request<{ profile: AdminProfile }>(`/api/admin/profiles/${selectedProfile.userId}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName: editorName, progress: parseObject(editorJson), expectedRevision: selectedProfile.revision }),
      });
      setProfiles((current) => current.map((profile) => profile.userId === selectedProfile.userId ? { ...profile, ...data.profile } : profile));
    });
  }

  async function worldAction(action: "announce" | "respawn", scope?: "enemies" | "resources" | "all") {
    await run(action === "announce" ? "Realm announcement sent." : `${scope} respawned.`, async () => {
      await request("/api/admin/world", {
        method: "POST",
        body: JSON.stringify({ action, roomId, scope, message: announcement }),
      });
      if (action === "announce") setAnnouncement("");
    });
  }

  function rememberToken(value: string) {
    setToken(value);
    if (value) sessionStorage.setItem("orehaven-admin-token", value);
    else sessionStorage.removeItem("orehaven-admin-token");
  }

  const filteredPlayers = status?.players.filter((player) => {
    const needle = query.toLowerCase();
    return !needle || player.name.toLowerCase().includes(needle) || player.id.includes(needle) || player.userId?.includes(needle);
  }) ?? [];

  return (
    <main className="realm-console">
      <header className="realm-console__masthead">
        <div className="realm-console__sigil" aria-hidden="true"><span>OA</span></div>
        <div>
          <p>Orehaven Operations</p>
          <h1>Realm Console</h1>
        </div>
        <div className={`realm-console__connection ${error ? "is-offline" : "is-online"}`}>
          <i />
          <span>{error ? "Attention required" : "Realm link active"}</span>
          <small>{status?.persistence === "supabase" ? "Persistent profiles" : "Guest playtest mode"}</small>
        </div>
      </header>

      <aside className="realm-console__rail">
        <nav aria-label="Admin console sections">
          {(["overview", "players", "profiles", "world", "audit"] as ConsoleTab[]).map((item) => (
            <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
              <span>{item === "overview" ? "01" : item === "players" ? "02" : item === "profiles" ? "03" : item === "world" ? "04" : "05"}</span>
              {item}
              {item === "players" && status?.players.length ? <b>{status.players.length}</b> : null}
            </button>
          ))}
        </nav>
        <div className="realm-console__credentials">
          <label htmlFor="admin-token">Remote access token</label>
          <input id="admin-token" type="password" value={token} placeholder={status?.localAccess ? "Not needed on localhost" : "Required"} onChange={(event) => rememberToken(event.target.value)} />
          <small>Stored only for this browser session.</small>
        </div>
        <a href="/game?room=lobby" className="realm-console__return">Return to Orehaven</a>
      </aside>

      <section className="realm-console__workspace">
        <div className="realm-console__statusline">
          <span>{error || message}</span>
          <button type="button" onClick={() => void refresh()} disabled={busy}>Refresh realm</button>
        </div>

        {tab === "overview" ? (
          <div className="console-overview">
            <section className="console-hero">
              <div>
                <p>Live realm command</p>
                <h2>Keep Orehaven healthy.</h2>
                <span>Inspect account progression, help stuck players, and intervene in world state without touching the database by hand.</span>
              </div>
              <div className="console-hero__rune"><i /><i /><i /></div>
            </section>
            <div className="console-metrics">
              <article><span>Online adventurers</span><strong>{status?.players.length ?? "-"}</strong><small>{status?.players.filter((player) => player.authMode === "supabase").length ?? 0} authenticated</small></article>
              <article><span>Active realms</span><strong>{status?.rooms.length ?? "-"}</strong><small>{status?.rooms.map((room) => room.id).join(" • ") || "Waiting for players"}</small></article>
              <article><span>Server uptime</span><strong>{status ? elapsed(status.uptimeSeconds) : "-"}</strong><small>{status ? new Date(status.startedAt).toLocaleString() : "Connecting"}</small></article>
              <article><span>Save authority</span><strong>{status?.persistence === "supabase" ? "Live" : "Local"}</strong><small>{status?.persistence === "supabase" ? "Revision-safe Supabase writes" : "Guest edits apply to online clients"}</small></article>
            </div>
            <section className="console-panel">
              <div className="console-panel__title"><div><p>Realm population</p><h3>Current rooms</h3></div></div>
              <div className="console-room-grid">
                {(status?.rooms.length ? status.rooms : [{ id: "lobby", players: 0, plots: 0 }]).map((room) => (
                  <article key={room.id}><i /><div><strong>{room.id}</strong><span>{room.players} player{room.players === 1 ? "" : "s"}</span></div><small>{room.plots} world records</small></article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "players" ? (
          <div className="console-split">
            <section className="console-panel console-directory">
              <div className="console-panel__title"><div><p>Live sessions</p><h3>Adventurers</h3></div><input value={query} placeholder="Search players" onChange={(event) => setQuery(event.target.value)} /></div>
              <div className="console-player-list">
                {filteredPlayers.map((player) => (
                  <button key={player.id} type="button" className={selectedPlayerId === player.id ? "is-active" : ""} onClick={() => setSelectedPlayerId(player.id)}>
                    <i className={player.authMode === "supabase" ? "is-saved" : ""}>{player.name.slice(0, 2).toUpperCase()}</i>
                    <span><strong>{player.name}</strong><small>{player.roomId} • {player.authMode}</small></span>
                    <em>{Math.round(player.x)}, {Math.round(player.y)}</em>
                  </button>
                ))}
                {!filteredPlayers.length ? <div className="console-empty">No online adventurers match this search.</div> : null}
              </div>
            </section>
            <section className="console-panel console-editor">
              {selectedPlayer ? (
                <>
                  <div className="console-panel__title"><div><p>{selectedPlayer.authMode === "supabase" ? "Persistent account" : "Guest playtest session"}</p><h3>{selectedPlayer.name}</h3></div><span className="console-pill">{selectedPlayer.action}</span></div>
                  <div className="console-form-grid">
                    <label>Display name<input value={editorName} maxLength={24} onChange={(event) => setEditorName(event.target.value)} /></label>
                    <label>Player ID<input value={selectedPlayer.id} readOnly /></label>
                    <label>World X<input type="number" value={editorX} onChange={(event) => setEditorX(event.target.value)} /></label>
                    <label>World Y<input type="number" value={editorY} onChange={(event) => setEditorY(event.target.value)} /></label>
                  </div>
                  <div className="console-quick-actions">
                    <button type="button" onClick={() => void quickPlayerPatch({ heal: true }, "Player restored to full health.")}>Full heal</button>
                    <button type="button" onClick={() => void teleport(748, 505, "Player moved to Orehaven Square.")}>Town square</button>
                    <button type="button" onClick={() => void teleport(768, 2140, "Player moved to the Catacombs entrance.")}>Catacombs</button>
                    <button type="button" className="is-danger" onClick={() => void disconnectPlayer()}>Disconnect</button>
                  </div>
                  <label className="console-json-label"><span>{selectedPlayer.profile ? "Complete normalized profile" : "Guest profile patch"}<small>{selectedPlayer.profile ? `Revision ${selectedPlayer.profile.revision}` : "Only provided fields are changed"}</small></span><textarea spellCheck={false} value={editorJson} onChange={(event) => setEditorJson(event.target.value)} /></label>
                  <div className="console-skill-chips">{SKILLS.map((skill) => <span key={skill}>{skill}</span>)}</div>
                  <label>Private player notice<input value={notice} maxLength={240} placeholder="Optional message shown after save" onChange={(event) => setNotice(event.target.value)} /></label>
                  <div className="console-editor__footer"><span>{selectedPlayer.userId || "Ephemeral guest session"}</span><button type="button" className="console-primary" disabled={busy} onClick={() => void savePlayer()}>Save & sync now</button></div>
                </>
              ) : <div className="console-empty console-empty--large"><b>Select an adventurer</b><span>Their live position and progression controls will appear here.</span></div>}
            </section>
          </div>
        ) : null}

        {tab === "profiles" ? (
          <div className="console-split">
            <section className="console-panel console-directory">
              <div className="console-panel__title"><div><p>Account archive</p><h3>Saved profiles</h3></div></div>
              <div className="console-search-row"><input value={query} placeholder="Name or user UUID" onChange={(event) => setQuery(event.target.value)} /><button type="button" onClick={() => void loadProfiles()}>Search</button></div>
              <div className="console-player-list">
                {profiles.map((profile) => <button key={profile.userId} type="button" className={selectedProfileId === profile.userId ? "is-active" : ""} onClick={() => setSelectedProfileId(profile.userId)}><i>{profile.displayName.slice(0, 2).toUpperCase()}</i><span><strong>{profile.displayName}</strong><small>Revision {profile.revision}</small></span></button>)}
                {!profiles.length ? <div className="console-empty">{status?.persistence === "supabase" ? "Search the persistent profile archive." : "Supabase persistence is not configured on this local server."}</div> : null}
              </div>
            </section>
            <section className="console-panel console-editor">
              {selectedProfile ? <><div className="console-panel__title"><div><p>Offline-safe edit</p><h3>{selectedProfile.displayName}</h3></div><span className="console-pill">rev {selectedProfile.revision}</span></div><label>Display name<input value={editorName} maxLength={24} onChange={(event) => setEditorName(event.target.value)} /></label><label className="console-json-label"><span>Complete normalized profile<small>Invalid fields are rejected or normalized server-side</small></span><textarea spellCheck={false} value={editorJson} onChange={(event) => setEditorJson(event.target.value)} /></label><div className="console-editor__footer"><span>{selectedProfile.userId}</span><button type="button" className="console-primary" disabled={busy} onClick={() => void saveProfile()}>Save profile</button></div></> : <div className="console-empty console-empty--large"><b>Select a saved profile</b><span>Persistent edits use optimistic revision checks.</span></div>}
            </section>
          </div>
        ) : null}

        {tab === "world" ? (
          <div className="console-world-grid">
            <section className="console-panel"><div className="console-panel__title"><div><p>Realm broadcast</p><h3>Send announcement</h3></div></div><label>Room<input value={roomId} onChange={(event) => setRoomId(event.target.value)} /></label><label>Message<textarea className="console-textarea--short" maxLength={240} value={announcement} placeholder="Maintenance begins in ten minutes..." onChange={(event) => setAnnouncement(event.target.value)} /></label><button type="button" className="console-primary" disabled={!announcement.trim() || busy} onClick={() => void worldAction("announce")}>Broadcast to room</button></section>
            <section className="console-panel"><div className="console-panel__title"><div><p>Encounter recovery</p><h3>Respawn world state</h3></div></div><p className="console-warning">Use these controls to recover stuck encounters. Active claims and damaged enemies in the selected room will be reset.</p><div className="console-world-actions"><button type="button" onClick={() => void worldAction("respawn", "enemies")}>Respawn enemies</button><button type="button" onClick={() => void worldAction("respawn", "resources")}>Respawn resources</button><button type="button" className="is-danger" onClick={() => void worldAction("respawn", "all")}>Reset both</button></div></section>
          </div>
        ) : null}

        {tab === "audit" ? (
          <section className="console-panel console-audit"><div className="console-panel__title"><div><p>Immutable local trail</p><h3>Recent admin actions</h3></div><span className="console-pill">JSONL backed</span></div><div className="console-audit__rows">{status?.audit.map((entry) => <article key={entry.id}><time>{new Date(entry.at).toLocaleString()}</time><strong>{entry.action}</strong><span>{entry.target}</span><code>{JSON.stringify(entry.detail)}</code><small>{entry.actor}</small></article>)}{!status?.audit.length ? <div className="console-empty">No administrative mutations have been recorded this session.</div> : null}</div></section>
        ) : null}
      </section>
    </main>
  );
}
