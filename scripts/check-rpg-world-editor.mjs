import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const editor = await readFile(new URL("../src/WorldEditor.tsx", import.meta.url), "utf8");
const vite = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

const regions = [
  ["orehaven-overworld.png", 0],
  ["briarwild-south.png", 1024],
  ["sunstone-catacombs.png", 2048],
  ["moonfen-marsh.png", 3072],
  ["emberfall-highlands.png", 4096],
  ["frostmere-coast.png", 5120],
  ["sunscar-expanse.png", 6144],
  ["orehaven-guildhall.png", 7168],
  ["icefang-vault.png", 8192],
];

assert.match(editor, /const WORLD_HEIGHT = 9216;/, "The world editor does not cover the complete production atlas.");
assert.match(vite, /const RPG_WORLD_HEIGHT = 9216;/, "The save middleware does not share the production world height.");
assert.match(vite, /rawEntity\.y as number\) > RPG_WORLD_HEIGHT/, "World saves are not validated against the complete atlas.");
assert.doesNotMatch(vite, /rawEntity\.y as number\) > 3072/, "The obsolete Moonfen-only save boundary returned.");
for (const [asset, y] of regions) {
  assert.match(editor, new RegExp(`${asset.replaceAll(".", "\\.")}[^\\n]+y="${y}"`), `${asset} is missing from its production editor band.`);
}
assert.match(editor, /liveServerApplied/, "The editor does not report live multiplayer synchronization.");
assert.match(vite, /fetch\("http:\/\/127\.0\.0\.1:8080\/api\/admin\/world-layout"/, "Saved placements are not forwarded to the running authoritative server.");

console.log(JSON.stringify({
  world: "1536x9216",
  editableRegions: regions.length,
  fullAtlasSaveValidation: true,
  liveServerSynchronization: true,
  result: "PASS",
}, null, 2));
