"""Rebuild production creature WebP sprites from the five source atlases.

Requires Pillow. Does not modify any character art or alpha contents.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'art-sources'
DEST = ROOT / 'public' / 'art'
SHEETS = [('foes-a', 1, 'foe'), ('foes-b', 5, 'foe'),
          ('foes-c', 9, 'foe'), ('bosses-a', 1, 'boss'),
          ('bosses-b', 5, 'boss')]
report = []
DEST.mkdir(parents=True, exist_ok=True)
for stem, first, kind in SHEETS:
    im = Image.open(SOURCES / (stem + '.png')).convert('RGBA')
    width, height = im.size
    for row in range(2):
        for col in range(4):
            box = (round(col * width / 4), round(row * height / 2),
                   round((col + 1) * width / 4), round((row + 1) * height / 2))
            cell = im.crop(box).resize((448, 448), Image.Resampling.LANCZOS)
            suffix = '' if row == 0 else '-attack' if kind == 'foe' else '-form2'
            path = DEST / f'{kind}-{first + col}{suffix}.webp'
            cell.save(path, 'WEBP', quality=90, method=4, alpha_quality=100)
            bounds = cell.getchannel('A').point(lambda p: 255 if p >= 96 else 0).getbbox()
            assert bounds is not None
            report.append({'file': path.name, 'atlas': stem + '.png',
                           'cell': [row, col], 'size': path.stat().st_size,
                           'opaque_bounds': bounds})
(SOURCES / 'asset-report.json').write_text(json.dumps(report, indent=2))
print(f'Created {len(report)} sprites, {sum(x["size"] for x in report)} bytes')
