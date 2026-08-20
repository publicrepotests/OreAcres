import { useEffect, useMemo, useRef, useState } from "react";
import initialCollisionLayout from "./rpg/orehavenCollisions.json";

const WORLD_WIDTH = 1536;
const WORLD_HEIGHT = 9216;
const SAVE_ENDPOINT = "/__oreacres_admin/collisions";
const MAP_REVISION = "icefang-vault-20260819";

type MapArea = "surface" | "dungeon" | "marsh" | "highlands" | "frostmere" | "sunscar" | "guildhall" | "icefang" | "all";
const MAP_AREAS: Record<MapArea, { label: string; y: number; height: number }> = {
  surface: { label: "Surface", y: 0, height: 2048 },
  dungeon: { label: "Dungeon", y: 2048, height: 1024 },
  marsh: { label: "Moonfen Expanse", y: 3072, height: 1024 },
  highlands: { label: "Emberfall Highlands", y: 4096, height: 1024 },
  frostmere: { label: "Frostmere Coast", y: 5120, height: 1024 },
  sunscar: { label: "Sunscar Expanse", y: 6144, height: 1024 },
  guildhall: { label: "Orehaven Guild Hall", y: 7168, height: 1024 },
  icefang: { label: "Icefang Vault", y: 8192, height: 1024 },
  all: { label: "Full atlas", y: 0, height: WORLD_HEIGHT },
};

type Point = [number, number];
type RectangleShape = { id: string; x: number; y: number; width: number; height: number };
type CircleShape = { id: string; x: number; y: number; radius: number };
type PolygonShape = { id: string; points: Point[] };
type SegmentShape = { id: string; x1: number; y1: number; x2: number; y2: number; radius: number };
type CollisionShapeCollections = {
  walkableSegments: SegmentShape[];
  rectangles: RectangleShape[];
  circles: CircleShape[];
  polygons: PolygonShape[];
};
type CollisionLayout = CollisionShapeCollections & { disabledObstacleIds?: string[] };
type Category = keyof CollisionShapeCollections;
type Selection = { category: Category; id: string } | null;
type DragMode = "body" | "rect-nw" | "rect-se" | "circle-radius" | "segment-a" | "segment-b" | `polygon-${number}`;
type DragState = { selection: NonNullable<Selection>; mode: DragMode; origin: Point; before: CollisionLayout };

const CATEGORY_LABELS: Record<Category, string> = {
  rectangles: "Rectangle blockers",
  circles: "Circle blockers",
  polygons: "Polygon blockers",
  walkableSegments: "Walkable openings",
};

const CATEGORY_COLORS: Record<Category, string> = {
  rectangles: "#ff6a42",
  circles: "#ffcf4a",
  polygons: "#ff416c",
  walkableSegments: "#3ce9ef",
};
const SHAPE_CATEGORIES: Category[] = ["rectangles", "circles", "polygons", "walkableSegments"];

function cloneLayout(layout: CollisionLayout): CollisionLayout {
  return structuredClone(layout);
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function shapeCount(layout: CollisionLayout) {
  return SHAPE_CATEGORIES.reduce((sum, category) => sum + layout[category].length, 0);
}

function findShape(layout: CollisionLayout, selection: Selection) {
  if (!selection) return null;
  return layout[selection.category].find((shape) => shape.id === selection.id) ?? null;
}

function uniqueId(layout: CollisionLayout, base: string) {
  const ids = new Set(SHAPE_CATEGORIES.flatMap((category) => layout[category].map((shape) => shape.id)));
  let suffix = 1;
  let candidate = base;
  while (ids.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function moveShape(shape: RectangleShape | CircleShape | PolygonShape | SegmentShape, category: Category, dx: number, dy: number) {
  if (category === "rectangles") {
    const rectangle = shape as RectangleShape;
    rectangle.x = rounded(rectangle.x + dx);
    rectangle.y = rounded(rectangle.y + dy);
  } else if (category === "circles") {
    const circle = shape as CircleShape;
    circle.x = rounded(circle.x + dx);
    circle.y = rounded(circle.y + dy);
  } else if (category === "polygons") {
    const polygon = shape as PolygonShape;
    polygon.points = polygon.points.map(([x, y]) => [rounded(x + dx), rounded(y + dy)]);
  } else {
    const segment = shape as SegmentShape;
    segment.x1 = rounded(segment.x1 + dx);
    segment.y1 = rounded(segment.y1 + dy);
    segment.x2 = rounded(segment.x2 + dx);
    segment.y2 = rounded(segment.y2 + dy);
  }
}

function worldPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());
  return [transformed.x, transformed.y];
}

function downloadJson(layout: CollisionLayout) {
  const blob = new Blob([`${JSON.stringify(layout, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "orehavenCollisions.json";
  link.click();
  URL.revokeObjectURL(url);
}

export function CollisionEditor() {
  const [layout, setLayout] = useState<CollisionLayout>(() => cloneLayout(initialCollisionLayout as unknown as CollisionLayout));
  const [selection, setSelection] = useState<Selection>(null);
  const [category, setCategory] = useState<Category>("polygons");
  const [zoom, setZoom] = useState(0.55);
  const [mapOpacity, setMapOpacity] = useState(1);
  const [collisionOpacity, setCollisionOpacity] = useState(0.48);
  const [showLabels, setShowLabels] = useState(true);
  const [mapArea, setMapArea] = useState<MapArea>("surface");
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("Local editor ready");
  const [historyVersion, setHistoryVersion] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const savedLayoutRef = useRef<CollisionLayout>(cloneLayout(initialCollisionLayout as unknown as CollisionLayout));
  const undoRef = useRef<CollisionLayout[]>([]);
  const redoRef = useRef<CollisionLayout[]>([]);

  const selectedShape = findShape(layout, selection);
  const filteredShapes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return layout[category].filter((shape) => !query || shape.id.toLowerCase().includes(query));
  }, [category, layout, search]);

  useEffect(() => {
    setDirty(JSON.stringify(layout) !== JSON.stringify(savedLayoutRef.current));
  }, [layout]);

  const pushHistory = (before: CollisionLayout) => {
    undoRef.current.push(before);
    if (undoRef.current.length > 80) undoRef.current.shift();
    redoRef.current = [];
    setDirty(true);
    setHistoryVersion((value) => value + 1);
  };

  const commit = (updater: (next: CollisionLayout) => void) => {
    const before = cloneLayout(layout);
    const next = cloneLayout(layout);
    updater(next);
    pushHistory(before);
    setLayout(next);
  };

  const undo = () => {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current.push(cloneLayout(layout));
    setLayout(previous);
    setSelection(null);
    setDirty(true);
    setHistoryVersion((value) => value + 1);
  };

  const redo = () => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(cloneLayout(layout));
    setLayout(next);
    setSelection(null);
    setDirty(true);
    setHistoryVersion((value) => value + 1);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selection && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const mapCenter = (): Point => {
    const viewport = viewportRef.current;
    if (!viewport) return [WORLD_WIDTH / 2, WORLD_HEIGHT / 2];
    return [
      (viewport.scrollLeft + viewport.clientWidth / 2) / zoom,
      MAP_AREAS[mapArea].y + (viewport.scrollTop + viewport.clientHeight / 2) / zoom,
    ];
  };

  const addShape = (newCategory: Category) => {
    const [x, y] = mapCenter();
    let id = "blocker";
    commit((next) => {
      if (newCategory === "rectangles") {
        id = uniqueId(next, "new-rectangle");
        next.rectangles.push({ id, x: rounded(x - 32), y: rounded(y - 22), width: 64, height: 44 });
      } else if (newCategory === "circles") {
        id = uniqueId(next, "new-circle");
        next.circles.push({ id, x: rounded(x), y: rounded(y), radius: 32 });
      } else if (newCategory === "polygons") {
        id = uniqueId(next, "new-polygon");
        next.polygons.push({ id, points: [[rounded(x - 38), rounded(y - 30)], [rounded(x + 38), rounded(y - 30)], [rounded(x + 38), rounded(y + 30)], [rounded(x - 38), rounded(y + 30)]] });
      } else {
        id = uniqueId(next, "new-opening");
        next.walkableSegments.push({ id, x1: rounded(x - 35), y1: rounded(y), x2: rounded(x + 35), y2: rounded(y), radius: 20 });
      }
    });
    setCategory(newCategory);
    setSelection({ category: newCategory, id });
  };

  const deleteSelected = () => {
    if (!selection) return;
    commit((next) => {
      next[selection.category] = next[selection.category].filter((shape) => shape.id !== selection.id) as never;
    });
    setSelection(null);
  };

  const duplicateSelected = () => {
    if (!selection || !selectedShape) return;
    let id = "copy";
    commit((next) => {
      id = uniqueId(next, `${selection.id}-copy`);
      const copy = structuredClone(selectedShape) as typeof selectedShape;
      copy.id = id;
      moveShape(copy, selection.category, 18, 18);
      (next[selection.category] as Array<typeof copy>).push(copy);
    });
    setSelection({ category: selection.category, id });
  };

  const updateSelected = (field: string, value: number | string) => {
    if (!selection) return;
    commit((next) => {
      const shape = findShape(next, selection);
      if (!shape) return;
      if (field === "id") {
        const requested = String(value).trim();
        if (!requested || requested === shape.id) return;
        shape.id = uniqueId(next, requested);
        setSelection({ category: selection.category, id: shape.id });
      } else {
        (shape as unknown as Record<string, number>)[field] = Number(value);
      }
    });
  };

  const updatePolygonPoint = (index: number, axis: 0 | 1, value: number) => {
    if (!selection || selection.category !== "polygons") return;
    commit((next) => {
      const polygon = findShape(next, selection) as PolygonShape | null;
      if (polygon) polygon.points[index][axis] = value;
    });
  };

  const addPolygonPoint = () => {
    if (!selection || selection.category !== "polygons") return;
    commit((next) => {
      const polygon = findShape(next, selection) as PolygonShape | null;
      if (!polygon) return;
      const [lastX, lastY] = polygon.points.at(-1)!;
      polygon.points.push([lastX + 24, lastY + 24]);
    });
  };

  const deletePolygonPoint = (index: number) => {
    if (!selection || selection.category !== "polygons") return;
    commit((next) => {
      const polygon = findShape(next, selection) as PolygonShape | null;
      if (polygon && polygon.points.length > 3) polygon.points.splice(index, 1);
    });
  };

  const beginDrag = (event: React.PointerEvent<SVGElement>, nextSelection: NonNullable<Selection>, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection(nextSelection);
    setCategory(nextSelection.category);
    dragRef.current = { selection: nextSelection, mode, origin: worldPoint(svg, event.clientX, event.clientY), before: cloneLayout(layout) };
  };

  const dragShape = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg) return;
    const [x, y] = worldPoint(svg, event.clientX, event.clientY);
    const [originX, originY] = drag.origin;
    const next = cloneLayout(drag.before);
    const shape = findShape(next, drag.selection);
    if (!shape) return;
    if (drag.mode === "body") {
      moveShape(shape, drag.selection.category, x - originX, y - originY);
    } else if (drag.mode === "rect-nw") {
      const rectangle = shape as RectangleShape;
      const right = rectangle.x + rectangle.width;
      const bottom = rectangle.y + rectangle.height;
      rectangle.x = rounded(Math.min(x, right - 4));
      rectangle.y = rounded(Math.min(y, bottom - 4));
      rectangle.width = rounded(right - rectangle.x);
      rectangle.height = rounded(bottom - rectangle.y);
    } else if (drag.mode === "rect-se") {
      const rectangle = shape as RectangleShape;
      rectangle.width = rounded(Math.max(4, x - rectangle.x));
      rectangle.height = rounded(Math.max(4, y - rectangle.y));
    } else if (drag.mode === "circle-radius") {
      const circle = shape as CircleShape;
      circle.radius = rounded(Math.max(4, Math.hypot(x - circle.x, y - circle.y)));
    } else if (drag.mode === "segment-a") {
      const segment = shape as SegmentShape;
      segment.x1 = rounded(x);
      segment.y1 = rounded(y);
    } else if (drag.mode === "segment-b") {
      const segment = shape as SegmentShape;
      segment.x2 = rounded(x);
      segment.y2 = rounded(y);
    } else if (drag.mode.startsWith("polygon-")) {
      const polygon = shape as PolygonShape;
      const index = Number(drag.mode.slice("polygon-".length));
      polygon.points[index] = [rounded(x), rounded(y)];
    }
    setLayout(next);
    setDirty(true);
  };

  const endDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    pushHistory(drag.before);
  };

  const saveToProject = async () => {
    setStatus("Saving both collision files...");
    try {
      const response = await fetch(SAVE_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(layout),
      });
      const result = await response.json() as { ok?: boolean; error?: string; shapes?: number };
      if (!response.ok || !result.ok) throw new Error(result.error || "Save failed.");
      savedLayoutRef.current = cloneLayout(layout);
      setDirty(false);
      setStatus(`Saved ${result.shapes} shapes to client + server`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed. Run this page through npm run dev.");
    }
  };

  const copyJson = async () => {
    await navigator.clipboard.writeText(`${JSON.stringify(layout, null, 2)}\n`);
    setStatus("Collision JSON copied");
  };

  const renderHandles = () => {
    if (!selection || !selectedShape) return null;
    const handle = (x: number, y: number, mode: DragMode, key: string) => (
      <circle key={key} className="collision-handle" cx={x} cy={y} r={8 / zoom} onPointerDown={(event) => beginDrag(event, selection, mode)} />
    );
    if (selection.category === "rectangles") {
      const shape = selectedShape as RectangleShape;
      return <>{handle(shape.x, shape.y, "rect-nw", "nw")}{handle(shape.x + shape.width, shape.y + shape.height, "rect-se", "se")}</>;
    }
    if (selection.category === "circles") {
      const shape = selectedShape as CircleShape;
      return handle(shape.x + shape.radius, shape.y, "circle-radius", "radius");
    }
    if (selection.category === "walkableSegments") {
      const shape = selectedShape as SegmentShape;
      return <>{handle(shape.x1, shape.y1, "segment-a", "a")}{handle(shape.x2, shape.y2, "segment-b", "b")}</>;
    }
    const shape = selectedShape as PolygonShape;
    return <>{shape.points.map(([x, y], index) => handle(x, y, `polygon-${index}`, String(index)))}</>;
  };

  const renderShape = (shape: RectangleShape | CircleShape | PolygonShape | SegmentShape, shapeCategory: Category) => {
    const shapeSelection = { category: shapeCategory, id: shape.id } as const;
    const active = selection?.category === shapeCategory && selection.id === shape.id;
    const className = `collision-shape ${active ? "is-selected" : ""}`;
    const color = CATEGORY_COLORS[shapeCategory];
    const common = { className, fill: color, stroke: color, style: { fillOpacity: collisionOpacity } };
    let body;
    let labelX = 0;
    let labelY = 0;
    if (shapeCategory === "rectangles") {
      const rectangle = shape as RectangleShape;
      labelX = rectangle.x + rectangle.width / 2;
      labelY = rectangle.y + rectangle.height / 2;
      body = <rect {...common} x={rectangle.x} y={rectangle.y} width={rectangle.width} height={rectangle.height} rx={2} onPointerDown={(event) => beginDrag(event, shapeSelection, "body")} />;
    } else if (shapeCategory === "circles") {
      const circle = shape as CircleShape;
      labelX = circle.x;
      labelY = circle.y;
      body = <circle {...common} cx={circle.x} cy={circle.y} r={circle.radius} onPointerDown={(event) => beginDrag(event, shapeSelection, "body")} />;
    } else if (shapeCategory === "polygons") {
      const polygon = shape as PolygonShape;
      labelX = polygon.points.reduce((sum, point) => sum + point[0], 0) / polygon.points.length;
      labelY = polygon.points.reduce((sum, point) => sum + point[1], 0) / polygon.points.length;
      body = <polygon {...common} points={polygon.points.map((point) => point.join(",")).join(" ")} onPointerDown={(event) => beginDrag(event, shapeSelection, "body")} />;
    } else {
      const segment = shape as SegmentShape;
      labelX = (segment.x1 + segment.x2) / 2;
      labelY = (segment.y1 + segment.y2) / 2;
      body = <line className={className} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} stroke={color} strokeWidth={segment.radius * 2} strokeOpacity={collisionOpacity} strokeLinecap="round" onPointerDown={(event) => beginDrag(event, shapeSelection, "body")} />;
    }
    return (
      <g key={`${shapeCategory}-${shape.id}`}>
        {body}
        {showLabels && <text className="collision-label" x={labelX} y={labelY} fontSize={12 / zoom}>{shape.id}</text>}
      </g>
    );
  };

  const numberField = (label: string, field: string, value: number, min?: number) => (
    <label className="editor-field">
      <span>{label}</span>
      <input type="number" min={min} step="1" value={value} onChange={(event) => updateSelected(field, Number(event.target.value))} />
    </label>
  );

  return (
    <main className="collision-editor-shell">
      <header className="editor-topbar">
        <div className="editor-brand">
          <span className="brand-gem" aria-hidden="true" />
          <div><strong>Collision Workshop</strong><small>Ore Acres local admin tool</small></div>
        </div>
        <div className="editor-actions">
          <span className={`save-state ${dirty ? "is-dirty" : ""}`}>{dirty ? "Unsaved edits" : "Files synchronized"}</span>
          <button type="button" onClick={undo} disabled={!undoRef.current.length}>Undo</button>
          <button type="button" onClick={redo} disabled={!redoRef.current.length}>Redo</button>
          <button type="button" onClick={copyJson}>Copy JSON</button>
          <button type="button" onClick={() => downloadJson(layout)}>Download</button>
          <button className="primary-action" type="button" onClick={saveToProject}>Save to game</button>
        </div>
      </header>

      <section className="editor-layout">
        <aside className="shape-browser">
          <div className="panel-heading"><span>Collision layers</span><b>{shapeCount(layout)}</b></div>
          <div className="category-list">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((key) => (
              <button key={key} type="button" className={category === key ? "is-active" : ""} onClick={() => setCategory(key)}>
                <i style={{ background: CATEGORY_COLORS[key] }} />
                <span>{CATEGORY_LABELS[key]}</span>
                <b>{layout[key].length}</b>
              </button>
            ))}
          </div>
          <label className="shape-search"><span>Find shape</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Road, house, gate..." /></label>
          <button className="add-shape" type="button" onClick={() => addShape(category)}>+ Add {category === "walkableSegments" ? "opening" : category.slice(0, -1)}</button>
          <div className="shape-list">
            {filteredShapes.map((shape) => (
              <button key={shape.id} type="button" className={selection?.category === category && selection.id === shape.id ? "is-active" : ""} onClick={() => setSelection({ category, id: shape.id })}>
                <span>{shape.id}</span><i>›</i>
              </button>
            ))}
          </div>
          <div className="editor-tip"><strong>Cyan paths are openings.</strong> Use them to carve walkable doors and roads through a larger blocker.</div>
        </aside>

        <section className="map-workspace">
          <div className="map-toolbar">
            <div className="map-area-switcher" role="group" aria-label="Map area">
              {(Object.keys(MAP_AREAS) as MapArea[]).map((area) => (
                <button key={area} type="button" className={mapArea === area ? "active" : ""} onClick={() => setMapArea(area)}>{MAP_AREAS[area].label}</button>
              ))}
            </div>
            <div className="zoom-control"><button type="button" onClick={() => setZoom((value) => Math.max(0.25, rounded(value - 0.1)))}>-</button><b>{Math.round(zoom * 100)}%</b><button type="button" onClick={() => setZoom((value) => Math.min(1.5, rounded(value + 0.1)))}>+</button></div>
            <label>Map <input type="range" min="0.15" max="1" step="0.05" value={mapOpacity} onChange={(event) => setMapOpacity(Number(event.target.value))} /></label>
            <label>Shapes <input type="range" min="0.15" max="0.9" step="0.05" value={collisionOpacity} onChange={(event) => setCollisionOpacity(Number(event.target.value))} /></label>
            <label className="toggle"><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /><span /> Labels</label>
            <span className="world-size">1536 × {MAP_AREAS[mapArea].height} view • global Y {MAP_AREAS[mapArea].y}–{MAP_AREAS[mapArea].y + MAP_AREAS[mapArea].height}</span>
          </div>
          <div className="map-viewport" ref={viewportRef}>
            <div className="map-stage" style={{ width: WORLD_WIDTH * zoom, height: MAP_AREAS[mapArea].height * zoom }}>
              <svg ref={svgRef} viewBox={`0 ${MAP_AREAS[mapArea].y} ${WORLD_WIDTH} ${MAP_AREAS[mapArea].height}`} width={WORLD_WIDTH * zoom} height={MAP_AREAS[mapArea].height * zoom} onPointerMove={dragShape} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerDown={() => setSelection(null)}>
                <image href={`/assets/rpg/world/orehaven-overworld.png?v=${MAP_REVISION}`} x="0" y="0" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/briarwild-south.png?v=${MAP_REVISION}`} x="0" y="1024" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/sunstone-catacombs.png?v=${MAP_REVISION}`} x="0" y="2048" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/moonfen-marsh.png?v=${MAP_REVISION}`} x="0" y="3072" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/emberfall-highlands.png?v=${MAP_REVISION}`} x="0" y="4096" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/frostmere-coast.png?v=${MAP_REVISION}`} x="0" y="5120" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/sunscar-expanse.png?v=${MAP_REVISION}`} x="0" y="6144" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/orehaven-guildhall.png?v=${MAP_REVISION}`} x="0" y="7168" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/icefang-vault.png?v=${MAP_REVISION}`} x="0" y="8192" width={WORLD_WIDTH} height="1024" opacity={mapOpacity} />
                <line className="map-seam-guide" x1="0" y1="1024" x2={WORLD_WIDTH} y2="1024" />
                <line className="map-seam-guide" x1="0" y1="2048" x2={WORLD_WIDTH} y2="2048" />
                <line className="map-seam-guide" x1="0" y1="3072" x2={WORLD_WIDTH} y2="3072" />
                <line className="map-seam-guide" x1="0" y1="4096" x2={WORLD_WIDTH} y2="4096" />
                <line className="map-seam-guide" x1="0" y1="5120" x2={WORLD_WIDTH} y2="5120" />
                <line className="map-seam-guide" x1="0" y1="6144" x2={WORLD_WIDTH} y2="6144" />
                <line className="map-seam-guide" x1="0" y1="7168" x2={WORLD_WIDTH} y2="7168" />
                <line className="map-seam-guide" x1="0" y1="8192" x2={WORLD_WIDTH} y2="8192" />
                {(Object.keys(CATEGORY_LABELS) as Category[]).flatMap((key) => layout[key].map((shape) => renderShape(shape, key)))}
                {renderHandles()}
              </svg>
            </div>
          </div>
          <footer className="editor-status"><span className="status-dot" />{status}<small>Drag shapes or handles directly. Ctrl+Z undoes.</small></footer>
        </section>

        <aside className="shape-inspector">
          <div className="panel-heading"><span>Inspector</span>{selection && <em style={{ color: CATEGORY_COLORS[selection.category] }}>{CATEGORY_LABELS[selection.category]}</em>}</div>
          {!selection || !selectedShape ? (
            <div className="empty-inspector"><span>⌖</span><strong>Select a collision shape</strong><p>Click a colored area on the map or choose one from the layer list.</p></div>
          ) : (
            <div className="inspector-form">
              <label className="editor-field full"><span>Shape ID</span><input value={selectedShape.id} onChange={(event) => updateSelected("id", event.target.value)} /></label>
              {selection.category === "rectangles" && <div className="field-grid">{numberField("X", "x", (selectedShape as RectangleShape).x)}{numberField("Y", "y", (selectedShape as RectangleShape).y)}{numberField("Width", "width", (selectedShape as RectangleShape).width, 4)}{numberField("Height", "height", (selectedShape as RectangleShape).height, 4)}</div>}
              {selection.category === "circles" && <div className="field-grid">{numberField("Center X", "x", (selectedShape as CircleShape).x)}{numberField("Center Y", "y", (selectedShape as CircleShape).y)}{numberField("Radius", "radius", (selectedShape as CircleShape).radius, 4)}</div>}
              {selection.category === "walkableSegments" && <div className="field-grid">{numberField("Start X", "x1", (selectedShape as SegmentShape).x1)}{numberField("Start Y", "y1", (selectedShape as SegmentShape).y1)}{numberField("End X", "x2", (selectedShape as SegmentShape).x2)}{numberField("End Y", "y2", (selectedShape as SegmentShape).y2)}{numberField("Opening radius", "radius", (selectedShape as SegmentShape).radius, 4)}</div>}
              {selection.category === "polygons" && (
                <div className="point-editor">
                  <div className="subheading"><span>Polygon vertices</span><button type="button" onClick={addPolygonPoint}>+ Point</button></div>
                  {(selectedShape as PolygonShape).points.map(([x, y], index) => (
                    <div className="point-row" key={index}><b>{index + 1}</b><input aria-label={`Point ${index + 1} X`} type="number" value={x} onChange={(event) => updatePolygonPoint(index, 0, Number(event.target.value))} /><input aria-label={`Point ${index + 1} Y`} type="number" value={y} onChange={(event) => updatePolygonPoint(index, 1, Number(event.target.value))} /><button type="button" disabled={(selectedShape as PolygonShape).points.length <= 3} onClick={() => deletePolygonPoint(index)}>×</button></div>
                  ))}
                </div>
              )}
              <div className="inspector-actions"><button type="button" onClick={duplicateSelected}>Duplicate</button><button className="danger-action" type="button" onClick={deleteSelected}>Delete shape</button></div>
              <div className="precision-note"><strong>Collision tip</strong><p>Keep blockers tight around the solid base of an object, not its roof, shadow, or decorative overhang.</p></div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
