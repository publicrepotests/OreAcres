import { normalizeActivityProgress, type ActivityProgress } from "./activityProgress";
import type { SideQuestState } from "./sideQuestProgress";
import editableWorldLayout from "./worldLayout.json";

export type Direction = "down" | "left" | "right" | "up";
export type AppearanceId = "vanguard" | "ranger" | "arcanist" | "stonewarden" | "marshborn";
export type FaceStyleId = "neutral" | "determined" | "cheerful" | "wide-eyed";
export type HairStyleId = "plain" | "shorthawk" | "spiked2" | "afro" | "bob" | "cornrows" | "buzzcut";
export type BeardStyleId = "none" | "stubble" | "trimmed" | "winter";
export type SkinToneId = "ivory" | "sunlit" | "warm" | "umber" | "deep";
export type HairColorId = "raven" | "chestnut" | "copper" | "silver" | "violet";
export type DyeId = "guild-blue" | "leaf-green" | "violet" | "crimson" | "sand" | "charcoal" | "slate" | "brown";
export type GearDyeId = "original" | "iron" | "sunsteel" | "verdant" | "moonsteel" | "ember" | "obsidian";
export type HelmetStyleId = "auto" | "barbuta" | "greathelm" | "sugarloaf" | "plate";
export type CapeStyleId = "auto" | "solid" | "tattered" | "briar";
export type ShieldStyleId = "auto" | "crusader";
export type CharacterCustomization = {
  faceStyle: FaceStyleId;
  hairStyle: HairStyleId;
  beardStyle: BeardStyleId;
  skinTone: SkinToneId;
  hairColor: HairColorId;
  shirtColor: DyeId;
  pantsColor: DyeId;
  bootsColor: DyeId;
  armorDye: GearDyeId;
  weaponDye: GearDyeId;
  helmetStyle: HelmetStyleId;
  capeStyle: CapeStyleId;
  shieldStyle: ShieldStyleId;
  showHelmet: boolean;
  showCape: boolean;
  showShield: boolean;
  showWeapon: boolean;
};
export type CombatStyle = "melee" | "range" | "magic";
export type Panel = "activities" | "quests" | "skills" | "inventory" | "equipment" | "social" | "shop" | "map" | "bestiary" | "bank" | "workshop" | null;
export type SkillId =
  | "attack"
  | "defense"
  | "hitpoints"
  | "range"
  | "magic"
  | "mining"
  | "woodcutting"
  | "fishing"
  | "smithing"
  | "crafting";

export type SkillProgress = { level: number; xp: number };
export type TreasureTrailProgress = { step: number };

export type SkillUnlock = {
  id: string;
  kind: "ability" | "equipment" | "recipe" | "resource" | "passive";
  label: string;
  detail: string;
  level: number;
};

export type WaystoneDefinition = {
  id: string;
  name: string;
  region: string;
  x: number;
  y: number;
  arrivalX: number;
  arrivalY: number;
};

export type DungeonPortalDefinition = {
  id: string;
  name: string;
  region: string;
  x: number;
  y: number;
  destinationX: number;
  destinationY: number;
};

export type RegionDefinition = {
  id: string;
  name: string;
  subtitle: string;
  landmark: string;
  recommendedLevel: number;
  x: number;
  y: number;
  danger: "safe" | "frontier" | "hostile";
};

export type GuildMembership = {
  id: string;
  name: string;
  tag: string;
  founderId: string;
  joinedAt: number;
  renown: number;
};

export const GUILD_RANKS = [
  { name: "Initiate", renown: 0 },
  { name: "Trail Scout", renown: 40 },
  { name: "Orehaven Warden", renown: 120 },
  { name: "Guild Champion", renown: 260 },
  { name: "Realm Legend", renown: 500 },
] as const;

export function guildRankForRenown(renown: number) {
  const amount = Math.max(0, Math.floor(Number(renown) || 0));
  return [...GUILD_RANKS].reverse().find((rank) => amount >= rank.renown) ?? GUILD_RANKS[0];
}

export function nextGuildRankForRenown(renown: number) {
  const amount = Math.max(0, Math.floor(Number(renown) || 0));
  return GUILD_RANKS.find((rank) => rank.renown > amount) ?? null;
}

export type NpcDefinition = {
  id: string;
  name: string;
  role: string;
  frame: number;
  x: number;
  y: number;
  dialogue: string[];
  shop?: "weapons" | "tools";
  service?: "bank" | "workshop" | "activities" | "social";
};

export type ExpeditionDefinition = {
  id: string;
  name: string;
  crest: string;
  description: string;
  targetKind: EnemyDefinition["kind"];
  target: number;
  durationMs: number;
  recommendedTotalLevel: number;
  trackingKey: string;
  region: string;
  reward: {
    gold: number;
    defenseXp: number;
    hitpointsXp: number;
    itemId: string;
    quantity: number;
    guildRenown: number;
  };
};

export type TreasureClueDefinition = {
  id: string;
  title: string;
  clue: string;
  region: string;
  x: number;
  y: number;
};

export type EnemyDefinition = {
  id: string;
  name: string;
  kind: "rat" | "goblin" | "wolf" | "boar" | "slime" | "drake" | "dune-stalker" | "orc" | "lizard" | "skeleton" | "witch" | "treant";
  frame: number;
  level: number;
  x: number;
  y: number;
  maxHp: number;
  gold: [number, number];
  attackXp: number;
  rare?: boolean;
  passive?: boolean;
  respawnMs?: number;
  attackStyle?: CombatStyle;
  aggroRange?: number;
  speed?: number;
  visual?: {
    weapon: string;
    armor: string;
    scale?: number;
    auraColor?: number;
  };
};

export type BossIntroductionDefinition = {
  enemyId: string;
  epithet: string;
  signature: string;
  warning: string;
  accent: number;
};

export type ResourceDefinition = {
  id: string;
  name: string;
  kind: "ore" | "tree" | "fish" | "relic";
  frame: number;
  skill: SkillId;
  x: number;
  y: number;
  seconds: number;
  gold: number;
  xp: number;
  scale: number;
  requiredLevel: number;
  itemId: string;
};

export type DecorationDefinition = {
  id: string;
  name: string;
  kind: "campfire" | "torch" | "sign" | "banner" | "crate";
  frame: number;
  x: number;
  y: number;
  scale: number;
  alpha?: number;
};

export type QuestStepDefinition = {
  questId: string;
  chapter: string;
  questTitle: string;
  title: string;
  detail: string;
  target: string;
};

export type ItemDefinition = {
  id: string;
  name: string;
  category: "weapon" | "tool" | "armor" | "consumable" | "material";
  slot?: "weapon" | "tool" | "armor";
  cost: number;
  description: string;
  power?: number;
  healing?: number;
  tint?: number;
  artIndex?: number;
  artAtlas?: "equipment" | "material" | "adventure" | "trophy";
  combatStyle?: CombatStyle;
  requiredSkill?: SkillId;
  requiredLevel?: number;
  badge: string;
  rarity?: "common" | "uncommon" | "rare" | "epic";
  sellValue?: number;
  armorTrait?: ArmorTraitDefinition;
};

export type ArmorTraitDefinition = {
  id: string;
  name: string;
  detail: string;
  color: number;
  damageReduction?: number;
  healingMultiplier?: number;
};

export type WeaponAbilityDefinition = {
  id: string;
  name: string;
  badge: string;
  detail: string;
  multiplier: number;
  cooldownMs: number;
  color: number;
  hitCount?: number;
  status?: {
    kind: "stagger" | "slow" | "root" | "weaken";
    label: string;
    durationMs: number;
    strength?: number;
  };
  openingMultiplier?: number;
  executeThreshold?: number;
  executeMultiplier?: number;
};

export type SkillTreeNodeDefinition = {
  id: string;
  branch: CombatStyle;
  kind: "active" | "passive";
  name: string;
  badge: string;
  detail: string;
  requiredLevel: number;
  prerequisite?: string;
  prerequisites?: string[];
  requiresAll?: boolean;
  affinities?: CombatStyle[];
  tier?: "minor" | "notable" | "keystone";
  position: { x: number; y: number };
  multiplier: number;
  cooldownMs: number;
  color: number;
  areaRadius?: number;
  dot?: { ticks: number; intervalMs: number; multiplier: number };
  status?: {
    kind: "stagger" | "slow" | "root" | "weaken";
    label: string;
    durationMs: number;
    strength?: number;
  };
  passive?: {
    damageMultiplier?: number;
    cooldownMultiplier?: number;
    areaMultiplier?: number;
    dotMultiplier?: number;
    executeThreshold?: number;
    executeMultiplier?: number;
    damageReduction?: number;
  };
};

export type SkillTreeBonuses = {
  damageMultiplier: number;
  cooldownMultiplier: number;
  areaMultiplier: number;
  dotMultiplier: number;
  executeThreshold: number;
  executeMultiplier: number;
  damageReduction: number;
};

export type SkillTreeProgress = { unlocked: string[] };

export type RecipeDefinition = {
  id: string;
  name: string;
  profession: "smithing" | "crafting";
  requiredLevel: number;
  inputs: Array<{ itemId: string; quantity: number }>;
  output: { itemId: string; quantity: number };
  xp: number;
  description: string;
};

export type PlayerProgress = {
  gold: number;
  mint: number;
  hp: number;
  maxHp: number;
  skills: Record<SkillId, SkillProgress>;
  inventory: Record<string, number>;
  bank: Record<string, number>;
  equipped: { weapon: string; tool: string; armor: string };
  appearance: AppearanceId;
  customization: CharacterCustomization;
  questStep: number;
  questComplete: boolean;
  activities: ActivityProgress;
  collectionLog: Record<string, number>;
  guild: GuildMembership | null;
  treasureTrail: TreasureTrailProgress | null;
  waystones: string[];
  discoveries: string[];
  position: { x: number; y: number };
  skillTree: SkillTreeProgress;
  adventureClaims: string[];
  sideQuests: Record<string, SideQuestState>;
};

export const WORLD = { width: 1536, height: 9216 };
export const PLAYER_START = { x: 748, y: 505 };

export const TREASURE_CLUES: TreasureClueDefinition[] = [
  { id: "fountain-ledger", title: "The Founder's Ledger", clue: "Search west of Orehaven's old fountain, where merchants once counted the first guild tithe.", region: "Orehaven Square", x: 688, y: 468 },
  { id: "moonwater-mooring", title: "The Moonwater Mooring", clue: "Follow the western water to the final plank of the old Moonwater dock.", region: "Moonwater Dock", x: 282, y: 872 },
  { id: "sunstone-cache", title: "Beneath the Fallen Sun", clue: "The final mark waits on the road below the Old Sun Shrine, where its shadow points south.", region: "Old Sun Shrine", x: 320, y: 1300 },
];

export const WAYSTONES: readonly WaystoneDefinition[] = [
  { id: "orehaven-gate", name: "Orehaven Waystone", region: "Orehaven", x: 650, y: 820, arrivalX: 698, arrivalY: 820 },
  { id: "moonwater-dock", name: "Moonwater Waystone", region: "Western Woods", x: 282, y: 872, arrivalX: 302, arrivalY: 872 },
  { id: "eastern-quarry", name: "Quarry Waystone", region: "Eastern Quarry", x: 1248, y: 172, arrivalX: 1248, arrivalY: 204 },
  { id: "briarwild-crossing", name: "Briarwild Waystone", region: "Briarwild Crossing", x: 760, y: 1250, arrivalX: 760, arrivalY: 1290 },
  { id: "moonfen-marsh", name: "Moonfen Waystone", region: "Moonfen Marsh", x: 1060, y: 1340, arrivalX: 1096, arrivalY: 1340 },
  { id: "ranger-camp", name: "Ranger Camp Waystone", region: "Briarwild Ranger Camp", x: 246, y: 1640, arrivalX: 266, arrivalY: 1640 },
  { id: "sunstone-catacombs", name: "Catacomb Waystone", region: "Sunstone Catacombs", x: 768, y: 2192, arrivalX: 768, arrivalY: 2228 },
  { id: "moonfen-expanse", name: "Moonfen Expanse Waystone", region: "Moonfen Expanse", x: 768, y: 3260, arrivalX: 768, arrivalY: 3310 },
  { id: "emberfall-highlands", name: "Emberfall Waystone", region: "Emberfall Highlands", x: 768, y: 4300, arrivalX: 768, arrivalY: 4350 },
  { id: "frostmere-coast", name: "Frostmere Waystone", region: "Frostmere Coast", x: 260, y: 5500, arrivalX: 310, arrivalY: 5500 },
  { id: "sunscar-expanse", name: "Sunscar Waystone", region: "Sunscar Expanse", x: 230, y: 6620, arrivalX: 280, arrivalY: 6620 },
  { id: "guild-hall", name: "Guild Hall Waystone", region: "Orehaven Guild Hall", x: 608, y: 7788, arrivalX: 608, arrivalY: 7820 },
];

export const DUNGEON_PORTALS: readonly DungeonPortalDefinition[] = [
  { id: "sunstone-descent", name: "Sunstone Descent", region: "Sunstone Catacombs", x: 330, y: 1300, destinationX: 768, destinationY: 2140 },
  { id: "sunstone-ascent", name: "Sunstone Ascent", region: "Old Sun Shrine", x: 768, y: 2104, destinationX: 330, destinationY: 1332 },
  { id: "moonfen-descent", name: "Moonfen Floodgate", region: "Moonfen Expanse", x: 1310, y: 2880, destinationX: 768, destinationY: 3310 },
  { id: "moonfen-ascent", name: "Moonfen Return", region: "Sunstone Catacombs", x: 138, y: 3150, destinationX: 768, destinationY: 2228 },
  { id: "emberfall-ascent", name: "Emberfall Lift", region: "Emberfall Highlands", x: 1320, y: 4080, destinationX: 768, destinationY: 4350 },
  { id: "emberfall-descent", name: "Emberfall Return", region: "Moonfen Expanse", x: 160, y: 4170, destinationX: 768, destinationY: 3260 },
  { id: "frostmere-ascent", name: "Frostmere Gate", region: "Frostmere Coast", x: 768, y: 5165, destinationX: 768, destinationY: 5300 },
  { id: "frostmere-descent", name: "Frostmere Return", region: "Emberfall Highlands", x: 768, y: 6020, destinationX: 768, destinationY: 5050 },
  { id: "sunscar-ascent", name: "Sunscar Gate", region: "Sunscar Expanse", x: 768, y: 6165, destinationX: 768, destinationY: 6320 },
  { id: "sunscar-descent", name: "Sunscar Return", region: "Frostmere Coast", x: 768, y: 7050, destinationX: 768, destinationY: 6050 },
  { id: "guildhall-entry", name: "Guild Hall Doors", region: "Orehaven Guild Hall", x: 930, y: 200, destinationX: 1080, destinationY: 7420 },
  { id: "guildhall-exit", name: "Guild Hall Exit", region: "Orehaven", x: 768, y: 8120, destinationX: 1010, destinationY: 392 },
  { id: "icefang-descent", name: "Icefang Vault Descent", region: "Icefang Vault", x: 1350, y: 5850, destinationX: 768, destinationY: 9120 },
  { id: "icefang-ascent", name: "Icefang Vault Ascent", region: "Frostmere Coast", x: 768, y: 9128, destinationX: 1310, destinationY: 5840 },
];

export const REGIONS: readonly RegionDefinition[] = [
  { id: "orehaven", name: "Orehaven", subtitle: "Walls, workshops, and wayfarers", landmark: "Founders' Fountain", recommendedLevel: 1, x: 748, y: 505, danger: "safe" },
  { id: "western-woods", name: "Western Woods", subtitle: "Old timber beneath a restless canopy", landmark: "Heartpine Grove", recommendedLevel: 1, x: 250, y: 470, danger: "frontier" },
  { id: "moonwater-pond", name: "Moonwater Pond", subtitle: "Quiet waters and patient anglers", landmark: "Moonwater Dock", recommendedLevel: 1, x: 245, y: 785, danger: "safe" },
  { id: "eastern-quarry", name: "Eastern Quarry", subtitle: "Stone, ore, and ringing steel", landmark: "Copper Cut", recommendedLevel: 2, x: 1300, y: 330, danger: "frontier" },
  { id: "goblin-camp", name: "Goblin Camp", subtitle: "Hostile ground beyond the eastern road", landmark: "Firestarter's Watch", recommendedLevel: 4, x: 1260, y: 820, danger: "hostile" },
  { id: "southroad", name: "Southroad", subtitle: "The trail into untamed Briarwild", landmark: "South Gate", recommendedLevel: 5, x: 748, y: 900, danger: "frontier" },
  { id: "briarwild-crossing", name: "Briarwild Crossing", subtitle: "Where Orehaven's protection ends", landmark: "Briarwild Waystone", recommendedLevel: 7, x: 760, y: 1250, danger: "frontier" },
  { id: "old-sun-shrine", name: "Old Sun Shrine", subtitle: "Ancient stone remembers the dawn", landmark: "Sunstone Descent", recommendedLevel: 10, x: 500, y: 1280, danger: "hostile" },
  { id: "moonfen-marsh", name: "Moonfen Marsh", subtitle: "Cold lights drift over black water", landmark: "Oracle's Mire", recommendedLevel: 9, x: 1060, y: 1340, danger: "hostile" },
  { id: "ranger-camp", name: "Briarwild Ranger Camp", subtitle: "A hard-won frontier foothold", landmark: "Thornwatch Tower", recommendedLevel: 8, x: 500, y: 1600, danger: "safe" },
  { id: "raider-dens", name: "Raider Dens", subtitle: "Axes stir behind the thorn wall", landmark: "Ironhide Encampment", recommendedLevel: 11, x: 1180, y: 1600, danger: "hostile" },
  { id: "sunstone-catacombs", name: "Sunstone Catacombs", subtitle: "A buried kingdom wakes beneath the hill", landmark: "Aurex's Chamber", recommendedLevel: 18, x: 768, y: 2570, danger: "hostile" },
  { id: "moonfen-expanse", name: "Moonfen Expanse", subtitle: "Lanterns guide the last road through drowned ruins", landmark: "Drowned Altar", recommendedLevel: 26, x: 768, y: 3550, danger: "hostile" },
  { id: "emberfall-highlands", name: "Emberfall Highlands", subtitle: "Volcanic roads, star-forged ore, and the crater throne", landmark: "Caldera Throne", recommendedLevel: 34, x: 768, y: 4580, danger: "hostile" },
  { id: "frostmere-coast", name: "Frostmere Coast", subtitle: "Snowbound harbors, crystal caverns, and the last lighthouse", landmark: "Last Lighthouse", recommendedLevel: 40, x: 768, y: 5600, danger: "hostile" },
  { id: "sunscar-expanse", name: "Sunscar Expanse", subtitle: "Oases, observatories, and a sealed tomb beneath the red dunes", landmark: "Solar Tomb", recommendedLevel: 45, x: 768, y: 6650, danger: "hostile" },
  { id: "orehaven-guild-hall", name: "Orehaven Guild Hall", subtitle: "A warm hall for parties, plans, and the next expedition", landmark: "Expedition War Table", recommendedLevel: 1, x: 768, y: 7600, danger: "safe" },
  { id: "icefang-vault", name: "Icefang Vault", subtitle: "Frozen bridges cross an oathbound ruin beneath the coast", landmark: "The Rime Throne", recommendedLevel: 42, x: 768, y: 8640, danger: "hostile" },
];

export const REGION_DISCOVERY_REWARD_GOLD = 20;
export const REGION_COMPLETION_BONUS_GOLD = 180;

export const BOSS_INTRODUCTIONS: readonly BossIntroductionDefinition[] = [
  { enemyId: "goblin-firestarter", epithet: "Keeper of the Stolen Flame", signature: "Cinder Volley", warning: "Keep moving when the campfire sigils ignite.", accent: 0xff7a3d },
  { enemyId: "ironhide-grukk", epithet: "Warlord of the Thorn Dens", signature: "Ironquake", warning: "Break away before his ground strike lands.", accent: 0xd39b58 },
  { enemyId: "moonfen-oracle", epithet: "Voice Beneath Black Water", signature: "Moonwell Rupture", warning: "Leave the witch-light circle before it collapses.", accent: 0x78d9e8 },
  { enemyId: "sunstone-revenant", epithet: "The Fallen Sun King", signature: "Fallen Sun Eruption", warning: "Watch the ritual floor and move between eruptions.", accent: 0xffc55f },
  { enemyId: "moonfen-archon", epithet: "Sovereign of the Drowned Eclipse", signature: "Drowned Eclipse", warning: "Do not let the flooded altar trap your retreat.", accent: 0xa879e8 },
  { enemyId: "emberfall-caldera-lord", epithet: "Crown of the Burning Ridge", signature: "Caldera Breaker", warning: "Cross the shockwave before the throne erupts.", accent: 0xff7048 },
  { enemyId: "frostmere-lighthouse-warden", epithet: "The Last Oath in Ice", signature: "Aurora Verdict", warning: "Step beyond the aurora seal before judgment falls.", accent: 0x9ceaff },
  { enemyId: "sunscar-tomb-king", epithet: "Monarch of the Buried Sun", signature: "Solar Burial", warning: "Keep a clear path out of the solar tomb ring.", accent: 0xffc85a },
  { enemyId: "icefang-rimebound-king", epithet: "The Oath That Would Not Thaw", signature: "Rimefall Judgment", warning: "Cross the nearest bridge before the central rune freezes.", accent: 0x8de9ff },
];

export function normalizeDiscoveries(value: unknown) {
  const valid = new Set(REGIONS.map((region) => region.id));
  const discovered = Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && valid.has(id))
    : [];
  return Array.from(new Set(["orehaven", ...discovered]));
}

export function normalizeWaystones(value: unknown) {
  const valid = new Set(WAYSTONES.map((waystone) => waystone.id));
  const unlocked = Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && valid.has(id))
    : [];
  return Array.from(new Set(["orehaven-gate", ...unlocked]));
}

export const APPEARANCES: Array<{ id: AppearanceId; name: string; role: string; description: string }> = [
  { id: "vanguard", name: "Sunward Vanguard", role: "Human Adventurer", description: "Copper hair, guild blue, and a classic Orehaven silhouette." },
  { id: "ranger", name: "Oakbound Ranger", role: "Human Adventurer", description: "Earth tones and a close-cut field style built for the wilds." },
  { id: "arcanist", name: "Moonspark Arcanist", role: "Human Adventurer", description: "Violet hair and arcane cloth inspired by Moonwater magic." },
  { id: "stonewarden", name: "Stonewarden", role: "Orcish Guardian", description: "A broad-shouldered frontier defender with a battle-ready silhouette." },
  { id: "marshborn", name: "Marshborn Mystic", role: "Lizardfolk Adept", description: "A patient spellcaster shaped by Moonfen's cold lights and old water magic." },
];

export const FACE_STYLES: Array<{ id: FaceStyleId; name: string }> = [
  { id: "neutral", name: "Steady" },
  { id: "determined", name: "Determined" },
  { id: "cheerful", name: "Cheerful" },
  { id: "wide-eyed", name: "Wide-Eyed" },
];

export const HAIR_STYLES: Array<{ id: HairStyleId; name: string }> = [
  { id: "plain", name: "Traveler" },
  { id: "shorthawk", name: "Ranger Hawk" },
  { id: "spiked2", name: "Arcane Spikes" },
  { id: "afro", name: "Cloud Crown" },
  { id: "bob", name: "Wayfarer Bob" },
  { id: "cornrows", name: "Trail Braids" },
  { id: "buzzcut", name: "Sentinel Cut" },
];

export const BEARD_STYLES: Array<{ id: BeardStyleId; name: string }> = [
  { id: "none", name: "Clean Shaven" },
  { id: "stubble", name: "Trail Stubble" },
  { id: "trimmed", name: "Guild Trim" },
  { id: "winter", name: "Winter Beard" },
];

export const SKIN_TONES: Array<{ id: SkinToneId; name: string; tint: number; swatch: string }> = [
  { id: "ivory", name: "Ivory", tint: 0xfff7ef, swatch: "#fff7ef" },
  { id: "sunlit", name: "Sunlit", tint: 0xf0c7ad, swatch: "#f0c7ad" },
  { id: "warm", name: "Warm", tint: 0xd79d75, swatch: "#d79d75" },
  { id: "umber", name: "Umber", tint: 0xaa7358, swatch: "#aa7358" },
  { id: "deep", name: "Deep", tint: 0x704936, swatch: "#704936" },
];

export const HAIR_COLORS: Array<{ id: HairColorId; name: string; tint: number; swatch: string }> = [
  { id: "raven", name: "Raven", tint: 0x29262d, swatch: "#29262d" },
  { id: "chestnut", name: "Chestnut", tint: 0x74462f, swatch: "#74462f" },
  { id: "copper", name: "Copper", tint: 0xb86a3d, swatch: "#b86a3d" },
  { id: "silver", name: "Silver", tint: 0xd9e2ea, swatch: "#d9e2ea" },
  { id: "violet", name: "Violet", tint: 0x7556a6, swatch: "#7556a6" },
];

export const DYES: Array<{ id: DyeId; name: string; tint: number; swatch: string }> = [
  { id: "guild-blue", name: "Guild Blue", tint: 0x5d89b6, swatch: "#5d89b6" },
  { id: "leaf-green", name: "Leaf Green", tint: 0x719c5a, swatch: "#719c5a" },
  { id: "violet", name: "Moonspark", tint: 0x6d62aa, swatch: "#6d62aa" },
  { id: "crimson", name: "Crimson", tint: 0xa44c3f, swatch: "#a44c3f" },
  { id: "sand", name: "Sand", tint: 0xa78658, swatch: "#a78658" },
  { id: "charcoal", name: "Charcoal", tint: 0x34363e, swatch: "#34363e" },
  { id: "slate", name: "Slate", tint: 0x536278, swatch: "#536278" },
  { id: "brown", name: "Trail Brown", tint: 0x74523a, swatch: "#74523a" },
];

export const GEAR_DYES: Array<{ id: GearDyeId; name: string; tint: number | null; swatch: string }> = [
  { id: "original", name: "Original", tint: null, swatch: "linear-gradient(135deg, #d5c495 0 46%, #65766a 48% 100%)" },
  { id: "iron", name: "Tempered Iron", tint: 0xc4d0dc, swatch: "#c4d0dc" },
  { id: "sunsteel", name: "Sunsteel", tint: 0xf0c65f, swatch: "#f0c65f" },
  { id: "verdant", name: "Verdant", tint: 0x75b86f, swatch: "#75b86f" },
  { id: "moonsteel", name: "Moonsteel", tint: 0x8f96e5, swatch: "#8f96e5" },
  { id: "ember", name: "Emberforged", tint: 0xd66c4c, swatch: "#d66c4c" },
  { id: "obsidian", name: "Obsidian", tint: 0x596475, swatch: "#596475" },
];

export const HELMET_STYLES: Array<{ id: HelmetStyleId; name: string }> = [
  { id: "auto", name: "Armor set" },
  { id: "barbuta", name: "Sentinel" },
  { id: "greathelm", name: "Nightguard" },
  { id: "sugarloaf", name: "Sunforged" },
  { id: "plate", name: "War plate" },
];
export const CAPE_STYLES: Array<{ id: CapeStyleId; name: string }> = [
  { id: "auto", name: "Armor set" },
  { id: "solid", name: "Warden cape" },
  { id: "tattered", name: "Tattered cape" },
  { id: "briar", name: "Briar cloak" },
];
export const SHIELD_STYLES: Array<{ id: ShieldStyleId; name: string }> = [
  { id: "auto", name: "Armor set" },
  { id: "crusader", name: "Crusader shield" },
];

const APPEARANCE_CUSTOMIZATION: Record<AppearanceId, CharacterCustomization> = {
  vanguard: { faceStyle: "determined", hairStyle: "plain", beardStyle: "none", skinTone: "ivory", hairColor: "silver", shirtColor: "guild-blue", pantsColor: "slate", bootsColor: "brown", armorDye: "original", weaponDye: "original", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
  ranger: { faceStyle: "cheerful", hairStyle: "shorthawk", beardStyle: "stubble", skinTone: "warm", hairColor: "chestnut", shirtColor: "leaf-green", pantsColor: "charcoal", bootsColor: "brown", armorDye: "original", weaponDye: "original", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
  arcanist: { faceStyle: "wide-eyed", hairStyle: "spiked2", beardStyle: "none", skinTone: "sunlit", hairColor: "violet", shirtColor: "violet", pantsColor: "slate", bootsColor: "charcoal", armorDye: "original", weaponDye: "original", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
  stonewarden: { faceStyle: "determined", hairStyle: "plain", beardStyle: "none", skinTone: "umber", hairColor: "raven", shirtColor: "crimson", pantsColor: "charcoal", bootsColor: "brown", armorDye: "iron", weaponDye: "iron", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
  marshborn: { faceStyle: "wide-eyed", hairStyle: "plain", beardStyle: "none", skinTone: "deep", hairColor: "raven", shirtColor: "slate", pantsColor: "charcoal", bootsColor: "brown", armorDye: "moonsteel", weaponDye: "moonsteel", helmetStyle: "auto", capeStyle: "auto", shieldStyle: "auto", showHelmet: true, showCape: true, showShield: true, showWeapon: true },
};

export function customizationForAppearance(appearance: AppearanceId): CharacterCustomization {
  return { ...APPEARANCE_CUSTOMIZATION[appearance] };
}

export function normalizeCharacterCustomization(
  value: unknown,
  fallback = customizationForAppearance("vanguard"),
): CharacterCustomization {
  const candidate = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<CharacterCustomization>
    : {};
  const pick = <T extends string>(next: unknown, options: Array<{ id: T }>, prior: T) =>
    options.some((option) => option.id === next) ? next as T : prior;
  const pickVisibility = (next: unknown, prior: boolean) => typeof next === "boolean" ? next : prior;
  return {
    faceStyle: pick(candidate.faceStyle, FACE_STYLES, fallback.faceStyle),
    hairStyle: pick(candidate.hairStyle, HAIR_STYLES, fallback.hairStyle),
    beardStyle: pick(candidate.beardStyle, BEARD_STYLES, fallback.beardStyle),
    skinTone: pick(candidate.skinTone, SKIN_TONES, fallback.skinTone),
    hairColor: pick(candidate.hairColor, HAIR_COLORS, fallback.hairColor),
    shirtColor: pick(candidate.shirtColor, DYES, fallback.shirtColor),
    pantsColor: pick(candidate.pantsColor, DYES, fallback.pantsColor),
    bootsColor: pick(candidate.bootsColor, DYES, fallback.bootsColor),
    armorDye: pick(candidate.armorDye, GEAR_DYES, fallback.armorDye),
    weaponDye: pick(candidate.weaponDye, GEAR_DYES, fallback.weaponDye),
    helmetStyle: pick(candidate.helmetStyle, HELMET_STYLES, fallback.helmetStyle),
    capeStyle: pick(candidate.capeStyle, CAPE_STYLES, fallback.capeStyle),
    shieldStyle: pick(candidate.shieldStyle, SHIELD_STYLES, fallback.shieldStyle),
    showHelmet: pickVisibility(candidate.showHelmet, fallback.showHelmet),
    showCape: pickVisibility(candidate.showCape, fallback.showCape),
    showShield: pickVisibility(candidate.showShield, fallback.showShield),
    showWeapon: pickVisibility(candidate.showWeapon, fallback.showWeapon),
  };
}

export function gearDyeTint(original: number, dye: GearDyeId | undefined) {
  return GEAR_DYES.find((option) => option.id === dye)?.tint ?? original;
}

export function normalizeGuildMembership(value: unknown): GuildMembership | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<GuildMembership>;
  const id = typeof candidate.id === "string" ? candidate.id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 48) : "";
  const name = typeof candidate.name === "string" ? candidate.name.replace(/[^a-zA-Z0-9 '&-]/g, "").replace(/\s+/g, " ").trim().slice(0, 24) : "";
  const tag = typeof candidate.tag === "string" ? candidate.tag.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5) : "";
  const founderId = typeof candidate.founderId === "string" ? candidate.founderId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64) : "";
  if (!id || name.length < 3 || tag.length < 2) return null;
  return {
    id,
    name,
    tag,
    founderId,
    joinedAt: Math.max(0, Math.floor(Number(candidate.joinedAt) || Date.now())),
    renown: Math.max(0, Math.min(100_000, Math.floor(Number(candidate.renown) || 0))),
  };
}

export const SKILLS: Array<{ id: SkillId; label: string; short: string; color: string }> = [
  { id: "attack", label: "Attack", short: "ATK", color: "#d96a5d" },
  { id: "defense", label: "Defense", short: "DEF", color: "#7597c8" },
  { id: "hitpoints", label: "Hitpoints", short: "HP", color: "#d94e63" },
  { id: "range", label: "Range", short: "RNG", color: "#70a85f" },
  { id: "magic", label: "Magic", short: "MAG", color: "#6f7edb" },
  { id: "mining", label: "Mining", short: "MIN", color: "#a9b3c1" },
  { id: "woodcutting", label: "Woodcutting", short: "WOOD", color: "#8e6d43" },
  { id: "fishing", label: "Fishing", short: "FISH", color: "#4eacd0" },
  { id: "smithing", label: "Smithing", short: "SMTH", color: "#d78548" },
  { id: "crafting", label: "Crafting", short: "CRFT", color: "#b48bd1" },
];

export const QUEST_STEPS: readonly QuestStepDefinition[] = [
  { questId: "new-acre", chapter: "Chapter I", questTitle: "The First Spark", title: "Meet the Guild", detail: "Speak with Mira beside the fountain.", target: "Mira" },
  { questId: "new-acre", chapter: "Chapter I", questTitle: "The First Spark", title: "Tools of the Trade", detail: "Mine a copper outcrop in the eastern quarry.", target: "Copper" },
  { questId: "new-acre", chapter: "Chapter I", questTitle: "The First Spark", title: "Trouble at the Camp", detail: "Defeat the Camp Goblin guarding the southern road.", target: "Camp Goblin" },
  { questId: "new-acre", chapter: "Chapter I", questTitle: "The First Spark", title: "A Hero Returns", detail: "Return to Mira for your reward.", target: "Mira" },
  { questId: "pine-whispers", chapter: "Chapter I", questTitle: "Whispers in the Pines", title: "A Warden's Warning", detail: "Ask Mira about the trouble in the western woods.", target: "Mira" },
  { questId: "pine-whispers", chapter: "Chapter I", questTitle: "Whispers in the Pines", title: "Old-Growth Timber", detail: "Gather a log from the ancient oak in the western woods.", target: "Ancient Oak" },
  { questId: "pine-whispers", chapter: "Chapter I", questTitle: "Whispers in the Pines", title: "The Pinefang", detail: "Defeat the Pine Wolf stalking the northern trail.", target: "Pine Wolf" },
  { questId: "pine-whispers", chapter: "Chapter I", questTitle: "Whispers in the Pines", title: "Moonwater Supper", detail: "Catch a trout from Moonwater Pond.", target: "Fishing Ripples" },
  { questId: "pine-whispers", chapter: "Chapter I", questTitle: "Whispers in the Pines", title: "The Woods Remember", detail: "Return to Mira with news from the western woods.", target: "Mira" },
  { questId: "master-paths", chapter: "Chapter I", questTitle: "Master of Paths", title: "Warden of Orehaven", detail: "Speak with Mira when you are ready for advanced combat training.", target: "Mira" },
  { questId: "master-paths", chapter: "Chapter I", questTitle: "Master of Paths", title: "The Three Paths", detail: "Report to Korra outside the eastern forge.", target: "Korra" },
  { questId: "master-paths", chapter: "Chapter I", questTitle: "Master of Paths", title: "Feather and Fang", detail: "Equip the Oak Shortbow and defeat a Field Rat with ranged attacks.", target: "Field Rat" },
  { questId: "master-paths", chapter: "Chapter I", questTitle: "Master of Paths", title: "Fire Against Crystal", detail: "Equip the Ember Staff and defeat the Crystal Slime with magic.", target: "Crystal Slime" },
  { questId: "master-paths", chapter: "Chapter I", questTitle: "Master of Paths", title: "A Tool Made by Hand", detail: "Use Korra's workshop to forge an Iron Pickaxe.", target: "Workshop" },
  { questId: "master-paths", chapter: "Chapter I", questTitle: "Master of Paths", title: "Master of Paths", detail: "Return to Korra after completing all three disciplines.", target: "Korra" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "A Call South", detail: "Ask Mira about the warning beacons beyond the southern crossing.", target: "Mira" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "Ranger Muster", detail: "Find Ranger-Captain Lyra at the abandoned camp in Briarwild.", target: "Lyra Thorn" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "Thorns on the Trail", detail: "Defeat the Briar Stalker prowling the frontier road.", target: "Briar Stalker" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "The Sleeping Seal", detail: "Attune the Sunstone Seal inside the Old Sun Shrine.", target: "Sunstone Seal" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "Ash and Iron", detail: "Defeat the Orc Pathfinder scouting the ranger camp.", target: "Orc Pathfinder" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "Marshlight", detail: "Silence the Marshscale Mystic channeling Moonfen energy.", target: "Marshscale Mystic" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "Warden of the Dens", detail: "Defeat the Marshscale Warden guarding the raider caverns.", target: "Marshscale Warden" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "Frontier Report", detail: "Return to Lyra with the restored Sunstone shard.", target: "Lyra Thorn" },
  { questId: "briarwild-signal", chapter: "Chapter II", questTitle: "The Briarwild Signal", title: "Briarwild Warden", detail: "The frontier is secure. Speak with Lyra when you are ready to investigate the graves beneath Sunstone Hill.", target: "Lyra Thorn" },
  { questId: "sunbone-curse", chapter: "Chapter III", questTitle: "The Sunbone Curse", title: "Bones in the Briars", detail: "Defeat the Sunbone Wanderer haunting the road below the Old Sun Shrine.", target: "Sunbone Wanderer" },
  { questId: "sunbone-curse", chapter: "Chapter III", questTitle: "The Sunbone Curse", title: "Guardian of Dust", detail: "Break the Sunbone Guardian's hold on the ruined shrine trail.", target: "Sunbone Guardian" },
  { questId: "sunbone-curse", chapter: "Chapter III", questTitle: "The Sunbone Curse", title: "Moonfen Hex", detail: "Equip a staff and defeat the Moonfen Hexer with magic.", target: "Moonfen Hexer" },
  { questId: "sunbone-curse", chapter: "Chapter III", questTitle: "The Sunbone Curse", title: "A Ranger Remembered", detail: "Equip a bow and release the Fallen Ranger with a ranged attack.", target: "Fallen Ranger" },
  { questId: "sunbone-curse", chapter: "Chapter III", questTitle: "The Sunbone Curse", title: "Call of the Bonecaller", detail: "Defeat the Briar Bonecaller before the curse reaches Orehaven.", target: "Briar Bonecaller" },
  { questId: "sunbone-curse", chapter: "Chapter III", questTitle: "The Sunbone Curse", title: "Dawn Report", detail: "Return to Lyra at the ranger camp.", target: "Lyra Thorn" },
  { questId: "moonfen-eclipse", chapter: "Chapter IV", questTitle: "The Moonfen Eclipse", title: "Beyond the Briars", detail: "Ask Lyra about the drowned lights gathering beyond Briarwild.", target: "Lyra Thorn" },
  { questId: "moonfen-eclipse", chapter: "Chapter IV", questTitle: "The Moonfen Eclipse", title: "Lantern Without Flame", detail: "Defeat the Fen Wraith haunting Moonfen's northern lantern road.", target: "Fen Wraith" },
  { questId: "moonfen-eclipse", chapter: "Chapter IV", questTitle: "The Moonfen Eclipse", title: "Stone Beneath Black Water", detail: "Mine Gloomstone from a Moonfen vein to anchor the failing ward.", target: "Gloomstone Vein" },
  { questId: "moonfen-eclipse", chapter: "Chapter IV", questTitle: "The Moonfen Eclipse", title: "Drowned Eclipse", detail: "Defeat Nhalassa at the flooded altar before the marsh swallows the road.", target: "Nhalassa, Drowned Archon" },
  { questId: "moonfen-eclipse", chapter: "Chapter IV", questTitle: "The Moonfen Eclipse", title: "A Lantern Rekindled", detail: "Return to Lyra with the extinguished archon's sigil.", target: "Lyra Thorn" },
  { questId: "emberfall-crown", chapter: "Chapter V", questTitle: "The Emberfall Crown", title: "Korra's Expedition", detail: "Report to Korra for equipment capable of surviving Emberfall.", target: "Korra" },
  { questId: "emberfall-crown", chapter: "Chapter V", questTitle: "The Emberfall Crown", title: "Wings Over Ash", detail: "Defeat the Ashwing Drake hunting the western caldera road.", target: "Ashwing Drake" },
  { questId: "emberfall-crown", chapter: "Chapter V", questTitle: "The Emberfall Crown", title: "Heart of Emberstone", detail: "Mine Emberstone from the highland veins for Korra's heat shield.", target: "Emberstone Vein" },
  { questId: "emberfall-crown", chapter: "Chapter V", questTitle: "The Emberfall Crown", title: "Caldera Breaker", detail: "Defeat Varkul at the crater throne and break the Cinder Guard's rule.", target: "Varkul, Caldera Lord" },
  { questId: "emberfall-crown", chapter: "Chapter V", questTitle: "The Emberfall Crown", title: "Fire Tempered", detail: "Return to Korra with Varkul's broken crown.", target: "Korra" },
  { questId: "last-light", chapter: "Chapter VI", questTitle: "The Last Light", title: "The Darkened Coast", detail: "Find Keeper Elowen beside Frostmere's dead beacon road.", target: "Keeper Elowen" },
  { questId: "last-light", chapter: "Chapter VI", questTitle: "The Last Light", title: "Fang in the Snow", detail: "Defeat the Icefang Wolf stalking the frozen crossing.", target: "Icefang Wolf" },
  { questId: "last-light", chapter: "Chapter VI", questTitle: "The Last Light", title: "Frostglass Lens", detail: "Mine Frostglass to focus the lighthouse flame.", target: "Frostglass Vein" },
  { questId: "last-light", chapter: "Chapter VI", questTitle: "The Last Light", title: "Aurora Verdict", detail: "Defeat Eira at the lighthouse cliff and release her frozen oath.", target: "Eira, Lighthouse Warden" },
  { questId: "last-light", chapter: "Chapter VI", questTitle: "The Last Light", title: "Beacon at Dawn", detail: "Return to Elowen and relight the coast road.", target: "Keeper Elowen" },
  { questId: "buried-sun", chapter: "Chapter VII", questTitle: "The Buried Sun", title: "The Astronomer's Warning", detail: "Meet Scholar Samira beneath the Sunscar observatory.", target: "Scholar Samira" },
  { questId: "buried-sun", chapter: "Chapter VII", questTitle: "The Buried Sun", title: "Claws in the Dunes", detail: "Defeat the Dune Stalker prowling the oasis road.", target: "Dune Stalker" },
  { questId: "buried-sun", chapter: "Chapter VII", questTitle: "The Buried Sun", title: "A Suncrystal Key", detail: "Mine Suncrystal to open the buried court's solar lock.", target: "Suncrystal Vein" },
  { questId: "buried-sun", chapter: "Chapter VII", questTitle: "The Buried Sun", title: "Solar Burial", detail: "Defeat Khepri in the sealed tomb before the dead sun rises.", target: "Khepri, Tomb King" },
  { questId: "buried-sun", chapter: "Chapter VII", questTitle: "The Buried Sun", title: "The Seventh Dawn", detail: "Return to Samira with Khepri's solar seal.", target: "Scholar Samira" },
  { questId: "buried-sun", chapter: "Epilogue", questTitle: "Warden of Seven Roads", title: "Orehaven Endures", detail: "The province is open. Rare hunts, guild expeditions, world events, and mastery paths remain.", target: "Complete" },
];

export const BASE_NPCS: NpcDefinition[] = [
  {
    id: "guide",
    name: "Mira",
    role: "Guild Guide",
    frame: 0,
    x: 704,
    y: 515,
    dialogue: [
      "Orehaven is safe inside the walls. Beyond them, every trail teaches a different skill.",
      "Start with copper in the eastern quarry. Your pickaxe will do the rest once you begin.",
      "The goblins to the southeast have been stealing ore. Drive one away and return to me.",
      "You handled the camp well. There is stranger trouble beneath the western pines.",
      "The old oak has begun shedding silver bark. Bring me a log so I can inspect it.",
      "That timber bears claw marks. Find the Pine Wolf on the northern trail.",
      "The wolf was guarding something near Moonwater. Catch a trout from the pond.",
      "Return when you have sampled the water. Orehaven may need a new warden.",
      "The woods recognize you now. Wear this Sentinel Mail as proof of your service.",
      "You are a Warden of Orehaven. Korra can now teach you the ranged, arcane, and artisan paths.",
      "Korra is waiting outside the eastern forge. Tell her I sent you.",
    ],
  },
  {
    id: "banker",
    name: "Grent",
    role: "Banker",
    frame: 1,
    x: 1065,
    y: 595,
    dialogue: ["Your bank will protect equipment, materials, gold, and rare drops between sessions."],
    service: "bank",
  },
  {
    id: "smith",
    name: "Korra",
    role: "Blacksmith",
    frame: 2,
    x: 925,
    y: 455,
    dialogue: ["A better blade hits harder. A better pick shortens every mining job."],
    shop: "weapons",
    service: "workshop",
  },
  {
    id: "market",
    name: "Pip",
    role: "Merchant",
    frame: 3,
    x: 610,
    y: 445,
    dialogue: ["Gold buys everyday gear. I also pay fair coin for creature trophies, duplicate rare gear, and other field discoveries."],
    shop: "tools",
  },
  {
    id: "plots",
    name: "Acre Clerk",
    role: "Homestead Registrar",
    frame: 3,
    x: 760,
    y: 690,
    dialogue: ["Homesteads are private build spaces. Finish your town training before purchasing an acre."],
  },
  {
    id: "marshal",
    name: "Marshal Rowan",
    role: "Bounty Marshal",
    frame: 5,
    x: 846,
    y: 690,
    dialogue: [
      "The Adventurer Board refreshes each UTC day. General contracts reward any useful work, but marked bounties only count the creature family named on the notice.",
      "Goblin notices lead east. Marshscale contracts lead through Briarwild Crossing into Moonfen. Claim completed work before the board resets.",
    ],
    service: "activities",
  },
  {
    id: "captain",
    name: "Captain Thorne",
    role: "Expedition Captain",
    frame: 6,
    x: 800,
    y: 640,
    dialogue: [
      "The Moonfen roads are too dangerous for lone glory. Form a party, then I can authorize a timed expedition against the Marshscale patrols.",
      "Every expedition needs two contributors in the field. Standing together matters, but only adventurers present at the hunt receive the final reward.",
    ],
    service: "social",
  },
  {
    id: "ranger",
    name: "Lyra Thorn",
    role: "Ranger-Captain",
    frame: 4,
    x: 246,
    y: 1640,
    dialogue: [
      "Mira's signal reached us. Something in Moonfen is waking the old Sunstone wards.",
      "The Briar Stalker circles the crossing. Clear it before we move deeper into the wilds.",
      "The trail is open. Attune the seal inside the Old Sun Shrine and bring back its light.",
      "The seal points east, but an Orc Pathfinder has been tracking our camp. Stop the scout.",
      "Moonfen answers to a marshscale mystic. Break the channel before the wardens arrive.",
      "One final foe remains: the Marshscale Warden in the raider caverns.",
      "The signal burns gold again. You have earned the mantle of a Briarwild Warden.",
      "The signal exposed graves beneath Sunstone Hill. If you are ready, hunt the bones walking below the shrine.",
      "A Sunbone Wanderer carries the first mark. Shatter it on the shrine road.",
      "The lesser shade is gone. Its Guardian waits closer to the old stones.",
      "A Moonfen Hexer feeds the curse. Arcane force is the only clean way to unravel that spell.",
      "One of our fallen scouts still walks with her bow. Give her a ranger's ending from a distance.",
      "The Briar Bonecaller is exposed. End the ritual before dawn.",
      "The dead are quiet. Return to me and we will seal the hill together.",
      "Sunstone Hill is still. Wear this mail as the first Sunforged Warden of Orehaven.",
    ],
  },
  {
    id: "fen-cartographer",
    name: "Nessa Reedlight",
    role: "Moonfen Lantern Cartographer",
    frame: 11,
    x: 620,
    y: 3340,
    dialogue: [
      "Every Moonfen lantern marks a road that survived the flood. The western lights are fading, and travelers are vanishing with them.",
      "Gloomstone holds the marsh's cold fire. Bring me enough to relight the route, then we can deal with what hunts beyond it.",
    ],
  },
  {
    id: "ember-forgekeeper",
    name: "Dagan Flint",
    role: "Emberfall Forgekeeper",
    frame: 12,
    x: 900,
    y: 4420,
    dialogue: [
      "Emberfall's road is carved through a living furnace. Without fresh warding plates, the next ash storm will bury every traveler on it.",
      "The caldera veins carry metal that cools without cracking. Mine what you can, but keep an eye on the Cinder Guard below the ridge.",
    ],
  },
  {
    id: "frostkeeper",
    name: "Keeper Elowen",
    role: "Frostmere Beacon-Keeper",
    frame: 9,
    x: 742,
    y: 5570,
    dialogue: [
      "Frostmere's roads are open, but the lighthouse has gone dark. Without its lens, every ship and waystone on this coast is blind.",
      "The blue veins in the western cave and eastern cliffs hold the frostglass we need. Bring enough to wake the lens.",
    ],
  },
  {
    id: "sunscar-scholar",
    name: "Scholar Samira",
    role: "Sunscar Astronomer",
    frame: 10,
    x: 1010,
    y: 6520,
    dialogue: [
      "The observatory has tracked the buried court for a century. Tonight, its dead sun moved for the first time.",
      "The oasis remembers every eclipse. Its fish carry mineral traces that can reveal which tomb has awakened.",
    ],
  },
];

export const NPC_PORTRAIT_FRAMES: Record<string, number> = {
  guide: 0,
  banker: 1,
  smith: 2,
  market: 3,
  plots: 4,
  marshal: 5,
  captain: 6,
  ranger: 7,
  guildmaster: 8,
  quartermaster: 9,
  "hall-banker": 10,
  scribe: 11,
};

export const BASE_ENEMIES: EnemyDefinition[] = [
  { id: "rat-west", name: "Field Rat", kind: "rat", frame: 6, level: 1, x: 250, y: 590, maxHp: 18, gold: [4, 8], attackXp: 16 },
  { id: "goblin-camp-1", name: "Camp Goblin", kind: "goblin", frame: 4, level: 2, x: 1280, y: 880, maxHp: 30, gold: [10, 18], attackXp: 28 },
  { id: "goblin-camp-2", name: "Goblin Scavenger", kind: "goblin", frame: 4, level: 4, x: 1400, y: 940, maxHp: 46, gold: [18, 30], attackXp: 46, aggroRange: 110 },
  { id: "goblin-camp-sentry", name: "Goblin Sentry", kind: "goblin", frame: 4, level: 3, x: 1200, y: 816, maxHp: 38, gold: [13, 22], attackXp: 36, attackStyle: "range", aggroRange: 230, speed: 56 },
  { id: "goblin-camp-bruiser", name: "Goblin Bruiser", kind: "goblin", frame: 4, level: 5, x: 1392, y: 816, maxHp: 58, gold: [22, 34], attackXp: 56, aggroRange: 205, speed: 54 },
  {
    id: "goblin-firestarter",
    name: "Rikka the Firestarter",
    kind: "goblin",
    frame: 4,
    level: 7,
    x: 1312,
    y: 1088,
    maxHp: 82,
    gold: [46, 72],
    attackXp: 105,
    rare: true,
    respawnMs: 420_000,
    attackStyle: "range",
    aggroRange: 285,
    speed: 62,
    visual: { weapon: "iron-bow", armor: "", scale: 0.94, auraColor: 0xff8b42 },
  },
  { id: "wolf-forest", name: "Pine Wolf", kind: "wolf", frame: 5, level: 6, x: 225, y: 330, maxHp: 62, gold: [26, 42], attackXp: 68 },
  { id: "wolf-forest-2", name: "Pine Wolf", kind: "wolf", frame: 5, level: 5, x: 390, y: 500, maxHp: 54, gold: [22, 36], attackXp: 58, aggroRange: 210, speed: 68 },
  { id: "rat-east-road", name: "Roadside Rat", kind: "rat", frame: 6, level: 2, x: 1110, y: 760, maxHp: 24, gold: [6, 11], attackXp: 22, aggroRange: 130, speed: 44 },
  { id: "slime-mine", name: "Crystal Slime", kind: "slime", frame: 7, level: 5, x: 1328, y: 448, maxHp: 54, gold: [22, 38], attackXp: 58 },
  {
    id: "auric-slime",
    name: "Auric Slime",
    kind: "slime",
    frame: 7,
    level: 12,
    x: 980,
    y: 820,
    maxHp: 160,
    gold: [120, 200],
    attackXp: 180,
    rare: true,
    passive: true,
    respawnMs: 180_000,
  },
  { id: "briar-wolf-1", name: "Briar Wolf", kind: "wolf", frame: 5, level: 7, x: 680, y: 1380, maxHp: 74, gold: [30, 48], attackXp: 78, aggroRange: 230, speed: 68 },
  { id: "briar-wolf-2", name: "Briar Stalker", kind: "wolf", frame: 5, level: 9, x: 820, y: 1510, maxHp: 92, gold: [40, 62], attackXp: 98, aggroRange: 250, speed: 74 },
  { id: "briar-wolf-3", name: "Briar Prowler", kind: "wolf", frame: 5, level: 8, x: 460, y: 1440, maxHp: 82, gold: [34, 54], attackXp: 88, aggroRange: 235, speed: 72 },
  {
    id: "briar-treant",
    name: "Briar Treant",
    kind: "treant",
    frame: 0,
    level: 12,
    x: 720,
    y: 1450,
    maxHp: 188,
    gold: [88, 132],
    attackXp: 176,
    rare: true,
    passive: true,
    respawnMs: 480_000,
    aggroRange: 210,
    speed: 32,
  },
  { id: "bog-slime-1", name: "Bog Slime", kind: "slime", frame: 7, level: 6, x: 1030, y: 1345, maxHp: 66, gold: [25, 40], attackXp: 68, aggroRange: 175, speed: 38 },
  { id: "bog-slime-2", name: "Mire Slime", kind: "slime", frame: 7, level: 8, x: 1320, y: 1320, maxHp: 84, gold: [34, 52], attackXp: 88, aggroRange: 185, speed: 42 },
  { id: "bog-slime-3", name: "Fen Slime", kind: "slime", frame: 7, level: 7, x: 912, y: 1200, maxHp: 74, gold: [29, 46], attackXp: 78, aggroRange: 180, speed: 40 },
  { id: "orc-raider-1", name: "Orc Raider", kind: "orc", frame: 4, level: 8, x: 470, y: 1640, maxHp: 88, gold: [38, 58], attackXp: 92, aggroRange: 220, speed: 58 },
  { id: "orc-raider-2", name: "Orc Pathfinder", kind: "orc", frame: 4, level: 10, x: 520, y: 1540, maxHp: 108, gold: [48, 72], attackXp: 116, aggroRange: 240, speed: 64 },
  { id: "orc-raider-3", name: "Orc Campguard", kind: "orc", frame: 4, level: 9, x: 1050, y: 1700, maxHp: 98, gold: [42, 64], attackXp: 104, aggroRange: 230, speed: 60 },
  { id: "orc-raider-4", name: "Orc Marauder", kind: "orc", frame: 4, level: 11, x: 1344, y: 1664, maxHp: 120, gold: [54, 80], attackXp: 128, aggroRange: 250, speed: 64 },
  {
    id: "ironhide-grukk",
    name: "Ironhide Grukk",
    kind: "orc",
    frame: 4,
    level: 15,
    x: 1080,
    y: 1830,
    maxHp: 224,
    gold: [110, 168],
    attackXp: 236,
    rare: true,
    respawnMs: 600_000,
    aggroRange: 285,
    speed: 64,
    visual: { weapon: "dusk-sabre", armor: "sunforged-mail", scale: 1.13, auraColor: 0xffc95c },
  },
  { id: "lizard-mystic-1", name: "Marshscale Mystic", kind: "lizard", frame: 4, level: 10, x: 1088, y: 1520, maxHp: 104, gold: [52, 78], attackXp: 120, attackStyle: "magic", aggroRange: 270, speed: 50 },
  { id: "lizard-guard-1", name: "Marshscale Warden", kind: "lizard", frame: 4, level: 12, x: 1168, y: 1600, maxHp: 132, gold: [66, 94], attackXp: 148, aggroRange: 240, speed: 56 },
  { id: "lizard-scout-1", name: "Marshscale Scout", kind: "lizard", frame: 4, level: 9, x: 1230, y: 1765, maxHp: 88, gold: [42, 64], attackXp: 98, attackStyle: "range", aggroRange: 260, speed: 62 },
  { id: "lizard-scout-2", name: "Marshscale Hunter", kind: "lizard", frame: 4, level: 11, x: 1392, y: 1488, maxHp: 112, gold: [54, 82], attackXp: 124, attackStyle: "range", aggroRange: 275, speed: 62 },
  {
    id: "moonfen-oracle",
    name: "Ssavra, Moonfen Oracle",
    kind: "lizard",
    frame: 4,
    level: 16,
    x: 1360,
    y: 1456,
    maxHp: 206,
    gold: [118, 176],
    attackXp: 248,
    rare: true,
    respawnMs: 540_000,
    attackStyle: "magic",
    aggroRange: 320,
    speed: 54,
    visual: { weapon: "frostspire-staff", armor: "warden-mail", scale: 1.07, auraColor: 0x9d84ff },
  },
  { id: "sunbone-wanderer", name: "Sunbone Wanderer", kind: "skeleton", frame: 0, level: 7, x: 540, y: 1220, maxHp: 72, gold: [28, 44], attackXp: 76, aggroRange: 210, speed: 54 },
  { id: "sunbone-guardian", name: "Sunbone Guardian", kind: "skeleton", frame: 0, level: 10, x: 535, y: 1360, maxHp: 106, gold: [46, 70], attackXp: 112, aggroRange: 230, speed: 58 },
  { id: "sunbone-skirmisher", name: "Sunbone Skirmisher", kind: "skeleton", frame: 0, level: 8, x: 340, y: 1470, maxHp: 84, gold: [35, 54], attackXp: 90, aggroRange: 220, speed: 57 },
  { id: "fallen-ranger", name: "Fallen Ranger", kind: "skeleton", frame: 0, level: 9, x: 610, y: 1720, maxHp: 94, gold: [40, 62], attackXp: 102, attackStyle: "range", aggroRange: 270, speed: 54 },
  { id: "moonfen-hexer", name: "Moonfen Hexer", kind: "witch", frame: 0, level: 11, x: 870, y: 1390, maxHp: 110, gold: [55, 82], attackXp: 128, attackStyle: "magic", aggroRange: 285, speed: 48 },
  { id: "briar-bonecaller", name: "Briar Bonecaller", kind: "witch", frame: 0, level: 13, x: 860, y: 1740, maxHp: 142, gold: [76, 108], attackXp: 164, attackStyle: "magic", aggroRange: 300, speed: 52 },
  { id: "catacomb-sentinel", name: "Catacomb Sentinel", kind: "skeleton", frame: 0, level: 14, x: 720, y: 2400, maxHp: 158, gold: [72, 104], attackXp: 172, aggroRange: 235, speed: 55 },
  { id: "drowned-custodian", name: "Drowned Custodian", kind: "witch", frame: 0, level: 16, x: 1170, y: 2390, maxHp: 184, gold: [88, 126], attackXp: 204, attackStyle: "magic", aggroRange: 290, speed: 46 },
  { id: "emberbone-marksman", name: "Emberbone Marksman", kind: "skeleton", frame: 0, level: 15, x: 500, y: 2240, maxHp: 146, gold: [70, 102], attackXp: 180, attackStyle: "range", aggroRange: 285, speed: 52 },
  { id: "cryptflame-channeler", name: "Cryptflame Channeler", kind: "witch", frame: 0, level: 17, x: 1040, y: 2240, maxHp: 196, gold: [94, 132], attackXp: 218, attackStyle: "magic", aggroRange: 305, speed: 44 },
  {
    id: "sunstone-revenant",
    name: "Aurex, Sunstone Revenant",
    kind: "skeleton",
    frame: 0,
    level: 20,
    x: 768,
    y: 2690,
    maxHp: 310,
    gold: [155, 230],
    attackXp: 330,
    rare: true,
    respawnMs: 720_000,
    attackStyle: "magic",
    aggroRange: 330,
    speed: 50,
    visual: { weapon: "arcane-staff", armor: "sunforged-mail", scale: 1.16, auraColor: 0xffc85a },
  },
  { id: "moonfen-wraith-1", name: "Fen Wraith", kind: "witch", frame: 0, level: 18, x: 1040, y: 3330, maxHp: 220, gold: [104, 148], attackXp: 226, attackStyle: "magic", aggroRange: 280, speed: 46 },
  { id: "moonfen-stalker-1", name: "Drowned Stalker", kind: "wolf", frame: 5, level: 17, x: 520, y: 3470, maxHp: 186, gold: [92, 132], attackXp: 198, aggroRange: 220, speed: 66 },
  { id: "moonfen-sentinel-1", name: "Marsh Sentinel", kind: "skeleton", frame: 0, level: 19, x: 720, y: 3760, maxHp: 248, gold: [118, 168], attackXp: 242, attackStyle: "melee", aggroRange: 235, speed: 52 },
  {
    id: "moonfen-archon",
    name: "Nhalassa, Drowned Archon",
    kind: "witch",
    frame: 0,
    level: 24,
    x: 768,
    y: 3890,
    maxHp: 380,
    gold: [190, 280],
    attackXp: 380,
    rare: true,
    respawnMs: 900_000,
    attackStyle: "magic",
    aggroRange: 330,
    speed: 44,
    visual: { weapon: "frostspire-staff", armor: "moonweave-mantle", scale: 1.16, auraColor: 0x6fc8ff },
  },
  { id: "emberfall-ashwing-1", name: "Ashwing Drake", kind: "drake", frame: 5, level: 22, x: 440, y: 4440, maxHp: 264, gold: [132, 188], attackXp: 270, attackStyle: "range", aggroRange: 260, speed: 72 },
  { id: "emberfall-cinder-guard-1", name: "Cinder Guard", kind: "orc", frame: 4, level: 23, x: 1050, y: 4520, maxHp: 292, gold: [146, 214], attackXp: 292, aggroRange: 245, speed: 58 },
  { id: "emberfall-emberseer-1", name: "Emberseer", kind: "witch", frame: 0, level: 25, x: 1140, y: 4780, maxHp: 316, gold: [158, 232], attackXp: 326, attackStyle: "magic", aggroRange: 310, speed: 46 },
  {
    id: "emberfall-caldera-lord",
    name: "Varkul, Caldera Lord",
    kind: "orc",
    frame: 4,
    level: 30,
    x: 768,
    y: 4930,
    maxHp: 520,
    gold: [260, 380],
    attackXp: 520,
    rare: true,
    respawnMs: 1_080_000,
    attackStyle: "melee",
    aggroRange: 350,
    speed: 48,
    visual: { weapon: "auric-cleaver", armor: "sunforged-mail", scale: 1.2, auraColor: 0xff693d },
  },
  { id: "frostmere-icewolf-1", name: "Icefang Wolf", kind: "wolf", frame: 5, level: 27, x: 520, y: 5380, maxHp: 338, gold: [168, 238], attackXp: 340, aggroRange: 255, speed: 70 },
  { id: "frostmere-raider-1", name: "Frostbound Raider", kind: "orc", frame: 4, level: 28, x: 790, y: 5590, maxHp: 366, gold: [182, 258], attackXp: 366, aggroRange: 250, speed: 56 },
  { id: "frostmere-witch-1", name: "Glacier Seer", kind: "witch", frame: 0, level: 29, x: 1090, y: 5740, maxHp: 392, gold: [196, 276], attackXp: 398, attackStyle: "magic", aggroRange: 315, speed: 44 },
  {
    id: "frostmere-lighthouse-warden",
    name: "Eira, Lighthouse Warden",
    kind: "skeleton",
    frame: 0,
    level: 34,
    x: 1260,
    y: 5260,
    maxHp: 610,
    gold: [310, 440],
    attackXp: 620,
    rare: true,
    respawnMs: 1_200_000,
    attackStyle: "magic",
    aggroRange: 340,
    speed: 42,
    visual: { weapon: "frostspire-staff", armor: "moonweave-mantle", scale: 1.2, auraColor: 0x88d9ff },
  },
  { id: "sunscar-dune-stalker-1", name: "Dune Stalker", kind: "dune-stalker", frame: 5, level: 31, x: 440, y: 6450, maxHp: 430, gold: [215, 302], attackXp: 430, aggroRange: 260, speed: 74 },
  { id: "sunscar-sand-raider-1", name: "Sunscar Raider", kind: "orc", frame: 4, level: 32, x: 790, y: 6590, maxHp: 458, gold: [230, 318], attackXp: 458, aggroRange: 255, speed: 58 },
  { id: "sunscar-astral-seer-1", name: "Astral Seer", kind: "witch", frame: 0, level: 33, x: 1120, y: 6780, maxHp: 486, gold: [244, 336], attackXp: 490, attackStyle: "magic", aggroRange: 320, speed: 45 },
  {
    id: "sunscar-tomb-king",
    name: "Khepri, Tomb King",
    kind: "skeleton",
    frame: 0,
    level: 38,
    x: 330,
    y: 6270,
    maxHp: 720,
    gold: [360, 520],
    attackXp: 740,
    rare: true,
    respawnMs: 1_320_000,
    attackStyle: "magic",
    aggroRange: 360,
    speed: 40,
    visual: { weapon: "bonecaller-focus", armor: "sunforged-mail", scale: 1.22, auraColor: 0xffa33f },
  },
];

export const EXPEDITIONS: ExpeditionDefinition[] = [
  {
    id: "goblin-supply-raid",
    name: "Goblin Supply Raid",
    crest: "GC",
    description: "Break the camp patrol before its stolen supplies disappear into the eastern hills.",
    targetKind: "goblin",
    target: 2,
    durationMs: 8 * 60_000,
    recommendedTotalLevel: 10,
    trackingKey: "goblin",
    region: "Goblin Camp",
    reward: { gold: 80, defenseXp: 45, hitpointsXp: 20, itemId: "healing-potion", quantity: 1, guildRenown: 15 },
  },
  {
    id: "moonfen-purge",
    name: "Moonfen Purge",
    crest: "MF",
    description: "Hunt the Marshscale patrol while two or more party members hold the Moonfen line.",
    targetKind: "lizard",
    target: 3,
    durationMs: 12 * 60_000,
    recommendedTotalLevel: 30,
    trackingKey: "lizard",
    region: "Moonfen Marsh",
    reward: { gold: 140, defenseXp: 85, hitpointsXp: 35, itemId: "healing-potion", quantity: 1, guildRenown: 30 },
  },
  {
    id: "sunbone-cleansing",
    name: "Sunbone Cleansing",
    crest: "SB",
    description: "Cleanse the dead gathering between the Old Sun Shrine and the lost ranger road.",
    targetKind: "skeleton",
    target: 3,
    durationMs: 14 * 60_000,
    recommendedTotalLevel: 55,
    trackingKey: "skeleton",
    region: "Old Sun Shrine",
    reward: { gold: 220, defenseXp: 130, hitpointsXp: 55, itemId: "sunstone-shard", quantity: 1, guildRenown: 50 },
  },
];

export const BASE_RESOURCES: ResourceDefinition[] = [
  { id: "copper-1", name: "Copper Outcrop", kind: "ore", frame: 0, skill: "mining", x: 1380, y: 275, seconds: 5, gold: 8, xp: 28, scale: 0.17, requiredLevel: 1, itemId: "copper-ore" },
  { id: "copper-2", name: "Copper Outcrop", kind: "ore", frame: 0, skill: "mining", x: 1324, y: 350, seconds: 5, gold: 8, xp: 28, scale: 0.17, requiredLevel: 1, itemId: "copper-ore" },
  { id: "copper-3", name: "Copper Outcrop", kind: "ore", frame: 0, skill: "mining", x: 1238, y: 430, seconds: 5, gold: 8, xp: 28, scale: 0.17, requiredLevel: 1, itemId: "copper-ore" },
  { id: "iron-1", name: "Iron Outcrop", kind: "ore", frame: 1, skill: "mining", x: 1290, y: 165, seconds: 8, gold: 15, xp: 48, scale: 0.18, requiredLevel: 5, itemId: "iron-ore" },
  { id: "iron-2", name: "Iron Outcrop", kind: "ore", frame: 1, skill: "mining", x: 1405, y: 220, seconds: 8, gold: 15, xp: 48, scale: 0.18, requiredLevel: 5, itemId: "iron-ore" },
  { id: "oak-1", name: "Ancient Oak", kind: "tree", frame: 2, skill: "woodcutting", x: 132, y: 480, seconds: 6, gold: 7, xp: 30, scale: 0.22, requiredLevel: 1, itemId: "oak-log" },
  { id: "oak-2", name: "Ancient Oak", kind: "tree", frame: 2, skill: "woodcutting", x: 90, y: 560, seconds: 6, gold: 7, xp: 30, scale: 0.22, requiredLevel: 1, itemId: "oak-log" },
  { id: "oak-3", name: "Briar Oak", kind: "tree", frame: 2, skill: "woodcutting", x: 350, y: 1060, seconds: 7, gold: 9, xp: 38, scale: 0.22, requiredLevel: 3, itemId: "oak-log" },
  { id: "pine-1", name: "Pine Tree", kind: "tree", frame: 3, skill: "woodcutting", x: 220, y: 175, seconds: 8, gold: 11, xp: 44, scale: 0.21, requiredLevel: 5, itemId: "oak-log" },
  { id: "pine-2", name: "Pine Tree", kind: "tree", frame: 3, skill: "woodcutting", x: 145, y: 300, seconds: 8, gold: 11, xp: 44, scale: 0.21, requiredLevel: 5, itemId: "oak-log" },
  { id: "oak-4", name: "Ancient Oak", kind: "tree", frame: 2, skill: "woodcutting", x: 92, y: 380, seconds: 6, gold: 7, xp: 30, scale: 0.22, requiredLevel: 1, itemId: "oak-log" },
  { id: "oak-5", name: "Ancient Oak", kind: "tree", frame: 2, skill: "woodcutting", x: 520, y: 980, seconds: 6, gold: 7, xp: 30, scale: 0.22, requiredLevel: 1, itemId: "oak-log" },
  { id: "pine-3", name: "Pine Tree", kind: "tree", frame: 3, skill: "woodcutting", x: 300, y: 140, seconds: 8, gold: 11, xp: 44, scale: 0.21, requiredLevel: 5, itemId: "oak-log" },
  { id: "pine-4", name: "Pine Tree", kind: "tree", frame: 3, skill: "woodcutting", x: 1360, y: 1160, seconds: 8, gold: 11, xp: 44, scale: 0.21, requiredLevel: 5, itemId: "oak-log" },
  { id: "briar-oak-1", name: "Briar Oak", kind: "tree", frame: 2, skill: "woodcutting", x: 360, y: 1450, seconds: 7, gold: 9, xp: 38, scale: 0.22, requiredLevel: 3, itemId: "oak-log" },
  { id: "briar-oak-2", name: "Briar Oak", kind: "tree", frame: 2, skill: "woodcutting", x: 82, y: 1450, seconds: 7, gold: 9, xp: 38, scale: 0.22, requiredLevel: 3, itemId: "oak-log" },
  { id: "briar-oak-3", name: "Briar Oak", kind: "tree", frame: 2, skill: "woodcutting", x: 1260, y: 1400, seconds: 7, gold: 9, xp: 38, scale: 0.22, requiredLevel: 3, itemId: "oak-log" },
  { id: "briar-pine-1", name: "Briar Pine", kind: "tree", frame: 3, skill: "woodcutting", x: 180, y: 1460, seconds: 9, gold: 13, xp: 50, scale: 0.21, requiredLevel: 7, itemId: "oak-log" },
  { id: "briar-pine-2", name: "Briar Pine", kind: "tree", frame: 3, skill: "woodcutting", x: 520, y: 1540, seconds: 9, gold: 13, xp: 50, scale: 0.21, requiredLevel: 7, itemId: "oak-log" },
  { id: "briar-pine-3", name: "Briar Pine", kind: "tree", frame: 3, skill: "woodcutting", x: 900, y: 1840, seconds: 9, gold: 13, xp: 50, scale: 0.21, requiredLevel: 7, itemId: "oak-log" },
  { id: "briar-pine-4", name: "Briar Pine", kind: "tree", frame: 3, skill: "woodcutting", x: 420, y: 1880, seconds: 9, gold: 13, xp: 50, scale: 0.21, requiredLevel: 7, itemId: "oak-log" },
  { id: "briar-pine-5", name: "Briar Pine", kind: "tree", frame: 3, skill: "woodcutting", x: 1340, y: 1900, seconds: 9, gold: 13, xp: 50, scale: 0.21, requiredLevel: 7, itemId: "oak-log" },
  { id: "fish-1", name: "Fishing Ripples", kind: "fish", frame: 4, skill: "fishing", x: 245, y: 785, seconds: 7, gold: 10, xp: 36, scale: 0.12, requiredLevel: 1, itemId: "trout" },
  { id: "fish-2", name: "Fishing Ripples", kind: "fish", frame: 4, skill: "fishing", x: 185, y: 842, seconds: 7, gold: 10, xp: 36, scale: 0.12, requiredLevel: 1, itemId: "trout" },
  { id: "fish-3", name: "Moonfen Ripples", kind: "fish", frame: 4, skill: "fishing", x: 930, y: 1205, seconds: 9, gold: 14, xp: 52, scale: 0.12, requiredLevel: 6, itemId: "trout" },
  { id: "fish-4", name: "Moonfen Ripples", kind: "fish", frame: 4, skill: "fishing", x: 1185, y: 1270, seconds: 9, gold: 14, xp: 52, scale: 0.12, requiredLevel: 6, itemId: "trout" },
  { id: "sunstone-1", name: "Sunstone Seal", kind: "relic", frame: 6, skill: "magic", x: 320, y: 1248, seconds: 5, gold: 0, xp: 85, scale: 0.11, requiredLevel: 1, itemId: "sunstone-shard" },
  { id: "sunstone-vein-1", name: "Sunstone Vein", kind: "ore", frame: 1, skill: "mining", x: 280, y: 2360, seconds: 12, gold: 24, xp: 92, scale: 0.18, requiredLevel: 12, itemId: "sunstone-ore" },
  { id: "sunstone-vein-2", name: "Sunstone Vein", kind: "ore", frame: 1, skill: "mining", x: 240, y: 2480, seconds: 12, gold: 24, xp: 92, scale: 0.18, requiredLevel: 12, itemId: "sunstone-ore" },
  { id: "sunstone-vein-3", name: "Sunstone Vein", kind: "ore", frame: 1, skill: "mining", x: 360, y: 2280, seconds: 12, gold: 24, xp: 92, scale: 0.18, requiredLevel: 12, itemId: "sunstone-ore" },
  { id: "moonfen-fish-1", name: "Moonfen Ripples", kind: "fish", frame: 4, skill: "fishing", x: 1080, y: 3230, seconds: 12, gold: 22, xp: 88, scale: 0.12, requiredLevel: 14, itemId: "moonfin" },
  { id: "moonfen-fish-2", name: "Moonfen Ripples", kind: "fish", frame: 4, skill: "fishing", x: 1210, y: 3430, seconds: 12, gold: 22, xp: 88, scale: 0.12, requiredLevel: 14, itemId: "moonfin" },
  { id: "moonfen-ore-1", name: "Gloomstone Vein", kind: "ore", frame: 1, skill: "mining", x: 320, y: 3450, seconds: 15, gold: 34, xp: 118, scale: 0.18, requiredLevel: 16, itemId: "gloomstone-ore" },
  { id: "moonfen-ore-2", name: "Gloomstone Vein", kind: "ore", frame: 1, skill: "mining", x: 470, y: 3720, seconds: 15, gold: 34, xp: 118, scale: 0.18, requiredLevel: 16, itemId: "gloomstone-ore" },
  { id: "emberfall-ore-1", name: "Emberstone Vein", kind: "ore", frame: 1, skill: "mining", x: 330, y: 4450, seconds: 18, gold: 46, xp: 156, scale: 0.18, requiredLevel: 20, itemId: "emberstone-ore" },
  { id: "emberfall-ore-2", name: "Emberstone Vein", kind: "ore", frame: 1, skill: "mining", x: 1180, y: 4660, seconds: 18, gold: 46, xp: 156, scale: 0.18, requiredLevel: 20, itemId: "emberstone-ore" },
  { id: "emberfall-ore-3", name: "Star-Iron Vein", kind: "ore", frame: 1, skill: "mining", x: 820, y: 4860, seconds: 22, gold: 62, xp: 210, scale: 0.19, requiredLevel: 24, itemId: "star-iron" },
  { id: "emberfall-fish-1", name: "Craterpool Ripples", kind: "fish", frame: 4, skill: "fishing", x: 1180, y: 4220, seconds: 15, gold: 30, xp: 116, scale: 0.12, requiredLevel: 18, itemId: "ember-koi" },
  { id: "frostmere-ore-1", name: "Frostglass Vein", kind: "ore", frame: 1, skill: "mining", x: 360, y: 5240, seconds: 24, gold: 72, xp: 246, scale: 0.19, requiredLevel: 26, itemId: "frostglass-ore" },
  { id: "frostmere-ore-2", name: "Frostglass Vein", kind: "ore", frame: 1, skill: "mining", x: 1310, y: 5900, seconds: 25, gold: 76, xp: 260, scale: 0.19, requiredLevel: 28, itemId: "frostglass-ore" },
  { id: "frostmere-fish-1", name: "Icewater Ripples", kind: "fish", frame: 4, skill: "fishing", x: 1010, y: 5700, seconds: 18, gold: 38, xp: 144, scale: 0.12, requiredLevel: 24, itemId: "frosttrout" },
  { id: "sunscar-ore-1", name: "Suncrystal Vein", kind: "ore", frame: 1, skill: "mining", x: 1320, y: 6500, seconds: 27, gold: 86, xp: 286, scale: 0.2, requiredLevel: 30, itemId: "suncrystal-ore" },
  { id: "sunscar-ore-2", name: "Suncrystal Vein", kind: "ore", frame: 1, skill: "mining", x: 520, y: 6920, seconds: 28, gold: 92, xp: 302, scale: 0.2, requiredLevel: 32, itemId: "suncrystal-ore" },
  { id: "sunscar-fish-1", name: "Oasis Ripples", kind: "fish", frame: 4, skill: "fishing", x: 1090, y: 6740, seconds: 20, gold: 44, xp: 162, scale: 0.12, requiredLevel: 29, itemId: "sunscale-fish" },
];

export const BASE_DECORATIONS: DecorationDefinition[] = [
  { id: "goblin-campfire", name: "Goblin Campfire", kind: "campfire", frame: 7, x: 1234, y: 840, scale: 0.1, alpha: 0.82 },
  { id: "ranger-campfire", name: "Ranger Campfire", kind: "campfire", frame: 7, x: 244, y: 1602, scale: 0.085, alpha: 0.82 },
  { id: "raider-campfire", name: "Raider Campfire", kind: "campfire", frame: 7, x: 1085, y: 1782, scale: 0.075, alpha: 0.82 },
  { id: "southroad-sign", name: "Southroad Sign", kind: "sign", frame: 6, x: 748, y: 785, scale: 0.13, alpha: 0.9 },
];

type EditableWorldLayout = {
  version: number;
  npcs: NpcDefinition[];
  enemies: EnemyDefinition[];
  resources: ResourceDefinition[];
  decorations: DecorationDefinition[];
};

const worldLayout = editableWorldLayout as EditableWorldLayout;
export const NPCS: NpcDefinition[] = worldLayout.npcs.length ? worldLayout.npcs : BASE_NPCS;
const layoutEnemyIds = new Set(worldLayout.enemies.map((enemy) => enemy.id));
const layoutResourceIds = new Set(worldLayout.resources.map((resource) => resource.id));
export const ENEMIES: EnemyDefinition[] = worldLayout.enemies.length
  ? [...worldLayout.enemies, ...BASE_ENEMIES.filter((enemy) => !layoutEnemyIds.has(enemy.id))]
  : BASE_ENEMIES;
export const RESOURCES: ResourceDefinition[] = worldLayout.resources.length
  ? [...worldLayout.resources, ...BASE_RESOURCES.filter((resource) => !layoutResourceIds.has(resource.id))]
  : BASE_RESOURCES;
export const DECORATIONS: DecorationDefinition[] = worldLayout.decorations.length ? worldLayout.decorations : BASE_DECORATIONS;

export const ITEMS: ItemDefinition[] = [
  { id: "bronze-sword", name: "Bronze Longsword", category: "weapon", slot: "weapon", cost: 0, description: "Reliable starter blade. Skill: Shieldbreaker.", power: 2, artIndex: 0, combatStyle: "melee", badge: "BR" },
  { id: "iron-sword", name: "Iron Falchion", category: "weapon", slot: "weapon", cost: 120, description: "+2 melee power. Skill: Iron Tempest.", power: 4, artIndex: 1, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 5, badge: "IR" },
  { id: "rune-blade", name: "Rune-edge Blade", category: "weapon", slot: "weapon", cost: 480, description: "+5 melee power. Skill: Rune Rift.", power: 7, tint: 0x99e8ff, artIndex: 2, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 15, badge: "RN" },
  { id: "dusk-sabre", name: "Dusksteel Sabre", category: "weapon", slot: "weapon", cost: 820, description: "+9 melee power. Skill: Umbral Rush.", power: 11, tint: 0xc491ff, artIndex: 2, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 25, badge: "DS", rarity: "rare" },
  { id: "oak-bow", name: "Oak Shortbow", category: "weapon", slot: "weapon", cost: 95, description: "A quick bow. Skill: Thorn Volley.", power: 3, artIndex: 0, artAtlas: "adventure", combatStyle: "range", badge: "OB" },
  { id: "iron-bow", name: "Iron Warbow", category: "weapon", slot: "weapon", cost: 340, description: "A silver-drawn bow. Skill: Deadeye.", power: 6, artIndex: 1, artAtlas: "adventure", combatStyle: "range", requiredSkill: "range", requiredLevel: 8, badge: "IB" },
  { id: "stormbow", name: "Stormglass Longbow", category: "weapon", slot: "weapon", cost: 860, description: "+8 ranged power. Skill: Tempest Arrow.", power: 10, tint: 0x79eaff, artIndex: 1, artAtlas: "adventure", combatStyle: "range", requiredSkill: "range", requiredLevel: 22, badge: "SG", rarity: "rare" },
  { id: "ember-staff", name: "Ember Staff", category: "weapon", slot: "weapon", cost: 120, description: "Channels fire. Skill: Ember Wave.", power: 3, artIndex: 2, artAtlas: "adventure", combatStyle: "magic", badge: "ES" },
  { id: "arcane-staff", name: "Arcane Staff", category: "weapon", slot: "weapon", cost: 430, description: "A volatile crystal focus. Skill: Starfall.", power: 7, artIndex: 3, artAtlas: "adventure", combatStyle: "magic", requiredSkill: "magic", requiredLevel: 10, badge: "AS" },
  { id: "frostspire-staff", name: "Frostspire Staff", category: "weapon", slot: "weapon", cost: 880, description: "+8 magic power. Skill: Frost Nova.", power: 10, tint: 0xa7f4ff, artIndex: 3, artAtlas: "adventure", combatStyle: "magic", requiredSkill: "magic", requiredLevel: 22, badge: "FS", rarity: "rare" },
  { id: "bronze-pick", name: "Bronze Pickaxe", category: "tool", slot: "tool", cost: 0, description: "Starter mining tool.", power: 1, artIndex: 3, badge: "BP" },
  { id: "iron-pick", name: "Iron Pickaxe", category: "tool", slot: "tool", cost: 160, description: "Mining actions finish 20% faster.", power: 2, artIndex: 4, requiredSkill: "mining", requiredLevel: 5, badge: "IP" },
  { id: "crystal-pick", name: "Crystal Pickaxe", category: "tool", slot: "tool", cost: 620, description: "Mining actions finish 38% faster.", power: 3, tint: 0x79ddff, artIndex: 5, requiredSkill: "mining", requiredLevel: 15, badge: "CP" },
  { id: "sunstone-pick", name: "Sunstone Pickaxe", category: "tool", slot: "tool", cost: 0, description: "Mining actions finish 57% faster. Forged from ore found beneath Sunstone Hill.", power: 4, tint: 0xffc85a, artIndex: 5, requiredSkill: "mining", requiredLevel: 20, badge: "SP", rarity: "epic", sellValue: 480 },
  { id: "trailguard-vest", name: "Trailguard Vest", category: "armor", slot: "armor", cost: 145, description: "+8 maximum hitpoints. Wayfarer's Rest improves healing by 10%.", power: 8, tint: 0xbf9564, artIndex: 7, requiredSkill: "defense", requiredLevel: 1, badge: "TV", armorTrait: { id: "wayfarers-rest", name: "Wayfarer's Rest", detail: "Food, tonics, and Second Wind restore 10% more hitpoints.", color: 0xc9a56d, healingMultiplier: 1.1 } },
  { id: "sentinel-mail", name: "Sentinel Mail", category: "armor", slot: "armor", cost: 280, description: "+12 maximum hitpoints. Sentinel's Brace reduces incoming damage by 4%.", power: 12, tint: 0xffd77a, artIndex: 6, requiredSkill: "defense", requiredLevel: 5, badge: "SM", armorTrait: { id: "sentinels-brace", name: "Sentinel's Brace", detail: "Reduce incoming damage by 4% after flat armor is applied.", color: 0xe0bd62, damageReduction: 0.04 } },
  { id: "warden-mail", name: "Verdant Warden Mail", category: "armor", slot: "armor", cost: 520, description: "+20 maximum hitpoints. Living Bulwark reduces incoming damage by 6%.", power: 20, tint: 0xb9f58b, artIndex: 7, requiredSkill: "defense", requiredLevel: 12, badge: "WM", armorTrait: { id: "living-bulwark", name: "Living Bulwark", detail: "Reduce incoming damage by 6% after flat armor is applied.", color: 0x91cd72, damageReduction: 0.06 } },
  { id: "sunforged-mail", name: "Sunforged Warden Plate", category: "armor", slot: "armor", cost: 0, description: "+28 maximum hitpoints. Solar Ward reduces incoming damage by 8%.", power: 28, tint: 0xf1c75b, artIndex: 6, requiredSkill: "defense", requiredLevel: 18, badge: "SF", armorTrait: { id: "solar-ward", name: "Solar Ward", detail: "Reduce incoming damage by 8% after flat armor is applied.", color: 0xf0c252, damageReduction: 0.08 } },
  { id: "briarhide-cloak", name: "Briarhide Warden Cloak", category: "armor", slot: "armor", cost: 0, description: "+16 maximum hitpoints. Wild Renewal improves healing by 24%.", power: 16, tint: 0x6fc978, artIndex: 7, requiredSkill: "defense", requiredLevel: 8, badge: "BH", rarity: "rare", sellValue: 90, armorTrait: { id: "wild-renewal", name: "Wild Renewal", detail: "Food, tonics, and Second Wind restore 24% more hitpoints.", color: 0x70d486, healingMultiplier: 1.24 } },
  { id: "moonweave-mantle", name: "Moonweave Mantle", category: "armor", slot: "armor", cost: 760, description: "+26 maximum hitpoints. Lunar Mending improves healing and grants a light ward.", power: 26, tint: 0x8b8fe8, artIndex: 7, requiredSkill: "defense", requiredLevel: 20, badge: "MM", rarity: "rare", armorTrait: { id: "lunar-mending", name: "Lunar Mending", detail: "Restore 18% more hitpoints and reduce incoming damage by 4%.", color: 0xa59cf1, damageReduction: 0.04, healingMultiplier: 1.18 } },
  { id: "nightguard-plate", name: "Nightguard Plate", category: "armor", slot: "armor", cost: 920, description: "+34 maximum hitpoints. Midnight Bulwark reduces incoming damage by 10%.", power: 34, tint: 0x7195b8, artIndex: 6, requiredSkill: "defense", requiredLevel: 25, badge: "NP", rarity: "rare", armorTrait: { id: "midnight-bulwark", name: "Midnight Bulwark", detail: "Reduce incoming damage by 10% after flat armor is applied.", color: 0x7195b8, damageReduction: 0.1 } },
  { id: "auric-cleaver", name: "Auric Riftblade", category: "weapon", slot: "weapon", cost: 0, description: "+7 melee power. Crystallized inside an Auric Slime.", power: 9, tint: 0xffdc62, artIndex: 2, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 18, badge: "AU", rarity: "epic", sellValue: 350 },
  { id: "aurex-sunblade", name: "Aurex Sunblade", category: "weapon", slot: "weapon", cost: 0, description: "+10 melee power. Skill: Dawnfall. Earned by defeating the Sunstone Revenant.", power: 12, tint: 0xffc75a, artIndex: 2, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 24, badge: "AX", rarity: "epic", sellValue: 520 },
  { id: "fallen-recurve", name: "Fallen Ranger Recurve", category: "weapon", slot: "weapon", cost: 0, description: "+6 ranged power. The preserved bow of a lost Briarwild scout.", power: 8, tint: 0xa8ddff, artIndex: 1, artAtlas: "adventure", combatStyle: "range", requiredSkill: "range", requiredLevel: 14, badge: "FR", rarity: "rare", sellValue: 140 },
  { id: "bonecaller-focus", name: "Bonecaller Moonstaff", category: "weapon", slot: "weapon", cost: 0, description: "+6 magic power. Still hums with the Bonecaller's broken ritual.", power: 8, tint: 0xce84ff, artIndex: 3, artAtlas: "adventure", combatStyle: "magic", requiredSkill: "magic", requiredLevel: 14, badge: "BC", rarity: "rare", sellValue: 160 },
  { id: "sunscar-reaver", name: "Sunscar Reaver", category: "weapon", slot: "weapon", cost: 0, description: "+14 melee power. Skill: Solar Sever. Taken from Khepri's sealed armory.", power: 16, tint: 0xff8a43, artIndex: 2, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 36, badge: "SR", rarity: "epic", sellValue: 980 },
  { id: "aurora-longbow", name: "Aurora Longbow", category: "weapon", slot: "weapon", cost: 0, description: "+13 ranged power. Skill: Aurora Barrage. Its string hums with polar light.", power: 15, tint: 0x8be8ff, artIndex: 1, artAtlas: "adventure", combatStyle: "range", requiredSkill: "range", requiredLevel: 32, badge: "AL", rarity: "epic", sellValue: 920 },
  { id: "eclipse-staff", name: "Eclipse Starstaff", category: "weapon", slot: "weapon", cost: 0, description: "+14 magic power. Skill: Eclipse Well. A focus of buried solar and lunar magic.", power: 16, tint: 0xf3a6ff, artIndex: 3, artAtlas: "adventure", combatStyle: "magic", requiredSkill: "magic", requiredLevel: 36, badge: "ES", rarity: "epic", sellValue: 980 },
  { id: "frostguard-aegis", name: "Frostguard Aegis", category: "armor", slot: "armor", cost: 0, description: "+42 maximum hitpoints. Aurora Aegis reduces incoming damage by 12%.", power: 42, tint: 0x8eddf4, artIndex: 6, requiredSkill: "defense", requiredLevel: 32, badge: "FA", rarity: "epic", sellValue: 1_050, armorTrait: { id: "aurora-aegis", name: "Aurora Aegis", detail: "Reduce incoming damage by 12% after flat armor is applied.", color: 0x8eddf4, damageReduction: 0.12 } },
  { id: "trout", name: "River Trout", category: "consumable", cost: 0, description: "Restores 12 hitpoints.", healing: 12, artIndex: 0, artAtlas: "material", badge: "TR" },
  { id: "moonfin", name: "Moonfin", category: "consumable", cost: 0, description: "A cool marsh fish that restores 18 hitpoints.", healing: 18, tint: 0x73d8ca, artIndex: 0, artAtlas: "material", badge: "MF", rarity: "uncommon", sellValue: 8 },
  { id: "ember-koi", name: "Ember Koi", category: "consumable", cost: 0, description: "A warm craterpool fish that restores 24 hitpoints.", healing: 24, tint: 0xff8750, artIndex: 0, artAtlas: "material", badge: "EK", rarity: "uncommon", sellValue: 14 },
  { id: "frosttrout", name: "Frosttrout", category: "consumable", cost: 0, description: "An icewater catch that restores 32 hitpoints.", healing: 32, tint: 0x9feaff, artIndex: 0, artAtlas: "material", badge: "FT", rarity: "rare", sellValue: 22 },
  { id: "sunscale-fish", name: "Sunscale Fish", category: "consumable", cost: 0, description: "A radiant oasis catch that restores 40 hitpoints.", healing: 40, tint: 0xffd568, artIndex: 0, artAtlas: "material", badge: "SF", rarity: "rare", sellValue: 30 },
  { id: "copper-ore", name: "Copper Ore", category: "material", cost: 0, description: "A common smithing material.", artIndex: 1, artAtlas: "material", badge: "CU" },
  { id: "iron-ore", name: "Iron Ore", category: "material", cost: 0, description: "A sturdy smithing material.", artIndex: 2, artAtlas: "material", badge: "FE" },
  { id: "oak-log", name: "Oak Log", category: "material", cost: 0, description: "Useful for crafting.", artIndex: 3, artAtlas: "material", badge: "OK" },
  { id: "smithing-hammer", name: "Guild Smithing Hammer", category: "tool", cost: 0, description: "A heavy workshop hammer stamped with Korra's mark.", artIndex: 4, artAtlas: "adventure", badge: "SH" },
  { id: "crafter-kit", name: "Artisan's Kit", category: "tool", cost: 0, description: "Awl, thread, and treated hide for precise work.", artIndex: 5, artAtlas: "adventure", badge: "AK" },
  { id: "healing-potion", name: "Crimson Tonic", category: "consumable", cost: 45, description: "Restores 25 hitpoints.", healing: 25, artIndex: 6, artAtlas: "adventure", badge: "CT" },
  { id: "treasure-scroll", name: "Orehaven Treasure Scroll", category: "material", cost: 0, description: "Read it to begin a three-stage treasure trail across Orehaven Province.", artIndex: 7, artAtlas: "adventure", badge: "TS" },
  { id: "founders-relic", name: "Founder's Sun Relic", category: "material", cost: 0, description: "A rare guild-era relic recovered from an Orehaven treasure trail.", badge: "FR", rarity: "epic", sellValue: 110 },
  { id: "sunstone-shard", name: "Sunstone Shard", category: "material", cost: 0, description: "A warm fragment carrying the restored signal of the Old Sun Shrine.", artIndex: 11, artAtlas: "trophy", badge: "SS" },
  { id: "sunstone-ore", name: "Sunstone Ore", category: "material", cost: 0, description: "Dense golden ore mined from the forge wing of the Sunstone Catacombs.", artIndex: 11, artAtlas: "trophy", badge: "SO", rarity: "rare", sellValue: 34 },
  { id: "gloomstone-ore", name: "Gloomstone Ore", category: "material", cost: 0, description: "Moonfen ore that drinks in nearby light. Used in advanced focus binding.", tint: 0x8f79c9, artIndex: 11, artAtlas: "trophy", badge: "GO", rarity: "uncommon", sellValue: 42 },
  { id: "emberstone-ore", name: "Emberstone Ore", category: "material", cost: 0, description: "Heat-bearing highland ore used in volcanic smithing.", tint: 0xff7345, artIndex: 11, artAtlas: "trophy", badge: "EO", rarity: "uncommon", sellValue: 58 },
  { id: "star-iron", name: "Star-Iron", category: "material", cost: 0, description: "Dense meteoric metal found near Emberfall's caldera.", tint: 0xc8d5e3, artIndex: 11, artAtlas: "trophy", badge: "SI", rarity: "rare", sellValue: 78 },
  { id: "frostglass-ore", name: "Frostglass Ore", category: "material", cost: 0, description: "Translucent polar ore that holds an edge without losing its chill.", tint: 0x8be8ff, artIndex: 11, artAtlas: "trophy", badge: "FG", rarity: "rare", sellValue: 96 },
  { id: "suncrystal-ore", name: "Suncrystal Ore", category: "material", cost: 0, description: "Endgame crystal ore carrying the buried heat of Sunscar.", tint: 0xffc85a, artIndex: 11, artAtlas: "trophy", badge: "SC", rarity: "epic", sellValue: 125 },
  { id: "rat-tail", name: "Field Rat Tail", category: "material", cost: 0, description: "A common hunting trophy accepted by Orehaven collectors.", artIndex: 0, artAtlas: "trophy", badge: "RT", rarity: "common", sellValue: 2 },
  { id: "goblin-insignia", name: "Goblin Camp Insignia", category: "material", cost: 0, description: "A stolen brass mark recovered from the southern camp.", artIndex: 1, artAtlas: "trophy", badge: "GI", rarity: "common", sellValue: 5 },
  { id: "pinefang", name: "Pinefang", category: "material", cost: 0, description: "A sharp fang scented with the western pines.", artIndex: 2, artAtlas: "trophy", badge: "PF", rarity: "common", sellValue: 7 },
  { id: "crystal-residue", name: "Crystal Residue", category: "material", cost: 0, description: "Shimmering dust shed by quarry slimes.", artIndex: 3, artAtlas: "trophy", badge: "CR", rarity: "uncommon", sellValue: 9 },
  { id: "briar-hide", name: "Briar Wolf Hide", category: "material", cost: 0, description: "Tough hide threaded with living green briars.", artIndex: 4, artAtlas: "trophy", badge: "BW", rarity: "uncommon", sellValue: 12 },
  { id: "ember-hide", name: "Ember Tusk Hide", category: "material", cost: 0, description: "Heat-scarred hide shed by a boar that feeds beside volcanic roots.", artIndex: 5, artAtlas: "trophy", badge: "EH", rarity: "uncommon", sellValue: 16 },
  { id: "mire-essence", name: "Mire Essence", category: "material", cost: 0, description: "A cool globule of condensed Moonfen energy.", artIndex: 5, artAtlas: "trophy", badge: "ME", rarity: "uncommon", sellValue: 10 },
  { id: "orc-totem", name: "Raider Totem", category: "material", cost: 0, description: "A hand-carved war token from the Briarwild raiders.", artIndex: 6, artAtlas: "trophy", badge: "OT", rarity: "uncommon", sellValue: 14 },
  { id: "marshscale", name: "Enchanted Marshscale", category: "material", cost: 0, description: "A scale carrying a faint protective ward.", artIndex: 7, artAtlas: "trophy", badge: "MS", rarity: "uncommon", sellValue: 18 },
  { id: "sunbone-fragment", name: "Sunbone Fragment", category: "material", cost: 0, description: "A cleansed shard from the restless dead beneath Sunstone Hill.", artIndex: 8, artAtlas: "trophy", badge: "SB", rarity: "rare", sellValue: 22 },
  { id: "witch-thread", name: "Moonhex Thread", category: "material", cost: 0, description: "A strand of violet ritual thread that refuses to burn.", artIndex: 9, artAtlas: "trophy", badge: "MT", rarity: "rare", sellValue: 28 },
  { id: "auric-core", name: "Auric Slime Core", category: "material", cost: 0, description: "A radiant core from Orehaven's cooperative world event.", artIndex: 10, artAtlas: "trophy", badge: "AC", rarity: "epic", sellValue: 75 },
];

export const WEAPON_ABILITIES: Record<string, WeaponAbilityDefinition> = {
  "bronze-sword": { id: "shieldbreaker", name: "Shieldbreaker", badge: "SB", detail: "Heavy strike • staggers for 0.9s", multiplier: 1.42, cooldownMs: 4_500, color: 0xe4a45f, status: { kind: "stagger", label: "Staggered", durationMs: 900 } },
  "iron-sword": { id: "iron-tempest", name: "Iron Tempest", badge: "IT", detail: "Three cuts • weakens attacks by 20%", multiplier: 1.55, cooldownMs: 5_200, color: 0xd7e3ee, hitCount: 3, status: { kind: "weaken", label: "Weakened", durationMs: 3_500, strength: 0.2 } },
  "rune-blade": { id: "rune-rift", name: "Rune Rift", badge: "RR", detail: "Arcane rift • slows movement by 45%", multiplier: 1.72, cooldownMs: 6_200, color: 0x70e7ff, status: { kind: "slow", label: "Rift-slowed", durationMs: 4_200, strength: 0.45 } },
  "dusk-sabre": { id: "umbral-rush", name: "Umbral Rush", badge: "UR", detail: "Dusk blink • staggers for 1.4s", multiplier: 1.86, cooldownMs: 7_000, color: 0xbf7cff, status: { kind: "stagger", label: "Dusk-staggered", durationMs: 1_400 } },
  "auric-cleaver": { id: "auric-sunder", name: "Auric Sunder", badge: "AU", detail: "Deals 35% more damage below 25% health", multiplier: 1.95, cooldownMs: 7_500, color: 0xffd45d, executeThreshold: 0.25, executeMultiplier: 1.35 },
  "aurex-sunblade": { id: "dawnfall", name: "Dawnfall", badge: "DF", detail: "Solar cleave • three hits and a 1.8s stagger", multiplier: 2.08, cooldownMs: 7_800, color: 0xffbd52, hitCount: 3, status: { kind: "stagger", label: "Sunstruck", durationMs: 1_800 } },
  "oak-bow": { id: "thorn-volley", name: "Thorn Volley", badge: "TV", detail: "Three arrows • slows movement by 25%", multiplier: 1.4, cooldownMs: 4_800, color: 0x9fd56b, hitCount: 3, status: { kind: "slow", label: "Thorn-slowed", durationMs: 2_800, strength: 0.25 } },
  "iron-bow": { id: "deadeye", name: "Deadeye", badge: "DE", detail: "Deals 30% more damage above 85% health", multiplier: 1.68, cooldownMs: 6_000, color: 0xd9ecf4, openingMultiplier: 1.3 },
  "stormbow": { id: "tempest-arrow", name: "Tempest Arrow", badge: "TA", detail: "Lightning impact • slows movement by 60%", multiplier: 1.82, cooldownMs: 6_800, color: 0x67e7ff, status: { kind: "slow", label: "Storm-slowed", durationMs: 5_000, strength: 0.6 } },
  "fallen-recurve": { id: "ghost-volley", name: "Ghost Volley", badge: "GV", detail: "Three spectral arrows • weakens attacks by 35%", multiplier: 1.88, cooldownMs: 7_200, color: 0x9edfff, hitCount: 3, status: { kind: "weaken", label: "Haunted", durationMs: 5_000, strength: 0.35 } },
  "ember-staff": { id: "ember-wave", name: "Ember Wave", badge: "EW", detail: "Scorches and weakens attacks by 25%", multiplier: 1.5, cooldownMs: 5_400, color: 0xff8b42, status: { kind: "weaken", label: "Scorched", durationMs: 4_000, strength: 0.25 } },
  "arcane-staff": { id: "starfall", name: "Starfall", badge: "SF", detail: "Crushing star • staggers for 1.5s", multiplier: 1.78, cooldownMs: 6_500, color: 0x76dfff, status: { kind: "stagger", label: "Starstruck", durationMs: 1_500 } },
  "frostspire-staff": { id: "frost-nova", name: "Frost Nova", badge: "FN", detail: "Freezes the target in place for 2.2s", multiplier: 1.84, cooldownMs: 6_900, color: 0xa9f5ff, status: { kind: "root", label: "Frozen", durationMs: 2_200 } },
  "bonecaller-focus": { id: "moonbind", name: "Moonbind", badge: "MB", detail: "Binds the target in place for 3s", multiplier: 1.9, cooldownMs: 7_300, color: 0xca83ff, status: { kind: "root", label: "Moonbound", durationMs: 3_000 } },
  "sunscar-reaver": { id: "solar-sever", name: "Solar Sever", badge: "SS", detail: "Sunfire execution • deals 45% more damage below 30% health", multiplier: 2.18, cooldownMs: 8_400, color: 0xff8a43, executeThreshold: 0.3, executeMultiplier: 1.45 },
  "aurora-longbow": { id: "aurora-barrage", name: "Aurora Barrage", badge: "AB", detail: "Five polar arrows • weakens attacks by 45%", multiplier: 2.08, cooldownMs: 8_100, color: 0x8be8ff, hitCount: 5, status: { kind: "weaken", label: "Aurora-marked", durationMs: 6_000, strength: 0.45 } },
  "eclipse-staff": { id: "eclipse-well", name: "Eclipse Well", badge: "EW", detail: "Collapsing star • roots the target for 3.5s", multiplier: 2.2, cooldownMs: 8_500, color: 0xf3a6ff, status: { kind: "root", label: "Eclipsed", durationMs: 3_500 } },
};

export function weaponAbility(itemId: string) {
  return WEAPON_ABILITIES[itemId] ?? WEAPON_ABILITIES["bronze-sword"];
}

export const SKILL_TREE_NODES: readonly SkillTreeNodeDefinition[] = [
  { id: "whirlwind", branch: "melee", kind: "active", tier: "notable", name: "Whirlwind", badge: "WW", detail: "Spin through every enemy in a 112px circle", requiredLevel: 1, multiplier: 1.05, cooldownMs: 9_000, color: 0xf1a64f, areaRadius: 112, position: { x: 570, y: 610 } },
  { id: "tempered-body", branch: "melee", kind: "passive", tier: "notable", name: "Tempered Body", badge: "TB", detail: "Reduce all incoming damage by 4%", requiredLevel: 3, prerequisite: "whirlwind", multiplier: 1, cooldownMs: 0, color: 0xd79a5d, passive: { damageReduction: 0.04 }, position: { x: 450, y: 700 } },
  { id: "bloodletter", branch: "melee", kind: "active", tier: "notable", name: "Bloodletter", badge: "BL", detail: "Deep strike followed by 4 bleeding damage ticks", requiredLevel: 5, prerequisite: "tempered-body", multiplier: 0.82, cooldownMs: 11_000, color: 0xe55f55, dot: { ticks: 4, intervalMs: 1_000, multiplier: 0.28 }, position: { x: 335, y: 790 } },
  { id: "blade-discipline", branch: "melee", kind: "passive", tier: "notable", name: "Blade Discipline", badge: "BD", detail: "Increase melee damage by 8%", requiredLevel: 10, prerequisite: "bloodletter", multiplier: 1, cooldownMs: 0, color: 0xf0b25c, passive: { damageMultiplier: 1.08 }, position: { x: 245, y: 900 } },
  { id: "relentless", branch: "melee", kind: "passive", name: "Relentless", badge: "RL", detail: "Reduce weapon-tree cooldowns by 12%", requiredLevel: 16, prerequisite: "blade-discipline", multiplier: 1, cooldownMs: 0, color: 0xe8c16d, passive: { cooldownMultiplier: 0.88 }, position: { x: 180, y: 1020 } },
  { id: "wide-arc", branch: "melee", kind: "passive", name: "Wide Arc", badge: "WA", detail: "Increase melee area effects by 22%", requiredLevel: 23, prerequisite: "relentless", multiplier: 1, cooldownMs: 0, color: 0xe69a45, passive: { areaMultiplier: 1.22 }, position: { x: 260, y: 1135 } },
  { id: "executioner", branch: "melee", kind: "passive", tier: "notable", name: "Executioner", badge: "EX", detail: "Deal 22% more damage to enemies below 30% health", requiredLevel: 31, prerequisite: "wide-arc", multiplier: 1, cooldownMs: 0, color: 0xe2614d, passive: { executeThreshold: 0.3, executeMultiplier: 1.22 }, position: { x: 390, y: 1190 } },
  { id: "unyielding", branch: "melee", kind: "passive", tier: "keystone", name: "Unyielding", badge: "UY", detail: "Gain 7% more melee damage and 5% damage reduction", requiredLevel: 40, prerequisite: "executioner", multiplier: 1, cooldownMs: 0, color: 0xffd06b, passive: { damageMultiplier: 1.07, damageReduction: 0.05 }, position: { x: 530, y: 1160 } },
  { id: "iron-grip", branch: "melee", kind: "passive", name: "Iron Grip", badge: "IG", detail: "Increase melee damage by 3%", requiredLevel: 2, prerequisite: "whirlwind", multiplier: 1, cooldownMs: 0, color: 0xd6a063, passive: { damageMultiplier: 1.03 }, position: { x: 455, y: 575 } },
  { id: "guarded-heart", branch: "melee", kind: "passive", name: "Guarded Heart", badge: "GH", detail: "Reduce incoming damage by 2%", requiredLevel: 4, prerequisites: ["iron-grip", "tempered-body"], multiplier: 1, cooldownMs: 0, color: 0xcc8b58, passive: { damageReduction: 0.02 }, position: { x: 345, y: 635 } },
  { id: "sweeping-edge", branch: "melee", kind: "passive", name: "Sweeping Edge", badge: "SE", detail: "Increase area effects by 12%", requiredLevel: 6, prerequisite: "whirlwind", multiplier: 1, cooldownMs: 0, color: 0xe7a34f, passive: { areaMultiplier: 1.12 }, position: { x: 565, y: 755 } },
  { id: "crimson-flow", branch: "melee", kind: "passive", tier: "notable", name: "Crimson Flow", badge: "CF", detail: "Bleeds and burns deal 15% more damage", requiredLevel: 12, prerequisites: ["bloodletter", "sweeping-edge"], multiplier: 1, cooldownMs: 0, color: 0xe15e55, passive: { dotMultiplier: 1.15 }, position: { x: 445, y: 855 } },
  { id: "duelist-tempo", branch: "melee", kind: "passive", name: "Duelist Tempo", badge: "DT", detail: "Tree skills recover 6% faster", requiredLevel: 18, prerequisite: "blade-discipline", multiplier: 1, cooldownMs: 0, color: 0xe3bc70, passive: { cooldownMultiplier: 0.94 }, position: { x: 370, y: 980 } },
  { id: "war-banner", branch: "melee", kind: "passive", tier: "notable", name: "War Banner", badge: "WB", detail: "Gain 5% damage and 2% damage reduction", requiredLevel: 26, prerequisites: ["duelist-tempo", "relentless"], multiplier: 1, cooldownMs: 0, color: 0xf0c060, passive: { damageMultiplier: 1.05, damageReduction: 0.02 }, position: { x: 475, y: 1060 } },
  { id: "groundbreaker", branch: "melee", kind: "active", tier: "notable", name: "Groundbreaker", badge: "GB", detail: "Crack the earth in a 126px shockwave and stagger every target", requiredLevel: 28, prerequisites: ["war-banner", "wide-arc"], requiresAll: true, multiplier: 1.18, cooldownMs: 14_000, color: 0xffb34f, areaRadius: 126, status: { kind: "stagger", label: "Quake-staggered", durationMs: 1_250 }, position: { x: 610, y: 1040 } },
  { id: "spellblade-oath", branch: "melee", affinities: ["melee", "magic"], kind: "passive", tier: "keystone", name: "Spellblade Oath", badge: "SO", detail: "Melee and magic attacks gain 8% damage", requiredLevel: 20, prerequisites: ["crimson-flow", "runic-intensity"], requiresAll: true, multiplier: 1, cooldownMs: 0, color: 0xf08d7c, passive: { damageMultiplier: 1.08 }, position: { x: 700, y: 690 } },
  { id: "deadeye-duelist", branch: "melee", affinities: ["melee", "range"], kind: "passive", tier: "keystone", name: "Deadeye Duelist", badge: "DD", detail: "Melee and ranged tree skills recover 9% faster", requiredLevel: 24, prerequisites: ["wide-arc", "rapid-nocking"], requiresAll: true, multiplier: 1, cooldownMs: 0, color: 0xdacb64, passive: { cooldownMultiplier: 0.91 }, position: { x: 760, y: 920 } },

  { id: "arrow-rain", branch: "range", kind: "active", tier: "notable", name: "Arrow Rain", badge: "AR", detail: "Blanket a 144px target area with falling arrows", requiredLevel: 1, multiplier: 0.92, cooldownMs: 10_000, color: 0xa9df67, areaRadius: 144, position: { x: 1130, y: 610 } },
  { id: "steady-hands", branch: "range", kind: "passive", tier: "notable", name: "Steady Hands", badge: "SH", detail: "Increase ranged damage by 6%", requiredLevel: 3, prerequisite: "arrow-rain", multiplier: 1, cooldownMs: 0, color: 0x9ed36f, passive: { damageMultiplier: 1.06 }, position: { x: 1250, y: 700 } },
  { id: "venom-shot", branch: "range", kind: "active", tier: "notable", name: "Venom Shot", badge: "VS", detail: "Poisoned arrow followed by 5 venom damage ticks", requiredLevel: 5, prerequisite: "steady-hands", multiplier: 0.72, cooldownMs: 12_000, color: 0x74d45a, dot: { ticks: 5, intervalMs: 900, multiplier: 0.24 }, position: { x: 1365, y: 790 } },
  { id: "toxin-lore", branch: "range", kind: "passive", tier: "notable", name: "Toxin Lore", badge: "TL", detail: "Increase damage-over-time effects by 25%", requiredLevel: 10, prerequisite: "venom-shot", multiplier: 1, cooldownMs: 0, color: 0x70c95a, passive: { dotMultiplier: 1.25 }, position: { x: 1455, y: 900 } },
  { id: "rapid-nocking", branch: "range", kind: "passive", name: "Rapid Nocking", badge: "RN", detail: "Reduce weapon-tree cooldowns by 14%", requiredLevel: 16, prerequisite: "toxin-lore", multiplier: 1, cooldownMs: 0, color: 0xb6dc72, passive: { cooldownMultiplier: 0.86 }, position: { x: 1520, y: 1020 } },
  { id: "storm-quiver", branch: "range", kind: "passive", name: "Storm Quiver", badge: "SQ", detail: "Increase ranged area effects by 28%", requiredLevel: 23, prerequisite: "rapid-nocking", multiplier: 1, cooldownMs: 0, color: 0x78cda0, passive: { areaMultiplier: 1.28 }, position: { x: 1440, y: 1135 } },
  { id: "predators-focus", branch: "range", kind: "passive", tier: "notable", name: "Predator's Focus", badge: "PF", detail: "Deal 18% more damage to enemies below 35% health", requiredLevel: 31, prerequisite: "storm-quiver", multiplier: 1, cooldownMs: 0, color: 0xb9e56f, passive: { executeThreshold: 0.35, executeMultiplier: 1.18 }, position: { x: 1310, y: 1190 } },
  { id: "windrunner", branch: "range", kind: "passive", tier: "keystone", name: "Windrunner", badge: "WR", detail: "Gain 10% ranged damage and 3% damage reduction", requiredLevel: 40, prerequisite: "predators-focus", multiplier: 1, cooldownMs: 0, color: 0xd2f08a, passive: { damageMultiplier: 1.1, damageReduction: 0.03 }, position: { x: 1170, y: 1160 } },
  { id: "eagle-eye", branch: "range", kind: "passive", name: "Eagle Eye", badge: "EE", detail: "Increase ranged damage by 3%", requiredLevel: 2, prerequisite: "arrow-rain", multiplier: 1, cooldownMs: 0, color: 0xa7d477, passive: { damageMultiplier: 1.03 }, position: { x: 1245, y: 575 } },
  { id: "fleet-fletching", branch: "range", kind: "passive", name: "Fleet Fletching", badge: "FF", detail: "Tree skills recover 5% faster", requiredLevel: 4, prerequisites: ["eagle-eye", "steady-hands"], multiplier: 1, cooldownMs: 0, color: 0x9bc76d, passive: { cooldownMultiplier: 0.95 }, position: { x: 1355, y: 635 } },
  { id: "split-shaft", branch: "range", kind: "passive", name: "Split Shaft", badge: "SS", detail: "Increase area effects by 14%", requiredLevel: 6, prerequisite: "arrow-rain", multiplier: 1, cooldownMs: 0, color: 0x8fcf83, passive: { areaMultiplier: 1.14 }, position: { x: 1135, y: 755 } },
  { id: "serpent-fletching", branch: "range", kind: "passive", tier: "notable", name: "Serpent Fletching", badge: "SF", detail: "Poisons and burns deal 18% more damage", requiredLevel: 12, prerequisites: ["venom-shot", "split-shaft"], multiplier: 1, cooldownMs: 0, color: 0x6ec961, passive: { dotMultiplier: 1.18 }, position: { x: 1255, y: 855 } },
  { id: "hunters-patience", branch: "range", kind: "passive", name: "Hunter's Patience", badge: "HP", detail: "Gain 3% damage reduction", requiredLevel: 18, prerequisite: "toxin-lore", multiplier: 1, cooldownMs: 0, color: 0xa8d07a, passive: { damageReduction: 0.03 }, position: { x: 1330, y: 980 } },
  { id: "storm-sight", branch: "range", kind: "passive", tier: "notable", name: "Storm Sight", badge: "ST", detail: "Gain 6% ranged damage and 10% area", requiredLevel: 26, prerequisites: ["hunters-patience", "rapid-nocking"], multiplier: 1, cooldownMs: 0, color: 0x78d2b0, passive: { damageMultiplier: 1.06, areaMultiplier: 1.1 }, position: { x: 1225, y: 1060 } },
  { id: "pinning-volley", branch: "range", kind: "active", tier: "notable", name: "Pinning Volley", badge: "PV", detail: "Rain barbed arrows across 156px and heavily slow every target", requiredLevel: 28, prerequisites: ["storm-sight", "storm-quiver"], requiresAll: true, multiplier: 1.02, cooldownMs: 14_500, color: 0x7ee3b2, areaRadius: 156, status: { kind: "slow", label: "Pinned", durationMs: 4_000, strength: 0.58 }, position: { x: 1090, y: 1040 } },
  { id: "arcane-marksman", branch: "range", affinities: ["range", "magic"], kind: "passive", tier: "keystone", name: "Arcane Marksman", badge: "AM", detail: "Ranged and magic area effects grow by 18%", requiredLevel: 20, prerequisites: ["serpent-fletching", "unstable-echo"], requiresAll: true, multiplier: 1, cooldownMs: 0, color: 0x88cde5, passive: { areaMultiplier: 1.18 }, position: { x: 1000, y: 690 } },
  { id: "shadow-skirmisher", branch: "range", affinities: ["range", "melee"], kind: "passive", tier: "keystone", name: "Shadow Skirmisher", badge: "SK", detail: "Melee and ranged attacks gain 7% damage", requiredLevel: 24, prerequisites: ["storm-quiver", "relentless"], requiresAll: true, multiplier: 1, cooldownMs: 0, color: 0xb4c56a, passive: { damageMultiplier: 1.07 }, position: { x: 940, y: 920 } },

  { id: "sunfire-sigil", branch: "magic", kind: "active", tier: "notable", name: "Sunfire Sigil", badge: "SS", detail: "Ignite a 120px rune beneath a group of enemies", requiredLevel: 1, multiplier: 1, cooldownMs: 10_500, color: 0xffa24d, areaRadius: 120, position: { x: 850, y: 500 } },
  { id: "mana-weave", branch: "magic", kind: "passive", tier: "notable", name: "Mana Weave", badge: "MW", detail: "Reduce weapon-tree cooldowns by 8%", requiredLevel: 3, prerequisite: "sunfire-sigil", multiplier: 1, cooldownMs: 0, color: 0xa58dff, passive: { cooldownMultiplier: 0.92 }, position: { x: 850, y: 390 } },
  { id: "arcane-burn", branch: "magic", kind: "active", tier: "notable", name: "Arcane Burn", badge: "AB", detail: "Brand a target with 5 pulses of unstable magic", requiredLevel: 5, prerequisite: "mana-weave", multiplier: 0.68, cooldownMs: 12_500, color: 0x8f7cff, dot: { ticks: 5, intervalMs: 850, multiplier: 0.27 }, position: { x: 850, y: 280 } },
  { id: "runic-intensity", branch: "magic", kind: "passive", tier: "notable", name: "Runic Intensity", badge: "RI", detail: "Increase magic damage by 9%", requiredLevel: 10, prerequisite: "arcane-burn", multiplier: 1, cooldownMs: 0, color: 0x9f8cff, passive: { damageMultiplier: 1.09 }, position: { x: 735, y: 200 } },
  { id: "unstable-echo", branch: "magic", kind: "passive", name: "Unstable Echo", badge: "UE", detail: "Increase damage-over-time effects by 30%", requiredLevel: 16, prerequisite: "runic-intensity", multiplier: 1, cooldownMs: 0, color: 0xbe79ff, passive: { dotMultiplier: 1.3 }, position: { x: 610, y: 150 } },
  { id: "greater-sigils", branch: "magic", kind: "passive", name: "Greater Sigils", badge: "GS", detail: "Increase magical area effects by 30%", requiredLevel: 23, prerequisite: "unstable-echo", multiplier: 1, cooldownMs: 0, color: 0xffa65b, passive: { areaMultiplier: 1.3 }, position: { x: 485, y: 180 } },
  { id: "soul-fracture", branch: "magic", kind: "passive", tier: "notable", name: "Soul Fracture", badge: "SF", detail: "Deal 20% more damage to enemies below 32% health", requiredLevel: 31, prerequisite: "greater-sigils", multiplier: 1, cooldownMs: 0, color: 0xd270ff, passive: { executeThreshold: 0.32, executeMultiplier: 1.2 }, position: { x: 400, y: 280 } },
  { id: "archmage", branch: "magic", kind: "passive", tier: "keystone", name: "Archmage", badge: "AM", detail: "Gain 8% magic damage and 10% faster tree skills", requiredLevel: 40, prerequisite: "soul-fracture", multiplier: 1, cooldownMs: 0, color: 0xffce77, passive: { damageMultiplier: 1.08, cooldownMultiplier: 0.9 }, position: { x: 430, y: 410 } },
  { id: "ember-mind", branch: "magic", kind: "passive", name: "Ember Mind", badge: "EM", detail: "Increase magic damage by 3%", requiredLevel: 2, prerequisite: "sunfire-sigil", multiplier: 1, cooldownMs: 0, color: 0xd893ff, passive: { damageMultiplier: 1.03 }, position: { x: 970, y: 455 } },
  { id: "quick-incantation", branch: "magic", kind: "passive", name: "Quick Incantation", badge: "QI", detail: "Tree skills recover 5% faster", requiredLevel: 4, prerequisites: ["ember-mind", "mana-weave"], multiplier: 1, cooldownMs: 0, color: 0xaa91f2, passive: { cooldownMultiplier: 0.95 }, position: { x: 1010, y: 350 } },
  { id: "rune-bloom", branch: "magic", kind: "passive", name: "Rune Bloom", badge: "RB", detail: "Increase magical area effects by 14%", requiredLevel: 6, prerequisite: "sunfire-sigil", multiplier: 1, cooldownMs: 0, color: 0xef9d60, passive: { areaMultiplier: 1.14 }, position: { x: 730, y: 455 } },
  { id: "witchfire", branch: "magic", kind: "passive", tier: "notable", name: "Witchfire", badge: "WF", detail: "Damage-over-time effects gain 18% damage", requiredLevel: 12, prerequisites: ["arcane-burn", "rune-bloom"], multiplier: 1, cooldownMs: 0, color: 0xc36cff, passive: { dotMultiplier: 1.18 }, position: { x: 690, y: 330 } },
  { id: "warded-soul", branch: "magic", kind: "passive", name: "Warded Soul", badge: "WS", detail: "Reduce incoming damage by 3%", requiredLevel: 18, prerequisite: "runic-intensity", multiplier: 1, cooldownMs: 0, color: 0x9f94e0, passive: { damageReduction: 0.03 }, position: { x: 600, y: 255 } },
  { id: "astral-resonance", branch: "magic", kind: "passive", tier: "notable", name: "Astral Resonance", badge: "AS", detail: "Gain 6% magic damage and 8% faster skills", requiredLevel: 26, prerequisites: ["warded-soul", "unstable-echo"], multiplier: 1, cooldownMs: 0, color: 0xd087ff, passive: { damageMultiplier: 1.06, cooldownMultiplier: 0.92 }, position: { x: 525, y: 300 } },
  { id: "frost-nova-tree", branch: "magic", kind: "active", tier: "notable", name: "Frost Nova", badge: "FN", detail: "Detonate a 138px frost nova that roots every creature it catches", requiredLevel: 28, prerequisites: ["astral-resonance", "greater-sigils"], requiresAll: true, multiplier: 1.08, cooldownMs: 15_000, color: 0x83ddff, areaRadius: 138, status: { kind: "root", label: "Frostbound", durationMs: 2_600 }, position: { x: 560, y: 430 } },
  { id: "battle-mage", branch: "magic", affinities: ["magic", "melee"], kind: "passive", tier: "keystone", name: "Battle Mage", badge: "BM", detail: "Magic and melee gain 4% damage and 3% reduction", requiredLevel: 20, prerequisites: ["warded-soul", "tempered-body"], requiresAll: true, multiplier: 1, cooldownMs: 0, color: 0xe78d91, passive: { damageMultiplier: 1.04, damageReduction: 0.03 }, position: { x: 700, y: 555 } },
  { id: "stormweaver", branch: "magic", affinities: ["magic", "range"], kind: "passive", tier: "keystone", name: "Stormweaver", badge: "SW", detail: "Magic and ranged effects gain 12% area and 8% speed", requiredLevel: 24, prerequisites: ["greater-sigils", "storm-quiver"], requiresAll: true, multiplier: 1, cooldownMs: 0, color: 0x75d9db, passive: { areaMultiplier: 1.12, cooldownMultiplier: 0.92 }, position: { x: 1000, y: 555 } },
];

export function skillTreeRequirements(node: SkillTreeNodeDefinition) {
  return node.prerequisites ?? (node.prerequisite ? [node.prerequisite] : []);
}

export function skillTreeNodeConnected(node: SkillTreeNodeDefinition, unlocked: ReadonlySet<string>) {
  const requirements = skillTreeRequirements(node);
  return requirements.length === 0 || (node.requiresAll ? requirements.every((id) => unlocked.has(id)) : requirements.some((id) => unlocked.has(id)));
}

export function skillTreeBonuses(progress: Pick<PlayerProgress, "skillTree">, branch: CombatStyle): SkillTreeBonuses {
  const unlocked = new Set(progress.skillTree.unlocked);
  return SKILL_TREE_NODES.reduce<SkillTreeBonuses>((bonuses, node) => {
    const affinities = node.affinities ?? [node.branch];
    if (!affinities.includes(branch) || node.kind !== "passive" || !unlocked.has(node.id) || !node.passive) return bonuses;
    bonuses.damageMultiplier *= node.passive.damageMultiplier ?? 1;
    bonuses.cooldownMultiplier *= node.passive.cooldownMultiplier ?? 1;
    bonuses.areaMultiplier *= node.passive.areaMultiplier ?? 1;
    bonuses.dotMultiplier *= node.passive.dotMultiplier ?? 1;
    bonuses.damageReduction = 1 - (1 - bonuses.damageReduction) * (1 - (node.passive.damageReduction ?? 0));
    if ((node.passive.executeThreshold ?? 0) > bonuses.executeThreshold) {
      bonuses.executeThreshold = node.passive.executeThreshold ?? 0;
      bonuses.executeMultiplier = node.passive.executeMultiplier ?? 1;
    }
    return bonuses;
  }, { damageMultiplier: 1, cooldownMultiplier: 1, areaMultiplier: 1, dotMultiplier: 1, executeThreshold: 0, executeMultiplier: 1, damageReduction: 0 });
}

export function skillTreePointTotal(progress: Pick<PlayerProgress, "skills">) {
  const combatLevels = ["attack", "defense", "hitpoints", "range", "magic"]
    .reduce((sum, id) => sum + progress.skills[id as SkillId].level, 0);
  return Math.min(36, 3 + Math.floor(Math.max(0, combatLevels - 5) / 3));
}

export function skillTreePointsAvailable(progress: Pick<PlayerProgress, "skills" | "skillTree">) {
  return Math.max(0, skillTreePointTotal(progress) - progress.skillTree.unlocked.length);
}

export function unlockedTreeAbilities(progress: Pick<PlayerProgress, "skillTree">, branch: CombatStyle) {
  const unlocked = new Set(progress.skillTree.unlocked);
  return SKILL_TREE_NODES.filter((node) => node.branch === branch && node.kind === "active" && unlocked.has(node.id));
}

export const COLLECTION_ITEMS = ITEMS.filter((item) => item.rarity);

export const RECIPES: RecipeDefinition[] = [
  {
    id: "forge-iron-pick",
    name: "Forge Iron Pickaxe",
    profession: "smithing",
    requiredLevel: 1,
    inputs: [{ itemId: "iron-ore", quantity: 3 }, { itemId: "oak-log", quantity: 1 }],
    output: { itemId: "iron-pick", quantity: 1 },
    xp: 110,
    description: "Temper an efficient mining tool at Korra's anvil.",
  },
  {
    id: "forge-sunstone-pick",
    name: "Forge Sunstone Pickaxe",
    profession: "smithing",
    requiredLevel: 18,
    inputs: [{ itemId: "sunstone-ore", quantity: 8 }, { itemId: "iron-ore", quantity: 4 }, { itemId: "sunstone-shard", quantity: 1 }],
    output: { itemId: "sunstone-pick", quantity: 1 },
    xp: 620,
    description: "Set a radiant Sunstone edge into a tempered Orehaven mining haft.",
  },
  {
    id: "forge-sentinel-mail",
    name: "Forge Sentinel Mail",
    profession: "smithing",
    requiredLevel: 8,
    inputs: [{ itemId: "iron-ore", quantity: 6 }, { itemId: "copper-ore", quantity: 4 }],
    output: { itemId: "sentinel-mail", quantity: 1 },
    xp: 280,
    description: "Shape layered town-guard plate with blue-gold trim.",
  },
  {
    id: "craft-oak-bow",
    name: "Craft Oak Shortbow",
    profession: "crafting",
    requiredLevel: 1,
    inputs: [{ itemId: "oak-log", quantity: 3 }],
    output: { itemId: "oak-bow", quantity: 1 },
    xp: 90,
    description: "Carve, tiller, and string a dependable ranged weapon.",
  },
  {
    id: "craft-ember-staff",
    name: "Bind Ember Staff",
    profession: "crafting",
    requiredLevel: 4,
    inputs: [{ itemId: "oak-log", quantity: 2 }, { itemId: "copper-ore", quantity: 3 }],
    output: { itemId: "ember-staff", quantity: 1 },
    xp: 150,
    description: "Bind a heat-storing copper focus to an oak stave.",
  },
  {
    id: "craft-iron-bow",
    name: "Craft Iron Warbow",
    profession: "crafting",
    requiredLevel: 8,
    inputs: [{ itemId: "oak-log", quantity: 4 }, { itemId: "iron-ore", quantity: 2 }],
    output: { itemId: "iron-bow", quantity: 1 },
    xp: 260,
    description: "Reinforce an oak bow with flexible iron limbs.",
  },
  {
    id: "brew-crimson-tonic",
    name: "Brew Crimson Tonic",
    profession: "crafting",
    requiredLevel: 3,
    inputs: [{ itemId: "trout", quantity: 2 }, { itemId: "oak-log", quantity: 1 }],
    output: { itemId: "healing-potion", quantity: 2 },
    xp: 125,
    description: "Reduce Moonwater oils over fragrant oak embers.",
  },
  {
    id: "forge-frostguard-aegis",
    name: "Forge Frostguard Aegis",
    profession: "smithing",
    requiredLevel: 30,
    inputs: [{ itemId: "frostglass-ore", quantity: 8 }, { itemId: "star-iron", quantity: 4 }, { itemId: "auric-core", quantity: 1 }],
    output: { itemId: "frostguard-aegis", quantity: 1 },
    xp: 1_400,
    description: "Laminate star-iron beneath frostglass plate and seal it with an Auric Core.",
  },
  {
    id: "craft-aurora-longbow",
    name: "Craft Aurora Longbow",
    profession: "crafting",
    requiredLevel: 30,
    inputs: [{ itemId: "frostglass-ore", quantity: 5 }, { itemId: "oak-log", quantity: 6 }, { itemId: "witch-thread", quantity: 2 }],
    output: { itemId: "aurora-longbow", quantity: 1 },
    xp: 1_250,
    description: "Tiller a frostglass-backed bow and string it with enchanted Moonhex thread.",
  },
  {
    id: "bind-eclipse-staff",
    name: "Bind Eclipse Starstaff",
    profession: "crafting",
    requiredLevel: 34,
    inputs: [{ itemId: "suncrystal-ore", quantity: 6 }, { itemId: "gloomstone-ore", quantity: 4 }, { itemId: "witch-thread", quantity: 4 }],
    output: { itemId: "eclipse-staff", quantity: 1 },
    xp: 1_550,
    description: "Balance Sunscar radiance against a light-devouring Gloomstone focus.",
  },
  {
    id: "forge-sunscar-reaver",
    name: "Forge Sunscar Reaver",
    profession: "smithing",
    requiredLevel: 34,
    inputs: [{ itemId: "suncrystal-ore", quantity: 8 }, { itemId: "star-iron", quantity: 4 }, { itemId: "sunstone-shard", quantity: 2 }],
    output: { itemId: "sunscar-reaver", quantity: 1 },
    xp: 1_600,
    description: "Fold star-iron around a Suncrystal core and quench it in Sunstone resonance.",
  },
];

const SKILL_TREE_BRANCH_BY_SKILL: Partial<Record<SkillId, CombatStyle>> = {
  attack: "melee",
  range: "range",
  magic: "magic",
};

export function skillLabel(skill: SkillId) {
  return SKILLS.find((entry) => entry.id === skill)?.label ?? `${skill.charAt(0).toUpperCase()}${skill.slice(1)}`;
}

export function skillUnlocksAtLevel(skill: SkillId, level: number): SkillUnlock[] {
  const normalizedLevel = Math.max(1, Math.min(99, Math.floor(level)));
  const unlocks: SkillUnlock[] = [];

  for (const item of ITEMS) {
    if (item.requiredSkill !== skill || item.requiredLevel !== normalizedLevel) continue;
    unlocks.push({
      id: `equipment:${item.id}`,
      kind: "equipment",
      label: item.name,
      detail: item.slot ? `${item.slot.charAt(0).toUpperCase()}${item.slot.slice(1)} requirement met` : "Item requirement met",
      level: normalizedLevel,
    });
  }

  const seenResources = new Set<string>();
  for (const resource of RESOURCES) {
    if (resource.skill !== skill || resource.requiredLevel !== normalizedLevel || seenResources.has(resource.name)) continue;
    seenResources.add(resource.name);
    unlocks.push({
      id: `resource:${resource.kind}:${resource.name}`,
      kind: "resource",
      label: resource.name,
      detail: `New ${resource.kind} can now be gathered`,
      level: normalizedLevel,
    });
  }

  for (const recipe of RECIPES) {
    if (recipe.profession !== skill || recipe.requiredLevel !== normalizedLevel) continue;
    unlocks.push({
      id: `recipe:${recipe.id}`,
      kind: "recipe",
      label: recipe.name,
      detail: "New workshop recipe",
      level: normalizedLevel,
    });
  }

  const branch = SKILL_TREE_BRANCH_BY_SKILL[skill];
  if (branch) {
    for (const node of SKILL_TREE_NODES) {
      if (node.branch !== branch || node.requiredLevel !== normalizedLevel) continue;
      unlocks.push({
        id: `ability:${node.id}`,
        kind: "ability",
        label: node.name,
        detail: "Available in the combat skill tree",
        level: normalizedLevel,
      });
    }
  }

  if (skill === "defense" && normalizedLevel > 1 && (normalizedLevel - 1) % 8 === 0) {
    unlocks.push({
      id: `passive:defense:${normalizedLevel}`,
      kind: "passive",
      label: "Natural damage reduction",
      detail: "Incoming hits are reduced by an additional 1 damage",
      level: normalizedLevel,
    });
  }

  if (skill === "hitpoints" && normalizedLevel > 1) {
    unlocks.push({
      id: `passive:hitpoints:${normalizedLevel}`,
      kind: "passive",
      label: "+1 maximum hitpoint",
      detail: `Base health increased to ${baseMaxHpForHitpoints(normalizedLevel)}`,
      level: normalizedLevel,
    });
  }

  return unlocks;
}

export function skillUnlocksBetween(skill: SkillId, fromLevelExclusive: number, toLevelInclusive: number) {
  const unlocks: SkillUnlock[] = [];
  for (let level = Math.max(1, Math.floor(fromLevelExclusive) + 1); level <= Math.min(99, Math.floor(toLevelInclusive)); level += 1) {
    unlocks.push(...skillUnlocksAtLevel(skill, level));
  }
  return unlocks;
}

export function nextSkillUnlock(skill: SkillId, currentLevel: number) {
  for (let level = Math.max(2, Math.floor(currentLevel) + 1); level <= 99; level += 1) {
    const unlocks = skillUnlocksAtLevel(skill, level);
    if (unlocks.length) return { level, unlocks };
  }
  return null;
}

export function xpForLevel(level: number) {
  const normalizedLevel = Math.max(1, Math.min(99, Math.floor(level)));
  return (normalizedLevel - 1) ** 2 * 42;
}

export const SHOP_ITEMS = ITEMS.filter((item) => item.cost > 0);

export function makeSkills(): Record<SkillId, SkillProgress> {
  return Object.fromEntries(SKILLS.map((skill) => [skill.id, { level: 1, xp: 0 }])) as Record<SkillId, SkillProgress>;
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.min(99, Math.floor(Math.sqrt(Math.max(0, xp) / 42)) + 1));
}

export function baseMaxHpForHitpoints(level: number) {
  return 29 + Math.max(1, Math.min(99, Math.floor(level)));
}

export function armorMaxHpBonus(itemId: string) {
  const item = ITEMS.find((candidate) => candidate.id === itemId);
  return item?.slot === "armor" ? item.power ?? 0 : 0;
}

export function armorTrait(itemId: string) {
  return itemById(itemId)?.armorTrait ?? null;
}

export function armorHealingAmount(itemId: string, baseHealing: number) {
  const multiplier = Math.max(1, armorTrait(itemId)?.healingMultiplier ?? 1);
  return Math.max(0, Math.ceil(baseHealing * multiplier));
}

export function armorDamageReduction(itemId: string) {
  return Math.max(0, Math.min(0.2, armorTrait(itemId)?.damageReduction ?? 0));
}

export function maxHpForProgress(progress: Pick<PlayerProgress, "skills" | "equipped">) {
  return baseMaxHpForHitpoints(progress.skills.hitpoints.level) + armorMaxHpBonus(progress.equipped.armor);
}

export function defaultProgress(): PlayerProgress {
  return {
    gold: 75,
    mint: 0,
    hp: 30,
    maxHp: 30,
    skills: makeSkills(),
    inventory: { "bronze-sword": 1, "bronze-pick": 1, trout: 2 },
    bank: {},
    equipped: { weapon: "bronze-sword", tool: "bronze-pick", armor: "" },
    appearance: "vanguard",
    customization: customizationForAppearance("vanguard"),
    questStep: 0,
    questComplete: false,
    activities: normalizeActivityProgress(null),
    collectionLog: {},
    guild: null,
    treasureTrail: null,
    waystones: ["orehaven-gate"],
    discoveries: ["orehaven"],
    position: { ...PLAYER_START },
    skillTree: { unlocked: [] },
    adventureClaims: [],
    sideQuests: {},
  };
}

export function itemById(id: string) {
  return ITEMS.find((item) => item.id === id);
}

export function isAppearanceId(value: unknown): value is AppearanceId {
  return APPEARANCES.some((appearance) => appearance.id === value);
}
