import type {CombatEvent} from './engine.ts';
export function hitFeedback(amount:number,absorbed:number,impact:string,maxHp:number){
 const blocked=amount<=0,strong=!blocked&&(impact==='heavy'||amount/Math.max(1,maxHp)>=.18);
 return {blocked,strong,label:blocked?'BLOCKED':`−${Math.ceil(amount)}`,detail:blocked?'SHIELD':impact==='curse'?'CURSE':strong?'HEAVY HIT':absorbed>0?'PARTLY BLOCKED':'HIT'};
}
/** Several monsters may connect in one fixed-step batch: show the total loss once. */
export function combineHeroHits(events:CombatEvent[]):CombatEvent[]{
 const hits=new Map<number,CombatEvent>();
 for(const event of events){if(event.kind!=='hero-hit')continue;const previous=hits.get(event.target);
  if(!previous)hits.set(event.target,{...event});
  else{previous.amount=(previous.amount??0)+(event.amount??0);previous.absorbed=(previous.absorbed??0)+(event.absorbed??0);if(event.impact==='heavy'||event.impact==='curse'&&previous.impact!=='heavy')previous.impact=event.impact;}
 }
 return [...hits.values()];
}
const active=new WeakMap<HTMLElement,{timer:number;animations:Animation[]}>();
/** Contact effects stay visible without motion; only the short recoil is optional. */
export function showHeroHit(event:CombatEvent,maxHp:number,motion:boolean){
 const panel=document.getElementById(`hero-${event.target}`);if(!panel)return;
 const previous=active.get(panel);if(previous){window.clearTimeout(previous.timer);previous.animations.forEach(a=>a.cancel());}
 const feedback=hitFeedback(event.amount??0,event.absorbed??0,event.impact??'strike',maxHp);
 let label=panel.querySelector<HTMLSpanElement>('.hero-impact');if(!label){label=document.createElement('span');label.className='hero-impact';label.setAttribute('aria-hidden','true');label.innerHTML='<b></b><small></small>';panel.append(label);}
 label.querySelector('b')!.textContent=feedback.label;label.querySelector('small')!.textContent=feedback.detail;
 panel.classList.add('taking-hit');panel.classList.toggle('blocked-hit',feedback.blocked);panel.classList.toggle('strong-hit',feedback.strong);panel.classList.toggle('curse-hit',event.impact==='curse'&&!feedback.blocked);
 const animations:Animation[]=[];
 if(motion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const recoil=feedback.blocked?1:feedback.strong?4:2;
  animations.push(panel.animate([{transform:'translateX(0)'},{transform:`translateX(${-recoil}px)`,offset:.2},{transform:`translateX(${recoil}px)`,offset:.45},{transform:'translateX(0)'}],{duration:260,easing:'ease-out'}));
  animations.push(label.animate([{transform:'translateY(5px)',opacity:1},{transform:'translateY(-7px)',opacity:1,offset:.7},{transform:'translateY(-10px)',opacity:0}],{duration:950,easing:'ease-out'}));
 }
 const timer=window.setTimeout(()=>{panel.classList.remove('taking-hit','blocked-hit','strong-hit','curse-hit');animations.forEach(a=>a.cancel());active.delete(panel);},950);
 active.set(panel,{timer,animations});
}
