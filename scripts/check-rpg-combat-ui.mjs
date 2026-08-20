import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../src/rpg/OrehavenScene.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/PhaserRpgGame.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/phaserRpgGame.css", import.meta.url), "utf8");

assert.match(scene, /interact\(\) \{[\s\S]*?if \(this\.selectedEnemyId\) \{[\s\S]*?this\.engageSelectedTarget\(\);[\s\S]*?return;/, "E interaction does not prioritize the selected enemy");
assert.match(scene, /engageSelectedTarget\(\) \{[\s\S]*?this\.approach\(\{ kind: "enemy", id: enemy\.definition\.id/, "selected target cannot enter the normal range and pathfinding flow");
assert.match(scene, /enemy\.hp <= 0 \|\| enemy\.respawnAt > Date\.now\(\)/, "engage action does not reject unavailable enemies");
assert.match(scene, /if \(this\.actionLock && !dx && !dy\) \{[\s\S]*?return;/, "locked combat and gathering animations can be overwritten by idle movement updates");
assert.match(scene, /this\.heroAction !== "attack" \|\| Date\.now\(\) >= this\.playerAttackUntil/, "combat movement can erase an active strike animation");
assert.match(scene, /private settleHeroAfterAttack\(attackEndsAt: number\)[\s\S]*?this\.playerAttackUntil !== attackEndsAt[\s\S]*?this\.moving \? "walk" : "idle"/, "stale strike timers can interrupt a newer attack or recover to the wrong movement state");
assert.match(scene, /if \(this\.heroAction === "attack" && Date\.now\(\) < this\.playerAttackUntil\) return;[\s\S]*?this\.setHeroAction\(this\.moving \? "walk" : "idle"\)/, "hurt recovery can force a phantom attack pose between combat ticks");
assert.match(scene, /JustDown\(this\.keys\.ONE\)\) this\.activateHotbarSlot\(0\)/, "keyboard slot 1 does not use the configurable hotbar");
assert.match(scene, /setHotbarLayout\(layout: Array<HotbarEntry \| null>\)/, "the Phaser runtime cannot receive hotbar layout changes");
assert.match(scene, /entry\.kind === "ability"\) this\.useCombatAbility\(entry\.slot\)[\s\S]*?this\.consumeItem\(entry\.itemId\)/, "hotbar entries do not dispatch both abilities and consumables");
assert.match(scene, /slot\.startsWith\("tree:"\)[\s\S]*?entry\.id === slot\.slice\(5\)/, "the runtime cannot resolve exact learned skill IDs from the hotbar");
assert.match(scene, /ability\.id === "groundbreaker"[\s\S]*?ability\.id === "pinning-volley"[\s\S]*?ability\.id === "frost-nova-tree"/, "advanced tree abilities lack distinct visual sequences");
assert.match(scene, /else if \(enemy\.worldAction === "attack"\) this\.playEnemyReaction\(enemy, "attack", enemy\.facing\)/, "living enemies can freeze on the final hurt frame instead of returning to combat");
assert.match(scene, /if \(defeated\) \{[\s\S]*?enemy\.reaction = null;[\s\S]*?enemy\.hitZone\.disableInteractive\(\)/, "defeated enemies do not immediately clear reactions and interaction");

assert.match(shell, /engageTarget: \(\) => scene\.engageSelectedTarget\(\)/, "React game API does not expose selected-target engagement");
assert.match(shell, /hud\.activeAction \? "engaged" : "selected"/, "target frame does not distinguish selected and engaged states");
assert.match(shell, /className="engage"[\s\S]*?apiRef\.current\?\.engageTarget\(\)[\s\S]*?Engage <kbd>E<\/kbd>/, "selected target lacks a direct Engage control");
assert.match(shell, /Retreat <kbd>Esc<\/kbd>/, "engaged target lacks a retreat control");
assert.match(shell, /Selected • Engage to attack/, "selected target guidance is missing");
assert.match(shell, /attacks active/, "active combat guidance is missing");
assert.match(shell, /HOTBAR_SAVE_KEY/, "hotbar customization is not persisted");
assert.match(shell, /application\/x-orehaven-hotbar-slot/, "hotbar slots cannot be dragged to reorder");
assert.match(shell, /application\/x-orehaven-hotbar-entry/, "abilities and consumables cannot be dropped into hotbar slots");
assert.match(shell, /activeTreeAbilities\.map\(\(ability\)[\s\S]*?`tree:\$\{ability\.id\}`/, "learned skills are not individually assignable from the hotbar palette");
assert.match(shell, /Select slot \{selectedHotbarSlot \+ 1\}/, "hotbar editor lacks click-to-assign support");
assert.match(shell, /HUD_LAYOUT_SAVE_KEY/, "HUD customization is not persisted");
assert.match(shell, /data-hud-widget/, "HUD panels are not exposed to the layout editor");
assert.match(shell, /min="65" max="140"/, "HUD panels cannot be resized through a safe scale range");
assert.match(shell, /Reset everything/, "HUD editor lacks a full layout recovery option");
assert.match(shell, /respecSkills/, "skill-tree builds cannot be reset during playtesting");
assert.match(shell, /skillTreeNodeConnected\(node, unlockedTreeNodeIds\)/, "skill nodes are not gated by their graph connections");
assert.match(shell, /rpg-passive-web/, "skills panel is missing the interconnected passive web");
assert.match(shell, /setSkillTreeZoom/, "the large passive web cannot be zoomed");

assert.match(styles, /\.rpg-target-frame__engagement\s*\{/, "target engagement state has no visual treatment");
assert.match(styles, /\.rpg-target-frame__controls > button\.engage\s*\{/, "Engage button has no distinct visual treatment");
assert.match(styles, /\.rpg-target-frame\.engaged\s*\{/, "engaged target frame has no active-combat emphasis");
assert.match(styles, /\.rpg-hotbar-editor\s*\{/, "hotbar editor has no visual treatment");
assert.match(styles, /\.rpg-hud-editor\s*\{/, "HUD editor has no visual treatment");
assert.match(styles, /\.rpg-hud-editing \[data-hud-widget\]/, "editable HUD panels have no clear edit-mode state");
assert.match(styles, /\.rpg-passive-node--keystone\s*\{/, "hybrid keystones have no distinct visual treatment");
assert.match(styles, /\.rpg-passive-web > svg line\.unlocked\s*\{/, "learned passive paths are not visually connected");

console.log("RPG combat UI checks passed: selected targets, explicit engagement, keyboard priority, and retreat states are wired.");
