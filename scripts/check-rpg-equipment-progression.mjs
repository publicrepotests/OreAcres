import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { defaultRpgProgress, maxHpForRpgProgress } from "../server/src/rpgProfiles.js";

const gameData = readFileSync(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");
const server = readFileSync(new URL("../server/src/index.js", import.meta.url), "utf8");

const armorEffects = {
  "trailguard-vest": ["healingMultiplier", "1.1"],
  "sentinel-mail": ["damageReduction", "0.04"],
  "warden-mail": ["damageReduction", "0.06"],
  "sunforged-mail": ["damageReduction", "0.08"],
  "briarhide-cloak": ["healingMultiplier", "1.24"],
  "moonweave-mantle": ["healingMultiplier", "1.18"],
  "nightguard-plate": ["damageReduction", "0.1"],
  "frostguard-aegis": ["damageReduction", "0.12"],
};

for (const [itemId, [field, value]] of Object.entries(armorEffects)) {
  const escapedValue = value.replace(".", "\\.");
  assert.match(
    gameData,
    new RegExp(`id: "${itemId}"[^\\n]*armorTrait: \\{[^\\n]*${field}: ${escapedValue}`),
    `${itemId} is missing its client armor trait`,
  );
  assert.match(
    server,
    new RegExp(`"${itemId}": \\{[^\\n]*armorTrait: \\{[^\\n]*${field}: ${escapedValue}`),
    `${itemId} is missing its authoritative armor trait`,
  );
}

const frostguard = defaultRpgProgress();
frostguard.equipped.armor = "frostguard-aegis";
assert.equal(maxHpForRpgProgress(frostguard), 72, "Frostguard Aegis must grant its advertised +42 maximum hitpoints");

assert.match(scene, /armorHealingAmount\(this\.progress\.equipped\.armor/, "local recovery does not apply armor healing traits");
assert.match(scene, /armorDamageReduction\(this\.progress\.equipped\.armor\)/, "local combat does not apply armor wards");
assert.match(server, /armorReduction: Math\.max\(0, Math\.min\(0\.2, RPG_ITEM_RULES\[armorId\]\?\.armorTrait\?\.damageReduction/, "server defense does not derive armor wards from authoritative item rules");
assert.match(server, /Math\.min\(0\.45, totalReduction\)/, "combined mitigation is missing its balance cap");
assert.match(server, /item\.healing \* Math\.max\(1, armor\?\.armorTrait\?\.healingMultiplier/, "server consumables do not apply armor recovery traits");
assert.match(server, /progress\.maxHp \* 0\.24[\s\S]*armor\?\.armorTrait\?\.healingMultiplier/, "server Second Wind does not apply armor recovery traits");

assert.match(shell, /className="rpg-armor-trait-card"/, "the equipment panel does not explain the equipped armor passive");
assert.match(shell, /className="rpg-item-compare__trait"/, "item comparisons do not explain replacement armor passives");
assert.match(shell, /swapsArmorPassive[\s\S]*passive swap/, "armor passive swaps are incorrectly presented as simple stat downgrades");
assert.match(shell, /<span>Armor ward<\/span>/, "equipment stats omit armor ward strength");
assert.match(shell, /<span>Healing received<\/span>/, "equipment stats omit recovery strength");
assert.match(styles, /\.rpg-armor-trait-card\s*\{/, "armor passive cards have no visual treatment");

console.log("RPG equipment progression checks passed: armor traits, recovery, mitigation, HP, authority, and UI are aligned.");
