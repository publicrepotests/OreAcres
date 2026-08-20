import fs from "node:fs";

const layoutUrl = new URL("./orehavenCollisions.json", import.meta.url);

function readLayout() {
  const next = JSON.parse(fs.readFileSync(layoutUrl, "utf8"));
  for (const key of ["walkableSegments", "rectangles", "circles", "polygons"]) {
    if (!Array.isArray(next[key])) throw new Error(`Collision layout is missing ${key}.`);
  }
  return next;
}

let layout = readLayout();
export const PLAYER_COLLISION_RADIUS = 6;

function obstacleEnabled(obstacle) {
  return !(layout.disabledObstacleIds ?? []).includes(obstacle.id);
}

export function watchWorldCollisionLayout(onReload = () => {}) {
  fs.watchFile(layoutUrl, { interval: 400 }, (current, previous) => {
    if (current.mtimeMs === previous.mtimeMs) return;
    try {
      layout = readLayout();
      onReload(layout);
    } catch (error) {
      console.error("Collision layout reload rejected:", error);
    }
  });
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
  if (layout.walkableSegments.some((segment) => pointNearSegment(x, y, segment))) return false;
  if (
    layout.rectangles.some(
      (rectangle) =>
        obstacleEnabled(rectangle) &&
        x >= rectangle.x &&
        x <= rectangle.x + rectangle.width &&
        y >= rectangle.y &&
        y <= rectangle.y + rectangle.height,
    )
  ) {
    return true;
  }
  if (layout.circles.some((circle) => obstacleEnabled(circle) && Math.hypot(x - circle.x, y - circle.y) <= circle.radius)) {
    return true;
  }
  return layout.polygons.some((polygon) => obstacleEnabled(polygon) && pointInsidePolygon(x, y, polygon.points));
}

function guildHallPointWalkable(x, y) {
  if (y < 7168 || y >= 8192) return null;
  if (x < 42 || x > 1494 || y < 7198 || y > 8168) return false;
  const blockedRectangles = [
    [52, 7200, 300, 220],
    [1180, 7200, 300, 220],
    [540, 7200, 460, 150],
    [58, 7680, 330, 330],
    [1140, 7900, 330, 240],
  ];
  if (blockedRectangles.some(([left, top, width, height]) => x >= left && x <= left + width && y >= top && y <= top + height)) return false;
  if (Math.hypot(x - 768, y - 7660) < 188) return false;
  return true;
}

const ICEFANG_WALKABLE_CIRCLES = [
  { x: 768, y: 8672, radius: 225 },
  { x: 768, y: 8345, radius: 165 },
  { x: 270, y: 8520, radius: 125 },
  { x: 1320, y: 8420, radius: 112 },
  { x: 280, y: 8965, radius: 128 },
  { x: 1190, y: 8960, radius: 128 },
];

const ICEFANG_WALKABLE_SEGMENTS = [
  { id: "icefang-entry", x1: 768, y1: 9186, x2: 768, y2: 8672, radius: 76 },
  { id: "icefang-throne-road", x1: 768, y1: 8672, x2: 768, y2: 8345, radius: 70 },
  { id: "icefang-west-bridge", x1: 680, y1: 8615, x2: 330, y2: 8515, radius: 62 },
  { id: "icefang-east-bridge", x1: 855, y1: 8610, x2: 1270, y2: 8435, radius: 62 },
  { id: "icefang-southwest-bridge", x1: 655, y1: 8740, x2: 300, y2: 8945, radius: 58 },
  { id: "icefang-southeast-bridge", x1: 875, y1: 8740, x2: 1170, y2: 8945, radius: 58 },
];

function icefangVaultPointWalkable(x, y) {
  if (y < 8192) return null;
  if (x < 24 || x > 1512 || y < 8216 || y > 9192) return false;
  return ICEFANG_WALKABLE_CIRCLES.some((circle) => Math.hypot(x - circle.x, y - circle.y) <= circle.radius)
    || ICEFANG_WALKABLE_SEGMENTS.some((segment) => pointNearSegment(x, y, segment));
}

export function isWorldPositionWalkable(x, y, radius = PLAYER_COLLISION_RADIUS) {
  if (x - radius < 0 || x + radius > 1536 || y - radius < 0 || y + radius > 9216) return false;
  const icefangPoint = icefangVaultPointWalkable(x, y);
  if (icefangPoint !== null) {
    const diagonal = radius * 0.72;
    const samples = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius], [diagonal, diagonal], [diagonal, -diagonal], [-diagonal, diagonal], [-diagonal, -diagonal]];
    return samples.every(([offsetX, offsetY]) => icefangVaultPointWalkable(x + offsetX, y + offsetY) === true);
  }
  const guildHallPoint = guildHallPointWalkable(x, y);
  if (guildHallPoint !== null) {
    const diagonal = radius * 0.72;
    const samples = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius], [diagonal, diagonal], [diagonal, -diagonal], [-diagonal, diagonal], [-diagonal, -diagonal]];
    return samples.every(([offsetX, offsetY]) => guildHallPointWalkable(x + offsetX, y + offsetY) === true);
  }
  // The catacombs are a separate room reached only through the shrine entrance.
  if (y + radius > 2024 && y - radius < 2072) return false;
  const diagonal = radius * 0.72;
  const samples = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [diagonal, diagonal],
    [diagonal, -diagonal],
    [-diagonal, diagonal],
    [-diagonal, -diagonal],
  ];
  return samples.every(([offsetX, offsetY]) => !pointBlocked(x + offsetX, y + offsetY));
}

export function hasWorldLineOfSight(fromX, fromY, toX, toY) {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.max(1, Math.ceil(distance / 12));
  for (let step = 2; step < steps - 1; step += 1) {
    const amount = step / steps;
    const x = fromX + (toX - fromX) * amount;
    const y = fromY + (toY - fromY) * amount;
    if (!isWorldPositionWalkable(x, y, 3)) return false;
  }
  return true;
}
