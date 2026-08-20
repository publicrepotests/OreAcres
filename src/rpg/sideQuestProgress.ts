export type SideQuestState = { status: "active" | "ready" | "claimed"; progress: number };
export type SideQuestMarkerMode = "available" | "ready" | null;
export type SideQuestDefinition = { id: string; title: string; chapter: string; giverNpcId: "market" | "smith" | "ranger" | "fen-cartographer" | "ember-forgekeeper" | "frostkeeper" | "sunscar-scholar"; giverName: string; unlockQuestStep: number; description: string; objective: { kind: "combat" | "gather"; targetKey: string; target: number; label: string }; reward: { gold: number; xpSkill: "defense" | "mining" | "fishing"; xp: number; itemId: string; quantity: number } };

export const SIDE_QUESTS: SideQuestDefinition[] = [
  { id: "cellar-vermin", title: "Trouble Beneath the Stalls", chapter: "Orehaven Tale", giverNpcId: "market", giverName: "Pip", unlockQuestStep: 1, description: "Pip's grain stores are being ruined by field rats slipping through the western culvert.", objective: { kind: "combat", targetKey: "rat", target: 3, label: "Defeat Field Rats" }, reward: { gold: 90, xpSkill: "defense", xp: 70, itemId: "healing-potion", quantity: 1 } },
  { id: "quarry-ledger", title: "Korra's Missing Ledger", chapter: "Craftsman's Tale", giverNpcId: "smith", giverName: "Korra", unlockQuestStep: 5, description: "Replace the ore samples lost when a courier vanished along the eastern quarry road.", objective: { kind: "gather", targetKey: "ore", target: 5, label: "Mine ore samples" }, reward: { gold: 170, xpSkill: "mining", xp: 180, itemId: "iron-ore", quantity: 3 } },
  { id: "moonfen-remedy", title: "A Remedy for Moonfen", chapter: "Briarwild Tale", giverNpcId: "ranger", giverName: "Lyra Thorn", unlockQuestStep: 16, description: "Lyra needs fresh Moonwater fish oils for the wardens holding the marsh road.", objective: { kind: "gather", targetKey: "fish", target: 4, label: "Catch Moonwater fish" }, reward: { gold: 260, xpSkill: "fishing", xp: 240, itemId: "healing-potion", quantity: 2 } },
  { id: "heartwood-oath", title: "The Heartwood Oath", chapter: "Briarwild Tale", giverNpcId: "ranger", giverName: "Lyra Thorn", unlockQuestStep: 18, description: "The Briarwild's ancient guardian has awakened. Face the treant at the crossing and bring Lyra the living heartwood it protects.", objective: { kind: "combat", targetKey: "briar-treant", target: 1, label: "Defeat the Briar Treant" }, reward: { gold: 480, xpSkill: "defense", xp: 360, itemId: "briarhide-cloak", quantity: 1 } },
  { id: "catacomb-vigil", title: "Vigil Beneath the Sun", chapter: "Sunstone Tale", giverNpcId: "ranger", giverName: "Lyra Thorn", unlockQuestStep: 24, description: "Descend through the Old Sun Shrine and break the sentinels guarding the buried Sunstone halls.", objective: { kind: "combat", targetKey: "skeleton", target: 4, label: "Defeat Sunstone dead" }, reward: { gold: 420, xpSkill: "defense", xp: 360, itemId: "sunstone-shard", quantity: 2 } },
  { id: "ember-forge", title: "Ashes for the Forge", chapter: "Emberfall Tale", giverNpcId: "smith", giverName: "Korra", unlockQuestStep: 29, description: "Korra needs three Emberstone samples from the highland veins to stabilize a pickaxe worthy of the crater throne.", objective: { kind: "gather", targetKey: "ember-ore", target: 3, label: "Mine Emberstone" }, reward: { gold: 600, xpSkill: "mining", xp: 520, itemId: "sunstone-pick", quantity: 1 } },
  { id: "lantern-stones", title: "Lanterns Beneath the Mire", chapter: "Moonfen Tale", giverNpcId: "fen-cartographer", giverName: "Nessa Reedlight", unlockQuestStep: 30, description: "Nessa needs fresh Gloomstone to relight the drowned road before the marsh swallows its last safe trail.", objective: { kind: "gather", targetKey: "moonfen-ore", target: 3, label: "Mine Gloomstone" }, reward: { gold: 460, xpSkill: "mining", xp: 440, itemId: "healing-potion", quantity: 2 } },
  { id: "wraithlight-patrol", title: "The Light That Hunts", chapter: "Moonfen Tale", giverNpcId: "fen-cartographer", giverName: "Nessa Reedlight", unlockQuestStep: 30, description: "A Fen Wraith is following Nessa's newly lit markers and ambushing anyone who trusts their glow. End its hunt.", objective: { kind: "combat", targetKey: "moonfen-wraith-1", target: 1, label: "Defeat the Fen Wraith" }, reward: { gold: 680, xpSkill: "defense", xp: 560, itemId: "sunstone-shard", quantity: 2 } },
  { id: "caldera-supplies", title: "Steel Against the Storm", chapter: "Emberfall Tale", giverNpcId: "ember-forgekeeper", giverName: "Dagan Flint", unlockQuestStep: 35, description: "Dagan can reinforce Emberfall's shelters if you bring him enough ore that has survived the caldera's deepest heat.", objective: { kind: "gather", targetKey: "ember-ore", target: 4, label: "Mine Emberstone or Star-Iron" }, reward: { gold: 720, xpSkill: "mining", xp: 640, itemId: "healing-potion", quantity: 3 } },
  { id: "cinderwatch", title: "Cinderwatch Broken", chapter: "Emberfall Tale", giverNpcId: "ember-forgekeeper", giverName: "Dagan Flint", unlockQuestStep: 35, description: "The Cinder Guard has occupied the only ridge safe from the ash storms. Break its watch so Dagan can reopen the route.", objective: { kind: "combat", targetKey: "emberfall-cinder-guard-1", target: 1, label: "Defeat the Cinder Guard" }, reward: { gold: 940, xpSkill: "defense", xp: 760, itemId: "sunstone-shard", quantity: 3 } },
  { id: "frostglass-relay", title: "Fuel for the Last Light", chapter: "Frostmere Tale", giverNpcId: "frostkeeper", giverName: "Keeper Elowen", unlockQuestStep: 40, description: "The lighthouse lens can only be rekindled with frostglass taken from both sides of the frozen coast.", objective: { kind: "gather", targetKey: "frost-ore", target: 3, label: "Mine Frostglass" }, reward: { gold: 560, xpSkill: "mining", xp: 620, itemId: "healing-potion", quantity: 3 } },
  { id: "last-beacon", title: "The Last Beacon", chapter: "Frostmere Tale", giverNpcId: "frostkeeper", giverName: "Keeper Elowen", unlockQuestStep: 40, description: "The lens is ready, but Eira's frozen oath still smothers the flame. Defeat her at the lighthouse cliff and relight the beacon route.", objective: { kind: "combat", targetKey: "frostmere-warden", target: 1, label: "Defeat Eira" }, reward: { gold: 900, xpSkill: "defense", xp: 700, itemId: "moonweave-mantle", quantity: 1 } },
  { id: "oasis-sounding", title: "The Oasis Remembers", chapter: "Sunscar Tale", giverNpcId: "sunscar-scholar", giverName: "Scholar Samira", unlockQuestStep: 45, description: "The observatory charts say the oasis fish carry fragments of the buried court's final night. Catch three for Samira's reading.", objective: { kind: "gather", targetKey: "sunscar-fish", target: 3, label: "Catch oasis fish" }, reward: { gold: 720, xpSkill: "fishing", xp: 760, itemId: "healing-potion", quantity: 3 } },
  { id: "solar-seal", title: "The Solar Seal", chapter: "Sunscar Tale", giverNpcId: "sunscar-scholar", giverName: "Scholar Samira", unlockQuestStep: 45, description: "The oasis reading revealed a sealed tomb glowing beneath the dunes. Defeat Khepri and claim the seal before the buried court rises.", objective: { kind: "combat", targetKey: "sunscar-tomb-king", target: 1, label: "Defeat Khepri" }, reward: { gold: 1250, xpSkill: "defense", xp: 980, itemId: "sunforged-mail", quantity: 1 } },
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

export function advanceSideQuests(progress: Record<string, SideQuestState>, kind: "combat" | "gather", targetKey: string, targetId = "") {
  const next = normalizeSideQuestProgress(progress);
  for (const quest of SIDE_QUESTS) {
    const state = next[quest.id];
    const matchesTarget = quest.objective.targetKey === targetKey
      || quest.objective.targetKey === targetId
      || (quest.objective.targetKey === "ember-ore" && targetId.startsWith("emberfall-ore-"))
      || (quest.objective.targetKey === "moonfen-ore" && targetId.startsWith("moonfen-ore-"))
      || (quest.objective.targetKey === "frost-ore" && targetId.startsWith("frostmere-ore-"))
      || (quest.objective.targetKey === "sunscar-fish" && targetId.startsWith("sunscar-fish-"))
      || (quest.objective.targetKey === "frostmere-warden" && targetId === "frostmere-lighthouse-warden");
    if (!state || state.status !== "active" || quest.objective.kind !== kind || !matchesTarget) continue;
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
