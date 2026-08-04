import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const scene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const citizenBlock = scene.match(/const AMBIENT_CITIZENS:[\s\S]*?\n\];/)?.[0] ?? "";

assert.ok(citizenBlock, "ambient citizen definitions are missing");
assert.equal((citizenBlock.match(/\bbarks:/g) ?? []).length, 8, "every roaming citizen needs authored ambient dialogue");
assert.ok(scene.includes("this.ambientBubbles.size === 0"), "ambient dialogue must be globally limited to prevent bubble clutter");
assert.match(scene, /Distance\.Between\([\s\S]*?\) <= 280/, "ambient dialogue must only appear near the player");
assert.ok(scene.includes("nextBarkAt: Date.now()"), "citizen dialogue needs staggered scheduling");
assert.ok(scene.includes("this.ambientBubbles.clear()"), "ambient bubbles must be cleaned up with the scene");
assert.ok(scene.includes("runtime.target.x"), "ambient bubbles must follow moving citizens");

console.log(JSON.stringify({
  roamingCitizens: 8,
  authoredBarkSets: 8,
  proximityLimited: true,
  globallyThrottled: true,
  movementTracking: true,
  lifecycleCleanup: true,
  result: "PASS",
}, null, 2));
