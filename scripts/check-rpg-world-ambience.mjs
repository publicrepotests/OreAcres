import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const scene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const citizenBlock = scene.match(/const AMBIENT_CITIZENS:[\s\S]*?\n\];/)?.[0] ?? "";

assert.ok(citizenBlock, "ambient citizen definitions are missing");
assert.equal((citizenBlock.match(/\bbarks:/g) ?? []).length, 18, "every roaming citizen needs authored ambient dialogue");
assert.ok(scene.includes("this.ambientBubbles.size === 0"), "ambient dialogue must be globally limited to prevent bubble clutter");
assert.match(scene, /Distance\.Between\([\s\S]*?\) <= 280/, "ambient dialogue must only appear near the player");
assert.ok(scene.includes("nextBarkAt: Date.now()"), "citizen dialogue needs staggered scheduling");
assert.ok(scene.includes("this.ambientBubbles.clear()"), "ambient bubbles must be cleaned up with the scene");
assert.ok(scene.includes("runtime.target.x"), "ambient bubbles must follow moving citizens");
assert.match(scene, /hitZone\.on\("pointerdown"[\s\S]*?showAmbientBark\(runtime\)/, "roaming citizens should respond when a nearby player clicks them");
assert.match(scene, /Move closer to speak with that traveler/, "distant ambient interactions need clear range guidance");
assert.match(scene, /private regionalAtmosphere = new Map<WorldArea/, "regional atmosphere objects are not lifecycle-grouped");
assert.match(scene, /private refreshRegionalAtmosphere\(\)/, "regional atmosphere lifecycle control is missing");
assert.match(scene, /if \(enabled\) tween\.resume\(\);[\s\S]*?else tween\.pause\(\);/, "off-camera biome tweens are not paused");
assert.match(scene, /this\.refreshRegionalAtmosphere\(\);[\s\S]*?if \(!this\.activeEnemyId\)/, "region changes do not refresh atmosphere activity");
assert.match(scene, /worldAreaAtY\(source\.y\) !== this\.activeWorldArea/, "off-region campfires still allocate ember effects");
assert.match(scene, /this\.trackRegionalAtmosphere\(worldAreaAtY\(decoration\.y\), landmark\)/, "animated landmarks are not region-paused");
assert.match(scene, /this\.trackRegionalAtmosphere\(worldAreaAtY\(ripple\.y\), ring\)/, "fishing ripples are not region-paused");
for (const area of ["overworld", "dungeon", "marsh", "highlands", "frostmere", "sunscar", "guildhall", "icefang"]) {
  assert.match(scene, new RegExp(`trackRegionalAtmosphere\\("${area}"`), `${area} ambience is not assigned to its lifecycle group`);
}

console.log(JSON.stringify({
  roamingCitizens: 18,
  authoredBarkSets: 18,
  clickToTalk: true,
  proximityLimited: true,
  globallyThrottled: true,
  movementTracking: true,
  lifecycleCleanup: true,
  inactiveBiomeTweensPaused: true,
  inactiveLandmarkTweensPaused: true,
  offRegionCampfireAllocationsBlocked: true,
  result: "PASS",
}, null, 2));
