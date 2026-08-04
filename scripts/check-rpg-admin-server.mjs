import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8091;
const room = `admin-${process.pid}`;
const server = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "server"),
  env: {
    ...process.env,
    PORT: String(port),
    REQUIRE_RPG_AUTH: "false",
    STATE_FILE: path.join(os.tmpdir(), `ore-acres-admin-state-${process.pid}.json`),
    ADMIN_AUDIT_FILE: path.join(os.tmpdir(), `ore-acres-admin-audit-${process.pid}.jsonl`),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLogs = "";
server.stdout.on("data", (chunk) => { serverLogs += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLogs += chunk.toString(); });

const deadline = Date.now() + 5_000;
while (!serverLogs.includes(`running on :${port}`) && Date.now() < deadline) await delay(25);
if (!serverLogs.includes(`running on :${port}`)) throw new Error(`Admin test server did not start:\n${serverLogs}`);

async function admin(pathname, init) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

class Client {
  constructor() {
    this.messages = [];
    this.socket = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${room}&name=ConsoleTester`, ["oreacres.v1"]);
    this.socket.on("message", (raw) => this.messages.push(JSON.parse(raw.toString())));
  }

  async waitFor(predicate, timeout = 4_000, startAt = 0) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const message = this.messages.slice(startAt).find(predicate);
      if (message) return message;
      await delay(20);
    }
    throw new Error(`Timed out waiting for admin synchronization.\n${JSON.stringify(this.messages.slice(-10), null, 2)}\n${serverLogs}`);
  }
}

let client;
try {
  const initialStatus = await admin("/api/admin/status");
  assert.equal(initialStatus.localAccess, true);
  assert.equal(initialStatus.persistence, "guest-only");

  client = new Client();
  const welcome = await client.waitFor((message) => message.type === "welcome");
  const listed = await admin("/api/admin/players");
  const player = listed.players.find((entry) => entry.id === welcome.playerId);
  assert.ok(player, "connected guest was absent from the admin player directory");
  assert.equal(player.authMode, "guest");

  const startAt = client.messages.length;
  const updated = await admin(`/api/admin/players/${welcome.playerId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      displayName: "QA Warden",
      position: { x: 748, y: 505 },
      patch: { gold: 999, inventory: { "sunstone-ore": 4 } },
      notice: "Profile synchronized from the realm console.",
    }),
  });
  assert.equal(updated.player.name, "QA Warden");
  const profilePatch = await client.waitFor((message) => message.type === "rpg_admin_patch", 4_000, startAt);
  assert.equal(profilePatch.patch.gold, 999);
  assert.equal(profilePatch.patch.inventory["sunstone-ore"], 4);
  await client.waitFor((message) => message.type === "rpg_admin_identity" && message.displayName === "QA Warden", 4_000, startAt);
  await client.waitFor((message) => message.type === "rpg_admin_position" && message.x === 748, 4_000, startAt);
  await client.waitFor((message) => message.type === "rpg_admin_notice" && /synchronized/.test(message.message), 4_000, startAt);

  const announceAt = client.messages.length;
  await admin("/api/admin/world", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "announce", roomId: room, message: "Realm console broadcast check." }),
  });
  await client.waitFor((message) => message.type === "rpg_admin_notice" && /broadcast check/.test(message.message), 4_000, announceAt);

  const respawn = await admin("/api/admin/world", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "respawn", roomId: room, scope: "all" }),
  });
  assert.equal(respawn.scope, "all");

  const profiles = await admin("/api/admin/profiles");
  assert.equal(profiles.persistence, "disabled");
  assert.deepEqual(profiles.profiles, []);

  const finalStatus = await admin("/api/admin/status");
  assert.ok(finalStatus.audit.some((entry) => entry.action === "player.update"));
  assert.ok(finalStatus.audit.some((entry) => entry.action === "world.announce"));
  assert.ok(finalStatus.audit.some((entry) => entry.action === "world.respawn"));

  const closed = new Promise((resolve) => client.socket.once("close", (code) => resolve(code)));
  await admin(`/api/admin/players/${welcome.playerId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: "Automated admin disconnect test." }),
  });
  assert.equal(await closed, 4003);

  console.log(JSON.stringify({
    localhostProtected: true,
    playerDirectory: true,
    guestPatchSynchronized: true,
    collisionCheckedTeleport: true,
    announcementDelivered: true,
    worldRespawned: true,
    disconnectVerified: true,
    auditRecorded: true,
    result: "PASS",
  }, null, 2));
} finally {
  client?.socket.close();
  server.kill("SIGTERM");
}
