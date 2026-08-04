import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WORLD_DAY_DURATION_MS, worldTimeAt } from "../src/rpg/worldTime.ts";

const atHour = (hour) => worldTimeAt((hour / 24) * WORLD_DAY_DURATION_MS);
assert.equal(atHour(0).phase, "night");
assert.equal(atHour(5).phase, "dawn");
assert.equal(atHour(8).phase, "day");
assert.equal(atHour(18).phase, "dusk");
assert.equal(atHour(21).phase, "night");
assert.equal(atHour(7.5).clock, "07:30");
assert.deepEqual(worldTimeAt(WORLD_DAY_DURATION_MS + WORLD_DAY_DURATION_MS / 2), worldTimeAt(WORLD_DAY_DURATION_MS / 2), "world time must be deterministic across clients");
assert.ok(WORLD_DAY_DURATION_MS >= 15 * 60_000, "the accelerated day must still leave time to experience each phase");

const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");
assert.match(shell, /rpg-shell--\$\{worldTime\.phase\}/, "world phase is not reflected on the game shell");
assert.match(shell, /className="rpg-world-light"/, "world lighting layer is missing");
assert.match(shell, /worldTime\.label[\s\S]*?worldTime\.clock/, "minimap does not expose world time");
assert.match(styles, /\.rpg-shell--night \.rpg-world-light/, "night lighting treatment is missing");
assert.match(styles, /\.rpg-shell--dusk \.rpg-world-light/, "dusk lighting treatment is missing");
assert.match(shell, /rpg-region--\$\{regionAtmosphere\}/, "the world shell does not expose region-aware atmosphere");
assert.match(styles, /\.rpg-region--moonfen-marsh \.rpg-world-light::before/, "Moonfen mist treatment is missing");
assert.match(styles, /\.rpg-region--eastern-quarry \.rpg-world-light::before/, "quarry dust treatment is missing");
assert.match(styles, /prefers-reduced-motion:[\s\S]*?\.rpg-world-light/, "world atmosphere does not honor reduced motion");

console.log("RPG world-time checks passed: synchronized phases, readable minimap time, lighting, and reduced motion are wired.");
