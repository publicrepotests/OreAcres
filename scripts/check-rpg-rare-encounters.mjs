import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const gameData = await readFile(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const server = await readFile(new URL("../server/src/index.js", import.meta.url), "utf8");
const scene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const portrait = await readFile(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const publicEvents = await readFile(new URL("../src/rpg/publicEvents.ts", import.meta.url), "utf8");

const rareIds = ["goblin-firestarter", "ironhide-grukk", "moonfen-oracle", "emberfall-caldera-lord", "frostmere-lighthouse-warden", "sunscar-tomb-king"];
for (const id of rareIds) {
  const clientEntry = gameData.match(new RegExp(`id: "${id}"[\\s\\S]*?\\n  },`))?.[0] ?? "";
  assert.ok(clientEntry, `missing client encounter ${id}`);
  assert.match(clientEntry, /rare: true/);
  assert.match(clientEntry, /respawnMs: (?:420|540|600|900|1_080|1_200|1_320)_000/);
  assert.match(clientEntry, /visual: \{ weapon:/);
  assert.ok(server.includes(`"${id}": { id: "${id}"`), `missing authoritative server encounter ${id}`);
}

assert.ok(scene.includes("definition.visual?.weapon"), "enemy scene must use authored weapon loadouts");
assert.ok(scene.includes("definition.visual?.armor"), "enemy scene must use authored armor loadouts");
assert.ok(scene.includes("definition.visual?.auraColor"), "rare encounters need authored aura colors");
assert.ok(scene.includes("enemy.definition.id === publicEventRotation().event.enemyId"), "offline event credit must follow the featured rally");
assert.match(server, /const featuredEvent = isFeaturedRpgPublicEvent\(definition\.id, now\)/, "server event credit must follow the featured rally");
for (const id of ["auric-slime", "ironhide-grukk", "moonfen-oracle"]) {
  assert.match(publicEvents, new RegExp(`enemyId: "${id}"`), `${id} is missing from the public-event rotation`);
}
assert.ok(portrait.includes("definition?.visual?.weapon"), "target portraits must match world enemy weapons");
assert.ok(portrait.includes("RARE_HUNT_DOSSIERS"), "rare encounters must be discoverable in the quest journal");
assert.ok(portrait.includes("RARE_HUNT_LOOT"), "rare hunt dossiers must use the shared loot rules");
assert.ok(portrait.includes('setPanel("map")'), "rare hunt dossiers must link to their map territories");
assert.ok(portrait.includes("WORLD_RARE_MARKERS.map"), "the world map must render every named rare territory");
assert.match(server, /"goblin-firestarter": \{ name: "Cinder Volley"/);
assert.match(server, /"ironhide-grukk": \{ name: "Ironquake"/);
assert.match(server, /"moonfen-oracle": \{ name: "Moonwell Rupture"/);
assert.match(server, /"emberfall-caldera-lord": \{ name: "Caldera Breaker"/);
assert.match(server, /"frostmere-lighthouse-warden": \{ name: "Aurora Verdict"/);
assert.match(server, /"sunscar-tomb-king": \{ name: "Solar Burial"/);
assert.match(server, /drake: \{ name: "Ashwing Meteor"/);
assert.match(server, /"dune-stalker": \{ name: "Sandveil Ambush"/);
assert.match(server, /boar: \{ name: "Emberhorn Charge"/);
assert.ok(scene.includes("incomingCast: this.incomingCast"), "targeted rare casts must reach the HUD");
assert.match(scene, /private showCreatureSpecialImpact\(/, "creature specials need authored impact presentation");
assert.ok(portrait.includes("rpg-threat-cast"), "dangerous casts need a readable countdown outside the canvas");

console.log(JSON.stringify({ rareEncounters: rareIds.length, animatedGear: true, rareAuras: true, longRespawns: true, signatureAbilities: true, castHud: true, journalDossiers: true, mapTerritories: true, featuredEventIsolation: true, result: "PASS" }, null, 2));
