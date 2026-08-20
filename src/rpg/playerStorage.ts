import {
  customizationForAppearance,
  defaultProgress,
  isAppearanceId,
  levelFromXp,
  maxHpForProgress,
  normalizeCharacterCustomization,
  normalizeGuildMembership,
  normalizeDiscoveries,
  normalizeWaystones,
  SKILL_TREE_NODES,
  type AppearanceId,
  type PlayerProgress,
} from "./gameData";
import { normalizeActivityProgress } from "./activityProgress";
import { normalizeAdventureClaims } from "./adventureProgress";
import { normalizeSideQuestProgress } from "./sideQuestProgress";

const SAVE_KEY = "ore-acres-rpg-save-v2";

const LEGACY_APPEARANCES: Record<string, AppearanceId> = {
  paladin: "vanguard",
  astronaut: "ranger",
  voidwalker: "arcanist",
};

function normalizeCollectionLog(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized: Record<string, number> = {};
  Object.entries(value).forEach(([id, amount]) => {
    if (id.length > 48) return;
    const count = Math.max(0, Math.min(1_000_000, Math.floor(Number(amount) || 0)));
    if (count > 0) normalized[id] = count;
  });
  return normalized;
}

function normalizeAppearance(value: unknown, fallback: AppearanceId) {
  if (isAppearanceId(value)) return value;
  return typeof value === "string" ? LEGACY_APPEARANCES[value] ?? fallback : fallback;
}

export function normalizePlayerProgress(value: unknown): PlayerProgress {
  const fallback = defaultProgress();
  const parsed = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<PlayerProgress>
    : {};
  const appearance = normalizeAppearance(parsed.appearance, fallback.appearance);
  const savedX = Number(parsed.position?.x);
  const savedY = Number(parsed.position?.y);
  const skills = Object.fromEntries(Object.entries(fallback.skills).map(([id, baseline]) => {
    const saved = parsed.skills?.[id as keyof PlayerProgress["skills"]];
    const rawXp = Number(saved?.xp);
    const xp = Number.isFinite(rawXp) ? Math.max(0, Math.min(50_000_000, Math.floor(rawXp))) : baseline.xp;
    return [id, { xp, level: levelFromXp(xp) }];
  })) as PlayerProgress["skills"];
  const equipped = { ...fallback.equipped, ...(parsed.equipped ?? {}) };
  const derivedMaxHp = maxHpForProgress({ skills, equipped });
  const rawStoredMaxHp = Number(parsed.maxHp);
  const storedMaxHp = Number.isFinite(rawStoredMaxHp)
    ? Math.max(1, Math.min(250, Math.floor(rawStoredMaxHp)))
    : fallback.maxHp;
  const rawStoredHp = Number(parsed.hp);
  const storedHp = Number.isFinite(rawStoredHp)
    ? Math.max(0, Math.min(storedMaxHp, Math.floor(rawStoredHp)))
    : fallback.hp;
  const hp = Math.min(derivedMaxHp, storedHp + Math.max(0, derivedMaxHp - storedMaxHp));
  return {
    ...fallback,
    ...parsed,
    hp,
    maxHp: derivedMaxHp,
    skills,
    inventory: parsed.inventory ? { ...parsed.inventory } : { ...fallback.inventory },
    bank: parsed.bank ? { ...parsed.bank } : {},
    equipped,
    appearance,
    customization: normalizeCharacterCustomization(parsed.customization, customizationForAppearance(appearance)),
    questStep: Math.max(0, Math.min(57, Math.floor(Number(parsed.questStep) || 0))),
    questComplete: Boolean(parsed.questComplete),
    activities: normalizeActivityProgress(parsed.activities),
    collectionLog: normalizeCollectionLog(parsed.collectionLog),
    guild: normalizeGuildMembership(parsed.guild),
    treasureTrail: parsed.treasureTrail && typeof parsed.treasureTrail === "object"
      ? { step: Math.max(0, Math.min(2, Math.floor(Number(parsed.treasureTrail.step) || 0))) }
      : null,
    waystones: normalizeWaystones(parsed.waystones),
    discoveries: normalizeDiscoveries(parsed.discoveries),
    position: {
      x: Number.isFinite(savedX) ? Math.max(26, Math.min(1510, savedX)) : fallback.position.x,
      y: Number.isFinite(savedY) ? Math.max(34, Math.min(9192, savedY)) : fallback.position.y,
    },
    skillTree: {
      unlocked: Array.from(new Set(
        Array.isArray(parsed.skillTree?.unlocked)
          ? parsed.skillTree.unlocked.filter((id): id is string => typeof id === "string" && SKILL_TREE_NODES.some((node) => node.id === id))
          : [],
      )),
    },
    adventureClaims: normalizeAdventureClaims(parsed.adventureClaims),
    sideQuests: normalizeSideQuestProgress(parsed.sideQuests),
  };
}

export function loadPlayerProgress(): PlayerProgress {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? normalizePlayerProgress(JSON.parse(raw)) : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

export function savePlayerProgress(progress: PlayerProgress) {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
}

export function playerDisplayName() {
  const existing = window.localStorage.getItem("ore-acres-rpg-name")?.trim();
  if (existing) return existing.slice(0, 24);
  const generated = `Adventurer${Math.floor(100 + Math.random() * 900)}`;
  window.localStorage.setItem("ore-acres-rpg-name", generated);
  return generated;
}
