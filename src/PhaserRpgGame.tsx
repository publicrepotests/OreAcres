import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Phaser from "phaser";
import {
  APPEARANCES,
  BEARD_STYLES,
  COLLECTION_ITEMS,
  DYES,
  DUNGEON_PORTALS,
  ENEMIES,
  EXPEDITIONS,
  FACE_STYLES,
  GEAR_DYES,
  HAIR_COLORS,
  HAIR_STYLES,
  NPCS,
  NPC_PORTRAIT_FRAMES,
  QUEST_STEPS,
  RECIPES,
  REGIONS,
  REGION_COMPLETION_BONUS_GOLD,
  REGION_DISCOVERY_REWARD_GOLD,
  RESOURCES,
  SHOP_ITEMS,
  SKILL_TREE_NODES,
  SKILLS,
  SKIN_TONES,
  TREASURE_CLUES,
  WAYSTONES,
  WORLD,
  customizationForAppearance,
  guildRankForRenown,
  itemById,
  nextSkillUnlock,
  nextGuildRankForRenown,
  skillTreePointTotal,
  skillTreePointsAvailable,
  unlockedTreeAbilities,
  weaponAbility,
  xpForLevel,
  type AppearanceId,
  type CharacterCustomization,
  type CombatStyle,
  type Direction,
  type ItemDefinition,
  type Panel,
  type PlayerProgress,
  type QuestStepDefinition,
} from "./rpg/gameData";
import {
  OrehavenScene,
  type ChatMessage,
  type CombatAbilitySlot,
  type HotbarEntry,
  type DialogueState,
  type GameToast,
  type HudState,
  type OnlineAdventurer,
  type SkillLevelEvent,
  type SocialState,
  type TargetState,
} from "./rpg/OrehavenScene";
import { HeroPortrait } from "./rpg/HeroPortrait";
import { GameAudioEngine } from "./rpg/gameAudio";
import { loadPlayerProgress, playerDisplayName, savePlayerProgress } from "./rpg/playerStorage";
import {
  ACTIVITY_MILESTONES,
  activityContractCount,
  DAILY_CONTRACTS,
  normalizeActivityProgress,
  type ActivityProgress,
  type LifetimeActivityStats,
} from "./rpg/activityProgress";
import { tutorialMilestoneComplete } from "./rpg/tutorialProgress";
import { ADVENTURE_CHRONICLES, adventureProgress } from "./rpg/adventureProgress";
import { worldTimeAt } from "./rpg/worldTime";
import { SIDE_QUESTS } from "./rpg/sideQuestProgress";
import lootRules from "./rpg/lootRules.json";
import "./phaserRpgGame.css";

type GameApi = {
  interact: () => void;
  engageTarget: () => void;
  equip: (itemId: string) => void;
  buy: (itemId: string) => void;
  sell: (itemId: string) => void;
  consume: (itemId: string) => void;
  sideQuestAction: (questId: string) => void;
  deposit: (itemId: string) => void;
  withdraw: (itemId: string) => void;
  craft: (recipeId: string) => void;
  claimContract: (contractId: string) => void;
  claimAdventure: (adventureId: string) => void;
  setAppearance: (appearance: AppearanceId) => void;
  setCustomization: (customization: CharacterCustomization) => void;
  setDisplayName: (displayName: string) => void;
  centerCamera: () => void;
  navigateToQuestTarget: () => void;
  adjustCameraZoom: (delta: number) => void;
  sendChat: (text: string, channel?: "world" | "party" | "guild") => void;
  inviteToParty: (targetPlayerId: string) => void;
  respondToPartyInvite: (accept: boolean) => void;
  leaveParty: () => void;
  createGuild: (name: string, tag: string) => void;
  inviteToGuild: (targetPlayerId: string) => void;
  respondToGuildInvite: (accept: boolean) => void;
  leaveGuild: () => void;
  startExpedition: (expeditionId: string) => void;
  startTreasureTrail: () => void;
  travelToWaystone: (waystoneId: string) => void;
  setInputPaused: (paused: boolean) => void;
  cancelAction: () => void;
  useAbility: (slot: CombatAbilitySlot) => void;
  setHotbar: (layout: Array<HotbarEntry | null>) => void;
  unlockSkill: (nodeId: string) => void;
  respecSkills: () => void;
};

type ToastEntry = GameToast & { id: number };

type TutorialStep = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  objective: string;
  manual?: boolean;
};

type TutorialVoiceManifest = {
  enabled?: boolean;
  files?: Record<string, string>;
};

const TUTORIAL_SAVE_KEY = "ore-acres-rpg-tutorial-v1";
const ONBOARDING_SAVE_KEY = "ore-acres-rpg-onboarding-v1";
const HOTBAR_SAVE_KEY = "ore-acres-rpg-hotbar-v1";
const HUD_LAYOUT_SAVE_KEY = "ore-acres-rpg-hud-layout-v1";
type HudWidgetId = "status" | "objectives" | "chat" | "minimap" | "menu" | "target" | "actionbar";
type HudWidgetConfig = { x: number; y: number; scale: number; visible: boolean };
const HUD_WIDGETS: ReadonlyArray<{ id: HudWidgetId; label: string }> = [
  { id: "status", label: "Player status" },
  { id: "objectives", label: "Quest tracker" },
  { id: "chat", label: "World chat" },
  { id: "minimap", label: "Minimap" },
  { id: "menu", label: "Menu bar" },
  { id: "target", label: "Target frame" },
  { id: "actionbar", label: "Action bar" },
];
const DEFAULT_HUD_LAYOUT: Record<HudWidgetId, HudWidgetConfig> = Object.fromEntries(
  HUD_WIDGETS.map(({ id }) => [id, { x: 0, y: 0, scale: 1, visible: true }]),
) as Record<HudWidgetId, HudWidgetConfig>;

function normalizeHudLayout(value: unknown): Record<HudWidgetId, HudWidgetConfig> {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<Record<HudWidgetId, Partial<HudWidgetConfig>>> : {};
  return Object.fromEntries(HUD_WIDGETS.map(({ id }) => {
    const saved = candidate[id];
    return [id, {
      x: Math.max(-900, Math.min(900, Number(saved?.x) || 0)),
      y: Math.max(-600, Math.min(600, Number(saved?.y) || 0)),
      scale: Math.max(0.65, Math.min(1.4, Number(saved?.scale) || 1)),
      visible: saved?.visible !== false,
    }];
  })) as Record<HudWidgetId, HudWidgetConfig>;
}

function loadHudLayout() {
  try {
    return normalizeHudLayout(JSON.parse(window.localStorage.getItem(HUD_LAYOUT_SAVE_KEY) ?? "null"));
  } catch {
    return normalizeHudLayout(null);
  }
}
const DEFAULT_HOTBAR_LAYOUT: Array<HotbarEntry | null> = [
  { kind: "ability", slot: "signature" },
  { kind: "ability", slot: "second-wind" },
  { kind: "consumable", itemId: "trout" },
  { kind: "ability", slot: "tree-primary" },
  { kind: "ability", slot: "tree-secondary" },
];

function normalizeHotbarLayout(value: unknown): Array<HotbarEntry | null> {
  if (!Array.isArray(value)) return DEFAULT_HOTBAR_LAYOUT.map((entry) => entry ? { ...entry } : null);
  return Array.from({ length: 5 }, (_, index) => {
    const entry = value[index];
    if (!entry || typeof entry !== "object") return null;
    if (entry.kind === "ability" && ["signature", "second-wind", "tree-primary", "tree-secondary"].includes(entry.slot)) {
      return { kind: "ability", slot: entry.slot as CombatAbilitySlot };
    }
    if (entry.kind === "consumable" && typeof entry.itemId === "string" && itemById(entry.itemId)?.category === "consumable") {
      return { kind: "consumable", itemId: entry.itemId };
    }
    return null;
  });
}

function loadHotbarLayout() {
  try {
    return normalizeHotbarLayout(JSON.parse(window.localStorage.getItem(HOTBAR_SAVE_KEY) ?? "null"));
  } catch {
    return normalizeHotbarLayout(null);
  }
}

function hotbarEntryKey(entry: HotbarEntry | null) {
  return entry ? `${entry.kind}:${entry.kind === "ability" ? entry.slot : entry.itemId}` : "empty";
}
const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: "welcome", eyebrow: "WELCOME TO OREHAVEN", title: "Your adventure begins", body: "This short guide follows your real actions and stays out of the way while you play.", objective: "Begin the field guide", manual: true },
  { id: "move", eyebrow: "MOVEMENT", title: "Walk the old roads", body: "Use WASD or the arrow keys. You can also click a clear point in the world to walk there automatically.", objective: "Move a short distance" },
  { id: "mira", eyebrow: "INTERACTION", title: "Meet the Guild Guide", body: "Approach Mira beside the fountain, then press E or click her to begin Orehaven's first quest.", objective: "Speak with Mira" },
  { id: "inventory", eyebrow: "INVENTORY", title: "Know what you carry", body: "Equipment, materials, food, and rare drops all live in your inventory. Items show their requirements and power comparison.", objective: "Open Inventory with I" },
  { id: "map", eyebrow: "WORLD MAP", title: "Chart the frontier", body: "The map tracks quests, party members, discoveries, world events, and every waystone you attune.", objective: "Open the World Map with M" },
  { id: "gather", eyebrow: "GATHERING", title: "Work the land", body: "Walk to a resource and interact. Mining, woodcutting, and fishing continue automatically until the action completes.", objective: "Complete any gathering action" },
  { id: "combat", eyebrow: "COMBAT", title: "Defend the roads", body: "Select a hostile creature to attack. Your weapon determines melee, ranged, or magic style; press 1 for its signature skill.", objective: "Defeat a creature or earn combat XP" },
  { id: "complete", eyebrow: "FIELD GUIDE COMPLETE", title: "Choose your own path", body: "Follow quests, master professions, hunt rare drops, join parties and guilds, or complete the entire Adventurer Codex.", objective: "Claim your adventurer's freedom", manual: true },
];

const MENU_ITEMS: Array<{ panel: Exclude<Panel, null>; label: string; hotkey: string }> = [
  { panel: "inventory", label: "Inventory", hotkey: "I" },
  { panel: "equipment", label: "Equipment", hotkey: "G" },
  { panel: "skills", label: "Skills", hotkey: "K" },
  { panel: "quests", label: "Quests", hotkey: "Q" },
  { panel: "activities", label: "Activities", hotkey: "J" },
  { panel: "social", label: "Party", hotkey: "P" },
  { panel: "shop", label: "Shops", hotkey: "B" },
  { panel: "map", label: "World Map", hotkey: "M" },
];

const LOCATION_SUBTITLES: Record<string, string> = {
  "Orehaven Square": "Heart of the frontier realm",
  Orehaven: "Walls, workshops, and wayfarers",
  "Western Woods": "Old timber beneath a restless canopy",
  "Moonwater Pond": "Quiet waters and patient anglers",
  "Eastern Quarry": "Stone, ore, and ringing steel",
  "Goblin Camp": "Hostile ground beyond the eastern road",
  Southroad: "The trail into untamed Briarwild",
  "Briarwild Crossing": "Where Orehaven's protection ends",
  "Moonfen Marsh": "Cold lights drift over black water",
  "Briarwild Ranger Camp": "A hard-won frontier foothold",
  "Raider Dens": "Axes stir behind the thorn wall",
  "Old Sun Shrine": "Ancient stone remembers the dawn",
};

function MenuGlyph({ panel }: { panel: Exclude<Panel, null> }) {
  const paths: Record<Exclude<Panel, null>, React.ReactNode> = {
    inventory: <><path d="M7 8h10l2 12H5L7 8Z" /><path d="M9 8V6c0-3 6-3 6 0v2" /></>,
    equipment: <><path d="m5 4 6 6-2 2-6-6V3h3Z" /><path d="m19 4-7 7" /><path d="m14 13 6 6" /><path d="m12 16-7 4 4-7" /></>,
    skills: <><path d="m12 3 2.2 5.2L20 10l-4.5 3.5.2 5.8L12 16l-3.7 3.3.2-5.8L4 10l5.8-1.8L12 3Z" /><path d="M12 8v5" /></>,
    quests: <><path d="M7 4h10v16H7Z" /><path d="M9 8h6M9 12h6M9 16h4" /><path d="M5 6h2m10 12h2" /></>,
    activities: <><path d="M5 5h14v15H5Z" /><path d="M8 3v4m8-4v4M8 11l2 2 4-4M8 17h7" /></>,
    social: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20c0-4 2-7 6-7s6 3 6 7M15 15c3 0 5 2 5 5" /></>,
    shop: <><path d="M4 9h16l-2-5H6L4 9Z" /><path d="M6 9v11h12V9M9 20v-6h6v6" /><path d="M4 9c0 3 4 3 4 0 0 3 4 3 4 0 0 3 4 3 4 0 0 3 4 3 4 0" /></>,
    map: <><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" /><path d="M9 4v14m6-12v14" /></>,
    bank: <><path d="m3 9 9-5 9 5H3Z" /><path d="M5 19h14M7 10v7m5-7v7m5-7v7" /></>,
    workshop: <><path d="m5 18 8-8" /><path d="m10 5 3-2 3 3-2 3" /><path d="m11 12 3 3-5 5-3-3 5-5Z" /></>,
  };

  return (
    <svg className="rpg-menu__glyph" viewBox="0 0 24 24" aria-hidden="true">
      <g>{paths[panel]}</g>
    </svg>
  );
}

type TargetPortraitSpec = {
  path: string;
  frame: number;
  frameWidth: number;
  frameHeight: number;
  columns: number;
};

const TARGET_PORTRAIT_SPECS: Partial<Record<TargetState["kind"], TargetPortraitSpec>> = {
  rat: { path: "/assets/rpg/creatures/field-rat.png", frame: 0, frameWidth: 128, frameHeight: 128, columns: 6 },
  wolf: { path: "/assets/rpg/creatures/wolfpack.png", frame: 20, frameWidth: 32, frameHeight: 32, columns: 8 },
  slime: { path: "/assets/rpg/creatures/slime.png", frame: 0, frameWidth: 32, frameHeight: 32, columns: 4 },
  skeleton: { path: "/assets/rpg/creatures/skeleton-idle.png", frame: 0, frameWidth: 128, frameHeight: 128, columns: 4 },
  witch: { path: "/assets/rpg/creatures/witch-doctor-idle.png", frame: 0, frameWidth: 128, frameHeight: 128, columns: 4 },
};

const targetPortraitImageCache = new Map<string, Promise<HTMLImageElement>>();

function loadTargetPortraitImage(path: string) {
  let pending = targetPortraitImageCache.get(path);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load target portrait: ${path}`));
      image.src = path;
    });
    targetPortraitImageCache.set(path, pending);
  }
  return pending;
}

function SpriteTargetPortrait({ kind, rare }: Pick<TargetState, "kind" | "rare">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const spec = TARGET_PORTRAIT_SPECS[kind];
    if (!spec) return;
    let cancelled = false;

    loadTargetPortraitImage(spec.path)
      .then((image) => {
        if (cancelled || !canvasRef.current) return;
        const source = document.createElement("canvas");
        source.width = spec.frameWidth;
        source.height = spec.frameHeight;
        const sourceContext = source.getContext("2d", { willReadFrequently: true });
        const context = canvasRef.current.getContext("2d");
        if (!sourceContext || !context) return;
        sourceContext.imageSmoothingEnabled = false;
        sourceContext.drawImage(
          image,
          (spec.frame % spec.columns) * spec.frameWidth,
          Math.floor(spec.frame / spec.columns) * spec.frameHeight,
          spec.frameWidth,
          spec.frameHeight,
          0,
          0,
          spec.frameWidth,
          spec.frameHeight,
        );

        const pixels = sourceContext.getImageData(0, 0, spec.frameWidth, spec.frameHeight).data;
        let minX = spec.frameWidth;
        let minY = spec.frameHeight;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < spec.frameHeight; y += 1) {
          for (let x = 0; x < spec.frameWidth; x += 1) {
            if (pixels[(y * spec.frameWidth + x) * 4 + 3] < 8) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
        if (maxX < minX || maxY < minY) return;

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const maxPaintedSize = kind === "rat" ? 112 : 106;
        const scale = Math.min(maxPaintedSize / width, maxPaintedSize / height);
        const drawWidth = Math.round(width * scale);
        const drawHeight = Math.round(height * scale);
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, 128, 128);
        context.drawImage(
          source,
          minX,
          minY,
          width,
          height,
          Math.round((128 - drawWidth) / 2),
          Math.round((128 - drawHeight) / 2),
          drawWidth,
          drawHeight,
        );
        if (rare) {
          context.globalCompositeOperation = "source-atop";
          context.fillStyle = "rgba(255, 211, 92, 0.23)";
          context.fillRect(0, 0, 128, 128);
          context.globalCompositeOperation = "source-over";
        }
      })
      .catch(() => {
        // Keep combat controls usable if a cosmetic portrait cannot be loaded.
      });

    return () => {
      cancelled = true;
    };
  }, [kind, rare]);

  return <canvas ref={canvasRef} width={128} height={128} className="rpg-target-portrait__sprite" aria-hidden="true" />;
}

function EnemyTargetPortrait({ target }: { target: TargetState }) {
  if (target.kind === "goblin" || target.kind === "orc" || target.kind === "lizard") {
    const definition = ENEMIES.find((enemy) => enemy.id === target.id);
    const defaultWeapon = target.kind === "lizard"
      ? target.combatStyle === "magic"
        ? "arcane-staff"
        : target.combatStyle === "range"
          ? "iron-bow"
          : "iron-sword"
      : target.kind === "orc"
        ? "iron-sword"
        : target.combatStyle === "range"
          ? "oak-bow"
          : "bronze-sword";
    const equipped = {
      weapon: definition?.visual?.weapon ?? defaultWeapon,
      tool: "iron-pick",
      armor: definition?.visual?.armor ?? (target.kind === "orc" || target.kind === "lizard" ? "warden-mail" : ""),
    };
    return <HeroPortrait appearance={target.kind} equipped={equipped} className="rpg-target-portrait__hero" />;
  }
  return <SpriteTargetPortrait kind={target.kind} rare={target.rare} />;
}

const MINIMAP_VIEW = { width: 174, height: 128, mapWidth: 264 };
const QUEST_JOURNAL_GROUPS = Array.from(new Set(QUEST_STEPS.map((step) => step.questId))).map((questId) => ({
  questId,
  chapter: QUEST_STEPS.find((step) => step.questId === questId)?.chapter ?? "Adventure",
  title: QUEST_STEPS.find((step) => step.questId === questId)?.questTitle ?? "Quest",
  steps: QUEST_STEPS.map((step, index) => ({ step, index })).filter(({ step }) => step.questId === questId),
}));

type MapMarker = {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: "quest" | "event" | "rare" | "service" | "bounty" | "treasure" | "party" | "guild";
};

const WORLD_SERVICE_MARKERS: MapMarker[] = [
  { id: "guild", label: "Adventurers Guild", x: NPCS.find((npc) => npc.id === "guide")?.x ?? 704, y: NPCS.find((npc) => npc.id === "guide")?.y ?? 515, kind: "service" },
  { id: "market", label: "Market", x: NPCS.find((npc) => npc.id === "market")?.x ?? 610, y: NPCS.find((npc) => npc.id === "market")?.y ?? 445, kind: "service" },
  { id: "forge", label: "Forge", x: NPCS.find((npc) => npc.id === "smith")?.x ?? 925, y: NPCS.find((npc) => npc.id === "smith")?.y ?? 455, kind: "service" },
  { id: "bank", label: "Bank", x: NPCS.find((npc) => npc.id === "banker")?.x ?? 1065, y: NPCS.find((npc) => npc.id === "banker")?.y ?? 595, kind: "service" },
  { id: "homestead", label: "Homesteads", x: NPCS.find((npc) => npc.id === "plots")?.x ?? 760, y: NPCS.find((npc) => npc.id === "plots")?.y ?? 690, kind: "service" },
  { id: "bounties", label: "Adventurer Board", x: NPCS.find((npc) => npc.id === "marshal")?.x ?? 846, y: NPCS.find((npc) => npc.id === "marshal")?.y ?? 690, kind: "service" },
  { id: "expeditions", label: "Expedition Captain", x: NPCS.find((npc) => npc.id === "captain")?.x ?? 800, y: NPCS.find((npc) => npc.id === "captain")?.y ?? 640, kind: "service" },
  { id: "sunstone-descent", label: "Sunstone Descent", x: DUNGEON_PORTALS[0].x, y: DUNGEON_PORTALS[0].y, kind: "service" },
];
const WORLD_RARE_MARKERS: MapMarker[] = ENEMIES
  .filter((enemy) => enemy.rare && enemy.id !== "auric-slime")
  .map((enemy) => ({ id: `rare-${enemy.id}`, label: `${enemy.name} territory`, x: enemy.x, y: enemy.y, kind: "rare" }));

type RareHuntDossier = {
  enemyId: "goblin-firestarter" | "ironhide-grukk" | "moonfen-oracle" | "sunstone-revenant";
  region: string;
  signature: string;
  fieldNote: string;
};

const RARE_HUNT_DOSSIERS: readonly RareHuntDossier[] = [
  { enemyId: "goblin-firestarter", region: "Goblin Camp", signature: "Cinder Volley", fieldNote: "Follow the eastern camp road beyond the last watchfire." },
  { enemyId: "ironhide-grukk", region: "Raider Dens", signature: "Ironquake", fieldNote: "Search the thorn-wall clearings south of the ranger foothold." },
  { enemyId: "moonfen-oracle", region: "Moonfen Marsh", signature: "Moonwell Rupture", fieldNote: "Cold witch-lights gather near the marshscale ritual stones." },
  { enemyId: "sunstone-revenant", region: "Sunstone Catacombs", signature: "Fallen Sun Eruption", fieldNote: "Descend through the Old Sun Shrine. Aurex waits inside the lowest ritual ring." },
];

const RARE_HUNT_LOOT = lootRules as Record<string, Array<{ itemId: string; chance: number }>>;

type WorldMapArea = "overworld" | "dungeon";

function worldMapAreaForY(y: number): WorldMapArea {
  return y >= 2048 ? "dungeon" : "overworld";
}

function markerIsInArea(y: number, area: WorldMapArea) {
  return worldMapAreaForY(y) === area;
}

function mapMarkerStyle(x: number, y: number, area: WorldMapArea): React.CSSProperties {
  const areaTop = area === "dungeon" ? 2048 : 0;
  const areaHeight = area === "dungeon" ? 1024 : 2048;
  return {
    left: `${(x / WORLD.width) * 100}%`,
    top: `${((y - areaTop) / areaHeight) * 100}%`,
  };
}

function questMapMarker(step: QuestStepDefinition): MapMarker | null {
  if (step.target === "Complete") return null;
  const npc = NPCS.find((candidate) => candidate.name === step.target)
    ?? (step.target === "Workshop" ? NPCS.find((candidate) => candidate.id === "smith") : undefined);
  if (npc) return { id: `quest-npc-${npc.id}`, label: step.target, x: npc.x, y: npc.y, kind: "quest" };

  const enemy = ENEMIES.find((candidate) => candidate.name === step.target)
    ?? (step.target === "Goblin" ? ENEMIES.find((candidate) => candidate.kind === "goblin") : undefined);
  if (enemy) return { id: `quest-enemy-${enemy.id}`, label: step.target, x: enemy.x, y: enemy.y, kind: "quest" };

  const resource = RESOURCES.find((candidate) => candidate.name === step.target)
    ?? (step.target === "Copper" ? RESOURCES.find((candidate) => candidate.id === "copper-1") : undefined);
  if (resource) return { id: `quest-resource-${resource.id}`, label: step.target, x: resource.x, y: resource.y, kind: "quest" };
  return null;
}

function compassDirection(dx: number, dy: number) {
  const directions = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  const index = Math.round((Math.atan2(dy, dx) / (Math.PI / 4) + 8)) % 8;
  return directions[index];
}

function WorldMapArtwork({
  playerX,
  playerY,
  questTarget,
  eventTarget,
  bountyTarget,
  treasureTarget,
  socialMarkers = [],
  waystoneIds = [],
  minimap = false,
}: {
  playerX: number;
  playerY: number;
  questTarget?: MapMarker | null;
  eventTarget?: MapMarker | null;
  bountyTarget?: MapMarker | null;
  treasureTarget?: MapMarker | null;
  socialMarkers?: MapMarker[];
  waystoneIds?: string[];
  minimap?: boolean;
}) {
  const area = worldMapAreaForY(playerY);
  const areaTop = area === "dungeon" ? 2048 : 0;
  const areaHeight = area === "dungeon" ? 1024 : 2048;
  const minimapHeight = area === "dungeon" ? 176 : 352;
  const visibleSocialMarkers = socialMarkers.filter((marker) => markerIsInArea(marker.y, area));
  const mapStyle = minimap
    ? {
        width: `${MINIMAP_VIEW.mapWidth}px`,
        height: `${minimapHeight}px`,
        left: `${Math.max(
          MINIMAP_VIEW.width - MINIMAP_VIEW.mapWidth,
          Math.min(0, MINIMAP_VIEW.width / 2 - (playerX / WORLD.width) * MINIMAP_VIEW.mapWidth),
        )}px`,
        top: `${Math.max(
          MINIMAP_VIEW.height - minimapHeight,
          Math.min(0, MINIMAP_VIEW.height / 2 - ((playerY - areaTop) / areaHeight) * minimapHeight),
        )}px`,
      }
    : undefined;

  return (
    <div className={`rpg-world-art rpg-world-art--${area} ${minimap ? "rpg-world-art--minimap" : ""}`} style={mapStyle}>
      {area === "dungeon" ? (
        <img src="/assets/rpg/world/sunstone-catacombs.png" alt="" />
      ) : (
        <>
          <img src="/assets/rpg/world/orehaven-overworld.png" alt="" />
          <img src="/assets/rpg/world/briarwild-south.png" alt="" />
        </>
      )}
      {!minimap ? <i className="rpg-world-art__north" aria-hidden="true"><b>N</b><span /></i> : null}
      {!minimap ? WORLD_SERVICE_MARKERS.filter((marker) => markerIsInArea(marker.y, area)).map((marker) => (
        <i
          key={marker.id}
          className="rpg-world-art__marker rpg-world-art__marker--service"
          style={mapMarkerStyle(marker.x, marker.y, area)}
          title={marker.label}
          aria-label={marker.label}
        >
          <span>{marker.label}</span>
        </i>
      )) : null}
      {!minimap ? WAYSTONES.filter((waystone) => markerIsInArea(waystone.y, area)).map((waystone) => {
        const unlocked = waystoneIds.includes(waystone.id);
        return (
          <i
            key={waystone.id}
            className={`rpg-world-art__marker rpg-world-art__marker--waystone ${unlocked ? "is-attuned" : "is-dormant"}`}
            style={mapMarkerStyle(waystone.x, waystone.y, area)}
            title={unlocked ? `Attuned: ${waystone.name}` : "Undiscovered waystone"}
            aria-label={unlocked ? `Attuned: ${waystone.name}` : "Undiscovered waystone"}
          >
            <span>{unlocked ? waystone.name : "Dormant waystone"}</span>
          </i>
        );
      }) : null}
      {!minimap ? WORLD_RARE_MARKERS.map((marker) => markerIsInArea(marker.y, area) ? (
        <i
          key={marker.id}
          className="rpg-world-art__marker rpg-world-art__marker--rare"
          style={mapMarkerStyle(marker.x, marker.y, area)}
          title={`Rare territory: ${marker.label}`}
          aria-label={`Rare territory: ${marker.label}`}
        >
          <span>{marker.label}</span>
        </i>
      ) : null) : null}
      {eventTarget && markerIsInArea(eventTarget.y, area) ? (
        <i
          className="rpg-world-art__marker rpg-world-art__marker--event"
          style={mapMarkerStyle(eventTarget.x, eventTarget.y, area)}
          title={`World event: ${eventTarget.label}`}
          aria-label={`World event: ${eventTarget.label}`}
        >
          <span>{eventTarget.label}</span>
        </i>
      ) : null}
      {questTarget && markerIsInArea(questTarget.y, area) ? (
        <i
          className="rpg-world-art__marker rpg-world-art__marker--quest"
          style={mapMarkerStyle(questTarget.x, questTarget.y, area)}
          title={`Quest objective: ${questTarget.label}`}
          aria-label={`Quest objective: ${questTarget.label}`}
        >
          <span>{questTarget.label}</span>
        </i>
      ) : null}
      {bountyTarget && markerIsInArea(bountyTarget.y, area) ? (
        <i
          className="rpg-world-art__marker rpg-world-art__marker--bounty"
          style={mapMarkerStyle(bountyTarget.x, bountyTarget.y, area)}
          title={`Tracked bounty: ${bountyTarget.label}`}
          aria-label={`Tracked bounty: ${bountyTarget.label}`}
        >
          <span>{bountyTarget.label}</span>
        </i>
      ) : null}
      {treasureTarget && markerIsInArea(treasureTarget.y, area) ? (
        <i
          className="rpg-world-art__marker rpg-world-art__marker--treasure"
          style={mapMarkerStyle(treasureTarget.x, treasureTarget.y, area)}
          title={`Treasure clue: ${treasureTarget.label}`}
          aria-label={`Treasure clue: ${treasureTarget.label}`}
        >
          <span>{treasureTarget.label}</span>
        </i>
      ) : null}
      {visibleSocialMarkers.map((marker) => (
        <i
          key={marker.id}
          className={`rpg-world-art__marker rpg-world-art__marker--${marker.kind}`}
          style={mapMarkerStyle(marker.x, marker.y, area)}
          title={`${marker.kind === "party" ? "Party member" : "Guildmate"}: ${marker.label}`}
          aria-label={`${marker.kind === "party" ? "Party member" : "Guildmate"}: ${marker.label}`}
        >
          <span>{marker.label}</span>
        </i>
      ))}
      <i className="rpg-world-art__player" style={mapMarkerStyle(playerX, playerY, area)}>
        {!minimap ? <span>You</span> : null}
      </i>
      {!minimap && area === "overworld" ? (
        <div className="rpg-world-art__labels" aria-hidden="true">
          <span style={{ left: "49%", top: "18%" }}>Orehaven</span>
          <span style={{ left: "17%", top: "29%" }}>Western Woods</span>
          <span style={{ left: "84%", top: "20%" }}>Eastern Quarry</span>
          <span style={{ left: "82%", top: "43%" }}>Goblin Camp</span>
          <span style={{ left: "34%", top: "62%" }}>Old Sun Shrine</span>
          <span style={{ left: "69%", top: "61%" }}>Moonfen Marsh</span>
          <span style={{ left: "21%", top: "80%" }}>Ranger Camp</span>
          <span style={{ left: "79%", top: "80%" }}>Raider Dens</span>
        </div>
      ) : null}
      {!minimap && area === "dungeon" ? (
        <div className="rpg-world-art__labels" aria-hidden="true">
          <span style={{ left: "50%", top: "8%" }}>Sunstone Entrance</span>
          <span style={{ left: "50%", top: "52%" }}>Buried Halls</span>
          <span style={{ left: "50%", top: "86%" }}>Aurex's Chamber</span>
        </div>
      ) : null}
    </div>
  );
}

function totalLevel(progress: PlayerProgress) {
  return Object.values(progress.skills).reduce((sum, skill) => sum + skill.level, 0);
}

function combatStyleLabel(style: CombatStyle) {
  return style === "range" ? "Ranged" : style === "magic" ? "Magic" : "Melee";
}

function xpPercent(level: number, xp: number) {
  const floor = Math.max(0, (level - 1) ** 2 * 42);
  const ceiling = level ** 2 * 42;
  return Math.max(0, Math.min(100, ((xp - floor) / Math.max(1, ceiling - floor)) * 100));
}

function lifetimeActivityCount(activities: ActivityProgress, kind: string) {
  return activities.lifetime[kind as keyof LifetimeActivityStats];
}

function itemArtStyle(item: ItemDefinition): React.CSSProperties | undefined {
  if (item.artIndex === undefined) return undefined;
  if (item.artAtlas === "trophy") {
    const column = item.artIndex % 4;
    const row = Math.floor(item.artIndex / 4);
    return {
      backgroundImage: 'url("/assets/rpg/items/trophy-atlas.png")',
      backgroundSize: "400% 300%",
      backgroundPosition: `${(column / 3) * 100}% ${(row / 2) * 100}%`,
    };
  }
  if (item.artAtlas === "material") {
    const column = item.artIndex % 2;
    const row = Math.floor(item.artIndex / 2);
    return {
      backgroundImage: 'url("/assets/rpg/items/material-atlas.png")',
      backgroundSize: "200% 200%",
      backgroundPosition: `${column * 100}% ${row * 100}%`,
    };
  }
  const column = item.artIndex % 4;
  const row = Math.floor(item.artIndex / 4);
  return {
    backgroundImage: `url("/assets/rpg/items/${item.artAtlas === "adventure" ? "adventure" : "equipment"}-atlas.png")`,
    backgroundSize: "400% 200%",
    backgroundPosition: `${(column / 3) * 100}% ${row * 100}%`,
  };
}

function ItemIcon({ item, className = "" }: { item?: ItemDefinition; className?: string }) {
  return (
    <b
      className={`rpg-item-icon rpg-item-icon--${item?.category ?? "empty"} rpg-item-icon--rarity-${item?.rarity ?? "standard"} ${item?.artIndex !== undefined ? "rpg-item-icon--art" : ""} ${className}`.trim()}
      style={item ? itemArtStyle(item) : undefined}
      aria-hidden="true"
    >
      {item?.artIndex === undefined ? item?.badge ?? "-" : ""}
    </b>
  );
}

function NpcPortrait({ npcId }: { npcId: string }) {
  const frame = NPC_PORTRAIT_FRAMES[npcId];
  const column = Number.isFinite(frame) ? frame % 4 : 0;
  const row = Number.isFinite(frame) ? Math.floor(frame / 4) : 0;
  return (
    <div
      className="rpg-npc-portrait"
      style={{
        backgroundPosition: `${(column / 3) * 100}% ${row * 100}%`,
      }}
      role="img"
      aria-label={`${NPCS.find((npc) => npc.id === npcId)?.name ?? "NPC"} portrait`}
    />
  );
}

function meetsItemRequirement(progress: PlayerProgress, item: ItemDefinition) {
  return !item.requiredSkill || progress.skills[item.requiredSkill].level >= (item.requiredLevel ?? 1);
}

function itemPowerDelta(progress: PlayerProgress, item: ItemDefinition) {
  if (!item.slot) return null;
  const equipped = itemById(progress.equipped[item.slot]);
  return (item.power ?? 0) - (equipped?.power ?? 0);
}

function EquipmentComparison({ item, progress }: { item: ItemDefinition; progress: PlayerProgress }) {
  if (!item.slot) return null;
  const equipped = itemById(progress.equipped[item.slot]);
  const currentPower = equipped?.power ?? 0;
  const nextPower = item.power ?? 0;
  const delta = nextPower - currentPower;
  const equippedNow = equipped?.id === item.id;
  const metric = item.slot === "armor" ? "Bonus HP" : item.slot === "tool" ? "Tool tier" : "Weapon power";
  const state = equippedNow ? "equipped" : delta > 0 ? "upgrade" : delta < 0 ? "downgrade" : "sidegrade";
  const stateLabel = equippedNow
    ? "Currently equipped"
    : delta > 0
      ? `+${delta} upgrade`
      : delta < 0
        ? `${delta} downgrade`
        : equipped?.combatStyle !== item.combatStyle && item.slot === "weapon"
          ? `Switch to ${item.combatStyle}`
          : "Equal power";
  return (
    <section className={`rpg-item-compare rpg-item-compare--${state}`}>
      <div><span>{metric}</span><b>{currentPower}<i>→</i>{nextPower}</b></div>
      <small>Compared with {equipped?.name ?? "an empty slot"}</small>
      <em>{stateLabel}</em>
    </section>
  );
}

type PhaserRpgGameProps = {
  onExit?: () => void;
  walletAddress?: string | null;
  walletMessage?: string;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
};

export function PhaserRpgGame({
  onExit,
  walletAddress = null,
  walletMessage = "",
  onConnectWallet,
  onDisconnectWallet,
}: PhaserRpgGameProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const tutorialAudioRef = useRef<HTMLAudioElement | null>(null);
  const tutorialAdvanceTimerRef = useRef<number | null>(null);
  const tutorialStartRef = useRef({ x: 748, y: 505 });
  const gameRef = useRef<Phaser.Game | null>(null);
  const apiRef = useRef<GameApi | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const toastTimersRef = useRef<number[]>([]);
  const toastIdRef = useRef(0);
  const audioRef = useRef<GameAudioEngine | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const hudDragRef = useRef<{ id: HudWidgetId; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const initialProgressRef = useRef(loadPlayerProgress());
  const readyContractIdsRef = useRef(new Set(
    DAILY_CONTRACTS
      .filter((contract) => activityContractCount(initialProgressRef.current.activities, contract) >= contract.target)
      .map((contract) => contract.id),
  ));
  const playerNameRef = useRef(playerDisplayName());
  const [identityReady, setIdentityReady] = useState(() => window.localStorage.getItem(ONBOARDING_SAVE_KEY) === "complete");
  const [identityOpen, setIdentityOpen] = useState(() => window.localStorage.getItem(ONBOARDING_SAVE_KEY) !== "complete");
  const [identityName, setIdentityName] = useState(playerNameRef.current);
  const [identityAppearance, setIdentityAppearance] = useState<AppearanceId>(initialProgressRef.current.appearance);
  const [identityError, setIdentityError] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [dialoguePage, setDialoguePage] = useState(0);
  const [soundOn, setSoundOn] = useState(() => window.localStorage.getItem("ore-acres-rpg-sound") === "on");
  const [clock, setClock] = useState(() => Date.now());
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [questCelebration, setQuestCelebration] = useState<GameToast | null>(null);
  const [levelCelebration, setLevelCelebration] = useState<SkillLevelEvent | null>(null);
  const [paperdollDirection, setPaperdollDirection] = useState<Direction>("down");
  const [chatOpen, setChatOpen] = useState(() => window.innerWidth > 700);
  const [questTrackerOpen, setQuestTrackerOpen] = useState(() => window.innerWidth > 700);
  const [chatFocused, setChatFocused] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatChannel, setChatChannel] = useState<"world" | "party" | "guild">("world");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [trackedBountyKey, setTrackedBountyKey] = useState<string | null>(null);
  const [social, setSocial] = useState<SocialState>({ selfId: null, online: [], party: null, invite: null, guildInvite: null });
  const [guildName, setGuildName] = useState("");
  const [guildTag, setGuildTag] = useState("");
  const [selectedExpeditionId, setSelectedExpeditionId] = useState(EXPEDITIONS[0].id);
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [tutorialOpen, setTutorialOpen] = useState(() => window.localStorage.getItem(TUTORIAL_SAVE_KEY) !== "complete");
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialVoice, setTutorialVoice] = useState<TutorialVoiceManifest>({ enabled: false, files: {} });
  const [hotbarLayout, setHotbarLayout] = useState<Array<HotbarEntry | null>>(loadHotbarLayout);
  const [hotbarEditing, setHotbarEditing] = useState(false);
  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);
  const [selectedTreeBranch, setSelectedTreeBranch] = useState<CombatStyle>("melee");
  const [hudEditing, setHudEditing] = useState(false);
  const [hudLayout, setHudLayout] = useState<Record<HudWidgetId, HudWidgetConfig>>(loadHudLayout);
  const [hud, setHud] = useState<HudState>({
    progress: initialProgressRef.current,
    players: 1,
    online: "connecting",
    action: "Explore",
    message: "Entering Orehaven...",
    location: "Orehaven Square",
    activeAction: null,
    playerX: 748,
    playerY: 505,
    worldEvent: null,
    target: null,
    incomingCast: null,
    abilityCooldowns: { signatureReadyAt: 0, secondWindReadyAt: 0, treeReadyAt: {} },
  });

  if (!audioRef.current) audioRef.current = new GameAudioEngine();

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HUD_LAYOUT_SAVE_KEY, JSON.stringify(hudLayout));
  }, [hudLayout]);

  useEffect(() => {
    let active = true;
    void fetch("/assets/rpg/tutorial/manifest.json")
      .then((response) => response.ok ? response.json() : null)
      .then((manifest: TutorialVoiceManifest | null) => {
        if (active && manifest) setTutorialVoice(manifest);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (tutorialAdvanceTimerRef.current) window.clearTimeout(tutorialAdvanceTimerRef.current);
    tutorialAudioRef.current?.pause();
  }, []);

  useEffect(() => {
    if (!tutorialOpen) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step || step.manual) return;
    const moved = Math.hypot(hud.playerX - tutorialStartRef.current.x, hud.playerY - tutorialStartRef.current.y) >= 46;
    const gatheringXp = hud.progress.skills.mining.xp + hud.progress.skills.woodcutting.xp + hud.progress.skills.fishing.xp;
    const combatXp = hud.progress.skills.attack.xp + hud.progress.skills.range.xp + hud.progress.skills.magic.xp;
    const complete = tutorialMilestoneComplete(step.id, {
      movedDistance: moved ? 46 : 0,
      questStep: hud.progress.questStep,
      panel,
      gatheringXp,
      combatXp,
      enemiesDefeated: hud.progress.activities.lifetime.enemiesDefeated,
    });
    if (!complete) return;
    tutorialAdvanceTimerRef.current = window.setTimeout(() => {
      setTutorialStep((current) => Math.min(TUTORIAL_STEPS.length - 1, current + 1));
    }, 520);
    return () => {
      if (tutorialAdvanceTimerRef.current) window.clearTimeout(tutorialAdvanceTimerRef.current);
      tutorialAdvanceTimerRef.current = null;
    };
  }, [hud.playerX, hud.playerY, hud.progress, panel, tutorialOpen, tutorialStep]);

  useEffect(() => {
    tutorialAudioRef.current?.pause();
    tutorialAudioRef.current = null;
    if (!tutorialOpen || !soundOn || !tutorialVoice.enabled) return;
    const step = TUTORIAL_STEPS[tutorialStep];
    const file = step ? tutorialVoice.files?.[step.id] : null;
    if (!file) return;
    const audio = new Audio(`/assets/rpg/tutorial/${file}`);
    audio.volume = 0.82;
    tutorialAudioRef.current = audio;
    void audio.play().catch(() => undefined);
    return () => audio.pause();
  }, [soundOn, tutorialOpen, tutorialStep, tutorialVoice]);

  useEffect(() => {
    if (!identityReady || !hostRef.current || gameRef.current) return;
    const host = hostRef.current;
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const bounds = host.getBoundingClientRect();
      const scene = new OrehavenScene(
        {
          onHud: (next) => {
            setHud((current) => {
              const updated = { ...current, ...next };
              if (next.progress) {
                if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
                saveTimerRef.current = window.setTimeout(() => savePlayerProgress(updated.progress), 180);
              }
              return updated;
            });
          },
          onDialogue: (next) => {
            setDialoguePage(0);
            setDialogue(next);
          },
          onPanelRequest: setPanel,
          onToast: (toast) => {
            audioRef.current?.play(toast.tone === "level" ? "level" : toast.tone === "quest" ? "quest" : "loot");
            toastIdRef.current += 1;
            const id = toastIdRef.current;
            setToasts((current) => [...current.slice(-2), { ...toast, id }]);
            const timer = window.setTimeout(() => {
              setToasts((current) => current.filter((entry) => entry.id !== id));
            }, 4_800);
            toastTimersRef.current.push(timer);
          },
          onQuestComplete: setQuestCelebration,
          onLevelUp: setLevelCelebration,
          onChat: (message) => {
            setChatMessages((current) => current.some((entry) => entry.id === message.id)
              ? current
              : [...current, message].slice(-60));
          },
          onSocial: (next) => setSocial((current) => ({ ...current, ...next })),
          onAudio: (cue) => audioRef.current?.play(cue),
        },
        initialProgressRef.current,
        playerNameRef.current,
      );
      apiRef.current = {
        interact: () => scene.interact(),
        engageTarget: () => scene.engageSelectedTarget(),
        equip: (itemId) => scene.equipItem(itemId),
        buy: (itemId) => scene.buyItem(itemId),
        sell: (itemId) => scene.sellItem(itemId),
        consume: (itemId) => scene.consumeItem(itemId),
        sideQuestAction: (questId) => scene.sideQuestAction(questId),
        deposit: (itemId) => scene.depositItem(itemId),
        withdraw: (itemId) => scene.withdrawItem(itemId),
        craft: (recipeId) => scene.craftRecipe(recipeId),
        claimContract: (contractId) => scene.claimContract(contractId),
        claimAdventure: (adventureId) => scene.claimAdventure(adventureId),
        setAppearance: (appearance) => scene.setAppearance(appearance),
        setCustomization: (customization) => scene.setCustomization(customization),
        setDisplayName: (displayName) => scene.setDisplayName(displayName),
        centerCamera: () => scene.centerCamera(),
        navigateToQuestTarget: () => scene.navigateToQuestTarget(),
        adjustCameraZoom: (delta) => scene.adjustCameraZoom(delta),
        sendChat: (text, channel) => scene.sendChat(text, channel),
        inviteToParty: (targetPlayerId) => scene.inviteToParty(targetPlayerId),
        respondToPartyInvite: (accept) => scene.respondToPartyInvite(accept),
        leaveParty: () => scene.leaveParty(),
        createGuild: (name, tag) => scene.createGuild(name, tag),
        inviteToGuild: (targetPlayerId) => scene.inviteToGuild(targetPlayerId),
        respondToGuildInvite: (accept) => scene.respondToGuildInvite(accept),
        leaveGuild: () => scene.leaveGuild(),
        startExpedition: (expeditionId) => scene.startExpedition(expeditionId),
        startTreasureTrail: () => scene.startTreasureTrail(),
        travelToWaystone: (waystoneId) => scene.travelToWaystone(waystoneId),
        setInputPaused: (paused) => scene.setInputPaused(paused),
        cancelAction: () => scene.cancelCurrentAction(),
        useAbility: (slot) => scene.useCombatAbility(slot),
        setHotbar: (layout) => scene.setHotbarLayout(layout),
        unlockSkill: (nodeId) => scene.unlockSkillNode(nodeId),
        respecSkills: () => scene.respecSkillTree(),
      };
      scene.setHotbarLayout(hotbarLayout);
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        width: Math.max(960, Math.round(bounds.width) || 960),
        height: Math.max(620, Math.round(bounds.height) || 620),
        backgroundColor: "#17271d",
        pixelArt: true,
        roundPixels: true,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: false, pixelArt: true },
        scene,
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      toastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      toastTimersRef.current = [];
      gameRef.current?.destroy(true);
      gameRef.current = null;
      apiRef.current = null;
    };
  }, [identityReady]);

  useEffect(() => {
    window.localStorage.setItem(HOTBAR_SAVE_KEY, JSON.stringify(hotbarLayout));
    apiRef.current?.setHotbar(hotbarLayout);
  }, [hotbarLayout]);

  useEffect(() => () => {
    audioRef.current?.dispose();
  }, []);

  useEffect(() => {
    apiRef.current?.setInputPaused(Boolean(panel || dialogue || chatFocused || hotbarEditing || hudEditing));
  }, [chatFocused, dialogue, hotbarEditing, hudEditing, panel]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    if (!questCelebration) return;
    const timer = window.setTimeout(() => setQuestCelebration(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [questCelebration]);

  useEffect(() => {
    if (!levelCelebration) return;
    const timer = window.setTimeout(() => setLevelCelebration(null), 9_000);
    return () => window.clearTimeout(timer);
  }, [levelCelebration]);

  useEffect(() => {
    if (chatChannel === "party" && !social.party) setChatChannel("world");
    if (chatChannel === "guild" && !hud.progress.guild) setChatChannel("world");
  }, [chatChannel, hud.progress.guild, social.party]);

  useEffect(() => {
    if (!social.invite) return;
    const delay = Math.max(0, social.invite.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setSocial((current) => current.invite?.partyId === social.invite?.partyId
        ? { ...current, invite: null }
        : current);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [social.invite]);

  useEffect(() => {
    if (!social.guildInvite) return;
    const delay = Math.max(0, social.guildInvite.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setSocial((current) => current.guildInvite?.guild.id === social.guildInvite?.guild.id
        ? { ...current, guildInvite: null }
        : current);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [social.guildInvite]);

  useEffect(() => {
    const ready = new Set(
      DAILY_CONTRACTS
        .filter((contract) => activityContractCount(hud.progress.activities, contract) >= contract.target)
        .map((contract) => contract.id),
    );
    const newlyReady = DAILY_CONTRACTS.filter((contract) => (
      ready.has(contract.id) && !readyContractIdsRef.current.has(contract.id)
    ));
    readyContractIdsRef.current = ready;
    newlyReady.forEach((contract) => {
      audioRef.current?.play("quest");
      toastIdRef.current += 1;
      const id = toastIdRef.current;
      setToasts((current) => [...current.slice(-2), {
        id,
        title: `${contract.title} complete`,
        detail: "Return to Marshal Rowan or press J to claim your reward.",
        tone: "quest",
        itemId: contract.rewardItems[0]?.itemId,
      }]);
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((entry) => entry.id !== id));
      }, 5_600);
      toastTimersRef.current.push(timer);
    });
  }, [hud.progress.activities]);

  useEffect(() => {
    const coolingDown = hud.abilityCooldowns.signatureReadyAt > Date.now()
      || hud.abilityCooldowns.secondWindReadyAt > Date.now()
      || Object.values(hud.abilityCooldowns.treeReadyAt).some((readyAt) => readyAt > Date.now());
    const statusRunning = (hud.target?.status?.expiresAt ?? 0) > Date.now();
    const expeditionRunning = social.party?.expedition?.status === "active";
    const needsFastClock = Boolean(hud.activeAction || hud.incomingCast || hud.worldEvent?.endsAt || hud.worldEvent?.respawnAt || coolingDown || statusRunning || expeditionRunning);
    const timer = window.setInterval(() => setClock(Date.now()), needsFastClock ? 80 : 1_000);
    return () => window.clearInterval(timer);
  }, [hud.abilityCooldowns.secondWindReadyAt, hud.abilityCooldowns.signatureReadyAt, hud.abilityCooldowns.treeReadyAt, hud.activeAction, hud.incomingCast, hud.target?.status?.expiresAt, hud.worldEvent?.endsAt, hud.worldEvent?.respawnAt, social.party?.expedition?.status]);

  useEffect(() => {
    audioRef.current?.setEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (hotbarEditing) {
        if (event.key === "Escape") {
          event.preventDefault();
          setHotbarEditing(false);
        }
        return;
      }
      if (dialogue) {
        if (event.key === "Escape") {
          event.preventDefault();
          setDialogue(null);
          return;
        }
        if (event.key.toLowerCase() === "e" || event.key === " " || event.key === "Enter") {
          event.preventDefault();
          if (dialoguePage >= dialogue.lines.length - 1) setDialogue(null);
          else setDialoguePage((current) => Math.min(current + 1, dialogue.lines.length - 1));
        }
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        setChatOpen(true);
        window.requestAnimationFrame(() => chatInputRef.current?.focus());
        return;
      }
      const menuItem = MENU_ITEMS.find((item) => item.hotkey.toLowerCase() === event.key.toLowerCase());
      if (!menuItem) return;
      event.preventDefault();
      setDialogue(null);
      setPanel((current) => (current === menuItem.panel ? null : menuItem.panel));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogue, dialoguePage, hotbarEditing]);

  const activeQuest = QUEST_STEPS[Math.min(hud.progress.questStep, QUEST_STEPS.length - 1)];
  const catacombChronicle = ADVENTURE_CHRONICLES.find((entry) => entry.id === "beneath-the-fallen-sun");
  const catacombMiningChronicle = ADVENTURE_CHRONICLES.find((entry) => entry.id === "embers-below");
  const catacombBossKills = catacombChronicle ? adventureProgress(hud.progress, catacombChronicle) : 0;
  const catacombOreMined = catacombMiningChronicle ? adventureProgress(hud.progress, catacombMiningChronicle) : 0;
  const catacombChronicleClaimed = hud.progress.adventureClaims.includes("beneath-the-fallen-sun");
  const catacombMiningClaimed = hud.progress.adventureClaims.includes("embers-below");
  const catacombMastered = catacombChronicleClaimed && catacombMiningClaimed;
  const catacombVigil = hud.progress.sideQuests["catacomb-vigil"];
  const dialoguePageIndex = dialogue ? Math.min(dialoguePage, dialogue.lines.length - 1) : 0;
  const dialogueAtEnd = dialogue ? dialoguePageIndex >= dialogue.lines.length - 1 : true;
  const activeQuestTarget = questMapMarker(activeQuest);
  const questDeltaX = activeQuestTarget ? activeQuestTarget.x - hud.playerX : 0;
  const questDeltaY = activeQuestTarget ? activeQuestTarget.y - hud.playerY : 0;
  const questDistance = activeQuestTarget ? Math.hypot(questDeltaX, questDeltaY) : 0;
  const questBearing = activeQuestTarget ? Math.atan2(questDeltaY, questDeltaX) * 180 / Math.PI + 90 : 0;
  const questDirection = activeQuestTarget ? compassDirection(questDeltaX, questDeltaY) : "";
  const worldEventEnemy = hud.worldEvent
    ? ENEMIES.find((enemy) => enemy.id === hud.worldEvent?.id)
    : undefined;
  const activeWorldEventTarget = hud.worldEvent && hud.worldEvent.respawnAt <= clock && worldEventEnemy
    ? {
        id: `event-${worldEventEnemy.id}`,
        label: hud.worldEvent.name,
        x: worldEventEnemy.x,
        y: worldEventEnemy.y,
        kind: "event" as const,
      }
    : null;
  const trackedBountyEnemy = trackedBountyKey
    ? ENEMIES.find((enemy) => enemy.kind === trackedBountyKey)
    : undefined;
  const trackedBountyTarget: MapMarker | null = trackedBountyEnemy
    ? {
        id: `bounty-${trackedBountyKey}`,
        label: `${trackedBountyEnemy.kind.charAt(0).toUpperCase()}${trackedBountyEnemy.kind.slice(1)} bounty`,
        x: trackedBountyEnemy.x,
        y: trackedBountyEnemy.y,
        kind: "bounty",
      }
    : null;
  const activeTreasureClue = hud.progress.treasureTrail
    ? TREASURE_CLUES[hud.progress.treasureTrail.step] ?? null
    : null;
  const treasureMapTarget: MapMarker | null = activeTreasureClue
    ? {
        id: `treasure-${activeTreasureClue.id}`,
        label: activeTreasureClue.title,
        x: activeTreasureClue.x,
        y: activeTreasureClue.y,
        kind: "treasure",
      }
    : null;
  const equippedWeapon = itemById(hud.progress.equipped.weapon);
  const equippedArmor = itemById(hud.progress.equipped.armor);
  const equippedCombatStyle = equippedWeapon?.combatStyle ?? "melee";
  const signatureAbility = weaponAbility(hud.progress.equipped.weapon);
  const defenseReduction = Math.floor((equippedArmor?.power ?? 0) / 8)
    + Math.floor(Math.max(0, hud.progress.skills.defense.level - 1) / 8);
  const signatureRemainingMs = Math.max(0, hud.abilityCooldowns.signatureReadyAt - clock);
  const secondWindRemainingMs = Math.max(0, hud.abilityCooldowns.secondWindReadyAt - clock);
  const activeTreeAbilities = unlockedTreeAbilities(hud.progress, equippedCombatStyle);
  const primaryTreeAbility = activeTreeAbilities[0];
  const secondaryTreeAbility = activeTreeAbilities[1];
  const treePointsTotal = skillTreePointTotal(hud.progress);
  const treePointsAvailable = skillTreePointsAvailable(hud.progress);
  const targetStatusRemainingMs = Math.max(0, (hud.target?.status?.expiresAt ?? 0) - clock);
  const actionClock = hud.activeAction ? Math.max(clock, hud.activeAction.startedAt) : clock;
  const actionProgress = hud.activeAction
    ? Math.max(0, Math.min(100, ((actionClock - hud.activeAction.startedAt) / Math.max(1, hud.activeAction.endsAt - hud.activeAction.startedAt)) * 100))
    : 0;
  const incomingCastRemainingMs = Math.max(0, (hud.incomingCast?.completesAt ?? 0) - clock);
  const incomingCastProgress = hud.incomingCast
    ? Math.max(0, Math.min(100, ((clock - hud.incomingCast.startedAt) / Math.max(1, hud.incomingCast.completesAt - hud.incomingCast.startedAt)) * 100))
    : 0;
  const inventoryItems = Object.entries(hud.progress.inventory)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ item: itemById(id), quantity }))
    .filter((entry): entry is { item: NonNullable<ReturnType<typeof itemById>>; quantity: number } => Boolean(entry.item));
  const bankItems = Object.entries(hud.progress.bank)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ item: itemById(id), quantity }))
    .filter((entry): entry is { item: NonNullable<ReturnType<typeof itemById>>; quantity: number } => Boolean(entry.item));
  const activities = normalizeActivityProgress(hud.progress.activities);
  const claimableContracts = DAILY_CONTRACTS.filter((contract) => (
    activityContractCount(activities, contract) >= contract.target
    && !activities.daily.claimed.includes(contract.id)
  )).length;
  const claimableAdventures = ADVENTURE_CHRONICLES.filter((adventure) => (
    adventureProgress(hud.progress, adventure) >= adventure.target
    && !hud.progress.adventureClaims.includes(adventure.id)
  )).length;
  const partyMemberIds = new Set(social.party?.members.map((member) => member.id) ?? []);
  const otherAdventurers = social.online
    .filter((adventurer) => adventurer.id !== social.selfId)
    .sort((left, right) => right.totalLevel - left.totalLevel || left.name.localeCompare(right.name));
  const guildmates = hud.progress.guild
    ? social.online.filter((adventurer) => adventurer.guild?.id === hud.progress.guild?.id)
    : [];
  const guildRenown = hud.progress.guild?.renown ?? 0;
  const guildRank = guildRankForRenown(guildRenown);
  const nextGuildRank = nextGuildRankForRenown(guildRenown);
  const guildRankProgress = nextGuildRank
    ? Math.max(0, Math.min(100, ((guildRenown - guildRank.renown) / Math.max(1, nextGuildRank.renown - guildRank.renown)) * 100))
    : 100;
  const expedition = social.party?.expedition ?? null;
  const selectedExpedition = EXPEDITIONS.find((candidate) => candidate.id === selectedExpeditionId) ?? EXPEDITIONS[0];
  const partyAverageTotalLevel = social.party?.members.length
    ? Math.floor(social.party.members.reduce((total, member) => total + member.totalLevel, 0) / social.party.members.length)
    : Object.values(hud.progress.skills).reduce((total, skill) => total + skill.level, 0);
  const expeditionRemainingSeconds = expedition?.status === "active"
    ? Math.max(0, Math.ceil((expedition.endsAt - clock) / 1000))
    : 0;
  const partyIdsForMap = new Set(social.party?.members.map((member) => member.id) ?? []);
  const socialMapMarkers: MapMarker[] = social.online
    .filter((adventurer) => adventurer.id !== social.selfId)
    .flatMap((adventurer): MapMarker[] => {
      if (partyIdsForMap.has(adventurer.id)) {
        return [{ id: `party-${adventurer.id}`, label: adventurer.name, x: adventurer.x, y: adventurer.y, kind: "party" as const }];
      }
      if (hud.progress.guild && adventurer.guild?.id === hud.progress.guild.id) {
        return [{ id: `guild-${adventurer.id}`, label: adventurer.name, x: adventurer.x, y: adventurer.y, kind: "guild" as const }];
      }
      return [];
    });

  const closeOverlays = () => {
    setPanel(null);
    setDialogue(null);
    setHotbarEditing(false);
  };

  const assignHotbarEntry = (targetIndex: number, entry: HotbarEntry | null) => {
    setHotbarLayout((current) => {
      const next = [...current];
      if (!entry) {
        next[targetIndex] = null;
        return next;
      }
      const existingIndex = next.findIndex((candidate) => hotbarEntryKey(candidate) === hotbarEntryKey(entry));
      if (existingIndex >= 0 && existingIndex !== targetIndex) next[existingIndex] = next[targetIndex];
      next[targetIndex] = { ...entry };
      return next;
    });
  };

  const swapHotbarSlots = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || sourceIndex >= 5 || targetIndex < 0 || targetIndex >= 5) return;
    setHotbarLayout((current) => {
      const next = [...current];
      [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      return next;
    });
    setSelectedHotbarSlot(targetIndex);
  };

  const hotbarAbilityPalette: Array<{ entry: HotbarEntry; label: string; badge: string; detail: string }> = [
    { entry: { kind: "ability", slot: "signature" }, label: signatureAbility.name, badge: signatureAbility.badge, detail: signatureAbility.detail },
    { entry: { kind: "ability", slot: "second-wind" }, label: "Second Wind", badge: "SW", detail: "Restore 24% of maximum hitpoints" },
    { entry: { kind: "ability", slot: "tree-primary" }, label: primaryTreeAbility?.name ?? "Primary skill", badge: primaryTreeAbility?.badge ?? "P", detail: primaryTreeAbility?.detail ?? "Uses your first unlocked weapon-tree skill" },
    { entry: { kind: "ability", slot: "tree-secondary" }, label: secondaryTreeAbility?.name ?? "Secondary skill", badge: secondaryTreeAbility?.badge ?? "S", detail: secondaryTreeAbility?.detail ?? "Uses your second unlocked weapon-tree skill" },
  ];
  const hotbarConsumables = [...new Set([
    ...SHOP_ITEMS.filter((item) => item.category === "consumable").map((item) => item.id),
    ...Object.keys(hud.progress.inventory).filter((itemId) => itemById(itemId)?.category === "consumable"),
  ])].map((itemId) => itemById(itemId)).filter((item): item is ItemDefinition => Boolean(item));

  const currentTutorial = TUTORIAL_STEPS[Math.min(tutorialStep, TUTORIAL_STEPS.length - 1)];
  const worldTime = worldTimeAt(clock);
  const regionAtmosphere = hud.location.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const finishTutorial = () => {
    window.localStorage.setItem(TUTORIAL_SAVE_KEY, "complete");
    tutorialAudioRef.current?.pause();
    setTutorialOpen(false);
  };
  const advanceTutorial = () => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) finishTutorial();
    else setTutorialStep((current) => Math.min(TUTORIAL_STEPS.length - 1, current + 1));
  };
  const replayTutorial = () => {
    tutorialStartRef.current = { x: hud.playerX, y: hud.playerY };
    window.localStorage.removeItem(TUTORIAL_SAVE_KEY);
    setTutorialStep(0);
    setTutorialOpen(true);
  };
  const hudWidgetProps = (id: HudWidgetId) => {
    const config = hudLayout[id];
    return {
      "data-hud-widget": id,
      "data-hud-hidden": config.visible ? "false" : "true",
      style: {
        "--hud-x": `${config.x}px`,
        "--hud-y": `${config.y}px`,
        "--hud-scale": config.scale,
      } as CSSProperties,
    };
  };
  const beginHudDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!hudEditing || event.button !== 0) return;
    const widget = (event.target as HTMLElement).closest<HTMLElement>("[data-hud-widget]");
    if (!widget || (event.target as HTMLElement).closest(".rpg-hud-editor")) return;
    const id = widget.dataset.hudWidget as HudWidgetId;
    const config = hudLayout[id];
    if (!config) return;
    event.preventDefault();
    shellRef.current?.setPointerCapture(event.pointerId);
    hudDragRef.current = { id, startX: event.clientX, startY: event.clientY, originX: config.x, originY: config.y };
  };
  const moveHudWidget = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = hudDragRef.current;
    if (!drag) return;
    setHudLayout((current) => ({
      ...current,
      [drag.id]: {
        ...current[drag.id],
        x: Math.max(-900, Math.min(900, drag.originX + event.clientX - drag.startX)),
        y: Math.max(-600, Math.min(600, drag.originY + event.clientY - drag.startY)),
      },
    }));
  };
  const endHudDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!hudDragRef.current) return;
    hudDragRef.current = null;
    if (shellRef.current?.hasPointerCapture(event.pointerId)) shellRef.current.releasePointerCapture(event.pointerId);
  };

  const openIdentityEditor = () => {
    setIdentityName(playerNameRef.current);
    setIdentityAppearance(hud.progress.appearance);
    setIdentityError("");
    setIdentityOpen(true);
    apiRef.current?.setInputPaused(true);
  };

  const saveIdentity = () => {
    const displayName = identityName
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24);
    if (displayName.length < 3) {
      setIdentityError("Choose a name with at least 3 letters or numbers.");
      return;
    }

    const customization = customizationForAppearance(identityAppearance);
    playerNameRef.current = displayName;
    window.localStorage.setItem("ore-acres-rpg-name", displayName);
    window.localStorage.setItem(ONBOARDING_SAVE_KEY, "complete");
    window.localStorage.setItem("ore-acres-rpg-identity-sync-pending", JSON.stringify({
      displayName,
      appearance: identityAppearance,
    }));

    if (!identityReady) {
      const nextProgress = {
        ...initialProgressRef.current,
        appearance: identityAppearance,
        customization,
      };
      initialProgressRef.current = nextProgress;
      savePlayerProgress(nextProgress);
      setHud((current) => ({ ...current, progress: nextProgress }));
      setIdentityReady(true);
    } else {
      apiRef.current?.setDisplayName(displayName);
      window.localStorage.removeItem("ore-acres-rpg-identity-sync-pending");
      if (identityAppearance !== hud.progress.appearance) apiRef.current?.setAppearance(identityAppearance);
      apiRef.current?.setInputPaused(false);
    }

    setIdentityError("");
    setIdentityOpen(false);
  };

  return (
    <section
      ref={shellRef}
      className={`rpg-shell rpg-shell--${worldTime.phase} rpg-region--${regionAtmosphere} ${hud.activeAction ? "rpg-shell--action-active" : ""} ${hud.target ? "rpg-shell--targeted" : ""} ${hudEditing ? "rpg-hud-editing" : ""}`.trim()}
      aria-label="Ore Acres RPG game"
      onPointerDown={beginHudDrag}
      onPointerMove={moveHudWidget}
      onPointerUp={endHudDrag}
      onPointerCancel={endHudDrag}
    >
      <div className="rpg-host" ref={hostRef} />
      <div className="rpg-world-light" aria-hidden="true"><i /><b /></div>

      {identityOpen ? (
        <div className="rpg-identity-gate" role="dialog" aria-modal="true" aria-labelledby="rpg-identity-title">
          <section className="rpg-identity-card">
            <header>
              <div>
                <span>{identityReady ? "ADVENTURER PROFILE" : "WELCOME TO OREHAVEN"}</span>
                <h2 id="rpg-identity-title">Create your adventurer</h2>
                <p>Your name and look are visible to everyone in the shared world.</p>
              </div>
              {identityReady ? (
                <button type="button" className="rpg-identity-close" onClick={() => {
                  setIdentityOpen(false);
                  apiRef.current?.setInputPaused(false);
                }}>Close</button>
              ) : null}
            </header>

            <div className="rpg-identity-body">
              <div className={`rpg-identity-preview rpg-identity-preview--${identityAppearance}`}>
                <i aria-hidden="true" />
                <HeroPortrait
                  appearance={identityAppearance}
                  equipped={initialProgressRef.current.equipped}
                  customization={customizationForAppearance(identityAppearance)}
                  className="rpg-identity-portrait"
                />
                <strong>{identityName.trim() || "Your name"}</strong>
                <span>{APPEARANCES.find((entry) => entry.id === identityAppearance)?.role}</span>
              </div>

              <div className="rpg-identity-form">
                <label htmlFor="rpg-adventurer-name">Adventurer name</label>
                <input
                  id="rpg-adventurer-name"
                  value={identityName}
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => {
                    setIdentityName(event.target.value);
                    setIdentityError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveIdentity();
                  }}
                />
                <small>3-24 characters. Letters, numbers, spaces, hyphens, and underscores.</small>

                <div className="rpg-identity-choices" aria-label="Choose a starter appearance">
                  {APPEARANCES.map((appearance) => (
                    <button
                      key={appearance.id}
                      type="button"
                      className={identityAppearance === appearance.id ? "active" : ""}
                      onClick={() => setIdentityAppearance(appearance.id)}
                    >
                      <HeroPortrait
                        appearance={appearance.id}
                        equipped={initialProgressRef.current.equipped}
                        customization={customizationForAppearance(appearance.id)}
                        className="rpg-identity-choice-portrait"
                      />
                      <span><b>{appearance.name}</b><small>{appearance.role}</small></span>
                    </button>
                  ))}
                </div>

                {identityError ? <p className="rpg-identity-error" role="alert">{identityError}</p> : null}
                <div className="rpg-identity-wallet">
                  <div>
                    <span>Solana wallet</span>
                    <small>{walletAddress ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)} connected` : "Optional for token features. Not required to play."}</small>
                  </div>
                  {onConnectWallet ? (
                    <button type="button" onClick={walletAddress ? onDisconnectWallet : onConnectWallet}>
                      {walletAddress ? "Disconnect" : "Connect Phantom"}
                    </button>
                  ) : null}
                </div>
                {walletMessage ? <small className="rpg-identity-wallet-message">{walletMessage}</small> : null}
                <button type="button" className="rpg-identity-enter" onClick={saveIdentity}>
                  {identityReady ? "Save adventurer" : "Enter Orehaven"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {!panel && !dialogue && !hud.activeAction ? (
        <aside key={hud.location} className="rpg-zone-arrival" aria-live="polite">
          <i aria-hidden="true" />
          <span>AREA DISCOVERED</span>
          <strong>{hud.location}</strong>
          <small>{LOCATION_SUBTITLES[hud.location] ?? "The frontier stretches onward"}</small>
        </aside>
      ) : null}

      {tutorialOpen && currentTutorial ? (
        <aside className="rpg-tutorial" aria-live="polite" aria-label="Orehaven field guide">
          <header>
            <div><span>{currentTutorial.eyebrow}</span><strong>{currentTutorial.title}</strong></div>
            <button type="button" onClick={finishTutorial}>Skip</button>
          </header>
          <div className="rpg-tutorial__steps" aria-label={`Tutorial step ${tutorialStep + 1} of ${TUTORIAL_STEPS.length}`}>
            {TUTORIAL_STEPS.map((step, index) => <i key={step.id} className={index === tutorialStep ? "active" : index < tutorialStep ? "complete" : ""} />)}
          </div>
          <p>{currentTutorial.body}</p>
          <footer>
            <div><i aria-hidden="true">{tutorialStep + 1}</i><span>{currentTutorial.objective}</span></div>
            {tutorialVoice.enabled && tutorialVoice.files?.[currentTutorial.id] ? (
              <button
                type="button"
                className="voice"
                onClick={() => {
                  const file = tutorialVoice.files?.[currentTutorial.id];
                  if (!file) return;
                  tutorialAudioRef.current?.pause();
                  const audio = new Audio(`/assets/rpg/tutorial/${file}`);
                  audio.volume = 0.82;
                  tutorialAudioRef.current = audio;
                  void audio.play().catch(() => undefined);
                }}
              >Voice</button>
            ) : null}
            {currentTutorial.manual ? <button type="button" className="primary" onClick={advanceTutorial}>{tutorialStep === TUTORIAL_STEPS.length - 1 ? "Finish" : "Continue"}</button> : <em>Tracking...</em>}
          </footer>
        </aside>
      ) : null}

      {questCelebration ? (
        <aside className="rpg-quest-celebration" aria-live="assertive" aria-label={`Quest complete: ${questCelebration.title}`}>
          <i className="rpg-quest-celebration__flare" aria-hidden="true" />
          <span>QUEST COMPLETE</span>
          <strong>{questCelebration.title}</strong>
          <div>
            {questCelebration.itemId ? <ItemIcon item={itemById(questCelebration.itemId)} /> : <b>Q</b>}
            <p>{questCelebration.detail}</p>
          </div>
          <button type="button" onClick={() => setQuestCelebration(null)}>Continue adventure</button>
        </aside>
      ) : null}

      {levelCelebration && !questCelebration ? (
        <aside className="rpg-level-celebration" aria-live="assertive" aria-label={`${levelCelebration.skillName} level ${levelCelebration.level}`}>
          <i className="rpg-level-celebration__flare" aria-hidden="true" />
          <span>LEVEL UP</span>
          <strong>{levelCelebration.skillName} <b>{levelCelebration.level}</b></strong>
          <p>{levelCelebration.unlocks.length ? "New progression unlocked" : "Your mastery continues to grow"}</p>
          {levelCelebration.unlocks.length ? (
            <div className="rpg-level-celebration__unlocks">
              {levelCelebration.unlocks.slice(0, 4).map((unlock) => (
                <article key={unlock.id}>
                  <i aria-hidden="true">{unlock.kind === "ability" ? "S" : unlock.kind === "equipment" ? "G" : unlock.kind === "recipe" ? "R" : unlock.kind === "resource" ? "N" : "+"}</i>
                  <div>
                    <strong>{unlock.label}</strong>
                    <span>{unlock.detail}{unlock.level < levelCelebration.level ? ` • Level ${unlock.level}` : ""}</span>
                  </div>
                </article>
              ))}
              {levelCelebration.unlocks.length > 4 ? <small>+{levelCelebration.unlocks.length - 4} more unlocks in your Skills panel</small> : null}
            </div>
          ) : null}
          <button type="button" onClick={() => setLevelCelebration(null)}>Keep adventuring</button>
        </aside>
      ) : null}

      <header className="rpg-status" aria-label="Player status" {...hudWidgetProps("status")}>
        <div className="rpg-avatar-medallion" aria-hidden="true">
          <HeroPortrait
            appearance={hud.progress.appearance}
            equipped={hud.progress.equipped}
            customization={hud.progress.customization}
            className="rpg-status-portrait"
          />
        </div>
        <div className="rpg-status__identity">
          <button type="button" onClick={openIdentityEditor} title="Edit name and appearance">
            <strong>{playerNameRef.current}</strong>
            <small>EDIT</small>
          </button>
          <span>{hud.location}</span>
        </div>
        <div className="rpg-vital">
          <span>HP</span>
          <div><i style={{ width: `${(hud.progress.hp / hud.progress.maxHp) * 100}%` }} /></div>
          <b>{hud.progress.hp}/{hud.progress.maxHp}</b>
        </div>
        <div className="rpg-currency"><span>GOLD</span><strong>{hud.progress.gold.toLocaleString()}</strong></div>
        <div className="rpg-currency"><span>TOTAL</span><strong>{totalLevel(hud.progress)}</strong></div>
        {onConnectWallet ? (
          <button
            type="button"
            className={`rpg-wallet-toggle ${walletAddress ? "connected" : ""}`}
            title={walletAddress || "Connect an optional Solana wallet"}
            onClick={walletAddress ? onDisconnectWallet : onConnectWallet}
          >
            <span>{walletAddress ? "WALLET" : "WEB3"}</span>
            <strong>{walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-3)}` : "CONNECT"}</strong>
          </button>
        ) : null}
        {(["localhost", "127.0.0.1"].includes(window.location.hostname)) ? (
          <div className="rpg-admin-tool-links">
            <a className="rpg-admin-tool-link" href="/world-editor.html" target="_blank" rel="noreferrer">WORLD</a>
            <a className="rpg-admin-tool-link" href="/collision-editor.html" target="_blank" rel="noreferrer">COLLISIONS</a>
          </div>
        ) : null}
        <button
          type="button"
          className={`rpg-sound-toggle ${soundOn ? "active" : ""}`}
          aria-label={soundOn ? "Mute game sound" : "Enable game sound"}
          onClick={() => {
            setSoundOn((current) => {
              const next = !current;
              window.localStorage.setItem("ore-acres-rpg-sound", next ? "on" : "off");
              return next;
            });
          }}
        >
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
        <span className={`rpg-online rpg-online--${hud.online}`}>{hud.online === "online" ? `${hud.players} ONLINE` : hud.online.toUpperCase()}</span>
      </header>

      <div className="rpg-objective-stack" {...hudWidgetProps("objectives")}>
        <aside className={`rpg-quest-pin ${questTrackerOpen ? "open" : "collapsed"}`}>
          <header>
            <span>{activeQuest.chapter} • ACTIVE QUEST</span>
            <button type="button" aria-label={questTrackerOpen ? "Collapse quest tracker" : "Expand quest tracker"} onClick={() => setQuestTrackerOpen((current) => !current)}>
              {questTrackerOpen ? "Hide" : "Show"}
            </button>
          </header>
          <strong>{questTrackerOpen ? activeQuest.questTitle : activeQuest.title}</strong>
          {questTrackerOpen ? <small>{activeQuest.title}</small> : null}
          {questTrackerOpen ? <p>{activeQuest.detail}</p> : null}
          {questTrackerOpen && activeQuestTarget ? (
            <div className="rpg-quest-pin__compass" aria-label={`${activeQuestTarget.label} is ${questDirection}, about ${Math.ceil(questDistance / 32)} tiles away`}>
              <i style={{ transform: `rotate(${questBearing}deg)` }}>▲</i>
              <span><b>{questDirection}</b>{Math.ceil(questDistance / 32)} tiles</span>
              <em>{questDistance < 84 ? "Destination nearby" : activeQuestTarget.label}</em>
            </div>
          ) : null}
          {questTrackerOpen ? (
            <div className="rpg-quest-pin__actions">
              <button type="button" onClick={() => setPanel("quests")}>Journal</button>
              <button type="button" disabled={!activeQuestTarget} onClick={() => setPanel("map")}>Show on map</button>
              <button type="button" disabled={!activeQuestTarget} onClick={() => apiRef.current?.navigateToQuestTarget()}>Navigate</button>
            </div>
          ) : null}
        </aside>

        {hud.location === "Sunstone Catacombs" && catacombChronicle ? (
          <aside className="rpg-dungeon-objective" aria-label="Sunstone Catacombs objectives">
            <header><span>DUNGEON • SUNSTONE CATACOMBS</span><b>{catacombMastered ? "MASTERED" : catacombBossKills > 0 || catacombOreMined >= 8 ? "REWARD READY" : "ACTIVE"}</b></header>
            <strong>Beneath the Fallen Sun</strong>
            <p>Break the buried sentinels, survive Aurex's three phases, and claim his Sunblade.</p>
            <div className="rpg-dungeon-objective__steps">
              <span className="complete"><i>✓</i>Descend beneath the shrine</span>
              <span className={catacombVigil?.status === "ready" || catacombVigil?.status === "claimed" ? "complete" : ""}><i>{catacombVigil?.status === "ready" || catacombVigil?.status === "claimed" ? "✓" : "2"}</i>Vigil {Math.min(catacombVigil?.progress ?? 0, 4)}/4</span>
              <span className={catacombOreMined >= 8 ? "complete" : ""}><i>{catacombOreMined >= 8 ? "✓" : "3"}</i>Mine Sunstone {Math.min(catacombOreMined, 8)}/8</span>
              <span className={catacombBossKills > 0 ? "complete" : "boss"}><i>{catacombBossKills > 0 ? "✓" : "4"}</i>Defeat Aurex</span>
            </div>
            <footer><span>Rewards</span><b>Sunblade • Pickaxe recipe</b><button type="button" onClick={() => setPanel("quests")}>{catacombMastered ? "Recorded" : catacombBossKills > 0 || catacombOreMined >= 8 ? "Claim" : "Journal"}</button></footer>
          </aside>
        ) : null}

        {hud.worldEvent ? (
          <aside className={`rpg-world-event ${hud.worldEvent.respawnAt > clock ? "respawning" : "active"}`} style={{ "--event-accent": hud.worldEvent.accent } as CSSProperties}>
            <div><span>FEATURED RALLY • {hud.worldEvent.region}</span><b>LV {hud.worldEvent.level}</b></div>
            <strong>{hud.worldEvent.name}</strong>
            <p>{hud.worldEvent.rally}</p>
            <div className="rpg-world-event__bar"><i style={{ width: `${(hud.worldEvent.hp / hud.worldEvent.maxHp) * 100}%` }} /></div>
            <small>
              {hud.worldEvent.respawnAt > clock
                ? `Returns in ${Math.max(0, Math.ceil((hud.worldEvent.respawnAt - clock) / 1000))}s`
                : `${hud.worldEvent.hp}/${hud.worldEvent.maxHp} HP • ${hud.worldEvent.location}`}
            </small>
            <small className="rpg-world-event__rotation">Next rally in {Math.max(0, Math.floor((hud.worldEvent.endsAt - clock) / 60))}:{String(Math.max(0, Math.ceil((hud.worldEvent.endsAt - clock) / 1000) % 60)).padStart(2, "0")}</small>
            {activeWorldEventTarget ? <button type="button" onClick={() => setPanel("map")}>Locate event</button> : null}
          </aside>
        ) : null}
        {activeTreasureClue ? (
          <aside className="rpg-treasure-pin">
            <div><span>TREASURE TRAIL • CLUE {hud.progress.treasureTrail!.step + 1}/3</span><b>X</b></div>
            <strong>{activeTreasureClue.title}</strong>
            <p>{activeTreasureClue.clue}</p>
            <button type="button" onClick={() => setPanel("map")}>Track clue</button>
          </aside>
        ) : null}
      </div>

      {!panel && !dialogue ? (
        <aside className={`rpg-chat ${chatOpen ? "open" : "collapsed"}`} aria-label="World chat" {...hudWidgetProps("chat")}>
          <header>
            <div><i /><strong>{chatChannel === "world" ? "World" : chatChannel === "party" ? "Party" : "Guild"} Chat</strong><span>{hud.players} online</span></div>
            <div className="rpg-chat__header-actions">
              {chatOpen ? (
                <div className="rpg-chat__channels" aria-label="Chat channel">
                  {(["world", "party", "guild"] as const).map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      className={chatChannel === channel ? "active" : ""}
                      disabled={(channel === "party" && !social.party) || (channel === "guild" && !hud.progress.guild)}
                      onClick={() => setChatChannel(channel)}
                    >
                      {channel.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : null}
              <button type="button" onClick={() => setChatOpen((current) => !current)}>{chatOpen ? "Hide" : "Open"}</button>
            </div>
          </header>
          {chatOpen ? (
            <>
              <div className="rpg-chat__messages" role="log" aria-live="polite">
                {chatMessages.length ? chatMessages.map((message) => (
                  <p key={message.id} className={message.kind}>
                    {message.kind === "system" ? <strong>Realm</strong> : <strong>{message.kind === "guild" && message.tag ? `[${message.tag}] ` : ""}{message.name}</strong>}
                    <span>{message.text}</span>
                  </p>
                )) : <p className="system"><strong>Realm</strong><span>Press Enter to speak to everyone in this room.</span></p>}
                <div ref={chatEndRef} />
              </div>
              <form
                className="rpg-chat__composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  const message = chatDraft.trim();
                  if (!message) return;
                  apiRef.current?.sendChat(message, chatChannel);
                  setChatDraft("");
                }}
              >
                <input
                  ref={chatInputRef}
                  value={chatDraft}
                  maxLength={160}
                  aria-label="Chat message"
                  placeholder={`${chatChannel.charAt(0).toUpperCase()}${chatChannel.slice(1)} message...`}
                  onChange={(event) => setChatDraft(event.target.value)}
                  onFocus={() => setChatFocused(true)}
                  onBlur={() => setChatFocused(false)}
                />
                <button type="submit" disabled={!chatDraft.trim()}>Send</button>
              </form>
            </>
          ) : null}
        </aside>
      ) : null}

      <div className="rpg-minimap" aria-label="Minimap" {...hudWidgetProps("minimap")}>
        <div className="rpg-minimap__time" title="Orehaven world time">
          <i aria-hidden="true" />
          <span>{worldTime.label}</span>
          <b>{worldTime.clock}</b>
        </div>
        <div className="rpg-minimap__map">
          <WorldMapArtwork
            playerX={hud.playerX}
            playerY={hud.playerY}
            questTarget={activeQuestTarget}
            eventTarget={activeWorldEventTarget}
            bountyTarget={trackedBountyTarget}
            treasureTarget={treasureMapTarget}
            socialMarkers={socialMapMarkers}
            waystoneIds={hud.progress.waystones}
            minimap
          />
        </div>
        <div className="rpg-minimap__actions">
          <button type="button" onClick={() => setPanel("map")}>Map</button>
          <button type="button" onClick={() => apiRef.current?.centerCamera()}>Center</button>
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => apiRef.current?.adjustCameraZoom(-0.16)}>−</button>
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => apiRef.current?.adjustCameraZoom(0.16)}>+</button>
          <button
            type="button"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else if (shellRef.current?.requestFullscreen) void shellRef.current.requestFullscreen();
            }}
          >
            {isFullscreen ? "↙" : "↗"}
          </button>
        </div>
      </div>

      <nav className="rpg-menu" aria-label="Game menus" {...hudWidgetProps("menu")}>
        {MENU_ITEMS.map((item) => (
          <button
            key={item.panel}
            type="button"
            className={panel === item.panel ? "active" : ""}
            aria-label={`${item.label} (${item.hotkey})`}
            onClick={() => {
              setDialogue(null);
              setPanel(panel === item.panel ? null : item.panel);
            }}
          >
            <MenuGlyph panel={item.panel} />
            <span>{item.label}</span>
            <kbd>{item.hotkey}</kbd>
            {item.panel === "activities" && claimableContracts > 0 ? <em>{claimableContracts}</em> : null}
            {item.panel === "social" && (social.invite || social.guildInvite) ? <em>!</em> : null}
          </button>
        ))}
        {onExit ? (
          <button
            type="button"
            className="rpg-menu__exit"
            aria-label="Exit game to homepage"
            onClick={onExit}
          >
            <svg className="rpg-menu__glyph" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
            </svg>
            <span>Exit game</span>
            <kbd>HOME</kbd>
          </button>
        ) : null}
      </nav>

      <button
        type="button"
        className={`rpg-hud-customize-toggle ${hudEditing ? "active" : ""}`}
        aria-label={hudEditing ? "Finish editing interface" : "Customize interface"}
        title="Move, resize, or hide interface panels"
        onClick={() => setHudEditing((current) => !current)}
      >{hudEditing ? "LOCK HUD" : "HUD"}</button>

      {hudEditing ? (
        <aside className="rpg-hud-editor" aria-label="Interface editor">
          <header><div><span>INTERFACE EDITOR</span><strong>Make the HUD yours</strong></div><button type="button" onClick={() => setHudEditing(false)}>Done</button></header>
          <p>Drag any outlined panel. Adjust its size or hide anything you do not need.</p>
          <div>
            {HUD_WIDGETS.map((widget) => {
              const config = hudLayout[widget.id];
              return (
                <article key={widget.id}>
                  <button
                    type="button"
                    className={config.visible ? "visible" : "hidden"}
                    onClick={() => setHudLayout((current) => ({ ...current, [widget.id]: { ...current[widget.id], visible: !current[widget.id].visible } }))}
                  >{config.visible ? "ON" : "OFF"}</button>
                  <label><b>{widget.label}</b><span>{Math.round(config.scale * 100)}%</span><input type="range" min="65" max="140" step="5" value={Math.round(config.scale * 100)} onChange={(event) => setHudLayout((current) => ({ ...current, [widget.id]: { ...current[widget.id], scale: Number(event.target.value) / 100 } }))} /></label>
                  <button type="button" className="reset" aria-label={`Reset ${widget.label}`} onClick={() => setHudLayout((current) => ({ ...current, [widget.id]: { ...DEFAULT_HUD_LAYOUT[widget.id] } }))}>↺</button>
                </article>
              );
            })}
          </div>
          <footer><button type="button" onClick={() => setHudLayout(normalizeHudLayout(null))}>Reset everything</button><small>Saved automatically on this device</small></footer>
        </aside>
      ) : null}

      {hud.target ? (
        <section className={`rpg-target-frame rpg-target-frame--${hud.target.combatStyle} ${hud.target.rare ? "rare" : ""} ${hud.activeAction ? "engaged" : "selected"}`} aria-label={`Target: ${hud.target.name}`} {...hudWidgetProps("target")}>
          <div className="rpg-target-frame__portrait">
            <EnemyTargetPortrait target={hud.target} />
            {hud.target.rare ? <i>RARE</i> : null}
          </div>
          <div className="rpg-target-frame__body">
            <header>
              <div><span>{hud.target.combatStyle} enemy</span><strong>{hud.target.name}</strong></div>
              <div className="rpg-target-frame__controls">
                <b>LV {hud.target.level}</b>
                {hud.activeAction
                  ? <button type="button" onClick={() => apiRef.current?.cancelAction()}>Retreat <kbd>Esc</kbd></button>
                  : <button type="button" className="engage" onClick={() => apiRef.current?.engageTarget()}>Engage <kbd>E</kbd></button>}
              </div>
            </header>
            <div className="rpg-target-frame__health">
              <i style={{ width: `${(hud.target.hp / hud.target.maxHp) * 100}%` }} />
              <span>{hud.target.hp}/{hud.target.maxHp}</span>
            </div>
            <div className={`rpg-target-frame__engagement ${hud.activeAction ? "engaged" : "selected"}`}>
              <i />
              <span>{hud.activeAction ? `${combatStyleLabel(equippedCombatStyle)} attacks active` : "Selected • Engage to attack"}</span>
            </div>
            {hud.target.status && targetStatusRemainingMs > 0 ? (
              <div className={`rpg-target-frame__status rpg-target-frame__status--${hud.target.status.kind}`}>
                <i />
                <span>{hud.target.status.label}</span>
                <b>{(targetStatusRemainingMs / 1000).toFixed(1)}s</b>
              </div>
            ) : null}
            {hud.activeAction ? <div className="rpg-target-frame__cadence"><i style={{ width: `${actionProgress}%` }} /></div> : null}
          </div>
        </section>
      ) : null}

      {hud.incomingCast && incomingCastRemainingMs > 0 ? (
        <section
          className={`rpg-threat-cast ${hud.target ? "rpg-threat-cast--with-target" : ""}`}
          style={{ "--threat-color": `#${hud.incomingCast.color.toString(16).padStart(6, "0")}` } as React.CSSProperties}
          aria-live="assertive"
          aria-label={`${hud.incomingCast.enemyName} casting ${hud.incomingCast.abilityName}`}
        >
          <header>
            <span>DODGE THE MARKED GROUND</span>
            <b>{(incomingCastRemainingMs / 1000).toFixed(1)}s</b>
          </header>
          <strong>{hud.incomingCast.abilityName}</strong>
          <small>{hud.incomingCast.enemyName}</small>
          <div><i style={{ width: `${incomingCastProgress}%` }} /></div>
        </section>
      ) : null}

      {hud.activeAction && !hud.target ? (
        <div className="rpg-progress-banner">
          <div>
            <strong>{hud.activeAction.label}</strong>
            <span>{Math.max(0, Math.ceil((hud.activeAction.endsAt - actionClock) / 1000))}s</span>
          </div>
          <p>{hud.activeAction.detail}</p>
          <div className="rpg-progress-track"><i style={{ width: `${actionProgress}%` }} /></div>
        </div>
      ) : null}

      {dialogue ? (
        <section className="rpg-dialogue" aria-label={`Conversation with ${dialogue.speaker}`}>
          <div className="rpg-dialogue__portrait">
            <NpcPortrait npcId={dialogue.portraitId} />
          </div>
          <div className="rpg-dialogue__body">
            <header>
              <div>
                <span>{dialogue.role}</span>
                <h3>{dialogue.speaker}</h3>
              </div>
              {dialogue.quest ? <b>{dialogue.quest.turnIn ? "Quest turn-in" : dialogue.quest.chapter}</b> : null}
            </header>
            {dialogue.quest ? (
              <div className={`rpg-dialogue__quest ${dialogue.quest.turnIn ? "turn-in" : ""}`}>
                <small>{dialogue.quest.title}</small>
                <strong>{dialogue.quest.objective}</strong>
              </div>
            ) : null}
            <p className="rpg-dialogue__line">{dialogue.lines[dialoguePageIndex]}</p>
            {dialogue.lines.length > 1 ? (
              <div className="rpg-dialogue__pages" aria-label={`Dialogue page ${dialoguePageIndex + 1} of ${dialogue.lines.length}`}>
                {dialogue.lines.map((_line, index) => <i key={index} className={index === dialoguePageIndex ? "active" : index < dialoguePageIndex ? "read" : ""} />)}
              </div>
            ) : null}
            <div className="rpg-dialogue__actions">
              {dialogueAtEnd && dialogue.shop ? <button type="button" onClick={() => { setDialogue(null); setPanel("shop"); }}>Browse wares</button> : null}
              {dialogueAtEnd && dialogue.service === "bank" ? <button type="button" onClick={() => { setDialogue(null); setPanel("bank"); }}>Open bank</button> : null}
              {dialogueAtEnd && dialogue.service === "workshop" ? <button type="button" onClick={() => { setDialogue(null); setPanel("workshop"); }}>Use workshop</button> : null}
              {dialogueAtEnd && dialogue.service === "activities" ? <button type="button" onClick={() => { setDialogue(null); setPanel("activities"); }}>View adventurer board</button> : null}
              {dialogueAtEnd && dialogue.service === "social" ? <button type="button" onClick={() => { setDialogue(null); setPanel("social"); }}>Plan an expedition</button> : null}
              {dialogueAtEnd && dialogue.sideQuest && dialogue.sideQuest.status !== "claimed" ? (
                <button type="button" disabled={dialogue.sideQuest.status === "active"} className={dialogue.sideQuest.status === "ready" ? "primary" : ""} onClick={() => { apiRef.current?.sideQuestAction(dialogue.sideQuest!.id); setDialogue(null); }}>
                  {dialogue.sideQuest.status === "available" ? `Accept: ${dialogue.sideQuest.title}` : dialogue.sideQuest.status === "ready" ? `Turn in: ${dialogue.sideQuest.title}` : `${dialogue.sideQuest.objective} in progress`}
                </button>
              ) : null}
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  if (dialogueAtEnd) setDialogue(null);
                  else setDialoguePage((current) => Math.min(current + 1, dialogue.lines.length - 1));
                }}
              >
                {dialogueAtEnd ? "Close" : `Continue ${dialoguePageIndex + 1}/${dialogue.lines.length}`}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="rpg-actionbar" {...hudWidgetProps("actionbar")}>
        <button type="button" className="rpg-actionbar__interact" onClick={() => apiRef.current?.interact()}>
          <kbd>E</kbd>
          <span>{hud.action}</span>
        </button>
        <p>{hud.message}</p>
        <div className="rpg-hotbar-wrap">
          {hotbarEditing ? (
            <section className="rpg-hotbar-editor" aria-label="Hotbar editor">
              <header><div><span>LOADOUT</span><strong>Select slot {selectedHotbarSlot + 1}, then choose an action</strong></div><button type="button" onClick={() => setHotbarEditing(false)}>Done</button></header>
              <div className="rpg-hotbar-editor__palette">
                {hotbarAbilityPalette.map(({ entry, label, badge, detail }) => (
                  <button
                    key={hotbarEntryKey(entry)}
                    type="button"
                    draggable
                    title={detail}
                    onDragStart={(event) => event.dataTransfer.setData("application/x-orehaven-hotbar-entry", JSON.stringify(entry))}
                    onClick={() => assignHotbarEntry(selectedHotbarSlot, entry)}
                  ><b>{badge}</b><span>{label}</span></button>
                ))}
                {hotbarConsumables.map((item) => {
                  const entry: HotbarEntry = { kind: "consumable", itemId: item.id };
                  return (
                    <button
                      key={hotbarEntryKey(entry)}
                      type="button"
                      draggable
                      title={item.description}
                      onDragStart={(event) => event.dataTransfer.setData("application/x-orehaven-hotbar-entry", JSON.stringify(entry))}
                      onClick={() => assignHotbarEntry(selectedHotbarSlot, entry)}
                    ><ItemIcon item={item} /><span>{item.name}</span><em>{hud.progress.inventory[item.id] ?? 0}</em></button>
                  );
                })}
                <button type="button" className="clear" onClick={() => assignHotbarEntry(selectedHotbarSlot, null)}><b>×</b><span>Empty slot</span></button>
              </div>
              <footer><span>Drag slots to reorder, or click a slot and choose an action.</span><button type="button" onClick={() => setHotbarLayout(DEFAULT_HOTBAR_LAYOUT.map((entry) => entry ? { ...entry } : null))}>Reset</button></footer>
            </section>
          ) : null}
          <div className={`rpg-hotbar ${hotbarEditing ? "is-editing" : ""}`}>
            {hotbarLayout.map((entry, index) => {
              const abilitySlot = entry?.kind === "ability" ? entry.slot : null;
              const treeAbility = abilitySlot === "tree-primary" ? primaryTreeAbility : abilitySlot === "tree-secondary" ? secondaryTreeAbility : null;
              const abilityName = abilitySlot ? (abilitySlot === "signature" ? signatureAbility.name : abilitySlot === "second-wind" ? "Second Wind" : treeAbility?.name ?? "Locked skill") : "";
              const abilityBadge = abilitySlot === "signature" ? signatureAbility.badge : abilitySlot === "second-wind" ? "SW" : treeAbility?.badge ?? "?";
              const abilityColor = abilitySlot === "signature" ? signatureAbility.color : abilitySlot === "second-wind" ? 0x63bd7a : treeAbility?.color;
              const readyMs = abilitySlot === "signature"
                ? signatureRemainingMs
                : abilitySlot === "second-wind"
                  ? secondWindRemainingMs
                  : treeAbility
                    ? Math.max(0, (hud.abilityCooldowns.treeReadyAt[treeAbility.id] ?? 0) - clock)
                    : 0;
              const cooldownMs = abilitySlot === "signature" ? signatureAbility.cooldownMs : abilitySlot === "second-wind" ? 18_000 : treeAbility?.cooldownMs ?? 1;
              const consumable = entry?.kind === "consumable" ? itemById(entry.itemId) : null;
              const quantity = consumable ? hud.progress.inventory[consumable.id] ?? 0 : 0;
              const unavailable = abilitySlot === "signature"
                ? !hud.activeAction || !hud.target || readyMs > 0
                : abilitySlot === "second-wind"
                  ? hud.progress.hp >= hud.progress.maxHp || readyMs > 0
                  : abilitySlot
                    ? !treeAbility || !hud.target || readyMs > 0
                    : consumable
                      ? quantity <= 0
                      : true;
              return (
                <button
                  key={index}
                  type="button"
                  draggable={hotbarEditing && Boolean(entry)}
                  className={`${abilitySlot ? `rpg-hotbar__skill ${abilitySlot === "second-wind" ? "rpg-hotbar__skill--heal" : treeAbility ? `rpg-hotbar__skill--tree rpg-hotbar__skill--${treeAbility.branch}` : `rpg-hotbar__skill--${equippedCombatStyle}`}` : ""} ${!entry ? "empty" : ""} ${hotbarEditing && selectedHotbarSlot === index ? "selected" : ""}`}
                  style={abilityColor ? { "--ability-color": `#${abilityColor.toString(16).padStart(6, "0")}` } as React.CSSProperties : undefined}
                  title={hotbarEditing ? `Edit hotbar slot ${index + 1}` : abilitySlot ? abilityName : consumable?.name ?? `Empty slot ${index + 1}`}
                  aria-label={`${abilityName || consumable?.name || "Empty slot"}, hotkey ${index + 1}`}
                  disabled={!hotbarEditing && unavailable}
                  onClick={() => {
                    if (hotbarEditing) setSelectedHotbarSlot(index);
                    else if (abilitySlot) apiRef.current?.useAbility(abilitySlot);
                    else if (consumable) apiRef.current?.consume(consumable.id);
                  }}
                  onDragStart={(event) => event.dataTransfer.setData("application/x-orehaven-hotbar-slot", String(index))}
                  onDragOver={(event) => { if (hotbarEditing) event.preventDefault(); }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceSlot = event.dataTransfer.getData("application/x-orehaven-hotbar-slot");
                    const sourceIndex = Number(sourceSlot);
                    if (sourceSlot && Number.isInteger(sourceIndex)) swapHotbarSlots(sourceIndex, index);
                    const rawEntry = event.dataTransfer.getData("application/x-orehaven-hotbar-entry");
                    if (rawEntry) {
                      try { assignHotbarEntry(index, normalizeHotbarLayout([JSON.parse(rawEntry)])[0]); } catch { /* Ignore malformed drag payloads. */ }
                    }
                  }}
                >
                  {abilitySlot === "signature" ? <ItemIcon item={equippedWeapon} className="rpg-item-icon--hotbar" /> : null}
                  {abilitySlot && abilitySlot !== "signature" ? <b className="rpg-hotbar__ability-mark">{abilityBadge}</b> : null}
                  {consumable ? <ItemIcon item={consumable} className="rpg-item-icon--hotbar" /> : null}
                  {!entry ? <b className="rpg-hotbar__empty-mark">+</b> : null}
                  {abilitySlot === "signature" ? <strong>{abilityBadge}</strong> : null}
                  <kbd>{index + 1}</kbd>
                  {consumable ? <span>{quantity}</span> : null}
                  {readyMs > 0 ? <small>{Math.ceil(readyMs / 1000)}</small> : null}
                  {abilitySlot && readyMs > 0 ? <i className="rpg-hotbar__cooldown" style={{ height: `${Math.min(100, (readyMs / cooldownMs) * 100)}%` }} /> : null}
                </button>
              );
            })}
          </div>
          <button type="button" className={`rpg-hotbar-edit ${hotbarEditing ? "active" : ""}`} aria-label="Edit hotbar" title="Edit hotbar" onClick={() => setHotbarEditing((current) => !current)}>{hotbarEditing ? "✓" : "EDIT"}</button>
        </div>
      </footer>

      <div className="rpg-toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <article key={toast.id} className={`rpg-toast rpg-toast--${toast.tone}`}>
            {toast.itemId ? <ItemIcon item={itemById(toast.itemId)} /> : <i>{toast.tone === "level" ? "UP" : toast.tone === "quest" ? "Q" : "!"}</i>}
            <div><strong>{toast.title}</strong><span>{toast.detail}</span></div>
          </article>
        ))}
      </div>

      {panel ? (
        <div className="rpg-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeOverlays(); }}>
          <section className={`rpg-panel rpg-panel--${panel}`} role="dialog" aria-modal="true" aria-label={panel}>
            <header>
              <div>
                <span>OREHAVEN ADVENTURER</span>
                <h2>{panel === "bank" ? "Orehaven Bank" : panel === "workshop" ? "Korra's Workshop" : MENU_ITEMS.find((item) => item.panel === panel)?.label}</h2>
              </div>
              <button type="button" onClick={closeOverlays}>Close <kbd>Esc</kbd></button>
            </header>

            {panel === "quests" ? (
              <div className="rpg-quest-list">
                <section className="rpg-chronicle-board">
                  <header>
                    <div><span>PERMANENT SIDE ADVENTURES</span><h3>Orehaven Chronicles</h3></div>
                    <b>{claimableAdventures > 0 ? `${claimableAdventures} READY` : "ALWAYS ACTIVE"}</b>
                  </header>
                  <p>These records progress across every session. Complete them in any order and claim each reward once.</p>
                  <div className="rpg-chronicle-grid">
                    {ADVENTURE_CHRONICLES.map((adventure) => {
                      const current = adventureProgress(hud.progress, adventure);
                      const claimed = hud.progress.adventureClaims.includes(adventure.id);
                      const complete = current >= adventure.target;
                      const percent = Math.min(100, (current / adventure.target) * 100);
                      return (
                        <article key={adventure.id} className={`${complete ? "complete" : ""} ${claimed ? "claimed" : ""}`.trim()}>
                          <i>{claimed ? "OK" : adventure.metric === "discoveries" ? "MAP" : adventure.metric.startsWith("target:") ? "BOSS" : adventure.metric === "enemiesDefeated" ? "HUNT" : adventure.metric === "itemsCrafted" ? "MAKE" : "GATHER"}</i>
                          <div>
                            <span>{adventure.chapter}</span>
                            <h3>{adventure.title}</h3>
                            <p>{adventure.description}</p>
                            <div className="rpg-chronicle-progress"><i style={{ width: `${percent}%` }} /></div>
                            <footer>
                              <b>{claimed ? "RECORDED" : `${Math.min(current, adventure.target)}/${adventure.target}`}</b>
                              <strong>+{adventure.rewardGold} gold</strong>
                              <button type="button" disabled={!complete || claimed} onClick={() => apiRef.current?.claimAdventure(adventure.id)}>
                                {claimed ? "Claimed" : complete ? "Claim reward" : "In progress"}
                              </button>
                            </footer>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
                <section className="rpg-side-stories" aria-label="Regional side quests">
                  <header><div><span>REGIONAL TALES</span><h3>Stories Beyond the Main Road</h3></div><b>{Object.values(hud.progress.sideQuests).filter((state) => state.status === "claimed").length}/{SIDE_QUESTS.length} COMPLETE</b></header>
                  <div>
                    {SIDE_QUESTS.map((quest) => {
                      const state = hud.progress.sideQuests[quest.id];
                      const locked = hud.progress.questStep < quest.unlockQuestStep;
                      const progress = state?.progress ?? 0;
                      return (
                        <article key={quest.id} className={`${state?.status ?? (locked ? "locked" : "available")}`}>
                          <i>{state?.status === "claimed" ? "OK" : state?.status === "ready" ? "!" : quest.giverNpcId === "smith" ? "ORE" : quest.giverNpcId === "ranger" ? "FISH" : "RAT"}</i>
                          <div><span>{quest.chapter} • {quest.giverName}</span><h3>{quest.title}</h3><p>{quest.description}</p><div className="rpg-side-stories__progress"><i style={{ width: `${Math.min(100, (progress / quest.objective.target) * 100)}%` }} /></div><footer><b>{locked ? "LOCKED" : !state ? `Speak with ${quest.giverName}` : state.status === "claimed" ? "COMPLETE" : `${quest.objective.label} ${progress}/${quest.objective.target}`}</b><strong>+{quest.reward.gold} gold</strong></footer></div>
                        </article>
                      );
                    })}
                  </div>
                </section>
                <section className="rpg-rare-hunts" aria-label="Rare hunt dossiers">
                  <header>
                    <div><span>FRONTIER INTELLIGENCE</span><h3>Named Rare Hunts</h3></div>
                    <b>{RARE_HUNT_DOSSIERS.length} KNOWN TARGETS</b>
                  </header>
                  <p>Named creatures return slowly and carry unique loot. Their territories are marked in violet on the world map.</p>
                  <div>
                    {RARE_HUNT_DOSSIERS.map((dossier) => {
                      const enemy = ENEMIES.find((candidate) => candidate.id === dossier.enemyId);
                      if (!enemy) return null;
                      const drops = RARE_HUNT_LOOT[dossier.enemyId] ?? [];
                      const discoveredDrops = drops.filter((drop) => (hud.progress.collectionLog[drop.itemId] ?? 0) > 0).length;
                      return (
                        <article key={dossier.enemyId} style={{ "--rare-aura": `#${(enemy.visual?.auraColor ?? 0x9f75d8).toString(16).padStart(6, "0")}` } as React.CSSProperties}>
                          <header>
                            <i>RARE</i>
                            <div><span>{dossier.region}</span><h3>{enemy.name}</h3></div>
                            <b>LV {enemy.level}</b>
                          </header>
                          <div className="rpg-rare-hunts__intel">
                            <span><b>{enemy.attackStyle ?? "melee"}</b> style</span>
                            <span><b>{Math.round((enemy.respawnMs ?? 0) / 60_000)} min</b> respawn</span>
                            <span><b>{dossier.signature}</b></span>
                          </div>
                          <p>{dossier.fieldNote}</p>
                          <div className="rpg-rare-hunts__drops">
                            {drops.map((drop) => {
                              const item = itemById(drop.itemId);
                              const found = hud.progress.collectionLog[drop.itemId] ?? 0;
                              return (
                                <div key={drop.itemId} className={found > 0 ? "found" : ""} title={`${item?.name ?? drop.itemId}: ${(drop.chance * 100).toFixed(drop.chance < 0.01 ? 1 : 0)}% chance`}>
                                  <ItemIcon item={item} />
                                  <span>{item?.name ?? drop.itemId}<small>{(drop.chance * 100).toFixed(drop.chance < 0.01 ? 1 : 0)}%</small></span>
                                </div>
                              );
                            })}
                          </div>
                          <footer>
                            <span>{discoveredDrops}/{drops.length} drops discovered</span>
                            <button type="button" onClick={() => setPanel("map")}>Show territory</button>
                          </footer>
                        </article>
                      );
                    })}
                  </div>
                </section>
                {QUEST_JOURNAL_GROUPS.map((quest) => {
                  const firstStep = quest.steps[0]?.index ?? 0;
                  const lastStep = quest.steps.at(-1)?.index ?? firstStep;
                  const state = hud.progress.questStep > lastStep
                    ? "complete"
                    : hud.progress.questStep >= firstStep
                      ? "active"
                      : "locked";
                  return (
                    <section key={quest.questId} className={`rpg-quest-chain rpg-quest-chain--${state}`}>
                      <header>
                        <div><span>{quest.chapter}</span><h3>{quest.title}</h3></div>
                        <b>{state === "complete" ? "COMPLETE" : state === "active" ? "IN PROGRESS" : "LOCKED"}</b>
                      </header>
                      <div>
                        {quest.steps.map(({ step, index }) => (
                          <article key={`${quest.questId}-${index}`} className={index === hud.progress.questStep ? "active" : index < hud.progress.questStep ? "complete" : "locked"}>
                            <i>{index < hud.progress.questStep ? "OK" : index - firstStep + 1}</i>
                            <div><span>{step.target}</span><h3>{step.title}</h3><p>{step.detail}</p></div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : null}

            {panel === "activities" ? (
              <div className="rpg-activities">
                <section className="rpg-activities__intro">
                  <div><span>DAILY ADVENTURER BOARD</span><h3>Contracts reset each UTC day</h3></div>
                  <p>Play any activity you enjoy, then return here to claim gold and useful supplies. Milestones track your lifetime journey.</p>
                </section>
                <div className="rpg-contract-grid">
                  {DAILY_CONTRACTS.map((contract) => {
                    const current = activityContractCount(activities, contract);
                    const complete = current >= contract.target;
                    const claimed = activities.daily.claimed.includes(contract.id);
                    const percent = Math.min(100, (current / contract.target) * 100);
                    return (
                      <article key={contract.id} className={`${complete ? "complete" : ""} ${claimed ? "claimed" : ""}`.trim()}>
                        <header><span>{contract.targetKey ? "bounty" : contract.kind}</span><b>{claimed ? "CLAIMED" : complete ? "READY" : `${Math.min(current, contract.target)}/${contract.target}`}</b></header>
                        <h3>{contract.title}</h3>
                        <p>{contract.description}</p>
                        <div className="rpg-contract-progress"><i style={{ width: `${percent}%` }} /></div>
                        <div className="rpg-contract-rewards">
                          <strong>+{contract.rewardGold} gold</strong>
                          {contract.rewardItems.map((reward) => {
                            const item = itemById(reward.itemId);
                            return <span key={reward.itemId}><ItemIcon item={item} />{item?.name ?? "Item"} x{reward.quantity}</span>;
                          })}
                        </div>
                        {contract.targetKey ? (
                          <button
                            type="button"
                            className={trackedBountyKey === contract.targetKey ? "tracked" : "secondary"}
                            onClick={() => {
                              setTrackedBountyKey(contract.targetKey);
                              setPanel("map");
                            }}
                          >
                            {trackedBountyKey === contract.targetKey ? "Target tracked" : "Track target"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={!complete || claimed}
                          onClick={() => apiRef.current?.claimContract(contract.id)}
                        >
                          {claimed ? "Reward claimed" : complete ? "Claim reward" : "In progress"}
                        </button>
                      </article>
                    );
                  })}
                </div>
                <section className="rpg-milestones">
                  <header><span>LEGACY MILESTONES</span><h3>Your Orehaven record</h3></header>
                  <div>
                    {ACTIVITY_MILESTONES.map((milestone) => {
                      const current = lifetimeActivityCount(activities, milestone.kind);
                      const complete = current >= milestone.target;
                      return (
                        <article key={milestone.id} className={complete ? "complete" : ""}>
                          <i>{complete ? "OK" : milestone.target}</i>
                          <div><h4>{milestone.title}</h4><p>{milestone.description}</p><span>{Math.min(current, milestone.target)}/{milestone.target}</span></div>
                          <div className="rpg-milestone-progress"><i style={{ width: `${Math.min(100, (current / milestone.target) * 100)}%` }} /></div>
                        </article>
                      );
                    })}
                  </div>
                </section>
                <section className="rpg-collection-log">
                  <header>
                    <div><span>CREATURE COLLECTION</span><h3>Field discoveries</h3></div>
                    <strong>{COLLECTION_ITEMS.filter((item) => (hud.progress.collectionLog[item.id] ?? 0) > 0).length}/{COLLECTION_ITEMS.length}</strong>
                  </header>
                  <div>
                    {COLLECTION_ITEMS.map((item) => {
                      const found = hud.progress.collectionLog[item.id] ?? 0;
                      return (
                        <article key={item.id} className={`${found ? "found" : "missing"} rarity-${item.rarity}`} title={found ? item.description : "Keep exploring to discover this drop."}>
                          <ItemIcon item={found ? item : undefined} />
                          <div><span>{item.rarity}</span><h4>{found ? item.name : "Undiscovered"}</h4><small>{found ? `Found ${found}` : "???"}</small></div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : null}

            {panel === "social" ? (
              <div className="rpg-social-panel">
                {social.invite ? (
                  <section className="rpg-party-invite">
                    <div><span>PARTY INVITATION</span><h3>{social.invite.inviterName} needs an ally</h3></div>
                    <p>Join their temporary five-player fellowship. Nearby party members earn reduced assist XP and gold when the group defeats ordinary creatures.</p>
                    <div>
                      <button type="button" onClick={() => apiRef.current?.respondToPartyInvite(true)}>Join party</button>
                      <button type="button" className="secondary" onClick={() => apiRef.current?.respondToPartyInvite(false)}>Decline</button>
                    </div>
                  </section>
                ) : null}

                {social.guildInvite ? (
                  <section className="rpg-party-invite rpg-guild-invite">
                    <div><span>GUILD INVITATION</span><h3>[{social.guildInvite.guild.tag}] {social.guildInvite.guild.name}</h3></div>
                    <p>{social.guildInvite.inviterName} invited you to join a persistent adventurer guild. Your membership is saved with your character profile.</p>
                    <div>
                      <button type="button" onClick={() => apiRef.current?.respondToGuildInvite(true)}>Join guild</button>
                      <button type="button" className="secondary" onClick={() => apiRef.current?.respondToGuildInvite(false)}>Decline</button>
                    </div>
                  </section>
                ) : null}

                <section className="rpg-guild-card">
                  <header>
                    <div><span>ADVENTURER GUILD</span><h3>{hud.progress.guild ? `[${hud.progress.guild.tag}] ${hud.progress.guild.name}` : "Found a lasting community"}</h3></div>
                    {hud.progress.guild ? <button type="button" className="secondary" onClick={() => apiRef.current?.leaveGuild()}>Leave guild</button> : null}
                  </header>
                  {hud.progress.guild ? (
                    <>
                      <div className="rpg-guild-banner">
                        <b>{hud.progress.guild.tag}</b>
                        <div>
                          <span>{guildRank.name.toUpperCase()}</span>
                          <strong>{guildRenown} renown • {guildmates.length} online</strong>
                          <p>{nextGuildRank ? `${nextGuildRank.renown - guildRenown} renown until ${nextGuildRank.name}.` : "Maximum guild standing achieved."} Complete Captain Thorne's expeditions while representing your guild to advance.</p>
                          <div className="rpg-guild-renown"><i style={{ width: `${guildRankProgress}%` }} /></div>
                        </div>
                      </div>
                      <div className="rpg-guildmates">
                        {guildmates.map((member) => (
                          <article key={member.id}>
                            <HeroPortrait appearance={member.appearance} equipped={member.equipped} customization={member.customization} className="rpg-party-portrait" />
                            <div><h4>{member.name}{member.id === social.selfId ? " (You)" : ""}</h4><span>{guildRankForRenown(member.guild?.renown ?? 0).name} • TL {member.totalLevel}</span></div>
                            <i>ONLINE</i>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <form
                      className="rpg-guild-founder"
                      onSubmit={(event) => {
                        event.preventDefault();
                        apiRef.current?.createGuild(guildName, guildTag);
                      }}
                    >
                      <div><b>Choose a name and banner tag</b><p>Founding a guild is free during playtest and uses the profile storage already running the game.</p></div>
                      <label><span>Guild name</span><input value={guildName} minLength={3} maxLength={24} placeholder="Moonwater Company" onChange={(event) => setGuildName(event.target.value)} /></label>
                      <label className="tag"><span>Tag</span><input value={guildTag} minLength={2} maxLength={5} placeholder="MOON" onChange={(event) => setGuildTag(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></label>
                      <button type="submit" disabled={guildName.trim().length < 3 || guildTag.length < 2}>Found guild</button>
                    </form>
                  )}
                </section>

                <section className="rpg-party-card">
                  <header>
                    <div><span>YOUR FELLOWSHIP</span><h3>{social.party ? `${social.party.members.length}/5 adventurers` : "Adventure together"}</h3></div>
                    {social.party ? <button type="button" className="secondary" onClick={() => apiRef.current?.leaveParty()}>Leave party</button> : null}
                  </header>
                  {social.party ? (
                    <>
                      <div className="rpg-party-members">
                        {social.party.members.map((member) => (
                          <article key={member.id} className={member.id === social.selfId ? "self" : ""}>
                            <HeroPortrait appearance={member.appearance} equipped={member.equipped} customization={member.customization} className="rpg-party-portrait" />
                            <div><span>{member.leader ? "PARTY LEADER" : "PARTY MEMBER"}</span><h4>{member.name}{member.id === social.selfId ? " (You)" : ""}</h4><small>Total level {member.totalLevel}</small></div>
                            <i className="online">ONLINE</i>
                          </article>
                        ))}
                      </div>
                      <section className={`rpg-expedition ${expedition?.status ?? "available"}`}>
                        <div className="rpg-expedition__crest">{expedition?.crest ?? selectedExpedition.crest}</div>
                        <div className="rpg-expedition__copy">
                          <span>{expedition ? `${expedition.region} • ACTIVE EXPEDITION` : "CAPTAIN THORNE'S EXPEDITION BOARD"}</span>
                          <h4>{expedition?.name ?? selectedExpedition.name}</h4>
                          <p>{expedition?.description ?? selectedExpedition.description}</p>
                          {expedition ? (
                            <div className="rpg-expedition__progress"><i style={{ width: `${Math.min(100, (expedition.progress / expedition.target) * 100)}%` }} /></div>
                          ) : null}
                          <small>
                            {expedition?.status === "complete"
                              ? "Expedition complete • Contribution rewards delivered"
                              : expedition?.status === "expired"
                                ? "Expedition expired • The leader may restart it"
                                : expedition
                                  ? `${expedition.progress}/${expedition.target} targets • ${expedition.contributorCount}/2 contributors • ${Math.floor(expeditionRemainingSeconds / 60)}:${String(expeditionRemainingSeconds % 60).padStart(2, "0")}`
                                  : `Reward: ${selectedExpedition.reward.gold} gold • ${selectedExpedition.reward.defenseXp} Defense XP • ${selectedExpedition.reward.guildRenown} guild renown • ${itemById(selectedExpedition.reward.itemId)?.name ?? "item"}`}
                          </small>
                        </div>
                        <div className="rpg-expedition__actions">
                          {(!expedition || expedition.status !== "active") ? (
                            <button
                              type="button"
                              disabled={social.party.leaderId !== social.selfId || social.party.members.length < 2 || social.party.completedExpeditionIds.includes(selectedExpedition.id)}
                              onClick={() => apiRef.current?.startExpedition(selectedExpedition.id)}
                            >
                              {social.party.completedExpeditionIds.includes(selectedExpedition.id)
                                ? "Completed"
                                : social.party.members.length < 2
                                  ? "Need an ally"
                                  : social.party.leaderId !== social.selfId
                                    ? "Leader starts"
                                    : "Start expedition"}
                            </button>
                          ) : null}
                          {expedition?.status === "active" ? <button type="button" onClick={() => { setTrackedBountyKey(expedition.trackingKey); setPanel("map"); }}>Track {expedition.region}</button> : null}
                        </div>
                      </section>
                      {!expedition || expedition.status !== "active" ? (
                        <div className="rpg-expedition-board" aria-label="Available cooperative expeditions">
                          {EXPEDITIONS.map((option) => {
                            const completed = social.party?.completedExpeditionIds.includes(option.id) ?? false;
                            const underRecommended = partyAverageTotalLevel < option.recommendedTotalLevel;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                className={`${selectedExpedition.id === option.id ? "selected" : ""} ${completed ? "completed" : ""}`.trim()}
                                onClick={() => setSelectedExpeditionId(option.id)}
                              >
                                <i>{completed ? "OK" : option.crest}</i>
                                <span><b>{option.name}</b><small>{option.region} • {option.target} {option.targetKind} targets</small></span>
                                <em className={underRecommended ? "under" : "ready"}>TL {option.recommendedTotalLevel}</em>
                              </button>
                            );
                          })}
                          <p>Party average: <b>TL {partyAverageTotalLevel}</b>. Recommended levels are guidance, not a hard lock.</p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="rpg-party-empty">
                      <b>Invite someone from the realm roster</b>
                      <p>Parties last for the current session. Stay within 360 world units of a party kill to earn 45% combat XP and 20% gold as assist credit.</p>
                    </div>
                  )}
                </section>

                <section className="rpg-realm-roster">
                  <header><div><span>REALM ROSTER</span><h3>Adventurers in this room</h3></div><strong>{social.online.length} ONLINE</strong></header>
                  <div>
                    {otherAdventurers.length ? otherAdventurers.map((adventurer: OnlineAdventurer) => {
                      const alreadyMember = partyMemberIds.has(adventurer.id);
                      const canInvite = !alreadyMember && (!social.party || social.party.leaderId === social.selfId) && (social.party?.members.length ?? 0) < 5;
                      return (
                        <article key={adventurer.id}>
                          <HeroPortrait appearance={adventurer.appearance} equipped={adventurer.equipped} customization={adventurer.customization} className="rpg-party-portrait" />
                          <div><h4>{adventurer.guild ? `[${adventurer.guild.tag}] ` : ""}{adventurer.name}</h4><span>Total level {adventurer.totalLevel}</span></div>
                          <div className="rpg-realm-roster__actions">
                            <button type="button" disabled={!canInvite} onClick={() => apiRef.current?.inviteToParty(adventurer.id)}>
                              {alreadyMember ? "In party" : social.party && social.party.leaderId !== social.selfId ? "Leader invites" : "Party"}
                            </button>
                            {hud.progress.guild ? (
                              <button type="button" className="secondary" disabled={Boolean(adventurer.guild)} onClick={() => apiRef.current?.inviteToGuild(adventurer.id)}>
                                {adventurer.guild ? "Has guild" : "Guild"}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    }) : <p className="rpg-realm-roster__empty">No other adventurers are online in this room yet.</p>}
                  </div>
                </section>
              </div>
            ) : null}

            {panel === "skills" ? (
              <div className="rpg-skills-panel">
                <aside className="rpg-defense-training"><b>DEFENSE TRAINING</b><span>Survive enemy attacks to earn Defense XP. Armor and Defense levels both reduce incoming damage.</span></aside>
                <section className="rpg-talent-tree">
                  <header>
                    <div><span>COMBAT SPECIALIZATIONS</span><h3>Adventurer Skill Tree</h3><p>Unlock active abilities with points earned from combat levels. Your equipped weapon chooses which branch appears on hotkeys 4 and 5.</p></div>
                    <strong><b>{treePointsAvailable}</b><span>POINTS AVAILABLE</span><small>{hud.progress.skillTree.unlocked.length}/{treePointsTotal} spent</small>{hud.progress.skillTree.unlocked.length > 0 ? <button type="button" onClick={() => window.confirm("Refund every skill point? You can rebuild immediately.") && apiRef.current?.respecSkills()}>Reset build</button> : null}</strong>
                  </header>
                  <nav className="rpg-talent-tree__tabs" aria-label="Skill tree branches">
                    {(["melee", "range", "magic"] as const).map((branch) => {
                      const branchUnlocked = SKILL_TREE_NODES.filter((node) => node.branch === branch && hud.progress.skillTree.unlocked.includes(node.id)).length;
                      return (
                        <button key={branch} type="button" className={`${selectedTreeBranch === branch ? "active" : ""} ${equippedCombatStyle === branch ? "equipped" : ""}`} onClick={() => setSelectedTreeBranch(branch)}>
                          <i>{branch === "melee" ? "⚔" : branch === "range" ? "➶" : "✦"}</i>
                          <span>{branch === "melee" ? "WARDEN" : branch === "range" ? "RANGER" : "ARCANIST"}</span>
                          <small>{branchUnlocked}/8 learned{equippedCombatStyle === branch ? " • equipped" : ""}</small>
                        </button>
                      );
                    })}
                  </nav>
                  <div className="rpg-talent-tree__branches">
                    {([selectedTreeBranch] as const).map((branch) => (
                      <section key={branch} className={`rpg-talent-branch rpg-talent-branch--${branch} active`}>
                        <header><b>{branch === "melee" ? "THE WARDEN'S OATH" : branch === "range" ? "THE RANGER'S CREED" : "THE ARCANIST'S ASCENSION"}</b><span>8-NODE SPECIALIZATION • LEVEL 40 CAPSTONE</span></header>
                        <div>
                          {SKILL_TREE_NODES.filter((node) => node.branch === branch).map((node, index) => {
                            const unlocked = hud.progress.skillTree.unlocked.includes(node.id);
                            const prerequisiteMet = !node.prerequisite || hud.progress.skillTree.unlocked.includes(node.prerequisite);
                            const branchSkill = branch === "melee" ? "attack" : branch;
                            const levelMet = hud.progress.skills[branchSkill].level >= node.requiredLevel;
                            const canUnlock = !unlocked && prerequisiteMet && levelMet && treePointsAvailable > 0;
                            return (
                              <article key={node.id} className={`${unlocked ? "unlocked" : ""} ${canUnlock ? "available" : ""}`} style={{ "--ability-color": `#${node.color.toString(16).padStart(6, "0")}` } as React.CSSProperties}>
                                {index > 0 ? <i className="rpg-talent-link" /> : null}
                                <div className="rpg-talent-node"><b>{node.badge}</b><span>{unlocked ? "UNLOCKED" : levelMet ? "1 POINT" : `LV ${node.requiredLevel}`}</span></div>
                                <div><h4>{node.name}<em>{node.kind}</em></h4><p>{node.detail}.</p><small>{node.kind === "passive" ? "Always active once learned" : node.areaRadius ? `Area of effect • ${node.areaRadius}px radius • ${(node.cooldownMs / 1000).toFixed(1)}s cooldown` : `${node.dot?.ticks ?? 0} damage ticks • ${(node.cooldownMs / 1000).toFixed(1)}s cooldown`}</small></div>
                                <button type="button" disabled={!canUnlock} onClick={() => apiRef.current?.unlockSkill(node.id)}>{unlocked ? "Learned" : canUnlock ? "Unlock" : !prerequisiteMet ? "Previous skill" : !levelMet ? `${branch} ${node.requiredLevel}` : "Need point"}</button>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
                <div className="rpg-skill-grid">
                  {SKILLS.map((skill) => {
                    const value = hud.progress.skills[skill.id];
                    const nextUnlock = nextSkillUnlock(skill.id, value.level);
                    const unlockXp = nextUnlock ? Math.max(0, xpForLevel(nextUnlock.level) - value.xp) : 0;
                    return (
                      <article key={skill.id} style={{ "--skill-color": skill.color } as React.CSSProperties}>
                        <b>{skill.short}</b>
                        <div>
                          <span>{skill.label}</span><strong>{value.level}</strong>
                          <div><i style={{ width: `${xpPercent(value.level, value.xp)}%` }} /></div>
                          <small>{value.xp.toLocaleString()} XP</small>
                          <section className="rpg-skill-next">
                            <em>{nextUnlock ? `NEXT • LEVEL ${nextUnlock.level}` : "MASTERY PATH"}</em>
                            <b>{nextUnlock ? nextUnlock.unlocks.map((unlock) => unlock.label).join(" + ") : value.level >= 99 ? "Maximum mastery reached" : "Continue toward level 99"}</b>
                            <small>{nextUnlock ? `${unlockXp.toLocaleString()} XP remaining` : `${Math.max(0, xpForLevel(99) - value.xp).toLocaleString()} XP to mastery`}</small>
                          </section>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {panel === "inventory" ? (
              <div className="rpg-inventory-grid">
                {inventoryItems.map(({ item, quantity }) => {
                  const equipped = item.slot ? hud.progress.equipped[item.slot] === item.id : false;
                  const canEquip = meetsItemRequirement(hud.progress, item);
                  const powerDelta = itemPowerDelta(hud.progress, item);
                  return (
                    <article key={item.id} className={`${equipped ? "equipped" : ""} ${powerDelta !== null && powerDelta > 0 ? "equipment-upgrade" : ""} rarity-${item.rarity ?? "standard"}`.trim()}>
                      <ItemIcon item={item} />
                      <div><span>{item.rarity ?? item.category}</span><h3>{item.name}</h3><p>{item.description}</p></div>
                      <strong>x{quantity}</strong>
                      <EquipmentComparison item={item} progress={hud.progress} />
                      {item.slot || item.category === "consumable" || item.sellValue || item.id === "treasure-scroll" ? (
                        <div className="rpg-inventory-actions">
                          {item.slot ? (
                            <button type="button" disabled={equipped || !canEquip} onClick={() => apiRef.current?.equip(item.id)}>
                              {equipped ? "Equipped" : canEquip ? "Equip" : `${item.requiredSkill} ${item.requiredLevel}`}
                            </button>
                          ) : null}
                          {item.category === "consumable" ? <button type="button" onClick={() => apiRef.current?.consume(item.id)}>Use</button> : null}
                          {item.id === "treasure-scroll" ? (
                            <button type="button" disabled={Boolean(hud.progress.treasureTrail)} onClick={() => apiRef.current?.startTreasureTrail()}>
                              {hud.progress.treasureTrail ? "Trail active" : "Read clue"}
                            </button>
                          ) : null}
                          {item.sellValue ? (
                            <button type="button" className="secondary" disabled={equipped} onClick={() => apiRef.current?.sell(item.id)}>
                              Sell • {item.sellValue}g
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}

            {panel === "equipment" ? (
              <div className="rpg-equipment">
                <div className="rpg-paperdoll">
                  <HeroPortrait
                    appearance={hud.progress.appearance}
                    equipped={hud.progress.equipped}
                    customization={hud.progress.customization}
                    className="rpg-paperdoll__figure"
                    animated
                    direction={paperdollDirection}
                  />
                  <div className="rpg-paperdoll__turn" aria-label="Turn character preview">
                    <span>TURN</span>
                    {([
                      { direction: "up", label: "Back", glyph: "N" },
                      { direction: "left", label: "Left side", glyph: "W" },
                      { direction: "down", label: "Front", glyph: "S" },
                      { direction: "right", label: "Right side", glyph: "E" },
                    ] as const).map((option) => (
                      <button
                        key={option.direction}
                        type="button"
                        className={paperdollDirection === option.direction ? "active" : ""}
                        aria-label={option.label}
                        aria-pressed={paperdollDirection === option.direction}
                        onClick={() => setPaperdollDirection(option.direction)}
                      >
                        {option.glyph}
                      </button>
                    ))}
                  </div>
                  {(["armor", "weapon", "tool"] as const).map((slot) => {
                    const item = itemById(hud.progress.equipped[slot]);
                    return <article key={slot} className={`slot-${slot}`}><span>{slot}</span><ItemIcon item={item} className="rpg-item-icon--slot" /><strong>{item?.name ?? "Empty"}</strong></article>;
                  })}
                </div>
                <div className="rpg-loadout-sidebar">
                  <section
                    className={`rpg-signature-card rpg-signature-card--${equippedCombatStyle}`}
                    style={{ "--ability-color": `#${signatureAbility.color.toString(16).padStart(6, "0")}` } as React.CSSProperties}
                  >
                    <div className="rpg-signature-card__badge">{signatureAbility.badge}</div>
                    <div>
                      <span>Equipped weapon skill</span>
                      <h3>{signatureAbility.name}</h3>
                      <p>{signatureAbility.detail}.</p>
                    </div>
                    <dl>
                      <div><dt>Activate</dt><dd><kbd>1</kbd></dd></div>
                      <div><dt>Power</dt><dd>{signatureAbility.multiplier.toFixed(2)}x</dd></div>
                      <div><dt>Cooldown</dt><dd>{(signatureAbility.cooldownMs / 1000).toFixed(1)}s</dd></div>
                    </dl>
                  </section>
                  <div className="rpg-loadout-stats">
                    <span>Combat level</span><strong>{hud.progress.skills.attack.level + hud.progress.skills.defense.level}</strong>
                    <span>Combat style</span><strong>{equippedCombatStyle}</strong>
                    <span>Weapon power</span><strong>{equippedWeapon?.power ?? 1}</strong>
                    <span>Defense level</span><strong>{hud.progress.skills.defense.level}</strong>
                    <span>Damage blocked</span><strong>{defenseReduction ? `-${defenseReduction} / hit` : "Train Defense"}</strong>
                    <span>Mining tool</span><strong>Tier {itemById(hud.progress.equipped.tool)?.power ?? 1}</strong>
                    <span>Maximum HP</span><strong>{hud.progress.maxHp}</strong>
                  </div>
                  <section className="rpg-appearance-picker">
                    <span>Appearance collection</span>
                    <h3>Choose your adventurer</h3>
                    <div>
                      {APPEARANCES.map((appearance) => (
                        <button
                          key={appearance.id}
                          type="button"
                          className={hud.progress.appearance === appearance.id ? "active" : ""}
                          onClick={() => apiRef.current?.setAppearance(appearance.id)}
                        >
                          <HeroPortrait
                            appearance={appearance.id}
                            equipped={hud.progress.equipped}
                            customization={customizationForAppearance(appearance.id)}
                            className="rpg-appearance-thumb"
                          />
                          <b>{appearance.name}</b>
                          <small>{appearance.role}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="rpg-character-customizer">
                    <span>MODULAR CHARACTER</span>
                    <h3>Build your own look</h3>
                    <p>Every layer stays aligned through walking, gathering, melee, ranged, and spell animations.</p>
                    <div className="rpg-customizer-row rpg-customizer-row--text">
                      <b>Face</b>
                      <div>
                        {FACE_STYLES.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={hud.progress.customization.faceStyle === option.id ? "active" : ""}
                            onClick={() => apiRef.current?.setCustomization({ ...hud.progress.customization, faceStyle: option.id })}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rpg-customizer-row rpg-customizer-row--text">
                      <b>Hair</b>
                      <div>
                        {HAIR_STYLES.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={hud.progress.customization.hairStyle === option.id ? "active" : ""}
                            onClick={() => apiRef.current?.setCustomization({ ...hud.progress.customization, hairStyle: option.id })}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rpg-customizer-row rpg-customizer-row--text">
                      <b>Facial hair</b>
                      <div>
                        {BEARD_STYLES.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={hud.progress.customization.beardStyle === option.id ? "active" : ""}
                            onClick={() => apiRef.current?.setCustomization({ ...hud.progress.customization, beardStyle: option.id })}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    {[
                      { key: "skinTone", label: "Skin", options: SKIN_TONES },
                      { key: "hairColor", label: "Hair color", options: HAIR_COLORS },
                      { key: "shirtColor", label: "Tunic", options: DYES },
                      { key: "pantsColor", label: "Trousers", options: DYES },
                      { key: "bootsColor", label: "Boots", options: DYES },
                      { key: "armorDye", label: "Armor finish", options: GEAR_DYES },
                      { key: "weaponDye", label: "Weapon finish", options: GEAR_DYES },
                    ].map((row) => (
                      <div key={row.key} className="rpg-customizer-row">
                        <b>{row.label}</b>
                        <div>
                          {row.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={hud.progress.customization[row.key as keyof CharacterCustomization] === option.id ? "active" : ""}
                              style={{ "--swatch": option.swatch } as React.CSSProperties}
                              title={option.name}
                              aria-label={`${row.label}: ${option.name}`}
                              onClick={() => apiRef.current?.setCustomization({
                                ...hud.progress.customization,
                                [row.key]: option.id,
                              })}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="rpg-customizer-row rpg-customizer-row--text rpg-wardrobe-toggles">
                      <b>Visible gear</b>
                      <div>
                        {([
                          { key: "showHelmet", label: "Helmet" },
                          { key: "showCape", label: "Cape" },
                          { key: "showShield", label: "Shield" },
                          { key: "showWeapon", label: "Weapon" },
                        ] as const).map((option) => {
                          const visible = hud.progress.customization[option.key];
                          return (
                            <button
                              key={option.key}
                              type="button"
                              className={visible ? "active" : ""}
                              aria-pressed={visible}
                              title={`${visible ? "Hide" : "Show"} ${option.label.toLowerCase()}`}
                              onClick={() => apiRef.current?.setCustomization({
                                ...hud.progress.customization,
                                [option.key]: !visible,
                              })}
                            >
                              <span aria-hidden="true">{visible ? "ON" : "OFF"}</span>
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {panel === "shop" ? (
              <div className="rpg-shop-grid">
                {SHOP_ITEMS.map((item) => {
                  const owned = hud.progress.inventory[item.id] ?? 0;
                  const powerDelta = itemPowerDelta(hud.progress, item);
                  return (
                    <article key={item.id} className={powerDelta !== null && powerDelta > 0 ? "equipment-upgrade" : ""}>
                      <ItemIcon item={item} />
                      <span>{item.category}</span><h3>{item.name}</h3><p>{item.description}</p>
                      <EquipmentComparison item={item} progress={hud.progress} />
                      {item.requiredSkill ? <small className="rpg-requirement">Requires {item.requiredSkill} {item.requiredLevel}</small> : null}
                      <div><strong>{item.cost} gold</strong><small>Owned {owned}</small></div>
                      <button type="button" disabled={hud.progress.gold < item.cost} onClick={() => apiRef.current?.buy(item.id)}>Buy</button>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {panel === "bank" ? (
              <div className="rpg-bank">
                <section>
                  <header><div><span>BACKPACK</span><h3>Carried items</h3></div><strong>{inventoryItems.reduce((sum, entry) => sum + entry.quantity, 0)}</strong></header>
                  <div>
                    {inventoryItems.map(({ item, quantity }) => {
                      const equipped = item.slot ? hud.progress.equipped[item.slot] === item.id : false;
                      return (
                        <article key={item.id}>
                          <ItemIcon item={item} />
                          <div><h3>{item.name}</h3><span>x{quantity}</span></div>
                          <button type="button" disabled={equipped} onClick={() => apiRef.current?.deposit(item.id)}>{equipped ? "Equipped" : "Deposit"}</button>
                        </article>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <header><div><span>VAULT</span><h3>Stored items</h3></div><strong>{bankItems.reduce((sum, entry) => sum + entry.quantity, 0)}</strong></header>
                  <div>
                    {bankItems.length ? bankItems.map(({ item, quantity }) => (
                      <article key={item.id}>
                        <ItemIcon item={item} />
                        <div><h3>{item.name}</h3><span>x{quantity}</span></div>
                        <button type="button" onClick={() => apiRef.current?.withdraw(item.id)}>Withdraw</button>
                      </article>
                    )) : <p className="rpg-bank__empty">Your vault is empty. Deposit spare materials and loot here.</p>}
                  </div>
                </section>
              </div>
            ) : null}

            {panel === "workshop" ? (
              <div className="rpg-workshop">
                <aside>
                  <span>PRODUCTION SKILLS</span>
                  <h3>Build your own loadout</h3>
                  <p>Gather materials in the world, then turn them into permanent equipment and supplies. Every recipe awards profession XP.</p>
                  <div>
                    <ItemIcon item={itemById("smithing-hammer")} />
                    <section><span>Smithing</span><strong>Level {hud.progress.skills.smithing.level}</strong></section>
                  </div>
                  <div>
                    <ItemIcon item={itemById("crafter-kit")} />
                    <section><span>Crafting</span><strong>Level {hud.progress.skills.crafting.level}</strong></section>
                  </div>
                </aside>
                <div className="rpg-recipe-grid">
                  {RECIPES.map((recipe) => {
                    const output = itemById(recipe.output.itemId);
                    const hasLevel = hud.progress.skills[recipe.profession].level >= recipe.requiredLevel;
                    const hasMaterials = recipe.inputs.every((input) => (hud.progress.inventory[input.itemId] ?? 0) >= input.quantity);
                    return (
                      <article key={recipe.id} className={!hasLevel ? "locked" : ""}>
                        <ItemIcon item={output} />
                        <div className="rpg-recipe-copy">
                          <span>{recipe.profession} {recipe.requiredLevel}</span>
                          <h3>{recipe.name}</h3>
                          <p>{recipe.description}</p>
                        </div>
                        <div className="rpg-recipe-costs">
                          {recipe.inputs.map((input) => {
                            const material = itemById(input.itemId);
                            const owned = hud.progress.inventory[input.itemId] ?? 0;
                            return (
                              <span key={input.itemId} className={owned < input.quantity ? "missing" : ""}>
                                <ItemIcon item={material} /> {material?.name} <b>{owned}/{input.quantity}</b>
                              </span>
                            );
                          })}
                        </div>
                        <footer>
                          <span>+{recipe.xp} XP</span>
                          <button type="button" disabled={!hasLevel || !hasMaterials} onClick={() => apiRef.current?.craft(recipe.id)}>
                            {!hasLevel ? `Level ${recipe.requiredLevel}` : !hasMaterials ? "Need materials" : "Create"}
                          </button>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {panel === "map" ? (
              <div className="rpg-world-map">
                <WorldMapArtwork
                  playerX={hud.playerX}
                  playerY={hud.playerY}
                  questTarget={activeQuestTarget}
                  eventTarget={activeWorldEventTarget}
                  bountyTarget={trackedBountyTarget}
                  treasureTarget={treasureMapTarget}
                  socialMarkers={socialMapMarkers}
                  waystoneIds={hud.progress.waystones}
                />
                <div className="rpg-world-map__legend" aria-label="Map legend">
                  <span><i className="player" />You</span>
                  <span><i className="quest" />Active quest</span>
                  <span><i className="event" />World event</span>
                  <span><i className="rare" />Rare territory</span>
                  <span><i className="bounty" />Tracked bounty</span>
                  <span><i className="treasure" />Treasure clue</span>
                  <span><i className="party" />Party member</span>
                  <span><i className="guild" />Guildmate</span>
                  <span><i className="service" />Town service</span>
                  <span><i className="waystone" />Waystone</span>
                </div>
                <section className="rpg-waystone-network" aria-label="Waystone travel network">
                  <header>
                    <div><span>WAYSTONE NETWORK</span><h3>Fast travel</h3></div>
                    <strong>{hud.progress.waystones.length}/{WAYSTONES.length} attuned</strong>
                  </header>
                  <p>Discover and touch dormant waystones while exploring. Travel is free once a destination is attuned.</p>
                  <div className="rpg-waystone-network__grid">
                    {WAYSTONES.map((waystone) => {
                      const unlocked = hud.progress.waystones.includes(waystone.id);
                      return (
                        <button
                          key={waystone.id}
                          type="button"
                          className={unlocked ? "unlocked" : "locked"}
                          disabled={!unlocked}
                          onClick={() => {
                            setPanel(null);
                            apiRef.current?.travelToWaystone(waystone.id);
                          }}
                        >
                          <i aria-hidden="true" />
                          <span><b>{waystone.name}</b><small>{unlocked ? waystone.region : "Undiscovered"}</small></span>
                          <em>{unlocked ? "Travel" : "Locked"}</em>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section className="rpg-region-codex" aria-label="Adventurer region codex">
                  <header>
                    <div><span>ADVENTURER CODEX</span><h3>World discoveries</h3></div>
                    <div className="rpg-region-codex__actions"><button type="button" onClick={replayTutorial}>Replay guide</button><strong>{hud.progress.discoveries.length}/{REGIONS.length}</strong></div>
                  </header>
                  <div className="rpg-region-codex__progress"><i style={{ width: `${(hud.progress.discoveries.length / REGIONS.length) * 100}%` }} /></div>
                  <p>Enter each region to record it permanently. First discoveries award {REGION_DISCOVERY_REWARD_GOLD} gold; completing the map awards another {REGION_COMPLETION_BONUS_GOLD} gold.</p>
                  <div className="rpg-region-codex__grid">
                    {REGIONS.map((region) => {
                      const discovered = hud.progress.discoveries.includes(region.id);
                      return (
                        <article key={region.id} className={`${discovered ? "discovered" : "unknown"} danger-${region.danger}`}>
                          <i>{discovered ? "✓" : "?"}</i>
                          <div><span>{region.danger}</span><h4>{discovered ? region.name : "Uncharted region"}</h4><small>{discovered ? region.subtitle : "Explore the roads to reveal this location."}</small></div>
                        </article>
                      );
                    })}
                  </div>
                </section>
                <footer><span>Orehaven Province</span><span>Briarwild Frontier</span></footer>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
