import { useEffect, useRef, useState } from "react";
import { gearDyeTint, type CharacterCustomization, type Direction, type PlayerProgress } from "./gameData";
import {
  BOW_ASSET_SETS,
  SWORD_ASSET_SETS,
  resolveActorAppearanceStyle,
  resolveArmorVisual,
  resolveBowAssetSet,
  resolveSwordAssetSet,
  resolveWeaponVisual,
  type ActorAppearanceId,
} from "./LayeredHero";

type HeroPortraitProps = {
  appearance: ActorAppearanceId;
  equipped: PlayerProgress["equipped"];
  customization?: CharacterCustomization;
  className?: string;
  animated?: boolean;
  direction?: Direction;
  action?: HeroPortraitAction;
  zoom?: number;
};

export type HeroPortraitAction = "idle" | "walk" | "attack";

type PortraitLayer = {
  path: string;
  tint: number;
  frameSize?: 64 | 128 | 192;
  columns?: number;
  staticFrame?: number;
  frameOffset?: number;
};

type PortraitAnimation = {
  source: "idle" | "walk" | "slash" | "shoot" | "spellcast";
  columns: number;
  sequence: number[];
  intervalMs: number;
};

const LPC_ROOT = "/assets/rpg/characters/lpc";
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(path: string) {
  let pending = imageCache.get(path);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load hero layer: ${path}`));
      image.src = path;
    });
    imageCache.set(path, pending);
  }
  return pending;
}

function portraitLayers(
  appearance: ActorAppearanceId,
  equipped: PlayerProgress["equipped"],
  customization?: CharacterCustomization,
  action: HeroPortraitAction = "idle",
): PortraitLayer[] {
  const style = resolveActorAppearanceStyle(appearance, customization);
  const armor = resolveArmorVisual(equipped.armor);
  const armorTint = gearDyeTint(armor.tint, customization?.armorDye);
  const plate = armor.kind === "plate";
  const leather = armor.kind === "leather";
  const chain = armor.kind === "chain";
  const legion = armor.kind === "legion";
  const helmet = customization?.helmetStyle && customization.helmetStyle !== "auto" ? customization.helmetStyle : armor.helmet;
  const cape = customization?.capeStyle && customization.capeStyle !== "auto" ? customization.capeStyle : armor.cape;
  const shield = customization?.shieldStyle && customization.shieldStyle !== "auto" ? customization.shieldStyle : armor.shield;
  const capePath = cape === "briar" ? "armor/briar-cape" : cape ? `armor/cape-${cape}` : null;
  const showCape = customization?.showCape !== false;
  const showHelmet = customization?.showHelmet !== false;
  const showWeapon = customization?.showWeapon !== false;
  const showShield = customization?.showShield !== false;
  const beard = customization?.beardStyle && customization.beardStyle !== "none" ? customization.beardStyle : null;
  const faceStyle = customization?.faceStyle ?? style.face;
  const weapon = showWeapon ? resolveWeaponVisual(equipped.weapon) : null;
  const weaponTint = weapon ? gearDyeTint(weapon.tint, customization?.weaponDye) : 0xffffff;
  const animation = portraitAnimation(equipped, action);
  const source = animation.source;
  const weaponBack =
    !weapon
      ? null
      : weapon.kind === "bow"
      ? (() => {
          const assetSet = resolveBowAssetSet(weapon);
          const config = BOW_ASSET_SETS[assetSet];
          const attacking = action === "attack";
          return {
            path: `${LPC_ROOT}/weapon/${assetSet}/${attacking ? "shoot" : "walk"}-bg.png`,
            tint: weaponTint,
            frameSize: attacking ? 64 : config.walkFrameSize,
            columns: attacking ? 13 : config.walkColumns,
            staticFrame: action === "idle" ? 0 : undefined,
            frameOffset: action === "walk" && config.walkSequence[0] === 0 ? -1 : 0,
          };
        })()
      : weapon.kind === "staff"
        ? {
            path: `${LPC_ROOT}/weapon/staff/${action === "attack" ? "spellcast" : "walk"}-bg.png`,
            tint: weaponTint,
            columns: action === "attack" ? 7 : 9,
            staticFrame: action === "idle" ? 0 : undefined,
          }
        : (() => {
            const assetSet = resolveSwordAssetSet(weapon);
            const attacking = action === "attack";
            return {
              path: `${LPC_ROOT}/weapon/${assetSet}/${attacking ? "slash" : "walk"}-bg.png`,
              tint: weaponTint,
              frameSize: attacking ? SWORD_ASSET_SETS[assetSet].slashFrameSize : 64,
              columns: attacking ? 6 : 9,
              staticFrame: action === "idle" ? 0 : undefined,
            };
          })();
  const weaponFront = weaponBack ? { ...weaponBack, path: weaponBack.path.replace("-bg.png", "-fg.png") } : null;

  return [
    ...(weaponBack ? [weaponBack] : []),
    ...(shield && showShield ? [{ path: `${LPC_ROOT}/shield/${shield}/bg/${action === "idle" ? "walk" : source}.png`, tint: armorTint, columns: action === "idle" ? 9 : animation.columns, staticFrame: action === "idle" ? 0 : undefined }] : []),
    ...(capePath && showCape ? [{ path: `${LPC_ROOT}/${capePath}/bg/${source}.png`, tint: armorTint, columns: animation.columns }] : []),
    { path: `${LPC_ROOT}/body/${source}.png`, tint: style.skinTint, columns: animation.columns },
    {
      path: `${LPC_ROOT}/head/${style.head}/${source}.png`,
      tint: style.head === "human" ? style.skinTint : 0xffffff,
      columns: animation.columns,
    },
    ...(style.head === "human" && faceStyle
      ? [{ path: `${LPC_ROOT}/face/${faceStyle}/${source}.png`, tint: 0xffffff, columns: animation.columns }]
      : []),
    { path: `${LPC_ROOT}/clothes/pants/${source}.png`, tint: style.pantsTint, columns: animation.columns },
    { path: `${LPC_ROOT}/clothes/boots/${source}.png`, tint: style.bootsTint, columns: animation.columns },
    { path: `${LPC_ROOT}/clothes/shirt/${source}.png`, tint: style.shirtTint, columns: animation.columns },
    ...(leather ? [{ path: `${LPC_ROOT}/armor/leather-torso/${source}.png`, tint: armorTint, columns: animation.columns }] : []),
    ...(chain ? [{ path: `${LPC_ROOT}/armor/chainmail/${source}.png`, tint: armorTint, columns: animation.columns }] : []),
    ...(legion ? [{ path: `${LPC_ROOT}/armor/legion/${source}.png`, tint: armorTint, columns: animation.columns }] : []),
    ...(capePath && showCape ? [{ path: `${LPC_ROOT}/${capePath}/fg/${source}.png`, tint: armorTint, columns: animation.columns }] : []),
    ...(plate
      ? [
          { path: `${LPC_ROOT}/armor/plate-torso/${source}.png`, tint: armorTint, columns: animation.columns },
          { path: `${LPC_ROOT}/armor/plate-arms/${source}.png`, tint: armorTint, columns: animation.columns },
          { path: `${LPC_ROOT}/armor/plate-legs/${source}.png`, tint: armorTint, columns: animation.columns },
          { path: `${LPC_ROOT}/armor/plate-feet/${source}.png`, tint: armorTint, columns: animation.columns },
        ]
      : []),
    ...(shield && showShield ? [{ path: `${LPC_ROOT}/shield/${shield}/fg/${action === "idle" ? "walk" : source}.png`, tint: armorTint, columns: action === "idle" ? 9 : animation.columns, staticFrame: action === "idle" ? 0 : undefined }] : []),
    ...(helmet && showHelmet
      ? [{ path: `${LPC_ROOT}/armor/${helmet === "plate" ? "plate-helmet" : `helmet-${helmet}`}/${source}.png`, tint: armorTint, columns: animation.columns }]
      : [
          ...(style.hair ? [{ path: `${LPC_ROOT}/hair/${style.hair}/${source}.png`, tint: style.hairTint, columns: animation.columns }] : []),
          ...(beard ? [{ path: `${LPC_ROOT}/beard/${beard}/${source}.png`, tint: style.hairTint, columns: animation.columns }] : []),
        ]),
    ...(weaponFront ? [weaponFront] : []),
  ];
}

function portraitAnimation(equipped: PlayerProgress["equipped"], action: HeroPortraitAction): PortraitAnimation {
  if (action === "idle") return { source: "idle", columns: 2, sequence: [0, 0, 1, 1, 0], intervalMs: 360 };
  if (action === "walk") return { source: "walk", columns: 9, sequence: [1, 2, 3, 4, 5, 6, 7, 8], intervalMs: 112 };
  const weapon = resolveWeaponVisual(equipped.weapon);
  if (weapon?.kind === "bow") return { source: "shoot", columns: 13, sequence: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12], intervalMs: 72 };
  if (weapon?.kind === "staff") return { source: "spellcast", columns: 7, sequence: [0, 1, 2, 3, 4, 5, 6, 5], intervalMs: 104 };
  return { source: "slash", columns: 6, sequence: [0, 1, 2, 3, 4, 5, 4, 2], intervalMs: 86 };
}

function drawTintedFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  layer: PortraitLayer,
  direction: Direction,
  frameIndex: number,
  zoom: number,
) {
  const frameSize = layer.frameSize ?? 64;
  const row = { up: 0, left: 1, down: 2, right: 3 }[direction];
  const columns = Math.max(1, layer.columns ?? 1);
  const rawColumn = layer.staticFrame ?? frameIndex + (layer.frameOffset ?? 0);
  const column = ((rawColumn % columns) + columns) % columns;
  const temp = document.createElement("canvas");
  temp.width = frameSize;
  temp.height = frameSize;
  const tempContext = temp.getContext("2d");
  if (!tempContext) return;
  tempContext.imageSmoothingEnabled = false;
  tempContext.drawImage(image, column * frameSize, row * frameSize, frameSize, frameSize, 0, 0, frameSize, frameSize);
  if (layer.tint !== 0xffffff) {
    tempContext.globalCompositeOperation = "multiply";
    tempContext.fillStyle = `#${layer.tint.toString(16).padStart(6, "0")}`;
    tempContext.fillRect(0, 0, frameSize, frameSize);
    tempContext.globalCompositeOperation = "destination-in";
    tempContext.drawImage(image, column * frameSize, row * frameSize, frameSize, frameSize, 0, 0, frameSize, frameSize);
  }
  const drawSize = frameSize * zoom;
  const inset = (128 - drawSize) / 2;
  context.drawImage(temp, inset, inset, drawSize, drawSize);
}

export function HeroPortrait({ appearance, equipped, customization, className = "", animated = false, direction = "down", action = "idle", zoom = 1 }: HeroPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!animated) {
      setFrameIndex(0);
      return;
    }
    const animation = portraitAnimation(equipped, action);
    const sequence = animation.sequence;
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor = (cursor + 1) % sequence.length;
      setFrameIndex(sequence[cursor]);
    }, animation.intervalMs);
    return () => window.clearInterval(timer);
  }, [action, animated, equipped.weapon]);

  useEffect(() => {
    let cancelled = false;
    const layers = portraitLayers(appearance, equipped, customization, action);
    Promise.all(layers.map(async (layer) => ({ layer, image: await loadImage(layer.path) })))
      .then((loaded) => {
        if (cancelled || !canvasRef.current) return;
        const context = canvasRef.current.getContext("2d");
        if (!context) return;
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, 128, 128);
        loaded.forEach(({ layer, image }) => drawTintedFrame(context, image, layer, direction, frameIndex, zoom));
      })
      .catch(() => {
        // The in-game loader reports missing assets; the menu should remain usable meanwhile.
      });
    return () => {
      cancelled = true;
    };
  }, [action, appearance, customization, direction, equipped.armor, equipped.tool, equipped.weapon, frameIndex, zoom]);

  return <canvas ref={canvasRef} width={128} height={128} className={`rpg-hero-portrait ${className}`.trim()} />;
}
