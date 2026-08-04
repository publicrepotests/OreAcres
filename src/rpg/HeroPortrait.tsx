import { useEffect, useRef, useState } from "react";
import { gearDyeTint, type CharacterCustomization, type Direction, type PlayerProgress } from "./gameData";
import {
  resolveActorAppearanceStyle,
  resolveArmorVisual,
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
};

type PortraitLayer = {
  path: string;
  tint: number;
  frameSize?: 64 | 128;
  columns?: number;
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
): PortraitLayer[] {
  const style = resolveActorAppearanceStyle(appearance, customization);
  const armor = resolveArmorVisual(equipped.armor);
  const armorTint = gearDyeTint(armor.tint, customization?.armorDye);
  const plate = armor.kind === "plate";
  const leather = armor.kind === "leather";
  const chain = armor.kind === "chain";
  const legion = armor.kind === "legion";
  const cape = armor.cape;
  const showCape = customization?.showCape !== false;
  const showHelmet = customization?.showHelmet !== false;
  const showWeapon = customization?.showWeapon !== false;
  const showShield = customization?.showShield !== false;
  const beard = customization?.beardStyle && customization.beardStyle !== "none" ? customization.beardStyle : null;
  const weapon = showWeapon ? resolveWeaponVisual(equipped.weapon) : null;
  const weaponTint = weapon ? gearDyeTint(weapon.tint, customization?.weaponDye) : 0xffffff;
  const weaponBack =
    !weapon
      ? null
      : weapon.kind === "bow"
      ? { path: `${LPC_ROOT}/weapon/bow/walk-bg.png`, tint: weaponTint, frameSize: 128 as const, columns: 13 }
      : weapon.kind === "staff"
        ? { path: `${LPC_ROOT}/weapon/staff/walk-bg.png`, tint: weaponTint, columns: 9 }
        : { path: `${LPC_ROOT}/weapon/sword/idle-bg.png`, tint: weaponTint, columns: 2 };
  const weaponFront = weaponBack ? { ...weaponBack, path: weaponBack.path.replace("-bg.png", "-fg.png") } : null;

  return [
    ...(weaponBack ? [weaponBack] : []),
    ...(armor.shield && showShield ? [{ path: `${LPC_ROOT}/shield/${armor.shield}/bg/walk.png`, tint: armorTint, columns: 9 }] : []),
    ...(cape && showCape ? [{ path: `${LPC_ROOT}/armor/cape-${cape}/bg/idle.png`, tint: armorTint, columns: 2 }] : []),
    { path: `${LPC_ROOT}/body/idle.png`, tint: style.skinTint, columns: 2 },
    {
      path: `${LPC_ROOT}/head/${style.head}/idle.png`,
      tint: style.head === "human" ? style.skinTint : 0xffffff,
      columns: 2,
    },
    ...(style.head === "human" && customization?.faceStyle
      ? [{ path: `${LPC_ROOT}/face/${customization.faceStyle}/idle.png`, tint: 0xffffff, columns: 2 }]
      : []),
    { path: `${LPC_ROOT}/clothes/pants/idle.png`, tint: style.pantsTint, columns: 2 },
    { path: `${LPC_ROOT}/clothes/boots/idle.png`, tint: style.bootsTint, columns: 2 },
    { path: `${LPC_ROOT}/clothes/shirt/idle.png`, tint: style.shirtTint, columns: 2 },
    ...(leather ? [{ path: `${LPC_ROOT}/armor/leather-torso/idle.png`, tint: armorTint, columns: 2 }] : []),
    ...(chain ? [{ path: `${LPC_ROOT}/armor/chainmail/idle.png`, tint: armorTint, columns: 2 }] : []),
    ...(legion ? [{ path: `${LPC_ROOT}/armor/legion/idle.png`, tint: armorTint, columns: 2 }] : []),
    ...(cape && showCape ? [{ path: `${LPC_ROOT}/armor/cape-${cape}/fg/idle.png`, tint: armorTint, columns: 2 }] : []),
    ...(plate
      ? [
          { path: `${LPC_ROOT}/armor/plate-torso/idle.png`, tint: armorTint, columns: 2 },
          { path: `${LPC_ROOT}/armor/plate-arms/idle.png`, tint: armorTint, columns: 2 },
          { path: `${LPC_ROOT}/armor/plate-legs/idle.png`, tint: armorTint, columns: 2 },
          { path: `${LPC_ROOT}/armor/plate-feet/idle.png`, tint: armorTint, columns: 2 },
        ]
      : []),
    ...(armor.shield && showShield ? [{ path: `${LPC_ROOT}/shield/${armor.shield}/fg/walk.png`, tint: armorTint, columns: 9 }] : []),
    ...(armor.helmet && showHelmet
      ? [{ path: `${LPC_ROOT}/armor/${armor.helmet === "plate" ? "plate-helmet" : `helmet-${armor.helmet}`}/idle.png`, tint: armorTint, columns: 2 }]
      : [
          ...(style.hair ? [{ path: `${LPC_ROOT}/hair/${style.hair}/idle.png`, tint: style.hairTint, columns: 2 }] : []),
          ...(beard ? [{ path: `${LPC_ROOT}/beard/${beard}/idle.png`, tint: style.hairTint, columns: 2 }] : []),
        ]),
    ...(weaponFront ? [weaponFront] : []),
  ];
}

function drawTintedFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  layer: PortraitLayer,
  direction: Direction,
  frameIndex: number,
) {
  const frameSize = layer.frameSize ?? 64;
  const row = { up: 0, left: 1, down: 2, right: 3 }[direction];
  const column = frameIndex % Math.max(1, layer.columns ?? 1);
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
  const inset = (128 - frameSize) / 2;
  context.drawImage(temp, inset, inset);
}

export function HeroPortrait({ appearance, equipped, customization, className = "", animated = false, direction = "down" }: HeroPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!animated) {
      setFrameIndex(0);
      return;
    }
    const sequence = [0, 0, 1, 1, 0];
    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor = (cursor + 1) % sequence.length;
      setFrameIndex(sequence[cursor]);
    }, 360);
    return () => window.clearInterval(timer);
  }, [animated]);

  useEffect(() => {
    let cancelled = false;
    const layers = portraitLayers(appearance, equipped, customization);
    Promise.all(layers.map(async (layer) => ({ layer, image: await loadImage(layer.path) })))
      .then((loaded) => {
        if (cancelled || !canvasRef.current) return;
        const context = canvasRef.current.getContext("2d");
        if (!context) return;
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, 128, 128);
        loaded.forEach(({ layer, image }) => drawTintedFrame(context, image, layer, direction, frameIndex));
      })
      .catch(() => {
        // The in-game loader reports missing assets; the menu should remain usable meanwhile.
      });
    return () => {
      cancelled = true;
    };
  }, [appearance, customization, direction, equipped.armor, equipped.tool, equipped.weapon, frameIndex]);

  return <canvas ref={canvasRef} width={128} height={128} className={`rpg-hero-portrait ${className}`.trim()} />;
}
