import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const gameData = await readFile(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const worldLayout = JSON.parse(await readFile(new URL("../src/rpg/worldLayout.json", import.meta.url), "utf8"));
const worldScene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const gameUi = await readFile(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const gameCss = await readFile(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");
const atlas = await readFile(new URL("../public/assets/rpg/portraits/npc-atlas.png", import.meta.url));

function pngDimensions(buffer) {
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

assert.deepEqual(pngDimensions(atlas), [1536, 1024], "NPC portrait atlas must remain a 4x2 grid of 384x512 frames");
assert.equal(atlas[25], 6, "NPC portrait atlas must retain an RGBA transparency channel");

const portraitBlock = gameData.slice(gameData.indexOf("export const NPC_PORTRAIT_FRAMES"), gameData.indexOf("export const BASE_ENEMIES"));
const npcIds = worldLayout.npcs.map((npc) => npc.id);
const frameEntries = [...portraitBlock.matchAll(/\b([a-z]+):\s*(\d+)/g)].map((match) => [match[1], Number(match[2])]);
const frameMap = new Map(frameEntries);

assert.deepEqual(npcIds, ["guide", "banker", "smith", "market", "plots", "marshal", "captain", "ranger"], "NPC portrait order contract changed");
assert.equal(frameMap.size, npcIds.length, "every NPC must have exactly one portrait frame");
npcIds.forEach((npcId, frame) => assert.equal(frameMap.get(npcId), frame, `${npcId} must use portrait frame ${frame}`));
assert.deepEqual([...frameMap.values()].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7], "portrait frames must be unique and complete");
assert.ok(worldScene.includes("portraitId: npc.id"), "dialogue state must carry stable NPC identity");
assert.ok(gameUi.includes("<NpcPortrait npcId={dialogue.portraitId}"), "dialogue UI must render the NPC atlas portrait");
assert.ok(gameCss.includes('/assets/rpg/portraits/npc-atlas.png'), "dialogue portrait styling must reference the NPC atlas");

console.log(JSON.stringify({
  portraits: npcIds.length,
  atlasGrid: "4x2",
  frameSize: "384x512",
  transparent: true,
  stableNpcMapping: true,
  dialogueIntegration: true,
  result: "PASS",
}, null, 2));
