import activityRules from "./activityRules.json";

export type ActivityKind = "combat" | "gather" | "craft" | "event";
export type LifetimeActivityStats = {
  enemiesDefeated: number;
  resourcesGathered: number;
  itemsCrafted: number;
  worldEvents: number;
};
export type DailyActivity = {
  day: string;
  combat: number;
  gather: number;
  craft: number;
  event: number;
  targets: Record<string, number>;
  claimed: string[];
};
export type ActivityProgress = { lifetime: LifetimeActivityStats; lifetimeTargets: Record<string, number>; daily: DailyActivity };

export const DAILY_CONTRACTS = activityRules.contracts;
export const ACTIVITY_MILESTONES = activityRules.milestones;

export function activityDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1_000_000_000, Math.floor(parsed))) : 0;
}

function targetCounts(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const targets: Record<string, number> = {};
  Object.entries(value).forEach(([id, amount]) => {
    if (!/^[a-z0-9-]{1,32}$/.test(id)) return;
    const normalized = count(amount);
    if (normalized > 0) targets[id] = normalized;
  });
  return targets;
}

export function normalizeActivityProgress(value: unknown, day = activityDay()): ActivityProgress {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<ActivityProgress> : {};
  const lifetime = candidate.lifetime ?? {} as LifetimeActivityStats;
  const storedDaily = candidate.daily ?? {} as DailyActivity;
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
        ? [...new Set(storedDaily.claimed.filter((id): id is string => typeof id === "string"))].slice(0, 16)
        : [],
    },
  };
}

export function recordLifetimeTarget(value: unknown, targetKey: string, amount = 1): ActivityProgress {
  const next = normalizeActivityProgress(value);
  if (!/^[a-z0-9-]{1,32}$/.test(targetKey)) return next;
  next.lifetimeTargets[targetKey] = count((next.lifetimeTargets[targetKey] ?? 0) + Math.max(0, Math.floor(amount)));
  return next;
}

export function recordActivity(value: unknown, kind: ActivityKind, amount = 1, targetKey?: string): ActivityProgress {
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
  if (targetKey && /^[a-z0-9-]{1,32}$/.test(targetKey)) {
    next.daily.targets[targetKey] = count((next.daily.targets[targetKey] ?? 0) + increment);
  }
  return next;
}

export function activityContractCount(
  value: unknown,
  contract: { kind: string; targetKey: string | null },
) {
  const activities = normalizeActivityProgress(value);
  return contract.targetKey
    ? activities.daily.targets[contract.targetKey] ?? 0
    : count(activities.daily[contract.kind as ActivityKind]);
}
