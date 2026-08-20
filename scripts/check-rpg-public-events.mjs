import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PUBLIC_EVENTS,
  PUBLIC_EVENT_ROTATION_MS,
  publicEventRotation,
} from "../src/rpg/publicEvents.ts";
import {
  RPG_PUBLIC_EVENTS,
  RPG_PUBLIC_EVENT_ROTATION_MS,
  featuredRpgPublicEvent,
  isFeaturedRpgPublicEvent,
} from "../server/src/publicEvents.js";

assert.equal(PUBLIC_EVENTS.length, 6, "Six regional public rallies should rotate.");
assert.equal(PUBLIC_EVENT_ROTATION_MS, RPG_PUBLIC_EVENT_ROTATION_MS);
assert.deepEqual(
  PUBLIC_EVENTS.map(({ enemyId, name, location, region }) => ({ enemyId, name, location, region })),
  RPG_PUBLIC_EVENTS,
  "Client and server public-event catalogs drifted.",
);

for (let index = 0; index < PUBLIC_EVENTS.length * 2; index += 1) {
  const at = index * PUBLIC_EVENT_ROTATION_MS + 1;
  const client = publicEventRotation(at);
  const server = featuredRpgPublicEvent(at);
  assert.equal(client.event.enemyId, PUBLIC_EVENTS[index % PUBLIC_EVENTS.length].enemyId);
  assert.equal(server.event.enemyId, client.event.enemyId);
  assert.equal(server.endsAt, client.endsAt);
  assert.equal(isFeaturedRpgPublicEvent(client.event.enemyId, at), true);
}

assert.equal(featuredRpgPublicEvent(1, "moonfen-oracle").event.enemyId, "moonfen-oracle", "Test override should select a stable rally.");

const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../server/src/index.js", import.meta.url), "utf8");
assert.match(scene, /syncFeaturedWorldEvent\(\)/, "The scene does not update when the featured rally rotates.");
assert.match(scene, /enemy\.definition\.id === publicEventRotation\(\)\.event\.enemyId/, "Offline event credit does not follow the featured rally.");
assert.match(shell, /FEATURED RALLY/, "The HUD does not identify the rotating public rally.");
assert.match(shell, /Next rally in/, "The HUD does not expose the rotation countdown.");
assert.match(server, /if \(featuredEvent\)/, "Combat contribution tracking is not gated to the featured rally.");
assert.match(server, /grantWorldEventParticipationRewards\(roomId, definition, participants, player\.id\)/, "Skill-tree kills do not settle public-event helper rewards.");

console.log("RPG public-event checks passed: six regional bosses rotate with client/server parity, deterministic timing, contribution rewards, and HUD tracking.");
