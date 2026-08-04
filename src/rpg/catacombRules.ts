export type SunstoneRevenantPhase = 1 | 2 | 3;

export const SUNSTONE_REVENANT_PHASES = [
  { phase: 1, threshold: 1, name: "Fallen Sun Eruption", radius: 116, castMs: 2_200, cooldownMs: 7_600, color: 0xffbd52, multiplier: 2.05 },
  { phase: 2, threshold: 0.65, name: "Soulfire Cross", radius: 124, castMs: 1_800, cooldownMs: 6_100, color: 0xff725e, multiplier: 2.18 },
  { phase: 3, threshold: 0.3, name: "Eclipse Collapse", radius: 138, castMs: 1_450, cooldownMs: 5_200, color: 0xb66cff, multiplier: 2.35 },
] as const;

export function sunstoneRevenantPhase(hp: number, maxHp: number): SunstoneRevenantPhase {
  const ratio = maxHp > 0 ? Math.max(0, hp) / maxHp : 0;
  return ratio <= 0.3 ? 3 : ratio <= 0.65 ? 2 : 1;
}

export function sunstoneRevenantAbility(hp: number, maxHp: number) {
  const phase = sunstoneRevenantPhase(hp, maxHp);
  return SUNSTONE_REVENANT_PHASES[phase - 1];
}
