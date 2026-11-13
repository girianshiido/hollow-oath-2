import {newRun,tick,cast,stats,recruit,resume,buyGear,buySkill,gearCost,upgradeCost,setMode} from '../src/engine.ts';
import {CLASS_IDS} from '../src/content.ts';
export function prepare(r){
 let changed=true;
 while(changed){changed=false;const options=r.heroes.flatMap((h,i)=>['weapon','armor','focus'].map(slot=>({i,slot,rank:h[slot],cost:gearCost(h,slot),priority:h[slot]+(slot==='focus'?1:slot==='armor'?.2:0)}))).filter(o=>o.rank<32&&o.cost<=r.gold).sort((a,b)=>a.priority-b.priority);
  if(options[0]){buyGear(r,options[0].i,options[0].slot);changed=true;}
 }
 for(let tries=0;tries<12;tries++){const choices=r.heroes.flatMap((h,i)=>[0,1].map(index=>({i,index,level:h.skills[index],cost:upgradeCost(h,index)}))).filter(o=>o.level<6&&o.cost<=r.essence).sort((a,b)=>a.level-b.level);if(!choices[0])break;buySkill(r,choices[0].i,choices[0].index);}
}
export function tactics(r){
 const living=r.enemies.filter(e=>e.hp>0);const priority=living.find(e=>e.role==='healer')??living.find(e=>e.preparation>0)??living.find(e=>e.role!=='guard')??living[0];if(priority)r.target=priority.id;
 const breaker=priority?.ward?r.heroes.findIndex(h=>h.hp>0&&h.mp>=8):-1;
 for(let i=0;i<r.heroes.length;i++){const h=r.heroes[i];if(h.hp<=0)continue;const s=stats(h);if(h.hp/s.hp<.55&&h.mp>=8)setMode(r,i,'mend');else if(i===breaker&&priority.ward)setMode(r,i,priority.ward);else if(h.mode==='mend'&&h.hp<s.hp*.92&&h.mp>=8){}else if(h.classId==='hexweaver'&&h.mp>s.mp*.7)setMode(r,i,'ember');else setMode(r,i,'steel');}

 for(let i=0;i<r.heroes.length;i++){
  const h=r.heroes[i];if(h.hp<=0)continue;const low=r.heroes.some(a=>a.hp>0&&a.hp/stats(a).hp<.68),prep=priority?.preparation>0;
  if(h.classId==='vanguard'){if(prep||h.mp>stats(h).mp*.6)cast(r,i,0);if(prep&&r.heroes.some(a=>a.hp>0&&a.shield<10))cast(r,i,1);}
  if(h.classId==='hexweaver'){if(prep)cast(r,i,1);if(living.length>1||h.mp>stats(h).mp*.65)cast(r,i,0);}
  if(h.classId==='nightblade'){if(h.mp>12||prep)cast(r,i,0);if(priority&&(priority.markedUntil>r.time||priority.hp/priority.maxHp<.4))cast(r,i,1);}
  if(h.classId==='oathkeeper'){if(low)cast(r,i,0);if(prep||h.mp>stats(h).mp*.8)cast(r,i,1);}
 }
}
export function simulate(first,second){
 const r=newRun(first);let ticks=0;
 while(r.phase!=='complete'&&ticks++<150000&&r.deaths<180){
  if(r.phase==='recruit')recruit(r,second);
  else if(r.phase==='camp'||r.phase==='defeat'){prepare(r);resume(r);}
  else{tactics(r);tick(r,.25);}
 }
 return {first,second,completed:r.phase==='complete',wave:r.wave,deaths:r.deaths,minutes:+(r.time/60).toFixed(1),level:r.heroes[0].level,kills:r.kills,weapon:r.heroes.map(h=>h.weapon),gold:r.gold};
}
if(process.argv[1]?.endsWith('simulate.mjs')){
 const result=[];for(const first of CLASS_IDS)for(const second of CLASS_IDS)if(first!==second)result.push(simulate(first,second));console.table(result);if(result.some(r=>!r.completed))process.exitCode=1;
}
