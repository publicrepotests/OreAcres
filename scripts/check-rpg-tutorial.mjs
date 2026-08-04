import assert from "node:assert/strict";
import fs from "node:fs";
import { tutorialMilestoneComplete } from "../src/rpg/tutorialProgress.ts";

const empty = { movedDistance: 0, questStep: 0, panel: null, gatheringXp: 0, combatXp: 0, enemiesDefeated: 0 };
assert.equal(tutorialMilestoneComplete("move", { ...empty, movedDistance: 45 }), false);
assert.equal(tutorialMilestoneComplete("move", { ...empty, movedDistance: 46 }), true);
assert.equal(tutorialMilestoneComplete("mira", { ...empty, questStep: 1 }), true);
assert.equal(tutorialMilestoneComplete("inventory", { ...empty, panel: "inventory" }), true);
assert.equal(tutorialMilestoneComplete("map", { ...empty, panel: "map" }), true);
assert.equal(tutorialMilestoneComplete("gather", { ...empty, gatheringXp: 1 }), true);
assert.equal(tutorialMilestoneComplete("combat", { ...empty, combatXp: 1 }), true);
assert.equal(tutorialMilestoneComplete("combat", { ...empty, enemiesDefeated: 1 }), true);
assert.equal(tutorialMilestoneComplete("welcome", empty), false);

const manifest = JSON.parse(fs.readFileSync(new URL("../public/assets/rpg/tutorial/manifest.json", import.meta.url), "utf8"));
const expectedVoiceSteps = ["welcome", "move", "mira", "inventory", "map", "gather", "combat", "complete"];
assert.deepEqual(Object.keys(manifest.files), expectedVoiceSteps);
assert.equal(manifest.enabled, false, "voiceover should stay disabled until the MP3 files are supplied");

console.log(JSON.stringify({
  milestones: expectedVoiceSteps.length,
  movementThreshold: 46,
  combatCompletionPaths: 2,
  voiceoverManifestComplete: true,
  result: "PASS",
}, null, 2));
