import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  RIMEBOUND_KING_PHASES as clientPhases,
  rimeboundKingAbility as clientAbility,
  rimeboundKingPhase as clientPhase,
} from "../src/rpg/icefangRules.ts";
import {
  RIMEBOUND_KING_PHASES as serverPhases,
  rimeboundKingAbility as serverAbility,
  rimeboundKingPhase as serverPhase,
} from "../server/src/icefangRules.js";

assert.deepEqual(clientPhases, serverPhases, "Hroth phase rules drifted between client and server");
for (const sample of [
  { hp: 980, phase: 1, ability: "Frozen Decree" },
  { hp: 646, phase: 2, ability: "Bridgebreaker Hail" },
  { hp: 313, phase: 3, ability: "Rimefall Judgment" },
  { hp: 1, phase: 3, ability: "Rimefall Judgment" },
]) {
  assert.equal(clientPhase(sample.hp, 980), sample.phase);
  assert.equal(serverPhase(sample.hp, 980), sample.phase);
  assert.equal(clientAbility(sample.hp, 980).name, sample.ability);
  assert.equal(serverAbility(sample.hp, 980).name, sample.ability);
}
assert.ok(serverPhases[2].castMs < serverPhases[0].castMs, "Hroth's final phase should give less reaction time");
assert.ok(serverPhases[2].cooldownMs < serverPhases[0].cooldownMs, "Hroth's final phase should cast more often");
assert.ok(serverPhases[2].radius > serverPhases[0].radius, "Hroth's final phase should threaten more ground");
assert.ok(serverPhases[2].multiplier > serverPhases[0].multiplier, "Hroth's final phase should hit harder");

const scene = await readFile(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const server = await readFile(new URL("../server/src/index.js", import.meta.url), "utf8");
assert.match(server, /icefang-rimebound-king"\) return rimeboundKingAbility/, "Hroth does not use his authoritative phase rules");
assert.match(scene, /showRimeboundPhaseFx\(enemy, phaseRule\.color, nextPhase\)/, "Hroth phase changes have no world-space presentation");
assert.match(scene, /Phaser\.Math\.Clamp\(Number\(data\?\.radius\) \|\| 64, 36, 160\)/, "client warning circles cannot display Hroth's full damage radius");
assert.match(server, /Math\.min\(160, radius\)/, "persisted enemy casts truncate Hroth's damage radius");

console.log(JSON.stringify({
  phases: clientPhases.length,
  clientServerParity: true,
  escalatingDanger: true,
  matchedTelegraphRadius: true,
  phaseTransitionFx: true,
  result: "PASS",
}, null, 2));
