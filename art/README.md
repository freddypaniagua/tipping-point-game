# Art

Raw images go in `art/raw/` (not committed: the files are large). `npm run art` turns them
into small sprites in `src/assets/art/`, which is what the game loads.

## Replacing a piece

1. Save the new image in the folder below, **with the same name** (any of png, jpg, webp, avif).
   Move the old one to `art/raw/unused/` if you want to keep it.
2. Run `npm run art`.
3. Reload the game.

## The pieces

Every sprite shares one pixel grid, set by the pirate. The target is **twice the detail of the
first pirate**: he should be 88 x 120 pixels. "Size" is how big each finished sprite is in art
pixels; ask the image generator for that size. Art that is still coarser than its target is
used as it is (with bigger pixels) until it is redrawn.

| File in `art/raw/` | What it is | Size (pixels) | Backdrop |
| --- | --- | --- | --- |
| `characters/pirate` | The pirate. The style anchor for everything else. Done at 2x. | 87 x 123 | magenta |
| `scene/sky` | Sky bands | any | none (fills the image) |
| `scene/clouds` | Four clouds in a row, spaced evenly across the image | about 40 x 25 each | magenta |
| `scene/sea` | Sea strip | 248 wide | none (fills the image) |
| `scene/town` | Distant harbour town | 64 x 20 | magenta |
| `scene/market` | **Market scene (experiment, branch `market-scene`).** The mood picture `reference/market-mood.jpg` with sky, water and ships cut out (magenta). Full-frame, untrimmed. | 404 x 225 | magenta where sky and water show |
| `scene/ship-left`, `scene/ship-right` | The two galleons cut from the same picture, full-frame so they line up with the market; they bob. | 404 x 225 | magenta |
| `scene/dock` | The dock everything stands on. Done at 2x (generated with Nano Banana Pro). It repeats sideways, and its planks repeat downward, so any width works. | 240 x 127 | magenta above the dock |
| `props/barrel` | Barrel the scale sits on | 44 x 62 | magenta |
| `props/scale-parts` | Stand, beam and one pan, laid out separately | stand 20 x 58, beam 84 x 12, pan 28 x 42 | magenta |
| `objects/horse` | **Missing.** Uses the Trojan Horse without wheels until added. | 32 max | magenta |
| `objects/adult-human` | | 32 max | magenta |
| `objects/trojan-horse` | | 32 max | magenta |
| `objects/mosasaurus` | | 32 max | magenta |
| `objects/dodo` | **Old style, needs redoing.** | 32 max | magenta |
| `objects/gigantopithecus` | | 32 max | magenta |
| `objects/chicken-heart` | | 32 max | magenta |
| `objects/boeing-747` | | 32 max | magenta |
| `objects/hummingbird` | | 32 max | magenta |

When the pirate changes, the mouth and eye positions at the top of `src/pirate.ts` (measured in
his pixels) need re-measuring, or his talking and blinking patches land in the wrong place.

Object names match the ids in `src/data/objects.json`. A new object needs a line in the list
near the top of `scripts/process-art.mjs` as well as its image.

Not made yet: a pirate ship for the background (about 96 wide).

Magenta means a flat `#ff00ff` background, which the script makes transparent.

## If a new image comes out wrong

The script guesses how big one art pixel is in each raw image. If a sprite comes out blurry or
the wrong size, set `block` for that entry in `scripts/process-art.mjs`. If the layout of a
sheet changes (clouds, scale parts), its `crop` boxes need adjusting too.
