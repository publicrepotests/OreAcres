import activityRules from "./activityRules.json" with { type: "json" };

export const DAILY_CONTRACTS = activityRules.contracts;

export function activityDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function count(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1_000_000_000, Math.floor(parsed))) : 0;
}

function targetCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const targets = {};
  Object.entries(value).forEach(([id, amount]) => {
    if (!/^[a-z0-9-]{1,32}$/.test(id)) return;
    const normalized = count(amount);
    if (normalized > 0) targets[id] = normalized;
  });
  return targets;
}

export function normalizeActivityProgress(value, day = activityDay()) {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const lifetime = candidate.lifetime && typeof candidate.lifetime === "object" ? candidate.lifetime : {};
  const storedDaily = candidate.daily && typeof candidate.daily === "object" ? candidate.daily : {};
  const dailyMatches = storedDaily.day === day;
  return {
    lifetime: {
      enemiesDefeated: count(lifetime.enemiesDefeated),
      resourcesGathered: count(lifetime.resourcesGathered),
      itemsCrafted: count(lifetime.itemsCrafted),
      worldEvents: count(lifetime.worldEvents),
    },
    lifetimeTargets: targetCounts(candidate.lifetimeTargets),
    daily: {
      day,
      combat: dailyMatches ? count(storedDaily.combat) : 0,
      gather: dailyMatches ? count(storedDaily.gather) : 0,
      craft: dailyMatches ? count(storedDaily.craft) : 0,
      event: dailyMatches ? count(storedDaily.event) : 0,
      targets: dailyMatches ? targetCounts(storedDaily.targets) : {},
      claimed: dailyMatches && Array.isArray(storedDaily.claimed)
        ? [...new Set(storedDaily.claimed.filter((id) => typeof id === "string"))].slice(0, 16)
        : [],
    },
  };
}

export function recordLifetimeTarget(value, targetKey, amount = 1) {
  const next = normalizeActivityProgress(value);
  if (typeof targetKey !== "string" || !/^[a-z0-9-]{1,32}$/.test(targetKey)) return next;
  next.lifetimeTargets[targetKey] = count((next.lifetimeTargets[targetKey] || 0) + Math.max(0, Math.floor(amount)));
  return next;
}

export function recordActivity(value, kind, amount = 1, targetKey) {
  const next = normalizeActivityProgress(value);
  const increment = Math.max(0, Math.floor(amount));
  next.daily[kind] = count(next.daily[kind] + increment);
  const lifetimeKey = kind === "combat"
    ? "enemiesDefeated"
    : kind === "gather"
      ? "resourcesGathered"
      : kind === "craft"
        ? "itemsCrafted"
        : "worldEvents";
  next.lifetime[lifetimeKey] = count(next.lifetime[lifetimeKey] + increment);
  if (typeof targetKey === "string" && /^[a-z0-9-]{1,32}$/.test(targetKey)) {
    next.daily.targets[targetKey] = count((next.daily.targets[targetKey] || 0) + increment);
  }
  return next;
}

export function activityContractCount(value, contract) {
  const activities = normalizeActivityProgress(value);
  return contract.targetKey
    ? activities.daily.targets[contract.targetKey] || 0
    : count(activities.daily[contract.kind]);
}
