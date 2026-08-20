import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const wrangler = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
assert.equal(wrangler.assets?.directory, "./dist", "Cloudflare does not publish the Vite output directory.");
assert.equal(wrangler.assets?.not_found_handling, "single-page-application", "Direct SPA routes such as /game will not preserve their URL.");
await assert.rejects(access(new URL("../public/_redirects", import.meta.url)), "Legacy redirect rules can override Cloudflare SPA routing.");
const index = await readFile(new URL("index.html", dist), "utf8");
const mainPath = index.match(/<script type="module" crossorigin src="\/(assets\/main-[^"]+\.js)"/)?.[1];
assert.ok(mainPath, "The production entry chunk is missing.");

for (const deferredAsset of ["PhaserRpgGame", "phaser-engine", "index.browser.esm"]) {
  assert.doesNotMatch(index, new RegExp(`rel="modulepreload"[^>]+${deferredAsset}`), `${deferredAsset} is being preloaded before the player enters the game.`);
}

const main = await readFile(new URL(mainPath, dist), "utf8");
const gamePath = main.match(/assets\/(PhaserRpgGame-[A-Za-z0-9_-]+\.js)/)?.[1];
const enginePath = main.match(/assets\/(phaser-engine-[A-Za-z0-9_-]+\.js)/)?.[1];
assert.ok(gamePath, "The RPG route is not a separate lazy chunk.");
assert.ok(enginePath, "Phaser is not isolated from frequently changing game code.");

const gameBytes = (await stat(new URL(`assets/${gamePath}`, dist))).size;
const engineBytes = (await stat(new URL(`assets/${enginePath}`, dist))).size;
assert.ok(gameBytes < 500_000, `The RPG route regressed to ${(gameBytes / 1_000_000).toFixed(2)} MB.`);
assert.ok(engineBytes > 1_000_000, "The Phaser engine boundary was unexpectedly folded into another chunk.");

console.log(JSON.stringify({
  homepagePreloadsGame: false,
  homepagePreloadsWallet: false,
  rpgChunkKb: Math.round(gameBytes / 1024),
  phaserCachedSeparately: true,
  directGameRoutePreserved: true,
  result: "PASS",
}, null, 2));
