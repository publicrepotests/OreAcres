import { useEffect, useMemo, useRef, useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

type StructureType =
  | "shack"
  | "drill"
  | "chest"
  | "storage"
  | "relay"
  | "decor"
  | "shop"
  | "solar"
  | "battery"
  | "cooling"
  | "conveyor"
  | "drone"
  | "scanner"
  | "refinery"
  | "vault"
  | "neon"
  | "statue"
  | "sign"
  | "manager";

type PetType = "mole" | "fox" | "bot" | "drake";

type PetSide = "left" | "right" | "top" | "bottom";

type ChestRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

type ChestReward = {
  id: string;
  label: string;
  description: string;
  rarity: ChestRarity;
  weight: number;
};

type Structure = {
  type: StructureType;
  level: number;
  opened?: boolean;
  reward?: string;
};

type PlotOwner = {
  label: string;
  me: boolean;
};

type Plot = {
  id: string;
  name: string;
  position: { x: number; y: number };
  owner: PlotOwner | null;
  structures: Record<string, Structure>;
  chest: { id: string } | null;
  totalCollectedSol: number;
};

type ShopItem = {
  id: StructureType;
  label: string;
  description: string;
  cost: number;
  category: "build" | "utility" | "decor" | "power" | "automation" | "special";
};

type PetItem = {
  id: PetType;
  label: string;
  description: string;
  cost: number;
  boost: string;
};

type SkinCategory = "pickaxe" | "clothes";

type SkinId =
  | "troll_pick"
  | "laser_pick"
  | "banana_pick"
  | "aura_hoodie"
  | "cyber_jacket"
  | "astronaut_fit";

type SkinItem = {
  id: SkinId;
  label: string;
  description: string;
  cost: number;
  category: SkinCategory;
  meme: string;
  oreMultiplier?: number;
  incomeMultiplier?: number;
};

type MarketplaceListing = {
  id: string;
  skinId: SkinId;
  seller: string;
  price: number;
  createdAt: number;
};

type RewardBoxReward = {
  id: string;
  label: string;
  description: string;
  kind: "sol" | "skin" | "nft";
  weight: number;
  rewardSol?: number;
  skinId?: SkinId;
  nftId?: string;
};

type MissionId =
  | "claim_plot"
  | "second_drill"
  | "first_upgrade"
  | "equip_pet"
  | "open_chest"
  | "income_1"
  | "mansion"
  | "balance_100";

type MissionState = Record<MissionId, boolean>;

type GameStats = {
  drillsPlaced: number;
  upgradesDone: number;
  chestsOpened: number;
  totalEarned: number;
  questBoxesOpened: number;
};

type BonusDrop = {
  id: string;
  plotId: string;
  label: string;
  reward: number;
  rarity: ChestRarity;
  expiresAt: number;
  readyAt: number;
  nftId?: string;
};

type GameState = {
  sol: number;
  plots: Record<string, Plot>;
  claimedPlotId: string | null;
  selectedPlotId: string;
  selectedTile: string | null;
  moveSource: { plotId: string; tile: string } | null;
  activeTool: StructureType;
  avatar: { x: number; y: number };
  inventory: Record<StructureType, number>;
  petInventory: Record<PetType, number>;
  activePet: PetType | null;
  chestReveal: { plotId: string; reward: string } | null;
  missions: MissionState;
  stats: GameStats;
  bonusDrops: BonusDrop[];
  skinInventory: Record<SkinId, number>;
  equippedPickaxeSkin: SkinId | null;
  equippedClothesSkin: SkinId | null;
  marketListings: MarketplaceListing[];
  nftInventory: Record<string, number>;
  questBoxes: number;
  inventoryOpen: boolean;
  shopOpen: boolean;
  marketOpen: boolean;
  questReveal: { label: string; detail: string } | null;
  proof: string;
  message: string;
  lastUpdatedAt: number;
};

type InjectedSolanaProvider = {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signMessage?: (
    message: Uint8Array,
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
  on?: (
    event: "connect" | "disconnect" | "accountChanged",
    handler: () => void,
  ) => void;
  off?: (
    event: "connect" | "disconnect" | "accountChanged",
    handler: () => void,
  ) => void;
};

declare global {
  interface Window {
    solana?: InjectedSolanaProvider;
  }
}

const TICK_MS = 1000;
const STARTING_SOL = 35;
const BASE_STORAGE = 60;
const WORLD_COLUMNS = 3;
const WORLD_ROWS = 3;
const PLOT_SIZE = 520;
const ROAD_GAP = 170;
const WORLD_PADDING = 100;
const WORLD_WIDTH =
  WORLD_PADDING * 2 + WORLD_COLUMNS * PLOT_SIZE + (WORLD_COLUMNS - 1) * ROAD_GAP;
const WORLD_HEIGHT =
  WORLD_PADDING * 2 + WORLD_ROWS * PLOT_SIZE + (WORLD_ROWS - 1) * ROAD_GAP;
const TILE_COUNT = 7;
const TILE_SIZE = PLOT_SIZE / TILE_COUNT;

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "storage",
    label: "Ore Shed",
    description: "Raises your storage cap.",
    cost: 14,
    category: "utility",
  },
  {
    id: "relay",
    label: "Power Relay",
    description: "Boosts nearby drills.",
    cost: 20,
    category: "utility",
  },
  {
    id: "solar",
    label: "Solar Array",
    description: "Gives nearby drills a small output boost.",
    cost: 18,
    category: "power",
  },
  {
    id: "battery",
    label: "Battery Bank",
    description: "Adds storage and protects your idle gains.",
    cost: 22,
    category: "power",
  },
  {
    id: "cooling",
    label: "Cooling Fan",
    description: "Keeps nearby drills efficient.",
    cost: 16,
    category: "power",
  },
  {
    id: "conveyor",
    label: "Conveyor Belt",
    description: "Helps output move faster across the plot.",
    cost: 17,
    category: "automation",
  },
  {
    id: "drone",
    label: "Auto Drone",
    description: "Adds a tiny automated SOL trickle.",
    cost: 24,
    category: "automation",
  },
  {
    id: "scanner",
    label: "Scanner Tower",
    description: "Boosts every drill on the plot a little.",
    cost: 26,
    category: "automation",
  },
  {
    id: "refinery",
    label: "Refinery",
    description: "Turns raw output into better yield.",
    cost: 30,
    category: "automation",
  },
  {
    id: "decor",
    label: "Lantern Post",
    description: "A small glowing decor item.",
    cost: 8,
    category: "decor",
  },
  {
    id: "shop",
    label: "Build Kiosk",
    description: "A little plot shop stand.",
    cost: 18,
    category: "build",
  },
  {
    id: "vault",
    label: "Vault",
    description: "Adds serious storage and a little flex.",
    cost: 28,
    category: "utility",
  },
  {
    id: "neon",
    label: "Neon Sign",
    description: "Pure style with a tiny morale bump.",
    cost: 12,
    category: "decor",
  },
  {
    id: "statue",
    label: "Miner Statue",
    description: "A prestige flex piece for your plot.",
    cost: 14,
    category: "decor",
  },
  {
    id: "sign",
    label: "Billboard",
    description: "Showcase your brand and flex your plot.",
    cost: 10,
    category: "decor",
  },
  {
    id: "manager",
    label: "Manager Bot",
    description: "Keeps your automation running.",
    cost: 32,
    category: "automation",
  },
  {
    id: "chest",
    label: "Gacha Chest",
    description: "A massive mystery chest that bursts open with a reveal.",
    cost: 48,
    category: "special",
  },
];

const INVENTORY_TYPES: StructureType[] = [
  "storage",
  "relay",
  "decor",
  "shop",
  "solar",
  "battery",
  "cooling",
  "conveyor",
  "drone",
  "scanner",
  "refinery",
  "vault",
  "neon",
  "statue",
  "sign",
  "manager",
  "chest",
];
const CORE_TYPES: StructureType[] = ["shack", "drill"];

const PET_ITEMS: PetItem[] = [
  {
    id: "mole",
    label: "Mole",
    description: "Digs around and slightly improves drilling.",
    cost: 12,
    boost: "+0.04 SOL/min",
  },
  {
    id: "fox",
    label: "Fox",
    description: "A sneaky little booster with sharp instincts.",
    cost: 18,
    boost: "+4% income",
  },
  {
    id: "bot",
    label: "Helper Bot",
    description: "Keeps the plot running while you wander.",
    cost: 24,
    boost: "+0.06 SOL/min",
  },
  {
    id: "drake",
    label: "Drake",
    description: "A flashy dragon pet for late-game flexing.",
    cost: 40,
    boost: "+8% income",
  },
];

const SKIN_ITEMS: SkinItem[] = [
  {
    id: "troll_pick",
    label: "Troll Pick",
    description: "A meme pickaxe with ridiculous teeth and a loud clonk.",
    cost: 14,
    category: "pickaxe",
    meme: "100% certified troll energy",
    oreMultiplier: 1.12,
  },
  {
    id: "laser_pick",
    label: "Laser Pick",
    description: "A clean sci-fi pick with a meme-laser hum.",
    cost: 22,
    category: "pickaxe",
    meme: "for serious degens only",
    oreMultiplier: 1.24,
  },
  {
    id: "banana_pick",
    label: "Banana Pick",
    description: "A banana-shaped tool nobody asked for, but everyone wants.",
    cost: 18,
    category: "pickaxe",
    meme: "potassium-powered mining",
    oreMultiplier: 1.18,
  },
  {
    id: "aura_hoodie",
    label: "Aura Hoodie",
    description: "A neon streetwear fit with glowing sleeves.",
    cost: 16,
    category: "clothes",
    meme: "main character drip",
    incomeMultiplier: 1.04,
  },
  {
    id: "cyber_jacket",
    label: "Cyber Jacket",
    description: "A sharp jacket with animated neon stripes.",
    cost: 24,
    category: "clothes",
    meme: "future rich vibes",
    incomeMultiplier: 1.06,
  },
  {
    id: "astronaut_fit",
    label: "Astronaut Fit",
    description: "A shiny suit for mining the moon before anyone else.",
    cost: 30,
    category: "clothes",
    meme: "space-time bag holder",
    incomeMultiplier: 1.08,
  },
];

const QUEST_BOX_REWARDS: RewardBoxReward[] = [
  { id: "sol-small", label: "Tiny SOL Stack", description: "A little reward stack.", kind: "sol", rewardSol: 3, weight: 34 },
  { id: "sol-med", label: "Mid SOL Stack", description: "A decent box payout.", kind: "sol", rewardSol: 6, weight: 20 },
  { id: "skin-pick", label: "Pickaxe Skin", description: "A meme mining cosmetic.", kind: "skin", skinId: "banana_pick", weight: 16 },
  { id: "skin-clothes", label: "Clothes Skin", description: "A flashy wearable drop.", kind: "skin", skinId: "aura_hoodie", weight: 14 },
  { id: "nft-pass", label: "NFT Pass", description: "A placeholder on-chain style collectible.", kind: "nft", nftId: "genesis-miner-pass", weight: 9 },
  { id: "nft-ape", label: "NFT Ape", description: "A meme collectible with attitude.", kind: "nft", nftId: "turbo-ape-miner", weight: 7 },
];

const CHEST_REWARDS: ChestReward[] = [
  {
    id: "ore-cache",
    label: "Placeholder Ore Cache",
    description: "A small stash of placeholder mining loot.",
    rarity: "common",
    weight: 42,
  },
  {
    id: "neon-shard",
    label: "Placeholder Neon Shard",
    description: "A glowing fragment for future cosmetic systems.",
    rarity: "common",
    weight: 38,
  },
  {
    id: "pet-egg",
    label: "Placeholder Pet Egg",
    description: "A suspicious egg with placeholder energy inside.",
    rarity: "uncommon",
    weight: 22,
  },
  {
    id: "drill-skin",
    label: "Placeholder Drill Skin",
    description: "A fancy skin token for your next visual drop.",
    rarity: "uncommon",
    weight: 20,
  },
  {
    id: "power-core",
    label: "Placeholder Power Core",
    description: "Future fuel for special mining tech.",
    rarity: "rare",
    weight: 11,
  },
  {
    id: "jackpot-token",
    label: "Placeholder Jackpot Token",
    description: "A loud, shiny prize for the luckier opens.",
    rarity: "rare",
    weight: 8,
  },
  {
    id: "relic-vault",
    label: "Placeholder Relic Vault",
    description: "A premium placeholder chest reward.",
    rarity: "epic",
    weight: 4,
  },
  {
    id: "golden-drake",
    label: "Placeholder Golden Drake Egg",
    description: "A top-tier placeholder pet reward.",
    rarity: "legendary",
    weight: 1,
  },
];

const DEFAULT_PET_INVENTORY: Record<PetType, number> = {
  mole: 0,
  fox: 0,
  bot: 0,
  drake: 0,
};

const DEFAULT_MISSIONS: MissionState = {
  claim_plot: false,
  second_drill: false,
  first_upgrade: false,
  equip_pet: false,
  open_chest: false,
  income_1: false,
  mansion: false,
  balance_100: false,
};

const DEFAULT_STATS: GameStats = {
  drillsPlaced: 0,
  upgradesDone: 0,
  chestsOpened: 0,
  totalEarned: 0,
  questBoxesOpened: 0,
};

const DEFAULT_SKIN_INVENTORY: Record<SkinId, number> = {
  troll_pick: 0,
  laser_pick: 0,
  banana_pick: 0,
  aura_hoodie: 0,
  cyber_jacket: 0,
  astronaut_fit: 0,
};

const DEFAULT_NFT_INVENTORY: Record<string, number> = {
  "genesis-miner-pass": 0,
  "turbo-ape-miner": 0,
};

const MISSION_REWARDS: Record<MissionId, { title: string; reward: number }> = {
  claim_plot: { title: "Claim a plot", reward: 1 },
  second_drill: { title: "Place a second drill", reward: 2 },
  first_upgrade: { title: "Upgrade anything once", reward: 2 },
  equip_pet: { title: "Equip a pet", reward: 1 },
  open_chest: { title: "Open a gacha chest", reward: 2 },
  income_1: { title: "Hit 1 SOL/min", reward: 3 },
  mansion: { title: "Reach mansion tier", reward: 6 },
  balance_100: { title: "Hold 100 SOL", reward: 4 },
};

const MISSION_ORDER: MissionId[] = [
  "claim_plot",
  "second_drill",
  "first_upgrade",
  "equip_pet",
  "open_chest",
  "income_1",
  "mansion",
  "balance_100",
];

const ECONOMY_SCALE = 0.0045;
const COST_SCALE = 0.68;
const QUEST_BOX_REWARD_SCALE = 0.2;

const AMBIENT_MINERS = [
  { name: "Mira", plotId: "plot-0-1" },
  { name: "Sol", plotId: "plot-2-1" },
  { name: "Ari", plotId: "plot-1-0" },
];

function isStructureType(value: unknown): value is StructureType {
  return (
    value === "shack" ||
    value === "drill" ||
    value === "storage" ||
    value === "relay" ||
    value === "decor" ||
    value === "shop" ||
    value === "solar" ||
    value === "battery" ||
    value === "cooling" ||
    value === "conveyor" ||
    value === "drone" ||
    value === "scanner" ||
    value === "refinery" ||
    value === "vault" ||
    value === "neon" ||
    value === "statue" ||
    value === "sign" ||
    value === "manager" ||
    value === "chest"
  );
}

function isPetType(value: unknown): value is PetType {
  return value === "mole" || value === "fox" || value === "bot" || value === "drake";
}

function isSkinId(value: unknown): value is SkinId {
  return (
    value === "troll_pick" ||
    value === "laser_pick" ||
    value === "banana_pick" ||
    value === "aura_hoodie" ||
    value === "cyber_jacket" ||
    value === "astronaut_fit"
  );
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function plotKey(x: number, y: number) {
  return `plot-${x}-${y}`;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function scaledCost(cost: number) {
  return Math.max(1, Math.round(cost * COST_SCALE));
}

function scaledReward(value: number) {
  return round(value * QUEST_BOX_REWARD_SCALE);
}

function plotCenter(position: { x: number; y: number }) {
  return {
    x: position.x + PLOT_SIZE / 2,
    y: position.y + PLOT_SIZE / 2,
  };
}

function structureLabel(structure?: Structure) {
  if (!structure) return "Open ground";
  const labels: Record<StructureType, string> = {
    shack: "Shack",
    drill: "Drill",
    storage: "Storage",
    relay: "Relay",
    decor: "Lantern",
    shop: "Shop",
    solar: "Solar",
    battery: "Battery",
    cooling: "Cooling",
    conveyor: "Conveyor",
    drone: "Drone",
    scanner: "Scanner",
    refinery: "Refinery",
    vault: "Vault",
    neon: "Neon",
    statue: "Statue",
    sign: "Billboard",
    manager: "Manager",
    chest: "Gacha Chest",
  };
  if (structure.type === "shack") {
    const name =
      structure.level >= 4 ? "Mansion" : structure.level === 3 ? "Villa" : structure.level === 2 ? "House" : "Shack";
    return `${name} Lv.${structure.level}`;
  }

  return `${labels[structure.type]} Lv.${structure.level}`;
}

function petLabel(pet?: PetType | null) {
  switch (pet) {
    case "mole":
      return "Mole";
    case "fox":
      return "Fox";
    case "bot":
      return "Helper Bot";
    case "drake":
      return "Drake";
    default:
      return "No pet";
  }
}

function petBoostLabel(pet?: PetType | null) {
  const item = PET_ITEMS.find((entry) => entry.id === pet);
  return item?.boost ?? "No active bonus";
}

function skinLabel(skinId?: SkinId | null) {
  return SKIN_ITEMS.find((entry) => entry.id === skinId)?.label ?? "No skin";
}

function skinItem(skinId?: SkinId | null) {
  return SKIN_ITEMS.find((entry) => entry.id === skinId) ?? null;
}

function nftLabel(nftId: string) {
  switch (nftId) {
    case "genesis-miner-pass":
      return "Genesis Miner Pass";
    case "turbo-ape-miner":
      return "Turbo Ape Miner";
    default:
      return nftId
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

function pickaxeMultiplier(skinId?: SkinId | null) {
  return skinItem(skinId)?.oreMultiplier ?? 1;
}

function clothesMultiplier(skinId?: SkinId | null) {
  return skinItem(skinId)?.incomeMultiplier ?? 1;
}

function petSideForMovement(dx: number, dy: number): PetSide {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? "left" : "right";
  }
  return dy > 0 ? "top" : "bottom";
}

function chestRarityLabel(rarity: ChestRarity) {
  switch (rarity) {
    case "common":
      return "Common";
    case "uncommon":
      return "Uncommon";
    case "rare":
      return "Rare";
    case "epic":
      return "Epic";
    case "legendary":
      return "Legendary";
  }
}

function chestRarityGlow(rarity: ChestRarity) {
  switch (rarity) {
    case "common":
      return "rgba(171, 184, 201, 0.95)";
    case "uncommon":
      return "rgba(103, 245, 211, 0.95)";
    case "rare":
      return "rgba(122, 167, 255, 0.95)";
    case "epic":
      return "rgba(198, 126, 255, 0.95)";
    case "legendary":
      return "rgba(255, 209, 102, 0.98)";
  }
}

function pickChestReward() {
  const total = CHEST_REWARDS.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = Math.random() * total;
  for (const reward of CHEST_REWARDS) {
    roll -= reward.weight;
    if (roll <= 0) return reward;
  }
  return CHEST_REWARDS[0];
}

function getChestReward(label?: string | null) {
  return CHEST_REWARDS.find((reward) => reward.label === label) ?? null;
}

function preferredChestTiles() {
  return [
    [3, 2],
    [2, 2],
    [4, 2],
    [3, 1],
    [3, 4],
    [2, 3],
    [4, 3],
    [2, 1],
    [4, 1],
    [1, 2],
    [5, 2],
    [1, 3],
    [5, 3],
    [3, 0],
    [3, 5],
  ];
}

function findChestPlacementTile(plot: Plot, preferredTile?: string | null) {
  if (preferredTile && !plot.structures[preferredTile]) {
    return preferredTile;
  }

  for (const [x, y] of preferredChestTiles()) {
    const key = tileKey(x, y);
    if (!plot.structures[key]) return key;
  }

  for (let x = 0; x < TILE_COUNT; x += 1) {
    for (let y = 0; y < TILE_COUNT; y += 1) {
      const key = tileKey(x, y);
      if (!plot.structures[key]) return key;
    }
  }

  return null;
}

function baseIncomeFor(structure: Structure) {
  switch (structure.type) {
    case "drill":
      return 0.42 + structure.level * 0.22;
    case "drone":
      return 0.04 + structure.level * 0.03;
    case "refinery":
      return 0.08 + structure.level * 0.05;
    case "relay":
    case "solar":
    case "battery":
    case "cooling":
    case "conveyor":
    case "scanner":
    case "vault":
    case "shack":
    case "storage":
    case "decor":
    case "shop":
    case "neon":
    case "statue":
    case "sign":
    case "manager":
    case "chest":
      return 0;
  }
}

function storageFor(structure: Structure) {
  switch (structure.type) {
    case "shack":
      return 10;
    case "storage":
      return 24 + structure.level * 18;
    case "battery":
      return 18 + structure.level * 24;
    case "vault":
      return 28 + structure.level * 22;
    case "drill":
    case "relay":
    case "solar":
    case "cooling":
    case "conveyor":
    case "drone":
    case "scanner":
    case "refinery":
    case "decor":
    case "shop":
    case "neon":
    case "statue":
    case "sign":
    case "manager":
      return 0;
  }
}

function relayBonus(x: number, y: number, structures: Record<string, Structure>) {
  const neighbors = [
    tileKey(x - 1, y),
    tileKey(x + 1, y),
    tileKey(x, y - 1),
    tileKey(x, y + 1),
  ];

  let bonus = 1;
  for (const key of neighbors) {
    const structure = structures[key];
    if (structure?.type === "relay") {
      bonus += 0.15 + structure.level * 0.05;
    }
  }
  return bonus;
}

function adjacentKeys(x: number, y: number) {
  return [
    tileKey(x - 1, y),
    tileKey(x + 1, y),
    tileKey(x, y - 1),
    tileKey(x, y + 1),
  ];
}

function computeEconomy(
  plot?: Plot | null,
  activePet?: PetType | null,
  equippedPickaxeSkin?: SkinId | null,
  equippedClothesSkin?: SkinId | null,
) {
  let income = 0;
  let storage = BASE_STORAGE;
  let globalMultiplier = 1;
  globalMultiplier *= clothesMultiplier(equippedClothesSkin);
  const structures = plot?.structures ?? {};

  if (!plot) {
    return { income, storage };
  }

  for (const key of Object.keys(structures)) {
    const currentStructure = structures[key]!;

    storage += storageFor(currentStructure) ?? 0;
    if (currentStructure.type === "solar") {
      globalMultiplier += 0.03 + currentStructure.level * 0.02;
      continue;
    }
    if (currentStructure.type === "scanner") {
      globalMultiplier += 0.04 + currentStructure.level * 0.03;
      continue;
    }
    if (currentStructure.type === "manager") {
      globalMultiplier += 0.02 + currentStructure.level * 0.02;
      continue;
    }
    if (currentStructure.type === "refinery") {
      income += baseIncomeFor(currentStructure) * (1 + currentStructure.level * 0.12);
      continue;
    }
    if (currentStructure.type === "drone") {
      income += baseIncomeFor(currentStructure) * (1 + currentStructure.level * 0.1);
      continue;
    }

    const [x, y] = key.split(":").map(Number);
    const neighbors = adjacentKeys(x, y).map((neighbor) => structures[neighbor]).filter(Boolean) as Structure[];
    const drillNeighbors = neighbors.filter((entry) => entry.type === "drill").length;
    const solarNeighbors = neighbors.filter((entry) => entry.type === "solar").length;
    const coolingNeighbors = neighbors.filter((entry) => entry.type === "cooling").length;
    const conveyorNeighbors = neighbors.filter((entry) => entry.type === "conveyor").length;
    const relayNeighbors = neighbors.filter((entry) => entry.type === "relay").length;

    if (currentStructure.type === "drill") {
      const localBoost =
        1 +
        relayBonus(x, y, structures) * 0.25 +
        solarNeighbors * 0.06 +
        coolingNeighbors * 0.08 +
        conveyorNeighbors * 0.05;
      income += baseIncomeFor(currentStructure) * localBoost * globalMultiplier;
      continue;
    }

    if (currentStructure.type === "relay") {
      income += 0.01 * currentStructure.level * (1 + drillNeighbors * 0.08);
      continue;
    }

    if (currentStructure.type === "battery" || currentStructure.type === "vault") {
      income += 0.005 * currentStructure.level * (1 + relayNeighbors * 0.04);
      continue;
    }

    if (currentStructure.type === "cooling" || currentStructure.type === "conveyor") {
      income += 0.01 * currentStructure.level * (1 + drillNeighbors * 0.12);
      continue;
    }

    if (currentStructure.type === "storage") {
      income += 0.003 * currentStructure.level;
      continue;
    }

    if (currentStructure.type === "decor" || currentStructure.type === "neon" || currentStructure.type === "statue" || currentStructure.type === "sign" || currentStructure.type === "shop") {
      income += 0.002 * currentStructure.level;
      continue;
    }
  }

  if (activePet === "mole") {
    income += 0.04;
  } else if (activePet === "bot") {
    income += 0.06;
    storage += 12;
  } else if (activePet === "fox") {
    globalMultiplier += 0.04;
  } else if (activePet === "drake") {
    income += 0.03;
    globalMultiplier += 0.08;
  }

  return { income: income * globalMultiplier * ECONOMY_SCALE, storage };
}

function resolveMissionRewards(state: GameState) {
  let next = state;
  const claimedPlot = next.claimedPlotId ? next.plots[next.claimedPlotId] : null;
  const economy = claimedPlot
    ? computeEconomy(claimedPlot, next.activePet, next.equippedPickaxeSkin, next.equippedClothesSkin)
    : null;
  const structures = claimedPlot ? Object.values(claimedPlot.structures) : [];
  const drillCount = structures.filter((structure) => structure.type === "drill").length;
  const hasUpgradedStructure = structures.some((structure) => structure.level > 1);
  const hasMansion = structures.some((structure) => structure.type === "shack" && structure.level >= 4);
  const hasPet = next.activePet !== null || Object.values(next.petInventory).some((count) => count > 0);
  const missionChecks: Array<[MissionId, boolean]> = [
    ["claim_plot", Boolean(next.claimedPlotId)],
    ["second_drill", drillCount >= 2],
    ["first_upgrade", hasUpgradedStructure],
    ["equip_pet", hasPet],
    ["open_chest", next.stats.chestsOpened > 0],
    ["income_1", Boolean(economy && economy.income >= 1)],
    ["mansion", hasMansion],
    ["balance_100", next.sol >= 100],
  ];

  const completed: string[] = [];
  let rewardTotal = 0;

  for (const [id, met] of missionChecks) {
    if (!met || next.missions[id]) continue;
    const reward = MISSION_REWARDS[id].reward;
    next = {
      ...next,
      sol: round(next.sol + reward),
      questBoxes: next.questBoxes + 1,
      missions: {
        ...next.missions,
        [id]: true,
      },
      stats: {
        ...next.stats,
        totalEarned: next.stats.totalEarned + reward,
      },
    };
    completed.push(MISSION_REWARDS[id].title);
    rewardTotal += reward;
  }

  if (completed.length > 0) {
    next = {
      ...next,
      message: `Mission complete: ${completed.join(" • ")}. +${rewardTotal.toFixed(0)} SOL and quest boxes.`,
    };
  }

  return next;
}

function starterStructures() {
  return {
    [tileKey(3, 3)]: { type: "shack", level: 1 },
    [tileKey(4, 3)]: { type: "drill", level: 1 },
  } satisfies Record<string, Structure>;
}

function seededMarketListings(): MarketplaceListing[] {
  return [
    { id: "listing-1", skinId: "laser_pick", seller: "Mira", price: 18, createdAt: Date.now() },
    { id: "listing-2", skinId: "cyber_jacket", seller: "Sol", price: 22, createdAt: Date.now() },
    { id: "listing-3", skinId: "troll_pick", seller: "Ari", price: 12, createdAt: Date.now() },
  ];
}

function makePlot(x: number, y: number, owner: PlotOwner | null): Plot {
  const position = {
    x: WORLD_PADDING + x * (PLOT_SIZE + ROAD_GAP),
    y: WORLD_PADDING + y * (PLOT_SIZE + ROAD_GAP),
  };

  return {
    id: plotKey(x, y),
    name: `Plot ${x + 1}-${y + 1}`,
    position,
    owner,
    structures: owner?.me ? starterStructures() : {},
    chest: null,
    totalCollectedSol: 0,
  };
}

function createInitialState(): GameState {
  const plots: Record<string, Plot> = {};

  for (let x = 0; x < WORLD_COLUMNS; x += 1) {
    for (let y = 0; y < WORLD_ROWS; y += 1) {
      const owner =
        x === 1 && y === 1
          ? null
          : x === 0 && y === 1
            ? { label: "Mira", me: false }
            : x === 2 && y === 1
              ? { label: "Sol", me: false }
              : x === 1 && y === 0
                ? { label: "Ari", me: false }
                : null;

      plots[plotKey(x, y)] = makePlot(x, y, owner);

      if (owner && !owner.me) {
        plots[plotKey(x, y)].structures = {
          [tileKey(3, 3)]: { type: "shack", level: 1 },
          [tileKey(4, 3)]: { type: "drill", level: 1 },
        };
      }
    }
  }

  return {
    sol: STARTING_SOL,
    plots,
    claimedPlotId: null,
    selectedPlotId: plotKey(1, 1),
    selectedTile: null,
    moveSource: null,
    activeTool: "drill",
    avatar: {
      x: WORLD_PADDING + WORLD_WIDTH / 2,
      y: WORLD_PADDING + WORLD_HEIGHT / 2,
    },
    inventory: {
      shack: 0,
      drill: 0,
      storage: 0,
      relay: 0,
      decor: 0,
      shop: 0,
      solar: 0,
      battery: 0,
      cooling: 0,
      conveyor: 0,
      drone: 0,
      scanner: 0,
      refinery: 0,
      vault: 0,
      neon: 0,
      statue: 0,
      sign: 0,
      manager: 0,
      chest: 0,
    },
    petInventory: { ...DEFAULT_PET_INVENTORY },
    activePet: null,
    chestReveal: null,
    missions: { ...DEFAULT_MISSIONS },
    stats: { ...DEFAULT_STATS },
    bonusDrops: [],
    skinInventory: { ...DEFAULT_SKIN_INVENTORY },
    equippedPickaxeSkin: null,
    equippedClothesSkin: null,
    marketListings: seededMarketListings(),
    nftInventory: { ...DEFAULT_NFT_INVENTORY },
    questBoxes: 0,
    inventoryOpen: true,
    shopOpen: false,
    marketOpen: false,
    questReveal: null,
    proof: "",
    message: "Walk around the world and claim an empty plot.",
    lastUpdatedAt: Date.now(),
  };
}

function normalizePlot(raw: unknown): Plot | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Plot;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    !candidate.position
  ) {
    return null;
  }

  const structures: Record<string, Structure> = {};
  for (const [key, structure] of Object.entries(candidate.structures ?? {})) {
    if (!structure || !isStructureType(structure.type)) continue;
    if (structure.type === "chest") continue;
    structures[key] = {
      type: structure.type,
      level: Math.max(1, Math.floor(structure.level || 1)),
      opened: typeof structure.opened === "boolean" ? structure.opened : undefined,
      reward: typeof structure.reward === "string" ? structure.reward : undefined,
    };
  }

  const chest =
    candidate.chest && typeof candidate.chest === "object" && typeof (candidate.chest as { id?: unknown }).id === "string"
      ? { id: (candidate.chest as { id: string }).id }
      : Object.values(candidate.structures ?? {}).some(
          (structure) => structure && isStructureType(structure.type) && structure.type === "chest" && !structure.opened,
        )
        ? { id: `${candidate.id}-gacha-chest` }
        : null;

  return {
    id: candidate.id,
    name: candidate.name,
    position: {
      x: Number(candidate.position.x) || 0,
      y: Number(candidate.position.y) || 0,
    },
    owner:
      candidate.owner && typeof candidate.owner.label === "string"
        ? { label: candidate.owner.label, me: Boolean(candidate.owner.me) }
        : null,
    structures,
    chest,
    totalCollectedSol:
      typeof (candidate as { totalCollectedSol?: unknown }).totalCollectedSol === "number"
        ? Math.max(0, (candidate as { totalCollectedSol: number }).totalCollectedSol)
        : 0,
  };
}

function normalizeBonusDrop(raw: unknown): BonusDrop | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<BonusDrop>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.plotId !== "string" ||
    typeof candidate.label !== "string" ||
    typeof candidate.reward !== "number" ||
    typeof candidate.expiresAt !== "number" ||
    typeof candidate.readyAt !== "number"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    plotId: candidate.plotId,
    label: candidate.label,
    reward: candidate.reward,
    rarity:
      candidate.rarity === "common" ||
      candidate.rarity === "uncommon" ||
      candidate.rarity === "rare" ||
      candidate.rarity === "epic" ||
      candidate.rarity === "legendary"
        ? candidate.rarity
        : "common",
    expiresAt: candidate.expiresAt,
    readyAt: candidate.readyAt,
    nftId: typeof candidate.nftId === "string" ? candidate.nftId : undefined,
  };
}

function loadGameState(saveKey: string): GameState {
  const raw = window.localStorage.getItem(saveKey);
  if (!raw) return createInitialState();

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const fallback = createInitialState();
    const plots: Record<string, Plot> = {};

    for (const [key, value] of Object.entries(parsed.plots ?? fallback.plots)) {
      const normalized = normalizePlot(value);
      if (normalized) plots[key] = normalized;
    }

    const loaded: GameState = {
      ...fallback,
      ...parsed,
      plots,
      claimedPlotId: typeof parsed.claimedPlotId === "string" ? parsed.claimedPlotId : null,
      selectedPlotId: typeof parsed.selectedPlotId === "string" ? parsed.selectedPlotId : fallback.selectedPlotId,
      selectedTile: typeof parsed.selectedTile === "string" ? parsed.selectedTile : null,
      moveSource: null,
      activeTool: isStructureType(parsed.activeTool) ? parsed.activeTool : fallback.activeTool,
      avatar:
        parsed.avatar && Number.isFinite(parsed.avatar.x) && Number.isFinite(parsed.avatar.y)
          ? { x: Math.floor(parsed.avatar.x), y: Math.floor(parsed.avatar.y) }
          : fallback.avatar,
      inventory: { ...fallback.inventory, ...(parsed.inventory ?? {}) },
      petInventory: { ...DEFAULT_PET_INVENTORY, ...(parsed.petInventory ?? {}) },
      activePet: isPetType(parsed.activePet) ? parsed.activePet : null,
      chestReveal:
        parsed.chestReveal &&
        typeof parsed.chestReveal.plotId === "string" &&
        typeof parsed.chestReveal.reward === "string"
          ? parsed.chestReveal
          : null,
      missions: { ...DEFAULT_MISSIONS, ...(parsed.missions ?? {}) },
      stats: { ...DEFAULT_STATS, ...(parsed.stats ?? {}) },
      bonusDrops: Array.isArray(parsed.bonusDrops)
        ? parsed.bonusDrops.map(normalizeBonusDrop).filter((drop): drop is BonusDrop => Boolean(drop))
        : [],
      skinInventory: { ...DEFAULT_SKIN_INVENTORY, ...(parsed.skinInventory ?? {}) },
      equippedPickaxeSkin: isSkinId(parsed.equippedPickaxeSkin) ? parsed.equippedPickaxeSkin : null,
      equippedClothesSkin: isSkinId(parsed.equippedClothesSkin) ? parsed.equippedClothesSkin : null,
      marketListings: Array.isArray(parsed.marketListings) ? parsed.marketListings.filter(Boolean) : seededMarketListings(),
      nftInventory: { ...DEFAULT_NFT_INVENTORY, ...(parsed.nftInventory ?? {}) },
      questBoxes: typeof parsed.questBoxes === "number" ? parsed.questBoxes : 0,
      inventoryOpen: typeof parsed.inventoryOpen === "boolean" ? parsed.inventoryOpen : fallback.inventoryOpen,
      proof: typeof parsed.proof === "string" ? parsed.proof : "",
      message: typeof parsed.message === "string" ? parsed.message : fallback.message,
      shopOpen: false,
      marketOpen: false,
      questReveal: null,
      sol: typeof parsed.sol === "number" ? parsed.sol : fallback.sol,
      lastUpdatedAt: typeof parsed.lastUpdatedAt === "number" ? parsed.lastUpdatedAt : Date.now(),
    };

    const savedAt = typeof parsed.lastUpdatedAt === "number" ? parsed.lastUpdatedAt : Date.now();
    const elapsedMs = Math.max(0, Date.now() - savedAt);
    const offlineSeconds = Math.min(60 * 60 * 8, elapsedMs / 1000);
    const claimedPlot = loaded.claimedPlotId ? loaded.plots[loaded.claimedPlotId] : null;
    if (claimedPlot && offlineSeconds > 0) {
      const economy = computeEconomy(
        claimedPlot,
        loaded.activePet,
        loaded.equippedPickaxeSkin,
        loaded.equippedClothesSkin,
      );
      const offlineGain = Math.min(economy.storage, round(economy.income * offlineSeconds));
      if (offlineGain > 0) {
        loaded.sol = round(Math.min(loaded.sol + offlineGain, economy.storage));
        loaded.plots[claimedPlot.id] = {
          ...claimedPlot,
          totalCollectedSol: round((claimedPlot.totalCollectedSol ?? 0) + offlineGain),
        };
        loaded.stats.totalEarned = round(loaded.stats.totalEarned + offlineGain);
        loaded.message = `While you were away, your mine earned ${offlineGain.toFixed(2)} SOL.`;
      }
    }

    return loaded;
  } catch {
    return createInitialState();
  }
}

function formatAddress(address: PublicKey | null) {
  if (!address) return "Not connected";
  const base58 = address.toBase58();
  return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function gameDigest(state: GameState, wallet: PublicKey | null) {
  return JSON.stringify({
    wallet: wallet?.toBase58() ?? "guest",
    sol: round(state.sol),
    claimedPlotId: state.claimedPlotId,
    activePet: state.activePet,
    petInventory: state.petInventory,
    missions: state.missions,
    stats: state.stats,
    lastUpdatedAt: state.lastUpdatedAt,
    skinInventory: state.skinInventory,
    equippedPickaxeSkin: state.equippedPickaxeSkin,
    equippedClothesSkin: state.equippedClothesSkin,
    marketListings: state.marketListings,
    nftInventory: state.nftInventory,
    questBoxes: state.questBoxes,
    marketOpen: state.marketOpen,
    plots: Object.entries(state.plots).map(([id, plot]) => ({
      id,
      owner: plot.owner?.label ?? null,
      totalCollectedSol: round(plot.totalCollectedSol),
      structures: Object.entries(plot.structures).map(([tile, structure]) => ({
        tile,
        type: structure.type,
        level: structure.level,
        opened: structure.opened ?? false,
        reward: structure.reward ?? null,
      })),
    })),
    bonusDrops: state.bonusDrops.map((drop) => ({
      id: drop.id,
      plotId: drop.plotId,
      label: drop.label,
      reward: round(drop.reward),
      rarity: drop.rarity,
      readyAt: drop.readyAt,
      nftId: drop.nftId ?? null,
    })),
  });
}

function buildCost(type: StructureType) {
  const costs: Record<StructureType, number> = {
    shack: 0,
    drill: 0,
    storage: 14,
    relay: 20,
    decor: 8,
    shop: 18,
    solar: 18,
    battery: 22,
    cooling: 16,
    conveyor: 17,
    drone: 24,
    scanner: 26,
    refinery: 30,
    vault: 28,
    neon: 12,
    statue: 14,
    sign: 10,
    manager: 32,
    chest: 48,
  };
  return scaledCost(costs[type]);
}

function upgradeCost(structure: Structure) {
  switch (structure.type) {
    case "shack":
      return structure.level >= 4 ? 0 : scaledCost(12 + structure.level * 7);
    case "drill":
      return structure.level >= 3 ? 0 : scaledCost(10 + structure.level * 6);
    case "storage":
      return scaledCost(8 + structure.level * 5);
    case "relay":
      return scaledCost(12 + structure.level * 7);
    case "solar":
      return scaledCost(10 + structure.level * 6);
    case "battery":
      return scaledCost(10 + structure.level * 6);
    case "cooling":
      return scaledCost(9 + structure.level * 5);
    case "conveyor":
      return scaledCost(9 + structure.level * 5);
    case "drone":
      return scaledCost(11 + structure.level * 6);
    case "scanner":
      return scaledCost(14 + structure.level * 7);
    case "refinery":
      return scaledCost(15 + structure.level * 8);
    case "vault":
      return scaledCost(13 + structure.level * 7);
    case "decor":
    case "shop":
    case "neon":
    case "statue":
    case "sign":
    case "manager":
    case "chest":
      return scaledCost(5 + structure.level * 3);
  }
}

function maxStructureLevel(type: StructureType) {
  switch (type) {
    case "shack":
      return 4;
    case "drill":
      return 3;
    case "storage":
    case "relay":
    case "decor":
    case "shop":
    case "solar":
    case "battery":
    case "cooling":
    case "conveyor":
    case "drone":
    case "scanner":
    case "refinery":
    case "vault":
    case "neon":
    case "statue":
    case "sign":
    case "manager":
    case "chest":
      return 3;
  }
}

function canPlace(type: StructureType) {
  return type !== "shack";
}

function avatarCenter(avatar: { x: number; y: number }) {
  return {
    x: avatar.x,
    y: avatar.y,
  };
}

function AvatarSprite({
  moving,
  pickaxeSkin,
  clothesSkin,
}: {
  moving: boolean;
  pickaxeSkin?: SkinId | null;
  clothesSkin?: SkinId | null;
}) {
  return (
    <div
      className={[
        "avatar",
        moving ? "avatar--moving" : "",
        pickaxeSkin ? `avatar--pickaxe-${pickaxeSkin}` : "",
        clothesSkin ? `avatar--clothes-${clothesSkin}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="avatar__shadow" />
      <div className="avatar__head" />
      <div className="avatar__body" />
      <div className="avatar__legs" />
      <div className="avatar__tool" />
    </div>
  );
}

function PetSprite({ type }: { type: PetType }) {
  return (
    <div className={`pet-sprite pet-sprite--${type}`}>
      {type === "mole" ? (
        <>
          <div className="pet-sprite__shadow" />
          <div className="pet-sprite__body" />
          <div className="pet-sprite__snout" />
          <div className="pet-sprite__eye pet-sprite__eye--left" />
          <div className="pet-sprite__eye pet-sprite__eye--right" />
          <div className="pet-sprite__paw pet-sprite__paw--left" />
          <div className="pet-sprite__paw pet-sprite__paw--right" />
        </>
      ) : null}
      {type === "fox" ? (
        <>
          <div className="pet-sprite__tail" />
          <div className="pet-sprite__body" />
          <div className="pet-sprite__head" />
          <div className="pet-sprite__ear pet-sprite__ear--left" />
          <div className="pet-sprite__ear pet-sprite__ear--right" />
          <div className="pet-sprite__eye pet-sprite__eye--left" />
          <div className="pet-sprite__eye pet-sprite__eye--right" />
        </>
      ) : null}
      {type === "bot" ? (
        <>
          <div className="pet-sprite__antenna" />
          <div className="pet-sprite__antenna-tip" />
          <div className="pet-sprite__body" />
          <div className="pet-sprite__screen" />
          <div className="pet-sprite__wheel pet-sprite__wheel--left" />
          <div className="pet-sprite__wheel pet-sprite__wheel--right" />
        </>
      ) : null}
      {type === "drake" ? (
        <>
          <div className="pet-sprite__wing pet-sprite__wing--left" />
          <div className="pet-sprite__wing pet-sprite__wing--right" />
          <div className="pet-sprite__body" />
          <div className="pet-sprite__head" />
          <div className="pet-sprite__horn pet-sprite__horn--left" />
          <div className="pet-sprite__horn pet-sprite__horn--right" />
          <div className="pet-sprite__eye pet-sprite__eye--left" />
          <div className="pet-sprite__eye pet-sprite__eye--right" />
          <div className="pet-sprite__flame" />
        </>
      ) : null}
    </div>
  );
}

function NeighborMiner({ name }: { name: string }) {
  return (
    <div className="neighbor">
      <div className="neighbor__sprite">
        <div className="neighbor__head" />
        <div className="neighbor__body" />
      </div>
      <span className="neighbor__name">{name}</span>
    </div>
  );
}

function BuildingSprite({ type, level, opened }: { type: StructureType; level: number; opened?: boolean }) {
  if (type === "shack") {
    const tier = Math.min(4, Math.max(1, level));
    return (
      <div className={`sprite sprite--shack sprite--shack-${tier}`}>
        <div className="shack__frame">
          <div className="shack__roof" />
          <div className="shack__wall" />
          <div className="shack__door" />
          <div className="shack__window shack__window--left" />
          <div className="shack__window shack__window--right" />
          <div className="shack__smoke shack__smoke--1" />
          <div className="shack__smoke shack__smoke--2" />
          {tier >= 2 ? <div className="shack__wing shack__wing--left" /> : null}
          {tier >= 2 ? <div className="shack__wing shack__wing--right" /> : null}
          {tier >= 2 ? <div className="shack__chimney" /> : null}
          {tier >= 3 ? <div className="shack__porch" /> : null}
          {tier >= 3 ? <div className="shack__porch-post shack__porch-post--left" /> : null}
          {tier >= 3 ? <div className="shack__porch-post shack__porch-post--right" /> : null}
          {tier >= 4 ? <div className="shack__mansion-wing shack__mansion-wing--left" /> : null}
          {tier >= 4 ? <div className="shack__mansion-wing shack__mansion-wing--right" /> : null}
          {tier >= 4 ? <div className="shack__tower" /> : null}
          {tier >= 4 ? <div className="shack__balcony" /> : null}
          {tier >= 4 ? <div className="shack__column shack__column--1" /> : null}
          {tier >= 4 ? <div className="shack__column shack__column--2" /> : null}
          {tier >= 4 ? <div className="shack__column shack__column--3" /> : null}
          {tier >= 4 ? <div className="shack__column shack__column--4" /> : null}
        </div>
      </div>
    );
  }

  if (type === "drill") {
    const tier = Math.min(3, Math.max(1, level));
    return (
      <div className={`sprite sprite--drill sprite--drill-${tier}`}>
        <div className="drill__frame">
          <div className="drill__base" />
          <div className="drill__mast" />
          <div className="drill__head" />
          <div className="drill__bit" />
          <div className="drill__arm drill__arm--left" />
          <div className="drill__arm drill__arm--right" />
          <div className="drill__body-light" />
          <div className="drill__spark drill__spark--1" />
          <div className="drill__spark drill__spark--2" />
          <div className="drill__spark drill__spark--3" />
          {tier >= 2 ? <div className="drill__canopy" /> : null}
          {tier >= 2 ? <div className="drill__pipe drill__pipe--left" /> : null}
          {tier >= 2 ? <div className="drill__pipe drill__pipe--right" /> : null}
          {tier >= 3 ? <div className="drill__turret" /> : null}
          {tier >= 3 ? <div className="drill__turret-glow" /> : null}
          {Array.from({ length: tier }).map((_, index) => (
            <div key={index} className={`drill__chip drill__chip--${index + 1}`} />
          ))}
        </div>
      </div>
    );
  }

  if (type === "chest") {
    return (
      <div className={`sprite sprite--chest${opened ? " sprite--chest--open" : ""}`}>
        <div className="chest__base" />
        <div className="chest__brace chest__brace--left" />
        <div className="chest__brace chest__brace--right" />
        <div className="chest__lock" />
        <div className="chest__lid" />
        <div className="chest__glow" />
        <div className="chest__spark chest__spark--1" />
        <div className="chest__spark chest__spark--2" />
        <div className="chest__spark chest__spark--3" />
      </div>
    );
  }

  if (type === "storage") {
    return (
      <div className="sprite sprite--storage">
        <div className="storage__body" />
        <div className="storage__lock" />
        <div className="storage__rail" />
      </div>
    );
  }

  if (type === "relay") {
    return (
      <div className="sprite sprite--relay">
        <div className="relay__base" />
        <div className="relay__tower" />
        <div className="relay__wave relay__wave--a" />
        <div className="relay__wave relay__wave--b" />
      </div>
    );
  }

  if (type === "solar") {
    return (
      <div className="sprite sprite--solar">
        <div className="solar__orb" />
        <div className="solar__panel" />
        <div className="solar__stand" />
      </div>
    );
  }

  if (type === "battery") {
    return (
      <div className="sprite sprite--battery">
        <div className="battery__cell" />
        <div className="battery__bar battery__bar--1" />
        <div className="battery__bar battery__bar--2" />
        <div className="battery__bar battery__bar--3" />
      </div>
    );
  }

  if (type === "cooling") {
    return (
      <div className="sprite sprite--cooling">
        <div className="cooling__base" />
        <div className="cooling__fan" />
        <div className="cooling__blade cooling__blade--1" />
        <div className="cooling__blade cooling__blade--2" />
        <div className="cooling__blade cooling__blade--3" />
        <div className="cooling__blade cooling__blade--4" />
      </div>
    );
  }

  if (type === "conveyor") {
    return (
      <div className="sprite sprite--conveyor">
        <div className="conveyor__rail conveyor__rail--left" />
        <div className="conveyor__rail conveyor__rail--right" />
        <div className="conveyor__belt" />
        <div className="conveyor__arrow conveyor__arrow--left" />
        <div className="conveyor__arrow conveyor__arrow--right" />
      </div>
    );
  }

  if (type === "drone") {
    return (
      <div className="sprite sprite--drone">
        <div className="drone__body" />
        <div className="drone__eye" />
        <div className="drone__prop drone__prop--left" />
        <div className="drone__prop drone__prop--right" />
      </div>
    );
  }

  if (type === "scanner") {
    return (
      <div className="sprite sprite--scanner">
        <div className="scanner__mast" />
        <div className="scanner__dish" />
        <div className="scanner__wave scanner__wave--1" />
        <div className="scanner__wave scanner__wave--2" />
      </div>
    );
  }

  if (type === "refinery") {
    return (
      <div className="sprite sprite--refinery">
        <div className="refinery__body" />
        <div className="refinery__chimney" />
        <div className="refinery__glow" />
      </div>
    );
  }

  if (type === "vault") {
    return (
      <div className="sprite sprite--vault">
        <div className="vault__shell" />
        <div className="vault__dial" />
        <div className="vault__lock" />
      </div>
    );
  }

  if (type === "neon") {
    return (
      <div className="sprite sprite--neon">
        <div className="neon__frame" />
        <div className="neon__tube" />
      </div>
    );
  }

  if (type === "statue") {
    return (
      <div className="sprite sprite--statue">
        <div className="statue__pedestal" />
        <div className="statue__figure" />
      </div>
    );
  }

  if (type === "sign") {
    return (
      <div className="sprite sprite--sign">
        <div className="sign__post" />
        <div className="sign__board" />
      </div>
    );
  }

  if (type === "manager") {
    return (
      <div className="sprite sprite--manager">
        <div className="manager__screen" />
        <div className="manager__antenna" />
        <div className="manager__arm manager__arm--left" />
        <div className="manager__arm manager__arm--right" />
      </div>
    );
  }

  if (type === "shop") {
    return (
      <div className="sprite sprite--shop">
        <div className="shop__awning" />
        <div className="shop__front" />
        <div className="shop__sign" />
      </div>
    );
  }

  return (
    <div className="sprite sprite--decor">
      <div className="decor__post" />
      <div className="decor__glow" />
    </div>
  );
}

function pointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function App() {
  const connection = useMemo(
    () => new Connection(clusterApiUrl("devnet"), "confirmed"),
    [],
  );
  const provider = window.solana;
  const [walletPublicKey, setWalletPublicKey] = useState<PublicKey | null>(
    provider?.publicKey ?? null,
  );
  const [devnetBalance, setDevnetBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [moving, setMoving] = useState(false);
  const [petSide, setPetSide] = useState<PetSide>("right");
  const [jackpotReveal, setJackpotReveal] = useState<ChestReward | null>(null);
  const [shopFilter, setShopFilter] = useState<ShopItem["category"] | "all">("all");
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [placementPreview, setPlacementPreview] = useState<{ plotId: string; tile: string } | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const ignoreTileClickRef = useRef(false);
  const chestRevealTimerRef = useRef<number | null>(null);

  const saveKey = walletPublicKey
    ? `solana-tycoon:${walletPublicKey.toBase58()}`
    : "solana-tycoon:guest";

  useEffect(() => {
    const syncWallet = () => {
      setWalletPublicKey(window.solana?.publicKey ?? null);
    };

    syncWallet();

    const injected = window.solana;
    injected?.on?.("connect", syncWallet);
    injected?.on?.("disconnect", syncWallet);
    injected?.on?.("accountChanged", syncWallet);

    return () => {
      injected?.off?.("connect", syncWallet);
      injected?.off?.("disconnect", syncWallet);
      injected?.off?.("accountChanged", syncWallet);
    };
  }, []);

  useEffect(() => {
    setGame(loadGameState(saveKey));
  }, [saveKey]);

  useEffect(() => {
    const saveState = { ...game, chestReveal: null, lastUpdatedAt: Date.now() };
    window.localStorage.setItem(saveKey, JSON.stringify(saveState));
  }, [game, saveKey]);

  useEffect(() => {
    setGame((current) => resolveMissionRewards(current));
  }, [game.claimedPlotId, game.activePet, game.sol, game.stats, game.plots, game.petInventory]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== saveKey || event.storageArea !== window.localStorage) return;
      setGame(loadGameState(saveKey));
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [saveKey]);

  useEffect(() => {
    return () => {
      if (chestRevealTimerRef.current !== null) {
        window.clearTimeout(chestRevealTimerRef.current);
        chestRevealTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setViewportSize({
        width: rect.width,
        height: rect.height,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!walletPublicKey) {
      setDevnetBalance(null);
      return;
    }

    let cancelled = false;
    setLoadingBalance(true);
    connection
      .getBalance(walletPublicKey)
      .then((lamports) => {
        if (!cancelled) setDevnetBalance(lamports / 1_000_000_000);
      })
      .catch(() => {
        if (!cancelled) setDevnetBalance(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingBalance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connection, walletPublicKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGame((current) => {
        const plot = current.claimedPlotId ? current.plots[current.claimedPlotId] : null;
        const now = Date.now();
        const activeDrops = current.bonusDrops.filter((drop) => drop.expiresAt > now);
        let next: GameState = activeDrops.length !== current.bonusDrops.length ? { ...current, bonusDrops: activeDrops } : current;

        if (!plot?.owner?.me) return next;

        const economy = computeEconomy(
          plot,
          next.activePet,
          next.equippedPickaxeSkin,
          next.equippedClothesSkin,
        );
        const nextSol = round(Math.min(next.sol + economy.income / 60, economy.storage));
        const earned = round(nextSol - next.sol);

        if (earned > 0) {
          next = {
            ...next,
            plots: {
              ...next.plots,
              [plot.id]: {
                ...plot,
                totalCollectedSol: round((plot.totalCollectedSol ?? 0) + earned),
              },
            },
            sol: nextSol,
            stats: {
              ...next.stats,
              totalEarned: round(next.stats.totalEarned + earned),
            },
            message: `Your plot is producing ${economy.income.toFixed(2)} SOL/min.`,
          };
        }

        if (
          next.claimedPlotId &&
          Math.random() < 0.04 &&
          !next.bonusDrops.some((drop) => drop.plotId === next.claimedPlotId)
        ) {
          const rarities: ChestRarity[] = ["common", "common", "uncommon", "rare", "epic"];
          const rarity = rarities[Math.floor(Math.random() * rarities.length)];
          const reward = round(
            rarity === "common"
              ? 0.02 + Math.random() * 0.02
              : rarity === "uncommon"
                ? 0.03 + Math.random() * 0.03
                : rarity === "rare"
                  ? 0.05 + Math.random() * 0.04
                  : 0.08 + Math.random() * 0.05,
          );
          const readyAt = now + 180_000 + Math.floor(Math.random() * 120_000);
          next = {
            ...next,
            bonusDrops: [
              ...next.bonusDrops,
              {
                id: `drop-${now}-${Math.random().toString(36).slice(2, 8)}`,
                plotId: next.claimedPlotId,
                label:
                  rarity === "epic"
                    ? "Glowing ore core"
                    : rarity === "rare"
                      ? "Dense ore seam"
                      : rarity === "uncommon"
                        ? "Heavy ore vein"
                        : "Raw ore chunk",
                reward,
                rarity,
                expiresAt: now + 540_000,
                readyAt,
                nftId:
                  rarity === "epic" && Math.random() < 0.35
                    ? "turbo-ape-miner"
                    : rarity === "rare" && Math.random() < 0.16
                      ? "genesis-miner-pass"
                      : undefined,
              },
            ],
          };
        }

        return next;
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = true;
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        setGame((current) => ({ ...current, shopOpen: true, marketOpen: false, inventoryOpen: false }));
      }
      if (event.key === " ") {
        event.preventDefault();
        setGame((current) => ({ ...current, shopOpen: !current.shopOpen, marketOpen: false }));
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;

      const up = keysRef.current["arrowup"] || keysRef.current["w"];
      const down = keysRef.current["arrowdown"] || keysRef.current["s"];
      const left = keysRef.current["arrowleft"] || keysRef.current["a"];
      const right = keysRef.current["arrowright"] || keysRef.current["d"];
      const dx = (right ? 1 : 0) - (left ? 1 : 0);
      const dy = (down ? 1 : 0) - (up ? 1 : 0);

      if (dx !== 0 || dy !== 0) {
        const speed = 180;
        setPetSide(petSideForMovement(dx, dy));
        setMoving(true);
        setGame((current) => {
          const nextX = Math.max(0, Math.min(WORLD_WIDTH, current.avatar.x + dx * speed * dt));
          const nextY = Math.max(0, Math.min(WORLD_HEIGHT, current.avatar.y + dy * speed * dt));
          const selectedPlotId = getSelectedPlotId({ x: nextX, y: nextY }, current.plots);
          const selectedPlot = current.plots[selectedPlotId];

          return {
            ...current,
            avatar: { x: nextX, y: nextY },
            selectedPlotId,
            message: selectedPlot.owner?.me
              ? "You are on your own plot."
              : selectedPlot.owner
                ? `${selectedPlot.owner.label}'s plot selected.`
                : "Open plot selected.",
          };
        });
      } else {
        setMoving(false);
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const claimedPlot = game.claimedPlotId ? game.plots[game.claimedPlotId] : null;
  const selectedPlot = game.plots[game.selectedPlotId];
  const selectedPlotEconomy = claimedPlot
    ? computeEconomy(claimedPlot, game.activePet, game.equippedPickaxeSkin, game.equippedClothesSkin)
    : null;
  const selectedChest = selectedPlot.chest;
  const selectedStructure =
    claimedPlot && game.selectedTile ? claimedPlot.structures[game.selectedTile] ?? null : null;
  const selectedStructureMax = selectedStructure ? maxStructureLevel(selectedStructure.type) : null;
  const nextStructureCost =
    selectedStructure && selectedStructureMax && selectedStructure.level < selectedStructureMax
      ? upgradeCost(selectedStructure)
      : null;
  const selectedStructureName = selectedStructure
    ? structureLabel(selectedStructure).replace(/\sLv\.\d+$/, "")
    : null;
  const availableShopItems = SHOP_ITEMS.filter(
    (item) => shopFilter === "all" || item.category === shopFilter,
  );
  const totalSkinsOwned = Object.values(game.skinInventory).reduce((sum, count) => sum + count, 0);
  const totalNftsOwned = Object.values(game.nftInventory).reduce((sum, count) => sum + count, 0);
  const activeToolOwned = game.inventory[game.activeTool] ?? 0;
  const canPlaceActiveTool = canPlace(game.activeTool) && activeToolOwned > 0;
  const activeToolIsPurchased =
    game.claimedPlotId && canPlace(game.activeTool) && activeToolOwned > 0;

  const camera = useMemo(() => {
    const center = avatarCenter(game.avatar);
    const x = clamp(viewportSize.width / 2 - center.x - 88, viewportSize.width - WORLD_WIDTH, 0);
    const y = clamp(viewportSize.height / 2 - center.y, viewportSize.height - WORLD_HEIGHT, 0);
    return { x, y };
  }, [game.avatar, viewportSize.height, viewportSize.width]);

  function setMessage(message: string) {
    setGame((current) => ({ ...current, message }));
  }

  async function connectWallet() {
    if (!window.solana) {
      setWalletMessage("Install Phantom to connect.");
      return;
    }

    try {
      await window.solana.connect();
      setWalletMessage("Wallet connected.");
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  async function disconnectWallet() {
    try {
      await window.solana?.disconnect();
      setDevnetBalance(null);
      setWalletMessage("Wallet disconnected.");
    } catch {
      setWalletMessage("Could not disconnect wallet.");
    }
  }

  async function requestAirdrop() {
    if (!walletPublicKey) return;

    setWalletMessage("Requesting devnet airdrop...");
    try {
      const sig = await connection.requestAirdrop(walletPublicKey, 1_000_000_000);
      await connection.confirmTransaction(sig, "confirmed");
      const refreshed = await connection.getBalance(walletPublicKey);
      setDevnetBalance(refreshed / 1_000_000_000);
      setWalletMessage("Devnet SOL received.");
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Airdrop failed.");
    }
  }

  function selectPlot(plotId: string) {
    setGame((current) => ({
      ...current,
      selectedPlotId: plotId,
      message: current.plots[plotId].owner?.me
        ? "Your plot selected."
        : current.plots[plotId].owner
          ? `${current.plots[plotId].owner.label}'s plot selected.`
          : "Unclaimed plot selected.",
    }));
  }

function claimSelectedPlot() {
    setGame((current) => {
      if (current.claimedPlotId) {
        return { ...current, message: "You already own a plot." };
      }

      const plot = current.plots[current.selectedPlotId];
      if (plot.owner) {
        return { ...current, message: "That plot is already claimed." };
      }

      const nextPlots = {
        ...current.plots,
        [plot.id]: {
          ...plot,
          owner: { label: "You", me: true },
          structures: starterStructures(),
          chest: null,
        },
      };

      return {
        ...current,
        plots: nextPlots,
        claimedPlotId: plot.id,
        avatar: {
          x: plot.position.x + PLOT_SIZE / 2,
          y: plot.position.y + PLOT_SIZE / 2,
        },
        selectedTile: tileKey(3, 3),
        activeTool: "drill",
        inventory: {
          ...current.inventory,
          storage: 0,
          relay: 0,
          decor: 0,
          shop: 0,
          solar: 0,
          battery: 0,
          cooling: 0,
          conveyor: 0,
          drone: 0,
          scanner: 0,
          refinery: 0,
          vault: 0,
          neon: 0,
          statue: 0,
          sign: 0,
          manager: 0,
        },
        message: "Plot claimed. Your shack and starter drill are ready.",
      };
    });
  }

  function buyShopItem(type: StructureType) {
    setGame((current) => {
      const item = SHOP_ITEMS.find((entry) => entry.id === type);
      if (!item) return current;
      if (!current.claimedPlotId) return { ...current, message: "Claim a plot first." };
      const cost = scaledCost(item.cost);

      if (type === "chest") {
        const plot = current.plots[current.claimedPlotId];
        if (plot.chest) {
          return { ...current, message: "You already have a gacha chest on this plot." };
        }
        if (current.sol < cost) {
          return { ...current, message: `Need ${cost} SOL to buy ${item.label}.` };
        }

        return {
          ...current,
          sol: round(current.sol - cost),
          plots: {
            ...current.plots,
            [current.claimedPlotId]: {
              ...plot,
              chest: { id: `${plot.id}-gacha-chest` },
            },
          },
          selectedTile: null,
          shopOpen: false,
          message: `${item.label} spawned on your plot. Click the giant chest to reveal the prize.`,
        };
      }

      if (current.sol < cost) {
        return { ...current, message: `Need ${cost} SOL to buy ${item.label}.` };
      }

      return {
        ...current,
        sol: round(current.sol - cost),
        inventory: {
          ...current.inventory,
          [type]: (current.inventory[type] ?? 0) + 1,
        },
        activeTool: type,
        shopOpen: false,
        message: `${item.label} bought. Click inside your plot to place it.`,
      };
    });
  }

  function buyPetItem(type: PetType) {
    setGame((current) => {
      const item = PET_ITEMS.find((entry) => entry.id === type);
      if (!item) return current;
      if (!current.claimedPlotId) return { ...current, message: "Claim a plot first." };

      const owned = (current.petInventory[type] ?? 0) > 0;
      const cost = scaledCost(item.cost);
      if (owned) {
        return {
          ...current,
          activePet: type,
          message: `${item.label} equipped.`,
        };
      }

      if (current.sol < cost) {
        return { ...current, message: `Need ${cost} SOL to buy ${item.label}.` };
      }

      return {
        ...current,
        sol: round(current.sol - cost),
        petInventory: {
          ...current.petInventory,
          [type]: 1,
        },
        activePet: type,
        message: `${item.label} joined your crew.`,
      };
    });
  }

  function buySkinItem(skinId: SkinId) {
    setGame((current) => {
      const skin = skinItem(skinId);
      if (!skin) return current;
      if (!current.claimedPlotId) return { ...current, message: "Claim a plot first." };

      const cost = scaledCost(skin.cost);
      if (current.sol < cost) {
        return { ...current, message: `Need ${cost} SOL to buy ${skin.label}.` };
      }

      return {
        ...current,
        sol: round(current.sol - cost),
        skinInventory: {
          ...current.skinInventory,
          [skinId]: (current.skinInventory[skinId] ?? 0) + 1,
        },
        message: `${skin.label} added to your wardrobe.`,
      };
    });
  }

  function openChest(plotId: string) {
    const reward = pickChestReward();

    setGame((current) => {
      if (!current.claimedPlotId || plotId !== current.claimedPlotId) {
        return { ...current, message: "You can only open a chest on your claimed plot." };
      }

      const plot = current.plots[plotId];
      if (!plot.chest) {
        return current;
      }

      return {
        ...current,
        plots: {
          ...current.plots,
          [plotId]: {
            ...plot,
            chest: null,
          },
        },
        selectedTile: null,
        chestReveal: { plotId, reward: reward.label },
        stats: {
          ...current.stats,
          chestsOpened: current.stats.chestsOpened + 1,
        },
        message: `The chest bursts open. You won ${reward.label}.`,
      };
    });

    setJackpotReveal(reward);

    if (chestRevealTimerRef.current !== null) {
      window.clearTimeout(chestRevealTimerRef.current);
    }

    chestRevealTimerRef.current = window.setTimeout(() => {
      setGame((current) =>
        current.chestReveal?.plotId === plotId
          ? { ...current, chestReveal: null }
          : current,
      );
      chestRevealTimerRef.current = null;
    }, 2600);
  }

  function collectBonusDrop(dropId: string) {
    setGame((current) => {
      const drop = current.bonusDrops.find((entry) => entry.id === dropId);
      if (!drop) return current;
      if (Date.now() < drop.readyAt) {
        return { ...current, message: "That ore is still locking in. Give it a bit longer." };
      }

      const pickaxeSkin = current.equippedPickaxeSkin;
      const bonusMultiplier = pickaxeMultiplier(pickaxeSkin);

      return {
        ...current,
        sol: round(current.sol + drop.reward * bonusMultiplier),
        plots: current.claimedPlotId
          ? {
              ...current.plots,
              [current.claimedPlotId]: {
                ...current.plots[current.claimedPlotId],
                totalCollectedSol: round(
                  (current.plots[current.claimedPlotId].totalCollectedSol ?? 0) + drop.reward * bonusMultiplier,
                ),
              },
            }
          : current.plots,
        stats: {
          ...current.stats,
          totalEarned: round(current.stats.totalEarned + drop.reward * bonusMultiplier),
        },
        bonusDrops: current.bonusDrops.filter((entry) => entry.id !== dropId),
        nftInventory:
          drop.nftId !== undefined
            ? {
                ...current.nftInventory,
                [drop.nftId]: (current.nftInventory[drop.nftId] ?? 0) + 1,
              }
            : current.nftInventory,
        message:
          drop.nftId !== undefined
            ? `Collected ${drop.label}. ${nftLabel(drop.nftId)} secured.`
            : `Collected ${drop.label} for ${(drop.reward * bonusMultiplier).toFixed(2)} SOL.`,
      };
    });
  }

  function openQuestBox() {
    setGame((current) => {
      if (current.questBoxes <= 0) return { ...current, message: "You need a quest box first." };
      const reward = QUEST_BOX_REWARDS[Math.floor(Math.random() * QUEST_BOX_REWARDS.length)];
      const next = {
        ...current,
        questBoxes: current.questBoxes - 1,
        stats: {
          ...current.stats,
          questBoxesOpened: current.stats.questBoxesOpened + 1,
        },
      };

      if (reward.kind === "sol" && reward.rewardSol !== undefined) {
        const amount = scaledReward(reward.rewardSol);
        return {
          ...next,
          sol: round(next.sol + amount),
          stats: {
            ...next.stats,
            totalEarned: round(next.stats.totalEarned + amount),
          },
          questReveal: { label: reward.label, detail: `+${amount.toFixed(2)} SOL` },
          message: `Quest box opened: ${reward.label}.`,
        };
      }

      if (reward.kind === "skin" && reward.skinId) {
        return {
          ...next,
          skinInventory: {
            ...next.skinInventory,
            [reward.skinId]: (next.skinInventory[reward.skinId] ?? 0) + 1,
          },
          questReveal: { label: reward.label, detail: skinLabel(reward.skinId) },
          message: `Quest box opened: ${reward.label}. ${skinLabel(reward.skinId)} added to inventory.`,
        };
      }

      if (reward.kind === "nft" && reward.nftId) {
        return {
          ...next,
          nftInventory: {
            ...next.nftInventory,
            [reward.nftId]: (next.nftInventory[reward.nftId] ?? 0) + 1,
          },
          questReveal: { label: reward.label, detail: nftLabel(reward.nftId) },
          message: `Quest box opened: ${reward.label}. ${nftLabel(reward.nftId)} collected.`,
        };
      }

      return next;
    });
  }

  function listSkinForSale(skinId: SkinId) {
    setGame((current) => {
      if ((current.skinInventory[skinId] ?? 0) <= 0) {
        return { ...current, message: "You do not own that skin." };
      }

      const skin = skinItem(skinId);
      if (!skin) return current;
      const price = scaledCost(Math.max(8, Math.round(skin.cost * 0.9)));

      return {
        ...current,
        skinInventory: {
          ...current.skinInventory,
          [skinId]: Math.max(0, (current.skinInventory[skinId] ?? 0) - 1),
        },
        marketListings: [
          {
            id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            skinId,
            seller: "You",
            price,
            createdAt: Date.now(),
          },
          ...current.marketListings,
        ],
        message: `${skin.label} listed for ${price} SOL.`,
      };
    });
  }

  function buyMarketListing(listingId: string) {
    setGame((current) => {
      const listing = current.marketListings.find((entry) => entry.id === listingId);
      if (!listing) return current;
      if (current.sol < listing.price) {
        return { ...current, message: "Not enough SOL to buy that skin." };
      }

      return {
        ...current,
        sol: round(current.sol - listing.price),
        skinInventory: {
          ...current.skinInventory,
          [listing.skinId]: (current.skinInventory[listing.skinId] ?? 0) + 1,
        },
        marketListings: current.marketListings.filter((entry) => entry.id !== listingId),
        message: `${skinLabel(listing.skinId)} purchased from the marketplace.`,
      };
    });
  }

  function equipSkin(skinId: SkinId) {
    setGame((current) => {
      const skin = skinItem(skinId);
      if (!skin) return current;
      if ((current.skinInventory[skinId] ?? 0) <= 0) {
        return { ...current, message: `Buy ${skin.label} first.` };
      }

      return {
        ...current,
        equippedPickaxeSkin: skin.category === "pickaxe" ? skinId : current.equippedPickaxeSkin,
        equippedClothesSkin: skin.category === "clothes" ? skinId : current.equippedClothesSkin,
        message: `${skin.label} equipped.`,
      };
    });
  }

  function placeStructure(plotId: string, clientX: number, clientY: number, element: HTMLElement) {
    setGame((current) => {
      if (!current.claimedPlotId || plotId !== current.claimedPlotId) {
        return { ...current, message: "You can only build on your claimed plot." };
      }

      const plot = current.plots[plotId];
      const rect = element.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const tileX = Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(localX / TILE_SIZE)));
      const tileY = Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(localY / TILE_SIZE)));
      const key = tileKey(tileX, tileY);

      if (plot.structures[key]) {
        return {
          ...current,
          selectedTile: key,
          message: "That tile already has a structure.",
        };
      }

      if (!canPlace(current.activeTool)) {
        return { ...current, message: "That item is not placeable." };
      }

      if ((current.inventory[current.activeTool] ?? 0) <= 0) {
        return {
          ...current,
          message: "Buy that item in the shop first.",
        };
      }

      return {
        ...current,
        moveSource: null,
        plots: {
          ...current.plots,
          [plotId]: {
            ...plot,
            structures: {
              ...plot.structures,
              [key]: { type: current.activeTool, level: 1 },
            },
          },
        },
        inventory: {
          ...current.inventory,
          [current.activeTool]: Math.max(0, (current.inventory[current.activeTool] ?? 0) - 1),
        },
        stats: {
          ...current.stats,
          drillsPlaced: current.activeTool === "drill" ? current.stats.drillsPlaced + 1 : current.stats.drillsPlaced,
        },
        selectedTile: key,
        message: `${structureLabel({ type: current.activeTool, level: 1 })} placed.`,
      };
    });
  }

  function startMoveSelected() {
    setGame((current) => {
      if (!current.claimedPlotId) return { ...current, message: "Claim a plot first." };

      const plot = current.plots[current.claimedPlotId];
      const selectedTile = current.selectedTile;
      if (!selectedTile) return { ...current, message: "Select a structure first." };

      const structure = plot.structures[selectedTile];
      if (!structure) return { ...current, message: "Select a structure first." };
      if (structure.type === "chest") {
        return { ...current, message: "That chest is fixed in place." };
      }

      return {
        ...current,
        moveSource: { plotId: current.claimedPlotId, tile: selectedTile },
        message: `Click an empty tile to move ${structureLabel(structure)}.`,
      };
    });
  }

  function moveStructure(plotId: string, fromTile: string, toTile: string) {
    setGame((current) => {
      if (!current.claimedPlotId || plotId !== current.claimedPlotId) {
        return { ...current, message: "You can only move items on your claimed plot." };
      }

      const plot = current.plots[plotId];
      const sourceStructure = plot.structures[fromTile];
      if (!sourceStructure) {
        return { ...current, moveSource: null, message: "That structure is no longer there." };
      }
      if (sourceStructure.type === "chest") {
        return { ...current, moveSource: null, message: "That chest is fixed in place." };
      }

      if (fromTile === toTile) {
        return {
          ...current,
          moveSource: null,
          selectedTile: fromTile,
          message: `${structureLabel(sourceStructure)} move cancelled.`,
        };
      }

      if (plot.structures[toTile]) {
        return { ...current, message: "Pick an empty tile for the move." };
      }

      const nextStructures = { ...plot.structures };
      delete nextStructures[fromTile];
      nextStructures[toTile] = sourceStructure;

      return {
        ...current,
        plots: {
          ...current.plots,
          [plotId]: {
            ...plot,
            structures: nextStructures,
          },
        },
        moveSource: null,
        selectedTile: toTile,
        message: `${structureLabel(sourceStructure)} moved.`,
      };
    });
  }

  function upgradeSelected() {
    setGame((current) => {
      if (!current.claimedPlotId) return { ...current, message: "Claim a plot first." };

      const plot = current.plots[current.claimedPlotId];
      const selectedTile = current.selectedTile;
      if (!selectedTile) return { ...current, message: "Select a structure first." };

      const structure = plot.structures[selectedTile];
      if (!structure) return { ...current, message: "That tile is empty." };
      if (structure.type !== "drill" && structure.type !== "shack") {
        return {
          ...current,
          message: "That structure cannot be upgraded.",
        };
      }

      const maxLevel = maxStructureLevel(structure.type);
      if (structure.level >= maxLevel) {
        return {
          ...current,
          message:
            structure.type === "shack"
              ? "That shack is already a mansion."
              : "That drill is already fully upgraded.",
        };
      }

      const cost = upgradeCost(structure);
      if (cost > 0 && current.sol < cost) {
        return {
          ...current,
          message: `Need ${cost} SOL to upgrade ${structureLabel(structure)}.`,
        };
      }

      return {
        ...current,
        sol: cost > 0 ? round(current.sol - cost) : current.sol,
        plots: {
          ...current.plots,
          [current.claimedPlotId]: {
            ...plot,
            structures: {
              ...plot.structures,
              [selectedTile]: { ...structure, level: Math.min(maxLevel, structure.level + 1) },
            },
          },
        },
        stats: {
          ...current.stats,
          upgradesDone: current.stats.upgradesDone + 1,
        },
        message: `${structureLabel(structure)} upgraded.`,
      };
    });
  }

  async function signProof() {
    if (!walletPublicKey || !provider?.signMessage) {
      setMessage("Connect Phantom to sign proof.");
      return;
    }

    const payload = new TextEncoder().encode(gameDigest(game, walletPublicKey));
    const signed = await provider.signMessage(payload);
    const bytes = signed instanceof Uint8Array ? signed : signed.signature;
    setGame((current) => ({
      ...current,
      proof: bytesToHex(bytes),
      message: "Mine proof signed.",
    }));
  }

  function resetWorld() {
    if (chestRevealTimerRef.current !== null) {
      window.clearTimeout(chestRevealTimerRef.current);
      chestRevealTimerRef.current = null;
    }
    setJackpotReveal(null);
    setGame(createInitialState());
    setWalletMessage("World reset.");
  }

  const plotUnderAvatar = getPlotByPoint(game.avatar, game.plots);
  const canClaim = Boolean(plotUnderAvatar && !plotUnderAvatar.owner && !game.claimedPlotId);
  const claimedPlotEconomy = selectedPlotEconomy;
  const claimedPlotStructures = claimedPlot ? Object.values(claimedPlot.structures) : [];
  const missionCards = MISSION_ORDER.map((id) => {
    const reward = MISSION_REWARDS[id];
    const drillCount = claimedPlotStructures.filter((structure) => structure.type === "drill").length;
    const hasUpgrade = claimedPlotStructures.some((structure) => structure.level > 1);
    const hasMansion = claimedPlotStructures.some((structure) => structure.type === "shack" && structure.level >= 4);
    const hasPet = game.activePet !== null || Object.values(game.petInventory).some((count) => count > 0);
    const progress =
      id === "claim_plot"
        ? game.claimedPlotId
          ? 1
          : 0
        : id === "second_drill"
          ? Math.min(1, drillCount / 2)
          : id === "first_upgrade"
            ? hasUpgrade
              ? 1
              : 0
            : id === "equip_pet"
              ? hasPet
                ? 1
                : 0
              : id === "open_chest"
                ? game.stats.chestsOpened > 0
                  ? 1
                  : 0
                : id === "income_1"
                  ? claimedPlotEconomy && claimedPlotEconomy.income >= 1
                    ? 1
                    : 0
                  : id === "mansion"
                    ? hasMansion
                      ? 1
                      : 0
                    : game.sol >= 100
                      ? 1
                      : 0;

    return {
      id,
      title: reward.title,
      reward: reward.reward,
      completed: game.missions[id],
      progress,
    };
  });

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Idle Solana miner</p>
          <h1>Ore Acres</h1>
          <p className="lede">
            Walk a big shared map, claim an open acre, and turn it into a
            mining empire. Everyone can see how much SOL each plot has
            collected, so the good land stands out immediately.
          </p>
        </div>

        <div className="wallet-card">
          <button
            className="primary wallet-button"
            onClick={walletPublicKey ? disconnectWallet : connectWallet}
          >
            {walletPublicKey ? "Disconnect wallet" : "Connect Phantom"}
          </button>

          <dl>
            <div>
              <dt>Wallet</dt>
              <dd>{formatAddress(walletPublicKey)}</dd>
            </div>
            <div>
              <dt>Devnet balance</dt>
              <dd>
                {loadingBalance
                  ? "Loading..."
                  : devnetBalance === null
                    ? "0.000 SOL"
                    : `${devnetBalance.toFixed(3)} SOL`}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{walletMessage || game.message}</dd>
            </div>
          </dl>

          <div className="wallet-actions">
            <button className="ghost" onClick={requestAirdrop} disabled={!walletPublicKey}>
              Request devnet SOL
            </button>
            <button className="ghost" onClick={resetWorld}>
              Reset world
            </button>
          </div>
        </div>
      </section>

      <section className="game-panel">
        <div className="stats">
          <div>
            <span>Idle SOL</span>
            <strong>{game.sol.toFixed(2)}</strong>
          </div>
          <div>
            <span>Income</span>
            <strong>{claimedPlotEconomy ? `${claimedPlotEconomy.income.toFixed(2)}/min` : "0.00/min"}</strong>
          </div>
          <div>
            <span>Storage</span>
            <strong>{claimedPlotEconomy ? claimedPlotEconomy.storage.toFixed(0) : "0"}</strong>
          </div>
          <div>
            <span>Claimed</span>
            <strong>{game.claimedPlotId ? "Yes" : "No"}</strong>
          </div>
          <div>
            <span>Pet</span>
            <strong>{petLabel(game.activePet)}</strong>
          </div>
          <div>
            <span>Total earned</span>
            <strong>{game.stats.totalEarned.toFixed(2)}</strong>
          </div>
          <div>
            <span>Quest boxes</span>
            <strong>{game.questBoxes}</strong>
          </div>
          <div>
            <span>Cosmetics</span>
            <strong>{totalSkinsOwned}</strong>
          </div>
          <div>
            <span>NFTs</span>
            <strong>{totalNftsOwned}</strong>
          </div>
        </div>

        <div className="mission-board">
          {missionCards.map((mission) => (
            <article key={mission.id} className={`mission-card ${mission.completed ? "completed" : ""}`}>
              <div className="mission-card__head">
                <strong>{mission.title}</strong>
                <span>{mission.completed ? `+${mission.reward} SOL + box` : "Live quest"}</span>
              </div>
              <div className="mission-card__bar">
                <div className="mission-card__fill" style={{ width: `${Math.round(mission.progress * 100)}%` }} />
              </div>
            </article>
          ))}
        </div>

        <div className="world-shell">
          <div className="world-header">
            <div>
              <h2>Shared map</h2>
              <p>
                Move with WASD or the arrow keys. Walk around the world, visit
                other plots, and claim the open one under your feet when you're
                ready.
              </p>
            </div>
            <div className="world-header__actions">
              <div className="world-header__pill">
                <span>Milestone</span>
                <strong>
                  {selectedStructure
                    ? selectedStructure.type === "shack"
                      ? selectedStructure.level >= 4
                        ? "Mansion complete"
                        : `Next ${selectedStructureName} upgrade`
                      : selectedStructure.level >= (selectedStructureMax ?? 0)
                        ? `${selectedStructureName} maxed`
                        : `Next ${selectedStructureName} upgrade`
                    : game.claimedPlotId
                      ? "Select a building"
                      : "Claim a plot to start"}
                </strong>
              </div>
              <button type="button" className="ghost" onClick={signProof} disabled={!walletPublicKey}>
                Sign mine proof
              </button>
            </div>
          </div>

          <div className="world-action-bar">
            <button
              type="button"
              className={`ghost ${game.inventoryOpen ? "active" : ""}`}
              onClick={() =>
                setGame((current) => ({
                  ...current,
                  inventoryOpen: !current.inventoryOpen,
                  shopOpen: false,
                  marketOpen: false,
                }))
              }
            >
              Inventory
            </button>
            <button
              type="button"
              className={`ghost ${game.shopOpen ? "active" : ""}`}
              onClick={() =>
                setGame((current) => ({
                  ...current,
                  shopOpen: !current.shopOpen,
                  marketOpen: false,
                  inventoryOpen: false,
                }))
              }
              disabled={!game.claimedPlotId}
            >
              Shop
            </button>
            <button
              type="button"
              className={`ghost ${game.marketOpen ? "active" : ""}`}
              onClick={() =>
                setGame((current) => ({
                  ...current,
                  marketOpen: !current.marketOpen,
                  shopOpen: false,
                }))
              }
            >
              Marketplace
            </button>
            <button
              type="button"
              className="ghost"
              onClick={startMoveSelected}
              disabled={!selectedStructure || !game.claimedPlotId}
            >
              Move
            </button>
            <button
              type="button"
              className="primary"
              onClick={upgradeSelected}
              disabled={!selectedStructure || !game.claimedPlotId}
            >
              Upgrade
            </button>
          </div>

          <div className="layout">
              <div className="world-viewport" ref={viewportRef}>
                <div
                  className="world-stage"
                  style={{
                    width: `${WORLD_WIDTH}px`,
                  height: `${WORLD_HEIGHT}px`,
                    transform: `translate(${camera.x}px, ${camera.y}px)`,
                  }}
                >
                <div className="world-background__sky" />
                <div className="world-background" />
                <div className="world-fx world-fx--aurora" />
                <div className="world-fx world-fx--dust" />
                <div className="world-fx world-fx--sparkle" />

                {Object.values(game.plots).map((plot) => {
                  const selected = plot.id === game.selectedPlotId;
                  const owned = Boolean(plot.owner?.me);
                  const claimed = Boolean(plot.owner && !plot.owner.me);
                  const ambient = AMBIENT_MINERS.find((miner) => miner.plotId === plot.id);
                  const plotEconomy = owned
                    ? computeEconomy(plot, game.activePet, game.equippedPickaxeSkin, game.equippedClothesSkin)
                    : null;
                  return (
                    <div
                      key={plot.id}
                      className={`plot-zone ${selected ? "selected" : ""} ${
                        owned ? "owned" : claimed ? "claimed" : "open"
                      }`}
                      style={{
                        left: `${plot.position.x}px`,
                        top: `${plot.position.y}px`,
                        width: `${PLOT_SIZE}px`,
                        height: `${PLOT_SIZE}px`,
                      }}
                      onClick={() => selectPlot(plot.id)}
                    >
                      <div className={`plot-zone__aura ${selected ? "selected" : ""} ${owned ? "owned" : ""}`} />
                      <div className="plot-zone__header">
                        <strong>{plot.name}</strong>
                        <span>
                          {plot.owner ? (plot.owner.me ? "Your plot" : `${plot.owner.label}'s plot`) : "Open plot"}{" "}
                          • {plot.totalCollectedSol.toFixed(2)} SOL total
                        </span>
                      </div>

                      <div className="plot-zone__grid">
                        {Array.from({ length: TILE_COUNT }).map((_, x) =>
                          Array.from({ length: TILE_COUNT }).map((__, y) => {
                            const tile = tileKey(x, y);
                            const structure = plot.structures[tile];
                            return (
                              <button
                                key={tile}
                                className={`plot-tile ${structure ? structure.type : "empty"}`}
                                style={{
                                  left: `${x * TILE_SIZE}px`,
                                  top: `${y * TILE_SIZE}px`,
                                  width: `${TILE_SIZE}px`,
                                  height: `${TILE_SIZE}px`,
                                }}
                                draggable={Boolean(structure && plot.owner?.me && structure.type !== "chest")}
                                onMouseEnter={() => {
                                  if (!plot.owner?.me || structure || !canPlaceActiveTool) return;
                                  setPlacementPreview({ plotId: plot.id, tile });
                                }}
                                onMouseLeave={() => {
                                  setPlacementPreview((current) =>
                                    current?.plotId === plot.id && current.tile === tile ? null : current,
                                  );
                                }}
                                onClick={(event) => {
                                  if (ignoreTileClickRef.current) return;
                                  event.stopPropagation();
                                  selectPlot(plot.id);

                                  if (game.moveSource?.plotId === plot.id) {
                                    if (game.moveSource.tile === tile) {
                                      setGame((current) => ({
                                        ...current,
                                        moveSource: null,
                                        selectedTile: tile,
                                        message: "Move cancelled.",
                                      }));
                                      return;
                                    }

                                    if (structure) {
                                      setGame((current) => ({
                                        ...current,
                                        selectedTile: tile,
                                        message: "Pick an empty tile for the move.",
                                      }));
                                      return;
                                    }

                                    moveStructure(plot.id, game.moveSource.tile, tile);
                                    return;
                                  }

                                  if (structure) {
                                    setGame((current) => ({
                                      ...current,
                                      selectedTile: tile,
                                      message: `${structureLabel(structure)} selected.`,
                                    }));
                                    return;
                                  }

                                  const canPlaceNow = plot.owner?.me && activeToolIsPurchased;
                                  if (canPlaceNow) {
                                    const gridElement = event.currentTarget.parentElement as HTMLElement | null;
                                    if (gridElement) {
                                      setPlacementPreview(null);
                                      placeStructure(plot.id, event.clientX, event.clientY, gridElement);
                                    }
                                    return;
                                  }

                                  setGame((current) => ({
                                    ...current,
                                    selectedTile: tile,
                                    message: plot.owner?.me
                                      ? "Empty tile selected. Open the shop to build here."
                                      : "Open tile selected.",
                                  }));
                                }}
                                onPointerUp={(event) => {
                                  if (!game.moveSource || game.moveSource.plotId !== plot.id) return;
                                  if (game.moveSource.tile === tile || structure) return;

                                  event.stopPropagation();
                                  event.preventDefault();
                                  ignoreTileClickRef.current = true;
                                  window.setTimeout(() => {
                                    ignoreTileClickRef.current = false;
                                  }, 0);
                                  moveStructure(plot.id, game.moveSource.tile, tile);
                                }}
                                onDragStart={(event) => {
                                  if (!structure || !plot.owner?.me || structure.type === "chest") return;
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData("text/plain", tile);
                                  setGame((current) => ({
                                    ...current,
                                    selectedTile: tile,
                                    moveSource: { plotId: plot.id, tile },
                                    message: `Drag ${structureLabel(structure)} to an empty tile.`,
                                  }));
                                }}
                                onDragOver={(event) => {
                                  if (!game.moveSource || !plot.owner?.me) return;
                                  event.preventDefault();
                                  if (!structure) {
                                    setPlacementPreview({ plotId: plot.id, tile });
                                  }
                                }}
                                onDragLeave={() => {
                                  if (placementPreview?.plotId === plot.id && placementPreview.tile === tile) {
                                    setPlacementPreview(null);
                                  }
                                }}
                                onDrop={(event) => {
                                  if (!game.moveSource || game.moveSource.plotId !== plot.id) return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setPlacementPreview(null);

                                  if (structure) {
                                    setGame((current) => ({
                                      ...current,
                                      message: "Drop onto an empty tile.",
                                    }));
                                    return;
                                  }

                                  moveStructure(plot.id, game.moveSource.tile, tile);
                                }}
                              >
                                {game.selectedTile === tile && structure ? <span className="plot-tile__ring" /> : null}
                                {placementPreview?.plotId === plot.id && placementPreview.tile === tile && !structure ? (
                                  <span className="plot-tile__preview" />
                                ) : null}
                                <span className="plot-tile__soil" />
                                {structure ? (
                                  <div className="plot-tile__sprite">
                                    <BuildingSprite type={structure.type} level={structure.level} opened={structure.opened} />
                                  </div>
                                ) : (
                                  <span className="plot-tile__spark" />
                                )}
                                {plotEconomy && structure?.type === "shack" ? (
                                  <span className="plot-tile__earnings">+{plotEconomy.income.toFixed(2)} SOL/min</span>
                                ) : null}
                              </button>
                            );
                          }),
                        )}
                      </div>

                      {plot.chest ? (
                        <button
                          type="button"
                          className="plot-zone__chest"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectPlot(plot.id);
                            openChest(plot.id);
                          }}
                          aria-label="Open gacha chest"
                        >
                          <BuildingSprite type="chest" level={1} />
                        </button>
                      ) : null}

                      {game.bonusDrops
                        .filter((drop) => drop.plotId === plot.id)
                        .map((drop) => {
                          const locked = Date.now() < drop.readyAt;
                          const secondsLeft = Math.max(0, Math.ceil((drop.readyAt - Date.now()) / 1000));
                          return (
                            <button
                              key={drop.id}
                              type="button"
                              className={`plot-zone__drop plot-zone__drop--${drop.rarity} ${locked ? "locked" : "ready"}`}
                              style={{
                                left: `${PLOT_SIZE * 0.5}px`,
                                top: `${PLOT_SIZE * 0.24}px`,
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                collectBonusDrop(drop.id);
                              }}
                              aria-label={`${locked ? "Claim later" : "Collect"} ${drop.label}`}
                            >
                              <span className="plot-zone__drop-glow" />
                              <span className="plot-zone__drop-ore">
                                <span className="plot-zone__drop-ore-core" />
                                <span className="plot-zone__drop-ore-chip plot-zone__drop-ore-chip--1" />
                                <span className="plot-zone__drop-ore-chip plot-zone__drop-ore-chip--2" />
                                <span className="plot-zone__drop-ore-chip plot-zone__drop-ore-chip--3" />
                              </span>
                              <strong>{drop.label}</strong>
                              <small>{locked ? `Claim in ${secondsLeft}s` : `+${drop.reward.toFixed(2)} SOL`}</small>
                            </button>
                          );
                        })}

                      {game.chestReveal?.plotId === plot.id ? (
                        (() => {
                          const reward = getChestReward(game.chestReveal.reward);
                          return (
                            <span
                              className={`plot-zone__reveal plot-zone__reveal--${reward?.rarity ?? "common"}`}
                              style={
                                reward
                                  ? {
                                      borderColor: chestRarityGlow(reward.rarity),
                                      boxShadow: `0 0 18px ${chestRarityGlow(reward.rarity)}33`,
                                    }
                                  : undefined
                              }
                            >
                              {reward ? `${chestRarityLabel(reward.rarity)} ${reward.label}` : game.chestReveal.reward}
                            </span>
                          );
                        })()
                      ) : null}

                      {ambient ? <NeighborMiner name={ambient.name} /> : null}
                      <div className="plot-zone__badge">Lifetime: {plot.totalCollectedSol.toFixed(2)} SOL</div>
                    </div>
                  );
                })}

                <div
                  className="avatar-anchor"
                  style={{
                    left: `${game.avatar.x}px`,
                    top: `${game.avatar.y}px`,
                  }}
                >
                  <AvatarSprite
                    moving={moving}
                    pickaxeSkin={game.equippedPickaxeSkin}
                    clothesSkin={game.equippedClothesSkin}
                  />
                  {game.activePet ? (
                    <div className={`avatar-pet avatar-pet--${petSide}`}>
                      <PetSprite type={game.activePet} />
                    </div>
                  ) : null}
                </div>

                {plotUnderAvatar && !plotUnderAvatar.owner?.me ? (
                  <div
                    className="plot-prompt"
                    style={{
                      left: `${plotUnderAvatar.position.x + PLOT_SIZE / 2}px`,
                      top: `${plotUnderAvatar.position.y - 10}px`,
                    }}
                  >
                    <span>{plotUnderAvatar.owner ? `${plotUnderAvatar.owner.label}'s plot` : "Unclaimed plot"}</span>
                    {!plotUnderAvatar.owner && !game.claimedPlotId ? (
                      <button type="button" className="primary" onClick={claimSelectedPlot}>
                        Claim plot
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="world-hud">
                  <span>{game.claimedPlotId ? "Your plot is active" : "Find an open plot"}</span>
                  <strong>{game.message}</strong>
                </div>
              </div>
              
              <div className="inventory-overlay">
                <div className={`overlay-panel ${game.inventoryOpen ? "" : "overlay-panel--collapsed"}`}>
                  <div className="overlay-panel__header">
                    <div>
                      <span className="overlay-panel__eyebrow">Inventory</span>
                      <strong>Owned items</strong>
                    </div>
                    <button
                      type="button"
                      className="ghost overlay-panel__toggle"
                      onClick={(event) => {
                        event.stopPropagation();
                        setGame((current) => ({
                          ...current,
                          inventoryOpen: !current.inventoryOpen,
                          shopOpen: false,
                        }));
                      }}
                    >
                      {game.inventoryOpen ? "Collapse" : "Expand"}
                    </button>
                  </div>

                  {game.inventoryOpen ? (
                    <>
                      <div className="overlay-panel__subhead">Core structures</div>
                      <div className="inventory-list inventory-list--core">
                        {CORE_TYPES.map((type) => {
                          const structure =
                            claimedPlot?.structures &&
                            Object.values(claimedPlot.structures).find((entry) => entry.type === type);
                          const active = game.activeTool === type;
                          return (
                            <button
                              type="button"
                              key={type}
                              className={`inventory-item ${active ? "active" : ""}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setGame((current) => ({
                                  ...current,
                                  activeTool: type,
                                  inventoryOpen: false,
                                  shopOpen: false,
                                  message: `${structureLabel(structure ?? { type, level: 1 })} selected.`,
                                }));
                              }}
                            >
                              <div className="inventory-item__icon">
                                <BuildingSprite type={type} level={structure?.level ?? 1} />
                              </div>
                              <div className="inventory-item__meta">
                                <strong>{structureLabel(structure ?? { type, level: 1 })}</strong>
                                <span>{type === "shack" ? "Starter home" : "Mining rig"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="overlay-panel__subhead">Pets</div>
                      <div className="inventory-list inventory-list--pets">
                        {PET_ITEMS.map((pet) => {
                          const count = game.petInventory[pet.id] ?? 0;
                          const active = game.activePet === pet.id;
                          return (
                            <button
                              type="button"
                              key={pet.id}
                              className={`inventory-item inventory-item--pet ${active ? "active" : ""}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (count <= 0) {
                                  setGame((current) => ({
                                    ...current,
                                    message: `Buy the ${pet.label} first.`,
                                  }));
                                  return;
                                }
                                setGame((current) => ({
                                  ...current,
                                  activePet: active ? null : pet.id,
                                  message: active
                                    ? `${pet.label} is resting.`
                                    : `${pet.label} equipped.`,
                                }));
                              }}
                              disabled={count <= 0}
                            >
                              <div className="inventory-item__icon inventory-item__icon--pet">
                                <PetSprite type={pet.id} />
                              </div>
                              <div className="inventory-item__meta">
                                <strong>{pet.label}</strong>
                                <span>{count > 0 ? petBoostLabel(pet.id) : "Locked"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="overlay-panel__subhead">Quest rewards</div>
                      <div className="inventory-box">
                        <div className="inventory-box__copy">
                          <strong>{game.questBoxes} reward box{game.questBoxes === 1 ? "" : "es"}</strong>
                          <span>Open these for SOL, meme skins, or placeholder NFTs.</span>
                        </div>
                        <button type="button" className="primary" onClick={openQuestBox} disabled={game.questBoxes <= 0}>
                          Open box
                        </button>
                      </div>

                      <div className="overlay-panel__subhead">Cosmetics</div>
                      <div className="inventory-list inventory-list--skins">
                        {SKIN_ITEMS.map((skin) => {
                          const count = game.skinInventory[skin.id] ?? 0;
                          const active =
                            skin.category === "pickaxe"
                              ? game.equippedPickaxeSkin === skin.id
                              : game.equippedClothesSkin === skin.id;
                          return (
                            <article key={skin.id} className={`inventory-item inventory-item--skin ${active ? "active" : ""}`}>
                              <div className={`inventory-item__icon inventory-item__icon--skin inventory-item__icon--${skin.category}`}>
                                <span className="inventory-item__skin-meme">{skin.meme}</span>
                              </div>
                              <div className="inventory-item__meta">
                                <strong>{skin.label}</strong>
                                <span>{count > 0 ? skin.description : `Not owned · ${scaledCost(skin.cost)} SOL`}</span>
                                <div className="inventory-item__actions">
                                  <button
                                    type="button"
                                    className="ghost inventory-item__action inventory-item__action--equip"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      equipSkin(skin.id);
                                    }}
                                    disabled={count <= 0}
                                  >
                                    {active ? "Equipped" : "Equip"}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost inventory-item__action inventory-item__action--list"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      listSkinForSale(skin.id);
                                    }}
                                    disabled={count <= 0}
                                  >
                                    List for sale
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <div className="overlay-panel__subhead">NFT vault</div>
                      <div className="inventory-list inventory-list--nfts">
                        {Object.entries(game.nftInventory).map(([nftId, count]) => (
                          <div key={nftId} className="inventory-item inventory-item--nft">
                            <div className="inventory-item__icon inventory-item__icon--nft">
                              <span className="inventory-item__nft-pill">NFT</span>
                            </div>
                            <div className="inventory-item__meta">
                              <strong>{nftLabel(nftId)}</strong>
                              <span>{count} owned</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="overlay-panel__subhead">Placeable items</div>
                      <div className="inventory-list">
                        {INVENTORY_TYPES.map((type) => {
                          const count = game.inventory[type] ?? 0;
                          const active = game.activeTool === type;
                          const item = SHOP_ITEMS.find((entry) => entry.id === type);
                          return (
                            <button
                              type="button"
                              key={type}
                              className={`inventory-item ${active ? "active" : ""}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setGame((current) => ({
                                  ...current,
                                  activeTool: type,
                                  inventoryOpen: false,
                                  shopOpen: false,
                                  message:
                                    count > 0
                                      ? `${item?.label ?? type} selected from inventory.`
                                      : `No ${item?.label?.toLowerCase() ?? type} in inventory yet.`,
                                }));
                              }}
                              disabled={count <= 0}
                            >
                              <div className="inventory-item__icon">
                                <BuildingSprite type={type} level={1} />
                              </div>
                              <div className="inventory-item__meta">
                                <strong>{item?.label ?? type}</strong>
                                <span>{count} owned</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="overlay-panel__collapsed-copy">Inventory hidden. Expand to switch tools.</div>
                  )}
                </div>
              </div>

              {game.shopOpen ? (
                <div className="shop-overlay open">
                  <div className="overlay-panel overlay-panel--shop">
                    <div className="overlay-panel__header">
                      <div>
                        <span className="overlay-panel__eyebrow">Build shop</span>
                        <strong>Buy and place</strong>
                      </div>
                      <button
                        type="button"
                        className="ghost overlay-panel__toggle"
                        onClick={(event) => {
                          event.stopPropagation();
                          setGame((current) => ({
                            ...current,
                            shopOpen: false,
                          }));
                        }}
                      >
                        Close
                      </button>
                    </div>

                    <p className="overlay-panel__copy">
                      Buy something, then click a tile in your plot to place it. Your inventory stays visible while you build.
                    </p>

                    <div className="shop-filters">
                      {(["all", "build", "utility", "power", "automation", "decor", "special"] as const).map((category) => (
                        <button
                          type="button"
                          key={category}
                          className={`chip ${shopFilter === category ? "active" : ""}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setShopFilter(category);
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>

                    <div className="shop-grid">
                      {availableShopItems.map((item) => {
                        const owned = (game.inventory[item.id] ?? 0) > 0;
                        return (
                          <article key={item.id} className={`shop-card ${owned ? "owned" : ""}`}>
                            <div className="shop-card__icon">
                              <BuildingSprite type={item.id} level={1} />
                            </div>
                            <div className="shop-card__body">
                              <h4>{item.label}</h4>
                              <p>{item.description}</p>
                              <div className="shop-card__meta">
                                <span>{scaledCost(item.cost)} SOL</span>
                                <span>{item.id === "chest" ? "Placed instantly" : owned ? `${game.inventory[item.id]} in inventory` : "Fresh stock"}</span>
                              </div>
                            </div>
                            <button type="button" className="primary" onClick={() => buyShopItem(item.id)}>
                              {item.id === "chest" ? "Buy & place" : "Buy"}
                            </button>
                          </article>
                        );
                      })}
                    </div>

                    <div className="overlay-panel__subhead">Cosmetics shop</div>
                    <div className="shop-grid shop-grid--skins">
                      {SKIN_ITEMS.map((skin) => {
                        const owned = (game.skinInventory[skin.id] ?? 0) > 0;
                        const active =
                          skin.category === "pickaxe"
                            ? game.equippedPickaxeSkin === skin.id
                            : game.equippedClothesSkin === skin.id;
                        return (
                          <article key={skin.id} className={`shop-card shop-card--skin ${owned ? "owned" : ""}`}>
                            <div className={`shop-card__icon shop-card__icon--skin shop-card__icon--${skin.category}`}>
                              <span className="shop-card__meme">{skin.meme}</span>
                            </div>
                            <div className="shop-card__body">
                              <h4>{skin.label}</h4>
                              <p>{skin.description}</p>
                              <div className="shop-card__meta">
                                <span>{skin.category === "pickaxe" ? `+${Math.round((skin.oreMultiplier ?? 1) * 100 - 100)}% ore value` : `+${Math.round((skin.incomeMultiplier ?? 1) * 100 - 100)}% idle income`}</span>
                                <span>{owned ? "Owned" : `${scaledCost(skin.cost)} SOL`}</span>
                              </div>
                            </div>
                            <button type="button" className="ghost cosmetic-buy" onClick={() => buySkinItem(skin.id)}>
                              {active ? "Active" : owned ? "Buy another" : "Buy"}
                            </button>
                          </article>
                        );
                      })}
                    </div>

                    <div className="overlay-panel__subhead">Pets</div>
                    <div className="shop-grid shop-grid--pets">
                      {PET_ITEMS.map((pet) => {
                        const owned = (game.petInventory[pet.id] ?? 0) > 0;
                        const active = game.activePet === pet.id;
                        return (
                          <article key={pet.id} className={`shop-card shop-card--pet ${owned ? "owned" : ""}`}>
                            <div className="shop-card__icon shop-card__icon--pet">
                              <PetSprite type={pet.id} />
                            </div>
                            <div className="shop-card__body">
                              <h4>{pet.label}</h4>
                              <p>{pet.description}</p>
                              <div className="shop-card__meta">
                                <span>{pet.boost}</span>
                                <span>{owned ? "Owned" : `${scaledCost(pet.cost)} SOL`}</span>
                              </div>
                            </div>
                            <button type="button" className="primary" onClick={() => buyPetItem(pet.id)}>
                              {active ? "Active" : owned ? "Equip" : "Buy"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {game.marketOpen ? (
                <div className="market-overlay open">
                  <div className="overlay-panel overlay-panel--market">
                    <div className="overlay-panel__header">
                      <div>
                        <span className="overlay-panel__eyebrow">Marketplace</span>
                        <strong>Trade skins for SOL</strong>
                      </div>
                      <button
                        type="button"
                        className="ghost overlay-panel__toggle"
                        onClick={() =>
                          setGame((current) => ({
                            ...current,
                            marketOpen: false,
                          }))
                        }
                      >
                        Close
                      </button>
                    </div>

                    <p className="overlay-panel__copy">
                      List owned cosmetics from your inventory, or buy what other players put on the market.
                    </p>

                    <div className="shop-grid shop-grid--market">
                      {game.marketListings.length > 0 ? (
                        game.marketListings.map((listing) => {
                          const skin = skinItem(listing.skinId);
                          const active =
                            skin?.category === "pickaxe"
                              ? game.equippedPickaxeSkin === skin?.id
                              : game.equippedClothesSkin === skin?.id;
                          return (
                            <article key={listing.id} className={`shop-card shop-card--market ${active ? "owned" : ""}`}>
                              <div className={`shop-card__icon shop-card__icon--skin shop-card__icon--${skin?.category ?? "pickaxe"}`}>
                                <span className="shop-card__meme">{skin?.meme ?? "SKIN"}</span>
                              </div>
                              <div className="shop-card__body">
                                <h4>{skin?.label ?? listing.skinId}</h4>
                                <p>Sold by {listing.seller}</p>
                                <div className="shop-card__meta">
                                  <span>{listing.price.toFixed(2)} SOL</span>
                                  <span>{skin?.category ?? "cosmetic"}</span>
                                </div>
                              </div>
                            <button type="button" className="ghost cosmetic-buy" onClick={() => buyMarketListing(listing.id)}>
                              Buy
                            </button>
                            </article>
                          );
                        })
                      ) : (
                        <div className="inventory-box inventory-box--empty">
                          <div className="inventory-box__copy">
                            <strong>No listings yet</strong>
                            <span>List a skin from inventory to seed the market.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {game.questReveal ? (
                <div className="quest-reveal">
                  <div className="quest-reveal__panel">
                    <span className="overlay-panel__eyebrow">Quest reward</span>
                    <strong>{game.questReveal.label}</strong>
                    <p>{game.questReveal.detail}</p>
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        setGame((current) => ({
                          ...current,
                          questReveal: null,
                        }))
                      }
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {jackpotReveal ? (
              <div className={`jackpot-overlay jackpot-overlay--${jackpotReveal.rarity}`}>
                <div className="jackpot-overlay__glow jackpot-overlay__glow--a" />
                <div className="jackpot-overlay__glow jackpot-overlay__glow--b" />
                <div className="jackpot-overlay__shell">
                  <span className="jackpot-overlay__eyebrow">Jackpot Reveal</span>
                  <strong>{chestRarityLabel(jackpotReveal.rarity)} Pull</strong>
                  <div className="jackpot-overlay__reel">
                    <div className="jackpot-overlay__reel-window">
                      <div className="jackpot-overlay__reel-track">
                        {[...CHEST_REWARDS, ...CHEST_REWARDS, jackpotReveal, ...CHEST_REWARDS, ...CHEST_REWARDS].map(
                          (reward, index) => (
                            <article
                              key={`${reward.id}-${index}`}
                              className={`jackpot-overlay__card ${
                                reward.id === jackpotReveal.id ? "jackpot-overlay__card--selected" : ""
                              } jackpot-overlay__card--${reward.rarity}`}
                            >
                              <span className="jackpot-overlay__card-rarity">{chestRarityLabel(reward.rarity)}</span>
                              <h2>{reward.label}</h2>
                              <p>{reward.description}</p>
                            </article>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="jackpot-overlay__marker" />
                  </div>
                  <div className="jackpot-overlay__meta">
                    <span className={`jackpot-overlay__rarity jackpot-overlay__rarity--${jackpotReveal.rarity}`}>
                      {chestRarityLabel(jackpotReveal.rarity)}
                    </span>
                    <span>{jackpotReveal.description}</span>
                  </div>
                  <button type="button" className="primary" onClick={() => setJackpotReveal(null)}>
                    Close Reveal
                  </button>
                </div>
              </div>
            ) : null}

            <aside className="inspector">
              <h3>Inspector</h3>
              <div className="inspector-card">
                <span>Selected plot</span>
                <strong>{selectedPlot.name}</strong>
              </div>
              <div className="inspector-card">
                <span>Owner</span>
                <strong>
                  {selectedPlot.owner
                    ? selectedPlot.owner.me
                      ? "You"
                      : selectedPlot.owner.label
                    : "Unclaimed"}
                </strong>
              </div>
              <div className="inspector-card">
                <span>Claim status</span>
                <strong>{selectedPlot.owner ? "Taken" : "Open to claim"}</strong>
              </div>
              <div className="inspector-card">
                <span>Selected tile</span>
                <strong>{game.selectedTile ?? "None"}</strong>
              </div>
              {selectedChest ? (
                <div className="inspector-card accent">
                  <span>Gacha chest</span>
                  <strong>Huge visual chest ready to open</strong>
                  <small className="inspector-note">This chest floats above the plot and does not occupy a tile.</small>
                </div>
              ) : null}
              {selectedStructure ? (
                <div className="inspector-card accent">
                  <span>Next upgrade</span>
                  <strong>
                    {selectedStructure.level >= (selectedStructureMax ?? 0)
                      ? "Max level reached"
                      : `${structureLabel(selectedStructure)} -> Lv.${selectedStructure.level + 1}`}
                  </strong>
                  <div className="inspector-progress">
                    <div
                      className="inspector-progress__fill"
                      style={{
                        width: `${Math.round((selectedStructure.level / (selectedStructureMax ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <small className="inspector-note">
                    {nextStructureCost === null ? "No more upgrades available." : `${nextStructureCost} SOL to upgrade.`}
                  </small>
                </div>
              ) : null}

              <div className="inspector-card">
                <span>Active tool</span>
                <strong>{structureLabel({ type: game.activeTool, level: 1 })}</strong>
              </div>
              <div className="inspector-card accent">
                <span>Mine proof</span>
                <strong>{game.proof ? `${game.proof.slice(0, 24)}...` : "No proof signed yet"}</strong>
              </div>
            </aside>
        </div>
        </div>
      </section>
    </main>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getSelectedPlotId(
  point: { x: number; y: number },
  plots: Record<string, Plot>,
) {
  const plotList = Object.values(plots);
  const containing = plotList.find((plot) => pointInRect(point.x, point.y, {
    x: plot.position.x,
    y: plot.position.y,
    width: PLOT_SIZE,
    height: PLOT_SIZE,
  }));

  if (containing) return containing.id;

  let closest = plotList[0];
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const plot of plotList) {
    const center = plotCenter(plot.position);
    const distance = Math.hypot(point.x - center.x, point.y - center.y);
    if (distance < closestDistance) {
      closest = plot;
      closestDistance = distance;
    }
  }

  return closest.id;
}

function getPlotByPoint(point: { x: number; y: number }, plots: Record<string, Plot>) {
  return Object.values(plots).find((plot) =>
    pointInRect(point.x, point.y, {
      x: plot.position.x,
      y: plot.position.y,
      width: PLOT_SIZE,
      height: PLOT_SIZE,
    }),
  ) ?? null;
}

function getTileUnderPoint(point: { x: number; y: number }, plot: Plot) {
  if (!pointInRect(point.x, point.y, {
    x: plot.position.x,
    y: plot.position.y,
    width: PLOT_SIZE,
    height: PLOT_SIZE,
  })) {
    return null;
  }

  const localX = point.x - plot.position.x;
  const localY = point.y - plot.position.y;
  const tileX = Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(localX / TILE_SIZE)));
  const tileY = Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(localY / TILE_SIZE)));
  return tileKey(tileX, tileY);
}

export default App;
