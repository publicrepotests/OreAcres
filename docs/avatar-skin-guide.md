# Orehaven Modular Avatar Guide

Orehaven characters use the Universal LPC modular sprite standard. A character is assembled from synchronized body, clothing, armor, hair, helmet, and equipment layers. Do not create one flattened character strip for new equipment: every layer must share the same frame contract so it stays attached to the body during every action.

## Frame contract

- Standard frame: `64 x 64 px`
- Oversized melee/tool frame: `128 x 128 px`
- Direction rows: up, left, down, right
- Standard action columns: idle `2`, walk `9`, slash `6`, spellcast `7`, shoot `13`, hurt `6`
- Shared anchor: character feet remain at the same bottom-center world point
- Format: transparent RGBA PNG with no background or padding changes between matching layers

Files live under `public/assets/rpg/characters/lpc/`. Each modular part has one PNG per supported action, for example:

```text
body/idle.png
body/walk.png
body/slash.png
armor/plate-torso/walk.png
weapon/sword/slash-bg.png
weapon/sword/slash-fg.png
```

## Layer order

The renderer uses this stable order:

1. Weapon background
2. Body
3. Pants and boots
4. Shirt
5. Torso armor, arm armor, leg armor, and armored feet
6. Hair or helmet
7. Weapon foreground

Large weapons and gathering tools use background and foreground sheets so the handle can pass behind the body while the blade or tool head passes in front. This is what makes equipment look held instead of pasted beside the avatar.

## Creating a cosmetic

1. Start from the existing male LPC body sheets in `public/assets/rpg/characters/lpc/body/`.
2. Draw the cosmetic on a separate transparent layer using exactly the same canvas dimensions and frame grid for every action.
3. Keep hands, shoulders, waist, and foot baseline aligned to the body reference in every frame.
4. Export idle, walk, slash, shoot, spellcast, and hurt sheets.
5. Add the new layer paths to `src/rpg/LayeredHero.ts` rather than flattening them into the body.
6. Test all four directions and every action with no armor, leather armor, and plate armor before release.

## Creating weapons

- Split weapons into `bg` and `fg` layers whenever the weapon crosses the torso or arms.
- Match the hand position on every frame, not only the first frame.
- Use `128 x 128 px` frames for broad melee arcs and large tools.
- Keep the same weapon silhouette and palette across idle, walk, and action sheets.
- Verify the weapon at native game scale. A technically aligned weapon can still be unreadable if its silhouette is too thin.

## Runtime presets

- `vanguard`: guild-blue clothing and copper hair
- `ranger`: earth-tone clothing and a field haircut
- `arcanist`: violet clothing and arcane hair

Presets control body/clothing color and hair. Equipped item IDs independently select the sword, bow, staff, pickaxe, leather armor, or plate armor layer, allowing cosmetics and equipment to combine without redrawing the whole character.

The retired `paladin`, `astronaut`, and `voidwalker` save values are migrated automatically to the three modular presets.
