import fs from "node:fs";
import { isWorldPositionWalkable as isAuthoritativeWorldPositionWalkable } from "../server/src/worldCollision.js";

const WORLD = { width: 1536, height: 9216 };
const PLAYER_RADIUS = 6;
const GRID_SIZE = 16;
const layout = JSON.parse(
  fs.readFileSync(new URL("../src/rpg/orehavenCollisions.json", import.meta.url), "utf8"),
);
const serverLayout = JSON.parse(
  fs.readFileSync(new URL("../server/src/orehavenCollisions.json", import.meta.url), "utf8"),
);
const worldLayout = JSON.parse(
  fs.readFileSync(new URL("../src/rpg/worldLayout.json", import.meta.url), "utf8"),
);
const serverWorldLayout = JSON.parse(
  fs.readFileSync(new URL("../server/src/worldLayout.json", import.meta.url), "utf8"),
);

if (JSON.stringify(layout) !== JSON.stringify(serverLayout)) {
  throw new Error("Client and realtime-server collision layouts are out of sync.");
}
if (JSON.stringify(worldLayout) !== JSON.stringify(serverWorldLayout)) {
  throw new Error("Client and realtime-server world layouts are out of sync.");
}

function pointInsidePolygon(x, y, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [currentX, currentY] = points[index];
    const [previousX, previousY] = points[previous];
    if (
      currentY > y !== previousY > y &&
      x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function pointNearSegment(x, y, segment) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;
  const amount = lengthSquared > 0
    ? Math.max(0, Math.min(1, ((x - segment.x1) * dx + (y - segment.y1) * dy) / lengthSquared))
    : 0;
  return Math.hypot(x - (segment.x1 + dx * amount), y - (segment.y1 + dy * amount)) <= segment.radius;
}

function pointBlocked(x, y) {
  const disabled = new Set(layout.disabledObstacleIds ?? []);
  if (layout.walkableSegments.some((segment) => pointNearSegment(x, y, segment))) return false;
  if (
    layout.rectangles.some(
      (rectangle) =>
        !disabled.has(rectangle.id) &&
        x >= rectangle.x &&
        x <= rectangle.x + rectangle.width &&
        y >= rectangle.y &&
        y <= rectangle.y + rectangle.height,
    )
  ) {
    return true;
  }
  if (layout.circles.some((circle) => !disabled.has(circle.id) && Math.hypot(x - circle.x, y - circle.y) <= circle.radius)) {
    return true;
  }
  return layout.polygons.some((polygon) => !disabled.has(polygon.id) && pointInsidePolygon(x, y, polygon.points));
}

function isWalkable(x, y) {
  return isAuthoritativeWorldPositionWalkable(x, y, PLAYER_RADIUS);
}

function gridPoint(x, y) {
  return [Math.round(x / GRID_SIZE), Math.round(y / GRID_SIZE)];
}

function worldPoint(gridX, gridY) {
  return [gridX * GRID_SIZE, gridY * GRID_SIZE];
}

function key(x, y) {
  return `${x}:${y}`;
}

function findNearestWalkable(x, y) {
  const [originX, originY] = gridPoint(x, y);
  for (let radius = 0; radius <= 12; radius += 1) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== radius) continue;
        const gridX = originX + offsetX;
        const gridY = originY + offsetY;
        const [worldX, worldY] = worldPoint(gridX, gridY);
        if (worldX < 26 || worldX > WORLD.width - 26 || worldY < 34 || worldY > WORLD.height - 24) continue;
        if (isWalkable(worldX, worldY)) return [gridX, gridY];
      }
    }
  }
  throw new Error(`No walkable grid position near (${x}, ${y}).`);
}

const destinations = [
  ["Orehaven south gate", 748, 900],
  ["Eastern Quarry", 1300, 380],
  ["Western Woods", 190, 520],
  ["Goblin Camp", 1260, 690],
  ["Briarwild Crossing", 760, 1250],
  ["Old Sun Shrine", 500, 1280],
  ["Moonfen Marsh", 1060, 1340],
  ["Ranger Camp", 500, 1600],
  ["Raider Dens", 1180, 1600],
  ["Frostmere Coast gate", 768, 5168],
  ["Frostmere lighthouse road", 1160, 5360],
  ["Sunstone boss chamber", 768, 2694],
  ["Moonfen drowned altar", 768, 3890],
  ["Emberfall caldera throne", 768, 4930],
  ["Sunscar solar tomb", 330, 6270],
  ["Guild Hall entry", 1080, 7420],
  ["Guild Hall waystone", 608, 7788],
  ["Guild Hall exit", 768, 8120],
  ["Icefang entrance", 768, 9120],
  ["Icefang runic confluence", 768, 8672],
  ["Icefang frostglass mine", 270, 8520],
  ["Icefang icewater bridge", 1220, 8500],
  ["Icefang southwest chamber", 280, 8965],
  ["Icefang southeast chamber", 1190, 8960],
  ["Icefang Rime Throne", 768, 8345],
];

const portalTransitions = [
  [330, 1300, 768, 2140],
  [768, 2104, 330, 1332],
  [1310, 2880, 768, 3310],
  [138, 3150, 768, 2228],
  [1320, 4080, 768, 4350],
  [160, 4170, 768, 3260],
  [768, 5165, 768, 5300],
  [768, 6020, 768, 5050],
  [768, 6165, 768, 6320],
  [768, 7050, 768, 6050],
  [930, 200, 1080, 7420],
  [768, 8120, 1010, 392],
  [1350, 5850, 768, 9120],
  [768, 9128, 1310, 5840],
];

const ambientCitizenWaypoints = [
  ["Town courier", [[590, 420], [746, 360], [884, 450], [820, 590], [640, 548]]],
  ["Keep guard", [[658, 270], [838, 270], [882, 350], [616, 350]]],
  ["Market shopper", [[566, 476], [590, 420], [690, 470], [640, 548]]],
  ["Forge apprentice", [[890, 470], [972, 450], [884, 450]]],
  ["Quarry hauler", [[1270, 410], [1370, 350], [1290, 500]]],
  ["Western scout", [[270, 590], [350, 680], [455, 720]]],
  ["Southroad traveler", [[720, 820], [760, 950], [760, 1090], [700, 1185]]],
  ["Briarwild patrol", [[550, 1500], [660, 1590], [700, 1735], [545, 1820]]],
  ["Moonfen lantern runner", [[620, 3340], [650, 3420], [540, 3480], [620, 3560]]],
  ["Moonfen wayfinder", [[900, 3350], [860, 3460], [760, 3510], [700, 3420]]],
  ["Emberfall ore runner", [[900, 4420], [820, 4500], [720, 4480], [620, 4400]]],
  ["Emberfall watch", [[1020, 4440], [940, 4360], [850, 4420], [930, 4500]]],
  ["Frostmere beacon runner", [[700, 5520], [820, 5520], [860, 5620], [720, 5650]]],
  ["Frostmere net mender", [[980, 5650], [1080, 5670], [1040, 5760], [950, 5750]]],
  ["Sunscar observatory aide", [[980, 6470], [1100, 6460], [1140, 6550], [1010, 6590]]],
  ["Sunscar caravan guard", [[330, 6520], [430, 6580], [510, 6650], [390, 6700]]],
  ["Guildhall steward", [[660, 7480], [780, 7460], [920, 7500], [1010, 7580]]],
  ["Guildhall dispatch runner", [[520, 7840], [680, 7910], [900, 7900], [1030, 7820]]],
];

const legacyEnemySpawns = [
  ["Field Rat", 250, 590],
  ["Camp Goblin", 1320, 830],
  ["Goblin Scavenger", 1305, 910],
  ["Goblin Sentry", 1200, 816],
  ["Goblin Bruiser", 1430, 840],
  ["Rikka the Firestarter", 1312, 1088],
  ["Pine Wolf", 225, 330],
  ["Pine Wolf II", 390, 500],
  ["Roadside Rat", 1110, 760],
  ["Crystal Slime", 1348, 430],
  ["Auric Slime", 980, 820],
  ["Briar Wolf", 680, 1380],
  ["Briar Stalker", 820, 1510],
  ["Briar Prowler", 460, 1440],
  ["Bog Slime", 1030, 1345],
  ["Mire Slime", 1320, 1320],
  ["Fen Slime", 928, 1216],
  ["Orc Raider", 470, 1640],
  ["Orc Pathfinder", 520, 1540],
  ["Orc Campguard", 1050, 1700],
  ["Orc Marauder", 1320, 1650],
  ["Ironhide Grukk", 1080, 1830],
  ["Marshscale Mystic", 1090, 1510],
  ["Marshscale Guard", 1180, 1600],
  ["Marshscale Scout", 1230, 1765],
  ["Marshscale Hunter", 1376, 1504],
  ["Ssavra, Moonfen Oracle", 1344, 1488],
  ["Sunbone Wanderer", 540, 1220],
  ["Sunbone Guardian", 535, 1360],
  ["Sunbone Skirmisher", 340, 1470],
  ["Fallen Ranger", 610, 1720],
  ["Moonfen Hexer", 870, 1390],
  ["Briar Bonecaller", 860, 1740],
];

const enemySpawns = worldLayout.enemies.length
  ? worldLayout.enemies.map((enemy) => [enemy.name, enemy.x, enemy.y])
  : legacyEnemySpawns;

const approachPoints = [
  ["Keep doorway apron", 748, 204],
  ["Keep stairs", 748, 214],
  ["Northwest house east-edge clearance", 576, 216],
  ["Northeast house west-edge clearance", 912, 220],
  ["West guildhall east-edge clearance", 572, 350],
  ["West guildhall east lane", 580, 320],
  ["East forge doorway apron", 1060, 440],
  ["East forge west lane", 912, 280],
  ["Southwest house doorway apron", 500, 600],
  ["Southwest house east lane", 592, 560],
  ["Tavern doorway apron", 915, 608],
  ["Tavern west lane", 808, 620],
  ["Bank doorway apron", 1072, 590],
  ["Bank door", 1072, 604],
  ["Southwest gatehouse east lane", 718, 640],
  ["South lodge west lane", 794, 680],
  ["Orehaven south gate road", 748, 720],
  ["Orehaven south gate west lane", 724, 720],
  ["Orehaven south gate east lane", 772, 720],
  ["Treasure clue at founder fountain", 688, 468],
  ["Treasure clue at Moonwater dock", 282, 872],
  ["Treasure clue at Old Sun Shrine", 320, 1300],
  ["North quarry entrance", 1248, 172],
  ["East quarry entrance", 1388, 336],
  ["Moonwater dock", 282, 872],
  ["Old Sun Shrine entrance", 314, 1360],
  ["Sunstone Seal approach", 320, 1300],
  ["Ranger Camp center", 246, 1640],
  ["Raider Dens south path", 1180, 1740],
];

const waystones = [
  ["Orehaven Waystone", 650, 820, 698, 820],
  ["Moonwater Waystone", 282, 872, 302, 872],
  ["Quarry Waystone", 1248, 172, 1248, 204],
  ["Briarwild Waystone", 760, 1250, 760, 1290],
  ["Moonfen Waystone", 1060, 1340, 1096, 1340],
  ["Ranger Camp Waystone", 246, 1640, 266, 1640],
  ["Catacomb Waystone", 768, 2192, 768, 2228],
  ["Moonfen Expanse Waystone", 768, 3260, 768, 3310],
  ["Emberfall Waystone", 768, 4300, 768, 4350],
  ["Frostmere Waystone", 260, 5500, 310, 5500],
  ["Guild Hall Waystone", 608, 7788, 608, 7820],
];

const obstacleCenters = [
  ["Keep", 748, 110],
  ["West guildhall", 458, 350],
  ["East forge", 1050, 350],
  ["Fountain", 742, 438],
  ["Blue market stall", 632, 311],
  ["Southwest house", 500, 520],
  ["Bank", 1072, 530],
  ["Moonwater Pond", 120, 800],
  ["Goblin campfire", 1234, 840],
  ["Old Sun Shrine west wall", 176, 1240],
  ["Ranger watchtower", 368, 1616],
  ["Raider crates", 1300, 1670],
];

const legacyNpcInteractionCenters = [
  ["Mira", 704, 515],
  ["Grent", 1065, 595],
  ["Korra", 925, 455],
  ["Pip", 610, 445],
  ["Acre Clerk", 760, 690],
  ["Marshal Rowan", 846, 690],
  ["Captain Thorne", 800, 640],
  ["Lyra Thorn", 246, 1640],
];

const npcInteractionCenters = worldLayout.npcs.length
  ? worldLayout.npcs.map((npc) => [npc.name, npc.x, npc.y])
  : legacyNpcInteractionCenters;

const legacyResourceInteractionCenters = [
  ["Copper Outcrop I", 1380, 275],
  ["Copper Outcrop II", 1324, 350],
  ["Copper Outcrop III", 1238, 430],
  ["Iron Outcrop I", 1290, 165],
  ["Iron Outcrop II", 1405, 220],
  ["Ancient Oak I", 132, 480],
  ["Ancient Oak II", 90, 560],
  ["Briar Oak", 350, 1060],
  ["Pine Tree I", 220, 175],
  ["Pine Tree II", 145, 300],
  ["Ancient Oak IV", 92, 380],
  ["Ancient Oak V", 520, 980],
  ["Pine Tree III", 300, 140],
  ["Pine Tree IV", 1360, 1160],
  ["Briar Oak I", 360, 1450],
  ["Briar Oak II", 82, 1450],
  ["Briar Oak III", 1260, 1400],
  ["Briar Pine I", 180, 1460],
  ["Briar Pine II", 520, 1540],
  ["Briar Pine III", 900, 1840],
  ["Briar Pine IV", 420, 1880],
  ["Briar Pine V", 1340, 1900],
  ["Moonwater Fishing I", 245, 785],
  ["Moonwater Fishing II", 185, 842],
  ["Moonfen Fishing I", 930, 1205],
  ["Moonfen Fishing II", 1185, 1270],
  ["Sunstone Seal", 320, 1248],
];

const resourceInteractionCenters = worldLayout.resources.length
  ? worldLayout.resources.map((resource) => [resource.name, resource.x, resource.y])
  : legacyResourceInteractionCenters;

function hasWalkableApproach(centerX, centerY, maximumDistance = 58) {
  for (let distance = 20; distance <= maximumDistance; distance += 4) {
    for (let degrees = 0; degrees < 360; degrees += 15) {
      const radians = (degrees * Math.PI) / 180;
      if (isWalkable(centerX + Math.cos(radians) * distance, centerY + Math.sin(radians) * distance)) return true;
    }
  }
  return false;
}

const blockedSpawns = enemySpawns.filter(([, x, y]) => !isWalkable(x, y)).map(([label, x, y]) => {
  const [gridX, gridY] = findNearestWalkable(x, y);
  const [nearestX, nearestY] = worldPoint(gridX, gridY);
  return `${label} (nearest valid ground: ${nearestX}, ${nearestY})`;
});
if (blockedSpawns.length) {
  throw new Error(`Enemy spawns overlap collision: ${blockedSpawns.join(", ")}`);
}

const blockedApproaches = approachPoints.filter(([, x, y]) => !isWalkable(x, y)).map(([label]) => label);
if (blockedApproaches.length) {
  throw new Error(`Visible roads or structure approaches overlap collision: ${blockedApproaches.join(", ")}`);
}

const blockedCitizenWaypoints = ambientCitizenWaypoints.flatMap(([label, points]) =>
  points
    .filter(([x, y]) => !isWalkable(x, y))
    .map(([x, y]) => `${label} (${x}, ${y})`),
);
if (blockedCitizenWaypoints.length) {
  throw new Error(`Ambient citizen waypoints overlap collision: ${blockedCitizenWaypoints.join(", ")}`);
}

const missingObstacles = obstacleCenters.filter(([, x, y]) => isWalkable(x, y)).map(([label]) => label);
if (missingObstacles.length) {
  throw new Error(`Visible structures are missing collision: ${missingObstacles.join(", ")}`);
}

const unreachableNpcs = npcInteractionCenters
  .filter(([, x, y]) => !hasWalkableApproach(x, y))
  .map(([label]) => label);
if (unreachableNpcs.length) {
  throw new Error(`NPC interaction rings are blocked by collision: ${unreachableNpcs.join(", ")}`);
}

const unreachableResources = resourceInteractionCenters
  .filter(([, x, y]) => !hasWalkableApproach(x, y, 124))
  .map(([label]) => label);
if (unreachableResources.length) {
  throw new Error(`Gathering nodes have no collision-safe interaction approach: ${unreachableResources.join(", ")}`);
}

const unreachableEnemies = enemySpawns
  .filter(([, x, y]) => !hasWalkableApproach(x, y, 124))
  .map(([label]) => label);
if (unreachableEnemies.length) {
  throw new Error(`Enemy spawns have no collision-safe combat approach: ${unreachableEnemies.join(", ")}`);
}

const unreachableWaystones = waystones
  .filter(([, x, y, arrivalX, arrivalY]) => !isWalkable(arrivalX, arrivalY) || !hasWalkableApproach(x, y, 96))
  .map(([label]) => label);
if (unreachableWaystones.length) {
  throw new Error(`Waystones have no collision-safe arrival or interaction point: ${unreachableWaystones.join(", ")}`);
}

for (const bridge of layout.walkableSegments) {
  const dx = bridge.x2 - bridge.x1;
  const dy = bridge.y2 - bridge.y1;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const laneOffset = Math.max(0, bridge.radius - PLAYER_RADIUS - 5);
  for (let amount = 0.15; amount <= 0.85; amount += 0.1) {
    const x = bridge.x1 + (bridge.x2 - bridge.x1) * amount;
    const y = bridge.y1 + (bridge.y2 - bridge.y1) * amount;
    if (!isWalkable(x, y)) throw new Error(`${bridge.id} blocks its visible boardwalk at (${Math.round(x)}, ${Math.round(y)}).`);
    for (const side of [-1, 1]) {
      const laneX = x + normalX * laneOffset * side;
      const laneY = y + normalY * laneOffset * side;
      if (!isWalkable(laneX, laneY)) {
        throw new Error(`${bridge.id} has an unusably narrow lane at (${Math.round(laneX)}, ${Math.round(laneY)}).`);
      }
    }
  }
}

const start = findNearestWalkable(748, 505);
const queue = [start];
const visited = new Set([key(...start)]);
const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const activatedPortals = new Set();

for (let cursor = 0; cursor < queue.length; cursor += 1) {
  const [gridX, gridY] = queue[cursor];
  const [currentX, currentY] = worldPoint(gridX, gridY);
  portalTransitions.forEach(([sourceX, sourceY, destinationX, destinationY], portalIndex) => {
    if (activatedPortals.has(portalIndex) || Math.hypot(currentX - sourceX, currentY - sourceY) > 104) return;
    activatedPortals.add(portalIndex);
    const destination = findNearestWalkable(destinationX, destinationY);
    const destinationKey = key(...destination);
    if (!visited.has(destinationKey)) {
      visited.add(destinationKey);
      queue.push(destination);
    }
  });
  for (const [offsetX, offsetY] of directions) {
    const nextX = gridX + offsetX;
    const nextY = gridY + offsetY;
    const nextKey = key(nextX, nextY);
    if (visited.has(nextKey)) continue;
    const [worldX, worldY] = worldPoint(nextX, nextY);
    if (worldX < 26 || worldX > WORLD.width - 26 || worldY < 34 || worldY > WORLD.height - 24) continue;
    if (!isWalkable(worldX, worldY)) continue;
    visited.add(nextKey);
    queue.push([nextX, nextY]);
  }
}

const failures = [];
for (const [label, x, y] of destinations) {
  const destination = findNearestWalkable(x, y);
  if (!visited.has(key(...destination))) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of queue) {
      const distance = Math.hypot(candidate[0] - destination[0], candidate[1] - destination[1]);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    failures.push(
      `${label} at ${worldPoint(...destination).join(",")} (reachable edge ${nearest ? worldPoint(...nearest).join(",") : "none"})`,
    );
  }
}

for (const [label, points] of ambientCitizenWaypoints) {
  for (const [x, y] of points) {
    const destination = findNearestWalkable(x, y);
    if (!visited.has(key(...destination))) failures.push(`${label} waypoint at ${x},${y}`);
  }
}

for (const [label, x, y] of waystones) {
  const destination = findNearestWalkable(x, y);
  if (!visited.has(key(...destination))) failures.push(`${label} at ${x},${y}`);
}

for (const [label, x, y] of enemySpawns) {
  const destination = findNearestWalkable(x, y);
  if (!visited.has(key(...destination))) failures.push(`${label} combat approach at ${x},${y}`);
}

if (failures.length) {
  throw new Error(`World collision disconnected: ${failures.join(", ")}`);
}

console.log(
  `RPG world connectivity passed: ${destinations.length} destinations, ${approachPoints.length} clear approaches, ${npcInteractionCenters.length} reachable NPCs, ${resourceInteractionCenters.length} reachable resources, ${enemySpawns.length} reachable enemies, ${waystones.length} reachable waystones, ${ambientCitizenWaypoints.flatMap(([, points]) => points).length} ambient waypoints, ${visited.size} walkable cells.`,
);
