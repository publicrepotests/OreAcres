import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8080);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const STATE_FILE = process.env.STATE_FILE || path.join(process.cwd(), "ore-acres-state.json");

const rooms = new Map();
let saveTimer = null;

function sanitizeRoomId(roomId) {
  return String(roomId || "lobby").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "lobby";
}

function getRoom(roomId) {
  const key = sanitizeRoomId(roomId);
  if (!rooms.has(key)) {
    rooms.set(key, {
      players: new Map(),
      plots: {},
      lastUpdatedAt: Date.now(),
    });
  }

  return rooms.get(key);
}

function serializeRoom(roomId) {
  const room = getRoom(roomId);
  return {
    roomId,
    players: [...room.players.values()].map(({ socket, ...player }) => player),
    plots: room.plots,
  };
}

function send(ws, type, payload = {}) {
  if (ws.readyState !== 1) {
    return;
  }

  ws.send(JSON.stringify({ type, ...payload }));
}

function broadcast(roomId, message, exceptId = null) {
  const room = getRoom(roomId);

  for (const [playerId, player] of room.players.entries()) {
    if (exceptId && playerId === exceptId) {
      continue;
    }

    send(player.socket, message.type, message);
  }
}

function normalizePlotState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw;
  if (typeof candidate.id !== "string") return null;

  const structures = {};
  for (const [key, value] of Object.entries(candidate.structures ?? {})) {
    if (!value || typeof value !== "object" || typeof value.type !== "string") continue;
    structures[key] = {
      type: value.type,
      level: Number.isFinite(value.level) ? Math.max(1, Math.floor(value.level)) : 1,
      opened: typeof value.opened === "boolean" ? value.opened : undefined,
      reward: typeof value.reward === "string" ? value.reward : undefined,
    };
  }

  return {
    id: candidate.id,
    name: typeof candidate.name === "string" ? candidate.name : candidate.id,
    ownerLabel:
      candidate.ownerLabel === null || typeof candidate.ownerLabel === "string"
        ? candidate.ownerLabel
        : null,
    structures,
    chest:
      candidate.chest && typeof candidate.chest === "object" && typeof candidate.chest.id === "string"
        ? { id: candidate.chest.id }
        : null,
    totalCollectedSol: Number.isFinite(candidate.totalCollectedSol)
      ? Math.max(0, Number(candidate.totalCollectedSol))
      : 0,
  };
}

async function persistRooms() {
  const data = {
    rooms: Object.fromEntries(
      [...rooms.entries()].map(([roomId, room]) => [
        roomId,
        {
          plots: room.plots,
          lastUpdatedAt: room.lastUpdatedAt,
        },
      ]),
    ),
  };

  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Best-effort persistence only.
  }
}

function schedulePersist() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistRooms();
  }, 250);
}

try {
  const raw = await fs.readFile(STATE_FILE, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === "object" && parsed.rooms && typeof parsed.rooms === "object") {
    for (const [roomId, value] of Object.entries(parsed.rooms)) {
      const roomPlots = {};
      const plots = value && typeof value === "object" ? value.plots : null;
      if (plots && typeof plots === "object") {
        for (const [plotId, plot] of Object.entries(plots)) {
          const normalized = normalizePlotState(plot);
          if (normalized) {
            roomPlots[plotId] = normalized;
          }
        }
      }

      rooms.set(sanitizeRoomId(roomId), {
        players: new Map(),
        plots: roomPlots,
        lastUpdatedAt: value && typeof value === "object" && Number.isFinite(value.lastUpdatedAt)
          ? value.lastUpdatedAt
          : Date.now(),
      });
    }
  }
} catch {
  // No prior state file yet.
}

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    });
    res.end(
      JSON.stringify({
        ok: true,
        rooms: rooms.size,
      }),
    );
    return;
  }

  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("Ore Acres realtime server");
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const origin = request.headers.origin || "*";
  if (ALLOWED_ORIGIN !== "*" && origin !== ALLOWED_ORIGIN) {
    socket.destroy();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.roomId = sanitizeRoomId(url.searchParams.get("room") || "lobby");
    ws.playerName = url.searchParams.get("name") || "Miner";
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws) => {
  const roomId = ws.roomId || "lobby";
  const room = getRoom(roomId);
  const playerId = randomUUID();
  const player = {
    id: playerId,
    name: ws.playerName || `Miner-${playerId.slice(0, 4)}`,
    x: 0,
    y: 0,
    lastSeenAt: Date.now(),
    socket: ws,
  };

  room.players.set(playerId, player);

  send(ws, "welcome", {
    playerId,
    snapshot: serializeRoom(roomId),
  });

  broadcast(
    roomId,
    {
      type: "player_joined",
      player: {
        id: player.id,
        name: player.name,
        x: player.x,
        y: player.y,
      },
    },
    playerId,
  );

  ws.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString("utf8"));
    } catch {
      return;
    }

    if (message.type === "move") {
      player.x = Number(message.x || 0);
      player.y = Number(message.y || 0);
      player.lastSeenAt = Date.now();

      broadcast(
        roomId,
        {
          type: "player_moved",
          player: {
            id: player.id,
            x: player.x,
            y: player.y,
          },
        },
        playerId,
      );
      return;
    }

    if (message.type === "rename" && typeof message.name === "string") {
      player.name = message.name.slice(0, 24);
      player.lastSeenAt = Date.now();

      broadcast(
        roomId,
        {
          type: "player_renamed",
          player: {
            id: player.id,
            name: player.name,
          },
        },
        playerId,
      );
      return;
    }

    if (message.type === "plot_state") {
      const plot = normalizePlotState(message.plot);
      if (!plot) {
        return;
      }

      room.plots[plot.id] = plot;
      room.lastUpdatedAt = Date.now();
      schedulePersist();

      broadcast(
        roomId,
        {
          type: "plot_state",
          plot,
          sourcePlayerId: player.id,
        },
        playerId,
      );
      return;
    }

    if (message.type === "ping") {
      send(ws, "pong", { at: Date.now() });
    }
  });

    ws.on("close", () => {
      room.players.delete(playerId);

    broadcast(roomId, {
      type: "player_left",
      playerId,
    });

    if (room.players.size === 0 && Object.keys(room.plots).length === 0) {
      rooms.delete(roomId);
      schedulePersist();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Ore Acres realtime server running on :${PORT}`);
});
