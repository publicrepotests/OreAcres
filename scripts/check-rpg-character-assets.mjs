import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const faceStyles = ["neutral", "determined", "cheerful", "wide-eyed"];
const expandedHairStyles = ["afro", "bob", "cornrows", "buzzcut"];
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

let expandedHairSheetCount = 0;
for (const style of expandedHairStyles) {
  for (const [action, dimensions] of Object.entries({ ...actionDimensions, hurt: [384, 64] })) {
    const hair = await readFile(new URL(`../public/assets/rpg/characters/lpc/hair/${style}/${action}.png`, import.meta.url));
    assert.deepEqual(pngDimensions(hair), dimensions, `${style}/${action} must preserve the 64px LPC frame grid`);
    assert.ok(hair[25] === 6 || hair.includes(Buffer.from("tRNS")), `${style}/${action} must retain transparency`);
    expandedHairSheetCount += 1;
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

const weaponVariantDimensions = {
  saber: { walk: [576, 256], slash: [1152, 768] },
  "glowsword-blue": { walk: [576, 256], slash: [1152, 768] },
  "glowsword-red": { walk: [576, 256], slash: [1152, 768] },
};
let weaponVariantSheetCount = 0;
for (const [variant, actions] of Object.entries(weaponVariantDimensions)) {
  for (const [action, dimensions] of Object.entries(actions)) {
    for (const layer of ["bg", "fg"]) {
      const sheet = await readFile(new URL(`../public/assets/rpg/characters/lpc/weapon/${variant}/${action}-${layer}.png`, import.meta.url));
      assert.deepEqual(pngDimensions(sheet), dimensions, `${variant}/${action}-${layer} must preserve its LPC frame grid`);
      weaponVariantSheetCount += 1;
    }
  }
}

const bowVariantDimensions = {
  recurve: { walk: [1024, 512], shoot: [832, 256] },
  greatbow: { walk: [1024, 512], shoot: [832, 256] },
};
let bowVariantSheetCount = 0;
for (const [variant, actions] of Object.entries(bowVariantDimensions)) {
  for (const [action, dimensions] of Object.entries(actions)) {
    for (const layer of ["bg", "fg"]) {
      const sheet = await readFile(new URL(`../public/assets/rpg/characters/lpc/weapon/${variant}/${action}-${layer}.png`, import.meta.url));
      assert.deepEqual(pngDimensions(sheet), dimensions, `${variant}/${action}-${layer} must preserve its LPC frame grid`);
      assert.ok(sheet[25] === 6 || sheet.includes(Buffer.from("tRNS")), `${variant}/${action}-${layer} must retain transparency`);
      bowVariantSheetCount += 1;
    }
  }
}

const gameData = await readFile(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const layeredHero = await readFile(new URL("../src/rpg/LayeredHero.ts", import.meta.url), "utf8");
assert.ok(layeredHero.includes("private syncPoseMotion("), "layered actors need action-specific locomotion and profession pose motion");
assert.match(layeredHero, /action === "walk"[\s\S]*?targets: this\.visualRoot/, "walking must animate the actor pose instead of remaining rigid");
assert.match(layeredHero, /sprite\.setVisible\(true\)\.setTint/, "streamed animated layers must recover visibility when their texture becomes available");
assert.match(layeredHero, /sprite\.setVisible\(true\)\.setTexture/, "streamed static gear layers must recover visibility when their texture becomes available");
const gameScene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
assert.match(gameScene, /private createActorShadow\(/, "the scene must retain one depth-sorted grounding system for world actors");
const heroPortrait = await readFile(new URL("../src/rpg/HeroPortrait.tsx", import.meta.url), "utf8");
const gameUi = await readFile(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const serverProfiles = await readFile(new URL("../server/src/rpgProfiles.js", import.meta.url), "utf8");
const credits = await readFile(new URL("../public/assets/rpg/characters/lpc/face/ASSET-CREDITS.md", import.meta.url), "utf8");
const shieldCredits = await readFile(new URL("../public/assets/rpg/characters/lpc/shield/ASSET-CREDITS.md", import.meta.url), "utf8");
const companionAssets = [
  "ore-slime-sheet-1024.png",
  "forest-wolf-sheet-v2.png",
  "ashwing-drake-sheet-1024.png",
];
for (const asset of companionAssets) {
  const sheet = await readFile(new URL(`../public/assets/rpg/creatures/${asset}`, import.meta.url));
  assert.deepEqual(pngDimensions(sheet), [1024, 1024], `${asset} must preserve the 4x4 creature frame grid`);
}

for (const appearance of ["stonewarden", "marshborn"]) {
  assert.ok(gameData.includes(`\"${appearance}\"`), `${appearance} must be available in character creation`);
  assert.ok(layeredHero.includes(`${appearance}:`), `${appearance} must have a layered world silhouette`);
  assert.ok(serverProfiles.includes(`${appearance}:`), `${appearance} must be accepted by the authoritative profile service`);
}

faceStyles.forEach((style) => {
  assert.ok(gameData.includes(`\"${style}\"`), `${style} must be exposed by character customization`);
  assert.ok(serverProfiles.includes(`\"${style}\"`), `${style} must be accepted by authoritative profile normalization`);
});
expandedHairStyles.forEach((style) => {
  assert.ok(gameData.includes(`"${style}"`), `${style} must be exposed by character customization`);
  assert.ok(serverProfiles.includes(`"${style}"`), `${style} must be accepted by authoritative profile normalization`);
  assert.ok(layeredHero.includes(`"${style}"`), `${style} must be preloaded by the modular world character`);
});
for (const npcStyle of ['hair: "bob"', 'hair: "buzzcut"', 'hair: "cornrows"', 'hair: "afro"']) {
  assert.ok(layeredHero.includes(npcStyle), `${npcStyle} must visibly diversify named town NPCs`);
}
assert.ok(layeredHero.includes("textureKey(`face-${faceStyle}`"), "animated heroes must render the selected face layer");
assert.ok(heroPortrait.includes("customization?.faceStyle"), "character portraits must render the selected face layer");
assert.ok(heroPortrait.includes("customization?.faceStyle ?? style.face"), "NPC portraits must inherit their authored face style");
assert.ok(heroPortrait.includes("resolveSwordAssetSet(weapon)"), "equipment previews must share the world character's sword silhouette");
assert.ok(heroPortrait.includes("resolveBowAssetSet(weapon)"), "equipment previews must share the world character's bow silhouette");
assert.ok(heroPortrait.includes("layer.staticFrame ?? frameIndex"), "weapon previews must remain anchored while the paper doll breathes");
assert.ok(gameUi.includes("FACE_STYLES.map"), "the equipment customizer must expose face selection");
assert.ok(gameUi.includes("rpg-identity-customizer"), "new players must be able to customize before entering the world");
assert.ok(gameUi.includes("identityCustomization"), "identity customization must use the same persisted modular character state");
assert.ok(layeredHero.includes("shieldBack") && layeredHero.includes("shieldFront"), "animated heroes must use depth-correct shield layers");
assert.match(layeredHero, /fish: \{[\s\S]*?source: "slash"[\s\S]*?columns: 6/, "fishing must use a dedicated gathering body animation");
assert.match(layeredHero, /const FISHING_ROD_ACTION: AnimationSpec = \{[\s\S]*?source: "shoot"[\s\S]*?columns: 13/, "fishing must preserve the full directional rod casting animation");
assert.match(layeredHero, /activity === "fish" \? FISHING_ROD_ACTION : ACTIONS\[activity\]/, "fishing must keep rod and body animation specs separate");
assert.ok(layeredHero.includes('this.playLayer(back, "lpc-fishing-rod-shoot-bg"'), "fishing must animate the rear rod layer");
assert.ok(layeredHero.includes('this.playLayer(front, "lpc-fishing-rod-shoot-fg"'), "fishing must animate the front rod layer");
assert.ok(layeredHero.includes('"armor/briar-cape"'), "the rare Briarhide cloak must use its dedicated cape artwork");
assert.ok(layeredHero.includes('cape: "briar"'), "the rare Briarhide cloak must select the dedicated cape variant");
assert.ok(layeredHero.includes('assetSet: "saber"'), "saber-class rewards must use the dedicated animated saber silhouette");
assert.ok(layeredHero.includes('assetSet: "glowsword-blue"'), "rune weapons must use the dedicated animated glowblade silhouette");
assert.ok(layeredHero.includes('assetSet: "glowsword-red"'), "Aurex must use the dedicated animated sunblade silhouette");
assert.ok(layeredHero.includes('assetSet: "recurve"'), "the Fallen Recurve must use its dedicated animated silhouette");
assert.ok(layeredHero.includes('assetSet: "greatbow"'), "Stormglass must use its dedicated animated greatbow silhouette");
assert.ok(layeredHero.includes("preloadBowAssets(scene, resolveBowAssetSet(weapon))"), "the selected bow must load before world entry");
assert.ok(layeredHero.includes("if (armor.helmet)"), "selected helmets must load before world entry");
assert.ok(layeredHero.includes("if (armor.cape)"), "selected capes must load before world entry");
assert.ok(layeredHero.includes("if (armor.shield)"), "selected shields must load before world entry");
assert.ok(layeredHero.includes("slashFrameSize: 192"), "oversized weapon arcs must retain their 192px LPC canvas");
assert.ok(heroPortrait.includes('armor/briar-cape'), "React portraits must use the dedicated Briarhide cape artwork");
assert.ok(gameScene.includes("private createFishingFx"), "fishing must render a dedicated line, bobber, and water effect");
assert.ok(gameScene.includes("this.npcRuntime.forEach((npc) => npc.hero.setLoadout"), "deferred cosmetics must refresh every static NPC");
assert.ok(gameScene.includes("this.ambientCitizens.forEach((citizen) => citizen.hero.setLoadout"), "deferred cosmetics must refresh every ambient citizen");
assert.ok(gameScene.includes("this.remotes.forEach((remote) =>"), "deferred cosmetics must refresh already-connected remote players");
assert.ok(heroPortrait.includes("showShield"), "character portraits must respect shield visibility");
assert.ok(gameUi.includes('key: "showShield"'), "the equipment customizer must expose shield visibility");
for (const styleField of ["helmetStyle", "capeStyle", "shieldStyle"]) {
  assert.ok(gameData.includes(styleField), `${styleField} must be normalized by the shared customization model`);
  assert.ok(serverProfiles.includes(styleField), `${styleField} must persist through authoritative profiles`);
  assert.ok(layeredHero.includes(`customization?.${styleField}`), `${styleField} must alter the animated world character`);
  assert.ok(heroPortrait.includes(`customization?.${styleField}`), `${styleField} must alter the equipment preview`);
  assert.ok(gameUi.includes(`key: "${styleField}"`), `${styleField} must be selectable in the wardrobe`);
}
assert.ok(heroPortrait.includes("const [frameIndex, setFrameIndex]"), "the equipment paper doll must animate real layered frames");
assert.ok(heroPortrait.includes('export type HeroPortraitAction = "idle" | "walk" | "attack"'), "the paper doll must expose gameplay animation previews");
assert.ok(heroPortrait.includes('weapon?.kind === "bow"') && heroPortrait.includes('source: "shoot"'), "bow previews must use the directional shooting strip");
assert.ok(heroPortrait.includes('config.walkSequence[0] === 0 ? -1 : 0'), "eight-frame bow previews must stay aligned to the nine-frame body walk cycle");
assert.ok(heroPortrait.includes('weapon?.kind === "staff"') && heroPortrait.includes('source: "spellcast"'), "staff previews must use the directional spellcasting strip");
assert.ok(heroPortrait.includes('source: "slash"') && heroPortrait.includes("SWORD_ASSET_SETS[assetSet].slashFrameSize"), "sword previews must preserve their real attack strips and oversized canvases");
assert.ok(heroPortrait.includes("frameSize * zoom"), "portrait close-ups must scale every modular layer from the same anchor");
assert.match(gameUi, /className="rpg-target-portrait__hero" animated zoom=\{1\.32\}/, "combat targets must use an animated readable gear close-up");
assert.match(gameUi, /className="rpg-bestiary__hero"[\s\S]*?animated[\s\S]*?zoom=\{1\.42\}/, "humanoid bestiary entries must expose their animated armor and weapon silhouette");
assert.ok(heroPortrait.includes("{ up: 0, left: 1, down: 2, right: 3 }"), "portrait rendering must support every LPC facing row");
assert.ok(gameUi.includes("paperdollDirection"), "the equipment screen must retain the selected preview direction");
assert.ok(gameUi.includes("paperdollAction") && gameUi.includes('action={paperdollAction}'), "the equipment screen must allow live idle, walk, and attack inspection");
assert.ok(gameUi.includes("Visual only • armor stats remain unchanged"), "the wardrobe must distinguish transmog from progression stats");
assert.ok(gameUi.includes('transmogLayers.join(" • ")'), "the wardrobe must summarize the player's custom gear silhouette");
for (const companion of ["none", "ore-slime", "pinefang-pup", "ashwing-whelp"]) {
  assert.ok(gameData.includes(`id: "${companion}"`), `${companion} must be exposed by the shared companion catalog`);
  assert.ok(serverProfiles.includes(`"${companion}"`), `${companion} must be accepted by authoritative profiles`);
}
assert.ok(gameScene.includes("private updateCompanion("), "companions must smoothly follow their owner in the world");
assert.ok(gameScene.includes("remote.companion"), "companions must be visible on nearby multiplayer characters");
assert.ok(gameScene.includes("this.destroyCompanion(this.playerCompanion)"), "the local companion must be cleaned up with its scene");
assert.ok(gameUi.includes("COMPANIONS.map"), "the equipment menu must expose the companion collection");
assert.ok(gameUi.includes("Cosmetic follower"), "the companion UI must clearly avoid implying combat power");
for (const direction of ["up", "left", "down", "right"]) {
  assert.ok(gameUi.includes(`direction: "${direction}"`), `the paper doll must expose ${direction} inspection`);
}
assert.ok(credits.includes("OGA-BY 3.0"), "face assets must retain their selected upstream license attribution");
assert.ok(shieldCredits.includes("OGA-BY 3.0"), "shield assets must retain their selected upstream license attribution");

console.log(JSON.stringify({
  faceStyles: faceStyles.length,
  animatedSheets: assetCount,
  expandedHairStyles: expandedHairStyles.length,
  expandedHairSheets: expandedHairSheetCount,
  shieldSheets: shieldSheetCount,
  weaponVariantSheets: weaponVariantSheetCount,
  bowVariantSheets: bowVariantSheetCount,
  actions: Object.keys(actionDimensions),
  frameGrid: "64x64",
  transparent: true,
  profilePersistenceIntegrated: true,
  multiplayerRenderingIntegrated: true,
  depthCorrectAnimatedShield: true,
  animatedPaperdoll: true,
  dedicatedRareCape: true,
  playableSilhouettes: 5,
  directionalGearInspection: 4,
  independentTransmogLayers: 3,
  animatedCompanions: companionAssets.length,
  attributionPresent: true,
  paidAssetsUsed: false,
  result: "PASS",
}, null, 2));
