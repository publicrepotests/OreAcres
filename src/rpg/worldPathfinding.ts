import { WORLD } from "./gameData";
import { PLAYER_COLLISION_RADIUS, isWorldPositionWalkable } from "./worldCollision";

export type WorldPathPoint = { x: number; y: number };

const GRID_SIZE = 16;
const WORLD_MARGIN_X = 26;
const WORLD_MARGIN_TOP = 34;
const WORLD_MARGIN_BOTTOM = 24;
const MAX_COLUMNS = Math.floor(WORLD.width / GRID_SIZE);
const MAX_ROWS = Math.floor(WORLD.height / GRID_SIZE);
const NEIGHBORS = [
  { x: 1, y: 0, cost: 1 },
  { x: -1, y: 0, cost: 1 },
  { x: 0, y: 1, cost: 1 },
  { x: 0, y: -1, cost: 1 },
  { x: 1, y: 1, cost: Math.SQRT2 },
  { x: 1, y: -1, cost: Math.SQRT2 },
  { x: -1, y: 1, cost: Math.SQRT2 },
  { x: -1, y: -1, cost: Math.SQRT2 },
] as const;

type GridPoint = { x: number; y: number };
type OpenNode = GridPoint & { score: number };
const walkableGridCache = new Map<string, boolean>();

function pointKey(x: number, y: number) {
  return `${x}:${y}`;
}

function toWorld(point: GridPoint): WorldPathPoint {
  return { x: point.x * GRID_SIZE, y: point.y * GRID_SIZE };
}

function insideWorld(x: number, y: number) {
  const worldX = x * GRID_SIZE;
  const worldY = y * GRID_SIZE;
  return (
    x >= 0
    && x <= MAX_COLUMNS
    && y >= 0
    && y <= MAX_ROWS
    && worldX >= WORLD_MARGIN_X
    && worldX <= WORLD.width - WORLD_MARGIN_X
    && worldY >= WORLD_MARGIN_TOP
    && worldY <= WORLD.height - WORLD_MARGIN_BOTTOM
  );
}

function gridWalkable(x: number, y: number) {
  if (!insideWorld(x, y)) return false;
  const key = pointKey(x, y);
  const cached = walkableGridCache.get(key);
  if (cached !== undefined) return cached;
  const walkable = isWorldPositionWalkable(x * GRID_SIZE, y * GRID_SIZE);
  walkableGridCache.set(key, walkable);
  return walkable;
}

function pushOpen(heap: OpenNode[], node: OpenNode) {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent].score <= node.score) break;
    heap[index] = heap[parent];
    index = parent;
  }
  heap[index] = node;
}

function popOpen(heap: OpenNode[]) {
  const first = heap[0];
  const last = heap.pop();
  if (!last || heap.length === 0) return first;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    if (left >= heap.length) break;
    const child = right < heap.length && heap[right].score < heap[left].score ? right : left;
    if (heap[child].score >= last.score) break;
    heap[index] = heap[child];
    index = child;
  }
  heap[index] = last;
  return first;
}

function nearestWalkableGrid(point: WorldPathPoint): GridPoint | null {
  const originX = Math.round(point.x / GRID_SIZE);
  const originY = Math.round(point.y / GRID_SIZE);
  for (let radius = 0; radius <= 14; radius += 1) {
    let best: GridPoint | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== radius) continue;
        const x = originX + offsetX;
        const y = originY + offsetY;
        if (!gridWalkable(x, y)) continue;
        const world = toWorld({ x, y });
        const distance = Math.hypot(world.x - point.x, world.y - point.y);
        if (distance < bestDistance) {
          best = { x, y };
          bestDistance = distance;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function octileDistance(from: GridPoint, to: GridPoint) {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

export function isWorldPathSegmentClear(from: WorldPathPoint, to: WorldPathPoint) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 7));
  for (let step = 1; step <= steps; step += 1) {
    const amount = step / steps;
    const x = from.x + (to.x - from.x) * amount;
    const y = from.y + (to.y - from.y) * amount;
    if (!isWorldPositionWalkable(x, y, PLAYER_COLLISION_RADIUS)) return false;
  }
  return true;
}

function gridSegmentClear(from: GridPoint, to: GridPoint) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance * 2));
  let previousX = from.x;
  let previousY = from.y;
  for (let step = 1; step <= steps; step += 1) {
    const amount = step / steps;
    const x = Math.round(from.x + (to.x - from.x) * amount);
    const y = Math.round(from.y + (to.y - from.y) * amount);
    if (!gridWalkable(x, y)) return false;
    if (x !== previousX && y !== previousY && (!gridWalkable(x, previousY) || !gridWalkable(previousX, y))) {
      return false;
    }
    previousX = x;
    previousY = y;
  }
  return true;
}

function smoothGridPath(start: GridPoint, points: GridPoint[]) {
  if (points.length <= 1) return points;
  const smoothed: GridPoint[] = [];
  let anchor = start;
  let index = 0;
  while (index < points.length) {
    let furthest = index;
    for (let candidate = points.length - 1; candidate > index; candidate -= 1) {
      if (gridSegmentClear(anchor, points[candidate])) {
        furthest = candidate;
        break;
      }
    }
    smoothed.push(points[furthest]);
    anchor = points[furthest];
    index = furthest + 1;
  }
  return smoothed;
}

export function findWorldPath(start: WorldPathPoint, requestedGoal: WorldPathPoint): WorldPathPoint[] {
  const goal = {
    x: Math.max(WORLD_MARGIN_X, Math.min(WORLD.width - WORLD_MARGIN_X, requestedGoal.x)),
    y: Math.max(WORLD_MARGIN_TOP, Math.min(WORLD.height - WORLD_MARGIN_BOTTOM, requestedGoal.y)),
  };
  if (isWorldPositionWalkable(goal.x, goal.y) && isWorldPathSegmentClear(start, goal)) return [goal];

  const startGrid = nearestWalkableGrid(start);
  const goalGrid = nearestWalkableGrid(goal);
  if (!startGrid || !goalGrid) return [];
  if (startGrid.x === goalGrid.x && startGrid.y === goalGrid.y) return [toWorld(goalGrid)];

  const open: OpenNode[] = [{ ...startGrid, score: octileDistance(startGrid, goalGrid) }];
  const closed = new Set<string>();
  const cameFrom = new Map<string, GridPoint>();
  const costs = new Map([[pointKey(startGrid.x, startGrid.y), 0]]);

  while (open.length) {
    const current = popOpen(open);
    if (!current) break;
    const currentKey = pointKey(current.x, current.y);
    if (closed.has(currentKey)) continue;
    if (current.x === goalGrid.x && current.y === goalGrid.y) {
      const reversed: GridPoint[] = [goalGrid];
      let cursor = goalGrid;
      while (cursor.x !== startGrid.x || cursor.y !== startGrid.y) {
        const previous = cameFrom.get(pointKey(cursor.x, cursor.y));
        if (!previous) return [];
        reversed.push(previous);
        cursor = previous;
      }
      reversed.reverse();
      const rawGridPoints = reversed.slice(1);
      const smoothedGridPoints = smoothGridPath(startGrid, rawGridPoints);
      let worldPoints = smoothedGridPoints.map(toWorld);
      let segmentStart = start;
      if (worldPoints.some((point) => {
        const blocked = !isWorldPathSegmentClear(segmentStart, point);
        segmentStart = point;
        return blocked;
      })) {
        worldPoints = rawGridPoints.map(toWorld);
      }
      if (isWorldPositionWalkable(goal.x, goal.y) && isWorldPathSegmentClear(worldPoints.at(-1) ?? start, goal)) {
        worldPoints.push(goal);
      }
      return worldPoints;
    }

    closed.add(currentKey);
    const currentCost = costs.get(currentKey) ?? Number.POSITIVE_INFINITY;
    for (const neighbor of NEIGHBORS) {
      const x = current.x + neighbor.x;
      const y = current.y + neighbor.y;
      const nextKey = pointKey(x, y);
      if (closed.has(nextKey) || !gridWalkable(x, y)) continue;
      if (
        neighbor.x !== 0
        && neighbor.y !== 0
        && (!gridWalkable(current.x + neighbor.x, current.y) || !gridWalkable(current.x, current.y + neighbor.y))
      ) {
        continue;
      }
      const cost = currentCost + neighbor.cost;
      if (cost >= (costs.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      costs.set(nextKey, cost);
      cameFrom.set(nextKey, { x: current.x, y: current.y });
      const score = cost + octileDistance({ x, y }, goalGrid);
      pushOpen(open, { x, y, score });
    }
  }
  return [];
}
