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

assert.deepEqual(serverRules, clientRules, "Client and server quest rules must remain identical.");
assert.equal(QUEST_MAX_STEP, 30);
assert.deepEqual(serverRules.turnInSteps, [3, 8, 14, 22, 29]);

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
assert.ok(sceneSource.includes("currentQuestTarget()"), "quest guidance must resolve the active world target in the scene");
assert.ok(sceneSource.includes("this.approach(target)"), "quest navigation must use collision-aware approach movement");
assert.ok(uiSource.includes("rpg-quest-pin__compass"), "the active quest must expose bearing and distance");
assert.ok(uiSource.includes("navigateToQuestTarget()"), "the quest tracker must expose guided navigation");
assert.ok(sceneSource.includes("this.callbacks.onQuestComplete(payload)"), "major quest rewards must emit a dedicated completion event");
assert.ok(uiSource.includes("rpg-quest-celebration"), "major quest rewards need a distinct celebration surface");
assert.ok(uiSource.includes("Continue adventure"), "quest celebrations must be explicitly dismissible");
assert.equal((sceneSource.match(/showQuestRewardToast\((?:3|8|14|22|29)\)/g) ?? []).length, 5, "all five chapter milestones must share the completion flow");

console.log(JSON.stringify({
  combatTransitions: combatCases.length,
  rejectedCombatTransitions: rejectedCombatCases.length,
  gatherTransitions: gatherCases.length,
  rejectedGatherTransitions: rejectedGatherCases.length,
  craftTransitions: serverRules.craft.length,
  maximumQuestStep: QUEST_MAX_STEP,
  inWorldQuestNavigation: true,
  questBearingAndDistance: true,
  majorQuestCelebrations: 5,
  completionDismissal: true,
  result: "PASS",
}, null, 2));
