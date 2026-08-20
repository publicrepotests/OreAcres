import { normalizeActivityProgress } from "./activityProgress.js";
import { normalizeAdventureClaims } from "./adventureProgress.js";
import { normalizeSideQuestProgress } from "./sideQuestProgress.js";

const SKILL_IDS = [
  "attack",
  "defense",
  "hitpoints",
  "range",
  "magic",
  "mining",
  "woodcutting",
  "fishing",
  "smithing",
  "crafting",
];
const APPEARANCES = new Set(["vanguard", "ranger", "arcanist", "stonewarden", "marshborn"]);
const FACE_STYLES = new Set(["neutral", "determined", "cheerful", "wide-eyed"]);
const HAIR_STYLES = new Set(["plain", "shorthawk", "spiked2", "afro", "bob", "cornrows", "buzzcut"]);
const BEARD_STYLES = new Set(["none", "stubble", "trimmed", "winter"]);
const SKIN_TONES = new Set(["ivory", "sunlit", "warm", "umber", "deep"]);
const HAIR_COLORS = new Set(["raven", "chestnut", "copper", "silver", "violet"]);
const DYES = new Set(["guild-blue", "leaf-green", "violet", "crimson", "sand", "charcoal", "slate", "brown"]);
const GEAR_DYES = new Set(["original", "iron", "sunsteel", "verdant", "moonsteel", "ember", "obsidian"]);
const HELMET_STYLES = new Set(["auto", "barbuta", "greathelm", "sugarloaf", "plate"]);
const CAPE_STYLES = new Set(["auto", "solid", "tattered", "briar"]);
const SHIELD_STYLES = new Set(["auto", "crusader"]);
const COMPANIONS = new Set(["none", "ore-slime", "pinefang-pup", "ashwing-whelp"]);
const WAYSTONES = new Set(["orehaven-gate", "moonwater-dock", "eastern-quarry", "briarwild-crossing", "moonfen-marsh", "ranger-camp", "sunstone-catacombs", "moonfen-expanse", "emberfall-highlands", "frostmere-coast", "sunscar-expanse", "guild-hall"]);
const REGIONS = new Set(["orehaven", "western-woods", "moonwater-pond", "eastern-quarry", "goblin-camp", "southroad", "briarwild-crossing", "old-sun-shrine", "moonfen-marsh", "ranger-camp", "raider-dens", "sunstone-catacombs", "moonfen-expanse", "emberfall-highlands", "frostmere-coast", "sunscar-expanse", "orehaven-guild-hall", "icefang-vault"]);
const SKILL_TREE_NODES = new Set([
  "whirlwind", "tempered-body", "bloodletter", "blade-discipline", "relentless", "wide-arc", "executioner", "unyielding",
  "arrow-rain", "steady-hands", "venom-shot", "toxin-lore", "rapid-nocking", "storm-quiver", "predators-focus", "windrunner",
  "sunfire-sigil", "mana-weave", "arcane-burn", "runic-intensity", "unstable-echo", "greater-sigils", "soul-fracture", "archmage",
  "iron-grip", "guarded-heart", "sweeping-edge", "crimson-flow", "duelist-tempo", "war-banner", "groundbreaker", "spellblade-oath", "deadeye-duelist",
  "eagle-eye", "fleet-fletching", "split-shaft", "serpent-fletching", "hunters-patience", "storm-sight", "pinning-volley", "arcane-marksman", "shadow-skirmisher",
  "ember-mind", "quick-incantation", "rune-bloom", "witchfire", "warded-soul", "astral-resonance", "frost-nova-tree", "battle-mage", "stormweaver",
]);
const ARMOR_MAX_HP_BONUSES = {
  "trailguard-vest": 8,
  "sentinel-mail": 12,
  "warden-mail": 20,
  "sunforged-mail": 28,
  "briarhide-cloak": 16,
  "moonweave-mantle": 26,
  "nightguard-plate": 34,
  "frostguard-aegis": 42,
};
const APPEARANCE_CUSTOMIZATION = {
  vanguard: { faceStyle: "determined", hairStyle: "plain", beardStyle: "none", skinTone: "ivory", hairColor: "silver", shirtColor: "guild-blue", pantsColor: "slate", bootsColor: "brown", armorDye: "original", weaponDye: "original", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", companion: "none", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
  ranger: { faceStyle: "cheerful", hairStyle: "shorthawk", beardStyle: "stubble", skinTone: "warm", hairColor: "chestnut", shirtColor: "leaf-green", pantsColor: "charcoal", bootsColor: "brown", armorDye: "original", weaponDye: "original", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", companion: "none", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
  arcanist: { faceStyle: "wide-eyed", hairStyle: "spiked2", beardStyle: "none", skinTone: "sunlit", hairColor: "violet", shirtColor: "violet", pantsColor: "slate", bootsColor: "charcoal", armorDye: "original", weaponDye: "original", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", companion: "none", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
  stonewarden: { faceStyle: "determined", hairStyle: "plain", beardStyle: "none", skinTone: "umber", hairColor: "raven", shirtColor: "crimson", pantsColor: "charcoal", bootsColor: "brown", armorDye: "iron", weaponDye: "iron", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", companion: "none", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
  marshborn: { faceStyle: "wide-eyed", hairStyle: "plain", beardStyle: "none", skinTone: "deep", hairColor: "raven", shirtColor: "slate", pantsColor: "charcoal", bootsColor: "brown", armorDye: "moonsteel", weaponDye: "moonsteel", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", companion: "none", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
};

export function customizationForRpgAppearance(appearance) {
  return { ...(APPEARANCE_CUSTOMIZATION[appearance] || APPEARANCE_CUSTOMIZATION.vanguard) };
}

export function normalizeRpgCustomization(value, fallback = customizationForRpgAppearance("vanguard")) {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    faceStyle: FACE_STYLES.has(candidate.faceStyle) ? candidate.faceStyle : fallback.faceStyle,
    hairStyle: HAIR_STYLES.has(candidate.hairStyle) ? candidate.hairStyle : fallback.hairStyle,
    beardStyle: BEARD_STYLES.has(candidate.beardStyle) ? candidate.beardStyle : fallback.beardStyle,
    skinTone: SKIN_TONES.has(candidate.skinTone) ? candidate.skinTone : fallback.skinTone,
    hairColor: HAIR_COLORS.has(candidate.hairColor) ? candidate.hairColor : fallback.hairColor,
    shirtColor: DYES.has(candidate.shirtColor) ? candidate.shirtColor : fallback.shirtColor,
    pantsColor: DYES.has(candidate.pantsColor) ? candidate.pantsColor : fallback.pantsColor,
    bootsColor: DYES.has(candidate.bootsColor) ? candidate.bootsColor : fallback.bootsColor,
    armorDye: GEAR_DYES.has(candidate.armorDye) ? candidate.armorDye : fallback.armorDye,
    weaponDye: GEAR_DYES.has(candidate.weaponDye) ? candidate.weaponDye : fallback.weaponDye,
    helmetStyle: HELMET_STYLES.has(candidate.helmetStyle) ? candidate.helmetStyle : fallback.helmetStyle,
    capeStyle: CAPE_STYLES.has(candidate.capeStyle) ? candidate.capeStyle : fallback.capeStyle,
    shieldStyle: SHIELD_STYLES.has(candidate.shieldStyle) ? candidate.shieldStyle : fallback.shieldStyle,
    companion: COMPANIONS.has(candidate.companion) ? candidate.companion : fallback.companion,
    showHelmet: typeof candidate.showHelmet === "boolean" ? candidate.showHelmet : fallback.showHelmet,
    showCape: typeof candidate.showCape === "boolean" ? candidate.showCape : fallback.showCape,
    showShield: typeof candidate.showShield === "boolean" ? candidate.showShield : fallback.showShield,
    showWeapon: typeof candidate.showWeapon === "boolean" ? candidate.showWeapon : fallback.showWeapon,
  };
}

export function normalizeRpgGuild(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = typeof value.id === "string" ? value.id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 48) : "";
  const name = typeof value.name === "string"
    ? value.name.replace(/[^a-zA-Z0-9 '&-]/g, "").replace(/\s+/g, " ").trim().slice(0, 24)
    : "";
  const tag = typeof value.tag === "string" ? value.tag.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5) : "";
  const founderId = typeof value.founderId === "string" ? value.founderId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64) : "";
  if (!id || name.length < 3 || tag.length < 2) return null;
  return {
    id,
    name,
    tag,
    founderId,
    joinedAt: finiteInteger(value.joinedAt, Date.now(), 0),
    renown: finiteInteger(value.renown, 0, 0, 100_000),
  };
}

function finiteInteger(value, fallback, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.floor(parsed))) : fallback;
}

export function baseMaxHpForHitpoints(level) {
  return 29 + finiteInteger(level, 1, 1, 99);
}

export function maxHpForRpgProgress(progress) {
  const hitpointsLevel = finiteInteger(progress?.skills?.hitpoints?.level, 1, 1, 99);
  const armorBonus = ARMOR_MAX_HP_BONUSES[progress?.equipped?.armor] || 0;
  return baseMaxHpForHitpoints(hitpointsLevel) + armorBonus;
}

function quantities(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id]) => typeof id === "string" && id.length <= 48)
      .map(([id, quantity]) => [id, finiteInteger(quantity, 0, 0, 1_000_000)])
      .filter(([, quantity]) => quantity > 0),
  );
}

export function defaultRpgProgress() {
  return {
    gold: 75,
    mint: 0,
    hp: 30,
    maxHp: 30,
    skills: Object.fromEntries(SKILL_IDS.map((id) => [id, { level: 1, xp: 0 }])),
    inventory: { "bronze-sword": 1, "bronze-pick": 1, trout: 2 },
    bank: {},
    equipped: { weapon: "bronze-sword", tool: "bronze-pick", armor: "" },
    appearance: "vanguard",
    customization: customizationForRpgAppearance("vanguard"),
    questStep: 0,
    questComplete: false,
    activities: normalizeActivityProgress(null),
    collectionLog: {},
    guild: null,
    treasureTrail: null,
    waystones: ["orehaven-gate"],
    discoveries: ["orehaven"],
    position: { x: 748, y: 505 },
    skillTree: { unlocked: [] },
    adventureClaims: [],
    sideQuests: {},
  };
}

export function normalizeRpgProgress(value) {
  const fallback = defaultRpgProgress();
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const skills = Object.fromEntries(
    SKILL_IDS.map((id) => {
      const skill = candidate.skills?.[id];
      const xp = finiteInteger(skill?.xp, fallback.skills[id].xp, 0, 50_000_000);
      const calculatedLevel = Math.max(1, Math.min(99, Math.floor(Math.sqrt(xp / 42)) + 1));
      return [id, { level: calculatedLevel, xp }];
    }),
  );
  const equipped = {
    weapon: typeof candidate.equipped?.weapon === "string" ? candidate.equipped.weapon.slice(0, 48) : fallback.equipped.weapon,
    tool: typeof candidate.equipped?.tool === "string" ? candidate.equipped.tool.slice(0, 48) : fallback.equipped.tool,
    armor: typeof candidate.equipped?.armor === "string" ? candidate.equipped.armor.slice(0, 48) : fallback.equipped.armor,
  };
  const maxHp = maxHpForRpgProgress({ skills, equipped });
  const storedMaxHp = finiteInteger(candidate.maxHp, fallback.maxHp, 1, 250);
  const storedHp = finiteInteger(candidate.hp, fallback.hp, 0, storedMaxHp);
  const hp = Math.min(maxHp, storedHp + Math.max(0, maxHp - storedMaxHp));
  const appearance = APPEARANCES.has(candidate.appearance) ? candidate.appearance : fallback.appearance;
  const positionX = Number(candidate.position?.x);
  const positionY = Number(candidate.position?.y);
  return {
    gold: finiteInteger(candidate.gold, fallback.gold, 0, 2_000_000_000),
    mint: Math.max(0, Math.min(2_000_000_000, Number(candidate.mint) || 0)),
    hp,
    maxHp,
    skills,
    inventory: candidate.inventory && typeof candidate.inventory === "object"
      ? quantities(candidate.inventory)
      : { ...fallback.inventory },
    bank: candidate.bank && typeof candidate.bank === "object" ? quantities(candidate.bank) : {},
    equipped,
    appearance,
    customization: normalizeRpgCustomization(candidate.customization, customizationForRpgAppearance(appearance)),
    questStep: finiteInteger(candidate.questStep, 0, 0, 57),
    questComplete: Boolean(candidate.questComplete),
    activities: normalizeActivityProgress(candidate.activities),
    collectionLog: candidate.collectionLog && typeof candidate.collectionLog === "object"
      ? quantities(candidate.collectionLog)
      : {},
    guild: normalizeRpgGuild(candidate.guild),
    treasureTrail: candidate.treasureTrail && typeof candidate.treasureTrail === "object" && !Array.isArray(candidate.treasureTrail)
      ? { step: finiteInteger(candidate.treasureTrail.step, 0, 0, 2) }
      : null,
    waystones: Array.from(new Set([
      "orehaven-gate",
      ...(Array.isArray(candidate.waystones) ? candidate.waystones.filter((id) => WAYSTONES.has(id)) : []),
    ])),
    discoveries: Array.from(new Set([
      "orehaven",
      ...(Array.isArray(candidate.discoveries) ? candidate.discoveries.filter((id) => REGIONS.has(id)) : []),
    ])),
    position: {
      x: Number.isFinite(positionX) ? Math.max(26, Math.min(1510, positionX)) : fallback.position.x,
      // Profiles persist across every stacked regional canvas, including the
      // instanced Icefang Vault below the original seven-chart frontier.
      y: Number.isFinite(positionY) ? Math.max(34, Math.min(9192, positionY)) : fallback.position.y,
    },
    skillTree: {
      unlocked: Array.from(new Set(
        Array.isArray(candidate.skillTree?.unlocked)
          ? candidate.skillTree.unlocked.filter((id) => SKILL_TREE_NODES.has(id))
          : [],
      )),
    },
    adventureClaims: normalizeAdventureClaims(candidate.adventureClaims),
    sideQuests: normalizeSideQuestProgress(candidate.sideQuests),
  };
}

export function addProfileXp(progress, skillId, amount) {
  if (!SKILL_IDS.includes(skillId)) return progress;
  const next = normalizeRpgProgress(progress);
  const xp = finiteInteger(next.skills[skillId].xp + amount, next.skills[skillId].xp, 0, 50_000_000);
  next.skills[skillId] = {
    xp,
    level: Math.max(1, Math.min(99, Math.floor(Math.sqrt(xp / 42)) + 1)),
  };
  return normalizeRpgProgress(next);
}

export function restoreRpgHitpoints(progress) {
  const next = normalizeRpgProgress(progress);
  const healing = Math.max(0, next.maxHp - next.hp);
  next.hp = next.maxHp;
  return { progress: next, healing };
}

export function addProfileItem(progress, itemId, quantity = 1) {
  const next = normalizeRpgProgress(progress);
  if (typeof itemId !== "string" || !itemId || quantity <= 0) return next;
  next.inventory[itemId] = finiteInteger((next.inventory[itemId] || 0) + quantity, 0, 0, 1_000_000);
  return next;
}

export function createRpgProfileStore(supabase) {
  return {
    async list({ query = "", limit = 100 } = {}) {
      const safeLimit = finiteInteger(limit, 100, 1, 250);
      let request = supabase
        .from("rpg_profiles")
        .select("user_id, display_name, progress, revision, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(safeLimit);
      const search = String(query || "").replace(/[%_,()]/g, "").trim().slice(0, 64);
      if (search) {
        request = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search)
          ? request.or(`display_name.ilike.%${search}%,user_id.eq.${search}`)
          : request.ilike("display_name", `%${search}%`);
      }
      const { data, error } = await request;
      if (error) throw error;
      return (data || []).map((row) => ({
        userId: row.user_id,
        displayName: row.display_name,
        progress: normalizeRpgProgress(row.progress),
        revision: finiteInteger(row.revision, 0, 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },

    async find(userId) {
      const { data, error } = await supabase
        .from("rpg_profiles")
        .select("user_id, display_name, progress, revision, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        userId: data.user_id,
        displayName: data.display_name,
        progress: normalizeRpgProgress(data.progress),
        revision: finiteInteger(data.revision, 0, 0),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },

    async load(userId, displayName) {
      const { data, error } = await supabase
        .from("rpg_profiles")
        .select("user_id, display_name, progress, revision")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          userId: data.user_id,
          displayName: data.display_name,
          progress: normalizeRpgProgress(data.progress),
          revision: finiteInteger(data.revision, 0, 0),
        };
      }
      const progress = defaultRpgProgress();
      const safeName = String(displayName || "Adventurer").trim().slice(0, 24) || "Adventurer";
      const { data: inserted, error: insertError } = await supabase
        .from("rpg_profiles")
        .insert({ user_id: userId, display_name: safeName, progress, revision: 0 })
        .select("user_id, display_name, progress, revision")
        .single();
      if (insertError) throw insertError;
      return {
        userId: inserted.user_id,
        displayName: inserted.display_name,
        progress: normalizeRpgProgress(inserted.progress),
        revision: finiteInteger(inserted.revision, 0, 0),
      };
    },

    async save(profile) {
      const nextRevision = finiteInteger(profile.revision, 0, 0) + 1;
      const { data, error } = await supabase
        .from("rpg_profiles")
        .update({
          display_name: String(profile.displayName || "Adventurer").slice(0, 24),
          progress: normalizeRpgProgress(profile.progress),
          revision: nextRevision,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.userId)
        .eq("revision", profile.revision)
        .select("user_id, display_name, progress, revision")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const conflict = new Error("Profile revision conflict.");
        conflict.code = "PROFILE_CONFLICT";
        throw conflict;
      }
      return {
        userId: data.user_id,
        displayName: data.display_name,
        progress: normalizeRpgProgress(data.progress),
        revision: finiteInteger(data.revision, nextRevision, 0),
      };
    },
  };
}
