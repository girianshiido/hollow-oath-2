/** Small fixed particle field; no large textures or allocations per frame. */
export class TitleAtmosphere {
  ctx:CanvasRenderingContext2D;observer:ResizeObserver;width=390;height=844;motion=true;last=0;
  particles=Array.from({length:30},(_,i)=>({x:(i*.6180339)%1,y:(i*.381966)%1,size:1+(i%4)*.45,speed:.009+(i%5)*.002,phase:i*1.9}));
  constructor(public canvas:HTMLCanvasElement){this.ctx=canvas.getContext('2d')!;this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();}
  resize(){const b=this.canvas.getBoundingClientRect(),dpr=Math.min(1.5,window.devicePixelRatio||1);this.width=b.width;this.height=b.height;this.canvas.width=Math.round(b.width*dpr);this.canvas.height=Math.round(b.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}
  dispose(){this.observer.disconnect();}
  draw(now:number){if(now-this.last<33)return;this.last=now;const c=this.ctx,w=this.width,h=this.height,t=now/1000;c.clearRect(0,0,w,h);if(!this.motion||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    c.save();c.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){const sway=Math.sin(t*.13+i)*w*.035,x=w*(.25+i*.25)+sway;c.fillStyle=`rgba(139,226,220,${.025+Math.sin(t*.17+i)*.01})`;c.beginPath();c.moveTo(x,0);c.lineTo(x+w*.12,h*.72);c.lineTo(x-w*.10,h*.72);c.closePath();c.fill();}
    for(const p of this.particles){const x=(p.x+Math.sin(t*.3+p.phase)*.035)*w,y=((p.y-t*p.speed)%1+1)%1*h,alpha=.22+(Math.sin(t*1.4+p.phase)+1)*.23;c.globalAlpha=alpha;c.fillStyle=p.phase%3<1?'#8cece0':'#ffe4a6';c.beginPath();c.arc(x,y,p.size,0,Math.PI*2);c.fill();if(p.size>2){c.globalAlpha=alpha*.35;c.beginPath();c.arc(x,y,p.size*2.8,0,Math.PI*2);c.fill();}}
    c.globalAlpha=.3;for(let i=0;i<3;i++){const x=w*(.2+i*.3),y=h*(.12+i*.09),a=Math.max(0,Math.sin(t*.8+i*2));c.strokeStyle=`rgba(255,231,171,${a})`;c.lineWidth=1;c.beginPath();c.moveTo(x-4*a,y);c.lineTo(x+4*a,y);c.moveTo(x,y-4*a);c.lineTo(x,y+4*a);c.stroke();}c.restore();
  }
}
