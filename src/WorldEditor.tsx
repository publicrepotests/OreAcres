import { useEffect, useMemo, useRef, useState } from "react";
import {
  DECORATIONS,
  ENEMIES,
  NPCS,
  RESOURCES,
  type DecorationDefinition,
  type EnemyDefinition,
  type NpcDefinition,
  type ResourceDefinition,
} from "./rpg/gameData";
import { isWorldPositionWalkable } from "./rpg/worldCollision";

const WORLD_WIDTH = 1536;
const WORLD_HEIGHT = 9216;
const SAVE_ENDPOINT = "/__oreacres_admin/world-layout";
const MAP_REVISION = "icefang-vault-20260819";

type Category = "npcs" | "enemies" | "resources" | "decorations";
type MapArea = "surface" | "dungeon" | "marsh" | "highlands" | "frostmere" | "sunscar" | "guildhall" | "icefang" | "all";
type Entity = (NpcDefinition | EnemyDefinition | ResourceDefinition | DecorationDefinition) & { kind: string };
type Layout = {
  version: number;
  npcs: NpcDefinition[];
  enemies: EnemyDefinition[];
  resources: ResourceDefinition[];
  decorations: DecorationDefinition[];
};
type Selection = { category: Category; id: string } | null;

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
const CATEGORY_META: Record<Category, { label: string; badge: string; color: string }> = {
  npcs: { label: "NPCs", badge: "N", color: "#62d9ff" },
  enemies: { label: "Monsters", badge: "M", color: "#ff6f61" },
  resources: { label: "Resources", badge: "R", color: "#80dc78" },
  decorations: { label: "Props", badge: "P", color: "#ffc65c" },
};

function cloneLayout(layout: Layout): Layout {
  return structuredClone(layout);
}

function initialLayout(): Layout {
  return cloneLayout({ version: 1, npcs: NPCS, enemies: ENEMIES, resources: RESOURCES, decorations: DECORATIONS });
}

function categoryEntities(layout: Layout, category: Category): Entity[] {
  return layout[category] as Entity[];
}

function selectedEntity(layout: Layout, selection: Selection): Entity | null {
  if (!selection) return null;
  return categoryEntities(layout, selection.category).find((entity) => entity.id === selection.id) ?? null;
}

function uniqueId(layout: Layout, category: Category, base: string) {
  const ids = new Set(categoryEntities(layout, category).map((entity) => entity.id));
  let candidate = base;
  let suffix = 2;
  while (ids.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function createTemplate(layout: Layout, category: Category, x: number, y: number): Entity {
  if (category === "npcs") {
    return { id: uniqueId(layout, category, "new-npc"), name: "New NPC", role: "Townsperson", frame: 0, x, y, dialogue: ["Welcome to Orehaven."], kind: "npc" } as Entity;
  }
  if (category === "enemies") {
    return { id: uniqueId(layout, category, "new-monster"), name: "New Monster", kind: "goblin", frame: 4, level: 1, x, y, maxHp: 24, gold: [4, 8], attackXp: 18, aggroRange: 160, speed: 48 };
  }
  if (category === "resources") {
    return { id: uniqueId(layout, category, "new-tree"), name: "New Tree", kind: "tree", frame: 2, skill: "woodcutting", x, y, seconds: 6, gold: 7, xp: 30, scale: 0.22, requiredLevel: 1, itemId: "oak-log" };
  }
  return { id: uniqueId(layout, category, "new-campfire"), name: "Campfire", kind: "campfire", frame: 7, x, y, scale: 0.1, alpha: 0.85 };
}

function markerSize(entity: Entity, category: Category) {
  if (category === "resources") {
    const resource = entity as ResourceDefinition;
    if (resource.kind === "tree") return 25;
    if (resource.kind === "fish") return 13;
  }
  return category === "decorations" ? 14 : category === "npcs" ? 18 : 17;
}

function placementValid(category: Category, entity: Entity) {
  if (category === "decorations") return true;
  if (category === "enemies") return isWorldPositionWalkable(entity.x, entity.y);
  for (let distance = 20; distance <= 92; distance += 8) {
    for (let degrees = 0; degrees < 360; degrees += 30) {
      const radians = (degrees * Math.PI) / 180;
      if (isWorldPositionWalkable(entity.x + Math.cos(radians) * distance, entity.y + Math.sin(radians) * distance)) return true;
    }
  }
  return false;
}

function download(layout: Layout) {
  const blob = new Blob([`${JSON.stringify(layout, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "worldLayout.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function WorldEditor() {
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [category, setCategory] = useState<Category>("resources");
  const [selection, setSelection] = useState<Selection>(null);
  const [area, setArea] = useState<MapArea>("surface");
  const [zoom, setZoom] = useState(0.7);
  const [search, setSearch] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [mapOpacity, setMapOpacity] = useState(1);
  const [status, setStatus] = useState("World data loaded");
  const [dirty, setDirty] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ category: Category; id: string; before: Layout } | null>(null);
  const savedRef = useRef<Layout>(initialLayout());
  const undoRef = useRef<Layout[]>([]);
  const redoRef = useRef<Layout[]>([]);

  const selected = selectedEntity(layout, selection);
  const visibleEntities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categoryEntities(layout, category).filter((entity) => !query || `${entity.id} ${entity.name} ${entity.kind}`.toLowerCase().includes(query));
  }, [category, layout, search]);
  const invalidPlacements = useMemo(() => (Object.keys(CATEGORY_META) as Category[]).reduce((count, key) => count + categoryEntities(layout, key).filter((entity) => !placementValid(key, entity)).length, 0), [layout]);

  useEffect(() => setDirty(JSON.stringify(layout) !== JSON.stringify(savedRef.current)), [layout]);

  const pushHistory = (before: Layout) => {
    undoRef.current.push(before);
    if (undoRef.current.length > 80) undoRef.current.shift();
    redoRef.current = [];
  };

  const updateEntity = (field: string, value: unknown) => {
    if (!selection) return;
    const before = cloneLayout(layout);
    setLayout((current) => {
      const next = cloneLayout(current);
      const entity = categoryEntities(next, selection.category).find((entry) => entry.id === selection.id);
      if (entity) (entity as unknown as Record<string, unknown>)[field] = value;
      return next;
    });
    pushHistory(before);
    if (field === "id" && typeof value === "string") setSelection({ category: selection.category, id: value });
  };

  const addEntity = () => {
    const view = MAP_AREAS[area];
    const viewport = viewportRef.current;
    const x = viewport ? (viewport.scrollLeft + viewport.clientWidth / 2) / zoom : WORLD_WIDTH / 2;
    const y = view.y + (viewport ? (viewport.scrollTop + viewport.clientHeight / 2) / zoom : view.height / 2);
    const entity = createTemplate(layout, category, Math.round(x), Math.round(y));
    const before = cloneLayout(layout);
    setLayout((current) => {
      const next = cloneLayout(current);
      (next[category] as Entity[]).push(entity);
      return next;
    });
    pushHistory(before);
    setSelection({ category, id: entity.id });
  };

  const duplicateEntity = () => {
    if (!selection || !selected) return;
    const before = cloneLayout(layout);
    const copy = structuredClone(selected);
    copy.id = uniqueId(layout, selection.category, `${selected.id}-copy`);
    copy.name = `${selected.name} Copy`;
    copy.x = Math.min(WORLD_WIDTH, selected.x + 28);
    copy.y = Math.min(WORLD_HEIGHT, selected.y + 28);
    setLayout((current) => {
      const next = cloneLayout(current);
      (next[selection.category] as Entity[]).push(copy);
      return next;
    });
    pushHistory(before);
    setSelection({ category: selection.category, id: copy.id });
  };

  const deleteEntity = () => {
    if (!selection || !selected) return;
    if (!window.confirm(`Remove ${selected.name} from the world? Quest-linked entities may need quest updates.`)) return;
    const before = cloneLayout(layout);
    setLayout((current) => ({ ...cloneLayout(current), [selection.category]: categoryEntities(current, selection.category).filter((entity) => entity.id !== selection.id) } as Layout));
    pushHistory(before);
    setSelection(null);
  };

  const undo = () => {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current.push(cloneLayout(layout));
    setLayout(previous);
    setSelection(null);
  };

  const redo = () => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(cloneLayout(layout));
    setLayout(next);
    setSelection(null);
  };

  const pointerPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
  };

  const beginDrag = (event: React.PointerEvent<SVGGElement>, targetCategory: Category, id: string) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { category: targetCategory, id, before: cloneLayout(layout) };
    setSelection({ category: targetCategory, id });
    setCategory(targetCategory);
  };

  const drag = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragging = dragRef.current;
    if (!dragging) return;
    const point = pointerPoint(event);
    setLayout((current) => {
      const next = cloneLayout(current);
      const entity = categoryEntities(next, dragging.category).find((entry) => entry.id === dragging.id);
      if (entity) {
        entity.x = Math.max(0, Math.min(WORLD_WIDTH, point.x));
        entity.y = Math.max(0, Math.min(WORLD_HEIGHT, point.y));
      }
      return next;
    });
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    pushHistory(dragRef.current.before);
    dragRef.current = null;
  };

  const save = async () => {
    setStatus("Saving client and server world data...");
    try {
      const response = await fetch(SAVE_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(layout) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save world data.");
      savedRef.current = cloneLayout(layout);
      setDirty(false);
      setStatus(`Saved ${result.entities} entities. ${result.liveServerApplied ? "Running multiplayer world synchronized." : "Realtime server is offline; it will load these changes on restart."}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    }
  };

  const input = (label: string, field: string, value: string | number, type: "text" | "number" = "text", step?: number) => (
    <label className="world-field"><span>{label}</span><input type={type} step={step} value={value} onChange={(event) => updateEntity(field, type === "number" ? Number(event.target.value) : event.target.value)} /></label>
  );

  const select = (label: string, field: string, value: string, options: string[]) => (
    <label className="world-field"><span>{label}</span><select value={value} onChange={(event) => updateEntity(field, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
  );

  return (
    <main className="world-editor-shell">
      <header className="world-editor-header">
        <div className="world-editor-brand"><i /><div><strong>World Workshop</strong><small>Ore Acres placement editor</small></div></div>
        <nav><a href="/game?room=lobby">Game</a><a href="/collision-editor.html">Collisions</a></nav>
        <div className="world-editor-actions"><span className={dirty ? "dirty" : "saved"}>{dirty ? "Unsaved changes" : "Files synchronized"}</span><button type="button" disabled={!undoRef.current.length} onClick={undo}>Undo</button><button type="button" disabled={!redoRef.current.length} onClick={redo}>Redo</button><button type="button" onClick={() => download(layout)}>Download</button><button className="save" type="button" onClick={save}>Save to game</button></div>
      </header>

      <section className="world-editor-layout">
        <aside className="world-browser">
          <div className="world-panel-title"><span>World layers</span><b>{layout.npcs.length + layout.enemies.length + layout.resources.length + layout.decorations.length}</b></div>
          <div className="world-category-tabs">{(Object.keys(CATEGORY_META) as Category[]).map((key) => <button key={key} type="button" className={category === key ? "active" : ""} onClick={() => setCategory(key)}><i style={{ background: CATEGORY_META[key].color }} /><span>{CATEGORY_META[key].label}</span><b>{layout[key].length}</b></button>)}</div>
          <label className="world-search"><span>Find entity</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, id, or type..." /></label>
          <button className="world-add" type="button" onClick={addEntity}>+ Add {CATEGORY_META[category].label.slice(0, -1)}</button>
          <div className="world-entity-list">{visibleEntities.map((entity) => <button key={entity.id} type="button" className={selection?.category === category && selection.id === entity.id ? "active" : ""} onClick={() => setSelection({ category, id: entity.id })}><i style={{ color: CATEGORY_META[category].color }}>{CATEGORY_META[category].badge}</i><span><strong>{entity.name}</strong><small>{entity.id}</small></span><em>{Math.round(entity.x)}, {Math.round(entity.y)}</em></button>)}</div>
          <div className="world-editor-tip"><strong>Drag directly on the map.</strong><span>Save writes the same placement data to the client and multiplayer server.</span></div>
        </aside>

        <section className="world-map-workspace">
          <div className="world-map-toolbar">
            <div className="world-area-tabs">{(Object.keys(MAP_AREAS) as MapArea[]).map((key) => <button key={key} type="button" className={area === key ? "active" : ""} onClick={() => setArea(key)}>{MAP_AREAS[key].label}</button>)}</div>
            <div className="world-zoom"><button type="button" onClick={() => setZoom((value) => Math.max(0.25, value - 0.1))}>-</button><b>{Math.round(zoom * 100)}%</b><button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))}>+</button></div>
            <label>Map <input type="range" min="0.2" max="1" step="0.05" value={mapOpacity} onChange={(event) => setMapOpacity(Number(event.target.value))} /></label>
            <label className="world-toggle"><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /> Labels</label>
            <span>Global Y {MAP_AREAS[area].y}-{MAP_AREAS[area].y + MAP_AREAS[area].height}</span>
          </div>
          <div className="world-map-viewport" ref={viewportRef}>
            <div style={{ width: WORLD_WIDTH * zoom, height: MAP_AREAS[area].height * zoom }}>
              <svg ref={svgRef} viewBox={`0 ${MAP_AREAS[area].y} ${WORLD_WIDTH} ${MAP_AREAS[area].height}`} width={WORLD_WIDTH * zoom} height={MAP_AREAS[area].height * zoom} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerDown={() => setSelection(null)}>
                <image href={`/assets/rpg/world/orehaven-overworld.png?v=${MAP_REVISION}`} x="0" y="0" width="1536" height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/briarwild-south.png?v=${MAP_REVISION}`} x="0" y="1024" width="1536" height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/sunstone-catacombs.png?v=${MAP_REVISION}`} x="0" y="2048" width="1536" height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/moonfen-marsh.png?v=${MAP_REVISION}`} x="0" y="3072" width="1536" height="1024" opacity={mapOpacity} />
                <image href={`/assets/rpg/world/emberfall-highlands.png?v=${MAP_REVISION}`} x="0" y="4096" width="1536" height="1024" opacity={mapOpacity} />
            <image href={`/assets/rpg/world/frostmere-coast.png?v=${MAP_REVISION}`} x="0" y="5120" width="1536" height="1024" opacity={mapOpacity} />
            <image href={`/assets/rpg/world/sunscar-expanse.png?v=${MAP_REVISION}`} x="0" y="6144" width="1536" height="1024" opacity={mapOpacity} />
            <image href={`/assets/rpg/world/orehaven-guildhall.png?v=${MAP_REVISION}`} x="0" y="7168" width="1536" height="1024" opacity={mapOpacity} />
            <image href={`/assets/rpg/world/icefang-vault.png?v=${MAP_REVISION}`} x="0" y="8192" width="1536" height="1024" opacity={mapOpacity} />
                {(Object.keys(CATEGORY_META) as Category[]).flatMap((key) => categoryEntities(layout, key).map((entity) => {
                  const active = selection?.category === key && selection.id === entity.id;
                  const size = markerSize(entity, key);
                  const invalid = !placementValid(key, entity);
                  return <g key={`${key}-${entity.id}`} className={`world-marker ${active ? "active" : ""} ${invalid ? "invalid" : ""}`} transform={`translate(${entity.x} ${entity.y})`} onPointerDown={(event) => beginDrag(event, key, entity.id)}><circle r={size} fill={CATEGORY_META[key].color} /><circle className="world-marker-ring" r={size + 5} /><text y="4">{CATEGORY_META[key].badge}</text>{showLabels ? <text className="world-marker-label" y={-size - 9}>{entity.name}</text> : null}</g>;
                }))}
              </svg>
            </div>
          </div>
          <footer><i />{status}<small className={invalidPlacements ? "invalid-count" : ""}>{invalidPlacements ? `${invalidPlacements} placement${invalidPlacements === 1 ? "" : "s"} currently overlap collision` : "All interactive placements are on walkable ground"}</small></footer>
        </section>

        <aside className="world-inspector">
          <div className="world-panel-title"><span>Inspector</span>{selection ? <b style={{ color: CATEGORY_META[selection.category].color }}>{CATEGORY_META[selection.category].label}</b> : null}</div>
          {!selected || !selection ? <div className="world-empty"><b>+</b><strong>Select an entity</strong><p>Choose an item from the list or click its marker on the map.</p></div> : <div className="world-inspector-form">
            {input("Entity ID", "id", selected.id)}
            {input("Display name", "name", selected.name)}
            <div className="world-field-grid">{input("X", "x", selected.x, "number", 1)}{input("Y", "y", selected.y, "number", 1)}</div>
            {selection.category === "npcs" ? <>{input("Role", "role", (selected as NpcDefinition).role)}{input("Portrait frame", "frame", (selected as NpcDefinition).frame, "number", 1)}<label className="world-field"><span>Dialogue (one line per message)</span><textarea value={(selected as NpcDefinition).dialogue.join("\n")} onChange={(event) => updateEntity("dialogue", event.target.value.split("\n").filter(Boolean))} /></label>{select("Service", "service", (selected as NpcDefinition).service ?? "", ["", "bank", "workshop", "activities", "social"])}{select("Shop", "shop", (selected as NpcDefinition).shop ?? "", ["", "weapons", "tools"])}</> : null}
            {selection.category === "enemies" ? <>{select("Creature type", "kind", selected.kind, ["rat", "goblin", "wolf", "slime", "orc", "lizard", "skeleton", "witch"])}<div className="world-field-grid">{input("Level", "level", (selected as EnemyDefinition).level, "number", 1)}{input("Max HP", "maxHp", (selected as EnemyDefinition).maxHp, "number", 1)}{input("XP reward", "attackXp", (selected as EnemyDefinition).attackXp, "number", 1)}{input("Aggro range", "aggroRange", (selected as EnemyDefinition).aggroRange ?? 180, "number", 1)}{input("Move speed", "speed", (selected as EnemyDefinition).speed ?? 48, "number", 1)}{input("Respawn ms", "respawnMs", (selected as EnemyDefinition).respawnMs ?? 90000, "number", 1000)}</div>{select("Attack style", "attackStyle", (selected as EnemyDefinition).attackStyle ?? "melee", ["melee", "range", "magic"])}<label className="world-check"><input type="checkbox" checked={Boolean((selected as EnemyDefinition).rare)} onChange={(event) => updateEntity("rare", event.target.checked)} /> Rare spawn</label><label className="world-check"><input type="checkbox" checked={Boolean((selected as EnemyDefinition).passive)} onChange={(event) => updateEntity("passive", event.target.checked)} /> Passive</label></> : null}
            {selection.category === "resources" ? <>{select("Resource type", "kind", selected.kind, ["ore", "tree", "fish", "relic"])}{select("Skill", "skill", (selected as ResourceDefinition).skill, ["mining", "woodcutting", "fishing", "magic"])}<div className="world-field-grid">{input("Atlas frame", "frame", (selected as ResourceDefinition).frame, "number", 1)}{input("Scale", "scale", (selected as ResourceDefinition).scale, "number", 0.01)}{input("Seconds", "seconds", (selected as ResourceDefinition).seconds, "number", 1)}{input("XP", "xp", (selected as ResourceDefinition).xp, "number", 1)}{input("Gold", "gold", (selected as ResourceDefinition).gold, "number", 1)}{input("Required level", "requiredLevel", (selected as ResourceDefinition).requiredLevel, "number", 1)}</div>{input("Reward item ID", "itemId", (selected as ResourceDefinition).itemId)}</> : null}
            {selection.category === "decorations" ? <>{select("Prop type", "kind", selected.kind, ["campfire", "torch", "sign", "banner", "crate"])}<div className="world-field-grid">{input("Atlas frame", "frame", (selected as DecorationDefinition).frame, "number", 1)}{input("Scale", "scale", (selected as DecorationDefinition).scale, "number", 0.005)}{input("Opacity", "alpha", (selected as DecorationDefinition).alpha ?? 1, "number", 0.05)}</div></> : null}
            <div className="world-inspector-actions"><button type="button" onClick={duplicateEntity}>Duplicate</button><button className="danger" type="button" onClick={deleteEntity}>Delete</button></div>
            <div className="world-warning"><strong>Placement check</strong><p>Use the collision workshop after moving solid objects. Enemy and resource positions should remain on walkable ground.</p></div>
          </div>}
        </aside>
      </section>
    </main>
  );
}
