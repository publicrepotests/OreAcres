import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const gameData = await readFile(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const worldLayout = JSON.parse(await readFile(new URL("../src/rpg/worldLayout.json", import.meta.url), "utf8"));
const worldScene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const gameUi = await readFile(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const gameCss = await readFile(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");
const scene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const layeredHero = await readFile(new URL("../src/rpg/LayeredHero.ts", import.meta.url), "utf8");
const atlas = await readFile(new URL("../public/assets/rpg/portraits/npc-atlas-v2.png", import.meta.url));
const legacyAtlas = await readFile(new URL("../public/assets/rpg/portraits/npc-atlas.png", import.meta.url));

function pngDimensions(buffer) {
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

assert.deepEqual(pngDimensions(atlas), [1536, 1536], "NPC portrait atlas must remain a 4x3 grid of 384x512 frames");
assert.equal(atlas[25], 6, "NPC portrait atlas must retain an RGBA transparency channel");
assert.ok(atlas.byteLength < legacyAtlas.byteLength, "normalized NPC portrait atlas should not increase the download cost");

const portraitBlock = gameData.slice(gameData.indexOf("export const NPC_PORTRAIT_FRAMES"), gameData.indexOf("export const BASE_ENEMIES"));
const npcIds = worldLayout.npcs.map((npc) => npc.id);
const frameEntries = [...portraitBlock.matchAll(/(?:^|\n)\s*(?:"([^"]+)"|([a-z-]+)):\s*(\d+)/g)].map((match) => [match[1] ?? match[2], Number(match[3])]);
const frameMap = new Map(frameEntries);
const atlasNpcIds = ["guide", "banker", "smith", "market", "plots", "marshal", "captain", "ranger", "guildmaster", "quartermaster", "hall-banker", "scribe"];
const layeredNpcIds = ["fen-cartographer", "ember-forgekeeper", "frostkeeper", "sunscar-scholar"];

assert.deepEqual(npcIds, ["guide", "banker", "smith", "market", "plots", "marshal", "captain", "ranger", ...layeredNpcIds, "guildmaster", "quartermaster", "hall-banker", "scribe"], "NPC portrait order contract changed");
assert.equal(frameMap.size, atlasNpcIds.length, "every painted-atlas NPC must have exactly one portrait frame");
atlasNpcIds.forEach((npcId, frame) => assert.equal(frameMap.get(npcId), frame, `${npcId} must use portrait frame ${frame}`));
assert.deepEqual([...frameMap.values()].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "portrait frames must be unique and complete");
for (const npcId of layeredNpcIds) {
  assert.equal(frameMap.has(npcId), false, `${npcId} should use its animated layered portrait rather than reusing an atlas face`);
  assert.match(worldScene, new RegExp(`(?:^|\\n)\\s*["']?${npcId}["']?: \\{ appearance:`), `${npcId} is missing its layered portrait appearance`);
}
assert.ok(worldScene.includes("portraitId: npc.id"), "dialogue state must carry stable NPC identity");
assert.ok(gameUi.includes("<NpcPortrait npcId={dialogue.portraitId}"), "dialogue UI must render the NPC atlas portrait");
assert.ok(gameUi.includes("<HeroPortrait appearance={appearance} equipped={equipped} animated"), "regional NPC dialogue must support animated layered portraits");
assert.ok(gameCss.includes('/assets/rpg/portraits/npc-atlas-v2.png'), "dialogue portrait styling must reference the normalized NPC atlas");
for (const [npcId, appearance] of [["guildmaster", "alden"], ["quartermaster", "juno"], ["hall-banker", "merris"], ["scribe", "pella"]]) {
  assert.match(scene, new RegExp(`"?${npcId}"?: \{ appearance: "${appearance}"`), `${npcId} world paperdoll does not match its portrait identity`);
  assert.match(layeredHero, new RegExp(`\\b${appearance}: \\{`), `${appearance} has no dedicated modular appearance`);
}

console.log(JSON.stringify({
  paintedPortraits: atlasNpcIds.length,
  animatedLayeredPortraits: layeredNpcIds.length,
  atlasGrid: "4x3",
  frameSize: "384x512",
  transparent: true,
  stableNpcMapping: true,
  dialogueIntegration: true,
  guildPortraitWorldIdentityParity: true,
  result: "PASS",
}, null, 2));
