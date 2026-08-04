import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

import { hasWorldLineOfSight, isWorldPositionWalkable } from "../server/src/worldCollision.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8083;
const room = `public-event-${process.pid}`;

const eventApproach = { x: 1223, y: 1047 };
assert.equal(isWorldPositionWalkable(eventApproach.x, eventApproach.y), true, "Public-event test approach must be walkable.");
assert.equal(hasWorldLineOfSight(eventApproach.x, eventApproach.y, 1167, 1047), true, "Public-event test approach must see the boss.");

const server = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "server"),
  env: {
    ...process.env,
    PORT: String(port),
    REQUIRE_RPG_AUTH: "false",
    RPG_PUBLIC_EVENT_ENEMY_ID: "auric-slime",
    STATE_FILE: path.join(os.tmpdir(), `ore-acres-world-event-${process.pid}.json`),
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
    this.socket = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${room}&name=${name}`, ["oreacres.v1"]);
    this.socket.on("message", (raw) => this.messages.push(JSON.parse(raw.toString())));
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  async waitFor(predicate, timeout = 5_000, startAt = 0) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const message = this.messages.slice(startAt).find(predicate);
      if (message) return message;
      await delay(20);
    }
    throw new Error(`Timed out waiting for public-event response.\n${JSON.stringify(this.messages.slice(-10), null, 2)}\n${serverLogs}`);
  }
}

let helper;
let finisher;
try {
  helper = new Client("EventHelper");
  finisher = new Client("EventFinisher");
  const helperWelcome = await helper.waitFor((message) => message.type === "welcome");
  const finisherWelcome = await finisher.waitFor((message) => message.type === "welcome");
  assert.equal(
    Object.hasOwn(helperWelcome.snapshot.rpg.enemies["auric-slime"], "contributors"),
    false,
    "Private contribution bookkeeping leaked in the room snapshot.",
  );

  helper.send({ type: "move", ...eventApproach, action: "walk", direction: "left" });
  finisher.send({ type: "move", ...eventApproach, action: "walk", direction: "left" });
  await delay(450);
  assert.equal(
    helper.messages.some((message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "auric-slime"
      && (message.enemy.action === "walk" || message.enemy.action === "attack")),
    false,
    "The public-event boss aggroed before a player attacked it.",
  );

  let startAt = helper.messages.length;
  helper.send({
    type: "rpg_attack",
    enemyId: "auric-slime",
    combatStyle: "melee",
    combatLevel: 99,
    weaponPower: 12,
  });
  const contribution = await helper.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "auric-slime"
      && message.sourcePlayerId === helperWelcome.playerId,
    3_000,
    startAt,
  );
  assert.equal(contribution.defeated, false, "The helper must contribute before the finishing hit.");
  assert.equal(Object.hasOwn(contribution.enemy, "contributors"), false, "Contribution bookkeeping leaked in combat state.");

  startAt = finisher.messages.length;
  finisher.send({
    type: "rpg_attack",
    enemyId: "auric-slime",
    combatStyle: "magic",
    combatLevel: 99,
    weaponPower: 12,
  });
  const defeat = await finisher.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "auric-slime"
      && message.sourcePlayerId === finisherWelcome.playerId
      && message.defeated,
    3_000,
    startAt,
  );
  assert.ok(defeat.reward.gold >= 120 && defeat.reward.gold <= 200);
  assert.equal(Object.hasOwn(defeat.enemy, "contributors"), false, "Contribution bookkeeping leaked in defeat state.");

  const announcement = await helper.waitFor(
    (message) => message.type === "rpg_world_event" && message.status === "complete",
    3_000,
  );
  assert.equal(announcement.event.participantCount, 2);

  const helperReward = await helper.waitFor(
    (message) => message.type === "rpg_world_event_reward" && message.eventId === "auric-slime",
    3_000,
  );
  assert.equal(helperReward.profileAuthoritative, false);
  assert.ok(helperReward.reward.gold >= 42 && helperReward.reward.gold <= 70);
  assert.equal(helperReward.reward.xp, 108);
  assert.ok(helperReward.contributionDamage >= 8);
  assert.equal(
    finisher.messages.some((message) => message.type === "rpg_world_event_reward"),
    false,
    "The finisher already receives the full boss reward and must not be paid twice.",
  );

  console.log(JSON.stringify({
    helperDamage: helperReward.contributionDamage,
    helperGold: helperReward.reward.gold,
    helperXp: helperReward.reward.xp,
    finisherGold: defeat.reward.gold,
    eligibleParticipants: announcement.event.participantCount,
    result: "PASS",
  }, null, 2));
} finally {
  helper?.socket.close();
  finisher?.socket.close();
  server.kill("SIGTERM");
}
