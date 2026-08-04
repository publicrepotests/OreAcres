export type SideQuestState = { status: "active" | "ready" | "claimed"; progress: number };
export type SideQuestMarkerMode = "available" | "ready" | null;
export type SideQuestDefinition = { id: string; title: string; chapter: string; giverNpcId: "market" | "smith" | "ranger"; giverName: string; unlockQuestStep: number; description: string; objective: { kind: "combat" | "gather"; targetKey: string; target: number; label: string }; reward: { gold: number; xpSkill: "defense" | "mining" | "fishing"; xp: number; itemId: string; quantity: number } };

export const SIDE_QUESTS: SideQuestDefinition[] = [
  { id: "cellar-vermin", title: "Trouble Beneath the Stalls", chapter: "Orehaven Tale", giverNpcId: "market", giverName: "Pip", unlockQuestStep: 1, description: "Pip's grain stores are being ruined by field rats slipping through the western culvert.", objective: { kind: "combat", targetKey: "rat", target: 3, label: "Defeat Field Rats" }, reward: { gold: 90, xpSkill: "defense", xp: 70, itemId: "healing-potion", quantity: 1 } },
  { id: "quarry-ledger", title: "Korra's Missing Ledger", chapter: "Craftsman's Tale", giverNpcId: "smith", giverName: "Korra", unlockQuestStep: 5, description: "Replace the ore samples lost when a courier vanished along the eastern quarry road.", objective: { kind: "gather", targetKey: "ore", target: 5, label: "Mine ore samples" }, reward: { gold: 170, xpSkill: "mining", xp: 180, itemId: "iron-ore", quantity: 3 } },
  { id: "moonfen-remedy", title: "A Remedy for Moonfen", chapter: "Briarwild Tale", giverNpcId: "ranger", giverName: "Lyra Thorn", unlockQuestStep: 16, description: "Lyra needs fresh Moonwater fish oils for the wardens holding the marsh road.", objective: { kind: "gather", targetKey: "fish", target: 4, label: "Catch Moonwater fish" }, reward: { gold: 260, xpSkill: "fishing", xp: 240, itemId: "healing-potion", quantity: 2 } },
  { id: "catacomb-vigil", title: "Vigil Beneath the Sun", chapter: "Sunstone Tale", giverNpcId: "ranger", giverName: "Lyra Thorn", unlockQuestStep: 24, description: "Descend through the Old Sun Shrine and break the sentinels guarding the buried Sunstone halls.", objective: { kind: "combat", targetKey: "skeleton", target: 4, label: "Defeat Sunstone dead" }, reward: { gold: 420, xpSkill: "defense", xp: 360, itemId: "sunstone-shard", quantity: 2 } },
];

export function normalizeSideQuestProgress(value: unknown): Record<string, SideQuestState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = value as Record<string, Partial<SideQuestState>>;
  return Object.fromEntries(SIDE_QUESTS.flatMap((quest) => {
    const state = candidate[quest.id];
    if (!state || !["active", "ready", "claimed"].includes(String(state.status))) return [];
    const progress = Math.max(0, Math.min(quest.objective.target, Math.floor(Number(state.progress) || 0)));
    const status = state.status === "claimed" ? "claimed" : progress >= quest.objective.target ? "ready" : "active";
    return [[quest.id, { status, progress } satisfies SideQuestState]];
  }));
}

export function advanceSideQuests(progress: Record<string, SideQuestState>, kind: "combat" | "gather", targetKey: string) {
  const next = normalizeSideQuestProgress(progress);
  for (const quest of SIDE_QUESTS) {
    const state = next[quest.id];
    if (!state || state.status !== "active" || quest.objective.kind !== kind || quest.objective.targetKey !== targetKey) continue;
    const amount = Math.min(quest.objective.target, state.progress + 1);
    next[quest.id] = { status: amount >= quest.objective.target ? "ready" : "active", progress: amount };
  }
  return next;
}

export function sideQuestMarkerMode(
  quest: SideQuestDefinition,
  state: SideQuestState | undefined,
  questStep: number,
): SideQuestMarkerMode {
  if (questStep < quest.unlockQuestStep) return null;
  if (!state) return "available";
  return state.status === "ready" ? "ready" : null;
}
