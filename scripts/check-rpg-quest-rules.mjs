import assert from "node:assert/strict";
import fs from "node:fs";

import {
  QUEST_MAX_STEP,
  questStepAfterCombat,
  questStepAfterCraft,
  questStepAfterGather,
} from "../server/src/questProgress.js";

const clientRules = JSON.parse(
  fs.readFileSync(new URL("../src/rpg/questRules.json", import.meta.url), "utf8"),
);
const serverRules = JSON.parse(
  fs.readFileSync(new URL("../server/src/questRules.json", import.meta.url), "utf8"),
);
const sceneSource = fs.readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const uiSource = fs.readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const uiCssSource = fs.readFileSync(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");
const gameDataSource = fs.readFileSync(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const serverSource = fs.readFileSync(new URL("../server/src/index.js", import.meta.url), "utf8");
const storageSource = fs.readFileSync(new URL("../src/rpg/playerStorage.ts", import.meta.url), "utf8");

assert.deepEqual(serverRules, clientRules, "Client and server quest rules must remain identical.");
assert.equal(QUEST_MAX_STEP, 57);
assert.deepEqual(serverRules.turnInSteps, [3, 8, 14, 22, 29, 34, 39, 44, 49, 56]);

const combatCases = [
  [2, { id: "goblin-camp-1", kind: "goblin" }, "melee", 3],
  [6, { id: "wolf-forest", kind: "wolf" }, "melee", 7],
  [11, { id: "rat-west", kind: "rat" }, "range", 12],
  [12, { id: "slime-mine", kind: "slime" }, "magic", 13],
  [17, { id: "briar-wolf-2", kind: "wolf" }, "range", 18],
  [19, { id: "orc-raider-2", kind: "orc" }, "melee", 20],
  [20, { id: "lizard-mystic-1", kind: "lizard" }, "magic", 21],
  [21, { id: "lizard-guard-1", kind: "lizard" }, "melee", 22],
  [24, { id: "sunbone-wanderer", kind: "skeleton" }, "melee", 25],
  [25, { id: "sunbone-guardian", kind: "skeleton" }, "range", 26],
  [26, { id: "moonfen-hexer", kind: "witch" }, "magic", 27],
  [27, { id: "fallen-ranger", kind: "skeleton" }, "range", 28],
  [28, { id: "briar-bonecaller", kind: "witch" }, "melee", 29],
  [31, { id: "moonfen-wraith-1", kind: "witch" }, "magic", 32],
  [33, { id: "moonfen-archon", kind: "witch" }, "magic", 34],
  [36, { id: "emberfall-ashwing-1", kind: "drake" }, "range", 37],
  [38, { id: "emberfall-caldera-lord", kind: "orc" }, "melee", 39],
  [41, { id: "frostmere-icewolf-1", kind: "wolf" }, "melee", 42],
  [43, { id: "frostmere-lighthouse-warden", kind: "skeleton" }, "magic", 44],
  [46, { id: "sunscar-dune-stalker-1", kind: "dune-stalker" }, "melee", 47],
  [48, { id: "sunscar-tomb-king", kind: "skeleton" }, "magic", 49],
  [51, { id: "icefang-seer-1", kind: "witch" }, "magic", 52],
  [52, { id: "icefang-sentinel-1", kind: "skeleton" }, "melee", 53],
  [54, { id: "icefang-wolf-2", kind: "wolf" }, "range", 55],
  [55, { id: "icefang-rimebound-king", kind: "skeleton" }, "magic", 56],
];

for (const [from, enemy, style, expected] of combatCases) {
  assert.equal(questStepAfterCombat(from, enemy, style), expected);
}

const rejectedCombatCases = [
  [2, { id: "rat-west", kind: "rat" }, "melee"],
  [2, { id: "goblin-camp-2", kind: "goblin" }, "melee"],
  [6, { id: "briar-wolf-1", kind: "wolf" }, "melee"],
  [11, { id: "rat-west", kind: "rat" }, "melee"],
  [12, { id: "slime-mine", kind: "slime" }, "range"],
  [17, { id: "briar-wolf-1", kind: "wolf" }, "range"],
  [19, { id: "orc-raider-1", kind: "orc" }, "melee"],
  [20, { id: "lizard-guard-1", kind: "lizard" }, "magic"],
  [21, { id: "lizard-mystic-1", kind: "lizard" }, "melee"],
  [24, { id: "sunbone-guardian", kind: "skeleton" }, "melee"],
  [25, { id: "sunbone-wanderer", kind: "skeleton" }, "range"],
  [26, { id: "moonfen-hexer", kind: "witch" }, "range"],
  [27, { id: "fallen-ranger", kind: "skeleton" }, "melee"],
  [28, { id: "moonfen-hexer", kind: "witch" }, "magic"],
];

for (const [step, enemy, style] of rejectedCombatCases) {
  assert.equal(questStepAfterCombat(step, enemy, style), step);
}

const gatherCases = [
  [1, { id: "copper-1", kind: "ore" }, 2],
  [1, { id: "copper-deep", kind: "ore" }, 2],
  [5, { id: "ancient-oak", kind: "tree" }, 6],
  [7, { id: "moonwater-ripples", kind: "fish" }, 8],
  [18, { id: "sunstone-seal", kind: "relic" }, 19],
  [32, { id: "moonfen-ore-1", kind: "ore" }, 33],
  [37, { id: "emberfall-ore-2", kind: "ore" }, 38],
  [42, { id: "frostmere-ore-1", kind: "ore" }, 43],
  [47, { id: "sunscar-ore-2", kind: "ore" }, 48],
  [53, { id: "icefang-ore-1", kind: "ore" }, 54],
];

for (const [from, resource, expected] of gatherCases) {
  assert.equal(questStepAfterGather(from, resource), expected);
}

const rejectedGatherCases = [
  [1, { id: "iron-1", kind: "ore" }],
  [5, { id: "copper-1", kind: "ore" }],
  [7, { id: "ancient-oak", kind: "tree" }],
  [18, { id: "moonwater-ripples", kind: "fish" }],
];

for (const [step, resource] of rejectedGatherCases) {
  assert.equal(questStepAfterGather(step, resource), step);
}

assert.equal(questStepAfterCraft(13, "forge-iron-pick"), 14);
assert.equal(questStepAfterCraft(13, "forge-bronze-sword"), 13);
assert.equal(questStepAfterCraft(12, "forge-iron-pick"), 12);
const questStepSource = gameDataSource.slice(gameDataSource.indexOf("export const QUEST_STEPS"), gameDataSource.indexOf("export const BASE_NPCS"));
assert.equal((questStepSource.match(/\{ questId:/g) ?? []).length, 58, "the campaign must contain steps 0 through 57");
for (const campaign of ["moonfen-eclipse", "emberfall-crown", "last-light", "buried-sun", "rimebound-oath"]) {
  assert.match(questStepSource, new RegExp(`questId: "${campaign}"`), `${campaign} is missing from the main campaign`);
}
assert.match(serverSource, /npcId === "frostkeeper" && next\.questStep === 50[\s\S]*?next\.questStep = 51/, "the authoritative server cannot begin the Icefang chapter");
assert.match(serverSource, /npcId === "frostkeeper" && next\.questStep === 56[\s\S]*?next\.questStep = 57[\s\S]*?frostguard-aegis/, "the authoritative server cannot complete the Icefang chapter");
assert.match(storageSource, /Math\.min\(57, Math\.floor\(Number\(parsed\.questStep\)/, "local saves still truncate the extended campaign");
assert.match(storageSource, /Math\.min\(9192, savedY\)/, "local saves still eject players from late regions");
assert.ok(sceneSource.includes("currentQuestTarget()"), "quest guidance must resolve the active world target in the scene");
assert.ok(sceneSource.includes("this.approach(target)"), "quest navigation must use collision-aware approach movement");
assert.ok(uiSource.includes("rpg-quest-pin__compass"), "the active quest must expose bearing and distance");
assert.ok(uiSource.includes("navigateToQuestTarget()"), "the quest tracker must expose guided navigation");
assert.ok(sceneSource.includes("this.callbacks.onQuestComplete(payload)"), "major quest rewards must emit a dedicated completion event");
assert.ok(uiSource.includes("rpg-quest-celebration"), "major quest rewards need a distinct celebration surface");
assert.ok(uiSource.includes("Continue adventure"), "quest celebrations must be explicitly dismissible");
assert.equal((sceneSource.match(/showQuestRewardToast\((?:3|8|14|22|29|34|39|44|49|56)\)/g) ?? []).length, 10, "all ten chapter milestones must share the completion flow");
assert.match(sceneSource, /playerPos\.y >= 8192\) return "Icefang Vault"/, "Icefang players are mislabeled as being inside another stacked region");
assert.match(serverSource, /y >= 8192\) return "icefang-vault"/, "the authoritative server cannot discover Icefang Vault");
const bossIntroSource = gameDataSource.match(/export const BOSS_INTRODUCTIONS:[\s\S]*?\n\];/)?.[0] ?? "";
assert.equal((bossIntroSource.match(/enemyId: "/g) ?? []).length, 9, "every major world boss needs an authored introduction");
assert.match(sceneSource, /private showBossIntroduction\(enemy: EnemyRuntime\)/, "major encounters do not trigger world-space introduction effects");
assert.match(sceneSource, /introducedBosses\.has\(enemy\.definition\.id\)/, "boss introductions can repeatedly interrupt one encounter session");
assert.match(uiSource, /className="rpg-boss-intro"/, "major encounters lack a cinematic title card");
assert.match(uiSource, /setTimeout\(\(\) => setBossIntro\(null\), 5_200\)/, "boss title cards do not dismiss automatically");
assert.match(uiSource, /nextStep <= previousStep/, "objective updates can replay during initial profile synchronization");
assert.match(uiSource, /setTimeout\(\(\) => setObjectiveUpdate\(null\), 4_800\)/, "objective handoffs do not dismiss automatically");
assert.match(uiSource, /className="rpg-objective-update"/, "ordinary quest steps lack a clear objective handoff");
assert.match(uiCssSource, /\.rpg-objective-update[\s\S]*?pointer-events: none;/, "objective handoffs block movement or combat input");

console.log(JSON.stringify({
  combatTransitions: combatCases.length,
  rejectedCombatTransitions: rejectedCombatCases.length,
  gatherTransitions: gatherCases.length,
  rejectedGatherTransitions: rejectedGatherCases.length,
  craftTransitions: serverRules.craft.length,
  maximumQuestStep: QUEST_MAX_STEP,
  campaignSteps: 58,
  campaignChapters: 8,
  inWorldQuestNavigation: true,
  questBearingAndDistance: true,
  majorQuestCelebrations: 10,
  authoredBossIntroductions: 9,
  nonBlockingObjectiveHandoffs: true,
  completionDismissal: true,
  result: "PASS",
}, null, 2));
