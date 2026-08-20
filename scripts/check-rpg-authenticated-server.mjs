import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { isWorldPositionWalkable, PLAYER_COLLISION_RADIUS } from "../server/src/worldCollision.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const userId = "7ad83d74-d37d-4562-b6ae-5a9de07a24ac";
const rivalUserId = "8f54b071-53fd-4af8-9948-722c1a73f99d";
const rows = new Map();
let profilePatchDelayMs = 0;

function movementPath(from, to) {
  const size = 16;
  const start = [Math.round(from.x / size), Math.round(from.y / size)];
  const goal = [Math.round(to.x / size), Math.round(to.y / size)];
  const key = ([x, y]) => `${x}:${y}`;
  const queue = [start];
  const previous = new Map([[key(start), null]]);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (key(current) === key(goal)) break;
    for (const [dx, dy] of directions) {
      const next = [current[0] + dx, current[1] + dy];
      if (previous.has(key(next))) continue;
      const x = next[0] * size;
      const y = next[1] * size;
      if (!isWorldPositionWalkable(x, y, PLAYER_COLLISION_RADIUS)) continue;
      previous.set(key(next), current);
      queue.push(next);
    }
  }
  if (!previous.has(key(goal))) throw new Error("No collision-safe test path reached the Field Rat.");
  const reversed = [];
  for (let cursor = goal; cursor; cursor = previous.get(key(cursor))) reversed.push({ x: cursor[0] * size, y: cursor[1] * size });
  return reversed.reverse();
}

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json", "content-range": "0-0/1" });
  response.end(JSON.stringify(value));
}

const mockSupabase = http.createServer(async (request, response) => {
  if (request.url?.startsWith("/auth/v1/user")) {
    const authenticatedUserId = String(request.headers.authorization || "").includes("rival.jwt") ? rivalUserId : userId;
    sendJson(response, 200, {
      id: authenticatedUserId,
      aud: "authenticated",
      role: "authenticated",
      email: "profile-test@oreacres.invalid",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    });
    return;
  }

  if (!request.url?.startsWith("/rest/v1/rpg_profiles")) {
    sendJson(response, 404, { message: "not found" });
    return;
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
  const url = new URL(request.url, "http://127.0.0.1");
  const requestedUserId = url.searchParams.get("user_id")?.replace(/^eq\./, "") || userId;
  const requestedRevision = Number(url.searchParams.get("revision")?.replace(/^eq\./, ""));
  const objectResponse = String(request.headers.accept || "").includes("application/vnd.pgrst.object");

  if (request.method === "GET") {
    const row = rows.get(requestedUserId);
    sendJson(response, 200, row ? (objectResponse ? row : [row]) : []);
    return;
  }

  if (request.method === "POST") {
    rows.set(payload.user_id, structuredClone(payload));
    sendJson(response, 201, objectResponse ? rows.get(payload.user_id) : [rows.get(payload.user_id)]);
    return;
  }

  if (request.method === "PATCH") {
    if (profilePatchDelayMs > 0) await delay(profilePatchDelayMs);
    const row = rows.get(requestedUserId);
    if (!row || (Number.isFinite(requestedRevision) && row.revision !== requestedRevision)) {
      sendJson(response, 200, objectResponse ? null : []);
      return;
    }
    Object.assign(row, structuredClone(payload));
    sendJson(response, 200, objectResponse ? row : [row]);
    return;
  }

  sendJson(response, 405, { message: "unsupported" });
});

await new Promise((resolve) => mockSupabase.listen(0, "127.0.0.1", resolve));
const mockSupabasePort = mockSupabase.address().port;
const server = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "server"),
  env: {
    ...process.env,
    PORT: "8082",
    SUPABASE_URL: `http://127.0.0.1:${mockSupabasePort}`,
    SUPABASE_SECRET_KEY: "mock-server-secret",
    REQUIRE_RPG_AUTH: "true",
    STATE_FILE: path.join(os.tmpdir(), `ore-acres-auth-${process.pid}.json`),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLogs = "";
server.stdout.on("data", (chunk) => { serverLogs += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLogs += chunk.toString(); });

const deadline = Date.now() + 5_000;
while (!serverLogs.includes("running on :8082") && Date.now() < deadline) await delay(25);
if (!serverLogs.includes("running on :8082")) throw new Error(`Realtime server did not start:\n${serverLogs}`);

class Client {
  constructor(token = "test.jwt", name = "PersistentHero") {
    this.messages = [];
    this.socket = new WebSocket(
      `ws://127.0.0.1:8082/ws?room=authenticated-${process.pid}&name=${name}`,
      ["oreacres.v1", `jwt-${token}`],
    );
    this.socket.on("message", (raw) => this.messages.push(JSON.parse(raw.toString())));
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  async waitFor(predicate, timeout = 8_000, startAt = 0) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const message = this.messages.slice(startAt).find(predicate);
      if (message) return message;
      await delay(20);
    }
    throw new Error(`Timed out waiting for authenticated response.\n${JSON.stringify(this.messages.slice(-8), null, 2)}\n${serverLogs}`);
  }
}

let first;
let second;
let rival;
let chapterClient;
let rewardClient;
let sunboneClient;
let contractClient;
try {
  first = new Client();
  const welcome = await first.waitFor((message) => message.type === "welcome");
  assert.equal(welcome.identity.mode, "supabase");
  assert.equal(welcome.identity.userId, userId);
  assert.equal(welcome.profile.progress.gold, 75);

  let startAt = first.messages.length;
  first.send({
    type: "rpg_identity_update",
    displayName: "Persistent Warden",
    appearance: "ranger",
    customization: {
      hairStyle: "afro",
      faceStyle: "cheerful",
      hairColor: "copper",
    },
  });
  const identitySaved = await first.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_identity",
    3_000,
    startAt,
  );
  await first.waitFor((message) => message.type === "rpg_identity_state" && message.displayName === "Persistent Warden", 3_000, startAt);
  assert.equal(identitySaved.profile.displayName, "Persistent Warden");
  assert.equal(identitySaved.profile.progress.appearance, "ranger");
  assert.equal(identitySaved.profile.progress.customization.hairStyle, "afro");
  assert.equal(identitySaved.profile.progress.customization.faceStyle, "cheerful");
  assert.equal(identitySaved.profile.progress.customization.hairColor, "copper");

  startAt = first.messages.length;
  first.send({ type: "rpg_profile_action", action: "buy", itemId: "healing-potion" });
  const purchase = await first.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_buy",
    3_000,
    startAt,
  );
  assert.equal(purchase.profile.progress.gold, 30);
  assert.equal(purchase.profile.progress.inventory["healing-potion"], 1);

  startAt = first.messages.length;
  first.send({ type: "rpg_profile_action", action: "appearance", appearance: "arcanist" });
  const appearance = await first.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_appearance",
    3_000,
    startAt,
  );
  assert.equal(appearance.profile.progress.appearance, "arcanist");
  assert.equal(appearance.profile.progress.customization.hairStyle, "spiked2");

  startAt = first.messages.length;
  first.send({
    type: "rpg_profile_action",
    action: "customization",
    customization: {
      faceStyle: "cheerful",
      hairStyle: "shorthawk",
      beardStyle: "trimmed",
      skinTone: "umber",
      hairColor: "copper",
      shirtColor: "crimson",
      pantsColor: "charcoal",
      bootsColor: "brown",
      armorDye: "moonsteel",
      weaponDye: "sunsteel",
      showHelmet: false,
      showCape: false,
      showShield: false,
      showWeapon: false,
    },
  });
  const customization = await first.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_customization",
    3_000,
    startAt,
  );
  assert.equal(customization.profile.progress.customization.hairStyle, "shorthawk");
  assert.equal(customization.profile.progress.customization.faceStyle, "cheerful");
  assert.equal(customization.profile.progress.customization.beardStyle, "trimmed");
  assert.equal(customization.profile.progress.customization.skinTone, "umber");
  assert.equal(customization.profile.progress.customization.armorDye, "moonsteel");
  assert.equal(customization.profile.progress.customization.weaponDye, "sunsteel");
  assert.equal(customization.profile.progress.customization.showHelmet, false);
  assert.equal(customization.profile.progress.customization.showCape, false);
  assert.equal(customization.profile.progress.customization.showShield, false);
  assert.equal(customization.profile.progress.customization.showWeapon, false);

  startAt = first.messages.length;
  first.send({ type: "rpg_profile_action", action: "unlock_skill", nodeId: "whirlwind" });
  const skillUnlock = await first.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_unlock_skill",
    3_000,
    startAt,
  );
  assert.deepEqual(skillUnlock.profile.progress.skillTree.unlocked, ["whirlwind"]);

  startAt = first.messages.length;
  first.send({ type: "rpg_profile_action", action: "unlock_skill", nodeId: "tempered-body" });
  const levelLockedSkill = await first.waitFor(
    (message) => message.type === "rpg_action_error" && /requires attack level 3/i.test(message.message),
    3_000,
    startAt,
  );
  assert.equal(levelLockedSkill.action, "profile");

  startAt = first.messages.length;
  first.send({ type: "rpg_waystone_unlock", waystoneId: "eastern-quarry" });
  const distantWaystone = await first.waitFor(
    (message) => message.type === "rpg_action_error" && message.action === "waystone",
    3_000,
    startAt,
  );
  assert.match(distantWaystone.message, /move closer/i);

  startAt = first.messages.length;
  first.send({ type: "rpg_region_discover", regionId: "eastern-quarry" });
  const distantRegion = await first.waitFor(
    (message) => message.type === "rpg_action_error" && message.action === "region",
    3_000,
    startAt,
  );
  assert.match(distantRegion.message, /physically enter/i);

  startAt = first.messages.length;
  first.send({ type: "rpg_waystone_travel", waystoneId: "orehaven-gate" });
  const starterWaystoneTravel = await first.waitFor(
    (message) => message.type === "rpg_waystone_travel" && message.waystoneId === "orehaven-gate",
    3_000,
    startAt,
  );
  assert.deepEqual([starterWaystoneTravel.x, starterWaystoneTravel.y], [698, 820]);
  for (const point of movementPath({ x: 698, y: 820 }, { x: 748, y: 505 }).slice(1)) {
    first.send({ type: "move", ...point });
    await delay(55);
  }
  first.send({ type: "move", x: 748, y: 505 });
  await delay(70);

  rival = new Client("rival.jwt", "RivalHero");
  const rivalWelcome = await rival.waitFor((message) => message.type === "welcome");
  assert.equal(rivalWelcome.identity.userId, rivalUserId);

  startAt = first.messages.length;
  first.send({ type: "move", x: 250, y: 520 });
  const correction = await first.waitFor((message) => message.type === "rpg_position_correction", 3_000, startAt);
  assert.ok(Math.hypot(correction.x - 748, correction.y - 505) < 2, "authenticated teleport was not rejected");
  for (const point of movementPath({ x: 748, y: 505 }, { x: 250, y: 520 }).slice(1)) {
    first.send({ type: "move", ...point });
    rival.send({ type: "move", ...point });
    await delay(55);
  }
  startAt = first.messages.length;
  first.send({ type: "rpg_region_discover", regionId: "western-woods" });
  const westernDiscovery = await first.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "region_discovery",
    3_000,
    startAt,
  );
  assert.ok(westernDiscovery.profile.progress.discoveries.includes("western-woods"));
  assert.equal(westernDiscovery.profile.progress.gold, 50);
  await delay(120);
  const incomingHit = await first.waitFor(
    (message) => message.type === "rpg_enemy_attack" && message.enemyId === "rat-west" && message.profileAuthoritative,
    5_000,
  );
  assert.ok(incomingHit.currentHp < incomingHit.maxHp, "enemy damage did not lower authoritative hitpoints");
  const defenseProfile = [...first.messages].reverse().find(
    (message) => message.type === "rpg_profile_state" && message.reason === "enemy_damage",
  );
  assert.ok(defenseProfile?.profile?.progress?.skills?.defense?.xp > 0, "surviving an enemy hit did not award Defense XP");

  startAt = first.messages.length;
  first.send({ type: "rpg_profile_action", action: "rest" });
  const threatenedRest = await first.waitFor(
    (message) => message.type === "rpg_action_error" && /creature is pursuing/i.test(message.message),
    3_000,
    startAt,
  );
  assert.equal(threatenedRest.action, "profile");

  // Pull clear of the Pine Wolf's patrol so it cannot interfere with the
  // deterministic contested Field Rat reward below.
  for (const point of movementPath({ x: 250, y: 520 }, { x: 304, y: 560 }).slice(1)) {
    first.send({ type: "move", ...point });
    rival.send({ type: "move", ...point });
    await delay(55);
  }
  await delay(2_000);

  startAt = first.messages.length;
  first.send({ type: "rpg_combat_ability", abilityId: "second-wind" });
  const secondWind = await first.waitFor(
    (message) => message.type === "rpg_ability_result" && message.abilityId === "second-wind",
    3_000,
    startAt,
  );
  assert.ok(secondWind.healing > 0);
  assert.ok(secondWind.readyAt > Date.now());

  startAt = first.messages.length;
  first.send({ type: "rpg_combat_ability", abilityId: "second-wind" });
  const secondWindCooldown = await first.waitFor(
    (message) => message.type === "rpg_action_error" && message.action === "ability" && message.abilityId === "second-wind",
    3_000,
    startAt,
  );
  assert.match(secondWindCooldown.message, /ready in/i);

  startAt = first.messages.length;
  first.send({
    type: "rpg_attack",
    enemyId: "rat-west",
    combatStyle: "magic",
    combatLevel: 99,
    defenseLevel: 99,
    weaponPower: 12,
  });
  const strike = await first.waitFor(
    (message) => message.type === "rpg_enemy_state" && message.enemy?.id === "rat-west" && message.sourcePlayerId === welcome.playerId,
    3_000,
    startAt,
  );
  assert.equal(strike.combatStyle, "melee", "authenticated combat style must come from equipped profile gear");
  assert.equal(typeof strike.critical, "boolean", "combat results should explicitly identify critical strikes");
  assert.ok(strike.damage >= 4 && strike.damage <= 12, `starter melee damage was outside the server-owned range: ${strike.damage}`);

  let ratHp = strike.enemy.hp;
  while (ratHp > 8) {
    // Keep deterministic headroom over the server's 350 ms basic-attack cooldown.
    await delay(450);
    startAt = first.messages.length;
    first.send({ type: "rpg_attack", enemyId: "rat-west", combatStyle: "magic", combatLevel: 99, weaponPower: 12 });
    const setupStrike = await first.waitFor(
      (message) => message.type === "rpg_enemy_state" && message.enemy?.id === "rat-west" && message.sourcePlayerId === welcome.playerId,
      3_000,
      startAt,
    );
    ratHp = setupStrike.enemy.hp;
  }

  await delay(450);
  profilePatchDelayMs = 650;
  const firstRaceIndex = first.messages.length;
  const rivalRaceIndex = rival.messages.length;
  first.send({ type: "rpg_attack", enemyId: "rat-west", combatStyle: "magic", combatLevel: 99, weaponPower: 12 });
  rival.send({ type: "rpg_attack", enemyId: "rat-west", combatStyle: "range", combatLevel: 99, weaponPower: 12 });
  const pendingDefeat = await first.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "rat-west"
      && message.defeated
      && message.settling,
    4_000,
    firstRaceIndex,
  );
  assert.equal(pendingDefeat.enemy.hp, 0, "a lethal authenticated hit remained at low health while its reward was saving");
  assert.ok(pendingDefeat.enemy.respawnAt > Date.now(), "a settling defeat remained attackable without a respawn deadline");
  const losingClient = pendingDefeat.sourcePlayerId === welcome.playerId ? rival : first;
  const losingIndex = losingClient === rival ? rivalRaceIndex : firstRaceIndex;
  await losingClient.waitFor(
    (message) =>
      (message.type === "rpg_action_error" && /settled|defeated/i.test(message.message))
      || (message.type === "rpg_enemy_state"
        && message.enemy?.id === "rat-west"
        && message.sourcePlayerId === (losingClient === rival ? rivalWelcome.playerId : welcome.playerId)
        && !message.defeated),
    4_000,
    losingIndex,
  );
  const finalDefeat = await first.waitFor(
    (message) => message.type === "rpg_enemy_state"
      && message.enemy?.id === "rat-west"
      && message.defeated
      && !message.settling
      && message.sourcePlayerId === pendingDefeat.sourcePlayerId,
    4_000,
    firstRaceIndex,
  );
  assert.equal(finalDefeat.enemy.hp, 0);
  profilePatchDelayMs = 0;
  const rewardGrants = [first, rival]
    .flatMap((client) => client.messages)
    .filter((message) => message.type === "rpg_profile_state" && message.reason === "combat_reward");
  assert.equal(rewardGrants.length, 1, "a contested killing blow granted more than one profile reward");
  const totalGold = rows.get(userId).progress.gold + rows.get(rivalUserId).progress.gold;
  assert.ok(totalGold >= 129 && totalGold <= 133, `unexpected total gold after one rat reward and one discovery: ${totalGold}`);

  const displacedSession = new Promise((resolve) => first.socket.once("close", (code) => resolve(code)));
  second = new Client();
  const reconnect = await second.waitFor((message) => message.type === "welcome");
  assert.equal(await displacedSession, 4001);
  assert.equal(reconnect.profile.displayName, "Persistent Warden");
  assert.ok(reconnect.profile.progress.gold >= 50 && reconnect.profile.progress.gold <= 58);
  assert.equal(reconnect.profile.progress.appearance, "arcanist");
  assert.equal(reconnect.profile.progress.customization.hairColor, "copper");
  assert.equal(reconnect.profile.progress.customization.faceStyle, "cheerful");
  assert.equal(reconnect.profile.progress.customization.armorDye, "moonsteel");
  assert.equal(reconnect.profile.progress.customization.weaponDye, "sunsteel");
  assert.equal(reconnect.profile.progress.customization.showHelmet, false);
  assert.equal(reconnect.profile.progress.customization.showCape, false);
  assert.equal(reconnect.profile.progress.customization.showShield, false);
  assert.equal(reconnect.profile.progress.customization.showWeapon, false);
  assert.equal(reconnect.profile.progress.inventory["healing-potion"], 1);
  assert.ok(reconnect.profile.progress.discoveries.includes("western-woods"));
  assert.deepEqual(reconnect.profile.progress.skillTree.unlocked, ["whirlwind"]);
  assert.ok(Math.hypot(reconnect.profile.progress.position.x - 304, reconnect.profile.progress.position.y - 560) < 2, "saved world position was not restored on reconnect");

  second.socket.close();
  await delay(100);
  const chapterRow = rows.get(userId);
  chapterRow.progress.position = { x: 748, y: 505 };
  chapterRow.progress.hp = Math.max(1, chapterRow.progress.maxHp - 11);
  chapterRow.progress.questStep = 15;
  chapterRow.progress.questComplete = true;
  chapterClient = new Client("test.jwt", "BriarwildTester");
  const chapterWelcome = await chapterClient.waitFor((message) => message.type === "welcome");
  assert.equal(chapterWelcome.profile.progress.questStep, 15);
  assert.equal(chapterWelcome.profile.progress.hp, chapterWelcome.profile.progress.maxHp - 11);

  startAt = chapterClient.messages.length;
  chapterClient.send({ type: "rpg_profile_action", action: "rest" });
  const sanctuaryRecovery = await chapterClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_rest",
    3_000,
    startAt,
  );
  assert.equal(sanctuaryRecovery.profile.progress.hp, sanctuaryRecovery.profile.progress.maxHp);
  assert.equal(rows.get(userId).progress.hp, sanctuaryRecovery.profile.progress.maxHp, "sanctuary healing was not persisted");

  startAt = chapterClient.messages.length;
  chapterClient.send({ type: "rpg_profile_action", action: "talk", npcId: "guide" });
  const chapterStarted = await chapterClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_talk",
    3_000,
    startAt,
  );
  assert.equal(chapterStarted.profile.progress.questStep, 16);
  assert.equal(chapterStarted.profile.progress.questComplete, false);

  for (const point of movementPath({ x: 748, y: 505 }, { x: 246, y: 1640 }).slice(1)) {
    chapterClient.send({ type: "move", ...point });
    await delay(55);
  }
  await delay(120);
  startAt = chapterClient.messages.length;
  chapterClient.send({ type: "rpg_profile_action", action: "talk", npcId: "ranger" });
  const rangerMuster = await chapterClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_talk",
    3_000,
    startAt,
  );
  assert.equal(rangerMuster.profile.progress.questStep, 17);

  chapterClient.socket.close();
  await delay(100);
  const rewardRow = rows.get(userId);
  rewardRow.progress.position = { x: 748, y: 505 };
  rewardRow.progress.questStep = 22;
  rewardRow.progress.questComplete = false;
  rewardRow.progress.inventory["sunstone-shard"] = 1;
  const goldBeforeBriarwildReward = rewardRow.progress.gold;
  rewardClient = new Client("test.jwt", "BriarwildRewardTester");
  await rewardClient.waitFor((message) => message.type === "welcome");
  for (const point of movementPath({ x: 748, y: 505 }, { x: 246, y: 1640 }).slice(1)) {
    rewardClient.send({ type: "move", ...point });
    await delay(55);
  }
  await delay(120);
  startAt = rewardClient.messages.length;
  rewardClient.send({ type: "rpg_profile_action", action: "talk", npcId: "ranger" });
  const chapterReward = await rewardClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_talk",
    3_000,
    startAt,
  );
  assert.equal(chapterReward.profile.progress.questStep, 23);
  assert.equal(chapterReward.profile.progress.questComplete, true);
  assert.equal(chapterReward.profile.progress.gold, goldBeforeBriarwildReward + 1_200);
  assert.equal(chapterReward.profile.progress.inventory["sunstone-shard"], undefined);
  assert.equal(chapterReward.profile.progress.inventory["warden-mail"], 1);
  assert.equal(chapterReward.profile.progress.inventory["arcane-staff"], 1);
  assert.equal(chapterReward.profile.progress.inventory["healing-potion"], 4);

  startAt = rewardClient.messages.length;
  rewardClient.send({ type: "rpg_profile_action", action: "talk", npcId: "ranger" });
  const sunboneStarted = await rewardClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_talk",
    3_000,
    startAt,
  );
  assert.equal(sunboneStarted.profile.progress.questStep, 24);
  assert.equal(sunboneStarted.profile.progress.questComplete, false);

  rewardClient.socket.close();
  await delay(100);
  const sunboneRow = rows.get(userId);
  sunboneRow.progress.position = { x: 748, y: 505 };
  sunboneRow.progress.questStep = 29;
  sunboneRow.progress.questComplete = false;
  const goldBeforeSunboneReward = sunboneRow.progress.gold;
  sunboneClient = new Client("test.jwt", "SunboneRewardTester");
  await sunboneClient.waitFor((message) => message.type === "welcome");
  for (const point of movementPath({ x: 748, y: 505 }, { x: 246, y: 1640 }).slice(1)) {
    sunboneClient.send({ type: "move", ...point });
    await delay(55);
  }
  await delay(120);
  startAt = sunboneClient.messages.length;
  sunboneClient.send({ type: "rpg_profile_action", action: "talk", npcId: "ranger" });
  const sunboneReward = await sunboneClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_talk",
    3_000,
    startAt,
  );
  assert.equal(sunboneReward.profile.progress.questStep, 30);
  assert.equal(sunboneReward.profile.progress.questComplete, true);
  assert.equal(sunboneReward.profile.progress.gold, goldBeforeSunboneReward + 1_800);
  assert.equal(sunboneReward.profile.progress.inventory["sunforged-mail"], 1);
  assert.equal(sunboneReward.profile.progress.inventory["rune-blade"], 1);
  assert.equal(sunboneReward.profile.progress.inventory["healing-potion"], 9);

  startAt = sunboneClient.messages.length;
  sunboneClient.send({ type: "rpg_profile_action", action: "talk", npcId: "ranger" });
  const repeatedSunboneTalk = await sunboneClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_talk",
    3_000,
    startAt,
  );
  assert.equal(repeatedSunboneTalk.profile.progress.gold, goldBeforeSunboneReward + 1_800);
  assert.equal(repeatedSunboneTalk.profile.progress.inventory["sunforged-mail"], 1);

  sunboneClient.socket.close();
  await delay(100);
  const contractRow = rows.get(userId);
  contractRow.progress.position = { x: 688, y: 468 };
  contractRow.progress.activities.daily = {
    day: new Date().toISOString().slice(0, 10),
    combat: 5,
    gather: 0,
    craft: 0,
    event: 0,
    targets: {},
    claimed: [],
  };
  contractRow.progress.inventory["rat-tail"] = 1;
  contractRow.progress.collectionLog["rat-tail"] = 1;
  contractRow.progress.inventory["briarhide-cloak"] = 1;
  contractRow.progress.equipped.armor = "briarhide-cloak";
  contractRow.progress.maxHp = 46;
  contractRow.progress.hp = 46;
  const goldBeforeContract = contractRow.progress.gold;
  const potionsBeforeContract = contractRow.progress.inventory["healing-potion"] || 0;
  contractClient = new Client("test.jwt", "ContractTester");
  await contractClient.waitFor((message) => message.type === "welcome");
  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "claim_contract", contractId: "trail-clearance" });
  const contractReward = await contractClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_claim_contract",
    3_000,
    startAt,
  );
  assert.equal(contractReward.profile.progress.gold, goldBeforeContract + 180);
  assert.equal(contractReward.profile.progress.inventory["healing-potion"], potionsBeforeContract + 1);
  assert.deepEqual(contractReward.profile.progress.activities.daily.claimed, ["trail-clearance"]);

  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "claim_contract", contractId: "trail-clearance" });
  const duplicateContract = await contractClient.waitFor(
    (message) => message.type === "rpg_action_error" && /already claimed/i.test(message.message),
    3_000,
    startAt,
  );
  assert.equal(duplicateContract.action, "profile");
  assert.equal(rows.get(userId).progress.gold, goldBeforeContract + 180);

  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "claim_contract", contractId: "goblin-incursion" });
  await contractClient.waitFor(
    (message) => message.type === "rpg_action_error" && /not complete/i.test(message.message),
    3_000,
    startAt,
  );
  assert.equal(rows.get(userId).progress.gold, goldBeforeContract + 180, "generic combat must not satisfy a targeted bounty");

  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "sell", itemId: "rat-tail" });
  const trophySale = await contractClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_sell",
    3_000,
    startAt,
  );
  assert.equal(trophySale.profile.progress.gold, goldBeforeContract + 182);
  assert.equal(trophySale.profile.progress.inventory["rat-tail"], undefined);
  assert.equal(trophySale.profile.progress.collectionLog["rat-tail"], 1, "selling must preserve collection credit");

  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "sell", itemId: "briarhide-cloak" });
  await contractClient.waitFor(
    (message) => message.type === "rpg_action_error" && /unequip/i.test(message.message),
    3_000,
    startAt,
  );
  assert.equal(rows.get(userId).progress.inventory["briarhide-cloak"], 1);

  contractClient.socket.close();
  await delay(100);
  const bountyRow = rows.get(userId);
  bountyRow.progress.position = { x: 688, y: 468 };
  bountyRow.progress.activities.daily.targets.goblin = 4;
  const goldBeforeBounty = bountyRow.progress.gold;
  contractClient = new Client("test.jwt", "BountyTester");
  await contractClient.waitFor((message) => message.type === "welcome");
  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "claim_contract", contractId: "goblin-incursion" });
  const bountyReward = await contractClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_claim_contract",
    3_000,
    startAt,
  );
  assert.equal(bountyReward.profile.progress.gold, goldBeforeBounty + 220);
  assert.deepEqual(bountyReward.profile.progress.activities.daily.claimed, ["trail-clearance", "goblin-incursion"]);

  contractClient.socket.close();
  await delay(100);
  rows.get(userId).progress.inventory["treasure-scroll"] = 1;
  rows.get(userId).progress.position = { x: 688, y: 468 };
  contractClient = new Client("test.jwt", "TreasureTester");
  await contractClient.waitFor((message) => message.type === "welcome");

  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "treasure_start" });
  const treasureStarted = await contractClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_treasure_start",
    3_000,
    startAt,
  );
  assert.equal(treasureStarted.profile.progress.treasureTrail.step, 0);
  assert.equal(treasureStarted.profile.progress.inventory["treasure-scroll"], undefined);

  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "treasure_advance", clueId: "fountain-ledger" });
  const firstClue = await contractClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_treasure_advance",
    3_000,
    startAt,
  );
  assert.equal(firstClue.profile.progress.treasureTrail.step, 1);

  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "treasure_advance", clueId: "moonwater-mooring" });
  const distantClueRejected = await contractClient.waitFor(
    (message) => message.type === "rpg_action_error" && /move closer/i.test(message.message),
    3_000,
    startAt,
  );
  assert.equal(distantClueRejected.action, "profile");

  for (const point of movementPath({ x: 748, y: 505 }, { x: 282, y: 872 }).slice(1)) {
    contractClient.send({ type: "move", ...point });
    await delay(55);
  }
  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "treasure_advance", clueId: "moonwater-mooring" });
  const secondClue = await contractClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_treasure_advance",
    3_000,
    startAt,
  );
  assert.equal(secondClue.profile.progress.treasureTrail.step, 2);

  for (const point of movementPath({ x: 282, y: 872 }, { x: 320, y: 1300 }).slice(1)) {
    contractClient.send({ type: "move", ...point });
    await delay(55);
  }
  const treasureGoldBefore = secondClue.profile.progress.gold;
  const craftingXpBefore = secondClue.profile.progress.skills.crafting.xp;
  const potionsBeforeTreasureReward = secondClue.profile.progress.inventory["healing-potion"] || 0;
  startAt = contractClient.messages.length;
  contractClient.send({ type: "rpg_profile_action", action: "treasure_advance", clueId: "sunstone-cache" });
  const treasureComplete = await contractClient.waitFor(
    (message) => message.type === "rpg_profile_state" && message.reason === "profile_treasure_advance" && message.profile.progress.treasureTrail === null,
    3_000,
    startAt,
  );
  assert.equal(treasureComplete.profile.progress.gold, treasureGoldBefore + 260);
  assert.equal(treasureComplete.profile.progress.skills.crafting.xp, craftingXpBefore + 140);
  assert.equal(treasureComplete.profile.progress.inventory["founders-relic"], 1);
  assert.equal(treasureComplete.profile.progress.inventory["healing-potion"], potionsBeforeTreasureReward + 2);
  assert.equal(treasureComplete.profile.progress.collectionLog["founders-relic"], 1);

  console.log(JSON.stringify({
    identity: reconnect.identity.mode,
    persistedDisplayName: reconnect.profile.displayName,
    onboardingIdentityPersisted: reconnect.profile.displayName === "Persistent Warden",
    persistedGold: reconnect.profile.progress.gold,
    persistedAppearance: reconnect.profile.progress.appearance,
    persistedCustomization: reconnect.profile.progress.customization,
    serverDerivedCombatStyle: strike.combatStyle,
    spoofedCombatStatsIgnored: true,
    secondWindPersisted: secondWind.healing,
    secondWindCooldownEnforced: true,
    threatenedSanctuaryRestRejected: true,
    sanctuaryRecoveryPersisted: true,
    teleportRejected: true,
    distantWaystoneRejected: true,
    unlockedWaystoneTravelVerified: true,
    distantRegionDiscoveryRejected: true,
    regionDiscoveryPersisted: true,
    duplicateSessionDisplaced: true,
    contestedRewardGrantedOnce: true,
    lethalStateBroadcastBeforeRewardPersistence: true,
    briarwildChapterStarted: chapterStarted.profile.progress.questStep === 16,
    briarwildRewardGrantedOnce: chapterReward.profile.progress.questStep === 23,
    sunboneChapterStarted: sunboneStarted.profile.progress.questStep === 24,
    sunboneRewardGrantedOnce: sunboneReward.profile.progress.questStep === 30,
    dailyContractGrantedOnce: true,
    targetedBountyRequiresMatchingKills: true,
    trophySalePreservedCollection: true,
    equippedTrophySaleRejected: true,
    treasureDistanceCheckEnforced: true,
    treasureTrailReward: "Founder's Sun Relic",
    profileRevision: reconnect.profile.revision,
    result: "PASS",
  }, null, 2));
} finally {
  first?.socket.close();
  second?.socket.close();
  rival?.socket.close();
  chapterClient?.socket.close();
  rewardClient?.socket.close();
  sunboneClient?.socket.close();
  contractClient?.socket.close();
  server.kill("SIGTERM");
  await new Promise((resolve) => mockSupabase.close(resolve));
}
