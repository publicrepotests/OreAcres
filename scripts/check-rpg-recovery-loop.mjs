import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultRpgProgress, restoreRpgHitpoints } from "../server/src/rpgProfiles.js";

const wounded = defaultRpgProgress();
wounded.hp = 7;
const recovery = restoreRpgHitpoints(wounded);
assert.equal(recovery.healing, 23);
assert.equal(recovery.progress.hp, 30);
assert.equal(wounded.hp, 7, "recovery helper must not mutate the saved profile passed to it");

const armored = defaultRpgProgress();
armored.equipped.armor = "sentinel-mail";
armored.maxHp = 42;
armored.hp = 12;
const armoredRecovery = restoreRpgHitpoints(armored);
assert.equal(armoredRecovery.progress.maxHp, 42);
assert.equal(armoredRecovery.healing, 30);
assert.equal(restoreRpgHitpoints(armoredRecovery.progress).healing, 0, "full-health recovery should be a no-op");

const gameData = readFileSync(new URL("../src/rpg/gameData.ts", import.meta.url), "utf8");
const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const server = readFileSync(new URL("../server/src/index.js", import.meta.url), "utf8");

assert.match(gameData, /id: "trout"[\s\S]*?healing: 12/, "River Trout healing is not explicit in the client catalog");
assert.match(gameData, /id: "healing-potion"[\s\S]*?healing: 25/, "Crimson Tonic healing is not explicit in the client catalog");
assert.match(server, /trout: \{ category: "consumable", cost: 0, healing: 12 \}/, "River Trout healing drifted on the server");
assert.match(server, /"healing-potion": \{ category: "consumable", cost: 45, healing: 25 \}/, "Crimson Tonic healing drifted on the server");
assert.match(scene, /private createTownSanctuary\(\)/, "the Founders' Fountain world interaction is missing");
assert.match(scene, /kind: "sanctuary"/, "the sanctuary is not part of click-to-approach targeting");
assert.match(scene, /this\.showSanctuaryFx\(\)/, "sanctuary recovery lacks visible world feedback");
assert.match(server, /profileAction === "rest"[\s\S]*?enemy\.targetPlayerId === player\.id/, "server does not block fountain recovery while threatened");
assert.match(server, /profileAction === "rest"[\s\S]*?RPG_SANCTUARY/, "server does not distance-check fountain recovery");

console.log("RPG recovery checks passed: consumables share explicit healing values and the safe-town sanctuary is authoritative.");
