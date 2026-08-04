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
];
for (const [path, width, height] of sheets) {
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

const audio = read("src/rpg/gameAudio.ts").toString("utf8");
const scene = read("src/rpg/OrehavenScene.ts").toString("utf8");
const credits = read("docs/ASSET-CREDITS.md").toString("utf8");
assert.match(audio, /void this\.preloadSamples\(\)/, "Sample loading is not gated behind audio enablement.");
assert.match(audio, /if \(SAMPLE_DEFINITIONS\[cue\]\) \{[\s\S]*?return;/, "Recorded cues can still fall through to synthesized startup noise.");
assert.doesNotMatch(audio, /this\.startMusic\(\);/, "The placeholder synthesized music loop still starts.");
for (const cue of ["range-shot", "magic-cast", "hurt", "heal", "fish", "gather-complete", "victory", "level"]) {
  assert.match(audio, new RegExp(`(?:"${cue}"|${cue}): \\{ paths:`), `${cue} does not use a recorded sample`);
}
assert.match(scene, /this\.callbacks\.onAudio\("footstep"\)/, "Player movement does not emit footsteps.");
for (const animation of ["dark-bolt", "fire-bomb", "lightning", "spark"]) {
  assert.match(scene, new RegExp(`ore-ansimuz-${animation}`), `${animation} animation is not registered in combat`);
}
for (const stagedEffect of ["playAnimeMeleeFx", "playAnimeRangeFx", "playAnimeMagicFx", "playAnimeImpact"]) {
  assert.match(scene, new RegExp(`private ${stagedEffect}\\(`), `${stagedEffect} is missing from the staged combat presentation`);
}
assert.match(scene, /playSignatureHeroAnimation\(combatStyle, isHeavy\)/, "signature effects do not trigger their dedicated character choreography");
assert.match(scene, /setHeroAction\("attack"\);[\s\S]*?playSignatureMotion\(combatStyle, this\.facing, false\)/, "basic attacks do not animate the layered character body");
for (const signatureAction of ["meleeSignature", "rangeSignature", "magicSignature"]) {
  assert.match(scene, new RegExp(`"${signatureAction}"`), `${signatureAction} is not selected by combat style`);
}
assert.match(scene, /delayedCall\(95 \+ index \* 58/, "melee signature frames do not have staged hit timing");
assert.match(scene, /delayedCall\(105 \+ index \* 70/, "ranged signature frames do not have staged volley timing");
assert.match(scene, /delayedCall\(210/, "magic signature frames do not have a readable anticipation phase");
assert.match(credits, /Kenney RPG Audio/);
assert.match(credits, /Ansimuz Magic Pack 9/);
assert.match(read("public/assets/rpg/audio/kenney/LICENSE.txt").toString("utf8"), /Creative Commons Zero, CC0/);
assert.match(read("public/assets/rpg/effects/ansimuz/LICENSE.txt").toString("utf8"), /personal or commercial projects/);

console.log(JSON.stringify({ spellSheets: sheets.length, sampledSounds: samples.length, transparentEffects: true, stagedSignatureEffects: 4, recordedGameplayCues: true, placeholderMusicDisabled: true, movementFootsteps: true, cc0Licenses: 2, result: "PASS" }, null, 2));
