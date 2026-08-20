import assert from "node:assert/strict";
import fs from "node:fs";

import { isWorldPositionWalkable } from "../server/src/worldCollision.js";

const root = new URL("../", import.meta.url);
const clientLayout = JSON.parse(fs.readFileSync(new URL("src/rpg/worldLayout.json", root), "utf8"));
const serverLayout = JSON.parse(fs.readFileSync(new URL("server/src/worldLayout.json", root), "utf8"));
const clientLoot = JSON.parse(fs.readFileSync(new URL("src/rpg/lootRules.json", root), "utf8"));
const serverLoot = JSON.parse(fs.readFileSync(new URL("server/src/lootRules.json", root), "utf8"));
const clientAdventures = JSON.parse(fs.readFileSync(new URL("src/rpg/adventureRules.json", root), "utf8"));
const serverAdventures = JSON.parse(fs.readFileSync(new URL("server/src/adventureRules.json", root), "utf8"));
const gameData = fs.readFileSync(new URL("src/rpg/gameData.ts", root), "utf8");
const scene = fs.readFileSync(new URL("src/rpg/OrehavenScene.ts", root), "utf8");
const areas = fs.readFileSync(new URL("src/rpg/worldAreas.ts", root), "utf8");
const clientCollision = fs.readFileSync(new URL("src/rpg/worldCollision.ts", root), "utf8");
const serverCollision = fs.readFileSync(new URL("server/src/worldCollision.js", root), "utf8");
const storage = fs.readFileSync(new URL("src/rpg/playerStorage.ts", root), "utf8");
const image = fs.readFileSync(new URL("public/assets/rpg/world/icefang-vault.png", root));

assert.equal(image.toString("ascii", 1, 4), "PNG", "Icefang artwork is not a PNG");
assert.equal(image.readUInt32BE(16), 1536, "Icefang artwork width drifted");
assert.equal(image.readUInt32BE(20), 1024, "Icefang artwork height drifted");
assert.deepEqual(clientLayout, serverLayout, "Icefang client/server world populations drifted");
assert.deepEqual(clientLoot, serverLoot, "Icefang client/server loot pools drifted");
assert.deepEqual(clientAdventures, serverAdventures, "Icefang client/server chronicles drifted");

const enemyIds = [
  "icefang-wolf-1",
  "icefang-wolf-2",
  "icefang-sentinel-1",
  "icefang-sentinel-2",
  "icefang-seer-1",
  "icefang-rimebound-king",
];
const enemies = clientLayout.enemies.filter((enemy) => enemyIds.includes(enemy.id));
assert.equal(enemies.length, enemyIds.length, "Icefang enemy roster is incomplete");
for (const enemy of enemies) {
  assert.ok(enemy.y >= 8192 && enemy.y < 9216, `${enemy.id} escaped the Icefang simulation band`);
  assert.ok(isWorldPositionWalkable(enemy.x, enemy.y), `${enemy.id} spawned outside walkable ground`);
  assert.ok(Array.isArray(clientLoot[enemy.id]) && clientLoot[enemy.id].length > 0, `${enemy.id} has no reward pool`);
}

const resources = clientLayout.resources.filter((resource) => resource.id.startsWith("icefang-"));
assert.equal(resources.length, 3, "Icefang needs its two ore veins and permanent fishing spot");
for (const resource of resources) {
  assert.ok(resource.y >= 8192 && resource.y < 9216, `${resource.id} escaped the Icefang simulation band`);
}

for (const [label, x, y] of [
  ["entrance", 768, 9120],
  ["runic confluence", 768, 8672],
  ["frostglass mine", 270, 8520],
  ["east chamber", 1320, 8420],
  ["southwest chamber", 280, 8965],
  ["southeast chamber", 1190, 8960],
  ["Rime Throne", 768, 8345],
]) {
  assert.ok(isWorldPositionWalkable(x, y), `Icefang ${label} is inaccessible`);
}
for (const [x, y] of [[40, 8240], [520, 8400], [1000, 9000]]) {
  assert.equal(isWorldPositionWalkable(x, y), false, `Icefang void at ${x},${y} is incorrectly walkable`);
}

assert.match(areas, /icefang:[\s\S]*?top: 8192[\s\S]*?icefang-vault\.png/, "Icefang is missing from the shared atlas");
assert.match(gameData, /id: "icefang-descent"[\s\S]*?destinationY: 9120/, "Frostmere cannot descend into Icefang");
assert.match(gameData, /id: "icefang-ascent"[\s\S]*?destinationY: 5840/, "Icefang cannot return to Frostmere");
assert.match(gameData, /enemyId: "icefang-rimebound-king"[\s\S]*?Rimefall Judgment/, "Hroth lacks an authored boss introduction");
assert.match(scene, /private createIcefangAtmosphere\(\)/, "Icefang lacks regional animation and atmosphere");
assert.match(scene, /this\.trackRegionalAtmosphere\("icefang"/, "Icefang atmosphere is not region-scoped");
assert.match(clientCollision, /function icefangVaultPointWalkable/, "client Icefang collision topology is missing");
assert.match(serverCollision, /function icefangVaultPointWalkable/, "server Icefang collision topology is missing");
assert.match(storage, /Math\.min\(9192, savedY\)/, "local persistence truncates Icefang positions");
assert.ok(clientAdventures.some((entry) => entry.metric === "target:resource-frostglass-ore"), "Icefang mining has no chronicle");
assert.ok(clientAdventures.some((entry) => entry.metric === "target:icefang-rimebound-king"), "Hroth has no chronicle reward");

console.log(JSON.stringify({
  map: "1536x1024",
  enemies: enemies.length,
  resources: resources.length,
  portals: 2,
  authoredBoss: true,
  regionalAtmosphere: true,
  authoritativeCollision: true,
  chronicles: 2,
  result: "PASS",
}, null, 2));
