import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { WebSocketServer } from "ws";
import {
  addProfileItem,
  addProfileXp,
  customizationForRpgAppearance,
  createRpgProfileStore,
  normalizeRpgCustomization,
  normalizeRpgGuild,
  normalizeRpgProgress,
  restoreRpgHitpoints,
} from "./rpgProfiles.js";
import {
  hasWorldLineOfSight,
  isWorldPositionWalkable,
  PLAYER_COLLISION_RADIUS,
  watchWorldCollisionLayout,
} from "./worldCollision.js";
import { questStepAfterCombat, questStepAfterCraft, questStepAfterGather } from "./questProgress.js";
import { activityContractCount, DAILY_CONTRACTS, normalizeActivityProgress, recordActivity, recordLifetimeTarget } from "./activityProgress.js";
import { ADVENTURE_CHRONICLES, adventureProgress } from "./adventureProgress.js";
import { advanceSideQuests, sideQuestById } from "./sideQuestProgress.js";
import { featuredRpgPublicEvent, isFeaturedRpgPublicEvent, rpgPublicEventForEnemy } from "./publicEvents.js";
import { sunstoneRevenantAbility } from "./catacombRules.js";
import RPG_LOOT_RULES from "./lootRules.json" with { type: "json" };
import EDITABLE_WORLD_LAYOUT from "./worldLayout.json" with { type: "json" };

const PORT = Number(process.env.PORT || 8080);
const SERVER_STARTED_AT = Date.now();
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const STATE_FILE = process.env.STATE_FILE || path.join(process.cwd(), "ore-acres-state.json");
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SECRET_KEY = (process.env.SUPABASE_SECRET_KEY || "").trim();
const REQUIRE_RPG_AUTH = process.env.REQUIRE_RPG_AUTH === "true";
const RPG_ALLOW_TEST_WARP = process.env.RPG_ALLOW_TEST_WARP === "true";
const ADMIN_API_TOKEN = (process.env.ADMIN_API_TOKEN || "").trim();
const ADMIN_AUDIT_FILE = process.env.ADMIN_AUDIT_FILE || path.join(process.cwd(), "ore-acres-admin-audit.jsonl");
const ADMIN_AUDIT_LIMIT = 200;
const adminAudit = [];
const DEFAULT_PAYMENT_MINT_ADDRESS = "Crfc1ZiazkbLtfVWqVBjzv1NwD64KVuaQfSSKYWL81N8";
const DEFAULT_RESERVE_OWNER_WALLET = "B3VZNSnWYGCZ1ZcydfSKvzjrL1UsYXWG5HTbgHAKaVjX";
const DEFAULT_REWARD_RESERVE_OWNER_WALLET = "39DYX1oRUHCuQg9zFhB5HW8pJ3WhBeNXmZYyzVWf9Cao";
const DEFAULT_OPS_OWNER_WALLET = "GrKAPcrb45WoxdxEwxoXyhbZmLWGoADwNsGGpWNmA4XC";
const PAYMENT_MINT_ADDRESS = process.env.PAYMENT_MINT_ADDRESS || DEFAULT_PAYMENT_MINT_ADDRESS;
const PAYMENT_RESERVE_TOKEN_ACCOUNT =
  process.env.PAYMENT_RESERVE_TOKEN_ACCOUNT || process.env.PAYMENT_TREASURY_TOKEN_ACCOUNT || "";
const PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT =
  process.env.PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT || process.env.PAYMENT_BURN_TOKEN_ACCOUNT || "";
const PAYMENT_OPS_TOKEN_ACCOUNT = process.env.PAYMENT_OPS_TOKEN_ACCOUNT || "";
const PAYMENT_RESERVE_OWNER_WALLET =
  process.env.PAYMENT_RESERVE_OWNER_WALLET || process.env.PAYMENT_TREASURY_OWNER_WALLET || DEFAULT_RESERVE_OWNER_WALLET;
const PAYMENT_REWARD_RESERVE_OWNER_WALLET =
  process.env.PAYMENT_REWARD_RESERVE_OWNER_WALLET ||
  process.env.PAYMENT_BURN_OWNER_WALLET ||
  DEFAULT_REWARD_RESERVE_OWNER_WALLET;
const PAYMENT_OPS_OWNER_WALLET = process.env.PAYMENT_OPS_OWNER_WALLET || DEFAULT_OPS_OWNER_WALLET;
const PAYMENT_RESERVE_BPS = Number(process.env.PAYMENT_RESERVE_BPS || "8000");
const PAYMENT_REWARD_RESERVE_BPS = Number(process.env.PAYMENT_REWARD_RESERVE_BPS || "1000");
const PAYMENT_OPS_BPS = Number(process.env.PAYMENT_OPS_BPS || "1000");
const PAYMENT_TOKEN_PRICE_USD_OVERRIDE = Number(process.env.PAYMENT_TOKEN_PRICE_USD_OVERRIDE || "0");
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";
const BIRDEYE_PRICE_URL = process.env.BIRDEYE_PRICE_URL || "https://public-api.birdeye.so/defi/price";
const WORLD_COLUMNS = 5;
const WORLD_ROWS = 5;
const PLOT_SIZE = 520;
const ROAD_GAP = 170;
const WORLD_PADDING = 100;
const PLOT_WORLD_HEIGHT = WORLD_PADDING * 2 + WORLD_ROWS * PLOT_SIZE + (WORLD_ROWS - 1) * ROAD_GAP;
const TOWN_ID = "starter-town";
const MINE_ID = "dustfall-mine";
const ORE_SPAWN_CHANCE = 0.006;
const ORE_NODE_LIMIT = 1;
const ORE_UNCLAIMED_LIMIT = 1;
const ORE_MINING_MS = {
  small: 6500,
  medium: 11000,
  large: 16500,
};
const ORE_REWARD_RANGE = {
  small: [0.04, 0.07],
  medium: [0.09, 0.15],
  large: [0.22, 0.32],
};
const ORE_RARITY_WEIGHTS = [
  ["small", 74],
  ["medium", 21],
  ["large", 5],
];
const ORE_MINING_GRACE_MS = 5 * 60 * 1000;
const RPG_ENEMY_RESPAWN_MS = 90_000;
const RPG_AGGRO_RANGE_MULTIPLIER = 0.72;
const RPG_RESOURCE_RESPAWN_MS = 30_000;
const RPG_INTERACTION_RANGE = 132;
const RPG_ATTACK_RANGES = { melee: 104, range: 320, magic: 285 };
const RPG_WORLD = { width: 1536, height: 3072 };
const RPG_PLAYER_START = { x: 748, y: 505 };
const RPG_SANCTUARY = { id: "founders-fountain", name: "Founders' Fountain", x: 688, y: 468 };
const RPG_WAYSTONE_RANGE = 112;
const RPG_WAYSTONES = Object.fromEntries([
  { id: "orehaven-gate", name: "Orehaven Waystone", region: "Orehaven", x: 650, y: 820, arrivalX: 698, arrivalY: 820 },
  { id: "moonwater-dock", name: "Moonwater Waystone", region: "Western Woods", x: 282, y: 872, arrivalX: 302, arrivalY: 872 },
  { id: "eastern-quarry", name: "Quarry Waystone", region: "Eastern Quarry", x: 1248, y: 172, arrivalX: 1248, arrivalY: 204 },
  { id: "briarwild-crossing", name: "Briarwild Waystone", region: "Briarwild Crossing", x: 760, y: 1250, arrivalX: 760, arrivalY: 1290 },
  { id: "moonfen-marsh", name: "Moonfen Waystone", region: "Moonfen Marsh", x: 1060, y: 1340, arrivalX: 1096, arrivalY: 1340 },
  { id: "ranger-camp", name: "Ranger Camp Waystone", region: "Briarwild Ranger Camp", x: 246, y: 1640, arrivalX: 266, arrivalY: 1640 },
  { id: "sunstone-catacombs", name: "Catacomb Waystone", region: "Sunstone Catacombs", x: 768, y: 2192, arrivalX: 768, arrivalY: 2228 },
].map((waystone) => [waystone.id, waystone]));
const RPG_DUNGEON_PORTALS = Object.fromEntries([
  { id: "sunstone-descent", name: "Sunstone Descent", region: "Sunstone Catacombs", x: 330, y: 1300, destinationX: 768, destinationY: 2140 },
  { id: "sunstone-ascent", name: "Sunstone Ascent", region: "Old Sun Shrine", x: 768, y: 2104, destinationX: 330, destinationY: 1332 },
].map((portal) => [portal.id, portal]));
const RPG_REGIONS = Object.fromEntries([
  { id: "orehaven", name: "Orehaven" },
  { id: "western-woods", name: "Western Woods" },
  { id: "moonwater-pond", name: "Moonwater Pond" },
  { id: "eastern-quarry", name: "Eastern Quarry" },
  { id: "goblin-camp", name: "Goblin Camp" },
  { id: "southroad", name: "Southroad" },
  { id: "briarwild-crossing", name: "Briarwild Crossing" },
  { id: "old-sun-shrine", name: "Old Sun Shrine" },
  { id: "moonfen-marsh", name: "Moonfen Marsh" },
  { id: "ranger-camp", name: "Briarwild Ranger Camp" },
  { id: "raider-dens", name: "Raider Dens" },
  { id: "sunstone-catacombs", name: "Sunstone Catacombs" },
].map((region) => [region.id, region]));
const RPG_REGION_DISCOVERY_GOLD = 20;
const RPG_REGION_COMPLETION_GOLD = 180;
const RPG_AI_TICK_MS = 250;
const RPG_PLAYER_MOVE_SPEED = 112;
const RPG_APPEARANCES = new Set(["vanguard", "ranger", "arcanist"]);
const RPG_EQUIPMENT_SLOTS = ["weapon", "tool", "armor"];
const RPG_PLAYER_ACTIONS = new Set(["idle", "walk", "attack", "gather", "mine", "chop", "fish", "attune"]);
const RPG_DIRECTIONS = new Set(["up", "left", "down", "right"]);
const RPG_COMBAT_STYLES = new Set(["melee", "range", "magic"]);
const RPG_ENEMY_STATUS_KINDS = new Set(["stagger", "slow", "root", "weaken"]);
const RPG_WEAPON_ABILITIES = {
  "bronze-sword": { id: "shieldbreaker", name: "Shieldbreaker", multiplier: 1.42, cooldownMs: 4_500, status: { kind: "stagger", label: "Staggered", durationMs: 900 } },
  "iron-sword": { id: "iron-tempest", name: "Iron Tempest", multiplier: 1.55, cooldownMs: 5_200, hitCount: 3, status: { kind: "weaken", label: "Weakened", durationMs: 3_500, strength: 0.2 } },
  "rune-blade": { id: "rune-rift", name: "Rune Rift", multiplier: 1.72, cooldownMs: 6_200, status: { kind: "slow", label: "Rift-slowed", durationMs: 4_200, strength: 0.45 } },
  "dusk-sabre": { id: "umbral-rush", name: "Umbral Rush", multiplier: 1.86, cooldownMs: 7_000, status: { kind: "stagger", label: "Dusk-staggered", durationMs: 1_400 } },
  "auric-cleaver": { id: "auric-sunder", name: "Auric Sunder", multiplier: 1.95, cooldownMs: 7_500, executeThreshold: 0.25, executeMultiplier: 1.35 },
  "aurex-sunblade": { id: "dawnfall", name: "Dawnfall", multiplier: 2.08, cooldownMs: 7_800, hitCount: 3, status: { kind: "stagger", label: "Sunstruck", durationMs: 1_800 } },
  "oak-bow": { id: "thorn-volley", name: "Thorn Volley", multiplier: 1.4, cooldownMs: 4_800, hitCount: 3, status: { kind: "slow", label: "Thorn-slowed", durationMs: 2_800, strength: 0.25 } },
  "iron-bow": { id: "deadeye", name: "Deadeye", multiplier: 1.68, cooldownMs: 6_000, openingMultiplier: 1.3 },
  stormbow: { id: "tempest-arrow", name: "Tempest Arrow", multiplier: 1.82, cooldownMs: 6_800, status: { kind: "slow", label: "Storm-slowed", durationMs: 5_000, strength: 0.6 } },
  "fallen-recurve": { id: "ghost-volley", name: "Ghost Volley", multiplier: 1.88, cooldownMs: 7_200, hitCount: 3, status: { kind: "weaken", label: "Haunted", durationMs: 5_000, strength: 0.35 } },
  "ember-staff": { id: "ember-wave", name: "Ember Wave", multiplier: 1.5, cooldownMs: 5_400, status: { kind: "weaken", label: "Scorched", durationMs: 4_000, strength: 0.25 } },
  "arcane-staff": { id: "starfall", name: "Starfall", multiplier: 1.78, cooldownMs: 6_500, status: { kind: "stagger", label: "Starstruck", durationMs: 1_500 } },
  "frostspire-staff": { id: "frost-nova", name: "Frost Nova", multiplier: 1.84, cooldownMs: 6_900, status: { kind: "root", label: "Frozen", durationMs: 2_200 } },
  "bonecaller-focus": { id: "moonbind", name: "Moonbind", multiplier: 1.9, cooldownMs: 7_300, status: { kind: "root", label: "Moonbound", durationMs: 3_000 } },
};
const RPG_SKILL_TREE = {
  whirlwind: { id: "whirlwind", branch: "melee", kind: "active", name: "Whirlwind", requiredLevel: 1, multiplier: 1.05, cooldownMs: 9_000, areaRadius: 112 },
  "tempered-body": { id: "tempered-body", branch: "melee", kind: "passive", name: "Tempered Body", requiredLevel: 3, prerequisite: "whirlwind", passive: { damageReduction: 0.04 } },
  bloodletter: { id: "bloodletter", branch: "melee", kind: "active", name: "Bloodletter", requiredLevel: 5, prerequisite: "tempered-body", multiplier: 0.82, cooldownMs: 11_000, dot: { ticks: 4, intervalMs: 1_000, multiplier: 0.28 } },
  "blade-discipline": { id: "blade-discipline", branch: "melee", kind: "passive", name: "Blade Discipline", requiredLevel: 10, prerequisite: "bloodletter", passive: { damageMultiplier: 1.08 } },
  relentless: { id: "relentless", branch: "melee", kind: "passive", name: "Relentless", requiredLevel: 16, prerequisite: "blade-discipline", passive: { cooldownMultiplier: 0.88 } },
  "wide-arc": { id: "wide-arc", branch: "melee", kind: "passive", name: "Wide Arc", requiredLevel: 23, prerequisite: "relentless", passive: { areaMultiplier: 1.22 } },
  executioner: { id: "executioner", branch: "melee", kind: "passive", name: "Executioner", requiredLevel: 31, prerequisite: "wide-arc", passive: { executeThreshold: 0.3, executeMultiplier: 1.22 } },
  unyielding: { id: "unyielding", branch: "melee", kind: "passive", name: "Unyielding", requiredLevel: 40, prerequisite: "executioner", passive: { damageMultiplier: 1.07, damageReduction: 0.05 } },
  "arrow-rain": { id: "arrow-rain", branch: "range", kind: "active", name: "Arrow Rain", requiredLevel: 1, multiplier: 0.92, cooldownMs: 10_000, areaRadius: 144 },
  "steady-hands": { id: "steady-hands", branch: "range", kind: "passive", name: "Steady Hands", requiredLevel: 3, prerequisite: "arrow-rain", passive: { damageMultiplier: 1.06 } },
  "venom-shot": { id: "venom-shot", branch: "range", kind: "active", name: "Venom Shot", requiredLevel: 5, prerequisite: "steady-hands", multiplier: 0.72, cooldownMs: 12_000, dot: { ticks: 5, intervalMs: 900, multiplier: 0.24 } },
  "toxin-lore": { id: "toxin-lore", branch: "range", kind: "passive", name: "Toxin Lore", requiredLevel: 10, prerequisite: "venom-shot", passive: { dotMultiplier: 1.25 } },
  "rapid-nocking": { id: "rapid-nocking", branch: "range", kind: "passive", name: "Rapid Nocking", requiredLevel: 16, prerequisite: "toxin-lore", passive: { cooldownMultiplier: 0.86 } },
  "storm-quiver": { id: "storm-quiver", branch: "range", kind: "passive", name: "Storm Quiver", requiredLevel: 23, prerequisite: "rapid-nocking", passive: { areaMultiplier: 1.28 } },
  "predators-focus": { id: "predators-focus", branch: "range", kind: "passive", name: "Predator's Focus", requiredLevel: 31, prerequisite: "storm-quiver", passive: { executeThreshold: 0.35, executeMultiplier: 1.18 } },
  windrunner: { id: "windrunner", branch: "range", kind: "passive", name: "Windrunner", requiredLevel: 40, prerequisite: "predators-focus", passive: { damageMultiplier: 1.1, damageReduction: 0.03 } },
  "sunfire-sigil": { id: "sunfire-sigil", branch: "magic", kind: "active", name: "Sunfire Sigil", requiredLevel: 1, multiplier: 1, cooldownMs: 10_500, areaRadius: 120 },
  "mana-weave": { id: "mana-weave", branch: "magic", kind: "passive", name: "Mana Weave", requiredLevel: 3, prerequisite: "sunfire-sigil", passive: { cooldownMultiplier: 0.92 } },
  "arcane-burn": { id: "arcane-burn", branch: "magic", kind: "active", name: "Arcane Burn", requiredLevel: 5, prerequisite: "mana-weave", multiplier: 0.68, cooldownMs: 12_500, dot: { ticks: 5, intervalMs: 850, multiplier: 0.27 } },
  "runic-intensity": { id: "runic-intensity", branch: "magic", kind: "passive", name: "Runic Intensity", requiredLevel: 10, prerequisite: "arcane-burn", passive: { damageMultiplier: 1.09 } },
  "unstable-echo": { id: "unstable-echo", branch: "magic", kind: "passive", name: "Unstable Echo", requiredLevel: 16, prerequisite: "runic-intensity", passive: { dotMultiplier: 1.3 } },
  "greater-sigils": { id: "greater-sigils", branch: "magic", kind: "passive", name: "Greater Sigils", requiredLevel: 23, prerequisite: "unstable-echo", passive: { areaMultiplier: 1.3 } },
  "soul-fracture": { id: "soul-fracture", branch: "magic", kind: "passive", name: "Soul Fracture", requiredLevel: 31, prerequisite: "greater-sigils", passive: { executeThreshold: 0.32, executeMultiplier: 1.2 } },
  archmage: { id: "archmage", branch: "magic", kind: "passive", name: "Archmage", requiredLevel: 40, prerequisite: "soul-fracture", passive: { damageMultiplier: 1.08, cooldownMultiplier: 0.9 } },
};
const RPG_SECOND_WIND_COOLDOWN_MS = 18_000;
const RPG_PARTY_MAX_MEMBERS = 5;
const RPG_PARTY_INVITE_MS = 45_000;
const RPG_PARTY_ASSIST_RANGE = 360;
const RPG_GUILD_INVITE_MS = 60_000;
const RPG_EXPEDITIONS = {
  "goblin-supply-raid": {
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
  "moonfen-purge": {
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
  "sunbone-cleansing": {
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
};
const RPG_TREASURE_CLUES = [
  { id: "fountain-ledger", title: "The Founder's Ledger", x: 688, y: 468 },
  { id: "moonwater-mooring", title: "The Moonwater Mooring", x: 282, y: 872 },
  { id: "sunstone-cache", title: "Beneath the Fallen Sun", x: 320, y: 1300 },
];
const RPG_ITEM_RULES = {
  "bronze-sword": { slot: "weapon", category: "weapon", cost: 0, power: 2, combatStyle: "melee" },
  "iron-sword": { slot: "weapon", category: "weapon", cost: 120, power: 4, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 5 },
  "rune-blade": { slot: "weapon", category: "weapon", cost: 480, power: 7, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 15 },
  "dusk-sabre": { slot: "weapon", category: "weapon", cost: 820, power: 11, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 25 },
  "oak-bow": { slot: "weapon", category: "weapon", cost: 95, power: 3, combatStyle: "range" },
  "iron-bow": { slot: "weapon", category: "weapon", cost: 340, power: 6, combatStyle: "range", requiredSkill: "range", requiredLevel: 8 },
  stormbow: { slot: "weapon", category: "weapon", cost: 860, power: 10, combatStyle: "range", requiredSkill: "range", requiredLevel: 22 },
  "ember-staff": { slot: "weapon", category: "weapon", cost: 120, power: 3, combatStyle: "magic" },
  "arcane-staff": { slot: "weapon", category: "weapon", cost: 430, power: 7, combatStyle: "magic", requiredSkill: "magic", requiredLevel: 10 },
  "frostspire-staff": { slot: "weapon", category: "weapon", cost: 880, power: 10, combatStyle: "magic", requiredSkill: "magic", requiredLevel: 22 },
  "bronze-pick": { slot: "tool", category: "tool", cost: 0, power: 1 },
  "iron-pick": { slot: "tool", category: "tool", cost: 160, power: 2, requiredSkill: "mining", requiredLevel: 5 },
  "crystal-pick": { slot: "tool", category: "tool", cost: 620, power: 3, requiredSkill: "mining", requiredLevel: 15 },
  "sunstone-pick": { slot: "tool", category: "tool", cost: 0, power: 4, requiredSkill: "mining", requiredLevel: 20, sellValue: 480 },
  "trailguard-vest": { slot: "armor", category: "armor", cost: 145, power: 8, requiredSkill: "defense", requiredLevel: 1 },
  "sentinel-mail": { slot: "armor", category: "armor", cost: 280, power: 12, requiredSkill: "defense", requiredLevel: 5 },
  "warden-mail": { slot: "armor", category: "armor", cost: 520, power: 20, requiredSkill: "defense", requiredLevel: 12 },
  "sunforged-mail": { slot: "armor", category: "armor", cost: 0, power: 28, requiredSkill: "defense", requiredLevel: 18 },
  "briarhide-cloak": { slot: "armor", category: "armor", cost: 0, power: 16, requiredSkill: "defense", requiredLevel: 8, sellValue: 90 },
  "moonweave-mantle": { slot: "armor", category: "armor", cost: 760, power: 26, requiredSkill: "defense", requiredLevel: 20 },
  "nightguard-plate": { slot: "armor", category: "armor", cost: 920, power: 34, requiredSkill: "defense", requiredLevel: 25 },
  "auric-cleaver": { slot: "weapon", category: "weapon", cost: 0, power: 9, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 18, sellValue: 350 },
  "aurex-sunblade": { slot: "weapon", category: "weapon", cost: 0, power: 12, combatStyle: "melee", requiredSkill: "attack", requiredLevel: 24, sellValue: 520 },
  "fallen-recurve": { slot: "weapon", category: "weapon", cost: 0, power: 8, combatStyle: "range", requiredSkill: "range", requiredLevel: 14, sellValue: 140 },
  "bonecaller-focus": { slot: "weapon", category: "weapon", cost: 0, power: 8, combatStyle: "magic", requiredSkill: "magic", requiredLevel: 14, sellValue: 160 },
  trout: { category: "consumable", cost: 0, healing: 12 },
  "healing-potion": { category: "consumable", cost: 45, healing: 25 },
  "copper-ore": { category: "material", cost: 0 },
  "iron-ore": { category: "material", cost: 0 },
  "oak-log": { category: "material", cost: 0 },
  "smithing-hammer": { category: "tool", cost: 0 },
  "crafter-kit": { category: "tool", cost: 0 },
  "treasure-scroll": { category: "material", cost: 0 },
  "founders-relic": { category: "material", cost: 0, sellValue: 110 },
  "sunstone-shard": { category: "material", cost: 0 },
  "sunstone-ore": { category: "material", cost: 0, sellValue: 34 },
  "rat-tail": { category: "material", cost: 0, sellValue: 2 },
  "goblin-insignia": { category: "material", cost: 0, sellValue: 5 },
  pinefang: { category: "material", cost: 0, sellValue: 7 },
  "crystal-residue": { category: "material", cost: 0, sellValue: 9 },
  "briar-hide": { category: "material", cost: 0, sellValue: 12 },
  "mire-essence": { category: "material", cost: 0, sellValue: 10 },
  "orc-totem": { category: "material", cost: 0, sellValue: 14 },
  marshscale: { category: "material", cost: 0, sellValue: 18 },
  "sunbone-fragment": { category: "material", cost: 0, sellValue: 22 },
  "witch-thread": { category: "material", cost: 0, sellValue: 28 },
  "auric-core": { category: "material", cost: 0, sellValue: 75 },
};
const RPG_RECIPES = {
  "forge-iron-pick": { skill: "smithing", requiredLevel: 1, inputs: { "iron-ore": 3, "oak-log": 1 }, output: { itemId: "iron-pick", quantity: 1 }, xp: 110 },
  "forge-sunstone-pick": { skill: "smithing", requiredLevel: 18, inputs: { "sunstone-ore": 8, "iron-ore": 4, "sunstone-shard": 1 }, output: { itemId: "sunstone-pick", quantity: 1 }, xp: 620 },
  "forge-sentinel-mail": { skill: "smithing", requiredLevel: 8, inputs: { "iron-ore": 6, "copper-ore": 4 }, output: { itemId: "sentinel-mail", quantity: 1 }, xp: 280 },
  "craft-oak-bow": { skill: "crafting", requiredLevel: 1, inputs: { "oak-log": 3 }, output: { itemId: "oak-bow", quantity: 1 }, xp: 90 },
  "craft-ember-staff": { skill: "crafting", requiredLevel: 4, inputs: { "oak-log": 2, "copper-ore": 3 }, output: { itemId: "ember-staff", quantity: 1 }, xp: 150 },
  "craft-iron-bow": { skill: "crafting", requiredLevel: 8, inputs: { "oak-log": 4, "iron-ore": 2 }, output: { itemId: "iron-bow", quantity: 1 }, xp: 260 },
  "brew-crimson-tonic": { skill: "crafting", requiredLevel: 3, inputs: { trout: 2, "oak-log": 1 }, output: { itemId: "healing-potion", quantity: 2 }, xp: 125 },
};
const BASE_RPG_NPC_POSITIONS = {
  guide: { x: 704, y: 515 },
  banker: { x: 1065, y: 595 },
  smith: { x: 925, y: 455 },
  market: { x: 610, y: 445 },
  plots: { x: 760, y: 690 },
  ranger: { x: 246, y: 1640 },
};
const BASE_RPG_ENEMIES = {
  "rat-west": { id: "rat-west", kind: "rat", maxHp: 18, x: 250, y: 590, gold: [4, 8], xp: 16, level: 1, aggroRange: 120, speed: 42, attackRange: 42, attackCooldown: 1650 },
  "goblin-camp-1": { id: "goblin-camp-1", kind: "goblin", maxHp: 30, x: 1280, y: 880, gold: [10, 18], xp: 28, level: 2, aggroRange: 180, speed: 52, attackRange: 50, attackCooldown: 1550 },
  "goblin-camp-2": { id: "goblin-camp-2", kind: "goblin", maxHp: 46, x: 1400, y: 940, gold: [18, 30], xp: 46, level: 4, aggroRange: 110, speed: 56, attackRange: 52, attackCooldown: 1500 },
  "goblin-camp-sentry": { id: "goblin-camp-sentry", kind: "goblin", maxHp: 38, x: 1200, y: 816, gold: [13, 22], xp: 36, level: 3, attackStyle: "range", aggroRange: 230, speed: 56, attackRange: 200, attackCooldown: 1520 },
  "goblin-camp-bruiser": { id: "goblin-camp-bruiser", kind: "goblin", maxHp: 58, x: 1430, y: 840, gold: [22, 34], xp: 56, level: 5, aggroRange: 205, speed: 54, attackRange: 54, attackCooldown: 1460 },
  "goblin-firestarter": { id: "goblin-firestarter", kind: "goblin", maxHp: 82, x: 1312, y: 1088, gold: [46, 72], xp: 105, level: 7, attackStyle: "range", aggroRange: 285, speed: 62, attackRange: 215, attackCooldown: 1420, respawnMs: 420_000 },
  "wolf-forest": { id: "wolf-forest", kind: "wolf", maxHp: 62, x: 225, y: 330, gold: [26, 42], xp: 68, level: 6, aggroRange: 210, speed: 70, attackRange: 48, attackCooldown: 1400 },
  "wolf-forest-2": { id: "wolf-forest-2", kind: "wolf", maxHp: 54, x: 390, y: 500, gold: [22, 36], xp: 58, level: 5, aggroRange: 210, speed: 68, attackRange: 48, attackCooldown: 1420 },
  "rat-east-road": { id: "rat-east-road", kind: "rat", maxHp: 24, x: 1110, y: 760, gold: [6, 11], xp: 22, level: 2, aggroRange: 130, speed: 44, attackRange: 42, attackCooldown: 1600 },
  "slime-mine": { id: "slime-mine", kind: "slime", maxHp: 54, x: 1348, y: 430, gold: [22, 38], xp: 58, level: 5, aggroRange: 155, speed: 36, attackRange: 46, attackCooldown: 1600 },
  "auric-slime": {
    id: "auric-slime",
    maxHp: 160,
    x: 980,
    y: 820,
    gold: [120, 200],
    xp: 180,
    level: 12,
    kind: "slime",
    passive: true,
    aggroRange: 180,
    speed: 42,
    attackRange: 52,
    attackCooldown: 1450,
    respawnMs: 180_000,
  },
  "briar-wolf-1": { id: "briar-wolf-1", kind: "wolf", maxHp: 74, x: 680, y: 1380, gold: [30, 48], xp: 78, level: 7, aggroRange: 230, speed: 68, attackRange: 48, attackCooldown: 1380 },
  "briar-wolf-2": { id: "briar-wolf-2", kind: "wolf", maxHp: 92, x: 820, y: 1510, gold: [40, 62], xp: 98, level: 9, aggroRange: 250, speed: 74, attackRange: 50, attackCooldown: 1320 },
  "briar-wolf-3": { id: "briar-wolf-3", kind: "wolf", maxHp: 82, x: 460, y: 1440, gold: [34, 54], xp: 88, level: 8, aggroRange: 235, speed: 72, attackRange: 50, attackCooldown: 1350 },
  "bog-slime-1": { id: "bog-slime-1", kind: "slime", maxHp: 66, x: 1030, y: 1345, gold: [25, 40], xp: 68, level: 6, aggroRange: 175, speed: 38, attackRange: 46, attackCooldown: 1580 },
  "bog-slime-2": { id: "bog-slime-2", kind: "slime", maxHp: 84, x: 1320, y: 1320, gold: [34, 52], xp: 88, level: 8, aggroRange: 185, speed: 42, attackRange: 48, attackCooldown: 1520 },
  "bog-slime-3": { id: "bog-slime-3", kind: "slime", maxHp: 74, x: 928, y: 1216, gold: [29, 46], xp: 78, level: 7, aggroRange: 180, speed: 40, attackRange: 47, attackCooldown: 1550 },
  "orc-raider-1": { id: "orc-raider-1", kind: "orc", maxHp: 88, x: 470, y: 1640, gold: [38, 58], xp: 92, level: 8, aggroRange: 220, speed: 58, attackRange: 54, attackCooldown: 1450 },
  "orc-raider-2": { id: "orc-raider-2", kind: "orc", maxHp: 108, x: 520, y: 1540, gold: [48, 72], xp: 116, level: 10, aggroRange: 240, speed: 64, attackRange: 56, attackCooldown: 1380 },
  "orc-raider-3": { id: "orc-raider-3", kind: "orc", maxHp: 98, x: 1050, y: 1700, gold: [42, 64], xp: 104, level: 9, aggroRange: 230, speed: 60, attackRange: 55, attackCooldown: 1420 },
  "orc-raider-4": { id: "orc-raider-4", kind: "orc", maxHp: 120, x: 1320, y: 1650, gold: [54, 80], xp: 128, level: 11, aggroRange: 250, speed: 64, attackRange: 58, attackCooldown: 1360 },
  "ironhide-grukk": { id: "ironhide-grukk", kind: "orc", maxHp: 224, x: 1080, y: 1830, gold: [110, 168], xp: 236, level: 15, aggroRange: 285, speed: 64, attackRange: 62, attackCooldown: 1280, respawnMs: 600_000 },
  "lizard-mystic-1": { id: "lizard-mystic-1", kind: "lizard", maxHp: 104, x: 1090, y: 1510, gold: [52, 78], xp: 120, level: 10, attackStyle: "magic", aggroRange: 270, speed: 50, attackRange: 205, attackCooldown: 1650 },
  "lizard-guard-1": { id: "lizard-guard-1", kind: "lizard", maxHp: 132, x: 1180, y: 1600, gold: [66, 94], xp: 148, level: 12, aggroRange: 240, speed: 56, attackRange: 58, attackCooldown: 1350 },
  "lizard-scout-1": { id: "lizard-scout-1", kind: "lizard", maxHp: 88, x: 1230, y: 1765, gold: [42, 64], xp: 98, level: 9, attackStyle: "range", aggroRange: 260, speed: 62, attackRange: 205, attackCooldown: 1480 },
  "lizard-scout-2": { id: "lizard-scout-2", kind: "lizard", maxHp: 112, x: 1376, y: 1504, gold: [54, 82], xp: 124, level: 11, attackStyle: "range", aggroRange: 275, speed: 62, attackRange: 210, attackCooldown: 1460 },
  "moonfen-oracle": { id: "moonfen-oracle", kind: "lizard", maxHp: 206, x: 1344, y: 1488, gold: [118, 176], xp: 248, level: 16, attackStyle: "magic", aggroRange: 320, speed: 54, attackRange: 225, attackCooldown: 1450, respawnMs: 540_000 },
  "sunbone-wanderer": { id: "sunbone-wanderer", kind: "skeleton", maxHp: 72, x: 540, y: 1220, gold: [28, 44], xp: 76, level: 7, aggroRange: 210, speed: 54, attackRange: 50, attackCooldown: 1480 },
  "sunbone-guardian": { id: "sunbone-guardian", kind: "skeleton", maxHp: 106, x: 535, y: 1360, gold: [46, 70], xp: 112, level: 10, aggroRange: 230, speed: 58, attackRange: 52, attackCooldown: 1400 },
  "sunbone-skirmisher": { id: "sunbone-skirmisher", kind: "skeleton", maxHp: 84, x: 340, y: 1470, gold: [35, 54], xp: 90, level: 8, aggroRange: 220, speed: 57, attackRange: 51, attackCooldown: 1440 },
  "fallen-ranger": { id: "fallen-ranger", kind: "skeleton", maxHp: 94, x: 610, y: 1720, gold: [40, 62], xp: 102, level: 9, attackStyle: "range", aggroRange: 270, speed: 54, attackRange: 205, attackCooldown: 1520 },
  "moonfen-hexer": { id: "moonfen-hexer", kind: "witch", maxHp: 110, x: 870, y: 1390, gold: [55, 82], xp: 128, level: 11, attackStyle: "magic", aggroRange: 285, speed: 48, attackRange: 205, attackCooldown: 1600 },
  "briar-bonecaller": { id: "briar-bonecaller", kind: "witch", maxHp: 142, x: 860, y: 1740, gold: [76, 108], xp: 164, level: 13, attackStyle: "magic", aggroRange: 300, speed: 52, attackRange: 215, attackCooldown: 1500 },
  "catacomb-sentinel": { id: "catacomb-sentinel", kind: "skeleton", maxHp: 158, x: 720, y: 2400, gold: [72, 104], xp: 172, level: 14, aggroRange: 235, speed: 55, attackRange: 54, attackCooldown: 1360 },
  "drowned-custodian": { id: "drowned-custodian", kind: "witch", maxHp: 184, x: 1170, y: 2390, gold: [88, 126], xp: 204, level: 16, attackStyle: "magic", aggroRange: 290, speed: 46, attackRange: 215, attackCooldown: 1520 },
  "emberbone-marksman": { id: "emberbone-marksman", kind: "skeleton", maxHp: 146, x: 500, y: 2240, gold: [70, 102], xp: 180, level: 15, attackStyle: "range", aggroRange: 285, speed: 52, attackRange: 210, attackCooldown: 1480 },
  "cryptflame-channeler": { id: "cryptflame-channeler", kind: "witch", maxHp: 196, x: 1040, y: 2240, gold: [94, 132], xp: 218, level: 17, attackStyle: "magic", aggroRange: 305, speed: 44, attackRange: 220, attackCooldown: 1540 },
  "sunstone-revenant": { id: "sunstone-revenant", kind: "skeleton", maxHp: 310, x: 768, y: 2690, gold: [155, 230], xp: 330, level: 20, attackStyle: "magic", aggroRange: 330, speed: 50, attackRange: 220, attackCooldown: 1380, respawnMs: 720_000 },
};
const supabaseAdmin = SUPABASE_URL && SUPABASE_SECRET_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;
const rpgProfileStore = supabaseAdmin ? createRpgProfileStore(supabaseAdmin) : null;
const BASE_RPG_RESOURCES = {
  "copper-1": { id: "copper-1", kind: "ore", skill: "mining", x: 1380, y: 275, seconds: 5, gold: 8, xp: 28, itemId: "copper-ore", requiredLevel: 1 },
  "copper-2": { id: "copper-2", kind: "ore", skill: "mining", x: 1324, y: 350, seconds: 5, gold: 8, xp: 28, itemId: "copper-ore", requiredLevel: 1 },
  "copper-3": { id: "copper-3", kind: "ore", skill: "mining", x: 1238, y: 430, seconds: 5, gold: 8, xp: 28, itemId: "copper-ore", requiredLevel: 1 },
  "iron-1": { id: "iron-1", kind: "ore", skill: "mining", x: 1290, y: 165, seconds: 8, gold: 15, xp: 48, itemId: "iron-ore", requiredLevel: 5 },
  "iron-2": { id: "iron-2", kind: "ore", skill: "mining", x: 1405, y: 220, seconds: 8, gold: 15, xp: 48, itemId: "iron-ore", requiredLevel: 5 },
  "oak-1": { id: "oak-1", kind: "tree", skill: "woodcutting", x: 132, y: 480, seconds: 6, gold: 7, xp: 30, itemId: "oak-log", requiredLevel: 1 },
  "oak-2": { id: "oak-2", kind: "tree", skill: "woodcutting", x: 90, y: 560, seconds: 6, gold: 7, xp: 30, itemId: "oak-log", requiredLevel: 1 },
  "oak-3": { id: "oak-3", kind: "tree", skill: "woodcutting", x: 350, y: 1060, seconds: 7, gold: 9, xp: 38, itemId: "oak-log", requiredLevel: 3 },
  "pine-1": { id: "pine-1", kind: "tree", skill: "woodcutting", x: 220, y: 175, seconds: 8, gold: 11, xp: 44, itemId: "oak-log", requiredLevel: 5 },
  "pine-2": { id: "pine-2", kind: "tree", skill: "woodcutting", x: 145, y: 300, seconds: 8, gold: 11, xp: 44, itemId: "oak-log", requiredLevel: 5 },
  "oak-4": { id: "oak-4", kind: "tree", skill: "woodcutting", x: 92, y: 380, seconds: 6, gold: 7, xp: 30, itemId: "oak-log", requiredLevel: 1 },
  "oak-5": { id: "oak-5", kind: "tree", skill: "woodcutting", x: 520, y: 980, seconds: 6, gold: 7, xp: 30, itemId: "oak-log", requiredLevel: 1 },
  "pine-3": { id: "pine-3", kind: "tree", skill: "woodcutting", x: 300, y: 140, seconds: 8, gold: 11, xp: 44, itemId: "oak-log", requiredLevel: 5 },
  "pine-4": { id: "pine-4", kind: "tree", skill: "woodcutting", x: 1360, y: 1160, seconds: 8, gold: 11, xp: 44, itemId: "oak-log", requiredLevel: 5 },
  "briar-oak-1": { id: "briar-oak-1", kind: "tree", skill: "woodcutting", x: 360, y: 1450, seconds: 7, gold: 9, xp: 38, itemId: "oak-log", requiredLevel: 3 },
  "briar-oak-2": { id: "briar-oak-2", kind: "tree", skill: "woodcutting", x: 82, y: 1450, seconds: 7, gold: 9, xp: 38, itemId: "oak-log", requiredLevel: 3 },
  "briar-oak-3": { id: "briar-oak-3", kind: "tree", skill: "woodcutting", x: 1260, y: 1400, seconds: 7, gold: 9, xp: 38, itemId: "oak-log", requiredLevel: 3 },
  "briar-pine-1": { id: "briar-pine-1", kind: "tree", skill: "woodcutting", x: 180, y: 1460, seconds: 9, gold: 13, xp: 50, itemId: "oak-log", requiredLevel: 7 },
  "briar-pine-2": { id: "briar-pine-2", kind: "tree", skill: "woodcutting", x: 520, y: 1540, seconds: 9, gold: 13, xp: 50, itemId: "oak-log", requiredLevel: 7 },
  "briar-pine-3": { id: "briar-pine-3", kind: "tree", skill: "woodcutting", x: 900, y: 1840, seconds: 9, gold: 13, xp: 50, itemId: "oak-log", requiredLevel: 7 },
  "briar-pine-4": { id: "briar-pine-4", kind: "tree", skill: "woodcutting", x: 420, y: 1880, seconds: 9, gold: 13, xp: 50, itemId: "oak-log", requiredLevel: 7 },
  "briar-pine-5": { id: "briar-pine-5", kind: "tree", skill: "woodcutting", x: 1340, y: 1900, seconds: 9, gold: 13, xp: 50, itemId: "oak-log", requiredLevel: 7 },
  "fish-1": { id: "fish-1", kind: "fish", skill: "fishing", x: 245, y: 785, seconds: 7, gold: 10, xp: 36, itemId: "trout", requiredLevel: 1 },
  "fish-2": { id: "fish-2", kind: "fish", skill: "fishing", x: 185, y: 842, seconds: 7, gold: 10, xp: 36, itemId: "trout", requiredLevel: 1 },
  "fish-3": { id: "fish-3", kind: "fish", skill: "fishing", x: 930, y: 1205, seconds: 9, gold: 14, xp: 52, itemId: "trout", requiredLevel: 6 },
  "fish-4": { id: "fish-4", kind: "fish", skill: "fishing", x: 1185, y: 1270, seconds: 9, gold: 14, xp: 52, itemId: "trout", requiredLevel: 6 },
  "sunstone-1": { id: "sunstone-1", kind: "relic", skill: "magic", x: 320, y: 1248, seconds: 5, gold: 0, xp: 85, itemId: "sunstone-shard", requiredLevel: 1 },
  "sunstone-vein-1": { id: "sunstone-vein-1", kind: "ore", skill: "mining", x: 280, y: 2360, seconds: 12, gold: 24, xp: 92, itemId: "sunstone-ore", requiredLevel: 12 },
  "sunstone-vein-2": { id: "sunstone-vein-2", kind: "ore", skill: "mining", x: 240, y: 2480, seconds: 12, gold: 24, xp: 92, itemId: "sunstone-ore", requiredLevel: 12 },
  "sunstone-vein-3": { id: "sunstone-vein-3", kind: "ore", skill: "mining", x: 360, y: 2280, seconds: 12, gold: 24, xp: 92, itemId: "sunstone-ore", requiredLevel: 12 },
};

function npcPositionsFromLayout(layout) {
  return Array.isArray(layout.npcs) && layout.npcs.length
    ? Object.fromEntries(layout.npcs.map((npc) => [npc.id, { x: npc.x, y: npc.y }]))
    : BASE_RPG_NPC_POSITIONS;
}

function enemiesFromLayout(layout) {
  return Array.isArray(layout.enemies) && layout.enemies.length
    ? Object.fromEntries(layout.enemies.map((enemy) => {
      const base = BASE_RPG_ENEMIES[enemy.id] || {};
      const attackStyle = enemy.attackStyle || base.attackStyle || "melee";
      return [enemy.id, {
        ...base,
        ...enemy,
        xp: enemy.attackXp ?? base.xp ?? Math.max(8, enemy.level * 10),
        aggroRange: enemy.aggroRange ?? base.aggroRange ?? 180,
        speed: enemy.speed ?? base.speed ?? 48,
        attackRange: base.attackRange ?? (attackStyle === "melee" ? 52 : 205),
        attackCooldown: base.attackCooldown ?? 1500,
      }];
    }))
    : BASE_RPG_ENEMIES;
}

function resourcesFromLayout(layout) {
  return Array.isArray(layout.resources) && layout.resources.length
    ? Object.fromEntries(layout.resources.map((resource) => [resource.id, resource]))
    : BASE_RPG_RESOURCES;
}

let RPG_NPC_POSITIONS = npcPositionsFromLayout(EDITABLE_WORLD_LAYOUT);
let RPG_ENEMIES = enemiesFromLayout(EDITABLE_WORLD_LAYOUT);
let RPG_RESOURCES = resourcesFromLayout(EDITABLE_WORLD_LAYOUT);

const rooms = new Map();
const authenticatedPlayers = new Map();
const settlingEnemyRewards = new Set();
let saveTimer = null;

function sanitizeRoomId(roomId) {
  return String(roomId || "lobby").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "lobby";
}

function sanitizePlayerName(name) {
  return String(name || "Adventurer")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24) || "Adventurer";
}

function sanitizeChatText(text) {
  return String(text || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function websocketJwt(request) {
  const protocols = String(request.headers["sec-websocket-protocol"] || "")
    .split(",")
    .map((protocol) => protocol.trim());
  const jwtProtocol = protocols.find((protocol) => protocol.startsWith("jwt-"));
  return jwtProtocol ? jwtProtocol.slice(4) : "";
}

async function authenticateSocketRequest(request) {
  const jwt = websocketJwt(request);
  if (!jwt) {
    return REQUIRE_RPG_AUTH
      ? { ok: false, status: 401, message: "Authentication is required." }
      : { ok: true, mode: "guest", userId: null };
  }
  if (!supabaseAdmin) {
    return { ok: false, status: 503, message: "Account authentication is not configured on this server." };
  }
  const { data, error } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !data.user) return { ok: false, status: 401, message: "Invalid or expired account session." };
  return { ok: true, mode: "supabase", userId: data.user.id };
}

function rejectUpgrade(socket, status, message) {
  const body = String(message || "WebSocket upgrade rejected.");
  socket.write(
    `HTTP/1.1 ${status} ${status === 401 ? "Unauthorized" : "Service Unavailable"}\r\n` +
      "Connection: close\r\n" +
      "Content-Type: text/plain; charset=utf-8\r\n" +
      `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`,
  );
  socket.destroy();
}

function getRoom(roomId) {
  const key = sanitizeRoomId(roomId);
  if (!rooms.has(key)) {
    rooms.set(key, {
      players: new Map(),
      plots: createWorldPlots(),
      rpg: createRpgWorldState(),
      parties: new Map(),
      partyInvites: new Map(),
      guildInvites: new Map(),
      chat: [],
      lastUpdatedAt: Date.now(),
    });
  }

  const room = rooms.get(key);
  if (!Array.isArray(room.chat)) room.chat = [];
  if (!(room.parties instanceof Map)) room.parties = new Map();
  if (!(room.partyInvites instanceof Map)) room.partyInvites = new Map();
  if (!(room.guildInvites instanceof Map)) room.guildInvites = new Map();
  ensureWorldPlots(room);
  ensureRpgWorldState(room);
  return room;
}

function serializeRoom(roomId) {
  const room = getRoom(roomId);
  return {
    roomId,
    players: [...room.players.values()].map(publicRpgPlayer),
    chat: room.chat.slice(-30),
    plots: room.plots,
    rpg: {
      enemies: Object.fromEntries(
        Object.entries(room.rpg.enemies).map(([id, enemy]) => [id, publicEnemyState(enemy)]),
      ),
      resources: room.rpg.resources,
    },
  };
}

function publicEnemyState(enemy) {
  const { contributors: _contributors, activeDots: _activeDots, ...state } = enemy;
  return state;
}

function createRpgWorldState() {
  const publicEventSlot = featuredRpgPublicEvent().slot;
  return {
    publicEventSlot,
    enemies: Object.fromEntries(
      Object.values(RPG_ENEMIES).map((enemy) => [
        enemy.id,
        {
          id: enemy.id,
          hp: enemy.maxHp,
          maxHp: enemy.maxHp,
          x: enemy.x,
          y: enemy.y,
          action: "idle",
          direction: "down",
          targetPlayerId: null,
          contributors: {},
          provokedUntil: 0,
          lastAttackAt: 0,
          lastSpecialAt: Date.now(),
          pendingCast: null,
          respawnAt: 0,
          status: null,
        },
      ]),
    ),
    resources: Object.fromEntries(
      Object.values(RPG_RESOURCES).map((resource) => [
        resource.id,
        { id: resource.id, available: true, claimedBy: null, completeAt: null, respawnAt: 0 },
      ]),
    ),
  };
}

function ensureRpgWorldState(room) {
  if (!room.rpg || typeof room.rpg !== "object") room.rpg = createRpgWorldState();
  if (!room.rpg.enemies || typeof room.rpg.enemies !== "object") room.rpg.enemies = {};
  if (!room.rpg.resources || typeof room.rpg.resources !== "object") room.rpg.resources = {};
  if (!Number.isInteger(room.rpg.publicEventSlot)) room.rpg.publicEventSlot = featuredRpgPublicEvent().slot;
  for (const enemy of Object.values(RPG_ENEMIES)) {
    const current = room.rpg.enemies[enemy.id];
    const hp = Number.isFinite(Number(current?.hp)) ? Math.max(0, Math.min(enemy.maxHp, Number(current.hp))) : enemy.maxHp;
    const storedRespawnAt = Number.isFinite(Number(current?.respawnAt)) ? Number(current.respawnAt) : 0;
    const normalized = {
      id: enemy.id,
      hp,
      maxHp: enemy.maxHp,
      x: Number.isFinite(Number(current?.x)) ? Number(current.x) : enemy.x,
      y: Number.isFinite(Number(current?.y)) ? Number(current.y) : enemy.y,
      action: current?.action === "walk" || current?.action === "attack" ? current.action : "idle",
      direction: RPG_DIRECTIONS.has(current?.direction) ? current.direction : "down",
      targetPlayerId: typeof current?.targetPlayerId === "string" ? current.targetPlayerId : null,
      contributors: current?.contributors && typeof current.contributors === "object"
        ? Object.fromEntries(
            Object.entries(current.contributors)
              .filter(([, contribution]) => contribution && typeof contribution === "object")
              .map(([playerId, contribution]) => [playerId, {
                damage: Math.max(0, Math.floor(Number(contribution.damage) || 0)),
                lastHitAt: Math.max(0, Number(contribution.lastHitAt) || 0),
                combatStyle: RPG_COMBAT_STYLES.has(contribution.combatStyle) ? contribution.combatStyle : "melee",
              }]),
          )
        : {},
      provokedUntil: Number.isFinite(Number(current?.provokedUntil)) ? Number(current.provokedUntil) : 0,
      lastAttackAt: Number.isFinite(Number(current?.lastAttackAt)) ? Number(current.lastAttackAt) : 0,
      lastSpecialAt: Number.isFinite(Number(current?.lastSpecialAt)) ? Number(current.lastSpecialAt) : Date.now(),
      pendingCast: normalizePendingEnemyCast(current?.pendingCast),
      respawnAt: hp <= 0 && storedRespawnAt <= 0 ? Date.now() + (enemy.respawnMs || RPG_ENEMY_RESPAWN_MS) : storedRespawnAt,
      status: normalizeEnemyStatus(current?.status),
      activeDots: current?.activeDots && typeof current.activeDots === "object" ? current.activeDots : {},
    };
    if (current && typeof current === "object") {
      Object.assign(current, normalized);
      room.rpg.enemies[enemy.id] = current;
    } else {
      room.rpg.enemies[enemy.id] = normalized;
    }
  }
  for (const resource of Object.values(RPG_RESOURCES)) {
    const current = room.rpg.resources[resource.id];
    const claimedBy = typeof current?.claimedBy === "string" ? current.claimedBy : null;
    const normalized = {
      id: resource.id,
      available: resource.kind === "fish" ? !claimedBy : typeof current?.available === "boolean" ? current.available : true,
      claimedBy,
      completeAt: Number.isFinite(Number(current?.completeAt)) ? Number(current.completeAt) : null,
      respawnAt: resource.kind === "fish" ? 0 : Number.isFinite(Number(current?.respawnAt)) ? Number(current.respawnAt) : 0,
    };
    if (current && typeof current === "object") {
      Object.assign(current, normalized);
      room.rpg.resources[resource.id] = current;
    } else {
      room.rpg.resources[resource.id] = normalized;
    }
  }
}

function playerWithinRange(player, target, maxRange = RPG_INTERACTION_RANGE) {
  const dx = Number(player.x || 0) - target.x;
  const dy = Number(player.y || 0) - target.y;
  return Math.hypot(dx, dy) <= maxRange;
}

function rpgRegionIdAt(x, y) {
  if (y >= 2048) return "sunstone-catacombs";
  if (y >= 1024) {
    if (y < 1360 && x > 820) return "moonfen-marsh";
    if (y > 1460 && x < 590) return "ranger-camp";
    if (y > 1400 && x > 960) return "raider-dens";
    if (x < 520) return "old-sun-shrine";
    return "briarwild-crossing";
  }
  if (x < 330) return y > 660 ? "moonwater-pond" : "western-woods";
  if (x > 1050 && y > 660) return "goblin-camp";
  if (x > 1190) return "eastern-quarry";
  if (y > 760) return "southroad";
  return "orehaven";
}

function directionToward(fromX, fromY, targetX, targetY) {
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

function validRpgPlayerPosition(player) {
  return (
    Number.isFinite(Number(player?.x)) &&
    Number.isFinite(Number(player?.y)) &&
    player.x >= 20 &&
    player.x <= RPG_WORLD.width - 20 &&
    player.y >= 28 &&
    player.y <= RPG_WORLD.height - 20
  );
}

function nearestEnemyTarget(room, enemy, definition) {
  const now = Date.now();
  const provokedPlayer = enemy.provokedUntil > now && enemy.targetPlayerId
    ? room.players.get(enemy.targetPlayerId)
    : null;
  if (provokedPlayer && validRpgPlayerPosition(provokedPlayer)) {
    const distanceFromHome = Math.hypot(provokedPlayer.x - definition.x, provokedPlayer.y - definition.y);
    const distance = Math.hypot(provokedPlayer.x - enemy.x, provokedPlayer.y - enemy.y);
    const leashRange = Math.max(definition.aggroRange * 1.75, 340);
    if (
      distanceFromHome <= leashRange &&
      hasWorldLineOfSight(enemy.x, enemy.y, provokedPlayer.x, provokedPlayer.y)
    ) {
      return { player: provokedPlayer, distance };
    }
  }

  if (definition.passive) return null;

  const proximityAggroRange = definition.aggroRange * RPG_AGGRO_RANGE_MULTIPLIER;
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const player of room.players.values()) {
    if (!validRpgPlayerPosition(player)) continue;
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    const distanceFromHome = Math.hypot(player.x - definition.x, player.y - definition.y);
    if (distance > proximityAggroRange || distance >= nearestDistance) continue;
    if (distanceFromHome > proximityAggroRange * 1.45) continue;
    if (!hasWorldLineOfSight(enemy.x, enemy.y, player.x, player.y)) continue;
    nearest = player;
    nearestDistance = distance;
  }
  return nearest ? { player: nearest, distance: nearestDistance } : null;
}

function moveEnemyToward(enemy, target, definition, speedMultiplier = 1) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const step = Math.min(distance, definition.speed * Math.max(0.1, speedMultiplier) * (RPG_AI_TICK_MS / 1000));
  const nextX = Math.max(20, Math.min(RPG_WORLD.width - 20, enemy.x + (dx / distance) * step));
  const nextY = Math.max(28, Math.min(RPG_WORLD.height - 20, enemy.y + (dy / distance) * step));
  let moved = false;
  if (isWorldPositionWalkable(nextX, enemy.y, 12)) {
    enemy.x = nextX;
    moved = true;
  }
  if (isWorldPositionWalkable(enemy.x, nextY, 12)) {
    enemy.y = nextY;
    moved = true;
  }
  return moved;
}

function moveEnemyHome(enemy, definition, speedMultiplier = 1) {
  const distance = Math.hypot(definition.x - enemy.x, definition.y - enemy.y);
  if (distance <= 3) {
    enemy.x = definition.x;
    enemy.y = definition.y;
    return false;
  }
  return moveEnemyToward(enemy, definition, definition, speedMultiplier);
}

function normalizeEnemyStatus(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const expiresAt = Number(value.expiresAt);
  if (!RPG_ENEMY_STATUS_KINDS.has(value.kind) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  return {
    kind: value.kind,
    label: String(value.label || value.kind).slice(0, 24),
    expiresAt,
    strength: Math.max(0, Math.min(0.8, Number(value.strength) || 0)),
    sourcePlayerId: typeof value.sourcePlayerId === "string" ? value.sourcePlayerId : null,
  };
}

function normalizePendingEnemyCast(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const completesAt = Number(value.completesAt);
  const x = Number(value.x);
  const y = Number(value.y);
  const radius = Number(value.radius);
  const color = Number(value.color);
  const multiplier = Number(value.multiplier);
  if (
    typeof value.targetPlayerId !== "string"
    || !Number.isFinite(completesAt)
    || completesAt < Date.now() - 2_500
    || completesAt > Date.now() + 5_000
    || !Number.isFinite(x)
    || !Number.isFinite(y)
    || !Number.isFinite(radius)
  ) return null;
  return {
    name: String(value.name || "Enemy ability").slice(0, 36),
    targetPlayerId: value.targetPlayerId.slice(0, 64),
    x: Math.max(0, Math.min(RPG_WORLD.width, x)),
    y: Math.max(0, Math.min(RPG_WORLD.height, y)),
    radius: Math.max(24, Math.min(120, radius)),
    color: Number.isFinite(color) ? Math.max(0, Math.min(0xffffff, Math.floor(color))) : 0xe66a52,
    multiplier: Number.isFinite(multiplier) ? Math.max(1, Math.min(2.5, multiplier)) : 1.4,
    completesAt,
  };
}

function enemyAttackDamage(definition, status = null) {
  const maximum = Math.max(2, Math.ceil(definition.level * 0.72));
  const rolled = randomInteger([1, maximum]);
  return status?.kind === "weaken"
    ? Math.max(1, Math.floor(rolled * (1 - Math.max(0, Math.min(0.8, status.strength || 0)))))
    : rolled;
}

function playerDefenseStats(player) {
  const progress = player.profile?.progress;
  const armorId = progress?.equipped?.armor || player.equipped?.armor || "";
  const treeDefense = progress
    ? ["melee", "range", "magic"].reduce((remaining, branch) => remaining * (1 - rpgSkillTreeBonuses(progress, branch).damageReduction), 1)
    : 1;
  return {
    level: Math.max(1, progress?.skills?.defense?.level || 1),
    armorPower: Math.max(0, RPG_ITEM_RULES[armorId]?.power || 0),
    treeReduction: 1 - treeDefense,
  };
}

function mitigateEnemyDamage(rawDamage, defense) {
  const reduction = Math.floor(defense.armorPower / 8) + Math.floor(Math.max(0, defense.level - 1) / 8);
  return Math.max(1, Math.floor((rawDamage - reduction) * (1 - Math.max(0, Math.min(0.35, defense.treeReduction || 0)))));
}

function enemySpecialAbility(definition, enemy) {
  if (!definition || definition.level < 6 || definition.kind === "rat") return null;
  if (definition.id === "sunstone-revenant") return sunstoneRevenantAbility(enemy?.hp ?? definition.maxHp, enemy?.maxHp ?? definition.maxHp);
  const rareAbilities = {
    "goblin-firestarter": { name: "Cinder Volley", radius: 76, castMs: 1_500, cooldownMs: 7_600, color: 0xff7a3d, multiplier: 1.62 },
    "ironhide-grukk": { name: "Ironquake", radius: 94, castMs: 1_800, cooldownMs: 8_400, color: 0xffc454, multiplier: 1.9 },
    "moonfen-oracle": { name: "Moonwell Rupture", radius: 108, castMs: 2_050, cooldownMs: 7_900, color: 0x7edcff, multiplier: 1.78 },
  };
  if (rareAbilities[definition.id]) return rareAbilities[definition.id];
  const abilities = {
    goblin: { name: "Powder Toss", radius: 62, castMs: 1_050, cooldownMs: 8_500, color: 0xf2a648, multiplier: 1.35 },
    wolf: { name: "Rending Pounce", radius: 54, castMs: 900, cooldownMs: 7_500, color: 0xe86a52, multiplier: 1.45 },
    slime: { name: definition.id === "auric-slime" ? "Auric Detonation" : "Corrosive Burst", radius: definition.id === "auric-slime" ? 96 : 70, castMs: definition.id === "auric-slime" ? 1_650 : 1_250, cooldownMs: definition.id === "auric-slime" ? 7_000 : 8_800, color: definition.id === "auric-slime" ? 0xffd45d : 0x64d89c, multiplier: definition.id === "auric-slime" ? 1.7 : 1.4 },
    orc: { name: "Groundbreaker", radius: 74, castMs: 1_150, cooldownMs: 8_200, color: 0xe2724e, multiplier: 1.55 },
    lizard: { name: definition.attackStyle === "magic" ? "Marshlight Pool" : definition.attackStyle === "range" ? "Venom Volley" : "Scalequake", radius: 76, castMs: 1_300, cooldownMs: 8_600, color: definition.attackStyle === "magic" ? 0x55d8c2 : 0x94c85c, multiplier: 1.45 },
    skeleton: { name: definition.attackStyle === "range" ? "Grave Arrow Rain" : "Sunbone Cleave", radius: 68, castMs: 1_200, cooldownMs: 8_000, color: 0xd9d4af, multiplier: 1.5 },
    witch: { name: "Moonhex Nova", radius: 84, castMs: 1_450, cooldownMs: 8_200, color: 0xb06fe8, multiplier: 1.55 },
  };
  return abilities[definition.kind] || null;
}

function deliverEnemyDamage(targetPlayer, attackPayload) {
  if (!targetPlayer?.socket) return;
  const damage = Math.max(1, Math.floor(Number(attackPayload.damage) || 1));
  if (targetPlayer.profile) {
    let currentHp = targetPlayer.profile.progress.hp;
    let knockedOut = false;
    void mutateAuthenticatedProfile(
      targetPlayer,
      "enemy_damage",
      (progress) => {
        const next = normalizeRpgProgress(progress);
        currentHp = Math.max(0, next.hp - damage);
        knockedOut = currentHp <= 0;
        next.hp = knockedOut ? next.maxHp : currentHp;
        return addProfileXp(next, "defense", attackPayload.defenseXp);
      },
      true,
    )
      .then((saved) => send(targetPlayer.socket, "rpg_enemy_attack", {
        ...attackPayload,
        profileAuthoritative: true,
        currentHp,
        maxHp: saved.progress.maxHp,
        knockedOut,
      }))
      .catch((error) => {
        console.error("Failed to persist enemy damage", error);
        send(targetPlayer.socket, "rpg_action_error", {
          action: "combat",
          message: "Incoming damage could not be synchronized. Combat was cancelled safely.",
        });
      });
    return;
  }
  send(targetPlayer.socket, "rpg_enemy_attack", attackPayload);
}

function randomInteger([min, max]) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function abilityDamage(baseDamage, ability, enemy) {
  if (!ability) return baseDamage;
  const healthRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
  let multiplier = ability.multiplier;
  if (ability.openingMultiplier && healthRatio >= 0.85) multiplier *= ability.openingMultiplier;
  if (ability.executeThreshold && ability.executeMultiplier && healthRatio <= ability.executeThreshold) {
    multiplier *= ability.executeMultiplier;
  }
  return Math.max(1, Math.ceil(baseDamage * multiplier));
}

function rollRpgLoot(definition) {
  const roll = Math.random();
  let threshold = 0;
  for (const entry of RPG_LOOT_RULES[definition.id] || []) {
    threshold += entry.chance;
    if (roll < threshold) return entry.itemId;
  }
  return null;
}

function publicRpgPlayer(player) {
  const skills = player.profile?.progress?.skills;
  return {
    id: player.id,
    name: player.name,
    x: player.x,
    y: player.y,
    avatarStyle: player.avatarStyle,
    equippedPickaxeSkin: player.equippedPickaxeSkin,
    equippedClothesSkin: player.equippedClothesSkin,
    appearance: player.appearance,
    customization: player.customization,
    equipped: player.equipped,
    action: player.action,
    direction: player.direction,
    totalLevel: skills
      ? Object.values(skills).reduce((sum, skill) => sum + Math.max(1, Number(skill?.level) || 1), 0)
      : 10,
    guild: normalizeRpgGuild(player.profile?.progress?.guild || player.guild),
  };
}

function publicPartyMember(player, leaderId) {
  const publicPlayer = publicRpgPlayer(player);
  return {
    id: publicPlayer.id,
    name: publicPlayer.name,
    appearance: publicPlayer.appearance,
    customization: publicPlayer.customization,
    equipped: publicPlayer.equipped,
    totalLevel: publicPlayer.totalLevel,
    guild: publicPlayer.guild,
    x: publicPlayer.x,
    y: publicPlayer.y,
    leader: publicPlayer.id === leaderId,
  };
}

function publicPartyState(room, party) {
  if (!party) return null;
  const members = party.memberIds
    .map((memberId) => room.players.get(memberId))
    .filter(Boolean)
    .map((member) => publicPartyMember(member, party.leaderId));
  return members.length
    ? {
        id: party.id,
        leaderId: party.leaderId,
        members,
        completedExpeditionIds: party.completedExpeditionIds ?? [],
        expedition: party.expedition
          ? {
              id: party.expedition.id,
              name: party.expedition.name,
              description: party.expedition.description,
              crest: party.expedition.crest,
              region: party.expedition.region,
              trackingKey: party.expedition.trackingKey,
              recommendedTotalLevel: party.expedition.recommendedTotalLevel,
              targetKind: party.expedition.targetKind,
              target: party.expedition.target,
              progress: party.expedition.progress,
              contributorCount: party.expedition.contributorIds.length,
              endsAt: party.expedition.endsAt,
              status: party.expedition.completedAt
                ? "complete"
                : party.expedition.endsAt <= Date.now()
                  ? "expired"
                  : "active",
            }
          : null,
      }
    : null;
}

function notifyPartyState(roomId, party) {
  const room = getRoom(roomId);
  const state = publicPartyState(room, party);
  if (!state) return;
  for (const member of state.members) {
    const player = room.players.get(member.id);
    if (player) send(player.socket, "rpg_party_state", { party: state });
  }
}

function leaveParty(roomId, player, message = "You left the party.") {
  const room = getRoom(roomId);
  const party = player.partyId ? room.parties.get(player.partyId) : null;
  player.partyId = null;
  room.partyInvites.delete(player.id);
  send(player.socket, "rpg_party_state", { party: null });
  send(player.socket, "rpg_party_notice", { message });
  if (!party) return;

  party.memberIds = party.memberIds.filter((memberId) => memberId !== player.id);
  if (!party.memberIds.length) {
    room.parties.delete(party.id);
    for (const [targetId, invite] of room.partyInvites.entries()) {
      if (invite.partyId === party.id) room.partyInvites.delete(targetId);
    }
    return;
  }
  if (party.leaderId === player.id) party.leaderId = party.memberIds[0];
  notifyPartyState(roomId, party);
  for (const memberId of party.memberIds) {
    const member = room.players.get(memberId);
    if (member) send(member.socket, "rpg_party_notice", { message: `${player.name} left the party.` });
  }
}

function sanitizeGuildName(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9 '&-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

function sanitizeGuildTag(value) {
  return String(value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5);
}

async function setPlayerGuild(roomId, player, guild, reason, message) {
  const normalized = normalizeRpgGuild(guild);
  if (player.profile) {
    await mutateAuthenticatedProfile(player, reason, (progress) => ({
      progress: { ...progress, guild: normalized },
      message,
    }));
  } else {
    player.guild = normalized;
  }
  send(player.socket, "rpg_guild_state", { guild: normalized, message });
  broadcast(roomId, { type: "rpg_guild_presence", player: publicRpgPlayer(player) });
}

function clientProfile(profile) {
  if (!profile) return null;
  return {
    displayName: profile.displayName,
    progress: profile.progress,
    revision: profile.revision,
  };
}

function authenticatedCombatStats(player) {
  const progress = player.profile?.progress;
  if (!progress) return null;
  const weapon = RPG_ITEM_RULES[progress.equipped.weapon] || RPG_ITEM_RULES["bronze-sword"];
  const combatStyle = weapon.combatStyle || "melee";
  const skillId = combatStyle === "range" ? "range" : combatStyle === "magic" ? "magic" : "attack";
  return {
    weaponId: progress.equipped.weapon || "bronze-sword",
    combatStyle,
    combatLevel: progress.skills[skillId]?.level || 1,
    defenseLevel: progress.skills.defense?.level || 1,
    weaponPower: weapon.power || 1,
    armorPower: RPG_ITEM_RULES[progress.equipped.armor]?.power || 0,
  };
}

function authenticatedGatheringStats(player, definition) {
  const progress = player.profile?.progress;
  if (!progress) return null;
  const tool = RPG_ITEM_RULES[progress.equipped.tool] || RPG_ITEM_RULES["bronze-pick"];
  return {
    skillLevel: progress.skills[definition.skill]?.level || 1,
    toolPower: definition.skill === "mining" ? tool.power || 1 : 1,
  };
}

async function mutateAuthenticatedProfile(player, reason, mutator, notify = true) {
  if (!rpgProfileStore || !player.profile) return null;
  const operation = (player.profileSaveQueue || Promise.resolve()).then(async () => {
    const mutation = mutator(player.profile.progress);
    const nextProgress = normalizeRpgProgress(mutation?.progress || mutation);
    const nextDisplayName = typeof mutation?.displayName === "string"
      ? sanitizePlayerName(mutation.displayName)
      : player.profile.displayName;
    const saved = await rpgProfileStore.save({ ...player.profile, displayName: nextDisplayName, progress: nextProgress });
    player.profile = saved;
    player.name = sanitizePlayerName(saved.displayName);
    player.appearance = saved.progress.appearance;
    player.customization = { ...saved.progress.customization };
    player.equipped = { ...saved.progress.equipped };
    player.guild = normalizeRpgGuild(saved.progress.guild);
    if (notify) {
      send(player.socket, "rpg_profile_state", {
        profile: clientProfile(saved),
        reason,
        message: typeof mutation?.message === "string" ? mutation.message : undefined,
      });
    }
    return saved;
  });
  player.profileSaveQueue = operation.catch(() => undefined);
  return operation;
}

function persistPlayerPosition(player) {
  if (!player.profile || !rpgProfileStore) return Promise.resolve(null);
  const position = { x: player.x, y: player.y };
  return mutateAuthenticatedProfile(
    player,
    "position_checkpoint",
    (progress) => ({ ...progress, position }),
    false,
  );
}

function queuePlayerPositionSave(player) {
  if (!player.profile || !rpgProfileStore) return;
  clearTimeout(player.positionSaveTimer);
  player.positionSaveTimer = setTimeout(() => {
    player.positionSaveTimer = null;
    void persistPlayerPosition(player).catch((error) => console.error("Failed to persist player position", error));
  }, 1_200);
}

function applyCombatProfileReward(progress, definition, combatStyle, reward, eventCredit = false) {
  const skillId = combatStyle === "range" ? "range" : combatStyle === "magic" ? "magic" : "attack";
  let next = addProfileXp(progress, skillId, reward.xp);
  next = addProfileXp(next, "hitpoints", Math.ceil(reward.xp * 0.4));
  next.gold += reward.gold;
  if (reward.itemId) {
    next = addProfileItem(next, reward.itemId, 1);
    next.collectionLog[reward.itemId] = (next.collectionLog[reward.itemId] || 0) + 1;
  }
  next.questStep = questStepAfterCombat(next.questStep, definition, combatStyle);
  next.activities = recordActivity(next.activities, "combat", 1, definition.kind);
  next.activities = recordLifetimeTarget(next.activities, definition.id);
  next.sideQuests = advanceSideQuests(next.sideQuests, "combat", definition.kind);
  if (eventCredit) next.activities = recordActivity(next.activities, "event");
  return next;
}

async function applyTreeAbilityDamage(roomId, player, enemy, definition, damage, combatStyle, ability, options = {}) {
  if (!enemy || enemy.hp <= 0 || enemy.respawnAt > Date.now()) return false;
  const now = Date.now();
  const settlementKey = `${roomId}:${definition.id}`;
  if (settlingEnemyRewards.has(settlementKey)) return false;
  const appliedDamage = Math.min(enemy.hp, Math.max(1, Math.floor(damage)));
  const nextHp = Math.max(0, enemy.hp - appliedDamage);
  const defeated = nextHp <= 0;
  const reward = defeated
    ? { gold: randomInteger(definition.gold), xp: definition.xp, itemId: rollRpgLoot(definition) }
    : { gold: 0, xp: 0, itemId: null };
  const featuredEvent = isFeaturedRpgPublicEvent(definition.id, now);

  if (featuredEvent) {
    const prior = enemy.contributors?.[player.id] || { damage: 0 };
    enemy.contributors = {
      ...(enemy.contributors || {}),
      [player.id]: { damage: prior.damage + appliedDamage, lastHitAt: now, combatStyle },
    };
  }

  if (defeated && player.profile) {
    settlingEnemyRewards.add(settlementKey);
    const previousHp = enemy.hp;
    enemy.hp = 0;
    enemy.respawnAt = now + (definition.respawnMs || RPG_ENEMY_RESPAWN_MS);
    enemy.action = "idle";
    enemy.targetPlayerId = null;
    enemy.provokedUntil = 0;
    enemy.status = null;
    enemy.activeDots = {};
    schedulePersist();
    broadcast(roomId, {
      type: "rpg_enemy_state",
      enemy: publicEnemyState(enemy),
      sourcePlayerId: player.id,
      damage: appliedDamage,
      retaliation: 0,
      defeated: true,
      settling: true,
      combatStyle,
      abilityId: ability.id,
      abilityReadyAt: options.abilityReadyAt || 0,
      treeAbility: true,
      secondary: Boolean(options.secondary),
      effectTick: Boolean(options.effectTick),
      tickIndex: options.tickIndex || 0,
      reward: { gold: 0, xp: 0, itemId: null },
      profileAuthoritative: true,
    });
    try {
      await mutateAuthenticatedProfile(player, "combat_reward", (progress) => applyCombatProfileReward(progress, definition, combatStyle, reward, featuredEvent));
    } catch (error) {
      enemy.hp = previousHp;
      enemy.respawnAt = 0;
      enemy.action = "idle";
      enemy.targetPlayerId = player.id;
      enemy.provokedUntil = Date.now() + 10_000;
      settlingEnemyRewards.delete(settlementKey);
      schedulePersist();
      broadcast(roomId, {
        type: "rpg_enemy_state",
        enemy: publicEnemyState(enemy),
        sourcePlayerId: player.id,
        defeated: false,
        settlementFailed: true,
        combatStyle,
      });
      console.error("Failed to persist skill-tree combat reward", error);
      send(player.socket, "rpg_action_error", { action: "combat", message: "The skill landed, but its reward could not be saved safely." });
      return false;
    }
  }

  enemy.hp = nextHp;
  enemy.targetPlayerId = player.id;
  enemy.provokedUntil = now + 10_000;
  if (defeated) {
    enemy.respawnAt = now + (definition.respawnMs || RPG_ENEMY_RESPAWN_MS);
    enemy.action = "idle";
    enemy.targetPlayerId = null;
    enemy.provokedUntil = 0;
    enemy.status = null;
    enemy.activeDots = {};
  }
  settlingEnemyRewards.delete(settlementKey);
  schedulePersist();
  broadcast(roomId, {
    type: "rpg_enemy_state",
    enemy: publicEnemyState(enemy),
    sourcePlayerId: player.id,
    damage: appliedDamage,
    retaliation: 0,
    defeated,
    combatStyle,
    abilityId: ability.id,
    abilityReadyAt: options.abilityReadyAt || 0,
    treeAbility: true,
    secondary: Boolean(options.secondary),
    effectTick: Boolean(options.effectTick),
    tickIndex: options.tickIndex || 0,
    reward,
    profileAuthoritative: Boolean(player.profile),
  });
  if (defeated && featuredEvent) {
    const room = getRoom(roomId);
    const participants = eligibleWorldEventParticipants(room, enemy, definition, now);
    const event = rpgPublicEventForEnemy(definition.id);
    broadcast(roomId, {
      type: "rpg_world_event",
      status: "complete",
      event: {
        id: definition.id,
        name: event?.name || definition.id,
        location: event?.location || "the frontier",
        region: event?.region || "Orehaven Province",
        level: definition.level,
        participantCount: participants.length,
        respawnAt: enemy.respawnAt,
      },
    });
    void grantWorldEventParticipationRewards(roomId, definition, participants, player.id);
  } else if (defeated) {
    void grantPartyAssistRewards(roomId, definition, enemy, player, combatStyle, reward);
    advancePartyExpedition(roomId, player, definition, enemy);
  }
  return true;
}

function applyGatherProfileReward(progress, definition) {
  let next = addProfileXp(progress, definition.skill, definition.xp);
  next.gold += definition.gold;
  next = addProfileItem(next, definition.itemId, 1);
  next.questStep = questStepAfterGather(next.questStep, definition);
  next.activities = recordActivity(next.activities, "gather");
  next.activities = recordLifetimeTarget(next.activities, `resource-${definition.itemId}`);
  next.sideQuests = advanceSideQuests(next.sideQuests, "gather", definition.kind);
  return next;
}

function applyWorldEventParticipationReward(progress, combatStyle, reward) {
  const skillId = combatStyle === "range" ? "range" : combatStyle === "magic" ? "magic" : "attack";
  let next = addProfileXp(progress, skillId, reward.xp);
  next = addProfileXp(next, "hitpoints", Math.ceil(reward.xp * 0.25));
  next.gold += reward.gold;
  next.activities = recordActivity(next.activities, "event");
  return next;
}

function applyPartyAssistReward(progress, definition, combatStyle, reward) {
  const skillId = combatStyle === "range" ? "range" : combatStyle === "magic" ? "magic" : "attack";
  let next = addProfileXp(progress, skillId, reward.xp);
  next = addProfileXp(next, "hitpoints", Math.ceil(reward.xp * 0.25));
  next.gold += reward.gold;
  next.questStep = questStepAfterCombat(next.questStep, definition, combatStyle);
  next.activities = recordActivity(next.activities, "combat", 1, definition.kind);
  next.activities = recordLifetimeTarget(next.activities, definition.id);
  return next;
}

function applyExpeditionReward(progress, reward) {
  let next = addProfileXp(progress, "defense", reward.defenseXp);
  next = addProfileXp(next, "hitpoints", reward.hitpointsXp);
  next.gold += reward.gold;
  if (next.guild && reward.guildRenown > 0) {
    next.guild = { ...next.guild, renown: Math.min(100_000, next.guild.renown + reward.guildRenown) };
  }
  return addProfileItem(next, reward.itemId, reward.quantity);
}

async function completePartyExpedition(roomId, party) {
  const room = getRoom(roomId);
  if (!party.expedition || party.expedition.completedAt) return;
  party.expedition.completedAt = Date.now();
  party.completedExpeditionIds = [...new Set([...(party.completedExpeditionIds ?? []), party.expedition.id])];
  notifyPartyState(roomId, party);
  const contributorIds = new Set(party.expedition.contributorIds);
  const reward = party.expedition.reward;
  await Promise.all(party.memberIds.map(async (memberId) => {
    const member = room.players.get(memberId);
    if (!member) return;
    if (!contributorIds.has(memberId)) {
      send(member.socket, "rpg_party_notice", { message: "The expedition ended, but rewards require personal contribution." });
      return;
    }
    try {
      if (member.profile) {
        await mutateAuthenticatedProfile(
          member,
          "expedition_reward",
          (progress) => applyExpeditionReward(progress, reward),
        );
      } else if (member.guild && reward.guildRenown > 0) {
        member.guild = { ...member.guild, renown: Math.min(100_000, (member.guild.renown || 0) + reward.guildRenown) };
      }
      send(member.socket, "rpg_expedition_reward", {
        expeditionId: party.expedition.id,
        expeditionName: party.expedition.name,
        reward,
        profileAuthoritative: Boolean(member.profile),
        guild: normalizeRpgGuild(member.profile?.progress?.guild || member.guild),
      });
      broadcast(roomId, { type: "rpg_guild_presence", player: publicRpgPlayer(member) });
    } catch (error) {
      console.error("Failed to grant expedition reward", error);
      send(member.socket, "rpg_action_error", { action: "party", message: "Your expedition reward could not be saved." });
    }
  }));
}

function advancePartyExpedition(roomId, finisher, definition, enemyPosition) {
  const room = getRoom(roomId);
  const party = finisher.partyId ? room.parties.get(finisher.partyId) : null;
  const expedition = party?.expedition;
  if (!party || !expedition || expedition.completedAt || expedition.endsAt <= Date.now()) return;
  if (definition.kind !== expedition.targetKind) return;

  const nearbyMembers = party.memberIds
    .map((memberId) => room.players.get(memberId))
    .filter((member) => member && Math.hypot(member.x - enemyPosition.x, member.y - enemyPosition.y) <= RPG_PARTY_ASSIST_RANGE);
  expedition.contributorIds = [...new Set([...expedition.contributorIds, ...nearbyMembers.map((member) => member.id)])];
  expedition.progress = Math.min(expedition.target, expedition.progress + 1);
  notifyPartyState(roomId, party);
  if (expedition.progress >= expedition.target && expedition.contributorIds.length >= 2) {
    void completePartyExpedition(roomId, party);
  } else if (expedition.progress >= expedition.target) {
    for (const memberId of party.memberIds) {
      const member = room.players.get(memberId);
      if (member) send(member.socket, "rpg_party_notice", { message: "The hunt is complete, but a second party member must contribute for expedition rewards." });
    }
  }
}

async function grantPartyAssistRewards(roomId, definition, enemyPosition, finisher, combatStyle, fullReward) {
  const room = getRoom(roomId);
  const party = finisher.partyId ? room.parties.get(finisher.partyId) : null;
  if (!party || party.memberIds.length < 2) return;
  const assistants = party.memberIds
    .filter((memberId) => memberId !== finisher.id)
    .map((memberId) => room.players.get(memberId))
    .filter((member) => member && Math.hypot(member.x - enemyPosition.x, member.y - enemyPosition.y) <= RPG_PARTY_ASSIST_RANGE);
  const reward = {
    gold: Math.max(1, Math.round(fullReward.gold * 0.2)),
    xp: Math.max(4, Math.round(fullReward.xp * 0.45)),
  };

  await Promise.all(assistants.map(async (member) => {
    try {
      if (member.profile) {
        const stats = authenticatedCombatStats(member);
        await mutateAuthenticatedProfile(
          member,
          "party_assist_reward",
          (progress) => applyPartyAssistReward(progress, definition, stats?.combatStyle || combatStyle, reward),
        );
      }
      send(member.socket, "rpg_party_assist_reward", {
        enemyId: definition.id,
        enemyName: definition.id.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
        combatStyle: authenticatedCombatStats(member)?.combatStyle || combatStyle,
        reward,
        profileAuthoritative: Boolean(member.profile),
      });
    } catch (error) {
      console.error(`Failed to grant party assist reward for ${definition.id}`, error);
      send(member.socket, "rpg_action_error", {
        action: "party",
        message: "Your party assist reward could not be saved. Please try another encounter.",
      });
    }
  }));
}

function eligibleWorldEventParticipants(room, enemy, definition, now) {
  const minimumDamage = Math.max(8, Math.ceil(definition.maxHp * 0.05));
  return Object.entries(enemy.contributors || {})
    .filter(([, contribution]) =>
      contribution.damage >= minimumDamage
      && now - contribution.lastHitAt <= 60_000)
    .map(([playerId, contribution]) => ({ player: room.players.get(playerId), contribution }))
    .filter((entry) => entry.player);
}

async function grantWorldEventParticipationRewards(roomId, definition, participants, finisherId) {
  const event = rpgPublicEventForEnemy(definition.id);
  const helpers = participants.filter(({ player }) => player.id !== finisherId);
  await Promise.all(helpers.map(async ({ player, contribution }) => {
    const reward = {
      gold: Math.max(18, Math.round(randomInteger(definition.gold) * 0.35)),
      xp: Math.max(30, Math.round(definition.xp * 0.6)),
    };
    try {
      if (player.profile) {
        await mutateAuthenticatedProfile(
          player,
          "world_event_reward",
          (progress) => applyWorldEventParticipationReward(progress, contribution.combatStyle, reward),
        );
      }
      send(player.socket, "rpg_world_event_reward", {
        eventId: definition.id,
        eventName: event?.name || definition.id,
        reward,
        combatStyle: contribution.combatStyle,
        contributionDamage: contribution.damage,
        profileAuthoritative: Boolean(player.profile),
      });
    } catch (error) {
      console.error(`Failed to grant ${definition.id} participation reward in ${roomId}`, error);
      send(player.socket, "rpg_action_error", {
        action: "world_event",
        message: "Your public-event reward could not be saved. Please contact support before retrying.",
      });
    }
  }));
}

function profileActionError(message) {
  const error = new Error(message);
  error.code = "PROFILE_ACTION_INVALID";
  return error;
}

function removeProfileItem(progress, itemId, quantity = 1) {
  const current = progress.inventory[itemId] || 0;
  if (current < quantity) throw profileActionError("You do not have enough of that item.");
  progress.inventory[itemId] = current - quantity;
  if (progress.inventory[itemId] <= 0) delete progress.inventory[itemId];
}

function checkProfileRequirement(progress, item) {
  if (!item.requiredSkill) return;
  if ((progress.skills[item.requiredSkill]?.level || 1) < (item.requiredLevel || 1)) {
    throw profileActionError(`That item requires ${item.requiredSkill} level ${item.requiredLevel}.`);
  }
}

function rpgSkillTreePointTotal(progress) {
  const combatLevels = ["attack", "defense", "hitpoints", "range", "magic"]
    .reduce((sum, id) => sum + Math.max(1, progress.skills[id]?.level || 1), 0);
  return 3 + Math.floor(Math.max(0, combatLevels - 5) / 3);
}

function rpgSkillTreeBonuses(progress, branch) {
  const unlocked = new Set(progress?.skillTree?.unlocked || []);
  return Object.values(RPG_SKILL_TREE).reduce((bonuses, node) => {
    if (node.branch !== branch || node.kind !== "passive" || !unlocked.has(node.id) || !node.passive) return bonuses;
    bonuses.damageMultiplier *= node.passive.damageMultiplier || 1;
    bonuses.cooldownMultiplier *= node.passive.cooldownMultiplier || 1;
    bonuses.areaMultiplier *= node.passive.areaMultiplier || 1;
    bonuses.dotMultiplier *= node.passive.dotMultiplier || 1;
    bonuses.damageReduction = 1 - (1 - bonuses.damageReduction) * (1 - (node.passive.damageReduction || 0));
    if ((node.passive.executeThreshold || 0) > bonuses.executeThreshold) {
      bonuses.executeThreshold = node.passive.executeThreshold;
      bonuses.executeMultiplier = node.passive.executeMultiplier || 1;
    }
    return bonuses;
  }, { damageMultiplier: 1, cooldownMultiplier: 1, areaMultiplier: 1, dotMultiplier: 1, executeThreshold: 0, executeMultiplier: 1, damageReduction: 0 });
}

function rpgSkillTreeDamage(baseDamage, bonuses, enemy) {
  const healthRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
  const executeMultiplier = bonuses.executeThreshold > 0 && healthRatio <= bonuses.executeThreshold ? bonuses.executeMultiplier : 1;
  return Math.max(1, Math.ceil(baseDamage * bonuses.damageMultiplier * executeMultiplier));
}

function applyProfileAction(progress, message) {
  let next = normalizeRpgProgress(progress);
  const itemId = typeof message.itemId === "string" ? message.itemId.slice(0, 48) : "";
  const item = RPG_ITEM_RULES[itemId];

  if (message.action === "unlock_skill") {
    const node = RPG_SKILL_TREE[String(message.nodeId || "")];
    if (!node) throw profileActionError("That skill does not exist.");
    const unlocked = new Set(next.skillTree.unlocked);
    if (unlocked.has(node.id)) return { progress: next, message: `${node.name} is already unlocked.` };
    if (node.prerequisite && !unlocked.has(node.prerequisite)) throw profileActionError("Unlock the previous skill in this branch first.");
    const branchSkill = node.branch === "melee" ? "attack" : node.branch;
    if ((next.skills[branchSkill]?.level || 1) < node.requiredLevel) throw profileActionError(`${node.name} requires ${branchSkill} level ${node.requiredLevel}.`);
    if (unlocked.size >= rpgSkillTreePointTotal(next)) throw profileActionError("Earn more combat levels to gain another skill point.");
    next.skillTree = { unlocked: [...unlocked, node.id] };
    return { progress: next, message: `${node.name} unlocked.` };
  }

  if (message.action === "respec_skills") {
    if (!next.skillTree.unlocked.length) return { progress: next, message: "Your skill tree is already clear." };
    next.skillTree = { unlocked: [] };
    return { progress: next, message: "Skill points refunded. Rebuild your combat specializations at no cost during playtesting." };
  }

  if (message.action === "equip") {
    if (!item?.slot || (next.inventory[itemId] || 0) <= 0) throw profileActionError("You do not own that equipment.");
    checkProfileRequirement(next, item);
    next.equipped[item.slot] = itemId;
    next = normalizeRpgProgress(next);
    return { progress: next, message: "Equipment updated." };
  }

  if (message.action === "appearance") {
    if (!RPG_APPEARANCES.has(message.appearance)) throw profileActionError("That appearance is unavailable.");
    next.appearance = message.appearance;
    next.customization = customizationForRpgAppearance(message.appearance);
    return { progress: next, message: "Appearance updated." };
  }

  if (message.action === "customization") {
    next.customization = normalizeRpgCustomization(message.customization, next.customization);
    return { progress: next, message: "Character customization updated." };
  }

  if (message.action === "buy") {
    if (!item || !item.cost || item.cost <= 0) throw profileActionError("That item is not sold here.");
    if (next.gold < item.cost) throw profileActionError("You do not have enough gold.");
    next.gold -= item.cost;
    next = addProfileItem(next, itemId, 1);
    return { progress: next, message: `Purchase complete. -${item.cost} gold.` };
  }

  if (message.action === "sell") {
    if (!item?.sellValue || item.sellValue <= 0 || (next.inventory[itemId] || 0) <= 0) {
      throw profileActionError("That item cannot be sold.");
    }
    if (Object.values(next.equipped).includes(itemId)) throw profileActionError("Unequip that item before selling it.");
    removeProfileItem(next, itemId, 1);
    next.gold += item.sellValue;
    return { progress: next, message: `${itemId} sold for ${item.sellValue} gold.` };
  }

  if (message.action === "consume") {
    if (!item?.healing || (next.inventory[itemId] || 0) <= 0) throw profileActionError("You do not have that consumable.");
    if (next.hp >= next.maxHp) throw profileActionError("Your hitpoints are already full.");
    removeProfileItem(next, itemId, 1);
    next.hp = Math.min(next.maxHp, next.hp + item.healing);
    return { progress: next, message: `Restored ${item.healing} hitpoints.` };
  }

  if (message.action === "rest") {
    const recovery = restoreRpgHitpoints(next);
    if (recovery.healing <= 0) throw profileActionError("Your hitpoints are already full.");
    next = recovery.progress;
    const { healing } = recovery;
    return { progress: next, message: `${RPG_SANCTUARY.name} restored ${healing} hitpoints.` };
  }

  if (message.action === "side_quest") {
    const quest = sideQuestById(String(message.questId || ""));
    if (!quest) throw profileActionError("That side quest does not exist.");
    const state = next.sideQuests[quest.id];
    if (!state) {
      if (next.questStep < quest.unlockQuestStep) throw profileActionError("Continue the main story before accepting this tale.");
      next.sideQuests[quest.id] = { status: "active", progress: 0 };
      return { progress: next, message: "Side quest accepted." };
    }
    if (state.status === "active") throw profileActionError("That side quest is still in progress.");
    if (state.status === "claimed") return { progress: next, message: "That side quest is already complete." };
    next.gold += quest.reward.gold;
    next = addProfileXp(next, quest.reward.xpSkill, quest.reward.xp);
    next = addProfileItem(next, quest.reward.itemId, quest.reward.quantity);
    next.sideQuests[quest.id] = { ...state, status: "claimed" };
    return { progress: next, message: `Side quest complete. +${quest.reward.gold} gold.` };
  }

  if (message.action === "treasure_start") {
    if (next.treasureTrail) throw profileActionError("Finish your active treasure trail first.");
    if ((next.inventory["treasure-scroll"] || 0) <= 0) throw profileActionError("You do not have a treasure scroll.");
    removeProfileItem(next, "treasure-scroll", 1);
    next.treasureTrail = { step: 0 };
    return { progress: next, message: `Treasure trail started: ${RPG_TREASURE_CLUES[0].title}.` };
  }

  if (message.action === "treasure_advance") {
    const step = next.treasureTrail?.step;
    const clue = Number.isInteger(step) ? RPG_TREASURE_CLUES[step] : null;
    if (!clue || message.clueId !== clue.id) throw profileActionError("That is not your active clue location.");
    if (step < RPG_TREASURE_CLUES.length - 1) {
      next.treasureTrail = { step: step + 1 };
      return { progress: next, message: `Clue solved. Next: ${RPG_TREASURE_CLUES[step + 1].title}.` };
    }
    next.treasureTrail = null;
    next.gold += 260;
    next = addProfileXp(next, "crafting", 140);
    next = addProfileItem(next, "founders-relic", 1);
    next = addProfileItem(next, "healing-potion", 2);
    next.collectionLog["founders-relic"] = (next.collectionLog["founders-relic"] || 0) + 1;
    return { progress: next, message: "Treasure trail complete. The Founder's Sun Relic is yours." };
  }

  if (message.action === "deposit") {
    if (!item || (next.inventory[itemId] || 0) <= 0) throw profileActionError("You do not have that item.");
    if (Object.values(next.equipped).includes(itemId)) throw profileActionError("Unequip that item before depositing it.");
    removeProfileItem(next, itemId, 1);
    next.bank[itemId] = (next.bank[itemId] || 0) + 1;
    return { progress: next, message: "Item deposited." };
  }

  if (message.action === "withdraw") {
    if (!item || (next.bank[itemId] || 0) <= 0) throw profileActionError("That item is not in your bank.");
    next.bank[itemId] -= 1;
    if (next.bank[itemId] <= 0) delete next.bank[itemId];
    next = addProfileItem(next, itemId, 1);
    return { progress: next, message: "Item withdrawn." };
  }

  if (message.action === "craft") {
    const recipeId = typeof message.recipeId === "string" ? message.recipeId : "";
    const recipe = RPG_RECIPES[recipeId];
    if (!recipe) throw profileActionError("That recipe is unavailable.");
    if ((next.skills[recipe.skill]?.level || 1) < recipe.requiredLevel) {
      throw profileActionError(`That recipe requires ${recipe.skill} level ${recipe.requiredLevel}.`);
    }
    for (const [inputId, quantity] of Object.entries(recipe.inputs)) {
      if ((next.inventory[inputId] || 0) < quantity) throw profileActionError("You are missing required materials.");
    }
    for (const [inputId, quantity] of Object.entries(recipe.inputs)) removeProfileItem(next, inputId, quantity);
    next = addProfileItem(next, recipe.output.itemId, recipe.output.quantity);
    next = addProfileXp(next, recipe.skill, recipe.xp);
    next.questStep = questStepAfterCraft(next.questStep, recipeId);
    next.activities = recordActivity(next.activities, "craft");
    return { progress: next, message: "Crafting complete." };
  }

  if (message.action === "claim_contract") {
    const contractId = typeof message.contractId === "string" ? message.contractId : "";
    const contract = DAILY_CONTRACTS.find((entry) => entry.id === contractId);
    if (!contract) throw profileActionError("That contract is unavailable.");
    next.activities = normalizeActivityProgress(next.activities);
    if (next.activities.daily.claimed.includes(contract.id)) throw profileActionError("That contract reward was already claimed today.");
    if (activityContractCount(next.activities, contract) < contract.target) throw profileActionError("That contract is not complete yet.");
    next.activities.daily.claimed.push(contract.id);
    next.gold += contract.rewardGold;
    for (const reward of contract.rewardItems) next = addProfileItem(next, reward.itemId, reward.quantity);
    return { progress: next, message: `${contract.title} complete. +${contract.rewardGold} gold.` };
  }

  if (message.action === "claim_adventure") {
    const adventureId = typeof message.adventureId === "string" ? message.adventureId : "";
    const adventure = ADVENTURE_CHRONICLES.find((entry) => entry.id === adventureId);
    if (!adventure) throw profileActionError("That chronicle is unavailable.");
    if (next.adventureClaims.includes(adventure.id)) throw profileActionError("That chronicle reward was already claimed.");
    if (adventureProgress(next, adventure) < adventure.target) throw profileActionError("That chronicle is not complete yet.");
    next.adventureClaims.push(adventure.id);
    next.gold += adventure.rewardGold;
    for (const reward of adventure.rewardItems) {
      next = addProfileItem(next, reward.itemId, reward.quantity);
      next.collectionLog[reward.itemId] = (next.collectionLog[reward.itemId] || 0) + reward.quantity;
    }
    return { progress: next, message: `${adventure.title} recorded. +${adventure.rewardGold} gold.` };
  }

  if (message.action === "talk") {
    const npcId = typeof message.npcId === "string" ? message.npcId : "";
    let changed = true;
    let resultMessage = "Quest journal updated.";
    if (npcId === "guide" && next.questStep === 0) {
      next.questStep = 1;
      resultMessage = "Quest updated: mine copper in the eastern quarry.";
    }
    else if (npcId === "guide" && next.questStep === 3) {
      next.questStep = 4;
      next.questComplete = false;
      next.gold += 150;
      next = addProfileItem(next, "trout", 3);
      resultMessage = "A New Acre complete. +150 gold and 3 river trout.";
    } else if (npcId === "guide" && next.questStep === 4) {
      next.questStep = 5;
      next.questComplete = false;
      resultMessage = "New quest: gather old-growth timber from the western woods.";
    } else if (npcId === "guide" && next.questStep === 8) {
      next.questStep = 9;
      next.questComplete = true;
      next.gold += 450;
      next = addProfileItem(next, "sentinel-mail", 1);
    } else if (npcId === "guide" && next.questStep === 9) {
      next.questStep = 10;
      next.questComplete = false;
    } else if (npcId === "smith" && next.questStep === 10) {
      next.questStep = 11;
      next = addProfileItem(next, "oak-bow", 1);
      next = addProfileItem(next, "ember-staff", 1);
      next = addProfileItem(next, "iron-ore", 3);
      next = addProfileItem(next, "oak-log", 1);
    } else if (npcId === "smith" && next.questStep === 14) {
      next.questStep = 15;
      next.questComplete = true;
      next.gold += 650;
      next = addProfileItem(next, "smithing-hammer", 1);
      next = addProfileItem(next, "crafter-kit", 1);
      next = addProfileItem(next, "treasure-scroll", 1);
    } else if (npcId === "guide" && next.questStep === 15) {
      next.questStep = 16;
      next.questComplete = false;
    } else if (npcId === "ranger" && next.questStep === 16) {
      next.questStep = 17;
      next.questComplete = false;
    } else if (npcId === "ranger" && next.questStep === 22) {
      if ((next.inventory["sunstone-shard"] || 0) <= 0) {
        throw profileActionError("Recover the Sunstone shard before returning to Lyra.");
      }
      removeProfileItem(next, "sunstone-shard", 1);
      next.questStep = 23;
      next.questComplete = true;
      next.gold += 1_200;
      next = addProfileItem(next, "warden-mail", 1);
      next = addProfileItem(next, "arcane-staff", 1);
      next = addProfileItem(next, "healing-potion", 3);
    } else if (npcId === "ranger" && next.questStep === 23) {
      next.questStep = 24;
      next.questComplete = false;
    } else if (npcId === "ranger" && next.questStep === 29) {
      next.questStep = 30;
      next.questComplete = true;
      next.gold += 1_800;
      next = addProfileItem(next, "sunforged-mail", 1);
      next = addProfileItem(next, "rune-blade", 1);
      next = addProfileItem(next, "healing-potion", 5);
    } else {
      changed = false;
    }
    return { progress: next, message: changed ? resultMessage : "Conversation complete.", changed };
  }

  throw profileActionError("That profile action is unavailable.");
}

function plotKey(x, y) {
  return `plot-${x}-${y}`;
}

function makePlot(x, y) {
  return {
    id: plotKey(x, y),
    name: `Plot ${x + 1}-${y + 1}`,
    kind: "plot",
    ownerLabel: null,
    structures: {},
    chest: null,
    oreNodes: [],
    totalCollectedSol: 0,
    totalCollectedMints: 0,
  };
}

function makeTown() {
  return {
    id: TOWN_ID,
    name: "Ore Acres Town",
    kind: "town",
    ownerLabel: null,
    structures: {},
    chest: null,
    oreNodes: [],
    totalCollectedSol: 0,
    totalCollectedMints: 0,
  };
}

function makeMineArea() {
  return {
    id: MINE_ID,
    name: "Dustfall Mine",
    kind: "mine",
    ownerLabel: null,
    structures: {},
    chest: null,
    oreNodes: [],
    totalCollectedSol: 0,
    totalCollectedMints: 0,
  };
}

function createWorldPlots() {
  const plots = {};
  for (let x = 0; x < WORLD_COLUMNS; x += 1) {
    for (let y = 0; y < WORLD_ROWS; y += 1) {
      const plot = makePlot(x, y);
      plots[plot.id] = plot;
    }
  }
  plots[TOWN_ID] = makeTown();
  plots[MINE_ID] = makeMineArea();
  return plots;
}

function ensureWorldPlots(room) {
  if (!room || typeof room !== "object") return;
  if (!room.plots || typeof room.plots !== "object") {
    room.plots = createWorldPlots();
    return;
  }

  for (let x = 0; x < WORLD_COLUMNS; x += 1) {
    for (let y = 0; y < WORLD_ROWS; y += 1) {
      const id = plotKey(x, y);
      if (!room.plots[id]) {
        room.plots[id] = makePlot(x, y);
      }
    }
  }

  if (!room.plots[TOWN_ID]) {
    room.plots[TOWN_ID] = makeTown();
  }

  if (!room.plots[MINE_ID]) {
    room.plots[MINE_ID] = makeMineArea();
  }
}

function send(ws, type, payload = {}) {
  if (ws.readyState !== 1) {
    return;
  }

  ws.send(JSON.stringify({ type, ...payload }));
}

function corsHeaders() {
  return {
    "access-control-allow-origin": ALLOWED_ORIGIN,
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-admin-token",
  };
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json",
    ...corsHeaders(),
  });
  res.end(JSON.stringify(body));
}

function isLoopbackRequest(req) {
  const address = String(req.socket?.remoteAddress || "").toLowerCase();
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function safeTokenMatch(candidate, expected) {
  if (!candidate || !expected) return false;
  const candidateBuffer = Buffer.from(String(candidate));
  const expectedBuffer = Buffer.from(String(expected));
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

function adminRequestAuthorized(req) {
  if (isLoopbackRequest(req)) return { ok: true, actor: "localhost" };
  if (!ADMIN_API_TOKEN) return { ok: false, status: 503, message: "Remote admin access is disabled." };
  const authorization = String(req.headers.authorization || "");
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const headerToken = String(req.headers["x-admin-token"] || "").trim();
  if (!safeTokenMatch(bearer || headerToken, ADMIN_API_TOKEN)) {
    return { ok: false, status: 401, message: "A valid admin token is required." };
  }
  return { ok: true, actor: "remote-admin" };
}

async function readJsonBody(req, maximumBytes = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maximumBytes) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must contain valid JSON.");
    error.status = 400;
    throw error;
  }
}

function sanitizeAdminText(value, maximum = 160) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function mergeAdminProgress(currentProgress, patch) {
  const current = normalizeRpgProgress(currentProgress);
  const candidate = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
  const next = {
    ...current,
    skills: { ...current.skills },
    inventory: { ...current.inventory },
    bank: { ...current.bank },
    equipped: { ...current.equipped },
    customization: { ...current.customization },
    position: { ...current.position },
  };
  for (const key of ["gold", "mint", "hp", "maxHp", "questStep"]) {
    if (Number.isFinite(Number(candidate[key]))) next[key] = Number(candidate[key]);
  }
  if (candidate.heal === true) next.hp = next.maxHp;
  if (typeof candidate.questComplete === "boolean") next.questComplete = candidate.questComplete;
  if (typeof candidate.appearance === "string") next.appearance = candidate.appearance;
  if (candidate.skills && typeof candidate.skills === "object" && !Array.isArray(candidate.skills)) {
    for (const [skillId, value] of Object.entries(candidate.skills)) {
      if (!(skillId in next.skills)) continue;
      const xp = typeof value === "object" && value ? value.xp : value;
      if (Number.isFinite(Number(xp))) next.skills[skillId] = { ...next.skills[skillId], xp: Number(xp) };
    }
  }
  for (const key of ["inventory", "bank", "collectionLog"]) {
    if (!candidate[key] || typeof candidate[key] !== "object" || Array.isArray(candidate[key])) continue;
    next[key] = { ...(candidate[`replace${key[0].toUpperCase()}${key.slice(1)}`] ? {} : next[key]), ...candidate[key] };
  }
  if (candidate.equipped && typeof candidate.equipped === "object") next.equipped = { ...next.equipped, ...candidate.equipped };
  if (candidate.customization && typeof candidate.customization === "object") next.customization = { ...next.customization, ...candidate.customization };
  if (candidate.position && typeof candidate.position === "object") next.position = { ...next.position, ...candidate.position };
  for (const key of ["activities", "guild", "treasureTrail", "skillTree", "sideQuests"]) {
    if (key in candidate) next[key] = candidate[key];
  }
  for (const key of ["waystones", "discoveries", "adventureClaims"]) {
    if (Array.isArray(candidate[key])) next[key] = candidate[key];
  }
  return normalizeRpgProgress(next);
}

function adminPlayerSummary(roomId, player) {
  return {
    id: player.id,
    userId: player.userId,
    roomId,
    name: player.name,
    authMode: player.authMode,
    online: player.socket?.readyState === 1,
    x: Math.round(player.x * 10) / 10,
    y: Math.round(player.y * 10) / 10,
    action: player.action,
    direction: player.direction,
    lastSeenAt: player.lastSeenAt,
    profile: clientProfile(player.profile),
  };
}

function findAdminPlayer(playerId) {
  for (const [roomId, room] of rooms.entries()) {
    const player = room.players.get(playerId);
    if (player) return { roomId, room, player };
  }
  return null;
}

function recordAdminAudit(actor, action, target, detail = {}) {
  const entry = { id: randomUUID(), at: Date.now(), actor, action, target, detail };
  adminAudit.unshift(entry);
  if (adminAudit.length > ADMIN_AUDIT_LIMIT) adminAudit.length = ADMIN_AUDIT_LIMIT;
  void fs.appendFile(ADMIN_AUDIT_FILE, `${JSON.stringify(entry)}\n`, "utf8").catch(() => undefined);
  return entry;
}

async function saveAdminPlayerProfile(player, { displayName, progress }, reason) {
  if (!rpgProfileStore || !player.profile) return null;
  const operation = (player.profileSaveQueue || Promise.resolve()).then(async () => {
    const saved = await rpgProfileStore.save({
      ...player.profile,
      displayName: displayName || player.profile.displayName,
      progress,
    });
    player.profile = saved;
    player.name = sanitizePlayerName(saved.displayName);
    player.appearance = saved.progress.appearance;
    player.customization = { ...saved.progress.customization };
    player.equipped = { ...saved.progress.equipped };
    player.guild = normalizeRpgGuild(saved.progress.guild);
    player.waystones = [...saved.progress.waystones];
    player.discoveries = [...saved.progress.discoveries];
    send(player.socket, "rpg_profile_state", {
      profile: clientProfile(saved),
      reason,
      message: "An administrator updated your adventurer profile.",
    });
    return saved;
  });
  player.profileSaveQueue = operation.catch(() => undefined);
  return operation;
}

function setAdminPlayerPosition(roomId, player, position) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !isWorldPositionWalkable(x, y, PLAYER_COLLISION_RADIUS)) {
    const error = new Error("The requested position is outside the walkable world.");
    error.status = 400;
    throw error;
  }
  player.x = x;
  player.y = y;
  player.lastAcceptedMoveAt = Date.now();
  send(player.socket, "rpg_admin_position", { x, y, message: "An administrator moved your character." });
  broadcast(roomId, { type: "player_moved", player: publicRpgPlayer(player) }, player.id);
}

async function handleAdminApi(req, res, url, authorization) {
  const actor = authorization.actor;
  if (req.method === "POST" && url.pathname === "/api/admin/world-layout") {
    const body = await readJsonBody(req);
    if (![body.npcs, body.enemies, body.resources, body.decorations].every(Array.isArray)) {
      sendJson(res, 400, { error: "World layout needs NPC, enemy, resource, and decoration arrays." });
      return;
    }
    RPG_NPC_POSITIONS = npcPositionsFromLayout(body);
    RPG_ENEMIES = enemiesFromLayout(body);
    RPG_RESOURCES = resourcesFromLayout(body);
    for (const [roomId, room] of rooms) {
      for (const enemyId of Object.keys(room.rpg?.enemies || {})) {
        if (!RPG_ENEMIES[enemyId]) delete room.rpg.enemies[enemyId];
      }
      for (const resourceId of Object.keys(room.rpg?.resources || {})) {
        if (!RPG_RESOURCES[resourceId]) delete room.rpg.resources[resourceId];
      }
      ensureRpgWorldState(room);
      for (const definition of Object.values(RPG_ENEMIES)) {
        const enemy = room.rpg.enemies[definition.id];
        enemy.x = definition.x;
        enemy.y = definition.y;
        enemy.maxHp = definition.maxHp;
        enemy.hp = Math.min(enemy.hp, definition.maxHp);
        enemy.targetPlayerId = null;
        enemy.action = "idle";
      }
      broadcast(roomId, { type: "rpg_admin_notice", message: "The world layout was updated by an administrator." });
    }
    recordAdminAudit(actor, "world.layout", "all-rooms", {
      npcs: body.npcs.length,
      enemies: body.enemies.length,
      resources: body.resources.length,
      decorations: body.decorations.length,
    });
    schedulePersist();
    sendJson(res, 200, { ok: true, rooms: rooms.size, enemies: Object.keys(RPG_ENEMIES).length, resources: Object.keys(RPG_RESOURCES).length });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/admin/status") {
    const players = [...rooms.entries()].flatMap(([roomId, room]) => [...room.players.values()].map((player) => adminPlayerSummary(roomId, player)));
    sendJson(res, 200, {
      ok: true,
      localAccess: isLoopbackRequest(req),
      remoteTokenConfigured: Boolean(ADMIN_API_TOKEN),
      persistence: rpgProfileStore ? "supabase" : "guest-only",
      startedAt: SERVER_STARTED_AT,
      uptimeSeconds: Math.floor(process.uptime()),
      rooms: [...rooms.entries()].map(([roomId, room]) => ({ id: roomId, players: room.players.size, plots: Object.keys(room.plots).length })),
      players,
      audit: adminAudit.slice(0, 50),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/players") {
    const query = sanitizeAdminText(url.searchParams.get("query"), 64).toLowerCase();
    const players = [...rooms.entries()]
      .flatMap(([roomId, room]) => [...room.players.values()].map((player) => adminPlayerSummary(roomId, player)))
      .filter((player) => !query || player.name.toLowerCase().includes(query) || player.id.toLowerCase().includes(query) || player.userId?.toLowerCase().includes(query));
    sendJson(res, 200, { players });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/profiles") {
    if (!rpgProfileStore) {
      sendJson(res, 200, { profiles: [], persistence: "disabled" });
      return;
    }
    const profiles = await rpgProfileStore.list({ query: url.searchParams.get("query"), limit: url.searchParams.get("limit") });
    sendJson(res, 200, { profiles, persistence: "supabase" });
    return;
  }

  const playerMatch = url.pathname.match(/^\/api\/admin\/players\/([a-f0-9-]+)$/i);
  if (playerMatch && req.method === "PATCH") {
    const located = findAdminPlayer(playerMatch[1]);
    if (!located) {
      sendJson(res, 404, { error: "That player is no longer online." });
      return;
    }
    const body = await readJsonBody(req);
    const { roomId, player } = located;
    const displayName = body.displayName === undefined ? player.name : sanitizePlayerName(body.displayName);
    if (body.position) setAdminPlayerPosition(roomId, player, body.position);
    if (player.profile && rpgProfileStore) {
      if (body.expectedRevision !== undefined && Number(body.expectedRevision) !== player.profile.revision) {
        sendJson(res, 409, { error: "Profile changed after the console loaded it. Refresh before saving." });
        return;
      }
      const progress = body.progress
        ? normalizeRpgProgress(body.progress)
        : mergeAdminProgress(player.profile.progress, body.patch);
      if (body.position) progress.position = { x: player.x, y: player.y };
      await saveAdminPlayerProfile(player, { displayName, progress }, "admin_console");
    } else {
      player.name = displayName;
      if (body.patch && typeof body.patch === "object") {
        send(player.socket, "rpg_admin_patch", { patch: body.patch, message: "An administrator updated your local playtest profile." });
        if (typeof body.patch.appearance === "string") player.appearance = body.patch.appearance;
        if (body.patch.equipped && typeof body.patch.equipped === "object") player.equipped = { ...player.equipped, ...body.patch.equipped };
      }
    }
    send(player.socket, "rpg_admin_identity", { displayName: player.name });
    if (body.notice) send(player.socket, "rpg_admin_notice", { message: sanitizeAdminText(body.notice, 240) });
    broadcast(roomId, { type: "rpg_guild_presence", player: publicRpgPlayer(player) });
    recordAdminAudit(actor, "player.update", player.id, { userId: player.userId, name: player.name, roomId });
    sendJson(res, 200, { player: adminPlayerSummary(roomId, player) });
    return;
  }

  if (playerMatch && req.method === "DELETE") {
    const located = findAdminPlayer(playerMatch[1]);
    if (!located) {
      sendJson(res, 404, { error: "That player is no longer online." });
      return;
    }
    const body = await readJsonBody(req);
    const reason = sanitizeAdminText(body.reason, 100) || "Disconnected by an administrator.";
    recordAdminAudit(actor, "player.disconnect", located.player.id, { name: located.player.name, reason });
    located.player.socket.close(4003, reason);
    sendJson(res, 200, { ok: true });
    return;
  }

  const profileMatch = url.pathname.match(/^\/api\/admin\/profiles\/([a-f0-9-]+)$/i);
  if (profileMatch && req.method === "PATCH") {
    if (!rpgProfileStore) {
      sendJson(res, 503, { error: "Supabase profile persistence is not configured on this server." });
      return;
    }
    const body = await readJsonBody(req);
    const online = authenticatedPlayers.get(profileMatch[1]);
    if (online) {
      const progress = body.progress ? normalizeRpgProgress(body.progress) : mergeAdminProgress(online.profile.progress, body.patch);
      if (body.expectedRevision !== undefined && Number(body.expectedRevision) !== online.profile.revision) {
        sendJson(res, 409, { error: "Profile revision conflict. Refresh before saving." });
        return;
      }
      await saveAdminPlayerProfile(online, { displayName: sanitizePlayerName(body.displayName || online.name), progress }, "admin_console");
      recordAdminAudit(actor, "profile.update", profileMatch[1], { online: true });
      sendJson(res, 200, { profile: clientProfile(online.profile) });
      return;
    }
    const current = await rpgProfileStore.find(profileMatch[1]);
    if (!current) {
      sendJson(res, 404, { error: "Profile not found." });
      return;
    }
    if (body.expectedRevision !== undefined && Number(body.expectedRevision) !== current.revision) {
      sendJson(res, 409, { error: "Profile revision conflict. Refresh before saving." });
      return;
    }
    const progress = body.progress ? normalizeRpgProgress(body.progress) : mergeAdminProgress(current.progress, body.patch);
    const saved = await rpgProfileStore.save({ ...current, displayName: sanitizePlayerName(body.displayName || current.displayName), progress });
    recordAdminAudit(actor, "profile.update", profileMatch[1], { online: false });
    sendJson(res, 200, { profile: clientProfile(saved) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/world") {
    const body = await readJsonBody(req);
    const roomId = sanitizeRoomId(body.roomId || "lobby");
    const room = rooms.get(roomId);
    if (!room) {
      sendJson(res, 404, { error: "Room not found." });
      return;
    }
    if (body.action === "announce") {
      const message = sanitizeAdminText(body.message, 240);
      if (!message) throw Object.assign(new Error("Announcement text is required."), { status: 400 });
      broadcast(roomId, { type: "rpg_admin_notice", message });
      recordAdminAudit(actor, "world.announce", roomId, { message });
      sendJson(res, 200, { ok: true });
      return;
    }
    if (body.action === "respawn") {
      const scope = body.scope === "resources" ? "resources" : body.scope === "enemies" ? "enemies" : "all";
      if (scope !== "resources") {
        for (const [enemyId, enemy] of Object.entries(room.rpg.enemies)) {
          const definition = RPG_ENEMIES[enemyId];
          if (!definition) continue;
          Object.assign(enemy, { hp: definition.maxHp, maxHp: definition.maxHp, x: definition.x, y: definition.y, respawnAt: 0, targetPlayerId: null, status: null });
          broadcast(roomId, { type: "rpg_enemy_state", enemy });
        }
      }
      if (scope !== "enemies") {
        for (const resource of Object.values(room.rpg.resources)) {
          Object.assign(resource, { available: true, claimedBy: null, completeAt: null, respawnAt: 0 });
          broadcast(roomId, { type: "rpg_resource_state", resource });
        }
      }
      schedulePersist();
      recordAdminAudit(actor, "world.respawn", roomId, { scope });
      sendJson(res, 200, { ok: true, scope });
      return;
    }
    sendJson(res, 400, { error: "Unknown world action." });
    return;
  }

  sendJson(res, 404, { error: "Admin endpoint not found." });
}

function paymentAllocations() {
  const entries = [
    PAYMENT_RESERVE_TOKEN_ACCOUNT || PAYMENT_RESERVE_OWNER_WALLET
      ? {
          label: "reserve",
          tokenAccount: PAYMENT_RESERVE_TOKEN_ACCOUNT,
          ownerWallet: PAYMENT_RESERVE_OWNER_WALLET,
          bps: PAYMENT_RESERVE_BPS,
        }
      : null,
    PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT || PAYMENT_REWARD_RESERVE_OWNER_WALLET
      ? {
          label: "reward_reserve",
          tokenAccount: PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT,
          ownerWallet: PAYMENT_REWARD_RESERVE_OWNER_WALLET,
          bps: PAYMENT_REWARD_RESERVE_BPS,
        }
      : null,
    PAYMENT_OPS_TOKEN_ACCOUNT || PAYMENT_OPS_OWNER_WALLET
      ? {
          label: "ops",
          tokenAccount: PAYMENT_OPS_TOKEN_ACCOUNT,
          ownerWallet: PAYMENT_OPS_OWNER_WALLET,
          bps: PAYMENT_OPS_BPS,
        }
      : null,
  ].filter(Boolean);

  const totalBps = entries.reduce((sum, entry) => sum + entry.bps, 0);
  if (entries.length === 0 || totalBps <= 0) {
    return null;
  }

  const normalized = entries.map((entry) => ({
    ...entry,
    bps: Math.floor((entry.bps / totalBps) * 10_000),
  }));

  const normalizedTotal = normalized.reduce((sum, entry) => sum + entry.bps, 0);
  const remainder = 10_000 - normalizedTotal;
  if (remainder > 0) {
    normalized[0].bps += remainder;
  }

  return normalized;
}

async function resolveTokenPriceUsd() {
  if (Number.isFinite(PAYMENT_TOKEN_PRICE_USD_OVERRIDE) && PAYMENT_TOKEN_PRICE_USD_OVERRIDE > 0) {
    return PAYMENT_TOKEN_PRICE_USD_OVERRIDE;
  }

  if (!PAYMENT_MINT_ADDRESS || !BIRDEYE_API_KEY) {
    return null;
  }

  const url = new URL(BIRDEYE_PRICE_URL);
  url.searchParams.set("address", PAYMENT_MINT_ADDRESS);
  url.searchParams.set("ui_amount_mode", "scaled");

  const response = await fetch(url, {
    headers: {
      "x-chain": "solana",
      "x-api-key": BIRDEYE_API_KEY,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  const price =
    Number(
      payload?.data?.value ??
        payload?.data?.price ??
        payload?.data?.priceUsd ??
        payload?.data?.price_usd ??
        payload?.price ??
        payload?.value,
    );

  return Number.isFinite(price) && price > 0 ? price : null;
}

function broadcast(roomId, message, exceptId = null) {
  const room = rooms.get(sanitizeRoomId(roomId)) || getRoom(roomId);

  for (const [playerId, player] of room.players.entries()) {
    if (exceptId && playerId === exceptId) {
      continue;
    }

    send(player.socket, message.type, message);
  }
}

function normalizePlotState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw;
  if (typeof candidate.id !== "string") return null;

  const structures = {};
  for (const [key, value] of Object.entries(candidate.structures ?? {})) {
    if (!value || typeof value !== "object" || typeof value.type !== "string") continue;
    structures[key] = {
      type: value.type,
      level: Number.isFinite(value.level) ? Math.max(1, Math.floor(value.level)) : 1,
      opened: typeof value.opened === "boolean" ? value.opened : undefined,
      reward: typeof value.reward === "string" ? value.reward : undefined,
    };
  }

  return {
    id: candidate.id,
    name: typeof candidate.name === "string" ? candidate.name : candidate.id,
    kind:
      candidate.kind === "town" || candidate.kind === "mine"
        ? candidate.kind
        : candidate.kind === "hub" || candidate.id === "public-hub" || candidate.name === "Public Hub"
          ? "town"
          : "plot",
    ownerLabel:
      candidate.ownerLabel === null || typeof candidate.ownerLabel === "string"
        ? candidate.ownerLabel
        : null,
    structures,
    chest:
      candidate.chest && typeof candidate.chest === "object" && typeof candidate.chest.id === "string"
        ? { id: candidate.chest.id }
        : null,
    oreNodes: Array.isArray(candidate.oreNodes)
      ? candidate.oreNodes.map(normalizeOreNode).filter(Boolean)
      : [],
    totalCollectedSol: Number.isFinite(candidate.totalCollectedSol)
      ? Math.max(0, Number(candidate.totalCollectedSol))
      : 0,
    totalCollectedMints: Number.isFinite(candidate.totalCollectedMints)
      ? Math.max(0, Number(candidate.totalCollectedMints))
      : 0,
  };
}

function normalizeOreNode(raw) {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.plotId !== "string" ||
    typeof candidate.tile !== "string" ||
    !["small", "medium", "large"].includes(candidate.rarity)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    plotId: candidate.plotId,
    tile: candidate.tile,
    rarity: candidate.rarity,
    reward: Number.isFinite(Number(candidate.reward)) ? Math.max(0, Number(candidate.reward)) : 0,
    createdAt: Number.isFinite(Number(candidate.createdAt)) ? Number(candidate.createdAt) : Date.now(),
    despawnAt: Number.isFinite(Number(candidate.despawnAt))
      ? Number(candidate.despawnAt)
      : Date.now() + 2 * 60 * 60 * 1000,
    miningUntil: Number.isFinite(Number(candidate.miningUntil)) ? Number(candidate.miningUntil) : null,
    miningBy: typeof candidate.miningBy === "string" ? candidate.miningBy : null,
  };
}

function pickWeightedOreRarity() {
  const total = ORE_RARITY_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of ORE_RARITY_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) {
      return rarity;
    }
  }
  return "small";
}

function oreNodeReward(rarity) {
  const [min, max] = ORE_REWARD_RANGE[rarity];
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function oreNodeMiningMs(rarity) {
  return ORE_MINING_MS[rarity];
}

function oreNodeLimitForPlot(plot) {
  if (plot?.kind === "mine") {
    return 4;
  }
  if (plot?.kind === "town") {
    return 0;
  }
  return plot?.ownerLabel ? ORE_NODE_LIMIT : ORE_UNCLAIMED_LIMIT;
}

function oreNodeTileKey(tileX, tileY) {
  return `${tileX}:${tileY}`;
}

function chooseRandomFreeTile(plot) {
  const occupied = new Set();

  for (const key of Object.keys(plot.structures || {})) {
    occupied.add(key);
  }
  for (const ore of plot.oreNodes || []) {
    occupied.add(ore.tile);
  }

  const freeTiles = [];
  for (let x = 0; x < 7; x += 1) {
    for (let y = 0; y < 7; y += 1) {
      const key = oreNodeTileKey(x, y);
      if (!occupied.has(key)) {
        freeTiles.push(key);
      }
    }
  }

  if (freeTiles.length === 0) {
    return null;
  }

  return freeTiles[Math.floor(Math.random() * freeTiles.length)];
}

function chooseOreSpawnPlot(room) {
  const candidates = Object.values(room.plots || {}).filter(
    (plot) => (plot.oreNodes?.length ?? 0) < oreNodeLimitForPlot(plot),
  );

  if (candidates.length === 0) {
    return null;
  }

  const weighted = [];
  for (const plot of candidates) {
    const weight = plot.kind === "mine" ? 8 : plot.ownerLabel ? 1 : 3;
    for (let i = 0; i < weight; i += 1) {
      weighted.push(plot);
    }
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}

function spawnOreNode(room, now = Date.now()) {
  const plot = chooseOreSpawnPlot(room);
  if (!plot) {
    return null;
  }

  const tile = chooseRandomFreeTile(plot);
  if (!tile) {
    return null;
  }

  const rarity = pickWeightedOreRarity();
  const oreNode = {
    id: `ore-${now}-${randomUUID().slice(0, 8)}`,
    plotId: plot.id,
    tile,
    rarity,
    reward: oreNodeReward(rarity),
    createdAt: now,
    despawnAt: now + 2 * 60 * 60 * 1000,
    miningUntil: null,
    miningBy: null,
  };

  plot.oreNodes = [...(plot.oreNodes || []), oreNode];
  room.lastUpdatedAt = now;
  return { plot, oreNode };
}

function normalizeRoomPlots(room) {
  for (const plot of Object.values(room.plots || {})) {
    plot.oreNodes = Array.isArray(plot.oreNodes)
      ? plot.oreNodes.map(normalizeOreNode).filter(Boolean)
      : [];
  }
}

setInterval(() => {
  const now = Date.now();
  let mutated = false;

  for (const [roomId, room] of rooms.entries()) {
    ensureWorldPlots(room);
    normalizeRoomPlots(room);
    const changedPlots = new Set();

    for (const plot of Object.values(room.plots)) {
      const nextOreNodes = plot.oreNodes.filter(
        (node) =>
          (node.miningUntil !== null && now - node.miningUntil < ORE_MINING_GRACE_MS) ||
          node.despawnAt > now,
      );
      if (nextOreNodes.length !== plot.oreNodes.length) {
        plot.oreNodes = nextOreNodes;
        room.lastUpdatedAt = now;
        mutated = true;
        changedPlots.add(plot.id);
      }
    }

    const activeOreCount = Object.values(room.plots).reduce(
      (sum, plot) => sum + (plot.oreNodes?.length || 0),
      0,
    );
    if (activeOreCount < 6 && Math.random() < ORE_SPAWN_CHANCE) {
      const spawned = spawnOreNode(room, now);
      if (spawned) {
        mutated = true;
        changedPlots.add(spawned.plot.id);
      }
    }

    for (const plotId of changedPlots) {
      const plot = room.plots[plotId];
      if (!plot) continue;
      broadcast(
        roomId,
        {
          type: "plot_state",
          plot,
          sourcePlayerId: null,
        },
      );
    }
  }

  if (mutated) {
    schedulePersist();
  }
}, 1000);

setInterval(() => {
  const now = Date.now();
  let mutated = false;

  for (const [roomId, room] of rooms.entries()) {
    ensureRpgWorldState(room);
    const featuredRotation = featuredRpgPublicEvent(now);
    if (room.rpg.publicEventSlot !== featuredRotation.slot) {
      room.rpg.publicEventSlot = featuredRotation.slot;
      const featuredDefinition = RPG_ENEMIES[featuredRotation.event.enemyId];
      const featuredEnemy = room.rpg.enemies[featuredRotation.event.enemyId];
      broadcast(roomId, {
        type: "rpg_world_event",
        status: "active",
        event: {
          ...featuredRotation.event,
          id: featuredRotation.event.enemyId,
          level: featuredDefinition?.level || 1,
          hp: featuredEnemy?.hp || featuredDefinition?.maxHp || 1,
          maxHp: featuredDefinition?.maxHp || 1,
          respawnAt: featuredEnemy?.respawnAt || 0,
          endsAt: featuredRotation.endsAt,
        },
      });
      mutated = true;
    }

    for (const enemy of Object.values(room.rpg.enemies)) {
      const definition = RPG_ENEMIES[enemy.id];
      if (!definition) continue;
      if (enemy.respawnAt) {
        if (enemy.respawnAt > now) continue;
        enemy.hp = definition.maxHp;
        enemy.x = definition.x;
        enemy.y = definition.y;
        enemy.action = "idle";
        enemy.direction = "down";
        enemy.targetPlayerId = null;
        enemy.contributors = {};
        enemy.provokedUntil = 0;
        enemy.lastAttackAt = 0;
        enemy.lastSpecialAt = now;
        enemy.pendingCast = null;
        enemy.respawnAt = 0;
        enemy.status = null;
        mutated = true;
        broadcast(roomId, { type: "rpg_enemy_state", enemy: publicEnemyState(enemy), sourcePlayerId: null, respawned: true });
        if (isFeaturedRpgPublicEvent(definition.id, now)) {
          const event = rpgPublicEventForEnemy(definition.id);
          broadcast(roomId, {
            type: "rpg_world_event",
            status: "active",
            event: { id: definition.id, name: event?.name || definition.id, location: event?.location || "the frontier", region: event?.region || "Orehaven Province", level: definition.level },
          });
        }
        continue;
      }
      if (enemy.hp <= 0 || settlingEnemyRewards.has(`${roomId}:${enemy.id}`)) continue;

      const previousX = enemy.x;
      const previousY = enemy.y;
      const previousAction = enemy.action;
      const previousDirection = enemy.direction;
      const previousStatusExpiresAt = enemy.status?.expiresAt || 0;
      if (enemy.status && enemy.status.expiresAt <= now) enemy.status = null;
      const activeStatus = enemy.status;
      const immobilized = activeStatus?.kind === "stagger" || activeStatus?.kind === "root";
      const speedMultiplier = activeStatus?.kind === "slow" ? 1 - activeStatus.strength : 1;
      let attacked = false;

      if (enemy.pendingCast) {
        const cast = enemy.pendingCast;
        enemy.action = "attack";
        enemy.targetPlayerId = cast.targetPlayerId;
        if (now < cast.completesAt) {
          if (enemy.action !== previousAction || enemy.direction !== previousDirection) {
            broadcast(roomId, { type: "rpg_enemy_state", enemy: publicEnemyState(enemy), sourcePlayerId: null, attacked: false, targetPlayerId: enemy.targetPlayerId });
          }
          continue;
        }

        const castTarget = room.players.get(cast.targetPlayerId);
        const hit = Boolean(
          castTarget
          && validRpgPlayerPosition(castTarget)
          && Math.hypot(castTarget.x - cast.x, castTarget.y - cast.y) <= cast.radius,
        );
        if (hit) {
          const baseRawDamage = enemyAttackDamage(definition, activeStatus);
          const rawDamage = Math.max(2, Math.ceil(baseRawDamage * cast.multiplier));
          const defense = playerDefenseStats(castTarget);
          const damage = mitigateEnemyDamage(rawDamage, defense);
          const defenseXp = Math.max(3, Math.ceil(rawDamage + definition.level * 0.4));
          deliverEnemyDamage(castTarget, {
            enemyId: enemy.id,
            targetPlayerId: castTarget.id,
            damage,
            rawDamage,
            defenseXp,
            abilityName: cast.name,
            special: true,
            impactDelay: 80,
          });
        } else if (castTarget) {
          send(castTarget.socket, "rpg_enemy_dodge", { enemyId: enemy.id, abilityName: cast.name });
        }
        broadcast(roomId, {
          type: "rpg_enemy_telegraph_result",
          enemyId: enemy.id,
          targetPlayerId: cast.targetPlayerId,
          abilityName: cast.name,
          x: cast.x,
          y: cast.y,
          radius: cast.radius,
          color: cast.color,
          hit,
        });
        enemy.pendingCast = null;
        enemy.lastAttackAt = now;
        enemy.action = "idle";
        broadcast(roomId, { type: "rpg_enemy_state", enemy: publicEnemyState(enemy), sourcePlayerId: null, attacked: hit, targetPlayerId: enemy.targetPlayerId });
        continue;
      }

      const target = nearestEnemyTarget(room, enemy, definition);

      if (target) {
        enemy.targetPlayerId = target.player.id;
        enemy.direction = directionToward(enemy.x, enemy.y, target.player.x, target.player.y);
        if (immobilized) {
          enemy.action = "idle";
        } else if (target.distance > definition.attackRange) {
          enemy.action = "walk";
          moveEnemyToward(enemy, target.player, definition, speedMultiplier);
        } else {
          enemy.action = "attack";
          if (now - enemy.lastAttackAt >= definition.attackCooldown) {
            const special = enemySpecialAbility(definition, enemy);
            if (special && now - enemy.lastSpecialAt >= special.cooldownMs) {
              enemy.lastSpecialAt = now;
              enemy.pendingCast = {
                name: special.name,
                targetPlayerId: target.player.id,
                x: target.player.x,
                y: target.player.y,
                radius: special.radius,
                color: special.color,
                multiplier: special.multiplier,
                completesAt: now + special.castMs,
              };
              attacked = true;
              broadcast(roomId, {
                type: "rpg_enemy_telegraph",
                enemyId: enemy.id,
                targetPlayerId: target.player.id,
                abilityName: special.name,
                x: target.player.x,
                y: target.player.y,
                radius: special.radius,
                color: special.color,
                completesAt: now + special.castMs,
              });
            } else {
              enemy.lastAttackAt = now;
              attacked = true;
              const rawDamage = enemyAttackDamage(definition, activeStatus);
              const defense = playerDefenseStats(target.player);
              const damage = mitigateEnemyDamage(rawDamage, defense);
              const defenseXp = Math.max(2, Math.ceil(rawDamage * 0.8 + definition.level * 0.25));
              deliverEnemyDamage(target.player, {
                enemyId: enemy.id,
                targetPlayerId: target.player.id,
                damage,
                rawDamage,
                defenseXp,
                impactDelay: definition.attackStyle === "magic" ? 300 : definition.attackStyle === "range" ? 260 : 210,
              });
            }
          }
        }
      } else {
        enemy.targetPlayerId = null;
        enemy.provokedUntil = 0;
        const homeDistance = Math.hypot(definition.x - enemy.x, definition.y - enemy.y);
        if (immobilized) {
          enemy.action = "idle";
        } else if (homeDistance > 3) {
          enemy.direction = directionToward(enemy.x, enemy.y, definition.x, definition.y);
          enemy.action = "walk";
          moveEnemyHome(enemy, definition, speedMultiplier);
        } else {
          enemy.x = definition.x;
          enemy.y = definition.y;
          enemy.action = "idle";
        }
      }

      const moved = Math.hypot(enemy.x - previousX, enemy.y - previousY) > 0.1;
      const statusChanged = (enemy.status?.expiresAt || 0) !== previousStatusExpiresAt;
      if (moved || attacked || statusChanged || enemy.action !== previousAction || enemy.direction !== previousDirection) {
        broadcast(roomId, {
          type: "rpg_enemy_state",
          enemy: publicEnemyState(enemy),
          sourcePlayerId: null,
          attacked,
          targetPlayerId: enemy.targetPlayerId,
        });
      }
    }

    for (const resource of Object.values(room.rpg.resources)) {
      const definition = RPG_RESOURCES[resource.id];
      if (!definition) continue;

      if (resource.completeAt && resource.completeAt <= now && resource.claimedBy) {
        const claimingPlayer = room.players.get(resource.claimedBy);
        const claimingPlayerId = resource.claimedBy;
        if (claimingPlayer) {
          const completion = {
            playerId: claimingPlayerId,
            resourceId: resource.id,
            reward: { gold: definition.gold, xp: definition.xp, itemId: definition.itemId },
            profileAuthoritative: Boolean(claimingPlayer.profile),
          };
          if (claimingPlayer.profile) {
            void mutateAuthenticatedProfile(
              claimingPlayer,
              "gather_reward",
              (progress) => applyGatherProfileReward(progress, definition),
            )
              .then(() => send(claimingPlayer.socket, "rpg_gather_complete", completion))
              .catch((error) => {
                console.error("Failed to persist gathering reward", error);
                send(claimingPlayer.socket, "rpg_action_error", {
                  action: "gather",
                  message: "Your gathering reward could not be saved. Please try again.",
                });
              });
          } else {
            send(claimingPlayer.socket, "rpg_gather_complete", completion);
          }
        }
        const persistentFishingSpot = definition.kind === "fish";
        resource.available = persistentFishingSpot;
        resource.claimedBy = null;
        resource.completeAt = null;
        resource.respawnAt = persistentFishingSpot ? 0 : now + RPG_RESOURCE_RESPAWN_MS;
        mutated = true;
        broadcast(roomId, { type: "rpg_resource_state", resource, sourcePlayerId: claimingPlayer?.id ?? null });
        continue;
      }

      if (resource.respawnAt && resource.respawnAt <= now) {
        resource.available = true;
        resource.claimedBy = null;
        resource.completeAt = null;
        resource.respawnAt = 0;
        mutated = true;
        broadcast(roomId, { type: "rpg_resource_state", resource, sourcePlayerId: null, respawned: true });
      }
    }
  }

  if (mutated) schedulePersist();
}, RPG_AI_TICK_MS);

async function persistRooms() {
  const data = {
    rooms: Object.fromEntries(
      [...rooms.entries()].map(([roomId, room]) => [
        roomId,
        {
          plots: room.plots,
          rpg: room.rpg,
          lastUpdatedAt: room.lastUpdatedAt,
        },
      ]),
    ),
  };

  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Best-effort persistence only.
  }
}

function schedulePersist() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistRooms();
  }, 250);
}

try {
  const raw = await fs.readFile(STATE_FILE, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === "object" && parsed.rooms && typeof parsed.rooms === "object") {
    for (const [roomId, value] of Object.entries(parsed.rooms)) {
      const roomPlots = {};
      const plots = value && typeof value === "object" ? value.plots : null;
      if (plots && typeof plots === "object") {
        for (const [plotId, plot] of Object.entries(plots)) {
          const normalized = normalizePlotState(plot);
          if (normalized) {
            roomPlots[plotId] = normalized;
          }
        }
      }

      rooms.set(sanitizeRoomId(roomId), {
        players: new Map(),
        plots: roomPlots,
        rpg: value && typeof value === "object" ? value.rpg : createRpgWorldState(),
        parties: new Map(),
        partyInvites: new Map(),
        guildInvites: new Map(),
        lastUpdatedAt: value && typeof value === "object" && Number.isFinite(value.lastUpdatedAt)
          ? value.lastUpdatedAt
          : Date.now(),
      });
      const room = rooms.get(sanitizeRoomId(roomId));
      ensureWorldPlots(room);
      normalizeRoomPlots(room);
      ensureRpgWorldState(room);
    }
  }
} catch {
  // No prior state file yet.
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/health" || req.url === "/api/health")) {
    const hasLivePriceSource = Boolean(BIRDEYE_API_KEY) || PAYMENT_TOKEN_PRICE_USD_OVERRIDE > 0;
    sendJson(res, 200, {
      ok: true,
      service: "ore-acres-realtime",
      uptimeSeconds: Math.floor((Date.now() - SERVER_STARTED_AT) / 1_000),
      persistence: supabaseAdmin ? "supabase" : "guest-only",
      requireAuth: REQUIRE_RPG_AUTH,
      payments: {
        mintAddress: PAYMENT_MINT_ADDRESS,
        quoteReady: Boolean(PAYMENT_MINT_ADDRESS && paymentAllocations() && hasLivePriceSource),
        priceSource: PAYMENT_TOKEN_PRICE_USD_OVERRIDE > 0 ? "manual-override" : BIRDEYE_API_KEY ? "birdeye" : "missing",
      },
    });
    return;
  }

  if (req.url?.startsWith("/api/admin")) {
    const authorization = adminRequestAuthorized(req);
    if (!authorization.ok) {
      sendJson(res, authorization.status, { error: authorization.message });
      return;
    }
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      await handleAdminApi(req, res, url, authorization);
    } catch (error) {
      const status = Number(error?.status) || (error?.code === "PROFILE_CONFLICT" ? 409 : 500);
      if (status >= 500) console.error("Admin API request failed", error);
      sendJson(res, status, { error: status >= 500 ? "Admin operation failed safely." : error.message });
    }
    return;
  }

  if (req.url && req.url.startsWith("/api/payment-quote")) {
    (async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const usd = Number(url.searchParams.get("usd"));

        if (!Number.isFinite(usd) || usd <= 0) {
          sendJson(res, 400, { error: "Missing or invalid usd amount." });
          return;
        }

        if (!PAYMENT_MINT_ADDRESS) {
          sendJson(res, 503, {
            error: "Payment configuration is missing.",
            needs: ["PAYMENT_MINT_ADDRESS"],
          });
          return;
        }

        const tokenPriceUsd = await resolveTokenPriceUsd();
        if (!tokenPriceUsd) {
          sendJson(res, 503, {
            error: "Token price is unavailable.",
            needs: PAYMENT_TOKEN_PRICE_USD_OVERRIDE > 0 ? [] : ["BIRDEYE_API_KEY or PAYMENT_TOKEN_PRICE_USD_OVERRIDE"],
          });
          return;
        }

        const allocations = paymentAllocations();
        if (!allocations) {
          sendJson(res, 503, {
            error: "Payment split configuration is missing.",
            needs: [
              "PAYMENT_RESERVE_OWNER_WALLET or PAYMENT_RESERVE_TOKEN_ACCOUNT",
              "PAYMENT_REWARD_RESERVE_OWNER_WALLET or PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT",
              "PAYMENT_OPS_OWNER_WALLET or PAYMENT_OPS_TOKEN_ACCOUNT",
            ],
          });
          return;
        }

        const tokenAmountUi = usd / tokenPriceUsd;

        sendJson(res, 200, {
          mintAddress: PAYMENT_MINT_ADDRESS,
          treasuryTokenAccount: PAYMENT_RESERVE_TOKEN_ACCOUNT,
          treasuryOwnerWallet: PAYMENT_RESERVE_OWNER_WALLET,
          usdAmount: usd,
          tokenPriceUsd,
          tokenAmountUi,
          allocations,
        });
      } catch (error) {
        sendJson(res, 500, {
          error: "Failed to build payment quote.",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return;
  }

  if (req.url === "/healthz") {
    sendJson(res, 200, { ok: true, rooms: rooms.size });
    return;
  }

  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain", ...corsHeaders() });
    res.end("Ore Acres realtime server");
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

const wss = new WebSocketServer({
  noServer: true,
  handleProtocols: (protocols) => (protocols.has("oreacres.v1") ? "oreacres.v1" : false),
});

server.on("upgrade", async (request, socket, head) => {
  const origin = request.headers.origin || "*";
  if (ALLOWED_ORIGIN !== "*" && origin !== ALLOWED_ORIGIN) {
    socket.destroy();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  let identity;
  try {
    identity = await authenticateSocketRequest(request);
  } catch {
    rejectUpgrade(socket, 503, "Authentication service unavailable.");
    return;
  }
  if (!identity.ok) {
    rejectUpgrade(socket, identity.status, identity.message);
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.roomId = sanitizeRoomId(url.searchParams.get("room") || "lobby");
    ws.playerName = sanitizePlayerName(url.searchParams.get("name"));
    ws.authIdentity = identity;
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", async (ws) => {
  const roomId = ws.roomId || "lobby";
  const room = getRoom(roomId);
  const playerId = randomUUID();
  let profile = null;
  if (ws.authIdentity?.mode === "supabase") {
    try {
      const existing = authenticatedPlayers.get(ws.authIdentity.userId);
      if (existing) {
        clearTimeout(existing.positionSaveTimer);
        existing.positionSaveTimer = null;
        await existing.profileSaveQueue?.catch(() => undefined);
        await persistPlayerPosition(existing).catch(() => undefined);
        existing.skipDisconnectPositionSave = true;
        existing.socket.close(4001, "This account connected from another session.");
      }
      profile = await rpgProfileStore.load(ws.authIdentity.userId, ws.playerName);
    } catch (error) {
      console.error("Failed to load RPG profile", error);
      ws.close(1011, "Could not load your adventurer profile.");
      return;
    }
  }
  const player = {
    id: playerId,
    name: sanitizePlayerName(profile?.displayName || ws.playerName || `Adventurer-${playerId.slice(0, 4)}`),
    userId: ws.authIdentity?.userId ?? null,
    authMode: ws.authIdentity?.mode ?? "guest",
    x: profile?.progress.position && isWorldPositionWalkable(profile.progress.position.x, profile.progress.position.y, PLAYER_COLLISION_RADIUS)
      ? profile.progress.position.x
      : RPG_PLAYER_START.x,
    y: profile?.progress.position && isWorldPositionWalkable(profile.progress.position.x, profile.progress.position.y, PLAYER_COLLISION_RADIUS)
      ? profile.progress.position.y
      : RPG_PLAYER_START.y,
    avatarStyle: {
      skinTone: "sunlit",
      hairColor: "cocoa",
      baseOutfit: "mint",
    },
    equippedPickaxeSkin: null,
    equippedClothesSkin: null,
    appearance: profile?.progress.appearance || "vanguard",
    customization: profile?.progress.customization || customizationForRpgAppearance("vanguard"),
    equipped: profile ? { ...profile.progress.equipped } : { weapon: "bronze-sword", tool: "bronze-pick", armor: "" },
    action: "idle",
    direction: "down",
    lastSeenAt: Date.now(),
    lastAcceptedMoveAt: Date.now(),
    lastRpgAttackAt: 0,
    lastRpgAbilityAt: {},
    lastRpgSecondWindAt: 0,
    lastChatAt: 0,
    messageWindowStartedAt: Date.now(),
    messageWindowCount: 0,
    pendingProfileActions: 0,
    partyId: null,
    guild: normalizeRpgGuild(profile?.progress.guild),
    waystones: Array.isArray(profile?.progress.waystones) ? [...profile.progress.waystones] : ["orehaven-gate"],
    discoveries: Array.isArray(profile?.progress.discoveries) ? [...profile.progress.discoveries] : ["orehaven"],
    profile,
    profileSaveQueue: Promise.resolve(),
    positionSaveTimer: null,
    skipDisconnectPositionSave: false,
    socket: ws,
  };

  room.players.set(playerId, player);
  if (player.userId) authenticatedPlayers.set(player.userId, player);

  send(ws, "welcome", {
    playerId,
    identity: { mode: player.authMode, userId: player.userId },
    profile: clientProfile(profile),
    snapshot: serializeRoom(roomId),
  });

  broadcast(
    roomId,
    {
      type: "player_joined",
      player: publicRpgPlayer(player),
    },
    playerId,
  );

  ws.on("message", async (raw) => {
    const receivedAt = Date.now();
    if (receivedAt - player.messageWindowStartedAt >= 1_000) {
      player.messageWindowStartedAt = receivedAt;
      player.messageWindowCount = 0;
    }
    player.messageWindowCount += 1;
    if (player.messageWindowCount > 80) {
      ws.close(1008, "Message rate exceeded.");
      return;
    }
    let message;

    try {
      message = JSON.parse(raw.toString("utf8"));
    } catch {
      return;
    }

    if (message.type === "move") {
      const candidateX = Number(message.x);
      const candidateY = Number(message.y);
      let acceptedPosition = false;
      if (Number.isFinite(candidateX) && Number.isFinite(candidateY)) {
        const clampedX = Math.max(20, Math.min(RPG_WORLD.width - 20, candidateX));
        const clampedY = Math.max(28, Math.min(RPG_WORLD.height - 20, candidateY));
        const elapsedSeconds = Math.min(1, Math.max(0.016, (receivedAt - player.lastAcceptedMoveAt) / 1_000));
        const distance = Math.hypot(clampedX - player.x, clampedY - player.y);
        const maximumDistance = 40 + RPG_PLAYER_MOVE_SPEED * elapsedSeconds * 3;
        const speedAllowed = player.authMode === "guest" || RPG_ALLOW_TEST_WARP || distance <= maximumDistance;
        const remainsInArea = (player.y >= 2048) === (clampedY >= 2048);
        if (speedAllowed && remainsInArea && isWorldPositionWalkable(clampedX, clampedY, PLAYER_COLLISION_RADIUS)) {
          player.x = clampedX;
          player.y = clampedY;
          player.lastAcceptedMoveAt = receivedAt;
          acceptedPosition = true;
          if (distance > 0.1) queuePlayerPositionSave(player);
        }
      }
      if (!acceptedPosition && player.authMode === "supabase") {
        send(ws, "rpg_position_correction", { x: player.x, y: player.y });
      }
      if (message.avatarStyle && typeof message.avatarStyle === "object") {
        player.avatarStyle = {
          skinTone: typeof message.avatarStyle.skinTone === "string" ? message.avatarStyle.skinTone : player.avatarStyle.skinTone,
          hairColor: typeof message.avatarStyle.hairColor === "string" ? message.avatarStyle.hairColor : player.avatarStyle.hairColor,
          baseOutfit: typeof message.avatarStyle.baseOutfit === "string" ? message.avatarStyle.baseOutfit : player.avatarStyle.baseOutfit,
        };
      }
      player.equippedPickaxeSkin = typeof message.equippedPickaxeSkin === "string" ? message.equippedPickaxeSkin : player.equippedPickaxeSkin;
      player.equippedClothesSkin = typeof message.equippedClothesSkin === "string" ? message.equippedClothesSkin : player.equippedClothesSkin;
      if (player.authMode === "guest") {
        player.appearance = RPG_APPEARANCES.has(message.appearance) ? message.appearance : player.appearance;
        player.customization = normalizeRpgCustomization(message.customization, player.customization);
      }
      if (player.authMode === "guest" && message.equipped && typeof message.equipped === "object") {
        player.equipped = Object.fromEntries(
          RPG_EQUIPMENT_SLOTS.map((slot) => [
            slot,
            typeof message.equipped[slot] === "string" ? message.equipped[slot].slice(0, 48) : player.equipped[slot],
          ]),
        );
      }
      player.action = RPG_PLAYER_ACTIONS.has(message.action) ? message.action : player.action;
      player.direction = RPG_DIRECTIONS.has(message.direction) ? message.direction : player.direction;
      player.lastSeenAt = Date.now();

      broadcast(
        roomId,
        {
          type: "player_moved",
          player: {
            id: player.id,
            x: player.x,
            y: player.y,
            avatarStyle: player.avatarStyle,
            equippedPickaxeSkin: player.equippedPickaxeSkin,
            equippedClothesSkin: player.equippedClothesSkin,
            appearance: player.appearance,
            customization: player.customization,
            equipped: player.equipped,
            action: player.action,
            direction: player.direction,
            totalLevel: publicRpgPlayer(player).totalLevel,
            guild: publicRpgPlayer(player).guild,
          },
        },
        playerId,
      );
      return;
    }

    if (message.type === "rename" && typeof message.name === "string") {
      player.name = sanitizePlayerName(message.name);
      player.lastSeenAt = Date.now();

      broadcast(
        roomId,
        {
          type: "player_renamed",
          player: {
            id: player.id,
            name: player.name,
            avatarStyle: player.avatarStyle,
            equippedPickaxeSkin: player.equippedPickaxeSkin,
            equippedClothesSkin: player.equippedClothesSkin,
            appearance: player.appearance,
            customization: player.customization,
            guild: publicRpgPlayer(player).guild,
          },
        },
        playerId,
      );
      return;
    }

    if (message.type === "rpg_chat") {
      const text = sanitizeChatText(message.text);
      if (!text) return;
      if (receivedAt - player.lastChatAt < 750) {
        send(ws, "rpg_action_error", { action: "chat", message: "Chat is cooling down. Try again in a moment.", retryable: true });
        return;
      }
      player.lastChatAt = receivedAt;
      const chat = {
        id: randomUUID(),
        playerId: player.id,
        name: player.name,
        text,
        at: receivedAt,
      };
      room.chat = [...room.chat.slice(-29), chat];
      broadcast(roomId, { type: "rpg_chat", chat });
      return;
    }

    if (message.type === "rpg_social_chat") {
      const channel = message.channel === "party" || message.channel === "guild" ? message.channel : "";
      const text = sanitizeChatText(message.text);
      if (!channel || !text) return;
      if (receivedAt - player.lastChatAt < 750) {
        send(ws, "rpg_action_error", { action: "chat", message: "Chat is cooling down. Try again in a moment.", retryable: true });
        return;
      }
      let recipients = [];
      if (channel === "party") {
        const party = player.partyId ? room.parties.get(player.partyId) : null;
        if (!party) {
          send(ws, "rpg_action_error", { action: "chat", message: "Join a party before using party chat." });
          return;
        }
        recipients = party.memberIds.map((memberId) => room.players.get(memberId)).filter(Boolean);
      } else {
        if (!player.guild) {
          send(ws, "rpg_action_error", { action: "chat", message: "Join a guild before using guild chat." });
          return;
        }
        recipients = [...room.players.values()].filter((member) => member.guild?.id === player.guild.id);
      }
      player.lastChatAt = receivedAt;
      const chat = {
        id: randomUUID(),
        playerId: player.id,
        name: player.name,
        text,
        at: receivedAt,
        kind: channel,
        tag: channel === "guild" ? player.guild?.tag : undefined,
      };
      recipients.forEach((recipient) => send(recipient.socket, "rpg_chat", { chat }));
      return;
    }

    if (message.type === "rpg_party_invite") {
      const targetPlayerId = typeof message.targetPlayerId === "string" ? message.targetPlayerId : "";
      const target = room.players.get(targetPlayerId);
      if (!target || target.id === player.id) {
        send(ws, "rpg_action_error", { action: "party", message: "That adventurer is no longer available." });
        return;
      }
      if (target.partyId) {
        send(ws, "rpg_action_error", { action: "party", message: `${target.name} is already in a party.` });
        return;
      }
      let party = player.partyId ? room.parties.get(player.partyId) : null;
      if (!party) {
        party = { id: randomUUID(), leaderId: player.id, memberIds: [player.id], createdAt: receivedAt, expedition: null, completedExpeditionIds: [] };
        room.parties.set(party.id, party);
        player.partyId = party.id;
      }
      if (party.leaderId !== player.id) {
        send(ws, "rpg_action_error", { action: "party", message: "Only the party leader can invite adventurers." });
        return;
      }
      if (party.memberIds.length >= RPG_PARTY_MAX_MEMBERS) {
        send(ws, "rpg_action_error", { action: "party", message: "Your party is already full." });
        return;
      }
      const invite = { partyId: party.id, inviterId: player.id, expiresAt: receivedAt + RPG_PARTY_INVITE_MS };
      room.partyInvites.set(target.id, invite);
      notifyPartyState(roomId, party);
      send(target.socket, "rpg_party_invite", {
        ...invite,
        inviterName: player.name,
      });
      send(ws, "rpg_party_notice", { message: `Invitation sent to ${target.name}.` });
      return;
    }

    if (message.type === "rpg_party_accept") {
      const invite = room.partyInvites.get(player.id);
      const party = invite ? room.parties.get(invite.partyId) : null;
      room.partyInvites.delete(player.id);
      if (!invite || invite.expiresAt < receivedAt || !party) {
        send(ws, "rpg_action_error", { action: "party", message: "That party invitation expired." });
        return;
      }
      if (player.partyId || party.memberIds.length >= RPG_PARTY_MAX_MEMBERS) {
        send(ws, "rpg_action_error", { action: "party", message: "That party is no longer available." });
        return;
      }
      party.memberIds.push(player.id);
      player.partyId = party.id;
      notifyPartyState(roomId, party);
      for (const memberId of party.memberIds) {
        const member = room.players.get(memberId);
        if (member) send(member.socket, "rpg_party_notice", { message: `${player.name} joined the party.` });
      }
      return;
    }

    if (message.type === "rpg_party_decline") {
      const invite = room.partyInvites.get(player.id);
      room.partyInvites.delete(player.id);
      if (invite) {
        const inviter = room.players.get(invite.inviterId);
        if (inviter) send(inviter.socket, "rpg_party_notice", { message: `${player.name} declined the invitation.` });
      }
      send(ws, "rpg_party_notice", { message: "Party invitation declined." });
      return;
    }

    if (message.type === "rpg_party_leave") {
      leaveParty(roomId, player);
      return;
    }

    if (message.type === "rpg_expedition_start") {
      const party = player.partyId ? room.parties.get(player.partyId) : null;
      if (!party || party.leaderId !== player.id) {
        send(ws, "rpg_action_error", { action: "party", message: "Only a party leader can begin an expedition." });
        return;
      }
      if (party.memberIds.length < 2) {
        send(ws, "rpg_action_error", { action: "party", message: "Invite at least one ally before starting an expedition." });
        return;
      }
      const definition = RPG_EXPEDITIONS[String(message.expeditionId ?? "")];
      if (!definition) {
        send(ws, "rpg_action_error", { action: "party", message: "That expedition is not on Captain Thorne's board." });
        return;
      }
      if ((party.completedExpeditionIds ?? []).includes(definition.id)) {
        send(ws, "rpg_action_error", { action: "party", message: "Your party already completed that expedition." });
        return;
      }
      if (party.expedition && !party.expedition.completedAt && party.expedition.endsAt > receivedAt) {
        send(ws, "rpg_action_error", { action: "party", message: "Your party already has an active expedition." });
        return;
      }
      party.expedition = {
        ...definition,
        progress: 0,
        contributorIds: [],
        startedAt: receivedAt,
        endsAt: receivedAt + definition.durationMs,
        completedAt: 0,
      };
      notifyPartyState(roomId, party);
      for (const memberId of party.memberIds) {
        const member = room.players.get(memberId);
        if (member) send(member.socket, "rpg_party_notice", { message: `${definition.name} started. Defeat ${definition.target} ${definition.targetKind} targets with at least 2 contributors.` });
      }
      return;
    }

    if (message.type === "rpg_guild_create") {
      const name = sanitizeGuildName(message.name);
      const tag = sanitizeGuildTag(message.tag);
      if (player.guild) {
        send(ws, "rpg_action_error", { action: "guild", message: "Leave your current guild before founding another." });
        return;
      }
      if (name.length < 3 || tag.length < 2) {
        send(ws, "rpg_action_error", { action: "guild", message: "Guild names need 3 characters and tags need 2." });
        return;
      }
      const guild = {
        id: randomUUID(),
        name,
        tag,
        founderId: player.userId || player.id,
        joinedAt: receivedAt,
        renown: 0,
      };
      try {
        await setPlayerGuild(roomId, player, guild, "guild_created", `${name} was founded.`);
      } catch (error) {
        console.error("Failed to create guild", error);
        send(ws, "rpg_action_error", { action: "guild", message: "Your guild could not be saved." });
      }
      return;
    }

    if (message.type === "rpg_guild_invite") {
      const targetPlayerId = typeof message.targetPlayerId === "string" ? message.targetPlayerId : "";
      const target = room.players.get(targetPlayerId);
      if (!player.guild) {
        send(ws, "rpg_action_error", { action: "guild", message: "Found or join a guild before inviting adventurers." });
        return;
      }
      if (!target || target.id === player.id) {
        send(ws, "rpg_action_error", { action: "guild", message: "That adventurer is no longer available." });
        return;
      }
      if (target.guild) {
        send(ws, "rpg_action_error", { action: "guild", message: `${target.name} already belongs to a guild.` });
        return;
      }
      const invite = {
        guild: normalizeRpgGuild(player.guild),
        inviterId: player.id,
        inviterName: player.name,
        expiresAt: receivedAt + RPG_GUILD_INVITE_MS,
      };
      room.guildInvites.set(target.id, invite);
      send(target.socket, "rpg_guild_invite", invite);
      send(ws, "rpg_guild_notice", { message: `Guild invitation sent to ${target.name}.` });
      return;
    }

    if (message.type === "rpg_guild_accept") {
      const invite = room.guildInvites.get(player.id);
      room.guildInvites.delete(player.id);
      const inviter = invite ? room.players.get(invite.inviterId) : null;
      if (
        !invite
        || invite.expiresAt < receivedAt
        || !inviter?.guild
        || inviter.guild.id !== invite.guild?.id
        || player.guild
      ) {
        send(ws, "rpg_action_error", { action: "guild", message: "That guild invitation is no longer available." });
        return;
      }
      const membership = normalizeRpgGuild({ ...invite.guild, joinedAt: receivedAt, renown: 0 });
      try {
        await setPlayerGuild(roomId, player, membership, "guild_joined", `You joined ${membership.name}.`);
        for (const member of room.players.values()) {
          if (member.id !== player.id && member.guild?.id === membership.id) {
            send(member.socket, "rpg_guild_notice", { message: `${player.name} joined ${membership.name}.` });
          }
        }
      } catch (error) {
        console.error("Failed to join guild", error);
        send(ws, "rpg_action_error", { action: "guild", message: "Your guild membership could not be saved." });
      }
      return;
    }

    if (message.type === "rpg_guild_decline") {
      room.guildInvites.delete(player.id);
      send(ws, "rpg_guild_notice", { message: "Guild invitation declined." });
      return;
    }

    if (message.type === "rpg_guild_leave") {
      if (!player.guild) return;
      const priorName = player.guild.name;
      try {
        await setPlayerGuild(roomId, player, null, "guild_left", `You left ${priorName}.`);
      } catch (error) {
        console.error("Failed to leave guild", error);
        send(ws, "rpg_action_error", { action: "guild", message: "Your guild membership could not be updated." });
      }
      return;
    }

    if (message.type === "plot_state") {
      const plot = normalizePlotState(message.plot);
      if (!plot) {
        return;
      }

      room.plots[plot.id] = plot;
      room.lastUpdatedAt = Date.now();
      schedulePersist();

      broadcast(
        roomId,
        {
          type: "plot_state",
          plot,
          sourcePlayerId: player.id,
        },
        playerId,
      );
      return;
    }

    if (message.type === "rpg_action_cancel") {
      ensureRpgWorldState(room);
      const resourceId = typeof message.resourceId === "string" ? message.resourceId : "";
      const resource = room.rpg.resources[resourceId];
      let releasedResource = false;
      if (resource?.claimedBy === player.id) {
        resource.available = true;
        resource.claimedBy = null;
        resource.completeAt = null;
        resource.respawnAt = 0;
        releasedResource = true;
        broadcast(roomId, { type: "rpg_resource_state", resource, sourcePlayerId: player.id, released: true });
      }

      const enemyId = typeof message.enemyId === "string" ? message.enemyId : "";
      const enemy = room.rpg.enemies[enemyId];
      if (enemy?.targetPlayerId === player.id) {
        enemy.targetPlayerId = null;
        enemy.provokedUntil = 0;
        enemy.action = "idle";
        broadcast(roomId, { type: "rpg_enemy_state", enemy: publicEnemyState(enemy), sourcePlayerId: player.id, cancelled: true });
      }
      player.action = "idle";
      player.lastSeenAt = receivedAt;
      if (releasedResource) {
        room.lastUpdatedAt = receivedAt;
        schedulePersist();
      }
      send(ws, "rpg_action_cancelled", { enemyId: enemyId || null, resourceId: resourceId || null });
      return;
    }

    if (message.type === "rpg_combat_ability" && message.abilityId === "second-wind") {
      const now = Date.now();
      if (!player.profile || !rpgProfileStore) {
        send(ws, "rpg_action_error", { action: "ability", message: "Sign in to use persistent combat abilities." });
        return;
      }
      const remainingMs = RPG_SECOND_WIND_COOLDOWN_MS - (now - player.lastRpgSecondWindAt);
      if (remainingMs > 0) {
        send(ws, "rpg_action_error", {
          action: "ability",
          message: `Second Wind is ready in ${Math.ceil(remainingMs / 1000)}s.`,
          retryable: true,
          abilityId: "second-wind",
          readyAt: player.lastRpgSecondWindAt + RPG_SECOND_WIND_COOLDOWN_MS,
        });
        return;
      }
      const currentHp = Math.max(0, Number(player.profile.progress.hp) || 0);
      const maxHp = Math.max(1, Number(player.profile.progress.maxHp) || 1);
      if (currentHp >= maxHp) {
        send(ws, "rpg_action_error", { action: "ability", message: "You are already at full health." });
        return;
      }
      let healing = 0;
      try {
        await mutateAuthenticatedProfile(player, "combat_second_wind", (progress) => {
          const restored = Math.max(8, Math.ceil(progress.maxHp * 0.24));
          const nextHp = Math.min(progress.maxHp, progress.hp + restored);
          healing = nextHp - progress.hp;
          return {
            progress: { ...progress, hp: nextHp },
            message: `Second Wind restored ${healing} hitpoints.`,
          };
        });
      } catch (error) {
        console.error("Failed to persist Second Wind", error);
        send(ws, "rpg_action_error", { action: "ability", message: "Second Wind could not be saved. Its cooldown was not spent." });
        return;
      }
      player.lastRpgSecondWindAt = now;
      send(ws, "rpg_ability_result", {
        abilityId: "second-wind",
        healing,
        hp: player.profile.progress.hp,
        maxHp: player.profile.progress.maxHp,
        readyAt: now + RPG_SECOND_WIND_COOLDOWN_MS,
      });
      return;
    }

    if (message.type === "rpg_tree_ability") {
      ensureRpgWorldState(room);
      const ability = RPG_SKILL_TREE[String(message.abilityId || "")];
      const enemyId = typeof message.enemyId === "string" ? message.enemyId : "";
      const primary = room.rpg.enemies[enemyId];
      const primaryDefinition = RPG_ENEMIES[enemyId];
      const now = Date.now();
      if (!ability || ability.kind !== "active" || !primary || !primaryDefinition || primary.hp <= 0 || primary.respawnAt > now) {
        send(ws, "rpg_action_error", { action: "combat", message: "That skill has no valid target." });
        return;
      }
      const stats = authenticatedCombatStats(player);
      const combatStyle = stats?.combatStyle || RPG_ITEM_RULES[player.equipped?.weapon]?.combatStyle || "melee";
      if (combatStyle !== ability.branch) {
        send(ws, "rpg_action_error", { action: "combat", message: `${ability.name} requires a ${ability.branch} weapon.` });
        return;
      }
      if (player.profile) {
        const unlocked = player.profile.progress.skillTree?.unlocked || [];
        if (!unlocked.includes(ability.id)) {
          send(ws, "rpg_action_error", { action: "combat", message: "Unlock that skill in your skill tree first." });
          return;
        }
      }
      if (!playerWithinRange(player, primary, RPG_ATTACK_RANGES[combatStyle])) {
        send(ws, "rpg_action_error", { action: "combat", message: `Move into ${combatStyle} range before using ${ability.name}.`, retryable: true });
        return;
      }
      if (!hasWorldLineOfSight(player.x, player.y, primary.x, primary.y)) {
        send(ws, "rpg_action_error", { action: "combat", message: "Terrain is blocking that skill.", retryable: true });
        return;
      }
      const treeBonuses = rpgSkillTreeBonuses(player.profile?.progress, combatStyle);
      const abilityCooldownMs = Math.max(1_000, Math.round(ability.cooldownMs * treeBonuses.cooldownMultiplier));
      const remainingMs = abilityCooldownMs - (now - (player.lastRpgAbilityAt[ability.id] || 0));
      if (remainingMs > 0) {
        send(ws, "rpg_action_error", { action: "combat", message: `${ability.name} is ready in ${Math.ceil(remainingMs / 1000)}s.`, retryable: true, abilityId: ability.id, readyAt: (player.lastRpgAbilityAt[ability.id] || 0) + abilityCooldownMs, treeAbility: true });
        return;
      }

      const combatLevel = stats?.combatLevel || 1;
      const weaponPower = stats?.weaponPower || RPG_ITEM_RULES[player.equipped?.weapon]?.power || 1;
      const baseDamage = combatStyle === "range"
        ? randomInteger([2, 4]) + Math.ceil(combatLevel * 0.85) + weaponPower
        : combatStyle === "magic"
          ? randomInteger([3, 6]) + combatLevel + weaponPower
          : randomInteger([2, 5]) + combatLevel + weaponPower;
      const abilityRadius = ability.areaRadius ? ability.areaRadius * treeBonuses.areaMultiplier : 0;
      const targets = abilityRadius
        ? Object.entries(room.rpg.enemies)
            .filter(([id, enemy]) => RPG_ENEMIES[id] && enemy.hp > 0 && enemy.respawnAt <= now && Math.hypot(enemy.x - primary.x, enemy.y - primary.y) <= abilityRadius)
            .map(([id, enemy]) => ({ enemy, definition: RPG_ENEMIES[id] }))
        : [{ enemy: primary, definition: primaryDefinition }];
      player.lastRpgAbilityAt[ability.id] = now;
      player.lastRpgAttackAt = now;
      const readyAt = now + abilityCooldownMs;
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        await applyTreeAbilityDamage(
          roomId,
          player,
          target.enemy,
          target.definition,
          rpgSkillTreeDamage(Math.ceil(baseDamage * ability.multiplier * (index === 0 ? 1 : 0.82)), treeBonuses, target.enemy),
          combatStyle,
          ability,
          { secondary: index > 0, abilityReadyAt: index === 0 ? readyAt : 0 },
        );
      }
      if (ability.dot && primary.hp > 0) {
        primary.activeDots = primary.activeDots || {};
        const dotId = `${player.id}:${ability.id}:${now}`;
        primary.activeDots[ability.id] = dotId;
        for (let tick = 1; tick <= ability.dot.ticks; tick += 1) {
          setTimeout(() => {
            if (primary.activeDots?.[ability.id] !== dotId || primary.hp <= 0 || primary.respawnAt > Date.now()) return;
            void applyTreeAbilityDamage(
              roomId,
              player,
              primary,
              primaryDefinition,
              rpgSkillTreeDamage(Math.ceil(baseDamage * ability.dot.multiplier * treeBonuses.dotMultiplier), treeBonuses, primary),
              combatStyle,
              ability,
              { effectTick: true, tickIndex: tick },
            );
          }, ability.dot.intervalMs * tick);
        }
      }
      return;
    }

    if (message.type === "rpg_attack") {
      ensureRpgWorldState(room);
      const enemyId = typeof message.enemyId === "string" ? message.enemyId : "";
      const definition = RPG_ENEMIES[enemyId];
      const enemy = room.rpg.enemies[enemyId];
      const now = Date.now();

      if (!definition || !enemy) {
        send(ws, "rpg_action_error", { action: "combat", message: "That enemy no longer exists." });
        return;
      }
      if (enemy.respawnAt || enemy.hp <= 0) {
        send(ws, "rpg_action_error", { action: "combat", message: `${enemyId} has already been defeated.` });
        return;
      }
      const settlementKey = `${roomId}:${enemyId}`;
      if (settlingEnemyRewards.has(settlementKey)) {
        send(ws, "rpg_action_error", { action: "combat", message: "That defeat is already being settled." });
        return;
      }
      const authenticatedStats = authenticatedCombatStats(player);
      const combatStyle = authenticatedStats?.combatStyle || (RPG_COMBAT_STYLES.has(message.combatStyle) ? message.combatStyle : "melee");
      const equippedWeaponId = authenticatedStats?.weaponId
        || (RPG_ITEM_RULES[player.equipped?.weapon]?.category === "weapon" ? player.equipped.weapon : "bronze-sword");
      const signature = RPG_WEAPON_ABILITIES[equippedWeaponId] || RPG_WEAPON_ABILITIES["bronze-sword"];
      const requestedAbilityId = typeof message.abilityId === "string" ? message.abilityId : "";
      const ability = requestedAbilityId === signature.id ? signature : null;
      if (requestedAbilityId && !ability) {
        send(ws, "rpg_action_error", { action: "combat", message: "That ability does not match your equipped weapon." });
        return;
      }
      if (!playerWithinRange(player, enemy, RPG_ATTACK_RANGES[combatStyle])) {
        send(ws, "rpg_action_error", { action: "combat", message: `Move into ${combatStyle} range before attacking.`, retryable: true });
        return;
      }
      if (!hasWorldLineOfSight(player.x, player.y, enemy.x, enemy.y)) {
        send(ws, "rpg_action_error", { action: "combat", message: "Terrain is blocking your attack.", retryable: true });
        return;
      }
      const abilityRemainingMs = ability
        ? ability.cooldownMs - (now - (player.lastRpgAbilityAt[ability.id] || 0))
        : 0;
      if (ability && abilityRemainingMs > 0) {
        send(ws, "rpg_action_error", {
          action: "combat",
          message: `${ability.name} is ready in ${Math.ceil(abilityRemainingMs / 1000)}s.`,
          retryable: true,
          abilityId: ability.id,
          readyAt: (player.lastRpgAbilityAt[ability.id] || 0) + ability.cooldownMs,
        });
        return;
      }
      if (!ability && now - player.lastRpgAttackAt < 350) {
        send(ws, "rpg_action_error", { action: "combat", message: "Your next attack is not ready yet.", retryable: true });
        return;
      }

      const combatLevel = authenticatedStats?.combatLevel
        || Math.max(1, Math.min(99, Math.floor(Number(message.combatLevel ?? message.attackLevel) || 1)));
      const defenseLevel = authenticatedStats?.defenseLevel
        || Math.max(1, Math.min(99, Math.floor(Number(message.defenseLevel) || 1)));
      const weaponPower = authenticatedStats?.weaponPower
        || Math.max(1, Math.min(12, Math.floor(Number(message.weaponPower) || 1)));
      const baseDamage = combatStyle === "range"
        ? randomInteger([2, 4]) + Math.ceil(combatLevel * 0.85) + weaponPower
        : combatStyle === "magic"
          ? randomInteger([3, 6]) + combatLevel + weaponPower
          : randomInteger([2, 5]) + combatLevel + weaponPower;
      const treeBonuses = rpgSkillTreeBonuses(player.profile?.progress, combatStyle);
      const damage = rpgSkillTreeDamage(abilityDamage(baseDamage, ability, enemy), treeBonuses, enemy);
      const nextEnemyHp = Math.max(0, enemy.hp - damage);
      const defeated = nextEnemyHp <= 0;
      const appliedStatus = ability?.status && !defeated
        ? {
            kind: ability.status.kind,
            label: ability.status.label,
            expiresAt: now + ability.status.durationMs,
            strength: Math.max(0, Math.min(0.8, ability.status.strength || 0)),
            sourcePlayerId: player.id,
          }
        : null;
      const retaliation = 0;
      const reward = defeated
        ? { gold: randomInteger(definition.gold), xp: definition.xp, itemId: rollRpgLoot(definition) }
        : { gold: 0, xp: 0 };
      const featuredEvent = isFeaturedRpgPublicEvent(definition.id, now);

      if (featuredEvent) {
        const prior = enemy.contributors?.[player.id] || { damage: 0 };
        enemy.contributors = {
          ...(enemy.contributors || {}),
          [player.id]: {
            damage: prior.damage + Math.min(damage, enemy.hp),
            lastHitAt: now,
            combatStyle,
          },
        };
      }
      const eventParticipants = defeated && featuredEvent
        ? eligibleWorldEventParticipants(room, enemy, definition, now)
        : [];

      player.lastRpgAttackAt = now;
      if (ability) player.lastRpgAbilityAt[ability.id] = now;
      if (defeated && player.profile) {
        settlingEnemyRewards.add(settlementKey);
        const previousHp = enemy.hp;
        enemy.hp = 0;
        enemy.respawnAt = now + (definition.respawnMs || RPG_ENEMY_RESPAWN_MS);
        enemy.action = "idle";
        enemy.targetPlayerId = null;
        enemy.provokedUntil = 0;
        enemy.status = null;
        schedulePersist();
        broadcast(roomId, {
          type: "rpg_enemy_state",
          enemy: publicEnemyState(enemy),
          sourcePlayerId: player.id,
          damage,
          retaliation,
          defeated: true,
          settling: true,
          combatStyle,
          abilityId: ability?.id ?? null,
          abilityReadyAt: ability ? now + ability.cooldownMs : 0,
          hitCount: ability?.hitCount ?? 1,
          statusApplied: false,
          reward: { gold: 0, xp: 0 },
          profileAuthoritative: true,
        });
        try {
          await mutateAuthenticatedProfile(
            player,
            "combat_reward",
            (progress) => applyCombatProfileReward(progress, definition, combatStyle, reward, featuredEvent),
          );
        } catch (error) {
          enemy.hp = previousHp;
          enemy.respawnAt = 0;
          enemy.action = "idle";
          enemy.targetPlayerId = player.id;
          enemy.provokedUntil = Date.now() + 10_000;
          settlingEnemyRewards.delete(settlementKey);
          schedulePersist();
          broadcast(roomId, {
            type: "rpg_enemy_state",
            enemy: publicEnemyState(enemy),
            sourcePlayerId: player.id,
            defeated: false,
            settlementFailed: true,
            combatStyle,
          });
          console.error("Failed to persist combat reward", error);
          send(ws, "rpg_action_error", { action: "combat", message: "Your reward could not be saved. The attack was cancelled safely." });
          return;
        }
      }

      player.lastSeenAt = now;
      enemy.hp = nextEnemyHp;
      if (appliedStatus) enemy.status = appliedStatus;
      settlingEnemyRewards.delete(settlementKey);
      enemy.targetPlayerId = player.id;
      enemy.provokedUntil = now + 10_000;

      if (defeated) {
        enemy.respawnAt = now + (definition.respawnMs || RPG_ENEMY_RESPAWN_MS);
        enemy.action = "idle";
        enemy.targetPlayerId = null;
        enemy.provokedUntil = 0;
        enemy.status = null;
      }
      room.lastUpdatedAt = now;
      schedulePersist();
      broadcast(roomId, {
        type: "rpg_enemy_state",
        enemy: publicEnemyState(enemy),
        sourcePlayerId: player.id,
        damage,
        retaliation,
        defeated,
        combatStyle,
        abilityId: ability?.id ?? null,
        abilityReadyAt: ability ? now + ability.cooldownMs : 0,
        hitCount: ability?.hitCount ?? 1,
        statusApplied: Boolean(appliedStatus),
        reward,
        profileAuthoritative: Boolean(player.profile),
      });
      if (defeated && featuredEvent) {
        const event = rpgPublicEventForEnemy(definition.id);
        broadcast(roomId, {
          type: "rpg_world_event",
          status: "complete",
          event: {
            id: definition.id,
            name: event?.name || definition.id,
            location: event?.location || "the frontier",
            region: event?.region || "Orehaven Province",
            level: definition.level,
            participantCount: eventParticipants.length,
            respawnAt: enemy.respawnAt,
          },
        });
        void grantWorldEventParticipationRewards(roomId, definition, eventParticipants, player.id);
      }
      if (defeated && !featuredEvent) {
        void grantPartyAssistRewards(roomId, definition, enemy, player, combatStyle, reward);
        advancePartyExpedition(roomId, player, definition, enemy);
      }
      return;
    }

    if (message.type === "rpg_gather_start") {
      ensureRpgWorldState(room);
      const resourceId = typeof message.resourceId === "string" ? message.resourceId : "";
      const definition = RPG_RESOURCES[resourceId];
      const resource = room.rpg.resources[resourceId];
      const now = Date.now();

      if (!definition || !resource) {
        send(ws, "rpg_action_error", { action: "gather", message: "That resource no longer exists." });
        return;
      }
      if (!resource.available || resource.claimedBy) {
        send(ws, "rpg_action_error", { action: "gather", message: "Another adventurer is already gathering that resource." });
        return;
      }
      if (!playerWithinRange(player, definition)) {
        send(ws, "rpg_action_error", { action: "gather", message: "Move closer before gathering." });
        return;
      }
      const authenticatedStats = authenticatedGatheringStats(player, definition);
      const skillLevel = authenticatedStats?.skillLevel
        || Math.max(1, Math.min(99, Math.floor(Number(message.skillLevel) || 1)));
      if (skillLevel < definition.requiredLevel) {
        send(ws, "rpg_action_error", {
          action: "gather",
          message: `That resource requires level ${definition.requiredLevel}.`,
        });
        return;
      }

      const toolPower = authenticatedStats?.toolPower
        || Math.max(1, Math.min(4, Math.floor(Number(message.toolPower) || 1)));
      const isOre = definition.kind === "ore";
      const toolMultiplier = isOre ? Math.max(0.62, 1 - (toolPower - 1) * 0.19) : 1;
      const duration = Math.round(definition.seconds * 1000 * toolMultiplier);
      resource.available = false;
      resource.claimedBy = player.id;
      resource.completeAt = now + duration;
      resource.respawnAt = 0;
      player.lastSeenAt = now;
      room.lastUpdatedAt = now;
      schedulePersist();
      broadcast(roomId, {
        type: "rpg_resource_state",
        resource,
        sourcePlayerId: player.id,
      });
      return;
    }

    if (message.type === "rpg_dungeon_travel") {
      const portal = RPG_DUNGEON_PORTALS[String(message.portalId || "")];
      if (!portal || !playerWithinRange(player, portal, RPG_WAYSTONE_RANGE)) {
        send(ws, "rpg_action_error", { action: "portal", message: "Move closer to the Sunstone portal before entering." });
        return;
      }
      const threatened = Object.values(room.rpg.enemies).some((enemy) => enemy.targetPlayerId === player.id && enemy.hp > 0 && enemy.respawnAt <= Date.now());
      if (threatened) {
        send(ws, "rpg_action_error", { action: "portal", message: "The portal cannot carry you while a creature is pursuing you." });
        return;
      }
      player.x = portal.destinationX;
      player.y = portal.destinationY;
      player.action = "idle";
      player.lastAcceptedMoveAt = Date.now();
      player.lastSeenAt = Date.now();
      queuePlayerPositionSave(player);
      send(ws, "rpg_dungeon_travel", { portalId: portal.id, x: portal.destinationX, y: portal.destinationY, region: portal.region });
      broadcast(roomId, { type: "player_moved", player: publicRpgPlayer(player) }, player.id);
      return;
    }

    if (message.type === "rpg_waystone_unlock") {
      const waystone = RPG_WAYSTONES[String(message.waystoneId || "")];
      if (!waystone) {
        send(ws, "rpg_action_error", { action: "waystone", message: "That waystone does not exist." });
        return;
      }
      if (!playerWithinRange(player, waystone, RPG_WAYSTONE_RANGE)) {
        send(ws, "rpg_action_error", { action: "waystone", message: "Move closer before attuning that waystone." });
        return;
      }
      if (!player.waystones.includes(waystone.id)) {
        if (player.profile && rpgProfileStore) {
          await mutateAuthenticatedProfile(player, "waystone_unlock", (progress) => ({
            progress: { ...progress, waystones: [...new Set([...(progress.waystones || []), waystone.id])] },
            message: `${waystone.name} joined your travel network.`,
          }));
          player.waystones = [...player.profile.progress.waystones];
        } else {
          player.waystones = [...new Set([...player.waystones, waystone.id])];
        }
      }
      send(ws, "rpg_waystone_state", {
        waystones: player.waystones,
        unlockedId: waystone.id,
        message: `${waystone.name} is attuned.`,
      });
      return;
    }

    if (message.type === "rpg_waystone_travel") {
      const waystone = RPG_WAYSTONES[String(message.waystoneId || "")];
      if (!waystone || !player.waystones.includes(waystone.id)) {
        send(ws, "rpg_action_error", { action: "waystone", message: "Attune that waystone before travelling there." });
        return;
      }
      const threatened = Object.values(room.rpg.enemies).some((enemy) => enemy.targetPlayerId === player.id && enemy.hp > 0 && enemy.respawnAt <= Date.now());
      if (threatened) {
        send(ws, "rpg_action_error", { action: "waystone", message: "You cannot use a waystone while a creature is pursuing you." });
        return;
      }
      player.x = waystone.arrivalX;
      player.y = waystone.arrivalY;
      player.action = "idle";
      player.lastAcceptedMoveAt = Date.now();
      player.lastSeenAt = Date.now();
      queuePlayerPositionSave(player);
      send(ws, "rpg_waystone_travel", { waystoneId: waystone.id, x: waystone.arrivalX, y: waystone.arrivalY, region: waystone.region });
      broadcast(roomId, { type: "player_moved", player: publicRpgPlayer(player) }, player.id);
      return;
    }

    if (message.type === "rpg_region_discover") {
      const regionId = String(message.regionId || "");
      const region = RPG_REGIONS[regionId];
      if (!region || rpgRegionIdAt(player.x, player.y) !== regionId) {
        send(ws, "rpg_action_error", { action: "region", regionId, message: "You must physically enter that region before recording it." });
        return;
      }
      let rewardGold = 0;
      let completionBonus = 0;
      if (!player.discoveries.includes(regionId)) {
        if (player.profile && rpgProfileStore) {
          await mutateAuthenticatedProfile(player, "region_discovery", (progress) => {
            const existing = Array.isArray(progress.discoveries) ? progress.discoveries : ["orehaven"];
            if (existing.includes(regionId)) return { progress, message: `${region.name} was already recorded.` };
            const discoveries = [...new Set([...existing, regionId])];
            rewardGold = RPG_REGION_DISCOVERY_GOLD;
            completionBonus = discoveries.length === Object.keys(RPG_REGIONS).length ? RPG_REGION_COMPLETION_GOLD : 0;
            return {
              progress: { ...progress, discoveries, gold: progress.gold + rewardGold + completionBonus },
              message: `${region.name} discovered. +${rewardGold + completionBonus} gold.`,
            };
          });
          player.discoveries = [...player.profile.progress.discoveries];
        } else {
          player.discoveries = [...new Set([...player.discoveries, regionId])];
          rewardGold = RPG_REGION_DISCOVERY_GOLD;
          completionBonus = player.discoveries.length === Object.keys(RPG_REGIONS).length ? RPG_REGION_COMPLETION_GOLD : 0;
        }
      }
      send(ws, "rpg_region_state", {
        discoveries: player.discoveries,
        discoveredId: regionId,
        rewardGold,
        completionBonus,
        profileAuthoritative: Boolean(player.profile),
        message: rewardGold
          ? `${region.name} discovered. +${rewardGold + completionBonus} gold.`
          : `${region.name} was already recorded.`,
      });
      return;
    }

    if (message.type === "rpg_profile_action") {
      if (!player.profile || !rpgProfileStore) {
        send(ws, "rpg_action_error", { action: "profile", message: "Sign in to save account progression." });
        return;
      }
      if (player.pendingProfileActions >= 1) {
        send(ws, "rpg_action_error", { action: "profile", message: "That account action is already being processed.", retryable: true });
        return;
      }
      const profileAction = typeof message.action === "string" ? message.action : "";
      if (profileAction === "rest") {
        const threatened = Object.values(room.rpg.enemies).some(
          (enemy) => enemy.targetPlayerId === player.id && enemy.hp > 0 && enemy.respawnAt <= Date.now(),
        );
        if (threatened) {
          send(ws, "rpg_action_error", { action: "profile", message: "The fountain cannot mend you while a creature is pursuing you." });
          return;
        }
      }
      const servicePosition = profileAction === "craft"
        ? RPG_NPC_POSITIONS.smith
        : profileAction === "deposit" || profileAction === "withdraw"
          ? RPG_NPC_POSITIONS.banker
          : profileAction === "talk"
            ? RPG_NPC_POSITIONS[message.npcId]
            : profileAction === "treasure_advance"
              ? RPG_TREASURE_CLUES[player.profile.progress.treasureTrail?.step]
              : profileAction === "rest"
                ? RPG_SANCTUARY
                : profileAction === "side_quest"
                  ? RPG_NPC_POSITIONS[sideQuestById(String(message.questId || ""))?.giverNpcId]
            : null;
      if (servicePosition && !playerWithinRange(player, servicePosition)) {
        send(ws, "rpg_action_error", { action: "profile", message: "Move closer to that character before using their service." });
        return;
      }
      player.pendingProfileActions += 1;
      try {
        await mutateAuthenticatedProfile(
          player,
          `profile_${profileAction || "unknown"}`,
          (progress) => applyProfileAction(progress, message),
        );
      } catch (error) {
        const safeMessage = error?.code === "PROFILE_ACTION_INVALID"
          ? error.message
          : "Your account update could not be saved. Nothing was consumed.";
        if (error?.code !== "PROFILE_ACTION_INVALID") console.error("Failed to persist profile action", error);
        send(ws, "rpg_action_error", { action: "profile", message: safeMessage });
      } finally {
        player.pendingProfileActions = Math.max(0, player.pendingProfileActions - 1);
      }
      return;
    }

    if (message.type === "rpg_identity_update") {
      const displayName = sanitizePlayerName(message.displayName);
      const appearance = RPG_APPEARANCES.has(message.appearance) ? message.appearance : null;
      if (player.pendingProfileActions >= 1) {
        send(ws, "rpg_action_error", { action: "identity", message: "Your profile is already being updated. Try again in a moment.", retryable: true });
        return;
      }
      player.pendingProfileActions += 1;
      try {
        if (player.profile && rpgProfileStore) {
          await mutateAuthenticatedProfile(player, "profile_identity", (progress) => ({
            progress: appearance
              ? { ...progress, appearance, customization: customizationForRpgAppearance(appearance) }
              : progress,
            displayName,
            message: "Adventurer identity saved.",
          }));
        } else {
          player.name = displayName;
          if (appearance) {
            player.appearance = appearance;
            player.customization = customizationForRpgAppearance(appearance);
          }
        }
        send(ws, "rpg_identity_state", { displayName: player.name });
        broadcast(roomId, { type: "player_renamed", player: publicRpgPlayer(player) }, player.id);
      } catch (error) {
        console.error("Failed to update RPG identity", error);
        send(ws, "rpg_action_error", { action: "identity", message: "Your adventurer name could not be saved." });
      } finally {
        player.pendingProfileActions = Math.max(0, player.pendingProfileActions - 1);
      }
      return;
    }

    if (message.type === "ping") {
      send(ws, "pong", { at: Date.now() });
    }
  });

  ws.on("close", () => {
    clearTimeout(player.positionSaveTimer);
    player.positionSaveTimer = null;
    if (!player.skipDisconnectPositionSave) {
      void persistPlayerPosition(player).catch((error) => console.error("Failed to persist disconnect position", error));
    }
    if (player.partyId) leaveParty(roomId, player, `${player.name} disconnected.`);
    room.partyInvites.delete(playerId);
    for (const [targetId, invite] of room.partyInvites.entries()) {
      if (invite.inviterId === playerId) room.partyInvites.delete(targetId);
    }
    room.guildInvites.delete(playerId);
    for (const [targetId, invite] of room.guildInvites.entries()) {
      if (invite.inviterId === playerId) room.guildInvites.delete(targetId);
    }
    room.players.delete(playerId);
    if (player.userId && authenticatedPlayers.get(player.userId)?.id === playerId) {
      authenticatedPlayers.delete(player.userId);
    }

    let releasedResource = false;
    for (const resource of Object.values(room.rpg.resources)) {
      if (resource.claimedBy !== playerId) continue;
      resource.available = true;
      resource.claimedBy = null;
      resource.completeAt = null;
      resource.respawnAt = 0;
      releasedResource = true;
      broadcast(roomId, { type: "rpg_resource_state", resource, sourcePlayerId: playerId, released: true });
    }
    if (releasedResource) schedulePersist();

    broadcast(roomId, {
      type: "player_left",
      playerId,
    });

    if (room.players.size === 0 && Object.keys(room.plots).length === 0) {
      rooms.delete(roomId);
      schedulePersist();
    }
  });
});

watchWorldCollisionLayout((layout) => {
  const shapeCount = layout.walkableSegments.length + layout.rectangles.length + layout.circles.length + layout.polygons.length;
  console.log(`Reloaded ${shapeCount} collision shapes.`);
});

server.listen(PORT, () => {
  console.log(`Ore Acres realtime server running on :${PORT}`);
});
