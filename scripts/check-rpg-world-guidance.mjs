import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SIDE_QUESTS, sideQuestMarkerMode } from "../src/rpg/sideQuestProgress.ts";

const quest = SIDE_QUESTS[0];
assert.equal(sideQuestMarkerMode(quest, undefined, quest.unlockQuestStep - 1), null, "Locked stories must not advertise early.");
assert.equal(sideQuestMarkerMode(quest, undefined, quest.unlockQuestStep), "available", "Unlocked stories need an offer marker.");
assert.equal(sideQuestMarkerMode(quest, { status: "active", progress: 1 }, quest.unlockQuestStep), null, "Active stories should not clutter their giver.");
assert.equal(sideQuestMarkerMode(quest, { status: "ready", progress: quest.objective.target }, quest.unlockQuestStep), "ready", "Completed objectives need a turn-in marker.");
assert.equal(sideQuestMarkerMode(quest, { status: "claimed", progress: quest.objective.target }, quest.unlockQuestStep), null, "Claimed stories must stay hidden.");

const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
assert.match(scene, /createSideQuestMarkers\(\)/, "Side-quest world markers are not created.");
assert.match(scene, /mainTarget\?\.kind === "npc" && mainTarget\.id === npc\.id/, "Main and side quest markers can overlap on one NPC.");
assert.match(scene, /this\.approach\(\{ kind: "npc", id: npc\.id/, "Quest offer markers are not clickable navigation targets.");
assert.match(scene, /createPublicEventMarker\(\)/, "Featured rallies have no in-world beacon.");
assert.match(scene, /setPosition\(enemy\.definition\.x, enemy\.definition\.y - 82\)/, "The rally beacon does not track moving bosses.");
assert.match(scene, /this\.approach\(\{ kind: "enemy", id: enemy\.definition\.id/, "The rally beacon cannot engage its boss.");
assert.match(scene, /this\.sideQuestMarkers\.forEach\(\(marker\) => marker\.destroy\(true\)\)/, "Quest markers leak across scene shutdowns.");
assert.match(scene, /this\.publicEventMarker\?\.destroy\(true\)/, "The rally beacon leaks across scene shutdowns.");

console.log("RPG world-guidance checks passed: quest offers, turn-ins, de-duplication, interactive navigation, moving rally tracking, and cleanup are wired.");
