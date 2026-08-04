import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { hasWorldLineOfSight, isWorldPositionWalkable } from "../server/src/worldCollision.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8091;
const runId = process.pid;

function clearPoint(target, minimumDistance, maximumDistance) {
  for (let distance = minimumDistance; distance <= maximumDistance; distance += 6) {
    for (let degrees = 0; degrees < 360; degrees += 8) {
      const radians = degrees * Math.PI / 180;
      const point = { x: Math.round(target.x + Math.cos(radians) * distance), y: Math.round(target.y + Math.sin(radians) * distance) };
      if (isWorldPositionWalkable(point.x, point.y, 8) && hasWorldLineOfSight(point.x, point.y, target.x, target.y)) return point;
    }
  }
  return null;
}

const server = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "server"),
  env: { ...process.env, PORT: String(port), REQUIRE_RPG_AUTH: "false", STATE_FILE: path.join(os.tmpdir(), `ore-acres-tree-${runId}.json`) },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk.toString(); });
server.stderr.on("data", (chunk) => { logs += chunk.toString(); });
const deadline = Date.now() + 5_000;
while (!logs.includes(`running on :${port}`) && Date.now() < deadline) await delay(25);
if (!logs.includes(`running on :${port}`)) throw new Error(`Server did not start:\n${logs}`);

class Client {
  constructor(room, name) {
    this.messages = [];
    this.socket = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${room}&name=${name}`, ["oreacres.v1"]);
    this.socket.on("message", (raw) => this.messages.push(JSON.parse(raw.toString())));
  }
  send(message) { this.socket.send(JSON.stringify(message)); }
  async waitFor(predicate, timeout = 5_000, startAt = 0) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const match = this.messages.slice(startAt).find(predicate);
      if (match) return match;
      await delay(20);
    }
    throw new Error(`Timed out waiting for skill-tree response.\n${JSON.stringify(this.messages.slice(-12), null, 2)}\n${logs}`);
  }
}

let closeRange;
let areaCaster;
let dotCaster;
try {
  const rat = { x: 250, y: 590 };
  const closePoint = clearPoint(rat, 34, 50);
  assert.ok(closePoint, "Could not find a close-range bow position.");
  closeRange = new Client(`tree-close-${runId}`, "CloseRanger");
  await closeRange.waitFor((message) => message.type === "welcome");
  closeRange.send({ type: "move", ...closePoint, equipped: { weapon: "oak-bow", tool: "bronze-pick", armor: "" }, action: "walk", direction: "right" });
  await delay(100);
  let startAt = closeRange.messages.length;
  closeRange.send({ type: "rpg_attack", enemyId: "rat-west", combatStyle: "range", combatLevel: 1, weaponPower: 3 });
  const closeStrike = await closeRange.waitFor((message) => message.type === "rpg_enemy_state" && message.enemy?.id === "rat-west" && message.combatStyle === "range", 3_000, startAt);
  assert.ok(closeStrike.damage > 0, "Bow attack inside close range did no damage.");

  const goblin = { x: 1280, y: 880 };
  const areaPoint = clearPoint(goblin, 145, 200);
  assert.ok(areaPoint, "Could not find an Arrow Rain firing lane.");
  areaCaster = new Client(`tree-area-${runId}`, "AreaRanger");
  await areaCaster.waitFor((message) => message.type === "welcome");
  areaCaster.send({ type: "move", ...areaPoint, equipped: { weapon: "oak-bow", tool: "bronze-pick", armor: "" }, action: "walk", direction: "right" });
  await delay(100);
  startAt = areaCaster.messages.length;
  areaCaster.send({ type: "rpg_tree_ability", enemyId: "goblin-camp-1", abilityId: "arrow-rain" });
  const primary = await areaCaster.waitFor((message) => message.type === "rpg_enemy_state" && message.abilityId === "arrow-rain" && !message.secondary, 3_000, startAt);
  const secondary = await areaCaster.waitFor((message) => message.type === "rpg_enemy_state" && message.abilityId === "arrow-rain" && message.secondary, 3_000, startAt);
  assert.notEqual(primary.enemy.id, secondary.enemy.id, "Arrow Rain did not hit a second creature.");
  assert.ok(primary.damage > 0 && secondary.damage > 0);
  assert.ok(primary.abilityReadyAt > Date.now());

  startAt = areaCaster.messages.length;
  areaCaster.send({ type: "rpg_tree_ability", enemyId: "goblin-camp-1", abilityId: "arrow-rain" });
  const cooldown = await areaCaster.waitFor((message) => message.type === "rpg_action_error" && message.abilityId === "arrow-rain", 3_000, startAt);
  assert.match(cooldown.message, /ready in/i);

  const slime = { x: 1348, y: 430 };
  const dotPoint = clearPoint(slime, 150, 210);
  assert.ok(dotPoint, "Could not find a Venom Shot firing lane.");
  dotCaster = new Client(`tree-dot-${runId}`, "VenomRanger");
  await dotCaster.waitFor((message) => message.type === "welcome");
  dotCaster.send({ type: "move", ...dotPoint, equipped: { weapon: "oak-bow", tool: "bronze-pick", armor: "" }, action: "walk", direction: "right" });
  await delay(100);
  startAt = dotCaster.messages.length;
  dotCaster.send({ type: "rpg_tree_ability", enemyId: "slime-mine", abilityId: "venom-shot" });
  const venomInitial = await dotCaster.waitFor((message) => message.type === "rpg_enemy_state" && message.abilityId === "venom-shot" && !message.effectTick, 3_000, startAt);
  const venomTick = await dotCaster.waitFor((message) => message.type === "rpg_enemy_state" && message.abilityId === "venom-shot" && message.effectTick, 3_000, startAt);
  const venomTickTwo = await dotCaster.waitFor((message) => message.type === "rpg_enemy_state" && message.abilityId === "venom-shot" && message.effectTick && message.tickIndex === 2, 3_000, startAt);
  assert.ok(venomInitial.damage > 0 && venomTick.damage > 0);
  assert.equal(venomTick.tickIndex, 1);
  assert.equal(venomTickTwo.enemy.hp, venomTick.enemy.hp - venomTickTwo.damage, "Successive DoT ticks did not mutate one live enemy state.");

  startAt = dotCaster.messages.length;
  dotCaster.send({ type: "rpg_attack", enemyId: "slime-mine", combatStyle: "range", combatLevel: 1, weaponPower: 3 });
  const strikeAfterDot = await dotCaster.waitFor((message) => message.type === "rpg_enemy_state" && message.enemy?.id === "slime-mine" && !message.treeAbility && message.sourcePlayerId, 3_000, startAt);
  assert.equal(strikeAfterDot.enemy.hp, venomTickTwo.enemy.hp - strikeAfterDot.damage, "A normal attack used a stale pre-DoT enemy object.");

  console.log(JSON.stringify({
    closeRangeBowDamage: closeStrike.damage,
    arrowRainTargets: [primary.enemy.id, secondary.enemy.id],
    arrowRainCooldownEnforced: true,
    venomInitialDamage: venomInitial.damage,
    venomTickDamage: venomTick.damage,
    liveStatePreservedAcrossDotTicks: true,
    result: "PASS",
  }, null, 2));
} finally {
  closeRange?.socket.close();
  areaCaster?.socket.close();
  dotCaster?.socket.close();
  server.kill("SIGTERM");
}
