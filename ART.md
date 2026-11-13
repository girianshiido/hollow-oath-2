# Hollow Oath 2 — creature art

Original imagegen artwork, created for this game. The visual reference is the approved four-character manga portrait sheet: clean black ink, cel shadows, expressive shapes and vivid restrained palettes. These are cut-out illustrated enemies, not combat portraits of the player characters.

## Regular families

Every family now has five original drawings: `foe-N.webp` (idle A), `foe-N-idle2.webp` (idle B), `foe-N-windup.webp` (anticipation), `foe-N-attack.webp` (strike) and `foe-N-hurt.webp` (hit/death). They share a 448 × 448 transparent canvas and a common scale and ground anchor within each sequence.

| ID | Creature | Visual identity |
| --- | --- | --- |
| 1 | Briar Wolf | Green wolf with ivory thorn armor |
| 2 | Bone Guard | Skeleton with blue-gray shield and spear |
| 3 | Ember Scarab | Black beetle with orange armored plates |
| 4 | Spore Apothecary | Burgundy mushroom with purple cloak and potion |
| 5 | Rime Bat | Angular blue bat with dark wings |
| 6 | Lantern Puppet | Crooked brass lantern automaton |
| 7 | Jade Toad | Green toad with stone back plates |
| 8 | Hex Raven | Purple-cloaked crow with crystal staff |
| 9 | Crystal Mimic | Purple crystal chest with fangs |
| 10 | Bell Golem | Bronze bell with stone arms |
| 11 | Obsidian Mantis | Dark mantis with crimson blade arms |
| 12 | Astral Jelly | Blue-purple jellyfish with ribbon tentacles |

## Chapter bosses

Every boss has two original forms, with stems `boss-N` and `boss-N-form2`. Each stem has all five poses using the same suffixes as regular monsters. Form changes accompany gameplay changes, not merely a health increase.

| ID | Boss | Transformation |
| --- | --- | --- |
| 1 | Briar Stag | Rears up; crimson blade antlers and exposed golden heart |
| 2 | Living Furnace | Armor splits away from a tall molten core |
| 3 | Porcelain Widow | Ceramic shell opens into a sharp fan around violet body |
| 4 | Frost Leviathan | Uncoils with much larger jagged ice armor |
| 5 | Root Queen | Carnivorous blossom and raised root limbs |
| 6 | Brass Gryphon | Bladed wings unfold around exposed blue core |
| 7 | Thread Saint | Puppet cloak reveals six scissor-bearing arms |
| 8 | Hollow Crown | Empty royal armor grows wings, claws and an antler crown |

## Sources and processing

The five final original 4 × 2 atlases are retained in `art-sources/foes-a.png`, `foes-b.png`, `foes-c.png`, `bosses-a.png` and `bosses-b.png`. Full generation briefs are in `art-sources/prompts.json`. Two initial atlases had translucent atmospheric backgrounds; imagegen performed dedicated background-removal edits before production slicing. Boss atlases received an additional imagegen spacing edit to leave generous margins around every appendage and prevent clipping.

Processing consists only of slicing each equal grid cell, resizing its canvas to 448 × 448, and WebP encoding at quality 90 with full-quality alpha. No character content was painted or reconstructed programmatically. The atlas originals remain unchanged. `art-sources/asset-report.json` records the source generation filename, grid cell and visible bounds of every delivered sprite.

No external copyrighted game assets are included in these creature sheets.

## Approved hero direction and interface art

The four selection portraits are cropped from the user-approved clean manga sheet, with the original faces, vivid limited colors and themed backgrounds retained. The title gateway, four arena backgrounds and dedicated crossed-blade crown icon were generated specifically for Hollow Oath II. Their source images are retained in the originating image-generation conversation. Game assets are encoded in WebP; app icons are PNG at 192 and 512 px with a separate maskable declaration. No external image URLs are required at runtime.

## Five-drawing animation revision

The original five atlases remain for provenance. The current frame sequences were redrawn with imagegen from those approved creature identities. New source sheets and per-batch prompts, cell mappings, normalization details and alpha checks are retained under `art-sources/animation-*`. Slicing and WebP encoding do not paint or synthesize creature content. All 140 delivered frames are 448 × 448 RGBA. There is no separate death artwork: the hurt drawing is deliberately reused.

## Expansion and effect revision (1.2)

Regular families now extend through `foe-48`: 32 base families and 16 progressively introduced designs. All 64 creature identities/forms contain five drawings, **320 production frames**. Expansion originals, generation prompts, slice mappings and sequence normalization are retained in `art-sources/expansion-{a,b,c}*`. These are distinct creature designs, not recolors. Each five-pose row uses a shared crop and scale; imagegen spacing passes removed clipping and adjacent-cell spill before transparent WebP encoding.

`build-animation-anchors.py` measures idle alpha bounds for all 64 identities and generates ground anchors and visible-body effect bounds. Three sword directions for every hero and distinct fire, ice, lightning, shield and healing effects are drawn on Canvas. Their impact positions are based on visible creature bodies, rather than transparent canvas centers. The title uses 30 floating motes, three subtle moving rays and intermittent glints; motion is bounded and optional.
