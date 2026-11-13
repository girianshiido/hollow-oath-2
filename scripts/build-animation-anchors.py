"""Measure each idle drawing's ground anchor; never modify artwork.

Run after replacing a creature sequence. Pillow is needed only for this
authoring step; the generated TypeScript is committed for normal builds.
"""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parents[1]
stems = [f'foe-{i}' for i in range(1, 13)] + [f'boss-{i}{suffix}' for i in range(1, 9) for suffix in ['', '-form2']]
anchors = {}
for stem in stems:
    im = Image.open(root / 'public/art' / (stem + '.webp')).convert('RGBA')
    bounds = im.getchannel('A').point(lambda p: 255 if p > 96 else 0).getbbox()
    assert bounds, stem
    anchors[stem] = round(bounds[3] / im.height, 6)
(root / 'src/creature-anchors.ts').write_text('// Generated from idle artwork by scripts/build-animation-anchors.py.\nexport const CREATURE_ANCHORS: Record<string,number> = ' + json.dumps(anchors, indent=2) + ';\n')
print(f'Measured {len(anchors)} creature ground anchors.')
