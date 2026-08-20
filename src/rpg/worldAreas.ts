export type WorldAreaId = "overworld" | "dungeon" | "marsh" | "highlands" | "frostmere" | "sunscar" | "guildhall" | "icefang";

export type WorldAreaDefinition = {
  id: WorldAreaId;
  name: string;
  subtitle: string;
  top: number;
  height: number;
  images: readonly string[];
};

export const WORLD_AREA_ORDER: readonly WorldAreaId[] = [
  "overworld",
  "dungeon",
  "marsh",
  "highlands",
  "frostmere",
  "sunscar",
  "guildhall",
  "icefang",
] as const;

export const WORLD_AREAS: Readonly<Record<WorldAreaId, WorldAreaDefinition>> = {
  overworld: {
    id: "overworld",
    name: "Orehaven & Briarwild",
    subtitle: "The frontier roads",
    top: 0,
    height: 2048,
    images: ["/assets/rpg/world/orehaven-overworld.png", "/assets/rpg/world/briarwild-south.png"],
  },
  dungeon: {
    id: "dungeon",
    name: "Sunstone Catacombs",
    subtitle: "The buried kingdom",
    top: 2048,
    height: 1024,
    images: ["/assets/rpg/world/sunstone-catacombs.png"],
  },
  marsh: {
    id: "marsh",
    name: "Moonfen Expanse",
    subtitle: "The drowned road",
    top: 3072,
    height: 1024,
    images: ["/assets/rpg/world/moonfen-marsh.png"],
  },
  highlands: {
    id: "highlands",
    name: "Emberfall",
    subtitle: "The volcanic highlands",
    top: 4096,
    height: 1024,
    images: ["/assets/rpg/world/emberfall-highlands.png"],
  },
  frostmere: {
    id: "frostmere",
    name: "Frostmere",
    subtitle: "The frozen coast",
    top: 5120,
    height: 1024,
    images: ["/assets/rpg/world/frostmere-coast.png"],
  },
  sunscar: {
    id: "sunscar",
    name: "Sunscar",
    subtitle: "The red expanse",
    top: 6144,
    height: 1024,
    images: ["/assets/rpg/world/sunscar-expanse.png"],
  },
  guildhall: {
    id: "guildhall",
    name: "Guild Hall",
    subtitle: "The adventurers' refuge",
    top: 7168,
    height: 1024,
    images: ["/assets/rpg/world/orehaven-guildhall.png"],
  },
  icefang: {
    id: "icefang",
    name: "Icefang Vault",
    subtitle: "The frozen oath below Frostmere",
    top: 8192,
    height: 1024,
    images: ["/assets/rpg/world/icefang-vault.png"],
  },
};

export function worldAreaForY(y: number): WorldAreaId {
  for (let index = WORLD_AREA_ORDER.length - 1; index >= 0; index -= 1) {
    const area = WORLD_AREAS[WORLD_AREA_ORDER[index]];
    if (y >= area.top) return area.id;
  }
  return "overworld";
}

export function worldAreaMovementBounds(areaId: WorldAreaId, topPadding = 24, bottomPadding = 24) {
  const area = WORLD_AREAS[areaId];
  return {
    minY: area.top + topPadding,
    maxY: area.top + area.height - bottomPadding,
  };
}
