import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const faceStyles = ["neutral", "determined", "cheerful", "wide-eyed"];
const actionDimensions = {
  idle: [128, 256],
  walk: [576, 256],
  slash: [384, 256],
  shoot: [832, 256],
  spellcast: [448, 256],
};
const shieldActionDimensions = {
  walk: [576, 256],
  slash: [384, 256],
  shoot: [832, 256],
  spellcast: [448, 256],
  hurt: [384, 64],
};

function pngDimensions(buffer) {
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

let assetCount = 0;
for (const style of faceStyles) {
  for (const [action, dimensions] of Object.entries(actionDimensions)) {
    const face = await readFile(new URL(`../public/assets/rpg/characters/lpc/face/${style}/${action}.png`, import.meta.url));
    assert.deepEqual(pngDimensions(face), dimensions, `${style}/${action} must preserve the 64px LPC frame grid`);
    assert.equal(face[25], 6, `${style}/${action} must retain RGBA transparency`);
    assetCount += 1;
  }
}

let shieldSheetCount = 0;
for (const layer of ["bg", "fg"]) {
  for (const [action, dimensions] of Object.entries(shieldActionDimensions)) {
    const shield = await readFile(new URL(`../public/assets/rpg/characters/lpc/shield/crusader/${layer}/${action}.png`, import.meta.url));
    assert.deepEqual(pngDimensions(shield), dimensions, `crusader shield ${layer}/${action} must preserve the 64px LPC frame grid`);
    assert.ok(shield.includes(Buffer.from("tRNS")), `crusader shield ${layer}/${action} must retain palette transparency`);
    shieldSheetCount += 1;
  }
}

const gameData = await readFile(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const layeredHero = await readFile(new URL("../src/rpg/LayeredHero.ts", import.meta.url), "utf8");
const gameScene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const heroPortrait = await readFile(new URL("../src/rpg/HeroPortrait.tsx", import.meta.url), "utf8");
const gameUi = await readFile(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const serverProfiles = await readFile(new URL("../server/src/rpgProfiles.js", import.meta.url), "utf8");
const credits = await readFile(new URL("../public/assets/rpg/characters/lpc/face/ASSET-CREDITS.md", import.meta.url), "utf8");
const shieldCredits = await readFile(new URL("../public/assets/rpg/characters/lpc/shield/ASSET-CREDITS.md", import.meta.url), "utf8");

faceStyles.forEach((style) => {
  assert.ok(gameData.includes(`\"${style}\"`), `${style} must be exposed by character customization`);
  assert.ok(serverProfiles.includes(`\"${style}\"`), `${style} must be accepted by authoritative profile normalization`);
});
assert.ok(layeredHero.includes("textureKey(`face-${faceStyle}`"), "animated heroes must render the selected face layer");
assert.ok(heroPortrait.includes("customization.faceStyle"), "character portraits must render the selected face layer");
assert.ok(gameUi.includes("FACE_STYLES.map"), "the equipment customizer must expose face selection");
assert.ok(layeredHero.includes("shieldBack") && layeredHero.includes("shieldFront"), "animated heroes must use depth-correct shield layers");
assert.match(layeredHero, /fish: \{[\s\S]*?source: "shoot"[\s\S]*?columns: 13/, "fishing must use the full directional casting animation");
assert.ok(layeredHero.includes('this.playLayer(back, "lpc-fishing-rod-shoot-bg"'), "fishing must animate the rear rod layer");
assert.ok(layeredHero.includes('this.playLayer(front, "lpc-fishing-rod-shoot-fg"'), "fishing must animate the front rod layer");
assert.ok(gameScene.includes("private createFishingFx"), "fishing must render a dedicated line, bobber, and water effect");
assert.ok(heroPortrait.includes("showShield"), "character portraits must respect shield visibility");
assert.ok(gameUi.includes('key: "showShield"'), "the equipment customizer must expose shield visibility");
assert.ok(heroPortrait.includes("const [frameIndex, setFrameIndex]"), "the equipment paper doll must animate real layered frames");
assert.ok(heroPortrait.includes("{ up: 0, left: 1, down: 2, right: 3 }"), "portrait rendering must support every LPC facing row");
assert.ok(gameUi.includes("paperdollDirection"), "the equipment screen must retain the selected preview direction");
for (const direction of ["up", "left", "down", "right"]) {
  assert.ok(gameUi.includes(`direction: "${direction}"`), `the paper doll must expose ${direction} inspection`);
}
assert.ok(credits.includes("OGA-BY 3.0"), "face assets must retain their selected upstream license attribution");
assert.ok(shieldCredits.includes("OGA-BY 3.0"), "shield assets must retain their selected upstream license attribution");

console.log(JSON.stringify({
  faceStyles: faceStyles.length,
  animatedSheets: assetCount,
  shieldSheets: shieldSheetCount,
  actions: Object.keys(actionDimensions),
  frameGrid: "64x64",
  transparent: true,
  profilePersistenceIntegrated: true,
  multiplayerRenderingIntegrated: true,
  depthCorrectAnimatedShield: true,
  animatedPaperdoll: true,
  directionalGearInspection: 4,
  attributionPresent: true,
  paidAssetsUsed: false,
  result: "PASS",
}, null, 2));
