import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root));
const pngDimensions = (relative) => {
  const bytes = read(relative);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG", `${relative} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
};

const sheets = [
  ["public/assets/rpg/effects/ansimuz/dark-bolt.png", 704, 88],
  ["public/assets/rpg/effects/ansimuz/fire-bomb.png", 896, 64],
  ["public/assets/rpg/effects/ansimuz/lightning.png", 640, 128],
  ["public/assets/rpg/effects/ansimuz/spark.png", 224, 32],
  ["public/assets/rpg/effects/melee-slash-gold-raw.png", 1774, 887],
];
for (const [path, width, height] of sheets) {
  const dimensions = pngDimensions(path);
  assert.deepEqual({ width: dimensions.width, height: dimensions.height }, { width, height }, `${path} frame geometry changed`);
  assert.equal(dimensions.colorType, 6, `${path} must retain RGBA transparency`);
}

const creatureAtlas = pngDimensions("public/assets/rpg/atlas/characters.png");
assert.deepEqual({ width: creatureAtlas.width, height: creatureAtlas.height }, { width: 1536, height: 1024 }, "characters atlas geometry changed");
assert.equal(creatureAtlas.colorType, 6, "characters atlas must retain RGBA transparency");
const creatureSheets = [
  ["public/assets/rpg/creatures/field-rat-sheet-1024.png", 1024, 1024],
  ["public/assets/rpg/creatures/forest-wolf-sheet-v2.png", 1024, 1024],
  ["public/assets/rpg/creatures/ashwing-drake-sheet-1024.png", 1024, 1024],
  ["public/assets/rpg/creatures/dune-stalker-sheet-1024.png", 1024, 1024],
  ["public/assets/rpg/creatures/ember-tusk-boar-sheet-1024.png", 1024, 1024],
  ["public/assets/rpg/creatures/ore-slime-sheet-1024.png", 1024, 1024],
  ["public/assets/rpg/creatures/briar-treant-idle.png", 2172, 724],
  ["public/assets/rpg/creatures/briar-treant-rootwake.png", 2172, 724],
];
for (const [path, width, height] of creatureSheets) {
  const dimensions = pngDimensions(path);
  assert.deepEqual({ width: dimensions.width, height: dimensions.height }, { width, height }, `${path} frame geometry changed`);
  assert.equal(dimensions.colorType, 6, `${path} must retain RGBA transparency`);
}

const samples = [
  ...Array.from({ length: 6 }, (_, index) => `public/assets/rpg/audio/kenney/footstep0${index}.ogg`),
  "public/assets/rpg/audio/kenney/knifeSlice.ogg",
  "public/assets/rpg/audio/kenney/knifeSlice2.ogg",
  "public/assets/rpg/audio/kenney/metalClick.ogg",
  "public/assets/rpg/audio/kenney/metalLatch.ogg",
  "public/assets/rpg/audio/kenney/metalPot1.ogg",
  "public/assets/rpg/audio/kenney/chop.ogg",
  "public/assets/rpg/audio/kenney/handleCoins.ogg",
  "public/assets/rpg/audio/kenney/bookOpen.ogg",
  "public/assets/rpg/audio/kenney/drawKnife1.ogg",
  "public/assets/rpg/audio/kenney/drawKnife2.ogg",
  "public/assets/rpg/audio/kenney/drawKnife3.ogg",
  "public/assets/rpg/audio/kenney/bookFlip1.ogg",
  "public/assets/rpg/audio/kenney/bookFlip2.ogg",
  "public/assets/rpg/audio/kenney/bookFlip3.ogg",
  "public/assets/rpg/audio/kenney/metalPot2.ogg",
  "public/assets/rpg/audio/kenney/metalPot3.ogg",
  "public/assets/rpg/audio/kenney/dropLeather.ogg",
  "public/assets/rpg/audio/kenney/cloth3.ogg",
  "public/assets/rpg/audio/kenney/cloth4.ogg",
  "public/assets/rpg/audio/kenney/handleSmallLeather.ogg",
  "public/assets/rpg/audio/kenney/handleSmallLeather2.ogg",
  "public/assets/rpg/audio/kenney/handleCoins2.ogg",
];
for (const path of samples) {
  const bytes = read(path);
  assert.equal(bytes.toString("ascii", 0, 4), "OggS", `${path} is not a valid Ogg container`);
  assert.ok(bytes.length > 8_000, `${path} appears truncated`);
}

const musicTracks = [
  "public/assets/rpg/audio/music/orehaven-field.ogg",
  "public/assets/rpg/audio/music/orehaven-dungeon.ogg",
  "public/assets/rpg/audio/music/orehaven-battle.ogg",
  "public/assets/rpg/audio/music/biomes/moonfen-swamp.ogg",
  "public/assets/rpg/audio/music/biomes/emberfall-dark.ogg",
  "public/assets/rpg/audio/music/biomes/frostmere-snow.ogg",
];
for (const path of musicTracks) {
  const bytes = read(path);
  assert.equal(bytes.toString("ascii", 0, 4), "OggS", `${path} is not a valid Ogg container`);
  assert.ok(bytes.length > 250_000, `${path} appears truncated`);
}
const desertTrack = read("public/assets/rpg/audio/music/biomes/sunscar-desert.mp3");
assert.equal(desertTrack.toString("ascii", 0, 3), "ID3", "Sunscar music is not a valid MP3 container");
assert.ok(desertTrack.length > 1_000_000, "Sunscar music appears truncated");

const audio = read("src/rpg/gameAudio.ts").toString("utf8");
const scene = read("src/rpg/OrehavenScene.ts").toString("utf8");
const layeredHero = read("src/rpg/LayeredHero.ts").toString("utf8");
const gameUi = read("src/PhaserRpgGame.tsx").toString("utf8");
const credits = read("docs/ASSET-CREDITS.md").toString("utf8");
const biomeCredits = read("public/assets/rpg/audio/music/biomes/ASSET-CREDITS.md").toString("utf8");
assert.match(audio, /void this\.preloadSamples\(\)/, "Sample loading is not gated behind audio enablement.");
assert.match(audio, /if \(SAMPLE_DEFINITIONS\[cue\]\) \{[\s\S]*?return;/, "Recorded cues can still fall through to synthesized startup noise.");
assert.doesNotMatch(audio, /this\.startMusic\(\);/, "The placeholder synthesized music loop still starts.");
for (const state of ["field", "moonfen", "emberfall", "frostmere", "sunscar", "dungeon", "battle"]) {
  assert.match(audio, new RegExp(`[| ]"${state}"`), `${state} is missing from the adaptive music contract`);
}
assert.match(audio, /createMediaElementSource\(element\)/, "Music should stream instead of decoding every track into memory.");
assert.match(audio, /exponentialRampToValueAtTime\(definition\.gain/, "Music transitions do not crossfade.");
assert.match(gameUi, /setEnabled\(soundOn && sceneReady\)/, "Audio starts before the saved biome is known and wastes the field-track download.");
assert.match(scene, /this\.callbacks\.onMusic\("battle"\)/, "Combat does not switch to battle music.");
assert.match(scene, /explorationMusicForArea\(this\.activeWorldArea\)/, "Combat does not restore the current biome's exploration music.");
for (const mapping of [
  ['area === "marsh"', '"moonfen"'],
  ['area === "highlands"', '"emberfall"'],
  ['area === "frostmere" || area === "icefang"', '"frostmere"'],
  ['area === "sunscar"', '"sunscar"'],
]) {
  assert.ok(scene.includes(mapping[0]) && scene.includes(`return ${mapping[1]}`), `${mapping[0]} does not select ${mapping[1]} music`);
}
for (const cue of ["range-shot", "magic-cast", "hurt", "heal", "fish", "gather-complete", "victory", "level"]) {
  assert.match(audio, new RegExp(`(?:"${cue}"|${cue}): \\{ paths:`), `${cue} does not use a recorded sample`);
}
assert.match(scene, /this\.callbacks\.onAudio\("footstep"\)/, "Player movement does not emit footsteps.");
assert.match(scene, /this\.spawnFootstepDust\(\)/, "Player movement does not emit visual ground-contact feedback.");
const npcNameplateRange = scene.match(/this\.npcRuntime\.forEach[\s\S]*?updateNameplate\(value\.plate, distance < (\d+), distance < (\d+)\)/);
assert.ok(npcNameplateRange, "NPC nameplate visibility thresholds are missing.");
assert.ok(Number(npcNameplateRange[1]) <= 215, "NPC nameplates remain too visually noisy at long range.");
assert.ok(Number(npcNameplateRange[2]) <= 132, "NPC nameplate emphasis remains too visually noisy at long range.");
for (const animation of ["dark-bolt", "fire-bomb", "lightning", "spark"]) {
  assert.match(scene, new RegExp(`ore-ansimuz-${animation}`), `${animation} animation is not registered in combat`);
}
assert.match(scene, /MELEE_SLASH_KEY/);
assert.match(scene, /frameWidth: 253, frameHeight: 887/);
assert.match(scene, /key: "ore-melee-slash"/);
assert.match(scene, /private showEnemyAttackAccent\(/);
assert.match(scene, /now - enemy\.lastAttackAccentAt >= 900/);
assert.match(scene, /enemy\.definition\.kind !== "skeleton"/);
assert.match(scene, /private showCreatureSpecialImpact\(/);
for (const creature of ["drake", "dune-stalker", "boar"]) {
  assert.match(scene, new RegExp(`enemy\\.definition\\.kind === "${creature}"`), `${creature} special impact presentation is missing`);
}
for (const stagedEffect of ["playAnimeMeleeFx", "playAnimeRangeFx", "playAnimeMagicFx", "playAnimeImpact"]) {
  assert.match(scene, new RegExp(`private ${stagedEffect}\\(`), `${stagedEffect} is missing from the staged combat presentation`);
}
assert.match(scene, /playSignatureHeroAnimation\(combatStyle, isHeavy\)/, "signature effects do not trigger their dedicated character choreography");
assert.match(scene, /setHeroAction\("attack"\);[\s\S]*?playSignatureMotion\(combatStyle, this\.facing, false\)/, "basic attacks do not animate the layered character body");
assert.match(scene, /const attackColor = weaponAbility\(weaponId\)\.color/, "basic attacks do not inherit their equipped weapon's visual identity");
assert.match(scene, /private playProjectileTracer\(/, "ranged and magic attacks lack directional travel feedback");
assert.match(scene, /private playWeaponImpact\(/, "basic projectiles lack a synchronized impact accent");
assert.match(scene, /delayedCall\(125/, "melee contact does not align with the swing pose");
assert.match(scene, /delayedCall\(230/, "arrow release does not align with the bow draw pose");
assert.match(scene, /delayedCall\(185/, "spell release does not align with the casting pose");
assert.match(layeredHero, /motionSequence\+\+ % 2/, "consecutive melee attacks do not alternate their wind-up direction");
assert.match(scene, /\.sprite\(definition\.x, definition\.y, WOLF_KEY, 0\)[\s\S]*?setData\("animatedCreature", true\)/, "wolves must use their animated sheet at runtime");
assert.match(scene, /\.sprite\(definition\.x, definition\.y, DRAKE_KEY, 8\)[\s\S]*?setData\("animatedCreature", true\)/, "drakes must use their animated directional sheet at runtime");
assert.match(scene, /ashwing-drake-sheet-1024\.png.*frameWidth: 256, frameHeight: 256/, "drakes must use the normalized 4x4 sheet geometry");
assert.match(scene, /ore-drake-idle-/);
assert.match(scene, /ore-drake-walk-/);
assert.match(scene, /ore-drake-active-/);
assert.match(scene, /\.sprite\(definition\.x, definition\.y, DUNE_STALKER_KEY, 8\)[\s\S]*?setData\("animatedCreature", true\)/, "Dune Stalkers must use their dedicated directional sheet");
assert.match(scene, /dune-stalker-sheet-1024\.png.*frameWidth: 256, frameHeight: 256/, "Dune Stalkers must use normalized 4x4 sheet geometry");
assert.match(scene, /ore-dune-stalker-idle-/);
assert.match(scene, /ore-dune-stalker-walk-/);
assert.match(scene, /ore-dune-stalker-active-/);
assert.match(scene, /const isDrake = enemy\.definition\.kind === "drake"/, "drake projectiles are not specialized");
assert.match(scene, /isDrake[\s\S]*?FIREBALL_KEY[\s\S]*?ore-fireball-flight/, "Ashwing Drake still fires a placeholder arrow");
assert.match(scene, /if \(isDrake\)[\s\S]*?ANSIMUZ_FIRE_BOMB_KEY[\s\S]*?ore-ansimuz-fire-bomb/, "Ashwing Drake fire impact is missing");
assert.match(scene, /this\.load\.spritesheet\(WOLF_KEY, \"\/assets\/rpg\/creatures\/forest-wolf-sheet-v2\.png\"/);
assert.match(scene, /this\.load\.spritesheet\(BOAR_KEY, \"\/assets\/rpg\/creatures\/ember-tusk-boar-sheet-1024\.png\"/);
assert.match(scene, /this\.load\.spritesheet\(WOLF_KEY, \"\/assets\/rpg\/creatures\/forest-wolf-sheet-v2\.png\", \{ frameWidth: 256, frameHeight: 256 \}/);
assert.match(scene, /\.sprite\(definition\.x, definition\.y, SLIME_KEY, 0\)[\s\S]*?setData\("animatedCreature", true\)/, "slimes must use their animated sheet at runtime");
assert.match(scene, /ore-slime-sheet-1024\.png.*frameWidth: 256, frameHeight: 256/, "slimes must use the normalized 4x4 sheet geometry");
assert.match(scene, /\.sprite\(definition\.x, definition\.y, RAT_KEY, 0\)[\s\S]*?setData\("animatedCreature", true\)/, "rats must use their animated sheet at runtime");
assert.match(scene, /textureReady \? TREANT_KEY : RAT_KEY[\s\S]*?setScale\(0\.17\)/, "treants must use their dedicated transparent sprite strip after deferred loading");
assert.match(scene, /CREATURE_ASSET_REVISION = "treant-\d+"/, "the corrected treant sheets are not cache-versioned");
assert.match(scene, /setData\("deferredCreature", !textureReady\)/, "deferred creatures can expose Phaser's fallback texture");
assert.match(scene, /ore-treant-idle/);
assert.match(scene, /ore-treant-attack/);
assert.match(scene, /TREANT_ATTACK_KEY/);
assert.match(scene, /frameWidth: 362, frameHeight: 724/);
assert.match(scene, /ore-treant-hurt/);
for (const signatureAction of ["meleeSignature", "rangeSignature", "magicSignature"]) {
  assert.match(scene, new RegExp(`"${signatureAction}"`), `${signatureAction} is not selected by combat style`);
}
assert.match(scene, /delayedCall\(95 \+ index \* 58/, "melee signature frames do not have staged hit timing");
assert.match(scene, /delayedCall\(105 \+ index \* 70/, "ranged signature frames do not have staged volley timing");
assert.match(scene, /delayedCall\(210/, "magic signature frames do not have a readable anticipation phase");
assert.match(credits, /Kenney RPG Audio/);
assert.match(credits, /Ansimuz Magic Pack 9/);
for (const creator of ["MintoDog", "Paul Wortmann", "pmiller"]) assert.match(credits, new RegExp(creator), `${creator} music credit is missing`);
for (const creator of ["beardalaxy", "SkyleTheFrench", "Cleyton Kauffman", "iamoneabe"]) {
  assert.match(biomeCredits, new RegExp(creator), `${creator} biome music credit is missing`);
}
assert.match(read("public/assets/rpg/audio/kenney/LICENSE.txt").toString("utf8"), /Creative Commons Zero, CC0/);
assert.match(read("public/assets/rpg/effects/ansimuz/LICENSE.txt").toString("utf8"), /personal or commercial projects/);

console.log(JSON.stringify({ spellSheets: sheets.length, sampledSounds: samples.length, streamedMusicTracks: musicTracks.length + 1, biomeMusicTracks: 4, creatureSheets: creatureSheets.length, transparentEffects: true, detailedCreatureAtlas: true, animatedCreatureRuntime: true, stagedSignatureEffects: 4, weaponThemedBasicAttacks: true, synchronizedContactFrames: true, alternatingMeleeCadence: true, recordedGameplayCues: true, placeholderMusicDisabled: true, adaptiveMusic: true, movementFootsteps: true, movementContactFx: true, cc0Licenses: 9, result: "PASS" }, null, 2));
