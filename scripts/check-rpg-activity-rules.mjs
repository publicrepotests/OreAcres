import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { activityContractCount, activityDay, DAILY_CONTRACTS, normalizeActivityProgress, recordActivity, recordLifetimeTarget } from "../server/src/activityProgress.js";

const clientRules = JSON.parse(await readFile(new URL("../src/rpg/activityRules.json", import.meta.url), "utf8"));
const serverRules = JSON.parse(await readFile(new URL("../server/src/activityRules.json", import.meta.url), "utf8"));
assert.deepEqual(serverRules, clientRules, "client and server activity rules must remain identical");

const today = activityDay();
const reset = normalizeActivityProgress({
  lifetime: { enemiesDefeated: 12, resourcesGathered: 7, itemsCrafted: 3, worldEvents: 2 },
  daily: { day: "2000-01-01", combat: 99, gather: 99, craft: 99, event: 99, targets: { goblin: 99 }, claimed: ["trail-clearance"] },
});
assert.deepEqual(reset.daily, { day: today, combat: 0, gather: 0, craft: 0, event: 0, targets: {}, claimed: [] });
assert.equal(reset.lifetime.enemiesDefeated, 12, "daily resets must preserve lifetime progress");

let progress = normalizeActivityProgress(null);
progress = recordActivity(progress, "combat", 5, "goblin");
progress = recordActivity(progress, "gather", 6);
progress = recordActivity(progress, "craft", 1);
progress = recordActivity(progress, "event", 1);
assert.deepEqual(
  { combat: progress.daily.combat, gather: progress.daily.gather, craft: progress.daily.craft, event: progress.daily.event },
  { combat: 5, gather: 6, craft: 1, event: 1 },
);
assert.equal(progress.lifetime.enemiesDefeated, 5);
assert.equal(progress.lifetime.resourcesGathered, 6);
assert.equal(progress.lifetime.itemsCrafted, 1);
assert.equal(progress.lifetime.worldEvents, 1);
assert.equal(progress.daily.targets.goblin, 5);
progress = recordLifetimeTarget(progress, "sunstone-revenant");
progress = recordLifetimeTarget(progress, "sunstone-revenant");
assert.equal(progress.lifetimeTargets["sunstone-revenant"], 2, "exact enemy records must persist outside daily resets");
progress = recordLifetimeTarget(progress, "resource-sunstone-ore");
assert.equal(progress.lifetimeTargets["resource-sunstone-ore"], 1, "exact gathering records must persist outside daily resets");
assert.deepEqual(recordLifetimeTarget(progress, "../../bad").lifetimeTargets, progress.lifetimeTargets, "invalid lifetime target keys must be rejected");

const contractIds = DAILY_CONTRACTS.map((contract) => contract.id);
assert.equal(new Set(contractIds).size, contractIds.length, "contract ids must be unique");
assert.deepEqual(new Set(DAILY_CONTRACTS.map((contract) => contract.kind)), new Set(["combat", "gather", "craft", "event"]));
for (const contract of DAILY_CONTRACTS) {
  assert.ok(contract.target > 0, `${contract.id} needs a positive target`);
  assert.ok(contract.rewardGold > 0, `${contract.id} needs a positive reward`);
  assert.ok(Array.isArray(contract.rewardItems), `${contract.id} rewards must be a list`);
  if (contract.targetKey) assert.match(contract.targetKey, /^[a-z0-9-]{1,32}$/);
}

const goblinBounty = DAILY_CONTRACTS.find((contract) => contract.id === "goblin-incursion");
assert.ok(goblinBounty, "goblin bounty must exist");
assert.equal(activityContractCount(progress, goblinBounty), 5, "bounty progress must use the authoritative target counter");

console.log(JSON.stringify({
  utcDay: today,
  dailyResetVerified: true,
  lifetimePreserved: true,
  activityKinds: [...new Set(DAILY_CONTRACTS.map((contract) => contract.kind))],
  contracts: contractIds,
  targetBounties: DAILY_CONTRACTS.filter((contract) => contract.targetKey).map((contract) => contract.targetKey),
  result: "PASS",
}, null, 2));
