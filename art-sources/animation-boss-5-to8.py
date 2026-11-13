"""Slice four imagegen atlases into five animation frames per boss form.
Only atlas cropping, common-scale canvas placement, and WebP encoding.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parents[1]
report=[]
for num in range(5,9):
 src=ROOT/'art-sources'/f'animation-boss-{num}.png'
 im=Image.open(src).convert('RGBA');w,h=im.size
 for row in range(2):
  cells=[im.crop((round(col*w/5),round(row*h/2),round((col+1)*w/5),round((row+1)*h/2))) for col in range(5)]
  bounds=[cell.getchannel('A').point(lambda p:255 if p>=96 else 0).getbbox() for cell in cells]
  union=(min(b[0] for b in bounds),min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds))
  uw,uh=union[2]-union[0],union[3]-union[1];scale=394/max(uw,uh);size=(round(uw*scale),round(uh*scale));offset=((448-size[0])//2,421-size[1])
  for col,suffix in enumerate(['','-idle2','-windup','-attack','-hurt']):
   stem=f'boss-{num}'+('-form2' if row else '');out=ROOT/'public/art'/f'{stem}{suffix}.webp'
   frame=Image.new('RGBA',(448,448));frame.alpha_composite(cells[col].crop(union).resize(size,Image.Resampling.LANCZOS),offset);frame.save(out,'WEBP',quality=90,method=4,alpha_quality=100)
   b=frame.getchannel('A').point(lambda p:255 if p>=96 else 0).getbbox()
   assert b and b[0]>10 and b[1]>10 and b[2]<438 and b[3]<438,(out,b)
   report.append({'file':out.name,'atlas':src.name,'cell':[row,col],'unionCrop':union,'commonScale':scale,'offset':offset,'bounds':b,'bytes':out.stat().st_size})
result={'status':'complete','forms':8,'framesPerForm':5,'frameOrder':['idle','idle2','windup','attack','hurt'],'deathPose':'hurt','normalization':'Same union crop and scale for all five frames within each form. Uniform 448px canvases, baseline421px.','artwork':'Original imagegen animation drawings plus dedicated imagegen alpha/gutter cleanup, no procedural pose synthesis.','files':report}
(ROOT/'art-sources/animation-boss-b.json').write_text(json.dumps(result,indent=2))
qa=Image.new('RGB',(5*180,8*192),(20,36,48));d=ImageDraw.Draw(qa)
for i,item in enumerate(report):
 r,c=divmod(i,5);im=Image.open(ROOT/'public/art'/item['file']).convert('RGBA');im.thumbnail((175,170));qa.paste(im,(c*180+(180-im.width)//2,r*192+4),im);d.text((c*180+5,r*192+174),item['file'],fill='white')
qa.save('/tmp/hollow2-bosses-5-8-animation-qa.jpg',quality=92)
print('Created',len(report),'sprites;',sum(x['bytes'] for x in report),'bytes')
