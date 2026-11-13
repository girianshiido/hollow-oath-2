import {bossPhases} from './bosses.ts';
import {CLASS_IDS,CLASSES,SKILLS,SANCTUARIES,FOES,COMBAT_MODES} from './content.ts';
import type {ClassId} from './content.ts';
import {stats} from './engine.ts';
import type {Hero,Run,Enemy,Trip} from './engine.ts';
export interface Settings {music:number;sfx:number;muted:boolean;motion:boolean;}
export interface Profile {version:1;runs:Run[];activeId:string|null;settings:Settings;}
export const SAVE_KEY='hollow-oath-2.profile.v1';
export const defaults=():Profile=>({version:1,runs:[],activeId:null,settings:{music:.45,sfx:.65,muted:false,motion:true}});
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const number=(v:unknown,min=0,max=1e15):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const text=(v:unknown,max=100):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const list=(v:unknown,max:number):v is string[]=>Array.isArray(v)&&v.length<=max&&v.every(s=>text(s,100));
function hero(v:unknown):v is Hero {
  if(!object(v)||!CLASS_IDS.includes(v.classId as ClassId)||!text(v.name,24)||v.mode!==undefined&&!COMBAT_MODES.includes(v.mode as never))return false;
  if(!['level','xp','hp','mp','weapon','armor','focus','clock','shield','shieldUntil','tauntUntil'].every(k=>number(v[k])))return false;
  if(!number(v.level,1,99)||!Number.isInteger(v.level)||!['weapon','armor','focus'].every(k=>number(v[k],1,32)&&Number.isInteger(v[k])))return false;
  if(!Array.isArray(v.skills)||v.skills.length!==2||!v.skills.every(s=>number(s,1,6)&&Number.isInteger(s)))return false;
  if(!Array.isArray(v.cooldowns)||v.cooldowns.length!==2||!v.cooldowns.every(s=>number(s,0,30)))return false;
  const h=v as unknown as Hero,s=stats(h);
  return h.hp<=s.hp+.001&&h.mp<=s.mp+.001&&h.cooldowns.every((c,i)=>c<=SKILLS[CLASSES[h.classId].skills[i] as keyof typeof SKILLS].cooldown+.01);
}
function enemy(v:unknown):v is Enemy {
  if(!object(v)||!text(v.name)||!text(v.formName)||!text(v.art,50)||!/^((foe|boss)-\d+)$/.test(v.art))return false;
  if(v.stage!==undefined&&(!number(v.stage,1,5)||!Number.isInteger(v.stage)||v.chapterBoss!==true))return false;
  if(v.ward!==undefined&&!['steel','ember','rime','storm'].includes(String(v.ward)))return false;
  if(!['id','family','hp','maxHp','atk','armor','speed','clock','attacks','preparation','exposedUntil','markedUntil','slowUntil','burnUntil','healSpent'].every(k=>number(v[k])))return false;
  return number(v.id,0,31)&&Number.isInteger(v.id)&&number(v.family,0,FOES.length-1)&&Number.isInteger(v.family)&&number(v.maxHp,1,1e12)&&(v.hp as number)<=(v.maxHp as number)&&['striker','guard','caster','healer','swift'].includes(String(v.role))&&['strike','heavy','heal','curse'].includes(String(v.intent))&&typeof v.boss==='boolean'&&typeof v.chapterBoss==='boolean'&&(v.form===1||v.form===2);
}
function trip(v:unknown):v is Trip|null {
  if(v===null)return true;
  if(!object(v)||!['sanctuary','abyss','contract'].includes(String(v.mode))||!text(v.id,100)||!['swarm','silence','fury'].includes(String(v.rule)))return false;
  return ['wave','cursor','floor','bankGold','bankEssence'].every(k=>number(v[k]))&&number(v.wave,1,100000)&&number(v.cursor,0,32)&&Number.isInteger(v.cursor)&&number(v.floor,1,10000)&&Number.isInteger(v.floor);
}
export function validRun(v:unknown):v is Run {
  if(!object(v)||!text(v.id)||!text(v.name,24)||!number(v.created)||!Array.isArray(v.heroes)||v.heroes.length<1||v.heroes.length>2||!v.heroes.every(hero))return false;
  if(new Set(v.heroes.map(h=>h.classId)).size!==v.heroes.length)return false;
  if(!['wave','cursor','cleared','gold','essence','deaths','kills','time','transition','abyssBest','interrupts','totalGold'].every(k=>number(v[k])))return false;
  if(!number(v.wave,1,32)||!number(v.cursor,0,32)||!number(v.cleared,0,32)||!['wave','cursor','cleared'].every(k=>Number.isInteger(v[k])))return false;
  if(!['fight','transition','camp','recruit','complete','expedition-clear','defeat'].includes(String(v.phase))||!trip(v.trip))return false;
  if(!Array.isArray(v.enemies)||v.enemies.length>3||!v.enemies.every(enemy)||new Set(v.enemies.map(e=>e.id)).size!==v.enemies.length)return false;
  if(v.bossScene!==undefined){const b=v.bossScene;if(!object(b)||!['entrance','shift'].includes(String(b.kind))||!number(b.duration,.1,3.2)||!number(b.remaining,0,b.duration)||v.phase!=='fight'||!v.enemies.some(e=>e.chapterBoss&&e.hp>0))return false;}
  if(v.enemies.some(e=>e.stage!==undefined&&e.stage>bossPhases((v.trip as Trip|null)?.wave??Number(v.wave)).length))return false;
  if(!(v.target===null||number(v.target,0,31)))return false;
  if(!list(v.relics,4)||!list(v.sanctuaries,4)||!list(v.contracts,366)||!list(v.log,12))return false;
  const ids=SANCTUARIES.map(s=>s.id);if(!v.relics.every(id=>ids.includes(id))||!v.sanctuaries.every(id=>ids.includes(id)))return false;
  if(!(v.relic===null||typeof v.relic==='string'&&v.relics.includes(v.relic)))return false;
  if((v.phase==='fight'||v.phase==='transition')&&v.enemies.length===0)return false;
  if(v.phase==='recruit'&&(v.heroes.length!==1||(v.cleared as number)<4))return false;
  if(v.phase==='complete'&&v.cleared!==32)return false;
  return true;
}
export function decodeProfile(value:unknown):Profile|null {
  if(!object(value)||value.version!==1||!Array.isArray(value.runs)||value.runs.length>24||!value.runs.every(validRun)||!object(value.settings))return null;
  const s=value.settings;if(!number(s.music,0,1)||!number(s.sfx,0,1)||typeof s.muted!=='boolean'||typeof s.motion!=='boolean')return null;
  if(!(value.activeId===null||typeof value.activeId==='string'&&value.runs.some(r=>r.id===value.activeId)))return null;
  if(new Set(value.runs.map(r=>r.id)).size!==value.runs.length)return null;
  return value as unknown as Profile;
}
export function load():{profile:Profile;error:string|null}{
  try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return{profile:defaults(),error:null};const parsed=decodeProfile(JSON.parse(raw));return parsed?{profile:parsed,error:null}:{profile:defaults(),error:'The saved data could not be read. It has not been overwritten. Import a backup to restore your adventures.'};}
  catch{return{profile:defaults(),error:'Local storage is unavailable. Export a backup before leaving.'};}
}
export function persist(profile:Profile):boolean{try{localStorage.setItem(SAVE_KEY,JSON.stringify(profile));return true;}catch{return false;}}
export function exportText(profile:Profile){return JSON.stringify({game:'Hollow Oath II',version:1,exported:new Date().toISOString(),profile},null,2);}
export function importText(raw:string):Profile|null{
  if(raw.length>4_000_000)return null;
  try{const v:unknown=JSON.parse(raw);if(!object(v)||v.game!=='Hollow Oath II'||v.version!==1)return null;return decodeProfile(v.profile);}catch{return null;}
}
