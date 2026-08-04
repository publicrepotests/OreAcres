import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";

const COLLISION_SAVE_PATH = "/__oreacres_admin/collisions";
const WORLD_LAYOUT_SAVE_PATH = "/__oreacres_admin/world-layout";

function validNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateCollisionLayout(value: unknown) {
  if (!value || typeof value !== "object") return "Collision data must be an object.";
  const layout = value as Record<string, unknown>;
  const categories = ["walkableSegments", "rectangles", "circles", "polygons"] as const;
  if (categories.some((category) => !Array.isArray(layout[category]))) return "Every collision category must be an array.";
  const ids = new Set<string>();
  for (const category of categories) {
    for (const rawShape of layout[category] as Array<Record<string, unknown>>) {
      if (!rawShape || typeof rawShape !== "object" || typeof rawShape.id !== "string" || !rawShape.id.trim()) {
        return `${category} contains a shape without an id.`;
      }
      if (ids.has(rawShape.id)) return `Duplicate collision id: ${rawShape.id}`;
      ids.add(rawShape.id);
      if (category === "rectangles" && ![rawShape.x, rawShape.y, rawShape.width, rawShape.height].every(validNumber)) {
        return `${rawShape.id} has invalid rectangle coordinates.`;
      }
      if (category === "circles" && ![rawShape.x, rawShape.y, rawShape.radius].every(validNumber)) {
        return `${rawShape.id} has invalid circle coordinates.`;
      }
      if (category === "walkableSegments" && ![rawShape.x1, rawShape.y1, rawShape.x2, rawShape.y2, rawShape.radius].every(validNumber)) {
        return `${rawShape.id} has invalid segment coordinates.`;
      }
      if (category === "polygons") {
        const points = rawShape.points;
        if (!Array.isArray(points) || points.length < 3 || points.some((point) => !Array.isArray(point) || point.length !== 2 || !point.every(validNumber))) {
          return `${rawShape.id} needs at least three valid polygon points.`;
        }
      }
    }
  }
  return null;
}

function validateWorldLayout(value: unknown) {
  if (!value || typeof value !== "object") return "World data must be an object.";
  const layout = value as Record<string, unknown>;
  const categories = ["npcs", "enemies", "resources", "decorations"] as const;
  if (categories.some((category) => !Array.isArray(layout[category]))) return "Every world category must be an array.";
  for (const category of categories) {
    const ids = new Set<string>();
    for (const rawEntity of layout[category] as Array<Record<string, unknown>>) {
      if (!rawEntity || typeof rawEntity !== "object" || typeof rawEntity.id !== "string" || !rawEntity.id.trim()) return `${category} contains an entity without an id.`;
      if (ids.has(rawEntity.id)) return `Duplicate ${category} id: ${rawEntity.id}`;
      ids.add(rawEntity.id);
      if (typeof rawEntity.name !== "string" || !rawEntity.name.trim()) return `${rawEntity.id} needs a display name.`;
      if (![rawEntity.x, rawEntity.y].every(validNumber)) return `${rawEntity.id} has invalid coordinates.`;
      if ((rawEntity.x as number) < 0 || (rawEntity.x as number) > 1536 || (rawEntity.y as number) < 0 || (rawEntity.y as number) > 3072) return `${rawEntity.id} is outside the world bounds.`;
    }
  }
  return null;
}

function localCollisionEditor() {
  return {
    name: "ore-acres-local-collision-editor",
    apply: "serve" as const,
    configureServer(server: { middlewares: { use: (path: string, handler: (request: IncomingMessage, response: ServerResponse) => void) => void } }) {
      server.middlewares.use(COLLISION_SAVE_PATH, (request, response) => {
        const remoteAddress = request.socket.remoteAddress ?? "";
        if (!remoteAddress.includes("127.0.0.1") && remoteAddress !== "::1") {
          response.writeHead(403, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "Collision editing is restricted to localhost." }));
          return;
        }
        if (request.method !== "POST") {
          response.writeHead(405, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "POST required." }));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        request.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size <= 2_000_000) chunks.push(chunk);
        });
        request.on("end", async () => {
          if (size > 2_000_000) {
            response.writeHead(413, { "content-type": "application/json" });
            response.end(JSON.stringify({ error: "Collision payload is too large." }));
            return;
          }
          try {
            const layout = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            const validationError = validateCollisionLayout(layout);
            if (validationError) throw new Error(validationError);
            const formatted = `${JSON.stringify(layout, null, 2)}\n`;
            await Promise.all([
              writeFile(resolve(__dirname, "src/rpg/orehavenCollisions.json"), formatted, "utf8"),
              writeFile(resolve(__dirname, "server/src/orehavenCollisions.json"), formatted, "utf8"),
            ]);
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ ok: true, shapes: Object.values(layout).reduce((sum: number, entries) => sum + entries.length, 0) }));
          } catch (error) {
            response.writeHead(400, { "content-type": "application/json" });
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Could not save collisions." }));
          }
        });
      });
      server.middlewares.use(WORLD_LAYOUT_SAVE_PATH, (request, response) => {
        const remoteAddress = request.socket.remoteAddress ?? "";
        if (!remoteAddress.includes("127.0.0.1") && remoteAddress !== "::1") {
          response.writeHead(403, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "World editing is restricted to localhost." }));
          return;
        }
        if (request.method !== "POST") {
          response.writeHead(405, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "POST required." }));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        request.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size <= 4_000_000) chunks.push(chunk);
        });
        request.on("end", async () => {
          if (size > 4_000_000) {
            response.writeHead(413, { "content-type": "application/json" });
            response.end(JSON.stringify({ error: "World payload is too large." }));
            return;
          }
          try {
            const layout = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            const validationError = validateWorldLayout(layout);
            if (validationError) throw new Error(validationError);
            layout.version = Math.max(1, Math.floor(Number(layout.version) || 1));
            const formatted = `${JSON.stringify(layout, null, 2)}\n`;
            await Promise.all([
              writeFile(resolve(__dirname, "src/rpg/worldLayout.json"), formatted, "utf8"),
              writeFile(resolve(__dirname, "server/src/worldLayout.json"), formatted, "utf8"),
            ]);
            const entities = layout.npcs.length + layout.enemies.length + layout.resources.length + layout.decorations.length;
            let liveServerApplied = false;
            try {
              const liveResponse = await fetch("http://127.0.0.1:8080/api/admin/world-layout", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: formatted,
              });
              liveServerApplied = liveResponse.ok;
            } catch {
              // Saving remains useful while the realtime server is offline.
            }
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ ok: true, entities, liveServerApplied }));
          } catch (error) {
            response.writeHead(400, { "content-type": "application/json" });
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Could not save world data." }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localCollisionEditor()],
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        skinPreview: resolve(__dirname, "skin-preview.html"),
        collisionEditor: resolve(__dirname, "collision-editor.html"),
        worldEditor: resolve(__dirname, "world-editor.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
