export type RimeboundKingPhase = 1 | 2 | 3;

export const RIMEBOUND_KING_PHASES = [
  { phase: 1, threshold: 1, name: "Frozen Decree", radius: 92, castMs: 2_300, cooldownMs: 8_000, color: 0x8de9ff, multiplier: 1.85 },
  { phase: 2, threshold: 0.66, name: "Bridgebreaker Hail", radius: 124, castMs: 2_000, cooldownMs: 6_600, color: 0x55cfff, multiplier: 2.05 },
  { phase: 3, threshold: 0.32, name: "Rimefall Judgment", radius: 152, castMs: 1_650, cooldownMs: 5_400, color: 0xd6fbff, multiplier: 2.3 },
] as const;

export function rimeboundKingPhase(hp: number, maxHp: number): RimeboundKingPhase {
  const ratio = maxHp > 0 ? Math.max(0, hp) / maxHp : 0;
  return ratio <= 0.32 ? 3 : ratio <= 0.66 ? 2 : 1;
}

export function rimeboundKingAbility(hp: number, maxHp: number) {
  return RIMEBOUND_KING_PHASES[rimeboundKingPhase(hp, maxHp) - 1];
}
