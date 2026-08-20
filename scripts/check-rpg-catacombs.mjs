import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const clientData = fs.readFileSync(new URL("src/rpg/gameData.ts", root), "utf8");
const scene = fs.readFileSync(new URL("src/rpg/OrehavenScene.ts", root), "utf8");
const shell = fs.readFileSync(new URL("src/PhaserRpgGame.tsx", root), "utf8");
const server = fs.readFileSync(new URL("server/src/index.js", root), "utf8");
const catacombRules = fs.readFileSync(new URL("server/src/catacombRules.js", root), "utf8");
const adventureRules = JSON.parse(fs.readFileSync(new URL("src/rpg/adventureRules.json", root), "utf8"));
const layout = JSON.parse(fs.readFileSync(new URL("src/rpg/orehavenCollisions.json", root), "utf8"));
const serverLayout = JSON.parse(fs.readFileSync(new URL("server/src/orehavenCollisions.json", root), "utf8"));
const image = fs.readFileSync(new URL("public/assets/rpg/world/sunstone-catacombs.png", root));

assert.equal(image.toString("ascii", 1, 4), "PNG", "catacomb artwork is not a PNG");
assert.equal(image.readUInt32BE(16), 1536, "catacomb artwork width drifted");
assert.equal(image.readUInt32BE(20), 1024, "catacomb artwork height drifted");
assert.deepEqual(layout, serverLayout, "client/server catacomb collision geometry drifted");
assert.match(clientData, /WORLD = \{ width: 1536, height: 9216 \}/);
assert.match(server, /RPG_WORLD = \{ width: 1536, height: 9216 \}/);
assert.match(scene, /SUNSTONE_CATACOMBS_KEY, path: WORLD_AREAS\.dungeon\.images\[0\], y: WORLD_AREAS\.dungeon\.top/);
assert.match(scene, /createDungeonPortals\(\)/);
assert.match(scene, /rpg_dungeon_travel/);
assert.match(server, /message\.type === "rpg_dungeon_travel"/);
assert.doesNotMatch(server, /broadcastRpgPresence/, "portal travel references a missing presence helper");
assert.match(server, /rpg_dungeon_travel[\s\S]*?type: "player_moved"/, "portal travel is not broadcast to nearby players");
assert.match(catacombRules, /Eclipse Collapse/);
assert.match(catacombRules, /Soulfire Cross/);
assert.match(catacombRules, /Fallen Sun Eruption/);
assert.match(shell, /WORLD_AREAS, WORLD_AREA_ORDER, worldAreaForY/, "The world map UI does not consume the shared atlas");
assert.match(shell, /label: "Sunstone Descent"/);
assert.match(shell, /className="rpg-dungeon-objective"/);
assert.match(shell, /enemyId: "sunstone-revenant"[\s\S]*?Fallen Sun Eruption/);
assert.match(scene, /createCatacombAtmosphere\(\)/);
assert.match(scene, /Aurex phase \$\{nextPhase\}/);
assert.deepEqual(adventureRules.find((entry) => entry.id === "beneath-the-fallen-sun"), {
  id: "beneath-the-fallen-sun",
  chapter: "Sunstone Chronicle",
  title: "Beneath the Fallen Sun",
  description: "Descend through the Old Sun Shrine and defeat Aurex, the Sunstone Revenant.",
  metric: "target:sunstone-revenant",
  target: 1,
  rewardGold: 900,
  rewardItems: [{ itemId: "aurex-sunblade", quantity: 1 }],
});
assert.deepEqual(adventureRules.find((entry) => entry.id === "embers-below"), {
  id: "embers-below",
  chapter: "Sunstone Chronicle",
  title: "Embers Below",
  description: "Mine 8 Sunstone Veins from the forgotten forge wing beneath Sunstone Hill.",
  metric: "target:resource-sunstone-ore",
  target: 8,
  rewardGold: 650,
  rewardItems: [{ itemId: "sunstone-shard", quantity: 1 }],
});
assert.match(clientData, /id: "aurex-sunblade"[\s\S]*?name: "Aurex Sunblade"/);
assert.match(server, /"aurex-sunblade": \{ id: "dawnfall"/);
assert.match(server, /recordLifetimeTarget\(next\.activities, definition\.id\)/);
assert.match(server, /recordLifetimeTarget\(next\.activities, `resource-\$\{definition\.itemId\}`\)/);
assert.match(server, /collectionLog\[reward\.itemId\]/);
assert.match(scene, /function resourceVisualColor\(itemId: string\)[\s\S]*?itemId === "sunstone-ore" \? 0xffca63/, "Sunstone veins lost their authored visual color");
assert.match(clientData, /id: "sunstone-pick"[\s\S]*?power: 4[\s\S]*?requiredLevel: 20/);
assert.match(server, /"sunstone-pick": \{[\s\S]*?power: 4[\s\S]*?requiredLevel: 20/);
assert.match(clientData, /id: "forge-sunstone-pick"[\s\S]*?itemId: "sunstone-ore", quantity: 8[\s\S]*?itemId: "sunstone-pick"/);
assert.match(server, /"forge-sunstone-pick": \{[\s\S]*?"sunstone-ore": 8[\s\S]*?itemId: "sunstone-pick"/);

function pointInsidePolygon(x, y, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [currentX, currentY] = points[index];
    const [previousX, previousY] = points[previous];
    if (currentY > y !== previousY > y && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX) inside = !inside;
  }
  return inside;
}

function pointNearSegment(x, y, segment) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;
  const amount = lengthSquared > 0 ? Math.max(0, Math.min(1, ((x - segment.x1) * dx + (y - segment.y1) * dy) / lengthSquared)) : 0;
  return Math.hypot(x - (segment.x1 + dx * amount), y - (segment.y1 + dy * amount)) <= segment.radius;
}

function pointBlocked(x, y) {
  if (layout.walkableSegments.some((segment) => pointNearSegment(x, y, segment))) return false;
  if (layout.rectangles.some((rectangle) => x >= rectangle.x && x <= rectangle.x + rectangle.width && y >= rectangle.y && y <= rectangle.y + rectangle.height)) return true;
  if (layout.circles.some((circle) => Math.hypot(x - circle.x, y - circle.y) <= circle.radius)) return true;
  return layout.polygons.some((polygon) => pointInsidePolygon(x, y, polygon.points));
}

const walkablePoints = [
  [768, 2104, "exit portal"],
  [768, 2140, "entry arrival"],
  [768, 2192, "waystone"],
  [720, 2400, "catacomb sentinel"],
  [1170, 2390, "drowned custodian"],
  [768, 2690, "sunstone revenant"],
  [500, 2240, "emberbone marksman"],
  [1040, 2240, "cryptflame channeler"],
  [280, 2360, "sunstone vein 1"],
  [240, 2480, "sunstone vein 2"],
  [360, 2280, "sunstone vein 3"],
];
for (const [x, y, label] of walkablePoints) assert.equal(pointBlocked(x, y), false, `${label} is inside collision`);
for (const [x, y] of [[80, 2200], [1450, 2500], [180, 2960]]) assert.equal(pointBlocked(x, y), true, `dungeon void at ${x},${y} is walkable`);

for (const id of ["catacomb-sentinel", "drowned-custodian", "emberbone-marksman", "cryptflame-channeler", "sunstone-revenant"]) {
  assert.match(clientData, new RegExp(`id: "${id}"`), `${id} is absent from client enemy definitions`);
  assert.match(server, new RegExp(`"${id}":`), `${id} is absent from server enemy definitions`);
}
assert.match(clientData, /id: "emberbone-marksman"[\s\S]*?attackStyle: "range"/);
assert.match(clientData, /id: "cryptflame-channeler"[\s\S]*?attackStyle: "magic"/);
assert.match(server, /"emberbone-marksman": \{[\s\S]*?attackRange: 210/);
assert.match(server, /"cryptflame-channeler": \{[\s\S]*?attackRange: 220/);
for (const id of ["sunstone-vein-1", "sunstone-vein-2", "sunstone-vein-3"]) {
  assert.match(clientData, new RegExp(`id: "${id}"[\\s\\S]*?itemId: "sunstone-ore"`), `${id} is absent from client resource definitions`);
  assert.match(server, new RegExp(`"${id}":[\\s\\S]*?itemId: "sunstone-ore"`), `${id} is absent from server resource definitions`);
}
assert.match(clientData, /id: "sunstone-catacombs"[\s\S]*?Sunstone Catacombs/);
assert.match(server, /y >= 2048[\s\S]*?sunstone-catacombs/);

console.log("Sunstone Catacombs checks passed: artwork, collision, portals, enemies, mining, crafting, chronicles, and server authority are aligned.");
