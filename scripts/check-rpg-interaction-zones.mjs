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
assert.match(scene, /private nearbyRing!: Phaser\.GameObjects\.Ellipse/, "nearby interactables have no in-world focus indicator");
assert.match(scene, /private nearbyPrompt!: Phaser\.GameObjects\.Text/, "nearby interactables do not expose their keyboard action");
assert.match(scene, /target\.kind === "enemy"[\s\S]*?0xef6f5e[\s\S]*?target\.kind === "resource"[\s\S]*?0x77d89b/, "interaction focus does not distinguish threats from gathering nodes");
assert.match(scene, /this\.nearbyRing\.setVisible\(false\);[\s\S]*?this\.nearbyPrompt\.setVisible\(false\);[\s\S]*?return;/, "interaction focus remains visible while input is locked");

console.log("RPG interaction checks passed: actors, resources, waystones, and portals use foot-anchored lifecycle-aware hit zones with contextual in-world focus.");
