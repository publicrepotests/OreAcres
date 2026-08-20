export type PublicEventDefinition = {
  enemyId: string;
  name: string;
  location: string;
  region: string;
  rally: string;
  accent: string;
};

export const PUBLIC_EVENT_ROTATION_MS = 6 * 60_000;

export const PUBLIC_EVENTS: readonly PublicEventDefinition[] = [
  {
    enemyId: "auric-slime",
    name: "Auric Slime",
    location: "Southroad anomaly",
    region: "Southroad",
    rally: "Shatter the radiant core before it sinks beneath the road.",
    accent: "#f5d36a",
  },
  {
    enemyId: "ironhide-grukk",
    name: "Ironhide Grukk",
    location: "Raider Dens",
    region: "Briarwild",
    rally: "Break the raider champion before the dens rally behind him.",
    accent: "#ef9a55",
  },
  {
    enemyId: "moonfen-oracle",
    name: "Ssavra, Moonfen Oracle",
    location: "Moonfen ritual pool",
    region: "Moonfen Marsh",
    rally: "Disrupt the moonwell ritual before the marsh is consumed.",
    accent: "#9f9af2",
  },
  {
    enemyId: "emberfall-caldera-lord",
    name: "Varkul, Caldera Lord",
    location: "Emberfall crater throne",
    region: "Emberfall Highlands",
    rally: "Break the Caldera Lord before the crater road collapses.",
    accent: "#ff7958",
  },
  {
    enemyId: "frostmere-lighthouse-warden",
    name: "Eira, Lighthouse Warden",
    location: "Frostmere lighthouse cliff",
    region: "Frostmere Coast",
    rally: "Relight the beacon before the frozen coast loses its last safe harbor.",
    accent: "#8bdfff",
  },
  {
    enemyId: "sunscar-tomb-king",
    name: "Khepri, Tomb King",
    location: "Sealed tomb beneath the Sunscar dunes",
    region: "Sunscar Expanse",
    rally: "Break the solar seal before Khepri wakes the buried court.",
    accent: "#ffb45c",
  },
] as const;

export function publicEventRotation(at = Date.now()) {
  const slot = Math.floor(Math.max(0, at) / PUBLIC_EVENT_ROTATION_MS);
  return {
    event: PUBLIC_EVENTS[slot % PUBLIC_EVENTS.length],
    slot,
    endsAt: (slot + 1) * PUBLIC_EVENT_ROTATION_MS,
  };
}

export function publicEventByEnemyId(enemyId: string) {
  return PUBLIC_EVENTS.find((event) => event.enemyId === enemyId) ?? null;
}
