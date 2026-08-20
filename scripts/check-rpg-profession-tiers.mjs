import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const gameData = await readFile(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const server = await readFile(new URL("../server/src/index.js", import.meta.url), "utf8");
const scene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");
const clientLayout = JSON.parse(await readFile(new URL("../src/rpg/worldLayout.json", import.meta.url), "utf8"));
const serverLayout = JSON.parse(await readFile(new URL("../server/src/worldLayout.json", import.meta.url), "utf8"));

assert.deepEqual(clientLayout.resources, serverLayout.resources, "client and server resource layouts drifted");
const resources = new Map(clientLayout.resources.map((resource) => [resource.id, resource]));
const expectedRewards = {
  "moonfen-fish-1": "moonfin",
  "moonfen-ore-1": "gloomstone-ore",
  "emberfall-ore-1": "emberstone-ore",
  "emberfall-ore-3": "star-iron",
  "emberfall-fish-1": "ember-koi",
  "frostmere-ore-1": "frostglass-ore",
  "frostmere-fish-1": "frosttrout",
  "sunscar-ore-1": "suncrystal-ore",
  "sunscar-fish-1": "sunscale-fish",
};
for (const [resourceId, itemId] of Object.entries(expectedRewards)) {
  assert.equal(resources.get(resourceId)?.itemId, itemId, `${resourceId} still awards a placeholder material`);
  assert.match(server, new RegExp(`"${resourceId}":[^\n]+itemId: "${itemId}"`), `${resourceId} is not authoritative on the server`);
}

for (const [itemId, healing] of [["moonfin", 18], ["ember-koi", 24], ["frosttrout", 32], ["sunscale-fish", 40]]) {
  assert.match(gameData, new RegExp(`id: "${itemId}"[^\n]+healing: ${healing}`), `${itemId} healing is missing from the catalog`);
  assert.match(server, new RegExp(`"?${itemId}"?: \{ category: "consumable"[^\n]+healing: ${healing}`), `${itemId} healing drifted on the server`);
}

const regionalTints = {
  moonfin: "0x73d8ca",
  "ember-koi": "0xff8750",
  frosttrout: "0x9feaff",
  "sunscale-fish": "0xffd568",
  "gloomstone-ore": "0x8f79c9",
  "emberstone-ore": "0xff7345",
  "star-iron": "0xc8d5e3",
  "frostglass-ore": "0x8be8ff",
  "suncrystal-ore": "0xffc85a",
};
for (const [itemId, tint] of Object.entries(regionalTints)) {
  assert.match(gameData, new RegExp(`id: "${itemId}"[^\n]+tint: ${tint}`), `${itemId} is missing its regional visual identity`);
}
assert.match(scene, /function resourceVisualColor\(itemId: string\)/, "the world does not resolve material colors from the item catalog");
assert.match(scene, /color: resourceVisualColor\(resource\.itemId\)/, "fishing ripples do not reflect their regional catch");
assert.match(scene, /if \(visualColor !== 0xffffff\) sprite\.setTint\(visualColor\)/, "resource nodes do not apply their catalog tint");
assert.ok((scene.match(/resourceVisualColor\(definition\.itemId\)/g) ?? []).length >= 2, "resource respawns do not preserve their regional tint");
assert.match(shell, /rpg-item-icon--tinted/, "tinted materials are not identified in the inventory UI");
assert.match(styles, /\.rpg-item-icon--tinted::after/, "the inventory material accent has no visual treatment");

const recipes = [
  ["forge-frostguard-aegis", "frostguard-aegis"],
  ["craft-aurora-longbow", "aurora-longbow"],
  ["bind-eclipse-staff", "eclipse-staff"],
  ["forge-sunscar-reaver", "sunscar-reaver"],
];
for (const [recipeId, outputId] of recipes) {
  assert.match(gameData, new RegExp(`id: "${recipeId}"[\\s\\S]*?output: \\{ itemId: "${outputId}"`), `${recipeId} is missing from the client workshop`);
  assert.match(server, new RegExp(`"${recipeId}":[^\n]+output: \\{ itemId: "${outputId}"`), `${recipeId} is missing from server authority`);
}

console.log(JSON.stringify({
  regionalResourceRewards: Object.keys(expectedRewards).length,
  regionalFishTiers: 4,
  regionalVisualIdentities: Object.keys(regionalTints).length,
  endgameRecipes: recipes.length,
  clientServerLayoutParity: true,
  result: "PASS",
}, null, 2));
