from PIL import Image,ImageDraw
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
GEN=ROOT.parent/'generated_images'
SOURCES=[('b1',25,'exec-e0ef66a7-b4a8-455d-975d-f399e4d15215.png'),('b2',27,'exec-7d3094ed-c21d-4169-b8a7-190afd48577a.png'),('b3',29,'exec-90cc7511-e3d7-4644-9e7c-8eb1d0f513f1.png'),('b4',31,'exec-cc1945b9-7e82-4bfe-befd-bb69ac0beab0.png'),('b5',33,'exec-bb3fb5e6-bedc-44ce-a4ba-e949ea85edf9.png'),('b6',35,'exec-325be12a-ae8b-4d12-8c67-9c93b803c783.png')]
POSES=['','-idle2','-windup','-attack','-hurt']
NAME=['Suncrest Raptor','Sepulcher Tortoise','Bellmaw','Glaivehorn Sentinel','Wickstalker','Blood Scorpion','Crag Fiend','Ivory Revenant','Sporeguard','Astral Cuttle','Dune Scarab','Chainbound Jackal']
report=[];jobs=[]
for key,first,source in SOURCES:
 target=ROOT/'art-sources'/f'expansion-{key}.png';shutil.copyfile(GEN/source,target)
 im=Image.open(target).convert('RGBA');w,h=im.size
 for row in range(2):
  cells=[];bounds=[]
  for col in range(5):
   cell=im.crop((round(col*w/5),round(row*h/2),round((col+1)*w/5),round((row+1)*h/2)))
   bbox=cell.getchannel('A').point(lambda a:255 if a>=40 else 0).getbbox()
   assert bbox is not None
   assert min(bbox[0],bbox[1],cell.width-bbox[2],cell.height-bbox[3])>5,(key,row,col,bbox)
   cells.append(cell);bounds.append(bbox)
  maxw=max(b[2]-b[0] for b in bounds);maxh=max(b[3]-b[1] for b in bounds)
  scale=min(388/maxw,388/maxh)
  for col,(cell,bbox) in enumerate(zip(cells,bounds)):
   jobs.append((first+row,col,cell,bbox,scale,target.name,source))
def encode(job):
 n,col,cell,bbox,scale,atlas,source=job
 crop=cell.crop(bbox);sprite=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(448,448));out.alpha_composite(sprite,((448-sprite.width)//2,418-sprite.height))
 path=ROOT/'public/art'/f'foe-{n}{POSES[col]}.webp';out.save(path,quality=90,method=3,alpha_quality=100)
 bounds=out.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox()
 assert bounds and min(bounds[0],bounds[1],448-bounds[2],448-bounds[3])>=25
 return {'file':path.name,'creature_id':n,'name':NAME[n-25],'pose':POSES[col] or 'idle','atlas':atlas,'source_generation':source,'cell':[int((n-25)%2),col],'source_bounds':bbox,'opaque_bounds':bounds,'common_scale':scale,'ground_anchor':418,'bytes':path.stat().st_size}
with ThreadPoolExecutor(max_workers=4) as pool:
 for entry in pool.map(encode,jobs):report.append(entry);print('Ready',entry['file'],flush=True)
(ROOT/'art-sources/expansion-b.json').write_text(json.dumps({'poses':['idle','idle2','windup','attack','hurt'],'creature_ids':list(range(25,37)),'processing':'Pillow cropping, uniform row scale and bottom alignment only; all character content imagegen; no procedural pose warps or erasure.','assets':report},indent=2))
qa=Image.new('RGB',(1000,12*220),'#152632');draw=ImageDraw.Draw(qa)
for entry in report:
 col=POSES.index('' if entry['pose']=='idle' else entry['pose']);row=entry['creature_id']-25
 frame=Image.open(ROOT/'public/art'/entry['file']).resize((200,200),Image.Resampling.LANCZOS)
 qa.paste(frame,(col*200,row*220+20),frame);draw.text((col*200+4,row*220+3),entry['file'],fill='white')
qa.save('/tmp/hollow-expansion-b-qa.jpg',quality=92)
print('DONE',len(report),sum(r['bytes'] for r in report))
