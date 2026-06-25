import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8080);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const STATE_FILE = process.env.STATE_FILE || path.join(process.cwd(), "ore-acres-state.json");
const PAYMENT_MINT_ADDRESS = process.env.PAYMENT_MINT_ADDRESS || "";
const PAYMENT_RESERVE_TOKEN_ACCOUNT =
  process.env.PAYMENT_RESERVE_TOKEN_ACCOUNT || process.env.PAYMENT_TREASURY_TOKEN_ACCOUNT || "";
const PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT =
  process.env.PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT || process.env.PAYMENT_BURN_TOKEN_ACCOUNT || "";
const PAYMENT_OPS_TOKEN_ACCOUNT = process.env.PAYMENT_OPS_TOKEN_ACCOUNT || "";
const PAYMENT_RESERVE_BPS = Number(process.env.PAYMENT_RESERVE_BPS || "8000");
const PAYMENT_REWARD_RESERVE_BPS = Number(process.env.PAYMENT_REWARD_RESERVE_BPS || "1000");
const PAYMENT_OPS_BPS = Number(process.env.PAYMENT_OPS_BPS || "1000");
const PAYMENT_TOKEN_PRICE_USD_OVERRIDE = Number(process.env.PAYMENT_TOKEN_PRICE_USD_OVERRIDE || "");
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";
const BIRDEYE_PRICE_URL = process.env.BIRDEYE_PRICE_URL || "https://public-api.birdeye.so/defi/price";

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

function corsHeaders() {
  return {
    "access-control-allow-origin": ALLOWED_ORIGIN,
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json",
    ...corsHeaders(),
  });
  res.end(JSON.stringify(body));
}

function paymentAllocations() {
  const entries = [
    PAYMENT_RESERVE_TOKEN_ACCOUNT
      ? { label: "reserve", tokenAccount: PAYMENT_RESERVE_TOKEN_ACCOUNT, bps: PAYMENT_RESERVE_BPS }
      : null,
    PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT
      ? {
          label: "reward_reserve",
          tokenAccount: PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT,
          bps: PAYMENT_REWARD_RESERVE_BPS,
        }
      : null,
    PAYMENT_OPS_TOKEN_ACCOUNT
      ? { label: "ops", tokenAccount: PAYMENT_OPS_TOKEN_ACCOUNT, bps: PAYMENT_OPS_BPS }
      : null,
  ].filter(Boolean);

  const totalBps = entries.reduce((sum, entry) => sum + entry.bps, 0);
  if (entries.length === 0 || totalBps <= 0) {
    return null;
  }

  const normalized = entries.map((entry) => ({
    ...entry,
    bps: Math.floor((entry.bps / totalBps) * 10_000),
  }));

  const normalizedTotal = normalized.reduce((sum, entry) => sum + entry.bps, 0);
  const remainder = 10_000 - normalizedTotal;
  if (remainder > 0) {
    normalized[0].bps += remainder;
  }

  return normalized;
}

async function resolveTokenPriceUsd() {
  if (Number.isFinite(PAYMENT_TOKEN_PRICE_USD_OVERRIDE) && PAYMENT_TOKEN_PRICE_USD_OVERRIDE > 0) {
    return PAYMENT_TOKEN_PRICE_USD_OVERRIDE;
  }

  if (!PAYMENT_MINT_ADDRESS || !BIRDEYE_API_KEY) {
    return null;
  }

  const url = new URL(BIRDEYE_PRICE_URL);
  url.searchParams.set("address", PAYMENT_MINT_ADDRESS);
  url.searchParams.set("ui_amount_mode", "scaled");

  const response = await fetch(url, {
    headers: {
      "x-chain": "solana",
      "x-api-key": BIRDEYE_API_KEY,
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  const price =
    Number(
      payload?.data?.value ??
        payload?.data?.price ??
        payload?.data?.priceUsd ??
        payload?.data?.price_usd ??
        payload?.price ??
        payload?.value,
    );

  return Number.isFinite(price) && price > 0 ? price : null;
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

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.url && req.url.startsWith("/api/payment-quote")) {
    (async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const usd = Number(url.searchParams.get("usd"));

        if (!Number.isFinite(usd) || usd <= 0) {
          sendJson(res, 400, { error: "Missing or invalid usd amount." });
          return;
        }

        if (!PAYMENT_MINT_ADDRESS) {
          sendJson(res, 503, {
            error: "Payment configuration is missing.",
            needs: ["PAYMENT_MINT_ADDRESS"],
          });
          return;
        }

        const tokenPriceUsd = await resolveTokenPriceUsd();
        if (!tokenPriceUsd) {
          sendJson(res, 503, {
            error: "Token price is unavailable.",
            needs: PAYMENT_TOKEN_PRICE_USD_OVERRIDE > 0 ? [] : ["BIRDEYE_API_KEY or PAYMENT_TOKEN_PRICE_USD_OVERRIDE"],
          });
          return;
        }

        const allocations = paymentAllocations();
        if (!allocations) {
          sendJson(res, 503, {
            error: "Payment split configuration is missing.",
            needs: [
              "PAYMENT_RESERVE_TOKEN_ACCOUNT",
              "PAYMENT_REWARD_RESERVE_TOKEN_ACCOUNT",
              "PAYMENT_OPS_TOKEN_ACCOUNT",
            ],
          });
          return;
        }

        const tokenAmountUi = usd / tokenPriceUsd;

        sendJson(res, 200, {
          mintAddress: PAYMENT_MINT_ADDRESS,
          treasuryTokenAccount: PAYMENT_RESERVE_TOKEN_ACCOUNT,
          usdAmount: usd,
          tokenPriceUsd,
          tokenAmountUi,
          allocations,
        });
      } catch (error) {
        sendJson(res, 500, {
          error: "Failed to build payment quote.",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return;
  }

  if (req.url === "/healthz") {
    sendJson(res, 200, { ok: true, rooms: rooms.size });
    return;
  }

  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain", ...corsHeaders() });
    res.end("Ore Acres realtime server");
    return;
  }

  sendJson(res, 404, { error: "Not found" });
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
