import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeRpgProgress } from "../server/src/rpgProfiles.js";
import { advanceSideQuests, SIDE_QUESTS } from "../server/src/sideQuestProgress.js";
import { SIDE_QUESTS as CLIENT_SIDE_QUESTS } from "../src/rpg/sideQuestProgress.ts";

assert.equal(SIDE_QUESTS.length, 14);
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

let emberProgress = { "ember-forge": { status: "active", progress: 0 } };
emberProgress = advanceSideQuests(emberProgress, "gather", "ore", "emberfall-ore-1");
emberProgress = advanceSideQuests(emberProgress, "gather", "ore", "emberfall-ore-2");
emberProgress = advanceSideQuests(emberProgress, "gather", "ore", "emberfall-ore-3");
assert.deepEqual(emberProgress["ember-forge"], { status: "ready", progress: 3 }, "Emberfall ore should advance the forge tale");
let lanternProgress = { "lantern-stones": { status: "active", progress: 0 } };
for (let index = 0; index < 3; index += 1) lanternProgress = advanceSideQuests(lanternProgress, "gather", "ore", `moonfen-ore-${(index % 2) + 1}`);
assert.deepEqual(lanternProgress["lantern-stones"], { status: "ready", progress: 3 }, "Moonfen Gloomstone should relight Nessa's lantern route");
let wraithProgress = { "wraithlight-patrol": { status: "active", progress: 0 } };
wraithProgress = advanceSideQuests(wraithProgress, "combat", "witch", "moonfen-wraith-1");
assert.deepEqual(wraithProgress["wraithlight-patrol"], { status: "ready", progress: 1 }, "The Fen Wraith should complete Nessa's patrol tale");
let calderaProgress = { "caldera-supplies": { status: "active", progress: 0 } };
for (let index = 0; index < 4; index += 1) calderaProgress = advanceSideQuests(calderaProgress, "gather", "ore", `emberfall-ore-${(index % 3) + 1}`);
assert.deepEqual(calderaProgress["caldera-supplies"], { status: "ready", progress: 4 }, "Emberfall veins should reinforce Dagan's shelters");
let cinderwatchProgress = { cinderwatch: { status: "active", progress: 0 } };
cinderwatchProgress = advanceSideQuests(cinderwatchProgress, "combat", "orc", "emberfall-cinder-guard-1");
assert.deepEqual(cinderwatchProgress.cinderwatch, { status: "ready", progress: 1 }, "The Cinder Guard should complete Dagan's ridge patrol");
let frostmereProgress = { "last-beacon": { status: "active", progress: 0 } };
frostmereProgress = advanceSideQuests(frostmereProgress, "combat", "skeleton", "frostmere-lighthouse-warden");
assert.deepEqual(frostmereProgress["last-beacon"], { status: "ready", progress: 1 }, "Eira should advance the Frostmere tale");
let frostglassProgress = { "frostglass-relay": { status: "active", progress: 0 } };
for (let index = 0; index < 3; index += 1) frostglassProgress = advanceSideQuests(frostglassProgress, "gather", "ore", `frostmere-ore-${(index % 2) + 1}`);
assert.deepEqual(frostglassProgress["frostglass-relay"], { status: "ready", progress: 3 }, "Frostmere veins should fuel the lighthouse relay");
let sunscarProgress = { "solar-seal": { status: "active", progress: 0 } };
sunscarProgress = advanceSideQuests(sunscarProgress, "combat", "skeleton", "sunscar-tomb-king");
assert.deepEqual(sunscarProgress["solar-seal"], { status: "ready", progress: 1 }, "Khepri should advance the Sunscar tale");
let oasisProgress = { "oasis-sounding": { status: "active", progress: 0 } };
for (let index = 0; index < 3; index += 1) oasisProgress = advanceSideQuests(oasisProgress, "gather", "fish", "sunscar-fish-1");
assert.deepEqual(oasisProgress["oasis-sounding"], { status: "ready", progress: 3 }, "Sunscar oasis fishing should reveal the buried court");
let heartwoodProgress = { "heartwood-oath": { status: "active", progress: 0 } };
heartwoodProgress = advanceSideQuests(heartwoodProgress, "combat", "treant", "briar-treant");
assert.deepEqual(heartwoodProgress["heartwood-oath"], { status: "ready", progress: 1 }, "The Briar Treant should advance the Heartwood Oath");

const saved = normalizeRpgProgress({ sideQuests: { "quarry-ledger": { status: "active", progress: 4 }, "../../bad": { status: "claimed", progress: 999 } } });
assert.deepEqual(saved.sideQuests, { "quarry-ledger": { status: "active", progress: 4 } });

const clientRules = readFileSync(new URL("../src/rpg/sideQuestProgress.ts", import.meta.url), "utf8");
const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const gameCss = readFileSync(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");
const server = readFileSync(new URL("../server/src/index.js", import.meta.url), "utf8");
const clientWorld = JSON.parse(readFileSync(new URL("../src/rpg/worldLayout.json", import.meta.url), "utf8"));
const serverWorld = JSON.parse(readFileSync(new URL("../server/src/worldLayout.json", import.meta.url), "utf8"));
for (const quest of SIDE_QUESTS) assert.match(clientRules, new RegExp(`id: "${quest.id}"`), `${quest.id} is missing from the client catalog`);
assert.match(scene, /sideQuestAction\(questId: string\)/, "NPC side-quest actions are not exposed by the scene");
assert.match(scene, /advanceSideQuests\(this\.progress\.sideQuests, "combat"/, "local combat does not advance side quests");
assert.match(scene, /advanceSideQuests\(this\.progress\.sideQuests, "gather"/, "local gathering does not advance side quests");
assert.match(scene, /private sideQuestForNpc\(npcId: string\)/, "regional quest hubs do not sequence multiple stories cleanly");
assert.match(scene, /navigateToWorldTarget\(x: number, y: number, label: string\)/, "tracked regional tales cannot start collision-aware navigation");
assert.match(scene, /targetArea !== this\.activeWorldArea/, "regional navigation can incorrectly path across disconnected world maps");
assert.match(scene, /if \(!this\.planWalkTo\(x, y\)\)/, "regional navigation bypasses the shared collision-aware pathfinder");
assert.match(scene, /selectedQuest\?\.id !== quest\.id/, "stacked regional quest markers are not consolidated");
assert.match(scene, /rewardGold: sideQuest\.reward\.gold/, "NPC dialogue does not receive side-quest reward details");
assert.match(scene, /rewardItem\?\.name \?\? quest\.reward\.itemId/, "local side-quest completion feedback still hides the named reward");
assert.match(shell, /className="rpg-side-stories"/, "the quest journal does not present regional tales");
assert.match(shell, /className="rpg-dialogue__side-quest/, "NPC dialogue does not present authored side-quest offers");
assert.match(shell, /className="rpg-dialogue__side-quest-rewards"/, "NPC dialogue does not preview side-quest rewards");
assert.match(shell, /setTrackedSideQuestId\(dialogue\.sideQuest!\.id\)/, "accepting a regional tale does not immediately track it");
assert.match(shell, /className="rpg-side-stories__reward"/, "the regional quest journal does not show item and XP rewards");
assert.match(shell, /<HeroPortrait appearance=\{appearance\} equipped=\{equipped\} animated/, "regional quest givers do not have a modular animated portrait fallback");
assert.match(shell, /TRACKED_SIDE_QUEST_SAVE_KEY/, "tracked regional tales do not persist across reloads");
assert.match(shell, /function sideQuestMapMarker\(/, "tracked regional tales cannot resolve their live world objective");
assert.match(shell, /sideQuestTarget=\{trackedSideQuestTarget\}/, "tracked regional tales are missing from the minimap or world map");
assert.match(shell, /className=\"rpg-side-quest-pin/, "tracked regional progress is missing from the HUD");
assert.match(shell, /current === quest\.id \? null : quest\.id/, "the regional quest journal cannot toggle tracking");
assert.match(shell, /navigateToWorldTarget\(trackedSideQuestTarget\.x, trackedSideQuestTarget\.y, trackedSideQuestTarget\.label\)/, "the regional tracker does not expose navigation to its resolved objective");
assert.match(gameCss, /\.rpg-world-art__marker--sidequest/, "regional tale map markers are not visually distinct from the campaign");
assert.match(gameCss, /\.rpg-side-stories article\.tracked/, "the journal does not identify the currently tracked regional tale");
assert.match(server, /message\.action === "side_quest"/, "server-authoritative acceptance and turn-in are missing");
assert.match(server, /profileAction === "side_quest"[\s\S]*?RPG_NPC_POSITIONS/, "side-quest turn-in is not proximity validated");
for (const npcId of ["fen-cartographer", "ember-forgekeeper", "frostkeeper", "sunscar-scholar"]) {
  assert.ok(clientWorld.npcs.some((npc) => npc.id === npcId), `${npcId} is missing from the client world`);
  assert.ok(serverWorld.npcs.some((npc) => npc.id === npcId), `${npcId} is missing from the authoritative world`);
}

console.log("RPG side-quest checks passed: fourteen authored tales persist, chain through regional hubs, filter objectives, cap progress, and use authoritative turn-ins.");
