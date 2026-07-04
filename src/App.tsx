import { useEffect, useMemo, useRef, useState } from "react";
import type { WheelEvent } from "react";
import type { PublicKey, Transaction } from "@solana/web3.js";

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
type AvatarFacing = "down" | "up" | "left" | "right";
type DroneDirection = "up" | "down" | "left" | "right";
type AvatarSkinTone = "sunlit" | "terra" | "umbra";
type AvatarHairColor = "cocoa" | "midnight" | "neon";
type AvatarBaseOutfit = "mint" | "ember" | "denim";

type AvatarStyle = {
  skinTone: AvatarSkinTone;
  hairColor: AvatarHairColor;
  baseOutfit: AvatarBaseOutfit;
};

type ChestRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

type ChestReward = {
  id: string;
  label: string;
  description: string;
  rarity: ChestRarity;
  weight: number;
};

type MiningRewardKind = "sol" | "mints" | "skin" | "pet" | "box" | "nft";

type MiningReward = {
  id: string;
  label: string;
  description: string;
  detail?: string;
  kind: MiningRewardKind;
  rarity: OreNodeRarity;
  weight: number;
  sol?: number;
  mints?: number;
  skinId?: SkinId;
  petId?: PetType;
  nftId?: string;
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

type TutorialPanel = "world" | "shop" | "inventory" | "quests" | "market";

type TutorialStep = {
  id: string;
  title: string;
  eyebrow: string;
  body: string;
  objective: string;
  voiceLine: string;
  panel: TutorialPanel;
  voiceStart: number;
};

type NpcId = "marketplace" | "banker" | "pickaxe" | "quest" | "plotSeller";

type NpcDialogueState = {
  npcId: NpcId;
  step: number;
};

type RoadmapItem = {
  phase: string;
  title: string;
  copy: string;
  status: "Live" | "In progress" | "Next" | "Planned";
};

type Page = "home" | "game" | "economy";

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
  kind: "plot" | "town" | "mine";
  position: { x: number; y: number };
  owner: PlotOwner | null;
  structures: Record<string, Structure>;
  chest: { id: string } | null;
  oreNodes: OreNode[];
  totalCollectedSol: number;
  totalCollectedMints: number;
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
  | "astronaut_fit"
  | "purplespace";

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

type OreNodeRarity = "small" | "medium" | "large";

type OreNode = {
  id: string;
  plotId: string;
  tile: string;
  rarity: OreNodeRarity;
  reward: number;
  createdAt: number;
  despawnAt: number;
  miningUntil: number | null;
  miningBy: string | null;
};

type GameState = {
  sol: number;
  mints: number;
  playtestMode: boolean;
  rewardReserveSol: number;
  miningXp: number;
  miningLevel: number;
  plots: Record<string, Plot>;
  claimedPlotId: string | null;
  selectedPlotId: string;
  selectedTile: string | null;
  moveSource: { plotId: string; tile: string } | null;
  activeTool: StructureType;
  avatar: { x: number; y: number };
  avatarStyle: AvatarStyle;
  inventory: Record<StructureType, number>;
  petInventory: Record<PetType, number>;
  activePet: PetType | null;
  chestReveal: { plotId: string; reward: string } | null;
  missions: MissionState;
  stats: GameStats;
  skinInventory: Record<SkinId, number>;
  equippedPickaxeSkin: SkinId | null;
  equippedClothesSkin: SkinId | null;
  marketListings: MarketplaceListing[];
  nftInventory: Record<string, number>;
  questBoxes: number;
  npcDialogue: NpcDialogueState | null;
  inventoryOpen: boolean;
  shopOpen: boolean;
  marketOpen: boolean;
  questsOpen: boolean;
  mineReveal: { label: string; detail: string; kind: MiningRewardKind } | null;
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
  avatarStyle?: AvatarStyle;
  equippedPickaxeSkin?: SkinId | null;
  equippedClothesSkin?: SkinId | null;
};

type SharedPlotSnapshot = {
  id: string;
  name: string;
  kind?: "plot" | "town" | "mine";
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
  oreNodes: OreNode[];
  totalCollectedSol: number;
  totalCollectedMints: number;
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
const STARTING_SOL = 0.02;
const STARTING_MINTS = 18;
const STARTING_REWARD_RESERVE_SOL = 1;
const PLAYTEST_MINT_GRANT = 250;
const PLAYTEST_MINT_RATE = 1;
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const BASE_STORAGE = 60;
const WORLD_COLUMNS = 5;
const WORLD_ROWS = 5;
const PLOT_SIZE = 520;
const TOWN_PLOT_SIZE = PLOT_SIZE * 2;
const ROAD_GAP = 170;
const WORLD_PADDING = 100;
const PLOT_WORLD_WIDTH =
  WORLD_PADDING * 2 + WORLD_COLUMNS * PLOT_SIZE + (WORLD_COLUMNS - 1) * ROAD_GAP;
const PLOT_WORLD_HEIGHT =
  WORLD_PADDING * 2 + WORLD_ROWS * PLOT_SIZE + (WORLD_ROWS - 1) * ROAD_GAP;
const TOWN_ID = "starter-town";
const TOWN_TOP = PLOT_WORLD_HEIGHT + 240 - PLOT_SIZE / 2;
const MINE_ID = "dustfall-mine";
const MINE_TOP = TOWN_TOP + TOWN_PLOT_SIZE + 240;
const WORLD_WIDTH = PLOT_WORLD_WIDTH;
const WORLD_HEIGHT = MINE_TOP + PLOT_SIZE + WORLD_PADDING;
const MINING_LEVEL_CAP = 99;
const MIN_CAMERA_ZOOM = 0.7;
const MAX_CAMERA_ZOOM = 1.55;
const PLOT_HEADER_HEIGHT = 50;
const PLOT_BOARD_SIZE = PLOT_SIZE - PLOT_HEADER_HEIGHT;
const TILE_COUNT = 7;
const TILE_SIZE = PLOT_BOARD_SIZE / TILE_COUNT;
const SHACK_FOOTPRINT_SIZE = 2;
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
const ORE_ART: Record<OreNodeRarity, string> = {
  small: "/assets/Ore/Small-ore-node.png",
  medium: "/assets/Ore/Medium-ore-node.png",
  large: "/assets/Ore/Large-ore-node.png",
};
const PICKAXE_ART: Record<"troll_pick" | "laser_pick" | "banana_pick", string> = {
  troll_pick: "/assets/cosmetics/pickaxes/troll-pick.png",
  laser_pick: "/assets/cosmetics/pickaxes/laser-pick.png",
  banana_pick: "/assets/cosmetics/pickaxes/banana-pick.png",
};
const AVATAR_STYLE_DEFAULT: AvatarStyle = {
  skinTone: "sunlit",
  hairColor: "cocoa",
  baseOutfit: "mint",
};
const AVATAR_SKIN_TONES: Record<AvatarSkinTone, { label: string; base: string; shade: string }> = {
  sunlit: { label: "Sunlit", base: "#ffdcbc", shade: "#d99164" },
  terra: { label: "Terra", base: "#c98355", shade: "#7a4632" },
  umbra: { label: "Umbra", base: "#8b5a42", shade: "#3d241c" },
};
const AVATAR_HAIR_COLORS: Record<AvatarHairColor, { label: string; base: string; shade: string }> = {
  cocoa: { label: "Cocoa", base: "#3b241b", shade: "#21120d" },
  midnight: { label: "Midnight", base: "#182037", shade: "#070a12" },
  neon: { label: "Neon", base: "#67f5d3", shade: "#1e8db5" },
};
const AVATAR_BASE_OUTFITS: Record<AvatarBaseOutfit, { label: string; base: string; shade: string }> = {
  mint: { label: "Mint", base: "#67f5d3", shade: "#238e83" },
  ember: { label: "Ember", base: "#ffd166", shade: "#d96a27" },
  denim: { label: "Denim", base: "#7aa7ff", shade: "#243a78" },
};
const PURPLESPACE_SKIN_ART = {
  down: "/assets/cosmetics/skins/purplespace/front.png",
  up: "/assets/cosmetics/skins/purplespace/back.png",
  side: "/assets/cosmetics/skins/purplespace/side-cutout.png",
} as const;
const PURPLESPACE_SKIN_SHEET = "/assets/cosmetics/skins/purplespace/purplesheet.png";
const PURPLESPACE_SKIN_TRANSPARENT = {
  down: "/assets/cosmetics/skins/purplespace/front-cutout.png",
  up: "/assets/cosmetics/skins/purplespace/back-cutout.png",
  side: "/assets/cosmetics/skins/purplespace/side-cutout.png",
} as const;
const PURPLESPACE_RIG_PARTS = {
  head: "/assets/cosmetics/skins/purplespace/rig/down/head.png",
  body: "/assets/cosmetics/skins/purplespace/rig/down/body.png",
  armLeft: "/assets/cosmetics/skins/purplespace/rig/down/arm-left.png",
  armRight: "/assets/cosmetics/skins/purplespace/rig/down/arm-right.png",
  legLeft: "/assets/cosmetics/skins/purplespace/rig/down/leg-left.png",
  legRight: "/assets/cosmetics/skins/purplespace/rig/down/leg-right.png",
} as const;
const PURPLESPACE_RIG_SIDE_PARTS = {
  head: "/assets/cosmetics/skins/purplespace/rig/side/head.png",
  body: "/assets/cosmetics/skins/purplespace/rig/side/body.png",
  armBack: "/assets/cosmetics/skins/purplespace/rig/side/arm-back.png",
  armFront: "/assets/cosmetics/skins/purplespace/rig/side/arm-front.png",
  legBack: "/assets/cosmetics/skins/purplespace/rig/side/leg-back.png",
  legFront: "/assets/cosmetics/skins/purplespace/rig/side/leg-front.png",
} as const;
const ASTRONAUT_SKIN_SHEET = "/assets/cosmetics/skins/astronaut_fit/sheet.png";
const ASTRONAUT_SKIN_PREVIEW = "/assets/cosmetics/skins/astronaut_fit/preview.png";
const ASTRONAUT_FRAME_SIZE = 64;
const ASTRONAUT_FRAME_GROUPS = {
  down: 0,
  up: 4,
  side: 8,
} as const;
type AvatarRigSlot = "shadow" | "head" | "body" | "legs" | "tool" | "aura";
type AvatarRigBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  transform?: string;
  zIndex?: number;
};
const AVATAR_RIG: Record<AvatarRigSlot, AvatarRigBox> = {
  shadow: { left: 3, top: 27, width: 20, height: 7, zIndex: 1, transform: "none" },
  head: { left: 5, top: 1, width: 16, height: 14, zIndex: 4, transform: "none" },
  body: { left: 4, top: 14, width: 18, height: 13, zIndex: 3, transform: "none" },
  legs: { left: 4, top: 25, width: 18, height: 8, zIndex: 2, transform: "none" },
  tool: { left: 10, top: 12, width: 15, height: 15, zIndex: 5 },
  aura: { left: -4, top: 3, width: 34, height: 34, zIndex: 1, transform: "none" },
};
function rigStyle(slot: AvatarRigSlot) {
  const box = AVATAR_RIG[slot];
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    ...(box.transform ? { transform: box.transform } : {}),
    ...(box.zIndex ? { zIndex: box.zIndex } : {}),
  };
}
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
const BUILDABLE_ART: Partial<Record<StructureType, string>> = {
  storage: "/assets/structures/buildables/storage.svg",
  relay: "/assets/structures/buildables/relay.svg",
  solar: "/assets/structures/buildables/solar.svg",
  battery: "/assets/structures/buildables/battery.svg",
  cooling: "/assets/structures/buildables/cooling.svg",
  conveyor: "/assets/structures/buildables/conveyor.svg",
  drone: "/assets/structures/buildables/drone.svg",
  scanner: "/assets/structures/buildables/scanner.svg",
  refinery: "/assets/structures/buildables/refinery.svg",
  vault: "/assets/structures/buildables/vault.svg",
  neon: "/assets/structures/buildables/neon.svg",
  statue: "/assets/structures/buildables/statue.svg",
  sign: "/assets/structures/buildables/sign.svg",
  shop: "/assets/structures/buildables/shop.svg",
  decor: "/assets/structures/buildables/decor.svg",
  chest: "/assets/structures/buildables/chest.svg",
};
const DRILL_ANIMATION_FPS = 9;
const ORE_SPAWN_INTERVAL_MS = 60_000;
const ORE_FIRST_SPAWN_DELAY_MS = 15_000;
const ORE_SPAWN_CHANCE = 0.25;
const ORE_NODE_LIMIT = 2;
const ORE_DESPAWN_MS = 2 * 60 * 60 * 1000;
const ORE_MINING_MS: Record<OreNodeRarity, number> = {
  small: 30_000,
  medium: 90_000,
  large: 180_000,
};
const ORE_REWARD_RANGE: Record<OreNodeRarity, [number, number]> = {
  small: [0.04, 0.07],
  medium: [0.09, 0.15],
  large: [0.22, 0.32],
};
const DAILY_MINT_POOL = 10_000;
const MAX_MINT_PER_PLOT_PER_DAY = 2_000;
const AVERAGE_STAGE_SCORE = 4;
const ORE_RARITY_WEIGHTS: Array<[OreNodeRarity, number]> = [
  ["small", 74],
  ["medium", 21],
  ["large", 5],
];
const ORE_INTERACTION_RANGE = 180;
const TUTORIAL_VOICEOVER_SRC = "/audio/tutorial-voiceover.mp3";
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    eyebrow: "Step 1",
    title: "Welcome to Ore Acres",
    body: "This is an idle mining MMO-lite: walk the shared map, claim one plot, build miners, and grow your mint income over time.",
    objective: "Move with WASD or arrow keys and look for an open plot.",
    voiceLine:
      "Welcome to Ore Acres. You start as a miner in a shared world where every plot can become a tiny SOL-producing empire.",
    panel: "world",
    voiceStart: 0,
  },
  {
    id: "claim",
    eyebrow: "Step 2",
    title: "Claim Your Plot",
    body: "Walk onto an unclaimed plot and press Claim Plot. Your starter shack and basic drill appear for free.",
    objective: "Claim a plot when the prompt appears.",
    voiceLine:
      "Your first move is simple: find an open plot, claim it, and your starter shack and drill are placed automatically.",
    panel: "world",
    voiceStart: 8,
  },
  {
    id: "shop",
    eyebrow: "Step 3",
    title: "Buy Buildables",
    body: "Open the Shop to buy boosters, automation, prestige decor, pets, and cosmetics. Playtest mode gives test mints so you can try everything before the token is live.",
    objective: "Open Shop, buy an item, then place it from Inventory.",
    voiceLine:
      "The shop is where the tycoon layer starts. Buy boosters, automation, cosmetics, and prestige items with the game token.",
    panel: "shop",
    voiceStart: 18,
  },
  {
    id: "inventory",
    eyebrow: "Step 4",
    title: "Place And Move Items",
    body: "Inventory holds purchased items and cosmetics. Select an owned item, click an empty tile to place it, or select a placed item and use Move.",
    objective: "Use Inventory to switch tools and place owned items.",
    voiceLine:
      "Your inventory is your build kit. Select an item, click an empty square, and reshape the plot whenever your layout changes.",
    panel: "inventory",
    voiceStart: 30,
  },
  {
    id: "mine",
    eyebrow: "Step 5",
    title: "Mine Ore Nodes",
    body: "Ore nodes spawn on free plot tiles. Walk near one and click Mine. Bigger nodes take longer but can roll better rewards.",
    objective: "Find an ore node, walk close, and mine it.",
    voiceLine:
      "Rare ore nodes appear over time. Walk up, start mining, and let your pickaxe work until the reward roll pops.",
    panel: "world",
    voiceStart: 42,
  },
  {
    id: "upgrade",
    eyebrow: "Step 6",
    title: "Upgrade Drills And Shack",
    body: "Click a drill or shack and press Upgrade. Drills improve mining output, while the shack grows from a starter base toward a mansion.",
    objective: "Select your starter drill or shack, then press Upgrade.",
    voiceLine:
      "Upgrades are the long-term hook. Drills get stronger, your shack grows, and the plot starts feeling like your own mining base.",
    panel: "world",
    voiceStart: 54,
  },
  {
    id: "quests",
    eyebrow: "Step 7",
    title: "Claim Quest Boxes",
    body: "Quests reward boxes, SOL, cosmetics, and collectible placeholders. They teach the loop while giving players a reason to keep coming back.",
    objective: "Open Quests and claim/open any reward boxes you earn.",
    voiceLine:
      "Quests give direction and rewards. Complete simple milestones, open reward boxes, and chase skins, pets, and collectibles.",
    panel: "quests",
    voiceStart: 66,
  },
  {
    id: "market",
    eyebrow: "Step 8",
    title: "Trade Cosmetics",
    body: "The Marketplace is for skins, pets, and pickaxes. Players can list cosmetics for SOL while mining stays idle-focused and non-combat.",
    objective: "Open the Marketplace to browse filters and listings.",
    voiceLine:
      "The marketplace lets players trade cosmetics for SOL, turning rare drops and flex items into a social economy.",
    panel: "market",
    voiceStart: 78,
  },
];
const WORLD_DECORATIONS = [
  { kind: "crystal", x: 170, y: 250, size: 1.05 },
  { kind: "pine", x: 780, y: 120, size: 1.1 },
  { kind: "rocks", x: 1370, y: 300, size: 0.95 },
  { kind: "crystal", x: 2220, y: 190, size: 1.2 },
  { kind: "camp", x: 3090, y: 360, size: 1.05 },
  { kind: "pine", x: 3820, y: 180, size: 1.18 },
  { kind: "rocks", x: 500, y: 1420, size: 1.1 },
  { kind: "camp", x: 1650, y: 1230, size: 1 },
  { kind: "crystal", x: 2830, y: 1460, size: 0.9 },
  { kind: "pine", x: 3950, y: 1320, size: 1.08 },
  { kind: "rocks", x: 930, y: 2600, size: 1.15 },
  { kind: "crystal", x: 3410, y: 2600, size: 1.05 },
] as const;

const TOWN_NPCS = [
  {
    id: "banker" as NpcId,
    label: "Banker",
    subtitle: "Safe storage and wallet",
    x: 23,
    y: 54,
    asset: "/assets/town/bank.png",
  },
  {
    id: "quest" as NpcId,
    label: "Quest Giver",
    subtitle: "Tasks and rewards",
    x: 50,
    y: 26,
    asset: "/assets/town/castle.png",
  },
  {
    id: "pickaxe" as NpcId,
    label: "Pickaxe Store",
    subtitle: "Tools and upgrades",
    x: 75,
    y: 52,
    asset: "/assets/town/Cave.png",
  },
  {
    id: "marketplace" as NpcId,
    label: "Marketplace",
    subtitle: "Cosmetic trading",
    x: 76,
    y: 20,
    asset: "/assets/town/Market.png",
  },
  {
    id: "plotSeller" as NpcId,
    label: "Plot Seller",
    subtitle: "Buy your acre",
    x: 49,
    y: 58,
    asset: "/assets/town/purple bulding.png",
  },
] as const;
const TOWN_NPC_AVATARS: Record<NpcId, AvatarStyle> = {
  banker: { skinTone: "terra", hairColor: "midnight", baseOutfit: "denim" },
  quest: { skinTone: "sunlit", hairColor: "cocoa", baseOutfit: "ember" },
  pickaxe: { skinTone: "sunlit", hairColor: "midnight", baseOutfit: "denim" },
  marketplace: { skinTone: "terra", hairColor: "neon", baseOutfit: "mint" },
  plotSeller: { skinTone: "umbra", hairColor: "cocoa", baseOutfit: "ember" },
};
type TownAssetId =
  | "bank"
  | "market"
  | "castle"
  | "cave"
  | "pond"
  | "rocks-bank"
  | "rocks-top"
  | "barrels"
  | "crates-a"
  | "crates-b"
  | "bush-left"
  | "bush-right"
  | "farm"
  | "purple";

type TownPlacement = {
  id: string;
  assetId: TownAssetId;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
};

type TownAssetDef = {
  id: TownAssetId;
  label: string;
  src: string;
  width: number;
  height: number;
  zIndex: number;
  category: "building" | "decor";
};

const TOWN_ASSET_DEFS: TownAssetDef[] = [
  { id: "bank", label: "Bank", src: "/assets/town/bank.png", width: 16, height: 14, zIndex: 8, category: "building" },
  { id: "market", label: "Market", src: "/assets/town/Market.png", width: 15, height: 10, zIndex: 8, category: "building" },
  { id: "castle", label: "Castle", src: "/assets/town/castle.png", width: 19, height: 17, zIndex: 8, category: "building" },
  { id: "cave", label: "Cave", src: "/assets/town/Cave.png", width: 18, height: 14, zIndex: 8, category: "building" },
  { id: "purple", label: "Purple Shop", src: "/assets/town/purple bulding.png", width: 17, height: 17, zIndex: 8, category: "building" },
  { id: "pond", label: "Pond", src: "/assets/town/Pond.png", width: 17, height: 8, zIndex: 2, category: "decor" },
  { id: "farm", label: "Farm", src: "/assets/town/farm behind market.png", width: 13, height: 7, zIndex: 3, category: "decor" },
  { id: "barrels", label: "Barrels", src: "/assets/town/barrels left of market.png", width: 6, height: 5, zIndex: 9, category: "decor" },
  { id: "crates-a", label: "Crates A", src: "/assets/town/crates behind bank.png", width: 10, height: 6, zIndex: 7, category: "decor" },
  { id: "crates-b", label: "Crates B", src: "/assets/town/crates behind bank-2.png", width: 10, height: 6, zIndex: 7, category: "decor" },
  { id: "rocks-bank", label: "Bank Rocks", src: "/assets/town/Rocks in front of bank.png", width: 10, height: 8, zIndex: 10, category: "decor" },
  { id: "rocks-top", label: "Top Rocks", src: "/assets/town/Rocks top-right center.png", width: 9, height: 8, zIndex: 10, category: "decor" },
  { id: "bush-left", label: "Left Bush", src: "/assets/town/bush left side of farm.png", width: 4, height: 14, zIndex: 2, category: "decor" },
  { id: "bush-right", label: "Right Bush", src: "/assets/town/bush right side of farm.png", width: 4, height: 14, zIndex: 2, category: "decor" },
];

const TOWN_ASSET_BY_ID = Object.fromEntries(TOWN_ASSET_DEFS.map((asset) => [asset.id, asset] as const)) as Record<
  TownAssetId,
  TownAssetDef
>;

const TOWN_ASSET_TO_NPC: Partial<Record<TownAssetId, NpcId>> = {
  bank: "banker",
  market: "marketplace",
  castle: "quest",
  cave: "pickaxe",
  purple: "plotSeller",
};

const TOWN_LAYOUT_STORAGE_KEY = "ore-acres-town-builder-layout";

const DEFAULT_TOWN_PLACEMENTS: TownPlacement[] = [
  { id: "town-bank", assetId: "bank", x: 27, y: 52, scale: 1.08, zIndex: 8 },
  { id: "town-market", assetId: "market", x: 73, y: 45, scale: 1.04, zIndex: 8 },
  { id: "town-quest-hall", assetId: "castle", x: 50, y: 30, scale: 1.06, zIndex: 8 },
  { id: "town-pickaxe-cave", assetId: "cave", x: 20, y: 24, scale: 0.9, zIndex: 8 },
  { id: "town-plot-seller", assetId: "purple", x: 74, y: 72, scale: 0.92, zIndex: 8 },
  { id: "town-pond", assetId: "pond", x: 26, y: 75, scale: 0.9, zIndex: 2 },
  { id: "town-farm", assetId: "farm", x: 73, y: 29, scale: 0.9, zIndex: 3 },
  { id: "town-market-barrels", assetId: "barrels", x: 66, y: 46, scale: 0.9, zIndex: 9 },
  { id: "town-bank-crates-a", assetId: "crates-a", x: 21, y: 49, scale: 0.82, zIndex: 7 },
  { id: "town-bank-crates-b", assetId: "crates-b", x: 31, y: 50, scale: 0.78, zIndex: 7 },
  { id: "town-bank-rocks", assetId: "rocks-bank", x: 23, y: 60, scale: 0.72, zIndex: 10 },
  { id: "town-top-rocks", assetId: "rocks-top", x: 82, y: 21, scale: 0.8, zIndex: 10 },
  { id: "town-farm-bush-left", assetId: "bush-left", x: 62, y: 27, scale: 0.8, zIndex: 2 },
  { id: "town-farm-bush-right", assetId: "bush-right", x: 85, y: 31, scale: 0.8, zIndex: 2 },
];

function normalizeTownPlacements(raw: unknown): TownPlacement[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Partial<TownPlacement> & { assetId?: unknown };
      const assetId = typeof candidate.assetId === "string" && candidate.assetId in TOWN_ASSET_BY_ID
        ? (candidate.assetId as TownAssetId)
        : null;
      if (!assetId) return null;

      return {
        id: typeof candidate.id === "string" ? candidate.id : `town-place-${Date.now()}`,
        assetId,
        x: typeof candidate.x === "number" ? clamp(candidate.x, 0, 100) : 50,
        y: typeof candidate.y === "number" ? clamp(candidate.y, 0, 100) : 50,
        scale: typeof candidate.scale === "number" ? clamp(candidate.scale, 0.4, 2.5) : 1,
        zIndex: typeof candidate.zIndex === "number" ? candidate.zIndex : TOWN_ASSET_BY_ID[assetId].zIndex,
      } satisfies TownPlacement;
    })
    .filter(Boolean) as TownPlacement[];
}

function loadTownPlacements() {
  if (typeof window === "undefined") return DEFAULT_TOWN_PLACEMENTS;

  try {
    const raw = window.localStorage.getItem(TOWN_LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_TOWN_PLACEMENTS;
    const parsed = JSON.parse(raw);
    const placements = normalizeTownPlacements(parsed);
    return placements.length > 0 ? placements : DEFAULT_TOWN_PLACEMENTS;
  } catch {
    return DEFAULT_TOWN_PLACEMENTS;
  }
}
const DRILL_FRAMESETS = {
  1: [
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-1.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-2.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-3.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-4.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-5.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-6.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-7.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-8.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-9.png",
  ],
  2: [
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-1.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-2.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-3.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-4.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-5.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-6.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-7.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-8.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-9.png",
  ],
  3: [
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-1.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-2.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-3.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-4.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-5.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-6.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-7.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-8.png",
    "/assets/structures/Animations/Drill-animations-tier-1/Drill-9.png",
  ],
} as const;
const SKIN_ART_SLOTS: Record<SkinId, CosmeticArtSlot> = {
  troll_pick: { col: 0, row: 0 },
  laser_pick: { col: 1, row: 0 },
  banana_pick: { col: 2, row: 0 },
  aura_hoodie: { col: 0, row: 1 },
  cyber_jacket: { col: 1, row: 1 },
  astronaut_fit: { col: 2, row: 1 },
  purplespace: { col: 0, row: 0 },
};
const PET_ART_SLOTS: Record<PetType, CosmeticArtSlot> = {
  mole: { col: 0, row: 2 },
  fox: { col: 1, row: 2 },
  drake: { col: 2, row: 2 },
};

const SHOP_ITEMS: ShopItem[] = [
  {
    id: "relay",
    label: "Power Relay",
    description: "Boosts nearby drills.",
    cost: 1.75,
    category: "utility",
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
    id: "vault",
    label: "Vault",
    description: "Adds serious storage and a little flex.",
    cost: 3.25,
    category: "utility",
  },
  {
    id: "statue",
    label: "Miner Statue",
    description: "A prestige flex piece for your plot.",
    cost: 0.95,
    category: "decor",
  },
];

const INVENTORY_TYPES: StructureType[] = [
  "relay",
  "drone",
  "scanner",
  "vault",
  "statue",
];
const SHOP_FILTERS = ["all", "utility", "automation", "decor"] as const;
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
    description: "A clean animated astronaut suit pulled from a free asset pack.",
    cost: 0,
    category: "clothes",
    meme: "starter suit, but make it look expensive",
    incomeMultiplier: 1.06,
  },
  {
    id: "purplespace",
    label: "Purple Space",
    description: "A modular void suit with animated space-miner drip.",
    cost: 9.5,
    category: "clothes",
    meme: "interstellar bag holder",
    incomeMultiplier: 1.1,
  },
];

const QUEST_BOX_REWARDS: RewardBoxReward[] = [
  { id: "sol-small", label: "Tiny SOL Stack", description: "A little reward stack.", kind: "sol", rewardSol: 1, weight: 34 },
  { id: "sol-med", label: "Mid SOL Stack", description: "A decent box payout.", kind: "sol", rewardSol: 2, weight: 20 },
  { id: "skin-pick", label: "Pickaxe Skin", description: "A meme mining cosmetic.", kind: "skin", skinId: "banana_pick", weight: 16 },
  { id: "skin-clothes", label: "Clothes Skin", description: "A flashy wearable drop.", kind: "skin", skinId: "aura_hoodie", weight: 14 },
  { id: "skin-purple", label: "Purple Space Suit", description: "A modular space miner fit.", kind: "skin", skinId: "purplespace", weight: 10 },
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

const MINING_REWARD_POOLS: Record<OreNodeRarity, MiningReward[]> = {
  small: [
    { id: "mints-scrap", label: "Mint Scrap", description: "A tiny mining payout.", kind: "mints", rarity: "small", weight: 56, mints: 0.08 },
    { id: "mints-gold", label: "Tiny Mint Stack", description: "A slightly better payout.", kind: "mints", rarity: "small", weight: 18, mints: 0.12 },
    { id: "mints-small", label: "Mint Dust", description: "A small pile of mint fuel.", kind: "mints", rarity: "small", weight: 14, mints: 0.18 },
    { id: "box-small", label: "Ore Cache", description: "A tiny reward box cache.", kind: "box", rarity: "small", weight: 7 },
    { id: "skin-small", label: "Lucky Shard", description: "A low chance meme skin drop.", kind: "skin", rarity: "small", weight: 4, skinId: "banana_pick" },
    { id: "nft-small", label: "Miner Pass Fragment", description: "A placeholder collectible fragment.", kind: "nft", rarity: "small", weight: 1, nftId: "genesis-miner-pass" },
  ],
  medium: [
    { id: "mints-mid", label: "Medium Mint Stack", description: "A respectable payout.", kind: "mints", rarity: "medium", weight: 46, mints: 0.22 },
    { id: "mints-mid-2", label: "Solid Mint Stack", description: "A strong payout.", kind: "mints", rarity: "medium", weight: 18, mints: 0.36 },
    { id: "mints-clump", label: "Mint Clump", description: "A decent pile of mint fuel.", kind: "mints", rarity: "medium", weight: 12, mints: 0.52 },
    { id: "box-mid", label: "Quest Box Cache", description: "A box reward hidden in the ore.", kind: "box", rarity: "medium", weight: 10 },
    { id: "pet-mid", label: "Pet Egg", description: "A chance at a mining companion.", kind: "pet", rarity: "medium", weight: 8, petId: "mole" },
    { id: "skin-mid", label: "Pickaxe Skin", description: "A meme-tier cosmetic drop.", kind: "skin", rarity: "medium", weight: 6, skinId: "laser_pick" },
  ],
  large: [
    { id: "mints-large", label: "Large Mint Stack", description: "A juicy payout for rare ore.", kind: "mints", rarity: "large", weight: 34, mints: 0.64 },
    { id: "mints-large-2", label: "Heavy Mint Stack", description: "A better rare ore payout.", kind: "mints", rarity: "large", weight: 16, mints: 0.92 },
    { id: "mints-brick", label: "Mint Brick", description: "A bigger pile of mint fuel.", kind: "mints", rarity: "large", weight: 10, mints: 1.28 },
    { id: "box-large", label: "Premium Box Cache", description: "A rare box drop.", kind: "box", rarity: "large", weight: 14 },
    { id: "skin-large", label: "Legendary Skin Token", description: "A strong cosmetic roll.", kind: "skin", rarity: "large", weight: 10, skinId: "troll_pick" },
    { id: "nft-large", label: "NFT Drop", description: "A placeholder collectible NFT.", kind: "nft", rarity: "large", weight: 6, nftId: "turbo-ape-miner" },
    { id: "pet-large", label: "Rare Pet Egg", description: "A powerful little mining buddy.", kind: "pet", rarity: "large", weight: 4, petId: "drake" },
  ],
};
const MINER_DRONE_DIRECTION_ART: Record<DroneDirection, string> = {
  up: "/assets/miner-drone/Drone-back.png",
  down: "/assets/miner-drone/Drone-front.png",
  left: "/assets/miner-drone/Drone-left.png",
  right: "/assets/miner-drone/Drone-right-2.png",
};
const MINER_DRONE_MINING_FRAMES = Array.from(
  { length: 17 },
  (_, index) => `/assets/miner-drone/Drone-Animation/${index + 1}.png`,
);
const MINER_DRONE_TRAVEL_MS = 1200;

const EARNINGS_SCENARIOS: EarningsScenario[] = [
  {
    id: "starter",
    label: "Starter plot",
    description: "A fresh acre with one drill, a shack, and a tiny trickle.",
    solPerDay: 0.00008,
    solPerWeek: 0.00056,
    solPerMonth: 0.0024,
    setup: ["1 shack", "1 drill", "basic pet", "no premium skins"],
    color: "#67f5d3",
    points: [0.00002, 0.00003, 0.00004, 0.00005, 0.00006, 0.00007, 0.00008],
  },
  {
    id: "builder",
    label: "Builder plot",
    description: "A mid-game acre with drills, relay support, a drone, and cosmetics.",
    solPerDay: 0.00022,
    solPerWeek: 0.00154,
    solPerMonth: 0.0066,
    setup: ["3 drills", "power relay", "auto drone", "one pet", "skins equipped"],
    color: "#7aa7ff",
    points: [0.00008, 0.00011, 0.00014, 0.00017, 0.00019, 0.00021, 0.00022],
  },
  {
    id: "late",
    label: "Late-game plot",
    description: "A dense production acre with a mansion, automation, and flex.",
    solPerDay: 0.00035,
    solPerWeek: 0.00245,
    solPerMonth: 0.0105,
    setup: ["max drills", "automation", "mansion", "legendary pet", "rare skins"],
    color: "#ffd166",
    points: [0.00012, 0.00016, 0.0002, 0.00025, 0.00029, 0.00032, 0.00035],
  },
];

const ROADMAP: RoadmapItem[] = [
  {
    phase: "Phase 1",
    title: "Launch world + plots",
    copy: "Shared multiplayer plots, building placement, idle mining, and live mint tracking.",
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
    copy: "Timed world events, rare ore surges, seasonal land cosmetics, and collectible rewards.",
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
  astronaut_fit: 1,
  purplespace: 0,
};

const DEFAULT_NFT_INVENTORY: Record<string, number> = {
  "genesis-miner-pass": 0,
  "turbo-ape-miner": 0,
};

const MISSION_REWARDS: Record<MissionId, { title: string; reward: number }> = {
  claim_plot: { title: "Claim a plot", reward: 0.00002 },
  second_drill: { title: "Place a second drill", reward: 0.00003 },
  first_upgrade: { title: "Upgrade anything once", reward: 0.00003 },
  equip_pet: { title: "Equip a pet", reward: 0.00002 },
  open_chest: { title: "Legacy chest objective", reward: 0.002 },
  income_1: { title: "Reach sustainable output", reward: 0.00004 },
  mansion: { title: "Reach mansion tier", reward: 0.00005 },
  balance_100: { title: "Hold 0.10 SOL", reward: 0.00005 },
};

const MISSION_ORDER: MissionId[] = [
  "claim_plot",
  "second_drill",
  "first_upgrade",
  "equip_pet",
  "income_1",
  "mansion",
  "balance_100",
];

const ECONOMY_SCALE = 0.0035;
const COST_SCALE = 0.68;
const QUEST_BOX_REWARD_SCALE = 0.00004;
const USD_TO_RESERVE_SOL = 0.0025;
const SHOP_RESERVE_BPS = 5200;
const COSMETIC_RESERVE_BPS = 3800;
const CHEST_RESERVE_BPS = 6500;
const MARKETPLACE_FEE_BPS = 700;
const MARKETPLACE_RESERVE_FEE_BPS = 500;
const MAX_IDLE_SOL_PER_DAY = 0.00035;
const MAX_ORE_SOL_PER_DAY = 0.00008;
const MAX_BOX_SOL_PER_DAY = 0.00005;
const MAX_OFFLINE_SECONDS = 60 * 60 * 6;
const RESERVE_FLOOR_SOL = 0.2;
const RESERVE_TARGET_RUNWAY_DAYS = 180;

const ECONOMY_GUARDS = [
  {
    title: "Reserve floor",
    value: `${RESERVE_FLOOR_SOL.toFixed(2)} SOL`,
    copy: "The game stops paying SOL before the reward pool reaches the protected floor.",
  },
  {
    title: "Idle cap",
    value: `${MAX_IDLE_SOL_PER_DAY.toFixed(6)} SOL/day`,
    copy: "Idle production is capped per economy model, so whales cannot force runaway emissions.",
  },
  {
    title: "Ore cap",
    value: `${MAX_ORE_SOL_PER_DAY.toFixed(6)} SOL/day`,
    copy: "Ore payouts stay tiny and are weighted toward small nodes with longer mining time on rare nodes.",
  },
  {
    title: "Runway target",
    value: `${RESERVE_TARGET_RUNWAY_DAYS} days`,
    copy: "Payouts throttle down automatically when the reserve runway gets shorter.",
  },
];

const ECONOMY_STRESS_TESTS = [
  {
    label: "Dry launch",
    stress: "Low marketcap, low buys, few players",
    response: "Small bootstrap reserve, low reward caps, and cosmetics-first progression keep emissions tiny while the community forms.",
  },
  {
    label: "Hype spike",
    stress: "High marketcap, more buyers, faster growth",
    response: "More purchases can refill reserves, but payout caps still prevent a rich-get-richer drain spiral.",
  },
  {
    label: "Slowdown",
    stress: "Market cools off after launch",
    response: "Runway throttling reduces rewards before reserves are damaged, preserving playability without pretending yields are fixed.",
  },
];

const PAYMENT_STRUCTURE = [
  {
    label: "Payment mint",
    role: "TestMint for checkout planning",
    address: "7eTsoXT3HA2rCu1vF61CkvTJbA5bnh9pDgnB2vqMpump",
    split: "100% source mint",
  },
  {
    label: "OreAcreWallet1",
    role: "Main treasury and reward-reserve backing",
    address: "B3VZNSnWYGCZ1ZcydfSKvzjrL1UsYXWG5HTbgHAKaVjX",
    split: "80% of item payments",
  },
  {
    label: "OreAcreWallet2",
    role: "Reward-reserve sink wallet for future player rewards",
    address: "39DYX1oRUHCuQg9zFhB5HW8pJ3WhBeNXmZYyzVWf9Cao",
    split: "10% of item payments",
  },
  {
    label: "OreAcreWallet3",
    role: "Ops, maintenance, liquidity, and launch costs",
    address: "GrKAPcrb45WoxdxEwxoXyhbZmLWGoADwNsGGpWNmA4XC",
    split: "10% of item payments",
  },
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
    value === "chest"
  );
}

function isPetType(value: unknown): value is PetType {
  return value === "mole" || value === "fox" || value === "drake";
}

function isAvatarSkinTone(value: unknown): value is AvatarSkinTone {
  return value === "sunlit" || value === "terra" || value === "umbra";
}

function isAvatarHairColor(value: unknown): value is AvatarHairColor {
  return value === "cocoa" || value === "midnight" || value === "neon";
}

function isAvatarBaseOutfit(value: unknown): value is AvatarBaseOutfit {
  return value === "mint" || value === "ember" || value === "denim";
}

function isSkinId(value: unknown): value is SkinId {
  return (
    value === "troll_pick" ||
    value === "laser_pick" ||
    value === "banana_pick" ||
    value === "aura_hoodie" ||
    value === "cyber_jacket" ||
    value === "astronaut_fit" ||
    value === "purplespace"
  );
}

function normalizeAvatarStyle(raw: unknown): AvatarStyle {
  const candidate = raw && typeof raw === "object" ? raw as Partial<AvatarStyle> : {};
  return {
    skinTone: isAvatarSkinTone(candidate.skinTone) ? candidate.skinTone : AVATAR_STYLE_DEFAULT.skinTone,
    hairColor: isAvatarHairColor(candidate.hairColor) ? candidate.hairColor : AVATAR_STYLE_DEFAULT.hairColor,
    baseOutfit: isAvatarBaseOutfit(candidate.baseOutfit) ? candidate.baseOutfit : AVATAR_STYLE_DEFAULT.baseOutfit,
  };
}

function isPickaxeSkinId(value: SkinId): value is "troll_pick" | "laser_pick" | "banana_pick" {
  return value === "troll_pick" || value === "laser_pick" || value === "banana_pick";
}

function isClothesSkinId(value: unknown): value is Exclude<SkinId, "troll_pick" | "laser_pick" | "banana_pick"> {
  return isSkinId(value) && !isPickaxeSkinId(value);
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

  if (BUILDABLE_ART[type]) {
    return BUILDABLE_ART[type] ?? null;
  }

  return null;
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function parseTileKey(tile: string) {
  const [xRaw, yRaw] = tile.split(":");
  return {
    x: Number(xRaw) || 0,
    y: Number(yRaw) || 0,
  };
}

function structureFootprintSize(type: StructureType) {
  return type === "shack" ? SHACK_FOOTPRINT_SIZE : 1;
}

function structureFootprintTiles(anchorTile: string, type: StructureType) {
  const { x, y } = parseTileKey(anchorTile);
  const size = structureFootprintSize(type);
  const tiles: string[] = [];
  for (let offsetY = 0; offsetY < size; offsetY += 1) {
    for (let offsetX = 0; offsetX < size; offsetX += 1) {
      tiles.push(tileKey(x + offsetX, y + offsetY));
    }
  }
  return tiles;
}

function structureFootprintFits(anchorTile: string, type: StructureType) {
  const { x, y } = parseTileKey(anchorTile);
  const size = structureFootprintSize(type);
  return x >= 0 && y >= 0 && x + size <= TILE_COUNT && y + size <= TILE_COUNT;
}

function findStructureAtTile(plot: Plot, tile: string) {
  const directStructure = plot.structures[tile];
  if (directStructure) {
    return { anchorTile: tile, structure: directStructure };
  }

  for (const [anchorTile, structure] of Object.entries(plot.structures)) {
    if (structureFootprintSize(structure.type) <= 1) continue;
    if (structureFootprintTiles(anchorTile, structure.type).includes(tile)) {
      return { anchorTile, structure };
    }
  }

  return null;
}

function canFitStructureAt(plot: Plot, type: StructureType, anchorTile: string, ignoreAnchorTile?: string | null) {
  if (!structureFootprintFits(anchorTile, type)) return false;

  return structureFootprintTiles(anchorTile, type).every((tile) => {
    const occupiedByStructure = findStructureAtTile(plot, tile);
    const occupiedByOre = plot.oreNodes.some((node) => node.tile === tile);

    return (
      (!occupiedByStructure || occupiedByStructure.anchorTile === ignoreAnchorTile) &&
      !occupiedByOre
    );
  });
}

function defaultAvatarPosition() {
  return {
    x: Math.floor(WORLD_WIDTH / 2),
    y: Math.floor(TOWN_TOP + TOWN_PLOT_SIZE / 2),
  };
}

function plotKey(x: number, y: number) {
  return `plot-${x}-${y}`;
}

function round(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function miningLevelForXp(xp: number) {
  if (xp <= 0) return 1;
  return Math.min(MINING_LEVEL_CAP, Math.max(1, Math.floor(Math.sqrt(xp / 30)) + 1));
}

function miningXpForRarity(rarity: OreNodeRarity) {
  switch (rarity) {
    case "small":
      return 12;
    case "medium":
      return 28;
    case "large":
      return 60;
  }
}

function miningSpeedMultiplier(level: number) {
  return Math.max(0.72, 1 - Math.min(level - 1, 30) * 0.008);
}

function miningDurationForRarity(rarity: OreNodeRarity, level: number) {
  return Math.max(2600, Math.round(oreNodeMiningMs(rarity) * miningSpeedMultiplier(level)));
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

function pickWeightedEntry<T extends { weight: number }>(entries: T[]) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[0];
}

function oreNodeReward(rarity: OreNodeRarity) {
  const [min, max] = ORE_REWARD_RANGE[rarity];
  return round(min + Math.random() * (max - min));
}

function oreNodeMiningMs(rarity: OreNodeRarity) {
  return ORE_MINING_MS[rarity];
}

function oreNodeDisplayLabel(rarity: OreNodeRarity) {
  switch (rarity) {
    case "small":
      return "Small Ore Node";
    case "medium":
      return "Dense Ore Node";
    case "large":
      return "Massive Ore Node";
  }
}

function formatMiningTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}s`;
}

function oreNodeWorldPosition(plot: Plot, node: OreNode) {
  const [tileXRaw, tileYRaw] = node.tile.split(":");
  const tileX = Number(tileXRaw) || 0;
  const tileY = Number(tileYRaw) || 0;
  return {
    x: plot.position.x + ((tileX + 0.5) / TILE_COUNT) * PLOT_SIZE,
    y: plot.position.y + PLOT_HEADER_HEIGHT + ((tileY + 0.5) / TILE_COUNT) * PLOT_BOARD_SIZE,
  };
}

function tileWorldPosition(plot: Plot, tile: string) {
  const [tileXRaw, tileYRaw] = tile.split(":");
  const tileX = Number(tileXRaw) || 0;
  const tileY = Number(tileYRaw) || 0;
  return {
    x: plot.position.x + ((tileX + 0.5) / TILE_COUNT) * PLOT_SIZE,
    y: plot.position.y + PLOT_HEADER_HEIGHT + ((tileY + 0.5) / TILE_COUNT) * PLOT_BOARD_SIZE,
  };
}

function tilePercentPosition(tile: string) {
  const [tileXRaw, tileYRaw] = tile.split(":");
  const tileX = Number(tileXRaw) || 0;
  const tileY = Number(tileYRaw) || 0;
  return {
    left: `${((tileX + 0.5) / TILE_COUNT) * 100}%`,
    top: `${((tileY + 0.5) / TILE_COUNT) * 100}%`,
  };
}

function droneMinerTag(ownerTag: string, tile: string) {
  return `${ownerTag}:drone:${tile}`;
}

function droneTileFromMinerTag(miningBy: string | null) {
  return miningBy?.includes(":drone:") ? miningBy.split(":drone:")[1] ?? null : null;
}

function droneDirection(from: { x: number; y: number }, to: { x: number; y: number }): DroneDirection {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "down" : "up";
}

function isAvatarNearOre(avatar: { x: number; y: number }, plot: Plot, node: OreNode) {
  const orePosition = oreNodeWorldPosition(plot, node);
  return Math.hypot(avatar.x - orePosition.x, avatar.y - orePosition.y) <= ORE_INTERACTION_RANGE;
}

function findOreSpawnTile(plot: Plot) {
  if (plot.kind === "town") {
    return null;
  }
  const occupiedTiles = new Set([
    ...Object.entries(plot.structures).flatMap(([tile, structure]) =>
      structureFootprintTiles(tile, structure.type),
    ),
    ...plot.oreNodes.map((node) => node.tile),
  ]);
  const freeTiles: string[] = [];

  for (let y = 0; y < TILE_COUNT; y += 1) {
    for (let x = 0; x < TILE_COUNT; x += 1) {
      const tile = tileKey(x, y);
      if (!occupiedTiles.has(tile)) {
        freeTiles.push(tile);
      }
    }
  }

  if (freeTiles.length === 0) {
    return null;
  }

  return freeTiles[Math.floor(Math.random() * freeTiles.length)];
}

function miningLuckBonus(
  pickaxeSkin?: SkinId | null,
  clothesSkin?: SkinId | null,
  activePet?: PetType | null,
) {
  const pickaxeBonus = Math.max(0, pickaxeMultiplier(pickaxeSkin) - 1);
  const clothesBonus = Math.max(0, clothesMultiplier(clothesSkin) - 1);
  const petBonus = activePet === "drake" ? 0.04 : activePet === "fox" ? 0.03 : activePet === "mole" ? 0.02 : 0;
  return round(pickaxeBonus * 1.8 + clothesBonus * 1.2 + petBonus);
}

function miningRewardWeight(entry: MiningReward, luck: number) {
  const premiumKinds: MiningRewardKind[] = ["box", "skin", "pet", "nft"];
  const premiumBoost = premiumKinds.includes(entry.kind) ? 1 + luck * 2.5 : 1 + luck * 0.35;
  return entry.weight * premiumBoost;
}

function rollMiningReward(
  rarity: OreNodeRarity,
  pickaxeSkin?: SkinId | null,
  clothesSkin?: SkinId | null,
  activePet?: PetType | null,
) {
  const pool = MINING_REWARD_POOLS[rarity];
  const luck = miningLuckBonus(pickaxeSkin, clothesSkin, activePet);
  const weightedPool = pool.map((entry) => ({
    ...entry,
    weight: miningRewardWeight(entry, luck),
  }));
  const reward = pickWeightedEntry(weightedPool);

  if (reward.kind === "sol") {
    const amount = round((reward.sol ?? 0) * (1 + luck * 0.65));
    return {
      ...reward,
      sol: amount,
      description: `Earned ${amount.toFixed(6)} SOL.`,
      detail: `${amount.toFixed(6)} SOL`,
    };
  }

  if (reward.kind === "mints") {
    const amount = round((reward.mints ?? 0) * (1 + luck * 0.5));
    return {
      ...reward,
      mints: amount,
      description: `Earned ${amount.toFixed(2)} mints.`,
      detail: `${amount.toFixed(2)} mints`,
    };
  }

  return reward;
}

function defaultPlaytestMode() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("playtest") === "1") return true;
  if (params.get("playtest") === "0") return false;

  try {
    const saved = window.localStorage.getItem("ore-acres-playtest");
    if (saved === "1") return true;
    if (saved === "0") return false;
  } catch {
  }

  return true;
}

function pageFromPath(pathname: string): Page {
  if (pathname.startsWith("/game")) return "game";
  if (pathname.startsWith("/economy")) return "economy";
  return "home";
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

function reserveThrottle(runwayDays: number) {
  if (!Number.isFinite(runwayDays)) return 0;
  if (runwayDays >= RESERVE_TARGET_RUNWAY_DAYS) return 1;
  if (runwayDays >= 90) return 0.82;
  if (runwayDays >= 45) return 0.55;
  if (runwayDays >= 21) return 0.32;
  if (runwayDays >= 7) return 0.14;
  if (runwayDays > 0) return 0.04;
  return 0;
}

function cappedEmissionPerMinute(rawIncome: number, rewardReserveSol: number, dailyCap: number) {
  if (rawIncome <= 0 || rewardReserveSol <= RESERVE_FLOOR_SOL) return 0;
  const cappedIncome = Math.min(rawIncome, dailyCap / 1440);
  const projectedDaily = cappedIncome * 1440;
  const runway = reserveRunwayDays(Math.max(0, rewardReserveSol - RESERVE_FLOOR_SOL), projectedDaily);
  return round(cappedIncome * reserveThrottle(runway));
}

function claimSolFromReserve(amount: number, reserveSol: number, dailyCap: number) {
  if (amount <= 0 || reserveSol <= RESERVE_FLOOR_SOL) {
    return { paid: 0, reserve: Math.max(0, reserveSol) };
  }

  const throttle = reserveThrottle(reserveRunwayDays(Math.max(0, reserveSol - RESERVE_FLOOR_SOL), dailyCap));
  const cap = dailyCap * throttle;
  const available = Math.max(0, reserveSol - RESERVE_FLOOR_SOL);
  const paid = round(Math.min(amount, cap, available));
  return {
    paid,
    reserve: round(Math.max(0, reserveSol - paid)),
  };
}

function reserveContribution(usdAmount: number, bps: number) {
  return round(usdAmount * USD_TO_RESERVE_SOL * (bps / 10_000));
}

function playtestMintCost(usdAmount: number) {
  return round(Math.max(0.5, usdAmount * PLAYTEST_MINT_RATE));
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
  return pickWeightedEntry(CHEST_REWARDS);
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
  if (preferredTile && canFitStructureAt(plot, "chest", preferredTile)) {
    return preferredTile;
  }

  for (const [x, y] of preferredChestTiles()) {
    const key = tileKey(x, y);
    if (canFitStructureAt(plot, "chest", key)) return key;
  }

  for (let x = 0; x < TILE_COUNT; x += 1) {
    for (let y = 0; y < TILE_COUNT; y += 1) {
      const key = tileKey(x, y);
      if (canFitStructureAt(plot, "chest", key)) return key;
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
      return 10 + Math.max(0, structure.level - 1) * 12;
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
  activePlayers = 1,
  rewardReserveSol = Number.POSITIVE_INFINITY,
) {
  let stageScore = 0.5;
  let storage = BASE_STORAGE;
  const structures = plot?.structures ?? {};

  if (!plot) {
    return { income: 0, rawIncome: 0, storage, stageScore: 0 };
  }

  for (const key of Object.keys(structures)) {
    const currentStructure = structures[key]!;

    storage += storageFor(currentStructure) ?? 0;
    if (currentStructure.type === "shack") {
      stageScore += 1.2 + currentStructure.level * 0.45;
      continue;
    }
    if (currentStructure.type === "solar") {
      stageScore += 0.22 + currentStructure.level * 0.08;
      continue;
    }
    if (currentStructure.type === "scanner") {
      stageScore += 0.3 + currentStructure.level * 0.1;
      continue;
    }
    if (currentStructure.type === "refinery") {
      stageScore += 0.42 + currentStructure.level * 0.14;
      continue;
    }
    if (currentStructure.type === "drone") {
      stageScore += 0.5 + currentStructure.level * 0.16;
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
        relayBonus(x, y, structures) * 0.2 +
        solarNeighbors * 0.08 +
        coolingNeighbors * 0.1 +
        conveyorNeighbors * 0.06;
      stageScore += (0.9 + currentStructure.level * 0.38) * localBoost;
      continue;
    }

    if (currentStructure.type === "relay") {
      stageScore += 0.2 * currentStructure.level * (1 + drillNeighbors * 0.08);
      continue;
    }

    if (currentStructure.type === "battery" || currentStructure.type === "vault") {
      stageScore += 0.12 * currentStructure.level * (1 + relayNeighbors * 0.04);
      continue;
    }

    if (currentStructure.type === "cooling" || currentStructure.type === "conveyor") {
      stageScore += 0.12 * currentStructure.level * (1 + drillNeighbors * 0.12);
      continue;
    }

    if (currentStructure.type === "storage") {
      stageScore += 0.08 * currentStructure.level;
      continue;
    }

    if (currentStructure.type === "decor" || currentStructure.type === "neon" || currentStructure.type === "statue" || currentStructure.type === "sign" || currentStructure.type === "shop") {
      stageScore += 0.05 * currentStructure.level;
      continue;
    }
  }

  if (activePet === "mole") {
    stageScore += 0.18;
  } else if (activePet === "fox") {
    stageScore += 0.16;
  } else if (activePet === "drake") {
    stageScore += 0.34;
  }

  const ownedCosmeticBoost = clothesMultiplier(equippedClothesSkin);
  const effectivePlayers = Math.max(1, activePlayers);
  const poolShare = stageScore / Math.max(AVERAGE_STAGE_SCORE * effectivePlayers, AVERAGE_STAGE_SCORE);
  const rawDailyMintIncome = DAILY_MINT_POOL * poolShare * ownedCosmeticBoost;
  const cappedDailyMintIncome = Math.min(rawDailyMintIncome, MAX_MINT_PER_PLOT_PER_DAY);
  const throttle = reserveThrottle(reserveRunwayDays(Math.max(0, rewardReserveSol - RESERVE_FLOOR_SOL), cappedDailyMintIncome));
  return {
    income: round((cappedDailyMintIncome / 1440) * throttle),
    rawIncome: round(rawDailyMintIncome / 1440),
    storage,
    stageScore,
  };
}

function resolveMissionRewards(state: GameState) {
  let next = state;
  const claimedPlot = next.claimedPlotId ? next.plots[next.claimedPlotId] : null;
  const economy = claimedPlot
    ? computeEconomy(claimedPlot, next.activePet, next.equippedPickaxeSkin, next.equippedClothesSkin, 1, next.rewardReserveSol)
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
    ["income_1", Boolean(economy && economy.rawIncome >= 0.05)],
    ["mansion", hasMansion],
    ["balance_100", next.sol >= 0.1],
  ];

  const completed: string[] = [];
  let rewardTotal = 0;

  for (const [id, met] of missionChecks) {
    if (!met || next.missions[id]) continue;
    const rewardClaim = claimSolFromReserve(MISSION_REWARDS[id].reward, next.rewardReserveSol, MAX_BOX_SOL_PER_DAY);
    const reward = rewardClaim.paid;
    const mintReward = next.playtestMode ? Math.max(1, Math.round(MISSION_REWARDS[id].reward * 400)) : 0;
    next = {
      ...next,
      sol: round(next.sol + reward),
      rewardReserveSol: rewardClaim.reserve,
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
      message: `Mission complete: ${completed.join(" • ")}. +${rewardTotal.toFixed(6)} SOL, mint bonuses, and quest boxes.`,
    };
  }

  return next;
}

function starterStructures() {
  return {
    [tileKey(2, 3)]: { type: "shack", level: 1 },
    [tileKey(4, 3)]: { type: "drill", level: 1 },
  } satisfies Record<string, Structure>;
}

function seededMarketListings(): MarketplaceListing[] {
  return [];
}

function makePlot(x: number, y: number, owner: PlotOwner | null, kind: Plot["kind"] = "plot"): Plot {
  const position = {
    x: WORLD_PADDING + x * (PLOT_SIZE + ROAD_GAP),
    y: WORLD_PADDING + y * (PLOT_SIZE + ROAD_GAP),
  };

  return {
    id: plotKey(x, y),
    name: `Plot ${x + 1}-${y + 1}`,
    kind,
    position,
    owner,
    structures: owner?.me ? starterStructures() : {},
    chest: null,
    oreNodes: [],
    totalCollectedSol: 0,
    totalCollectedMints: 0,
  };
}

function makeTown(): Plot {
  const position = {
    x: Math.floor((WORLD_WIDTH - TOWN_PLOT_SIZE) / 2),
    y: TOWN_TOP,
  };

  return {
    id: TOWN_ID,
    name: "Ore Acres Town",
    kind: "town",
    position,
    owner: null,
    structures: {},
    chest: null,
    oreNodes: [],
    totalCollectedSol: 0,
    totalCollectedMints: 0,
  };
}

function makeMineArea(): Plot {
  const position = {
    x: Math.floor((WORLD_WIDTH - PLOT_SIZE) / 2),
    y: MINE_TOP,
  };

  return {
    id: MINE_ID,
    name: "Dustfall Mine",
    kind: "mine",
    position,
    owner: null,
    structures: {},
    chest: null,
    oreNodes: [],
    totalCollectedSol: 0,
    totalCollectedMints: 0,
  };
}

function createInitialState(): GameState {
  const plots: Record<string, Plot> = {};

  for (let x = 0; x < WORLD_COLUMNS; x += 1) {
    for (let y = 0; y < WORLD_ROWS; y += 1) {
      plots[plotKey(x, y)] = makePlot(x, y, null);
    }
  }
  plots[TOWN_ID] = makeTown();
  plots[MINE_ID] = makeMineArea();

  return {
    sol: STARTING_SOL,
    mints: STARTING_MINTS,
    playtestMode: defaultPlaytestMode(),
    rewardReserveSol: STARTING_REWARD_RESERVE_SOL,
    miningXp: 0,
    miningLevel: 1,
    plots,
    claimedPlotId: null,
    selectedPlotId: TOWN_ID,
    selectedTile: null,
    moveSource: null,
    activeTool: "drill",
    avatar: defaultAvatarPosition(),
    avatarStyle: { ...AVATAR_STYLE_DEFAULT },
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
    mineReveal: null,
    missions: { ...DEFAULT_MISSIONS },
    stats: { ...DEFAULT_STATS },
    skinInventory: { ...DEFAULT_SKIN_INVENTORY },
    equippedPickaxeSkin: null,
    equippedClothesSkin: "astronaut_fit",
    marketListings: seededMarketListings(),
    nftInventory: { ...DEFAULT_NFT_INVENTORY },
    questBoxes: 0,
    npcDialogue: null,
    inventoryOpen: false,
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
    kind: (() => {
      const legacyKind = typeof (candidate as { kind?: unknown }).kind === "string" ? String((candidate as { kind?: unknown }).kind) : "";
      if (legacyKind === "town" || legacyKind === "mine") return legacyKind;
      if (legacyKind === "hub" || candidate.id === "public-hub" || candidate.name === "Public Hub") return "town";
      return "plot";
    })(),
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
    oreNodes: Array.isArray((candidate as { oreNodes?: unknown }).oreNodes)
      ? (candidate as { oreNodes: unknown[] }).oreNodes.map(normalizeOreNode).filter((node): node is OreNode => Boolean(node))
      : [],
    totalCollectedSol:
      typeof (candidate as { totalCollectedSol?: unknown }).totalCollectedSol === "number"
        ? Math.max(0, (candidate as { totalCollectedSol: number }).totalCollectedSol)
        : 0,
    totalCollectedMints:
      typeof (candidate as { totalCollectedMints?: unknown }).totalCollectedMints === "number"
        ? Math.max(0, (candidate as { totalCollectedMints: number }).totalCollectedMints)
        : 0,
  };
}

function normalizeOreNode(raw: unknown): OreNode | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<OreNode>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.plotId !== "string" ||
    typeof candidate.tile !== "string" ||
    (candidate.rarity !== "small" && candidate.rarity !== "medium" && candidate.rarity !== "large")
  ) {
    return null;
  }

  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now();
  const despawnAt = typeof candidate.despawnAt === "number" ? candidate.despawnAt : createdAt + 2 * 60 * 60 * 1000;

  return {
    id: candidate.id,
    plotId: candidate.plotId,
    tile: candidate.tile,
    rarity: candidate.rarity,
    reward: typeof candidate.reward === "number" ? Math.max(0, candidate.reward) : 0,
    createdAt,
    despawnAt,
    miningUntil: typeof candidate.miningUntil === "number" ? candidate.miningUntil : null,
    miningBy: typeof candidate.miningBy === "string" ? candidate.miningBy : null,
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

    for (const [key, value] of Object.entries(fallback.plots)) {
      if (!plots[key]) {
        plots[key] = value;
      }
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
      avatarStyle: normalizeAvatarStyle(parsed.avatarStyle),
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
      skinInventory: { ...DEFAULT_SKIN_INVENTORY, ...(parsed.skinInventory ?? {}) },
      equippedPickaxeSkin:
        isSkinId(parsed.equippedPickaxeSkin) && isPickaxeSkinId(parsed.equippedPickaxeSkin)
          ? parsed.equippedPickaxeSkin
          : null,
      equippedClothesSkin: isClothesSkinId(parsed.equippedClothesSkin) ? parsed.equippedClothesSkin : "astronaut_fit",
      marketListings: Array.isArray(parsed.marketListings)
        ? parsed.marketListings.map(normalizeMarketplaceListing).filter((entry): entry is MarketplaceListing => Boolean(entry))
        : seededMarketListings(),
      nftInventory: { ...DEFAULT_NFT_INVENTORY, ...(parsed.nftInventory ?? {}) },
      questBoxes: typeof parsed.questBoxes === "number" ? parsed.questBoxes : 0,
      miningXp: typeof parsed.miningXp === "number" ? Math.max(0, parsed.miningXp) : fallback.miningXp,
      miningLevel: typeof parsed.miningLevel === "number" ? Math.max(1, parsed.miningLevel) : fallback.miningLevel,
      npcDialogue: null,
      inventoryOpen: false,
      proof: typeof parsed.proof === "string" ? parsed.proof : "",
      message: typeof parsed.message === "string" ? parsed.message : fallback.message,
      shopOpen: false,
      marketOpen: false,
      questsOpen: false,
      mineReveal: null,
      questReveal: null,
      sol: typeof parsed.sol === "number" ? parsed.sol : fallback.sol,
      mints: typeof parsed.mints === "number" ? parsed.mints : fallback.mints,
      playtestMode: typeof parsed.playtestMode === "boolean" ? parsed.playtestMode : fallback.playtestMode,
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
        1,
        loaded.rewardReserveSol,
      );
      const cappedOfflineSeconds = Math.min(offlineSeconds, MAX_OFFLINE_SECONDS);
      const offlineGain = round(economy.income * cappedOfflineSeconds / 60);
      if (offlineGain > 0) {
        loaded.mints = round(loaded.mints + offlineGain);
        loaded.plots[claimedPlot.id] = {
          ...claimedPlot,
          totalCollectedMints: round((claimedPlot.totalCollectedMints ?? 0) + offlineGain),
        };
        loaded.stats.totalEarned = round(loaded.stats.totalEarned + offlineGain);
        loaded.message = `While you were away, your mine earned ${offlineGain.toFixed(2)} mints.`;
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
    playtestMode: state.playtestMode,
    rewardReserveSol: round(state.rewardReserveSol),
    claimedPlotId: state.claimedPlotId,
    activePet: state.activePet,
    avatarStyle: state.avatarStyle,
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
    miningXp: round(state.miningXp),
    miningLevel: state.miningLevel,
    marketOpen: state.marketOpen,
    plots: Object.entries(state.plots).map(([id, plot]) => ({
      id,
      kind: plot.kind,
      owner: plot.owner?.label ?? null,
      totalCollectedSol: round(plot.totalCollectedSol),
      totalCollectedMints: round(plot.totalCollectedMints),
      oreNodes: plot.oreNodes.map((node) => ({
        id: node.id,
        plotId: node.plotId,
        tile: node.tile,
        rarity: node.rarity,
        reward: round(node.reward),
        createdAt: node.createdAt,
        despawnAt: node.despawnAt,
        miningUntil: node.miningUntil,
        miningBy: node.miningBy,
      })),
      structures: Object.entries(plot.structures).map(([tile, structure]) => ({
        tile,
        type: structure.type,
        level: structure.level,
        opened: structure.opened ?? false,
        reward: structure.reward ?? null,
      })),
    })),
  });
}

async function resolveMultiplayerUrl() {
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

  return "";
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

  const multiplayerUrl = (import.meta.env.VITE_MULTIPLAYER_WS_URL as string | undefined)?.trim();
  if (multiplayerUrl) {
    try {
      const parsed = new URL(multiplayerUrl);
      parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
      parsed.pathname = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "");
    } catch {
      // Fall back to localhost/origin below.
    }
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }

  return window.location.origin;
}

type PaymentQuote = {
  mintAddress: string;
  treasuryTokenAccount?: string;
  treasuryOwnerWallet?: string;
  usdAmount: number;
  tokenPriceUsd: number;
  tokenAmountUi: number;
  allocations: Array<{
    label: string;
    tokenAccount?: string;
    ownerWallet?: string;
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
        (typeof (entry as { tokenAccount?: unknown }).tokenAccount === "string" ||
          typeof (entry as { ownerWallet?: unknown }).ownerWallet === "string") &&
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
    kind: plot.kind,
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
    oreNodes: plot.oreNodes.map((node) => ({ ...node })),
    totalCollectedSol: round(plot.totalCollectedSol),
    totalCollectedMints: round(plot.totalCollectedMints),
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
    kind: sharedPlot.kind === "town" || sharedPlot.kind === "mine" ? sharedPlot.kind : localPlot.kind,
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
    oreNodes: Array.isArray(sharedPlot.oreNodes)
      ? sharedPlot.oreNodes.map(normalizeOreNode).filter((node): node is OreNode => Boolean(node))
      : localPlot.oreNodes,
    totalCollectedSol: Number.isFinite(sharedPlot.totalCollectedSol)
      ? Math.max(0, sharedPlot.totalCollectedSol)
      : localPlot.totalCollectedSol,
    totalCollectedMints: Number.isFinite(sharedPlot.totalCollectedMints)
      ? Math.max(0, sharedPlot.totalCollectedMints)
      : localPlot.totalCollectedMints,
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

function structureEffectSummary(type: StructureType, level = 1) {
  const mockStructure: Structure = { type, level };

  switch (type) {
    case "shack":
      return `HQ bonus: +${Math.max(0, (level - 1) * 4)}% global income, +${storageFor(mockStructure)} storage`;
    case "drill":
      return `Base output: ${baseIncomeFor(mockStructure).toFixed(2)} SOL/min before synergies`;
    case "storage":
      return `Adds ${storageFor(mockStructure)} storage cap`;
    case "relay":
      return `Adjacent relays add +20% drill throughput at Lv.${level}`;
    case "solar":
      return `Global power boost: +${Math.round((0.03 + level * 0.02) * 100)}% income`;
    case "battery":
      return `Adds ${storageFor(mockStructure)} storage and relay-linked passive yield`;
    case "cooling":
      return `Nearby drills gain +8% output per adjacent cooling unit`;
    case "conveyor":
      return `Nearby drills gain +5% output per adjacent conveyor`;
    case "drone":
      return `Auto-miner adds ${baseIncomeFor(mockStructure).toFixed(2)} SOL/min before boosts`;
    case "scanner":
      return `Prospecting boost: +${Math.round((0.04 + level * 0.03) * 100)}% global income`;
    case "refinery":
      return `Refines ore into ${(
        baseIncomeFor(mockStructure) * (1 + level * 0.12)
      ).toFixed(2)} SOL/min`;
    case "vault":
      return `Secure storage: +${storageFor(mockStructure)} cap plus relay-linked income`;
    case "decor":
    case "shop":
    case "neon":
    case "statue":
    case "sign":
      return `Flex bonus: ${(0.002 * level).toFixed(3)} SOL/min passive brand value`;
    case "chest":
      return "Spawns a giant reveal chest with rarity-based rewards";
  }
}

function purchaseDisplayLabel(cost: number, playtestMode: boolean) {
  return playtestMode
    ? `${playtestMintCost(cost).toFixed(2)} test mints`
    : `$${cost.toFixed(2)} USD target`;
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

function SheetSkinSprite({
  src,
  facing,
  moving,
  mining,
  className = "",
}: {
  src: string;
  facing: AvatarFacing;
  moving: boolean;
  mining: boolean;
  className?: string;
}) {
  const frameClass =
    facing === "left" || facing === "right"
      ? "avatar__astronaut--side"
      : facing === "up"
        ? "avatar__astronaut--up"
        : "avatar__astronaut--down";
  const frameStart = facing === "left" || facing === "right"
    ? ASTRONAUT_FRAME_GROUPS.side
    : facing === "up"
      ? ASTRONAUT_FRAME_GROUPS.up
      : ASTRONAUT_FRAME_GROUPS.down;
  const animationName = !moving
    ? "none"
    : facing === "up"
      ? "astronautWalkUp"
      : facing === "left"
        ? "astronautWalkSideLeft"
        : facing === "right"
          ? "astronautWalkSide"
          : "astronautWalkDown";

  return (
    <div
      className={[
        "avatar__astronaut",
        frameClass,
        moving ? "avatar__astronaut--moving" : "",
        mining ? "avatar__astronaut--mining" : "",
        facing === "left" ? "avatar__astronaut--flip" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ["--astronaut-frame-start" as string]: frameStart,
        backgroundImage: `url(${src})`,
        animationName,
        animationDuration: moving ? "0.68s" : undefined,
        animationTimingFunction: moving ? "steps(4)" : undefined,
        animationIterationCount: moving ? "infinite" : undefined,
      }}
      aria-hidden="true"
    />
  );
}

function AstronautSkinSprite({
  facing,
  moving,
  mining,
}: {
  facing: AvatarFacing;
  moving: boolean;
  mining: boolean;
}) {
  return <SheetSkinSprite src={ASTRONAUT_SKIN_SHEET} facing={facing} moving={moving} mining={mining} />;
}

function AvatarSprite({
  moving,
  mining = false,
  pickaxeSkin,
  clothesSkin,
  avatarStyle = AVATAR_STYLE_DEFAULT,
  facing = "down",
  variant = "local",
}: {
  moving: boolean;
  mining?: boolean;
  pickaxeSkin?: SkinId | null;
  clothesSkin?: SkinId | null;
  avatarStyle?: AvatarStyle;
  facing?: AvatarFacing;
  variant?: "local" | "remote" | "npc";
}) {
  const visualClothesSkin = clothesSkin ?? "astronaut_fit";
  const tone = AVATAR_SKIN_TONES[avatarStyle.skinTone];
  const hair = AVATAR_HAIR_COLORS[avatarStyle.hairColor];
  const outfit = AVATAR_BASE_OUTFITS[avatarStyle.baseOutfit];

  if (variant !== "npc" && visualClothesSkin === "astronaut_fit") {
    return (
      <div
        className={[
          "avatar",
          moving ? "avatar--moving" : "",
          mining ? "avatar--mining" : "",
          `avatar--facing-${facing}`,
          variant === "remote" ? "avatar--remote" : "",
          pickaxeSkin ? `avatar--pickaxe-${pickaxeSkin}` : "",
          `avatar--clothes-${visualClothesSkin}`,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="avatar__shadow" />
        <AstronautSkinSprite facing={facing} moving={moving} mining={mining} />
        <div className="avatar__tool" />
        <div className="avatar__aura" />
      </div>
    );
  }

  if (visualClothesSkin === "purplespace") {
    return (
      <div
        className={[
          "avatar",
          moving ? "avatar--moving" : "",
          mining ? "avatar--mining" : "",
          `avatar--facing-${facing}`,
          variant === "remote" ? "avatar--remote" : "",
          pickaxeSkin ? `avatar--pickaxe-${pickaxeSkin}` : "",
          `avatar--clothes-${visualClothesSkin}`,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="avatar__shadow" />
        <SheetSkinSprite src={PURPLESPACE_SKIN_SHEET} facing={facing} moving={moving} mining={mining} />
        <div className="avatar__tool" />
        <div className="avatar__aura" />
      </div>
    );
  }

  return (
    <div
      className={[
        "avatar",
        moving ? "avatar--moving" : "",
        mining ? "avatar--mining" : "",
        `avatar--facing-${facing}`,
        variant === "remote" ? "avatar--remote" : "",
        pickaxeSkin ? `avatar--pickaxe-${pickaxeSkin}` : "",
        clothesSkin ? `avatar--clothes-${clothesSkin}` : "",
        clothesSkin === "purplespace" ? "avatar--clothes-purplespace" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ["--avatar-skin" as string]: tone.base,
        ["--avatar-skin-shade" as string]: tone.shade,
        ["--avatar-hair" as string]: hair.base,
        ["--avatar-hair-shade" as string]: hair.shade,
        ["--avatar-outfit" as string]: outfit.base,
        ["--avatar-outfit-shade" as string]: outfit.shade,
      }}
    >
      <div className="avatar__shadow" style={rigStyle("shadow")} />
      <div className="avatar__legs" style={rigStyle("legs")}>
        <span className="avatar__leg avatar__leg--left" />
        <span className="avatar__leg avatar__leg--right" />
      </div>
      <div className="avatar__body" style={rigStyle("body")}>
        <span className="avatar__shirt-detail" />
        <span className="avatar__arm avatar__arm--left" />
        <span className="avatar__arm avatar__arm--right" />
      </div>
      <div className="avatar__head" style={rigStyle("head")}>
        <span className="avatar__hair" />
        <span className="avatar__face">
          <i className="avatar__eye avatar__eye--left" />
          <i className="avatar__eye avatar__eye--right" />
          <i className="avatar__mouth" />
        </span>
      </div>
      {variant !== "npc" ? <div className="avatar__tool" style={rigStyle("tool")} /> : null}
      {variant !== "npc" ? <div className="avatar__aura" style={rigStyle("aura")} /> : null}
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
  if (type === "drill") {
    const tier = Math.min(3, Math.max(1, level)) as 1 | 2 | 3;
    return <DrillSpriteSheet tier={tier} mode="card" className={`item-art item-art--structure-image item-art--drill-sheet ${className}`.trim()} />;
  }

  if (type === "drone") {
    return <MinerDroneSprite direction="down" mode="card" />;
  }

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

function DrillSpriteSheet({
  tier,
  className = "",
  mode = "world",
}: {
  tier: 1 | 2 | 3;
  className?: string;
  mode?: "world" | "card";
}) {
  const [frame, setFrame] = useState(0);
  const frames = DRILL_FRAMESETS[tier];

  useEffect(() => {
    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      return;
    }

    const frameDelay = 1000 / DRILL_ANIMATION_FPS;
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % frames.length);
    }, frameDelay);

    return () => window.clearInterval(timer);
  }, [frames.length]);

  return (
    <div
      className={`sprite sprite--drill-sheet sprite--drill-sheet-${tier} sprite--drill-sheet--${mode} ${className}`.trim()}
      aria-hidden="true"
    >
      <img className="sprite__frame" src={frames[frame]} alt="" draggable="false" />
    </div>
  );
}

function MinerDroneSprite({
  direction = "down",
  mining = false,
  targetKey = "home",
  mode = "world",
}: {
  direction?: DroneDirection;
  mining?: boolean;
  targetKey?: string;
  mode?: "world" | "tile" | "card";
}) {
  const [frame, setFrame] = useState(0);
  const [phase, setPhase] = useState<"idle" | "travel" | "mining" | "reverse">("idle");

  useEffect(() => {
    let timeout: number | null = null;
    if (mining) {
      setFrame(0);
      setPhase("travel");
      timeout = window.setTimeout(() => {
        setPhase("mining");
      }, MINER_DRONE_TRAVEL_MS);
    } else {
      setPhase((current) => (current === "mining" || current === "travel" ? "reverse" : "idle"));
    }

    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
    };
  }, [mining, targetKey]);

  useEffect(() => {
    if (phase === "idle" || phase === "travel") {
      return;
    }

    const timer = window.setInterval(() => {
      setFrame((current) => {
        if (phase === "mining") {
          if (current < MINER_DRONE_MINING_FRAMES.length - 2) return current + 1;
          return current === MINER_DRONE_MINING_FRAMES.length - 2
            ? MINER_DRONE_MINING_FRAMES.length - 1
            : MINER_DRONE_MINING_FRAMES.length - 2;
        }

        if (current <= 0) {
          setPhase("idle");
          return 0;
        }
        return current - 1;
      });
    }, 92);

    return () => window.clearInterval(timer);
  }, [phase]);

  const imageSrc = phase === "mining" || phase === "reverse"
    ? MINER_DRONE_MINING_FRAMES[frame]
    : MINER_DRONE_DIRECTION_ART[direction];

  return (
    <img
      className={`miner-drone miner-drone--${mode} miner-drone--${phase}`}
      src={imageSrc}
      alt=""
      draggable={false}
      aria-hidden="true"
    />
  );
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

  if (skinId === "astronaut_fit") {
    return (
      <div className={`item-art item-art--skin-image ${className}`.trim()}>
        <img
          src={ASTRONAUT_SKIN_PREVIEW}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      </div>
    );
  }

  if (skinId === "purplespace") {
    return (
      <div
        className={`item-art item-art--skin-image ${className}`.trim()}
        style={{
          backgroundImage: `url(${PURPLESPACE_SKIN_SHEET})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "768px 64px",
          backgroundPosition: "0px 0px",
          imageRendering: "pixelated",
        }}
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
      >
        <div className="home-motion">
          <div className="home-motion__window-glow" />
          {tier >= 3 ? <div className="home-motion__beacon" /> : null}
        </div>
      </div>
    );
  }

  if (type === "drill") {
    const tier = Math.min(3, Math.max(1, level)) as 1 | 2 | 3;
    return <DrillSpriteSheet tier={tier} />;
  }

  if (type === "drone") {
    return (
      <div className="sprite sprite--drone-dock">
        <span />
      </div>
    );
  }

  const generatedArt = structurePaintedArt(type, level);
  if (generatedArt) {
    return (
      <div
        className={`sprite sprite--generated sprite--generated-${type}${opened ? " sprite--generated--open" : ""}`}
        style={{ backgroundImage: `url(${generatedArt})` }}
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
  const [avatarFacing, setAvatarFacing] = useState<AvatarFacing>("down");
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
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [earningsScenarioId, setEarningsScenarioId] = useState<EarningsScenarioId>("starter");
  const [earningsHoverIndex, setEarningsHoverIndex] = useState<number | null>(null);
  const [marketFilter, setMarketFilter] = useState<"all" | "skins" | "pickaxes" | "clothes" | "pets">("all");
  const [marketSort, setMarketSort] = useState<"low" | "high" | "newest">("low");
  const [cameraZoom, setCameraZoom] = useState(1);
  const [townPlacements] = useState<TownPlacement[]>(() => loadTownPlacements());
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    return page === "game" && window.localStorage.getItem("ore-acres-tutorial-complete") !== "1";
  });
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialAudioStatus, setTutorialAudioStatus] = useState<"idle" | "ready" | "missing" | "playing">("idle");
  const [musicEnabled, setMusicEnabled] = useState(() => {
    return window.localStorage.getItem("ore-acres-music-enabled") === "1";
  });
  const [hideCharacter, setHideCharacter] = useState(() => {
    return window.localStorage.getItem("ore-acres-hide-character") === "1";
  });
  const devMode = new URLSearchParams(window.location.search).get("dev") === "1";
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const gamePanelRef = useRef<HTMLElement | null>(null);
  const tutorialAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicEngineRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    timer: number | null;
    step: number;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [placementPreview, setPlacementPreview] = useState<{ plotId: string; tile: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const keysRef = useRef<Record<string, boolean>>({});
  const ignoreTileClickRef = useRef(false);
  const chestRevealTimerRef = useRef<number | null>(null);
  const oreMiningTimersRef = useRef<Record<string, number>>({});
  const miningLockUntilRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);
  const avatarRef = useRef(game.avatar);
  const appearanceRef = useRef({
    avatarStyle: game.avatarStyle,
    equippedPickaxeSkin: game.equippedPickaxeSkin,
    equippedClothesSkin: game.equippedClothesSkin,
  });
  const lastSentMoveRef = useRef({ x: Number.NaN, y: Number.NaN, at: 0 });
  const lastSentAppearanceRef = useRef<string>("");
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

  const tutorialStep = TUTORIAL_STEPS[tutorialStepIndex] ?? TUTORIAL_STEPS[0];

  function focusTutorialPanel(panel: TutorialPanel) {
    setGame((current) => ({
      ...current,
      inventoryOpen: panel === "inventory",
      shopOpen: panel === "shop",
      marketOpen: panel === "market",
      questsOpen: panel === "quests",
    }));
  }

  function startTutorial() {
    setTutorialStepIndex(0);
    setTutorialOpen(true);
    focusTutorialPanel("world");
  }

  function completeTutorial() {
    window.localStorage.setItem("ore-acres-tutorial-complete", "1");
    setTutorialOpen(false);
    focusTutorialPanel("world");
  }

  function nextTutorialStep() {
    setTutorialStepIndex((current) => {
      if (current >= TUTORIAL_STEPS.length - 1) {
        window.localStorage.setItem("ore-acres-tutorial-complete", "1");
        setTutorialOpen(false);
        focusTutorialPanel("world");
        return current;
      }
      return current + 1;
    });
  }

  function previousTutorialStep() {
    setTutorialStepIndex((current) => Math.max(0, current - 1));
  }

  async function playTutorialVoiceover() {
    const audio = tutorialAudioRef.current;
    if (!audio) return;

    try {
      audio.currentTime = tutorialStep.voiceStart;
      await audio.play();
      setTutorialAudioStatus("playing");
    } catch {
      setTutorialAudioStatus("missing");
    }
  }

  function playSynthNote(context: AudioContext, gain: GainNode, frequency: number, duration = 0.12) {
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    noteGain.gain.setValueAtTime(0.0001, context.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.012);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(noteGain);
    noteGain.connect(gain);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  function startChipMusic() {
    if (musicEngineRef.current) {
      void musicEngineRef.current.context.resume();
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = 0.045;
    gain.connect(context.destination);
    const melody = [261.63, 329.63, 392, 493.88, 392, 329.63, 293.66, 392];
    const bass = [130.81, 130.81, 164.81, 196, 146.83, 146.83, 196, 164.81];
    const engine = { context, gain, timer: null as number | null, step: 0 };
    const tick = () => {
      const index = engine.step % melody.length;
      playSynthNote(context, gain, melody[index], 0.11);
      if (engine.step % 2 === 0) {
        playSynthNote(context, gain, bass[Math.floor(engine.step / 2) % bass.length], 0.16);
      }
      engine.step += 1;
    };
    tick();
    engine.timer = window.setInterval(tick, 210);
    musicEngineRef.current = engine;
  }

  function stopChipMusic() {
    const engine = musicEngineRef.current;
    if (!engine) return;
    if (engine.timer !== null) {
      window.clearInterval(engine.timer);
    }
    void engine.context.close();
    musicEngineRef.current = null;
  }

  function toggleMusic() {
    setMusicEnabled((enabled) => {
      const next = !enabled;
      window.localStorage.setItem("ore-acres-music-enabled", next ? "1" : "0");
      return next;
    });
  }

  function toggleHideCharacter() {
    setHideCharacter((hidden) => {
      const next = !hidden;
      window.localStorage.setItem("ore-acres-hide-character", next ? "1" : "0");
      return next;
    });
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
      setPage(pageFromPath(window.location.pathname));
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
    appearanceRef.current = {
      avatarStyle: game.avatarStyle,
      equippedPickaxeSkin: game.equippedPickaxeSkin,
      equippedClothesSkin: game.equippedClothesSkin,
    };
  }, [game.avatarStyle, game.equippedPickaxeSkin, game.equippedClothesSkin]);

  useEffect(() => {
    const minerTag = walletPublicKey?.toBase58() ?? playerName;
    let lockUntil = 0;

    for (const plot of Object.values(game.plots)) {
      for (const node of plot.oreNodes) {
        if (node.miningBy === minerTag && node.miningUntil && node.miningUntil > lockUntil) {
          lockUntil = node.miningUntil;
        }
      }
    }

    miningLockUntilRef.current = lockUntil;
  }, [game.plots, playerName, walletPublicKey]);

  useEffect(() => {
    window.localStorage.setItem("ore-acres-playtest", game.playtestMode ? "1" : "0");
  }, [game.playtestMode]);

  useEffect(() => {
    const saveState = { ...game, chestReveal: null, mineReveal: null, lastUpdatedAt: Date.now() };
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(saveKey, JSON.stringify(saveState));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [game, saveKey]);

  useEffect(() => {
    if (page !== "game") return;

    const closeMenus = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setGame((current) => ({
        ...current,
        inventoryOpen: false,
        shopOpen: false,
        marketOpen: false,
        questsOpen: false,
      }));
    };

    window.addEventListener("keydown", closeMenus);
    return () => window.removeEventListener("keydown", closeMenus);
  }, [page]);

  useEffect(() => {
    if (!tutorialOpen || page !== "game") return;
    focusTutorialPanel(tutorialStep.panel);
    setTutorialAudioStatus((status) => (status === "playing" ? "ready" : status));
  }, [page, tutorialOpen, tutorialStep.panel, tutorialStepIndex]);

  useEffect(() => {
    if (musicEnabled && page === "game") {
      startChipMusic();
    } else {
      stopChipMusic();
    }

    return () => {
      stopChipMusic();
    };
  }, [musicEnabled, page]);

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
      for (const timer of Object.values(oreMiningTimersRef.current)) {
        window.clearTimeout(timer);
      }
      oreMiningTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const activeOreIds = new Set(
      Object.values(game.plots).flatMap((plot) => plot.oreNodes.map((node) => node.id)),
    );

    for (const [oreId, timer] of Object.entries(oreMiningTimersRef.current)) {
      if (!activeOreIds.has(oreId)) {
        window.clearTimeout(timer);
        delete oreMiningTimersRef.current[oreId];
      }
    }
  }, [game.plots]);

  useEffect(() => {
    if (page !== "game") return;

    const now = Date.now();
    for (const plot of Object.values(game.plots)) {
      for (const node of plot.oreNodes) {
        if (node.miningUntil === null) continue;

        const remainingMs = node.miningUntil - now;
        if (remainingMs <= 0) {
          finishMiningOre(plot.id, node.id);
          continue;
        }

        if (oreMiningTimersRef.current[node.id] === undefined) {
          oreMiningTimersRef.current[node.id] = window.setTimeout(() => {
            finishMiningOre(plot.id, node.id);
          }, remainingMs);
        }
      }
    }
  }, [game.plots, page]);

  useEffect(() => {
    if (page !== "game") return;

    setNowMs(Date.now());
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [page]);

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
    let cancelled = false;
    let socket: WebSocket | null = null;
    let timeout = 0;

    (async () => {
      const wsUrl = await resolveMultiplayerUrl();
      if (cancelled) {
        return;
      }

      if (!wsUrl) {
        setMultiplayerStatus("offline");
        setRemotePlayers({});
        return;
      }

      const room = sanitizeRoomId(roomCode);

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
        if (cancelled || !socket) {
          return;
        }
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
            avatarStyle: normalizeAvatarStyle(entry.avatarStyle),
            equippedPickaxeSkin: isSkinId(entry.equippedPickaxeSkin) && isPickaxeSkinId(entry.equippedPickaxeSkin) ? entry.equippedPickaxeSkin : null,
            equippedClothesSkin: isSkinId(entry.equippedClothesSkin) && !isPickaxeSkinId(entry.equippedClothesSkin) ? entry.equippedClothesSkin : null,
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
            avatarStyle: normalizeAvatarStyle(message.player.avatarStyle),
            equippedPickaxeSkin:
              isSkinId(message.player.equippedPickaxeSkin) && isPickaxeSkinId(message.player.equippedPickaxeSkin)
                ? message.player.equippedPickaxeSkin
                : null,
            equippedClothesSkin:
              isSkinId(message.player.equippedClothesSkin) && !isPickaxeSkinId(message.player.equippedClothesSkin)
                ? message.player.equippedClothesSkin
                : null,
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
                avatarStyle: normalizeAvatarStyle(message.player.avatarStyle ?? existing.avatarStyle),
                equippedPickaxeSkin:
                  isSkinId(message.player.equippedPickaxeSkin) && isPickaxeSkinId(message.player.equippedPickaxeSkin)
                    ? message.player.equippedPickaxeSkin
                    : existing.equippedPickaxeSkin ?? null,
                equippedClothesSkin:
                  isSkinId(message.player.equippedClothesSkin) && !isPickaxeSkinId(message.player.equippedClothesSkin)
                    ? message.player.equippedClothesSkin
                    : existing.equippedClothesSkin ?? null,
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
                avatarStyle: normalizeAvatarStyle(message.player.avatarStyle ?? existing.avatarStyle),
                equippedPickaxeSkin:
                  isSkinId(message.player.equippedPickaxeSkin) && isPickaxeSkinId(message.player.equippedPickaxeSkin)
                    ? message.player.equippedPickaxeSkin
                    : existing.equippedPickaxeSkin ?? null,
                equippedClothesSkin:
                  isSkinId(message.player.equippedClothesSkin) && !isPickaxeSkinId(message.player.equippedClothesSkin)
                    ? message.player.equippedClothesSkin
                    : existing.equippedClothesSkin ?? null,
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
    })();

    return () => {
      cancelled = true;
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      if (socket) {
        socket.close();
      }
    };
  }, [playerName, roomCode]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setGame((current) => {
        const plot = current.claimedPlotId ? current.plots[current.claimedPlotId] : null;
        let next: GameState = current;

        if (!plot?.owner?.me) return next;

        const economy = computeEconomy(
          plot,
          next.activePet,
          next.equippedPickaxeSkin,
          next.equippedClothesSkin,
          Math.max(1, Object.keys(remotePlayers).length + 1),
          next.rewardReserveSol,
        );
        const mintGain = round(economy.income / 60);
        const nextMints = round(next.mints + mintGain);

        if (mintGain > 0) {
          next = {
            ...next,
            plots: {
              ...next.plots,
              [plot.id]: {
                ...plot,
                totalCollectedMints: round((plot.totalCollectedMints ?? 0) + mintGain),
              },
            },
            mints: nextMints,
            stats: {
              ...next.stats,
              totalEarned: round(next.stats.totalEarned + mintGain),
            },
            message: `Your plot is producing ${economy.income.toFixed(2)} mints/min from the shared pool.`,
          };
        } else if (nextMints !== next.mints) {
          next = {
            ...next,
            mints: nextMints,
          };
        }

        return next;
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [remotePlayers]);

  useEffect(() => {
    if (page !== "game") return;

    const spawnOre = (plotId: string, force = false, label = "area") => {
      let syncedPlot: Plot | null = null;
      const now = Date.now();

      setGame((current) => {
        const plot = current.plots[plotId];
        if (!plot) return current;
        if (plot.kind === "plot" && !plot.owner?.me) return current;

        const activeOreNodes = plot.oreNodes.filter((node) => node.despawnAt > now);
        const cleanedPlot = activeOreNodes.length === plot.oreNodes.length
          ? plot
          : { ...plot, oreNodes: activeOreNodes };

        const limit = plot.kind === "mine" ? 4 : plot.kind === "town" ? 0 : ORE_NODE_LIMIT;
        if (activeOreNodes.length >= limit) {
          if (cleanedPlot === plot) return current;
          syncedPlot = cleanedPlot;
          return {
            ...current,
            plots: {
              ...current.plots,
              [plot.id]: cleanedPlot,
            },
          };
        }

        const chance = plot.kind === "mine" ? 0.85 : ORE_SPAWN_CHANCE;
        if (!force && Math.random() > chance) {
          if (cleanedPlot === plot) return current;
          syncedPlot = cleanedPlot;
          return {
            ...current,
            plots: {
              ...current.plots,
              [plot.id]: cleanedPlot,
            },
          };
        }

        const spawnTile = findOreSpawnTile(cleanedPlot);
        if (!spawnTile) {
          if (cleanedPlot === plot) return current;
          syncedPlot = cleanedPlot;
          return {
            ...current,
            plots: {
              ...current.plots,
              [plot.id]: cleanedPlot,
            },
          };
        }

        const rarity = pickWeightedOreRarity();
        const nextNode: OreNode = {
          id: `ore-${now}-${Math.random().toString(36).slice(2, 8)}`,
          plotId: plot.id,
          tile: spawnTile,
          rarity,
          reward: oreNodeReward(rarity),
          createdAt: now,
          despawnAt: now + ORE_DESPAWN_MS,
          miningUntil: null,
          miningBy: null,
        };
        const nextPlot = {
          ...cleanedPlot,
          oreNodes: [...activeOreNodes, nextNode],
        };

        syncedPlot = nextPlot;
        return {
          ...current,
          plots: {
            ...current.plots,
            [plot.id]: nextPlot,
          },
          message:
            plot.kind === "mine"
              ? `${oreNodeDisplayLabel(rarity)} surfaced in Dustfall Mine.`
              : `${oreNodeDisplayLabel(rarity)} surfaced in the ${label}.`,
        };
      });

      sendSharedPlot(syncedPlot);
    };

    const firstSpawn = window.setTimeout(() => {
      spawnOre(MINE_ID, true, "mine");
      if (game.claimedPlotId) {
        spawnOre(game.claimedPlotId, true, "plot");
      }
    }, ORE_FIRST_SPAWN_DELAY_MS);
    const interval = window.setInterval(() => {
      spawnOre(MINE_ID, false, "mine");
      if (game.claimedPlotId) {
        spawnOre(game.claimedPlotId, false, "plot");
      }
    }, ORE_SPAWN_INTERVAL_MS);

    return () => {
      window.clearTimeout(firstSpawn);
      window.clearInterval(interval);
    };
  }, [page, playerName, game.claimedPlotId]);

  useEffect(() => {
    if (page !== "game") return;

    const ownerTag = walletPublicKey?.toBase58() ?? playerName;
    const now = Date.now();
    const assignments: Array<{ plotId: string; oreId: string; duration: number }> = [];
    let syncedPlot: Plot | null = null;

    setGame((current) => {
      if (!current.claimedPlotId) return current;
      const plot = current.plots[current.claimedPlotId];
      if (!plot?.owner?.me) return current;

      const droneTiles = Object.entries(plot.structures)
        .filter(([, structure]) => structure.type === "drone")
        .map(([tile]) => tile);
      if (droneTiles.length === 0) return current;

      const busyDroneTiles = new Set(
        plot.oreNodes
          .filter((node) => node.miningUntil !== null && node.miningUntil > now)
          .map((node) => droneTileFromMinerTag(node.miningBy))
          .filter((tile): tile is string => Boolean(tile)),
      );
      const availableDroneTiles = droneTiles.filter((tile) => !busyDroneTiles.has(tile));
      if (availableDroneTiles.length === 0) return current;

      const availableOreNodes = plot.oreNodes.filter(
        (node) => node.despawnAt > now && node.miningUntil === null,
      );
      if (availableOreNodes.length === 0) return current;

      const assignedByOreId = new Map<string, OreNode>();
      availableDroneTiles.forEach((tile, index) => {
        const node = availableOreNodes[index];
        if (!node) return;

        const duration = MINER_DRONE_TRAVEL_MS + oreNodeMiningMs(node.rarity);
        const nextNode = {
          ...node,
          miningUntil: now + duration,
          miningBy: droneMinerTag(ownerTag, tile),
        };
        assignedByOreId.set(node.id, nextNode);
        assignments.push({ plotId: plot.id, oreId: node.id, duration });
      });

      if (assignedByOreId.size === 0) return current;

      const nextPlot = {
        ...plot,
        oreNodes: plot.oreNodes.map((node) => assignedByOreId.get(node.id) ?? node),
      };
      syncedPlot = nextPlot;

      return {
        ...current,
        plots: {
          ...current.plots,
          [plot.id]: nextPlot,
        },
        message: `${assignedByOreId.size === 1 ? "A mining drone is" : "Mining drones are"} extracting ore.`,
      };
    });

    assignments.forEach(({ plotId, oreId, duration }) => {
      if (oreMiningTimersRef.current[oreId] !== undefined) {
        window.clearTimeout(oreMiningTimersRef.current[oreId]);
      }
      oreMiningTimersRef.current[oreId] = window.setTimeout(() => {
        finishMiningOre(plotId, oreId);
      }, duration);
    });

    sendSharedPlot(syncedPlot);
  }, [game.plots, game.claimedPlotId, page, playerName, walletPublicKey]);

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

      if (miningLockUntilRef.current > now) {
        setMoving(false);
        raf = window.requestAnimationFrame(tick);
        return;
      }

      if (dx !== 0 || dy !== 0) {
        const speed = 180;
        setPetSide(petSideForMovement(dx, dy));
        setAvatarFacing(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
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
        avatarStyle: appearanceRef.current.avatarStyle,
        equippedPickaxeSkin: appearanceRef.current.equippedPickaxeSkin,
        equippedClothesSkin: appearanceRef.current.equippedClothesSkin,
      }),
    );
  }, [game.avatar.x, game.avatar.y, multiplayerStatus]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || multiplayerStatus !== "online") {
      return;
    }

    const payload = {
      avatarStyle: appearanceRef.current.avatarStyle,
      equippedPickaxeSkin: appearanceRef.current.equippedPickaxeSkin,
      equippedClothesSkin: appearanceRef.current.equippedClothesSkin,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastSentAppearanceRef.current) {
      return;
    }

    lastSentAppearanceRef.current = signature;
    socket.send(JSON.stringify({ type: "move", x: Math.round(avatarRef.current.x), y: Math.round(avatarRef.current.y), ...payload }));
  }, [game.avatarStyle, game.equippedPickaxeSkin, game.equippedClothesSkin, multiplayerStatus]);

  const claimedPlot = game.claimedPlotId ? game.plots[game.claimedPlotId] : null;
  const selectedPlot = game.plots[game.selectedPlotId];
  const selectedPlotLabel =
    selectedPlot.kind === "town"
      ? "Ore Acres Town"
      : selectedPlot.kind === "mine"
        ? "Dustfall Mine"
        : selectedPlot.name;
  const selectedPlotEconomy = claimedPlot
    ? computeEconomy(
        claimedPlot,
        game.activePet,
        game.equippedPickaxeSkin,
        game.equippedClothesSkin,
        Math.max(1, Object.keys(remotePlayers).length + 1),
        game.rewardReserveSol,
      )
    : null;
  const rewardReserveRunwayDays = reserveRunwayDays(
    game.rewardReserveSol,
    selectedPlotEconomy ? selectedPlotEconomy.income * 1440 : 0,
  );
  const rewardReserveHealth = reserveHealthLabel(rewardReserveRunwayDays);
  const emissionThrottle = reserveThrottle(rewardReserveRunwayDays);
  const selectedChest = selectedPlot.chest;
  const selectedStructure =
    claimedPlot && game.selectedTile ? findStructureAtTile(claimedPlot, game.selectedTile)?.structure ?? null : null;
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
  const minerTag = walletPublicKey?.toBase58() ?? playerName;
  const activeMiningOre = Object.values(game.plots)
    .flatMap((plot) => plot.oreNodes.map((node) => ({ plot, node })))
    .find(({ node }) => node.miningBy === minerTag && node.miningUntil !== null && node.miningUntil > nowMs);
  const activeMiningRemainingMs = activeMiningOre?.node.miningUntil
    ? Math.max(0, activeMiningOre.node.miningUntil - nowMs)
    : 0;
  const activeMiningDurationMs = activeMiningOre
    ? oreNodeMiningMs(activeMiningOre.node.rarity)
    : 0;
  const activeMiningProgress = activeMiningOre && activeMiningDurationMs > 0
    ? clamp(1 - activeMiningRemainingMs / activeMiningDurationMs, 0, 1)
    : 0;
  const miningFacing: AvatarFacing = activeMiningOre
    ? (() => {
        const orePosition = oreNodeWorldPosition(activeMiningOre.plot, activeMiningOre.node);
        const dx = orePosition.x - game.avatar.x;
        const dy = orePosition.y - game.avatar.y;
        return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      })()
    : avatarFacing;
  const hasPlacedDrill = Boolean(
    claimedPlot && Object.values(claimedPlot.structures).some((structure) => structure.type === "drill"),
  );
  const inPublicTown = selectedPlot.kind === "town";
  const worldObjective = !game.claimedPlotId
    ? inPublicTown
      ? "Use town to buy your first plot, bank loot, and meet other miners."
      : "Claim an open plot to begin your mine."
    : !hasPlacedDrill && (game.inventory.drill ?? 0) > 0
      ? "Place your starter drill on an empty tile."
      : selectedStructure && nextStructureCost
        ? `Upgrade ${selectedStructureName ?? "this structure"} for ${purchaseDisplayLabel(
            nextStructureCost,
            game.playtestMode,
          )}.`
        : game.questBoxes > 0
          ? "Open a quest box for a bonus reward."
          : "Expand your plot and optimize production.";

  const camera = useMemo(() => {
    const center = avatarCenter(game.avatar);
    const viewportWidth = viewportSize.width || 1280;
    const viewportHeight = viewportSize.height || 720;
    const scaledWorldWidth = WORLD_WIDTH * cameraZoom;
    const scaledWorldHeight = WORLD_HEIGHT * cameraZoom;
    const x = clamp(viewportWidth / 2 - center.x * cameraZoom, viewportWidth - scaledWorldWidth, 0);
    const y = clamp(viewportHeight / 2 - center.y * cameraZoom, viewportHeight - scaledWorldHeight, 0);
    return { x, y };
  }, [cameraZoom, game.avatar, viewportSize.height, viewportSize.width]);

  function changeZoom(delta: number) {
    setCameraZoom((current) => clamp(Math.round((current + delta) * 100) / 100, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM));
  }

  function resetZoom() {
    setCameraZoom(1);
  }

  function handleWorldWheel(event: WheelEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest(".world-stage")) return;

    event.preventDefault();
    changeZoom(event.deltaY > 0 ? -0.06 : 0.06);
  }

  function setMessage(message: string) {
    setGame((current) => ({ ...current, message }));
  }

  function scrollToGame() {
    gamePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToPage(nextPage: Page) {
    const nextPath = nextPage === "game" ? "/game" : nextPage === "economy" ? "/economy" : "/";
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
    if (page !== "home") {
      goToPage("home");
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      return;
    }
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

  function warpToClaimedPlot() {
    setGame((current) => {
      if (!current.claimedPlotId) {
        return { ...current, message: "Claim a plot first so we know where to warp you." };
      }

      const plot = current.plots[current.claimedPlotId];
      if (!plot) {
        return current;
      }

      return {
        ...current,
        selectedPlotId: plot.id,
        avatar: {
          x: plot.position.x + PLOT_SIZE / 2,
          y: plot.position.y + PLOT_SIZE / 2,
        },
        message: "Teleported back to your plot.",
      };
    });
  }

  function togglePlaytestMode() {
    setGame((current) => ({
      ...current,
      playtestMode: !current.playtestMode,
      message: !current.playtestMode
        ? "Playtest mode enabled. Shop purchases now use local test mints."
        : "Playtest mode disabled. Live Pump mint checkout restored.",
    }));
  }

  function grantPlaytestMints(amount = PLAYTEST_MINT_GRANT) {
    setGame((current) => ({
      ...current,
      mints: round(current.mints + amount),
      message: `Granted ${amount.toFixed(0)} test mints for shop testing.`,
    }));
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
    if (game.playtestMode) {
      const tokenAmountUi = playtestMintCost(usdAmount);
      if (game.mints < tokenAmountUi) {
        setWalletMessage(`Need ${tokenAmountUi.toFixed(2)} test mints to buy ${label}.`);
        return null;
      }

      setWalletMessage(`Playtest purchase simulated for ${label}.`);
      return {
        signature: `playtest-${Date.now()}`,
        tokenAmountUi,
        localDebitMints: tokenAmountUi,
        usdAmount,
        tokenPriceUsd: PLAYTEST_MINT_RATE,
      };
    }

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

    const [{ Connection, PublicKey, Transaction }, splToken] = await Promise.all([
      import("@solana/web3.js"),
      import("@solana/spl-token"),
    ]);
    const {
      createAssociatedTokenAccountIdempotentInstruction,
      createTransferCheckedInstruction,
      getAssociatedTokenAddress,
      getMint,
    } = splToken;
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
        const destinationTokenAccount = allocation.tokenAccount
          ? new PublicKey(allocation.tokenAccount)
          : await getAssociatedTokenAddress(mint, new PublicKey(allocation.ownerWallet!));

        if (!allocation.tokenAccount) {
          transaction.add(
            createAssociatedTokenAccountIdempotentInstruction(
              walletPublicKey,
              destinationTokenAccount,
              new PublicKey(allocation.ownerWallet!),
              mint,
            ),
          );
        }

        transaction.add(
          createTransferCheckedInstruction(
            sourceTokenAccount,
            mint,
            destinationTokenAccount,
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
        localDebitMints: 0,
        usdAmount: quote.usdAmount,
        tokenPriceUsd: quote.tokenPriceUsd,
      };
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Token payment failed.");
      return null;
    }
  }

  function selectPlot(plotId: string) {
    const plot = game.plots[plotId] ?? null;
    setGame((current) => ({
      ...current,
      selectedPlotId: plotId,
      message: plot?.kind === "town"
        ? "Ore Acres Town selected."
        : plot?.kind === "mine"
          ? "Dustfall Mine selected."
        : plot?.owner?.me
          ? "Your plot selected."
          : plot?.owner
            ? `${plot.owner.label}'s plot selected.`
            : "Unclaimed plot selected.",
    }));
  }

  function warpToTown() {
    if (!townPlot) {
      setMessage("The town area is missing.");
      return;
    }

    setGame((current) => ({
      ...current,
      selectedPlotId: townPlot.id,
      avatar: {
        x: townPlot.position.x + TOWN_PLOT_SIZE / 2,
        y: townPlot.position.y + TOWN_PLOT_SIZE / 2,
      },
      message: "Returned to Ore Acres Town.",
    }));
  }

  function openNpcDialogue(npcId: NpcId) {
    setGame((current) => ({
      ...current,
      selectedPlotId: TOWN_ID,
      npcDialogue: { npcId, step: 0 },
      inventoryOpen: false,
      shopOpen: false,
      marketOpen: false,
      questsOpen: false,
      message: "Talking to an NPC...",
    }));
  }

  function closeNpcDialogue() {
    setGame((current) => ({ ...current, npcDialogue: null }));
  }

  function advanceNpcDialogue() {
    setGame((current) => {
      if (!current.npcDialogue) return current;
      return {
        ...current,
        npcDialogue: {
          ...current.npcDialogue,
          step: current.npcDialogue.step + 1,
        },
      };
    });
  }

  function findNearestOpenPlot(plots: Record<string, Plot>, origin: { x: number; y: number }) {
    const openPlots = Object.values(plots).filter((plot) => plot.kind === "plot" && !plot.owner);
    if (openPlots.length === 0) return null;
    return openPlots
      .map((plot) => ({ plot, distance: Math.hypot(plot.position.x + PLOT_SIZE / 2 - origin.x, plot.position.y + PLOT_SIZE / 2 - origin.y) }))
      .sort((a, b) => a.distance - b.distance)[0]?.plot ?? null;
  }

  async function buyStarterPlot() {
    const payment = await chargePumpMint(5, "starter plot");
    if (!payment) return;

    let syncedPlot: Plot | null = null;
    setGame((current) => {
      const origin = current.claimedPlotId && current.plots[current.claimedPlotId]
        ? {
            x: current.plots[current.claimedPlotId].position.x + PLOT_SIZE / 2,
            y: current.plots[current.claimedPlotId].position.y + PLOT_SIZE / 2,
          }
        : townPlot
          ? { x: townPlot.position.x + TOWN_PLOT_SIZE / 2, y: townPlot.position.y + TOWN_PLOT_SIZE / 2 }
          : current.avatar;
      const plot = findNearestOpenPlot(current.plots, origin);
      if (!plot) {
        return { ...current, message: "No plots are open right now." };
      }

      const nextPlot: Plot = {
        ...plot,
        owner: { label: "You", me: true },
        structures: starterStructures(),
        chest: null,
      };

      const nextState: GameState = {
        ...current,
        plots: {
          ...current.plots,
          [plot.id]: nextPlot,
        },
        claimedPlotId: plot.id,
        selectedPlotId: plot.id,
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
        mints: Math.max(0, round(current.mints - payment.localDebitMints)),
        shopOpen: false,
        marketOpen: false,
        questsOpen: false,
        message: "Plot purchased. Teleported to your new home.",
      };
      syncedPlot = nextPlot;
      return nextState;
    });
    sendSharedPlot(syncedPlot);
  }

  function claimSelectedPlot() {
    let syncedPlot: Plot | null = null;
    setGame((current) => {
      if (current.claimedPlotId) {
        return { ...current, message: "You already own a plot." };
      }

      const plot = current.plots[current.selectedPlotId];
      if (!plot || plot.kind !== "plot") {
        return { ...current, message: "Only player plots can be claimed." };
      }
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

    let payment: { tokenAmountUi: number; localDebitMints: number } | null = null;
    if (item.cost > 0) {
      payment = await chargePumpMint(item.cost, item.label);
      if (!payment) return;
    } else {
      payment = { tokenAmountUi: 0, localDebitMints: 0 };
    }

    setGame((current) => {
      if (!current.claimedPlotId) return { ...current, message: "Claim a plot first." };

      const plot = current.plots[current.claimedPlotId];
      const reserveTopUp = reserveContribution(
        item.cost,
        type === "chest" ? CHEST_RESERVE_BPS : SHOP_RESERVE_BPS,
      );

      if (type === "chest") {
        if (plot.chest) {
          return { ...current, message: "You already have a gacha chest on this plot." };
        }

        const nextState = {
          ...current,
          mints: Math.max(0, round(current.mints - payment.localDebitMints)),
          rewardReserveSol: round(current.rewardReserveSol + reserveTopUp),
          plots: {
            ...current.plots,
            [current.claimedPlotId]: {
              ...plot,
              chest: { id: `${plot.id}-gacha-chest` },
            },
          },
          selectedTile: null,
          message: `${item.label} spawned on your plot. Click the giant chest to reveal the prize.`,
        };
        syncedPlot = nextState.plots[current.claimedPlotId];
        return nextState;
      }

      return {
        ...current,
        mints: Math.max(0, round(current.mints - payment.localDebitMints)),
        rewardReserveSol: round(current.rewardReserveSol + reserveTopUp),
        inventory: {
          ...current.inventory,
          [type]: (current.inventory[type] ?? 0) + 1,
        },
        activeTool: type,
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
      mints: Math.max(0, round(current.mints - payment.localDebitMints)),
      rewardReserveSol: round(current.rewardReserveSol + reserveContribution(item.cost, COSMETIC_RESERVE_BPS)),
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
      mints: Math.max(0, round(current.mints - payment.localDebitMints)),
      rewardReserveSol: round(current.rewardReserveSol + reserveContribution(skin.cost, COSMETIC_RESERVE_BPS)),
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

function finishMiningOre(plotId: string, oreId: string) {
    const timer = oreMiningTimersRef.current[oreId];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete oreMiningTimersRef.current[oreId];
    }

    let syncedPlot: Plot | null = null;
    setGame((current) => {
      const plot = current.plots[plotId];
      const node = plot?.oreNodes.find((entry) => entry.id === oreId);
      if (!plot || !node) return current;
      if (node.miningUntil === null || Date.now() < node.miningUntil) {
        return current;
      }
      const ownerTag = walletPublicKey?.toBase58() ?? playerName;
      const minedByDrone = node.miningBy?.startsWith(`${ownerTag}:drone:`);
      if (node.miningBy && node.miningBy !== ownerTag && !minedByDrone) {
        return current;
      }

      const baseMint = round(node.reward * pickaxeMultiplier(current.equippedPickaxeSkin));
      const reward = rollMiningReward(
        node.rarity,
        current.equippedPickaxeSkin,
        current.equippedClothesSkin,
        current.activePet,
      );
      const miningXpGain = miningXpForRarity(node.rarity);
      const nextMiningXp = round(current.miningXp + miningXpGain);
      const nextMiningLevel = miningLevelForXp(nextMiningXp);
      const bonusMint = reward.kind === "mints" ? reward.mints ?? 0 : 0;
      const totalMintEarned = round(baseMint + bonusMint);
      const nextPlot = {
        ...plot,
        oreNodes: plot.oreNodes.filter((entry) => entry.id !== oreId),
        totalCollectedMints: round((plot.totalCollectedMints ?? 0) + totalMintEarned),
      };
      const nextState: GameState = {
        ...current,
        mints: round(current.mints + totalMintEarned),
        questBoxes: reward.kind === "box" ? current.questBoxes + 1 : current.questBoxes,
        skinInventory:
          reward.kind === "skin" && reward.skinId
            ? {
                ...current.skinInventory,
                [reward.skinId]: (current.skinInventory[reward.skinId] ?? 0) + 1,
              }
            : current.skinInventory,
        petInventory:
          reward.kind === "pet" && reward.petId
            ? {
                ...current.petInventory,
                [reward.petId]: (current.petInventory[reward.petId] ?? 0) + 1,
              }
            : current.petInventory,
        activePet: reward.kind === "pet" && reward.petId ? reward.petId : current.activePet,
        nftInventory:
          reward.kind === "nft" && reward.nftId
            ? {
                ...current.nftInventory,
                [reward.nftId]: (current.nftInventory[reward.nftId] ?? 0) + 1,
              }
            : current.nftInventory,
        plots: {
          ...current.plots,
          [plotId]: nextPlot,
        },
        miningXp: nextMiningXp,
        miningLevel: nextMiningLevel,
        stats: {
          ...current.stats,
          totalEarned: round(current.stats.totalEarned + totalMintEarned),
        },
        mineReveal: minedByDrone
          ? null
          : {
              label: reward.label,
              detail:
                reward.kind === "mints"
                  ? `${totalMintEarned.toFixed(2)} mints`
                  : reward.kind === "skin" && reward.skinId
                    ? `${skinItem(reward.skinId)?.label ?? reward.skinId} added`
                    : reward.kind === "pet" && reward.petId
                        ? `${petItem(reward.petId)?.label ?? reward.petId} added`
                        : reward.kind === "box"
                          ? "Quest box added"
                          : reward.kind === "nft" && reward.nftId
                            ? `${nftLabel(reward.nftId)} added`
                            : "Reward added",
              kind: reward.kind,
            },
        message:
          reward.kind === "mints"
            ? `${minedByDrone ? "Drone mined" : "Mined"} ${oreNodeDisplayLabel(node.rarity)} for ${totalMintEarned.toFixed(2)} mints and +${miningXpGain} XP.`
            : `${minedByDrone ? "Drone mined" : "Mined"} ${oreNodeDisplayLabel(node.rarity)} for ${totalMintEarned.toFixed(2)} mints, +${miningXpGain} XP, and found ${reward.label}.`,
      };
      syncedPlot = nextPlot;
      return nextState;
    });

    sendSharedPlot(syncedPlot);
  }

  function startMiningOre(plotId: string, oreId: string) {
    const minerTag = walletPublicKey?.toBase58() ?? playerName;
    const now = Date.now();
    let syncedPlot: Plot | null = null;
    let miningDuration = 0;
    let started = false;

    setGame((current) => {
      const plot = current.plots[plotId];
      const node = plot?.oreNodes.find((entry) => entry.id === oreId);
      if (!plot || !node) return current;
      if (node.miningUntil && node.miningUntil > now) {
        return { ...current, message: "That ore is already being mined." };
      }
      if (!isAvatarNearOre(current.avatar, plot, node)) {
        return {
          ...current,
          selectedPlotId: plotId,
          message: "Walk closer to the ore before mining it.",
        };
      }

      miningDuration = miningDurationForRarity(node.rarity, current.miningLevel);
      const nextNode = {
        ...node,
        miningUntil: now + miningDuration,
        miningBy: minerTag,
      };

      const nextPlot = {
        ...plot,
        oreNodes: plot.oreNodes.map((entry) => (entry.id === oreId ? nextNode : entry)),
      };

      const nextState = {
        ...current,
        plots: {
          ...current.plots,
          [plotId]: nextPlot,
        },
        mineReveal: null,
        message: `Mining ${oreNodeDisplayLabel(node.rarity)}...`,
      };

      syncedPlot = nextPlot;
      started = true;
      return nextState;
    });

    if (!started || miningDuration <= 0) {
      return;
    }

    const existingTimer = oreMiningTimersRef.current[oreId];
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    oreMiningTimersRef.current[oreId] = window.setTimeout(() => {
      finishMiningOre(plotId, oreId);
    }, miningDuration);

    sendSharedPlot(syncedPlot);
  }

  function openQuestBox() {
    setGame((current) => {
      if (current.questBoxes <= 0) return { ...current, message: "You need a quest box first." };
      const reward = pickWeightedEntry(QUEST_BOX_REWARDS);
      const next = {
        ...current,
        questBoxes: current.questBoxes - 1,
        stats: {
          ...current.stats,
          questBoxesOpened: current.stats.questBoxesOpened + 1,
        },
      };

      if (reward.kind === "sol" && reward.rewardSol !== undefined) {
        const reserveClaim = claimSolFromReserve(
          scaledReward(reward.rewardSol),
          next.rewardReserveSol,
          MAX_BOX_SOL_PER_DAY,
        );
        const amount = reserveClaim.paid;
        return {
          ...next,
          sol: round(next.sol + amount),
          rewardReserveSol: reserveClaim.reserve,
          stats: {
            ...next.stats,
            totalEarned: round(next.stats.totalEarned + amount),
          },
          questReveal: { label: reward.label, detail: `+${amount.toFixed(6)} SOL` },
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
      const reserveFee = round(listing.price * (MARKETPLACE_RESERVE_FEE_BPS / 10_000));
      const burnedFee = round(listing.price * ((MARKETPLACE_FEE_BPS - MARKETPLACE_RESERVE_FEE_BPS) / 10_000));

      return {
        ...current,
        sol: round(current.sol - listing.price),
        rewardReserveSol: round(current.rewardReserveSol + reserveFee),
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
        message: `${marketplaceListingLabel(listing)} purchased. ${reserveFee.toFixed(4)} SOL to reserves, ${burnedFee.toFixed(4)} SOL sunk.`,
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

  function unequipSkin(category: SkinCategory) {
    setGame((current) => ({
      ...current,
      equippedPickaxeSkin: category === "pickaxe" ? null : current.equippedPickaxeSkin,
      equippedClothesSkin: category === "clothes" ? null : current.equippedClothesSkin,
      message: `${category === "pickaxe" ? "Pickaxe" : "Outfit"} cosmetic removed.`,
    }));
  }

  function updateAvatarStyle(nextStyle: Partial<AvatarStyle>) {
    setGame((current) => ({
      ...current,
      avatarStyle: {
        ...current.avatarStyle,
        ...nextStyle,
      },
      message: "Character style updated.",
    }));
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
      const tileWidth = rect.width / TILE_COUNT;
      const tileHeight = rect.height / TILE_COUNT;
      const tileX = Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(localX / tileWidth)));
      const tileY = Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(localY / tileHeight)));
      const key = tileKey(tileX, tileY);

      if (!canFitStructureAt(plot, current.activeTool, key)) {
        return {
          ...current,
          selectedTile: key,
          message:
            current.activeTool === "shack"
              ? "The house needs a clear 2x2 space."
              : "That tile is already occupied.",
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

      const selectedEntry = findStructureAtTile(plot, selectedTile);
      const structure = selectedEntry?.structure;
      if (!selectedEntry || !structure) return { ...current, message: "Select a structure first." };
      if (structure.type === "chest") {
        return { ...current, message: "That chest is fixed in place." };
      }

      return {
        ...current,
        selectedTile: selectedEntry.anchorTile,
        moveSource: { plotId: current.claimedPlotId, tile: selectedEntry.anchorTile },
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

      if (!canFitStructureAt(plot, sourceStructure.type, toTile, fromTile)) {
        return {
          ...current,
          message:
            sourceStructure.type === "shack"
              ? "Pick a clear 2x2 space for the house."
              : "Pick an empty tile for the move.",
        };
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

    const selectedEntry = findStructureAtTile(plot, selectedTile);
    const structure = selectedEntry?.structure;
    if (!selectedEntry || !structure) {
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

      const selectedEntryNow = findStructureAtTile(plotNow, selectedTileNow);
      const structureNow = selectedEntryNow?.structure;
      if (!selectedEntryNow || !structureNow) return { ...current, message: "That tile is empty." };

      const maxLevelNow = maxStructureLevel(structureNow.type);
      const nextState = {
        ...current,
        mints: Math.max(0, round(current.mints - payment.localDebitMints)),
        plots: {
          ...current.plots,
          [current.claimedPlotId]: {
            ...plotNow,
            structures: {
              ...plotNow.structures,
              [selectedEntryNow.anchorTile]: { ...structureNow, level: Math.min(maxLevelNow, structureNow.level + 1) },
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

  const townPlot = Object.values(game.plots).find((plot) => plot.kind === "town") ?? null;
  const mineAreaPlot = Object.values(game.plots).find((plot) => plot.kind === "mine") ?? null;
  const buildablePlotUnderAvatar = getBuildablePlotByPoint(game.avatar, game.plots);
  const canClaim = Boolean(buildablePlotUnderAvatar && !buildablePlotUnderAvatar.owner && !game.claimedPlotId);
  const regularPlots = Object.values(game.plots).filter((plot) => plot.kind === "plot");
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
                  ? claimedPlotEconomy && claimedPlotEconomy.rawIncome >= 0.000001
                    ? 1
                    : 0
                  : id === "mansion"
                    ? hasMansion
                      ? 1
                      : 0
                    : game.sol >= 0.1
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
  const townNpcDefs = townPlot
    ? TOWN_NPCS.map((npc) => ({
        ...npc,
        onClick: () => openNpcDialogue(npc.id),
      }))
    : [];
  const npcDialogueState = game.npcDialogue
    ? (() => {
        switch (game.npcDialogue.npcId) {
          case "banker":
            return {
              title: "Banker",
              subtitle: "Safe storage and wallet",
              text:
                game.npcDialogue.step === 0
                  ? "Keep your earnings in one place and check your balance whenever the market gets noisy."
                  : "The bank never sleeps. Use it to stay organized while your mine keeps earning in the background.",
              primaryLabel: "Open inventory",
              primaryAction: () => {
                setGame((current) => ({ ...current, inventoryOpen: true, shopOpen: false, marketOpen: false, questsOpen: false }));
                closeNpcDialogue();
              },
              secondaryLabel: game.npcDialogue.step === 0 ? "Continue" : "Close",
              secondaryAction: game.npcDialogue.step === 0 ? advanceNpcDialogue : closeNpcDialogue,
            };
          case "quest":
            return {
              title: "Quest Giver",
              subtitle: "Live missions and reward boxes",
              text:
                game.npcDialogue.step === 0
                  ? "I hand out the errands that keep the town moving. Mine, build, return, repeat."
                  : "Complete quests for reward boxes, small mint bumps, and a reason to keep checking back in.",
              primaryLabel: "Open quests",
              primaryAction: () => {
                setGame((current) => ({ ...current, questsOpen: true, shopOpen: false, marketOpen: false, inventoryOpen: false }));
                closeNpcDialogue();
              },
              secondaryLabel: game.npcDialogue.step === 0 ? "Tell me more" : "Close",
              secondaryAction: game.npcDialogue.step === 0 ? advanceNpcDialogue : closeNpcDialogue,
            };
          case "pickaxe":
            return {
              title: "Pickaxe Store",
              subtitle: "Tools, upgrades, and mining gear",
              text:
                game.npcDialogue.step === 0
                  ? "The right tool makes the mine feel alive. Better pickaxes improve speed and reward chances."
                  : "New mining gear should feel exciting to buy and obvious to use.",
              primaryLabel: "Open shop",
              primaryAction: () => {
                setGame((current) => ({ ...current, shopOpen: true, marketOpen: false, inventoryOpen: false, questsOpen: false }));
                closeNpcDialogue();
              },
              secondaryLabel: game.npcDialogue.step === 0 ? "Continue" : "Close",
              secondaryAction: game.npcDialogue.step === 0 ? advanceNpcDialogue : closeNpcDialogue,
            };
          case "marketplace":
            return {
              title: "Marketplace",
              subtitle: "Skins, pets, and listings",
              text:
                game.npcDialogue.step === 0
                  ? "List your rare cosmetics here and trade them for SOL when the market is hot."
                  : "The marketplace is a flex loop. Rare skins, pets, and pickaxes all belong here.",
              primaryLabel: "Open marketplace",
              primaryAction: () => {
                openMarketplace();
                closeNpcDialogue();
              },
              secondaryLabel: game.npcDialogue.step === 0 ? "Continue" : "Close",
              secondaryAction: game.npcDialogue.step === 0 ? advanceNpcDialogue : closeNpcDialogue,
            };
          case "plotSeller":
            return {
              title: "Plot Seller",
              subtitle: "Claim an acre",
              text:
                game.npcDialogue.step === 0
                  ? "I sell the only place in town where you can build your own mining base."
                  : "Buy a plot, get teleported home, and start shaping your own little empire.",
              primaryLabel: game.claimedPlotId ? "Warp to plot" : "Buy plot",
              primaryAction: () => {
                if (game.claimedPlotId) {
                  warpToClaimedPlot();
                } else {
                  buyStarterPlot();
                }
                closeNpcDialogue();
              },
              secondaryLabel: game.npcDialogue.step === 0 ? "Continue" : "Close",
              secondaryAction: game.npcDialogue.step === 0 ? advanceNpcDialogue : closeNpcDialogue,
            };
        }
      })()
    : null;
  const minimapEntries = Object.values(game.plots).map((plot) => ({
    id: plot.id,
    kind: plot.kind,
    selected: plot.id === game.selectedPlotId,
    owned: Boolean(plot.owner?.me),
    left: (plot.position.x / Math.max(1, WORLD_WIDTH)) * 100,
    top: (plot.position.y / Math.max(1, WORLD_HEIGHT)) * 100,
    width: ((plot.kind === "town" ? TOWN_PLOT_SIZE : PLOT_SIZE) / Math.max(1, WORLD_WIDTH)) * 100,
    height: ((plot.kind === "town" ? TOWN_PLOT_SIZE : PLOT_SIZE) / Math.max(1, WORLD_HEIGHT)) * 100,
    label: plot.kind === "town" ? "Town" : plot.kind === "mine" ? "Mine" : plot.name,
  }));
  const mineOreNodes = mineAreaPlot?.oreNodes ?? [];

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
          <button type="button" className={`site-nav__link ${page === "economy" ? "active" : ""}`} onClick={() => goToPage("economy")}>
            Economy
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
                <span>Reserve-backed SOL payouts</span>
              </div>
            </article>

            <article className="landing-card landing-card--stats">
              <span className="landing-card__eyebrow">Earnings examples</span>
              <h2>{earningsScenario.label}</h2>
              <p>{earningsScenario.description}</p>
              <div className="landing-card__stats-row">
                <div>
                  <span>Day</span>
                  <strong>{earningsScenario.solPerDay.toFixed(6)} MINT</strong>
                </div>
                <div>
                  <span>Week</span>
                  <strong>{earningsScenario.solPerWeek.toFixed(6)} MINT</strong>
                </div>
                <div>
                  <span>Month</span>
                  <strong>{earningsScenario.solPerMonth.toFixed(6)} MINT</strong>
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
                  <span>{chartPointValue.toFixed(6)} SOL/day</span>
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
                  and stack tiny mint earnings over time.
                </p>
              </article>
              <article className="whitepaper-card">
                <h3>Economy</h3>
                <p>
                  Item purchases are priced in the Pump.fun mint, while ore
                  rewards are primarily minted tokens and SOL stays reserved for
                  marketplace settlement and bonuses.
                </p>
              </article>
              <article className="whitepaper-card">
                <h3>Social layer</h3>
                <p>
                  Players can walk past each other, inspect each plot, show off
                  skins, and compare total collected SOL and mints publicly.
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
      ) : null}

      {page === "economy" ? (
        <section className="economy-page">
          <div className="economy-hero">
            <div>
              <p className="eyebrow">Sustainable reward design</p>
              <h1>Economy Guardrails</h1>
              <p className="lede">
                Ore Acres is designed to survive both quiet launches and hype cycles
                by keeping SOL emissions tiny, reserve-backed, and automatically
                throttled. The game should sell fun, cosmetics, status, and social
                progression first. Mint rewards drive the mining loop, while SOL
                rewards remain a small bonus, not a fixed yield.
              </p>
              <div className="hero__actions">
                <button type="button" className="primary" onClick={() => goToPage("game")}>
                  Test the economy
                </button>
                <button type="button" className="ghost" onClick={() => goToPage("home")}>
                  Back to home
                </button>
              </div>
            </div>
            <aside className="economy-meter">
              <span className="landing-card__eyebrow">Current local model</span>
              <strong>{rewardReserveHealth}</strong>
              <p>
                Reserve: {game.rewardReserveSol.toFixed(4)} SOL •{" "}
                {Number.isFinite(rewardReserveRunwayDays)
                  ? `${rewardReserveRunwayDays.toFixed(1)} days runway`
                  : "no active drain"}
              </p>
              <div className="economy-meter__track" aria-hidden="true">
                <span style={{ width: `${Math.max(3, Math.min(100, emissionThrottle * 100))}%` }} />
              </div>
              <small>
                Throttle: {Math.round(emissionThrottle * 100)}%. When runway drops,
                rewards shrink before the reserve is damaged.
              </small>
            </aside>
          </div>

          <div className="economy-grid economy-grid--guards">
            {ECONOMY_GUARDS.map((guard) => (
              <article key={guard.title} className="economy-card">
                <span>{guard.title}</span>
                <strong>{guard.value}</strong>
                <p>{guard.copy}</p>
              </article>
            ))}
          </div>

          <div className="economy-split">
            <article className="economy-panel">
              <span className="landing-card__eyebrow">Why it can survive</span>
              <h2>Rewards cannot outrun reserves.</h2>
              <p>
                The current model uses three brakes at once: a protected reserve
                floor, hard payout caps, and runway-based throttling. If marketcap
                is low or purchases slow down, rewards automatically compress
                toward near-zero instead of draining the pool. If marketcap is high,
                new purchases can refill reserves, but caps still prevent players
                from extracting too much too quickly.
              </p>
              <div className="economy-proof-list">
                <span>Purchases fund reserves and sinks.</span>
                <span>Idle rewards are capped per day.</span>
                <span>Ore rewards are tiny, weighted, and time-gated.</span>
                <span>Marketplace fees add reserve support and token sinks.</span>
              </div>
            </article>

            <article className="economy-panel economy-panel--warning">
              <span className="landing-card__eyebrow">Important honesty</span>
              <h2>This is safer, not magic.</h2>
              <p>
                No token game should promise permanent profit. The sustainable
                version of Ore Acres is one where players buy status, convenience,
                cosmetics, pets, and plot expression, while SOL rewards remain
                small and reserve-limited. Before mainnet launch, the next step
                is moving reward accounting server-side so daily caps are enforced
                authoritatively per player and wallet.
              </p>
            </article>
          </div>

          <div className="economy-panel economy-panel--payments">
            <span className="landing-card__eyebrow">Payment structure</span>
            <h2>Test mint routing is now explicit.</h2>
            <p>
              Checkout quotes use the TestMint and split item payments across
              three owner wallets. The app derives associated token accounts for
              these wallets automatically during checkout, so the wallets can
              receive the mint without manually pasting token-account addresses.
            </p>
            <div className="payment-structure-grid">
              {PAYMENT_STRUCTURE.map((entry) => (
                <article key={entry.label} className="payment-structure-card">
                  <span>{entry.label}</span>
                  <strong>{entry.role}</strong>
                  <code>{entry.address}</code>
                  <small>{entry.split}</small>
                </article>
              ))}
            </div>
          </div>

          <div className="economy-grid economy-grid--stress">
            {ECONOMY_STRESS_TESTS.map((test) => (
              <article key={test.label} className="economy-card economy-card--stress">
                <span>{test.label}</span>
                <h3>{test.stress}</h3>
                <p>{test.response}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {page === "game" ? (
        <>
          <section className="game-topbar">
            <div>
              <p className="eyebrow">Game page</p>
              <h2>Ore Acres Online</h2>
              <p>{multiplayerStatus === "online" ? "Live shared world" : "Local preview mode"}</p>
            </div>
            <div className="game-topbar__actions">
              <button type="button" className="ghost" onClick={() => goToPage("home")}>
                Home
              </button>
              <button type="button" className="primary" onClick={resetWorld}>
                Reset
              </button>
            </div>
          </section>
        </>
      ) : null}

      {page === "game" ? (
        <section className="game-panel" ref={gamePanelRef}>
        <div className="stats">
          <div>
            <span>Idle SOL</span>
            <strong>{game.sol.toFixed(6)}</strong>
          </div>
          <div>
            <span>Pump.fun mint balance</span>
            <strong>{game.mints.toFixed(2)}</strong>
          </div>
          <div>
            <span>Checkout mode</span>
            <strong>{game.playtestMode ? "Playtest" : "Live"}</strong>
          </div>
          <div>
            <span>Mint income</span>
            <strong>{claimedPlotEconomy ? `${claimedPlotEconomy.income.toFixed(6)}/min` : "0.000000/min"}</strong>
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
            <span>Total minted</span>
            <strong>{game.stats.totalEarned.toFixed(6)}</strong>
          </div>
          <div>
            <span>Mining level</span>
            <strong>Lv. {game.miningLevel}</strong>
          </div>
          <div>
            <span>Mining XP</span>
            <strong>{game.miningXp.toFixed(0)}</strong>
          </div>
          <div className="stats__meter">
            <span>Reward reserve</span>
            <strong>{game.rewardReserveSol.toFixed(4)} SOL</strong>
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
            <span>Emission throttle</span>
            <strong>{Math.round(emissionThrottle * 100)}%</strong>
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
                WASD / arrows to move. Click ore, buildings, and chests inside the world.
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
              {devMode && walletPublicKey ? (
                <button type="button" className="ghost world-header__proof" onClick={signProof}>
                  Sign proof
                </button>
              ) : null}
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
            <div className="world-action-bar__spacer" />
            <button
              type="button"
              className={`ghost world-action-bar__utility ${game.playtestMode ? "active" : ""}`}
              onClick={togglePlaytestMode}
            >
              {game.playtestMode ? "Test On" : "Test Off"}
            </button>
            {game.playtestMode ? (
              <button type="button" className="ghost active world-action-bar__utility" onClick={() => grantPlaytestMints()}>
                +Mints
              </button>
            ) : null}
            <button type="button" className="ghost world-action-bar__utility" onClick={startTutorial}>
              Tutorial
            </button>
            <button
              type="button"
              className={`ghost world-action-bar__utility ${hideCharacter ? "active" : ""}`}
              onClick={toggleHideCharacter}
            >
              {hideCharacter ? "Show Char" : "Hide Char"}
            </button>
            <button
              type="button"
              className={`ghost world-action-bar__utility ${musicEnabled ? "active" : ""}`}
              onClick={toggleMusic}
            >
              {musicEnabled ? "Music On" : "Music Off"}
            </button>
            <button type="button" className="ghost world-action-bar__utility" onClick={resetWorld}>
              Reset
            </button>
            <div className="world-action-bar__zoom">
              <button type="button" className="ghost" onClick={() => changeZoom(-0.1)}>
                -
              </button>
              <button type="button" className="ghost" onClick={resetZoom}>
                {Math.round(cameraZoom * 100)}%
              </button>
              <button type="button" className="ghost" onClick={() => changeZoom(0.1)}>
                +
              </button>
            </div>
          </div>

          <div className="layout">
              <div
                className="world-viewport"
                ref={viewportRef}
                onWheel={handleWorldWheel}
              >
                <div
                  className="world-stage"
                  style={{
                    width: `${WORLD_WIDTH}px`,
                  height: `${WORLD_HEIGHT}px`,
                    transform: `translate(${camera.x}px, ${camera.y}px) scale(${cameraZoom})`,
                  }}
                >
                <div className="world-background__sky" />
                <div className="world-background" />
                <div className="world-fx world-fx--aurora" />
                <div className="world-fx world-fx--dust" />
                <div className="world-fx world-fx--sparkle" />
                <div className="world-paths" aria-hidden="true" />
                {WORLD_DECORATIONS.map((decoration, index) => (
                  <div
                    key={`${decoration.kind}-${index}`}
                    className={`world-landmark world-landmark--${decoration.kind}`}
                    style={{
                      left: `${decoration.x}px`,
                      top: `${decoration.y}px`,
                      transform: `translate(-50%, -50%) scale(${decoration.size})`,
                    }}
                    aria-hidden="true"
                  >
                    <span />
                    <i />
                    <b />
                  </div>
                ))}

                {regularPlots.map((plot) => {
                  const selected = plot.id === game.selectedPlotId;
                  const owned = Boolean(plot.owner?.me);
                  const claimed = Boolean(plot.owner && !plot.owner.me);
                  const plotEconomy = owned
                    ? computeEconomy(
                        plot,
                        game.activePet,
                        game.equippedPickaxeSkin,
                        game.equippedClothesSkin,
                        Math.max(1, Object.keys(remotePlayers).length + 1),
                        game.rewardReserveSol,
                      )
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
                          • {plot.totalCollectedSol.toFixed(6)} SOL total • {plot.totalCollectedMints.toFixed(2)} mints total
                        </span>
                      </div>

                      <div className="plot-zone__grid">
                        {Array.from({ length: TILE_COUNT }).map((_, y) =>
                          Array.from({ length: TILE_COUNT }).map((__, x) => {
                            const tile = tileKey(x, y);
                            const structureEntry = findStructureAtTile(plot, tile);
                            const structure = structureEntry?.structure ?? null;
                            const structureAnchorTile = structureEntry?.anchorTile ?? null;
                            const isStructureAnchor = structureAnchorTile === tile;
                            const structureFootprint = structure ? structureFootprintSize(structure.type) : 1;
                            const isReservedFootprintTile = Boolean(structure && !isStructureAnchor);
                            return (
                              <button
                                key={tile}
                                className={`plot-tile ${structure ? structure.type : "empty"} ${
                                  isReservedFootprintTile ? "plot-tile--reserved-footprint" : ""
                                }`}
                                draggable={Boolean(
                                  structure &&
                                    plot.owner?.me &&
                                    structure.type !== "chest",
                                )}
                                onMouseEnter={() => {
                                  if (
                                    !plot.owner?.me ||
                                    structure ||
                                    !canPlaceActiveTool ||
                                    !canFitStructureAt(plot, game.activeTool, tile)
                                  ) {
                                    return;
                                  }
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
                                        selectedTile: structureAnchorTile ?? tile,
                                        message:
                                          structure.type === "shack"
                                            ? "Pick a clear 2x2 space for the house."
                                            : "Pick an empty tile for the move.",
                                      }));
                                      return;
                                    }

                                    moveStructure(plot.id, game.moveSource.tile, tile);
                                    return;
                                  }

                                  if (structure) {
                                    setGame((current) => ({
                                      ...current,
                                      selectedTile: structureAnchorTile ?? tile,
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
                                  const movingStructure = plot.structures[game.moveSource.tile];
                                  if (
                                    game.moveSource.tile === tile ||
                                    !movingStructure ||
                                    !canFitStructureAt(plot, movingStructure.type, tile, game.moveSource.tile)
                                  ) {
                                    return;
                                  }

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
                                  event.dataTransfer.setData("text/plain", structureAnchorTile ?? tile);
                                  setGame((current) => ({
                                    ...current,
                                    selectedTile: structureAnchorTile ?? tile,
                                    moveSource: { plotId: plot.id, tile: structureAnchorTile ?? tile },
                                    message: `Drag ${structureLabel(structure)} to an empty tile.`,
                                  }));
                                }}
                                onDragOver={(event) => {
                                  if (!game.moveSource || !plot.owner?.me) return;
                                  event.preventDefault();
                                  if (!structure && canFitStructureAt(plot, game.moveSource ? plot.structures[game.moveSource.tile]?.type ?? game.activeTool : game.activeTool, tile, game.moveSource?.tile)) {
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

                                  const movingStructure = plot.structures[game.moveSource.tile];
                                  if (
                                    !movingStructure ||
                                    !canFitStructureAt(plot, movingStructure.type, tile, game.moveSource.tile)
                                  ) {
                                    setGame((current) => ({
                                      ...current,
                                      message:
                                        movingStructure?.type === "shack"
                                          ? "Drop onto a clear 2x2 space."
                                          : "Drop onto an empty tile.",
                                    }));
                                    return;
                                  }

                                  moveStructure(plot.id, game.moveSource.tile, tile);
                                }}
                              >
                                {isStructureAnchor && game.selectedTile === structureAnchorTile && structure ? <span className="plot-tile__ring" /> : null}
                                {placementPreview?.plotId === plot.id && placementPreview.tile === tile && !structure ? (
                                  <span className="plot-tile__preview" />
                                ) : null}
                                <span className="plot-tile__soil" />
                                {structure && isStructureAnchor ? (
                                  <div className={`plot-tile__sprite plot-tile__sprite--footprint-${structureFootprint}`}>
                                    <BuildingSprite type={structure.type} level={structure.level} opened={structure.opened} />
                                  </div>
                                ) : isReservedFootprintTile ? (
                                  <span className="plot-tile__reserved-mark" />
                                ) : (
                                  <span className="plot-tile__spark" />
                                )}
                                {plotEconomy && isStructureAnchor && structure?.type === "shack" ? (
                                  <span className="plot-tile__earnings">+{plotEconomy.income.toFixed(6)} mints/min</span>
                                ) : null}
                              </button>
                            );
                          }),
                        )}
                        {plot.oreNodes
                          .filter((node) => node.despawnAt > Date.now())
                          .map((node) => {
                            const tileX = Number(node.tile.split(":")[0]) || 0;
                            const tileY = Number(node.tile.split(":")[1]) || 0;
                            const isMining = node.miningUntil !== null && node.miningUntil > Date.now();
                            const scale = node.rarity === "large" ? 0.95 : node.rarity === "medium" ? 0.78 : 0.62;
                            return (
                              <button
                                key={node.id}
                                type="button"
                                className={`plot-zone__ore plot-zone__ore--${node.rarity} ${isMining ? "mining" : ""}`}
                                style={{
                                  left: `${((tileX + 0.5) / TILE_COUNT) * 100}%`,
                                  top: `${((tileY + 0.5) / TILE_COUNT) * 100}%`,
                                  ["--ore-scale" as string]: scale.toString(),
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startMiningOre(plot.id, node.id);
                                }}
                                aria-label={`${isMining ? "Mining" : "Mine"} ${oreNodeDisplayLabel(node.rarity)}`}
                              >
                                <span className="plot-zone__ore-glow" />
                                {isMining ? (
                                  <span className="plot-zone__ore-impact" aria-hidden="true">
                                    <i />
                                    <i />
                                    <i />
                                  </span>
                                ) : null}
                                <img
                                  src={ORE_ART[node.rarity]}
                                  alt=""
                                  className="plot-zone__ore-image"
                                  draggable={false}
                                />
                                <strong>{oreNodeDisplayLabel(node.rarity)}</strong>
                                <small>{isMining ? "Mining..." : `Tap to mine +${node.reward.toFixed(6)} SOL`}</small>
                              </button>
                            );
                          })}
                        {Object.entries(plot.structures)
                          .filter(([, structure]) => structure.type === "drone")
                          .map(([tile, structure]) => {
                            const activeDroneNode = plot.oreNodes.find(
                              (node) =>
                                droneTileFromMinerTag(node.miningBy) === tile &&
                                node.miningUntil !== null &&
                                node.miningUntil > Date.now(),
                            );
                            const homePosition = tileWorldPosition(plot, tile);
                            const targetPosition = activeDroneNode
                              ? oreNodeWorldPosition(plot, activeDroneNode)
                              : homePosition;
                            const targetPercent = activeDroneNode
                              ? tilePercentPosition(activeDroneNode.tile)
                              : tilePercentPosition(tile);
                            const direction = activeDroneNode
                              ? droneDirection(homePosition, targetPosition)
                              : "down";

                            return (
                              <div
                                key={`drone-agent-${tile}`}
                                className={`plot-zone__drone-agent ${activeDroneNode ? "mining" : ""}`}
                                style={{
                                  left: targetPercent.left,
                                  top: targetPercent.top,
                                }}
                                aria-hidden="true"
                              >
                                <MinerDroneSprite
                                  direction={direction}
                                  mining={Boolean(activeDroneNode)}
                                  targetKey={activeDroneNode?.id ?? tile}
                                  mode="world"
                                />
                                <span className="plot-zone__drone-label">
                                  {activeDroneNode ? "AUTO-MINING" : structureLabel(structure)}
                                </span>
                              </div>
                            );
                          })}
                        {plot.owner?.me ? (
                          <button
                            type="button"
                            className="plot-zone__town-portal"
                            onClick={(event) => {
                              event.stopPropagation();
                              warpToTown();
                            }}
                          >
                            Return to Town
                          </button>
                        ) : null}
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

                      <div className="plot-zone__badge">
                        Lifetime: {plot.totalCollectedSol.toFixed(6)} SOL • {plot.totalCollectedMints.toFixed(2)} mints
                      </div>
                    </div>
                  );
                })}

                {townPlot ? (
                  <div
                    className={`plot-zone plot-zone--town-scene ${game.selectedPlotId === townPlot.id ? "selected" : ""}`}
                    style={{
                      left: `${townPlot.position.x}px`,
                      top: `${townPlot.position.y}px`,
                      width: `${TOWN_PLOT_SIZE}px`,
                      height: `${TOWN_PLOT_SIZE}px`,
                    }}
                    onClick={() => selectPlot(townPlot.id)}
                  >
                    <div className="plot-zone__aura plot-zone__aura--hub" />
                    <div className="plot-zone__header">
                      <strong>{townPlot.name}</strong>
                      <span>Live town area built from your toolbox layout</span>
                    </div>

                    <img className="town-scene__background" src="/assets/town/Background.png" alt="" aria-hidden="true" />
                    {townPlacements.map((placement) => {
                      const asset = TOWN_ASSET_BY_ID[placement.assetId];
                      const npcId = TOWN_ASSET_TO_NPC[placement.assetId];
                      const width = asset.width * placement.scale;
                      const height = asset.height * placement.scale;
                      const isInteractive = Boolean(npcId);
                      return (
                        <button
                          key={`town-live-${placement.id}`}
                          type="button"
                          className={`town-scene__placement ${isInteractive ? "town-scene__placement--interactive" : ""} town-scene__placement--${asset.category}`}
                          style={{
                            left: `${placement.x}%`,
                            top: `${placement.y}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                            zIndex: placement.zIndex,
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!npcId) return;
                            selectPlot(townPlot.id);
                            openNpcDialogue(npcId);
                          }}
                          aria-label={isInteractive ? `Talk to ${asset.label}` : asset.label}
                        >
                          <img src={asset.src} alt="" aria-hidden="true" />
                          {isInteractive ? <span className="town-scene__speech">{asset.label}</span> : null}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className="town-scene__portal town-scene__portal--mine"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectPlot(mineAreaPlot?.id ?? townPlot.id);
                      }}
                    >
                      Mining Area
                    </button>

                    {game.claimedPlotId ? (
                      <button
                        type="button"
                        className="town-scene__portal town-scene__portal--home"
                        onClick={(event) => {
                          event.stopPropagation();
                          warpToClaimedPlot();
                        }}
                      >
                        Home Portal
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="town-scene__portal town-scene__portal--home"
                        onClick={(event) => {
                          event.stopPropagation();
                          buyStarterPlot();
                        }}
                      >
                        Buy Plot
                      </button>
                    )}

                    {townPlacements.length === 0 ? (
                      <div className="town-scene__empty">Drop town assets in the editor below to build the town.</div>
                    ) : null}

                    <div className="plot-zone__badge">Town hub • your saved layout is now the live town</div>
                  </div>
                ) : null}

                {mineAreaPlot ? (
                  <div
                    className={`plot-zone plot-zone--hub plot-zone--mine ${game.selectedPlotId === mineAreaPlot.id ? "selected" : ""}`}
                    style={{
                      left: `${mineAreaPlot.position.x}px`,
                      top: `${mineAreaPlot.position.y}px`,
                      width: `${PLOT_SIZE}px`,
                      height: `${PLOT_SIZE}px`,
                    }}
                    onClick={() => selectPlot(mineAreaPlot.id)}
                  >
                    <div className="plot-zone__aura plot-zone__aura--hub" />
                    <div className="plot-zone__header">
                      <strong>{mineAreaPlot.name}</strong>
                      <span>Shared ore field • no plots, just mining</span>
                    </div>

                    <div className="plot-zone__grid plot-zone__grid--hub plot-zone__grid--mine">
                      {Array.from({ length: TILE_COUNT }).map((_, y) =>
                        Array.from({ length: TILE_COUNT }).map((__, x) => (
                          <span
                            key={`mine-tile-${x}-${y}`}
                            className={`public-hub__tile public-hub__tile--${(x + y) % 2 === 0 ? "a" : "b"}`}
                            style={{
                              left: `${((x + 0.5) / TILE_COUNT) * 100}%`,
                              top: `${((y + 0.5) / TILE_COUNT) * 100}%`,
                            }}
                            aria-hidden="true"
                          />
                        )),
                      )}

                      <span className="public-hub__ring public-hub__ring--mine" aria-hidden="true" />
                      <span className="public-hub__path public-hub__path--left" aria-hidden="true" />
                      <span className="public-hub__path public-hub__path--right" aria-hidden="true" />
                      <span className="public-hub__stage public-hub__stage--mine" aria-hidden="true" />

                      {mineOreNodes
                        .filter((node) => node.despawnAt > Date.now())
                        .map((node) => {
                          const tileX = Number(node.tile.split(":")[0]) || 0;
                          const tileY = Number(node.tile.split(":")[1]) || 0;
                          const isMining = node.miningUntil !== null && node.miningUntil > Date.now();
                          const scale = node.rarity === "large" ? 0.95 : node.rarity === "medium" ? 0.78 : 0.62;
                          return (
                            <button
                              key={`mine-${node.id}`}
                              type="button"
                              className={`plot-zone__ore plot-zone__ore--${node.rarity} public-hub__ore ${isMining ? "mining" : ""}`}
                              style={{
                                left: `${((tileX + 0.5) / TILE_COUNT) * 100}%`,
                                top: `${((tileY + 0.5) / TILE_COUNT) * 100}%`,
                                ["--ore-scale" as string]: scale.toString(),
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                startMiningOre(mineAreaPlot.id, node.id);
                              }}
                              aria-label={`${isMining ? "Mining" : "Mine"} ${oreNodeDisplayLabel(node.rarity)}`}
                            >
                              <span className="plot-zone__ore-glow" />
                              {isMining ? (
                                <span className="plot-zone__ore-impact" aria-hidden="true">
                                  <i />
                                  <i />
                                  <i />
                                </span>
                              ) : null}
                              <img
                                src={ORE_ART[node.rarity]}
                                alt=""
                                className="plot-zone__ore-image"
                                draggable={false}
                              />
                              <strong>{oreNodeDisplayLabel(node.rarity)}</strong>
                              <small>{isMining ? "Mining..." : `Tap to mine +${node.reward.toFixed(6)} SOL`}</small>
                            </button>
                          );
                        })}
                    </div>

                    <div className="plot-zone__badge">Shared ore field • no plots here</div>
                  </div>
                ) : null}

                {!hideCharacter ? (
                  <div
                    className="avatar-anchor"
                    style={{
                      left: `${game.avatar.x}px`,
                      top: `${game.avatar.y}px`,
                    }}
                  >
                    <AvatarSprite
                      moving={moving}
                      mining={Boolean(activeMiningOre)}
                      facing={miningFacing}
                      avatarStyle={game.avatarStyle}
                      pickaxeSkin={game.equippedPickaxeSkin}
                      clothesSkin={game.equippedClothesSkin}
                    />
                    {game.activePet ? (
                      <div className={`avatar-pet avatar-pet--${petSide}`}>
                        <PetSprite type={game.activePet} />
                      </div>
                    ) : null}
                  </div>
                ) : null}

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
                    <AvatarSprite
                      moving={false}
                      variant="remote"
                      avatarStyle={player.avatarStyle ?? AVATAR_STYLE_DEFAULT}
                      pickaxeSkin={player.equippedPickaxeSkin}
                      clothesSkin={player.equippedClothesSkin}
                    />
                    <span className="remote-avatar__name">{player.name}</span>
                  </div>
                ))}

                {buildablePlotUnderAvatar && !buildablePlotUnderAvatar.owner?.me ? (
                  <div
                    className="plot-prompt"
                    style={{
                      left: `${buildablePlotUnderAvatar.position.x + PLOT_SIZE / 2}px`,
                      top: `${buildablePlotUnderAvatar.position.y + PLOT_HEADER_HEIGHT + 28}px`,
                    }}
                  >
                    <span>
                      {buildablePlotUnderAvatar.owner ? `${buildablePlotUnderAvatar.owner.label}'s plot` : "Unclaimed plot"}
                    </span>
                    {!buildablePlotUnderAvatar.owner && !game.claimedPlotId ? (
                      <button type="button" className="primary" onClick={claimSelectedPlot}>
                        Claim plot
                      </button>
                    ) : null}
                  </div>
                ) : null}

              </div>

              <div className="world-hud">
                <div className="world-hud__topline">
                  <span className={`world-hud__status world-hud__status--${multiplayerStatus}`}>
                    {multiplayerStatus === "online"
                      ? `${Object.keys(remotePlayers).length} others online`
                      : multiplayerStatus === "connecting"
                        ? "Connecting to multiplayer"
                        : "Offline preview"}
                  </span>
                  <span className="world-hud__objective">{worldObjective}</span>
                </div>
                <div className="world-hud__meta">
                  <span>Mining Lv. {game.miningLevel}</span>
                  <span>{game.miningXp.toFixed(0)} XP</span>
                  <span>{game.claimedPlotId ? "Plot claimed" : "No plot yet"}</span>
                </div>
                {activeMiningOre ? (
                  <div
                    className={`world-hud__mining world-hud__mining--${activeMiningOre.node.rarity}`}
                    style={{ ["--mining-progress" as string]: activeMiningProgress.toString() }}
                  >
                    <div className="world-hud__mining-meta">
                      <span>Mining {oreNodeDisplayLabel(activeMiningOre.node.rarity)}</span>
                      <strong>{formatMiningTime(activeMiningRemainingMs)} left</strong>
                    </div>
                    <div className="world-hud__mining-track" aria-hidden="true">
                      <span />
                    </div>
                  </div>
                ) : null}
                <strong>{game.message}</strong>
                <div className="world-hud__minimap">
                  <div className="world-hud__minimap-head">
                    <span>Minimap</span>
                    <small>{selectedPlotLabel}</small>
                  </div>
                  <div className="world-hud__minimap-map" aria-label="World minimap">
                    {minimapEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={`world-hud__minimap-zone world-hud__minimap-zone--${entry.kind} ${
                          entry.selected ? "selected" : ""
                        } ${entry.owned ? "owned" : ""}`}
                        style={{
                          left: `${entry.left}%`,
                          top: `${entry.top}%`,
                          width: `${Math.max(3, entry.width)}%`,
                          height: `${Math.max(3, entry.height)}%`,
                        }}
                        onClick={() => selectPlot(entry.id)}
                        aria-label={`Select ${entry.label}`}
                      />
                    ))}
                    <span
                      className="world-hud__minimap-player"
                      style={{
                        left: `${(game.avatar.x / Math.max(1, WORLD_WIDTH)) * 100}%`,
                        top: `${(game.avatar.y / Math.max(1, WORLD_HEIGHT)) * 100}%`,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <div className="world-inspector">
                <div className="world-inspector__row">
                  <span>{selectedPlot.kind === "plot" ? "Plot" : "Area"}</span>
                  <strong>{selectedPlotLabel}</strong>
                </div>
                <div className="world-inspector__row">
                  <span>Owner</span>
                  <strong>
                    {selectedPlot.kind === "town"
                      ? "Starter town"
                      : selectedPlot.kind === "mine"
                        ? "Shared mining field"
                      : selectedPlot.owner
                        ? selectedPlot.owner.me
                          ? "You"
                          : selectedPlot.owner.label
                        : "Unclaimed"}
                  </strong>
                </div>
                <div className="world-inspector__row">
                  <span>Tile</span>
                  <strong>{selectedPlot.kind === "plot" ? game.selectedTile ?? "None" : "Area map"}</strong>
                </div>
                <div className="world-inspector__row">
                  <span>Tool</span>
                  <strong>{structureLabel({ type: game.activeTool, level: 1 })}</strong>
                </div>
                {selectedPlot.kind !== "plot" ? (
                  <div className="world-inspector__note">
                    {selectedPlot.kind === "town"
                      ? "This is the starter town. Talk to NPCs here to buy a plot, check your bank, or go home."
                      : "This is the shared mining field. Ore spawns here for everyone and no plots can be claimed."}
                  </div>
                ) : null}
                {selectedChest && selectedPlot.kind === "plot" ? (
                  <div className="world-inspector__note">
                    Huge chest ready. Click it to reveal the reward.
                  </div>
                ) : null}
                {selectedStructure && selectedPlot.kind === "plot" ? (
                  <div className="world-inspector__upgrade">
                    <span>
                      {selectedStructure.level >= (selectedStructureMax ?? 0)
                        ? "Max level reached"
                        : `${structureLabel(selectedStructure)} -> Lv.${selectedStructure.level + 1}`}
                    </span>
                    <small className="inspector-note">
                      {structureEffectSummary(selectedStructure.type, selectedStructure.level)}
                    </small>
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
              
              <div className={`inventory-overlay ${game.inventoryOpen ? "inventory-overlay--open" : "inventory-overlay--collapsed"}`}>
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
                                  message: `${structureLabel(structure ?? { type, level: 1 })} selected.`,
                                }));
                              }}
                            >
                              <div className="inventory-item__icon">
                                <StructureShopArt type={type} className="item-art--inventory" />
                              </div>
                              <div className="inventory-item__meta">
                                <strong>{structureLabel(structure ?? { type, level: 1 })}</strong>
                                <span>{structureEffectSummary(type, structure?.level ?? 1)}</span>
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

                      <div className="overlay-panel__subhead">Character</div>
                      <div className="character-customizer">
                        <div className="character-customizer__preview">
                          <AvatarSprite
                            moving
                            facing="down"
                            avatarStyle={game.avatarStyle}
                            pickaxeSkin={game.equippedPickaxeSkin}
                            clothesSkin={game.equippedClothesSkin}
                          />
                          <span>Live miner preview</span>
                        </div>
                        <div className="character-customizer__groups">
                          <div className="character-customizer__group">
                            <strong>Skin</strong>
                            <div className="character-customizer__options">
                              {(Object.entries(AVATAR_SKIN_TONES) as Array<[AvatarSkinTone, typeof AVATAR_SKIN_TONES[AvatarSkinTone]]>).map(([id, option]) => (
                                <button
                                  key={id}
                                  type="button"
                                  className={`swatch-button ${game.avatarStyle.skinTone === id ? "active" : ""}`}
                                  onClick={() => updateAvatarStyle({ skinTone: id })}
                                >
                                  <span style={{ background: `linear-gradient(180deg, ${option.base}, ${option.shade})` }} />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="character-customizer__group">
                            <strong>Hair</strong>
                            <div className="character-customizer__options">
                              {(Object.entries(AVATAR_HAIR_COLORS) as Array<[AvatarHairColor, typeof AVATAR_HAIR_COLORS[AvatarHairColor]]>).map(([id, option]) => (
                                <button
                                  key={id}
                                  type="button"
                                  className={`swatch-button ${game.avatarStyle.hairColor === id ? "active" : ""}`}
                                  onClick={() => updateAvatarStyle({ hairColor: id })}
                                >
                                  <span style={{ background: `linear-gradient(180deg, ${option.base}, ${option.shade})` }} />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="character-customizer__group">
                            <strong>Fit</strong>
                            <div className="character-customizer__options">
                              {(Object.entries(AVATAR_BASE_OUTFITS) as Array<[AvatarBaseOutfit, typeof AVATAR_BASE_OUTFITS[AvatarBaseOutfit]]>).map(([id, option]) => (
                                <button
                                  key={id}
                                  type="button"
                                  className={`swatch-button ${game.avatarStyle.baseOutfit === id ? "active" : ""}`}
                                  onClick={() => updateAvatarStyle({ baseOutfit: id })}
                                >
                                  <span style={{ background: `linear-gradient(180deg, ${option.base}, ${option.shade})` }} />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
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
                                      if (active) {
                                        unequipSkin(skin.category);
                                      } else {
                                        equipSkin(skin.id);
                                      }
                                    }}
                                    disabled={count <= 0}
                                  >
                                    {active ? "Unequip" : "Equip"}
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
                                <span>{structureEffectSummary(type)}</span>
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

              {npcDialogueState ? (
                <div className="npc-dialogue">
                  <div className="npc-dialogue__panel">
                    <span className="overlay-panel__eyebrow">Town talk</span>
                    <strong>{npcDialogueState.title}</strong>
                    <small>{npcDialogueState.subtitle}</small>
                    <p>{npcDialogueState.text}</p>
                    <div className="npc-dialogue__actions">
                      <button type="button" className="ghost" onClick={npcDialogueState.secondaryAction}>
                        {npcDialogueState.secondaryLabel}
                      </button>
                      <button type="button" className="primary" onClick={npcDialogueState.primaryAction}>
                        {npcDialogueState.primaryLabel}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {game.shopOpen ? (
                <div className="shop-overlay open">
                  <div className="overlay-panel overlay-panel--shop">
                    <div className="overlay-panel__header">
                      <div>
                        <span className="overlay-panel__eyebrow">Build shop</span>
                        <strong>Buy and place</strong>
                        <p className="overlay-panel__support">
                          {game.playtestMode
                            ? "Playtest checkout is enabled. Purchases use local test mints only."
                            : "Live checkout mode uses the Pump.fun mint payment flow."}
                        </p>
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
                      {SHOP_FILTERS.map((category) => (
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
                                <span>{structureEffectSummary(item.id)}</span>
                                <span>{purchaseDisplayLabel(item.cost, game.playtestMode)}</span>
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
                                <span>{owned ? "Owned" : purchaseDisplayLabel(skin.cost, game.playtestMode)}</span>
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
                                <span>{owned ? "Owned" : purchaseDisplayLabel(pet.cost, game.playtestMode)}</span>
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
                <div
                  className="market-overlay open"
                  onClick={() =>
                    setGame((current) => ({
                      ...current,
                      marketOpen: false,
                    }))
                  }
                >
                  <div className="market-shell" onClick={(event) => event.stopPropagation()}>
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

              <audio
                ref={tutorialAudioRef}
                src={TUTORIAL_VOICEOVER_SRC}
                preload="metadata"
                onCanPlay={() => setTutorialAudioStatus("ready")}
                onError={() => setTutorialAudioStatus("missing")}
                onEnded={() => setTutorialAudioStatus("ready")}
              />

              {tutorialOpen ? (
                <div className={`tutorial-coach tutorial-coach--${tutorialStep.panel}`}>
                  <div className="tutorial-coach__progress">
                    {TUTORIAL_STEPS.map((step, index) => (
                      <span
                        key={step.id}
                        className={index <= tutorialStepIndex ? "active" : ""}
                        aria-label={`Tutorial step ${index + 1}`}
                      />
                    ))}
                  </div>
                  <div className="tutorial-coach__head">
                    <span>{tutorialStep.eyebrow}</span>
                    <strong>{tutorialStep.title}</strong>
                  </div>
                  <p>{tutorialStep.body}</p>
                  <div className="tutorial-coach__objective">
                    <span>Do this</span>
                    <strong>{tutorialStep.objective}</strong>
                  </div>
                  <div className="tutorial-coach__voice">
                    <span>Voiceover line</span>
                    <p>{tutorialStep.voiceLine}</p>
                    <div className="tutorial-coach__voice-actions">
                      <button type="button" className="ghost" onClick={playTutorialVoiceover}>
                        {tutorialAudioStatus === "playing" ? "Replay VO" : "Play VO"}
                      </button>
                      <small>
                        {tutorialAudioStatus === "missing"
                          ? "Drop tutorial-voiceover.mp3 into public/audio to enable playback."
                          : `Cue starts at ${tutorialStep.voiceStart}s.`}
                      </small>
                    </div>
                  </div>
                  <div className="tutorial-coach__actions">
                    <button type="button" className="ghost" onClick={previousTutorialStep} disabled={tutorialStepIndex === 0}>
                      Back
                    </button>
                    <button type="button" className="ghost" onClick={completeTutorial}>
                      Skip
                    </button>
                    <button type="button" className="primary" onClick={nextTutorialStep}>
                      {tutorialStepIndex >= TUTORIAL_STEPS.length - 1 ? "Finish" : "Next"}
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

              {game.mineReveal ? (
                <div className="mine-reveal">
                  <div className={`mine-reveal__panel mine-reveal__panel--${game.mineReveal.kind}`}>
                    <span className="overlay-panel__eyebrow">Mining reward</span>
                    <strong>{game.mineReveal.label}</strong>
                    <p>{game.mineReveal.detail}</p>
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        setGame((current) => ({
                          ...current,
                          mineReveal: null,
                        }))
                      }
                    >
                      Close
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

function getBuildablePlotByPoint(point: { x: number; y: number }, plots: Record<string, Plot>) {
  return Object.values(plots).find((plot) =>
    plot.kind === "plot" &&
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
  const tileX = Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(localX / (PLOT_SIZE / TILE_COUNT))));
  const tileY = Math.max(0, Math.min(TILE_COUNT - 1, Math.floor(localY / (PLOT_SIZE / TILE_COUNT))));
  return tileKey(tileX, tileY);
}

export default App;
