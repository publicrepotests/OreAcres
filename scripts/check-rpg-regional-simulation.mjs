import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const scene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const hero = await readFile(new URL("../src/rpg/LayeredHero.ts", import.meta.url), "utf8");
const worldAreas = await readFile(new URL("../src/rpg/worldAreas.ts", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");

assert.match(hero, /setSimulationActive\(active: boolean\)/, "modular characters cannot suspend off-region animation");
assert.match(hero, /if \(active\) sprite\.anims\.resume\(\);[\s\S]*?else sprite\.anims\.pause\(\);/, "paperdoll sprite animation is not suspendable");
assert.match(hero, /this\.scene\.tweens\.getTweensOf\(target\)/, "paperdoll idle and aura tweens are not suspendable");
assert.match(scene, /private syncRegionalSimulation\(\)/, "the scene has no regional simulation lifecycle");
assert.match(scene, /this\.refreshRegionalAtmosphere\(\);[\s\S]*?this\.syncRegionalSimulation\(\);/, "region travel does not refresh simulation activity");
assert.match(scene, /worldAreaAtY\(citizen\.hero\.y\) !== this\.activeWorldArea/, "off-region citizens still pathfind every frame");
assert.match(scene, /worldAreaAtY\(remote\.targetY\) === this\.activeWorldArea/, "remote paperdolls are not scoped to the player's map");
assert.match(scene, /private setEnemyRegionalActive\(enemy: EnemyRuntime, active: boolean\)/, "enemy animation has no regional lifecycle");
assert.match(scene, /moved && regionalActive/, "off-region enemy movement still creates interpolation tweens");
assert.match(scene, /if \(!regionalActive\) this\.setTweenActivity\(resource\.sprite, false\)/, "off-region resource respawns restart animation");
assert.match(scene, /this\.setHeroAction\(this\.heroAction\);[\s\S]*?this\.syncRegionalSimulation\(\);/, "deferred asset loading reactivates the whole world");
assert.equal((worldAreas.match(/height: 1024/g) ?? []).length, 7, "every standalone chart needs a fixed 1024px simulation band");
assert.match(worldAreas, /overworld:[\s\S]*?height: 2048/, "the joined Orehaven and Briarwild map needs its two-chart height");
assert.match(scene, /worldAreaMovementBounds\(this\.activeWorldArea/, "player movement is not clamped to the active chart definition");
assert.doesNotMatch(scene, /activeWorldArea === "highlands" \? WORLD\.height/, "late-region movement can still leak across map bands");
assert.match(shell, /areaDefinition\.images\.map/, "the map UI does not render from the shared chart manifest");
assert.match(scene, /const WORLD_LAYER_MANIFEST:[\s\S]*?= \[[\s\S]*?WORLD_AREAS\.icefang\.images\[0\]/, "Phaser map loading does not use the complete shared chart manifest");
assert.match(scene, /const savedArea = worldAreaAtY\(this\.playerPos\.y\);[\s\S]*?WORLD_LAYER_MANIFEST[\s\S]*?this\.load\.image/, "the player's saved chart is not preloaded before the loading veil clears");
assert.match(scene, /WORLD_LAYER_MANIFEST\.forEach\(\(layer\) => this\.addLoadedWorldImage/, "preloaded destination charts are not attached during initial scene creation");
assert.match(scene, /const deferredCreature[\s\S]*?const visible = active && alive && !deferredCreature;/, "deferred creatures can show a fallback sprite before their real sheet loads");
const landmarkBlock = scene.match(/const REGIONAL_LANDMARK_ACCENTS:[\s\S]*?\n\];/)?.[0] ?? "";
assert.equal((landmarkBlock.match(/area: "/g) ?? []).length, 8, "every destination chart needs a distinct animated landmark");
assert.match(scene, /createRegionalLandmarkAccents\(\);[\s\S]*?refreshRegionalAtmosphere\(\);/, "new landmarks are not immediately scoped to the active chart");

console.log(JSON.stringify({
  mapSlices: 9,
  sharedAreaManifest: true,
  movementBandLeakFixed: true,
  animatedDestinationLandmarks: 8,
  paperdollAnimationSuspension: true,
  citizenPathfindingScoped: true,
  enemyInterpolationScoped: true,
  resourceAnimationScoped: true,
  remotePlayerRenderingScoped: true,
  deferredLoadResync: true,
  result: "PASS",
}, null, 2));
