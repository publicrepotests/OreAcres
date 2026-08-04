import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { hasWorldLineOfSight, isWorldPositionWalkable } from "../server/src/worldCollision.js";
import worldLayout from "../server/src/worldLayout.json" with { type: "json" };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 8085;
const room = `social-${process.pid}`;

function clearMeleePoint(target, offset = 56) {
  for (let degrees = 0; degrees < 360; degrees += 12) {
    const radians = degrees * Math.PI / 180;
    const point = {
      x: Math.round(target.x + Math.cos(radians) * offset),
      y: Math.round(target.y + Math.sin(radians) * offset),
    };
    if (isWorldPositionWalkable(point.x, point.y, 8) && hasWorldLineOfSight(point.x, point.y, target.x, target.y)) return point;
  }
  return null;
}

const server = spawn(process.execPath, ["src/index.js"], {
  cwd: path.join(root, "server"),
  env: {
    ...process.env,
    PORT: String(port),
    REQUIRE_RPG_AUTH: "false",
    STATE_FILE: path.join(os.tmpdir(), `ore-acres-social-${process.pid}.json`),
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
    this.socket = new WebSocket(
      `ws://127.0.0.1:${port}/ws?room=${room}&name=${encodeURIComponent(name)}`,
      ["oreacres.v1"],
    );
    this.socket.on("message", (raw) => this.messages.push(JSON.parse(raw.toString())));
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  async waitFor(predicate, timeout = 4_000, startAt = 0) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const message = this.messages.slice(startAt).find(predicate);
      if (message) return message;
      await delay(20);
    }
    throw new Error(`Timed out waiting for social response.\n${JSON.stringify(this.messages.slice(-10), null, 2)}\n${serverLogs}`);
  }
}

let alice;
let bob;
let charlie;
try {
  alice = new Client("  Alice   The <Bold>  ");
  bob = new Client("Bob");
  const aliceWelcome = await alice.waitFor((message) => message.type === "welcome");
  const bobWelcome = await bob.waitFor((message) => message.type === "welcome");
  const alicePlayer = aliceWelcome.snapshot.players.find((player) => player.id === aliceWelcome.playerId);
  assert.equal(alicePlayer?.name, "Alice The Bold");

  let bobStart = bob.messages.length;
  alice.send({
    type: "move",
    x: alicePlayer.x,
    y: alicePlayer.y,
    action: "fish",
    direction: "left",
  });
  const skillAction = await bob.waitFor(
    (message) => message.type === "player_moved" && message.player?.id === aliceWelcome.playerId,
    3_000,
    bobStart,
  );
  assert.equal(skillAction.player.action, "fish", "Detailed skilling actions were not broadcast to nearby players.");

  let aliceStart = alice.messages.length;
  bobStart = bob.messages.length;
  alice.send({ type: "rpg_chat", text: "   Hello\n\tOrehaven!   " });
  const aliceEcho = await alice.waitFor((message) => message.type === "rpg_chat", 3_000, aliceStart);
  const bobEcho = await bob.waitFor((message) => message.type === "rpg_chat", 3_000, bobStart);
  assert.equal(aliceEcho.chat.text, "Hello Orehaven!");
  assert.equal(bobEcho.chat.text, "Hello Orehaven!");
  assert.equal(aliceEcho.chat.name, "Alice The Bold");
  assert.equal(aliceEcho.chat.playerId, aliceWelcome.playerId);

  aliceStart = alice.messages.length;
  bobStart = bob.messages.length;
  alice.send({ type: "rpg_party_invite", targetPlayerId: bobWelcome.playerId });
  const invitation = await bob.waitFor(
    (message) => message.type === "rpg_party_invite" && message.inviterId === aliceWelcome.playerId,
    3_000,
    bobStart,
  );
  assert.equal(invitation.inviterName, "Alice The Bold");
  await alice.waitFor(
    (message) => message.type === "rpg_party_state" && message.party?.members.length === 1,
    3_000,
    aliceStart,
  );

  aliceStart = alice.messages.length;
  bobStart = bob.messages.length;
  bob.send({ type: "rpg_party_accept" });
  const aliceParty = await alice.waitFor(
    (message) => message.type === "rpg_party_state" && message.party?.members.length === 2,
    3_000,
    aliceStart,
  );
  const bobParty = await bob.waitFor(
    (message) => message.type === "rpg_party_state" && message.party?.members.length === 2,
    3_000,
    bobStart,
  );
  assert.equal(aliceParty.party.leaderId, aliceWelcome.playerId);
  assert.deepEqual(
    bobParty.party.members.map((member) => member.name).sort(),
    ["Alice The Bold", "Bob"],
  );

  await delay(780);
  bobStart = bob.messages.length;
  alice.send({ type: "rpg_social_chat", channel: "party", text: "Group up at Moonfen." });
  const partyChat = await bob.waitFor(
    (message) => message.type === "rpg_chat" && message.chat.kind === "party",
    3_000,
    bobStart,
  );
  assert.equal(partyChat.chat.text, "Group up at Moonfen.");

  aliceStart = alice.messages.length;
  bobStart = bob.messages.length;
  alice.send({ type: "rpg_expedition_start", expeditionId: "moonfen-purge" });
  const expeditionStarted = await bob.waitFor(
    (message) => message.type === "rpg_party_state" && message.party?.expedition?.status === "active",
    3_000,
    bobStart,
  );
  assert.equal(expeditionStarted.party.expedition.target, 3);

  const expeditionTargets = [
    { id: "lizard-guard-1", abilityId: "shieldbreaker" },
    { id: "lizard-mystic-1" },
    { id: "lizard-scout-1" },
  ].map((target) => ({ ...worldLayout.enemies.find((enemy) => enemy.id === target.id), ...target }));
  bobStart = bob.messages.length;
  for (const target of expeditionTargets) {
    const point = clearMeleePoint(target);
    assert.ok(point, `Could not find an expedition position near ${target.id}.`);
    alice.send({ type: "move", ...point, action: "idle", direction: "left" });
    bob.send({ type: "move", ...point, action: "idle", direction: "left" });
    await delay(120);
    const strikeStart = alice.messages.length;
    alice.send({
      type: "rpg_attack",
      enemyId: target.id,
      combatStyle: "melee",
      combatLevel: 99,
      weaponPower: 12,
      ...(target.abilityId ? { abilityId: target.abilityId } : {}),
    });
    const defeatedTarget = await alice.waitFor(
      (message) => message.type === "rpg_enemy_state" && message.enemy?.id === target.id && message.defeated,
      3_000,
      strikeStart,
    );
    assert.equal(defeatedTarget.defeated, true);
    await delay(380);
  }
  const expeditionReward = await bob.waitFor(
    (message) => message.type === "rpg_expedition_reward" && message.expeditionId === "moonfen-purge",
    3_000,
    bobStart,
  );
  assert.equal(expeditionReward.reward.gold, 140);
  assert.equal(expeditionReward.reward.defenseXp, 85);

  aliceStart = alice.messages.length;
  bobStart = bob.messages.length;
  alice.send({ type: "rpg_expedition_start", expeditionId: "goblin-supply-raid" });
  const secondExpedition = await bob.waitFor(
    (message) => message.type === "rpg_party_state" && message.party?.expedition?.id === "goblin-supply-raid" && message.party.expedition.status === "active",
    3_000,
    bobStart,
  );
  assert.deepEqual(secondExpedition.party.completedExpeditionIds, ["moonfen-purge"]);
  assert.equal(secondExpedition.party.expedition.target, 2);
  assert.equal(secondExpedition.party.expedition.region, "Goblin Camp");

  const rat = { x: 250, y: 590 };
  const combatPoint = clearMeleePoint(rat);
  assert.ok(combatPoint, "Could not find a party-combat position near the field rat.");
  alice.send({ type: "move", ...combatPoint, action: "idle", direction: "left" });
  bob.send({ type: "move", ...combatPoint, action: "idle", direction: "left" });
  await delay(120);
  bobStart = bob.messages.length;
  alice.send({ type: "rpg_attack", enemyId: "rat-west", combatStyle: "melee", combatLevel: 99, weaponPower: 12 });
  const assistReward = await bob.waitFor(
    (message) => message.type === "rpg_party_assist_reward" && message.enemyId === "rat-west",
    3_000,
    bobStart,
  );
  assert.ok(assistReward.reward.gold > 0);
  assert.ok(assistReward.reward.xp > 0);
  assert.equal(assistReward.profileAuthoritative, false);

  aliceStart = alice.messages.length;
  bobStart = bob.messages.length;
  bob.send({ type: "rpg_party_leave" });
  await bob.waitFor(
    (message) => message.type === "rpg_party_state" && message.party === null,
    3_000,
    bobStart,
  );
  const leaderAfterLeave = await alice.waitFor(
    (message) => message.type === "rpg_party_state" && message.party?.members.length === 1,
    3_000,
    aliceStart,
  );
  assert.equal(leaderAfterLeave.party.members[0].id, aliceWelcome.playerId);

  aliceStart = alice.messages.length;
  alice.send({ type: "rpg_chat", text: "spam" });
  await alice.waitFor(
    (message) => message.type === "rpg_chat" && message.chat.text === "spam",
    3_000,
    aliceStart,
  );
  aliceStart = alice.messages.length;
  alice.send({ type: "rpg_chat", text: "spam again" });
  const cooldown = await alice.waitFor(
    (message) => message.type === "rpg_action_error" && message.action === "chat",
    3_000,
    aliceStart,
  );
  assert.match(cooldown.message, /cooling down/i);

  await delay(780);
  bobStart = bob.messages.length;
  alice.send({ type: "rpg_chat", text: "Meet at the fountain." });
  await bob.waitFor(
    (message) => message.type === "rpg_chat" && message.chat.text === "Meet at the fountain.",
    3_000,
    bobStart,
  );

  charlie = new Client("Charlie");
  const charlieWelcome = await charlie.waitFor((message) => message.type === "welcome");
  assert.deepEqual(
    charlieWelcome.snapshot.chat.map((entry) => entry.text),
    ["Hello Orehaven!", "spam", "Meet at the fountain."],
    "A newly joined player did not receive the recent room chat history.",
  );

  aliceStart = alice.messages.length;
  alice.send({ type: "rpg_guild_create", name: "  Moonwater <Company>  ", tag: "m00n!" });
  const guildCreated = await alice.waitFor(
    (message) => message.type === "rpg_guild_state" && message.guild?.tag === "M00N",
    3_000,
    aliceStart,
  );
  assert.equal(guildCreated.guild.name, "Moonwater Company");

  let charlieStart = charlie.messages.length;
  alice.send({ type: "rpg_guild_invite", targetPlayerId: charlieWelcome.playerId });
  const guildInvitation = await charlie.waitFor(
    (message) => message.type === "rpg_guild_invite" && message.guild?.id === guildCreated.guild.id,
    3_000,
    charlieStart,
  );
  assert.equal(guildInvitation.inviterName, "Alice The Bold");
  assert.equal(guildInvitation.guild.renown, 0, "Guild invitations must not transfer personal renown.");

  charlieStart = charlie.messages.length;
  charlie.send({ type: "rpg_guild_accept" });
  const guildJoined = await charlie.waitFor(
    (message) => message.type === "rpg_guild_state" && message.guild?.id === guildCreated.guild.id,
    3_000,
    charlieStart,
  );
  assert.equal(guildJoined.guild.name, "Moonwater Company");

  await delay(780);
  charlieStart = charlie.messages.length;
  const bobGuildChatStart = bob.messages.length;
  alice.send({ type: "rpg_social_chat", channel: "guild", text: "Welcome to the company." });
  const guildChat = await charlie.waitFor(
    (message) => message.type === "rpg_chat" && message.chat.kind === "guild",
    3_000,
    charlieStart,
  );
  assert.equal(guildChat.chat.tag, "M00N");
  await delay(120);
  assert.equal(
    bob.messages.slice(bobGuildChatStart).some((message) => message.type === "rpg_chat" && message.chat?.kind === "guild"),
    false,
    "Guild chat leaked to a non-member.",
  );

  charlieStart = charlie.messages.length;
  charlie.send({ type: "rpg_guild_leave" });
  const guildLeft = await charlie.waitFor(
    (message) => message.type === "rpg_guild_state" && message.guild === null,
    3_000,
    charlieStart,
  );
  assert.equal(guildLeft.guild, null);

  aliceStart = alice.messages.length;
  charlieStart = charlie.messages.length;
  alice.send({ type: "rpg_party_invite", targetPlayerId: charlieWelcome.playerId });
  await charlie.waitFor(
    (message) => message.type === "rpg_party_invite" && message.inviterId === aliceWelcome.playerId,
    3_000,
    charlieStart,
  );
  charlieStart = charlie.messages.length;
  charlie.send({ type: "rpg_party_accept" });
  await charlie.waitFor(
    (message) => message.type === "rpg_party_state" && message.party?.members.length === 2,
    3_000,
    charlieStart,
  );

  const goblinTargets = [
    { id: "goblin-camp-1", x: 1280, y: 880 },
    { id: "goblin-camp-2", x: 1400, y: 940 },
  ];
  aliceStart = alice.messages.length;
  for (const target of goblinTargets) {
    const point = clearMeleePoint(target);
    assert.ok(point, `Could not find a guild-expedition position near ${target.id}.`);
    alice.send({ type: "move", ...point, action: "idle", direction: "left" });
    charlie.send({ type: "move", ...point, action: "idle", direction: "left" });
    await delay(120);
    const strikeStart = alice.messages.length;
    alice.send({ type: "rpg_attack", enemyId: target.id, combatStyle: "melee", combatLevel: 99, weaponPower: 12 });
    await alice.waitFor(
      (message) => message.type === "rpg_enemy_state" && message.enemy?.id === target.id && message.defeated,
      3_000,
      strikeStart,
    );
    await delay(380);
  }
  const guildExpeditionReward = await alice.waitFor(
    (message) => message.type === "rpg_expedition_reward" && message.expeditionId === "goblin-supply-raid",
    3_000,
    aliceStart,
  );
  assert.equal(guildExpeditionReward.reward.guildRenown, 15);
  assert.equal(guildExpeditionReward.guild.renown, 15);

  await delay(780);
  aliceStart = alice.messages.length;
  alice.send({ type: "rpg_chat", text: "x".repeat(220) });
  const clamped = await alice.waitFor(
    (message) => message.type === "rpg_chat" && message.chat.text.startsWith("x"),
    3_000,
    aliceStart,
  );
  assert.equal(clamped.chat.text.length, 160);

  console.log(JSON.stringify({
    sanitizedName: aliceEcho.chat.name,
    normalizedMessage: aliceEcho.chat.text,
    spamCooldownEnforced: true,
    historyDelivered: charlieWelcome.snapshot.chat.length,
    maximumMessageLength: clamped.chat.text.length,
    networkedSkillAction: skillAction.player.action,
    partyInviteAccepted: true,
    partyChatScoped: true,
    nearbyPartyAssistReward: assistReward.reward,
    cooperativeExpeditionReward: expeditionReward.reward,
    expeditionProgressionUnlocked: secondExpedition.party.expedition.name,
    partyLeaveSynchronized: true,
    guildCreated: guildCreated.guild.name,
    guildInviteAccepted: true,
    guildChatScoped: true,
    guildLeaveSynchronized: true,
    expeditionGuildRenown: guildExpeditionReward.guild.renown,
    result: "PASS",
  }, null, 2));
} finally {
  alice?.socket.close();
  bob?.socket.close();
  charlie?.socket.close();
  server.kill("SIGTERM");
}
