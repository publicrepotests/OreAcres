import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8089;
const runId = process.pid;
const server = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "server"),
  env: {
    ...process.env,
    PORT: String(port),
    REQUIRE_RPG_AUTH: "false",
    STATE_FILE: path.join(os.tmpdir(), `ore-acres-catacombs-${runId}.json`),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLogs = "";
server.stdout.on("data", (chunk) => { serverLogs += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLogs += chunk.toString(); });
const deadline = Date.now() + 5_000;
while (!serverLogs.includes(`running on :${port}`) && Date.now() < deadline) await delay(25);
if (!serverLogs.includes(`running on :${port}`)) throw new Error(`Realtime server did not start:\n${serverLogs}`);

class Client {
  constructor(name) {
    this.messages = [];
    this.socket = new WebSocket(`ws://127.0.0.1:${port}/ws?room=catacombs-${runId}&name=${name}`, ["oreacres.v1"]);
    this.socket.on("message", (raw) => this.messages.push(JSON.parse(raw.toString())));
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  async waitFor(predicate, startAt = 0, timeout = 4_000) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const message = this.messages.slice(startAt).find(predicate);
      if (message) return message;
      await delay(20);
    }
    throw new Error(`Timed out waiting for catacomb response.\n${JSON.stringify(this.messages.slice(-10), null, 2)}\n${serverLogs}`);
  }
}

const traveler = new Client("PortalTester");
const observer = new Client("PortalObserver");
try {
  const welcome = await traveler.waitFor((message) => message.type === "welcome");
  const observerWelcome = await observer.waitFor((message) => message.type === "welcome");
  const travelerId = welcome.playerId;
  assert.ok(travelerId);
  assert.ok(observerWelcome.playerId);

  let startAt = traveler.messages.length;
  traveler.send({ type: "rpg_dungeon_travel", portalId: "sunstone-descent" });
  const distantError = await traveler.waitFor((message) => message.type === "rpg_action_error" && message.action === "portal", startAt);
  assert.match(distantError.message, /move closer/i);

  traveler.send({ type: "move", x: 330, y: 1300, action: "walk", direction: "down" });
  await delay(100);
  startAt = traveler.messages.length;
  const observerStart = observer.messages.length;
  traveler.send({ type: "rpg_dungeon_travel", portalId: "sunstone-descent" });
  const descent = await traveler.waitFor((message) => message.type === "rpg_dungeon_travel" && message.portalId === "sunstone-descent", startAt);
  assert.deepEqual({ x: descent.x, y: descent.y, region: descent.region }, { x: 768, y: 2140, region: "Sunstone Catacombs" });
  const observedDescent = await observer.waitFor((message) => message.type === "player_moved" && message.player?.id === travelerId, observerStart);
  assert.deepEqual({ x: observedDescent.player.x, y: observedDescent.player.y }, { x: 768, y: 2140 });

  startAt = traveler.messages.length;
  const observerAscentStart = observer.messages.length;
  traveler.send({ type: "rpg_dungeon_travel", portalId: "sunstone-ascent" });
  const ascent = await traveler.waitFor((message) => message.type === "rpg_dungeon_travel" && message.portalId === "sunstone-ascent", startAt);
  assert.deepEqual({ x: ascent.x, y: ascent.y, region: ascent.region }, { x: 330, y: 1332, region: "Old Sun Shrine" });
  const observedAscent = await observer.waitFor((message) => message.type === "player_moved" && message.player?.id === travelerId, observerAscentStart);
  assert.deepEqual({ x: observedAscent.player.x, y: observedAscent.player.y }, { x: 330, y: 1332 });

  console.log(JSON.stringify({ distantTravelRejected: true, descentAuthorized: true, ascentAuthorized: true, multiplayerPresenceSynchronized: true, result: "PASS" }, null, 2));
} finally {
  traveler.socket.close();
  observer.socket.close();
  server.kill("SIGTERM");
}
