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

export function isWorldPositionWalkable(x, y, radius = PLAYER_COLLISION_RADIUS) {
  if (x - radius < 0 || x + radius > 1536 || y - radius < 0 || y + radius > 3072) return false;
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
