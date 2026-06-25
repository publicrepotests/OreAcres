import { useEffect, useMemo, useRef, useState } from "react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";

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
  | "sign";

type PetType = "mole" | "fox" | "drake";

type PetSide = "left" | "right" | "top" | "bottom";

type ChestRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

type ChestReward = {
  id: string;
  label: string;
  description: string;
  rarity: ChestRarity;
  weight: number;
};

type EarningsScenarioId = "starter" | "builder" | "late";

type EarningsScenario = {
  id: EarningsScenarioId;
  label: string;
  description: string;
  solPerDay: number;
  solPerWeek: number;
  solPerMonth: number;
  setup: string[];
  color: string;
  points: number[];
};

type RoadmapItem = {
  phase: string;
  title: string;
  copy: string;
  status: "Live" | "In progress" | "Next" | "Planned";
};

type Page = "home" | "game";

type StructureArtSlot = {
  atlas: "core" | "special";
  col: number;
  row: number;
};

type CosmeticArtSlot = {
  col: number;
  row: number;
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
  kind: "skin" | "pet";
  itemId: SkinId | PetType;
  category: "pickaxe" | "clothes" | "pet";
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
  mints: number;
  rewardReserveSol: number;
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
  questsOpen: boolean;
  questReveal: { label: string; detail: string } | null;
  proof: string;
  message: string;
  lastUpdatedAt: number;
};

type RemotePlayer = {
  id: string;
  name: string;
  x: number;
  y: number;
};

type SharedPlotSnapshot = {
  id: string;
  name: string;
  ownerLabel: string | null;
  structures: Record<
    string,
    {
      type: StructureType;
      level: number;
      opened?: boolean;
      reward?: string;
    }
  >;
  chest: { id: string } | null;
  totalCollectedSol: number;
};

type InjectedSolanaProvider = {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string } | string>;
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
const STARTING_MINTS = 18;
const STARTING_REWARD_RESERVE_SOL = 250;
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
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
const STRUCTURE_ART_ATLASES = {
  core: "/assets/shop/item-atlas.png",
  special: "/assets/shop/item-atlas-special.png",
} as const;
const STRUCTURE_ART_SLOTS: Partial<Record<StructureType, StructureArtSlot>> = {
  shack: { atlas: "core", col: 0, row: 0 },
  drill: { atlas: "core", col: 2, row: 0 },
  storage: { atlas: "core", col: 0, row: 1 },
  relay: { atlas: "core", col: 1, row: 1 },
  solar: { atlas: "core", col: 2, row: 1 },
  battery: { atlas: "core", col: 3, row: 1 },
  cooling: { atlas: "core", col: 0, row: 2 },
  conveyor: { atlas: "core", col: 1, row: 2 },
  drone: { atlas: "core", col: 2, row: 2 },
  scanner: { atlas: "core", col: 3, row: 2 },
  refinery: { atlas: "core", col: 0, row: 3 },
  vault: { atlas: "core", col: 1, row: 3 },
  neon: { atlas: "core", col: 2, row: 3 },
  statue: { atlas: "core", col: 3, row: 3 },
  decor: { atlas: "special", col: 0, row: 0 },
  shop: { atlas: "special", col: 1, row: 0 },
  sign: { atlas: "special", col: 0, row: 1 },
  chest: { atlas: "special", col: 1, row: 1 },
};
const COSMETIC_ATLAS = "/assets/shop/cosmetics-atlas.png";
const PICKAXE_ART: Record<"troll_pick" | "laser_pick" | "banana_pick", string> = {
  troll_pick: "/assets/cosmetics/pickaxes/troll-pick.png",
  laser_pick: "/assets/cosmetics/pickaxes/laser-pick.png",
  banana_pick: "/assets/cosmetics/pickaxes/banana-pick.png",
};
const HOME_ART = {
  1: "/assets/structures/homes/tier1-shack.png",
  2: "/assets/structures/homes/tier2-house.png",
  3: "/assets/structures/homes/tier3-villa.png",
  4: "/assets/structures/homes/tier4-mansion.png",
} as const;
const DRILL_ART = {
  1: "/assets/structures/drills/tier1-drill.png",
  2: "/assets/structures/drills/tier2-drill.png",
  3: "/assets/structures/drills/tier3-drill.png",
} as const;
const SKIN_ART_SLOTS: Record<SkinId, CosmeticArtSlot> = {
  troll_pick: { col: 0, row: 0 },
  laser_pick: { col: 1, row: 0 },
  banana_pick: { col: 2, row: 0 },
  aura_hoodie: { col: 0, row: 1 },
  cyber_jacket: { col: 1, row: 1 },
  astronaut_fit: { col: 2, row: 1 },
};
const PET_ART_SLOTS: Record<PetType, CosmeticArtSlot> = {
  mole: { col: 0, row: 2 },
  fox: { col: 1, row: 2 },
  drake: { col: 2, row: 2 },
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "storage",
    label: "Ore Shed",
    description: "Raises your storage cap.",
    cost: 1.25,
    category: "utility",
  },
  {
    id: "relay",
    label: "Power Relay",
    description: "Boosts nearby drills.",
    cost: 1.75,
    category: "utility",
  },
  {
    id: "solar",
    label: "Solar Array",
    description: "Gives nearby drills a small output boost.",
    cost: 1.75,
    category: "power",
  },
  {
    id: "battery",
    label: "Battery Bank",
    description: "Adds storage and protects your idle gains.",
    cost: 2.25,
    category: "power",
  },
  {
    id: "cooling",
    label: "Cooling Fan",
    description: "Keeps nearby drills efficient.",
    cost: 1.5,
    category: "power",
  },
  {
    id: "conveyor",
    label: "Conveyor Belt",
    description: "Helps output move faster across the plot.",
    cost: 1.65,
    category: "automation",
  },
  {
    id: "drone",
    label: "Auto Drone",
    description: "Adds a tiny automated SOL trickle.",
    cost: 2.5,
    category: "automation",
  },
  {
    id: "scanner",
    label: "Scanner Tower",
    description: "Boosts every drill on the plot a little.",
    cost: 2.75,
    category: "automation",
  },
  {
    id: "refinery",
    label: "Refinery",
    description: "Turns raw output into better yield.",
    cost: 3.5,
    category: "automation",
  },
  {
    id: "decor",
    label: "Lantern Post",
    description: "A small glowing decor item.",
    cost: 0.55,
    category: "decor",
  },
  {
    id: "shop",
    label: "Build Kiosk",
    description: "A little plot shop stand.",
    cost: 1.25,
    category: "build",
  },
  {
    id: "vault",
    label: "Vault",
    description: "Adds serious storage and a little flex.",
    cost: 3.25,
    category: "utility",
  },
  {
    id: "neon",
    label: "Neon Sign",
    description: "Pure style with a tiny morale bump.",
    cost: 0.75,
    category: "decor",
  },
  {
    id: "statue",
    label: "Miner Statue",
    description: "A prestige flex piece for your plot.",
    cost: 0.95,
    category: "decor",
  },
  {
    id: "sign",
    label: "Billboard",
    description: "Showcase your brand and flex your plot.",
    cost: 0.65,
    category: "decor",
  },
  {
    id: "chest",
    label: "Gacha Chest",
    description: "A massive mystery chest that bursts open with a reveal.",
    cost: 9,
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
  "chest",
];
const CORE_TYPES: StructureType[] = ["shack", "drill"];

const PET_ITEMS: PetItem[] = [
  {
    id: "mole",
    label: "Mole",
    description: "Digs around and slightly improves drilling.",
    cost: 3.5,
    boost: "+0.04 SOL/min",
  },
  {
    id: "fox",
    label: "Fox",
    description: "A sneaky little booster with sharp instincts.",
    cost: 7.5,
    boost: "+4% income",
  },
  {
    id: "drake",
    label: "Drake",
    description: "A flashy dragon pet for late-game flexing.",
    cost: 19,
    boost: "+8% income",
  },
];

const SKIN_ITEMS: SkinItem[] = [
  {
    id: "troll_pick",
    label: "Troll Pick",
    description: "A meme pickaxe with ridiculous teeth and a loud clonk.",
    cost: 1.5,
    category: "pickaxe",
    meme: "100% certified troll energy",
    oreMultiplier: 1.12,
  },
  {
    id: "laser_pick",
    label: "Laser Pick",
    description: "A clean sci-fi pick with a meme-laser hum.",
    cost: 3,
    category: "pickaxe",
    meme: "for serious degens only",
    oreMultiplier: 1.24,
  },
  {
    id: "banana_pick",
    label: "Banana Pick",
    description: "A banana-shaped tool nobody asked for, but everyone wants.",
    cost: 2.25,
    category: "pickaxe",
    meme: "potassium-powered mining",
    oreMultiplier: 1.18,
  },
  {
    id: "aura_hoodie",
    label: "Aura Hoodie",
    description: "A neon streetwear fit with glowing sleeves.",
    cost: 2,
    category: "clothes",
    meme: "main character drip",
    incomeMultiplier: 1.04,
  },
  {
    id: "cyber_jacket",
    label: "Cyber Jacket",
    description: "A sharp jacket with animated neon stripes.",
    cost: 4.5,
    category: "clothes",
    meme: "future rich vibes",
    incomeMultiplier: 1.06,
  },
  {
    id: "astronaut_fit",
    label: "Astronaut Fit",
    description: "A shiny suit for mining the moon before anyone else.",
    cost: 8,
    category: "clothes",
    meme: "space-time bag holder",
    incomeMultiplier: 1.08,
  },
];

const QUEST_BOX_REWARDS: RewardBoxReward[] = [
  { id: "sol-small", label: "Tiny SOL Stack", description: "A little reward stack.", kind: "sol", rewardSol: 1, weight: 34 },
  { id: "sol-med", label: "Mid SOL Stack", description: "A decent box payout.", kind: "sol", rewardSol: 2, weight: 20 },
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

const EARNINGS_SCENARIOS: EarningsScenario[] = [
  {
    id: "starter",
    label: "Starter plot",
    description: "A fresh acre with one drill, a shack, and a tiny trickle.",
    solPerDay: 0.08,
    solPerWeek: 0.56,
    solPerMonth: 2.4,
    setup: ["1 shack", "1 drill", "basic pet", "no premium skins"],
    color: "#67f5d3",
    points: [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08],
  },
  {
    id: "builder",
    label: "Builder plot",
    description: "A mid-game acre with drills, power, storage, and some cosmetics.",
    solPerDay: 0.32,
    solPerWeek: 2.24,
    solPerMonth: 9.6,
    setup: ["3 drills", "power relay", "solar", "one pet", "skins equipped"],
    color: "#7aa7ff",
    points: [0.08, 0.11, 0.16, 0.22, 0.27, 0.3, 0.32],
  },
  {
    id: "late",
    label: "Late-game plot",
    description: "A dense production acre with a mansion, automation, and flex.",
    solPerDay: 0.95,
    solPerWeek: 6.65,
    solPerMonth: 28.5,
    setup: ["max drills", "automation", "mansion", "legendary pet", "rare skins"],
    color: "#ffd166",
    points: [0.2, 0.28, 0.42, 0.55, 0.7, 0.82, 0.95],
  },
];

const ROADMAP: RoadmapItem[] = [
  {
    phase: "Phase 1",
    title: "Launch world + plots",
    copy: "Shared multiplayer plots, building placement, idle mining, and live SOL tracking.",
    status: "Live",
  },
  {
    phase: "Phase 2",
    title: "Marketplace and cosmetics",
    copy: "Skin listings, meme pickaxes, pets, and stronger visual progression loops.",
    status: "Live",
  },
  {
    phase: "Phase 3",
    title: "Economy governance",
    copy: "Reserve runway monitoring, reward tuning, payout caps, and event-backed emissions.",
    status: "In progress",
  },
  {
    phase: "Phase 4",
    title: "Seasonal raids and on-chain rewards",
    copy: "Timed world events, special chests, seasonal land cosmetics, and collectible rewards.",
    status: "Next",
  },
  {
    phase: "Phase 5",
    title: "Mobile polish and scaling",
    copy: "Responsive controls, performance passes, and a smoother multiplayer experience.",
    status: "Planned",
  },
];

const DEFAULT_PET_INVENTORY: Record<PetType, number> = {
  mole: 0,
  fox: 0,
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
  claim_plot: { title: "Claim a plot", reward: 0.05 },
  second_drill: { title: "Place a second drill", reward: 0.1 },
  first_upgrade: { title: "Upgrade anything once", reward: 0.1 },
  equip_pet: { title: "Equip a pet", reward: 0.05 },
  open_chest: { title: "Open a gacha chest", reward: 0.15 },
  income_1: { title: "Hit 1 SOL/min", reward: 0.2 },
  mansion: { title: "Reach mansion tier", reward: 0.35 },
  balance_100: { title: "Hold 100 SOL", reward: 0.25 },
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
const QUEST_BOX_REWARD_SCALE = 0.03;

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
    value === "chest"
  );
}

function isPetType(value: unknown): value is PetType {
  return value === "mole" || value === "fox" || value === "drake";
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

function isPickaxeSkinId(value: SkinId): value is "troll_pick" | "laser_pick" | "banana_pick" {
  return value === "troll_pick" || value === "laser_pick" || value === "banana_pick";
}

function structurePaintedArt(type: StructureType, level: number) {
  if (type === "shack") {
    const tier = Math.min(4, Math.max(1, level)) as 1 | 2 | 3 | 4;
    return HOME_ART[tier];
  }

  if (type === "drill") {
    const tier = Math.min(3, Math.max(1, level)) as 1 | 2 | 3;
    return DRILL_ART[tier];
  }

  return null;
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function defaultAvatarPosition() {
  return {
    x: Math.floor(WORLD_WIDTH / 2),
    y: Math.floor(WORLD_HEIGHT / 2),
  };
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

function reserveRunwayDays(rewardReserveSol: number, dailyEmission: number) {
  if (dailyEmission <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return rewardReserveSol / dailyEmission;
}

function reserveHealthLabel(runwayDays: number) {
  if (!Number.isFinite(runwayDays)) return "Idle";
  if (runwayDays >= 90) return "Stable";
  if (runwayDays >= 30) return "Healthy";
  if (runwayDays >= 14) return "Warm";
  if (runwayDays >= 7) return "Tight";
  if (runwayDays > 0) return "Critical";
  return "Depleted";
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
    chest: "Gacha Chest",
  };
  if (structure.type === "shack") {
    const name =
      structure.level >= 4 ? "Mansion" : structure.level === 3 ? "Villa" : structure.level === 2 ? "House" : "Shack";
    return `${name} Lv.${structure.level}`;
  }

  return `${labels[structure.type]} Lv.${structure.level}`;
}

function chartPath(points: number[], width: number, height: number, padding = 16) {
  if (points.length === 0) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.01, max - min);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return points
    .map((point, index) => {
      const x = padding + (index / Math.max(1, points.length - 1)) * innerWidth;
      const normalized = (point - min) / range;
      const y = padding + innerHeight - normalized * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function chartAreaPath(points: number[], width: number, height: number, padding = 16) {
  if (points.length === 0) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(0.01, max - min);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const line = points
    .map((point, index) => {
      const x = padding + (index / Math.max(1, points.length - 1)) * innerWidth;
      const normalized = (point - min) / range;
      const y = padding + innerHeight - normalized * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return `${line} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
}

function petLabel(pet?: PetType | null) {
  switch (pet) {
    case "mole":
      return "Mole";
    case "fox":
      return "Fox";
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

function petItem(petId?: PetType | null) {
  return PET_ITEMS.find((entry) => entry.id === petId) ?? null;
}

function marketplaceListingLabel(listing: MarketplaceListing) {
  if (listing.kind === "pet") {
    return petItem(listing.itemId as PetType)?.label ?? "Pet";
  }

  return skinItem(listing.itemId as SkinId)?.label ?? "Cosmetic";
}

function marketplaceListingIcon(listing: MarketplaceListing) {
  if (listing.kind === "pet") {
    return petItem(listing.itemId as PetType)?.id ?? "mole";
  }

  return skinItem(listing.itemId as SkinId)?.category ?? "pickaxe";
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
    const mintReward = Math.max(2, Math.round(reward * 4));
    next = {
      ...next,
      sol: round(next.sol + reward),
      rewardReserveSol: round(Math.max(0, next.rewardReserveSol - reward)),
      mints: round(next.mints + mintReward),
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
      message: `Mission complete: ${completed.join(" • ")}. +${rewardTotal.toFixed(2)} SOL, mint bonuses, and quest boxes.`,
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
  return [];
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
      plots[plotKey(x, y)] = makePlot(x, y, null);
    }
  }

  return {
    sol: STARTING_SOL,
    mints: STARTING_MINTS,
    rewardReserveSol: STARTING_REWARD_RESERVE_SOL,
    plots,
    claimedPlotId: null,
    selectedPlotId: plotKey(1, 1),
    selectedTile: null,
    moveSource: null,
    activeTool: "drill",
    avatar: defaultAvatarPosition(),
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
    questsOpen: false,
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

function normalizeMarketplaceListing(raw: unknown): MarketplaceListing | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<MarketplaceListing> & { skinId?: unknown };
  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now();
  const seller = typeof candidate.seller === "string" ? candidate.seller : "Unknown";
  const price = typeof candidate.price === "number" ? Math.max(0, candidate.price) : 0;

  if (candidate.kind === "pet" && isPetType(candidate.itemId)) {
    return {
      id: typeof candidate.id === "string" ? candidate.id : `listing-${createdAt}`,
      kind: "pet",
      itemId: candidate.itemId,
      category: "pet",
      seller,
      price,
      createdAt,
    };
  }

  const legacySkinId = typeof candidate.skinId === "string" && isSkinId(candidate.skinId) ? candidate.skinId : null;
  const itemId = isSkinId(candidate.itemId)
    ? candidate.itemId
    : legacySkinId;
  if (!itemId) return null;

  const category = skinItem(itemId)?.category ?? "pickaxe";

  return {
    id: typeof candidate.id === "string" ? candidate.id : `listing-${createdAt}`,
    kind: "skin",
    itemId,
    category,
    seller,
    price,
    createdAt,
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
          ? {
              x: clamp(Math.floor(parsed.avatar.x), 0, WORLD_WIDTH),
              y: clamp(Math.floor(parsed.avatar.y), 0, WORLD_HEIGHT),
            }
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
      marketListings: Array.isArray(parsed.marketListings)
        ? parsed.marketListings.map(normalizeMarketplaceListing).filter((entry): entry is MarketplaceListing => Boolean(entry))
        : seededMarketListings(),
      nftInventory: { ...DEFAULT_NFT_INVENTORY, ...(parsed.nftInventory ?? {}) },
      questBoxes: typeof parsed.questBoxes === "number" ? parsed.questBoxes : 0,
      inventoryOpen: typeof parsed.inventoryOpen === "boolean" ? parsed.inventoryOpen : fallback.inventoryOpen,
      proof: typeof parsed.proof === "string" ? parsed.proof : "",
      message: typeof parsed.message === "string" ? parsed.message : fallback.message,
      shopOpen: false,
      marketOpen: false,
      questsOpen: false,
      questReveal: null,
      sol: typeof parsed.sol === "number" ? parsed.sol : fallback.sol,
      mints: typeof parsed.mints === "number" ? parsed.mints : fallback.mints,
      rewardReserveSol:
        typeof parsed.rewardReserveSol === "number"
          ? Math.max(0, parsed.rewardReserveSol)
          : fallback.rewardReserveSol,
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
        loaded.rewardReserveSol = round(Math.max(0, loaded.rewardReserveSol - offlineGain));
        loaded.mints = round(loaded.mints + Math.max(0.2, economy.income * 0.45) * offlineSeconds / 60);
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
    mints: round(state.mints),
    rewardReserveSol: round(state.rewardReserveSol),
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

function resolveMultiplayerUrl() {
  const explicit = import.meta.env.VITE_MULTIPLAYER_WS_URL as string | undefined;
  const raw = explicit?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw, window.location.href);
      if (window.location.protocol === "https:" && parsed.protocol === "ws:") {
        parsed.protocol = "wss:";
      }
      return parsed.toString();
    } catch {
      if (window.location.protocol === "https:" && raw.startsWith("ws://")) {
        return raw.replace(/^ws:\/\//, "wss://");
      }
      return raw;
    }
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//127.0.0.1:8080/ws`;
}

function resolvePaymentApiBase() {
  const explicit = (import.meta.env.VITE_PAYMENT_API_URL as string | undefined)?.trim();
  if (explicit) {
    try {
      const parsed = new URL(explicit, window.location.href);
      if (parsed.pathname.endsWith("/")) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      return parsed.toString().replace(/\/$/, "");
    } catch {
      return explicit.replace(/\/$/, "");
    }
  }

  const wsUrl = resolveMultiplayerUrl();
  try {
    const parsed = new URL(wsUrl);
    parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    parsed.pathname = parsed.pathname.replace(/\/ws\/?$/, "");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return window.location.origin;
  }
}

type PaymentQuote = {
  mintAddress: string;
  treasuryTokenAccount: string;
  usdAmount: number;
  tokenPriceUsd: number;
  tokenAmountUi: number;
  allocations: Array<{
    label: string;
    tokenAccount: string;
    bps: number;
  }>;
};

async function fetchPaymentQuote(usdAmount: number): Promise<PaymentQuote> {
  const response = await fetch(
    `${resolvePaymentApiBase()}/api/payment-quote?usd=${encodeURIComponent(usdAmount.toFixed(2))}`,
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Could not load token price.");
  }

  if (
    typeof data?.mintAddress !== "string" ||
    typeof data?.treasuryTokenAccount !== "string" ||
    typeof data?.tokenPriceUsd !== "number" ||
    typeof data?.tokenAmountUi !== "number" ||
    !Array.isArray(data?.allocations)
  ) {
    throw new Error("Payment quote response was invalid.");
  }

  if (
    !data.allocations.every(
      (entry: unknown) =>
        !!entry &&
        typeof (entry as { label?: unknown }).label === "string" &&
        typeof (entry as { tokenAccount?: unknown }).tokenAccount === "string" &&
        typeof (entry as { bps?: unknown }).bps === "number",
    )
  ) {
    throw new Error("Payment split response was invalid.");
  }

  return data as PaymentQuote;
}

function sanitizeRoomId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "lobby";
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function remoteAvatarOffset(id: string) {
  const hash = hashString(id);
  const x = ((hash % 5) - 2) * 18;
  const y = ((Math.floor(hash / 5) % 5) - 2) * 12;
  return { x, y };
}

function toSharedPlotSnapshot(plot: Plot, ownerLabel: string | null): SharedPlotSnapshot {
  return {
    id: plot.id,
    name: plot.name,
    ownerLabel,
    structures: Object.fromEntries(
      Object.entries(plot.structures).map(([tile, structure]) => [
        tile,
        {
          type: structure.type,
          level: structure.level,
          opened: structure.opened,
          reward: structure.reward,
        },
      ]),
    ),
    chest: plot.chest ? { ...plot.chest } : null,
    totalCollectedSol: round(plot.totalCollectedSol),
  };
}

function mergeSharedPlotSnapshot(
  localPlot: Plot,
  sharedPlot: SharedPlotSnapshot,
  isMine: boolean,
  fallbackOwner: string,
) {
  return {
    ...localPlot,
    name: sharedPlot.name || localPlot.name,
    owner: isMine
      ? { label: fallbackOwner, me: true }
      : sharedPlot.ownerLabel
        ? { label: sharedPlot.ownerLabel, me: false }
        : localPlot.owner,
    structures: Object.fromEntries(
      Object.entries(sharedPlot.structures ?? {}).map(([tile, structure]) => [
        tile,
        {
          type: structure.type,
          level: Math.max(1, Math.floor(structure.level || 1)),
          opened: typeof structure.opened === "boolean" ? structure.opened : undefined,
          reward: typeof structure.reward === "string" ? structure.reward : undefined,
        },
      ]),
    ),
    chest: sharedPlot.chest ? { ...sharedPlot.chest } : null,
    totalCollectedSol: Number.isFinite(sharedPlot.totalCollectedSol)
      ? Math.max(0, sharedPlot.totalCollectedSol)
      : localPlot.totalCollectedSol,
  };
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
    chest: 48,
  };
  return costs[type];
}

function upgradeCost(structure: Structure) {
  switch (structure.type) {
    case "shack":
      return structure.level >= 4 ? 0 : 12 + structure.level * 7;
    case "drill":
      return structure.level >= 3 ? 0 : 10 + structure.level * 6;
    case "storage":
      return 8 + structure.level * 5;
    case "relay":
      return 12 + structure.level * 7;
    case "solar":
      return 10 + structure.level * 6;
    case "battery":
      return 10 + structure.level * 6;
    case "cooling":
      return 9 + structure.level * 5;
    case "conveyor":
      return 9 + structure.level * 5;
    case "drone":
      return 11 + structure.level * 6;
    case "scanner":
      return 14 + structure.level * 7;
    case "refinery":
      return 15 + structure.level * 8;
    case "vault":
      return 13 + structure.level * 7;
    case "decor":
    case "shop":
    case "neon":
    case "statue":
    case "sign":
    case "chest":
      return 5 + structure.level * 3;
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
  variant = "local",
}: {
  moving: boolean;
  pickaxeSkin?: SkinId | null;
  clothesSkin?: SkinId | null;
  variant?: "local" | "remote";
}) {
  return (
      <div
      className={[
        "avatar",
        moving ? "avatar--moving" : "",
        variant === "remote" ? "avatar--remote" : "",
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

function StructureShopArt({
  type,
  level = 1,
  className = "",
}: {
  type: StructureType;
  level?: number;
  className?: string;
}) {
  const paintedArt = structurePaintedArt(type, level);
  if (paintedArt) {
    return (
      <div
        className={`item-art item-art--structure-image ${className}`.trim()}
        style={{ backgroundImage: `url(${paintedArt})` }}
        aria-hidden="true"
      />
    );
  }

  const slot = STRUCTURE_ART_SLOTS[type];
  if (!slot) {
    return (
      <div className={className}>
        <BuildingSprite type={type} level={1} />
      </div>
    );
  }

  return (
    <div
      className={`item-art ${className}`.trim()}
      style={{
        backgroundImage: `url(${STRUCTURE_ART_ATLASES[slot.atlas]})`,
        backgroundSize: slot.atlas === "core" ? "400% 400%" : "200% 200%",
        backgroundPosition: `${slot.col * 100 / (slot.atlas === "core" ? 3 : 1)}% ${slot.row * 100 / (slot.atlas === "core" ? 3 : 1)}%`,
      }}
      aria-hidden="true"
    />
  );
}

function atlasPosition(col: number, row: number, columns: number, rows: number) {
  return `${col * 100 / (columns - 1)}% ${row * 100 / (rows - 1)}%`;
}

function SkinShopArt({ skinId, className = "" }: { skinId: SkinId; className?: string }) {
  if (isPickaxeSkinId(skinId)) {
    return (
      <div
        className={`item-art item-art--pickaxe-image ${className}`.trim()}
        style={{ backgroundImage: `url(${PICKAXE_ART[skinId]})` }}
        aria-hidden="true"
      />
    );
  }

  const slot = SKIN_ART_SLOTS[skinId];
  return (
    <div
      className={`item-art ${className}`.trim()}
      style={{
        backgroundImage: `url(${COSMETIC_ATLAS})`,
        backgroundSize: "300% 300%",
        backgroundPosition: atlasPosition(slot.col, slot.row, 3, 3),
      }}
      aria-hidden="true"
    />
  );
}

function PetShopArt({ petId, className = "" }: { petId: PetType; className?: string }) {
  const slot = PET_ART_SLOTS[petId];
  return (
    <div
      className={`item-art ${className}`.trim()}
      style={{
        backgroundImage: `url(${COSMETIC_ATLAS})`,
        backgroundSize: "300% 300%",
        backgroundPosition: atlasPosition(slot.col, slot.row, 3, 3),
      }}
      aria-hidden="true"
    />
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

function BuildingSprite({ type, level, opened }: { type: StructureType; level: number; opened?: boolean }) {
  if (type === "shack") {
    const tier = Math.min(4, Math.max(1, level));
    const art = structurePaintedArt(type, tier);
    return (
      <div
        className={`sprite sprite--painted sprite--painted-home sprite--painted-home-${tier}`}
        style={{ backgroundImage: `url(${art})` }}
        aria-hidden="true"
      />
    );
  }

  if (type === "drill") {
    const tier = Math.min(3, Math.max(1, level));
    const art = structurePaintedArt(type, tier);
    return (
      <div
        className={`sprite sprite--painted sprite--painted-drill sprite--painted-drill-${tier}`}
        style={{ backgroundImage: `url(${art})` }}
        aria-hidden="true"
      />
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
  const provider = window.solana;
  const [walletPublicKey, setWalletPublicKey] = useState<PublicKey | null>(
    provider?.publicKey ?? null,
  );
  const [walletMessage, setWalletMessage] = useState("");
  const [moving, setMoving] = useState(false);
  const [petSide, setPetSide] = useState<PetSide>("right");
  const [jackpotReveal, setJackpotReveal] = useState<ChestReward | null>(null);
  const [shopFilter, setShopFilter] = useState<ShopItem["category"] | "all">("all");
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [remotePlayers, setRemotePlayers] = useState<Record<string, RemotePlayer>>({});
  const [multiplayerStatus, setMultiplayerStatus] = useState<"offline" | "connecting" | "online">(
    "connecting",
  );
  const [roomDraft, setRoomDraft] = useState(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("room");
    return sanitizeRoomId(fromQuery ?? window.localStorage.getItem("ore-acres-room") ?? "lobby");
  });
  const [roomCode, setRoomCode] = useState(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("room");
    return sanitizeRoomId(fromQuery ?? window.localStorage.getItem("ore-acres-room") ?? "lobby");
  });
  const [page, setPage] = useState<Page>(() => (window.location.pathname.startsWith("/game") ? "game" : "home"));
  const [earningsScenarioId, setEarningsScenarioId] = useState<EarningsScenarioId>("starter");
  const [earningsHoverIndex, setEarningsHoverIndex] = useState<number | null>(null);
  const [marketFilter, setMarketFilter] = useState<"all" | "skins" | "pickaxes" | "clothes" | "pets">("all");
  const [marketSort, setMarketSort] = useState<"low" | "high" | "newest">("low");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const gamePanelRef = useRef<HTMLElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [placementPreview, setPlacementPreview] = useState<{ plotId: string; tile: string } | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const ignoreTileClickRef = useRef(false);
  const chestRevealTimerRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);
  const avatarRef = useRef(game.avatar);
  const lastSentMoveRef = useRef({ x: Number.NaN, y: Number.NaN, at: 0 });
  const playerName = useMemo(() => {
    if (!walletPublicKey) {
      return "Guest Miner";
    }

    return `Miner ${walletPublicKey.toBase58().slice(0, 4)}`;
  }, [walletPublicKey]);

  const saveKey = walletPublicKey
    ? `solana-tycoon:${walletPublicKey.toBase58()}`
    : "solana-tycoon:guest";

  function sendSharedPlot(plot: Plot | null) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !plot) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "plot_state",
        plot: toSharedPlotSnapshot(plot, playerName),
      }),
    );
  }

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
    const syncPage = () => {
      setPage(window.location.pathname.startsWith("/game") ? "game" : "home");
    };

    window.addEventListener("popstate", syncPage);
    return () => window.removeEventListener("popstate", syncPage);
  }, []);

  useEffect(() => {
    const room = sanitizeRoomId(roomCode);
    window.localStorage.setItem("ore-acres-room", room);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("room", room);
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, [roomCode]);

  useEffect(() => {
    avatarRef.current = game.avatar;
  }, [game.avatar.x, game.avatar.y]);

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
    if (page !== "game") return;

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
  }, [page]);

  useEffect(() => {
    const wsUrl = resolveMultiplayerUrl();
    if (!wsUrl) {
      setMultiplayerStatus("offline");
      setRemotePlayers({});
      return;
    }

    const room = sanitizeRoomId(roomCode);
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(
        `${wsUrl}${wsUrl.includes("?") ? "&" : "?"}room=${encodeURIComponent(room)}&name=${encodeURIComponent(playerName)}`,
      );
    } catch {
      setMultiplayerStatus("offline");
      return;
    }

    socketRef.current = socket;
    myPlayerIdRef.current = null;
    setMultiplayerStatus("connecting");

    const upsertRemotePlayer = (player: RemotePlayer) => {
      if (player.id === myPlayerIdRef.current) return;
      setRemotePlayers((current) => ({
        ...current,
        [player.id]: player,
      }));
    };

    const removeRemotePlayer = (playerId: string) => {
      if (playerId === myPlayerIdRef.current) return;
      setRemotePlayers((current) => {
        if (!(playerId in current)) return current;
        const next = { ...current };
        delete next[playerId];
        return next;
      });
    };

    socket.onopen = () => {
      setMultiplayerStatus("online");
      socket.send(JSON.stringify({ type: "rename", name: playerName }));
      socket.send(
        JSON.stringify({
          type: "move",
          x: Math.round(avatarRef.current.x),
          y: Math.round(avatarRef.current.y),
        }),
      );
    };

    socket.onmessage = (event) => {
      let message: any;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === "welcome") {
        myPlayerIdRef.current = typeof message.playerId === "string" ? message.playerId : null;
        const players = Array.isArray(message.snapshot?.players) ? message.snapshot.players : [];
        const nextRemotePlayers: Record<string, RemotePlayer> = {};

        const snapshotPlots = message.snapshot?.plots && typeof message.snapshot.plots === "object"
          ? message.snapshot.plots
          : {};

        if (snapshotPlots && Object.keys(snapshotPlots).length > 0) {
          setGame((current) => {
            let next = current;

            for (const [plotId, plot] of Object.entries(snapshotPlots)) {
              if (!plot || typeof plot !== "object") continue;
              const localPlot = next.plots[plotId];
              if (!localPlot) continue;
              const normalizedPlot = mergeSharedPlotSnapshot(
                localPlot,
                plot as SharedPlotSnapshot,
                current.claimedPlotId === plotId,
                playerName,
              );
              next = {
                ...next,
                plots: {
                  ...next.plots,
                  [plotId]: normalizedPlot,
                },
              };
            }

            return next;
          });
        }

        for (const entry of players) {
          if (!entry || typeof entry.id !== "string") continue;
          if (entry.id === myPlayerIdRef.current) continue;
          nextRemotePlayers[entry.id] = {
            id: entry.id,
            name: typeof entry.name === "string" ? entry.name : "Miner",
            x: Number(entry.x ?? 0),
            y: Number(entry.y ?? 0),
          };
        }

        setRemotePlayers(nextRemotePlayers);
        return;
      }

      if (message.type === "player_joined" && message.player) {
        upsertRemotePlayer({
          id: String(message.player.id),
          name: typeof message.player.name === "string" ? message.player.name : "Miner",
          x: Number(message.player.x ?? 0),
          y: Number(message.player.y ?? 0),
        });
        return;
      }

      if (message.type === "player_moved" && message.player) {
        setRemotePlayers((current) => {
          const existing = current[String(message.player.id)];
          if (!existing) return current;
          return {
            ...current,
            [existing.id]: {
              ...existing,
              x: Number(message.player.x ?? existing.x),
              y: Number(message.player.y ?? existing.y),
            },
          };
        });
        return;
      }

      if (message.type === "player_renamed" && message.player) {
        setRemotePlayers((current) => {
          const existing = current[String(message.player.id)];
          if (!existing) return current;
          return {
            ...current,
            [existing.id]: {
              ...existing,
              name: typeof message.player.name === "string" ? message.player.name : existing.name,
            },
          };
        });
        return;
      }

      if (message.type === "player_left" && typeof message.playerId === "string") {
        removeRemotePlayer(message.playerId);
        return;
      }

      if (message.type === "plot_state" && message.plot && typeof message.plot.id === "string") {
        const plot = message.plot as SharedPlotSnapshot;
        setGame((current) => {
          const localPlot = current.plots[plot.id];
          if (!localPlot) return current;
          const mergedPlot = mergeSharedPlotSnapshot(
            localPlot,
            plot,
            current.claimedPlotId === plot.id,
            playerName,
          );
          return {
            ...current,
            plots: {
              ...current.plots,
              [plot.id]: mergedPlot,
            },
          };
        });
      }
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setMultiplayerStatus("offline");
    };

    socket.onerror = () => {
      setMultiplayerStatus("offline");
    };

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.close();
    };
  }, [playerName, roomCode]);

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
        const nextMints = round(next.mints + Math.max(0.35, economy.income * 0.45) / 60);
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
            rewardReserveSol: round(Math.max(0, next.rewardReserveSol - earned)),
            mints: nextMints,
            stats: {
              ...next.stats,
              totalEarned: round(next.stats.totalEarned + earned),
            },
            message: `Your plot is producing ${economy.income.toFixed(2)} SOL/min.`,
          };
        } else if (nextMints !== next.mints) {
          next = {
            ...next,
            mints: nextMints,
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

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || multiplayerStatus !== "online") {
      return;
    }

    const now = Date.now();
    const avatar = avatarRef.current;
    const last = lastSentMoveRef.current;
    const moved = Number.isNaN(last.x) || Math.hypot(avatar.x - last.x, avatar.y - last.y) > 2;

    if (!moved || now - last.at < 80) {
      return;
    }

    lastSentMoveRef.current = { x: avatar.x, y: avatar.y, at: now };
    socket.send(
      JSON.stringify({
        type: "move",
        x: Math.round(avatar.x),
        y: Math.round(avatar.y),
      }),
    );
  }, [game.avatar.x, game.avatar.y, multiplayerStatus]);

  const claimedPlot = game.claimedPlotId ? game.plots[game.claimedPlotId] : null;
  const selectedPlot = game.plots[game.selectedPlotId];
  const selectedPlotEconomy = claimedPlot
    ? computeEconomy(claimedPlot, game.activePet, game.equippedPickaxeSkin, game.equippedClothesSkin)
    : null;
  const rewardReserveRunwayDays = reserveRunwayDays(
    game.rewardReserveSol,
    selectedPlotEconomy ? selectedPlotEconomy.income * 1440 : 0,
  );
  const rewardReserveHealth = reserveHealthLabel(rewardReserveRunwayDays);
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
    const viewportWidth = viewportSize.width || 1280;
    const viewportHeight = viewportSize.height || 720;
    const x = clamp(viewportWidth / 2 - center.x, viewportWidth - WORLD_WIDTH, 0);
    const y = clamp(viewportHeight / 2 - center.y, viewportHeight - WORLD_HEIGHT, 0);
    return { x, y };
  }, [game.avatar, viewportSize.height, viewportSize.width]);

  function setMessage(message: string) {
    setGame((current) => ({ ...current, message }));
  }

  function scrollToGame() {
    gamePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToPage(nextPage: Page) {
    const nextPath = nextPage === "game" ? "/game" : "/";
    window.history.pushState({}, "", nextPath);
    setPage(nextPage);
    if (nextPage === "game") {
      window.setTimeout(() => {
        gamePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openMarketplace() {
    if (page !== "game") {
      goToPage("game");
      window.setTimeout(() => {
        setGame((current) => ({ ...current, marketOpen: true }));
      }, 0);
      return;
    }

    setGame((current) => ({ ...current, marketOpen: true }));
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
      setWalletMessage("Wallet disconnected.");
    } catch {
      setWalletMessage("Could not disconnect wallet.");
    }
  }

  async function chargePumpMint(usdAmount: number, label: string) {
    if (!walletPublicKey || !provider) {
      setWalletMessage("Connect Phantom first.");
      return null;
    }

    if (!provider.signTransaction && !provider.signAndSendTransaction) {
      setWalletMessage("Your wallet needs to support transaction signing.");
      return null;
    }

    let quote: PaymentQuote;
    try {
      quote = await fetchPaymentQuote(usdAmount);
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Could not load payment quote.");
      return null;
    }

    if (game.mints < quote.tokenAmountUi) {
      setWalletMessage(
        `Need ${quote.tokenAmountUi.toFixed(2)} Pump.fun mints to buy ${label}.`,
      );
      return null;
    }

    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const mint = new PublicKey(quote.mintAddress);

    try {
      const mintInfo = await getMint(connection, mint);
      const sourceTokenAccount = await getAssociatedTokenAddress(mint, walletPublicKey);
      const atomicAmount = BigInt(Math.max(1, Math.round(quote.tokenAmountUi * 10 ** mintInfo.decimals)));
      const splitAmounts = quote.allocations.map((allocation) => (atomicAmount * BigInt(allocation.bps)) / 10_000n);
      const splitTotal = splitAmounts.reduce((sum, amount) => sum + amount, 0n);
      if (splitTotal < atomicAmount) {
        splitAmounts[0] += atomicAmount - splitTotal;
      }

      const transaction = new Transaction();
      for (let index = 0; index < quote.allocations.length; index += 1) {
        const allocation = quote.allocations[index];
        const amount = splitAmounts[index];
        if (amount <= 0n) continue;

        transaction.add(
          createTransferCheckedInstruction(
            sourceTokenAccount,
            mint,
            new PublicKey(allocation.tokenAccount),
            walletPublicKey,
            amount,
            mintInfo.decimals,
          ),
        );
      }

      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      transaction.feePayer = walletPublicKey;
      transaction.recentBlockhash = latestBlockhash.blockhash;

      let signature: string | null = null;
      if (provider.signAndSendTransaction) {
        const result = await provider.signAndSendTransaction(transaction);
        signature = typeof result === "string" ? result : result.signature;
      } else if (provider.signTransaction) {
        const signed = await provider.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signed.serialize());
      }

      if (!signature) {
        setWalletMessage("Wallet could not submit the payment transaction.");
        return null;
      }

      await connection.confirmTransaction(
        {
          signature,
          ...latestBlockhash,
        },
        "confirmed",
      );

      return {
        signature,
        tokenAmountUi: quote.tokenAmountUi,
        usdAmount: quote.usdAmount,
        tokenPriceUsd: quote.tokenPriceUsd,
      };
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Token payment failed.");
      return null;
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
    let syncedPlot: Plot | null = null;
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

      const nextState: GameState = {
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
        },
        message: "Plot claimed. Your shack and starter drill are ready.",
      };
      syncedPlot = nextPlots[plot.id];
      return nextState;
    });
    sendSharedPlot(syncedPlot);
  }

  async function buyShopItem(type: StructureType) {
    let syncedPlot: Plot | null = null;
    const item = SHOP_ITEMS.find((entry) => entry.id === type);
    if (!item) return;
    if (!game.claimedPlotId) {
      setMessage("Claim a plot first.");
      return;
    }

    let payment: { tokenAmountUi: number } | null = null;
    if (item.cost > 0) {
      payment = await chargePumpMint(item.cost, item.label);
      if (!payment) return;
    } else {
      payment = { tokenAmountUi: 0 };
    }

    setGame((current) => {
      if (!current.claimedPlotId) return { ...current, message: "Claim a plot first." };

      const plot = current.plots[current.claimedPlotId];

      if (type === "chest") {
        if (plot.chest) {
          return { ...current, message: "You already have a gacha chest on this plot." };
        }

        const nextState = {
          ...current,
          mints: Math.max(0, round(current.mints - payment.tokenAmountUi)),
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
        syncedPlot = nextState.plots[current.claimedPlotId];
        return nextState;
      }

      return {
        ...current,
        mints: Math.max(0, round(current.mints - payment.tokenAmountUi)),
        inventory: {
          ...current.inventory,
          [type]: (current.inventory[type] ?? 0) + 1,
        },
        activeTool: type,
        shopOpen: false,
        message: `${item.label} bought. Click inside your plot to place it.`,
      };
    });
    sendSharedPlot(syncedPlot);
  }

  async function buyPetItem(type: PetType) {
    const item = PET_ITEMS.find((entry) => entry.id === type);
    if (!item) return;
    if (!game.claimedPlotId) {
      setMessage("Claim a plot first.");
      return;
    }

    const owned = (game.petInventory[type] ?? 0) > 0;
    if (owned) {
      setGame((current) => ({
        ...current,
        activePet: type,
        message: `${item.label} equipped.`,
      }));
      return;
    }

    const payment = await chargePumpMint(item.cost, item.label);
    if (!payment) return;

    setGame((current) => ({
      ...current,
      mints: Math.max(0, round(current.mints - payment.tokenAmountUi)),
      petInventory: {
        ...current.petInventory,
        [type]: 1,
      },
      activePet: type,
      message: `${item.label} joined your crew.`,
    }));
  }

  async function buySkinItem(skinId: SkinId) {
    const skin = skinItem(skinId);
    if (!skin) return;
    if (!game.claimedPlotId) {
      setMessage("Claim a plot first.");
      return;
    }

    const payment = await chargePumpMint(skin.cost, skin.label);
    if (!payment) return;

    setGame((current) => ({
      ...current,
      mints: Math.max(0, round(current.mints - payment.tokenAmountUi)),
      skinInventory: {
        ...current.skinInventory,
        [skinId]: (current.skinInventory[skinId] ?? 0) + 1,
      },
      message: `${skin.label} added to your wardrobe.`,
    }));
  }

  function openChest(plotId: string) {
    const reward = pickChestReward();
    let syncedPlot: Plot | null = null;

    setGame((current) => {
      if (!current.claimedPlotId || plotId !== current.claimedPlotId) {
        return { ...current, message: "You can only open a chest on your claimed plot." };
      }

      const plot = current.plots[plotId];
      if (!plot.chest) {
        return current;
      }

      const nextState = {
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
      syncedPlot = nextState.plots[plotId];
      return nextState;
    });

    sendSharedPlot(syncedPlot);

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
    let syncedPlot: Plot | null = null;
    setGame((current) => {
      const drop = current.bonusDrops.find((entry) => entry.id === dropId);
      if (!drop) return current;
      if (Date.now() < drop.readyAt) {
        return { ...current, message: "That ore is still locking in. Give it a bit longer." };
      }

      const pickaxeSkin = current.equippedPickaxeSkin;
      const bonusMultiplier = pickaxeMultiplier(pickaxeSkin);

      const nextState = {
        ...current,
        sol: round(current.sol + drop.reward * bonusMultiplier),
        rewardReserveSol: round(
          Math.max(0, current.rewardReserveSol - drop.reward * bonusMultiplier),
        ),
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
      syncedPlot = current.claimedPlotId ? nextState.plots[current.claimedPlotId] : null;
      return nextState;
    });

    sendSharedPlot(syncedPlot);
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
          rewardReserveSol: round(Math.max(0, next.rewardReserveSol - amount)),
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
            kind: "skin",
            itemId: skinId,
            category: skin.category,
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

  function listPetForSale(petId: PetType) {
    setGame((current) => {
      if ((current.petInventory[petId] ?? 0) <= 0) {
        return { ...current, message: "You do not own that pet." };
      }

      const pet = petItem(petId);
      if (!pet) return current;
      const price = scaledCost(Math.max(10, Math.round(pet.cost * 0.85)));

      return {
        ...current,
        petInventory: {
          ...current.petInventory,
          [petId]: Math.max(0, (current.petInventory[petId] ?? 0) - 1),
        },
        activePet: current.activePet === petId ? null : current.activePet,
        marketListings: [
          {
            id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            kind: "pet",
            itemId: petId,
            category: "pet",
            seller: "You",
            price,
            createdAt: Date.now(),
          },
          ...current.marketListings,
        ],
        message: `${pet.label} listed for ${price} SOL.`,
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
        skinInventory:
          listing.kind === "skin"
            ? {
                ...current.skinInventory,
                [listing.itemId as SkinId]: (current.skinInventory[listing.itemId as SkinId] ?? 0) + 1,
              }
            : current.skinInventory,
        petInventory:
          listing.kind === "pet"
            ? {
                ...current.petInventory,
                [listing.itemId as PetType]: (current.petInventory[listing.itemId as PetType] ?? 0) + 1,
              }
            : current.petInventory,
        marketListings: current.marketListings.filter((entry) => entry.id !== listingId),
        message: `${marketplaceListingLabel(listing)} purchased from the marketplace.`,
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
    let syncedPlot: Plot | null = null;
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

      const nextState = {
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
      syncedPlot = nextState.plots[plotId];
      return nextState;
    });
    sendSharedPlot(syncedPlot);
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
    let syncedPlot: Plot | null = null;
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

      const nextState = {
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
      syncedPlot = nextState.plots[plotId];
      return nextState;
    });
    sendSharedPlot(syncedPlot);
  }

  async function upgradeSelected() {
    let syncedPlot: Plot | null = null;
    if (!game.claimedPlotId) {
      setMessage("Claim a plot first.");
      return;
    }

    const plot = game.plots[game.claimedPlotId];
    const selectedTile = game.selectedTile;
    if (!selectedTile) {
      setMessage("Select a structure first.");
      return;
    }

    const structure = plot.structures[selectedTile];
    if (!structure) {
      setMessage("That tile is empty.");
      return;
    }
    if (structure.type !== "drill" && structure.type !== "shack") {
      setMessage("That structure cannot be upgraded.");
      return;
    }

    const maxLevel = maxStructureLevel(structure.type);
    if (structure.level >= maxLevel) {
      setMessage(structure.type === "shack" ? "That shack is already a mansion." : "That drill is already fully upgraded.");
      return;
    }

    const payment = await chargePumpMint(upgradeCost(structure), `${structureLabel(structure)} upgrade`);
    if (!payment) return;

    setGame((current) => {
      if (!current.claimedPlotId) return { ...current, message: "Claim a plot first." };

      const plotNow = current.plots[current.claimedPlotId];
      const selectedTileNow = current.selectedTile;
      if (!selectedTileNow) return { ...current, message: "Select a structure first." };

      const structureNow = plotNow.structures[selectedTileNow];
      if (!structureNow) return { ...current, message: "That tile is empty." };

      const maxLevelNow = maxStructureLevel(structureNow.type);
      const nextState = {
        ...current,
        mints: Math.max(0, round(current.mints - payment.tokenAmountUi)),
        plots: {
          ...current.plots,
          [current.claimedPlotId]: {
            ...plotNow,
            structures: {
              ...plotNow.structures,
              [selectedTileNow]: { ...structureNow, level: Math.min(maxLevelNow, structureNow.level + 1) },
            },
          },
        },
        stats: {
          ...current.stats,
          upgradesDone: current.stats.upgradesDone + 1,
        },
        message: `${structureLabel(structureNow)} upgraded.`,
      };
      syncedPlot = nextState.plots[current.claimedPlotId];
      return nextState;
    });
    sendSharedPlot(syncedPlot);
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
  const earningsScenario = EARNINGS_SCENARIOS.find((scenario) => scenario.id === earningsScenarioId) ?? EARNINGS_SCENARIOS[0];
  const chartWidth = 760;
  const chartHeight = 320;
  const chartPoints = earningsScenario.points;
  const chartMin = Math.min(...chartPoints);
  const chartMax = Math.max(...chartPoints);
  const chartRange = Math.max(0.01, chartMax - chartMin);
  const chartPathValue = chartPath(chartPoints, chartWidth, chartHeight);
  const chartAreaValue = chartAreaPath(chartPoints, chartWidth, chartHeight);
  const chartPointIndex = earningsHoverIndex ?? chartPoints.length - 1;
  const chartPointX =
    16 + (chartPointIndex / Math.max(1, chartPoints.length - 1)) * (chartWidth - 32);
  const chartPointValue = chartPoints[chartPointIndex] ?? chartPoints[chartPoints.length - 1] ?? 0;
  const chartPointY =
    16 + (chartHeight - 32) - ((chartPointValue - chartMin) / chartRange) * (chartHeight - 32);
  const visibleMarketListings = [...game.marketListings]
    .filter((listing) => {
      if (marketFilter === "all") return true;
      if (marketFilter === "pets") return listing.kind === "pet";
      if (marketFilter === "skins") return listing.kind === "skin";
      if (listing.kind !== "skin") return false;
      if (marketFilter === "pickaxes") return listing.category === "pickaxe";
      if (marketFilter === "clothes") return listing.category === "clothes";
      return true;
    })
    .sort((a, b) => {
      if (marketSort === "newest") return b.createdAt - a.createdAt;
      if (marketSort === "high") return b.price - a.price;
      return a.price - b.price;
    });

  return (
    <main className="shell">
      <header className="site-nav">
        <button type="button" className="site-nav__brand" onClick={() => goToPage("home")}>
          <span className="site-nav__icon">⛏</span>
          <span className="site-nav__text">
            <strong>Ore Acres</strong>
            <small>Pixel idle miner</small>
          </span>
        </button>

        <nav className="site-nav__links" aria-label="Primary">
          <button type="button" className={`site-nav__link ${page === "home" ? "active" : ""}`} onClick={() => goToPage("home")}>
            Home
          </button>
          <button type="button" className={`site-nav__link ${page === "game" ? "active" : ""}`} onClick={() => goToPage("game")}>
            Game
          </button>
          <button type="button" className="site-nav__link" onClick={() => scrollToSection("whitepaper")}>
            Whitepaper
          </button>
          <button type="button" className="site-nav__link" onClick={() => scrollToSection("roadmap")}>
            Roadmap
          </button>
          <button type="button" className="site-nav__link" onClick={openMarketplace}>
            Marketplace
          </button>
        </nav>

        <div className="site-nav__wallet">
          <button className="primary" onClick={walletPublicKey ? disconnectWallet : connectWallet}>
            {walletPublicKey ? "Wallet connected" : "Connect wallet"}
          </button>
        </div>
      </header>

      {page === "home" ? (
        <>
          <section className="hero">
            <div>
              <p className="eyebrow">Idle Solana miner</p>
              <h1>Ore Acres</h1>
              <p className="lede">
                Walk a big shared map, claim an open acre, and turn it into a
                mining empire. Everyone can see how much SOL each plot has
                collected, so the good land stands out immediately.
              </p>
              <div className="hero__actions">
                <button type="button" className="primary" onClick={() => goToPage("game")}>
                  Enter the game
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => document.getElementById("roadmap")?.scrollIntoView({ behavior: "smooth" })}
                >
                  View roadmap
                </button>
              </div>
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
                  <dt>Status</dt>
                  <dd>{walletMessage || game.message}</dd>
                </div>
              </dl>

              <div className="wallet-actions">
                <button className="ghost" onClick={resetWorld}>
                  Reset world
                </button>
              </div>
            </div>
          </section>

          <section className="landing-grid">
            <article className="landing-card landing-card--feature">
              <span className="landing-card__eyebrow">Why it feels alive</span>
              <h2>One world. Real players. Visible value.</h2>
              <p>
                Ore Acres is built around a shared multiplayer map where every plot
                can be claimed, customized, and judged at a glance. The deeper you
                build, the more your acre stands out.
              </p>
              <div className="landing-card__pills">
                <span>Idle mining</span>
                <span>Shared plots</span>
                <span>Marketplace</span>
                <span>Reserve-backed payouts</span>
              </div>
            </article>

            <article className="landing-card landing-card--stats">
              <span className="landing-card__eyebrow">Earnings examples</span>
              <h2>{earningsScenario.label}</h2>
              <p>{earningsScenario.description}</p>
              <div className="landing-card__stats-row">
                <div>
                  <span>Day</span>
                  <strong>{earningsScenario.solPerDay.toFixed(2)} SOL</strong>
                </div>
                <div>
                  <span>Week</span>
                  <strong>{earningsScenario.solPerWeek.toFixed(2)} SOL</strong>
                </div>
                <div>
                  <span>Month</span>
                  <strong>{earningsScenario.solPerMonth.toFixed(1)} SOL</strong>
                </div>
              </div>
              <div className="landing-card__legend">
                {earningsScenario.setup.map((entry) => (
                  <span key={entry}>{entry}</span>
                ))}
              </div>
            </article>

            <article className="landing-card landing-card--chart">
              <div className="landing-card__header">
                <span className="landing-card__eyebrow">Interactive earnings graph</span>
                <div className="scenario-tabs">
                  {EARNINGS_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      className={`chip ${earningsScenarioId === scenario.id ? "active" : ""}`}
                      onClick={() => {
                        setEarningsScenarioId(scenario.id);
                        setEarningsHoverIndex(null);
                      }}
                    >
                      {scenario.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="earnings-chart">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="img"
                  aria-label="Interactive earnings chart"
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const index = Math.max(
                      0,
                      Math.min(
                        chartPoints.length - 1,
                        Math.round(((x / rect.width) * (chartPoints.length - 1)) || 0),
                      ),
                    );
                    setEarningsHoverIndex(index);
                  }}
                  onMouseLeave={() => setEarningsHoverIndex(null)}
                >
                  <defs>
                    <linearGradient id={`earnings-fill-${earningsScenario.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={earningsScenario.color} stopOpacity="0.36" />
                      <stop offset="100%" stopColor={earningsScenario.color} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width={chartWidth} height={chartHeight} rx="24" fill="rgba(255,255,255,0.03)" />
                  {Array.from({ length: 5 }).map((_, index) => (
                    <line
                      key={index}
                      x1="16"
                      x2={chartWidth - 16}
                      y1={16 + (index * (chartHeight - 32)) / 4}
                      y2={16 + (index * (chartHeight - 32)) / 4}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1"
                    />
                  ))}
                  <path d={chartAreaValue} fill={`url(#earnings-fill-${earningsScenario.id})`} />
                  <path d={chartPathValue} fill="none" stroke={earningsScenario.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {chartPoints.map((point, index) => {
                    const x = 16 + (index / Math.max(1, chartPoints.length - 1)) * (chartWidth - 32);
                    const normalized = (point - chartMin) / chartRange;
                    const y = 16 + (chartHeight - 32) - normalized * (chartHeight - 32);
                    const active = index === chartPointIndex;
                    return (
                      <g key={`${earningsScenario.id}-${index}`}>
                        <circle cx={x} cy={y} r={active ? 9 : 6} fill={active ? "#0b1020" : earningsScenario.color} stroke={earningsScenario.color} strokeWidth="3" />
                      </g>
                    );
                  })}
                  <line
                    x1={chartPointX}
                    x2={chartPointX}
                    y1="16"
                    y2={chartHeight - 16}
                    stroke="rgba(255,255,255,0.14)"
                    strokeDasharray="8 8"
                  />
                  <circle cx={chartPointX} cy={chartPointY} r="12" fill={earningsScenario.color} opacity="0.18" />
                </svg>
                <div
                  className="earnings-chart__tooltip"
                  style={{
                    left: `${Math.max(16, Math.min(88, (chartPointIndex / Math.max(1, chartPoints.length - 1)) * 100))}%`,
                    top: `${Math.max(12, Math.min(84, (1 - (chartPointValue - chartMin) / chartRange) * 100))}%`,
                  }}
                >
                  <strong>Day {chartPointIndex + 1}</strong>
                  <span>{chartPointValue.toFixed(2)} SOL/day</span>
                </div>
              </div>
              <div className="landing-card__meta">
                <span>Hover the chart and swap scenarios to compare how an acre scales.</span>
              </div>
            </article>
          </section>

          <section className="whitepaper" id="whitepaper">
            <div className="section-heading">
              <span className="eyebrow">Whitepaper</span>
              <h2>What this game is supposed to be</h2>
              <p>
                A social idle miner where land ownership, cosmetics, and live
                rewards create a loop that is fun to watch even when you are not
                actively grinding.
              </p>
            </div>

            <div className="whitepaper-grid">
              <article className="whitepaper-card">
                <h3>Core loop</h3>
                <p>
                  Claim a plot, place drills, upgrade your shack into a mansion,
                  and stack tiny SOL earnings over time.
                </p>
              </article>
              <article className="whitepaper-card">
                <h3>Economy</h3>
                <p>
                  Item purchases are priced in the Pump.fun mint, while gameplay
                  rewards stay denominated in SOL and are constrained by reserve
                  runway.
                </p>
              </article>
              <article className="whitepaper-card">
                <h3>Social layer</h3>
                <p>
                  Players can walk past each other, inspect each plot, show off
                  skins, and compare total collected SOL publicly.
                </p>
              </article>
              <article className="whitepaper-card">
                <h3>Marketplace</h3>
                <p>
                  Cosmetics can be listed for SOL, creating a simple sink and a
                  secondary play-to-trade loop.
                </p>
              </article>
            </div>
          </section>

          <section className="roadmap" id="roadmap">
            <div className="section-heading">
              <span className="eyebrow">Roadmap</span>
              <h2>Launch plan</h2>
              <p>
                The first version is already playable. The roadmap focuses on making
                the economy safer, the visuals richer, and the social systems deeper.
              </p>
            </div>

            <div className="roadmap-grid">
              {ROADMAP.map((item, index) => (
                <article key={item.phase} className="roadmap-card">
                  <div className="roadmap-card__head">
                    <span>{item.phase}</span>
                    <strong>{item.status}</strong>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <div className="roadmap-card__index">0{index + 1}</div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="game-topbar">
            <div>
              <p className="eyebrow">Game page</p>
              <h2>Ore Acres Online</h2>
              <p>Jump straight into the shared world, claim a plot, and start mining.</p>
            </div>
            <div className="game-topbar__actions">
              <button type="button" className="ghost" onClick={() => goToPage("home")}>
                Back to homepage
              </button>
              <button type="button" className="primary" onClick={resetWorld}>
                Reset world
              </button>
            </div>
          </section>
        </>
      )}

      {page === "game" ? (
        <section className="game-panel" ref={gamePanelRef}>
        <div className="stats">
          <div>
            <span>Idle SOL</span>
            <strong>{game.sol.toFixed(2)}</strong>
          </div>
          <div>
            <span>Pump.fun mint balance</span>
            <strong>{game.mints.toFixed(2)}</strong>
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
          <div className="stats__meter">
            <span>Reward reserve</span>
            <strong>{game.rewardReserveSol.toFixed(2)} SOL</strong>
            <div className="stats__meter-bar" aria-hidden="true">
              <div
                className="stats__meter-fill"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      Number.isFinite(rewardReserveRunwayDays)
                        ? (rewardReserveRunwayDays / 90) * 100
                        : 100,
                    ),
                  )}%`,
                }}
              />
            </div>
            <small>
              {Number.isFinite(rewardReserveRunwayDays)
                ? `${rewardReserveRunwayDays.toFixed(1)} days runway`
                : "No active emissions"}
              {" · "}
              {rewardReserveHealth}
            </small>
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
              <form
                className="world-header__room"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextRoom = sanitizeRoomId(roomDraft);
                  setRoomDraft(nextRoom);
                  setRoomCode(nextRoom);
                }}
              >
                <span>Room</span>
                <div className="world-header__room-row">
                  <input
                    className="world-header__room-input"
                    value={roomDraft}
                    onChange={(event) => setRoomDraft(event.target.value)}
                    spellCheck={false}
                    maxLength={24}
                    aria-label="Room code"
                  />
                  <button type="submit" className="ghost">
                    Join
                  </button>
                </div>
              </form>
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
                  questsOpen: false,
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
                  questsOpen: false,
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
                  questsOpen: false,
                }))
              }
            >
              Marketplace
            </button>
            <button
              type="button"
              className={`ghost ${game.questsOpen ? "active" : ""}`}
              onClick={() =>
                setGame((current) => ({
                  ...current,
                  questsOpen: !current.questsOpen,
                  shopOpen: false,
                  marketOpen: false,
                }))
              }
            >
              Quests {game.questBoxes > 0 ? `(${game.questBoxes})` : ""}
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

                {Object.values(remotePlayers).map((player) => (
                  <div
                    key={player.id}
                    className="remote-avatar-anchor"
                    style={{
                      left: `${player.x}px`,
                      top: `${player.y}px`,
                      transform: `translate(calc(-50% + ${remoteAvatarOffset(player.id).x}px), calc(-50% + ${remoteAvatarOffset(player.id).y}px))`,
                    }}
                  >
                    <AvatarSprite moving={false} variant="remote" />
                    <span className="remote-avatar__name">{player.name}</span>
                  </div>
                ))}

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
                  <span>
                    {game.claimedPlotId ? "Your plot is active" : "Find an open plot"} •{" "}
                    {multiplayerStatus === "online"
                      ? `${Object.keys(remotePlayers).length} others online`
                      : multiplayerStatus === "connecting"
                        ? "Connecting to multiplayer"
                        : "Multiplayer offline"}
                  </span>
                  <strong>{game.message}</strong>
                </div>

                <div className="world-inspector">
                  <div className="world-inspector__row">
                    <span>Plot</span>
                    <strong>{selectedPlot.name}</strong>
                  </div>
                  <div className="world-inspector__row">
                    <span>Owner</span>
                    <strong>
                      {selectedPlot.owner ? (selectedPlot.owner.me ? "You" : selectedPlot.owner.label) : "Unclaimed"}
                    </strong>
                  </div>
                  <div className="world-inspector__row">
                    <span>Tile</span>
                    <strong>{game.selectedTile ?? "None"}</strong>
                  </div>
                  <div className="world-inspector__row">
                    <span>Tool</span>
                    <strong>{structureLabel({ type: game.activeTool, level: 1 })}</strong>
                  </div>
                  {selectedChest ? (
                    <div className="world-inspector__note">
                      Huge chest ready. Click it to reveal the reward.
                    </div>
                  ) : null}
                  {selectedStructure ? (
                    <div className="world-inspector__upgrade">
                      <span>
                        {selectedStructure.level >= (selectedStructureMax ?? 0)
                          ? "Max level reached"
                          : `${structureLabel(selectedStructure)} -> Lv.${selectedStructure.level + 1}`}
                      </span>
                      <div className="inspector-progress">
                        <div
                          className="inspector-progress__fill"
                          style={{
                            width: `${Math.round((selectedStructure.level / (selectedStructureMax ?? 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <small className="inspector-note">
                        {nextStructureCost === null
                          ? "No more upgrades available."
                          : `$${nextStructureCost.toFixed(2)} worth of token to upgrade.`}
                      </small>
                    </div>
                  ) : null}
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
                                <StructureShopArt type={type} className="item-art--inventory" />
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
                            <div key={pet.id} className={`inventory-item inventory-item--pet ${active ? "active" : ""}`}>
                              <button
                                type="button"
                                className="inventory-item__main"
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
                                  <PetShopArt petId={pet.id} className="item-art--inventory" />
                                </div>
                                <div className="inventory-item__meta">
                                  <strong>{pet.label}</strong>
                                  <span>{count > 0 ? petBoostLabel(pet.id) : "Locked"}</span>
                                </div>
                              </button>
                              <div className="inventory-item__actions">
                                <button
                                  type="button"
                                  className="ghost inventory-item__action inventory-item__action--list"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    listPetForSale(pet.id);
                                  }}
                                  disabled={count <= 0}
                                >
                                  List for sale
                                </button>
                              </div>
                            </div>
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
                                <SkinShopArt skinId={skin.id} className="item-art--inventory" />
                              </div>
                              <div className="inventory-item__meta">
                                <strong>{skin.label}</strong>
                                <span>{count > 0 ? skin.description : `Not owned · $${skin.cost.toFixed(2)} USD`}</span>
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
                                <StructureShopArt type={type} className="item-art--inventory" />
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
                            <div className="shop-card__icon shop-card__icon--structure">
                              <StructureShopArt type={item.id} className="item-art--shop" />
                            </div>
                            <div className="shop-card__body">
                              <h4>{item.label}</h4>
                              <p>{item.description}</p>
                              <div className="shop-card__meta">
                                <span>${item.cost.toFixed(2)} USD target</span>
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
                              <SkinShopArt skinId={skin.id} className="item-art--shop" />
                            </div>
                            <div className="shop-card__body">
                              <h4>{skin.label}</h4>
                              <p>{skin.description}</p>
                              <div className="shop-card__meta">
                                <span>{skin.category === "pickaxe" ? `+${Math.round((skin.oreMultiplier ?? 1) * 100 - 100)}% ore value` : `+${Math.round((skin.incomeMultiplier ?? 1) * 100 - 100)}% idle income`}</span>
                                <span>{owned ? "Owned" : `$${skin.cost.toFixed(2)} USD target`}</span>
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
                              <PetShopArt petId={pet.id} className="item-art--shop" />
                            </div>
                            <div className="shop-card__body">
                              <h4>{pet.label}</h4>
                              <p>{pet.description}</p>
                              <div className="shop-card__meta">
                                <span>{pet.boost}</span>
                                <span>{owned ? "Owned" : `$${pet.cost.toFixed(2)} USD target`}</span>
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
                  <div className="market-shell">
                    <div className="market-shell__header">
                      <div>
                        <span className="overlay-panel__eyebrow">Marketplace</span>
                        <h2>Trade room</h2>
                        <p>Sort listings by price, filter by item type, and grab gear before somebody else does.</p>
                      </div>
                      <div className="market-shell__actions">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() =>
                            setGame((current) => ({
                              ...current,
                              marketOpen: false,
                            }))
                          }
                        >
                          Back to game
                        </button>
                      </div>
                    </div>

                    <div className="market-shell__toolbar">
                      <div className="market-filters">
                        {[
                          ["all", "All"],
                          ["skins", "Skins"],
                          ["pickaxes", "Pickaxes"],
                          ["clothes", "Clothes"],
                          ["pets", "Pets"],
                        ].map(([value, label]) => (
                          <button
                            type="button"
                            key={value}
                            className={`chip ${marketFilter === value ? "active" : ""}`}
                            onClick={() => setMarketFilter(value as typeof marketFilter)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="market-sort">
                        {[
                          ["low", "Price low → high"],
                          ["high", "Price high → low"],
                          ["newest", "Newest"],
                        ].map(([value, label]) => (
                          <button
                            type="button"
                            key={value}
                            className={`chip ${marketSort === value ? "active" : ""}`}
                            onClick={() => setMarketSort(value as typeof marketSort)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="market-shell__layout">
                      <aside className="market-shell__sidebar">
                        <div className="market-stat">
                          <span>Listings</span>
                          <strong>{game.marketListings.length}</strong>
                        </div>
                        <div className="market-stat">
                          <span>Visible</span>
                          <strong>{visibleMarketListings.length}</strong>
                        </div>
                        <div className="market-stat">
                          <span>Categories</span>
                          <strong>Skins, pets, pickaxes</strong>
                        </div>
                        <div className="market-note">
                          <p>
                            List items from your inventory in the game page, then come back here to browse and buy them with SOL.
                          </p>
                        </div>
                      </aside>

                      <div className="market-grid">
                        {visibleMarketListings.length > 0 ? (
                          visibleMarketListings.map((listing) => {
                            const skin = listing.kind === "skin" ? skinItem(listing.itemId as SkinId) : null;
                            const pet = listing.kind === "pet" ? petItem(listing.itemId as PetType) : null;
                            const active =
                              listing.kind === "skin"
                                ? skin?.category === "pickaxe"
                                  ? game.equippedPickaxeSkin === skin?.id
                                  : game.equippedClothesSkin === skin?.id
                                : game.activePet === pet?.id;
                            return (
                              <article
                                key={listing.id}
                                className={`market-card ${active ? "owned" : ""} market-card--${listing.kind}`}
                              >
                                <div
                                  className={`market-card__icon market-card__icon--${listing.kind} ${
                                    listing.kind === "skin"
                                      ? `market-card__icon--${skin?.category ?? "pickaxe"}`
                                      : ""
                                  }`}
                                >
                                  {listing.kind === "pet" ? (
                                    <PetSprite type={pet?.id ?? "mole"} />
                                  ) : (
                                    <span className="market-card__meme">{skin?.meme ?? "SKIN"}</span>
                                  )}
                                </div>
                                <div className="market-card__body">
                                  <div className="market-card__head">
                                    <h3>{marketplaceListingLabel(listing)}</h3>
                                    <span className={`market-card__tag market-card__tag--${listing.category}`}>
                                      {listing.category}
                                    </span>
                                  </div>
                                  <p>Sold by {listing.seller}</p>
                                  <div className="market-card__meta">
                                    <span>{listing.price.toFixed(2)} SOL</span>
                                    <span>{listing.kind === "pet" ? petBoostLabel(listing.itemId as PetType) : skin?.description ?? "Marketplace cosmetic"}</span>
                                  </div>
                                </div>
                                <button type="button" className="primary" onClick={() => buyMarketListing(listing.id)}>
                                  Buy
                                </button>
                              </article>
                            );
                          })
                        ) : (
                          <div className="inventory-box inventory-box--empty market-empty">
                            <div className="inventory-box__copy">
                              <strong>No listings match these filters</strong>
                              <span>Try a different category or sort order, or list more items from your inventory.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {game.questsOpen ? (
                <div className="quests-overlay open">
                  <div className="overlay-panel overlay-panel--quests">
                    <div className="overlay-panel__header">
                      <div>
                        <span className="overlay-panel__eyebrow">Quest board</span>
                        <strong>Live missions</strong>
                      </div>
                      <button
                        type="button"
                        className="ghost overlay-panel__toggle"
                        onClick={(event) => {
                          event.stopPropagation();
                          setGame((current) => ({
                            ...current,
                            questsOpen: false,
                          }));
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div className="mission-board mission-board--overlay">
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
                    <div className="inventory-box">
                      <div className="inventory-box__copy">
                        <strong>{game.questBoxes} reward box{game.questBoxes === 1 ? "" : "es"}</strong>
                        <span>Open these for SOL, meme skins, or placeholder NFTs.</span>
                      </div>
                      <button type="button" className="primary" onClick={openQuestBox} disabled={game.questBoxes <= 0}>
                        Open box
                      </button>
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

          </div>
        </div>
        </section>
      ) : null}
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
