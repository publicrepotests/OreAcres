export const RPG_PUBLIC_EVENT_ROTATION_MS = 6 * 60_000;

export const RPG_PUBLIC_EVENTS = [
  { enemyId: "auric-slime", name: "Auric Slime", location: "Southroad anomaly", region: "Southroad" },
  { enemyId: "ironhide-grukk", name: "Ironhide Grukk", location: "Raider Dens", region: "Briarwild" },
  { enemyId: "moonfen-oracle", name: "Ssavra, Moonfen Oracle", location: "Moonfen ritual pool", region: "Moonfen Marsh" },
];

export function featuredRpgPublicEvent(at = Date.now(), overrideEnemyId = process.env.RPG_PUBLIC_EVENT_ENEMY_ID || "") {
  const slot = Math.floor(Math.max(0, at) / RPG_PUBLIC_EVENT_ROTATION_MS);
  const scheduled = RPG_PUBLIC_EVENTS[slot % RPG_PUBLIC_EVENTS.length];
  const event = RPG_PUBLIC_EVENTS.find((candidate) => candidate.enemyId === String(overrideEnemyId).trim()) || scheduled;
  return { event, slot, endsAt: (slot + 1) * RPG_PUBLIC_EVENT_ROTATION_MS };
}

export function rpgPublicEventForEnemy(enemyId) {
  return RPG_PUBLIC_EVENTS.find((event) => event.enemyId === enemyId) || null;
}

export function isFeaturedRpgPublicEvent(enemyId, at = Date.now(), overrideEnemyId) {
  return featuredRpgPublicEvent(at, overrideEnemyId).event.enemyId === enemyId;
}
