import assert from "node:assert/strict";
import {
  addProfileItem,
  addProfileXp,
  createRpgProfileStore,
  defaultRpgProgress,
  normalizeRpgProgress,
} from "../server/src/rpgProfiles.js";

class FakeQuery {
  constructor(rows) {
    this.rows = rows;
    this.operation = "select";
    this.payload = null;
    this.filters = [];
  }

  select() {
    return this;
  }

  insert(payload) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  eq(key, value) {
    this.filters.push([key, value]);
    return this;
  }

  matchingRow() {
    return [...this.rows.values()].find((row) => this.filters.every(([key, value]) => row[key] === value));
  }

  async maybeSingle() {
    if (this.operation === "select") return { data: this.matchingRow() || null, error: null };
    if (this.operation === "update") {
      const row = this.matchingRow();
      if (!row) return { data: null, error: null };
      Object.assign(row, structuredClone(this.payload));
      return { data: structuredClone(row), error: null };
    }
    throw new Error(`Unsupported maybeSingle operation: ${this.operation}`);
  }

  async single() {
    if (this.operation !== "insert") throw new Error(`Unsupported single operation: ${this.operation}`);
    const row = structuredClone(this.payload);
    this.rows.set(row.user_id, row);
    return { data: structuredClone(row), error: null };
  }
}

const rows = new Map();
const store = createRpgProfileStore({ from: () => new FakeQuery(rows) });
const userId = "4dcd79d8-754c-45b9-89d8-5a1aeb35a316";

const created = await store.load(userId, "Profile Tester");
assert.equal(created.revision, 0);
assert.equal(created.progress.gold, 75);
assert.equal(created.progress.inventory["bronze-sword"], 1);

let rewarded = addProfileXp(created.progress, "mining", 420);
rewarded = addProfileItem(rewarded, "copper-ore", 2);
rewarded.inventory.trout = 0;
rewarded.activities.daily.combat = 3;
rewarded.activities.lifetime.enemiesDefeated = 8;
rewarded.activities.lifetimeTargets["sunstone-revenant"] = 1;
rewarded.collectionLog["rat-tail"] = 2;
rewarded.guild = {
  id: "guild-auric-wardens",
  name: "Auric Wardens",
  tag: "AURIC",
  founderId: userId,
  joinedAt: 1_785_700_000_000,
  renown: 135,
};
rewarded.treasureTrail = { step: 1 };
rewarded.waystones = ["orehaven-gate", "eastern-quarry", "ranger-camp", "sunstone-catacombs"];
rewarded.discoveries = ["orehaven", "western-woods", "moonfen-marsh", "sunstone-catacombs"];
rewarded.position = { x: 768, y: 2192 };
rewarded.skillTree = { unlocked: ["whirlwind", "tempered-body", "arrow-rain", "steady-hands", "sunfire-sigil", "mana-weave"] };
rewarded.adventureClaims = ["warden-in-training", "province-walker"];
const saved = await store.save({ ...created, progress: rewarded });
assert.equal(saved.revision, 1);
assert.equal(saved.progress.skills.mining.level, 4);
assert.equal(saved.progress.inventory["copper-ore"], 2);
assert.equal(saved.progress.inventory.trout, undefined, "consumed starter items must not reappear");
assert.equal(saved.progress.activities.daily.combat, 3);
assert.equal(saved.progress.activities.lifetime.enemiesDefeated, 8);
assert.equal(saved.progress.activities.lifetimeTargets["sunstone-revenant"], 1);
assert.equal(saved.progress.collectionLog["rat-tail"], 2);
assert.equal(saved.progress.guild?.name, "Auric Wardens");
assert.equal(saved.progress.guild?.tag, "AURIC");
assert.equal(saved.progress.guild?.renown, 135);
assert.equal(saved.progress.treasureTrail?.step, 1);
assert.deepEqual(saved.progress.waystones, ["orehaven-gate", "eastern-quarry", "ranger-camp", "sunstone-catacombs"]);
assert.deepEqual(saved.progress.discoveries, ["orehaven", "western-woods", "moonfen-marsh", "sunstone-catacombs"]);
assert.deepEqual(saved.progress.position, { x: 768, y: 2192 });
assert.deepEqual(saved.progress.skillTree.unlocked, ["whirlwind", "tempered-body", "arrow-rain", "steady-hands", "sunfire-sigil", "mana-weave"]);
assert.deepEqual(saved.progress.adventureClaims, ["warden-in-training", "province-walker"]);

await assert.rejects(
  () => store.save({ ...created, progress: defaultRpgProgress() }),
  (error) => error?.code === "PROFILE_CONFLICT",
);

const normalized = normalizeRpgProgress({ gold: Number.POSITIVE_INFINITY, hp: -20, inventory: { trout: -5 } });
assert.equal(normalized.gold, 75);
assert.equal(normalized.hp, 0);
assert.equal(normalized.inventory.trout, undefined);
assert.deepEqual(normalizeRpgProgress({ position: { x: 1400, y: 7100 } }).position, { x: 1400, y: 7100 }, "frontier positions must survive profile normalization");
assert.equal(normalizeRpgProgress({ questStep: 999 }).questStep, 57, "quest progress must preserve the full Icefang campaign");
const customized = normalizeRpgProgress({
  customization: {
    faceStyle: "cheerful",
    hairStyle: "shorthawk",
    beardStyle: "winter",
    skinTone: "deep",
    hairColor: "copper",
    shirtColor: "crimson",
    pantsColor: "charcoal",
    bootsColor: "brown",
    armorDye: "moonsteel",
    weaponDye: "sunsteel",
    helmetStyle: "greathelm",
    capeStyle: "briar",
    shieldStyle: "crusader",
    showHelmet: false,
    showCape: false,
    showShield: false,
    showWeapon: false,
  },
});
assert.equal(customized.customization.skinTone, "deep");
assert.equal(customized.customization.faceStyle, "cheerful");
assert.equal(customized.customization.beardStyle, "winter");
assert.equal(customized.customization.armorDye, "moonsteel");
assert.equal(customized.customization.weaponDye, "sunsteel");
assert.equal(customized.customization.helmetStyle, "greathelm");
assert.equal(customized.customization.capeStyle, "briar");
assert.equal(customized.customization.shieldStyle, "crusader");
assert.equal(customized.customization.showHelmet, false);
assert.equal(customized.customization.showCape, false);
assert.equal(customized.customization.showShield, false);
assert.equal(customized.customization.showWeapon, false);
assert.equal(normalizeRpgProgress({ customization: { hairStyle: "../../bad" } }).customization.hairStyle, "plain");
assert.equal(normalizeRpgProgress({ customization: { faceStyle: "../../bad" } }).customization.faceStyle, "determined");
assert.equal(normalizeRpgProgress({ customization: { beardStyle: "../../bad" } }).customization.beardStyle, "none");
assert.equal(normalizeRpgProgress({ customization: { armorDye: "../../bad" } }).customization.armorDye, "original");
assert.equal(normalizeRpgProgress({ customization: { weaponDye: "neon-hack" } }).customization.weaponDye, "original");
assert.equal(normalizeRpgProgress({ customization: { helmetStyle: "../../bad" } }).customization.helmetStyle, "auto");
assert.equal(normalizeRpgProgress({ customization: { capeStyle: "../../bad" } }).customization.capeStyle, "auto");
assert.equal(normalizeRpgProgress({ customization: { shieldStyle: "../../bad" } }).customization.shieldStyle, "auto");
assert.equal(normalizeRpgProgress({ customization: { showHelmet: "no" } }).customization.showHelmet, true);
const staleActivities = normalizeRpgProgress({
  activities: {
    lifetime: { enemiesDefeated: 25 },
    lifetimeTargets: { "sunstone-revenant": 2, "../../bad": 99 },
    daily: { day: "2000-01-01", combat: 500, claimed: ["trail-clearance"] },
  },
}).activities;
assert.equal(staleActivities.daily.combat, 0);
assert.deepEqual(staleActivities.daily.claimed, []);
assert.equal(staleActivities.lifetime.enemiesDefeated, 25);
assert.deepEqual(staleActivities.lifetimeTargets, { "sunstone-revenant": 2 });
assert.deepEqual(normalizeRpgProgress({ collectionLog: { "rat-tail": -4, "auric-core": 3 } }).collectionLog, { "auric-core": 3 });
assert.equal(normalizeRpgProgress({ guild: { id: "../bad", name: "x", tag: "!" } }).guild, null);
assert.equal(normalizeRpgProgress({ treasureTrail: { step: 999 } }).treasureTrail?.step, 2);
assert.deepEqual(
  normalizeRpgProgress({ waystones: ["../../warp", "eastern-quarry", "eastern-quarry"] }).waystones,
  ["orehaven-gate", "eastern-quarry"],
);
assert.deepEqual(normalizeRpgProgress({ skillTree: { unlocked: ["whirlwind", "../../hack", "whirlwind"] } }).skillTree.unlocked, ["whirlwind"]);
assert.deepEqual(normalizeRpgProgress({ skillTree: { unlocked: ["unyielding", "windrunner", "archmage"] } }).skillTree.unlocked, ["unyielding", "windrunner", "archmage"]);
assert.deepEqual(normalizeRpgProgress({ skillTree: { unlocked: ["groundbreaker", "pinning-volley", "frost-nova-tree"] } }).skillTree.unlocked, ["groundbreaker", "pinning-volley", "frost-nova-tree"]);
assert.deepEqual(normalizeRpgProgress({ adventureClaims: ["warden-in-training", "../../hack", "warden-in-training"] }).adventureClaims, ["warden-in-training"]);
assert.deepEqual(
  normalizeRpgProgress({ discoveries: ["../../void", "western-woods", "western-woods"] }).discoveries,
  ["orehaven", "western-woods"],
);

console.log(JSON.stringify({
  createdRevision: created.revision,
  savedRevision: saved.revision,
  miningLevel: saved.progress.skills.mining.level,
  conflictRejected: true,
  consumedStarterStayedConsumed: true,
  maximumQuestStep: 57,
  customizationWhitelisted: true,
  gearDyesWhitelisted: true,
  wardrobeVisibilityWhitelisted: true,
  activityPersistenceVerified: true,
  staleDailyActivityReset: true,
  collectionLogPersistenceVerified: true,
  guildPersistenceVerified: true,
  guildRenownPersisted: saved.progress.guild?.renown,
  treasureTrailPersisted: saved.progress.treasureTrail?.step,
  waystonePersistenceVerified: true,
  regionDiscoveryPersistenceVerified: true,
  positionPersistenceVerified: true,
  skillTreePersistenceVerified: true,
  adventureChroniclePersistenceVerified: true,
  result: "PASS",
}, null, 2));
