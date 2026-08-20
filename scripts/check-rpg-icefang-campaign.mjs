import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { questStepAfterCombat, questStepAfterGather } from "../server/src/questProgress.js";

const gameData = readFileSync(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const server = readFileSync(new URL("../server/src/index.js", import.meta.url), "utf8");
const localStorage = readFileSync(new URL("../src/rpg/playerStorage.ts", import.meta.url), "utf8");
const profileStore = readFileSync(new URL("../server/src/rpgProfiles.js", import.meta.url), "utf8");
const world = JSON.parse(readFileSync(new URL("../src/rpg/worldLayout.json", import.meta.url), "utf8"));

const chapterSource = gameData
  .split("\n")
  .filter((line) => line.includes('questId: "rimebound-oath"'))
  .join("\n");
const targets = [...chapterSource.matchAll(/target: "([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(targets, [
  "Keeper Elowen",
  "Glacial Oathseer",
  "Oathbound Sentinel",
  "Prismatic Frostglass Vein",
  "Vault Icefang",
  "Hroth, the Rimebound King",
  "Keeper Elowen",
  "Complete",
], "Icefang's authored objective route drifted");

const namedWorldEntities = new Set([
  ...world.npcs.map((entry) => entry.name),
  ...world.enemies.map((entry) => entry.name),
  ...world.resources.map((entry) => entry.name),
  "Complete",
]);
targets.forEach((target) => assert.ok(namedWorldEntities.has(target), `Icefang quest target is missing from production world layout: ${target}`));

assert.equal(questStepAfterCombat(51, { id: "icefang-seer-1", kind: "witch" }, "magic"), 52);
assert.equal(questStepAfterCombat(52, { id: "icefang-sentinel-1", kind: "skeleton" }, "melee"), 53);
assert.equal(questStepAfterGather(53, { id: "icefang-ore-1", kind: "ore" }), 54);
assert.equal(questStepAfterCombat(54, { id: "icefang-wolf-2", kind: "wolf" }, "range"), 55);
assert.equal(questStepAfterCombat(55, { id: "icefang-rimebound-king", kind: "skeleton" }, "magic"), 56);
assert.equal(questStepAfterCombat(55, { id: "icefang-sentinel-2", kind: "skeleton" }, "magic"), 55, "a lesser enemy can incorrectly complete the final boss objective");

assert.match(scene, /questStep === 50[\s\S]*?questStep: 51[\s\S]*?The Rimebound Oath has begun/, "offline play cannot begin Chapter VIII");
assert.match(scene, /questStep === 56[\s\S]*?questStep: 57[\s\S]*?frostguard-aegis[\s\S]*?showQuestRewardToast\(56\)/, "offline play cannot complete Chapter VIII with its reward celebration");
assert.match(server, /next\.questStep === 50[\s\S]*?next\.questStep = 51/, "authoritative play cannot begin Chapter VIII");
assert.match(server, /next\.questStep === 56[\s\S]*?next\.questStep = 57[\s\S]*?frostguard-aegis/, "authoritative play cannot complete Chapter VIII with its reward");
assert.match(scene, /playerPos\.y >= 8192\) return "Icefang Vault"/, "client HUD reports the wrong region inside Icefang");
assert.match(server, /y >= 8192\) return "icefang-vault"/, "server discovery reports the wrong region inside Icefang");
assert.match(localStorage, /Math\.min\(57, Math\.floor\(Number\(parsed\.questStep\)/, "local saves truncate Chapter VIII");
assert.match(profileStore, /finiteInteger\(candidate\.questStep, 0, 0, 57\)/, "server profiles truncate Chapter VIII");
assert.match(profileStore, /"orehaven-guild-hall", "icefang-vault"/, "server profiles discard Icefang discovery");

console.log(JSON.stringify({
  chapter: "The Rimebound Oath",
  objectives: targets.length - 1,
  productionTargetsResolved: true,
  authoritativeParity: true,
  finalReward: "Frostguard Aegis",
  regionIdentityCorrect: true,
  saveMigrationStep: 57,
  result: "PASS",
}, null, 2));
