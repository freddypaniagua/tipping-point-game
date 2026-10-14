---
name: game-art
description: Generate or regenerate a piece of Tipping Point's pixel art (scene, props, objects, the pirate) with Gemini through the banana-claude plugin, and bring it into the game. Use when the user asks to make, redo or fix game art, sprites, or object pictures.
---

# Making game art

The game's art pipeline is: a large "pixel art" image from Gemini goes in `art/raw/`, then
`npm run art` (`scripts/process-art.mjs`) shrinks it to true 1:1 pixels, keys out the magenta
backdrop and writes the sprite to `src/assets/art/`. This skill covers the first half, using the
`banana-claude` plugin (`/banana-claude:banana`) so nothing has to be done in the Gemini app.

## Before generating

1. Read `art/README.md`: it lists every piece, its target size in art pixels, its backdrop, and
   which raw file it replaces. Object names match the ids in `src/data/objects.json`.
2. Check the plugin is installed and enabled. If not, tell the user the install steps (they
   must enter the API key themselves; never ask them to paste it into chat):
   `/plugin marketplace add AgriciDaniel/banana-claude`, `/plugin install
   banana-claude@banana-claude-marketplace`, `/plugin enable banana-claude@banana-claude-marketplace`,
   `/reload-plugins`.
3. Use Nano Banana Pro (`gemini-3-pro-image`) when the pirate is the reference: it is the only
   route with a real `style` reference slot. The reference's authority must be confirmed by
   the user (they confirmed rights and sending it to Google on 2026-10-14).
4. Generation is paid per image. Show the plan and estimate and let the user approve each
   request (the plugin enforces this). Use the cheapest route that the user is happy with for
   drafts, and say which model you chose.

## The prompt

Always attach `art/raw/reference/pirate-reference.png` as a **style** reference (it is the
style anchor; keep it small, large uploads stall). Every prompt should say:

- Chunky retro pixel art matching the reference: same pixel size, 1 px dark outline, 3 to 4 flat
  shades per material, no gradients, no anti-aliasing, no dithering noise.
- The intended size in art pixels from `art/README.md` (e.g. "a 44 x 62 pixel sprite, drawn
  as large square blocks").
- The backdrop: a flat solid `#ff00ff` magenta background, with no shadow or ground, unless the
  README says the piece fills the image (sky, sea).
- One subject only, centred, whole, with nothing cropped; side view for objects.
- No text, no watermark, no border.

Objects must read at about 32 px against a brown dock, so ask for clear silhouettes and avoid
all-brown colour schemes.

## Saving and processing

1. Move the old raw file to `art/raw/unused/` (rename it `<name>-old`) if one exists.
2. Save the result as `art/raw/<folder>/<name>.png`, the exact name in the README table.
3. Run `npm run art`. If the sprite comes out blurry or the wrong size, set `block` for that
   job in `scripts/process-art.mjs` (see "If a new image comes out wrong" in the README).
   The generator picks its own pixel size rather than the one asked for (the dock came back at
   about 5.7 raw pixels per art pixel, 240 wide instead of 420), and the auto-detect can be
   fooled; measure the smallest blocks in a zoomed crop and use a fractional `block` if needed.
   What must match is the pixel size, not the requested dimensions: repeating pieces can simply
   tile more, single sprites may need `px`/`max` or a regenerate.
4. Look at the output in `src/assets/art/` and in the running game (`npm run dev`) before
   calling it done. If the pirate changed, re-measure `MOUTH`, `EYES` and the rig parts
   (`SWORD`, `HAND`, `BOOTS`) at the top of `src/pirate.ts`.
5. Raw art is git-ignored; commit only the processed sprite and any script or README change.
