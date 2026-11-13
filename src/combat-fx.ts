export interface EffectBox {x:number;y:number;w:number;h:number;}
export interface CombatFlash {target:number;hero:number;kind:string;start:number;variant:number;targets?:number[];}
export function impactPoint(box:EffectBox){return{x:box.x+box.w*.5,y:box.y+box.h*.46};}
export function swordEndpoints(box:EffectBox,variant:number){
 const {x,y}=impactPoint(box),rx=Math.max(14,box.w*.42),ry=Math.max(13,box.h*.24);
 return variant%3===0?{ax:x-rx,ay:y+ry,bx:x+rx,by:y-ry}:variant%3===1?{ax:x+rx,ay:y+ry,bx:x-rx,by:y-ry}:{ax:x-rx,ay:y-ry*.15,bx:x+rx,by:y+ry*.15};
}
function glow(c:CanvasRenderingContext2D,color:string,width:number,path:()=>void){c.strokeStyle=color;c.lineWidth=width;path();c.stroke();c.strokeStyle='#fff9e8';c.lineWidth=Math.max(1,width*.27);path();c.stroke();}
function particles(c:CanvasRenderingContext2D,x:number,y:number,r:number,p:number,color:string,seed:number,count=12){c.fillStyle=color;for(let i=0;i<count;i++){const a=i*2.399+seed,d=r*(.15+p*.9)*(0.5+(i%5)/6);c.globalAlpha=(1-p)*(.6+(i%3)*.15);c.beginPath();c.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,Math.max(.8,(1-p)*(1+i%3)),0,Math.PI*2);c.fill();}}
function slash(c:CanvasRenderingContext2D,b:EffectBox,v:number,p:number,color:string){
 const e=swordEndpoints(b,v),x=(e.ax+e.bx)/2,y=(e.ay+e.by)/2;
 const sweep=Math.min(1,p*3);glow(c,color,Math.max(5,b.w*.045),()=>{c.beginPath();c.moveTo(e.ax,e.ay);c.quadraticCurveTo(x,y-b.h*.16,e.ax+(e.bx-e.ax)*sweep,e.ay+(e.by-e.ay)*sweep);});
 c.fillStyle='#fff8cc';c.beginPath();c.arc(x,y,Math.max(2,7*(1-p)),0,Math.PI*2);c.fill();
}
/** Procedural action art, centered on the visible body rather than transparent sprite padding. */
export function drawCombatFlash(c:CanvasRenderingContext2D,f:CombatFlash,box:EffectBox,width:number,height:number,now:number,motion=true){
 const duration=['steel','mark'].includes(f.kind)?380:720,p=Math.min(1,(now-f.start)/duration),{x,y}=impactPoint(box),r=Math.max(24,Math.min(box.w,box.h)*.42);
 if(p>=1)return;c.save();c.globalAlpha=Math.min(1,(1-p)*1.6);c.lineCap='round';
 const t=motion?p:.55;
 if(['steel','sunder','execute'].includes(f.kind)){
  slash(c,box,f.variant,t,f.kind==='execute'?'#81f4bd':f.kind==='sunder'?'#ffbc72':'#e2f2ff');
  if(f.kind==='execute')slash(c,box,(f.variant+1)%3,Math.min(1,t+.12),'#b6fff0');
  if(motion)particles(c,x,y,r,t,'#ffe3a1',f.variant,10);
 }else if(['ember','fire'].includes(f.kind)){
  const travel=Math.min(1,t*3.5),sx=width*(f.hero===0?.22:.78),sy=height+15,px=sx+(x-sx)*travel,py=sy+(y-sy)*travel;
  if(travel<1){c.strokeStyle='#ff7943';c.lineWidth=7;c.beginPath();c.moveTo(px-(x-sx)*.12,py-(y-sy)*.12);c.lineTo(px,py);c.stroke();}
  const size=travel<1?9:r*(.25+Math.max(0,t-.25)*1.5);const g=c.createRadialGradient(px,py,1,px,py,size);g.addColorStop(0,'#fff2a1');g.addColorStop(.35,'#ffb13c');g.addColorStop(.7,'#fa6639bb');g.addColorStop(1,'#ff482500');c.fillStyle=g;c.beginPath();c.arc(px,py,size,0,Math.PI*2);c.fill();if(motion&&travel===1)particles(c,x,y,r*1.5,t,'#ffb04a',f.hero,18);
 }else if(['rime','ice'].includes(f.kind)){
  for(let i=0;i<5;i++){const a=i*1.256+.3,spread=r*(.15+t*.55),cx=x+Math.cos(a)*spread,cy=y+Math.sin(a)*spread;c.save();c.translate(cx,cy);c.rotate(a+.8);c.fillStyle=i%2?'#d9ffff':'#62c5ef';c.strokeStyle='#efffff';c.lineWidth=1;c.beginPath();c.moveTo(0,-r*.6);c.lineTo(r*.13,0);c.lineTo(0,r*.3);c.lineTo(-r*.13,0);c.closePath();c.fill();c.stroke();c.restore();}if(motion)particles(c,x,y,r,t,'#a9f7ff',4,10);
 }else if(['storm','magic','verdict'].includes(f.kind)){
  const color=f.kind==='verdict'?'#ffe18c':'#ccadff';glow(c,color,5,()=>{c.beginPath();c.moveTo(x-10,Math.max(0,y-r*1.4));for(let i=1;i<=7;i++)c.lineTo(x+Math.sin(i*2.7+f.variant)*r*.21,y-r*1.4+i*r*.22);c.lineTo(x,y+r*.3);});
  c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(x,y+r*.15,r*(.4+t*.65),r*.18,0,0,Math.PI*2);c.stroke();if(motion)particles(c,x,y,r,t,color,8,15);
 }else if(f.kind==='mark'){
  c.strokeStyle='#b1ffbf';c.lineWidth=3;c.beginPath();c.arc(x,y,r*.65,0,Math.PI*2);c.moveTo(x-r,y);c.lineTo(x+r,y);c.moveTo(x,y-r);c.lineTo(x,y+r);c.stroke();
 }else if(f.kind==='mend'||f.kind==='bastion'){
  const ax=width*(f.hero===0?.25:.75),ay=height*.91,color=f.kind==='mend'?'#91ffd0':'#ffdf9e';
  const g=c.createRadialGradient(ax,ay,0,ax,ay,r*1.7);g.addColorStop(0,color+'99');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(ax-r*1.7,ay-r*1.7,r*3.4,r*3.4);
  c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.ellipse(ax,ay,r*(.9+t*.4),r*(f.kind==='bastion'?1.5:.4),0,Math.PI,Math.PI*2);c.stroke();
  if(f.kind==='mend'){c.lineWidth=4;for(let i=0;i<5;i++){const cx=ax+(i-2)*r*.35,cy=ay-r*(t+i*.13);c.beginPath();c.moveTo(cx-4,cy);c.lineTo(cx+4,cy);c.moveTo(cx,cy-4);c.lineTo(cx,cy+4);c.stroke();}}
 }else if(f.kind==='ward-break'){
  c.strokeStyle='#9dfff0';c.lineWidth=3;for(let i=0;i<8;i++){const a=i*Math.PI/4,d=r*(.4+t);c.beginPath();c.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);c.lineTo(x+Math.cos(a)*(d+12),y+Math.sin(a)*(d+12));c.stroke();}
 }
 c.restore();
}
