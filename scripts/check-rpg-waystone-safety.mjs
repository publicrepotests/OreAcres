import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8096;
const runId = process.pid;
const room = `waystone-safety-${runId}`;

const server = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "server"),
  env: {
    ...process.env,
    PORT: String(port),
    REQUIRE_RPG_AUTH: "false",
    STATE_FILE: path.join(os.tmpdir(), `ore-acres-waystone-safety-${runId}.json`),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLogs = "";
server.stdout.on("data", (chunk) => { serverLogs += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLogs += chunk.toString(); });

const deadline = Date.now() + 5_000;
while (!serverLogs.includes(`running on :${port}`) && Date.now() < deadline) await delay(25);
if (!serverLogs.includes(`running on :${port}`)) throw new Error(`Realtime server did not start:\n${serverLogs}`);

const messages = [];
const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${room}&name=WaystoneTester`, ["oreacres.v1"]);
socket.on("message", (raw) => messages.push(JSON.parse(raw.toString())));

async function waitFor(predicate, timeout = 4_000, startAt = 0) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const message = messages.slice(startAt).find(predicate);
    if (message) return message;
    await delay(20);
  }
  throw new Error(`Timed out waiting for realm response.\n${JSON.stringify(messages.slice(-12), null, 2)}\n${serverLogs}`);
}

async function patchPlayer(playerId, body) {
  const response = await fetch(`http://127.0.0.1:${port}/api/admin/players/${playerId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 200, await response.text());
}

try {
  const welcome = await waitFor((message) => message.type === "welcome");

  // This point is close enough to Icefang to aggro normally, but remains
  // inside the Frostmere waystone sanctuary.
  await patchPlayer(welcome.playerId, { position: { x: 430, y: 5450 }, patch: { heal: true } });
  const sanctuaryStart = messages.length;
  await delay(3_200);
  const hostileMessage = messages.slice(sanctuaryStart).find((message) => (
    (message.type === "rpg_enemy_attack" || message.type === "rpg_enemy_telegraph")
    && message.targetPlayerId === welcome.playerId
  ));
  assert.equal(hostileMessage, undefined, "An enemy attacked a player inside a waystone sanctuary.");

  await patchPlayer(welcome.playerId, { position: { x: 608, y: 7820 } });
  const discoveryStart = messages.length;
  socket.send(JSON.stringify({ type: "rpg_region_discover", regionId: "orehaven-guild-hall" }));
  const discovered = await waitFor(
    (message) => message.type === "rpg_region_state" && message.discoveredId === "orehaven-guild-hall",
    4_000,
    discoveryStart,
  );
  assert.ok(discovered.discoveries.includes("orehaven-guild-hall"));

  console.log("RPG waystone safety passed: sanctuary aggro suppression and guild-hall discovery are authoritative.");
} finally {
  socket.close();
  server.kill("SIGTERM");
}
