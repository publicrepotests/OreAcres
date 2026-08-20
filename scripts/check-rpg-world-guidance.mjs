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
const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");
const gameData = readFileSync(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const worldAreas = readFileSync(new URL("../src/rpg/worldAreas.ts", import.meta.url), "utf8");
assert.match(scene, /createSideQuestMarkers\(\)/, "Side-quest world markers are not created.");
assert.match(scene, /mainTarget\?\.kind === "npc" && mainTarget\.id === npc\.id/, "Main and side quest markers can overlap on one NPC.");
assert.match(scene, /this\.approach\(\{ kind: "npc", id: npc\.id/, "Quest offer markers are not clickable navigation targets.");
assert.match(scene, /createPublicEventMarker\(\)/, "Featured rallies have no in-world beacon.");
assert.match(scene, /setPosition\(enemy\.definition\.x, enemy\.definition\.y - 82\)/, "The rally beacon does not track moving bosses.");
assert.match(scene, /this\.approach\(\{ kind: "enemy", id: enemy\.definition\.id/, "The rally beacon cannot engage its boss.");
assert.match(scene, /this\.sideQuestMarkers\.forEach\(\(marker\) => marker\.destroy\(true\)\)/, "Quest markers leak across scene shutdowns.");
assert.match(scene, /this\.publicEventMarker\?\.destroy\(true\)/, "The rally beacon leaks across scene shutdowns.");
const areaOrder = worldAreas.match(/export const WORLD_AREA_ORDER:[\s\S]*?\] as const;/)?.[0] ?? "";
for (const area of ["overworld", "dungeon", "marsh", "highlands", "frostmere", "sunscar", "guildhall", "icefang"]) {
  assert.match(areaOrder, new RegExp(`"${area}"`), `The world atlas is missing the ${area} chart.`);
}
assert.match(shell, /WORLD_AREA_ORDER\.map\(\(id\) => WORLD_AREAS\[id\]\)/, "The world map controls do not use the shared eight-area atlas.");
assert.match(shell, /areaOverride\?: WorldMapArea/, "The full world map cannot inspect a region other than the player's current slice.");
assert.match(shell, /playerArea === area \? \(/, "Remote charts can render the player marker at invalid coordinates.");
assert.match(shell, /firstVisit: !hud\.progress\.discoveries\.includes\(region\.id\)/, "Region arrivals cannot distinguish a real discovery from a revisit.");
assert.match(shell, /NEW REGION DISCOVERED[\s\S]*?Recommended Lv[\s\S]*?Codex recorded/, "New-region arrival presentation lacks progression and reward context.");
assert.match(shell, /className="rpg-world-map__regions"/, "The world atlas has no visible regional chart controls.");
assert.match(styles, /\.rpg-world-map__regions\s*\{/, "Regional chart controls have no visual treatment.");
assert.match(styles, /\.rpg-zone-arrival\.danger-hostile/, "Hostile region arrivals are not visually differentiated.");
assert.equal((gameData.match(/landmark: "/g) ?? []).length, 18, "Every discoverable region needs a signature landmark.");
assert.equal((gameData.match(/recommendedLevel: \d+/g) ?? []).length, 18, "Every discoverable region needs progression guidance.");
const waystoneTravel = scene.match(/private completeWaystoneTravel\(definition: WaystoneDefinition\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
assert.match(waystoneTravel, /this\.inputPaused = true/, "waystone travel can accept movement while changing regional canvases");
assert.match(waystoneTravel, /fadeOut\(190/, "waystone travel still exposes the outgoing map swap");
assert.match(waystoneTravel, /centerOn\(definition\.arrivalX, definition\.arrivalY\)/, "waystone travel does not settle the camera before revealing the destination");
assert.match(waystoneTravel, /showWaystoneFx\(definition, false\)/, "waystone arrivals lack a destination-space attunement effect");
assert.match(waystoneTravel, /fadeIn\(300/, "waystone travel does not reveal the destination cleanly");
assert.match(waystoneTravel, /this\.inputPaused = false/, "waystone travel can leave player input disabled");

console.log("RPG world-guidance checks passed: quest markers, eight-area atlas navigation, cinematic waystone travel, honest region arrivals, progression guidance, and cleanup are wired.");
