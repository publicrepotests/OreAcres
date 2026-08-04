import assert from "node:assert/strict";
import clientRules from "../src/rpg/adventureRules.json" with { type: "json" };
import serverRules from "../server/src/adventureRules.json" with { type: "json" };
import { adventureProgress, normalizeAdventureClaims } from "../server/src/adventureProgress.js";

assert.deepEqual(serverRules, clientRules, "client and server chronicle rules must stay identical");
assert.equal(new Set(serverRules.map((adventure) => adventure.id)).size, serverRules.length, "chronicle IDs must be unique");

for (const adventure of serverRules) {
  assert.match(adventure.id, /^[a-z0-9-]+$/);
  assert.ok(adventure.target > 0);
  assert.ok(adventure.rewardGold >= 0);
  assert.ok(["enemiesDefeated", "resourcesGathered", "itemsCrafted", "worldEvents", "discoveries"].includes(adventure.metric) || /^target:[a-z0-9-]+$/.test(adventure.metric));
}

const progress = {
  discoveries: ["orehaven", "western-woods", "moonwater-pond"],
  activities: {
    lifetime: { enemiesDefeated: 12, resourcesGathered: 18, itemsCrafted: 6, worldEvents: 2 },
    lifetimeTargets: { "sunstone-revenant": 1, "resource-sunstone-ore": 8 },
    daily: { day: new Date().toISOString().slice(0, 10), combat: 0, gather: 0, craft: 0, event: 0, targets: {}, claimed: [] },
  },
};
assert.equal(adventureProgress(progress, serverRules.find((entry) => entry.metric === "enemiesDefeated")), 12);
assert.equal(adventureProgress(progress, serverRules.find((entry) => entry.metric === "discoveries")), 3);
assert.equal(adventureProgress(progress, serverRules.find((entry) => entry.metric === "target:sunstone-revenant")), 1);
assert.equal(adventureProgress(progress, serverRules.find((entry) => entry.metric === "target:resource-sunstone-ore")), 8);
assert.deepEqual(normalizeAdventureClaims(["warden-in-training", "../../bad", "warden-in-training"]), ["warden-in-training"]);

console.log(JSON.stringify({ chronicles: serverRules.length, parity: true, persistenceWhitelist: true, result: "PASS" }, null, 2));
