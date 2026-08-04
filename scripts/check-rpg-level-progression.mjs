import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gameData = readFileSync(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");

assert.match(gameData, /export function skillUnlocksAtLevel\(skill: SkillId, level: number\)/, "shared level unlock catalog is missing");
assert.match(gameData, /export function skillUnlocksBetween\(skill: SkillId, fromLevelExclusive: number, toLevelInclusive: number\)/, "multi-level unlock aggregation is missing");
assert.match(gameData, /export function nextSkillUnlock\(skill: SkillId, currentLevel: number\)/, "next unlock lookup is missing");
assert.match(gameData, /export function xpForLevel\(level: number\)/, "level XP threshold helper is missing");
assert.match(gameData, /id: "iron-sword"[\s\S]*?requiredSkill: "attack", requiredLevel: 5/, "attack level 5 gear milestone changed unexpectedly");
assert.match(gameData, /id: "iron-pick"[\s\S]*?requiredSkill: "mining", requiredLevel: 5/, "mining level 5 tool milestone changed unexpectedly");
assert.match(gameData, /id: "bloodletter"[\s\S]*?requiredLevel: 5/, "attack level 5 skill-tree milestone changed unexpectedly");
assert.match(gameData, /id: "craft-ember-staff"[\s\S]*?profession: "crafting"[\s\S]*?requiredLevel: 4/, "crafting level 4 recipe milestone changed unexpectedly");
assert.match(gameData, /skill === "defense" && normalizedLevel > 1 && \(normalizedLevel - 1\) % 8 === 0/, "defense mitigation milestone is not represented in progression feedback");

const announceCalls = scene.match(/this\.announceLevelUp\(/g) ?? [];
assert.equal(announceCalls.length, 2, "local and authoritative level-up paths must both use announceLevelUp");
assert.match(scene, /const unlocks = skillUnlocksBetween\(skill, previousLevel, level\)/, "level-up presenter does not aggregate crossed unlocks");
assert.match(scene, /this\.callbacks\.onLevelUp\(\{ skill, skillName, level, unlocks \}\)/, "scene does not emit structured level-up details");

assert.match(shell, /onLevelUp: setLevelCelebration/, "React HUD is not connected to scene level-up events");
assert.match(shell, /levelCelebration && !questCelebration/, "level and quest celebrations may overlap");
assert.match(shell, /levelCelebration\.unlocks\.slice\(0, 4\)/, "unlock celebration lacks bounded presentation");
assert.match(shell, /const nextUnlock = nextSkillUnlock\(skill\.id, value\.level\)/, "Skills panel does not expose the next authored milestone");
assert.match(shell, /XP remaining/, "Skills panel does not explain progress toward its next unlock");
assert.match(styles, /\.rpg-level-celebration\s*\{/, "level-up celebration styling is missing");
assert.match(styles, /\.rpg-skill-grid \.rpg-skill-next\s*\{/, "next skill milestone styling is missing");
assert.match(styles, /\.rpg-skills-panel\s*\{[^}]*grid-auto-rows: max-content/, "Skills panel may collapse its talent tree into the skill list");
assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.rpg-talent-tree__branches\s*\{[\s\S]*?grid-auto-flow: column;[\s\S]*?scroll-snap-type: x mandatory;/, "mobile talent branches are not presented as a horizontal carousel");
assert.match(styles, /prefers-reduced-motion:[\s\S]*?\.rpg-level-celebration/, "level-up presentation does not honor reduced motion");

console.log("RPG level progression checks passed: shared milestones, dual authority paths, and non-overlapping HUD feedback are wired.");
