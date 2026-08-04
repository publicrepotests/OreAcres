import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");

for (const runtime of ["EnemyRuntime", "ResourceRuntime", "NpcRuntime", "WaystoneRuntime", "DungeonPortalRuntime"]) {
  assert.match(scene, new RegExp(`type ${runtime} = \\{[\\s\\S]*?hitZone: Phaser\\.GameObjects\\.Zone;`), `${runtime} lacks a dedicated hit zone`);
}

assert.match(scene, /private createInteractionZone\([\s\S]*?\.setOrigin\(0\.5, 1\)/, "interaction zones are not anchored to object feet");
assert.match(scene, /targets: enemy\.hitZone,[\s\S]*?x: nextX,[\s\S]*?y: nextY \+ 5/, "enemy hit zones do not follow server movement");
assert.match(scene, /enemy\.hitZone\.disableInteractive\(\)/, "defeated enemies retain active hit zones");
assert.match(scene, /resource\.hitZone\.disableInteractive\(\)/, "depleted resources retain active hit zones");
assert.doesNotMatch(scene, /hero\.root\.setInteractive\(/, "layered actors still rely on container-sized hit areas");

console.log("RPG interaction checks passed: actors, resources, waystones, and portals use foot-anchored lifecycle-aware hit zones.");
