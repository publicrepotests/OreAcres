import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const clientRules = JSON.parse(await readFile(new URL("../src/rpg/lootRules.json", import.meta.url), "utf8"));
const serverRules = JSON.parse(await readFile(new URL("../server/src/lootRules.json", import.meta.url), "utf8"));
const worldLayout = JSON.parse(await readFile(new URL("../src/rpg/worldLayout.json", import.meta.url), "utf8"));
const gameData = await readFile(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const layeredHero = await readFile(new URL("../src/rpg/LayeredHero.ts", import.meta.url), "utf8");
const heroPortrait = await readFile(new URL("../src/rpg/HeroPortrait.tsx", import.meta.url), "utf8");
const worldScene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const serverIndex = await readFile(new URL("../server/src/index.js", import.meta.url), "utf8");
assert.deepEqual(serverRules, clientRules, "client and server loot rules must remain identical");

const itemBlock = gameData.slice(gameData.indexOf("export const ITEMS"), gameData.indexOf("export const RECIPES"));
const itemIds = new Set([...itemBlock.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]));
const enemyIds = new Set(worldLayout.enemies.map((enemy) => enemy.id));

assert.deepEqual(new Set(Object.keys(clientRules)), enemyIds, "every enemy needs exactly one loot table");
for (const [enemyId, table] of Object.entries(clientRules)) {
  assert.ok(Array.isArray(table) && table.length > 0, `${enemyId} needs at least one possible drop`);
  assert.equal(new Set(table.map((entry) => entry.itemId)).size, table.length, `${enemyId} contains a duplicate drop`);
  const totalChance = table.reduce((sum, entry) => sum + entry.chance, 0);
  assert.ok(totalChance > 0 && totalChance <= 1, `${enemyId} has an invalid cumulative chance: ${totalChance}`);
  for (const entry of table) {
    assert.ok(itemIds.has(entry.itemId), `${enemyId} references missing item ${entry.itemId}`);
    assert.ok(entry.chance > 0 && entry.chance <= 1, `${enemyId}/${entry.itemId} has an invalid chance`);
  }
}

const collectibleIds = [
  "rat-tail",
  "goblin-insignia",
  "pinefang",
  "crystal-residue",
  "briar-hide",
  "mire-essence",
  "orc-totem",
  "marshscale",
  "sunbone-fragment",
  "witch-thread",
  "auric-core",
];
collectibleIds.forEach((itemId) => assert.ok(itemIds.has(itemId), `missing collectible ${itemId}`));
const serverItemBlock = serverIndex.slice(serverIndex.indexOf("const RPG_ITEM_RULES"), serverIndex.indexOf("const RPG_RECIPES"));
const droppedEquipment = ["briarhide-cloak", "auric-cleaver", "fallen-recurve", "bonecaller-focus"];
const weaponVisualBlock = layeredHero.slice(layeredHero.indexOf("export const WEAPON_VISUALS"), layeredHero.indexOf("export const ARMOR_VISUALS"));
const armorVisualBlock = layeredHero.slice(layeredHero.indexOf("export const ARMOR_VISUALS"), layeredHero.indexOf("export function resolveWeaponVisual"));
const clientWeaponAbilityBlock = gameData.slice(gameData.indexOf("export const WEAPON_ABILITIES"), gameData.indexOf("export function weaponAbility"));
const serverWeaponAbilityBlock = serverIndex.slice(serverIndex.indexOf("const RPG_WEAPON_ABILITIES"), serverIndex.indexOf("const RPG_SKILL_TREE"));
const equippableWeaponIds = [...itemBlock.matchAll(/\{ id: "([^"]+)"[^\n]+slot: "weapon"/g)].map((match) => match[1]);
const equippableArmorIds = [...itemBlock.matchAll(/\{ id: "([^"]+)"[^\n]+slot: "armor"/g)].map((match) => match[1]);
const hasVisualMapping = (block, itemId) => new RegExp(`(?:"${itemId}"|\\b${itemId}\\b)\\s*:`).test(block);
const abilityIdFor = (block, itemId) => new RegExp(`(?:"${itemId}"|\\b${itemId}\\b)\\s*:\\s*\\{\\s*id:\\s*"([^"]+)"`).exec(block)?.[1] ?? "";
equippableWeaponIds.forEach((itemId) => assert.ok(hasVisualMapping(weaponVisualBlock, itemId), `${itemId} is missing an explicit animated weapon visual`));
equippableWeaponIds.forEach((itemId) => {
  const clientAbilityId = abilityIdFor(clientWeaponAbilityBlock, itemId);
  const serverAbilityId = abilityIdFor(serverWeaponAbilityBlock, itemId);
  assert.ok(clientAbilityId, `${itemId} is missing an explicit client signature ability`);
  assert.ok(serverAbilityId, `${itemId} is missing an explicit authoritative server signature ability`);
  assert.equal(serverAbilityId, clientAbilityId, `${itemId} has mismatched client/server signature abilities`);
});
equippableArmorIds.forEach((itemId) => assert.ok(hasVisualMapping(armorVisualBlock, itemId), `${itemId} is missing an explicit animated armor visual`));
droppedEquipment.forEach((itemId) => {
  assert.ok(serverItemBlock.includes(`"${itemId}"`), `server is missing equipment authority for ${itemId}`);
  const expectedBlock = itemId === "briarhide-cloak" ? armorVisualBlock : weaponVisualBlock;
  assert.ok(expectedBlock.includes(`"${itemId}"`), `${itemId} is missing an explicit animated equipment visual`);
});
assert.ok(heroPortrait.includes("resolveWeaponVisual(equipped.weapon)"), "portrait must share live weapon visual rules");
assert.ok(heroPortrait.includes("resolveArmorVisual(equipped.armor)"), "portrait must share live armor visual rules");

function pngDimensions(buffer) {
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

const equipmentAtlas = await readFile(new URL("../public/assets/rpg/items/equipment-atlas.png", import.meta.url));
const adventureAtlas = await readFile(new URL("../public/assets/rpg/items/adventure-atlas.png", import.meta.url));
const materialAtlas = await readFile(new URL("../public/assets/rpg/items/material-atlas.png", import.meta.url));
const trophyAtlas = await readFile(new URL("../public/assets/rpg/items/trophy-atlas.png", import.meta.url));
assert.deepEqual(pngDimensions(equipmentAtlas), [1536, 1024], "equipment atlas must remain a 4x2 grid of 384x512 frames");
assert.deepEqual(pngDimensions(adventureAtlas), [1536, 1024], "adventure atlas must remain a 4x2 grid of 384x512 frames");
assert.deepEqual(pngDimensions(materialAtlas), [1536, 1024], "material atlas must remain a 2x2 grid of 768x512 frames");
assert.deepEqual(pngDimensions(trophyAtlas), [1448, 1086], "trophy atlas must remain a 4x3 grid of 362x362 frames");
collectibleIds.forEach((itemId, artIndex) => {
  assert.ok(
    new RegExp(`id: "${itemId}"[^\\n]+artIndex: ${artIndex}, artAtlas: "trophy"`).test(itemBlock),
    `${itemId} must map to trophy atlas frame ${artIndex}`,
  );
});
assert.ok(worldScene.includes("TROPHY_ITEM_ATLAS_KEY"), "world loot must preload the trophy atlas");
assert.ok(worldScene.includes("this.showWorldLootItem(item"), "combat rewards must render the dropped item in the world");
assert.ok(worldScene.includes("private showWorldLootItem"), "world loot animation implementation is missing");

console.log(JSON.stringify({
  enemiesWithLoot: Object.keys(clientRules).length,
  possibleDrops: Object.values(clientRules).reduce((sum, table) => sum + table.length, 0),
  collectibles: collectibleIds.length,
  droppedEquipment: droppedEquipment.length,
  equippableWeaponVisuals: equippableWeaponIds.length,
  equippableWeaponAbilities: equippableWeaponIds.length,
  equippableArmorVisuals: equippableArmorIds.length,
  droppedEquipmentVisuals: true,
  worldDropAtlasAnimation: true,
  clientServerParity: true,
  result: "PASS",
}, null, 2));
