import {enemyCenter,enemyMeterWidth,fitLabel} from './battle-layout.ts';
import {bossPhases} from './bosses.ts';
import {CHAPTERS,FOES,chapterIndex,MODE_INFO} from './content.ts';
import type {Run,CombatEvent,Enemy} from './engine.ts';
import {POSES,creatureStem,creaturePose,poseAsset,deathOpacity} from './animation.ts';
import type {CreatureMotion} from './animation.ts';
import {CREATURE_ANCHORS} from './creature-anchors.ts';
import {CREATURE_BOUNDS} from './creature-bounds.ts';
import {drawCombatFlash} from './combat-fx.ts';
import type {CombatFlash} from './combat-fx.ts';

interface Float {x:number;y:number;text:string;color:string;start:number;}
type Flash=CombatFlash;
interface Rect {id:number;x:number;y:number;w:number;h:number;}
const images=new Map<string,HTMLImageElement>();
function art(name:string){let img=images.get(name);if(!img){img=new Image();img.src=`./art/${name}.webp`;images.set(name,img);if(images.size>36)images.delete(images.keys().next().value!);}else{images.delete(name);images.set(name,img);}return img;}
export function warmArt(){for(const name of ['arena-1','arena-2','arena-3','arena-4','foe-1','foe-2','foe-3','foe-4','foe-5','foe-6','vanguard','hexweaver','nightblade','oathkeeper'])art(name);}
export class Arena {
  canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;width=400;height=340;
  floats:Float[]=[];flashes:Flash[]=[];rects:Rect[]=[];motions=new Map<number,CreatureMotion>();seen='';observer:ResizeObserver;
  motion=true;swings=new Map<number,number>();
  constructor(canvas:HTMLCanvasElement){
    this.canvas=canvas;this.ctx=canvas.getContext('2d')!;
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  dispose(){this.observer.disconnect();}
  resize(){const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);this.width=rect.width;this.height=rect.height;this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}
  hit(clientX:number,clientY:number){const r=this.canvas.getBoundingClientRect(),x=clientX-r.left,y=clientY-r.top;return this.rects.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)?.id??null;}
  sync(r:Run){
    const key=`${r.wave}-${r.trip?.id??''}-${r.trip?.floor??0}-${r.enemies[0]?.id}`;
    if(key===this.seen)return;
    this.seen=key;this.motions.clear();this.rects=[];
    for(const e of r.enemies){this.motions.set(e.id,e.hp<=0?{deathAt:r.time}:{});for(const pose of POSES){art(poseAsset(creatureStem(e),pose));if(e.boss)art(poseAsset(e.art+'-form2',pose));}}
  }
  events(events:CombatEvent[],r:Run){
    this.sync(r);
    const now=performance.now(),casters=new Set(events.filter(e=>e.kind==='cast').map(e=>e.hero));
    for(const event of events){
      const rect=this.rects.find(a=>a.id===event.target),x=rect?rect.x+rect.w/2:this.width/2,y=rect?rect.y+rect.h*.35:this.height*.5;
      if(event.kind==='damage'){
        const state=this.motions.get(event.target)??{};state.hurtAt=r.time;this.motions.set(event.target,state);
        this.floats.push({x:x+(Math.random()-.5)*22,y,text:String(event.amount),color:event.critical?'#ffe292':'#fff6df',start:now});
        if(!casters.has(event.hero)){const hero=event.hero??0,variant=this.swings.get(hero)??0;this.swings.set(hero,(variant+1)%3);this.flashes.push({target:event.target,hero,kind:event.action==='ember'?'fire':event.action==='rime'?'ice':event.action==='storm'?'storm':'steel',start:now,variant});}
      }
      if(event.kind==='cast'&&event.skill!=='mend'&&event.skill!=='bastion'){const targets=event.skill==='ember'?events.filter(e=>e.kind==='damage'&&e.hero===event.hero).map(e=>e.target):[event.target];for(const target of targets)this.flashes.push({target,hero:event.hero??0,kind:event.skill??'magic',start:now,variant:this.swings.get(event.hero??0)??0});}
      if(event.kind==='shield')this.flashes.push({target:0,hero:event.target,kind:'bastion',start:now,variant:0});
      if(event.kind==='heal'&&event.hero!==-1)this.flashes.push({target:0,hero:event.target,kind:'mend',start:now,variant:0});
      if(event.kind==='ward-break'){this.flashes.push({target:event.target,hero:event.hero??0,kind:'ward-break',start:now,variant:0});this.floats.push({x,y,text:'SEAL BROKEN',color:'#9cffee',start:now});}
      if(event.kind==='interrupt')this.floats.push({x,y:y-20,text:'INTERRUPTED',color:'#85f3dc',start:now});
      if(event.kind==='heal'&&event.hero===-1)this.floats.push({x,y,text:`+${event.amount}`,color:'#8cedb5',start:now});
      if(event.kind==='transform'){this.flashes.push({target:event.target,hero:0,kind:'transform',start:now,variant:0});this.motions.set(event.target,{});const e=r.enemies.find(e=>e.id===event.target);if(e)for(const pose of POSES)art(poseAsset(creatureStem(e),pose));}
      if(event.kind==='hero-hit')this.flashes.push({target:event.attacker??r.enemies[0]?.id??0,hero:event.target,kind:(event.amount??0)>0?'hero-hit':'hero-block',start:now,variant:0,heavy:event.impact==='heavy',curse:event.impact==='curse'});
      if(event.kind==='enemy-strike'){const state=this.motions.get(event.target)??{};state.strikeAt=r.time;this.motions.set(event.target,state);}
      if(event.kind==='death'){const state=this.motions.get(event.target)??{};state.deathAt=r.time;state.hurtAt=r.time;this.motions.set(event.target,state);}
    }
    this.floats=this.floats.slice(-20);this.flashes=this.flashes.slice(-14);
  }
  draw(r:Run,now:number){
    const c=this.ctx,w=this.width,h=this.height;if(w<1||h<1)return;
    this.sync(r);
    const arena=r.trip?.mode==='sanctuary'?({lantern:1,glass:3,forge:2,stars:4}[r.trip.id]??1):r.trip?.mode==='abyss'?4:CHAPTERS[chapterIndex(r.wave)]!.arena;
    const bg=art(`arena-${arena}`);c.fillStyle='#173147';c.fillRect(0,0,w,h);
    if(bg.complete&&bg.naturalWidth){const scale=Math.max(w/bg.width,h/bg.height);c.drawImage(bg,(w-bg.width*scale)/2,(h-bg.height*scale)/2,bg.width*scale,bg.height*scale);}
    const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#07172688');shade.addColorStop(.45,'#07172605');shade.addColorStop(1,'#07172677');c.fillStyle=shade;c.fillRect(0,0,w,h);
    const count=r.enemies.length;this.rects=[];
    r.enemies.forEach((e,i)=>{
      const state=this.motions.get(e.id)??{},fade=e.hp<=0?deathOpacity(state,r.time):1;
      const size=count===1?Math.min(w*.76,h*.82):count===2?Math.min(w*.48,h*.68):Math.min(w*.34,h*.60);
      const x=enemyCenter(w,count,i);
      const base=h*(count===3&&i===1?.72:.86),bob=this.motion&&e.hp>0?Math.sin(r.time*1.4+i*2)*1.5:0;
      const stem=creatureStem(e),bounds=CREATURE_BOUNDS[stem]??[.1,.1,.9,.94],top=base-size*(CREATURE_ANCHORS[stem]??.94);
      const rect={id:e.id,x:x-size/2+size*bounds[0],y:top+size*bounds[1],w:size*(bounds[2]-bounds[0]),h:size*(bounds[3]-bounds[1])};this.rects.push(rect);
      if(fade<=0)return;
      c.save();c.globalAlpha=fade;
      const chosen=e.id===r.target&&e.hp>0;
      c.fillStyle=chosen?'#79f0ce55':'#07162644';c.beginPath();c.ellipse(x,base-1,size*.35,size*.055,0,0,Math.PI*2);c.fill();
      if(chosen){c.strokeStyle='#a3ffe0bb';c.lineWidth=1.5;c.stroke();}
      const pose=creaturePose(e,state,r.time,this.motion);
      let sprite=art(poseAsset(stem,pose));if(!sprite.complete||!sprite.naturalWidth)sprite=art(stem);
      if(sprite.complete&&sprite.naturalWidth){
        const scale=size/Math.max(sprite.width,sprite.height),dw=sprite.width*scale,dh=sprite.height*scale;
        const breathe=this.motion&&pose.startsWith('idle')?1+Math.sin(r.time*1.1+i)*.006:1;
        const recoil=this.motion&&pose==='hurt'&&e.hp>0?Math.sin(Math.min(1,(r.time-(state.hurtAt??r.time))/.19)*Math.PI)*size*.025:0;
        c.translate(x+recoil,base+bob);c.scale(breathe,breathe);c.drawImage(sprite,-dw/2,-dh*(CREATURE_ANCHORS[stem]??.94),dw,dh);c.setTransform(Math.min(2,window.devicePixelRatio||1),0,0,Math.min(2,window.devicePixelRatio||1),0,0);
      }
      if(e.hp>0){
        const barWidth=enemyMeterWidth(w,count),barY=Math.max(e.boss?58:36,rect.y-10);
        this.label(e,x,barY,barWidth,chosen,r);
      }
      c.restore();
    });
    this.effects(now,r);
    if(r.phase==='transition'&&r.enemies.every(e=>e.hp<=0)){
      c.fillStyle='#fff6db';c.font='600 12px system-ui';c.textAlign='center';c.fillText('PATH CLEARED',w/2,h*.48);
    }
  }
  label(e:Enemy,x:number,y:number,w:number,selected:boolean,r:Run){
    const c=this.ctx;
    c.textAlign='center';c.font=`600 ${e.boss?14:11}px system-ui`;c.lineWidth=3;c.strokeStyle='#0b1a2dee';c.fillStyle=selected?'#fff3c5':'#f2f5ef';
    const name=fitLabel(e.name,w-4,text=>c.measureText(text).width);c.strokeText(name,x,y-7);c.fillText(name,x,y-7);
    c.fillStyle='#112338ee';this.round(x-w/2,y,w,6,3);c.fill();c.fillStyle=e.boss?'#edb476':selected?'#90dfad':'#c3d6cc';this.round(x-w/2,y,w*Math.max(0,e.hp/e.maxHp),6,3);c.fill();
    if(e.chapterBoss){c.fillStyle='#101f2dcc';for(let i=1;i<bossPhases(r.trip?.wave??r.wave).length;i++)c.fillRect(x-w/2+w*i/bossPhases(r.trip?.wave??r.wave).length-1,y,2,6);}
    if(e.preparation>0){
      c.fillStyle='#1a1428ee';this.round(x-w/2,y+11,w,16,3);c.fill();c.fillStyle=e.intent==='heal'?'#a7edbd':'#ffd79a';c.font='700 9px system-ui';c.fillText(`${e.intent==='heal'?'MENDING':e.intent==='curse'?'CURSE':e.intent==='strike'?'STRIKE':'HEAVY BLOW'} · ${e.preparation.toFixed(1)}s`,x,y+22,w-8);
    }else{
      c.font='600 8px system-ui';c.fillStyle='#f2f6e9';c.strokeStyle='#0b1a2d';c.lineWidth=3;
      const status=e.ward?`SEAL: ${MODE_INFO[e.ward].name.toUpperCase()}`:e.exposedUntil>r.time?'EXPOSED':e.markedUntil>r.time?'MARKED':e.chapterBoss?`FORM ${e.form} / 2`:e.boss?'WARDEN':e.role==='guard'&&r.enemies.some(a=>a.id!==e.id&&a.hp>0)?'PROTECTING':`WEAK: ${FOES[e.family]!.weakness.toUpperCase()}`;
      c.strokeText(status,x,y+20,w-4);c.fillText(status,x,y+20,w-4);
    }
  }
  effects(now:number,r:Run){
    const c=this.ctx,w=this.width,h=this.height;
    this.flashes=this.flashes.filter(f=>now-f.start<760);
    for(const f of this.flashes){
      if(f.kind==='transform'){const p=(now-f.start)/650;c.save();c.fillStyle='#d0b0ff';c.globalAlpha=Math.max(0,1-p)*.35;c.fillRect(0,0,w,h);c.restore();continue;}
      const rect=this.rects.find(a=>a.id===f.target)??{x:w*.35,y:h*.5,w:w*.3,h:h*.3};
      drawCombatFlash(c,f,rect,w,h,now,this.motion);
    }
    this.floats=this.floats.filter(f=>now-f.start<820);
    for(const f of this.floats){const p=(now-f.start)/820;c.save();c.globalAlpha=1-p;c.font=`800 ${f.text.length>5?11:21}px system-ui`;c.textAlign='center';c.lineWidth=3;c.strokeStyle='#122334';c.strokeText(f.text,f.x,f.y-p*30);c.fillStyle=f.color;c.fillText(f.text,f.x,f.y-p*30);c.restore();}
    if(this.motion){c.fillStyle='#f9edc788';for(let i=0;i<6;i++){const x=((i*.173+now*.000008)%1)*w,y=((i*.249-now*.000013)%1+1)%1*h;c.globalAlpha=.3+Math.sin(now/800+i)*.2;c.beginPath();c.arc(x,y,1.2,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
    void r;
  }
  round(x:number,y:number,w:number,h:number,r:number){this.ctx.beginPath();this.ctx.roundRect(x,y,Math.max(0,w),h,r);}
}
