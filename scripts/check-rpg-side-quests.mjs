import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeRpgProgress } from "../server/src/rpgProfiles.js";
import { advanceSideQuests, SIDE_QUESTS } from "../server/src/sideQuestProgress.js";
import { SIDE_QUESTS as CLIENT_SIDE_QUESTS } from "../src/rpg/sideQuestProgress.ts";

assert.equal(SIDE_QUESTS.length, 4);
assert.deepEqual(
  CLIENT_SIDE_QUESTS.map(({ id, giverNpcId, unlockQuestStep, objective, reward }) => ({ id, giverNpcId, unlockQuestStep, objective: { kind: objective.kind, targetKey: objective.targetKey, target: objective.target }, reward })),
  SIDE_QUESTS,
  "client and server side-quest rules drifted",
);
let progress = { "cellar-vermin": { status: "active", progress: 0 } };
progress = advanceSideQuests(progress, "combat", "goblin");
assert.equal(progress["cellar-vermin"].progress, 0, "unrelated creatures advanced a side quest");
progress = advanceSideQuests(progress, "combat", "rat");
progress = advanceSideQuests(progress, "combat", "rat");
progress = advanceSideQuests(progress, "combat", "rat");
assert.deepEqual(progress["cellar-vermin"], { status: "ready", progress: 3 });
assert.deepEqual(advanceSideQuests(progress, "combat", "rat")["cellar-vermin"], { status: "ready", progress: 3 });

const saved = normalizeRpgProgress({ sideQuests: { "quarry-ledger": { status: "active", progress: 4 }, "../../bad": { status: "claimed", progress: 999 } } });
assert.deepEqual(saved.sideQuests, { "quarry-ledger": { status: "active", progress: 4 } });

const clientRules = readFileSync(new URL("../src/rpg/sideQuestProgress.ts", import.meta.url), "utf8");
const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../server/src/index.js", import.meta.url), "utf8");
for (const quest of SIDE_QUESTS) assert.match(clientRules, new RegExp(`id: "${quest.id}"`), `${quest.id} is missing from the client catalog`);
assert.match(scene, /sideQuestAction\(questId: string\)/, "NPC side-quest actions are not exposed by the scene");
assert.match(scene, /advanceSideQuests\(this\.progress\.sideQuests, "combat"/, "local combat does not advance side quests");
assert.match(scene, /advanceSideQuests\(this\.progress\.sideQuests, "gather"/, "local gathering does not advance side quests");
assert.match(shell, /className="rpg-side-stories"/, "the quest journal does not present regional tales");
assert.match(server, /message\.action === "side_quest"/, "server-authoritative acceptance and turn-in are missing");
assert.match(server, /profileAction === "side_quest"[\s\S]*?RPG_NPC_POSITIONS/, "side-quest turn-in is not proximity validated");

console.log("RPG side-quest checks passed: four authored tales persist, filter objectives, cap progress, and use authoritative turn-ins.");
