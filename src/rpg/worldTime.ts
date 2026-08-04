export const WORLD_DAY_DURATION_MS = 18 * 60_000;

export type WorldDayPhase = "dawn" | "day" | "dusk" | "night";

export type WorldTimeState = {
  phase: WorldDayPhase;
  label: string;
  clock: string;
  minute: number;
  progress: number;
};

export function worldTimeAt(timestamp: number): WorldTimeState {
  const safeTimestamp = Number.isFinite(timestamp) ? timestamp : 0;
  const elapsed = ((safeTimestamp % WORLD_DAY_DURATION_MS) + WORLD_DAY_DURATION_MS) % WORLD_DAY_DURATION_MS;
  const progress = elapsed / WORLD_DAY_DURATION_MS;
  const minute = Math.floor(progress * 24 * 60);
  const hour = Math.floor(minute / 60);
  const minuteOfHour = minute % 60;
  const phase: WorldDayPhase = hour >= 5 && hour < 8
    ? "dawn"
    : hour >= 8 && hour < 18
      ? "day"
      : hour >= 18 && hour < 21
        ? "dusk"
        : "night";
  const label = phase === "dawn" ? "First Light" : phase === "day" ? "Daylight" : phase === "dusk" ? "Golden Dusk" : "Nightwatch";
  return {
    phase,
    label,
    clock: `${String(hour).padStart(2, "0")}:${String(minuteOfHour).padStart(2, "0")}`,
    minute,
    progress,
  };
}
