"""Slice one expansion-a 5x2 imagegen sheet using one transform per row."""
from pathlib import Path
from PIL import Image
import json, shutil, sys

ROOT = Path(__file__).resolve().parents[1]
source, stem, first = Path(sys.argv[1]), sys.argv[2], int(sys.argv[3])
assert stem.startswith('expansion-a-') and first in (13,15,17,19,21,23)
im = Image.open(source).convert('RGBA')
width, height = im.size
result = {'atlas': stem + '.png', 'source_generation': source.name, 'creatures': []}
for row in range(2):
    cells, bounds = [], []
    for col in range(5):
        box = (round(col * width / 5), round(row * height / 2),
               round((col + 1) * width / 5), round((row + 1) * height / 2))
        cell = im.crop(box)
        bound = cell.getchannel('A').point(lambda p: 255 if p >= 96 else 0).getbbox()
        assert bound is not None
        assert min(bound[0],bound[1],cell.width-bound[2],cell.height-bound[3]) >= 8, ('NEEDS PADDING', first+row, col, bound,cell.size)
        cells.append(cell); bounds.append(bound)
    union = (min(b[0] for b in bounds)-6,min(b[1] for b in bounds)-6,
             max(b[2] for b in bounds)+6,max(b[3] for b in bounds)+6)
    common_width, common_height = union[2]-union[0], union[3]-union[1]
    scale = min(380/common_width,380/common_height)
    target = (round(common_width*scale),round(common_height*scale))
    offset = ((448-target[0])//2,422-target[1])
    creature = {'id':first+row,'row':row,'source_bounds':bounds,'common_crop':union,
                'common_scale':scale,'common_paste_offset':offset,'canvas':[448,448],'frames':[]}
    for col,suffix in enumerate(['','-idle2','-windup','-attack','-hurt']):
        crop = cells[col].crop(union).resize(target,Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(448,448));canvas.alpha_composite(crop,offset)
        name=f'foe-{first+row}{suffix}.webp';path=ROOT/'public/art'/name
        canvas.save(path,'WEBP',quality=90,method=3,alpha_quality=100)
        creature['frames'].append({'file':name,'state':['idle','idle2','windup','attack','hurt'][col],
                                  'size_bytes':path.stat().st_size})
    result['creatures'].append(creature)
shutil.copy2(source,ROOT/'art-sources'/(stem+'.png'))
(ROOT/'art-sources'/(stem+'-report.json')).write_text(json.dumps(result,indent=2))
print(json.dumps({'status':'delivered','ids':[first,first+1],
                  'bytes':sum(f['size_bytes'] for c in result['creatures'] for f in c['frames'])}))
