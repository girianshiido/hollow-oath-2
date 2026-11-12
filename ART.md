# Hollow Oath 2 — creature art

Original imagegen artwork, created for this game. The visual reference is the approved four-character manga portrait sheet: clean black ink, cel shadows, expressive shapes and vivid restrained palettes. These are cut-out illustrated enemies, not combat portraits of the player characters.

## Regular families

Every family has two original drawings: `foe-N.webp` (idle) and `foe-N-attack.webp` (attack). They share a 448 × 448 transparent canvas so changing pose does not change the image element's geometry.

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

Every boss has two original forms: `boss-N.webp` and `boss-N-form2.webp`. Form changes are intended to accompany gameplay changes, not merely a health increase.

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
