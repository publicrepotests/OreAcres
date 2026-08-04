import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addProfileXp,
  baseMaxHpForHitpoints,
  defaultRpgProgress,
  maxHpForRpgProgress,
  normalizeRpgProgress,
} from "../server/src/rpgProfiles.js";

assert.equal(baseMaxHpForHitpoints(1), 30, "new characters should start with 30 base health");
assert.equal(baseMaxHpForHitpoints(5), 34, "each Hitpoints level should add one base health");
assert.equal(baseMaxHpForHitpoints(99), 128, "Hitpoints progression should remain bounded at level 99");

const levelFive = defaultRpgProgress();
levelFive.skills.hitpoints = { level: 5, xp: 672 };
assert.equal(maxHpForRpgProgress(levelFive), 34);
levelFive.equipped.armor = "sentinel-mail";
assert.equal(maxHpForRpgProgress(levelFive), 46, "armor health must stack on top of earned base health");

for (const [armorId, bonus] of Object.entries({
  "trailguard-vest": 8,
  "sentinel-mail": 12,
  "warden-mail": 20,
  "sunforged-mail": 28,
  "briarhide-cloak": 16,
  "moonweave-mantle": 26,
  "nightguard-plate": 34,
})) {
  levelFive.equipped.armor = armorId;
  assert.equal(maxHpForRpgProgress(levelFive), 34 + bonus, `${armorId} health bonus drifted`);
}

const migratedFull = normalizeRpgProgress({
  hp: 30,
  maxHp: 30,
  skills: { hitpoints: { xp: 672 } },
});
assert.equal(migratedFull.maxHp, 34);
assert.equal(migratedFull.hp, 34, "a fully healed legacy save should remain fully healed");

const migratedDamaged = normalizeRpgProgress({
  hp: 20,
  maxHp: 30,
  skills: { hitpoints: { xp: 672 } },
});
assert.equal(migratedDamaged.hp, 24, "legacy migration should preserve missing health");

const rejectedSpoof = normalizeRpgProgress({ hp: 250, maxHp: 250 });
assert.equal(rejectedSpoof.maxHp, 30);
assert.equal(rejectedSpoof.hp, 30, "the server must not trust inflated client health values");

const nearLevel = defaultRpgProgress();
nearLevel.hp = 18;
nearLevel.skills.hitpoints = { level: 1, xp: 40 };
const leveled = addProfileXp(nearLevel, "hitpoints", 2);
assert.equal(leveled.skills.hitpoints.level, 2);
assert.equal(leveled.maxHp, 31);
assert.equal(leveled.hp, 19, "level-up should grant the newly earned hitpoint immediately");

const gameData = readFileSync(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const storage = readFileSync(new URL("../src/rpg/playerStorage.ts", import.meta.url), "utf8");
const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
assert.match(gameData, /return 29 \+ Math\.max\(1, Math\.min\(99, Math\.floor\(level\)\)\)/, "client base-health formula drifted from the server");
assert.match(gameData, /skill === "hitpoints" && normalizedLevel > 1/, "Hitpoints level feedback is missing");
assert.match(storage, /const derivedMaxHp = maxHpForProgress/, "local save migration does not derive maximum health");
assert.match(scene, /const nextMaxHp = maxHpForProgress\(\{ skills, equipped: this\.progress\.equipped \}\)/, "local XP gains do not update maximum health");

console.log("RPG Hitpoints checks passed: level scaling, armor stacking, save migration, and server authority are aligned.");
