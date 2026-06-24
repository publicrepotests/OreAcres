import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8080);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: new Map(),
    });
  }

  return rooms.get(roomId);
}

function serializeRoom(roomId) {
  const room = getRoom(roomId);
  return {
    roomId,
    players: [...room.players.values()].map(({ socket, ...player }) => player),
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
    ws.roomId = url.searchParams.get("room") || "lobby";
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

    if (room.players.size === 0) {
      rooms.delete(roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Ore Acres realtime server running on :${PORT}`);
});
