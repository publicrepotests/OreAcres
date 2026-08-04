import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

import { hasWorldLineOfSight, isWorldPositionWalkable } from "../server/src/worldCollision.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8084;
const runId = process.pid;

const enemyLocations = {
  "rat-west": { x: 250, y: 590 },
  "slime-mine": { x: 1348, y: 430 },
  "sunbone-wanderer": { x: 540, y: 1220 },
  "fallen-ranger": { x: 610, y: 1720 },
  "moonfen-hexer": { x: 870, y: 1390 },
};

function ringPoint(target, minimumDistance, maximumDistance, predicate) {
  for (let distance = minimumDistance; distance <= maximumDistance; distance += 8) {
    for (let degrees = 0; degrees < 360; degrees += 8) {
      const radians = degrees * Math.PI / 180;
      const point = {
        x: Math.round(target.x + Math.cos(radians) * distance),
        y: Math.round(target.y + Math.sin(radians) * distance),
      };
      if (!isWorldPositionWalkable(point.x, point.y, 8)) continue;
      if (predicate(point)) return point;
    }
  }
  return null;
}

function clearPoint(target, minimumDistance, maximumDistance) {
  return ringPoint(
    target,
    minimumDistance,
    maximumDistance,
    (point) => hasWorldLineOfSight(point.x, point.y, target.x, target.y),
  );
}

function blockedCombatPosition() {
  for (const [enemyId, target] of Object.entries(enemyLocations)) {
    const point = ringPoint(
      target,
      90,
      275,
      (candidate) => !hasWorldLineOfSight(candidate.x, candidate.y, target.x, target.y),
    );
    if (point) return { enemyId, target, point };
  }
  return null;
}

const server = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "server"),
  env: {
    ...process.env,
    PORT: String(port),
    REQUIRE_RPG_AUTH: "false",
    STATE_FILE: path.join(os.tmpdir(), `ore-acres-combat-${runId}.json`),
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
  constructor(room, name) {
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
    throw new Error(`Timed out waiting for combat response.\n${JSON.stringify(this.messages.slice(-12), null, 2)}\n${serverLogs}`);
  }

  async move(point) {
    this.send({ type: "move", ...point, action: "walk", direction: "right" });
    await delay(80);
  }
}

let rangeClient;
let blockedClient;
let chaseClient;
let rangerClient;
let casterClient;
let rootClient;
let fishingClient;
try {
  const slime = enemyLocations["slime-mine"];
  const rangedPosition = clearPoint(slime, 190, 220);
  assert.ok(rangedPosition, "Could not find a clear ranged test position near the quarry slime.");
  rangeClient = new Client(`combat-range-${runId}`, "RangeTester");
  const rangeWelcome = await rangeClient.waitFor((message) => message.type === "welcome");
  rangeClient.send({
    type: "move",
    ...rangedPosition,
    equipped: { weapon: "oak-bow", tool: "bronze-pick", armor: "" },
    appearance: "ranger",
    action: "idle",
    direction: "down",
  });
  await delay(100);

  let startAt = rangeClient.messages.length;
  rangeClient.send({ type: "rpg_attack", enemyId: "slime-mine", combatStyle: "melee", combatLevel: 1, weaponPower: 1 });
  const meleeError = await rangeClient.waitFor(
    (message) => message.type === "rpg_action_error" && message.action === "combat",
    3_000,
    startAt,
  );
  assert.match(meleeError.message, /melee range/i);

  startAt = rangeClient.messages.length;
  rangeClient.send({ type: "rpg_attack", enemyId: "slime-mine", combatStyle: "range", combatLevel: 1, weaponPower: 1 });
  const rangedStrike = await rangeClient.waitFor(
    (message) => message.type === "rpg_enemy_state" && message.enemy?.id === "slime-mine" && message.sourcePlayerId,
    3_000,
    startAt,
  );
  assert.equal(rangedStrike.combatStyle, "range");
  assert.ok(rangedStrike.damage > 0);

  await delay(380);
  startAt = rangeClient.messages.length;
  rangeClient.send({
    type: "rpg_attack",
    enemyId: "slime-mine",
    combatStyle: "range",
    combatLevel: 1,
    weaponPower: 1,
    abilityId: "deadeye",
  });
  const mismatchedAbility = await rangeClient.waitFor(
    (message) => message.type === "rpg_action_error" && /does not match/i.test(message.message),
    3_000,
    startAt,
  );
  assert.equal(mismatchedAbility.action, "combat");

  startAt = rangeClient.messages.length;
  rangeClient.send({
    type: "rpg_attack",
    enemyId: "slime-mine",
    combatStyle: "range",
    combatLevel: 1,
    weaponPower: 1,
    abilityId: "thorn-volley",
  });
  const signatureStrike = await rangeClient.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "slime-mine"
      && message.abilityId === "thorn-volley",
    3_000,
    startAt,
  );
  assert.ok(signatureStrike.damage > 0);
  assert.ok(signatureStrike.abilityReadyAt > Date.now());
  assert.equal(signatureStrike.hitCount, 3);
  assert.equal(signatureStrike.statusApplied, true);
  assert.equal(signatureStrike.enemy.status?.kind, "slow");
  assert.equal(signatureStrike.enemy.status?.label, "Thorn-slowed");
  assert.ok(signatureStrike.enemy.status?.expiresAt > Date.now());

  startAt = rangeClient.messages.length;
  rangeClient.send({
    type: "rpg_attack",
    enemyId: "slime-mine",
    combatStyle: "range",
    combatLevel: 1,
    weaponPower: 1,
    abilityId: "thorn-volley",
  });
  const signatureCooldown = await rangeClient.waitFor(
    (message) => message.type === "rpg_action_error"
      && message.action === "combat"
      && message.abilityId === "thorn-volley",
    3_000,
    startAt,
  );
  assert.match(signatureCooldown.message, /ready in/i);

  startAt = rangeClient.messages.length;
  rangeClient.send({ type: "rpg_action_cancel", enemyId: "slime-mine" });
  const cancelledCombat = await rangeClient.waitFor(
    (message) => message.type === "rpg_action_cancelled" && message.enemyId === "slime-mine",
    3_000,
    startAt,
  );
  assert.equal(cancelledCombat.resourceId, null);

  const copper = { x: 1238, y: 430 };
  const gatheringPosition = ringPoint(copper, 42, 58, () => true);
  assert.ok(gatheringPosition, "Could not find a walkable gathering position near copper.");
  await rangeClient.move(gatheringPosition);
  startAt = rangeClient.messages.length;
  rangeClient.send({ type: "rpg_gather_start", resourceId: "copper-3", toolPower: 1, skillLevel: 1 });
  await rangeClient.waitFor(
    (message) => message.type === "rpg_resource_state"
      && message.resource?.id === "copper-3"
      && message.resource.claimedBy === rangeWelcome.playerId,
    3_000,
    startAt,
  );
  startAt = rangeClient.messages.length;
  rangeClient.send({ type: "rpg_action_cancel", resourceId: "copper-3" });
  const releasedResource = await rangeClient.waitFor(
    (message) => message.type === "rpg_resource_state"
      && message.resource?.id === "copper-3"
      && message.resource.available
      && message.released,
    3_000,
    startAt,
  );
  assert.equal(releasedResource.resource.claimedBy, null);

  const fishingSpot = { x: 245, y: 785 };
  const fishingPosition = ringPoint(
    fishingSpot,
    54,
    112,
    () => true,
  );
  assert.ok(fishingPosition, "Could not find a reachable shoreline position near Moonwater fishing.");
  fishingClient = new Client(`fishing-persistence-${runId}`, "FishingTester");
  const fishingWelcome = await fishingClient.waitFor((message) => message.type === "welcome");
  fishingClient.send({ type: "move", ...fishingPosition, action: "idle", direction: "left" });
  await delay(100);
  startAt = fishingClient.messages.length;
  fishingClient.send({ type: "rpg_gather_start", resourceId: "fish-1", toolPower: 1, skillLevel: 1 });
  await fishingClient.waitFor(
    (message) => message.type === "rpg_resource_state"
      && message.resource?.id === "fish-1"
      && message.resource.claimedBy === fishingWelcome.playerId,
    3_000,
    startAt,
  );
  await fishingClient.waitFor(
    (message) => message.type === "rpg_gather_complete" && message.resourceId === "fish-1",
    9_000,
    startAt,
  );
  const reusableFishingSpot = await fishingClient.waitFor(
    (message) => message.type === "rpg_resource_state"
      && message.resource?.id === "fish-1"
      && message.resource.available
      && message.resource.claimedBy === null,
    1_000,
    startAt,
  );
  assert.equal(reusableFishingSpot.resource.respawnAt, 0);

  const rootTarget = enemyLocations["sunbone-wanderer"];
  const rootPosition = clearPoint(rootTarget, 130, 165);
  assert.ok(rootPosition, "Could not find a clear Frost Nova test position.");
  rootClient = new Client(`combat-root-${runId}`, "RootTester");
  await rootClient.waitFor((message) => message.type === "welcome");
  rootClient.send({
    type: "move",
    ...rootPosition,
    equipped: { weapon: "frostspire-staff", tool: "bronze-pick", armor: "" },
    appearance: "arcanist",
    action: "idle",
    direction: "down",
  });
  await delay(100);
  startAt = rootClient.messages.length;
  rootClient.send({
    type: "rpg_attack",
    enemyId: "sunbone-wanderer",
    combatStyle: "magic",
    combatLevel: 1,
    weaponPower: 1,
    abilityId: "frost-nova",
  });
  const frostNova = await rootClient.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "sunbone-wanderer"
      && message.abilityId === "frost-nova",
    3_000,
    startAt,
  );
  assert.equal(frostNova.enemy.status?.kind, "root");
  const frozenX = frostNova.enemy.x;
  const frozenY = frostNova.enemy.y;
  const rootedState = await rootClient.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "sunbone-wanderer"
      && message.enemy.status?.kind === "root"
      && message.enemy.action === "idle",
    3_000,
    startAt,
  );
  assert.ok(Math.hypot(rootedState.enemy.x - frozenX, rootedState.enemy.y - frozenY) < 0.2, "Frost Nova did not hold the creature in place.");

  const blocked = blockedCombatPosition();
  assert.ok(blocked, "Could not find a collision-separated line-of-sight test position.");
  blockedClient = new Client(`combat-los-${runId}`, "LineOfSightTester");
  await blockedClient.waitFor((message) => message.type === "welcome");
  await blockedClient.move(blocked.point);
  startAt = blockedClient.messages.length;
  blockedClient.send({ type: "rpg_attack", enemyId: blocked.enemyId, combatStyle: "magic", combatLevel: 1, weaponPower: 1 });
  const blockedError = await blockedClient.waitFor(
    (message) => message.type === "rpg_action_error" && message.action === "combat",
    3_000,
    startAt,
  );
  assert.match(blockedError.message, /terrain/i);

  const wanderer = enemyLocations["sunbone-wanderer"];
  const chasePosition = clearPoint(wanderer, 132, 164);
  assert.ok(chasePosition, "Could not find a clear melee-AI chase position.");
  chaseClient = new Client(`combat-chase-${runId}`, "ChaseTester");
  const chaseWelcome = await chaseClient.waitFor((message) => message.type === "welcome");
  await chaseClient.move(chasePosition);
  const walkingEnemy = await chaseClient.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "sunbone-wanderer"
      && message.enemy.action === "walk"
      && message.enemy.targetPlayerId === chaseWelcome.playerId,
    3_000,
  );
  assert.notEqual(Math.round(walkingEnemy.enemy.x), wanderer.x, "The melee creature did not move toward its target.");
  const meleeAttack = await chaseClient.waitFor(
    (message) => message.type === "rpg_enemy_attack" && message.enemyId === "sunbone-wanderer",
    6_000,
  );
  assert.ok(meleeAttack.damage > 0);

  const ranger = enemyLocations["fallen-ranger"];
  const rangerPosition = clearPoint(ranger, 150, 190);
  assert.ok(rangerPosition, "Could not find a clear Fallen Ranger firing lane.");
  rangerClient = new Client(`combat-ranger-${runId}`, "RangerTarget");
  const rangerWelcome = await rangerClient.waitFor((message) => message.type === "welcome");
  await rangerClient.move(rangerPosition);
  const rangerState = await rangerClient.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "fallen-ranger"
      && message.enemy.action === "attack"
      && message.enemy.targetPlayerId === rangerWelcome.playerId
      && message.attacked,
    4_000,
  );
  assert.equal(rangerState.enemy.x, ranger.x, "The Fallen Ranger should fire without entering melee range.");
  const arrowAttack = await rangerClient.waitFor(
    (message) => message.type === "rpg_enemy_attack" && message.enemyId === "fallen-ranger",
    4_000,
  );
  assert.equal(arrowAttack.impactDelay, 260);
  assert.ok(arrowAttack.damage > 0);

  const hexer = enemyLocations["moonfen-hexer"];
  const casterPosition = clearPoint(hexer, 145, 185);
  assert.ok(casterPosition, "Could not find a clear spellcaster test position.");
  casterClient = new Client(`combat-caster-${runId}`, "CasterTarget");
  const casterWelcome = await casterClient.waitFor((message) => message.type === "welcome");
  await casterClient.move(casterPosition);
  const casterState = await casterClient.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "moonfen-hexer"
      && message.enemy.action === "attack"
      && message.enemy.targetPlayerId === casterWelcome.playerId
      && message.attacked,
    4_000,
  );
  assert.equal(casterState.enemy.x, hexer.x, "The ranged spellcaster should not need to overlap the player.");
  const spellAttack = await casterClient.waitFor(
    (message) => message.type === "rpg_enemy_attack" && message.enemyId === "moonfen-hexer",
    4_000,
  );
  assert.ok(spellAttack.damage > 0);

  startAt = casterClient.messages.length;
  const telegraph = await casterClient.waitFor(
    (message) => message.type === "rpg_enemy_telegraph"
      && message.enemyId === "moonfen-hexer"
      && message.targetPlayerId === casterWelcome.playerId,
    10_000,
    startAt,
  );
  assert.equal(telegraph.abilityName, "Moonhex Nova");
  assert.ok(telegraph.completesAt > Date.now());
  const escapePoint = ringPoint(
    { x: telegraph.x, y: telegraph.y },
    telegraph.radius + 28,
    telegraph.radius + 70,
    () => true,
  );
  assert.ok(escapePoint, "Could not find a walkable point outside the Moonhex Nova telegraph.");
  await casterClient.move(escapePoint);
  const dodgeResult = await casterClient.waitFor(
    (message) => message.type === "rpg_enemy_telegraph_result"
      && message.enemyId === "moonfen-hexer"
      && message.targetPlayerId === casterWelcome.playerId,
    3_000,
    startAt,
  );
  assert.equal(dodgeResult.hit, false, "Moving outside the telegraph should dodge the special attack.");
  await casterClient.waitFor(
    (message) => message.type === "rpg_enemy_dodge" && message.enemyId === "moonfen-hexer",
    2_000,
    startAt,
  );
  assert.equal(
    casterClient.messages.slice(startAt).some((message) => message.type === "rpg_enemy_attack" && message.special && message.enemyId === "moonfen-hexer"),
    false,
    "A dodged special attack must not deal damage.",
  );

  console.log(JSON.stringify({
    meleeOutOfRangeRejected: true,
    rangedStrikeAccepted: rangedStrike.damage,
    mismatchedWeaponAbilityRejected: true,
    signatureAbilityAccepted: signatureStrike.damage,
    signatureAbilityStatus: signatureStrike.enemy.status?.kind,
    signatureAbilityHits: signatureStrike.hitCount,
    signatureCooldownEnforced: true,
    combatRetreatAccepted: true,
    gatheringCancelReleasedNode: true,
    fishingSpotRemainedReusable: true,
    frostNovaRootStoppedMovement: true,
    terrainBlocked: blocked.enemyId,
    meleeCreatureChased: true,
    fallenRangerAttackedAtRange: true,
    spellcasterAttackedAtRange: true,
    enemySpecialTelegraphShared: true,
    movementDodgedSpecialAttack: true,
    result: "PASS",
  }, null, 2));
} finally {
  rangeClient?.socket.close();
  blockedClient?.socket.close();
  chaseClient?.socket.close();
  rangerClient?.socket.close();
  casterClient?.socket.close();
  rootClient?.socket.close();
  fishingClient?.socket.close();
  server.kill("SIGTERM");
}
