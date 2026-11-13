"""Rebuild the foe37–48 animation expansion from original imagegen atlases.
Only crops, common-scale canvas positioning and WebP encoding; no painted edits.
"""
from PIL import Image,ImageDraw
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
config=json.loads((ROOT/'art-sources/expansion-c-sources.json').read_text())
files=[]
for key,info in config.items():
 im=Image.open(ROOT/'art-sources'/info['atlas']).convert('RGBA');w,h=im.size
 for row in range(2):
  cells=[im.crop((round(c*w/5),round(row*h/2),round((c+1)*w/5),round((row+1)*h/2))) for c in range(5)]
  bounds=[cell.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox() for cell in cells]
  union=(min(b[0] for b in bounds),min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds))
  uw,uh=union[2]-union[0],union[3]-union[1];scale=350/max(uw,uh);size=(round(uw*scale),round(uh*scale));offset=((448-size[0])//2,400-size[1])
  for c,suffix in enumerate(['','-idle2','-windup','-attack','-hurt']):
   name=f'foe-{info["first"]+row}{suffix}.webp';dest=ROOT/'public/art'/name
   frame=Image.new('RGBA',(448,448));frame.alpha_composite(cells[c].crop(union).resize(size,Image.Resampling.LANCZOS),offset);frame.save(dest,'WEBP',quality=90,alpha_quality=100,method=3)
   bb=frame.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox()
   assert bb and min(bb[0],bb[1],448-bb[2],448-bb[3])>=45,(name,bb)
   files.append({'file':name,'atlas':info['atlas'],'cell':[row,c],'unionCrop':union,'commonScale':scale,'offset':offset,'opaqueBounds':bb,'bytes':dest.stat().st_size})
result={'status':'complete' if len(files)==60 else 'partial','families':list(range(37,49)),'frameOrder':['idle','idle2','windup','attack','hurt'],'deathPose':'hurt','normalization':'Same union crop and scale for every five-frame row, 448px canvas, 400px ground baseline; visible margins at least45px.','files':files}
(ROOT/'art-sources/expansion-c.json').write_text(json.dumps(result,indent=2))
qa=Image.new('RGB',(900,len(files)//5*188),(20,36,48));d=ImageDraw.Draw(qa)
for i,item in enumerate(files):
 r,c=divmod(i,5);im=Image.open(ROOT/'public/art'/item['file']).convert('RGBA');im.thumbnail((170,165));qa.paste(im,(c*180+(180-im.width)//2,r*188+3),im);d.text((c*180+5,r*188+168),item['file'],fill='white')
qa.save('/tmp/hollow2-expansion-c-qa.jpg',quality=92)
print(len(files),'sprites',sum(i['bytes'] for i in files),'bytes')
