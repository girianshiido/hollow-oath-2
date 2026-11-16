import {modeCost,magicLevel,magicPower,magicUpgradeCost} from './magic.ts';
import {chapterEndurance,bossPhases,bossWard,bossMove,bossForm,bossPhase} from './bosses.ts';
import {CLASSES,CLASS_IDS,SKILLS,FOES,CHAPTERS,SANCTUARIES,ABYSS_RULES,chapterIndex,COMBAT_MODES,MAGIC_MODES,MAX_MAGIC_LEVEL,foeUnlockWave} from './content.ts';
import type {ClassId,SkillId,EnemyRole,CombatMode,MagicMode} from './content.ts';

export interface Hero {
  classId:ClassId; name:string; level:number; xp:number; hp:number; mp:number;
  weapon:number; armor:number; focus:number; skills:[number,number]; cooldowns:[number,number];
  clock:number; shield:number; shieldUntil:number; tauntUntil:number;mode?:CombatMode;magic?:Record<MagicMode,number>;
}
export interface Enemy {
  id:number; family:number; name:string; role:EnemyRole; hp:number; maxHp:number; atk:number; armor:number; speed:number;
  clock:number; attacks:number; preparation:number; intent:'strike'|'heavy'|'heal'|'curse';
  exposedUntil:number; markedUntil:number; slowUntil:number; burnUntil:number; healSpent:number;
  boss:boolean; chapterBoss:boolean; form:1|2; formName:string; art:string;ward?:Exclude<CombatMode,'mend'>;stage?:number;
}
export type Phase='fight'|'transition'|'camp'|'recruit'|'complete'|'expedition-clear'|'defeat';
export type Mode='campaign'|'sanctuary'|'abyss'|'contract';
export interface Trip {mode:Exclude<Mode,'campaign'>;id:string;wave:number;cursor:number;floor:number;rule:'swarm'|'silence'|'fury';bankGold:number;bankEssence:number;}
export interface Run {
  id:string;name:string;created:number;heroes:Hero[];wave:number;cursor:number;cleared:number;
  gold:number;essence:number;deaths:number;kills:number;time:number;phase:Phase;enemies:Enemy[];target:number|null;
  transition:number;trip:Trip|null;relics:string[];relic:string|null;sanctuaries:string[];abyssBest:number;
  contracts:string[];interrupts:number;totalGold:number;log:string[];bossScene?:{kind:'entrance'|'shift';remaining:number;duration:number};
}
export interface CombatEvent {kind:'damage'|'heal'|'shield'|'cast'|'death'|'transform'|'reward'|'interrupt'|'hero-hit'|'enemy-strike'|'ward-break'|'boss-phase';target:number;amount?:number;hero?:number;skill?:SkillId;critical?:boolean;action?:CombatMode;attacker?:number;impact?:'strike'|'heavy'|'curse';absorbed?:number;}
export interface Stats {hp:number;mp:number;atk:number;armor:number;speed:number;regen:number;}
export const xpGoal=(level:number)=>Math.round(45+level*19+level**1.5*6);
export function stats(h:Hero):Stats {
  const c=CLASSES[h.classId], l=h.level-1;
  return {hp:c.hp+l*(h.classId==='vanguard'?13:10)+(h.armor-1)*15,
    mp:c.mp+l*.7+(h.focus-1)*2,atk:c.atk+l*(h.classId==='hexweaver'?3.5:2.8)+(h.weapon-1)*5+(h.focus-1)*(c.magic?1.4:.4),
    armor:c.armor+l*.72+(h.armor-1)*2.4,speed:c.speed+Math.min(.35,l*.008),regen:(.85+l*.022+(h.focus-1)*.045)*(h.classId==='hexweaver'?1.15:1)};
}
export function newHero(classId:ClassId,level=1):Hero {
  const h:Hero={classId,name:CLASSES[classId].person,level,xp:0,hp:0,mp:0,weapon:1,armor:1,focus:1,skills:[1,1],cooldowns:[0,0],clock:0,shield:0,shieldUntil:0,tauntUntil:0,mode:'steel',magic:{ember:1,rime:1,storm:1,mend:1}};
  const s=stats(h);h.hp=s.hp;h.mp=s.mp;return h;
}
export function newRun(classId:ClassId,name?:string):Run {
  const run:Run={id:globalThis.crypto?.randomUUID?.()??`oath-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:(name?.trim().slice(0,24)||CLASSES[classId].person),created:Date.now(),heroes:[newHero(classId)],wave:1,cursor:0,cleared:0,gold:0,essence:0,deaths:0,kills:0,time:0,phase:'fight',enemies:[],target:null,transition:0,trip:null,relics:[],relic:null,sanctuaries:[],abyssBest:0,contracts:[],interrupts:0,totalGold:0,log:[]};
  run.heroes[0]!.name=run.name;spawnGroup(run);return run;
}
export const mode=(r:Run):Mode=>r.trip?.mode??'campaign';
export const cursor=(r:Run)=>r.trip?.cursor??r.cursor;
export const effectiveWave=(r:Run)=>r.trip?.wave??r.wave;
export function skillCost(h:Hero,index:number){return SKILLS[CLASSES[h.classId].skills[index] as SkillId].cost+Math.floor((h.skills[index]!-1)/3);}
export const gearCost=(h:Hero,slot:'weapon'|'armor'|'focus')=>Math.round((slot==='weapon'?70:slot==='armor'?60:65)*h[slot]**1.35);
export const upgradeCost=(h:Hero,index:number)=>4+(h.skills[index]!-1)*3;
export const canPrepare=(r:Run)=>['camp','defeat','expedition-clear','complete'].includes(r.phase);
function note(r:Run,message:string){r.log.unshift(message);r.log=r.log.slice(0,12);}
function reward(r:Run,gold:number,essence=0){r.gold+=gold;r.totalGold+=gold;r.essence+=essence;}
function enemyAt(wave:number,family:number,id:number,boss=false,chapter=false,floor=0):Enemy {
  const f=FOES[family%FOES.length]!,scale=(1+.30*Math.max(0,wave-1)**1.22)*(1+floor*.055);
  const guard=f.role==='guard',swift=f.role==='swift';
  const chapterId=chapterIndex(wave),c=CHAPTERS[chapterId]!;
  const pressure=1+Math.min(.50,Math.max(0,wave-1)*.025);
  const hp=Math.round((boss?(chapter?230*chapterEndurance(wave):230):(guard?58:swift?39:49))*scale*pressure);
  return {id,family:family%FOES.length,name:boss?(chapter?c.boss:`${CHAPTERS[chapterId]!.short} Warden`):f.name,role:boss?'striker':f.role,
    hp,maxHp:hp,atk:(boss?(chapter?31:25):swift?11:guard?15:14)*scale**.87,armor:(boss?6:guard?9:3)*scale**.65,
    speed:boss?.85:swift?1.12:guard?.57:.73,clock:0,attacks:0,preparation:0,intent:'strike',exposedUntil:0,markedUntil:0,slowUntil:0,burnUntil:0,healSpent:0,
    boss,chapterBoss:chapter,...(chapter?{stage:1}:{}),form:1,formName:chapter?c.form:'Unbound',art:boss?`boss-${chapterId+1}`:`foe-${family%FOES.length+1}`};
}
export function spawnGroup(r:Run){
  const wave=effectiveWave(r),n=cursor(r),boss=n===31;
  const group=boss?1:Math.min(31-n,r.trip?.rule==='swarm'?3:wave===1?(n<10?1:2):wave<5?(n%5===0?2:1):1+(Math.floor(n/3)+wave)%3);
  r.enemies=Array.from({length:group},(_,i)=>{
    // Early fights introduce roles individually. Later groups deliberately mix them.
    const available=FOES.map((_,index)=>index).filter(index=>foeUnlockWave(index)<=wave);
    const arrival=wave%2===0&&wave<=32?31+wave/2:undefined;
    const family=arrival!==undefined&&n===0&&i===0?arrival:wave===1&&n<5?[0,2,4,1,3][n]!:available[((n+i)*7+(wave-1)*11)%available.length]!;
    const e=enemyAt(wave,family,n+i,boss,boss&&(r.trip!==null||wave%4===0),r.trip?.mode==='abyss'?r.trip.floor:0);
    if(r.trip?.rule==='fury')e.atk*=1.12;
    if(e.chapterBoss)e.ward=bossWard(wave,1);else if(wave>=2&&!boss&&[7,15,23].includes(n+i))e.ward=(['steel','ember','rime','storm'] as const)[(wave+n+i)%4];
    return e;
  });
  r.target=r.enemies[0]!.id;r.phase='fight';r.transition=0;
  if(r.enemies[0]?.chapterBoss)r.bossScene={kind:'entrance',remaining:3.2,duration:3.2};else delete r.bossScene;
  for(const h of r.heroes)h.clock=Math.min(.65,h.clock);
}
export function recruit(r:Run,id:ClassId):boolean {
  if(r.phase!=='recruit'||r.heroes.length!==1||!CLASS_IDS.includes(id)||r.heroes[0]!.classId===id)return false;
  const leader=r.heroes[0]!,h=newHero(id,leader.level);
  h.weapon=leader.weapon;h.armor=leader.armor;h.focus=leader.focus;const s=stats(h);h.hp=s.hp;h.mp=s.mp;
  r.heroes.push(h);r.phase='camp';note(r,`${h.name}, the ${CLASSES[id].name}, joined your oath.`);return true;
}
export function buyGear(r:Run,hero:number,slot:'weapon'|'armor'|'focus'):boolean {
  const h=r.heroes[hero];if(!h||!canPrepare(r)||h[slot]>=32)return false;
  const cost=gearCost(h,slot);if(r.gold<cost)return false;r.gold-=cost;h[slot]++;
  const s=stats(h);h.hp=Math.min(s.hp,h.hp+(slot==='armor'?15:0));h.mp=Math.min(s.mp,h.mp+(slot==='focus'?2:0));return true;
}
export function buySkill(r:Run,hero:number,index:number):boolean{
  const h=r.heroes[hero];if(!h||!canPrepare(r)||(index!==0&&index!==1)||h.skills[index]!>=6)return false;
  const cost=upgradeCost(h,index);if(r.essence<cost)return false;r.essence-=cost;h.skills[index]!++;return true;
}
export function buyMagic(r:Run,hero:number,mode:MagicMode):boolean{
  const h=r.heroes[hero];if(!h||!canPrepare(r)||!MAGIC_MODES.includes(mode)||magicLevel(h,mode)>=MAX_MAGIC_LEVEL)return false;
  const cost=magicUpgradeCost(h,mode);if(r.essence<cost)return false;
  r.essence-=cost;h.magic??={ember:1,rime:1,storm:1,mend:1};h.magic[mode]=magicLevel(h,mode)+1;return true;
}
function refill(r:Run){for(const h of r.heroes){const s=stats(h);h.hp=s.hp;h.mp=s.mp;h.clock=0;h.cooldowns=[0,0];h.shield=0;h.shieldUntil=0;h.tauntUntil=0;}}
export function resume(r:Run):boolean {
  if(!canPrepare(r)||r.phase==='complete')return false;
  if(r.heroes.length===1&&r.cleared>=4){r.phase='recruit';return true;}
  if(r.trip&&r.phase==='expedition-clear')return false;
  if(r.trip)r.trip.cursor=0;else r.cursor=0;
  refill(r);spawnGroup(r);return true;
}
export function retreat(r:Run):boolean {
  if(!['fight','transition','defeat','expedition-clear'].includes(r.phase))return false;
  if(r.trip){r.trip=null;}r.enemies=[];r.target=null;r.cursor=0;
  r.phase=r.cleared>=32?'complete':r.heroes.length===1&&r.cleared>=4?'recruit':'camp';
  delete r.bossScene;refill(r);note(r,'Returned to camp. Earned gold, essence and experience are safe.');return true;
}
export function enterExpedition(r:Run,id:string,day=dayKey()):boolean{
  if(!canPrepare(r)||r.heroes.length<2)return false;
  if(id==='abyss')r.trip={mode:'abyss',id, wave:6,cursor:0,floor:1,rule:'swarm',bankGold:0,bankEssence:0};
  else if(id==='contract'){
    const index=contractNumber(day);r.trip={mode:'contract',id:day,wave:6+index%8,cursor:0,floor:1,rule:ABYSS_RULES[index%3]!,bankGold:0,bankEssence:0};
  }else{
    const s=SANCTUARIES.find(s=>s.id===id);if(!s||r.cleared<s.unlock)return false;
    r.trip={mode:'sanctuary',id:s.id,wave:s.wave,cursor:0,floor:1,rule:s.rule,bankGold:0,bankEssence:0};
  }
  refill(r);spawnGroup(r);return true;
}
export function nextDepth(r:Run):boolean{
  if(r.trip?.mode!=='abyss'||r.phase!=='expedition-clear')return false;
  r.trip.floor++;r.trip.wave=4+2*r.trip.floor;r.trip.cursor=0;r.trip.rule=ABYSS_RULES[(r.trip.floor-1)%3]!;
  // Endurance matters: modest recovery rather than a full refill.
  for(const h of r.heroes){const s=stats(h);h.hp=Math.min(s.hp,h.hp+s.hp*.35);h.mp=Math.min(s.mp,h.mp+s.mp*.35);h.cooldowns=[0,0];}
  spawnGroup(r);return true;
}
export function dayKey(date=new Date()){return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;}
export function contractNumber(day:string){let n=2166136261;for(const char of day)n=Math.imul(n^char.charCodeAt(0),16777619);return n>>>0;}
export const contractRule=(day:string)=>ABYSS_RULES[contractNumber(day)%3]!;
function alive(r:Run){return r.enemies.filter(e=>e.hp>0);}
function target(r:Run){return r.enemies.find(e=>e.hp>0&&e.id===r.target)??alive(r)[0];}
export function setMode(r:Run,index:number,mode:CombatMode):boolean{
  const h=r.heroes[index];if(!h||h.hp<=0||!COMBAT_MODES.includes(mode)||!['fight','transition'].includes(r.phase))return false;
  h.mode=mode;return true;
}
export function finishBossScene(r:Run){if(!r.bossScene)return false;delete r.bossScene;return true;}
export function currentBossStage(r:Run,e:Enemy){const count=bossPhases(effectiveWave(r)).length;return e.stage??Math.min(count,Math.max(e.form===2?Math.floor(count/2)+1:1,Math.floor((1-e.hp/e.maxHp)*count)+1));}
function hurtEnemy(r:Run,e:Enemy,raw:number,element:'physical'|'fire'|'ice'|'light',events:CombatEvent[],hero?:number){
  if(e.hp<=0)return;
  const weakness=FOES[e.family]!.weakness;
  let power=raw;
  if(e.ward){const action=element==='physical'?'steel':element==='fire'?'ember':element==='ice'?'rime':'storm';if(action===e.ward){delete e.ward;events.push({kind:'ward-break',target:e.id,hero});}else power*=.18;}
  if(!e.boss){if(weakness===element)power*=1.4;if(e.family===2&&element==='fire')power*=.45;}
  else if(e.chapterBoss){const ch=chapterIndex(effectiveWave(r));if(ch===1&&element==='fire')power*=.45;if(ch===1&&element==='ice'||ch===3&&element==='fire')power*=1.4;}
  if(r.time<e.exposedUntil)power*=1.35;if(r.time<e.markedUntil)power*=1.30;
  if(element==='physical'&&r.relic==='forge')power*=1.12;
  if(alive(r).some(g=>g.id!==e.id&&g.role==='guard'))power*=.65;
  const damage=Math.max(1,Math.round(power-(element==='light'?0:e.armor*(element==='physical'?1:.45))));
  const stage=currentBossStage(r,e),count=bossPhases(effectiveWave(r)).length;
  const boundary=e.chapterBoss&&stage<count?Math.min(e.hp,Math.ceil(e.maxHp*(count-stage)/count)):0;
  const previousHp=e.hp;e.hp=Math.max(boundary,e.hp-damage);events.push({kind:'damage',target:e.id,amount:Math.round(previousHp-e.hp),hero,critical:r.time<e.markedUntil||r.time<e.exposedUntil});
  if(e.hp<=0){
    events.push({kind:'death',target:e.id});r.kills++;
    const wave=effectiveWave(r),xp=Math.round((e.boss?75:8)*(1+wave*.22)),gold=Math.round((e.boss?55:8)*(1+wave*.18));
    reward(r,gold,e.boss?3:(e.id%9===7?1:0));
    for(const h of r.heroes){h.xp+=xp;while(h.level<99&&h.xp>=xpGoal(h.level)){h.xp-=xpGoal(h.level);h.level++;const s=stats(h);if(h.hp>0)h.hp=Math.min(s.hp,h.hp+4);h.mp=Math.min(s.mp,h.mp+2);}}
    if(r.relic==='lantern')for(const h of r.heroes)if(h.hp>0)h.mp=Math.min(stats(h).mp,h.mp+2);
    if(r.trip?.rule==='swarm')for(const other of alive(r)){other.atk*=1.12;other.speed*=1.04;}
  }else if(e.chapterBoss&&stage<count&&e.hp<=boundary){
    e.stage=stage+1;e.preparation=0;e.clock=0;e.intent='strike';e.burnUntil=0;
    const form=bossForm(effectiveWave(r),e.stage),changed=form!==e.form;
    if(changed){e.form=form;e.name=e.formName;e.speed*=1.15;e.atk*=1.10;e.armor*=.7;}
    e.ward=bossWard(effectiveWave(r),e.stage);
    r.bossScene={kind:'shift',remaining:1.6,duration:1.6};
    events.push({kind:changed?'transform':'boss-phase',target:e.id});note(r,bossPhase(effectiveWave(r),e.stage)+'.');
  }
}
function interrupt(r:Run,e:Enemy,events:CombatEvent[]){
  if(e.preparation<=0)return;
  e.preparation=0;e.clock=0;e.intent='strike';r.interrupts++;events.push({kind:'interrupt',target:e.id});
  if(r.relic==='glass')for(const h of r.heroes)if(h.hp>0){h.shield+=stats(h).hp*.08;h.shieldUntil=r.time+5;}
}
export function cast(r:Run,heroIndex:number,index:number):CombatEvent[]{
  const events:CombatEvent[]=[],h=r.heroes[heroIndex];
  if(r.phase!=='fight'||r.bossScene||!h||h.hp<=0||(index!==0&&index!==1)||h.cooldowns[index]!>0)return events;
  const cost=skillCost(h,index),e=target(r);if(h.mp+1e-6<cost||!e)return events;
  const id=CLASSES[h.classId].skills[index] as SkillId,rank=h.skills[index]!,s=stats(h),boost=1+(rank-1)*.22;
  h.mp-=cost;h.cooldowns[index]=SKILLS[id].cooldown;h.clock=Math.min(h.clock,.25);
  events.push({kind:'cast',target:e.id,hero:heroIndex,skill:id});
  switch(id){
    case 'sunder':e.exposedUntil=r.time+6;interrupt(r,e,events);hurtEnemy(r,e,s.atk*1.6*boost,'physical',events,heroIndex);break;
    case 'bastion':for(const a of r.heroes)if(a.hp>0){a.shield=Math.max(a.shield,stats(a).hp*.26*boost);a.shieldUntil=r.time+8;events.push({kind:'shield',target:r.heroes.indexOf(a),amount:Math.round(a.shield)});}h.tauntUntil=r.time+5;break;
    case 'ember':for(const a of alive(r)){a.burnUntil=r.time+5;hurtEnemy(r,a,s.atk*1.3*boost,'fire',events,heroIndex);}break;
    case 'rime':e.slowUntil=r.time+5;interrupt(r,e,events);hurtEnemy(r,e,s.atk*1.9*boost,'ice',events,heroIndex);break;
    case 'mark':e.markedUntil=r.time+7;interrupt(r,e,events);hurtEnemy(r,e,s.atk*.7*boost,'physical',events,heroIndex);break;
    case 'execute':hurtEnemy(r,e,s.atk*2.3*boost*((e.markedUntil>r.time||e.hp/e.maxHp<.4)?2:1),'physical',events,heroIndex);break;
    case 'mend':{
      const a=r.heroes.filter(a=>a.hp>0).sort((a,b)=>a.hp/stats(a).hp-b.hp/stats(b).hp)[0]!;
      const max=stats(a).hp,amount=Math.round((s.atk*1.4+max*.14)*boost),actual=Math.min(amount,max-a.hp);
      a.hp+=actual;a.shield=Math.max(a.shield,Math.min(max*.2,amount-actual));a.shieldUntil=r.time+6;
      events.push({kind:'heal',target:r.heroes.indexOf(a),amount:Math.round(actual)});break;
    }
    case 'verdict':interrupt(r,e,events);hurtEnemy(r,e,s.atk*1.8*boost,'light',events,heroIndex);for(const a of r.heroes)if(a.hp>0){a.shield=Math.max(a.shield,stats(a).hp*.09*boost);a.shieldUntil=r.time+5;}break;
  }
  afterActions(r,events);return events;
}
function afterActions(r:Run,events:CombatEvent[]){
  if(!alive(r).length&&r.phase==='fight'){
    const count=r.enemies.length;if(r.trip)r.trip.cursor+=count;else r.cursor+=count;
    r.phase='transition';r.transition=r.enemies.some(e=>e.chapterBoss)?1.4:.55;r.target=null;
    events.push({kind:'reward',target:0});
  }
}
function endSeries(r:Run){
  if(r.trip){
    const t=r.trip,first=t.mode==='sanctuary'?!r.sanctuaries.includes(t.id):t.mode==='contract'?!r.contracts.includes(t.id):t.floor>r.abyssBest;
    reward(r,Math.round(t.wave*(first?25:8)),first?8:2);
    if(t.mode==='sanctuary'&&first){r.sanctuaries.push(t.id);r.relics.push(t.id);if(!r.relic)r.relic=t.id;}
    if(t.mode==='abyss')r.abyssBest=Math.max(r.abyssBest,t.floor);
    if(t.mode==='contract'&&first){r.contracts.push(t.id);r.contracts=r.contracts.slice(-366);}
    r.phase='expedition-clear';note(r,t.mode==='abyss'?`Abyss depth ${t.floor} cleared.`:'Expedition cleared. Rewards secured.');return;
  }
  r.cleared=Math.max(r.cleared,r.wave);reward(r,r.wave*8,1);
  if(r.wave>=32){r.phase='complete';note(r,'The last threshold is open. Your oath is fulfilled.');return;}
  r.wave++;r.cursor=0;
  if(r.wave===5&&r.heroes.length===1){r.phase='recruit';return;}
  refill(r);
  if((r.wave-1)%4===0)r.phase='camp';else spawnGroup(r);
}
function enemyAttack(r:Run,e:Enemy,events:CombatEvent[]){
  events.push({kind:'enemy-strike',target:e.id});
  if(e.intent==='heal'){
    const other=alive(r).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]!;
    const phaseCap=e.chapterBoss?Math.ceil(e.maxHp*(bossPhases(effectiveWave(r)).length-currentBossStage(r,e)+1)/bossPhases(effectiveWave(r)).length):other.maxHp;
    const amount=Math.min(other.maxHp*.08,phaseCap-other.hp,e.maxHp*(e.chapterBoss?.12:.3)-e.healSpent);
    if(amount>0){other.hp+=amount;e.healSpent+=amount;events.push({kind:'heal',target:other.id,amount:Math.round(amount),hero:-1});}return;
  }
  const living=r.heroes.map((h,i)=>({h,i})).filter(({h})=>h.hp>0);
  if(!living.length)return;
  const taunt=living.find(({h})=>h.tauntUntil>r.time);
  const victim=taunt??living[(e.attacks+e.family)%living.length]!;
  const victims=e.boss&&e.form===2&&e.intent==='heavy'?living:[victim];
  for(const {h,i}of victims){
    const s=stats(h),raw=Math.max(1,e.atk*(e.intent==='heavy'?1.85:e.intent==='curse'?1.3:1)-s.armor*(e.intent==='curse'?.35:1));
    let damage=Math.round(raw);const absorbed=Math.min(h.shield,damage);h.shield-=absorbed;damage-=absorbed;
    h.hp=Math.max(0,h.hp-damage);if(e.intent==='curse')h.mp=Math.max(0,h.mp-Math.max(2,Math.floor(s.mp*.07)));events.push({kind:'hero-hit',target:i,amount:damage,attacker:e.id,impact:e.intent,absorbed});
  }
}
/** Advance active combat only. The UI owns pause/background policy. Fixed substeps keep clocks deterministic. */
export function tick(r:Run,seconds:number):CombatEvent[]{
  if(!Number.isFinite(seconds)||seconds<=0)return[];
  const events:CombatEvent[]=[];let left=Math.min(seconds,60);
  if(r.bossScene){r.bossScene.remaining=Math.max(0,r.bossScene.remaining-left);if(r.bossScene.remaining===0)finishBossScene(r);return events;}
  while(left>1e-7&&!r.bossScene&&(r.phase==='fight'||r.phase==='transition')){
    const dt=Math.min(.05,left);left-=dt;r.time+=dt;
    if(r.phase==='transition'){
      r.transition-=dt;if(r.transition<=0){r.transition=0;if(cursor(r)>=32)endSeries(r);else spawnGroup(r);}continue;
    }
    for(const h of r.heroes){
      if(r.bossScene)break;
      if(h.hp<=0)continue;
      const s=stats(h);h.mp=Math.min(s.mp,h.mp+dt*s.regen*(r.trip?.rule==='silence'?.4:1)*(r.relic==='stars'?1.15:1));
      if(h.shieldUntil<=r.time)h.shield=0;
      h.cooldowns=[Math.max(0,h.cooldowns[0]-dt),Math.max(0,h.cooldowns[1]-dt)];
      h.clock+=dt*s.speed;
      if(h.clock>=1){
        h.clock-=1;const e=target(r),index=r.heroes.indexOf(h);let action=h.mode??'steel';
        if(action==='mend'&&h.hp>=s.hp-.01||h.mp<modeCost(h,action)){h.mode='steel';action='steel';}
        if(action==='mend'){
          h.mp-=modeCost(h,'mend');const amount=Math.min(s.hp-h.hp,Math.round((s.hp*.09+s.atk*.65)*magicPower(h,'mend')));h.hp+=amount;
          events.push({kind:'heal',target:index,hero:index,amount,action:'mend'});if(h.hp>=s.hp-.01)h.mode='steel';
        }else if(e){
          h.mp-=modeCost(h,action);
          const element=action==='steel'?'physical':action==='ember'?'fire':action==='rime'?'ice':'light';
          const before=events.length;hurtEnemy(r,e,s.atk*(action==='steel'?1:CLASSES[h.classId].magic?1.8:1.6)*magicPower(h,action),element,events,index);
          for(let j=before;j<events.length;j++)if(events[j]!.kind==='damage')events[j]!.action=action;
          if(action==='rime')e.slowUntil=Math.max(e.slowUntil,r.time+1.1+(magicLevel(h,'rime')-1)*.09);
        }
      }
    }
    afterActions(r,events);if(r.phase!=='fight'||r.bossScene)continue;
    for(const e of alive(r)){
      if(e.burnUntil>r.time){const floor=e.chapterBoss?Math.max(1,Math.ceil(e.maxHp*(bossPhases(effectiveWave(r)).length-currentBossStage(r,e))/bossPhases(effectiveWave(r)).length)):1;e.hp=Math.max(Math.min(e.hp,floor),e.hp-dt*stats(r.heroes.find(h=>h.classId==='hexweaver')??r.heroes[0]!).atk*.11);}
      if(e.preparation>0){e.preparation-=dt;if(e.preparation<=0){e.preparation=0;enemyAttack(r,e,events);e.clock=0;e.intent='strike';}continue;}
      e.clock+=dt*e.speed*(e.slowUntil>r.time?.55:1);
      if(e.clock>=1){
        e.clock-=1;e.attacks++;
        const special=e.boss||e.role==='caster'||e.role==='healer'||e.attacks%3===0;
        if(special){
          e.intent=e.chapterBoss?bossMove(effectiveWave(r),currentBossStage(r,e),e.attacks):e.role==='healer'&&e.healSpent<e.maxHp*.3?'heal':e.boss&&chapterIndex(effectiveWave(r))===4&&e.attacks%4===0&&e.healSpent<e.maxHp*.3?'heal':e.role==='caster'?'curse':'heavy';
          if(e.intent==='heal'&&e.healSpent>=e.maxHp*.12&&e.chapterBoss)e.intent='heavy';
          e.preparation=(e.chapterBoss?Math.max(1.65,2.65-(currentBossStage(r,e)-1)*.2):e.boss?2.3:1.4)*(r.trip?.rule==='fury'?.68:1);
        }else{e.intent='strike';enemyAttack(r,e,events);}
      }
    }
    if(r.heroes.every(h=>h.hp<=0)){r.deaths++;r.phase='defeat';note(r,'The oath holds. Your earnings and experience are safe.');}
  }
  return events;
}
