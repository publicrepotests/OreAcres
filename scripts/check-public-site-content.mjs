import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const publicSite = app.slice(app.indexOf('<header className="site-nav">'), app.indexOf('{page === "game" ? (', app.indexOf('<header className="site-nav">')));

assert.match(publicSite, /Shared-world pixel MMORPG/, "Homepage no longer identifies the current game genre.");
assert.match(publicSite, /ADVENTURE_PATHS\.map/, "Homepage lacks the interactive combat-path explorer.");
assert.match(publicSite, /A persistent pixel MMORPG built around player choice/, "Whitepaper does not explain the current MMO direction.");
assert.match(publicSite, /Gold, mint, and SOL do different jobs/, "Economy page does not distinguish currency roles.");
assert.match(publicSite, /Playing is not a profit guarantee/, "Economy page is missing its reward-risk disclosure.");
assert.match(publicSite, /reserved for verified token features/, "Homepage does not clearly limit the current wallet promise.");
assert.doesNotMatch(publicSite, /test MINT|Idle SOL|Starter plot|Builder plot|Late-game plot|\bplots?\b|homestead/i, "Retired plot or idle-miner copy is still public.");
assert.match(app, /import\.meta\.env\.DEV[\s\S]*?legacy/, "Retired tycoon interface is not protected behind a development-only flag.");
assert.match(index, /Pixel Online RPG/, "Page metadata does not describe the current RPG.");

console.log("Public site content checks passed: MMO positioning, combat paths, whitepaper, economy roles, metadata, and legacy isolation are current.");
