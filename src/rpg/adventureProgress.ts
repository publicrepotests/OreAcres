import adventureRules from "./adventureRules.json";
import { normalizeActivityProgress, type LifetimeActivityStats } from "./activityProgress";

export type AdventureMetric = keyof LifetimeActivityStats | "discoveries" | `target:${string}`;
export type AdventureDefinition = {
  id: string;
  chapter: string;
  title: string;
  description: string;
  metric: AdventureMetric;
  target: number;
  rewardGold: number;
  rewardItems: Array<{ itemId: string; quantity: number }>;
};

export const ADVENTURE_CHRONICLES = adventureRules as AdventureDefinition[];

export function normalizeAdventureClaims(value: unknown) {
  const valid = new Set(ADVENTURE_CHRONICLES.map((adventure) => adventure.id));
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((id): id is string => typeof id === "string" && valid.has(id))))
    : [];
}

export function adventureProgress(
  progress: { activities: unknown; discoveries: string[] },
  adventure: Pick<AdventureDefinition, "metric">,
) {
  if (adventure.metric === "discoveries") return progress.discoveries.length;
  const activities = normalizeActivityProgress(progress.activities);
  if (adventure.metric.startsWith("target:")) return activities.lifetimeTargets[adventure.metric.slice(7)] ?? 0;
  return activities.lifetime[adventure.metric as keyof LifetimeActivityStats];
}
