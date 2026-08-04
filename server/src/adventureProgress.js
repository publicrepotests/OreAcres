import adventureRules from "./adventureRules.json" with { type: "json" };
import { normalizeActivityProgress } from "./activityProgress.js";

export const ADVENTURE_CHRONICLES = adventureRules;

export function normalizeAdventureClaims(value) {
  const valid = new Set(ADVENTURE_CHRONICLES.map((adventure) => adventure.id));
  return Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === "string" && valid.has(id)))]
    : [];
}

export function adventureProgress(progress, adventure) {
  if (adventure.metric === "discoveries") return progress.discoveries.length;
  const activities = normalizeActivityProgress(progress.activities);
  if (adventure.metric.startsWith("target:")) return activities.lifetimeTargets[adventure.metric.slice(7)] || 0;
  return activities.lifetime[adventure.metric] || 0;
}
