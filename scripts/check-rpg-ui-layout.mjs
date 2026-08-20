import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");

assert.match(
  shell,
  /setPanel\(\(current\) => \(current === menuItem\.panel \? null : menuItem\.panel\)\)/,
  "keyboard menu controls do not toggle one panel at a time",
);
assert.match(
  shell,
  /setPanel\(panel === item\.panel \? null : item\.panel\)/,
  "menu buttons do not toggle one panel at a time",
);
assert.match(shell, /aria-label="Game menus"/, "game menu rail is missing its accessible label");

assert.match(styles, /\.rpg-menu\s*\{[\s\S]*?top:\s*214px;/, "desktop menu rail can overlap the minimap controls");
assert.match(
  styles,
  /@media \(max-height:\s*760px\) and \(min-width:\s*701px\)[\s\S]*?\.rpg-menu\s*\{[^}]*top:\s*188px;/,
  "short desktop menu rail can overlap the compact minimap controls",
);
assert.match(
  styles,
  /\.rpg-world-map__regions\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/,
  "world-map region controls are not arranged into readable desktop columns",
);
assert.match(
  styles,
  /@media \(max-width:\s*720px\)[\s\S]*?\.rpg-world-map__regions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  "world-map region controls do not reflow for compact screens",
);
assert.match(
  styles,
  /\.rpg-world-map__regions button span\s*\{[^}]*white-space:\s*normal;/,
  "world-map destination names can still be clipped into unreadable single lines",
);
assert.match(
  styles,
  /\.rpg-quest-list,[\s\S]*?\.rpg-world-map\s*\{[^}]*overflow:\s*auto;/,
  "large game menus cannot scroll within the available viewport",
);

console.log("RPG UI layout checks passed: menu toggles, minimap clearance, readable map regions, and overlay scrolling are guarded.");
