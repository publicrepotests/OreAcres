import assert from "node:assert/strict";
import { SUNSTONE_REVENANT_PHASES as clientPhases, sunstoneRevenantAbility as clientAbility, sunstoneRevenantPhase as clientPhase } from "../src/rpg/catacombRules.ts";
import { SUNSTONE_REVENANT_PHASES as serverPhases, sunstoneRevenantAbility as serverAbility, sunstoneRevenantPhase as serverPhase } from "../server/src/catacombRules.js";

assert.deepEqual(clientPhases, serverPhases, "Aurex phase rules drifted between client and server");
for (const sample of [
  { hp: 310, phase: 1, ability: "Fallen Sun Eruption" },
  { hp: 201, phase: 2, ability: "Soulfire Cross" },
  { hp: 94, phase: 2, ability: "Soulfire Cross" },
  { hp: 93, phase: 3, ability: "Eclipse Collapse" },
  { hp: 1, phase: 3, ability: "Eclipse Collapse" },
]) {
  assert.equal(clientPhase(sample.hp, 310), sample.phase);
  assert.equal(serverPhase(sample.hp, 310), sample.phase);
  assert.equal(clientAbility(sample.hp, 310).name, sample.ability);
  assert.equal(serverAbility(sample.hp, 310).name, sample.ability);
}
assert.ok(serverPhases[2].castMs < serverPhases[0].castMs, "Aurex final phase should give less reaction time");
assert.ok(serverPhases[2].multiplier > serverPhases[0].multiplier, "Aurex final phase should hit harder");

console.log("Catacomb boss rules passed: all three Aurex phases have deterministic client/server parity and escalating danger.");
