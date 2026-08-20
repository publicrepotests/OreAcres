import Phaser from "phaser";
import {
  DECORATIONS,
  ENEMIES,
  DUNGEON_PORTALS,
  ITEMS,
  NPCS,
  PLAYER_START,
  QUEST_STEPS,
  RECIPES,
  REGIONS,
  REGION_COMPLETION_BONUS_GOLD,
  REGION_DISCOVERY_REWARD_GOLD,
  RESOURCES,
  SKILL_TREE_NODES,
  TREASURE_CLUES,
  WAYSTONES,
  WORLD,
  BOSS_INTRODUCTIONS,
  armorDamageReduction,
  armorHealingAmount,
  customizationForAppearance,
  isAppearanceId,
  itemById,
  levelFromXp,
  maxHpForProgress,
  normalizeGuildMembership,
  normalizeDiscoveries,
  normalizeWaystones,
  skillLabel,
  skillTreeBonuses,
  skillTreeNodeConnected,
  skillTreePointsAvailable,
  skillUnlocksBetween,
  unlockedTreeAbilities,
  weaponAbility,
  type AppearanceId,
  type BossIntroductionDefinition,
  type CharacterCustomization,
  type CombatStyle,
  type DecorationDefinition,
  type Direction,
  type DungeonPortalDefinition,
  type EnemyDefinition,
  type ItemDefinition,
  type GuildMembership,
  type NpcDefinition,
  type Panel,
  type PlayerProgress,
  type ResourceDefinition,
  type SkillId,
  type SkillUnlock,
  type SkillTreeNodeDefinition,
  type WaystoneDefinition,
} from "./gameData";
import { publicEventRotation } from "./publicEvents";
import { WORLD_AREAS, worldAreaForY, worldAreaMovementBounds, type WorldAreaId } from "./worldAreas";
import { SUNSTONE_REVENANT_PHASES, sunstoneRevenantPhase } from "./catacombRules";
import { RIMEBOUND_KING_PHASES, rimeboundKingPhase } from "./icefangRules";
import type { GameAudioCue, GameMusicState } from "./gameAudio";
import {
  LayeredHero,
  preloadLayeredHeroAssets,
  type ActorAppearanceId,
  type HeroVisualAction,
} from "./LayeredHero";
import { hasWorldLineOfSight, isWorldPositionWalkable } from "./worldCollision";
import { findWorldPath } from "./worldPathfinding";
import { normalizePlayerProgress, savePlayerProgress } from "./playerStorage";
import {
  QUEST_TURN_IN_STEPS,
  questStepAfterCombat,
  questStepAfterCraft,
  questStepAfterGather,
} from "./questProgress";
import { getRpgIdentity } from "./supabaseAuth";
import {
  DAILY_CONTRACTS,
  activityContractCount,
  normalizeActivityProgress,
  recordActivity,
  recordLifetimeTarget,
  type ActivityKind,
} from "./activityProgress";
import RPG_LOOT_RULES from "./lootRules.json";
import { ADVENTURE_CHRONICLES, adventureProgress } from "./adventureProgress";
import { advanceSideQuests, sideQuestMarkerMode, SIDE_QUESTS } from "./sideQuestProgress";

export type ActionProgress = {
  label: string;
  detail: string;
  startedAt: number;
  endsAt: number;
};

export type HudState = {
  progress: PlayerProgress;
  players: number;
  online: "connecting" | "online" | "offline";
  action: string;
  message: string;
  location: string;
  activeAction: ActionProgress | null;
  playerX: number;
  playerY: number;
  worldEvent: WorldEventState | null;
  target: TargetState | null;
  incomingCast: IncomingEnemyCast | null;
  abilityCooldowns: AbilityCooldownState;
};

export type IncomingEnemyCast = {
  enemyId: string;
  enemyName: string;
  abilityName: string;
  startedAt: number;
  completesAt: number;
  color: number;
};

export type CombatAbilitySlot = "signature" | "second-wind" | "tree-primary" | "tree-secondary" | `tree:${string}`;
export type HotbarEntry =
  | { kind: "ability"; slot: CombatAbilitySlot }
  | { kind: "consumable"; itemId: string };

const DEFAULT_HOTBAR: readonly HotbarEntry[] = [
  { kind: "ability", slot: "signature" },
  { kind: "ability", slot: "second-wind" },
  { kind: "consumable", itemId: "trout" },
  { kind: "ability", slot: "tree-primary" },
  { kind: "ability", slot: "tree-secondary" },
];
export type AbilityCooldownState = { signatureReadyAt: number; secondWindReadyAt: number; treeReadyAt: Record<string, number> };

export type TargetState = {
  id: string;
  name: string;
  kind: EnemyDefinition["kind"];
  level: number;
  hp: number;
  maxHp: number;
  combatStyle: CombatStyle;
  rare: boolean;
  status: EnemyStatusState | null;
};

export type EnemyStatusState = {
  kind: "stagger" | "slow" | "root" | "weaken";
  label: string;
  expiresAt: number;
  strength: number;
};

export type WorldEventState = {
  id: string;
  name: string;
  location: string;
  region: string;
  rally: string;
  accent: string;
  level: number;
  hp: number;
  maxHp: number;
  respawnAt: number;
  endsAt: number;
};

export type GameToast = {
  title: string;
  detail: string;
  tone: "level" | "loot" | "quest" | "craft";
  itemId?: string;
};

export type BossIntroState = BossIntroductionDefinition & {
  enemyName: string;
  level: number;
  kind: EnemyDefinition["kind"];
};

export type SkillLevelEvent = {
  skill: SkillId;
  skillName: string;
  level: number;
  unlocks: SkillUnlock[];
};

export type ChatMessage = {
  id: string;
  playerId: string | null;
  name: string;
  text: string;
  at: number;
  kind: "player" | "party" | "guild" | "system";
  tag?: string;
};

export type OnlineAdventurer = {
  id: string;
  name: string;
  totalLevel: number;
  appearance: AppearanceId;
  customization: CharacterCustomization;
  equipped: PlayerProgress["equipped"];
  guild: GuildMembership | null;
  x: number;
  y: number;
};

export type PartyMember = OnlineAdventurer & {
  leader: boolean;
};

export type PartyState = {
  id: string;
  leaderId: string;
  members: PartyMember[];
  completedExpeditionIds: string[];
  expedition: {
    id: string;
    name: string;
    description: string;
    crest: string;
    region: string;
    trackingKey: string;
    recommendedTotalLevel: number;
    targetKind: EnemyDefinition["kind"];
    target: number;
    progress: number;
    contributorCount: number;
    endsAt: number;
    status: "active" | "complete" | "expired";
  } | null;
};

export type PartyInvite = {
  partyId: string;
  inviterId: string;
  inviterName: string;
  expiresAt: number;
};

export type GuildInvite = {
  guild: GuildMembership;
  inviterId: string;
  inviterName: string;
  expiresAt: number;
};

export type SocialState = {
  selfId: string | null;
  online: OnlineAdventurer[];
  party: PartyState | null;
  invite: PartyInvite | null;
  guildInvite: GuildInvite | null;
};

export type DialogueState = {
  speaker: string;
  role: string;
  portraitId: NpcDefinition["id"];
  portraitAppearance: ActorAppearanceId;
  portraitEquipped: PlayerProgress["equipped"];
  lines: string[];
  quest?: {
    chapter: string;
    title: string;
    objective: string;
    turnIn: boolean;
  };
  shop?: "weapons" | "tools";
  service?: "bank" | "workshop" | "activities" | "social";
  sideQuest?: {
    id: string;
    chapter: string;
    title: string;
    description: string;
    status: "available" | "active" | "ready" | "claimed";
    objective: string;
    rewardGold: number;
    rewardXpSkill: SkillId;
    rewardXp: number;
    rewardItemId: string;
    rewardQuantity: number;
  };
};

export type SceneCallbacks = {
  onHud: (next: Partial<HudState>) => void;
  onDialogue: (dialogue: DialogueState | null) => void;
  onPanelRequest: (panel: Panel) => void;
  onToast: (toast: GameToast) => void;
  onQuestComplete: (reward: GameToast) => void;
  onBossIntro: (intro: BossIntroState) => void;
  onLevelUp: (event: SkillLevelEvent) => void;
  onChat: (message: ChatMessage) => void;
  onSocial: (next: Partial<SocialState>) => void;
  onAudio: (cue: GameAudioCue) => void;
  onMusic: (state: GameMusicState) => void;
  onLoadProgress?: (progress: number) => void;
  onReady?: () => void;
};

export type RemotePlayer = {
  id: string;
  name: string;
  x: number;
  y: number;
  appearance?: AppearanceId;
  customization?: CharacterCustomization;
  equipped?: PlayerProgress["equipped"];
  action?: PlayerWorldAction;
  direction?: Direction;
  totalLevel?: number;
  guild?: GuildMembership | null;
};

type RemoteEntity = {
  hero: LayeredHero;
  shadow: Phaser.GameObjects.Ellipse;
  name: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  direction: Direction;
  action: PlayerWorldAction;
  appearance: AppearanceId;
  customization: CharacterCustomization;
  equipped: PlayerProgress["equipped"];
  totalLevel: number;
  guild: GuildMembership | null;
  displayName: string;
  socialRing: Phaser.GameObjects.Ellipse;
};

type PlayerWorldAction = "idle" | "walk" | "attack" | "gather" | "mine" | "chop" | "fish" | "attune";
type WorldArea = WorldAreaId;

type EnemyRuntime = {
  definition: EnemyDefinition;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  threatRing: Phaser.GameObjects.Ellipse;
  rareAura?: Phaser.GameObjects.Ellipse;
  hero?: LayeredHero;
  facing: Direction;
  plate: Phaser.GameObjects.Container;
  hpBar: Phaser.GameObjects.Graphics;
  hp: number;
  respawnAt: number;
  worldAction: "idle" | "walk" | "attack";
  reaction: "attack" | "hurt" | null;
  reactionUntil: number;
  lastAttackAccentAt: number;
  status: EnemyStatusState | null;
  targetPlayerId: string | null;
  phase?: number;
  hitZone: Phaser.GameObjects.Zone;
};

type ResourceRuntime = {
  definition: ResourceDefinition;
  sprite: Phaser.GameObjects.Sprite;
  plate: Phaser.GameObjects.Container;
  available: boolean;
  claimedBy: string | null;
  respawnAt: number;
  hitZone: Phaser.GameObjects.Zone;
};

type NpcRuntime = {
  definition: NpcDefinition;
  sprite: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  hero: LayeredHero;
  plate: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
};

type WaystoneRuntime = {
  definition: WaystoneDefinition;
  sprite: Phaser.GameObjects.Sprite;
  ring: Phaser.GameObjects.Ellipse;
  plate: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
};

type DungeonPortalRuntime = {
  definition: DungeonPortalDefinition;
  sprite: Phaser.GameObjects.Sprite;
  ring: Phaser.GameObjects.Ellipse;
  plate: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
};

type AmbientCitizenDefinition = {
  id: string;
  appearance: ActorAppearanceId;
  equipped: PlayerProgress["equipped"];
  route: Array<{ x: number; y: number }>;
  speed: number;
  pauseMs: [number, number];
  barks: string[];
};

type AmbientCitizenRuntime = {
  definition: AmbientCitizenDefinition;
  hero: LayeredHero;
  shadow: Phaser.GameObjects.Ellipse;
  hitZone: Phaser.GameObjects.Zone;
  routeIndex: number;
  path: Array<{ x: number; y: number }>;
  pauseUntil: number;
  facing: Direction;
  nextBarkAt: number;
};

type AmbientBubbleRuntime = {
  container: Phaser.GameObjects.Container;
  target: LayeredHero;
};

type ApproachTarget =
  | { kind: "npc"; id: string; x: number; y: number }
  | { kind: "enemy"; id: string; x: number; y: number }
  | { kind: "resource"; id: string; x: number; y: number }
  | { kind: "waystone"; id: string; x: number; y: number }
  | { kind: "portal"; id: string; x: number; y: number }
  | { kind: "sanctuary"; id: string; x: number; y: number }
  | null;

const WORLD_KEY = "orehaven-overworld";
const BRIARWILD_KEY = "briarwild-south";
const BRIARWILD_TRANSITION_KEY = "orehaven-briarwild-transition";
const SUNSTONE_CATACOMBS_KEY = "sunstone-catacombs";
const MOONFEN_MARSH_KEY = "moonfen-marsh";
const EMBERFALL_HIGHLANDS_KEY = "emberfall-highlands";
const FROSTMERE_COAST_KEY = "frostmere-coast";
const SUNSCAR_EXPANSE_KEY = "sunscar-expanse";
const GUILD_HALL_KEY = "orehaven-guildhall";
const ICEFANG_VAULT_KEY = "icefang-vault";
const WORLD_MAP_REVISION = "icefang-vault-20260819";
const WORLD_LAYER_MANIFEST: ReadonlyArray<{ key: string; path: string; y: number; depth?: number }> = [
  { key: BRIARWILD_KEY, path: WORLD_AREAS.overworld.images[1], y: WORLD_AREAS.overworld.top + 1024 },
  { key: BRIARWILD_TRANSITION_KEY, path: "/assets/rpg/world/orehaven-briarwild-transition.png", y: 864, depth: -49 },
  { key: SUNSTONE_CATACOMBS_KEY, path: WORLD_AREAS.dungeon.images[0], y: WORLD_AREAS.dungeon.top },
  { key: MOONFEN_MARSH_KEY, path: WORLD_AREAS.marsh.images[0], y: WORLD_AREAS.marsh.top },
  { key: EMBERFALL_HIGHLANDS_KEY, path: WORLD_AREAS.highlands.images[0], y: WORLD_AREAS.highlands.top },
  { key: FROSTMERE_COAST_KEY, path: WORLD_AREAS.frostmere.images[0], y: WORLD_AREAS.frostmere.top },
  { key: SUNSCAR_EXPANSE_KEY, path: WORLD_AREAS.sunscar.images[0], y: WORLD_AREAS.sunscar.top },
  { key: GUILD_HALL_KEY, path: WORLD_AREAS.guildhall.images[0], y: WORLD_AREAS.guildhall.top },
  { key: ICEFANG_VAULT_KEY, path: WORLD_AREAS.icefang.images[0], y: WORLD_AREAS.icefang.top },
];
const WORLD_ATLAS_KEY = "orehaven-world-objects";
const EQUIPMENT_ITEM_ATLAS_KEY = "orehaven-equipment-items";
const ADVENTURE_ITEM_ATLAS_KEY = "orehaven-adventure-items";
const MATERIAL_ITEM_ATLAS_KEY = "orehaven-material-items";
const TROPHY_ITEM_ATLAS_KEY = "orehaven-trophy-items";
const RAT_KEY = "orehaven-field-rat";
const WOLF_KEY = "orehaven-wolfpack";
const DRAKE_KEY = "orehaven-ashwing-drake";
const DUNE_STALKER_KEY = "orehaven-dune-stalker";
const BOAR_KEY = "orehaven-ember-tusk-boar";
const SLIME_KEY = "orehaven-slime";
const TREANT_KEY = "orehaven-briar-treant";
const TREANT_ATTACK_KEY = "orehaven-briar-treant-rootwake";
const SKELETON_IDLE_KEY = "orehaven-skeleton-idle";
const SKELETON_MOVE_KEY = "orehaven-skeleton-move";
const WITCH_IDLE_KEY = "orehaven-witch-idle";
const WITCH_MOVE_KEY = "orehaven-witch-move";
const WITCH_SKILL_KEY = "orehaven-witch-skill";
const ARROW_KEY = "orehaven-arrow";
const ARCANE_BOLT_KEY = "orehaven-arcane-bolt";
const FIREBALL_KEY = "orehaven-fireball";
const FIREBOMB_KEY = "orehaven-firebomb";
const MAGIC_SPARKS_KEY = "orehaven-magic-sparks";
const ANSIMUZ_DARK_BOLT_KEY = "orehaven-ansimuz-dark-bolt";
const ANSIMUZ_FIRE_BOMB_KEY = "orehaven-ansimuz-fire-bomb";
const ANSIMUZ_LIGHTNING_KEY = "orehaven-ansimuz-lightning";
const ANSIMUZ_SPARK_KEY = "orehaven-ansimuz-spark";
const MELEE_SLASH_KEY = "orehaven-melee-slash";
const CREATURE_ATLAS_KEY = "orehaven-creature-atlas";
const ATLAS_FRAME = { width: 384, height: 512 };
const INTERACTION_RANGE = 76;
const COMBAT_STANDOFF: Record<CombatStyle, number> = { melee: 58, range: 210, magic: 185 };
const COMBAT_MAX_RANGE: Record<CombatStyle, number> = { melee: 104, range: 320, magic: 285 };
const MOVE_SPEED = 112;
const DEFAULT_ENEMY_RESPAWN_MS = 90_000;
const CAMERA_ZOOM_MIN = 1.28;
const CAMERA_ZOOM_MAX = 2.34;
const CAMERA_ZOOM_DEFAULT = 1.72;
const TOWN_SANCTUARY = { id: "founders-fountain", name: "Founders' Fountain", x: 688, y: 468 } as const;
const SAVE_EMIT_DELAY = 250;
const REGIONAL_LANDMARK_ACCENTS: ReadonlyArray<{
  area: WorldArea;
  name: string;
  x: number;
  y: number;
  color: number;
  radius: number;
}> = [
  { area: "overworld", name: "Founders' Fountain", x: 688, y: 468, color: 0x73d8e8, radius: 34 },
  { area: "dungeon", name: "Aurex's Chamber", x: 768, y: 2694, color: 0xb77aff, radius: 48 },
  { area: "marsh", name: "Drowned Altar", x: 768, y: 3890, color: 0x70d8d1, radius: 42 },
  { area: "highlands", name: "Caldera Throne", x: 768, y: 4930, color: 0xff8a4c, radius: 48 },
  { area: "frostmere", name: "Last Lighthouse", x: 1260, y: 5260, color: 0x9ceaff, radius: 38 },
  { area: "sunscar", name: "Solar Tomb", x: 330, y: 6270, color: 0xffcf5d, radius: 44 },
  { area: "guildhall", name: "Expedition War Table", x: 768, y: 7660, color: 0xf1b84b, radius: 38 },
  { area: "icefang", name: "Rime Throne", x: 768, y: 8348, color: 0x8de9ff, radius: 48 },
];

function worldAreaAtY(y: number): WorldArea {
  return worldAreaForY(y);
}

function resourceVisualColor(itemId: string) {
  return itemById(itemId)?.tint ?? (itemId === "sunstone-ore" ? 0xffca63 : 0xffffff);
}
const DEFAULT_REMOTE_EQUIPMENT: PlayerProgress["equipped"] = {
  weapon: "bronze-sword",
  tool: "bronze-pick",
  armor: "",
};
const QUEST_REWARD_TOASTS: Record<number, { to: number; title: string; detail: string; itemId?: string }> = {
  3: { to: 4, title: "The First Spark complete", detail: "+150 gold • 3 River Trout", itemId: "trout" },
  8: { to: 9, title: "Whispers in the Pines complete", detail: "+450 gold • Sentinel Mail", itemId: "sentinel-mail" },
  14: { to: 15, title: "Master of Paths complete", detail: "+650 gold • Orehaven Treasure Scroll", itemId: "treasure-scroll" },
  22: { to: 23, title: "Briarwild Warden", detail: "+1,200 gold • Warden Mail • Arcane Staff", itemId: "warden-mail" },
  29: { to: 30, title: "Sunforged Warden", detail: "+1,800 gold • Sunforged Plate • Rune-edge Blade", itemId: "sunforged-mail" },
  34: { to: 35, title: "Moonfen Eclipse broken", detail: "+2,200 gold • Moonweave Mantle", itemId: "moonweave-mantle" },
  39: { to: 40, title: "Emberfall Crown shattered", detail: "+2,800 gold • Sunstone Pickaxe", itemId: "sunstone-pick" },
  44: { to: 45, title: "The Last Light rekindled", detail: "+3,400 gold • Frostspire Staff", itemId: "frostspire-staff" },
  49: { to: 50, title: "Warden of Seven Roads", detail: "+5,000 gold • Nightguard Plate", itemId: "nightguard-plate" },
  56: { to: 57, title: "The Rimebound Oath broken", detail: "+6,800 gold • Frostguard Aegis • 6 Crimson Tonics", itemId: "frostguard-aegis" },
};
const NPC_VISUALS: Record<
  NpcDefinition["id"],
  { appearance: ActorAppearanceId; equipped: PlayerProgress["equipped"] }
> = {
  guide: { appearance: "mira", equipped: { weapon: "arcane-staff", tool: "bronze-pick", armor: "" } },
  banker: { appearance: "grent", equipped: { weapon: "", tool: "bronze-pick", armor: "" } },
  smith: { appearance: "korra", equipped: { weapon: "iron-sword", tool: "iron-pick", armor: "" } },
  market: { appearance: "pip", equipped: { weapon: "", tool: "bronze-pick", armor: "" } },
  plots: { appearance: "clerk", equipped: { weapon: "", tool: "bronze-pick", armor: "" } },
  marshal: { appearance: "vanguard", equipped: { weapon: "iron-sword", tool: "bronze-pick", armor: "sentinel-mail" } },
  captain: { appearance: "ranger", equipped: { weapon: "iron-bow", tool: "bronze-pick", armor: "warden-mail" } },
  ranger: { appearance: "lyra", equipped: { weapon: "iron-bow", tool: "bronze-pick", armor: "warden-mail" } },
  "fen-cartographer": { appearance: "ranger", equipped: { weapon: "iron-bow", tool: "crystal-pick", armor: "moonweave-mantle" } },
  "ember-forgekeeper": { appearance: "vanguard", equipped: { weapon: "rune-blade", tool: "sunstone-pick", armor: "sunforged-mail" } },
  frostkeeper: { appearance: "arcanist", equipped: { weapon: "frostspire-staff", tool: "crystal-pick", armor: "moonweave-mantle" } },
  "sunscar-scholar": { appearance: "arcanist", equipped: { weapon: "arcane-staff", tool: "sunstone-pick", armor: "sunforged-mail" } },
  guildmaster: { appearance: "alden", equipped: { weapon: "eclipse-staff", tool: "bronze-pick", armor: "frostguard-aegis" } },
  quartermaster: { appearance: "juno", equipped: { weapon: "sunscar-reaver", tool: "sunstone-pick", armor: "trailguard-vest" } },
  "hall-banker": { appearance: "merris", equipped: { weapon: "", tool: "bronze-pick", armor: "" } },
  scribe: { appearance: "pella", equipped: { weapon: "arcane-staff", tool: "bronze-pick", armor: "moonweave-mantle" } },
};

const AMBIENT_CITIZENS: AmbientCitizenDefinition[] = [
  {
    id: "town-courier",
    appearance: "ranger",
    equipped: { weapon: "", tool: "bronze-pick", armor: "" },
    route: [{ x: 590, y: 420 }, { x: 746, y: 360 }, { x: 884, y: 450 }, { x: 820, y: 590 }, { x: 640, y: 548 }],
    speed: 48,
    pauseMs: [700, 1_800],
    barks: ["Guild notices for the south road!", "Fresh dispatch from Ranger-Captain Lyra.", "Mind the goblin trail beyond the east gate."],
  },
  {
    id: "keep-guard",
    appearance: "vanguard",
    equipped: { weapon: "iron-sword", tool: "bronze-pick", armor: "sentinel-mail" },
    route: [{ x: 658, y: 270 }, { x: 838, y: 270 }, { x: 882, y: 350 }, { x: 616, y: 350 }],
    speed: 38,
    pauseMs: [1_400, 2_800],
    barks: ["Keep your weapon sheathed inside the walls.", "The south gate remains open to registered adventurers.", "Waystones are safer than walking Moonfen after dusk."],
  },
  {
    id: "market-shopper",
    appearance: "arcanist",
    equipped: { weapon: "", tool: "bronze-pick", armor: "" },
    route: [{ x: 566, y: 476 }, { x: 590, y: 420 }, { x: 690, y: 470 }, { x: 640, y: 548 }],
    speed: 32,
    pauseMs: [1_800, 3_600],
    barks: ["Pip pays extra for rare field trophies.", "Korra's iron tools last longer in the quarry.", "I heard an Auric Slime was seen on Southroad."],
  },
  {
    id: "forge-apprentice",
    appearance: "vanguard",
    equipped: { weapon: "", tool: "iron-pick", armor: "trailguard-vest" },
    route: [{ x: 890, y: 470 }, { x: 972, y: 450 }, { x: 884, y: 450 }],
    speed: 36,
    pauseMs: [1_000, 2_400],
    barks: ["Three more ingots and Korra might trust me with a blade.", "A good pick matters more than strong arms.", "The forge takes ore, logs, and a little patience."],
  },
  {
    id: "quarry-hauler",
    appearance: "ranger",
    equipped: { weapon: "", tool: "iron-pick", armor: "trailguard-vest" },
    route: [{ x: 1_270, y: 410 }, { x: 1_370, y: 350 }, { x: 1_290, y: 500 }],
    speed: 41,
    pauseMs: [1_100, 2_200],
    barks: ["Copper carts coming through!", "Crystal Slime near the upper cut. Bring a staff.", "The deep seams need a proper iron pick."],
  },
  {
    id: "western-scout",
    appearance: "ranger",
    equipped: { weapon: "oak-bow", tool: "bronze-pick", armor: "briarhide-cloak" },
    route: [{ x: 270, y: 590 }, { x: 350, y: 680 }, { x: 455, y: 720 }],
    speed: 44,
    pauseMs: [900, 2_100],
    barks: ["Pinefang tracks cross the northern trail.", "Moonwater is calm, but the woods are not.", "Keep to the road until you know the tree line."],
  },
  {
    id: "southroad-traveler",
    appearance: "arcanist",
    equipped: { weapon: "ember-staff", tool: "bronze-pick", armor: "" },
    route: [{ x: 720, y: 820 }, { x: 760, y: 950 }, { x: 760, y: 1_090 }, { x: 700, y: 1_185 }],
    speed: 40,
    pauseMs: [1_200, 2_600],
    barks: ["The Briarwild waystone still answers.", "Blue witch-lights gather over Moonfen.", "I would not camp beyond the crossing alone."],
  },
  {
    id: "briarwild-patrol",
    appearance: "vanguard",
    equipped: { weapon: "rune-blade", tool: "bronze-pick", armor: "warden-mail" },
    route: [{ x: 550, y: 1_500 }, { x: 660, y: 1_590 }, { x: 700, y: 1_735 }, { x: 545, y: 1_820 }],
    speed: 46,
    pauseMs: [800, 1_900],
    barks: ["Ranger patrol. Clear the trail.", "Sunbone tracks lead toward the old shrine.", "If the marsh goes quiet, ready your weapon."],
  },
  {
    id: "moonfen-lantern-runner",
    appearance: "ranger",
    equipped: { weapon: "iron-bow", tool: "crystal-pick", armor: "moonweave-mantle" },
    route: [{ x: 620, y: 3340 }, { x: 650, y: 3420 }, { x: 540, y: 3480 }, { x: 620, y: 3560 }],
    speed: 42,
    pauseMs: [1_000, 2_300],
    barks: ["Cold flame for the western lanterns.", "Nessa marked a dry crossing beyond the reeds.", "If a blue light follows you, do not follow it back."],
  },
  {
    id: "moonfen-wayfinder",
    appearance: "arcanist",
    equipped: { weapon: "frostspire-staff", tool: "bronze-pick", armor: "warden-mail" },
    route: [{ x: 900, y: 3350 }, { x: 860, y: 3460 }, { x: 760, y: 3510 }, { x: 700, y: 3420 }],
    speed: 38,
    pauseMs: [1_400, 2_900],
    barks: ["The mire rearranges itself after midnight.", "Gloomstone sings when a wraith is close.", "Keep the waystone behind you and the lanterns to your left."],
  },
  {
    id: "emberfall-ore-runner",
    appearance: "vanguard",
    equipped: { weapon: "rune-blade", tool: "sunstone-pick", armor: "sunforged-mail" },
    route: [{ x: 900, y: 4420 }, { x: 820, y: 4500 }, { x: 720, y: 4480 }, { x: 620, y: 4400 }],
    speed: 45,
    pauseMs: [900, 2_100],
    barks: ["Star-Iron shipment for Dagan!", "Ash storm rolling over the eastern ridge.", "The caldera cools for nobody. Keep moving."],
  },
  {
    id: "emberfall-watch",
    appearance: "ranger",
    equipped: { weapon: "stormglass-bow", tool: "iron-pick", armor: "briarhide-cloak" },
    route: [{ x: 1020, y: 4440 }, { x: 940, y: 4360 }, { x: 850, y: 4420 }, { x: 930, y: 4500 }],
    speed: 43,
    pauseMs: [1_100, 2_500],
    barks: ["Cinder Guard below the ridge. Stay sharp.", "Ashwings circle before the vents erupt.", "The north shelf is clear for now."],
  },
  {
    id: "frostmere-beacon-runner",
    appearance: "arcanist",
    equipped: { weapon: "frostspire-staff", tool: "crystal-pick", armor: "moonweave-mantle" },
    route: [{ x: 700, y: 5520 }, { x: 820, y: 5520 }, { x: 860, y: 5620 }, { x: 720, y: 5650 }],
    speed: 39,
    pauseMs: [1_200, 2_700],
    barks: ["Keeper Elowen needs another lens crystal.", "The lighthouse beam keeps the ice-wraiths offshore.", "Fresh wolf tracks cross the northern shelf."],
  },
  {
    id: "frostmere-net-mender",
    appearance: "ranger",
    equipped: { weapon: "stormglass-bow", tool: "bronze-pick", armor: "briarhide-cloak" },
    route: [{ x: 980, y: 5650 }, { x: 1080, y: 5670 }, { x: 1040, y: 5760 }, { x: 950, y: 5750 }],
    speed: 35,
    pauseMs: [1_500, 3_200],
    barks: ["Icewater trout bite beneath the blue ripples.", "Keep your line low when the coast wind rises.", "The Glacier Seer has been watching the harbor again."],
  },
  {
    id: "sunscar-observatory-aide",
    appearance: "arcanist",
    equipped: { weapon: "ember-staff", tool: "sunstone-pick", armor: "sunforged-mail" },
    route: [{ x: 980, y: 6470 }, { x: 1100, y: 6460 }, { x: 1140, y: 6550 }, { x: 1010, y: 6590 }],
    speed: 38,
    pauseMs: [1_100, 2_600],
    barks: ["Samira charted another false sunrise over the tomb.", "Suncrystal bends starlight even at noon.", "The observatory lens must stay clear of dune dust."],
  },
  {
    id: "sunscar-caravan-guard",
    appearance: "vanguard",
    equipped: { weapon: "rune-blade", tool: "bronze-pick", armor: "sunforged-mail" },
    route: [{ x: 330, y: 6520 }, { x: 430, y: 6580 }, { x: 510, y: 6650 }, { x: 390, y: 6700 }],
    speed: 42,
    pauseMs: [900, 2_100],
    barks: ["Caravan road is clear to the oasis.", "Dune Stalkers hunt the shade, not the sun.", "Water first, treasure second. That is how you leave Sunscar alive."],
  },
  {
    id: "guildhall-steward",
    appearance: "mira",
    equipped: { weapon: "", tool: "bronze-pick", armor: "sentinel-mail" },
    route: [{ x: 660, y: 7480 }, { x: 780, y: 7460 }, { x: 920, y: 7500 }, { x: 1010, y: 7580 }],
    speed: 34,
    pauseMs: [1_600, 3_400],
    barks: ["The expedition board was refreshed at dawn.", "Guildmaster Vale receives newly formed companies upstairs.", "Bank your trophies before the next long road."],
  },
  {
    id: "guildhall-dispatch-runner",
    appearance: "ranger",
    equipped: { weapon: "iron-bow", tool: "bronze-pick", armor: "warden-mail" },
    route: [{ x: 520, y: 7840 }, { x: 680, y: 7910 }, { x: 900, y: 7900 }, { x: 1030, y: 7820 }],
    speed: 44,
    pauseMs: [800, 1_900],
    barks: ["Moonfen expedition report for the scribe!", "Party notices go on the brass board.", "A guild banner was sighted beyond Frostmere."],
  },
];

function resolveWsUrl() {
  const explicit = import.meta.env.VITE_MULTIPLAYER_WS_URL as string | undefined;
  if (explicit?.trim()) {
    const clean = explicit.trim();
    return location.protocol === "https:" && clean.startsWith("ws://") ? clean.replace(/^ws:\/\//, "wss://") : clean;
  }
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "ws://localhost:8080/ws";
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
}

export class OrehavenScene extends Phaser.Scene {
  private callbacks: SceneCallbacks;
  private publicEventSlot = -1;
  private progress: PlayerProgress;
  private displayName: string;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private player!: LayeredHero;
  private playerName!: Phaser.GameObjects.Text;
  private playerBeacon!: Phaser.GameObjects.Ellipse;
  private playerPos = new Phaser.Math.Vector2(PLAYER_START.x, PLAYER_START.y);
  private facing: Direction = "down";
  private heroAction: PlayerWorldAction = "idle";
  private moving = false;
  private inputPaused = false;
  private actionLock = false;
  private respawning = false;
  private walkTarget: Phaser.Math.Vector2 | null = null;
  private walkPath: Phaser.Math.Vector2[] = [];
  private approachTarget: ApproachTarget = null;
  private activeAction: ActionProgress | null = null;
  private actionTimer: Phaser.Time.TimerEvent | null = null;
  private gatheringAudioTimer: Phaser.Time.TimerEvent | null = null;
  private actionFx: Phaser.GameObjects.Arc | null = null;
  private fishingFx: Phaser.GameObjects.Container | null = null;
  private selectedRing!: Phaser.GameObjects.Ellipse;
  private nearbyRing!: Phaser.GameObjects.Ellipse;
  private nearbyPrompt!: Phaser.GameObjects.Text;
  private questMarker!: Phaser.GameObjects.Container;
  private sideQuestMarkers = new Map<string, Phaser.GameObjects.Container>();
  private publicEventMarker: Phaser.GameObjects.Container | null = null;
  private treasureMarker: Phaser.GameObjects.Container | null = null;
  private npcRuntime = new Map<string, NpcRuntime>();
  private ambientCitizens: AmbientCitizenRuntime[] = [];
  private enemyRuntime = new Map<string, EnemyRuntime>();
  private resourceRuntime = new Map<string, ResourceRuntime>();
  private waystoneRuntime = new Map<string, WaystoneRuntime>();
  private dungeonPortalRuntime = new Map<string, DungeonPortalRuntime>();
  private sanctuaryPlate!: Phaser.GameObjects.Text;
  private pendingRegionDiscoveries = new Set<string>();
  private remotes = new Map<string, RemoteEntity>();
  private chatBubbles = new Map<string, Phaser.GameObjects.Container>();
  private ambientBubbles = new Map<string, AmbientBubbleRuntime>();
  private enemyTelegraphs = new Map<string, Phaser.GameObjects.Container>();
  private incomingCast: IncomingEnemyCast | null = null;
  private ws: WebSocket | null = null;
  private playerId: string | null = null;
  private profileMode: "guest" | "supabase" = "guest";
  private profileRevision = 0;
  private partyState: PartyState | null = null;
  private activeEnemyId: string | null = null;
  private selectedEnemyId: string | null = null;
  private activeResourceId: string | null = null;
  private awaitingCombatResponse = false;
  private lastActionLabel = "Explore";
  private lastHudEmit = 0;
  private lastPositionHudEmit = 0;
  private lastPositionSaveEmit = 0;
  private lastFootstepAt = 0;
  private blockedMovementMs = 0;
  private walkRepathAttempts = 0;
  private nextMovingTargetPathAt = 0;
  private abilityCooldowns: AbilityCooldownState = { signatureReadyAt: 0, secondWindReadyAt: 0, treeReadyAt: {} };
  private playerAttackUntil = 0;
  private lastQuestToastStep: number;
  private disposed = false;
  private cameraZoom = CAMERA_ZOOM_DEFAULT;
  private activeWorldArea: WorldArea = "overworld";
  private regionalAtmosphere = new Map<WorldArea, Phaser.GameObjects.GameObject[]>();
  private backgroundWorldMapsQueued = false;
  private introducedBosses = new Set<string>();
  private hotbarLayout: Array<HotbarEntry | null> = DEFAULT_HOTBAR.map((entry) => ({ ...entry }));

  constructor(callbacks: SceneCallbacks, progress: PlayerProgress, displayName: string) {
    super("OrehavenScene");
    this.callbacks = callbacks;
    this.progress = progress;
    if (isWorldPositionWalkable(progress.position.x, progress.position.y)) {
      this.playerPos.set(progress.position.x, progress.position.y);
    }
    this.displayName = displayName;
    this.lastQuestToastStep = progress.questStep;
  }

  preload() {
    this.load.maxParallelDownloads = 32;
    this.load.on("progress", (value: number) => this.callbacks.onLoadProgress?.(value));
    this.load.image(WORLD_KEY, `${WORLD_AREAS.overworld.images[0]}?v=${WORLD_MAP_REVISION}`);
    preloadLayeredHeroAssets(this, {
      essentialOnly: true,
      appearance: this.progress.appearance,
      customization: this.progress.customization,
      weaponId: this.progress.equipped.weapon,
      armorId: this.progress.equipped.armor,
    });
    this.load.spritesheet(WORLD_ATLAS_KEY, "/assets/rpg/atlas/world.png", {
      frameWidth: ATLAS_FRAME.width,
      frameHeight: ATLAS_FRAME.height,
    });
    this.load.spritesheet(EQUIPMENT_ITEM_ATLAS_KEY, "/assets/rpg/items/equipment-atlas.png", { frameWidth: 384, frameHeight: 512 });
    this.load.spritesheet(ADVENTURE_ITEM_ATLAS_KEY, "/assets/rpg/items/adventure-atlas.png", { frameWidth: 384, frameHeight: 512 });
    this.load.spritesheet(MATERIAL_ITEM_ATLAS_KEY, "/assets/rpg/items/material-atlas.png", { frameWidth: 768, frameHeight: 512 });
    this.load.spritesheet(TROPHY_ITEM_ATLAS_KEY, "/assets/rpg/items/trophy-atlas.png", { frameWidth: 362, frameHeight: 362 });
    this.load.spritesheet(CREATURE_ATLAS_KEY, "/assets/rpg/atlas/characters.png", { frameWidth: 384, frameHeight: 512 });
    this.load.spritesheet(RAT_KEY, "/assets/rpg/creatures/field-rat-sheet-1024.png", { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(WOLF_KEY, "/assets/rpg/creatures/forest-wolf-sheet-v2.png", { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(DRAKE_KEY, "/assets/rpg/creatures/ashwing-drake-sheet-1024.png", { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(DUNE_STALKER_KEY, "/assets/rpg/creatures/dune-stalker-sheet-1024.png", { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(BOAR_KEY, "/assets/rpg/creatures/ember-tusk-boar-sheet-1024.png", { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet(SLIME_KEY, "/assets/rpg/creatures/ore-slime-sheet-1024.png", { frameWidth: 256, frameHeight: 256 });
    this.load.image(ARROW_KEY, "/assets/rpg/effects/arrow.png");
    this.load.spritesheet(ARCANE_BOLT_KEY, "/assets/rpg/effects/arcane-bolt.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet(FIREBALL_KEY, "/assets/rpg/effects/fireball.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet(FIREBOMB_KEY, "/assets/rpg/effects/firebomb.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet(MAGIC_SPARKS_KEY, "/assets/rpg/effects/magic-sparks.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet(ANSIMUZ_DARK_BOLT_KEY, "/assets/rpg/effects/ansimuz/dark-bolt.png", { frameWidth: 88, frameHeight: 88 });
    this.load.spritesheet(ANSIMUZ_FIRE_BOMB_KEY, "/assets/rpg/effects/ansimuz/fire-bomb.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet(ANSIMUZ_LIGHTNING_KEY, "/assets/rpg/effects/ansimuz/lightning.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet(ANSIMUZ_SPARK_KEY, "/assets/rpg/effects/ansimuz/spark.png", { frameWidth: 32, frameHeight: 32 });
    // Generated as one stable horizontal strip so every basic hit has a
    // readable, pixel-authored impact instead of a code-drawn arc.
    this.load.spritesheet(MELEE_SLASH_KEY, "/assets/rpg/effects/melee-slash-gold-raw.png", { frameWidth: 253, frameHeight: 887 });
  }

  create() {
    this.disposed = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
    this.applyWorldArea(this.playerPos.y);
    this.cameras.main.setBackgroundColor("#17271d");
    // These are pixel-painted maps. Nearest filtering prevents fractional camera
    // positions from smearing the boundary between separately loaded regions.
    [
      WORLD_KEY,
      BRIARWILD_KEY,
      BRIARWILD_TRANSITION_KEY,
      SUNSTONE_CATACOMBS_KEY,
      MOONFEN_MARSH_KEY,
      EMBERFALL_HIGHLANDS_KEY,
      FROSTMERE_COAST_KEY,
      SUNSCAR_EXPANSE_KEY,
      GUILD_HALL_KEY,
      WORLD_ATLAS_KEY,
      EQUIPMENT_ITEM_ATLAS_KEY,
      ADVENTURE_ITEM_ATLAS_KEY,
      MATERIAL_ITEM_ATLAS_KEY,
      TROPHY_ITEM_ATLAS_KEY,
      CREATURE_ATLAS_KEY,
      RAT_KEY,
      WOLF_KEY,
      DRAKE_KEY,
      DUNE_STALKER_KEY,
      BOAR_KEY,
      SLIME_KEY,
      TREANT_KEY,
      TREANT_ATTACK_KEY,
      SKELETON_IDLE_KEY,
      SKELETON_MOVE_KEY,
      WITCH_IDLE_KEY,
      WITCH_MOVE_KEY,
      WITCH_SKILL_KEY,
      ARCANE_BOLT_KEY,
      FIREBALL_KEY,
      FIREBOMB_KEY,
      MAGIC_SPARKS_KEY,
      ANSIMUZ_DARK_BOLT_KEY,
      ANSIMUZ_FIRE_BOMB_KEY,
      ANSIMUZ_LIGHTNING_KEY,
      ANSIMUZ_SPARK_KEY,
    ].forEach((key) => {
      // Distant maps and the full cosmetic catalog stream after the first
      // frame. Do not touch Phaser's missing texture while those assets wait.
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
    this.addLoadedWorldImage(WORLD_KEY, 0);
    this.addLoadedWorldImage(BRIARWILD_KEY, 1024);
    // This authored strip bridges the town gate into the forest road, hiding
    // the hard edge where the two painted region canvases meet.
    this.addLoadedWorldImage(BRIARWILD_TRANSITION_KEY, 864, -49);
    this.addLoadedWorldImage(SUNSTONE_CATACOMBS_KEY, 2048);
    this.createAtmosphere();
    this.createRegionalAtmosphere();
    this.createCatacombAtmosphere();
    this.createMoonfenAtmosphere();
    this.createEmberfallAtmosphere();
    this.createFrostmereAtmosphere();
    this.createSunscarAtmosphere();
    this.createGuildHallAtmosphere();
    this.createIcefangAtmosphere();
    this.refreshRegionalAtmosphere();
    this.createCreatureAnimations();
    this.createCombatEffectAnimations();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,SPACE,ESC,X,ONE,TWO,THREE,FOUR,FIVE") as Record<string, Phaser.Input.Keyboard.Key>;

    this.createZoneLabels();
    this.createAnimatedLandmarks();
    this.createRegionalLandmarkAccents();
    this.refreshRegionalAtmosphere();
    this.createTownSanctuary();
    this.createNpcs();
    this.createAmbientCitizens();
    this.createWaystones();
    this.createDungeonPortals();
    this.createResources();
    this.createEnemies();

    this.playerBeacon = this.add
      .ellipse(0, 0, 40, 16)
      .setStrokeStyle(1.5, 0x67f5d3, 0.48)
      .setFillStyle(0x67f5d3, 0.06)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4997);
    this.tweens.add({
      targets: this.playerBeacon,
      scaleX: 1.12,
      scaleY: 1.18,
      alpha: { from: 0.72, to: 0.28 },
      duration: 920,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.player = new LayeredHero(
      this,
      this.playerPos.x,
      this.playerPos.y,
      this.progress.appearance,
      this.progress.equipped,
      this.progress.customization,
    );
    this.player.setDepth(5000);
    this.applyEquipmentVisuals();
    this.playerName = this.add.text(0, 0, this.displayName, nameStyle("#fff0b0")).setOrigin(0.5, 1).setDepth(5001);
    this.selectedRing = this.add.ellipse(0, 0, 56, 26).setStrokeStyle(2, 0xf2c75c, 0.95).setVisible(false).setDepth(4900);
    this.tweens.add({
      targets: this.selectedRing,
      scaleX: 1.16,
      scaleY: 1.16,
      alpha: { from: 0.95, to: 0.42 },
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.nearbyRing = this.add.ellipse(0, 0, 48, 20).setStrokeStyle(2, 0x8de8bf, 0.72).setVisible(false).setDepth(4898);
    this.nearbyPrompt = this.add
      .text(0, -34, "E", {
        fontFamily: "Verdana, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#f8f0cf",
        backgroundColor: "#18251d",
        stroke: "#0b100d",
        strokeThickness: 3,
        padding: { x: 5, y: 3 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(20_100);
    this.tweens.add({
      targets: this.nearbyRing,
      scaleX: 1.14,
      scaleY: 1.14,
      alpha: { from: 0.72, to: 0.24 },
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: this.nearbyPrompt,
      y: "-=3",
      duration: 660,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.createQuestMarker();
    this.createSideQuestMarkers();
    this.createPublicEventMarker();
    this.refreshTreasureMarker();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.inputPaused || this.activeResourceId || pointer.rightButtonDown()) return;
      this.callbacks.onDialogue(null);
      this.approachTarget = null;
      if (!this.activeEnemyId) {
        this.selectedEnemyId = null;
        this.selectedRing.setVisible(false);
        this.emitHud({ target: null }, false);
      }
      if (!this.planWalkTo(pointer.worldX, pointer.worldY)) {
        this.emitHud({ message: "No clear route to that location." });
      }
    });

    this.cameras.main.startFollow(this.player.root, true, 0.11, 0.11);
    this.cameras.main.setZoom(this.cameraZoom);
    this.applyWorldArea(this.playerPos.y, true);
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_pointer: Phaser.Input.Pointer, _objects: unknown[], _deltaX: number, deltaY: number) => {
      if (this.inputPaused || Math.abs(deltaY) < 1) return;
      this.adjustCameraZoom(deltaY > 0 ? -0.12 : 0.12);
    });
    void this.connectMultiplayer();
    this.updatePlayerView();
    const featured = this.featuredWorldEventState();
    this.publicEventSlot = publicEventRotation().slot;
    this.emitHud({
      message: "Welcome to Orehaven. Talk to Mira beside the fountain.",
      action: "Talk to Mira",
      location: "Orehaven Square",
      worldEvent: featured,
      abilityCooldowns: this.abilityCooldowns,
    });
    this.callbacks.onReady?.();
    this.queueBackgroundWorldMaps();
  }

  private addLoadedWorldImage(key: string, y: number, depth = -50) {
    if (!this.textures.exists(key)) return;
    this.add.image(0, y, key).setOrigin(0).setDepth(depth);
  }

  private queueBackgroundWorldMaps() {
    if (this.backgroundWorldMapsQueued || this.disposed) return;
    this.backgroundWorldMapsQueued = true;
    const maps = WORLD_LAYER_MANIFEST;
    maps.forEach((map) => this.load.image(map.key, map.path));
    this.load.spritesheet(TREANT_KEY, "/assets/rpg/creatures/briar-treant-idle.png", { frameWidth: 543, frameHeight: 724 });
    this.load.spritesheet(TREANT_ATTACK_KEY, "/assets/rpg/creatures/briar-treant-rootwake.png", { frameWidth: 362, frameHeight: 724 });
    this.load.spritesheet(SKELETON_IDLE_KEY, "/assets/rpg/creatures/skeleton-idle.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet(SKELETON_MOVE_KEY, "/assets/rpg/creatures/skeleton-move.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet(WITCH_IDLE_KEY, "/assets/rpg/creatures/witch-doctor-idle.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet(WITCH_MOVE_KEY, "/assets/rpg/creatures/witch-doctor-move.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet(WITCH_SKILL_KEY, "/assets/rpg/creatures/witch-doctor-skill.png", { frameWidth: 128, frameHeight: 128 });
    // Queue the rest of the paperdoll catalog behind the first playable frame.
    preloadLayeredHeroAssets(this);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (this.disposed) return;
      maps.forEach((map) => this.addLoadedWorldImage(map.key, map.y, map.depth ?? -50));
      this.createCreatureAnimations();
      this.enemyRuntime.forEach((enemy) => this.playEnemyIdle(enemy));
      // Replay every modular actor once the deferred paper-doll catalog is
      // decoded. Missing layers are hidden during initial creation and would
      // otherwise leave NPC clothing, hair, armor, or weapons invisible.
      this.player?.setLoadout(this.progress.equipped);
      this.npcRuntime.forEach((npc) => npc.hero.setLoadout(NPC_VISUALS[npc.definition.id].equipped));
      this.ambientCitizens.forEach((citizen) => citizen.hero.setLoadout(citizen.definition.equipped));
      this.remotes.forEach((remote) => {
        remote.hero.setLoadout(remote.equipped);
        remote.hero.setCustomization(remote.customization);
      });
      this.setHeroAction(this.heroAction);
      this.syncRegionalSimulation();
    });
    this.load.start();
  }

  update(time: number, delta: number) {
    this.syncFeaturedWorldEvent();
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.interact();
    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.activateHotbarSlot(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.activateHotbarSlot(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) this.activateHotbarSlot(2);
    if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) this.activateHotbarSlot(3);
    if (Phaser.Input.Keyboard.JustDown(this.keys.FIVE)) this.activateHotbarSlot(4);
    if (Phaser.Input.Keyboard.JustDown(this.keys.X) || (this.actionLock && Phaser.Input.Keyboard.JustDown(this.keys.ESC))) {
      this.cancelCurrentAction();
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.callbacks.onPanelRequest(null);
    }
    this.updateMovement(delta);
    if (this.moving && time - this.lastFootstepAt >= 285) {
      this.lastFootstepAt = time;
      this.callbacks.onAudio("footstep");
      this.spawnFootstepDust();
    }
    this.updatePlayerView();
    this.checkRegionDiscovery();
    this.updateAmbientCitizens(delta);
    this.updateRemotes(delta);
    this.updateChatBubbles();
    this.updateNameplates();
    this.updateQuestMarker();
    this.updateSideQuestMarkers();
    this.updatePublicEventMarker();
    this.updateActiveAction();
    this.updateNearbyAction();
    if (time - this.lastPositionHudEmit >= 100) {
      this.lastPositionHudEmit = time;
      this.emitHud({}, false);
    }
    if (time - this.lastPositionSaveEmit >= 1_000 && this.moving) {
      this.lastPositionSaveEmit = time;
      this.progress = { ...this.progress, position: { x: this.playerPos.x, y: this.playerPos.y } };
      if (this.profileMode !== "supabase") this.emitHud({ progress: this.progress });
    }
  }

  interact() {
    if (this.actionLock || this.inputPaused) return;
    if (this.selectedEnemyId) {
      this.engageSelectedTarget();
      return;
    }
    const treasureClue = this.activeTreasureClue();
    if (treasureClue && Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, treasureClue.x, treasureClue.y) <= INTERACTION_RANGE + 18) {
      this.advanceTreasureTrail();
      return;
    }
    const target = this.nearestTarget();
    if (!target) {
      this.emitHud({ message: "Nothing is close enough to interact with." });
      return;
    }
    if (target.kind === "npc") this.talkToNpc(target.value.definition);
    if (target.kind === "enemy") this.beginCombat(target.value);
    if (target.kind === "resource") this.beginGathering(target.value);
    if (target.kind === "waystone") this.activateWaystone(target.value);
    if (target.kind === "portal") this.activateDungeonPortal(target.value);
    if (target.kind === "sanctuary") this.restAtSanctuary();
  }

  engageSelectedTarget() {
    if (this.inputPaused || this.actionLock) return;
    const enemy = this.selectedEnemyId ? this.enemyRuntime.get(this.selectedEnemyId) : null;
    if (!enemy || enemy.hp <= 0 || enemy.respawnAt > Date.now()) {
      this.selectedEnemyId = null;
      this.selectedRing.setVisible(false);
      this.emitHud({ target: null, message: "That creature is no longer available." }, false);
      return;
    }
    this.approach({ kind: "enemy", id: enemy.definition.id, x: enemy.definition.x, y: enemy.definition.y });
  }

  travelToWaystone(waystoneId: string) {
    const waystone = WAYSTONES.find((entry) => entry.id === waystoneId);
    if (!waystone || !this.progress.waystones.includes(waystone.id)) {
      this.emitHud({ message: "Attune that waystone in the world before travelling there." });
      return;
    }
    if (this.actionLock) {
      this.emitHud({ message: "Finish or cancel your current action before travelling." });
      return;
    }
    if (this.isRealtimeOnline()) {
      this.ws!.send(JSON.stringify({ type: "rpg_waystone_travel", waystoneId }));
      this.emitHud({ message: `Travelling to ${waystone.region}...` }, false);
      return;
    }
    this.completeWaystoneTravel(waystone);
  }

  setInputPaused(paused: boolean) {
    this.inputPaused = paused;
    if (paused) {
      this.walkTarget = null;
      this.walkPath = [];
      this.setHeroAction("idle");
    }
  }

  setHotbarLayout(layout: Array<HotbarEntry | null>) {
    this.hotbarLayout = Array.from({ length: 5 }, (_, index) => {
      const entry = layout[index];
      if (entry?.kind === "ability" && (["signature", "second-wind", "tree-primary", "tree-secondary"].includes(entry.slot) || entry.slot.startsWith("tree:"))) return { ...entry };
      if (entry?.kind === "consumable" && itemById(entry.itemId)?.category === "consumable") return { ...entry };
      return null;
    });
  }

  private activateHotbarSlot(index: number) {
    if (this.inputPaused) return;
    const entry = this.hotbarLayout[index];
    if (!entry) {
      this.emitHud({ message: `Hotbar slot ${index + 1} is empty.` });
      return;
    }
    if (entry.kind === "ability") this.useCombatAbility(entry.slot);
    else this.consumeItem(entry.itemId);
  }

  cancelCurrentAction() {
    if (!this.actionLock) return;
    const enemyId = this.activeEnemyId;
    const resourceId = this.activeResourceId;
    this.actionTimer?.remove(false);
    this.actionTimer = null;
    if (this.isRealtimeOnline()) {
      this.ws!.send(JSON.stringify({ type: "rpg_action_cancel", enemyId, resourceId }));
    }
    this.finishAction(enemyId ? "You disengaged. Move away before the creature closes in again." : "Gathering cancelled.");
  }

  useCombatAbility(slot: CombatAbilitySlot) {
    const now = Date.now();
    if (slot === "second-wind") {
      if (this.abilityCooldowns.secondWindReadyAt > now) {
        this.emitHud({ message: `Second Wind is ready in ${Math.ceil((this.abilityCooldowns.secondWindReadyAt - now) / 1000)}s.` });
        return;
      }
      if (this.progress.hp >= this.progress.maxHp) {
        this.emitHud({ message: "You are already at full health." });
        return;
      }
      if (this.isRealtimeOnline() && this.profileMode === "supabase") {
        this.ws!.send(JSON.stringify({ type: "rpg_combat_ability", abilityId: "second-wind" }));
        this.emitHud({ message: "Calling on Second Wind..." });
        return;
      }
      const healing = Math.min(
        this.progress.maxHp - this.progress.hp,
        armorHealingAmount(this.progress.equipped.armor, Math.max(8, Math.ceil(this.progress.maxHp * 0.24))),
      );
      this.progress = { ...this.progress, hp: this.progress.hp + healing };
      this.abilityCooldowns = { ...this.abilityCooldowns, secondWindReadyAt: now + 18_000 };
      this.showHealingNumber(healing);
      this.emitHud({ progress: this.progress, abilityCooldowns: this.abilityCooldowns, message: `Second Wind restored ${healing} hitpoints.` });
      return;
    }

    if (slot === "tree-primary" || slot === "tree-secondary" || slot.startsWith("tree:")) {
      const style = this.currentCombatStyle();
      const abilities = unlockedTreeAbilities(this.progress, style);
      const ability = slot.startsWith("tree:")
        ? abilities.find((entry) => entry.id === slot.slice(5))
        : abilities[slot === "tree-primary" ? 0 : 1];
      if (!ability) {
        this.emitHud({ message: `Unlock a ${combatStyleLabel(style)} skill in the Skills panel first.` });
        return;
      }
      const readyAt = this.abilityCooldowns.treeReadyAt[ability.id] ?? 0;
      if (readyAt > now) {
        this.emitHud({ message: `${ability.name} is ready in ${Math.ceil((readyAt - now) / 1000)}s.` });
        return;
      }
      const enemy = this.activeEnemyId ? this.enemyRuntime.get(this.activeEnemyId) : null;
      if (!enemy || enemy.hp <= 0 || enemy.respawnAt > now) {
        this.emitHud({ message: `Engage a creature before using ${ability.name}.` });
        return;
      }
      if (this.awaitingCombatResponse) {
        this.emitHud({ message: "Finish the current attack first." });
        return;
      }
      if (this.isRealtimeOnline()) {
        this.awaitingCombatResponse = true;
        this.playTreeAbilityFx(enemy, ability);
        this.ws!.send(JSON.stringify({ type: "rpg_tree_ability", enemyId: enemy.definition.id, abilityId: ability.id }));
        return;
      }
      const bonuses = skillTreeBonuses(this.progress, style);
      const cooldownMs = Math.max(1_000, Math.round(ability.cooldownMs * bonuses.cooldownMultiplier));
      this.abilityCooldowns = {
        ...this.abilityCooldowns,
        treeReadyAt: { ...this.abilityCooldowns.treeReadyAt, [ability.id]: now + cooldownMs },
      };
      this.playTreeAbilityFx(enemy, ability);
      this.applyLocalTreeAbility(enemy, ability);
      return;
    }

    if (this.abilityCooldowns.signatureReadyAt > now) {
      this.emitHud({ message: `${weaponAbility(this.progress.equipped.weapon).name} is ready in ${Math.ceil((this.abilityCooldowns.signatureReadyAt - now) / 1000)}s.` });
      return;
    }
    const enemy = this.activeEnemyId ? this.enemyRuntime.get(this.activeEnemyId) : null;
    if (!this.actionLock || !enemy || enemy.hp <= 0 || enemy.respawnAt > now) {
      this.emitHud({ message: "Engage a creature before using your signature ability." });
      return;
    }
    const style = this.currentCombatStyle();
    const ability = weaponAbility(this.progress.equipped.weapon);
    const weapon = itemById(this.progress.equipped.weapon);
    if (this.isRealtimeOnline()) {
      if (this.awaitingCombatResponse) {
        this.emitHud({ message: "Finish the current attack before using your signature ability." });
        return;
      }
      this.sendCombatStrike(enemy, weapon?.power ?? 1, style, ability.id);
      return;
    }
    this.abilityCooldowns = { ...this.abilityCooldowns, signatureReadyAt: now + ability.cooldownMs };
    this.playSignatureAbilityFx(enemy, style, ability.id);
    const treeBonusesForStrike = skillTreeBonuses(this.progress, style);
    const damage = applyLocalSkillTreeDamage(abilityDamage(
      localCombatDamage(style, this.progress.skills[combatSkillForStyle(style)].level, weapon?.power ?? 1),
      ability,
      enemy.hp,
      enemy.definition.maxHp,
    ), treeBonusesForStrike, enemy.hp, enemy.definition.maxHp);
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (ability.status && enemy.hp > 0) {
      enemy.status = {
        kind: ability.status.kind,
        label: ability.status.label,
        expiresAt: now + ability.status.durationMs,
        strength: ability.status.strength ?? 0,
      };
      this.showEnemyStatusFx(enemy, enemy.status);
    }
    this.drawEnemyHp(enemy);
    this.showDamageNumber(enemy, damage, style);
    this.emitHud({
      abilityCooldowns: this.abilityCooldowns,
      target: this.targetState(enemy),
      message: `${ability.name} hits ${enemy.definition.name} for ${damage}.`,
    });
    if (enemy.hp <= 0) this.finishCombat(enemy);
  }

  unlockSkillNode(nodeId: string) {
    const node = SKILL_TREE_NODES.find((entry) => entry.id === nodeId);
    if (!node) return;
    if (this.progress.skillTree.unlocked.includes(node.id)) return;
    if (this.useAuthoritativeProfileAction({ action: "unlock_skill", nodeId }, `Unlocking ${node.name}...`)) return;
    if (!skillTreeNodeConnected(node, new Set(this.progress.skillTree.unlocked))) {
      this.emitHud({ message: "Unlock a connected skill before taking this node." });
      return;
    }
    if (this.progress.skills[combatSkillForStyle(node.branch)].level < node.requiredLevel) {
      this.emitHud({ message: `${node.name} requires ${node.branch} level ${node.requiredLevel}.` });
      return;
    }
    if (skillTreePointsAvailable(this.progress) <= 0) {
      this.emitHud({ message: "Earn more combat levels to gain another skill point." });
      return;
    }
    this.progress = { ...this.progress, skillTree: { unlocked: [...this.progress.skillTree.unlocked, node.id] } };
    this.emitHud({ progress: this.progress, message: `${node.name} unlocked.` });
  }

  respecSkillTree() {
    if (this.progress.skillTree.unlocked.length === 0) {
      this.emitHud({ message: "Your skill tree is already clear." });
      return;
    }
    if (this.useAuthoritativeProfileAction({ action: "respec_skills" }, "Refunding your skill points...")) return;
    this.progress = { ...this.progress, skillTree: { unlocked: [] } };
    this.emitHud({ progress: this.progress, message: "Skill points refunded. Try a new combat build." });
  }

  sendChat(text: string, channel: "world" | "party" | "guild" = "world") {
    const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 160);
    if (!cleaned) return;
    if (!this.isRealtimeOnline()) {
      this.callbacks.onChat({
        id: `offline-${Date.now()}`,
        playerId: null,
        name: "System",
        text: "World chat is unavailable while disconnected.",
        at: Date.now(),
        kind: "system",
      });
      return;
    }
    this.ws!.send(JSON.stringify(channel === "world"
      ? { type: "rpg_chat", text: cleaned }
      : { type: "rpg_social_chat", channel, text: cleaned }));
  }

  inviteToParty(targetPlayerId: string) {
    if (!this.isRealtimeOnline()) {
      this.emitHud({ message: "Reconnect before inviting another adventurer." });
      return;
    }
    this.ws!.send(JSON.stringify({ type: "rpg_party_invite", targetPlayerId }));
  }

  respondToPartyInvite(accept: boolean) {
    if (!this.isRealtimeOnline()) return;
    this.callbacks.onSocial({ invite: null });
    this.ws!.send(JSON.stringify({ type: accept ? "rpg_party_accept" : "rpg_party_decline" }));
  }

  leaveParty() {
    if (!this.isRealtimeOnline()) return;
    this.ws!.send(JSON.stringify({ type: "rpg_party_leave" }));
  }

  createGuild(name: string, tag: string) {
    if (!this.isRealtimeOnline()) {
      this.emitHud({ message: "Reconnect before founding a guild." });
      return;
    }
    this.ws!.send(JSON.stringify({ type: "rpg_guild_create", name, tag }));
  }

  inviteToGuild(targetPlayerId: string) {
    if (!this.isRealtimeOnline()) return;
    this.ws!.send(JSON.stringify({ type: "rpg_guild_invite", targetPlayerId }));
  }

  respondToGuildInvite(accept: boolean) {
    if (!this.isRealtimeOnline()) return;
    this.callbacks.onSocial({ guildInvite: null });
    this.ws!.send(JSON.stringify({ type: accept ? "rpg_guild_accept" : "rpg_guild_decline" }));
  }

  leaveGuild() {
    if (!this.isRealtimeOnline()) return;
    this.ws!.send(JSON.stringify({ type: "rpg_guild_leave" }));
  }

  startExpedition(expeditionId: string) {
    if (!this.isRealtimeOnline()) return;
    this.ws!.send(JSON.stringify({ type: "rpg_expedition_start", expeditionId }));
  }

  equipItem(itemId: string) {
    const item = itemById(itemId);
    if (!item?.slot || (this.progress.inventory[itemId] ?? 0) <= 0) return;
    if (item.requiredSkill && this.progress.skills[item.requiredSkill].level < (item.requiredLevel ?? 1)) {
      this.emitHud({
        message: `${item.name} requires ${item.requiredSkill} level ${item.requiredLevel ?? 1}.`,
      });
      return;
    }
    if (this.useAuthoritativeProfileAction({ action: "equip", itemId }, `Equipping ${item.name}...`)) return;
    const equipped = { ...this.progress.equipped, [item.slot]: itemId };
    const nextMaxHp = maxHpForProgress({ skills: this.progress.skills, equipped });
    this.progress = {
      ...this.progress,
      equipped,
      maxHp: nextMaxHp,
      hp: Math.min(nextMaxHp, this.progress.hp + Math.max(0, nextMaxHp - this.progress.maxHp)),
    };
    this.applyEquipmentVisuals();
    this.emitHud({ message: `${item.name} equipped.` });
  }

  setAppearance(appearance: AppearanceId) {
    if (this.useAuthoritativeProfileAction({ action: "appearance", appearance }, "Updating appearance...")) return;
    const customization = customizationForAppearance(appearance);
    this.progress = { ...this.progress, appearance, customization };
    this.player.setAppearance(appearance);
    this.player.setCustomization(customization);
    this.applyEquipmentVisuals();
    this.setHeroAction("idle");
    this.emitHud({ message: `${appearanceName(appearance)} appearance equipped.` });
  }

  setCustomization(customization: CharacterCustomization) {
    if (this.useAuthoritativeProfileAction(
      { action: "customization", customization },
      "Updating character customization...",
    )) return;
    this.progress = { ...this.progress, customization: { ...customization } };
    this.player.setCustomization(customization);
    this.setHeroAction("idle");
    this.emitHud({ message: "Character customization updated." });
  }

  setIdentity(displayName: string, appearance: AppearanceId, customization: CharacterCustomization) {
    const safeName = displayName
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24);
    if (!safeName) return;
    this.displayName = safeName;
    this.progress = { ...this.progress, appearance, customization: { ...customization } };
    this.player.setAppearance(appearance);
    this.player.setCustomization(customization);
    this.applyEquipmentVisuals();
    this.setHeroAction("idle");
    window.localStorage.setItem("ore-acres-rpg-name", safeName);
    this.refreshSocialWorldIndicators();
    this.emitHud({ message: "Adventurer identity updated." });
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "rpg_identity_update",
        displayName: safeName,
        appearance,
        customization,
      }));
    }
  }

  setDisplayName(value: string) {
    const displayName = value
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24);
    if (!displayName) return;
    this.displayName = displayName;
    window.localStorage.setItem("ore-acres-rpg-name", displayName);
    this.refreshSocialWorldIndicators();
    this.emitHud({ message: `Adventurer name changed to ${displayName}.` }, false);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "rpg_identity_update", displayName }));
    }
  }

  buyItem(itemId: string) {
    const item = itemById(itemId);
    if (!item || item.cost <= 0) return;
    if (this.progress.gold < item.cost) {
      this.emitHud({ message: `You need ${item.cost - this.progress.gold} more gold for ${item.name}.` });
      return;
    }
    if (this.useAuthoritativeProfileAction({ action: "buy", itemId }, `Purchasing ${item.name}...`)) return;
    this.progress = {
      ...this.progress,
      gold: this.progress.gold - item.cost,
      inventory: { ...this.progress.inventory, [itemId]: (this.progress.inventory[itemId] ?? 0) + 1 },
    };
    this.emitHud({ message: `${item.name} added to your inventory.` });
  }

  sideQuestAction(questId: string) {
    const quest = SIDE_QUESTS.find((entry) => entry.id === questId);
    if (!quest) return;
    if (this.useAuthoritativeProfileAction({ action: "side_quest", questId }, `Updating ${quest.title}...`)) return;
    const state = this.progress.sideQuests[quest.id];
    if (!state) {
      if (this.progress.questStep < quest.unlockQuestStep) return;
      this.progress = { ...this.progress, sideQuests: { ...this.progress.sideQuests, [quest.id]: { status: "active", progress: 0 } } };
      this.emitHud({ progress: this.progress, message: `Side quest accepted: ${quest.title}.` });
      return;
    }
    if (state.status !== "ready") {
      this.emitHud({ message: state.status === "claimed" ? `${quest.title} is already complete.` : `${quest.objective.label}: ${state.progress}/${quest.objective.target}.` });
      return;
    }
    this.addXp(quest.reward.xpSkill, quest.reward.xp);
    this.progress = {
      ...this.progress,
      gold: this.progress.gold + quest.reward.gold,
      inventory: { ...this.progress.inventory, [quest.reward.itemId]: (this.progress.inventory[quest.reward.itemId] ?? 0) + quest.reward.quantity },
      sideQuests: { ...this.progress.sideQuests, [quest.id]: { ...state, status: "claimed" } },
    };
    const rewardItem = itemById(quest.reward.itemId);
    this.callbacks.onToast({
      title: `${quest.title} complete`,
      detail: `+${quest.reward.gold} gold • +${quest.reward.xp} ${skillLabel(quest.reward.xpSkill)} XP • ${rewardItem?.name ?? quest.reward.itemId} x${quest.reward.quantity}`,
      tone: "quest",
      itemId: quest.reward.itemId,
    });
    this.emitHud({ progress: this.progress, message: `${quest.title} complete.` });
  }

  sellItem(itemId: string) {
    const item = itemById(itemId);
    const quantity = this.progress.inventory[itemId] ?? 0;
    if (!item?.sellValue || item.sellValue <= 0 || quantity <= 0) return;
    if (Object.values(this.progress.equipped).includes(itemId)) {
      this.emitHud({ message: `Unequip ${item.name} before selling it.` });
      return;
    }
    if (this.useAuthoritativeProfileAction({ action: "sell", itemId }, `Selling ${item.name}...`)) return;
    this.progress = {
      ...this.progress,
      gold: this.progress.gold + item.sellValue,
      inventory: { ...this.progress.inventory, [itemId]: quantity - 1 },
    };
    this.emitHud({ message: `${item.name} sold for ${item.sellValue} gold. Collection credit is preserved.` });
  }

  consumeItem(itemId: string) {
    const item = itemById(itemId);
    if (!item || item.category !== "consumable" || (this.progress.inventory[itemId] ?? 0) <= 0) return;
    if (this.progress.hp >= this.progress.maxHp) {
      this.emitHud({ message: "Your hitpoints are already full." });
      return;
    }
    if (this.useAuthoritativeProfileAction({ action: "consume", itemId }, `Using ${item.name}...`)) return;
    const healing = Math.min(
      this.progress.maxHp - this.progress.hp,
      armorHealingAmount(this.progress.equipped.armor, item.healing ?? 0),
    );
    this.progress = {
      ...this.progress,
      hp: Math.min(this.progress.maxHp, this.progress.hp + healing),
      inventory: { ...this.progress.inventory, [itemId]: this.progress.inventory[itemId] - 1 },
    };
    this.showHealingNumber(healing);
    this.emitHud({ message: `${item.name} restored ${healing} hitpoints.` });
  }

  startTreasureTrail() {
    if (this.progress.treasureTrail) {
      const clue = this.activeTreasureClue();
      this.emitHud({ message: clue ? `Active clue: ${clue.clue}` : "You already have an active treasure trail." });
      return;
    }
    if ((this.progress.inventory["treasure-scroll"] ?? 0) <= 0) return;
    if (this.useAuthoritativeProfileAction({ action: "treasure_start" }, "Unsealing treasure scroll...")) return;
    this.progress = {
      ...this.progress,
      inventory: { ...this.progress.inventory, "treasure-scroll": this.progress.inventory["treasure-scroll"] - 1 },
      treasureTrail: { step: 0 },
    };
    this.refreshTreasureMarker();
    this.callbacks.onToast({ title: TREASURE_CLUES[0].title, detail: TREASURE_CLUES[0].clue, tone: "quest" });
    this.emitHud({ message: `Treasure trail started: ${TREASURE_CLUES[0].clue}` });
  }

  private advanceTreasureTrail() {
    const clue = this.activeTreasureClue();
    if (!clue || Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, clue.x, clue.y) > INTERACTION_RANGE + 18) return;
    this.faceToward(clue.x, clue.y);
    this.setHeroAction("attune");
    if (this.useAuthoritativeProfileAction({ action: "treasure_advance", clueId: clue.id }, `Searching ${clue.title}...`)) return;
    const step = this.progress.treasureTrail?.step ?? 0;
    if (step < TREASURE_CLUES.length - 1) {
      const nextClue = TREASURE_CLUES[step + 1];
      this.progress = { ...this.progress, treasureTrail: { step: step + 1 } };
      this.refreshTreasureMarker();
      this.callbacks.onToast({ title: "Clue solved", detail: `${nextClue.title} • ${nextClue.clue}`, tone: "quest" });
      this.emitHud({ message: `Next clue: ${nextClue.clue}` });
      this.setHeroAction("idle");
      return;
    }
    this.addXp("crafting", 140);
    this.progress = {
      ...this.progress,
      treasureTrail: null,
      gold: this.progress.gold + 260,
      inventory: {
        ...this.progress.inventory,
        "founders-relic": (this.progress.inventory["founders-relic"] ?? 0) + 1,
        "healing-potion": (this.progress.inventory["healing-potion"] ?? 0) + 2,
      },
      collectionLog: {
        ...this.progress.collectionLog,
        "founders-relic": (this.progress.collectionLog["founders-relic"] ?? 0) + 1,
      },
    };
    this.refreshTreasureMarker();
    this.callbacks.onToast({ title: "Treasure trail complete", detail: "+260 gold • Founder's Sun Relic • 2 Crimson Tonics", tone: "loot", itemId: "founders-relic" });
    this.emitHud({ message: "You recovered the Founder's Sun Relic." });
    this.setHeroAction("idle");
  }

  private activeTreasureClue() {
    return this.progress.treasureTrail ? TREASURE_CLUES[this.progress.treasureTrail.step] ?? null : null;
  }

  private refreshTreasureMarker() {
    this.treasureMarker?.destroy(true);
    this.treasureMarker = null;
    const clue = this.activeTreasureClue();
    if (!clue || !this.add) return;
    const glow = this.add.ellipse(0, 4, 42, 20, 0xe0bd55, 0.14).setStrokeStyle(2, 0xf0d878, 0.82);
    const mound = this.add.ellipse(0, 5, 24, 10, 0x594127, 0.92).setStrokeStyle(1, 0x9b7845, 0.9);
    const cross = this.add.text(0, -4, "X", { fontFamily: "Georgia, serif", fontSize: "17px", fontStyle: "bold", color: "#ffe59b", stroke: "#3b2818", strokeThickness: 3 }).setOrigin(0.5);
    const label = this.add.text(0, -24, clue.title, nameStyle("#ffe08a")).setOrigin(0.5, 1);
    this.treasureMarker = this.add.container(clue.x, clue.y, [glow, mound, cross, label]).setDepth(clue.y + 8);
    this.tweens.add({ targets: glow, scaleX: 1.3, scaleY: 1.3, alpha: { from: 0.75, to: 0.2 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: cross, y: -8, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  depositItem(itemId: string) {
    const quantity = this.progress.inventory[itemId] ?? 0;
    if (quantity <= 0) return;
    if (Object.values(this.progress.equipped).includes(itemId)) {
      this.emitHud({ message: "Unequip that item before depositing it." });
      return;
    }
    const item = itemById(itemId);
    if (this.useAuthoritativeProfileAction({ action: "deposit", itemId }, `Depositing ${item?.name ?? "item"}...`)) return;
    this.progress = {
      ...this.progress,
      inventory: { ...this.progress.inventory, [itemId]: quantity - 1 },
      bank: { ...this.progress.bank, [itemId]: (this.progress.bank[itemId] ?? 0) + 1 },
    };
    this.emitHud({ message: `${item?.name ?? "Item"} deposited.` });
  }

  withdrawItem(itemId: string) {
    const quantity = this.progress.bank[itemId] ?? 0;
    if (quantity <= 0) return;
    const item = itemById(itemId);
    if (this.useAuthoritativeProfileAction({ action: "withdraw", itemId }, `Withdrawing ${item?.name ?? "item"}...`)) return;
    this.progress = {
      ...this.progress,
      inventory: { ...this.progress.inventory, [itemId]: (this.progress.inventory[itemId] ?? 0) + 1 },
      bank: { ...this.progress.bank, [itemId]: quantity - 1 },
    };
    this.emitHud({ message: `${item?.name ?? "Item"} withdrawn.` });
  }

  craftRecipe(recipeId: string) {
    const recipe = RECIPES.find((entry) => entry.id === recipeId);
    if (!recipe) return;
    const skill = this.progress.skills[recipe.profession];
    if (skill.level < recipe.requiredLevel) {
      this.emitHud({ message: `${recipe.name} requires ${recipe.profession} level ${recipe.requiredLevel}.` });
      return;
    }
    const missing = recipe.inputs.find((input) => (this.progress.inventory[input.itemId] ?? 0) < input.quantity);
    if (missing) {
      const item = itemById(missing.itemId);
      const shortfall = missing.quantity - (this.progress.inventory[missing.itemId] ?? 0);
      this.emitHud({ message: `You need ${shortfall} more ${item?.name ?? "material"} for ${recipe.name}.` });
      return;
    }
    if (this.useAuthoritativeProfileAction({ action: "craft", recipeId }, `Crafting ${recipe.name}...`)) return;

    const inventory = { ...this.progress.inventory };
    recipe.inputs.forEach((input) => {
      inventory[input.itemId] = Math.max(0, (inventory[input.itemId] ?? 0) - input.quantity);
    });
    inventory[recipe.output.itemId] = (inventory[recipe.output.itemId] ?? 0) + recipe.output.quantity;
    this.progress = { ...this.progress, inventory };
    this.addXp(recipe.profession, recipe.xp);
    this.progress = {
      ...this.progress,
      questStep: questStepAfterCraft(this.progress.questStep, recipe.id),
      activities: recordActivity(this.progress.activities, "craft"),
    };
    const output = itemById(recipe.output.itemId);
    this.cameras.main.flash(180, recipe.profession === "smithing" ? 255 : 141, 184, 89, false);
    this.callbacks.onToast({
      title: recipe.name,
      detail: `${output?.name ?? "Item"} x${recipe.output.quantity} • +${recipe.xp} ${recipe.profession} XP`,
      tone: "craft",
      itemId: output?.id,
    });
    this.emitHud({
      message: `${recipe.name} complete. +${recipe.xp} ${recipe.profession} XP • ${output?.name ?? "item"} x${recipe.output.quantity}.`,
    });
  }

  claimContract(contractId: string) {
    const contract = DAILY_CONTRACTS.find((entry) => entry.id === contractId);
    if (!contract) return;
    if (this.useAuthoritativeProfileAction(
      { action: "claim_contract", contractId },
      `Claiming ${contract.title}...`,
    )) return;

    const activities = normalizeActivityProgress(this.progress.activities);
    const kind = contract.kind as ActivityKind;
    if (activities.daily.claimed.includes(contract.id)) {
      this.emitHud({ message: `${contract.title} was already claimed today.` });
      return;
    }
    if (activityContractCount(activities, contract) < contract.target) {
      this.emitHud({ message: `${contract.title} is not complete yet.` });
      return;
    }

    activities.daily.claimed = [...activities.daily.claimed, contract.id];
    const inventory = { ...this.progress.inventory };
    contract.rewardItems.forEach((reward) => {
      inventory[reward.itemId] = (inventory[reward.itemId] ?? 0) + reward.quantity;
    });
    this.progress = {
      ...this.progress,
      gold: this.progress.gold + contract.rewardGold,
      inventory,
      activities,
    };
    const rewardNames = contract.rewardItems
      .map((reward) => `${itemById(reward.itemId)?.name ?? "Item"} x${reward.quantity}`)
      .join(" • ");
    this.callbacks.onToast({
      title: "Contract complete",
      detail: `${contract.title} • +${contract.rewardGold} gold${rewardNames ? ` • ${rewardNames}` : ""}`,
      tone: "quest",
      itemId: contract.rewardItems[0]?.itemId,
    });
    this.emitHud({ message: `${contract.title} claimed. +${contract.rewardGold} gold.` });
  }

  claimAdventure(adventureId: string) {
    const adventure = ADVENTURE_CHRONICLES.find((entry) => entry.id === adventureId);
    if (!adventure) return;
    if (this.useAuthoritativeProfileAction(
      { action: "claim_adventure", adventureId },
      `Recording ${adventure.title}...`,
    )) return;

    if (this.progress.adventureClaims.includes(adventure.id)) {
      this.emitHud({ message: `${adventure.title} was already recorded.` });
      return;
    }
    if (adventureProgress(this.progress, adventure) < adventure.target) {
      this.emitHud({ message: `${adventure.title} is not complete yet.` });
      return;
    }

    const inventory = { ...this.progress.inventory };
    const collectionLog = { ...this.progress.collectionLog };
    adventure.rewardItems.forEach((reward) => {
      inventory[reward.itemId] = (inventory[reward.itemId] ?? 0) + reward.quantity;
      collectionLog[reward.itemId] = (collectionLog[reward.itemId] ?? 0) + reward.quantity;
    });
    this.progress = {
      ...this.progress,
      gold: this.progress.gold + adventure.rewardGold,
      inventory,
      collectionLog,
      adventureClaims: [...this.progress.adventureClaims, adventure.id],
    };
    const rewardNames = adventure.rewardItems
      .map((reward) => `${itemById(reward.itemId)?.name ?? "Item"} x${reward.quantity}`)
      .join(" • ");
    this.callbacks.onToast({
      title: "Chronicle recorded",
      detail: `${adventure.title} • +${adventure.rewardGold} gold${rewardNames ? ` • ${rewardNames}` : ""}`,
      tone: "quest",
      itemId: adventure.rewardItems[0]?.itemId,
    });
    this.emitHud({ message: `${adventure.title} recorded. +${adventure.rewardGold} gold.` });
  }

  centerCamera() {
    this.cameras.main.pan(this.playerPos.x, this.playerPos.y, 350, "Sine.easeInOut");
  }

  navigateToQuestTarget() {
    if (this.inputPaused || this.actionLock) return;
    const target = this.currentQuestTarget();
    if (!target) {
      this.emitHud({ message: "There is no active quest destination to navigate to." }, false);
      return;
    }
    this.cancelCurrentAction();
    this.approach(target);
    const step = QUEST_STEPS[Math.min(this.progress.questStep, QUEST_STEPS.length - 1)];
    this.emitHud({ message: `Navigating to ${step.target}. Use WASD at any time to take control.` }, false);
  }

  navigateToWorldTarget(x: number, y: number, label: string) {
    if (this.inputPaused || this.actionLock || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const targetArea = worldAreaAtY(y);
    if (targetArea !== this.activeWorldArea) {
      this.emitHud({ message: `${label} is in another region. Use an attuned waystone or the marked region gate first.` }, false);
      return;
    }
    this.cancelCurrentAction();
    this.cancelWalkTarget();
    if (!this.planWalkTo(x, y)) {
      this.emitHud({ message: `No clear route to ${label}. Move closer to the marked trail and try again.` }, false);
      return;
    }
    const marker = this.add
      .ellipse(x, y + 3, 30, 12, 0x55c8ad, 0.12)
      .setStrokeStyle(2, 0x79e5c9, 0.88)
      .setDepth(y + 8);
    this.tweens.add({ targets: marker, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 1_100, repeat: 1, onComplete: () => marker.destroy() });
    this.emitHud({ message: `Navigating to ${label}. Use WASD at any time to take control.` }, false);
  }

  adjustCameraZoom(delta: number) {
    const next = Phaser.Math.Clamp(this.cameraZoom + delta, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX);
    if (Math.abs(next - this.cameraZoom) < 0.001) return;
    this.cameraZoom = next;
    this.cameras.main.zoomTo(next, 180, "Sine.easeOut");
    this.emitHud({ message: `Camera zoom ${Math.round(((next - CAMERA_ZOOM_MIN) / (CAMERA_ZOOM_MAX - CAMERA_ZOOM_MIN)) * 100)}%.` }, false);
  }

  private createAtmosphere() {
    const motes = this.add.graphics().setDepth(1200);
    for (let index = 0; index < 70; index += 1) {
      const x = Phaser.Math.Between(40, WORLD.width - 40);
      const y = Phaser.Math.Between(30, WORLD.height - 30);
      const color = index % 3 === 0 ? 0xffe6a3 : 0xb7e493;
      motes.fillStyle(color, Phaser.Math.FloatBetween(0.08, 0.22)).fillCircle(x, y, Phaser.Math.Between(1, 2));
    }
    this.tweens.add({ targets: motes, alpha: 0.42, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    for (let index = 0; index < 22; index += 1) {
      const firefly = this.add
        .circle(
          Phaser.Math.Between(40, WORLD.width - 40),
          Phaser.Math.Between(1080, WORLD.height - 80),
          Phaser.Math.Between(1, 2),
          index % 4 === 0 ? 0x9edcff : 0xf2dc78,
          Phaser.Math.FloatBetween(0.35, 0.78),
        )
        .setDepth(1300);
      this.tweens.add({
        targets: firefly,
        x: firefly.x + Phaser.Math.Between(-28, 28),
        y: firefly.y + Phaser.Math.Between(-18, 18),
        alpha: { from: 0.18, to: 0.9 },
        duration: Phaser.Math.Between(1800, 3400),
        delay: Phaser.Math.Between(0, 1500),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere(worldAreaAtY(firefly.y), firefly);
    }
  }

  private createRegionalAtmosphere() {
    // Sparse, region-specific movement helps the painted map feel alive without
    // obscuring paths, collision edges, or combat silhouettes.
    for (let index = 0; index < 18; index += 1) {
      const leaf = this.add
        .rectangle(
          Phaser.Math.Between(58, 390),
          Phaser.Math.Between(235, 840),
          Phaser.Math.Between(2, 4),
          Phaser.Math.Between(3, 6),
          index % 3 === 0 ? 0xc2a552 : index % 2 === 0 ? 0x8ca455 : 0x607c42,
          Phaser.Math.FloatBetween(0.32, 0.68),
        )
        .setAngle(Phaser.Math.Between(-45, 45))
        .setDepth(1180 + index);
      this.tweens.add({
        targets: leaf,
        x: leaf.x + Phaser.Math.Between(22, 58),
        y: leaf.y + Phaser.Math.Between(12, 34),
        angle: leaf.angle + Phaser.Math.Between(80, 180),
        alpha: { from: 0.18, to: 0.72 },
        duration: Phaser.Math.Between(2200, 4200),
        delay: Phaser.Math.Between(0, 1800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("overworld", leaf);
    }

    for (let index = 0; index < 15; index += 1) {
      const dust = this.add
        .rectangle(
          Phaser.Math.Between(1190, 1492),
          Phaser.Math.Between(480, 960),
          Phaser.Math.Between(2, 4),
          Phaser.Math.Between(2, 3),
          index % 2 === 0 ? 0xd8b77c : 0xb58f62,
          Phaser.Math.FloatBetween(0.16, 0.38),
        )
        .setAngle(Phaser.Math.Between(0, 90))
        .setDepth(1160 + index);
      this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(-14, 18),
        y: dust.y - Phaser.Math.Between(18, 42),
        alpha: 0,
        scale: { from: 0.8, to: 1.45 },
        duration: Phaser.Math.Between(1800, 3200),
        delay: Phaser.Math.Between(0, 1400),
        repeat: -1,
        repeatDelay: Phaser.Math.Between(500, 1300),
        ease: "Quad.easeOut",
      });
      this.trackRegionalAtmosphere("overworld", dust);
    }

    for (let index = 0; index < 8; index += 1) {
      const mist = this.add
        .ellipse(
          Phaser.Math.Between(840, 1480),
          Phaser.Math.Between(1080, 1375),
          Phaser.Math.Between(70, 150),
          Phaser.Math.Between(12, 24),
          index % 2 === 0 ? 0x9bc7bc : 0x84aeb0,
          Phaser.Math.FloatBetween(0.035, 0.085),
        )
        .setDepth(1110 + index);
      this.tweens.add({
        targets: mist,
        x: mist.x + Phaser.Math.Between(-50, 70),
        scaleX: Phaser.Math.FloatBetween(1.15, 1.55),
        alpha: { from: 0.025, to: 0.1 },
        duration: Phaser.Math.Between(5000, 8200),
        delay: Phaser.Math.Between(0, 2400),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("overworld", mist);
    }
  }

  private createCatacombAtmosphere() {
    for (let index = 0; index < 18; index += 1) {
      const ember = this.add
        .circle(
          Phaser.Math.Between(145, 560),
          Phaser.Math.Between(2260, 2570),
          Phaser.Math.Between(1, 2),
          index % 3 === 0 ? 0xffd16e : 0xf27d39,
          Phaser.Math.FloatBetween(0.28, 0.72),
        )
        .setDepth(2500 + index);
      this.tweens.add({
        targets: ember,
        x: ember.x + Phaser.Math.Between(-18, 18),
        y: ember.y - Phaser.Math.Between(18, 52),
        alpha: 0,
        scale: { from: 0.7, to: 1.5 },
        duration: Phaser.Math.Between(1200, 2500),
        delay: Phaser.Math.Between(0, 1600),
        repeat: -1,
        repeatDelay: Phaser.Math.Between(200, 900),
        ease: "Quad.easeOut",
      });
      this.trackRegionalAtmosphere("dungeon", ember);
    }

    for (let index = 0; index < 9; index += 1) {
      const mist = this.add
        .ellipse(
          Phaser.Math.Between(960, 1410),
          Phaser.Math.Between(2250, 2570),
          Phaser.Math.Between(76, 150),
          Phaser.Math.Between(10, 22),
          0x69d4d6,
          Phaser.Math.FloatBetween(0.025, 0.075),
        )
        .setDepth(2470 + index);
      this.tweens.add({
        targets: mist,
        x: mist.x + Phaser.Math.Between(-64, 64),
        scaleX: Phaser.Math.FloatBetween(1.18, 1.6),
        alpha: { from: 0.02, to: 0.1 },
        duration: Phaser.Math.Between(5200, 8400),
        delay: Phaser.Math.Between(0, 2200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("dungeon", mist);
    }

    const ritualRing = this.add
      .ellipse(768, 2694, 172, 68, 0x7e4fd0, 0.035)
      .setStrokeStyle(2, 0xb480ff, 0.24)
      .setDepth(2684);
    this.tweens.add({
      targets: ritualRing,
      scaleX: { from: 0.88, to: 1.18 },
      scaleY: { from: 0.88, to: 1.18 },
      alpha: { from: 0.16, to: 0.48 },
      duration: 1_850,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.trackRegionalAtmosphere("dungeon", ritualRing);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const wisp = this.add.circle(768 + Math.cos(angle) * 88, 2686 + Math.sin(angle) * 34, 2, 0xb887ff, 0.8).setDepth(2710);
      this.tweens.add({
        targets: wisp,
        y: wisp.y - 13,
        alpha: { from: 0.18, to: 0.95 },
        scale: { from: 0.7, to: 1.5 },
        duration: 900 + index * 90,
        delay: index * 110,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("dungeon", wisp);
    }
  }

  private createMoonfenAtmosphere() {
    // Moonfen gets quieter motion than the combat-heavy catacombs: drifting
    // lantern motes and low blue wisps make the marsh feel alive without
    // obscuring the central boardwalk or enemy silhouettes.
    for (let index = 0; index < 20; index += 1) {
      const mote = this.add
        .circle(
          Phaser.Math.Between(120, 1410),
          Phaser.Math.Between(3090, 4050),
          Phaser.Math.Between(1, 2),
          index % 3 === 0 ? 0xffd66f : 0x78d9e8,
          Phaser.Math.FloatBetween(0.28, 0.72),
        )
        .setDepth(4100 + index);
      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-32, 32),
        y: mote.y - Phaser.Math.Between(18, 54),
        alpha: { from: 0.12, to: 0.88 },
        scale: { from: 0.72, to: 1.55 },
        duration: Phaser.Math.Between(1800, 3600),
        delay: Phaser.Math.Between(0, 1600),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("marsh", mote);
    }
  }

  private createEmberfallAtmosphere() {
    for (let index = 0; index < 24; index += 1) {
      const ember = this.add
        .circle(
          Phaser.Math.Between(100, 1430),
          Phaser.Math.Between(4110, 5070),
          Phaser.Math.Between(1, 2),
          index % 4 === 0 ? 0xffe59a : 0xff7048,
          Phaser.Math.FloatBetween(0.26, 0.72),
        )
        .setDepth(5100 + index);
      this.tweens.add({
        targets: ember,
        x: ember.x + Phaser.Math.Between(-24, 24),
        y: ember.y - Phaser.Math.Between(20, 68),
        alpha: { from: 0.12, to: 0.92 },
        scale: { from: 0.7, to: 1.6 },
        duration: Phaser.Math.Between(1500, 3200),
        delay: Phaser.Math.Between(0, 1800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("highlands", ember);
    }
    const calderaRing = this.add
      .ellipse(768, 4930, 188, 76, 0xff663e, 0.035)
      .setStrokeStyle(2, 0xffbf68, 0.26)
      .setDepth(5120);
    this.tweens.add({
      targets: calderaRing,
      scaleX: { from: 0.88, to: 1.2 },
      scaleY: { from: 0.88, to: 1.2 },
      alpha: { from: 0.18, to: 0.52 },
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.trackRegionalAtmosphere("highlands", calderaRing);
  }

  private createFrostmereAtmosphere() {
    for (let index = 0; index < 26; index += 1) {
      const flake = this.add
        .circle(
          Phaser.Math.Between(90, 1450),
          Phaser.Math.Between(5140, 6100),
          Phaser.Math.Between(1, 2),
          index % 5 === 0 ? 0xa8e9ff : 0xffffff,
          Phaser.Math.FloatBetween(0.22, 0.68),
        )
        .setDepth(6150 + index);
      this.tweens.add({
        targets: flake,
        x: flake.x + Phaser.Math.Between(-40, 40),
        y: flake.y + Phaser.Math.Between(26, 72),
        alpha: { from: 0.12, to: 0.82 },
        scale: { from: 0.7, to: 1.35 },
        duration: Phaser.Math.Between(2300, 4800),
        delay: Phaser.Math.Between(0, 2200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("frostmere", flake);
    }
    const lighthouseBeam = this.add
      .rectangle(1250, 5260, 260, 5, 0xa8e9ff, 0.1)
      .setRotation(-0.28)
      .setDepth(6160);
    this.tweens.add({
      targets: lighthouseBeam,
      rotation: { from: -0.42, to: 0.42 },
      alpha: { from: 0.04, to: 0.24 },
      duration: 3800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.trackRegionalAtmosphere("frostmere", lighthouseBeam);
  }

  private createSunscarAtmosphere() {
    for (let index = 0; index < 24; index += 1) {
      const dust = this.add
        .ellipse(
          Phaser.Math.Between(70, 1460),
          Phaser.Math.Between(6170, 7070),
          Phaser.Math.Between(12, 28),
          Phaser.Math.Between(2, 5),
          index % 4 === 0 ? 0xffe39b : 0xd7874c,
          Phaser.Math.FloatBetween(0.12, 0.34),
        )
        .setDepth(7150 + index);
      this.tweens.add({
        targets: dust,
        x: dust.x + Phaser.Math.Between(28, 92),
        y: dust.y - Phaser.Math.Between(8, 26),
        alpha: { from: 0.08, to: 0.5 },
        scaleX: { from: 0.7, to: 1.45 },
        duration: Phaser.Math.Between(2200, 4600),
        delay: Phaser.Math.Between(0, 1800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("sunscar", dust);
    }
    const observatoryPulse = this.add
      .ellipse(1150, 6250, 170, 54, 0x63d7e7, 0.035)
      .setStrokeStyle(2, 0x9df6ff, 0.28)
      .setDepth(7160);
    this.tweens.add({
      targets: observatoryPulse,
      scaleX: { from: 0.86, to: 1.2 },
      scaleY: { from: 0.86, to: 1.2 },
      alpha: { from: 0.12, to: 0.52 },
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.trackRegionalAtmosphere("sunscar", observatoryPulse);
  }

  private createGuildHallAtmosphere() {
    // The hall is a social space, so use warm, slow motion instead of combat
    // particles: lantern motes make the painted interior feel inhabited while
    // the crest gives players a visual anchor for the shared guild space.
    for (let index = 0; index < 18; index += 1) {
      const mote = this.add
        .circle(
          Phaser.Math.Between(120, 1415),
          Phaser.Math.Between(7220, 8120),
          Phaser.Math.Between(1, 2),
          index % 3 === 0 ? 0xffe7a0 : 0xffb85e,
          Phaser.Math.FloatBetween(0.16, 0.46),
        )
        .setDepth(8300 + index);
      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-24, 24),
        y: mote.y - Phaser.Math.Between(16, 42),
        alpha: { from: 0.08, to: 0.68 },
        scale: { from: 0.72, to: 1.5 },
        duration: Phaser.Math.Between(2100, 3900),
        delay: Phaser.Math.Between(0, 1800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("guildhall", mote);
    }

    const crest = this.add
      .ellipse(768, 7660, 164, 58, 0xf1b84b, 0.025)
      .setStrokeStyle(2, 0xffd979, 0.3)
      .setDepth(8290);
    this.tweens.add({
      targets: crest,
      scaleX: { from: 0.9, to: 1.12 },
      scaleY: { from: 0.9, to: 1.12 },
      alpha: { from: 0.12, to: 0.42 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.trackRegionalAtmosphere("guildhall", crest);

    const crestSpark = this.add
      .text(768, 7660, "✦", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#ffe6a3",
        stroke: "#3b2413",
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(8291);
    this.tweens.add({
      targets: crestSpark,
      angle: 360,
      alpha: { from: 0.36, to: 0.9 },
      scale: { from: 0.82, to: 1.12 },
      duration: 4200,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.trackRegionalAtmosphere("guildhall", crestSpark);
  }

  private createIcefangAtmosphere() {
    for (let index = 0; index < 28; index += 1) {
      const shard = this.add
        .rectangle(
          Phaser.Math.Between(90, 1446),
          Phaser.Math.Between(8218, 9180),
          index % 4 === 0 ? 3 : 2,
          Phaser.Math.Between(5, 11),
          index % 5 === 0 ? 0xffffff : 0x88dcff,
          Phaser.Math.FloatBetween(0.14, 0.48),
        )
        .setAngle(Phaser.Math.Between(-18, 18))
        .setDepth(9290 + index);
      this.tweens.add({
        targets: shard,
        x: shard.x + Phaser.Math.Between(-34, 34),
        y: shard.y + Phaser.Math.Between(22, 64),
        alpha: { from: 0.06, to: 0.62 },
        angle: shard.angle + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(2600, 5200),
        delay: Phaser.Math.Between(0, 2200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("icefang", shard);
    }

    for (let index = 0; index < 7; index += 1) {
      const mist = this.add
        .ellipse(
          Phaser.Math.Between(260, 1260),
          Phaser.Math.Between(8420, 9000),
          Phaser.Math.Between(90, 180),
          Phaser.Math.Between(10, 24),
          0x8fd6e8,
          Phaser.Math.FloatBetween(0.025, 0.075),
        )
        .setDepth(9250 + index);
      this.tweens.add({
        targets: mist,
        x: mist.x + Phaser.Math.Between(-80, 80),
        scaleX: { from: 0.86, to: 1.5 },
        alpha: { from: 0.015, to: 0.1 },
        duration: Phaser.Math.Between(5600, 8800),
        delay: Phaser.Math.Between(0, 2500),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere("icefang", mist);
    }

    const vaultRune = this.add
      .ellipse(768, 8672, 360, 126, 0x73dfff, 0.02)
      .setStrokeStyle(2, 0x9beaff, 0.22)
      .setDepth(8658);
    this.tweens.add({
      targets: vaultRune,
      scaleX: { from: 0.9, to: 1.12 },
      scaleY: { from: 0.9, to: 1.12 },
      alpha: { from: 0.08, to: 0.42 },
      duration: 2100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.trackRegionalAtmosphere("icefang", vaultRune);
  }

  private createAnimatedLandmarks() {
    const campfires = DECORATIONS.filter((decoration) => decoration.kind === "campfire");
    campfires.forEach((source, index) => {
      const flame = this.add
        .sprite(source.x, source.y, WORLD_ATLAS_KEY, source.frame)
        .setOrigin(0.5, 0.76)
        .setScale(source.scale)
        .setAlpha(source.alpha ?? 0.82)
        .setDepth(source.y + 2);
      this.tweens.add({
        targets: flame,
        scaleX: source.scale * 1.06,
        scaleY: source.scale * 0.94,
        alpha: 1,
        duration: 240 + index * 35,
        yoyo: true,
        repeat: -1,
      });
      this.trackRegionalAtmosphere(worldAreaAtY(source.y), flame);
      this.time.addEvent({
        delay: 260 + index * 45,
        loop: true,
        callback: () => {
          if (this.disposed || worldAreaAtY(source.y) !== this.activeWorldArea) return;
          const ember = this.add
            .circle(source.x + Phaser.Math.Between(-8, 8), source.y - 20, Phaser.Math.Between(1, 2), 0xffc45a, 0.9)
            .setDepth(source.y + 4);
          this.tweens.add({
            targets: ember,
            x: ember.x + Phaser.Math.Between(-8, 8),
            y: ember.y - Phaser.Math.Between(22, 42),
            alpha: 0,
            scale: 0.2,
            duration: Phaser.Math.Between(650, 1050),
            onComplete: () => ember.destroy(),
          });
        },
      });
    });

    DECORATIONS.filter((decoration) => decoration.kind !== "campfire").forEach((decoration) => {
      const landmark = decoration.kind === "sign"
        ? this.createPixelSignLandmark(decoration)
        : this.add
          .sprite(decoration.x, decoration.y, WORLD_ATLAS_KEY, decoration.frame)
          .setOrigin(0.5, 0.88)
          .setScale(decoration.scale)
          .setAlpha(decoration.alpha ?? 1)
          .setDepth(decoration.y + 1);

      // Small environmental motion gives authored landmarks a living-world
      // feel without changing their collision footprint or gameplay position.
      if (decoration.kind === "torch") {
        this.tweens.add({
          targets: landmark,
          scaleX: { from: decoration.scale * 0.96, to: decoration.scale * 1.05 },
          scaleY: { from: decoration.scale * 1.04, to: decoration.scale * 0.95 },
          alpha: { from: 0.76, to: 1 },
          duration: 260 + (decoration.frame % 4) * 45,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else if (decoration.kind === "banner") {
        this.tweens.add({
          targets: landmark,
          angle: { from: -2.2, to: 2.2 },
          scaleX: { from: decoration.scale * 0.98, to: decoration.scale * 1.02 },
          duration: 1_300 + (decoration.frame % 3) * 160,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else if (decoration.kind === "sign") {
        this.tweens.add({
          targets: landmark,
          y: { from: decoration.y - 1, to: decoration.y + 1 },
          angle: { from: -0.7, to: 0.7 },
          duration: 2_400 + (decoration.frame % 2) * 300,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      this.trackRegionalAtmosphere(worldAreaAtY(decoration.y), landmark);
    });

    const ripples = RESOURCES.filter((resource) => resource.kind === "fish").map((resource, index) => ({
      x: resource.x,
      y: resource.y,
      width: index % 2 === 0 ? 48 : 42,
      height: index % 2 === 0 ? 18 : 16,
      color: resourceVisualColor(resource.itemId),
    }));
    ripples.forEach((ripple, index) => {
      const ring = this.add
        .ellipse(ripple.x, ripple.y, ripple.width, ripple.height)
        .setStrokeStyle(2, ripple.color, 0.54)
        .setDepth(ripple.y + 1);
      this.tweens.add({
        targets: ring,
        scaleX: 1.65,
        scaleY: 1.65,
        alpha: 0,
        duration: 1500 + index * 130,
        delay: index * 260,
        repeat: -1,
        repeatDelay: 520,
      });
      this.trackRegionalAtmosphere(worldAreaAtY(ripple.y), ring);
    });

    const sunstoneAura = this.add
      .ellipse(320, 1252, 74, 34)
      .setStrokeStyle(3, 0xf2cb68, 0.7)
      .setDepth(1246);
    this.tweens.add({
      targets: sunstoneAura,
      scaleX: 1.42,
      scaleY: 1.42,
      alpha: 0.08,
      duration: 1250,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.trackRegionalAtmosphere(worldAreaAtY(sunstoneAura.y), sunstoneAura);
  }

  private createRegionalLandmarkAccents() {
    REGIONAL_LANDMARK_ACCENTS.forEach((landmark, landmarkIndex) => {
      const ring = this.add
        .ellipse(landmark.x, landmark.y + 2, landmark.radius * 2, landmark.radius * 0.68)
        .setStrokeStyle(2, landmark.color, 0.5)
        .setFillStyle(landmark.color, 0.025)
        .setDepth(landmark.y - 9)
        .setData("landmark", landmark.name);
      this.tweens.add({
        targets: ring,
        scaleX: { from: 0.82, to: 1.22 },
        scaleY: { from: 0.82, to: 1.22 },
        alpha: { from: 0.18, to: 0.62 },
        duration: 1_900 + landmarkIndex * 110,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.trackRegionalAtmosphere(landmark.area, ring);

      const orbitRadiusX = landmark.radius * 0.72;
      const orbitRadiusY = landmark.radius * 0.27;
      const orbiters = Array.from({ length: 4 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 4;
        return this.add
          .rectangle(Math.cos(angle) * orbitRadiusX, Math.sin(angle) * orbitRadiusY, 4, 4, landmark.color, 0.82)
          .setRotation(Math.PI / 4);
      });
      const orbit = this.add
        .container(landmark.x, landmark.y - 1, orbiters)
        .setDepth(landmark.y - 7)
        .setData("landmark", landmark.name);
      this.tweens.add({
        targets: orbit,
        angle: 360,
        alpha: { from: 0.36, to: 0.92 },
        duration: 6_800 + landmarkIndex * 260,
        repeat: -1,
        ease: "Linear",
      });
      this.trackRegionalAtmosphere(landmark.area, orbit);
    });
  }

  private createPixelSignLandmark(decoration: DecorationDefinition) {
    const post = this.add.rectangle(0, -15, 4, 26, 0x6d472d, 1);
    const board = this.add.rectangle(0, -26, 42, 16, 0xa97443, 1).setStrokeStyle(2, 0x3a271d, 1);
    const label = this.add.text(0, -26, "SOUTHROAD", {
      fontFamily: "Verdana, sans-serif",
      fontSize: "5px",
      fontStyle: "bold",
      color: "#ffe3a2",
      stroke: "#4a2c1e",
      strokeThickness: 2,
      resolution: 2,
      letterSpacing: 0.4,
    }).setOrigin(0.5);
    return this.add
      .container(decoration.x, decoration.y, [post, board, label])
      .setScale(0.92)
      .setAlpha(decoration.alpha ?? 1)
      .setDepth(decoration.y + 1);
  }

  private createCreatureAnimations() {
    const ensureAnimation = (config: Phaser.Types.Animations.Animation) => {
      if (!config.key) return;
      const frames = Array.isArray(config.frames) ? config.frames : [];
      const firstFrame = frames[0] as { key?: string } | undefined;
      // Defer animation creation until the backing creature sheet is decoded.
      // The background batch calls this method again after distant assets arrive.
      if (firstFrame?.key && !this.textures.exists(firstFrame.key)) return;
      if (!this.anims.exists(config.key)) this.anims.create(config);
    };
    // The authored wolf sheet is four rows of four frames: down, left, right, up.
    // Keeping the row contract here makes future creature replacements drop-in safe.
    const wolfFrames: Record<Direction, number[]> = {
      down: [0, 1, 2, 3],
      left: [4, 5, 6, 7],
      right: [8, 9, 10, 11],
      up: [12, 13, 14, 15],
    };
    (Object.keys(wolfFrames) as Direction[]).forEach((direction) => {
      ensureAnimation({
        key: `ore-wolf-idle-${direction}`,
        frames: wolfFrames[direction].map((frame) => ({ key: WOLF_KEY, frame })),
        frameRate: 4,
        repeat: -1,
      });
      ensureAnimation({
        key: `ore-wolf-active-${direction}`,
        frames: wolfFrames[direction].map((frame) => ({ key: WOLF_KEY, frame })),
        frameRate: 9,
        repeat: 0,
      });
      ensureAnimation({
        key: `ore-wolf-walk-${direction}`,
        frames: wolfFrames[direction].map((frame) => ({ key: WOLF_KEY, frame })),
        frameRate: 7,
        repeat: -1,
      });
    });
    // The normalized Ashwing sheet uses up, left, down, right rows. Every frame
    // shares a bottom-center ground anchor, so turns stay visually planted.
    const drakeFrames: Record<Direction, number[]> = {
      up: [0, 1, 2, 3],
      left: [4, 5, 6, 7],
      down: [8, 9, 10, 11],
      right: [12, 13, 14, 15],
    };
    (Object.keys(drakeFrames) as Direction[]).forEach((direction) => {
      ensureAnimation({
        key: `ore-drake-idle-${direction}`,
        frames: drakeFrames[direction].map((frame) => ({ key: DRAKE_KEY, frame })),
        frameRate: 4,
        repeat: -1,
      });
      ensureAnimation({
        key: `ore-drake-active-${direction}`,
        frames: [1, 2, 3, 2].map((offset) => ({ key: DRAKE_KEY, frame: drakeFrames[direction][offset] })),
        frameRate: 10,
        repeat: 0,
      });
      ensureAnimation({
        key: `ore-drake-walk-${direction}`,
        frames: drakeFrames[direction].map((frame) => ({ key: DRAKE_KEY, frame })),
        frameRate: 7,
        repeat: -1,
      });
    });
    (Object.keys(drakeFrames) as Direction[]).forEach((direction) => {
      ensureAnimation({
        key: `ore-dune-stalker-idle-${direction}`,
        frames: drakeFrames[direction].map((frame) => ({ key: DUNE_STALKER_KEY, frame })),
        frameRate: 4,
        repeat: -1,
      });
      ensureAnimation({
        key: `ore-dune-stalker-active-${direction}`,
        frames: [1, 2, 3, 2].map((offset) => ({ key: DUNE_STALKER_KEY, frame: drakeFrames[direction][offset] })),
        frameRate: 10,
        repeat: 0,
      });
      ensureAnimation({
        key: `ore-dune-stalker-walk-${direction}`,
        frames: drakeFrames[direction].map((frame) => ({ key: DUNE_STALKER_KEY, frame })),
        frameRate: 7,
        repeat: -1,
      });
    });
    (Object.keys(wolfFrames) as Direction[]).forEach((direction) => {
      ensureAnimation({
        key: `ore-boar-idle-${direction}`,
        frames: wolfFrames[direction].map((frame) => ({ key: BOAR_KEY, frame })),
        frameRate: 4,
        repeat: -1,
      });
      ensureAnimation({
        key: `ore-boar-active-${direction}`,
        frames: wolfFrames[direction].map((frame) => ({ key: BOAR_KEY, frame })),
        frameRate: 9,
        repeat: 0,
      });
      ensureAnimation({
        key: `ore-boar-walk-${direction}`,
        frames: wolfFrames[direction].map((frame) => ({ key: BOAR_KEY, frame })),
        frameRate: 7,
        repeat: -1,
      });
    });
    ensureAnimation({
      key: "ore-rat-idle",
      frames: [0, 1, 2, 3].map((frame) => ({ key: RAT_KEY, frame })),
      frameRate: 4,
      repeat: -1,
    });
    ensureAnimation({
      key: "ore-rat-active",
      frames: [1, 2, 3, 2].map((frame) => ({ key: RAT_KEY, frame })),
      frameRate: 8,
      repeat: 0,
    });
    ensureAnimation({
      key: "ore-rat-walk",
      frames: [0, 1, 2, 3].map((frame) => ({ key: RAT_KEY, frame })),
      frameRate: 6,
      repeat: -1,
    });
    ensureAnimation({
      key: "ore-slime-idle",
      frames: [0, 1, 2, 3].map((frame) => ({ key: SLIME_KEY, frame })),
      frameRate: 5,
      repeat: -1,
    });
    ensureAnimation({
      key: "ore-slime-attack",
      frames: [4, 5, 6, 7].map((frame) => ({ key: SLIME_KEY, frame })),
      frameRate: 8,
      repeat: 0,
    });
    ensureAnimation({
      key: "ore-slime-hurt",
      frames: [8, 9, 10, 11].map((frame) => ({ key: SLIME_KEY, frame })),
      frameRate: 9,
      repeat: 0,
    });
    ensureAnimation({
      key: "ore-treant-idle",
      frames: [0, 1, 2, 3].map((frame) => ({ key: TREANT_KEY, frame })),
      frameRate: 5,
      repeat: -1,
    });
    ensureAnimation({
      key: "ore-treant-attack",
      frames: [0, 1, 2, 3, 4, 5].map((frame) => ({ key: TREANT_ATTACK_KEY, frame })),
      frameRate: 9,
      repeat: 0,
    });
    ensureAnimation({
      key: "ore-treant-hurt",
      frames: [2, 1, 0].map((frame) => ({ key: TREANT_KEY, frame })),
      frameRate: 9,
      repeat: 0,
    });
    const directionalRows: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
    ([
      { kind: "skeleton", idle: SKELETON_IDLE_KEY, move: SKELETON_MOVE_KEY },
      { kind: "witch", idle: WITCH_IDLE_KEY, move: WITCH_MOVE_KEY },
    ] as const).forEach((creature) => {
      (Object.keys(directionalRows) as Direction[]).forEach((direction) => {
        const row = directionalRows[direction];
        ensureAnimation({
          key: `ore-${creature.kind}-idle-${direction}`,
          frames: [0, 1, 2, 3].map((column) => ({ key: creature.idle, frame: row * 4 + column })),
          frameRate: 5,
          repeat: -1,
        });
        ensureAnimation({
          key: `ore-${creature.kind}-walk-${direction}`,
          frames: [0, 1, 2, 3, 4, 5].map((column) => ({ key: creature.move, frame: row * 6 + column })),
          frameRate: 9,
          repeat: -1,
        });
        ensureAnimation({
          key: `ore-${creature.kind}-hurt-${direction}`,
          frames: [5, 3, 1].map((column) => ({ key: creature.move, frame: row * 6 + column })),
          frameRate: 10,
          repeat: 0,
        });
      });
    });
    (Object.keys(directionalRows) as Direction[]).forEach((direction) => {
      const row = directionalRows[direction];
      ensureAnimation({
        key: `ore-witch-attack-${direction}`,
        frames: [0, 1, 2, 3, 4, 5].map((column) => ({ key: WITCH_SKILL_KEY, frame: row * 6 + column })),
        frameRate: 11,
        repeat: 0,
      });
      ensureAnimation({
        key: `ore-skeleton-attack-${direction}`,
        frames: [0, 1, 2, 3, 4, 5].map((column) => ({ key: SKELETON_MOVE_KEY, frame: row * 6 + column })),
        frameRate: 13,
        repeat: 0,
      });
    });
  }

  private createCombatEffectAnimations() {
    const effects = [
      { key: "ore-arcane-bolt-flight", texture: ARCANE_BOLT_KEY, frames: 6, frameRate: 12, repeat: -1 },
      { key: "ore-fireball-flight", texture: FIREBALL_KEY, frames: 6, frameRate: 13, repeat: -1 },
      { key: "ore-firebomb-impact", texture: FIREBOMB_KEY, frames: 6, frameRate: 15, repeat: 0 },
      { key: "ore-magic-sparks-impact", texture: MAGIC_SPARKS_KEY, frames: 6, frameRate: 15, repeat: 0 },
      { key: "ore-ansimuz-dark-bolt", texture: ANSIMUZ_DARK_BOLT_KEY, frames: 8, frameRate: 14, repeat: 0 },
      { key: "ore-ansimuz-fire-bomb", texture: ANSIMUZ_FIRE_BOMB_KEY, frames: 14, frameRate: 17, repeat: 0 },
      { key: "ore-ansimuz-lightning", texture: ANSIMUZ_LIGHTNING_KEY, frames: 5, frameRate: 12, repeat: 0 },
      { key: "ore-ansimuz-spark", texture: ANSIMUZ_SPARK_KEY, frames: 7, frameRate: 16, repeat: 0 },
      { key: "ore-melee-slash", texture: MELEE_SLASH_KEY, frames: 7, frameRate: 18, repeat: 0 },
    ];
    effects.forEach((effect) => {
      if (this.anims.exists(effect.key)) return;
      this.anims.create({
        key: effect.key,
        frames: Array.from({ length: effect.frames }, (_, frame) => ({ key: effect.texture, frame })),
        frameRate: effect.frameRate,
        repeat: effect.repeat,
      });
    });
  }

  private createZoneLabels() {
    this.addZoneLabel(748, 250, "OREHAVEN");
    this.addZoneLabel(170, 540, "WESTERN WOODS");
    this.addZoneLabel(1332, 505, "EASTERN QUARRY");
    this.addZoneLabel(1285, 745, "GOBLIN CAMP");
    this.addZoneLabel(760, 1165, "BRIARWILD CROSSING");
    this.addZoneLabel(280, 1395, "OLD SUN SHRINE");
    this.addZoneLabel(1175, 1375, "MOONFEN MARSH");
    this.addZoneLabel(248, 1788, "RANGER CAMP");
    this.addZoneLabel(1190, 1745, "RAIDER DENS");
    this.addZoneLabel(768, 2240, "SUNSTONE CATACOMBS");
    this.addZoneLabel(768, 4235, "EMBERFALL HIGHLANDS");
    this.addZoneLabel(768, 5260, "FROSTMERE COAST");
    this.addZoneLabel(768, 6280, "SUNSCAR EXPANSE");
    this.addZoneLabel(768, 7420, "OREHAVEN GUILD HALL");
  }

  private addZoneLabel(x: number, y: number, label: string) {
    this.add
      .text(x, y, label, {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#fff0b0",
        stroke: "#1a140d",
        strokeThickness: 4,
        letterSpacing: 2,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setAlpha(0.72)
      .setDepth(20);
  }

  private createInteractionZone(
    x: number,
    y: number,
    width: number,
    height: number,
    onPointerDown: () => void,
  ) {
    const zone = this.add
      .zone(x, y + 5, width, height)
      .setOrigin(0.5, 1)
      .setDepth(20_000 + y)
      .setInteractive({ useHandCursor: true });
    zone.on(
      "pointerdown",
      (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        onPointerDown();
      },
    );
    return zone;
  }

  private createNpcs() {
    NPCS.forEach((definition) => {
      const visual = NPC_VISUALS[definition.id] ?? NPC_VISUALS.guide;
      const shadow = this.createActorShadow(definition.x, definition.y, 25, 8, 0.34);
      const hero = new LayeredHero(this, definition.x, definition.y, visual.appearance, visual.equipped).setDepth(definition.y + 2);
      const sprite = hero.root;
      const plate = createNameplate(this, definition.x, definition.y + 16, definition.name, definition.role, "#8bd7ff");
      const hitZone = this.createInteractionZone(definition.x, definition.y, 44, 64, () => {
        this.approach({ kind: "npc", id: definition.id, x: definition.x, y: definition.y });
      });
      this.npcRuntime.set(definition.id, { definition, sprite, shadow, hero, plate, hitZone });
      this.time.addEvent({
        delay: 2800 + definition.frame * 420,
        loop: true,
        callback: () => {
          if (this.disposed || this.inputPaused) return;
          const directions: Direction[] = ["down", "left", "right", "up"];
          hero.play("idle", Phaser.Utils.Array.GetRandom(directions));
        },
      });
    });
  }

  private createAmbientCitizens() {
    this.ambientCitizens = AMBIENT_CITIZENS.map((definition) => {
      const start = definition.route[0];
      const shadow = this.createActorShadow(start.x, start.y, 24, 8, 0.28);
      const hero = new LayeredHero(this, start.x, start.y, definition.appearance, definition.equipped)
        .setScale(0.80)
        .setDepth(start.y + 2);
      hero.play("idle", "down", true);
      const hitZone = this.add.zone(start.x, start.y - 18, 30, 46).setDepth(20_000 + start.y).setInteractive({ cursor: "pointer" });
      hitZone.on("pointerdown", () => {
        if (this.inputPaused) return;
        const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, hero.x, hero.y);
        if (distance > 130) {
          this.emitHud({ message: "Move closer to speak with that traveler." }, false);
          return;
        }
        if (this.ambientBubbles.size === 0) this.showAmbientBark(runtime);
      });
      const runtime: AmbientCitizenRuntime = {
        definition,
        hero,
        shadow,
        hitZone,
        routeIndex: 0,
        path: [],
        pauseUntil: Date.now() + Phaser.Math.Between(350, 1_400),
        facing: "down" as Direction,
        nextBarkAt: Date.now() + Phaser.Math.Between(4_500, 12_000),
      };
      return runtime;
    });
  }

  private updateAmbientCitizens(delta: number) {
    const now = Date.now();
    this.ambientCitizens.forEach((citizen) => {
      if (worldAreaAtY(citizen.hero.y) !== this.activeWorldArea) return;
      if (citizen.pauseUntil > now) {
        citizen.hero.play("idle", citizen.facing);
        if (
          now >= citizen.nextBarkAt
          && this.ambientBubbles.size === 0
          && Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, citizen.hero.x, citizen.hero.y) <= 280
        ) {
          this.showAmbientBark(citizen);
        }
        return;
      }
      if (!citizen.path.length) {
        citizen.routeIndex = (citizen.routeIndex + 1) % citizen.definition.route.length;
        citizen.path = findWorldPath(
          { x: citizen.hero.x, y: citizen.hero.y },
          citizen.definition.route[citizen.routeIndex],
        );
        if (!citizen.path.length) {
          citizen.pauseUntil = now + 1_500;
          citizen.hero.play("idle", citizen.facing);
          return;
        }
      }

      const target = citizen.path[0];
      const distance = Phaser.Math.Distance.Between(citizen.hero.x, citizen.hero.y, target.x, target.y);
      const movement = citizen.definition.speed * (delta / 1_000);
      citizen.facing = directionToward(citizen.hero.x, citizen.hero.y, target.x, target.y);
      if (distance <= movement + 0.4) {
        citizen.hero.setPosition(target.x, target.y);
        citizen.path.shift();
        if (!citizen.path.length) {
          citizen.pauseUntil = now + Phaser.Math.Between(...citizen.definition.pauseMs);
          citizen.hero.play("idle", citizen.facing);
        }
      } else {
        const amount = movement / distance;
        citizen.hero.setPosition(
          citizen.hero.x + (target.x - citizen.hero.x) * amount,
          citizen.hero.y + (target.y - citizen.hero.y) * amount,
        );
        citizen.hero.play("walk", citizen.facing);
      }
      citizen.hero.setDepth(citizen.hero.y + 2);
      citizen.shadow.setPosition(citizen.hero.x, citizen.hero.y + 1).setDepth(citizen.hero.y - 1);
      citizen.hitZone.setPosition(citizen.hero.x, citizen.hero.y - 18).setDepth(20_000 + citizen.hero.y);
    });
  }

  private createWaystones() {
    WAYSTONES.forEach((definition) => {
      const unlocked = this.progress.waystones.includes(definition.id);
      const ring = this.add
        .ellipse(definition.x, definition.y + 2, 48, 20, unlocked ? 0x4ddfc8 : 0x33413d, 0.18)
        .setStrokeStyle(2, unlocked ? 0x83f5dd : 0x70827b, unlocked ? 0.9 : 0.55)
        .setDepth(definition.y - 2);
      const sprite = this.add
        .sprite(definition.x, definition.y, WORLD_ATLAS_KEY, 6)
        .setOrigin(0.5, 0.88)
        .setScale(0.075)
        .setTint(unlocked ? 0x9affea : 0x71817c)
        .setDepth(definition.y);
      const plate = createNameplate(
        this,
        definition.x,
        definition.y + 22,
        definition.name,
        unlocked ? "ATTUNED WAYSTONE" : "DORMANT WAYSTONE",
        unlocked ? "#79ead4" : "#94a49e",
      );
      const hitZone = this.createInteractionZone(definition.x, definition.y, 50, 62, () => {
        this.approach({ kind: "waystone", id: definition.id, x: definition.x, y: definition.y });
      });
      this.tweens.add({ targets: sprite, y: definition.y - 4, duration: 1_450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: ring, scaleX: 1.22, scaleY: 1.22, alpha: { from: 0.42, to: 0.12 }, duration: 1_150, yoyo: true, repeat: -1 });
      this.waystoneRuntime.set(definition.id, { definition, sprite, ring, plate, hitZone });
    });
  }

  private createDungeonPortals() {
    DUNGEON_PORTALS.forEach((definition) => {
      const isDungeonEntrance = definition.destinationY > definition.y;
      const ring = this.add
        .ellipse(definition.x, definition.y + 3, isDungeonEntrance ? 58 : 72, isDungeonEntrance ? 22 : 30, isDungeonEntrance ? 0x160f0a : 0xf3b64f, isDungeonEntrance ? 0.28 : 0.16)
        .setStrokeStyle(isDungeonEntrance ? 2 : 3, 0xffd978, isDungeonEntrance ? 0.68 : 0.92)
        .setDepth(definition.y - 2);
      const sprite = this.add
        .sprite(definition.x, definition.y - 2, WORLD_ATLAS_KEY, 6)
        .setOrigin(0.5, 0.88)
        .setScale(0.105)
        .setTint(0xffd37a)
        .setVisible(!isDungeonEntrance)
        .setDepth(definition.y);
      const portalRole = isDungeonEntrance ? "CLICK OR PRESS E TO ENTER" : "CLICK OR PRESS E TO RETURN";
      const plate = createNameplate(this, definition.x, definition.y + 28, definition.name, portalRole, "#ffd77c");
      const hitZone = this.createInteractionZone(definition.x, definition.y, 74, 80, () => {
        this.approach({ kind: "portal", id: definition.id, x: definition.x, y: definition.y });
      });
      this.tweens.add({ targets: sprite, y: definition.y - 10, duration: 1_250, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: ring, scaleX: 1.28, scaleY: 1.28, alpha: { from: 0.56, to: 0.12 }, duration: 1_000, yoyo: true, repeat: -1 });
      this.dungeonPortalRuntime.set(definition.id, { definition, sprite, ring, plate, hitZone });
    });
  }

  private createTownSanctuary() {
    const glow = this.add
      .ellipse(TOWN_SANCTUARY.x, TOWN_SANCTUARY.y + 5, 66, 28, 0x8ef6dc, 0.08)
      .setStrokeStyle(1, 0xb9ffe7, 0.5)
      .setDepth(1320)
      .setInteractive({ useHandCursor: true });
    const innerRing = this.add
      .ellipse(TOWN_SANCTUARY.x, TOWN_SANCTUARY.y + 5, 42, 18)
      .setStrokeStyle(1, 0xf4d984, 0.55)
      .setDepth(1321);
    this.sanctuaryPlate = this.add
      .text(TOWN_SANCTUARY.x, TOWN_SANCTUARY.y - 30, TOWN_SANCTUARY.name, {
        ...nameStyle("#aef7db", 7),
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setDepth(5200)
      .setVisible(false);
    glow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.approach({ kind: "sanctuary", ...TOWN_SANCTUARY });
    });
    glow.on("pointerover", () => this.sanctuaryPlate.setVisible(true));
    glow.on("pointerout", () => {
      if (this.approachTarget?.kind !== "sanctuary") this.sanctuaryPlate.setVisible(false);
    });
    this.tweens.add({
      targets: [glow, innerRing],
      alpha: { from: 0.32, to: 0.85 },
      scaleX: { from: 0.94, to: 1.08 },
      scaleY: { from: 0.94, to: 1.08 },
      duration: 1_600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private activateWaystone(runtime: WaystoneRuntime) {
    const { definition } = runtime;
    this.faceToward(definition.x, definition.y);
    this.setHeroAction("attune");
    if (this.progress.waystones.includes(definition.id)) {
      this.callbacks.onPanelRequest("map");
      this.emitHud({ message: `${definition.name} is attuned. Choose an unlocked destination on the world map.` });
      return;
    }
    if (this.isRealtimeOnline()) {
      this.ws!.send(JSON.stringify({ type: "rpg_waystone_unlock", waystoneId: definition.id }));
      this.emitHud({ message: `Attuning ${definition.name}...` }, false);
      return;
    }
    this.progress = { ...this.progress, waystones: normalizeWaystones([...this.progress.waystones, definition.id]) };
    this.refreshWaystones();
    this.showWaystoneFx(definition);
    this.callbacks.onToast({ title: "Waystone attuned", detail: `${definition.region} is now available for fast travel.`, tone: "quest" });
    this.emitHud({ progress: this.progress, message: `${definition.name} joined your travel network.` });
  }

  private refreshWaystones() {
    this.waystoneRuntime.forEach((runtime) => {
      const unlocked = this.progress.waystones.includes(runtime.definition.id);
      runtime.sprite.setTint(unlocked ? 0x9affea : 0x71817c);
      runtime.ring
        .setFillStyle(unlocked ? 0x4ddfc8 : 0x33413d, unlocked ? 0.18 : 0.12)
        .setStrokeStyle(2, unlocked ? 0x83f5dd : 0x70827b, unlocked ? 0.9 : 0.55);
      const role = runtime.plate.list[1];
      if (role instanceof Phaser.GameObjects.Text) {
        role.setText(unlocked ? "ATTUNED WAYSTONE" : "DORMANT WAYSTONE");
        role.setColor(unlocked ? "#79ead4" : "#94a49e");
      }
    });
  }

  private showWaystoneFx(definition: WaystoneDefinition, flashCamera = true) {
    this.callbacks.onAudio("quest");
    if (flashCamera) this.cameras.main.flash(260, 92, 230, 210, false);
    const beam = this.add.rectangle(definition.x, definition.y - 42, 9, 92, 0x8ff7e3, 0.62).setDepth(definition.y + 5);
    const pulse = this.add.ellipse(definition.x, definition.y + 3, 38, 16).setStrokeStyle(3, 0xa8fff0, 1).setDepth(definition.y + 6);
    this.tweens.add({ targets: beam, alpha: 0, scaleY: 1.45, duration: 720, ease: "Sine.easeOut", onComplete: () => beam.destroy() });
    this.tweens.add({ targets: pulse, alpha: 0, scaleX: 2.8, scaleY: 2.8, duration: 760, ease: "Sine.easeOut", onComplete: () => pulse.destroy() });
  }

  private completeWaystoneTravel(definition: WaystoneDefinition) {
    this.walkTarget = null;
    this.walkPath = [];
    this.approachTarget = null;
    this.selectedEnemyId = null;
    this.selectedRing.setVisible(false);
    this.inputPaused = true;
    this.setHeroAction("attune");
    this.cameras.main.fadeOut(190, 25, 58, 55);
    this.time.delayedCall(200, () => {
      if (this.disposed) return;
      this.playerPos.set(definition.arrivalX, definition.arrivalY);
      this.progress = { ...this.progress, position: { x: definition.arrivalX, y: definition.arrivalY } };
      this.setHeroAction("idle");
      this.applyWorldArea(definition.arrivalY, true);
      this.updatePlayerView();
      this.cameras.main.centerOn(definition.arrivalX, definition.arrivalY);
      this.showWaystoneFx(definition, false);
      this.cameras.main.fadeIn(300, 25, 58, 55);
      this.inputPaused = false;
      this.emitHud({ playerX: definition.arrivalX, playerY: definition.arrivalY, location: definition.region, target: null, message: `Arrived at ${definition.name}.` });
    });
  }

  private activateDungeonPortal(runtime: DungeonPortalRuntime) {
    const { definition } = runtime;
    const threatened = this.activeEnemyId !== null
      || [...this.enemyRuntime.values()].some((enemy) => enemy.targetPlayerId === "local-player" || enemy.targetPlayerId === this.playerId);
    if (threatened) {
      this.emitHud({ message: "The portal cannot carry you while a creature is pursuing you." });
      return;
    }
    this.faceToward(definition.x, definition.y);
    this.setHeroAction("attune");
    if (this.isRealtimeOnline()) {
      this.ws!.send(JSON.stringify({ type: "rpg_dungeon_travel", portalId: definition.id }));
      this.emitHud({ message: `Entering ${definition.region}...` }, false);
      return;
    }
    this.completeDungeonTravel(definition);
  }

  private completeDungeonTravel(definition: DungeonPortalDefinition) {
    this.walkTarget = null;
    this.walkPath = [];
    this.approachTarget = null;
    this.selectedEnemyId = null;
    this.selectedRing.setVisible(false);
    this.inputPaused = true;
    this.cameras.main.fadeOut(220, 18, 13, 10);
    this.time.delayedCall(230, () => {
      if (this.disposed) return;
      this.playerPos.set(definition.destinationX, definition.destinationY);
      this.progress = { ...this.progress, position: { x: definition.destinationX, y: definition.destinationY } };
      this.setHeroAction("idle");
      this.applyWorldArea(definition.destinationY, true);
      this.updatePlayerView();
      this.cameras.main.centerOn(definition.destinationX, definition.destinationY);
      this.cameras.main.fadeIn(300, 18, 13, 10);
      this.inputPaused = false;
      this.emitHud({ playerX: definition.destinationX, playerY: definition.destinationY, location: definition.region, target: null, message: `Entered ${definition.region}.` });
    });
  }

  private trackRegionalAtmosphere(area: WorldArea, object: Phaser.GameObjects.GameObject) {
    const objects = this.regionalAtmosphere.get(area) ?? [];
    objects.push(object);
    this.regionalAtmosphere.set(area, objects);
  }

  private refreshRegionalAtmosphere() {
    this.regionalAtmosphere.forEach((objects, area) => {
      const enabled = area === this.activeWorldArea;
      objects.forEach((object) => {
        const visibleObject = object as Phaser.GameObjects.GameObject & { setVisible?: (value: boolean) => unknown };
        visibleObject.setVisible?.(enabled);
        this.tweens.getTweensOf(object).forEach((tween) => {
          if (enabled) tween.resume();
          else tween.pause();
        });
      });
    });
  }

  private setTweenActivity(target: Phaser.GameObjects.GameObject, active: boolean) {
    this.tweens.getTweensOf(target).forEach((tween) => {
      if (active) tween.resume();
      else tween.pause();
    });
  }

  private setEnemyRegionalActive(enemy: EnemyRuntime, active: boolean) {
    const alive = enemy.hp > 0 && enemy.respawnAt <= Date.now();
    const visible = active && alive;
    enemy.hero?.setSimulationActive(visible);
    if (!enemy.hero && enemy.sprite instanceof Phaser.GameObjects.Sprite) {
      enemy.sprite.setVisible(visible);
      if (visible) enemy.sprite.anims.resume();
      else enemy.sprite.anims.pause();
    } else {
      enemy.sprite.setVisible(visible);
    }
    enemy.shadow.setVisible(visible);
    enemy.rareAura?.setVisible(visible);
    enemy.threatRing.setVisible(visible && Boolean(enemy.targetPlayerId));
    if (!visible) {
      enemy.plate.setVisible(false);
      enemy.hpBar.setVisible(false);
    }
    if (enemy.hitZone.input) enemy.hitZone.input.enabled = visible;
    [enemy.sprite, enemy.shadow, enemy.threatRing, enemy.plate, enemy.hpBar, enemy.hitZone, ...(enemy.rareAura ? [enemy.rareAura] : [])]
      .forEach((target) => this.setTweenActivity(target, visible));
  }

  private syncRegionalSimulation() {
    this.npcRuntime.forEach((npc) => {
      const active = worldAreaAtY(npc.definition.y) === this.activeWorldArea;
      npc.hero.setSimulationActive(active);
      npc.shadow.setVisible(active);
      if (!active) npc.plate.setVisible(false);
      if (npc.hitZone.input) npc.hitZone.input.enabled = active;
    });
    this.ambientCitizens.forEach((citizen) => {
      const active = worldAreaAtY(citizen.hero.y) === this.activeWorldArea;
      citizen.hero.setSimulationActive(active);
      citizen.shadow.setVisible(active);
      citizen.hitZone.setVisible(active);
      if (citizen.hitZone.input) citizen.hitZone.input.enabled = active;
    });
    this.resourceRuntime.forEach((resource) => {
      const active = worldAreaAtY(resource.definition.y) === this.activeWorldArea;
      resource.sprite.setVisible(active && resource.available);
      if (!active) resource.plate.setVisible(false);
      if (resource.hitZone.input) resource.hitZone.input.enabled = active && resource.available;
      this.setTweenActivity(resource.sprite, active && resource.available);
    });
    this.enemyRuntime.forEach((enemy) => {
      this.setEnemyRegionalActive(enemy, worldAreaAtY(enemy.definition.y) === this.activeWorldArea);
    });
    this.waystoneRuntime.forEach((waystone) => {
      const active = worldAreaAtY(waystone.definition.y) === this.activeWorldArea;
      waystone.sprite.setVisible(active);
      waystone.ring.setVisible(active);
      if (!active) waystone.plate.setVisible(false);
      if (waystone.hitZone.input) waystone.hitZone.input.enabled = active;
      this.setTweenActivity(waystone.sprite, active);
      this.setTweenActivity(waystone.ring, active);
    });
    this.dungeonPortalRuntime.forEach((portal) => {
      const active = worldAreaAtY(portal.definition.y) === this.activeWorldArea;
      portal.sprite.setVisible(active);
      portal.ring.setVisible(active);
      if (!active) portal.plate.setVisible(false);
      if (portal.hitZone.input) portal.hitZone.input.enabled = active;
      this.setTweenActivity(portal.sprite, active);
      this.setTweenActivity(portal.ring, active);
    });
  }

  private applyWorldArea(y: number, centerCamera = false) {
    this.activeWorldArea = worldAreaAtY(y);
    const area = WORLD_AREAS[this.activeWorldArea];
    this.cameras.main.setBounds(0, area.top, WORLD.width, area.height);
    this.refreshRegionalAtmosphere();
    this.syncRegionalSimulation();
    if (!this.activeEnemyId) this.callbacks.onMusic(this.activeWorldArea === "dungeon" || this.activeWorldArea === "icefang" ? "dungeon" : "field");
    if (centerCamera && this.player) this.cameras.main.centerOn(this.playerPos.x, this.playerPos.y);
  }

  private createQuestMarker() {
    const glow = this.add.circle(0, 0, 13, 0x20170d, 0.92).setStrokeStyle(2, 0xffd45e, 0.95);
    const icon = this.add
      .text(0, -1, "!", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffe374",
        stroke: "#3c2610",
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.questMarker = this.add.container(0, 0, [glow, icon]).setDepth(9000);
    this.questMarker.setData("icon", icon);
    this.tweens.add({ targets: [glow, icon], y: -4, duration: 720, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private createSideQuestMarkers() {
    SIDE_QUESTS.forEach((quest) => {
      const npc = NPCS.find((entry) => entry.id === quest.giverNpcId);
      if (!npc) return;
      const glow = this.add.circle(0, 0, 12, 0x12211d, 0.94).setStrokeStyle(2, 0x65d6b0, 0.96);
      const icon = this.add
        .text(0, -1, "!", {
          fontFamily: "Georgia, serif",
          fontSize: "17px",
          fontStyle: "bold",
          color: "#91f0ce",
          stroke: "#10251f",
          strokeThickness: 3,
          resolution: 2,
        })
        .setOrigin(0.5);
      const marker = this.add
        .container(npc.x, npc.y - 72, [glow, icon])
        .setDepth(9_001)
        .setSize(32, 38)
        .setInteractive({ useHandCursor: true });
      marker.setData({ glow, icon, mode: "available" });
      marker.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.approach({ kind: "npc", id: npc.id, x: npc.x, y: npc.y });
      });
      this.tweens.add({ targets: [glow, icon], y: -4, duration: 780, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.sideQuestMarkers.set(quest.id, marker);
    });
  }

  private sideQuestForNpc(npcId: string) {
    const candidates = SIDE_QUESTS.filter((quest) => quest.giverNpcId === npcId && this.progress.questStep >= quest.unlockQuestStep);
    return candidates.find((quest) => this.progress.sideQuests[quest.id]?.status === "ready")
      ?? candidates.find((quest) => this.progress.sideQuests[quest.id]?.status === "active")
      ?? candidates.find((quest) => !this.progress.sideQuests[quest.id]);
  }

  private updateSideQuestMarkers() {
    const mainTarget = this.currentQuestTarget();
    SIDE_QUESTS.forEach((quest) => {
      const marker = this.sideQuestMarkers.get(quest.id);
      const npc = NPCS.find((entry) => entry.id === quest.giverNpcId);
      if (!marker || !npc) return;
      const selectedQuest = this.sideQuestForNpc(npc.id);
      const state = this.progress.sideQuests[quest.id];
      const mode = sideQuestMarkerMode(quest, state, this.progress.questStep);
      const obscuredByMainQuest = mainTarget?.kind === "npc" && mainTarget.id === npc.id;
      if (selectedQuest?.id !== quest.id || !mode || obscuredByMainQuest) {
        marker.setVisible(false).disableInteractive();
        return;
      }
      marker.setPosition(npc.x, npc.y - 72).setVisible(true).setInteractive({ useHandCursor: true });
      if (marker.getData("mode") === mode) return;
      marker.setData("mode", mode);
      const ready = mode === "ready";
      const glow = marker.getData("glow") as Phaser.GameObjects.Arc;
      const icon = marker.getData("icon") as Phaser.GameObjects.Text;
      glow.setStrokeStyle(2, ready ? 0x74cfff : 0x65d6b0, 0.96);
      icon.setText(ready ? "?" : "!").setColor(ready ? "#a9e2ff" : "#91f0ce");
    });
  }

  private createPublicEventMarker() {
    const ring = this.add.ellipse(0, 8, 48, 18, 0x0a1310, 0.2).setStrokeStyle(2, 0xf5d36a, 0.9);
    const diamond = this.add
      .text(0, -4, "◆", {
        fontFamily: "Georgia, serif",
        fontSize: "19px",
        fontStyle: "bold",
        color: "#f5d36a",
        stroke: "#24180d",
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5);
    const label = this.add
      .text(0, -20, "RALLY", {
        fontFamily: "Verdana, sans-serif",
        fontSize: "7px",
        fontStyle: "bold",
        color: "#fff0b4",
        stroke: "#17100a",
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.publicEventMarker = this.add
      .container(0, 0, [ring, diamond, label])
      .setDepth(9_002)
      .setSize(58, 48)
      .setInteractive({ useHandCursor: true });
    this.publicEventMarker.setData({ ring, diamond, label, eventId: "" });
    this.publicEventMarker.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      const enemy = this.enemyRuntime.get(publicEventRotation().event.enemyId);
      if (enemy && enemy.hp > 0 && enemy.respawnAt <= Date.now()) {
        this.approach({ kind: "enemy", id: enemy.definition.id, x: enemy.definition.x, y: enemy.definition.y });
      }
    });
    this.tweens.add({ targets: diamond, y: 1, angle: 45, duration: 820, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: ring, scaleX: 1.28, scaleY: 1.28, alpha: { from: 0.88, to: 0.18 }, duration: 1_050, repeat: -1, ease: "Sine.easeOut" });
  }

  private updatePublicEventMarker() {
    if (!this.publicEventMarker) return;
    const rotation = publicEventRotation();
    const enemy = this.enemyRuntime.get(rotation.event.enemyId);
    if (!enemy || enemy.hp <= 0 || enemy.respawnAt > Date.now()) {
      this.publicEventMarker.setVisible(false).disableInteractive();
      return;
    }
    this.publicEventMarker
      .setPosition(enemy.definition.x, enemy.definition.y - 82)
      .setVisible(true)
      .setInteractive({ useHandCursor: true });
    if (this.publicEventMarker.getData("eventId") === rotation.event.enemyId) return;
    this.publicEventMarker.setData("eventId", rotation.event.enemyId);
    const accent = Phaser.Display.Color.HexStringToColor(rotation.event.accent).color;
    const ring = this.publicEventMarker.getData("ring") as Phaser.GameObjects.Ellipse;
    const diamond = this.publicEventMarker.getData("diamond") as Phaser.GameObjects.Text;
    const label = this.publicEventMarker.getData("label") as Phaser.GameObjects.Text;
    ring.setStrokeStyle(2, accent, 0.92);
    diamond.setColor(rotation.event.accent);
    label.setText(`${rotation.event.region.toUpperCase()} RALLY`);
  }

  private updateQuestMarker() {
    if (!this.questMarker) return;
    const target = this.currentQuestTarget();
    if (!target) {
      this.questMarker.setVisible(false);
      return;
    }
    const resource = target.kind === "resource" ? RESOURCES.find((entry) => entry.id === target.id) : undefined;
    const icon = this.questMarker.getData("icon") as Phaser.GameObjects.Text;
    icon.setText(QUEST_TURN_IN_STEPS.has(this.progress.questStep) ? "?" : "!");
    this.questMarker
      .setPosition(target.x, target.y - (target.kind === "npc" ? 72 : resource?.kind === "tree" ? 98 : resource?.kind === "relic" ? 84 : 58))
      .setVisible(true);
  }

  private currentQuestTarget(): Exclude<ApproachTarget, null> | null {
    const step = QUEST_STEPS[Math.min(this.progress.questStep, QUEST_STEPS.length - 1)];
    if (step.target === "Complete") return null;
    const npc = NPCS.find((entry) => entry.name === step.target || (step.target === "Workshop" && entry.id === "smith"));
    if (npc) return { kind: "npc", id: npc.id, x: npc.x, y: npc.y };
    const enemy = ENEMIES.find((entry) => entry.name === step.target || (step.target === "Goblin" && entry.kind === "goblin"));
    if (enemy) return { kind: "enemy", id: enemy.id, x: enemy.x, y: enemy.y };
    const resource = RESOURCES.find((entry) => entry.name === step.target || (step.target === "Copper" && entry.id === "copper-1"));
    return resource ? { kind: "resource", id: resource.id, x: resource.x, y: resource.y } : null;
  }

  private createResources() {
    RESOURCES.forEach((definition) => {
      const visualColor = resourceVisualColor(definition.itemId);
      const sprite = this.add
        .sprite(definition.x, definition.y, WORLD_ATLAS_KEY, definition.frame)
        .setOrigin(0.5, 0.88)
        .setScale(definition.scale)
        .setDepth(definition.y);
      if (visualColor !== 0xffffff) sprite.setTint(visualColor);
      const plate = createNameplate(
        this,
        definition.x,
        definition.y + 22,
        definition.name,
        `${definition.skill.toUpperCase()} ${definition.requiredLevel}`,
        `#${visualColor.toString(16).padStart(6, "0")}`,
      );
      const zoneSize = definition.kind === "tree"
        ? { width: 64, height: 92 }
        : definition.kind === "fish"
          ? { width: 48, height: 28 }
          : definition.kind === "relic"
            ? { width: 48, height: 58 }
            : { width: 54, height: 44 };
      const hitZone = this.createInteractionZone(definition.x, definition.y, zoneSize.width, zoneSize.height, () => {
        this.approach({ kind: "resource", id: definition.id, x: definition.x, y: definition.y });
      });
      const runtime: ResourceRuntime = {
        definition,
        sprite,
        plate,
        available: true,
        claimedBy: null,
        respawnAt: 0,
        hitZone,
      };
      this.resourceRuntime.set(definition.id, runtime);
      this.animateResource(runtime);
    });

  }

  private createEnemies() {
    ENEMIES.forEach((sourceDefinition) => {
      const definition = { ...sourceDefinition };
      const shadowSize = enemyShadowSize(definition.kind);
      const shadow = this.createActorShadow(definition.x, definition.y, shadowSize.width, shadowSize.height, definition.rare ? 0.42 : 0.34);
      const threatRing = this.add
        .ellipse(definition.x, definition.y + 3, shadowSize.width + 14, shadowSize.height + 9)
        .setStrokeStyle(2, 0xe66a52, 0.9)
        .setDepth(definition.y - 0.5)
        .setVisible(false);
      this.tweens.add({ targets: threatRing, scaleX: 1.14, scaleY: 1.14, alpha: { from: 0.9, to: 0.42 }, duration: 640, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      const rareAura = definition.rare
        ? this.add
            .ellipse(definition.x, definition.y + 2, shadowSize.width + 28, shadowSize.height + 18)
            .setStrokeStyle(2, definition.visual?.auraColor ?? 0xffd35f, 0.82)
            .setDepth(definition.y - 0.25)
        : undefined;
      if (rareAura) {
        this.tweens.add({
          targets: rareAura,
          scaleX: 1.28,
          scaleY: 1.28,
          alpha: { from: 0.86, to: 0.22 },
          duration: 1_050,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      let hero: LayeredHero | undefined;
      let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
      if (definition.kind === "goblin" || definition.kind === "orc" || definition.kind === "lizard") {
        const appearance: ActorAppearanceId = definition.kind;
        const defaultWeapon = definition.kind === "lizard"
          ? definition.attackStyle === "magic"
            ? "arcane-staff"
            : definition.attackStyle === "range"
              ? "iron-bow"
              : "iron-sword"
          : definition.kind === "orc"
            ? "iron-sword"
            : definition.attackStyle === "range"
              ? "oak-bow"
              : "bronze-sword";
        const equipped = {
          weapon: definition.visual?.weapon ?? defaultWeapon,
          tool: "iron-pick",
          armor: definition.visual?.armor ?? (definition.kind === "orc" || definition.kind === "lizard" ? "warden-mail" : ""),
        };
        const actorScale = definition.visual?.scale
          ?? (definition.kind === "orc" ? 1.02 : definition.kind === "lizard" ? 0.96 : 0.86);
        hero = new LayeredHero(this, definition.x, definition.y, appearance, equipped)
          .setScale(actorScale)
          .setDepth(definition.y);
        sprite = hero.root;
      } else if (definition.kind === "wolf") {
        sprite = this.add
          .sprite(definition.x, definition.y, WOLF_KEY, 0)
          .setOrigin(0.5, 0.94)
          .setScale(definition.rare ? 0.31 : 0.28)
          .setData("animatedCreature", true)
          .setDepth(definition.y);
      } else if (definition.kind === "drake") {
        sprite = this.add
          .sprite(definition.x, definition.y, DRAKE_KEY, 8)
          .setOrigin(0.5, 0.94)
          .setScale(definition.rare ? 0.44 : 0.4)
          .setData("animatedCreature", true)
          .setDepth(definition.y);
      } else if (definition.kind === "dune-stalker") {
        sprite = this.add
          .sprite(definition.x, definition.y, DUNE_STALKER_KEY, 8)
          .setOrigin(0.5, 0.94)
          .setScale(definition.rare ? 0.4 : 0.36)
          .setData("animatedCreature", true)
          .setDepth(definition.y);
      } else if (definition.kind === "rat") {
        sprite = this.add
          .sprite(definition.x, definition.y, RAT_KEY, 0)
          .setOrigin(0.5, 0.94)
          .setScale(0.17)
          .setData("animatedCreature", true)
          .setDepth(definition.y);
      } else if (definition.kind === "boar") {
        sprite = this.add
          .sprite(definition.x, definition.y, BOAR_KEY, 0)
          .setOrigin(0.5, 0.94)
          .setScale(definition.rare ? 0.42 : 0.36)
          .setData("animatedCreature", true)
          .setDepth(definition.y);
      } else if (definition.kind === "slime") {
        sprite = this.add
          .sprite(definition.x, definition.y, SLIME_KEY, 0)
          .setOrigin(0.5, 0.92)
          .setScale(definition.rare ? 0.35 : 0.31)
          .setData("animatedCreature", true)
          .setDepth(definition.y);
        if (definition.rare) sprite.setTint(0xffdc73);
      } else if (definition.kind === "treant") {
        sprite = this.add
          .sprite(definition.x, definition.y, TREANT_KEY, 0)
          .setOrigin(0.5, 0.94)
          .setScale(0.17)
          .setDepth(definition.y);
      } else if (definition.kind === "skeleton" || definition.kind === "witch") {
        const texture = definition.kind === "skeleton" ? SKELETON_IDLE_KEY : WITCH_IDLE_KEY;
        sprite = this.add
          .sprite(definition.x, definition.y, texture, 0)
          .setOrigin(0.5, 0.64)
          .setScale(definition.kind === "skeleton" ? 1.42 : 1.38)
          .setDepth(definition.y);
      } else {
        sprite = this.add
          .sprite(definition.x, definition.y, RAT_KEY, 0)
          .setOrigin(0.5, 0.94)
          .setScale(0.58)
          .setData("animatedCreature", true)
          .setDepth(definition.y);
      }
      if (sprite instanceof Phaser.GameObjects.Sprite) {
        const tint = enemyPalette(definition.id);
        if (tint !== 0xffffff) sprite.setTint(tint);
      }
      const plate = createNameplate(
        this,
        definition.x,
        definition.y + 20,
        definition.name,
        definition.rare ? `RARE  •  LEVEL ${definition.level}` : `LEVEL ${definition.level}`,
        definition.rare ? "#ffe47d" : "#ffbd72",
      );
      const hpBar = this.add.graphics().setDepth(definition.y + 3).setVisible(false);
      const hitSize = definition.kind === "rat"
        ? { width: 38, height: 28 }
        : definition.kind === "boar"
          ? { width: 58, height: 40 }
        : definition.kind === "wolf"
          ? { width: 52, height: 42 }
        : definition.kind === "drake"
          ? { width: 78, height: 58 }
        : definition.kind === "dune-stalker"
          ? { width: 66, height: 46 }
          : definition.kind === "slime"
            ? { width: 44, height: 40 }
            : definition.kind === "treant"
              ? { width: 92, height: 116 }
            : definition.kind === "witch"
              ? { width: 50, height: 68 }
              : { width: 46, height: 64 };
      const hitZone = this.createInteractionZone(definition.x, definition.y, hitSize.width, hitSize.height, () => {
        this.approach({ kind: "enemy", id: definition.id, x: definition.x, y: definition.y });
      });
      const facing: Direction = definition.kind === "rat" ? "right" : "down";
      const runtime: EnemyRuntime = {
        definition,
        sprite,
        shadow,
        threatRing,
        rareAura,
        hero,
        plate,
        hpBar,
        hp: definition.maxHp,
        respawnAt: 0,
        facing,
        worldAction: "idle",
        reaction: null,
        reactionUntil: 0,
        lastAttackAccentAt: 0,
        status: null,
        targetPlayerId: null,
        hitZone,
      };
      this.enemyRuntime.set(definition.id, runtime);
      this.playEnemyIdle(runtime);
    });
  }

  private playEnemyIdle(enemy: EnemyRuntime) {
    if (enemy.reaction && enemy.reactionUntil > Date.now()) return;
    enemy.worldAction = "idle";
    if (enemy.hero) {
      enemy.hero.play("idle", enemy.facing, true);
      return;
    }
    if (!(enemy.sprite instanceof Phaser.GameObjects.Sprite)) return;
    if (enemy.sprite.getData("highDetailCreature")) {
      this.tweens.killTweensOf(enemy.sprite);
      const baseScaleX = enemy.sprite.scaleX;
      const baseScaleY = enemy.sprite.scaleY;
      enemy.sprite.setData("idleMotion", true);
      this.tweens.add({
        targets: enemy.sprite,
        scaleX: { from: baseScaleX * 0.985, to: baseScaleX * 1.015 },
        scaleY: { from: baseScaleY * 0.97, to: baseScaleY * 1.03 },
        duration: 820,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      return;
    }
    if (enemy.definition.kind === "rat") {
      if (enemy.facing === "left" || enemy.facing === "right") enemy.sprite.setFlipX(enemy.facing === "left");
      this.playCreatureAnimation(enemy.sprite, "ore-rat-idle");
    }
    if (enemy.definition.kind === "boar") this.playCreatureAnimation(enemy.sprite, `ore-boar-idle-${enemy.facing}`);
    if (enemy.definition.kind === "wolf") this.playCreatureAnimation(enemy.sprite, `ore-wolf-idle-${enemy.facing}`);
    if (enemy.definition.kind === "drake") this.playCreatureAnimation(enemy.sprite, `ore-drake-idle-${enemy.facing}`);
    if (enemy.definition.kind === "dune-stalker") this.playCreatureAnimation(enemy.sprite, `ore-dune-stalker-idle-${enemy.facing}`);
    if (enemy.definition.kind === "slime") this.playCreatureAnimation(enemy.sprite, "ore-slime-idle");
    if (enemy.definition.kind === "treant") this.playCreatureAnimation(enemy.sprite, "ore-treant-idle");
    if (enemy.definition.kind === "skeleton" || enemy.definition.kind === "witch") {
      this.playCreatureAnimation(enemy.sprite, `ore-${enemy.definition.kind}-idle-${enemy.facing}`);
    }
  }

  private playCreatureAnimation(sprite: Phaser.GameObjects.Sprite, key: string) {
    if (!this.anims.exists(key)) return false;
    const textureKey = key.includes("ore-rat")
      ? RAT_KEY
      : key.includes("ore-boar")
        ? BOAR_KEY
      : key.includes("ore-wolf")
        ? WOLF_KEY
        : key.includes("ore-drake")
          ? DRAKE_KEY
        : key.includes("ore-dune-stalker")
          ? DUNE_STALKER_KEY
        : key.includes("ore-slime")
          ? SLIME_KEY
          : key.includes("ore-treant-attack")
            ? TREANT_ATTACK_KEY
            : key.includes("ore-treant")
              ? TREANT_KEY
              : key.includes("ore-skeleton-idle")
                ? SKELETON_IDLE_KEY
                : key.includes("ore-skeleton")
                  ? SKELETON_MOVE_KEY
                  : key.includes("ore-witch-idle")
                    ? WITCH_IDLE_KEY
                    : key.includes("ore-witch-attack")
                      ? WITCH_SKILL_KEY
                      : key.includes("ore-witch")
                        ? WITCH_MOVE_KEY
                        : null;
    if (textureKey && !this.textures.exists(textureKey)) return false;
    // Deferred creature sheets can leave an animation definition present before
    // its frame texture is decoded. Treat that as a quiet idle fallback instead
    // of aborting scene creation and leaving the loading veil on-screen.
    try {
      sprite.play(key, true);
      return true;
    } catch {
      return false;
    }
  }

  private playEnemyWalk(enemy: EnemyRuntime, direction: Direction) {
    enemy.facing = direction;
    enemy.worldAction = "walk";
    if (enemy.reaction && enemy.reactionUntil > Date.now()) return;
    if (enemy.hero) {
      enemy.hero.play("walk", direction, true);
      return;
    }
    if (!(enemy.sprite instanceof Phaser.GameObjects.Sprite)) return;
    if (enemy.sprite.getData("highDetailCreature")) {
      enemy.sprite.setFlipX(direction === "left");
      enemy.sprite.setData("idleMotion", false);
      this.tweens.killTweensOf(enemy.sprite);
      this.tweens.add({
        targets: enemy.sprite,
        scaleY: { from: enemy.sprite.scaleY * 0.96, to: enemy.sprite.scaleY * 1.04 },
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      return;
    }
    if (enemy.definition.kind === "rat") {
      if (direction === "left" || direction === "right") enemy.sprite.setFlipX(direction === "left");
      this.playCreatureAnimation(enemy.sprite, "ore-rat-walk");
    }
    if (enemy.definition.kind === "boar") this.playCreatureAnimation(enemy.sprite, `ore-boar-walk-${direction}`);
    if (enemy.definition.kind === "wolf") this.playCreatureAnimation(enemy.sprite, `ore-wolf-walk-${direction}`);
    if (enemy.definition.kind === "drake") this.playCreatureAnimation(enemy.sprite, `ore-drake-walk-${direction}`);
    if (enemy.definition.kind === "dune-stalker") this.playCreatureAnimation(enemy.sprite, `ore-dune-stalker-walk-${direction}`);
    if (enemy.definition.kind === "slime") this.playCreatureAnimation(enemy.sprite, "ore-slime-idle");
    if (enemy.definition.kind === "treant") this.playCreatureAnimation(enemy.sprite, "ore-treant-idle");
    if (enemy.definition.kind === "skeleton" || enemy.definition.kind === "witch") {
      this.playCreatureAnimation(enemy.sprite, `ore-${enemy.definition.kind}-walk-${direction}`);
    }
  }

  private playEnemyReaction(enemy: EnemyRuntime, reaction: "attack" | "hurt", direction: Direction) {
    const now = Date.now();
    if (reaction === "hurt" && enemy.reaction === "attack" && enemy.reactionUntil > now) return;
    const duration = reaction === "attack" ? 620 : 470;
    enemy.reaction = reaction;
    enemy.reactionUntil = now + duration;
    enemy.facing = direction;
    if (reaction === "attack" && now - enemy.lastAttackAccentAt >= 900) {
      enemy.lastAttackAccentAt = now;
      this.showEnemyAttackAccent(enemy, direction);
    }
    if (enemy.hero) {
      const attackAction: HeroVisualAction = enemy.definition.attackStyle === "magic"
        ? "magic"
        : enemy.definition.attackStyle === "range"
          ? "range"
          : "melee";
      enemy.hero.play(reaction === "attack" ? attackAction : "hurt", direction, true);
    } else if (enemy.sprite instanceof Phaser.GameObjects.Sprite) {
      if (enemy.sprite.getData("highDetailCreature")) {
        enemy.sprite.setFlipX(direction === "left");
        this.tweens.killTweensOf(enemy.sprite);
        const baseX = enemy.sprite.x;
        const baseY = enemy.sprite.y;
        const recoil = reaction === "attack" ? 9 : 4;
        this.tweens.add({
          targets: enemy.sprite,
          x: baseX + (direction === "left" ? -recoil : direction === "right" ? recoil : 0),
          y: baseY + (direction === "up" ? -recoil * 0.45 : direction === "down" ? recoil * 0.45 : 0),
          scaleX: enemy.sprite.scaleX * (reaction === "attack" ? 1.08 : 0.94),
          scaleY: enemy.sprite.scaleY * (reaction === "attack" ? 1.08 : 0.94),
          duration: reaction === "attack" ? 130 : 90,
          yoyo: true,
          ease: "Quad.easeOut",
        });
      } else {
        if (enemy.definition.kind === "rat") {
          if (direction === "left" || direction === "right") enemy.sprite.setFlipX(direction === "left");
          this.playCreatureAnimation(enemy.sprite, "ore-rat-active");
        }
        if (enemy.definition.kind === "boar") this.playCreatureAnimation(enemy.sprite, `ore-boar-active-${direction}`);
        if (enemy.definition.kind === "wolf") this.playCreatureAnimation(enemy.sprite, `ore-wolf-active-${direction}`);
        if (enemy.definition.kind === "drake") this.playCreatureAnimation(enemy.sprite, `ore-drake-active-${direction}`);
        if (enemy.definition.kind === "dune-stalker") this.playCreatureAnimation(enemy.sprite, `ore-dune-stalker-active-${direction}`);
        if (enemy.definition.kind === "slime") this.playCreatureAnimation(enemy.sprite, reaction === "attack" ? "ore-slime-attack" : "ore-slime-hurt");
        if (enemy.definition.kind === "treant") this.playCreatureAnimation(enemy.sprite, reaction === "attack" ? "ore-treant-attack" : "ore-treant-hurt");
        if (enemy.definition.kind === "skeleton" || enemy.definition.kind === "witch") {
          this.playCreatureAnimation(enemy.sprite, `ore-${enemy.definition.kind}-${reaction === "attack" ? "attack" : "hurt"}-${direction}`);
        }
        if (
          reaction === "attack" &&
          (enemy.definition.kind === "wolf" || enemy.definition.kind === "drake" || enemy.definition.kind === "dune-stalker" || enemy.definition.kind === "rat" || enemy.definition.kind === "boar")
        ) {
          this.playQuadrupedAttackMotion(enemy, direction);
        }
      }
    }
    this.time.delayedCall(duration, () => {
      if (enemy.reaction !== reaction || enemy.reactionUntil > Date.now()) return;
      enemy.reaction = null;
      enemy.reactionUntil = 0;
      if (enemy.respawnAt > Date.now() || enemy.hp <= 0) return;
      if (enemy.worldAction === "walk") this.playEnemyWalk(enemy, enemy.facing);
      else if (enemy.worldAction === "attack") this.playEnemyReaction(enemy, "attack", enemy.facing);
      else this.playEnemyIdle(enemy);
    });
  }

  private showEnemyAttackAccent(enemy: EnemyRuntime, direction: Direction) {
    if (enemy.definition.kind !== "skeleton") return;
    const vector = direction === "left"
      ? { x: -1, y: 0, angle: Math.PI }
      : direction === "right"
        ? { x: 1, y: 0, angle: 0 }
        : direction === "up"
          ? { x: 0, y: -1, angle: -Math.PI / 2 }
          : { x: 0, y: 1, angle: Math.PI / 2 };
    const x = enemy.sprite.x;
    const y = enemy.sprite.y - 22;
    const depth = enemy.sprite.depth + 12;
    if ((enemy.definition.attackStyle ?? "melee") === "melee") {
      const slash = this.add
        .sprite(x + vector.x * 26, y + vector.y * 18, MELEE_SLASH_KEY, 0)
        .setScale(0.44)
        .setRotation(vector.angle)
        .setDepth(depth)
        .setAlpha(0.9)
        .play("ore-melee-slash");
      slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());
      return;
    }
    if (enemy.definition.attackStyle !== "magic") return;
    const rune = this.add
      .ellipse(x, enemy.sprite.y + 2, 34, 14, 0xa8d7de, 0.12)
      .setStrokeStyle(2, 0xe5f6ef, 0.82)
      .setDepth(depth - 2)
      .setScale(0.42);
    this.tweens.add({
      targets: rune,
      scaleX: 1.65,
      scaleY: 1.65,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => rune.destroy(),
    });
    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5;
      const shard = this.add.rectangle(x, y, 2, 7, 0xdcece5, 0.86).setRotation(angle).setDepth(depth);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * 25,
        y: y + Math.sin(angle) * 12,
        alpha: 0,
        duration: 420,
        ease: "Quad.easeOut",
        onComplete: () => shard.destroy(),
      });
    }
  }

  private playQuadrupedAttackMotion(enemy: EnemyRuntime, direction: Direction) {
    if (!(enemy.sprite instanceof Phaser.GameObjects.Sprite)) return;
    const sprite = enemy.sprite;
    const vector = direction === "left"
      ? { x: -1, y: 0 }
      : direction === "right"
        ? { x: 1, y: 0 }
        : direction === "up"
          ? { x: 0, y: -1 }
          : { x: 0, y: 1 };
    const ranged = enemy.definition.attackStyle === "range" || enemy.definition.attackStyle === "magic";
    const distance = ranged
      ? 7
      : enemy.definition.kind === "rat"
        ? 13
        : enemy.definition.kind === "wolf" || enemy.definition.kind === "dune-stalker"
          ? 24
          : enemy.definition.kind === "boar"
            ? 20
            : 16;
    // Recover to the current rendered position so an attack arriving during a
    // network movement update cannot snap the creature back to stale state.
    const baseX = sprite.x;
    const baseY = sprite.y;
    const baseScaleX = Math.abs(sprite.scaleX);
    const baseScaleY = Math.abs(sprite.scaleY);
    this.tweens.killTweensOf(sprite);
    sprite.setPosition(baseX, baseY);
    this.tweens.add({
      targets: sprite,
      x: baseX - vector.x * 5,
      y: baseY - vector.y * 3 + 1,
      scaleX: baseScaleX * 0.94,
      scaleY: baseScaleY * 1.08,
      duration: 105,
      ease: "Quad.easeIn",
      onComplete: () => {
        if (!sprite.active || enemy.respawnAt > Date.now()) return;
        this.tweens.add({
          targets: sprite,
          x: baseX + vector.x * distance,
          y: baseY + vector.y * distance * 0.62 - 2,
          scaleX: baseScaleX * 1.08,
          scaleY: baseScaleY * 0.92,
          duration: ranged ? 120 : 95,
          ease: "Cubic.easeOut",
          onComplete: () => {
            if (!sprite.active) return;
            this.tweens.add({
              targets: sprite,
              x: baseX,
              y: baseY,
              scaleX: baseScaleX,
              scaleY: baseScaleY,
              duration: 180,
              ease: "Back.easeOut",
            });
          },
        });
      },
    });
  }

  private approach(target: Exclude<ApproachTarget, null>) {
    if (this.inputPaused || this.actionLock) return;
    this.callbacks.onDialogue(null);
    this.approachTarget = target;
    const enemy = target.kind === "enemy" ? this.enemyRuntime.get(target.id) : null;
    const ringColor = enemy?.definition.rare
      ? 0xffdc63
        : target.kind === "enemy"
          ? 0xe96e57
        : target.kind === "resource"
          ? 0x76d5aa
          : target.kind === "sanctuary"
            ? 0x9ff4d8
          : target.kind === "waystone"
            ? 0x63ead3
            : target.kind === "portal"
              ? 0xffcf66
            : 0xf2c75c;
    this.selectedRing.setStrokeStyle(2, ringColor, 0.95).setPosition(target.x, target.y + 5).setVisible(true);
    this.selectedEnemyId = enemy?.definition.id ?? null;
    this.emitHud({ target: enemy ? this.targetState(enemy) : null }, false);
    if (enemy) {
      const style = itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee";
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, enemy.definition.x, enemy.definition.y);
      if (distance <= COMBAT_MAX_RANGE[style] && hasWorldLineOfSight(this.playerPos.x, this.playerPos.y, enemy.definition.x, enemy.definition.y)) {
        this.approachTarget = null;
        this.beginCombat(enemy);
        return;
      }
    }
    const angle = Phaser.Math.Angle.Between(target.x, target.y, this.playerPos.x, this.playerPos.y);
    const style = itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee";
    const standoff = target.kind === "enemy" ? COMBAT_STANDOFF[style] : 58;
    if (!this.planWalkTo(target.x + Math.cos(angle) * standoff, target.y + Math.sin(angle) * standoff)) {
      this.approachTarget = null;
      this.selectedEnemyId = null;
      this.selectedRing.setVisible(false);
      this.emitHud({ target: null, message: `No clear route to ${target.kind === "npc" ? "that person" : "that target"}.` });
    }
  }

  private updateMovement(delta: number) {
    if (this.inputPaused || this.activeResourceId) return;
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    // Attack and gathering animations own the actor until their action timer releases it.
    if (this.actionLock && !dx && !dy) {
      this.moving = false;
      return;
    }

    if (dx || dy) {
      this.walkTarget = null;
      this.walkPath = [];
      this.approachTarget = null;
      if (!this.activeEnemyId) {
        const hadSelectedEnemy = this.selectedEnemyId !== null;
        this.selectedEnemyId = null;
        this.selectedRing.setVisible(false);
        if (hadSelectedEnemy) this.emitHud({ target: null }, false);
      }
    } else if (this.walkTarget) {
      if (this.approachTarget?.kind === "enemy") {
        const movingEnemy = this.enemyRuntime.get(this.approachTarget.id);
        if (movingEnemy && movingEnemy.hp > 0 && movingEnemy.respawnAt <= Date.now()) {
          const style = itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee";
          const angle = Phaser.Math.Angle.Between(
            movingEnemy.definition.x,
            movingEnemy.definition.y,
            this.playerPos.x,
            this.playerPos.y,
          );
          this.approachTarget.x = movingEnemy.definition.x;
          this.approachTarget.y = movingEnemy.definition.y;
          const desiredX = movingEnemy.definition.x + Math.cos(angle) * COMBAT_STANDOFF[style];
          const desiredY = movingEnemy.definition.y + Math.sin(angle) * COMBAT_STANDOFF[style];
          if (
            this.time.now >= this.nextMovingTargetPathAt
            && Phaser.Math.Distance.Between(this.walkTarget.x, this.walkTarget.y, desiredX, desiredY) > 14
          ) {
            this.nextMovingTargetPathAt = this.time.now + 420;
            this.planWalkTo(desiredX, desiredY);
          }
          this.selectedRing.setPosition(movingEnemy.definition.x, movingEnemy.definition.y + 5);
        }
      }
      while (
        this.walkPath.length
        && Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, this.walkPath[0].x, this.walkPath[0].y) <= 5
      ) {
        this.walkPath.shift();
      }
      const waypoint = this.walkPath[0] ?? this.walkTarget;
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, waypoint.x, waypoint.y);
      if (!this.walkPath.length && distance <= 5) {
        this.walkTarget = null;
        this.moving = false;
        this.setHeroAction("idle");
        if (this.approachTarget) {
          const approach = this.approachTarget;
          this.approachTarget = null;
          this.interactWithApproach(approach);
        }
        return;
      }
      dx = (waypoint.x - this.playerPos.x) / distance;
      dy = (waypoint.y - this.playerPos.y) / distance;
    }

    if (!dx && !dy) {
      this.moving = false;
      this.setHeroAction("idle");
      return;
    }

    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    const step = MOVE_SPEED * (delta / 1000);
    const nextX = Phaser.Math.Clamp(this.playerPos.x + dx * step, 26, WORLD.width - 26);
    const areaBounds = worldAreaMovementBounds(this.activeWorldArea, this.activeWorldArea === "guildhall" ? 30 : this.activeWorldArea === "overworld" ? 34 : 24, 24);
    const areaMinY = areaBounds.minY;
    const areaMaxY = areaBounds.maxY;
    const nextY = Phaser.Math.Clamp(this.playerPos.y + dy * step, areaMinY, areaMaxY);
    const beforeX = this.playerPos.x;
    const beforeY = this.playerPos.y;
    if (this.isWalkable(nextX, this.playerPos.y)) this.playerPos.x = nextX;
    if (this.isWalkable(this.playerPos.x, nextY)) this.playerPos.y = nextY;
    if (Math.abs(this.playerPos.x - beforeX) + Math.abs(this.playerPos.y - beforeY) < 0.01) {
      this.blockedMovementMs += delta;
      if (this.walkTarget && this.blockedMovementMs >= 280) {
        const destination = this.walkTarget.clone();
        if (this.walkRepathAttempts < 1) {
          const retry = findWorldPath(this.playerPos, destination);
          this.walkRepathAttempts += 1;
          this.blockedMovementMs = 0;
          if (retry.length) {
            this.walkPath = retry.map((point) => new Phaser.Math.Vector2(point.x, point.y));
          } else {
            this.cancelWalkTarget();
          }
        } else {
          this.cancelWalkTarget();
        }
      }
    } else {
      this.blockedMovementMs = 0;
    }
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    this.moving = true;
    if (this.heroAction !== "attack" || Date.now() >= this.playerAttackUntil) this.setHeroAction("walk");
  }

  private isWalkable(x: number, y: number) {
    return isWorldPositionWalkable(x, y);
  }

  private planWalkTo(x: number, y: number) {
    const path = findWorldPath(this.playerPos, { x, y });
    if (!path.length) return false;
    this.walkPath = path.map((point) => new Phaser.Math.Vector2(point.x, point.y));
    this.walkTarget = this.walkPath.at(-1)?.clone() ?? null;
    this.blockedMovementMs = 0;
    this.walkRepathAttempts = 0;
    return this.walkTarget !== null;
  }

  private cancelWalkTarget() {
    this.walkTarget = null;
    this.walkPath = [];
    this.approachTarget = null;
    this.selectedEnemyId = null;
    this.selectedRing.setVisible(false);
    this.emitHud({ target: null }, false);
  }

  private interactWithApproach(target: Exclude<ApproachTarget, null>) {
    if (target.kind === "npc") {
      const npc = this.npcRuntime.get(target.id);
      if (npc) this.talkToNpc(npc.definition);
    }
    if (target.kind === "enemy") {
      const enemy = this.enemyRuntime.get(target.id);
      if (enemy) this.beginCombat(enemy);
    }
    if (target.kind === "resource") {
      const resource = this.resourceRuntime.get(target.id);
      if (resource) this.beginGathering(resource);
    }
    if (target.kind === "waystone") {
      const waystone = this.waystoneRuntime.get(target.id);
      if (waystone) this.activateWaystone(waystone);
    }
    if (target.kind === "portal") {
      const portal = this.dungeonPortalRuntime.get(target.id);
      if (portal) this.activateDungeonPortal(portal);
    }
    if (target.kind === "sanctuary") this.restAtSanctuary();
  }

  private restAtSanctuary() {
    const threatened = this.activeEnemyId !== null
      || [...this.enemyRuntime.values()].some((enemy) => enemy.targetPlayerId === "local-player" || enemy.targetPlayerId === this.playerId);
    if (threatened) {
      this.emitHud({ message: "The fountain cannot mend you while a creature is pursuing you." });
      return;
    }
    if (this.progress.hp >= this.progress.maxHp) {
      this.emitHud({ message: "The fountain's ward settles around you. Your hitpoints are already full." });
      return;
    }
    this.faceToward(TOWN_SANCTUARY.x, TOWN_SANCTUARY.y);
    this.setHeroAction("attune");
    if (this.useAuthoritativeProfileAction({ action: "rest" }, "Resting at the Founders' Fountain...")) return;
    const healing = this.progress.maxHp - this.progress.hp;
    this.progress = { ...this.progress, hp: this.progress.maxHp };
    this.showSanctuaryFx();
    this.showHealingNumber(healing);
    this.emitHud({ progress: this.progress, message: `The Founders' Fountain restored ${healing} hitpoints.` });
    this.time.delayedCall(650, () => {
      if (!this.disposed && !this.actionLock) this.setHeroAction("idle");
    });
  }

  private showSanctuaryFx() {
    const ring = this.add
      .ellipse(this.playerPos.x, this.playerPos.y + 3, 30, 12)
      .setStrokeStyle(2, 0x9ff4d8, 0.95)
      .setDepth(this.player.depth + 10);
    const halo = this.add
      .circle(this.playerPos.x, this.playerPos.y - 24, 18, 0xf7df8a, 0.18)
      .setDepth(this.player.depth + 9);
    this.tweens.add({ targets: ring, scaleX: 2.8, scaleY: 2.8, alpha: 0, duration: 820, onComplete: () => ring.destroy() });
    this.tweens.add({ targets: halo, y: halo.y - 36, scale: 1.7, alpha: 0, duration: 900, onComplete: () => halo.destroy() });
  }

  private talkToNpc(npc: NpcDefinition) {
    this.faceToward(npc.x, npc.y);
    this.npcRuntime
      .get(npc.id)
      ?.hero.play("idle", directionToward(npc.x, npc.y, this.playerPos.x, this.playerPos.y), true);
    this.setHeroAction("idle");
    const activeQuest = QUEST_STEPS[Math.min(this.progress.questStep, QUEST_STEPS.length - 1)];
    const lateCampaignDialogue: Partial<Record<number, string>> = {
      30: "The Sunbone graves were only the first warning. Moonfen's lanterns are drowning beneath a false eclipse.",
      34: "Nhalassa's sigil is cold. Moonfen can breathe again, and the southern road now leads toward Emberfall.",
      35: "Emberfall heat will split ordinary steel. Take this warding salve and hunt the Ashwing before we attempt the crater road.",
      39: "Varkul's crown still burns. I can quench it into a pickaxe strong enough for the roads ahead.",
      40: "The lighthouse has been dark for thirteen nights. Help me wake its lens before the coast vanishes into the storm.",
      44: "Eira's oath is finally broken. The beacon can carry its light across the northern sea again.",
      45: "The buried court's dead sun has shifted beneath the dunes. We must open its tomb before the next eclipse.",
      49: "Khepri's seal is whole, but its light answers to you now. The seven roads name you their Warden.",
      50: "The relit beacon cast a second shadow beneath the ice. Hroth's old oath is waking in the vault below our eastern cliff.",
      56: "The storm has changed. Hroth's crown no longer commands the coast, and Frostmere can finally greet the dawn without fear.",
    };
    const questLine = lateCampaignDialogue[this.progress.questStep] && activeQuest.target === npc.name
      ? lateCampaignDialogue[this.progress.questStep]!
      : npc.id === "guide"
      ? this.progress.questStep === 15
        ? "The southern beacons are flashing again. Find Ranger-Captain Lyra beyond Briarwild Crossing."
        : npc.dialogue[Math.min(this.progress.questStep, npc.dialogue.length - 1)]
      : npc.id === "ranger"
        ? npc.dialogue[Math.max(0, Math.min(npc.dialogue.length - 1, this.progress.questStep - 16))]
        : npc.dialogue[0];
    const dialogueLines = [questLine];
    if (npc.id === "guide" && this.progress.questStep === 0) {
      dialogueLines.push("Move with WASD or click the ground. Click a person or object to approach it, then press E to interact when you are nearby.");
      dialogueLines.push("Your tracker marks the next objective. Press M for the world map, Q for your quest journal, and G to inspect your gear.");
    }
    if (npc.id === "guide" && this.progress.questStep === 3) {
      dialogueLines.push("If you are wounded, press 2 for Second Wind or press 3 to eat one of the trout in your action bar.");
    }
    if (npc.id === "marshal" || npc.id === "captain") dialogueLines.push(npc.dialogue[1]);
    const sideQuest = this.sideQuestForNpc(npc.id);
    const sideQuestState = sideQuest ? this.progress.sideQuests[sideQuest.id] : undefined;
    const questSpeaker = activeQuest.target === npc.name
      || (npc.id === "smith" && activeQuest.target === "Workshop");
    this.callbacks.onDialogue({
      speaker: npc.name,
      role: npc.role,
      portraitId: npc.id,
      portraitAppearance: NPC_VISUALS[npc.id].appearance,
      portraitEquipped: NPC_VISUALS[npc.id].equipped,
      lines: dialogueLines,
      quest: questSpeaker
        ? {
            chapter: activeQuest.chapter,
            title: activeQuest.questTitle,
            objective: activeQuest.title,
            turnIn: QUEST_TURN_IN_STEPS.has(this.progress.questStep),
          }
        : undefined,
      shop: npc.shop,
      service: npc.service,
      sideQuest: !questSpeaker && sideQuest ? {
        id: sideQuest.id,
        chapter: sideQuest.chapter,
        title: sideQuest.title,
        description: sideQuest.description,
        status: sideQuestState?.status ?? "available",
        objective: sideQuest.objective.label,
        rewardGold: sideQuest.reward.gold,
        rewardXpSkill: sideQuest.reward.xpSkill,
        rewardXp: sideQuest.reward.xp,
        rewardItemId: sideQuest.reward.itemId,
        rewardQuantity: sideQuest.reward.quantity,
      } : undefined,
    });
    if (["guide", "smith", "ranger", "frostkeeper", "sunscar-scholar"].includes(npc.id)
      && this.useAuthoritativeProfileAction({ action: "talk", npcId: npc.id }, `Speaking with ${npc.name}...`)) return;
    if (npc.id === "guide" && this.progress.questStep === 0) {
      this.progress = { ...this.progress, questStep: 1 };
      this.emitHud({ message: "Quest updated: mine copper in the eastern quarry." });
    } else if (npc.id === "guide" && this.progress.questStep === 3) {
      this.progress = {
        ...this.progress,
        questStep: 4,
        questComplete: false,
        gold: this.progress.gold + 150,
        inventory: { ...this.progress.inventory, trout: (this.progress.inventory.trout ?? 0) + 3 },
      };
      this.showQuestRewardToast(3);
      this.emitHud({ message: "The First Spark complete. +150 gold and 3 river trout. Mira has another task." });
    } else if (npc.id === "guide" && this.progress.questStep === 4) {
      this.progress = { ...this.progress, questStep: 5, questComplete: false };
      this.emitHud({ message: "New quest: gather old-growth timber from the western woods." });
    } else if (npc.id === "guide" && this.progress.questStep === 8) {
      this.progress = {
        ...this.progress,
        questStep: 9,
        questComplete: true,
        gold: this.progress.gold + 450,
        inventory: {
          ...this.progress.inventory,
          "sentinel-mail": (this.progress.inventory["sentinel-mail"] ?? 0) + 1,
        },
      };
      this.showQuestRewardToast(8);
      this.emitHud({ message: "Whispers in the Pines complete. +450 gold and Sentinel Mail." });
    } else if (npc.id === "guide" && this.progress.questStep === 9) {
      this.progress = { ...this.progress, questStep: 10, questComplete: false };
      this.emitHud({ message: "Advanced training unlocked. Report to Korra outside the eastern forge." });
    } else if (npc.id === "smith" && this.progress.questStep === 10) {
      this.progress = {
        ...this.progress,
        questStep: 11,
        inventory: {
          ...this.progress.inventory,
          "oak-bow": (this.progress.inventory["oak-bow"] ?? 0) + 1,
          "ember-staff": (this.progress.inventory["ember-staff"] ?? 0) + 1,
          "iron-ore": (this.progress.inventory["iron-ore"] ?? 0) + 3,
          "oak-log": (this.progress.inventory["oak-log"] ?? 0) + 1,
        },
      };
      this.emitHud({ message: "Korra issued an Oak Shortbow, Ember Staff, and workshop materials. Defeat a Field Rat with Range." });
    } else if (npc.id === "smith" && this.progress.questStep === 14) {
      this.progress = {
        ...this.progress,
        questStep: 15,
        questComplete: true,
        gold: this.progress.gold + 650,
        inventory: {
          ...this.progress.inventory,
          "smithing-hammer": (this.progress.inventory["smithing-hammer"] ?? 0) + 1,
          "crafter-kit": (this.progress.inventory["crafter-kit"] ?? 0) + 1,
          "treasure-scroll": (this.progress.inventory["treasure-scroll"] ?? 0) + 1,
        },
      };
      this.showQuestRewardToast(14);
      this.emitHud({ message: "Master of Paths complete. +650 gold, guild tools, and an Orehaven Treasure Scroll." });
    } else if (npc.id === "guide" && this.progress.questStep === 15) {
      this.progress = { ...this.progress, questStep: 16, questComplete: false };
      this.emitHud({ message: "New chapter: follow the south road to Ranger-Captain Lyra in Briarwild." });
      this.callbacks.onToast({ title: "Chapter II", detail: "The Briarwild Signal has begun", tone: "quest" });
    } else if (npc.id === "ranger" && this.progress.questStep === 16) {
      this.progress = { ...this.progress, questStep: 17, questComplete: false };
      this.emitHud({ message: "Lyra marked the Briar Stalker's hunting ground on your map." });
    } else if (npc.id === "ranger" && this.progress.questStep === 22) {
      const inventory = { ...this.progress.inventory };
      inventory["sunstone-shard"] = Math.max(0, (inventory["sunstone-shard"] ?? 0) - 1);
      this.progress = {
        ...this.progress,
        questStep: 23,
        questComplete: true,
        gold: this.progress.gold + 1_200,
        inventory: {
          ...inventory,
          "warden-mail": (inventory["warden-mail"] ?? 0) + 1,
          "arcane-staff": (inventory["arcane-staff"] ?? 0) + 1,
          "healing-potion": (inventory["healing-potion"] ?? 0) + 3,
        },
      };
      this.showQuestRewardToast(22);
      this.emitHud({ message: "The Briarwild Signal complete. +1,200 gold and a frontier loadout." });
    } else if (npc.id === "ranger" && this.progress.questStep === 23) {
      this.progress = { ...this.progress, questStep: 24, questComplete: false };
      this.emitHud({ message: "Chapter III begun: hunt the Sunbone Wanderer below the Old Sun Shrine." });
      this.callbacks.onToast({ title: "Chapter III", detail: "The Sunbone Curse has begun", tone: "quest" });
    } else if (npc.id === "ranger" && this.progress.questStep === 29) {
      this.progress = {
        ...this.progress,
        questStep: 30,
        questComplete: true,
        gold: this.progress.gold + 1_800,
        inventory: {
          ...this.progress.inventory,
          "sunforged-mail": (this.progress.inventory["sunforged-mail"] ?? 0) + 1,
          "rune-blade": (this.progress.inventory["rune-blade"] ?? 0) + 1,
          "healing-potion": (this.progress.inventory["healing-potion"] ?? 0) + 5,
        },
      };
      this.showQuestRewardToast(29);
      this.emitHud({ message: "The Sunbone Curse complete. +1,800 gold and Sunforged Warden Plate." });
    } else if (npc.id === "ranger" && this.progress.questStep === 30) {
      this.progress = { ...this.progress, questStep: 31, questComplete: false };
      this.emitHud({ message: "Chapter IV begun: follow the drowned lantern road into Moonfen." });
      this.callbacks.onToast({ title: "Chapter IV", detail: "The Moonfen Eclipse has begun", tone: "quest" });
    } else if (npc.id === "ranger" && this.progress.questStep === 34) {
      this.progress = {
        ...this.progress,
        questStep: 35,
        questComplete: true,
        gold: this.progress.gold + 2_200,
        inventory: { ...this.progress.inventory, "moonweave-mantle": (this.progress.inventory["moonweave-mantle"] ?? 0) + 1 },
      };
      this.showQuestRewardToast(34);
      this.emitHud({ message: "The Moonfen Eclipse complete. +2,200 gold and a Moonweave Mantle." });
    } else if (npc.id === "smith" && this.progress.questStep === 35) {
      this.progress = { ...this.progress, questStep: 36, questComplete: false };
      this.emitHud({ message: "Chapter V begun: hunt the Ashwing Drake on Emberfall's western road." });
      this.callbacks.onToast({ title: "Chapter V", detail: "The Emberfall Crown has begun", tone: "quest" });
    } else if (npc.id === "smith" && this.progress.questStep === 39) {
      this.progress = {
        ...this.progress,
        questStep: 40,
        questComplete: true,
        gold: this.progress.gold + 2_800,
        inventory: { ...this.progress.inventory, "sunstone-pick": (this.progress.inventory["sunstone-pick"] ?? 0) + 1 },
      };
      this.showQuestRewardToast(39);
      this.emitHud({ message: "The Emberfall Crown complete. +2,800 gold and a Sunstone Pickaxe." });
    } else if (npc.id === "frostkeeper" && this.progress.questStep === 40) {
      this.progress = { ...this.progress, questStep: 41, questComplete: false };
      this.emitHud({ message: "Chapter VI begun: drive the Icefang from Frostmere's crossing." });
      this.callbacks.onToast({ title: "Chapter VI", detail: "The Last Light has begun", tone: "quest" });
    } else if (npc.id === "frostkeeper" && this.progress.questStep === 44) {
      this.progress = {
        ...this.progress,
        questStep: 45,
        questComplete: true,
        gold: this.progress.gold + 3_400,
        inventory: { ...this.progress.inventory, "frostspire-staff": (this.progress.inventory["frostspire-staff"] ?? 0) + 1 },
      };
      this.showQuestRewardToast(44);
      this.emitHud({ message: "The Last Light complete. +3,400 gold and a Frostspire Staff." });
    } else if (npc.id === "sunscar-scholar" && this.progress.questStep === 45) {
      this.progress = { ...this.progress, questStep: 46, questComplete: false };
      this.emitHud({ message: "Chapter VII begun: hunt the Dune Stalker along the oasis road." });
      this.callbacks.onToast({ title: "Chapter VII", detail: "The Buried Sun has begun", tone: "quest" });
    } else if (npc.id === "sunscar-scholar" && this.progress.questStep === 49) {
      this.progress = {
        ...this.progress,
        questStep: 50,
        questComplete: true,
        gold: this.progress.gold + 5_000,
        inventory: { ...this.progress.inventory, "nightguard-plate": (this.progress.inventory["nightguard-plate"] ?? 0) + 1 },
      };
      this.showQuestRewardToast(49);
      this.emitHud({ message: "The Buried Sun complete. Keeper Elowen has sent an urgent beacon from Frostmere." });
    } else if (npc.id === "frostkeeper" && this.progress.questStep === 50) {
      this.progress = { ...this.progress, questStep: 51, questComplete: false };
      this.emitHud({ message: "Chapter VIII begun: descend through Frostmere's eastern cliff into Icefang Vault." });
      this.callbacks.onToast({ title: "Chapter VIII", detail: "The Rimebound Oath has begun", tone: "quest" });
    } else if (npc.id === "frostkeeper" && this.progress.questStep === 56) {
      this.progress = {
        ...this.progress,
        questStep: 57,
        questComplete: true,
        gold: this.progress.gold + 6_800,
        inventory: {
          ...this.progress.inventory,
          "frostguard-aegis": (this.progress.inventory["frostguard-aegis"] ?? 0) + 1,
          "healing-potion": (this.progress.inventory["healing-potion"] ?? 0) + 6,
        },
      };
      this.showQuestRewardToast(56);
      this.emitHud({ message: "The Rimebound Oath complete. Frostmere has thawed, and you are Warden of the Thawing Realm." });
    } else {
      this.emitHud({ message: `${npc.name}: ${questLine}` });
    }
  }

  private beginCombat(enemy: EnemyRuntime) {
    if (enemy.respawnAt > Date.now()) return;
    const weapon = itemById(this.progress.equipped.weapon);
    const combatStyle = weapon?.combatStyle ?? "melee";
    const distance = Phaser.Math.Distance.Between(
      this.playerPos.x,
      this.playerPos.y,
      enemy.definition.x,
      enemy.definition.y,
    );
    if (distance > COMBAT_MAX_RANGE[combatStyle]) {
      this.emitHud({ message: `${enemy.definition.name} is out of ${combatStyleLabel(combatStyle).toLowerCase()} range.` });
      this.approach({ kind: "enemy", id: enemy.definition.id, x: enemy.definition.x, y: enemy.definition.y });
      return;
    }
    if (!hasWorldLineOfSight(this.playerPos.x, this.playerPos.y, enemy.definition.x, enemy.definition.y)) {
      this.emitHud({ message: `${enemy.definition.name} is blocked by terrain. Move to a clear firing line.` });
      this.actionLock = false;
      this.selectedRing.setVisible(false);
      return;
    }
    this.faceToward(enemy.definition.x, enemy.definition.y);
    this.actionLock = true;
    this.walkTarget = null;
    this.walkPath = [];
    this.activeEnemyId = enemy.definition.id;
    this.callbacks.onMusic("battle");
    this.showBossIntroduction(enemy);
    this.selectedEnemyId = enemy.definition.id;
    this.selectedRing
      .setStrokeStyle(2, enemy.definition.rare ? 0xffdc63 : 0xe96e57, 0.95)
      .setPosition(enemy.definition.x, enemy.definition.y + 5)
      .setVisible(true);
    enemy.hpBar.setVisible(true);
    if (!this.isRealtimeOnline() && enemy.targetPlayerId !== "local-player") {
      enemy.targetPlayerId = "local-player";
      enemy.threatRing.setStrokeStyle(3, 0xf05c4f, 0.98).setVisible(true);
      this.showAggroAlert(enemy);
    }
    const combatSkill = combatSkillForStyle(combatStyle);
    const interval = Math.max(560, 900 - this.progress.skills[combatSkill].level * 5 - (combatStyle === "range" ? 45 : 0));
    this.beginTimedAction(
      `Fighting ${enemy.definition.name}`,
      `${combatStyleLabel(combatStyle)} auto-attacks with ${weapon?.name ?? "starter gear"}`,
      interval,
    );
    this.emitHud({ target: this.targetState(enemy) }, false);
    if (this.isRealtimeOnline()) {
      const strike = () => this.sendCombatStrike(enemy, weapon?.power ?? 1, combatStyle);
      strike();
      this.actionTimer = this.time.addEvent({ delay: interval, loop: true, callback: strike });
      return;
    }

    const strike = () => {
      if (this.disposed || enemy.respawnAt > Date.now()) return;
      this.playStrikeAnimation(enemy, combatStyle);
      const combatLevel = this.progress.skills[combatSkill].level;
      const weaponPower = weapon?.power ?? 1;
      const critical = localCombatCritical(combatLevel, weaponPower);
      const baseDamage = localCombatDamage(combatStyle, combatLevel, weaponPower);
      const damage = critical ? Math.ceil(baseDamage * 1.5) : baseDamage;
      enemy.hp = Math.max(0, enemy.hp - damage);
      this.drawEnemyHp(enemy);
      this.showDamageNumber(enemy, damage, combatStyle, critical);
      if (enemy.hp <= 0) {
        this.finishCombat(enemy);
        return;
      }
      const status = enemy.status && enemy.status.expiresAt > Date.now() ? enemy.status : null;
      if (!status) enemy.status = null;
      const suppressed = status?.kind === "stagger" || status?.kind === "root";
      const weakenMultiplier = status?.kind === "weaken" ? 1 - Phaser.Math.Clamp(status.strength, 0, 0.8) : 1;
      const rawRetaliation = suppressed
        ? 0
        : Math.max(1, Math.floor(Phaser.Math.Between(1, Math.max(2, Math.ceil(enemy.definition.level * 0.72))) * weakenMultiplier));
      const retaliation = rawRetaliation > 0 ? this.mitigateIncomingDamage(rawRetaliation) : 0;
      if (rawRetaliation > 0) this.addXp("defense", Math.max(2, Math.ceil(rawRetaliation * 0.8 + enemy.definition.level * 0.25)));
      this.progress = { ...this.progress, hp: Math.max(0, this.progress.hp - retaliation) };
      const enemyFacing = directionToward(enemy.definition.x, enemy.definition.y, this.playerPos.x, this.playerPos.y);
      if (retaliation > 0) {
        this.time.delayedCall(500, () => this.playEnemyReaction(enemy, "attack", enemyFacing));
        this.time.delayedCall(690, () => this.showPlayerDamage(retaliation, rawRetaliation - retaliation));
      }
      if (this.progress.hp <= 0) {
        this.respawnPlayer();
        return;
      }
      this.activeAction = this.activeAction
        ? { ...this.activeAction, startedAt: Date.now(), endsAt: Date.now() + interval, detail: `${enemy.hp}/${enemy.definition.maxHp} enemy HP` }
        : null;
      this.emitHud({
        message: retaliation > 0
          ? `You hit ${enemy.definition.name} for ${damage}. It hits back for ${retaliation}.`
          : `You hit ${enemy.definition.name} for ${damage}. ${status?.label ?? "The creature"} prevents its counterattack.`,
        target: this.targetState(enemy),
      });
    };
    strike();
    if (!this.actionLock) return;
    this.actionTimer = this.time.addEvent({ delay: interval, loop: true, callback: strike });
  }

  private showBossIntroduction(enemy: EnemyRuntime) {
    const intro = BOSS_INTRODUCTIONS.find((candidate) => candidate.enemyId === enemy.definition.id);
    if (!intro || this.introducedBosses.has(enemy.definition.id)) return;
    this.introducedBosses.add(enemy.definition.id);
    this.callbacks.onBossIntro({
      ...intro,
      enemyName: enemy.definition.name,
      level: enemy.definition.level,
      kind: enemy.definition.kind,
    });
    this.callbacks.onAudio(enemy.definition.attackStyle === "magic" ? "magic-cast" : "hurt");
    const ring = this.add
      .ellipse(enemy.definition.x, enemy.definition.y + 3, 98, 38, intro.accent, 0.08)
      .setStrokeStyle(3, intro.accent, 0.94)
      .setDepth(enemy.sprite.depth + 16)
      .setScale(0.3);
    const inner = this.add
      .ellipse(enemy.definition.x, enemy.definition.y + 3, 58, 22)
      .setStrokeStyle(2, 0xffffff, 0.74)
      .setDepth(enemy.sprite.depth + 17)
      .setScale(0.45);
    this.tweens.add({ targets: ring, scaleX: 1.55, scaleY: 1.55, alpha: 0, duration: 900, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    this.tweens.add({ targets: inner, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 760, delay: 90, ease: "Cubic.easeOut", onComplete: () => inner.destroy() });
    this.cameras.main.flash(150, (intro.accent >> 16) & 0xff, (intro.accent >> 8) & 0xff, intro.accent & 0xff, false, undefined, 0.08);
    this.cameras.main.shake(180, 0.0022);
  }

  private sendCombatStrike(enemy: EnemyRuntime, weaponPower: number, combatStyle: CombatStyle, abilityId?: string) {
    if (this.disposed || this.awaitingCombatResponse || enemy.respawnAt > Date.now() || !this.isRealtimeOnline()) return;
    const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, enemy.definition.x, enemy.definition.y);
    if (distance > COMBAT_MAX_RANGE[combatStyle] || !hasWorldLineOfSight(this.playerPos.x, this.playerPos.y, enemy.definition.x, enemy.definition.y)) {
      this.emitHud({ message: distance > COMBAT_MAX_RANGE[combatStyle] ? "Target is out of range. Move closer to resume attacking." : "Terrain is blocking your attack. Find a clear firing line." }, false);
      return;
    }
    this.awaitingCombatResponse = true;
    if (abilityId) this.playSignatureAbilityFx(enemy, combatStyle, abilityId);
    else this.playStrikeAnimation(enemy, combatStyle);
    const combatSkill = combatSkillForStyle(combatStyle);
    this.ws!.send(
      JSON.stringify({
        type: "rpg_attack",
        enemyId: enemy.definition.id,
        abilityId,
        combatStyle,
        combatLevel: this.progress.skills[combatSkill].level,
        defenseLevel: this.progress.skills.defense.level,
        weaponPower,
      }),
    );
  }

  private finishCombat(enemy: EnemyRuntime) {
    this.actionTimer?.remove(false);
    this.actionTimer = null;
    const reward = Phaser.Math.Between(enemy.definition.gold[0], enemy.definition.gold[1]);
    const combatStyle = itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee";
    const combatSkill = combatSkillForStyle(combatStyle);
    this.addXp(combatSkill, enemy.definition.attackXp);
    this.addXp("hitpoints", Math.ceil(enemy.definition.attackXp * 0.4));
    this.progress = { ...this.progress, gold: this.progress.gold + reward };
    const rareDropId = rollLocalLoot(enemy.definition.id);
    const rareDrop = itemById(rareDropId);
    if (rareDrop) {
      this.progress = {
        ...this.progress,
        inventory: {
          ...this.progress.inventory,
          [rareDrop.id]: (this.progress.inventory[rareDrop.id] ?? 0) + 1,
        },
        collectionLog: {
          ...this.progress.collectionLog,
          [rareDrop.id]: (this.progress.collectionLog[rareDrop.id] ?? 0) + 1,
        },
      };
      this.callbacks.onToast({ title: lootToastTitle(rareDrop.rarity), detail: rareDrop.name, tone: "loot", itemId: rareDrop.id });
    }
    this.progress = {
      ...this.progress,
      questStep: questStepAfterCombat(this.progress.questStep, enemy.definition, combatStyle),
      activities: recordActivity(this.progress.activities, "combat", 1, enemy.definition.kind),
      sideQuests: advanceSideQuests(this.progress.sideQuests, "combat", enemy.definition.kind, enemy.definition.id),
    };
    this.progress = { ...this.progress, activities: recordLifetimeTarget(this.progress.activities, enemy.definition.id) };
    if (enemy.definition.id === publicEventRotation().event.enemyId) {
      this.progress = { ...this.progress, activities: recordActivity(this.progress.activities, "event") };
    }
    const respawnMs = enemy.definition.respawnMs ?? DEFAULT_ENEMY_RESPAWN_MS;
    enemy.respawnAt = Date.now() + respawnMs;
    enemy.hp = enemy.definition.maxHp;
    enemy.hpBar.setVisible(false);
    enemy.targetPlayerId = null;
    enemy.threatRing.setVisible(false);
    enemy.hitZone.disableInteractive();
    enemy.rareAura?.setVisible(false);
    this.showEnemyDefeatFx(enemy);
    this.showCombatReward(enemy, reward, rareDrop);
    this.tweens.add({
      targets: [enemy.sprite, enemy.shadow, enemy.plate],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        enemy.sprite.setVisible(false);
        enemy.shadow.setVisible(false);
        enemy.plate.setVisible(false);
      },
    });
    this.time.delayedCall(respawnMs, () => {
      if (this.disposed) return;
      enemy.respawnAt = 0;
      enemy.sprite.setVisible(true).setAlpha(1);
      enemy.hitZone.setInteractive({ useHandCursor: true });
      enemy.shadow.setVisible(true).setAlpha(enemy.definition.rare ? 0.42 : 0.34);
      enemy.plate.setVisible(true).setAlpha(1);
      enemy.rareAura?.setVisible(true).setAlpha(0.82);
      enemy.threatRing.setVisible(false).setAlpha(1);
      this.playEnemyIdle(enemy);
    });
    if (!rareDrop) this.callbacks.onAudio("victory");
    this.finishAction(
      `${enemy.definition.name} defeated. +${reward} gold${rareDrop ? ` • Rare drop: ${rareDrop.name}!` : "."}`,
    );
  }

  private beginGathering(resource: ResourceRuntime) {
    if (!resource.available) return;
    const skill = this.progress.skills[resource.definition.skill];
    if (skill.level < resource.definition.requiredLevel) {
      this.emitHud({
        message: `${resource.definition.name} requires ${resource.definition.skill} level ${resource.definition.requiredLevel}.`,
      });
      return;
    }
    this.faceToward(resource.definition.x, resource.definition.y);
    this.actionLock = true;
    this.walkTarget = null;
    this.walkPath = [];
    const tool = itemById(this.progress.equipped.tool);
    const toolMultiplier = resource.definition.kind === "ore" ? Math.max(0.62, 1 - ((tool?.power ?? 1) - 1) * 0.19) : 1;
    const duration = Math.round(resource.definition.seconds * 1000 * toolMultiplier);
    if (this.isRealtimeOnline()) {
      this.activeResourceId = resource.definition.id;
      this.selectedRing.setPosition(resource.definition.x, resource.definition.y + 5).setVisible(true);
      this.emitHud({ message: `Reserving ${resource.definition.name}...`, action: `Gather ${resource.definition.name}` });
      this.ws!.send(
        JSON.stringify({
          type: "rpg_gather_start",
          resourceId: resource.definition.id,
          toolPower: tool?.power ?? 1,
          skillLevel: skill.level,
        }),
      );
      return;
    }

    this.startGatheringVisuals(resource, duration);
    this.actionTimer = this.time.delayedCall(duration, () => this.finishGathering(resource));
  }

  private startGatheringVisuals(resource: ResourceRuntime, duration: number, endsAt = Date.now() + duration) {
    const verb = resource.definition.kind === "ore"
      ? "Mining"
      : resource.definition.kind === "tree"
        ? "Chopping"
        : resource.definition.kind === "relic"
          ? "Attuning"
          : "Fishing";
    const tool = itemById(this.progress.equipped.tool);
    this.activeAction = {
      label: `${verb} ${resource.definition.name}`,
      detail: resource.definition.kind === "relic"
        ? `${Math.max(1, Math.ceil(duration / 1000))}s channeling the ancient ward`
        : `${Math.max(1, Math.ceil(duration / 1000))}s with ${tool?.name ?? "starter tools"}`,
      startedAt: Date.now(),
      endsAt,
    };
    this.emitHud({
      activeAction: this.activeAction,
      action: this.activeAction.label,
      message: `${verb} in progress. Stay close until the action completes.`,
    });
    const audioCue: GameAudioCue = resource.definition.kind === "ore"
      ? "mine"
      : resource.definition.kind === "tree"
        ? "chop"
        : resource.definition.kind === "fish"
          ? "fish"
          : "magic-cast";
    this.gatheringAudioTimer?.remove(false);
    this.callbacks.onAudio(audioCue);
    this.gatheringAudioTimer = this.time.addEvent({
      delay: resource.definition.kind === "fish" ? 1_250 : resource.definition.kind === "relic" ? 1_100 : 820,
      loop: true,
      callback: () => this.callbacks.onAudio(audioCue),
    });
    this.setHeroAction(
      resource.definition.kind === "ore"
        ? "mine"
        : resource.definition.kind === "tree"
          ? "chop"
          : resource.definition.kind === "fish"
            ? "fish"
            : "attune",
    );
    this.actionFx?.destroy();
    this.actionFx = null;
    this.destroyFishingFx();
    if (resource.definition.kind === "fish") {
      this.createFishingFx(resource);
    } else {
      this.actionFx = this.add.circle(resource.definition.x, resource.definition.y - 28, 4, resource.definition.kind === "ore" ? 0xffd36e : 0xb8f49b, 0.9).setDepth(resource.definition.y + 4);
      this.tweens.add({ targets: this.actionFx, y: resource.definition.y - 52, alpha: 0, scale: 2.2, duration: 520, yoyo: false, repeat: -1 });
    }
  }

  private createFishingFx(resource: ResourceRuntime) {
    const handX = this.playerPos.x;
    const handY = this.playerPos.y - 28;
    const targetX = resource.definition.x;
    const targetY = resource.definition.y - 4;
    const distance = Math.hypot(targetX - handX, targetY - handY) || 1;
    const rodTipX = handX + ((targetX - handX) / distance) * 31;
    const rodTipY = handY + ((targetY - handY) / distance) * 23 - 7;
    const line = this.add.graphics();
    const ripple = this.add.ellipse(targetX, targetY + 4, 14, 5).setStrokeStyle(1, 0x9ce8ef, 0.78);
    const bobber = this.add.container(handX, handY);
    const bobberShadow = this.add.rectangle(1, 2, 5, 7, 0x263846, 0.8);
    const bobberTop = this.add.rectangle(0, -1, 4, 4, 0xe7524b, 1);
    const bobberBottom = this.add.rectangle(0, 2, 4, 3, 0xf6e8c7, 1);
    const bobberStem = this.add.rectangle(0, -4, 2, 3, 0xe8d7ac, 1);
    bobber.add([bobberShadow, bobberTop, bobberBottom, bobberStem]);

    const redrawLine = () => {
      if (!line.active || !bobber.active) return;
      const sagX = rodTipX + (bobber.x - rodTipX) * 0.52;
      const sagY = Math.max(rodTipY, bobber.y) + 5;
      line.clear();
      line.lineStyle(2, 0x243541, 0.76).beginPath().moveTo(rodTipX, rodTipY).lineTo(sagX, sagY).lineTo(bobber.x, bobber.y).strokePath();
      line.lineStyle(1, 0xe5edf0, 0.88).beginPath().moveTo(rodTipX, rodTipY - 1).lineTo(sagX, sagY - 1).lineTo(bobber.x, bobber.y - 1).strokePath();
    };

    this.fishingFx = this.add.container(0, 0, [line, ripple, bobber]).setDepth(resource.definition.y + 6);
    redrawLine();
    this.tweens.add({
      targets: bobber,
      x: targetX,
      y: targetY,
      duration: 460,
      ease: "Cubic.easeOut",
      onUpdate: redrawLine,
      onComplete: () => {
        if (!bobber.active) return;
        this.tweens.add({
          targets: bobber,
          y: targetY + 2,
          duration: 760,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          onUpdate: redrawLine,
        });
      },
    });
    this.tweens.add({ targets: ripple, scaleX: 1.45, scaleY: 1.35, alpha: 0.2, duration: 1_050, repeat: -1, ease: "Sine.easeOut" });
  }

  private destroyFishingFx() {
    if (!this.fishingFx) return;
    this.fishingFx.list.forEach((child) => this.tweens.killTweensOf(child));
    this.fishingFx.destroy(true);
    this.fishingFx = null;
  }

  private finishGathering(
    resource: ResourceRuntime,
    reward = { gold: resource.definition.gold, xp: resource.definition.xp, itemId: this.resourceItemId(resource) },
    networkControlled = false,
    profileAuthoritative = false,
  ) {
    if (!profileAuthoritative) {
      this.addXp(resource.definition.skill, reward.xp);
      this.progress = {
        ...this.progress,
        gold: this.progress.gold + reward.gold,
        inventory: { ...this.progress.inventory, [reward.itemId]: (this.progress.inventory[reward.itemId] ?? 0) + 1 },
        questStep: questStepAfterGather(this.progress.questStep, resource.definition),
        activities: recordActivity(this.progress.activities, "gather"),
        sideQuests: advanceSideQuests(this.progress.sideQuests, "gather", resource.definition.kind, resource.definition.id),
      };
      this.progress = { ...this.progress, activities: recordLifetimeTarget(this.progress.activities, `resource-${resource.definition.itemId}`) };
    }
    const persistentFishingSpot = resource.definition.kind === "fish";
    if (persistentFishingSpot) {
      resource.available = true;
      resource.claimedBy = null;
      resource.respawnAt = 0;
      resource.sprite.setVisible(true).setAlpha(1).setScale(resource.definition.scale);
      resource.hitZone.setInteractive({ useHandCursor: true });
      resource.plate.setVisible(true).setAlpha(1).setScale(1);
      this.animateResource(resource);
    } else {
      resource.available = false;
      resource.hitZone.disableInteractive();
      this.tweens.killTweensOf(resource.sprite);
      resource.sprite.setAngle(0);
      this.tweens.add({
        targets: resource.sprite,
        alpha: 0,
        scaleX: resource.definition.scale * 0.75,
        scaleY: resource.definition.scale * 0.75,
        duration: 260,
      });
      this.tweens.add({ targets: resource.plate, alpha: 0, scaleX: 0.75, scaleY: 0.75, duration: 260 });
    }
    if (!networkControlled && !persistentFishingSpot) {
      this.time.delayedCall(30_000, () => {
        if (this.disposed) return;
        resource.available = true;
        resource.sprite.setVisible(true).setAlpha(1).setScale(resource.definition.scale);
        resource.hitZone.setInteractive({ useHandCursor: true });
        resource.plate.setVisible(true).setAlpha(1).setScale(1);
        this.animateResource(resource);
      });
    }
    this.callbacks.onAudio("gather-complete");
    this.finishAction(`${resource.definition.name} gathered. +${reward.gold} gold, +${reward.xp} XP.`);
  }

  private resourceItemId(resource: ResourceRuntime) {
    return resource.definition.itemId;
  }

  private beginTimedAction(label: string, detail: string, duration: number) {
    const now = Date.now();
    this.activeAction = { label, detail, startedAt: now, endsAt: now + duration };
    this.emitHud({ activeAction: this.activeAction, action: label });
  }

  private finishAction(message: string) {
    if (!this.isRealtimeOnline() && this.activeEnemyId) {
      const enemy = this.enemyRuntime.get(this.activeEnemyId);
      if (enemy) {
        enemy.targetPlayerId = null;
        enemy.threatRing.setVisible(false);
      }
    }
    this.actionLock = false;
    this.activeEnemyId = null;
    this.selectedEnemyId = null;
    this.activeResourceId = null;
    this.awaitingCombatResponse = false;
    this.activeAction = null;
    this.gatheringAudioTimer?.remove(false);
    this.gatheringAudioTimer = null;
    this.actionFx?.destroy();
    this.actionFx = null;
    this.destroyFishingFx();
    this.selectedRing.setVisible(false);
    this.setHeroAction("idle");
    this.callbacks.onMusic(this.activeWorldArea === "dungeon" || this.activeWorldArea === "icefang" ? "dungeon" : "field");
    this.emitHud({ activeAction: null, message, action: "Explore", target: null });
  }

  private targetState(enemy: EnemyRuntime): TargetState {
    return {
      id: enemy.definition.id,
      name: enemy.definition.name,
      kind: enemy.definition.kind,
      level: enemy.definition.level,
      hp: enemy.hp,
      maxHp: enemy.definition.maxHp,
      combatStyle: enemy.definition.attackStyle ?? "melee",
      rare: Boolean(enemy.definition.rare),
      status: enemy.status && enemy.status.expiresAt > Date.now() ? enemy.status : null,
    };
  }

  private respawnPlayer() {
    if (this.respawning) return;
    this.respawning = true;
    this.actionTimer?.remove(false);
    this.actionTimer = null;
    this.actionLock = true;
    this.awaitingCombatResponse = false;
    this.walkTarget = null;
    this.walkPath = [];
    this.approachTarget = null;
    this.selectedRing.setVisible(false);
    this.heroAction = "idle";
    this.player?.play("hurt", this.facing, true);
    this.callbacks.onAudio("hurt");
    const knockout = this.add
      .text(this.playerPos.x, this.playerPos.y - 76, "KNOCKED OUT", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffe6ca",
        stroke: "#421812",
        strokeThickness: 6,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(this.playerPos.y + 120);
    this.tweens.add({ targets: knockout, y: knockout.y - 18, alpha: 0.25, duration: 760, ease: "Cubic.easeOut" });
    this.cameras.main.shake(170, 0.0024);
    this.time.delayedCall(520, () => this.cameras.main.fadeOut(280, 38, 22, 20));
    this.time.delayedCall(850, () => {
      if (this.disposed) return;
      knockout.destroy();
      this.playerPos.set(PLAYER_START.x, PLAYER_START.y);
      this.applyWorldArea(PLAYER_START.y, true);
      this.progress = {
        ...this.progress,
        hp: this.progress.maxHp,
        position: { ...PLAYER_START },
      };
      this.updatePlayerView();
      this.finishAction("You were knocked out and carried back to Orehaven Square.");
      this.respawning = false;
      this.cameras.main.fadeIn(420, 255, 239, 204);
      this.callbacks.onToast({
        title: "Returned to Orehaven",
        detail: "The town ward restored your health. Your inventory is safe.",
        tone: "quest",
      });
    });
  }

  private addXp(skill: SkillId, xp: number) {
    const current = this.progress.skills[skill];
    const nextXp = current.xp + xp;
    const nextLevel = levelFromXp(nextXp);
    const skills = { ...this.progress.skills, [skill]: { xp: nextXp, level: nextLevel } };
    const nextMaxHp = maxHpForProgress({ skills, equipped: this.progress.equipped });
    this.progress = {
      ...this.progress,
      skills,
      maxHp: nextMaxHp,
      hp: Math.min(nextMaxHp, this.progress.hp + Math.max(0, nextMaxHp - this.progress.maxHp)),
    };
    if (nextLevel > current.level) {
      this.announceLevelUp(skill, current.level, nextLevel);
      this.cameras.main.flash(220, 246, 207, 104, false);
      const beam = this.add.rectangle(this.playerPos.x, this.playerPos.y - 24, 42, 90, 0xffe58b, 0.24).setDepth(this.player.depth + 7);
      this.tweens.add({ targets: beam, alpha: 0, scaleX: 1.8, scaleY: 1.25, duration: 620, onComplete: () => beam.destroy() });
    }
  }

  private announceLevelUp(skill: SkillId, previousLevel: number, level: number) {
    const skillName = skillLabel(skill);
    const unlocks = skillUnlocksBetween(skill, previousLevel, level);
    this.callbacks.onToast({
      title: `${skillName} level up!`,
      detail: unlocks.length ? `Level ${level} reached • ${unlocks.length} new unlock${unlocks.length === 1 ? "" : "s"}` : `Level ${level} reached`,
      tone: "level",
    });
    this.callbacks.onLevelUp({ skill, skillName, level, unlocks });
  }

  private drawEnemyHp(enemy: EnemyRuntime) {
    const width = 56;
    const ratio = Phaser.Math.Clamp(enemy.hp / enemy.definition.maxHp, 0, 1);
    const barY = enemy.definition.y - this.enemyVisualHeight(enemy);
    enemy.hpBar.clear();
    enemy.hpBar.fillStyle(0x1a1411, 0.9).fillRoundedRect(enemy.definition.x - width / 2, barY, width, 7, 3);
    enemy.hpBar.fillStyle(ratio > 0.35 ? 0xd6534d : 0xffb347, 1).fillRoundedRect(enemy.definition.x - width / 2 + 2, barY + 2, (width - 4) * ratio, 3, 1);
  }

  private showDamageNumber(enemy: EnemyRuntime, damage: number, combatStyle: CombatStyle, critical = false) {
    this.callbacks.onAudio("impact");
    const color = critical ? "#fff2a6" : combatStyle === "magic" ? "#8ce8ff" : combatStyle === "range" ? "#c8ef82" : "#ffd08a";
    const text = this.add
      .text(enemy.definition.x + Phaser.Math.Between(-8, 8), enemy.definition.y - this.enemyVisualHeight(enemy) + 8, critical ? `CRIT -${damage}` : `-${damage}`, {
        fontFamily: "Verdana, sans-serif",
        fontSize: critical ? "17px" : "13px",
        fontStyle: "bold",
        color,
        stroke: critical ? "#6b2d12" : "#15110c",
        strokeThickness: critical ? 5 : 4,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(enemy.sprite.depth + 12);
    if (critical) {
      const burst = this.add
        .circle(enemy.definition.x, enemy.definition.y - this.enemyVisualHeight(enemy) * 0.52, 12, 0xffd866, 0.18)
        .setStrokeStyle(3, 0xfff0a0, 0.95)
        .setDepth(enemy.sprite.depth + 11);
      this.tweens.add({
        targets: burst,
        alpha: 0,
        scale: 2.7,
        duration: 280,
        ease: "Cubic.easeOut",
        onComplete: () => burst.destroy(),
      });
      this.cameras.main.shake(90, 0.0018);
    }
    const direction = directionToward(enemy.definition.x, enemy.definition.y, this.playerPos.x, this.playerPos.y);
    this.playEnemyReaction(enemy, "hurt", direction);
    if (!enemy.hero && enemy.sprite instanceof Phaser.GameObjects.Sprite) {
      enemy.sprite.setTintFill(0xffffff);
      this.time.delayedCall(75, () => {
        if (!(enemy.sprite instanceof Phaser.GameObjects.Sprite)) return;
        if (enemy.definition.rare) enemy.sprite.setTint(0xffda64);
        else enemy.sprite.clearTint();
      });
    }
    this.tweens.add({
      targets: text,
      y: text.y - 32,
      alpha: 0,
      scale: 1.25,
      duration: 620,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }

  private showAggroAlert(enemy: EnemyRuntime) {
    const depth = enemy.sprite.depth + 14;
    const ring = this.add
      .ellipse(enemy.definition.x, enemy.definition.y + 3, 34, 15)
      .setStrokeStyle(3, 0xff6657, 0.98)
      .setDepth(depth)
      .setScale(0.45);
    const alert = this.add
      .text(enemy.definition.x, enemy.definition.y - this.enemyVisualHeight(enemy) - 7, "!", {
        fontFamily: "Georgia, serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ff8d72",
        stroke: "#2b100c",
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(depth + 1);
    this.tweens.add({ targets: ring, scaleX: 2.1, scaleY: 2.1, alpha: 0, duration: 520, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    this.tweens.add({ targets: alert, y: alert.y - 13, alpha: 0, delay: 220, duration: 520, ease: "Quad.easeOut", onComplete: () => alert.destroy() });
  }

  private showEnemyDefeatFx(enemy: EnemyRuntime) {
    const colorByKind: Record<EnemyDefinition["kind"], number> = {
      rat: 0xb8906c,
      goblin: 0x8cc66a,
      wolf: 0xb8c2c8,
      drake: 0xff6d32,
      "dune-stalker": 0xd8a04d,
      boar: 0xd45e36,
      slime: enemy.definition.rare ? 0xffd45d : 0x77d6c4,
      orc: 0x7ca55c,
      lizard: 0x69b99a,
      skeleton: 0xe4ddc0,
      witch: 0xb77ae1,
      treant: 0x74c97b,
    };
    const color = colorByKind[enemy.definition.kind];
    const x = enemy.definition.x;
    const y = enemy.definition.y - Math.min(34, this.enemyVisualHeight(enemy) * 0.42);
    const depth = enemy.sprite.depth + 16;
    const shock = this.add.circle(x, y, 10, color, 0.16).setStrokeStyle(2, color, 0.9).setDepth(depth);
    this.tweens.add({ targets: shock, scale: enemy.definition.rare ? 4.2 : 3.1, alpha: 0, duration: 520, ease: "Cubic.easeOut", onComplete: () => shock.destroy() });
    for (let index = 0; index < (enemy.definition.rare ? 16 : 10); index += 1) {
      const angle = (Math.PI * 2 * index) / (enemy.definition.rare ? 16 : 10) + Phaser.Math.FloatBetween(-0.2, 0.2);
      const distance = Phaser.Math.Between(24, enemy.definition.rare ? 62 : 46);
      const mote = this.add
        .rectangle(x, y, index % 3 === 0 ? 4 : 3, index % 2 ? 3 : 5, index % 4 === 0 ? 0xffe5a0 : color, 0.95)
        .setRotation(angle)
        .setDepth(depth + 1);
      this.tweens.add({
        targets: mote,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.62,
        rotation: angle + 1.4,
        scale: 0.15,
        alpha: 0,
        duration: Phaser.Math.Between(380, 640),
        ease: "Cubic.easeOut",
        onComplete: () => mote.destroy(),
      });
    }
  }

  private showCombatReward(enemy: EnemyRuntime, gold: number, item?: ItemDefinition) {
    const color = item?.rarity === "epic"
      ? 0xffd75e
      : item?.rarity === "rare"
        ? 0xb881ff
        : item?.rarity === "uncommon"
          ? 0x79dba0
          : 0xf1c55f;
    const x = enemy.definition.x;
    const y = enemy.definition.y - 24;
    const depth = enemy.sprite.depth + 18;
    if (item) this.showWorldLootItem(item, x, enemy.definition.y - 7, depth + 4, color);
    const beam = this.add
      .rectangle(x, y - 8, item ? 12 : 7, item ? 78 : 52, color, item ? 0.34 : 0.2)
      .setDepth(depth)
      .setScale(0.35, 0.2);
    const ring = this.add
      .ellipse(x, enemy.definition.y + 1, item ? 40 : 30, item ? 16 : 12)
      .setStrokeStyle(2, color, 0.9)
      .setDepth(depth - 1)
      .setScale(0.45);
    this.tweens.add({
      targets: beam,
      scaleX: item ? 1.2 : 0.85,
      scaleY: 1.1,
      alpha: 0,
      duration: item ? 920 : 680,
      ease: "Cubic.easeOut",
      onComplete: () => beam.destroy(),
    });
    this.tweens.add({
      targets: ring,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 620,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy(),
    });
    for (let index = 0; index < (item ? 12 : 8); index += 1) {
      const angle = (Math.PI * 2 * index) / (item ? 12 : 8) + Phaser.Math.FloatBetween(-0.14, 0.14);
      const distance = Phaser.Math.Between(item ? 32 : 22, item ? 56 : 40);
      const spark = this.add
        .circle(x, y, index % 3 === 0 ? 3 : 2, index % 2 === 0 ? color : 0xffefb0, 0.95)
        .setDepth(depth + 1);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.58,
        scale: 0.2,
        alpha: 0,
        duration: Phaser.Math.Between(420, 650),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
    const rewardLabel = this.add
      .text(x, y - 23, item ? `+${gold} GOLD\n${item.name}` : `+${gold} GOLD`, {
        fontFamily: "Georgia, serif",
        fontSize: item ? "11px" : "10px",
        fontStyle: "bold",
        color: `#${color.toString(16).padStart(6, "0")}`,
        align: "center",
        stroke: "#17120c",
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(depth + 2);
    this.tweens.add({
      targets: rewardLabel,
      y: rewardLabel.y - 30,
      alpha: 0,
      duration: item ? 1_450 : 1_050,
      ease: "Cubic.easeOut",
      onComplete: () => rewardLabel.destroy(),
    });
  }

  private showWorldLootItem(item: ItemDefinition, x: number, y: number, depth: number, color: number) {
    const glow = this.add.circle(0, 3, item.rarity === "epic" ? 19 : 15, color, 0.18).setStrokeStyle(2, color, 0.78);
    let visual: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
    if (item.artIndex !== undefined) {
      const atlasKey = item.artAtlas === "adventure"
        ? ADVENTURE_ITEM_ATLAS_KEY
        : item.artAtlas === "material"
          ? MATERIAL_ITEM_ATLAS_KEY
          : item.artAtlas === "trophy"
            ? TROPHY_ITEM_ATLAS_KEY
            : EQUIPMENT_ITEM_ATLAS_KEY;
      visual = this.add
        .image(0, -3, atlasKey, item.artIndex)
        .setScale(item.artAtlas === "material" ? 0.047 : item.artAtlas === "trophy" ? 0.095 : 0.065)
        .setTint(item.tint ?? 0xffffff);
    } else {
      visual = this.add
        .text(0, -3, item.badge ?? "?", {
          fontFamily: "Verdana, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          color: `#${color.toString(16).padStart(6, "0")}`,
          stroke: "#14120d",
          strokeThickness: 3,
          resolution: 2,
        })
        .setOrigin(0.5);
    }
    const container = this.add.container(x, y - 28, [glow, visual]).setDepth(depth).setScale(0.2).setAlpha(0);
    const sparkCount = item.rarity === "epic" ? 10 : item.rarity === "rare" ? 7 : 5;
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkCount;
      const spark = this.add.circle(x, y - 28, index % 2 ? 2 : 1.4, color, 0.9).setDepth(depth - 1);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * Phaser.Math.Between(18, 34),
        y: y - 28 + Math.sin(angle) * Phaser.Math.Between(10, 22),
        alpha: 0,
        scale: 0.15,
        duration: Phaser.Math.Between(420, 680),
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 240, ease: "Back.easeOut" });
    this.tweens.add({
      targets: container,
      y: container.y - 7,
      duration: 420,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.tweens.add({
          targets: container,
          x: this.playerPos.x,
          y: this.playerPos.y - 30,
          scale: 0.35,
          alpha: 0,
          duration: 460,
          ease: "Cubic.easeIn",
          onComplete: () => container.destroy(true),
        });
      },
    });
    this.tweens.add({ targets: glow, scale: 1.35, alpha: 0.08, duration: 520, yoyo: true, repeat: 2, ease: "Sine.easeInOut" });
  }

  private enemyVisualHeight(enemy: EnemyRuntime) {
    if (enemy.hero) return 88;
    if (enemy.definition.kind === "rat") return enemy.sprite.getData("highDetailCreature") ? 50 : 32;
    if (enemy.definition.kind === "wolf") return enemy.sprite.getData("highDetailCreature") ? 70 : 52;
    if (enemy.definition.kind === "drake") return 88;
    if (enemy.definition.kind === "dune-stalker") return 76;
    if (enemy.definition.kind === "boar") return enemy.sprite.getData("highDetailCreature") ? 78 : 64;
    if (enemy.definition.kind === "slime") return enemy.sprite.getData("highDetailCreature") ? (enemy.definition.rare ? 72 : 58) : enemy.definition.rare ? 54 : 46;
    if (enemy.definition.kind === "treant") return 126;
    if (enemy.definition.kind === "skeleton" || enemy.definition.kind === "witch") return 58;
    return 70;
  }

  private showPlayerDamage(damage: number, blocked = 0) {
    if (damage <= 0) return;
    this.callbacks.onAudio(blocked > 0 ? "block" : "hurt");
    if (Date.now() >= this.playerAttackUntil) {
      this.player.play("hurt", this.facing, true);
      this.time.delayedCall(500, () => {
        if (this.disposed) return;
        if (this.heroAction === "attack" && Date.now() < this.playerAttackUntil) return;
        this.setHeroAction(this.moving ? "walk" : "idle");
      });
    }
    const text = this.add
      .text(this.playerPos.x, this.playerPos.y - 50, `-${damage}`, nameStyle("#ff8e84", 11))
      .setOrigin(0.5)
      .setDepth(this.player.depth + 12);
    const impact = this.add
      .ellipse(this.playerPos.x, this.playerPos.y + 2, 28, 11)
      .setStrokeStyle(2, blocked > 0 ? 0x82b6eb : 0xef786f, 0.9)
      .setDepth(this.player.depth + 9);
    this.tweens.add({ targets: text, y: text.y - 25, alpha: 0, duration: 560, onComplete: () => text.destroy() });
    this.tweens.add({ targets: impact, scaleX: 1.7, scaleY: 1.7, alpha: 0, duration: 360, onComplete: () => impact.destroy() });
    if (blocked > 0) {
      const blockedText = this.add
        .text(this.playerPos.x + 20, this.playerPos.y - 34, `BLOCK ${blocked}`, nameStyle("#a9d7ff", 8))
        .setOrigin(0.5)
        .setDepth(this.player.depth + 12);
      this.tweens.add({
        targets: blockedText,
        y: blockedText.y - 18,
        alpha: 0,
        duration: 720,
        ease: "Cubic.easeOut",
        onComplete: () => blockedText.destroy(),
      });
    }
  }

  private showHealingNumber(healing: number) {
    if (healing <= 0) return;
    this.callbacks.onAudio("heal");
    const text = this.add
      .text(this.playerPos.x, this.playerPos.y - 50, `+${healing}`, nameStyle("#8df0a6", 11))
      .setOrigin(0.5)
      .setDepth(this.player.depth + 12);
    const ring = this.add
      .ellipse(this.playerPos.x, this.playerPos.y + 2, 34, 14)
      .setStrokeStyle(2, 0x79e69a, 0.9)
      .setDepth(this.player.depth + 9);
    this.tweens.add({ targets: text, y: text.y - 28, alpha: 0, duration: 680, onComplete: () => text.destroy() });
    this.tweens.add({ targets: ring, scaleX: 1.9, scaleY: 1.9, alpha: 0, duration: 620, onComplete: () => ring.destroy() });
  }

  private updateActiveAction() {
    if (!this.activeAction) return;
    if (Date.now() - this.lastHudEmit < 100) return;
    this.lastHudEmit = Date.now();
    this.emitHud({ activeAction: { ...this.activeAction } }, false);
  }

  private updatePlayerView() {
    this.player.setPosition(this.playerPos.x, this.playerPos.y);
    this.player.setDepth(this.playerPos.y + 4);
    this.playerBeacon.setPosition(this.playerPos.x, this.playerPos.y + 7).setDepth(this.playerPos.y + 2);
    this.playerName
      .setPosition(this.playerPos.x, this.playerPos.y - 44)
      .setDepth(this.playerPos.y + 6)
      .setVisible(!this.activeEnemyId);
  }

  private updateNameplates() {
    this.npcRuntime.forEach((value) => {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      updateNameplate(value.plate, distance < 145, distance < 92);
    });
    this.enemyRuntime.forEach((value) => {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      const activeTarget = value.definition.id === this.activeEnemyId;
      updateNameplate(value.plate, !activeTarget && value.respawnAt <= Date.now() && distance < 230, distance < 150);
    });
    this.resourceRuntime.forEach((value) => {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      updateNameplate(value.plate, (value.available || value.claimedBy === this.playerId) && distance < 245, distance < 165);
    });
    this.waystoneRuntime.forEach((value) => {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      updateNameplate(value.plate, distance < 260, true);
    });
    this.dungeonPortalRuntime.forEach((value) => {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      updateNameplate(value.plate, distance < 280, true);
    });
    if (this.sanctuaryPlate) {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, TOWN_SANCTUARY.x, TOWN_SANCTUARY.y);
      updateNameplate(this.sanctuaryPlate, this.approachTarget?.kind === "sanctuary" && distance < 105, true);
    }
  }

  private spawnFootstepDust() {
    const baseX = this.playerPos.x + Phaser.Math.Between(-5, 5);
    const baseY = this.playerPos.y + 5;
    const color = this.activeWorldArea === "dungeon" || this.activeWorldArea === "icefang" ? 0x9aafbd : this.activeWorldArea === "marsh" ? 0x9cc7b0 : 0xcdb783;
    for (let index = 0; index < 2; index += 1) {
      const mote = this.add
        .rectangle(
          baseX + (index === 0 ? -4 : 4),
          baseY + Phaser.Math.Between(-1, 1),
          Phaser.Math.Between(2, 4),
          Phaser.Math.Between(1, 2),
          color,
          0.42,
        )
        .setAngle(Phaser.Math.Between(-25, 25))
        .setDepth(this.player.depth - 2);
      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-8, 8),
        y: mote.y - Phaser.Math.Between(3, 7),
        alpha: 0,
        scale: 0.55,
        duration: 220,
        ease: "Quad.easeOut",
        onComplete: () => mote.destroy(),
      });
    }
  }

  private updateNearbyAction() {
    if (this.actionLock || this.inputPaused) {
      this.nearbyRing.setVisible(false);
      this.nearbyPrompt.setVisible(false);
      return;
    }
    const clue = this.activeTreasureClue();
    const clueNearby = clue && Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, clue.x, clue.y) <= INTERACTION_RANGE + 18;
    const target = clueNearby ? null : this.nearestTarget();
    const action = target
      ? target.kind === "npc"
        ? `Talk to ${target.value.definition.name}`
        : target.kind === "enemy"
          ? `Attack ${target.value.definition.name}`
          : target.kind === "resource"
            ? `Gather ${target.value.definition.name}`
            : target.kind === "sanctuary"
              ? `Rest at ${target.value.name}`
              : target.kind === "portal"
                ? `Enter ${target.value.definition.region}`
              : this.progress.waystones.includes(target.value.definition.id)
                ? `Use ${target.value.definition.name}`
                : `Attune ${target.value.definition.name}`
      : clueNearby
        ? `Search ${clue.title}`
        : "Explore";
    const focus = target
      ? target.kind === "sanctuary"
        ? { x: target.value.x, y: target.value.y, color: 0x79e69a }
        : {
            x: target.value.definition.x,
            y: target.value.definition.y,
            color: target.kind === "npc"
              ? 0xffd45e
              : target.kind === "enemy"
                ? 0xef6f5e
                : target.kind === "resource"
                  ? 0x77d89b
                  : target.kind === "portal"
                    ? 0xa78cff
                    : 0x70e3d2,
          }
      : clueNearby
        ? { x: clue.x, y: clue.y, color: 0xffd45e }
        : null;
    const showFocus = Boolean(focus && !this.selectedEnemyId && !this.approachTarget);
    if (focus && showFocus) {
      this.nearbyRing
        .setPosition(focus.x, focus.y + 5)
        .setDepth(focus.y - 1)
        .setStrokeStyle(2, focus.color, 0.78)
        .setVisible(true);
      this.nearbyPrompt
        .setPosition(focus.x, focus.y - 34)
        .setDepth(focus.y + 12)
        .setVisible(true);
    } else {
      this.nearbyRing.setVisible(false);
      this.nearbyPrompt.setVisible(false);
    }
    if (action !== this.lastActionLabel) {
      this.lastActionLabel = action;
      this.emitHud({ action }, false);
    }
  }

  private nearestTarget():
    | { kind: "npc"; value: NpcRuntime }
    | { kind: "enemy"; value: EnemyRuntime }
    | { kind: "resource"; value: ResourceRuntime }
    | { kind: "waystone"; value: WaystoneRuntime }
    | { kind: "portal"; value: DungeonPortalRuntime }
    | { kind: "sanctuary"; value: typeof TOWN_SANCTUARY }
    | null {
    let best: { kind: "npc" | "enemy" | "resource" | "waystone" | "portal" | "sanctuary"; value: NpcRuntime | EnemyRuntime | ResourceRuntime | WaystoneRuntime | DungeonPortalRuntime | typeof TOWN_SANCTUARY; distance: number } | null = null;
    this.npcRuntime.forEach((value) => {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      if (distance <= INTERACTION_RANGE && (!best || distance < best.distance)) best = { kind: "npc", value, distance };
    });
    this.enemyRuntime.forEach((value) => {
      if (value.respawnAt > Date.now()) return;
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      const style = itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee";
      if (distance <= COMBAT_MAX_RANGE[style] && (!best || distance < best.distance)) best = { kind: "enemy", value, distance };
    });
    this.resourceRuntime.forEach((value) => {
      if (!value.available) return;
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      if (distance <= INTERACTION_RANGE + 16 && (!best || distance < best.distance)) best = { kind: "resource", value, distance };
    });
    this.waystoneRuntime.forEach((value) => {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      if (distance <= INTERACTION_RANGE + 8 && (!best || distance < best.distance)) best = { kind: "waystone", value, distance };
    });
    this.dungeonPortalRuntime.forEach((value) => {
      const distance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, value.definition.x, value.definition.y);
      if (distance <= INTERACTION_RANGE + 12 && (!best || distance < best.distance)) best = { kind: "portal", value, distance };
    });
    const sanctuaryDistance = Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, TOWN_SANCTUARY.x, TOWN_SANCTUARY.y);
    const currentBestDistance = (best as { distance: number } | null)?.distance ?? Number.POSITIVE_INFINITY;
    if (sanctuaryDistance <= INTERACTION_RANGE + 10 && sanctuaryDistance < currentBestDistance) {
      best = { kind: "sanctuary", value: TOWN_SANCTUARY, distance: sanctuaryDistance };
    }
    return best as ReturnType<OrehavenScene["nearestTarget"]>;
  }

  private faceToward(x: number, y: number) {
    const dx = x - this.playerPos.x;
    const dy = y - this.playerPos.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }

  private setHeroAction(action: PlayerWorldAction) {
    if (!this.player) return;
    this.heroAction = action;
    const style = itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee";
    const visualAction: HeroVisualAction =
      action === "attack"
        ? style === "range"
          ? "range"
          : style === "magic"
            ? "magic"
            : "melee"
        : action === "attune"
          ? "channel"
          : action;
    this.player.play(visualAction, this.facing);
  }

  private applyEquipmentVisuals() {
    if (!this.player) return;
    this.player.setLoadout(this.progress.equipped);
  }

  private currentCombatStyle(): CombatStyle {
    return itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee";
  }

  private playStrikeAnimation(enemy?: EnemyRuntime, combatStyle = itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee") {
    if (enemy) this.faceToward(enemy.definition.x, enemy.definition.y);
    const weaponId = this.progress.equipped.weapon;
    const attackColor = weaponAbility(weaponId).color;
    this.callbacks.onAudio(combatStyle === "range" ? "range-shot" : combatStyle === "magic" ? "magic-cast" : "melee-swing");
    const attackEndsAt = Date.now() + (combatStyle === "range" ? 610 : 520);
    this.playerAttackUntil = attackEndsAt;
    this.setHeroAction("attack");
    this.player.playSignatureMotion(combatStyle, this.facing, false);
    this.time.delayedCall(combatStyle === "range" ? 610 : 520, () => {
      this.settleHeroAfterAttack(attackEndsAt);
    });
    if (!enemy) return;

    if (combatStyle === "melee") {
      this.time.delayedCall(125, () => {
        if (!this.disposed && enemy.respawnAt <= Date.now()) this.playBasicMeleeFx(enemy, attackColor);
      });
      return;
    }

    if (combatStyle === "range") {
      this.time.delayedCall(230, () => {
        if (this.disposed || enemy.respawnAt > Date.now()) return;
        const fromX = this.playerPos.x;
        const fromY = this.playerPos.y - 16;
        const targetX = enemy.definition.x;
        const targetY = enemy.definition.y - 26;
        const angle = Phaser.Math.Angle.Between(fromX, fromY, targetX, targetY);
        const depth = Math.max(this.player.depth, enemy.sprite.depth) + 8;
        this.playProjectileTracer(fromX, fromY, targetX, targetY, attackColor, depth, 4);
        const arrow = this.add
          .image(fromX, fromY, ARROW_KEY)
          .setScale(0.82)
          .setRotation(angle)
          .setTint(attackColor)
          .setDepth(depth);
        this.tweens.add({
          targets: arrow,
          x: targetX,
          y: targetY,
          duration: 210,
          ease: "Sine.easeIn",
          onComplete: () => {
            this.playWeaponImpact(targetX, targetY, attackColor, depth + 4, 0.72);
            arrow.destroy();
          },
        });
      });
      return;
    }

    this.time.delayedCall(185, () => {
      if (this.disposed || enemy.respawnAt > Date.now()) return;
      const ember = weaponId === "ember-staff";
      const fromX = this.playerPos.x;
      const fromY = this.playerPos.y - 18;
      const targetX = enemy.definition.x;
      const targetY = enemy.definition.y - 28;
      const depth = Math.max(this.player.depth, enemy.sprite.depth) + 8;
      this.playProjectileTracer(fromX, fromY, targetX, targetY, attackColor, depth - 1, 5);
      const bolt = this.add
        .sprite(fromX, fromY, ember ? FIREBALL_KEY : ARCANE_BOLT_KEY, 0)
        .setScale(1.34)
        .setRotation(Phaser.Math.Angle.Between(fromX, fromY, targetX, targetY))
        .setTint(attackColor)
        .setDepth(depth)
        .play(ember ? "ore-fireball-flight" : "ore-arcane-bolt-flight");
      this.tweens.add({
        targets: bolt,
        x: targetX,
        y: targetY,
        duration: 270,
        ease: "Cubic.easeIn",
        onComplete: () => {
          const impact = this.add
            .sprite(targetX, targetY, ember ? ANSIMUZ_FIRE_BOMB_KEY : ANSIMUZ_SPARK_KEY, 0)
            .setScale(ember ? 1.25 : 1.65)
            .setTint(attackColor)
            .setDepth(enemy.sprite.depth + 10)
            .play(ember ? "ore-ansimuz-fire-bomb" : "ore-ansimuz-spark");
          impact.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => impact.destroy());
          this.playWeaponImpact(targetX, targetY, attackColor, depth + 5, ember ? 0.92 : 0.78);
          this.cameras.main.shake(70, 0.0012);
          bolt.destroy();
        },
      });
    });
  }

  private playProjectileTracer(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    color: number,
    depth: number,
    count: number,
  ) {
    for (let index = 0; index < count; index += 1) {
      const amount = (index + 1) / (count + 1);
      const mote = this.add
        .ellipse(
          Phaser.Math.Linear(fromX, targetX, amount),
          Phaser.Math.Linear(fromY, targetY, amount),
          8 - index * 0.7,
          3,
          color,
          0.5,
        )
        .setRotation(Phaser.Math.Angle.Between(fromX, fromY, targetX, targetY))
        .setDepth(depth);
      this.tweens.add({
        targets: mote,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.3,
        delay: index * 18,
        duration: 170 + index * 14,
        ease: "Cubic.easeIn",
        onComplete: () => mote.destroy(),
      });
    }
  }

  private playWeaponImpact(x: number, y: number, color: number, depth: number, scale: number) {
    const core = this.add.circle(x, y, 6, 0xffffff, 0.92).setStrokeStyle(2, color, 0.95).setDepth(depth);
    const ring = this.add.ellipse(x, y + 4, 18, 8, color, 0.08).setStrokeStyle(2, color, 0.8).setDepth(depth - 1);
    this.tweens.add({
      targets: core,
      scale: 2.2 * scale,
      alpha: 0,
      duration: 145,
      ease: "Quad.easeOut",
      onComplete: () => core.destroy(),
    });
    this.tweens.add({
      targets: ring,
      scaleX: 2.1 * scale,
      scaleY: 1.6 * scale,
      alpha: 0,
      duration: 210,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  private playBasicMeleeFx(enemy: EnemyRuntime, color: number) {
    const targetX = enemy.definition.x;
    const targetY = enemy.definition.y - 24;
    const angle = Phaser.Math.Angle.Between(this.playerPos.x, this.playerPos.y - 18, targetX, targetY);
    const depth = enemy.sprite.depth + 18;
    const slash = this.add
      .sprite(targetX, targetY, MELEE_SLASH_KEY, 0)
      .setRotation(angle + Math.PI / 2)
      .setScale(0.095)
      .setTint(color)
      .setDepth(depth)
      .play("ore-melee-slash");
    slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());

    // A compact hit-confirm keeps the regular attack readable without
    // competing with the larger signature-ability effects.
    this.time.delayedCall(62, () => {
      if (this.disposed || enemy.respawnAt > Date.now()) return;
      this.playAnimeImpact(targetX, targetY, color, depth + 6, 0.68);
      this.playWeaponImpact(targetX, targetY, color, depth + 7, 0.74);
    });

    const impact = this.add
      .ellipse(targetX, targetY + 6, 20, 8)
      .setStrokeStyle(2, color, 0.78)
      .setDepth(depth - 1);
    this.tweens.add({
      targets: impact,
      scaleX: 1.7,
      scaleY: 1.35,
      alpha: 0,
      duration: 220,
      delay: 45,
      ease: "Quad.easeOut",
      onComplete: () => impact.destroy(),
    });
    this.cameras.main.shake(45, 0.0011);
  }

  private playSignatureAbilityFx(enemy: EnemyRuntime, combatStyle: CombatStyle, abilityId: string) {
    this.faceToward(enemy.definition.x, enemy.definition.y);
    const ability = weaponAbility(this.progress.equipped.weapon);
    const color = ability.id === abilityId
      ? ability.color
      : combatStyle === "magic" ? 0x6edfff : combatStyle === "range" ? 0xb9ef72 : 0xffbd62;
    const isHeavy = ["rune-rift", "umbral-rush", "auric-sunder", "tempest-arrow", "ghost-volley", "starfall", "frost-nova", "moonbind"].includes(abilityId);
    this.playSignatureHeroAnimation(combatStyle, isHeavy);
    if (combatStyle === "melee") {
      const slashCount = ability.id === abilityId ? ability.hitCount ?? (abilityId === "auric-sunder" ? 4 : 2) : 2;
      this.playAnimeMeleeFx(enemy, color, slashCount, isHeavy, abilityId);
    } else if (combatStyle === "range") {
      const volleyCount = ability.id === abilityId ? ability.hitCount ?? 2 : 2;
      this.playAnimeRangeFx(enemy, color, volleyCount, isHeavy, abilityId);
    } else {
      this.playAnimeMagicFx(enemy, color, isHeavy, abilityId);
    }
  }

  private playSignatureHeroAnimation(combatStyle: CombatStyle, heavy: boolean) {
    this.callbacks.onAudio(combatStyle === "range" ? "range-shot" : combatStyle === "magic" ? "magic-cast" : "melee-swing");
    const duration = combatStyle === "range" ? 790 : combatStyle === "magic" ? 720 : 680;
    const attackEndsAt = Date.now() + duration;
    this.playerAttackUntil = attackEndsAt;
    this.heroAction = "attack";
    const signatureAction: HeroVisualAction = combatStyle === "range"
      ? "rangeSignature"
      : combatStyle === "magic"
        ? "magicSignature"
        : "meleeSignature";
    this.player.play(signatureAction, this.facing, true);
    this.player.playSignatureMotion(combatStyle, this.facing, heavy);
    this.time.delayedCall(duration, () => {
      this.settleHeroAfterAttack(attackEndsAt);
    });
  }

  private settleHeroAfterAttack(attackEndsAt: number) {
    if (!this.actionLock || this.heroAction !== "attack" || this.playerAttackUntil !== attackEndsAt) return;
    this.setHeroAction(this.moving ? "walk" : "idle");
  }

  private playAnimeMeleeFx(enemy: EnemyRuntime, color: number, slashCount: number, heavy: boolean, abilityId: string) {
    const fromX = this.playerPos.x;
    const fromY = this.playerPos.y - 18;
    const targetX = enemy.definition.x;
    const targetY = enemy.definition.y - 24;
    const angle = Phaser.Math.Angle.Between(fromX, fromY, targetX, targetY);
    const depth = enemy.sprite.depth + 20;

    const focus = this.add.ellipse(fromX, this.playerPos.y + 2, 38, 14, color, 0.08).setStrokeStyle(2, color, 0.92).setDepth(depth);
    this.tweens.add({ targets: focus, scaleX: 1.8, scaleY: 0.65, alpha: 0, duration: 260, ease: "Cubic.easeOut", onComplete: () => focus.destroy() });

    for (let index = 0; index < 5; index += 1) {
      const amount = (index + 1) / 6;
      const streak = this.add
        .rectangle(
          Phaser.Math.Linear(fromX, targetX, amount),
          Phaser.Math.Linear(fromY, targetY, amount),
          heavy ? 34 : 25,
          index % 2 === 0 ? 3 : 2,
          color,
          0.68 - index * 0.08,
        )
        .setRotation(angle)
        .setDepth(depth - 2)
        .setScale(0.25, 1);
      this.tweens.add({ targets: streak, scaleX: 1.25, alpha: 0, delay: index * 24, duration: 210, ease: "Quad.easeOut", onComplete: () => streak.destroy() });
    }

    for (let index = 0; index < slashCount; index += 1) {
      this.time.delayedCall(95 + index * 58, () => {
        if (this.disposed) return;
        const sweep = this.add.graphics();
        const radius = (heavy ? 44 : 34) + index * 3;
        sweep.lineStyle(heavy ? 7 : 5, 0xffffff, 0.9).beginPath().arc(0, 0, radius, -1.12, 1.12).strokePath();
        sweep.lineStyle(heavy ? 4 : 3, color, 1).beginPath().arc(0, 0, radius - 3, -1.08, 1.08).strokePath();
        const slash = this.add.container(targetX, targetY, [sweep])
          .setRotation(angle + Math.PI / 2 + (index - (slashCount - 1) / 2) * 0.42)
          .setScale(0.38)
          .setDepth(depth + index);
        this.tweens.add({
          targets: slash,
          scale: heavy ? 1.28 : 1.05,
          alpha: 0,
          duration: 250,
          ease: "Cubic.easeOut",
          onComplete: () => slash.destroy(true),
        });
      });
    }
    this.time.delayedCall(110 + Math.max(0, slashCount - 1) * 58, () => {
      if (this.disposed) return;
      this.playAnimeImpact(targetX, targetY, color, depth + 8, heavy ? 1.35 : 1, abilityId === "umbral-rush");
    });
  }

  private playAnimeRangeFx(enemy: EnemyRuntime, color: number, volleyCount: number, heavy: boolean, abilityId: string) {
    const fromX = this.playerPos.x;
    const fromY = this.playerPos.y - 18;
    const targetX = enemy.definition.x;
    const targetY = enemy.definition.y - 28;
    const angle = Phaser.Math.Angle.Between(fromX, fromY, targetX, targetY);
    const depth = enemy.sprite.depth + 22;
    const reticle = this.add.container(targetX, targetY).setDepth(depth);
    const outer = this.add.circle(0, 0, heavy ? 28 : 22, color, 0.04).setStrokeStyle(2, color, 0.9);
    const inner = this.add.circle(0, 0, 8, 0xffffff, 0).setStrokeStyle(1, 0xffffff, 0.8);
    const crossA = this.add.rectangle(0, 0, heavy ? 72 : 56, 2, color, 0.85);
    const crossB = this.add.rectangle(0, 0, 2, heavy ? 72 : 56, color, 0.85);
    reticle.add([outer, inner, crossA, crossB]).setScale(1.5).setAlpha(0);
    this.tweens.add({ targets: reticle, scale: 1, alpha: 1, duration: 120, ease: "Cubic.easeOut" });

    for (let index = 0; index < volleyCount; index += 1) {
      this.time.delayedCall(105 + index * 70, () => {
        if (this.disposed) return;
        const offset = (index - (volleyCount - 1) / 2) * 10;
        const startX = fromX - Math.sin(angle) * offset;
        const startY = fromY + Math.cos(angle) * offset;
        const endX = targetX - Math.sin(angle) * offset * 0.18;
        const endY = targetY + Math.cos(angle) * offset * 0.18;
        const trail = this.add.rectangle(-18, 0, heavy ? 42 : 30, heavy ? 5 : 3, color, 0.48).setOrigin(1, 0.5);
        const arrow = this.add.image(0, 0, ARROW_KEY).setTint(color).setScale(heavy ? 1.15 : 0.92);
        const projectile = this.add.container(startX, startY, [trail, arrow]).setRotation(angle).setDepth(depth + 2 + index);
        this.tweens.add({
          targets: projectile,
          x: endX,
          y: endY,
          duration: heavy ? 245 : 215,
          ease: "Cubic.easeIn",
          onComplete: () => {
            projectile.destroy(true);
            this.playAnimeImpact(endX, endY, color, depth + 8, heavy ? 1.15 : 0.82, abilityId === "tempest-arrow");
          },
        });
      });
    }
    this.time.delayedCall(430 + volleyCount * 55, () => {
      if (!reticle.active) return;
      this.tweens.add({ targets: reticle, scale: 1.5, alpha: 0, duration: 180, ease: "Quad.easeOut", onComplete: () => reticle.destroy(true) });
    });
  }

  private playAnimeMagicFx(enemy: EnemyRuntime, color: number, heavy: boolean, abilityId: string) {
    const fromX = this.playerPos.x;
    const fromY = this.playerPos.y - 20;
    const targetX = enemy.definition.x;
    const targetY = enemy.definition.y - 30;
    const depth = enemy.sprite.depth + 24;
    const sigil = this.add.container(fromX, this.playerPos.y + 1).setDepth(this.player.depth + 16).setScale(0.35);
    const outer = this.add.circle(0, 0, heavy ? 34 : 27, color, 0.06).setStrokeStyle(2, color, 0.95);
    const inner = this.add.circle(0, 0, heavy ? 20 : 15, 0xffffff, 0).setStrokeStyle(1, 0xffffff, 0.72);
    sigil.add([outer, inner]);
    for (let index = 0; index < 6; index += 1) {
      const runeAngle = (Math.PI * 2 * index) / 6;
      sigil.add(this.add.rectangle(Math.cos(runeAngle) * (heavy ? 29 : 23), Math.sin(runeAngle) * (heavy ? 29 : 23), 4, 4, color, 0.9).setRotation(runeAngle));
    }
    this.tweens.add({ targets: sigil, scale: 1, angle: 90, duration: 260, ease: "Back.easeOut" });

    this.time.delayedCall(210, () => {
      if (this.disposed) return;
      const ember = abilityId === "ember-wave";
      const projectile = this.add
        .sprite(fromX, fromY, ember ? FIREBALL_KEY : ARCANE_BOLT_KEY, 0)
        .setTint(abilityId === "frost-nova" ? 0xb8efff : color)
        .setScale(heavy ? 2.15 : 1.7)
        .setRotation(Phaser.Math.Angle.Between(fromX, fromY, targetX, targetY))
        .setDepth(depth)
        .play(ember ? "ore-fireball-flight" : "ore-arcane-bolt-flight");
      this.tweens.add({
        targets: projectile,
        x: targetX,
        y: targetY,
        duration: heavy ? 330 : 285,
        ease: "Cubic.easeIn",
        onComplete: () => {
          projectile.destroy();
          const effect = abilityId === "frost-nova"
            ? { texture: ANSIMUZ_LIGHTNING_KEY, animation: "ore-ansimuz-lightning", scale: 1.05 }
            : ember
              ? { texture: ANSIMUZ_FIRE_BOMB_KEY, animation: "ore-ansimuz-fire-bomb", scale: 1.45 }
              : { texture: ANSIMUZ_DARK_BOLT_KEY, animation: "ore-ansimuz-dark-bolt", scale: 1.12 };
          const spell = this.add.sprite(targetX, targetY - 4, effect.texture, 0).setScale(effect.scale).setTint(abilityId === "frost-nova" ? 0xb8efff : 0xffffff).setDepth(depth + 4).play(effect.animation);
          spell.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spell.destroy());
          this.playAnimeImpact(targetX, targetY, color, depth + 6, heavy ? 1.5 : 1.12, abilityId === "starfall" || abilityId === "frost-nova");
        },
      });
    });
    this.time.delayedCall(600, () => {
      if (!sigil.active) return;
      this.tweens.add({ targets: sigil, scale: 1.45, alpha: 0, duration: 220, ease: "Cubic.easeOut", onComplete: () => sigil.destroy(true) });
    });
  }

  private playAnimeImpact(x: number, y: number, color: number, depth: number, intensity = 1, charged = false) {
    const flash = this.add.circle(x, y, 12 * intensity, 0xffffff, 0.95).setDepth(depth + 3).setScale(0.2);
    const ring = this.add.circle(x, y, 18 * intensity, color, 0.12).setStrokeStyle(Math.max(2, 3 * intensity), color, 0.98).setDepth(depth + 2).setScale(0.35);
    this.tweens.add({ targets: flash, scale: 1.6, alpha: 0, duration: 150, ease: "Cubic.easeOut", onComplete: () => flash.destroy() });
    this.tweens.add({ targets: ring, scale: charged ? 2.8 : 2.1, alpha: 0, duration: charged ? 440 : 330, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    const rayCount = charged ? 12 : 8;
    for (let index = 0; index < rayCount; index += 1) {
      const angle = (Math.PI * 2 * index) / rayCount + (index % 2) * 0.08;
      const ray = this.add.rectangle(x, y, 18 * intensity, index % 2 === 0 ? 3 : 2, index % 3 === 0 ? 0xffffff : color, 0.94).setOrigin(0, 0.5).setRotation(angle).setDepth(depth + 1);
      const distance = (charged ? 58 : 42) * intensity;
      this.tweens.add({
        targets: ray,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.7,
        scaleX: 0.25,
        alpha: 0,
        duration: charged ? 360 : 260,
        ease: "Cubic.easeOut",
        onComplete: () => ray.destroy(),
      });
    }
    this.cameras.main.shake(charged ? 150 : 90, charged ? 0.0032 : 0.0018);
  }

  private playTreeAbilityFx(enemy: EnemyRuntime, ability: SkillTreeNodeDefinition) {
    this.faceToward(enemy.definition.x, enemy.definition.y);
    this.playStrikeAnimation(enemy, ability.branch);
    const radius = ability.areaRadius ?? 42;
    const ring = this.add
      .circle(enemy.definition.x, enemy.definition.y, radius, ability.color, ability.areaRadius ? 0.16 : 0.08)
      .setStrokeStyle(3, ability.color, 0.95)
      .setDepth(enemy.sprite.depth + 18)
      .setScale(0.2);
    const inner = this.add
      .circle(enemy.definition.x, enemy.definition.y, Math.max(18, radius * 0.58), 0xffffff, 0)
      .setStrokeStyle(2, 0xffffff, 0.68)
      .setDepth(enemy.sprite.depth + 19)
      .setScale(0.35);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 620, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    this.tweens.add({ targets: inner, scale: 1.35, angle: 90, alpha: 0, duration: 720, ease: "Sine.easeOut", onComplete: () => inner.destroy() });
    const particleCount = ability.areaRadius ? 14 : 8;
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount;
      const spark = this.add
        .rectangle(enemy.definition.x, enemy.definition.y - 18, ability.branch === "range" ? 3 : 5, ability.branch === "range" ? 18 : 5, ability.color, 0.92)
        .setRotation(angle)
        .setDepth(enemy.sprite.depth + 20);
      const distance = ability.areaRadius ? radius * Phaser.Math.FloatBetween(0.55, 0.95) : Phaser.Math.Between(24, 48);
      this.tweens.add({
        targets: spark,
        x: enemy.definition.x + Math.cos(angle) * distance,
        y: enemy.definition.y - 18 + Math.sin(angle) * distance * 0.52,
        alpha: 0,
        scale: 0.25,
        duration: 420 + index * 18,
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
    if (ability.branch === "magic") {
      const spell = this.add
        .sprite(enemy.definition.x, enemy.definition.y - 34, ANSIMUZ_LIGHTNING_KEY, 0)
        .setTint(ability.color)
        .setScale(ability.areaRadius ? 1.02 : 0.82)
        .setDepth(enemy.sprite.depth + 22)
        .play("ore-ansimuz-lightning");
      spell.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spell.destroy());
    }
    if (ability.dot) {
      const brand = this.add
        .text(enemy.definition.x, enemy.definition.y - 55, ability.branch === "range" ? "VENOM" : ability.branch === "magic" ? "ARCANE" : "BLEED", nameStyle(`#${ability.color.toString(16).padStart(6, "0")}`, 8))
        .setOrigin(0.5)
        .setDepth(enemy.sprite.depth + 21);
      this.tweens.add({ targets: brand, y: brand.y - 12, alpha: 0, duration: 900, ease: "Quad.easeOut", onComplete: () => brand.destroy() });
    }
    this.playAdvancedTreeAbilityFx(enemy, ability);
    this.cameras.main.shake(ability.areaRadius ? 135 : 90, ability.branch === "melee" ? 0.0022 : 0.0015);
  }

  private playAdvancedTreeAbilityFx(enemy: EnemyRuntime, ability: SkillTreeNodeDefinition) {
    const centerX = enemy.definition.x;
    const centerY = enemy.definition.y - 5;
    const depth = enemy.sprite.depth + 24;
    if (ability.id === "groundbreaker") {
      for (let index = 0; index < 9; index += 1) {
        const angle = (Math.PI * 2 * index) / 9 + Phaser.Math.FloatBetween(-0.14, 0.14);
        const crack = this.add
          .rectangle(centerX, centerY, Phaser.Math.Between(54, 112), Phaser.Math.Between(2, 4), index % 2 ? 0xffd17a : 0x6e3e28, 0.9)
          .setOrigin(0, 0.5)
          .setRotation(angle)
          .setScale(0.05, 1)
          .setDepth(depth);
        this.tweens.add({
          targets: crack,
          scaleX: 1,
          alpha: 0,
          duration: 430,
          delay: index * 18,
          ease: "Expo.easeOut",
          onComplete: () => crack.destroy(),
        });
      }
      return;
    }
    if (ability.id === "pinning-volley") {
      for (let index = 0; index < 14; index += 1) {
        const landingX = centerX + Phaser.Math.Between(-92, 92);
        const landingY = centerY + Phaser.Math.Between(-34, 34);
        const arrow = this.add
          .rectangle(landingX + 26, landingY - 115, 3, 27, index % 3 === 0 ? 0xeaffc5 : 0x90dfb1, 0.96)
          .setRotation(0.24)
          .setDepth(depth + index);
        this.tweens.add({
          targets: arrow,
          x: landingX,
          y: landingY,
          duration: 190,
          delay: index * 34,
          ease: "Quad.easeIn",
          onComplete: () => this.tweens.add({ targets: arrow, alpha: 0, duration: 180, delay: 80, onComplete: () => arrow.destroy() }),
        });
      }
      return;
    }
    if (ability.id === "frost-nova-tree") {
      for (let index = 0; index < 12; index += 1) {
        const angle = (Math.PI * 2 * index) / 12;
        const shard = this.add
          .triangle(centerX, centerY, 0, 15, 5, 0, 10, 15, index % 2 ? 0xd9f7ff : 0x79d9ff, 0.94)
          .setRotation(angle + Math.PI / 2)
          .setScale(0.45)
          .setDepth(depth);
        this.tweens.add({
          targets: shard,
          x: centerX + Math.cos(angle) * 104,
          y: centerY + Math.sin(angle) * 55,
          scale: 1.25,
          alpha: 0,
          duration: 520,
          delay: index * 15,
          ease: "Cubic.easeOut",
          onComplete: () => shard.destroy(),
        });
      }
    }
  }

  private applyLocalTreeAbility(primary: EnemyRuntime, ability: SkillTreeNodeDefinition) {
    const level = this.progress.skills[combatSkillForStyle(ability.branch)].level;
    const weaponPower = itemById(this.progress.equipped.weapon)?.power ?? 1;
    const base = localCombatDamage(ability.branch, level, weaponPower);
    const bonuses = skillTreeBonuses(this.progress, ability.branch);
    const abilityRadius = ability.areaRadius ? ability.areaRadius * bonuses.areaMultiplier : 0;
    const targets = abilityRadius
      ? [...this.enemyRuntime.values()].filter((enemy) => (
          enemy.hp > 0
          && enemy.respawnAt <= Date.now()
          && Phaser.Math.Distance.Between(primary.definition.x, primary.definition.y, enemy.definition.x, enemy.definition.y) <= abilityRadius
        ))
      : [primary];
    targets.forEach((enemy, index) => {
      const damage = applyLocalSkillTreeDamage(Math.ceil(base * ability.multiplier * (index === 0 ? 1 : 0.82)), bonuses, enemy.hp, enemy.definition.maxHp);
      enemy.hp = Math.max(0, enemy.hp - damage);
      this.drawEnemyHp(enemy);
      this.showDamageNumber(enemy, damage, ability.branch);
      if (ability.status && enemy.hp > 0) {
        enemy.status = {
          kind: ability.status.kind,
          label: ability.status.label,
          expiresAt: Date.now() + ability.status.durationMs,
          strength: ability.status.strength ?? 0,
        };
        this.showEnemyStatusFx(enemy, enemy.status);
      }
      if (enemy.hp <= 0) this.finishCombat(enemy);
    });
    if (ability.dot && primary.hp > 0) {
      for (let tick = 1; tick <= ability.dot.ticks; tick += 1) {
        this.time.delayedCall(ability.dot.intervalMs * tick, () => {
          if (this.disposed || primary.hp <= 0 || primary.respawnAt > Date.now()) return;
          const damage = applyLocalSkillTreeDamage(Math.ceil(base * ability.dot!.multiplier * bonuses.dotMultiplier), bonuses, primary.hp, primary.definition.maxHp);
          primary.hp = Math.max(0, primary.hp - damage);
          this.drawEnemyHp(primary);
          this.showDamageNumber(primary, damage, ability.branch);
          this.showTreeTickFx(primary, ability);
          if (primary.hp <= 0) this.finishCombat(primary);
        });
      }
    }
    this.emitHud({ abilityCooldowns: this.abilityCooldowns, target: this.targetState(primary), message: `${ability.name} unleashed.` });
  }

  private showTreeTickFx(enemy: EnemyRuntime, ability: SkillTreeNodeDefinition) {
    const pulse = this.add
      .circle(enemy.definition.x, enemy.definition.y - 24, 12, ability.color, 0.42)
      .setStrokeStyle(2, ability.color, 0.9)
      .setDepth(enemy.sprite.depth + 17);
    this.tweens.add({ targets: pulse, scale: 2, alpha: 0, y: pulse.y - 9, duration: 420, ease: "Cubic.easeOut", onComplete: () => pulse.destroy() });
  }

  private showEnemyStatusFx(enemy: EnemyRuntime, status: EnemyStatusState) {
    const colors: Record<EnemyStatusState["kind"], number> = {
      stagger: 0xffcb63,
      slow: 0x73d8ff,
      root: 0xb6f5ff,
      weaken: 0xc995ff,
    };
    const color = colors[status.kind];
    const depth = enemy.sprite.depth + 17;
    const ring = this.add
      .ellipse(enemy.definition.x, enemy.definition.y + 2, 44, 16)
      .setStrokeStyle(2, color, 0.95)
      .setDepth(depth);
    const label = this.add
      .text(
        enemy.definition.x,
        enemy.definition.y - this.enemyVisualHeight(enemy) - 9,
        status.label.toUpperCase(),
        nameStyle(`#${color.toString(16).padStart(6, "0")}`, 7),
      )
      .setOrigin(0.5)
      .setDepth(depth + 1);
    this.tweens.add({
      targets: ring,
      scaleX: 1.7,
      scaleY: 1.7,
      alpha: 0,
      duration: 620,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
    this.tweens.add({
      targets: label,
      y: label.y - 12,
      alpha: 0,
      delay: 260,
      duration: 720,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  private mitigateIncomingDamage(rawDamage: number) {
    const armorPower = itemById(this.progress.equipped.armor)?.power ?? 0;
    const defenseLevel = this.progress.skills.defense.level;
    const reduction = Math.floor(armorPower / 8) + Math.floor(Math.max(0, defenseLevel - 1) / 8);
    const treeRemaining = (["melee", "range", "magic"] as const).reduce(
      (remaining, branch) => remaining * (1 - skillTreeBonuses(this.progress, branch).damageReduction),
      1,
    );
    const totalReduction = Math.min(
      0.45,
      1 - treeRemaining * (1 - armorDamageReduction(this.progress.equipped.armor)),
    );
    return Math.max(1, Math.floor((Math.floor(rawDamage) - reduction) * (1 - totalReduction)));
  }

  private currentLocation() {
    if (this.playerPos.y >= 8192) return "Icefang Vault";
    if (this.playerPos.y >= 7168) return "Orehaven Guild Hall";
    if (this.playerPos.y >= 6144) return "Sunscar Expanse";
    if (this.playerPos.y >= 5120) return "Frostmere Coast";
    if (this.playerPos.y >= 4096) return "Emberfall Highlands";
    if (this.playerPos.y >= 3072) return "Moonfen Expanse";
    if (this.playerPos.y >= 2048) return "Sunstone Catacombs";
    if (this.playerPos.y >= 1024) {
      if (this.playerPos.y < 1360 && this.playerPos.x > 820) return "Moonfen Marsh";
      if (this.playerPos.y > 1460 && this.playerPos.x < 590) return "Briarwild Ranger Camp";
      if (this.playerPos.y > 1400 && this.playerPos.x > 960) return "Raider Dens";
      if (this.playerPos.x < 520) return "Old Sun Shrine";
      return "Briarwild Crossing";
    }
    if (this.playerPos.x < 330) return this.playerPos.y > 660 ? "Moonwater Pond" : "Western Woods";
    if (this.playerPos.x > 1050 && this.playerPos.y > 660) return "Goblin Camp";
    if (this.playerPos.x > 1190) return "Eastern Quarry";
    if (this.playerPos.y > 760) return "Southroad";
    return "Orehaven";
  }

  private checkRegionDiscovery() {
    const location = this.currentLocation();
    const region = REGIONS.find((entry) => entry.name === location);
    if (!region || this.progress.discoveries.includes(region.id) || this.pendingRegionDiscoveries.has(region.id)) return;
    if (this.profileMode === "supabase" && !this.isRealtimeOnline()) return;
    this.pendingRegionDiscoveries.add(region.id);
    if (this.isRealtimeOnline()) {
      this.ws!.send(JSON.stringify({ type: "rpg_region_discover", regionId: region.id }));
      return;
    }
    const discoveries = normalizeDiscoveries([...this.progress.discoveries, region.id]);
    const completionBonus = discoveries.length === REGIONS.length ? REGION_COMPLETION_BONUS_GOLD : 0;
    const reward = REGION_DISCOVERY_REWARD_GOLD + completionBonus;
    this.progress = { ...this.progress, discoveries, gold: this.progress.gold + reward };
    this.pendingRegionDiscoveries.delete(region.id);
    this.callbacks.onAudio("quest");
    this.callbacks.onToast({
      title: `${region.name} discovered`,
      detail: completionBonus ? `World cartographer complete • +${reward} gold` : `${region.subtitle} • +${reward} gold`,
      tone: "quest",
    });
    this.emitHud({ progress: this.progress, message: `${region.name} added to your Adventurer Codex.` });
  }

  private emitHud(next: Partial<HudState>, includeProgress = true) {
    if (includeProgress && this.progress.questStep > this.lastQuestToastStep) {
      this.lastQuestToastStep = this.progress.questStep;
      const step = QUEST_STEPS[Math.min(this.progress.questStep, QUEST_STEPS.length - 1)];
      this.callbacks.onToast({
        title: step.target === "Complete" ? `${step.questTitle} complete` : "Quest updated",
        detail: step.target === "Complete" ? step.title : `${step.questTitle} • ${step.title}`,
        tone: "quest",
      });
    }
    const payload: Partial<HudState> = {
      players: this.remotes.size + 1,
      location: this.currentLocation(),
      playerX: this.playerPos.x,
      playerY: this.playerPos.y,
      ...next,
    };
    if (includeProgress) payload.progress = structuredClone(this.progress);
    this.callbacks.onHud(payload);
  }

  private showQuestRewardToast(fromStep: number) {
    const reward = QUEST_REWARD_TOASTS[fromStep];
    if (!reward || this.progress.questStep !== reward.to) return false;
    this.lastQuestToastStep = reward.to;
    const payload: GameToast = { title: reward.title, detail: reward.detail, tone: "quest", itemId: reward.itemId };
    this.callbacks.onToast(payload);
    this.callbacks.onQuestComplete(payload);
    return true;
  }

  private async connectMultiplayer() {
    const room = new URLSearchParams(location.search).get("room") || "lobby";
    const identity = await getRpgIdentity();
    if (this.disposed || !this.scene.isActive()) return;
    let ws: WebSocket;
    try {
      // The realtime server negotiates the protocol for both guests and authenticated
      // players. Guests still need the base protocol; only the JWT extension is optional.
      const protocols = ["oreacres.v1", ...(identity.accessToken ? [`jwt-${identity.accessToken}`] : [])];
      ws = new WebSocket(
        `${resolveWsUrl()}?room=${encodeURIComponent(room)}&name=${encodeURIComponent(this.displayName)}`,
        protocols,
      );
    } catch {
      this.emitHud({ online: "offline" }, false);
      return;
    }
    this.ws = ws;
    ws.addEventListener("open", () => this.emitHud({ online: "online" }, false));
    ws.addEventListener("close", () => {
      this.pendingRegionDiscoveries.clear();
      if (!this.disposed && (this.activeEnemyId || this.activeResourceId)) {
        this.actionTimer?.remove(false);
        this.actionTimer = null;
        this.finishAction("Realtime connection lost. The action was safely cancelled.");
      }
      this.emitHud({ online: "offline" }, false);
    });
    ws.addEventListener("error", () => this.emitHud({ online: "offline" }, false));
    ws.addEventListener("message", (event) => {
      if (this.disposed || !this.scene.isActive()) return;
      try {
        this.handleServerMessage(JSON.parse(event.data));
      } catch {
        // Ignore malformed third-party messages without taking down the scene.
      }
    });
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(
          JSON.stringify({
            type: "move",
            x: this.playerPos.x,
            y: this.playerPos.y,
            appearance: this.progress.appearance,
            customization: this.progress.customization,
            equipped: this.progress.equipped,
            action: this.heroAction,
            direction: this.facing,
          }),
        );
      },
    });
  }

  private handleServerMessage(data: any) {
    if (data.type === "welcome") {
      this.playerId = data.playerId;
      this.profileMode = data.identity?.mode === "supabase" ? "supabase" : "guest";
      if (data.profile?.progress) {
        this.applyAuthoritativeProfile(data.profile, false);
        if (isWorldPositionWalkable(this.progress.position.x, this.progress.position.y)) {
          this.playerPos.set(this.progress.position.x, this.progress.position.y);
          this.applyWorldArea(this.progress.position.y, true);
          this.updatePlayerView();
        }
      }
      const pendingIdentityRaw = window.localStorage.getItem("ore-acres-rpg-identity-sync-pending");
      if (pendingIdentityRaw) {
        try {
          const pendingIdentity = JSON.parse(pendingIdentityRaw) as { displayName?: unknown; appearance?: unknown; customization?: unknown };
          const displayName = typeof pendingIdentity.displayName === "string" ? pendingIdentity.displayName : this.displayName;
          const appearance = isAppearanceId(pendingIdentity.appearance) ? pendingIdentity.appearance : this.progress.appearance;
          const customization = pendingIdentity.customization && typeof pendingIdentity.customization === "object"
            ? pendingIdentity.customization
            : this.progress.customization;
          this.ws?.send(JSON.stringify({ type: "rpg_identity_update", displayName, appearance, customization }));
        } catch {
          window.localStorage.removeItem("ore-acres-rpg-identity-sync-pending");
        }
      } else if (typeof data.profile?.displayName === "string") {
        this.applyAdminIdentity(data.profile.displayName);
      }
      const players = (data.snapshot?.players ?? []) as RemotePlayer[];
      players.filter((player) => player.id !== this.playerId).forEach((player) => this.upsertRemote(player));
      this.emitSocialRoster();
      Object.values(data.snapshot?.rpg?.enemies ?? {}).forEach((enemy) => this.applyEnemyState({ enemy }, true));
      Object.values(data.snapshot?.rpg?.resources ?? {}).forEach((resource) => this.applyResourceState({ resource }, true));
      (data.snapshot?.chat ?? []).forEach((chat: unknown) => this.applyChatMessage({ chat }, false));
      this.callbacks.onChat({
        id: `connected-${Date.now()}`,
        playerId: null,
        name: "System",
        text: `Connected to ${data.snapshot?.roomId ?? "lobby"}.`,
        at: Date.now(),
        kind: "system",
      });
    }
    if (data.type === "player_joined") {
      this.upsertRemote(data.player);
      this.callbacks.onChat({
        id: `joined-${data.player?.id}-${Date.now()}`,
        playerId: null,
        name: "System",
        text: `${data.player?.name ?? "An adventurer"} entered Orehaven.`,
        at: Date.now(),
        kind: "system",
      });
    }
    if (data.type === "player_moved" || data.type === "player_renamed") this.upsertRemote(data.player);
    if (data.type === "player_left") {
      const departedName = this.remotes.get(data.playerId)?.name.text ?? "An adventurer";
      this.callbacks.onChat({
        id: `left-${data.playerId}-${Date.now()}`,
        playerId: null,
        name: "System",
        text: `${departedName} left the realm.`,
        at: Date.now(),
        kind: "system",
      });
      this.removeRemote(data.playerId);
    }
    if (data.type === "rpg_chat") this.applyChatMessage(data, true);
    if (data.type === "rpg_party_state") {
      this.partyState = data.party ?? null;
      this.callbacks.onSocial({ party: data.party ?? null, invite: null });
      this.refreshSocialWorldIndicators();
    }
    if (data.type === "rpg_party_invite") {
      const invite: PartyInvite = {
        partyId: String(data.partyId || ""),
        inviterId: String(data.inviterId || ""),
        inviterName: String(data.inviterName || "Adventurer").slice(0, 24),
        expiresAt: Math.max(Date.now(), Number(data.expiresAt) || Date.now()),
      };
      this.callbacks.onSocial({ invite });
      this.callbacks.onToast({
        title: "Party invitation",
        detail: `${invite.inviterName} invited you to adventure together.`,
        tone: "quest",
      });
    }
    if (data.type === "rpg_party_notice") {
      this.emitHud({ message: typeof data.message === "string" ? data.message : "Party updated." }, false);
    }
    if (data.type === "rpg_party_assist_reward") this.applyPartyAssistReward(data);
    if (data.type === "rpg_expedition_reward") this.applyExpeditionReward(data);
    if (data.type === "rpg_guild_presence") this.upsertRemote(data.player);
    if (data.type === "rpg_guild_state") {
      const guild = normalizeGuildMembership(data.guild);
      this.progress = { ...this.progress, guild };
      this.callbacks.onSocial({ guildInvite: null });
      this.emitSocialRoster();
      this.refreshSocialWorldIndicators();
      this.emitHud({ message: typeof data.message === "string" ? data.message : guild ? `Guild joined: ${guild.name}.` : "Guild membership updated." });
    }
    if (data.type === "rpg_guild_invite") {
      const guild = normalizeGuildMembership(data.guild);
      if (guild) {
        this.callbacks.onSocial({
          guildInvite: {
            guild,
            inviterId: String(data.inviterId || ""),
            inviterName: String(data.inviterName || "Adventurer").slice(0, 24),
            expiresAt: Math.max(Date.now(), Number(data.expiresAt) || Date.now()),
          },
        });
        this.callbacks.onToast({ title: `[${guild.tag}] Guild invitation`, detail: `${data.inviterName ?? "An adventurer"} invited you to ${guild.name}.`, tone: "quest" });
      }
    }
    if (data.type === "rpg_guild_notice") {
      this.emitHud({ message: typeof data.message === "string" ? data.message : "Guild updated." }, false);
    }
    if (data.type === "rpg_enemy_telegraph") this.showEnemyTelegraph(data);
    if (data.type === "rpg_enemy_telegraph_result") this.resolveEnemyTelegraph(data);
    if (data.type === "rpg_enemy_state") this.applyEnemyState(data);
    if (data.type === "rpg_enemy_attack") this.applyEnemyAttack(data);
    if (data.type === "rpg_resource_state") this.applyResourceState(data);
    if (data.type === "rpg_gather_complete") this.applyGatheringReward(data);
    if (data.type === "rpg_world_event_reward") this.applyWorldEventReward(data);
    if (data.type === "rpg_world_event") this.applyWorldEventAnnouncement(data);
    if (data.type === "rpg_ability_result") this.applyAbilityResult(data);
    if (data.type === "rpg_profile_state") this.applyAuthoritativeProfile(data.profile, true, data.message);
    if (data.type === "rpg_identity_state") {
      window.localStorage.removeItem("ore-acres-rpg-identity-sync-pending");
      this.applyAdminIdentity(data.displayName);
    }
    if (data.type === "rpg_admin_patch") this.applyAdminProgressPatch(data.patch, data.message);
    if (data.type === "rpg_admin_identity") this.applyAdminIdentity(data.displayName);
    if (data.type === "rpg_admin_notice") this.applyAdminNotice(data.message);
    if (data.type === "rpg_admin_position") this.applyAdminPosition(data);
    if (data.type === "rpg_waystone_state") this.applyWaystoneState(data);
    if (data.type === "rpg_region_state") this.applyRegionState(data);
    if (data.type === "rpg_waystone_travel") {
      const waystone = WAYSTONES.find((entry) => entry.id === data.waystoneId);
      if (waystone) this.completeWaystoneTravel(waystone);
    }
    if (data.type === "rpg_dungeon_travel") {
      const portal = DUNGEON_PORTALS.find((entry) => entry.id === data.portalId);
      if (portal) this.completeDungeonTravel(portal);
    }
    if (data.type === "rpg_position_correction") this.applyPositionCorrection(data);
    if (data.type === "rpg_action_error") this.handleActionError(data);
  }

  private applyPositionCorrection(data: any) {
    const x = Number(data.x);
    const y = Number(data.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.playerPos.set(x, y);
    this.applyWorldArea(y, true);
    this.walkTarget = null;
    this.walkPath = [];
    this.approachTarget = null;
    if (!this.actionLock) this.setHeroAction("idle");
    this.updatePlayerView();
    this.emitHud({ message: "Movement corrected to the nearest valid position." });
  }

  private applyAdminProgressPatch(rawPatch: unknown, message?: unknown) {
    if (!rawPatch || typeof rawPatch !== "object" || Array.isArray(rawPatch)) return;
    const patch = rawPatch as Partial<PlayerProgress> & { heal?: boolean };
    const candidate = {
      ...this.progress,
      ...patch,
      skills: patch.skills ? { ...this.progress.skills, ...patch.skills } : this.progress.skills,
      inventory: patch.inventory ? { ...this.progress.inventory, ...patch.inventory } : this.progress.inventory,
      bank: patch.bank ? { ...this.progress.bank, ...patch.bank } : this.progress.bank,
      collectionLog: patch.collectionLog ? { ...this.progress.collectionLog, ...patch.collectionLog } : this.progress.collectionLog,
      equipped: patch.equipped ? { ...this.progress.equipped, ...patch.equipped } : this.progress.equipped,
      customization: patch.customization ? { ...this.progress.customization, ...patch.customization } : this.progress.customization,
      position: patch.position ? { ...this.progress.position, ...patch.position } : this.progress.position,
    };
    this.progress = normalizePlayerProgress(candidate);
    if (patch.heal) this.progress = { ...this.progress, hp: this.progress.maxHp };
    this.player?.setAppearance(this.progress.appearance);
    this.player?.setCustomization(this.progress.customization);
    this.applyEquipmentVisuals();
    this.setHeroAction(this.heroAction);
    this.refreshTreasureMarker();
    this.refreshWaystones();
    if (this.profileMode !== "supabase") savePlayerProgress(this.progress);
    this.emitSocialRoster();
    this.refreshSocialWorldIndicators();
    this.callbacks.onToast({ title: "Admin update", detail: typeof message === "string" ? message : "Your playtest profile was updated.", tone: "quest" });
    this.emitHud({ message: typeof message === "string" ? message : "Your playtest profile was updated." }, true);
  }

  private applyAdminIdentity(value: unknown) {
    if (typeof value !== "string") return;
    const displayName = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
    if (!displayName) return;
    this.displayName = displayName;
    window.localStorage.setItem("ore-acres-rpg-name", displayName);
    this.refreshSocialWorldIndicators();
    this.emitHud({}, false);
  }

  private applyAdminNotice(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return;
    const message = value.trim().slice(0, 240);
    this.callbacks.onChat({ id: `admin-${Date.now()}`, playerId: null, name: "Orehaven Admin", text: message, at: Date.now(), kind: "system" });
    this.callbacks.onToast({ title: "Realm notice", detail: message, tone: "quest" });
    this.emitHud({ message });
  }

  private applyAdminPosition(data: any) {
    const x = Number(data?.x);
    const y = Number(data?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !isWorldPositionWalkable(x, y)) return;
    this.playerPos.set(x, y);
    this.applyWorldArea(y, true);
    this.progress = { ...this.progress, position: { x, y } };
    this.walkTarget = null;
    this.walkPath = [];
    this.approachTarget = null;
    this.actionLock = false;
    this.updatePlayerView();
    if (this.profileMode !== "supabase") savePlayerProgress(this.progress);
    this.emitHud({ message: typeof data?.message === "string" ? data.message : "An administrator moved your character." });
  }

  private applyAbilityResult(data: any) {
    if (data.abilityId !== "second-wind") return;
    const healing = Math.max(0, Number(data.healing) || 0);
    const readyAt = Math.max(Date.now(), Number(data.readyAt) || 0);
    this.abilityCooldowns = { ...this.abilityCooldowns, secondWindReadyAt: readyAt };
    if (Number.isFinite(Number(data.hp))) {
      this.progress = {
        ...this.progress,
        hp: Math.max(0, Math.min(this.progress.maxHp, Number(data.hp))),
      };
    }
    this.showHealingNumber(healing);
    this.emitHud({
      progress: this.progress,
      abilityCooldowns: this.abilityCooldowns,
      message: `Second Wind restored ${healing} hitpoints.`,
    });
  }

  private applyAuthoritativeProfile(profile: any, showLevelUps: boolean, message?: unknown) {
    if (!profile?.progress || this.profileMode !== "supabase") return;
    const previous = this.progress;
    this.progress = normalizePlayerProgress(profile.progress);
    const restoredHp = Math.max(0, this.progress.hp - previous.hp);
    this.profileRevision = Math.max(this.profileRevision, Number(profile.revision) || 0);
    this.player?.setAppearance(this.progress.appearance);
    this.player?.setCustomization(this.progress.customization);
    this.applyEquipmentVisuals();
    this.setHeroAction(this.heroAction);
    if (restoredHp > 0) {
      this.showHealingNumber(restoredHp);
      if (typeof message === "string" && message.includes("Founders' Fountain")) {
        this.showSanctuaryFx();
        this.time.delayedCall(650, () => {
          if (!this.disposed && !this.actionLock) this.setHeroAction("idle");
        });
      }
    }
    this.refreshTreasureMarker();
    this.refreshWaystones();
    const newWaystone = WAYSTONES.find((waystone) => !previous.waystones.includes(waystone.id) && this.progress.waystones.includes(waystone.id));
    if (newWaystone) {
      this.showWaystoneFx(newWaystone);
      this.callbacks.onToast({ title: "Waystone attuned", detail: `${newWaystone.region} is now available for fast travel.`, tone: "quest" });
    }
    const newRegion = REGIONS.find((region) => !previous.discoveries.includes(region.id) && this.progress.discoveries.includes(region.id));
    if (newRegion) {
      this.pendingRegionDiscoveries.delete(newRegion.id);
      this.callbacks.onAudio("quest");
      this.callbacks.onToast({ title: `${newRegion.name} discovered`, detail: `${newRegion.subtitle} • Added to the Adventurer Codex`, tone: "quest" });
    }
    if (!previous.treasureTrail && this.progress.treasureTrail) {
      const clue = this.activeTreasureClue();
      if (clue) this.callbacks.onToast({ title: clue.title, detail: clue.clue, tone: "quest" });
    } else if (previous.treasureTrail && this.progress.treasureTrail?.step !== previous.treasureTrail.step) {
      const clue = this.activeTreasureClue();
      if (clue) this.callbacks.onToast({ title: "Clue solved", detail: `${clue.title} • ${clue.clue}`, tone: "quest" });
    } else if (previous.treasureTrail && !this.progress.treasureTrail) {
      this.callbacks.onToast({ title: "Treasure trail complete", detail: "+260 gold • Founder's Sun Relic • 2 Crimson Tonics", tone: "loot", itemId: "founders-relic" });
    }
    this.showQuestRewardToast(previous.questStep);
    if (showLevelUps) {
      for (const [skillId, skill] of Object.entries(this.progress.skills)) {
        const priorLevel = previous.skills[skillId as SkillId]?.level ?? skill.level;
        if (skill.level <= priorLevel) continue;
        this.announceLevelUp(skillId as SkillId, priorLevel, skill.level);
      }
    }
    this.emitSocialRoster();
    this.refreshSocialWorldIndicators();
    this.emitHud(typeof message === "string" ? { message } : {}, true);
  }

  private applyWaystoneState(data: any) {
    const previous = new Set(this.progress.waystones);
    this.progress = { ...this.progress, waystones: normalizeWaystones(data.waystones) };
    this.refreshWaystones();
    const unlocked = WAYSTONES.find((entry) => entry.id === data.unlockedId && !previous.has(entry.id));
    if (unlocked) {
      this.showWaystoneFx(unlocked);
      this.callbacks.onToast({ title: "Waystone attuned", detail: `${unlocked.region} is now available for fast travel.`, tone: "quest" });
    }
    this.emitHud({ progress: this.progress, message: typeof data.message === "string" ? data.message : "Waystone network updated." });
  }

  private applyRegionState(data: any) {
    const previous = new Set(this.progress.discoveries);
    const discoveries = normalizeDiscoveries(data.discoveries);
    const region = REGIONS.find((entry) => entry.id === data.discoveredId);
    if (region) this.pendingRegionDiscoveries.delete(region.id);
    const profileAuthoritative = this.profileMode === "supabase" && Boolean(data.profileAuthoritative);
    if (!profileAuthoritative) {
      const reward = Math.max(0, Math.floor(Number(data.rewardGold) || 0)) + Math.max(0, Math.floor(Number(data.completionBonus) || 0));
      this.progress = { ...this.progress, discoveries, gold: this.progress.gold + reward };
    } else {
      this.progress = { ...this.progress, discoveries };
    }
    if (region && !previous.has(region.id)) {
      this.callbacks.onAudio("quest");
      this.callbacks.onToast({ title: `${region.name} discovered`, detail: `${region.subtitle} • Added to the Adventurer Codex`, tone: "quest" });
    }
    this.emitHud({ progress: this.progress, message: typeof data.message === "string" ? data.message : "Adventurer Codex updated." });
  }

  private applyEnemyState(data: any, initial = false) {
    const state = data?.enemy;
    const enemy = this.enemyRuntime.get(state?.id);
    if (!enemy) return;

    const nextX = Number.isFinite(Number(state.x)) ? Number(state.x) : enemy.definition.x;
    const nextY = Number.isFinite(Number(state.y)) ? Number(state.y) : enemy.definition.y;
    const regionalActive = worldAreaAtY(nextY) === this.activeWorldArea;
    const moved = Phaser.Math.Distance.Between(enemy.definition.x, enemy.definition.y, nextX, nextY) > 0.35;
    enemy.definition.x = nextX;
    enemy.definition.y = nextY;
    enemy.facing = state.direction === "up" || state.direction === "left" || state.direction === "right" ? state.direction : "down";
    enemy.worldAction = state.action === "walk" || state.action === "attack" ? state.action : "idle";
    if (initial) {
      enemy.sprite.setPosition(nextX, nextY);
      enemy.hitZone.setPosition(nextX, nextY + 5);
      enemy.shadow.setPosition(nextX, nextY + 1);
      enemy.threatRing.setPosition(nextX, nextY + 3);
      enemy.rareAura?.setPosition(nextX, nextY + 2).setDepth(nextY - 0.25);
      enemy.plate.setPosition(nextX, nextY + 20);
    } else if (moved && regionalActive) {
      this.tweens.killTweensOf(enemy.sprite);
      this.tweens.killTweensOf(enemy.hitZone);
      this.tweens.killTweensOf(enemy.shadow);
      this.tweens.killTweensOf(enemy.plate);
      this.tweens.add({
        targets: enemy.sprite,
        x: nextX,
        y: nextY,
        duration: 230,
        ease: "Linear",
      });
      this.tweens.add({
        targets: enemy.hitZone,
        x: nextX,
        y: nextY + 5,
        duration: 230,
        ease: "Linear",
      });
      this.tweens.add({
        targets: enemy.shadow,
        x: nextX,
        y: nextY + 1,
        duration: 230,
        ease: "Linear",
      });
      this.tweens.add({
        targets: enemy.threatRing,
        x: nextX,
        y: nextY + 3,
        duration: 230,
        ease: "Linear",
      });
      if (enemy.rareAura) {
        this.tweens.add({
          targets: enemy.rareAura,
          x: nextX,
          y: nextY + 2,
          duration: 230,
          ease: "Linear",
        });
      }
      this.tweens.add({
        targets: enemy.plate,
        x: nextX,
        y: nextY + 20,
        duration: 230,
        ease: "Linear",
      });
    } else if (moved) {
      enemy.sprite.setPosition(nextX, nextY);
      enemy.hitZone.setPosition(nextX, nextY + 5);
      enemy.shadow.setPosition(nextX, nextY + 1);
      enemy.threatRing.setPosition(nextX, nextY + 3);
      enemy.rareAura?.setPosition(nextX, nextY + 2);
      enemy.plate.setPosition(nextX, nextY + 20);
    }
    enemy.sprite.setDepth(nextY);
    enemy.hitZone.setDepth(20_000 + nextY);
    enemy.shadow.setDepth(nextY - 1);
    enemy.threatRing.setDepth(nextY - 0.5);
    enemy.plate.setDepth(nextY + 2);
    enemy.hpBar.setDepth(nextY + 3);
    const wasDefeated = enemy.respawnAt > Date.now() || enemy.hp <= 0;
    enemy.hp = Phaser.Math.Clamp(Number(state.hp) || 0, 0, enemy.definition.maxHp);
    if (enemy.definition.id === "sunstone-revenant") {
      const nextPhase = sunstoneRevenantPhase(enemy.hp, enemy.definition.maxHp);
      const previousPhase = enemy.phase;
      enemy.phase = nextPhase;
      const phaseRule = SUNSTONE_REVENANT_PHASES[nextPhase - 1];
      const phaseColor = phaseRule.color;
      enemy.rareAura?.setFillStyle(phaseColor, nextPhase === 3 ? 0.22 : 0.14).setStrokeStyle(nextPhase === 3 ? 4 : 3, phaseColor, 0.92);
      if (regionalActive && !initial && previousPhase && nextPhase > previousPhase && enemy.hp > 0) {
        const phaseName = phaseRule.name;
        this.cameras.main.shake(260, nextPhase === 3 ? 0.008 : 0.005);
        this.callbacks.onToast({ title: `Aurex phase ${nextPhase}`, detail: `${phaseName} awakened • Watch the cast marker`, tone: "quest" });
        this.emitHud({ message: `Aurex enters phase ${nextPhase}: ${phaseName}!` });
      }
    }
    if (enemy.definition.id === "icefang-rimebound-king") {
      const nextPhase = rimeboundKingPhase(enemy.hp, enemy.definition.maxHp);
      const previousPhase = enemy.phase;
      enemy.phase = nextPhase;
      const phaseRule = RIMEBOUND_KING_PHASES[nextPhase - 1];
      enemy.rareAura?.setFillStyle(phaseRule.color, nextPhase === 3 ? 0.25 : 0.16).setStrokeStyle(nextPhase === 3 ? 5 : 3, phaseRule.color, 0.96);
      if (regionalActive && !initial && previousPhase && nextPhase > previousPhase && enemy.hp > 0) {
        this.showRimeboundPhaseFx(enemy, phaseRule.color, nextPhase);
        this.callbacks.onToast({ title: `Hroth breaks oath ${nextPhase}`, detail: `${phaseRule.name} awakened • Leave the marked ice`, tone: "quest" });
        this.emitHud({ message: `Hroth enters phase ${nextPhase}: ${phaseRule.name}!` });
      }
    }
    enemy.respawnAt = Math.max(0, Number(state.respawnAt) || 0);
    enemy.status = normalizeEnemyStatus(state.status);
    const previousTargetPlayerId = enemy.targetPlayerId;
    enemy.targetPlayerId = typeof state.targetPlayerId === "string" ? state.targetPlayerId : null;
    if (regionalActive && !initial && data.statusApplied && enemy.status) this.showEnemyStatusFx(enemy, enemy.status);
    const defeated = enemy.respawnAt > Date.now() || enemy.hp <= 0;
    const targetedPlayer = enemy.targetPlayerId === this.playerId;
    enemy.threatRing
      .setStrokeStyle(targetedPlayer ? 3 : 2, targetedPlayer ? 0xf05c4f : 0xe7a74f, targetedPlayer ? 0.98 : 0.72)
      .setVisible(regionalActive && !defeated && Boolean(enemy.targetPlayerId));
    if (regionalActive && !initial && targetedPlayer && previousTargetPlayerId !== this.playerId) this.showAggroAlert(enemy);
    if (this.selectedEnemyId === enemy.definition.id) {
      if (defeated && this.activeEnemyId !== enemy.definition.id) {
        this.selectedEnemyId = null;
        this.selectedRing.setVisible(false);
        this.emitHud({ target: null }, false);
      } else {
        this.emitHud({ target: this.targetState(enemy) }, false);
      }
    }
    if (enemy.definition.id === publicEventRotation().event.enemyId) this.emitHud({ worldEvent: this.featuredWorldEventState() }, false);
    const incomingStyle: CombatStyle = data.combatStyle === "range" || data.combatStyle === "magic" ? data.combatStyle : "melee";
    const incomingDamage = Math.max(0, Number(data.damage) || 0);
    if (regionalActive && !initial && incomingDamage > 0) this.showDamageNumber(enemy, incomingDamage, incomingStyle, Boolean(data.critical));
    const treeAbility = data.treeAbility ? SKILL_TREE_NODES.find((entry) => entry.id === data.abilityId) : null;
    if (regionalActive && !initial && treeAbility && data.sourcePlayerId !== this.playerId && !data.secondary && !data.effectTick) {
      this.playTreeAbilityFx(enemy, treeAbility);
    }
    if (regionalActive && !initial && treeAbility && data.effectTick) this.showTreeTickFx(enemy, treeAbility);
    if (defeated) {
      enemy.reaction = null;
      enemy.reactionUntil = 0;
      enemy.worldAction = "idle";
      enemy.targetPlayerId = null;
      enemy.threatRing.setVisible(false);
      enemy.hpBar.setVisible(false);
      enemy.hitZone.disableInteractive();
      if (initial || !regionalActive) {
        enemy.sprite.setVisible(false).setAlpha(0);
        enemy.shadow.setVisible(false).setAlpha(0);
        enemy.plate.setVisible(false).setAlpha(0);
        enemy.rareAura?.setVisible(false).setAlpha(0);
      } else if (!wasDefeated) {
        this.showEnemyDefeatFx(enemy);
        this.tweens.add({
          targets: [enemy.sprite, enemy.shadow, enemy.plate],
          alpha: 0,
          duration: 240,
          onComplete: () => {
            enemy.sprite.setVisible(false);
            enemy.shadow.setVisible(false);
            enemy.plate.setVisible(false);
            enemy.rareAura?.setVisible(false);
          },
        });
        if (enemy.rareAura) this.tweens.add({ targets: enemy.rareAura, alpha: 0, duration: 220 });
      } else {
        enemy.sprite.setVisible(false).setAlpha(0);
        enemy.shadow.setVisible(false).setAlpha(0);
        enemy.plate.setVisible(false).setAlpha(0);
        enemy.rareAura?.setVisible(false).setAlpha(0);
      }
    } else if (regionalActive) {
      enemy.sprite.setVisible(true).setAlpha(1);
      enemy.hitZone.setInteractive({ useHandCursor: true });
      enemy.shadow.setVisible(true).setAlpha(enemy.definition.rare ? 0.42 : 0.34);
      enemy.plate.setVisible(true).setAlpha(1);
      enemy.rareAura?.setVisible(true).setAlpha(0.82);
      if (incomingDamage <= 0) {
        if (enemy.worldAction === "walk") this.playEnemyWalk(enemy, enemy.facing);
        else if (enemy.worldAction === "attack") {
          this.playEnemyReaction(enemy, "attack", enemy.facing);
          if (data.attacked && (enemy.definition.attackStyle === "magic" || enemy.definition.attackStyle === "range")) {
            this.playEnemyProjectile(enemy, data.targetPlayerId ?? state.targetPlayerId);
          }
        }
        else this.playEnemyIdle(enemy);
      }
      this.drawEnemyHp(enemy);
      enemy.hpBar.setVisible(enemy.hp < enemy.definition.maxHp);
    } else {
      this.setEnemyRegionalActive(enemy, false);
    }

    const retaliation = Math.max(0, Number(data.retaliation) || 0);
    if (regionalActive && !initial && !defeated && retaliation > 0) {
      const remoteSource = this.remotes.get(data.sourcePlayerId);
      const targetX = data.sourcePlayerId === this.playerId ? this.playerPos.x : remoteSource?.hero.x ?? this.playerPos.x;
      const targetY = data.sourcePlayerId === this.playerId ? this.playerPos.y : remoteSource?.hero.y ?? this.playerPos.y;
      const enemyFacing = directionToward(enemy.definition.x, enemy.definition.y, targetX, targetY);
      this.time.delayedCall(500, () => this.playEnemyReaction(enemy, "attack", enemyFacing));
    }

    if (data.settling) {
      if (data.sourcePlayerId === this.playerId) {
        this.awaitingCombatResponse = false;
        this.actionTimer?.remove(false);
        this.actionTimer = null;
        this.finishAction(`${enemy.definition.name} defeated. Securing your reward...`);
      }
      return;
    }

    if (data.sourcePlayerId === this.playerId) {
      if (!data.secondary && !data.effectTick) this.awaitingCombatResponse = false;
      const damage = Math.max(0, Number(data.damage) || 0);
      const equippedAbility = weaponAbility(this.progress.equipped.weapon);
      const abilityId = data.abilityId === equippedAbility.id ? equippedAbility.id : null;
      if (abilityId) {
        this.abilityCooldowns = {
          ...this.abilityCooldowns,
          signatureReadyAt: Math.max(Date.now(), Number(data.abilityReadyAt) || 0),
        };
        this.emitHud({ abilityCooldowns: this.abilityCooldowns }, false);
      }
      if (treeAbility && Number(data.abilityReadyAt) > 0) {
        this.abilityCooldowns = {
          ...this.abilityCooldowns,
          treeReadyAt: { ...this.abilityCooldowns.treeReadyAt, [treeAbility.id]: Number(data.abilityReadyAt) },
        };
        this.emitHud({ abilityCooldowns: this.abilityCooldowns }, false);
      }
      if (retaliation) {
        this.progress = { ...this.progress, hp: Math.max(0, this.progress.hp - retaliation) };
        this.time.delayedCall(690, () => this.showPlayerDamage(retaliation));
      }
      if (this.progress.hp <= 0) {
        this.respawnPlayer();
        return;
      }
      if (data.secondary) {
        if (data.defeated) {
          const gold = Math.max(0, Number(data.reward?.gold) || 0);
          const xp = Math.max(0, Number(data.reward?.xp) || enemy.definition.attackXp);
          const profileAuthoritative = this.profileMode === "supabase" && Boolean(data.profileAuthoritative);
          if (!profileAuthoritative) {
            this.addXp(combatSkillForStyle(incomingStyle), xp);
            this.addXp("hitpoints", Math.ceil(xp * 0.4));
            this.progress = { ...this.progress, gold: this.progress.gold + gold };
          }
          this.showCombatReward(enemy, gold, itemById(typeof data.reward?.itemId === "string" ? data.reward.itemId : ""));
        }
        this.emitHud({ abilityCooldowns: this.abilityCooldowns, message: `${treeAbility?.name ?? "Area skill"} struck another target for ${damage}.` });
        return;
      }
      if (data.defeated) {
        const gold = Math.max(0, Number(data.reward?.gold) || 0);
        const xp = Math.max(0, Number(data.reward?.xp) || enemy.definition.attackXp);
        const combatStyle: CombatStyle = data.combatStyle === "range" || data.combatStyle === "magic" ? data.combatStyle : "melee";
        const profileAuthoritative = this.profileMode === "supabase" && Boolean(data.profileAuthoritative);
        this.actionTimer?.remove(false);
        this.actionTimer = null;
        if (!profileAuthoritative) {
          this.addXp(combatSkillForStyle(combatStyle), xp);
          this.addXp("hitpoints", Math.ceil(xp * 0.4));
          this.progress = { ...this.progress, gold: this.progress.gold + gold };
          this.progress = {
            ...this.progress,
            questStep: questStepAfterCombat(this.progress.questStep, enemy.definition, combatStyle),
            activities: recordActivity(this.progress.activities, "combat", 1, enemy.definition.kind),
            sideQuests: advanceSideQuests(this.progress.sideQuests, "combat", enemy.definition.kind, enemy.definition.id),
          };
          this.progress = { ...this.progress, activities: recordLifetimeTarget(this.progress.activities, enemy.definition.id) };
          if (enemy.definition.id === publicEventRotation().event.enemyId) {
            this.progress = { ...this.progress, activities: recordActivity(this.progress.activities, "event") };
          }
        }
        const dropId = typeof data.reward?.itemId === "string" ? data.reward.itemId : "";
        const drop = itemById(dropId);
        this.showCombatReward(enemy, gold, drop);
        if (drop) {
          if (!profileAuthoritative) {
            this.progress = {
              ...this.progress,
              inventory: { ...this.progress.inventory, [drop.id]: (this.progress.inventory[drop.id] ?? 0) + 1 },
              collectionLog: {
                ...this.progress.collectionLog,
                [drop.id]: (this.progress.collectionLog[drop.id] ?? 0) + 1,
              },
            };
          }
          this.callbacks.onToast({ title: lootToastTitle(drop.rarity), detail: drop.name, tone: "loot", itemId: drop.id });
        }
        if (enemy.definition.rare && !drop) {
          this.callbacks.onToast({ title: "World boss defeated", detail: `${enemy.definition.name} • +${gold} gold`, tone: "loot" });
        }
        if (!drop) this.callbacks.onAudio("victory");
        this.finishAction(
          `${enemy.definition.name} defeated. +${gold} gold${drop ? ` • Rare drop: ${drop.name}!` : "."}`,
        );
        return;
      }
      const activeStyle = itemById(this.progress.equipped.weapon)?.combatStyle ?? "melee";
      const activeSkill = combatSkillForStyle(activeStyle);
      const interval = Math.max(560, 900 - this.progress.skills[activeSkill].level * 5 - (activeStyle === "range" ? 45 : 0));
      this.activeAction = this.activeAction
        ? {
            ...this.activeAction,
            startedAt: Date.now(),
            endsAt: Date.now() + interval,
            detail: `${enemy.hp}/${enemy.definition.maxHp} enemy HP`,
          }
        : null;
      this.emitHud({
        activeAction: this.activeAction,
        target: this.targetState(enemy),
        message: retaliation > 0
          ? `${abilityId ? `${weaponAbility(this.progress.equipped.weapon).name} hits` : "You hit"} ${enemy.definition.name} for ${damage}. It hits back for ${retaliation}.`
          : `${abilityId ? `${weaponAbility(this.progress.equipped.weapon).name} hits` : "You hit"} ${enemy.definition.name} for ${damage}.`,
        abilityCooldowns: this.abilityCooldowns,
      });
      return;
    }

    if (data.defeated && this.activeEnemyId === enemy.definition.id) {
      this.actionTimer?.remove(false);
      this.actionTimer = null;
      this.finishAction(`${enemy.definition.name} was defeated by another adventurer.`);
    }
  }

  private applyEnemyAttack(data: any) {
    const enemy = this.enemyRuntime.get(data?.enemyId);
    const damage = Math.max(0, Math.floor(Number(data?.damage) || 0));
    if (!enemy || damage <= 0 || enemy.respawnAt > Date.now()) return;
    const delay = Math.max(80, Math.min(420, Math.floor(Number(data?.impactDelay) || 210)));
    this.time.delayedCall(delay, () => {
      if (this.disposed || enemy.respawnAt > Date.now()) return;
      const profileAuthoritative = this.profileMode === "supabase" && Boolean(data.profileAuthoritative);
      const nextHp = profileAuthoritative
        ? Phaser.Math.Clamp(Math.floor(Number(data.currentHp) || 0), 0, this.progress.maxHp)
        : Math.max(0, this.progress.hp - damage);
      this.progress = { ...this.progress, hp: nextHp };
      if (!profileAuthoritative) {
        this.addXp("defense", Math.max(2, Math.floor(Number(data.defenseXp) || Math.ceil(damage * 1.25))));
      }
      const rawDamage = Math.max(damage, Math.floor(Number(data?.rawDamage) || damage));
      const blocked = Math.max(0, rawDamage - damage);
      this.showPlayerDamage(damage, blocked);
      const abilityName = typeof data?.abilityName === "string" ? data.abilityName.slice(0, 36) : "";
      this.emitHud({
        message: `${enemy.definition.name}${abilityName ? ` casts ${abilityName} and` : ""} hits you for ${damage}${blocked > 0 ? ` • Defense blocks ${blocked}` : ""}.`,
      });
      if (this.progress.hp <= 0 || data.knockedOut) this.respawnPlayer();
    });
  }

  private showRimeboundPhaseFx(enemy: EnemyRuntime, color: number, phase: number) {
    const x = enemy.sprite.x;
    const y = enemy.sprite.y + 2;
    const radius = 62 + phase * 20;
    this.callbacks.onAudio("magic-cast");
    this.cameras.main.shake(320, phase === 3 ? 0.01 : 0.006);
    const floorFlash = this.add.ellipse(x, y, 34, 18, color, 0.5).setStrokeStyle(4, 0xffffff, 0.9).setDepth(y + 8);
    this.tweens.add({
      targets: floorFlash,
      scaleX: radius / 17,
      scaleY: radius / 17,
      alpha: 0,
      duration: 720,
      ease: "Cubic.easeOut",
      onComplete: () => floorFlash.destroy(),
    });
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      const shard = this.add
        .rectangle(x, y - 8, phase === 3 ? 5 : 4, 14 + phase * 3, index % 2 ? color : 0xe9fdff, 0.94)
        .setAngle(Phaser.Math.RadToDeg(angle) + 90)
        .setDepth(y + 10);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius * 0.55 - 12,
        angle: shard.angle + (index % 2 ? 70 : -70),
        alpha: 0,
        duration: 520 + index * 18,
        ease: "Quad.easeOut",
        onComplete: () => shard.destroy(),
      });
    }
  }

  private showEnemyTelegraph(data: any) {
    const enemy = this.enemyRuntime.get(String(data?.enemyId ?? ""));
    const x = Number(data?.x);
    const y = Number(data?.y);
    if (!enemy || !Number.isFinite(x) || !Number.isFinite(y) || enemy.respawnAt > Date.now()) return;
    const radius = Phaser.Math.Clamp(Number(data?.radius) || 64, 36, 160);
    const color = Phaser.Math.Clamp(Math.floor(Number(data?.color) || 0xe66a52), 0, 0xffffff);
    const abilityName = typeof data?.abilityName === "string" ? data.abilityName.slice(0, 36) : "Incoming attack";
    const duration = Phaser.Math.Clamp(Math.floor(Number(data?.completesAt) - Date.now()), 250, 2_500);
    this.enemyTelegraphs.get(enemy.definition.id)?.destroy(true);

    const fill = this.add.ellipse(0, 0, radius * 2, radius * 1.12, color, 0.13).setStrokeStyle(2, color, 0.9);
    const closingRing = this.add.ellipse(0, 0, radius * 2, radius * 1.12).setStrokeStyle(3, 0xfff0c2, 0.95).setScale(0.18);
    const crosshair = this.add.graphics();
    crosshair.lineStyle(2, color, 0.85);
    crosshair.lineBetween(-radius * 0.48, 0, radius * 0.48, 0);
    crosshair.lineBetween(0, -radius * 0.28, 0, radius * 0.28);
    const label = this.add
      .text(0, -radius * 0.62 - 10, abilityName.toUpperCase(), {
        fontFamily: "Georgia, serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#fff1c7",
        stroke: "#21140d",
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y + 2, [fill, crosshair, closingRing, label]).setDepth(y + 8).setAlpha(0);
    this.enemyTelegraphs.set(enemy.definition.id, container);
    this.tweens.add({ targets: container, alpha: 1, duration: 120, ease: "Quad.easeOut" });
    this.tweens.add({ targets: fill, alpha: { from: 0.11, to: 0.28 }, duration: 260, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: closingRing, scaleX: 1, scaleY: 1, duration, ease: "Linear" });
    this.tweens.add({ targets: label, scaleX: 1.05, scaleY: 1.05, duration: 330, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    if (data?.targetPlayerId === this.playerId) {
      this.incomingCast = {
        enemyId: enemy.definition.id,
        enemyName: enemy.definition.name,
        abilityName,
        startedAt: Date.now(),
        completesAt: Date.now() + duration,
        color,
      };
      this.cameras.main.shake(90, 0.0014);
      this.emitHud({
        incomingCast: this.incomingCast,
        message: `${enemy.definition.name} is casting ${abilityName}. Move out of the marked area!`,
      }, false);
    }
    this.time.delayedCall(duration + 1_200, () => {
      if (this.enemyTelegraphs.get(enemy.definition.id) !== container) return;
      container.destroy(true);
      this.enemyTelegraphs.delete(enemy.definition.id);
      if (this.incomingCast?.enemyId === enemy.definition.id) {
        this.incomingCast = null;
        this.emitHud({ incomingCast: null }, false);
      }
    });
  }

  private resolveEnemyTelegraph(data: any) {
    const enemyId = String(data?.enemyId ?? "");
    const enemy = this.enemyRuntime.get(enemyId);
    const container = this.enemyTelegraphs.get(enemyId);
    if (container) {
      container.destroy(true);
      this.enemyTelegraphs.delete(enemyId);
    }
    if (data?.targetPlayerId === this.playerId && this.incomingCast?.enemyId === enemyId) {
      this.incomingCast = null;
      this.emitHud({ incomingCast: null }, false);
    }
    const x = Number(data?.x);
    const y = Number(data?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const radius = Phaser.Math.Clamp(Number(data?.radius) || 64, 36, 160);
    const color = Phaser.Math.Clamp(Math.floor(Number(data?.color) || 0xe66a52), 0, 0xffffff);
    const impact = this.add.ellipse(x, y + 2, radius * 1.15, radius * 0.66, color, 0.32).setStrokeStyle(3, color, 0.96).setDepth(y + 9);
    this.tweens.add({
      targets: impact,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => impact.destroy(),
    });
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const spark = this.add.circle(x, y, 2.2, color, 0.9).setDepth(y + 10);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * radius * 0.75,
        y: y + Math.sin(angle) * radius * 0.38,
        alpha: 0,
        duration: 360,
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
    if (enemy) this.showCreatureSpecialImpact(enemy, x, y, radius, color);
    if (data?.targetPlayerId === this.playerId && !data?.hit) {
      const dodge = this.add
        .text(this.playerPos.x, this.playerPos.y - 54, "DODGED", {
          fontFamily: "Georgia, serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#9ff2d0",
          stroke: "#10251d",
          strokeThickness: 4,
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(this.playerPos.y + 30);
      this.tweens.add({ targets: dodge, y: dodge.y - 26, alpha: 0, duration: 850, ease: "Cubic.easeOut", onComplete: () => dodge.destroy() });
      this.callbacks.onAudio("quest");
      this.emitHud({ message: `Dodged ${String(data?.abilityName || "the enemy ability")}!` });
    }
  }

  private showCreatureSpecialImpact(enemy: EnemyRuntime, x: number, y: number, radius: number, color: number) {
    const depth = y + 12;
    if (enemy.definition.kind === "drake") {
      const blast = this.add
        .sprite(x, y - 18, ANSIMUZ_FIRE_BOMB_KEY, 0)
        .setScale(Math.max(0.9, radius / 78))
        .setDepth(depth)
        .play("ore-ansimuz-fire-bomb");
      blast.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => blast.destroy());
      this.cameras.main.shake(110, 0.0021);
      return;
    }
    if (enemy.definition.kind === "dune-stalker") {
      for (let index = 0; index < 10; index += 1) {
        const angle = (Math.PI * 2 * index) / 10;
        const dust = this.add
          .ellipse(x, y, 8, 4, index % 2 === 0 ? 0xf2cf78 : color, 0.78)
          .setRotation(angle)
          .setDepth(depth);
        this.tweens.add({
          targets: dust,
          x: x + Math.cos(angle) * radius * 0.82,
          y: y + Math.sin(angle) * radius * 0.4,
          scaleX: 1.8,
          scaleY: 1.8,
          alpha: 0,
          duration: 480,
          ease: "Cubic.easeOut",
          onComplete: () => dust.destroy(),
        });
      }
      return;
    }
    if (enemy.definition.kind !== "boar") return;
    const fissure = this.add.graphics().setDepth(depth);
    fissure.lineStyle(3, 0xffc56b, 0.9);
    for (let branch = 0; branch < 4; branch += 1) {
      const angle = (Math.PI * 2 * branch) / 4 + 0.25;
      fissure.beginPath();
      fissure.moveTo(x, y);
      fissure.lineTo(x + Math.cos(angle) * radius * 0.4, y + Math.sin(angle) * radius * 0.18);
      fissure.lineTo(x + Math.cos(angle + 0.18) * radius * 0.78, y + Math.sin(angle + 0.18) * radius * 0.36);
      fissure.strokePath();
    }
    this.tweens.add({ targets: fissure, alpha: 0, duration: 560, ease: "Quad.easeIn", onComplete: () => fissure.destroy() });
    this.cameras.main.shake(80, 0.0015);
  }

  private applyWorldEventReward(data: any) {
    const gold = Math.max(0, Math.floor(Number(data.reward?.gold) || 0));
    const xp = Math.max(0, Math.floor(Number(data.reward?.xp) || 0));
    const combatStyle: CombatStyle = data.combatStyle === "range" || data.combatStyle === "magic" ? data.combatStyle : "melee";
    const profileAuthoritative = this.profileMode === "supabase" && Boolean(data.profileAuthoritative);
    if (!profileAuthoritative) {
      this.addXp(combatSkillForStyle(combatStyle), xp);
      this.addXp("hitpoints", Math.ceil(xp * 0.25));
      this.progress = {
        ...this.progress,
        gold: this.progress.gold + gold,
        activities: recordActivity(this.progress.activities, "event"),
      };
    }
    this.callbacks.onToast({
      title: "Public event reward",
      detail: `${data.eventName ?? "World event"} • +${gold} gold • +${xp} XP`,
      tone: "loot",
    });
    this.emitHud({
      message: `Contribution accepted: ${Math.max(0, Math.floor(Number(data.contributionDamage) || 0))} damage. +${gold} gold and +${xp} XP.`,
    });
  }

  private applyPartyAssistReward(data: any) {
    const gold = Math.max(0, Math.floor(Number(data.reward?.gold) || 0));
    const xp = Math.max(0, Math.floor(Number(data.reward?.xp) || 0));
    const combatStyle: CombatStyle = data.combatStyle === "range" || data.combatStyle === "magic" ? data.combatStyle : "melee";
    const profileAuthoritative = this.profileMode === "supabase" && Boolean(data.profileAuthoritative);
    const definition = ENEMIES.find((enemy) => enemy.id === data.enemyId);
    const enemyName = definition?.name ?? data.enemyName ?? "Creature";
    if (!profileAuthoritative) {
      this.addXp(combatSkillForStyle(combatStyle), xp);
      this.addXp("hitpoints", Math.ceil(xp * 0.25));
      this.progress = {
        ...this.progress,
        gold: this.progress.gold + gold,
        questStep: definition
          ? questStepAfterCombat(this.progress.questStep, definition, combatStyle)
          : this.progress.questStep,
        activities: definition
          ? recordActivity(this.progress.activities, "combat", 1, definition.kind)
          : this.progress.activities,
        sideQuests: definition
          ? advanceSideQuests(this.progress.sideQuests, "combat", definition.kind, definition.id)
          : this.progress.sideQuests,
      };
      if (definition) this.progress = { ...this.progress, activities: recordLifetimeTarget(this.progress.activities, definition.id) };
    }
    this.callbacks.onToast({
      title: "Party assist",
      detail: `${enemyName} • +${gold} gold • +${xp} XP`,
      tone: "loot",
    });
    this.emitHud({ message: `Your party defeated ${enemyName}. Assist credit awarded.` });
  }

  private applyExpeditionReward(data: any) {
    const reward = {
      gold: Math.max(0, Math.floor(Number(data.reward?.gold) || 0)),
      defenseXp: Math.max(0, Math.floor(Number(data.reward?.defenseXp) || 0)),
      hitpointsXp: Math.max(0, Math.floor(Number(data.reward?.hitpointsXp) || 0)),
      itemId: typeof data.reward?.itemId === "string" ? data.reward.itemId : "healing-potion",
      quantity: Math.max(1, Math.floor(Number(data.reward?.quantity) || 1)),
      guildRenown: Math.max(0, Math.floor(Number(data.reward?.guildRenown) || 0)),
    };
    const rewardedGuild = normalizeGuildMembership(data.guild);
    const profileAuthoritative = this.profileMode === "supabase" && Boolean(data.profileAuthoritative);
    if (!profileAuthoritative) {
      this.addXp("defense", reward.defenseXp);
      this.addXp("hitpoints", reward.hitpointsXp);
      this.progress = {
        ...this.progress,
        gold: this.progress.gold + reward.gold,
        guild: rewardedGuild ?? (this.progress.guild && reward.guildRenown > 0
          ? { ...this.progress.guild, renown: Math.min(100_000, this.progress.guild.renown + reward.guildRenown) }
          : this.progress.guild),
        inventory: {
          ...this.progress.inventory,
          [reward.itemId]: (this.progress.inventory[reward.itemId] ?? 0) + reward.quantity,
        },
      };
    } else if (rewardedGuild) {
      this.progress = { ...this.progress, guild: rewardedGuild };
    }
    this.callbacks.onToast({
      title: `${data.expeditionName ?? "Expedition"} complete`,
      detail: `+${reward.gold} gold • +${reward.defenseXp} Defense XP${rewardedGuild && reward.guildRenown ? ` • +${reward.guildRenown} guild renown` : ""} • ${itemById(reward.itemId)?.name ?? "Supply"} x${reward.quantity}`,
      tone: "quest",
      itemId: reward.itemId,
    });
    this.emitHud({ message: "Cooperative expedition complete. Contribution reward awarded." });
  }

  private featuredWorldEventState(): WorldEventState | null {
    const rotation = publicEventRotation();
    const definition = ENEMIES.find((enemy) => enemy.id === rotation.event.enemyId);
    if (!definition) return null;
    const runtime = this.enemyRuntime.get(definition.id);
    return {
      id: definition.id,
      name: rotation.event.name,
      location: rotation.event.location,
      region: rotation.event.region,
      rally: rotation.event.rally,
      accent: rotation.event.accent,
      level: definition.level,
      hp: runtime?.hp ?? definition.maxHp,
      maxHp: definition.maxHp,
      respawnAt: runtime?.respawnAt ?? 0,
      endsAt: rotation.endsAt,
    };
  }

  private syncFeaturedWorldEvent() {
    const rotation = publicEventRotation();
    if (rotation.slot === this.publicEventSlot) return;
    this.publicEventSlot = rotation.slot;
    const state = this.featuredWorldEventState();
    this.emitHud({ worldEvent: state }, false);
    if (!state) return;
    this.callbacks.onToast({
      title: `Rally: ${state.region}`,
      detail: `${state.name} is now the featured public encounter.`,
      tone: "quest",
    });
    this.emitHud({ message: `${state.name} has become the featured public encounter at ${state.location}.` }, false);
  }

  private applyWorldEventAnnouncement(data: any) {
    const event = data?.event;
    if (!event || typeof event.name !== "string") return;
    this.emitHud({ worldEvent: this.featuredWorldEventState() }, false);
    if (data.status === "active") {
      this.callbacks.onToast({
        title: "Public event active",
        detail: `${event.name} has appeared at ${event.location ?? "Southroad"}.`,
        tone: "quest",
      });
      return;
    }
    if (data.status === "complete") {
      const participants = Math.max(1, Math.floor(Number(event.participantCount) || 1));
      this.callbacks.onToast({
        title: "Public event complete",
        detail: `${event.name} defeated by ${participants} eligible adventurer${participants === 1 ? "" : "s"}.`,
        tone: "loot",
      });
    }
  }

  private applyChatMessage(data: any, showBubble: boolean) {
    const source = data?.chat;
    const text = typeof source?.text === "string" ? source.text.trim().slice(0, 160) : "";
    if (!text) return;
    const playerId = typeof source.playerId === "string" ? source.playerId : null;
    const message: ChatMessage = {
      id: typeof source.id === "string" ? source.id : `chat-${Date.now()}-${Math.random()}`,
      playerId,
      name: typeof source.name === "string" ? source.name.slice(0, 24) : "Adventurer",
      text,
      at: Math.max(0, Number(source.at) || Date.now()),
      kind: source.kind === "party" || source.kind === "guild" ? source.kind : "player",
      tag: typeof source.tag === "string" ? source.tag.slice(0, 5) : undefined,
    };
    this.callbacks.onChat(message);
    if (showBubble && playerId) this.showChatBubble(playerId, text);
  }

  private showChatBubble(playerId: string, message: string) {
    const target = playerId === this.playerId
      ? { x: this.playerPos.x, y: this.playerPos.y }
      : this.remotes.get(playerId)?.hero;
    if (!target) return;

    this.chatBubbles.get(playerId)?.destroy(true);
    const label = this.add
      .text(0, -8, message, {
        fontFamily: "Verdana, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#f4e5ba",
        align: "center",
        wordWrap: { width: 150, useAdvancedWrap: true },
        resolution: 2,
      })
      .setOrigin(0.5, 1);
    const width = Math.min(168, Math.max(54, label.width + 18));
    const height = label.height + 16;
    const backing = this.add.graphics();
    backing.fillStyle(0x121912, 0.94).fillRoundedRect(-width / 2, -height, width, height, 5);
    backing.lineStyle(1, 0xd0ad5a, 0.8).strokeRoundedRect(-width / 2, -height, width, height, 5);
    backing.fillStyle(0x121912, 0.94).fillTriangle(-6, 0, 6, 0, 0, 7);
    const bubble = this.add
      .container(target.x, target.y - 69, [backing, label])
      .setDepth(target.y + 80)
      .setAlpha(0)
      .setScale(0.92);
    this.chatBubbles.set(playerId, bubble);
    this.tweens.add({ targets: bubble, alpha: 1, scale: 1, duration: 140, ease: "Back.easeOut" });
    this.time.delayedCall(4_800, () => {
      if (this.chatBubbles.get(playerId) !== bubble) return;
      this.tweens.add({
        targets: bubble,
        alpha: 0,
        y: bubble.y - 8,
        duration: 220,
        onComplete: () => {
          if (this.chatBubbles.get(playerId) === bubble) this.chatBubbles.delete(playerId);
          bubble.destroy(true);
        },
      });
    });
  }

  private showAmbientBark(citizen: AmbientCitizenRuntime) {
    const message = Phaser.Utils.Array.GetRandom(citizen.definition.barks);
    citizen.nextBarkAt = Date.now() + Phaser.Math.Between(18_000, 32_000);
    const label = this.add
      .text(0, -7, message, {
        fontFamily: "Georgia, serif",
        fontSize: "10px",
        fontStyle: "italic",
        color: "#e6ddc5",
        align: "center",
        wordWrap: { width: 142, useAdvancedWrap: true },
        resolution: 2,
      })
      .setOrigin(0.5, 1);
    const width = Math.min(160, Math.max(62, label.width + 18));
    const height = label.height + 15;
    const backing = this.add.graphics();
    backing.fillStyle(0x172019, 0.9).fillRoundedRect(-width / 2, -height, width, height, 5);
    backing.lineStyle(1, 0x8e9c78, 0.66).strokeRoundedRect(-width / 2, -height, width, height, 5);
    backing.fillStyle(0x172019, 0.9).fillTriangle(-5, 0, 5, 0, 0, 6);
    const container = this.add
      .container(citizen.hero.x, citizen.hero.y - 65, [backing, label])
      .setDepth(citizen.hero.y + 76)
      .setAlpha(0)
      .setScale(0.94);
    this.ambientBubbles.set(citizen.definition.id, { container, target: citizen.hero });
    this.tweens.add({ targets: container, alpha: 0.92, scale: 1, duration: 170, ease: "Back.easeOut" });
    this.time.delayedCall(4_200, () => {
      if (this.ambientBubbles.get(citizen.definition.id)?.container !== container) return;
      this.tweens.add({
        targets: container,
        alpha: 0,
        y: container.y - 6,
        duration: 240,
        onComplete: () => {
          if (this.ambientBubbles.get(citizen.definition.id)?.container === container) {
            this.ambientBubbles.delete(citizen.definition.id);
          }
          container.destroy(true);
        },
      });
    });
  }

  private updateChatBubbles() {
    this.chatBubbles.forEach((bubble, playerId) => {
      const target = playerId === this.playerId
        ? { x: this.playerPos.x, y: this.playerPos.y }
        : this.remotes.get(playerId)?.hero;
      if (!target) return;
      bubble.setPosition(target.x, target.y - 69).setDepth(target.y + 80);
    });
    this.ambientBubbles.forEach((runtime) => {
      runtime.container.setPosition(runtime.target.x, runtime.target.y - 65).setDepth(runtime.target.y + 76);
    });
  }

  private playEnemyProjectile(enemy: EnemyRuntime, targetPlayerId: unknown) {
    const remote = typeof targetPlayerId === "string" ? this.remotes.get(targetPlayerId) : null;
    const targetX = targetPlayerId === this.playerId ? this.playerPos.x : remote?.hero.x;
    const targetY = targetPlayerId === this.playerId ? this.playerPos.y : remote?.hero.y;
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;
    const isDrake = enemy.definition.kind === "drake";
    const launchY = enemy.definition.y - (isDrake ? 50 : 28);
    const angle = Phaser.Math.Angle.Between(enemy.definition.x, launchY, targetX!, targetY! - 22);
    const ranged = enemy.definition.attackStyle === "range" && !isDrake;
    const bolt = isDrake
      ? this.add
          .sprite(enemy.definition.x, launchY, FIREBALL_KEY, 0)
          .setScale(1.62)
          .setRotation(angle)
          .setDepth(Math.max(enemy.sprite.depth, targetY!) + 9)
          .play("ore-fireball-flight")
      : ranged
      ? this.add
          .image(enemy.definition.x, launchY, ARROW_KEY)
          .setScale(0.82)
          .setRotation(angle)
          .setDepth(Math.max(enemy.sprite.depth, targetY!) + 9)
      : this.add
          .sprite(enemy.definition.x, launchY, ARCANE_BOLT_KEY, 0)
          .setScale(1.18)
          .setRotation(angle)
          .setDepth(Math.max(enemy.sprite.depth, targetY!) + 9)
          .play("ore-arcane-bolt-flight");
    this.tweens.add({
      targets: bolt,
      x: targetX!,
      y: targetY! - 22,
      duration: isDrake ? 380 : 300,
      ease: "Cubic.easeIn",
      onComplete: () => {
        if (ranged) {
          const impact = this.add
            .ellipse(targetX!, targetY! - 7, 16, 7)
            .setStrokeStyle(2, 0xc8ef82, 0.9)
            .setDepth(Math.max(enemy.sprite.depth, targetY!) + 10);
          this.tweens.add({ targets: impact, scale: 1.7, alpha: 0, duration: 220, onComplete: () => impact.destroy() });
          bolt.destroy();
          return;
        }
        if (isDrake) {
          const impact = this.add
            .sprite(targetX!, targetY! - 20, ANSIMUZ_FIRE_BOMB_KEY, 0)
            .setScale(1.18)
            .setDepth(Math.max(enemy.sprite.depth, targetY!) + 10)
            .play("ore-ansimuz-fire-bomb");
          impact.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => impact.destroy());
          this.cameras.main.shake(85, 0.0016);
          bolt.destroy();
          return;
        }
        const impact = this.add
          .sprite(targetX!, targetY! - 22, MAGIC_SPARKS_KEY, 0)
          .setScale(1.48)
          .setDepth(Math.max(enemy.sprite.depth, targetY!) + 10)
          .play("ore-magic-sparks-impact");
        impact.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => impact.destroy());
        bolt.destroy();
      },
    });
  }

  private applyResourceState(data: any, initial = false) {
    const state = data?.resource;
    const resource = this.resourceRuntime.get(state?.id);
    if (!resource) return;

    resource.available = Boolean(state.available);
    resource.claimedBy = typeof state.claimedBy === "string" ? state.claimedBy : null;
    resource.respawnAt = Math.max(0, Number(state.respawnAt) || 0);
    const regionalActive = worldAreaAtY(resource.definition.y) === this.activeWorldArea;

    if (resource.available) {
      this.tweens.killTweensOf(resource.sprite);
      resource.sprite.setVisible(regionalActive).setAlpha(1).setScale(resource.definition.scale);
      if (regionalActive) resource.hitZone.setInteractive({ useHandCursor: true });
      else if (resource.hitZone.input) resource.hitZone.input.enabled = false;
      resource.plate.setVisible(regionalActive).setAlpha(1).setScale(1);
      this.animateResource(resource);
      if (!regionalActive) this.setTweenActivity(resource.sprite, false);
      return;
    }

    resource.hitZone.disableInteractive();
    this.tweens.killTweensOf(resource.sprite);
    resource.sprite.setAngle(0).setScale(resource.definition.scale);
    if (resource.claimedBy) {
      resource.sprite.setVisible(regionalActive).setAlpha(resource.claimedBy === this.playerId ? 1 : 0.48);
      resource.plate.setAlpha(resource.claimedBy === this.playerId ? 1 : 0.45);
      if (resource.claimedBy === this.playerId && this.activeResourceId === resource.definition.id) {
        const endsAt = Math.max(Date.now() + 1, Number(state.completeAt) || Date.now() + 1);
        this.startGatheringVisuals(resource, endsAt - Date.now(), endsAt);
      }
      return;
    }

    if (initial) {
      resource.sprite.setVisible(false).setAlpha(0);
      resource.plate.setVisible(false).setAlpha(0);
    } else {
      this.tweens.add({
        targets: resource.sprite,
        alpha: 0,
        scaleX: resource.definition.scale * 0.75,
        scaleY: resource.definition.scale * 0.75,
        duration: 240,
        onComplete: () => {
          resource.sprite.setVisible(false);
        },
      });
      this.tweens.add({
        targets: resource.plate,
        alpha: 0,
        scaleX: 0.75,
        scaleY: 0.75,
        duration: 240,
        onComplete: () => resource.plate.setVisible(false),
      });
    }
  }

  private applyGatheringReward(data: any) {
    if (data.playerId !== this.playerId) return;
    const resource = this.resourceRuntime.get(data.resourceId);
    if (!resource || this.activeResourceId !== resource.definition.id) return;
    const reward = {
      gold: Math.max(0, Number(data.reward?.gold) || 0),
      xp: Math.max(0, Number(data.reward?.xp) || 0),
      itemId: typeof data.reward?.itemId === "string" ? data.reward.itemId : this.resourceItemId(resource),
    };
    this.finishGathering(
      resource,
      reward,
      true,
      this.profileMode === "supabase" && Boolean(data.profileAuthoritative),
    );
  }

  private handleActionError(data: any) {
    if (data.action === "region") {
      if (typeof data.regionId === "string") this.pendingRegionDiscoveries.delete(data.regionId);
      else this.pendingRegionDiscoveries.clear();
      this.emitHud({ message: typeof data.message === "string" ? data.message : "That region could not be recorded." }, false);
      return;
    }
    if (data.action === "chat") {
      this.callbacks.onChat({
        id: `chat-error-${Date.now()}`,
        playerId: null,
        name: "System",
        text: typeof data.message === "string" ? data.message : "That message could not be sent.",
        at: Date.now(),
        kind: "system",
      });
      return;
    }
    if (data.action === "party" || data.action === "guild") {
      this.emitHud({ message: typeof data.message === "string" ? data.message : "That party action could not be completed." }, false);
      return;
    }
    if (data.action === "combat" && data.retryable) {
      this.awaitingCombatResponse = false;
      const treeAbility = data.treeAbility ? SKILL_TREE_NODES.find((entry) => entry.id === data.abilityId) : null;
      if (treeAbility && Number(data.readyAt) > Date.now()) {
        this.abilityCooldowns = {
          ...this.abilityCooldowns,
          treeReadyAt: { ...this.abilityCooldowns.treeReadyAt, [treeAbility.id]: Number(data.readyAt) },
        };
        this.emitHud({ abilityCooldowns: this.abilityCooldowns, message: typeof data.message === "string" ? data.message : "That skill is cooling down." }, false);
      } else if (data.abilityId && Number(data.readyAt) > Date.now()) {
        this.abilityCooldowns = { ...this.abilityCooldowns, signatureReadyAt: Number(data.readyAt) };
        this.emitHud({ abilityCooldowns: this.abilityCooldowns, message: typeof data.message === "string" ? data.message : "That ability is cooling down." }, false);
      } else {
        this.emitHud({ message: typeof data.message === "string" ? data.message : "Move back into range to continue attacking." }, false);
      }
      return;
    }
    if (data.action === "ability") {
      if (data.abilityId === "second-wind" && Number(data.readyAt) > Date.now()) {
        this.abilityCooldowns = { ...this.abilityCooldowns, secondWindReadyAt: Number(data.readyAt) };
      }
      this.emitHud({
        abilityCooldowns: this.abilityCooldowns,
        message: typeof data.message === "string" ? data.message : "That ability is not ready.",
      }, false);
      return;
    }
    this.actionTimer?.remove(false);
    this.actionTimer = null;
    this.finishAction(typeof data.message === "string" ? data.message : "That action could not be completed.");
  }

  private isRealtimeOnline() {
    return this.ws?.readyState === WebSocket.OPEN && Boolean(this.playerId);
  }

  private useAuthoritativeProfileAction(payload: Record<string, unknown>, pendingMessage: string) {
    if (this.profileMode !== "supabase") return false;
    if (!this.isRealtimeOnline()) {
      this.emitHud({ message: "Reconnect before changing your saved adventurer." });
      return true;
    }
    this.ws!.send(JSON.stringify({ type: "rpg_profile_action", ...payload }));
    this.emitHud({ message: pendingMessage }, false);
    return true;
  }

  private upsertRemote(remote: RemotePlayer) {
    if (!remote || remote.id === this.playerId) return;
    const appearance = remote.appearance ?? "vanguard";
    const customization = remote.customization ?? customizationForAppearance(appearance);
    const equipped = remote.equipped ?? DEFAULT_REMOTE_EQUIPMENT;
    const action = remote.action ?? "idle";
    const direction = remote.direction ?? "down";
    let entity = this.remotes.get(remote.id);
    if (!entity) {
      const shadow = this.createActorShadow(remote.x, remote.y, 25, 8, 0.3);
      const socialRing = this.add.ellipse(remote.x, remote.y + 1, 38, 15).setStrokeStyle(2, 0x82d379, 0.9).setVisible(false).setDepth(remote.y - 0.5);
      const hero = new LayeredHero(this, remote.x, remote.y, appearance, equipped, customization).setAlpha(0.88);
      const name = this.add.text(remote.x, remote.y - 44, remote.name || "Adventurer", nameStyle("#a9d9ff")).setOrigin(0.5, 1);
      entity = { hero, shadow, name, targetX: remote.x, targetY: remote.y, direction, action, appearance, customization, equipped, totalLevel: Math.max(10, Number(remote.totalLevel) || 10), guild: normalizeGuildMembership(remote.guild), displayName: remote.name || "Adventurer", socialRing };
      this.remotes.set(remote.id, entity);
    } else if (entity.appearance !== appearance) {
      entity.appearance = appearance;
      entity.hero.setAppearance(appearance);
    }
    if (remote.name) entity.displayName = remote.name;
    if (Number.isFinite(Number(remote.totalLevel))) entity.totalLevel = Math.max(10, Number(remote.totalLevel));
    if (remote.guild !== undefined) entity.guild = normalizeGuildMembership(remote.guild);
    if (customizationKey(entity.customization) !== customizationKey(customization)) {
      entity.customization = customization;
      entity.hero.setCustomization(customization);
    }
    if (
      entity.equipped.weapon !== equipped.weapon ||
      entity.equipped.tool !== equipped.tool ||
      entity.equipped.armor !== equipped.armor
    ) {
      entity.equipped = equipped;
      entity.hero.setLoadout(equipped);
    }
    entity.targetX = remote.x;
    entity.targetY = remote.y;
    entity.action = action;
    entity.direction = direction;
    this.refreshSocialWorldIndicators();
    this.emitSocialRoster();
    this.emitHud({}, false);
  }

  private emitSocialRoster() {
    const online: OnlineAdventurer[] = [];
    if (this.playerId) {
      online.push({
        id: this.playerId,
        name: this.displayName,
        totalLevel: Object.values(this.progress.skills).reduce((sum, skill) => sum + skill.level, 0),
        appearance: this.progress.appearance,
        customization: this.progress.customization,
        equipped: this.progress.equipped,
        guild: this.progress.guild,
        x: this.playerPos.x,
        y: this.playerPos.y,
      });
    }
    this.remotes.forEach((remote, id) => {
      online.push({
        id,
        name: remote.displayName,
        totalLevel: remote.totalLevel,
        appearance: remote.appearance,
        customization: remote.customization,
        equipped: remote.equipped,
        guild: remote.guild,
        x: remote.targetX,
        y: remote.targetY,
      });
    });
    this.callbacks.onSocial({ selfId: this.playerId, online });
  }

  private updateRemotes(delta: number) {
    const amount = Math.min(1, delta / 90);
    this.remotes.forEach((remote) => {
      const regionalActive = worldAreaAtY(remote.targetY) === this.activeWorldArea;
      remote.hero.setSimulationActive(regionalActive);
      remote.shadow.setVisible(regionalActive);
      remote.socialRing.setVisible(regionalActive);
      remote.name.setVisible(regionalActive);
      if (!regionalActive) return;
      const previousX = remote.hero.x;
      const previousY = remote.hero.y;
      const x = Phaser.Math.Linear(remote.hero.x, remote.targetX, amount);
      const y = Phaser.Math.Linear(remote.hero.y, remote.targetY, amount);
      remote.hero.setPosition(x, y).setDepth(y + 2);
      remote.shadow.setPosition(x, y + 1).setDepth(y - 1);
      remote.socialRing.setPosition(x, y + 1).setDepth(y - 0.5);
      remote.name.setPosition(x, y - 44).setDepth(y + 4);
      const movedX = x - previousX;
      const movedY = y - previousY;
      if (Math.abs(movedX) > 0.05 || Math.abs(movedY) > 0.05) {
        const direction = Math.abs(movedX) > Math.abs(movedY) ? (movedX > 0 ? "right" : "left") : movedY > 0 ? "down" : "up";
        remote.direction = direction;
        remote.hero.play("walk", direction);
      }
      else if (Phaser.Math.Distance.Between(x, y, remote.targetX, remote.targetY) < 1) {
        const style = itemById(remote.equipped.weapon)?.combatStyle ?? "melee";
        const visualAction: HeroVisualAction =
          remote.action === "attack"
            ? style === "range"
              ? "range"
              : style === "magic"
                ? "magic"
                : "melee"
            : remote.action === "attune"
              ? "channel"
              : remote.action === "mine" || remote.action === "chop" || remote.action === "fish"
                ? remote.action
                : remote.action === "gather"
                  ? "mine"
                  : "idle";
        remote.hero.play(visualAction, remote.direction);
      }
    });
  }

  private removeRemote(playerId: string) {
    const remote = this.remotes.get(playerId);
    remote?.hero.destroy();
    remote?.shadow.destroy();
    remote?.socialRing.destroy();
    remote?.name.destroy();
    this.chatBubbles.get(playerId)?.destroy(true);
    this.chatBubbles.delete(playerId);
    this.remotes.delete(playerId);
    this.refreshSocialWorldIndicators();
    this.emitSocialRoster();
    this.emitHud({}, false);
  }

  private refreshSocialWorldIndicators() {
    const partyIds = new Set(this.partyState?.members.map((member) => member.id) ?? []);
    const ownGuildId = this.progress.guild?.id ?? null;
    const ownGuildTag = this.progress.guild?.tag;
    if (this.playerName) {
      this.playerName.setText(`${ownGuildTag ? `[${ownGuildTag}] ` : ""}${this.displayName}`);
      this.playerName.setColor(this.partyState ? "#fff0b0" : ownGuildId ? "#8fd2ff" : "#fff0b0");
    }
    this.remotes.forEach((remote, id) => {
      const isParty = partyIds.has(id);
      const isGuildmate = Boolean(ownGuildId && remote.guild?.id === ownGuildId);
      remote.socialRing.setVisible(isParty);
      remote.socialRing.setStrokeStyle(2, isParty ? 0x8cdb75 : 0x6bb8e8, 0.9);
      remote.name.setText(`${remote.guild?.tag ? `[${remote.guild.tag}] ` : ""}${remote.displayName}`);
      remote.name.setColor(isParty ? "#a9ed91" : isGuildmate ? "#8fd2ff" : "#a9d9ff");
    });
  }

  private cleanup() {
    if (this.disposed) return;
    this.progress = { ...this.progress, position: { x: this.playerPos.x, y: this.playerPos.y } };
    if (this.profileMode !== "supabase") savePlayerProgress(this.progress);
    this.disposed = true;
    this.actionTimer?.remove(false);
    this.gatheringAudioTimer?.remove(false);
    this.destroyFishingFx();
    this.chatBubbles.forEach((bubble) => bubble.destroy(true));
    this.chatBubbles.clear();
    this.ambientBubbles.forEach((runtime) => runtime.container.destroy(true));
    this.ambientBubbles.clear();
    this.enemyTelegraphs.forEach((telegraph) => telegraph.destroy(true));
    this.enemyTelegraphs.clear();
    this.sideQuestMarkers.forEach((marker) => marker.destroy(true));
    this.sideQuestMarkers.clear();
    this.publicEventMarker?.destroy(true);
    this.publicEventMarker = null;
    this.incomingCast = null;
    this.ambientCitizens.forEach((citizen) => {
      citizen.hero.destroy();
      citizen.shadow.destroy();
      citizen.hitZone.destroy();
    });
    this.ambientCitizens = [];
    this.regionalAtmosphere.clear();
    this.ws?.close();
    this.ws = null;
  }

  private animateResource(resource: ResourceRuntime) {
    const { definition, sprite } = resource;
    this.tweens.killTweensOf(sprite);
    sprite.setPosition(definition.x, definition.y).setAngle(0).setAlpha(1).setScale(definition.scale);
    const visualColor = resourceVisualColor(definition.itemId);
    if (visualColor !== 0xffffff) sprite.setTint(visualColor);
    else sprite.clearTint();
    if (definition.kind === "tree") {
      sprite.setAngle(-0.28);
      this.tweens.add({
        targets: sprite,
        angle: 0.28,
        duration: 1900 + definition.frame * 120,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1,
      });
      return;
    }
    const isSunstoneVein = definition.itemId === "sunstone-ore";
    const scaleAmount = isSunstoneVein ? 1.045 : definition.kind === "relic" ? 1.055 : definition.kind === "ore" ? 1.018 : 1.04;
    const minimumAlpha = isSunstoneVein ? 0.82 : definition.kind === "relic" ? 0.72 : definition.kind === "ore" ? 0.9 : 0.68;
    this.tweens.add({
      targets: sprite,
      alpha: minimumAlpha,
      scaleX: definition.scale * scaleAmount,
      scaleY: definition.scale * scaleAmount,
      duration: isSunstoneVein ? 880 : definition.kind === "relic" ? 760 : definition.kind === "ore" ? 1250 : 900,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private createActorShadow(x: number, y: number, width: number, height: number, alpha: number) {
    return this.add.ellipse(x, y + 1, width, height, 0x07100b, alpha).setDepth(y - 1);
  }
}

function normalizeEnemyStatus(value: unknown): EnemyStatusState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<EnemyStatusState>;
  const kinds = new Set<EnemyStatusState["kind"]>(["stagger", "slow", "root", "weaken"]);
  const expiresAt = Number(candidate.expiresAt);
  if (!candidate.kind || !kinds.has(candidate.kind) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  return {
    kind: candidate.kind,
    label: typeof candidate.label === "string" ? candidate.label.slice(0, 24) : candidate.kind,
    expiresAt,
    strength: Phaser.Math.Clamp(Number(candidate.strength) || 0, 0, 0.8),
  };
}

function abilityDamage(
  baseDamage: number,
  ability: ReturnType<typeof weaponAbility>,
  enemyHp: number,
  enemyMaxHp: number,
) {
  const healthRatio = enemyMaxHp > 0 ? enemyHp / enemyMaxHp : 1;
  let multiplier = ability.multiplier;
  if (ability.openingMultiplier && healthRatio >= 0.85) multiplier *= ability.openingMultiplier;
  if (ability.executeThreshold && ability.executeMultiplier && healthRatio <= ability.executeThreshold) {
    multiplier *= ability.executeMultiplier;
  }
  return Math.max(1, Math.ceil(baseDamage * multiplier));
}

function applyLocalSkillTreeDamage(
  baseDamage: number,
  bonuses: ReturnType<typeof skillTreeBonuses>,
  enemyHp: number,
  enemyMaxHp: number,
) {
  const healthRatio = enemyMaxHp > 0 ? enemyHp / enemyMaxHp : 1;
  const executeMultiplier = bonuses.executeThreshold > 0 && healthRatio <= bonuses.executeThreshold
    ? bonuses.executeMultiplier
    : 1;
  return Math.max(1, Math.ceil(baseDamage * bonuses.damageMultiplier * executeMultiplier));
}

function customizationKey(customization: CharacterCustomization) {
  return Object.values(customization).join(":");
}

function enemyShadowSize(kind: EnemyDefinition["kind"]) {
  if (kind === "rat") return { width: 18, height: 6 };
  if (kind === "wolf") return { width: 28, height: 9 };
  if (kind === "drake") return { width: 48, height: 14 };
  if (kind === "dune-stalker") return { width: 42, height: 12 };
  if (kind === "boar") return { width: 40, height: 12 };
  if (kind === "slime") return { width: 25, height: 8 };
  if (kind === "orc") return { width: 30, height: 10 };
  if (kind === "lizard") return { width: 27, height: 9 };
  if (kind === "skeleton") return { width: 22, height: 7 };
  if (kind === "witch") return { width: 25, height: 8 };
  if (kind === "treant") return { width: 62, height: 16 };
  return { width: 24, height: 8 };
}

function enemyPalette(id: string) {
  if (id === "briar-wolf-1") return 0xa1c49b;
  if (id === "briar-wolf-2") return 0x739b78;
  if (id === "bog-slime-1") return 0x83bb91;
  if (id === "bog-slime-2") return 0x587c6c;
  if (id === "sunbone-guardian") return 0xffd887;
  if (id === "fallen-ranger") return 0xa8ddff;
  if (id === "moonfen-hexer") return 0xc49aff;
  if (id === "briar-bonecaller") return 0xd17aff;
  if (id === "emberbone-marksman") return 0xffb95e;
  if (id === "cryptflame-channeler") return 0xff8a5c;
  if (id === "moonfen-stalker-1") return 0x7faaa4;
  if (id === "frostmere-icewolf-1") return 0xb9eaff;
  return 0xffffff;
}

function appearanceName(appearance: AppearanceId) {
  if (appearance === "ranger") return "Oakbound Ranger";
  if (appearance === "arcanist") return "Moonspark Arcanist";
  if (appearance === "stonewarden") return "Stonewarden";
  if (appearance === "marshborn") return "Marshborn Mystic";
  return "Sunward Vanguard";
}

function rollLocalLoot(enemyId: string) {
  const roll = Math.random();
  let threshold = 0;
  const table = RPG_LOOT_RULES[enemyId as keyof typeof RPG_LOOT_RULES] ?? [];
  for (const entry of table) {
    threshold += entry.chance;
    if (roll < threshold) return entry.itemId;
  }
  return "";
}

function lootToastTitle(rarity: "common" | "uncommon" | "rare" | "epic" | undefined) {
  if (rarity === "epic") return "Epic drop!";
  if (rarity === "rare") return "Rare drop!";
  if (rarity === "uncommon") return "Uncommon drop";
  return "Loot collected";
}

function combatSkillForStyle(style: CombatStyle): SkillId {
  if (style === "range") return "range";
  if (style === "magic") return "magic";
  return "attack";
}

function combatStyleLabel(style: CombatStyle) {
  if (style === "range") return "Ranged";
  if (style === "magic") return "Arcane";
  return "Melee";
}

function directionToward(fromX: number, fromY: number, targetX: number, targetY: number): Direction {
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

function localCombatDamage(style: CombatStyle, level: number, weaponPower: number) {
  if (style === "range") return Phaser.Math.Between(2, 4) + Math.ceil(level * 0.85) + weaponPower;
  if (style === "magic") return Phaser.Math.Between(3, 6) + level + weaponPower;
  return Phaser.Math.Between(2, 5) + level + weaponPower;
}

function localCombatCritical(level: number, weaponPower: number) {
  const chance = Math.min(0.14, 0.05 + level * 0.0006 + weaponPower * 0.002);
  return Math.random() < chance;
}

function createNameplate(scene: Phaser.Scene, x: number, y: number, name: string, role: string, roleColor: string) {
  const container = scene.add.container(x, y).setDepth(y + 4);
  const nameText = scene.add.text(0, 0, name, nameStyle("#fff1c4")).setOrigin(0.5, 0);
  const roleText = scene.add.text(0, 12, role, nameStyle(roleColor, 7)).setOrigin(0.5, 0);
  container.add([nameText, roleText]);
  return container;
}

function updateNameplate(container: Phaser.GameObjects.Container | Phaser.GameObjects.Text, visible: boolean, detailVisible: boolean) {
  container.setVisible(visible);
  if (!(container instanceof Phaser.GameObjects.Container)) return;
  const detail = container.getAt(1);
  if (detail instanceof Phaser.GameObjects.Text) detail.setVisible(visible && detailVisible);
}

function nameStyle(color: string, fontSize = 8): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "Verdana, sans-serif",
    fontSize: `${fontSize}px`,
    fontStyle: "bold",
    color,
    stroke: "#11150f",
    strokeThickness: 3,
    resolution: 2,
  };
}
