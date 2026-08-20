import Phaser from "phaser";
import {
  DYES,
  gearDyeTint,
  HAIR_COLORS,
  SKIN_TONES,
  type AppearanceId,
  type BeardStyleId,
  type CharacterCustomization,
  type Direction,
  type FaceStyleId,
  type HairStyleId,
} from "./gameData";

export type HeroVisualAction =
  | "idle"
  | "walk"
  | "melee"
  | "meleeSignature"
  | "range"
  | "rangeSignature"
  | "magic"
  | "magicSignature"
  | "channel"
  | "gather"
  | "mine"
  | "chop"
  | "fish"
  | "smith"
  | "hurt";
export type ActorAppearanceId = AppearanceId | "mira" | "grent" | "korra" | "pip" | "clerk" | "lyra" | "alden" | "juno" | "merris" | "pella" | "goblin" | "orc" | "lizard";

export type ActorAppearanceStyle = {
  head: "human" | "goblin" | "orc" | "lizard";
  face?: FaceStyleId;
  hair?: HairStyleId;
  skinTint: number;
  hairTint: number;
  shirtTint: number;
  pantsTint: number;
  bootsTint: number;
};

type AnimationSpec = {
  source: "idle" | "walk" | "slash" | "shoot" | "spellcast" | "hurt";
  columns: number;
  sequence: number[];
  frameRate: number;
  repeat: number;
};

export type WeaponVisual = {
  kind: "sword" | "bow" | "staff";
  tint: number;
  aura?: number;
  assetSet?: "sword" | "saber" | "glowsword-blue" | "glowsword-red" | "bow" | "recurve" | "greatbow";
};

export type ArmorVisual = {
  kind: "none" | "leather" | "chain" | "legion" | "plate";
  tint: number;
  helmet?: "barbuta" | "greathelm" | "sugarloaf" | "plate";
  cape?: "solid" | "tattered" | "briar";
  shield?: "crusader";
  aura?: number;
};

type SpriteLayer =
  | "weaponBack"
  | "shieldBack"
  | "capeBack"
  | "body"
  | "head"
  | "face"
  | "pants"
  | "boots"
  | "shirt"
  | "leatherTorso"
  | "chainTorso"
  | "legionTorso"
  | "plateTorso"
  | "plateArms"
  | "plateLegs"
  | "plateFeet"
  | "capeFront"
  | "hair"
  | "beard"
  | "shieldFront"
  | "plateHelmet"
  | "barbutaHelmet"
  | "greathelmHelmet"
  | "sugarloafHelmet"
  | "weaponFront";

const LPC_ROOT = "/assets/rpg/characters/lpc";
// Keep the LPC art readable against the large authored maps without making
// the actor overpower props or nearby NPCs.
const HERO_SCALE = 0.86;
const HERO_FRAME_OFFSET_Y = -23;

const APPEARANCE_STYLES: Record<AppearanceId, ActorAppearanceStyle> = {
  vanguard: {
    head: "human",
    face: "determined",
    hair: "plain",
    skinTint: 0xfff7ef,
    hairTint: 0xffffff,
    shirtTint: 0x5d89b6,
    pantsTint: 0x536278,
    bootsTint: 0x936b4b,
  },
  ranger: {
    head: "human",
    face: "cheerful",
    hair: "shorthawk",
    skinTint: 0xd79d75,
    hairTint: 0xffffff,
    shirtTint: 0x719c5a,
    pantsTint: 0x53694b,
    bootsTint: 0x74523a,
  },
  arcanist: {
    head: "human",
    face: "wide-eyed",
    hair: "spiked2",
    skinTint: 0xf0c7ad,
    hairTint: 0xffffff,
    shirtTint: 0x6d62aa,
    pantsTint: 0x4d496f,
    bootsTint: 0x65728f,
  },
  stonewarden: {
    head: "orc",
    skinTint: 0x8fa85c,
    hairTint: 0xffffff,
    shirtTint: 0x783f34,
    pantsTint: 0x453b32,
    bootsTint: 0x3e2e25,
  },
  marshborn: {
    head: "lizard",
    skinTint: 0x7fba83,
    hairTint: 0xffffff,
    shirtTint: 0x496b78,
    pantsTint: 0x344b52,
    bootsTint: 0x4b3c32,
  },
};

export const ACTOR_APPEARANCE_STYLES: Record<ActorAppearanceId, ActorAppearanceStyle> = {
  ...APPEARANCE_STYLES,
  mira: {
    head: "human",
    face: "cheerful",
    hair: "bob",
    skinTint: 0xf2c5a7,
    hairTint: 0xd9e7ff,
    shirtTint: 0x5678b8,
    pantsTint: 0x3d4968,
    bootsTint: 0x684b3a,
  },
  grent: {
    head: "human",
    face: "determined",
    hair: "buzzcut",
    skinTint: 0xdca47f,
    hairTint: 0x6c5549,
    shirtTint: 0x8e6c3f,
    pantsTint: 0x4f4339,
    bootsTint: 0x5b3c2c,
  },
  korra: {
    head: "human",
    face: "determined",
    hair: "cornrows",
    skinTint: 0xc78362,
    hairTint: 0xf1b451,
    shirtTint: 0xa44c3f,
    pantsTint: 0x51453d,
    bootsTint: 0x3d2f28,
  },
  pip: {
    head: "human",
    face: "cheerful",
    hair: "afro",
    skinTint: 0xe5b48d,
    hairTint: 0x6b4030,
    shirtTint: 0x4f9b72,
    pantsTint: 0x466450,
    bootsTint: 0x6b4932,
  },
  clerk: {
    head: "human",
    face: "wide-eyed",
    hair: "buzzcut",
    skinTint: 0xf0c3a1,
    hairTint: 0xb26f3f,
    shirtTint: 0x9b6c42,
    pantsTint: 0x4f5969,
    bootsTint: 0x563b2c,
  },
  lyra: {
    head: "human",
    face: "determined",
    hair: "shorthawk",
    skinTint: 0xd8a47d,
    hairTint: 0xc6d5a3,
    shirtTint: 0x4f7452,
    pantsTint: 0x3f5144,
    bootsTint: 0x533c2d,
  },
  alden: {
    head: "human",
    face: "determined",
    hair: "plain",
    skinTint: 0xd8aa87,
    hairTint: 0xd9dde2,
    shirtTint: 0x315f9d,
    pantsTint: 0x333d56,
    bootsTint: 0x49372d,
  },
  juno: {
    head: "human",
    face: "determined",
    hair: "spiked2",
    skinTint: 0xe0aa82,
    hairTint: 0xb95231,
    shirtTint: 0xa84536,
    pantsTint: 0x514239,
    bootsTint: 0x3f3028,
  },
  merris: {
    head: "human",
    face: "neutral",
    hair: "cornrows",
    skinTint: 0x8f5f48,
    hairTint: 0xb8b4ae,
    shirtTint: 0x8f2947,
    pantsTint: 0x3f3340,
    bootsTint: 0x3c2c27,
  },
  pella: {
    head: "human",
    face: "cheerful",
    hair: "bob",
    skinTint: 0xe2b18f,
    hairTint: 0x7d4daf,
    shirtTint: 0x177b82,
    pantsTint: 0x334e57,
    bootsTint: 0x44332f,
  },
  goblin: {
    head: "goblin",
    skinTint: 0x78ad62,
    hairTint: 0xffffff,
    shirtTint: 0x8b4f39,
    pantsTint: 0x51463b,
    bootsTint: 0x4b382b,
  },
  orc: {
    head: "orc",
    skinTint: 0x8fa85c,
    hairTint: 0xffffff,
    shirtTint: 0x783f34,
    pantsTint: 0x453b32,
    bootsTint: 0x3e2e25,
  },
  lizard: {
    head: "lizard",
    skinTint: 0x7fba83,
    hairTint: 0xffffff,
    shirtTint: 0x496b78,
    pantsTint: 0x344b52,
    bootsTint: 0x4b3c32,
  },
};

function optionTint<T extends string>(options: Array<{ id: T; tint: number }>, id: T, fallback: number) {
  return options.find((option) => option.id === id)?.tint ?? fallback;
}

export function resolveActorAppearanceStyle(
  appearance: ActorAppearanceId,
  customization?: CharacterCustomization,
): ActorAppearanceStyle {
  const base = ACTOR_APPEARANCE_STYLES[appearance];
  if (!customization) return base;
  return {
    ...base,
    face: base.head === "human" ? customization.faceStyle : undefined,
    hair: base.head === "human" ? customization.hairStyle : undefined,
    skinTint: optionTint(SKIN_TONES, customization.skinTone, base.skinTint),
    hairTint: optionTint(HAIR_COLORS, customization.hairColor, base.hairTint),
    shirtTint: optionTint(DYES, customization.shirtColor, base.shirtTint),
    pantsTint: optionTint(DYES, customization.pantsColor, base.pantsTint),
    bootsTint: optionTint(DYES, customization.bootsColor, base.bootsTint),
  };
}

const ACTIONS: Record<HeroVisualAction, AnimationSpec> = {
  idle: { source: "idle", columns: 2, sequence: [0, 0, 1], frameRate: 2.2, repeat: -1 },
  walk: { source: "walk", columns: 9, sequence: [1, 2, 3, 4, 5, 6, 7, 8], frameRate: 9, repeat: -1 },
  melee: { source: "slash", columns: 6, sequence: [0, 1, 2, 3, 4, 5], frameRate: 14, repeat: 0 },
  meleeSignature: { source: "slash", columns: 6, sequence: [0, 0, 1, 2, 3, 4, 5, 5, 4, 2, 1, 0], frameRate: 18, repeat: 0 },
  range: { source: "shoot", columns: 13, sequence: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], frameRate: 22, repeat: 0 },
  rangeSignature: { source: "shoot", columns: 13, sequence: [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12], frameRate: 19, repeat: 0 },
  magic: { source: "spellcast", columns: 7, sequence: [0, 1, 2, 3, 4, 5, 6], frameRate: 14, repeat: 0 },
  magicSignature: { source: "spellcast", columns: 7, sequence: [0, 0, 1, 2, 3, 4, 5, 6, 5, 6], frameRate: 15, repeat: 0 },
  channel: { source: "spellcast", columns: 7, sequence: [0, 1, 2, 3, 4, 5, 6, 5, 4], frameRate: 10, repeat: -1 },
  gather: { source: "slash", columns: 6, sequence: [5, 5, 4, 4, 3, 1, 0, 0], frameRate: 10, repeat: -1 },
  mine: { source: "slash", columns: 6, sequence: [5, 5, 4, 4, 3, 1, 0, 0], frameRate: 10, repeat: -1 },
  chop: { source: "slash", columns: 6, sequence: [5, 4, 4, 3, 2, 1, 0, 0], frameRate: 9, repeat: -1 },
  // Use a gathering body pose. The fishing rod gets its cast strip below,
  // so the character no longer looks like they are firing a bow.
  fish: {
    source: "slash",
    columns: 6,
    sequence: [5, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 5],
    frameRate: 9,
    repeat: -1,
  },
  smith: { source: "slash", columns: 6, sequence: [5, 4, 3, 2, 1, 0, 0], frameRate: 9, repeat: -1 },
  hurt: { source: "hurt", columns: 6, sequence: [0, 1, 2, 3, 4, 5], frameRate: 12, repeat: 0 },
};

const DIRECTION_ROW: Record<Direction, number> = { up: 0, left: 1, down: 2, right: 3 };

const FISHING_ROD_ACTION: AnimationSpec = {
  source: "shoot",
  columns: 13,
  sequence: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 12, 12, 12, 12],
  frameRate: 12,
  repeat: -1,
};

const BASE_ASSETS = {
  body: "body",
  shirt: "clothes/shirt",
  pants: "clothes/pants",
  boots: "clothes/boots",
  leatherTorso: "armor/leather-torso",
  chainTorso: "armor/chainmail",
  legionTorso: "armor/legion",
  plateTorso: "armor/plate-torso",
  plateArms: "armor/plate-arms",
  plateLegs: "armor/plate-legs",
  plateFeet: "armor/plate-feet",
  plateHelmet: "armor/plate-helmet",
  barbutaHelmet: "armor/helmet-barbuta",
  greathelmHelmet: "armor/helmet-greathelm",
  sugarloafHelmet: "armor/helmet-sugarloaf",
} as const;

export const WEAPON_VISUALS: Record<string, WeaponVisual> = {
  "bronze-sword": { kind: "sword", tint: 0xc99a68 },
  "iron-sword": { kind: "sword", tint: 0xd0d8e2 },
  "rune-blade": { kind: "sword", tint: 0xffffff, aura: 0x5be8ff, assetSet: "glowsword-blue" },
  "dusk-sabre": { kind: "sword", tint: 0xc491ff, aura: 0x8e4fe6, assetSet: "saber" },
  "auric-cleaver": { kind: "sword", tint: 0xffd45d, aura: 0xffc84a, assetSet: "saber" },
  "aurex-sunblade": { kind: "sword", tint: 0xffd28a, aura: 0xffa92f, assetSet: "glowsword-red" },
  "oak-bow": { kind: "bow", tint: 0xd19a58 },
  "iron-bow": { kind: "bow", tint: 0xbfd3dc },
  stormbow: { kind: "bow", tint: 0x79eaff, aura: 0x55dfff, assetSet: "greatbow" },
  "fallen-recurve": { kind: "bow", tint: 0x9edfff, aura: 0x69c9ff, assetSet: "recurve" },
  "ember-staff": { kind: "staff", tint: 0xffa34f },
  "arcane-staff": { kind: "staff", tint: 0x7edfff },
  "frostspire-staff": { kind: "staff", tint: 0xa7f4ff, aura: 0x6edff2 },
  "bonecaller-focus": { kind: "staff", tint: 0xc88cff, aura: 0xb66cff },
  "sunscar-reaver": { kind: "sword", tint: 0xff9a58, aura: 0xff5b2e, assetSet: "glowsword-red" },
  "aurora-longbow": { kind: "bow", tint: 0xaaf3ff, aura: 0x71dfff, assetSet: "greatbow" },
  "eclipse-staff": { kind: "staff", tint: 0xf3a6ff, aura: 0x8f6dff },
};

export const ARMOR_VISUALS: Record<string, ArmorVisual> = {
  "": { kind: "none", tint: 0xffffff },
  "trailguard-vest": { kind: "leather", tint: 0xbf9564 },
  "sentinel-mail": { kind: "chain", tint: 0xd5e3f4, helmet: "barbuta", shield: "crusader" },
  "sunforged-mail": { kind: "legion", tint: 0xf1c75b, helmet: "sugarloaf", cape: "solid", shield: "crusader", aura: 0xffc84a },
  "warden-mail": { kind: "leather", tint: 0x93c878, cape: "solid" },
  "briarhide-cloak": { kind: "leather", tint: 0x5ea861, cape: "briar", aura: 0x67c96f },
  "moonweave-mantle": { kind: "chain", tint: 0x8b8fe8, cape: "solid", aura: 0x777cdd },
  "nightguard-plate": { kind: "plate", tint: 0x7195b8, helmet: "greathelm", cape: "tattered", shield: "crusader", aura: 0x5c82a8 },
  "frostguard-aegis": { kind: "plate", tint: 0x8eddf4, helmet: "sugarloaf", cape: "solid", shield: "crusader", aura: 0x70dfff },
};

export function resolveWeaponVisual(itemId: string): WeaponVisual | null {
  if (!itemId) return null;
  return WEAPON_VISUALS[itemId] ?? { kind: "sword", tint: 0xffffff };
}

export function resolveArmorVisual(itemId: string): ArmorVisual {
  return ARMOR_VISUALS[itemId] ?? ARMOR_VISUALS[""];
}

function textureKey(layer: string, action: string) {
  return `lpc-${layer.replaceAll("/", "-")}-${action}`;
}

function loadSheet(scene: Phaser.Scene, key: string, path: string, frameSize: number) {
  scene.load.spritesheet(key, path, { frameWidth: frameSize, frameHeight: frameSize });
}

export const SWORD_ASSET_SETS = {
  sword: { slashFrameSize: 128 },
  saber: { slashFrameSize: 192 },
  "glowsword-blue": { slashFrameSize: 192 },
  "glowsword-red": { slashFrameSize: 192 },
} as const;

export const BOW_ASSET_SETS = {
  bow: { walkFrameSize: 128, walkColumns: 13, walkSequence: [1, 2, 3, 4, 5, 6, 7, 8] },
  recurve: { walkFrameSize: 128, walkColumns: 8, walkSequence: [0, 1, 2, 3, 4, 5, 6, 7] },
  greatbow: { walkFrameSize: 128, walkColumns: 8, walkSequence: [0, 1, 2, 3, 4, 5, 6, 7] },
} as const;

type SwordAssetSet = keyof typeof SWORD_ASSET_SETS;
export type BowAssetSet = keyof typeof BOW_ASSET_SETS;

export function resolveSwordAssetSet(visual: WeaponVisual): SwordAssetSet {
  return visual.assetSet === "saber" || visual.assetSet === "glowsword-blue" || visual.assetSet === "glowsword-red"
    ? visual.assetSet
    : "sword";
}

export function resolveBowAssetSet(visual: WeaponVisual): BowAssetSet {
  return visual.assetSet === "recurve" || visual.assetSet === "greatbow" ? visual.assetSet : "bow";
}

function preloadSwordAssets(scene: Phaser.Scene, assetSet: keyof typeof SWORD_ASSET_SETS) {
  const path = `${LPC_ROOT}/weapon/${assetSet}`;
  loadSheet(scene, `lpc-${assetSet}-walk-bg`, `${path}/walk-bg.png`, 64);
  loadSheet(scene, `lpc-${assetSet}-walk-fg`, `${path}/walk-fg.png`, 64);
  loadSheet(scene, `lpc-${assetSet}-slash-bg`, `${path}/slash-bg.png`, SWORD_ASSET_SETS[assetSet].slashFrameSize);
  loadSheet(scene, `lpc-${assetSet}-slash-fg`, `${path}/slash-fg.png`, SWORD_ASSET_SETS[assetSet].slashFrameSize);
}

function preloadBowAssets(scene: Phaser.Scene, assetSet: BowAssetSet) {
  const path = `${LPC_ROOT}/weapon/${assetSet}`;
  const config = BOW_ASSET_SETS[assetSet];
  loadSheet(scene, `lpc-${assetSet}-walk-bg`, `${path}/walk-bg.png`, config.walkFrameSize);
  loadSheet(scene, `lpc-${assetSet}-walk-fg`, `${path}/walk-fg.png`, config.walkFrameSize);
  loadSheet(scene, `lpc-${assetSet}-shoot-bg`, `${path}/shoot-bg.png`, 64);
  loadSheet(scene, `lpc-${assetSet}-shoot-fg`, `${path}/shoot-fg.png`, 64);
}

type HeroPreloadOptions = {
  essentialOnly?: boolean;
  appearance?: ActorAppearanceId;
  customization?: CharacterCustomization;
  weaponId?: string;
  armorId?: string;
};

function preloadEssentialHeroAssets(scene: Phaser.Scene, options: HeroPreloadOptions, sources: readonly string[]) {
  const add = (layer: string, path: string, actions = sources) => {
    actions.forEach((action) => loadSheet(scene, textureKey(layer, action), `${LPC_ROOT}/${path}/${action}.png`, 64));
  };
  const style = resolveActorAppearanceStyle(options.appearance ?? "vanguard", options.customization);
  [
    ["body", BASE_ASSETS.body],
    ["shirt", BASE_ASSETS.shirt],
    ["pants", BASE_ASSETS.pants],
    ["boots", BASE_ASSETS.boots],
  ].forEach(([layer, path]) => add(layer, path));

  // Keep every playable silhouette recognizable while only loading the selected
  // cosmetic variants up front. The rest of the catalog streams after entry.
  new Set([style.head, "human", "goblin", "orc", "lizard"]).forEach((head) => add(`head-${head}`, `head/${head}`));
  const hair = style.hair ?? "plain";
  add(`hair-${hair}`, `hair/${hair}`);
  const face = options.customization?.faceStyle ?? "neutral";
  add(`face-${face}`, `face/${face}`, ["idle", "walk", "slash", "shoot", "spellcast"]);
  const beard = options.customization?.beardStyle;
  if (beard && beard !== "none") add(`beard-${beard}`, `beard/${beard}`);

  const armor = resolveArmorVisual(options.armorId ?? "trailguard-vest");
  if (armor.kind !== "none") {
    const armorLayer = armor.kind === "leather" ? "leatherTorso" : armor.kind === "chain" ? "chainTorso" : armor.kind === "legion" ? "legionTorso" : "plateTorso";
    add(armorLayer, BASE_ASSETS[armorLayer]);
    if (armor.kind === "plate") {
      add("plateArms", BASE_ASSETS.plateArms);
      add("plateLegs", BASE_ASSETS.plateLegs);
      add("plateFeet", BASE_ASSETS.plateFeet);
    }
    if (armor.helmet) {
      const helmetLayer = `${armor.helmet}Helmet` as keyof typeof BASE_ASSETS;
      add(helmetLayer, BASE_ASSETS[helmetLayer]);
    }
    if (armor.cape) {
      const capePath = armor.cape === "briar" ? "armor/briar-cape" : `armor/cape-${armor.cape}`;
      add(`cape-${armor.cape}-bg`, `${capePath}/bg`);
      add(`cape-${armor.cape}-fg`, `${capePath}/fg`);
    }
    if (armor.shield) {
      (["bg", "fg"] as const).forEach((layer) => {
        (["walk", "slash", "shoot", "spellcast", "hurt"] as const).forEach((action) =>
          loadSheet(scene, textureKey(`shield-${armor.shield}-${layer}`, action), `${LPC_ROOT}/shield/${armor.shield}/${layer}/${action}.png`, 64),
        );
      });
    }
  }
  const helmetOverride = options.customization?.helmetStyle;
  if (helmetOverride && helmetOverride !== "auto") {
    const helmetLayer = `${helmetOverride}Helmet` as keyof typeof BASE_ASSETS;
    add(helmetLayer, BASE_ASSETS[helmetLayer]);
  }
  const capeOverride = options.customization?.capeStyle;
  if (capeOverride && capeOverride !== "auto") {
    const capePath = capeOverride === "briar" ? "armor/briar-cape" : `armor/cape-${capeOverride}`;
    add(`cape-${capeOverride}-bg`, `${capePath}/bg`);
    add(`cape-${capeOverride}-fg`, `${capePath}/fg`);
  }
  const shieldOverride = options.customization?.shieldStyle;
  if (shieldOverride && shieldOverride !== "auto") {
    (["bg", "fg"] as const).forEach((layer) => {
      sources.forEach((action) => loadSheet(scene, textureKey(`shield-${shieldOverride}-${layer}`, action), `${LPC_ROOT}/shield/${shieldOverride}/${layer}/${action}.png`, 64));
    });
  }

  const weapon = resolveWeaponVisual(options.weaponId ?? "bronze-sword");
  if (weapon?.kind === "sword") {
    preloadSwordAssets(scene, resolveSwordAssetSet(weapon));
  } else if (weapon?.kind === "bow") {
    preloadBowAssets(scene, resolveBowAssetSet(weapon));
  } else {
    loadSheet(scene, "lpc-staff-walk-bg", `${LPC_ROOT}/weapon/staff/walk-bg.png`, 64);
    loadSheet(scene, "lpc-staff-walk-fg", `${LPC_ROOT}/weapon/staff/walk-fg.png`, 64);
    loadSheet(scene, "lpc-staff-spellcast-bg", `${LPC_ROOT}/weapon/staff/spellcast-bg.png`, 64);
    loadSheet(scene, "lpc-staff-spellcast-fg", `${LPC_ROOT}/weapon/staff/spellcast-fg.png`, 64);
  }

  loadSheet(scene, "lpc-pickaxe-slash-bg", `${LPC_ROOT}/tool/pickaxe/slash-bg.png`, 128);
  loadSheet(scene, "lpc-pickaxe-slash-fg", `${LPC_ROOT}/tool/pickaxe/slash-fg.png`, 128);
  loadSheet(scene, "lpc-axe-slash-bg", `${LPC_ROOT}/tool/axe/slash-bg.png`, 128);
  loadSheet(scene, "lpc-axe-slash-fg", `${LPC_ROOT}/tool/axe/slash-fg.png`, 128);
  loadSheet(scene, "lpc-hammer-slash-bg", `${LPC_ROOT}/tool/hammer/slash-bg.png`, 128);
  loadSheet(scene, "lpc-hammer-slash-fg", `${LPC_ROOT}/tool/hammer/slash-fg.png`, 128);
  loadSheet(scene, "lpc-fishing-rod-shoot-bg", `${LPC_ROOT}/tool/fishing-rod/shoot-bg.png`, 128);
  loadSheet(scene, "lpc-fishing-rod-shoot-fg", `${LPC_ROOT}/tool/fishing-rod/shoot-fg.png`, 128);
}

export function preloadLayeredHeroAssets(scene: Phaser.Scene, options: HeroPreloadOptions = {}) {
  const sources = ["idle", "walk", "slash", "shoot", "spellcast", "hurt"] as const;
  if (options.essentialOnly) {
    preloadEssentialHeroAssets(scene, options, sources);
    return;
  }
  Object.entries(BASE_ASSETS).forEach(([layer, path]) => {
    sources.forEach((action) => loadSheet(scene, textureKey(layer, action), `${LPC_ROOT}/${path}/${action}.png`, 64));
  });
  (["plain", "spiked2", "shorthawk", "afro", "bob", "cornrows", "buzzcut"] as HairStyleId[]).forEach((hair) => {
    sources.forEach((action) => loadSheet(scene, textureKey(`hair-${hair}`, action), `${LPC_ROOT}/hair/${hair}/${action}.png`, 64));
  });
  (["stubble", "trimmed", "winter"] as Exclude<BeardStyleId, "none">[]).forEach((beard) => {
    sources.forEach((action) => loadSheet(scene, textureKey(`beard-${beard}`, action), `${LPC_ROOT}/beard/${beard}/${action}.png`, 64));
  });
  (["neutral", "determined", "cheerful", "wide-eyed"] as FaceStyleId[]).forEach((face) => {
    (["idle", "walk", "slash", "shoot", "spellcast"] as const).forEach((action) =>
      loadSheet(scene, textureKey(`face-${face}`, action), `${LPC_ROOT}/face/${face}/${action}.png`, 64),
    );
  });
  (["human", "goblin", "orc", "lizard"] as const).forEach((head) => {
    sources.forEach((action) =>
      loadSheet(scene, textureKey(`head-${head}`, action), `${LPC_ROOT}/head/${head}/${action}.png`, 64),
    );
  });

  (["solid", "tattered", "briar"] as const).forEach((cape) => {
    const capePath = cape === "briar" ? "armor/briar-cape" : `armor/cape-${cape}`;
    sources.forEach((action) => {
      loadSheet(scene, textureKey(`cape-${cape}-bg`, action), `${LPC_ROOT}/${capePath}/bg/${action}.png`, 64);
      loadSheet(scene, textureKey(`cape-${cape}-fg`, action), `${LPC_ROOT}/${capePath}/fg/${action}.png`, 64);
    });
  });
  (["bg", "fg"] as const).forEach((layer) => {
    (["walk", "slash", "shoot", "spellcast", "hurt"] as const).forEach((action) =>
      loadSheet(scene, textureKey(`shield-crusader-${layer}`, action), `${LPC_ROOT}/shield/crusader/${layer}/${action}.png`, 64),
    );
  });

  (Object.keys(SWORD_ASSET_SETS) as Array<keyof typeof SWORD_ASSET_SETS>).forEach((assetSet) => preloadSwordAssets(scene, assetSet));

  (Object.keys(BOW_ASSET_SETS) as BowAssetSet[]).forEach((assetSet) => preloadBowAssets(scene, assetSet));

  loadSheet(scene, "lpc-staff-walk-bg", `${LPC_ROOT}/weapon/staff/walk-bg.png`, 64);
  loadSheet(scene, "lpc-staff-walk-fg", `${LPC_ROOT}/weapon/staff/walk-fg.png`, 64);
  loadSheet(scene, "lpc-staff-spellcast-bg", `${LPC_ROOT}/weapon/staff/spellcast-bg.png`, 64);
  loadSheet(scene, "lpc-staff-spellcast-fg", `${LPC_ROOT}/weapon/staff/spellcast-fg.png`, 64);

  loadSheet(scene, "lpc-pickaxe-walk", `${LPC_ROOT}/tool/pickaxe/walk.png`, 64);
  loadSheet(scene, "lpc-pickaxe-slash-bg", `${LPC_ROOT}/tool/pickaxe/slash-bg.png`, 128);
  loadSheet(scene, "lpc-pickaxe-slash-fg", `${LPC_ROOT}/tool/pickaxe/slash-fg.png`, 128);
  loadSheet(scene, "lpc-axe-slash-bg", `${LPC_ROOT}/tool/axe/slash-bg.png`, 128);
  loadSheet(scene, "lpc-axe-slash-fg", `${LPC_ROOT}/tool/axe/slash-fg.png`, 128);
  loadSheet(scene, "lpc-hammer-slash-bg", `${LPC_ROOT}/tool/hammer/slash-bg.png`, 128);
  loadSheet(scene, "lpc-hammer-slash-fg", `${LPC_ROOT}/tool/hammer/slash-fg.png`, 128);
  loadSheet(scene, "lpc-fishing-rod-shoot-bg", `${LPC_ROOT}/tool/fishing-rod/shoot-bg.png`, 128);
  loadSheet(scene, "lpc-fishing-rod-shoot-fg", `${LPC_ROOT}/tool/fishing-rod/shoot-fg.png`, 128);
}

function toolTint(itemId: string) {
  if (itemId === "bronze-pick") return 0xc6925f;
  if (itemId === "iron-pick") return 0xc6d0dc;
  if (itemId === "crystal-pick") return 0x78e4ff;
  return 0xffffff;
}

export class LayeredHero {
  readonly root: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly visualRoot: Phaser.GameObjects.Container;
  private readonly aura: Phaser.GameObjects.Ellipse;
  private readonly layers: Record<SpriteLayer, Phaser.GameObjects.Sprite>;
  private appearance: ActorAppearanceId;
  private weaponId: string;
  private toolId: string;
  private armorId: string;
  private customization?: CharacterCustomization;
  private action: HeroVisualAction = "idle";
  private direction: Direction = "down";
  private signature = "";
  private motionSequence = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    appearance: ActorAppearanceId,
    loadout: { weapon: string; tool: string; armor: string },
    customization?: CharacterCustomization,
  ) {
    this.scene = scene;
    this.appearance = appearance;
    this.weaponId = loadout.weapon;
    this.toolId = loadout.tool;
    this.armorId = loadout.armor;
    this.customization = customization;
    this.root = scene.add.container(x, y).setScale(HERO_SCALE).setSize(42, 58);
    this.visualRoot = scene.add.container(0, 0);
    this.aura = scene.add
      .ellipse(0, -1, 34, 10, 0xffffff, 0.12)
      .setStrokeStyle(1, 0xffffff, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    const makeLayer = () => scene.add.sprite(0, HERO_FRAME_OFFSET_Y, textureKey("body", "idle"), 4).setOrigin(0.5);
    this.layers = {
      weaponBack: makeLayer(),
      shieldBack: makeLayer(),
      capeBack: makeLayer(),
      body: makeLayer(),
      head: makeLayer(),
      face: makeLayer(),
      pants: makeLayer(),
      boots: makeLayer(),
      shirt: makeLayer(),
      leatherTorso: makeLayer(),
      chainTorso: makeLayer(),
      legionTorso: makeLayer(),
      plateTorso: makeLayer(),
      plateArms: makeLayer(),
      plateLegs: makeLayer(),
      plateFeet: makeLayer(),
      capeFront: makeLayer(),
      hair: makeLayer(),
      beard: makeLayer(),
      shieldFront: makeLayer(),
      plateHelmet: makeLayer(),
      barbutaHelmet: makeLayer(),
      greathelmHelmet: makeLayer(),
      sugarloafHelmet: makeLayer(),
      weaponFront: makeLayer(),
    };
    this.visualRoot.add([this.aura, ...Object.values(this.layers)]);
    this.root.add(this.visualRoot);
    scene.tweens.add({
      targets: this.aura,
      scaleX: 1.14,
      scaleY: 1.08,
      alpha: { from: 0.72, to: 1 },
      duration: 1150,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
    this.play("idle", "down", true);
  }

  get x() {
    return this.root.x;
  }

  get y() {
    return this.root.y;
  }

  get depth() {
    return this.root.depth;
  }

  setPosition(x: number, y: number) {
    this.root.setPosition(x, y);
    return this;
  }

  setDepth(depth: number) {
    this.root.setDepth(depth);
    return this;
  }

  setAlpha(alpha: number) {
    this.root.setAlpha(alpha);
    return this;
  }

  setVisible(visible: boolean) {
    this.root.setVisible(visible);
    return this;
  }

  setSimulationActive(active: boolean) {
    this.root.setVisible(active);
    Object.values(this.layers).forEach((sprite) => {
      if (active) sprite.anims.resume();
      else sprite.anims.pause();
    });
    [this.visualRoot, this.aura].forEach((target) => {
      this.scene.tweens.getTweensOf(target).forEach((tween) => {
        if (active) tween.resume();
        else tween.pause();
      });
    });
    return this;
  }

  setAngle(angle: number) {
    this.root.setAngle(angle);
    return this;
  }

  setScale(scale: number) {
    this.root.setScale(scale);
    return this;
  }

  setAppearance(appearance: ActorAppearanceId) {
    this.appearance = appearance;
    this.signature = "";
    this.play(this.action, this.direction, true);
  }

  setCustomization(customization?: CharacterCustomization) {
    this.customization = customization ? { ...customization } : undefined;
    this.signature = "";
    this.play(this.action, this.direction, true);
  }

  setLoadout(loadout: { weapon: string; tool: string; armor: string }) {
    this.weaponId = loadout.weapon;
    this.toolId = loadout.tool;
    this.armorId = loadout.armor;
    this.signature = "";
    this.play(this.action, this.direction, true);
  }

  play(action: HeroVisualAction, direction: Direction, force = false) {
    const customizationSignature = this.customization
      ? Object.values(this.customization).join(":")
      : "default";
    const nextSignature = `${action}:${direction}:${this.appearance}:${customizationSignature}:${this.weaponId}:${this.toolId}:${this.armorId}`;
    if (!force && nextSignature === this.signature) return;

    this.action = action;
    this.direction = direction;
    this.signature = nextSignature;
    this.scene.tweens.killTweensOf(this.visualRoot);
    this.visualRoot.setPosition(0, 0).setScale(1).setAngle(0);
    const spec = ACTIONS[action];
    const style = resolveActorAppearanceStyle(this.appearance, this.customization);

    this.playLayer(this.layers.body, textureKey("body", spec.source), spec, direction, style.skinTint);
    this.layers.head.setVisible(true);
    this.playLayer(
      this.layers.head,
      textureKey(`head-${style.head}`, spec.source),
      spec,
      direction,
      style.head === "human" ? style.skinTint : 0xffffff,
    );
    const faceStyle = this.customization?.faceStyle ?? style.face ?? "neutral";
    const showFace = style.head === "human" && action !== "hurt";
    this.layers.face.setVisible(showFace);
    if (showFace) {
      this.playLayer(this.layers.face, textureKey(`face-${faceStyle}`, spec.source), spec, direction, 0xffffff);
    }
    this.playLayer(this.layers.pants, textureKey("pants", spec.source), spec, direction, style.pantsTint);
    this.playLayer(this.layers.boots, textureKey("boots", spec.source), spec, direction, style.bootsTint);
    this.playLayer(this.layers.shirt, textureKey("shirt", spec.source), spec, direction, style.shirtTint);
    this.layers.hair.setVisible(Boolean(style.hair));
    if (style.hair) {
      this.playLayer(this.layers.hair, textureKey(`hair-${style.hair}`, spec.source), spec, direction, style.hairTint);
    }
    const beard = style.head === "human" ? this.customization?.beardStyle : "none";
    this.layers.beard.setVisible(Boolean(beard && beard !== "none"));
    if (beard && beard !== "none") {
      this.playLayer(this.layers.beard, textureKey(`beard-${beard}`, spec.source), spec, direction, style.hairTint);
    }
    this.syncArmor(spec, direction);
    this.syncWeapon(action, direction);
    this.syncAura();
    this.syncPoseMotion(action, direction);
  }

  private syncPoseMotion(action: HeroVisualAction, direction: Direction) {
    if (action === "idle") {
      this.scene.tweens.add({
        targets: this.visualRoot,
        y: -1.4,
        scaleX: 1.012,
        scaleY: 0.992,
        duration: 880,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      return;
    }
    if (action === "walk") {
      this.scene.tweens.add({
        targets: this.visualRoot,
        y: -1.6,
        angle: direction === "left" ? -0.7 : direction === "right" ? 0.7 : 0,
        scaleX: 1.012,
        scaleY: 0.988,
        duration: 220,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      return;
    }
    if (action === "channel" || action === "magicSignature") {
      this.scene.tweens.add({
        targets: this.visualRoot,
        y: -4,
        scaleX: 1.025,
        scaleY: 1.025,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      return;
    }
    if (action === "mine" || action === "gather" || action === "chop" || action === "smith") {
      this.scene.tweens.add({
        targets: this.visualRoot,
        y: 1.2,
        scaleX: 1.025,
        scaleY: 0.975,
        duration: action === "chop" ? 330 : 300,
        yoyo: true,
        repeat: -1,
        ease: "Quad.easeInOut",
      });
      return;
    }
    if (action === "fish") {
      this.scene.tweens.add({
        targets: this.visualRoot,
        y: -1.2,
        angle: direction === "left" ? -0.55 : direction === "right" ? 0.55 : 0,
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  playSignatureMotion(style: "melee" | "range" | "magic", direction: Direction, heavy = false) {
    const vector = {
      up: { x: 0, y: -1, tilt: -4 },
      down: { x: 0, y: 1, tilt: 4 },
      left: { x: -1, y: 0, tilt: -9 },
      right: { x: 1, y: 0, tilt: 9 },
    }[direction];
    const pose = this.visualRoot;
    const swingSide = heavy ? 1 : this.motionSequence++ % 2 === 0 ? 1 : -1;
    this.scene.tweens.killTweensOf(pose);
    pose.setPosition(0, 0).setAngle(0).setScale(1);

    const recover = () => {
      if (!pose.active) return;
      this.scene.tweens.add({
        targets: pose,
        x: 0,
        y: 0,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        duration: style === "magic" ? 210 : 145,
        ease: "Back.easeOut",
      });
    };

    if (style === "melee") {
      this.scene.tweens.add({
        targets: pose,
        x: -vector.x * (heavy ? 8 : 5),
        y: -vector.y * 4 - 2,
        angle: -vector.tilt * swingSide,
        scaleX: 0.9,
        scaleY: 1.08,
        duration: heavy ? 105 : 80,
        ease: "Quad.easeIn",
        onComplete: () => {
          if (!pose.active) return;
          this.scene.tweens.add({
            targets: pose,
            x: vector.x * (heavy ? 23 : 17),
            y: vector.y * (heavy ? 14 : 10) - 3,
            angle: vector.tilt * (heavy ? 1.55 : 1.2) * swingSide,
            scaleX: 1.1,
            scaleY: 0.93,
            duration: heavy ? 125 : 95,
            ease: "Cubic.easeOut",
            onComplete: recover,
          });
        },
      });
      return;
    }

    if (style === "range") {
      this.scene.tweens.add({
        targets: pose,
        x: -vector.x * 6,
        y: -vector.y * 4 - 3,
        angle: -vector.tilt * 0.45,
        scaleX: 0.94,
        scaleY: 1.04,
        duration: heavy ? 190 : 145,
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (!pose.active) return;
          this.scene.tweens.add({
            targets: pose,
            x: -vector.x * (heavy ? 10 : 7),
            y: vector.y * 2,
            angle: vector.tilt * 0.32,
            scaleX: 1.04,
            scaleY: 0.96,
            duration: 70,
            ease: "Cubic.easeOut",
            onComplete: recover,
          });
        },
      });
      return;
    }

    this.scene.tweens.add({
      targets: pose,
      y: heavy ? -10 : -7,
      angle: vector.tilt * 0.28,
      scaleX: heavy ? 1.1 : 1.06,
      scaleY: heavy ? 1.1 : 1.06,
      duration: heavy ? 260 : 210,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (!pose.active) return;
        this.scene.tweens.add({
          targets: pose,
          y: -3,
          angle: -vector.tilt * 0.22,
          scaleX: 0.96,
          scaleY: 1.08,
          duration: 100,
          ease: "Cubic.easeOut",
          onComplete: recover,
        });
      },
    });
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.visualRoot);
    this.root.destroy(true);
  }

  private syncArmor(spec: AnimationSpec, direction: Direction) {
    const visual = resolveArmorVisual(this.armorId);
    const tint = gearDyeTint(visual.tint, this.customization?.armorDye);
    const helmet = this.customization?.helmetStyle && this.customization.helmetStyle !== "auto" ? this.customization.helmetStyle : visual.helmet;
    const cape = this.customization?.capeStyle && this.customization.capeStyle !== "auto" ? this.customization.capeStyle : visual.cape;
    const shield = this.customization?.shieldStyle && this.customization.shieldStyle !== "auto" ? this.customization.shieldStyle : visual.shield;
    const showCape = this.customization?.showCape !== false;
    const showHelmet = this.customization?.showHelmet !== false;
    const showShield = this.customization?.showShield !== false;
    const plate = visual.kind === "plate";
    const leather = visual.kind === "leather";
    const chain = visual.kind === "chain";
    const legion = visual.kind === "legion";
    const helmetLayer = helmet ? this.layers[`${helmet}Helmet` as SpriteLayer] : null;

    this.layers.capeBack.setVisible(Boolean(cape && showCape));
    this.layers.capeFront.setVisible(Boolean(cape && showCape));
    this.layers.shieldBack.setVisible(Boolean(shield && showShield));
    this.layers.shieldFront.setVisible(Boolean(shield && showShield));
    this.layers.leatherTorso.setVisible(leather);
    this.layers.chainTorso.setVisible(chain);
    this.layers.legionTorso.setVisible(legion);
    this.layers.plateTorso.setVisible(plate);
    this.layers.plateArms.setVisible(plate);
    this.layers.plateLegs.setVisible(plate);
    this.layers.plateFeet.setVisible(plate);
    this.layers.plateHelmet.setVisible(showHelmet && helmet === "plate");
    this.layers.barbutaHelmet.setVisible(showHelmet && helmet === "barbuta");
    this.layers.greathelmHelmet.setVisible(showHelmet && helmet === "greathelm");
    this.layers.sugarloafHelmet.setVisible(showHelmet && helmet === "sugarloaf");
    const style = resolveActorAppearanceStyle(this.appearance, this.customization);
    this.layers.hair.setVisible(Boolean(style.hair) && !(helmet && showHelmet));
    this.layers.beard.setVisible(this.layers.beard.visible && !(helmet && showHelmet));
    this.layers.face.setVisible(this.layers.face.visible && !(helmet && showHelmet));

    if (cape && showCape) {
      this.playLayer(this.layers.capeBack, textureKey(`cape-${cape}-bg`, spec.source), spec, direction, tint);
      this.playLayer(this.layers.capeFront, textureKey(`cape-${cape}-fg`, spec.source), spec, direction, tint);
    }
    if (shield && showShield) {
      if (spec.source === "idle") {
        this.setStaticLayer(this.layers.shieldBack, textureKey(`shield-${shield}-bg`, "walk"), 9, direction, tint);
        this.setStaticLayer(this.layers.shieldFront, textureKey(`shield-${shield}-fg`, "walk"), 9, direction, tint);
      } else {
        this.playLayer(this.layers.shieldBack, textureKey(`shield-${shield}-bg`, spec.source), spec, direction, tint);
        this.playLayer(this.layers.shieldFront, textureKey(`shield-${shield}-fg`, spec.source), spec, direction, tint);
      }
    }
    if (leather) this.playLayer(this.layers.leatherTorso, textureKey("leatherTorso", spec.source), spec, direction, tint);
    if (chain) this.playLayer(this.layers.chainTorso, textureKey("chainTorso", spec.source), spec, direction, tint);
    if (legion) this.playLayer(this.layers.legionTorso, textureKey("legionTorso", spec.source), spec, direction, tint);
    if (plate) this.playLayer(this.layers.plateTorso, textureKey("plateTorso", spec.source), spec, direction, tint);
    if (plate) this.playLayer(this.layers.plateArms, textureKey("plateArms", spec.source), spec, direction, tint);
    if (plate) {
      this.playLayer(this.layers.plateLegs, textureKey("plateLegs", spec.source), spec, direction, tint);
      this.playLayer(this.layers.plateFeet, textureKey("plateFeet", spec.source), spec, direction, tint);
    }
    if (helmetLayer && helmet && showHelmet) {
      this.playLayer(helmetLayer, textureKey(`${helmet}Helmet`, spec.source), spec, direction, tint);
    }
  }

  private syncWeapon(action: HeroVisualAction, direction: Direction) {
    const back = this.layers.weaponBack.setVisible(false);
    const front = this.layers.weaponFront.setVisible(false);

    if (action === "hurt") return;
    if (action === "gather" || action === "mine" || action === "chop" || action === "fish" || action === "smith") {
      const activity = action === "gather" ? "mine" : action;
      const spec = activity === "fish" ? FISHING_ROD_ACTION : ACTIONS[activity];
      if (activity === "fish") {
        back.setVisible(true);
        front.setVisible(true);
        this.playLayer(back, "lpc-fishing-rod-shoot-bg", spec, direction, 0xffffff);
        this.playLayer(front, "lpc-fishing-rod-shoot-fg", spec, direction, 0xffffff);
        return;
      }
      const tool = activity === "chop"
        ? { key: "lpc-axe-slash", tint: 0xc8d0d6 }
        : activity === "smith"
            ? { key: "lpc-hammer-slash", tint: 0xcbd2d8 }
            : { key: "lpc-pickaxe-slash", tint: toolTint(this.toolId) };
      back.setVisible(true);
      front.setVisible(true);
      this.playLayer(back, `${tool.key}-bg`, spec, direction, tool.tint);
      this.playLayer(front, `${tool.key}-fg`, spec, direction, tool.tint);
      return;
    }

    if (this.customization?.showWeapon === false) return;
    if (!this.weaponId) return;

    const visual = resolveWeaponVisual(this.weaponId);
    if (!visual) return;
    const tint = gearDyeTint(visual.tint, this.customization?.weaponDye);
    if (visual.kind === "sword" && (action === "idle" || action === "walk" || action === "melee" || action === "meleeSignature")) {
      const assetSet = resolveSwordAssetSet(visual);
      back.setVisible(true);
      front.setVisible(true);
      if (action === "idle") {
        this.setStaticLayer(back, `lpc-${assetSet}-walk-bg`, 9, direction, tint);
        this.setStaticLayer(front, `lpc-${assetSet}-walk-fg`, 9, direction, tint);
      } else {
        const source = action === "melee" || action === "meleeSignature" ? "slash" : "walk";
        const spec = ACTIONS[action];
        this.playLayer(back, `lpc-${assetSet}-${source}-bg`, spec, direction, tint);
        this.playLayer(front, `lpc-${assetSet}-${source}-fg`, spec, direction, tint);
      }
      return;
    }

    if (visual.kind === "bow" && (action === "idle" || action === "walk" || action === "range" || action === "rangeSignature")) {
      const assetSet = resolveBowAssetSet(visual);
      const bowConfig = BOW_ASSET_SETS[assetSet];
      back.setVisible(true);
      front.setVisible(true);
      if (action === "idle") {
        this.setStaticLayer(back, `lpc-${assetSet}-walk-bg`, bowConfig.walkColumns, direction, tint);
        this.setStaticLayer(front, `lpc-${assetSet}-walk-fg`, bowConfig.walkColumns, direction, tint);
      } else if (action === "walk") {
        const bowWalk = { ...ACTIONS.walk, columns: bowConfig.walkColumns, sequence: [...bowConfig.walkSequence] };
        this.playLayer(back, `lpc-${assetSet}-walk-bg`, bowWalk, direction, tint);
        this.playLayer(front, `lpc-${assetSet}-walk-fg`, bowWalk, direction, tint);
      } else {
        const spec = ACTIONS[action];
        this.playLayer(back, `lpc-${assetSet}-shoot-bg`, spec, direction, tint);
        this.playLayer(front, `lpc-${assetSet}-shoot-fg`, spec, direction, tint);
      }
      return;
    }

    if (visual.kind === "staff" && (action === "idle" || action === "walk" || action === "magic" || action === "magicSignature")) {
      back.setVisible(true);
      front.setVisible(true);
      if (action === "idle") {
        this.setStaticLayer(back, "lpc-staff-walk-bg", 9, direction, tint);
        this.setStaticLayer(front, "lpc-staff-walk-fg", 9, direction, tint);
      } else {
        const source = action === "magic" || action === "magicSignature" ? "spellcast" : "walk";
        const spec = ACTIONS[action];
        this.playLayer(back, `lpc-staff-${source}-bg`, spec, direction, tint);
        this.playLayer(front, `lpc-staff-${source}-fg`, spec, direction, tint);
      }
    }
  }

  private syncAura() {
    const weaponAura = this.customization?.showWeapon === false ? undefined : resolveWeaponVisual(this.weaponId)?.aura;
    const armorAura = resolveArmorVisual(this.armorId).aura;
    const color = weaponAura ?? armorAura;
    if (!color) {
      this.aura.setVisible(false);
      return;
    }
    this.aura.setFillStyle(color, 0.13).setStrokeStyle(1, color, 0.72).setVisible(true);
  }

  private playLayer(
    sprite: Phaser.GameObjects.Sprite,
    key: string,
    spec: AnimationSpec,
    direction: Direction,
    tint: number,
  ) {
    if (!this.scene.textures.exists(key)) {
      sprite.setVisible(false);
      return;
    }
    const row = spec.source === "hurt" ? 0 : DIRECTION_ROW[direction];
    const animationKey = `${key}-${direction}-${spec.sequence.join(".")}-${spec.repeat}`;
    if (!this.scene.anims.exists(animationKey)) {
      this.scene.anims.create({
        key: animationKey,
        frames: spec.sequence.map((frame) => ({ key, frame: row * spec.columns + frame })),
        frameRate: spec.frameRate,
        repeat: spec.repeat,
      });
    }
    sprite.setVisible(true).setTint(tint).setAngle(0).setFlipX(false).play(animationKey, true);
  }

  private setStaticLayer(
    sprite: Phaser.GameObjects.Sprite,
    key: string,
    columns: number,
    direction: Direction,
    tint: number,
  ) {
    if (!this.scene.textures.exists(key)) {
      sprite.setVisible(false);
      return;
    }
    sprite.anims.stop();
    sprite.setVisible(true).setTexture(key, DIRECTION_ROW[direction] * columns).setTint(tint).setAngle(0).setFlipX(false);
  }
}
