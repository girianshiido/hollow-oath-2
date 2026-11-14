import {showHeroHit,combineHeroHits} from './hero-feedback.ts';
import {bossPhases,bossPhase} from './bosses.ts';
import './style.css';
import './gestures.ts';
import {CLASSES,CLASS_IDS,SKILLS,CHAPTERS,SANCTUARIES,RELICS,FOES,chapterIndex,fmt,MODE_INFO} from './content.ts';
import type {ClassId,SkillId,CombatMode} from './content.ts';
import {newRun,stats,xpGoal,tick,cast,recruit,buyGear,buySkill,gearCost,upgradeCost,skillCost,resume,retreat,enterExpedition,nextDepth,cursor,effectiveWave,dayKey,contractRule,setMode,finishBossScene,currentBossStage} from './engine.ts';
import type {Run,CombatEvent,Hero} from './engine.ts';
import {load,persist,exportText,importText} from './saves.ts';
import {Arena,warmArt} from './renderer.ts';
import {TitleAtmosphere} from './title-fx.ts';
import * as audio from './audio.ts';
import * as pwa from './pwa.ts';
import {icon} from './icons.ts';

const app=document.querySelector<HTMLDivElement>('#app')!;
const loaded=load();let profile=loaded.profile;
let saveAllowed=loaded.error===null;
let screen:'title'|'select'|'load'|'battle'|'camp'|'expeditions'|'ending'|'records'='title';
let selected:ClassId='vanguard',selectRecruit=false,arena:Arena|null=null,paused=false;
let last=performance.now(),lastHud=0,lastSave=0,lastSound=0,toastTimer=0;
let modal:HTMLDialogElement|null=null,returnFocus:HTMLElement|null=null;
let lastPhase='',shopHero=0,titleFx:TitleAtmosphere|null=null,soundRequested=false;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const art=(name:string)=>`./art/${name}.webp`;
const current=()=>profile.runs.find(r=>r.id===profile.activeId)??null;
const cash=(r:Run)=>`<span class="currency">${icon('coin')} <b>${fmt(r.gold)}</b></span><span class="currency essence">${icon('gem')} <b>${fmt(r.essence)}</b></span>`;
function toast(message:string){const e=document.querySelector<HTMLDivElement>('#toast')!;e.textContent=message;e.classList.add('show');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>e.classList.remove('show'),4000);}
function save(){if(!saveAllowed)return false;const ok=persist(profile);if(!ok)toast('Unable to save on this device. Export a backup before leaving.');return ok;}
function setScreen(next:typeof screen){arena?.dispose();arena=null;titleFx?.dispose();titleFx=null;screen=next;app.dataset.screen=next;render();setMusic();}
function musicScene():audio.Track{const r=current();if(screen==='select')return'selection';if(screen==='title'||screen==='load')return'title';if(screen==='ending')return'victory';if(screen==='battle'&&r)return r.trip?'bonus':r.enemies.some(e=>e.chapterBoss)?r.wave===32?'final':'boss':(['battle-1','battle-2','battle-3'] as const)[chapterIndex(r.wave)%3]!;return r?.phase==='defeat'?'defeat':'camp';}
function setMusic(){audio.play(musicScene());if(screen==='title')audio.preload('selection','battle-1');else if(screen==='select')audio.preload('battle-1');else if(screen==='battle')audio.preload(current()?.wave===31?'final':'boss');}
function runMusic(r:Run):audio.Track{return r.phase==='recruit'?'selection':r.phase==='complete'?'victory':['camp','defeat','expedition-clear'].includes(r.phase)?r.phase==='defeat'?'defeat':'camp':r.trip?'bonus':r.enemies.some(e=>e.chapterBoss)?r.wave===32?'final':'boss':(['battle-1','battle-2','battle-3'] as const)[chapterIndex(r.wave)%3]!;}
function preferredSpell(h:Hero):CombatMode{return h.classId==='hexweaver'?'ember':h.classId==='vanguard'?'rime':'storm';}
function orderButtons(i:number){return `<div class="hero-orders"><button data-order="${i},steel" title="Free sword attacks">${icon('sword')}<span>Steel</span></button><button data-order="${i},magic" title="Tap to select magic; tap again to cycle Fire, Ice and Storm">${icon('flame')}<span>Magic</span></button><button data-order="${i},mend" title="Heal this hero until full HP, spending 8 MP per action">${icon('heart')}<span>Heal</span></button></div>`;}

function button(action:string,label:string,kind='secondary',extra=''){return `<button class="${kind}" data-action="${action}" ${extra}>${label}</button>`;}
function header(kicker:string,title:string,back='title'){return `<header class="page-head"><button class="icon-button" data-action="${back}" aria-label="Back">${icon('back')}</button><div><p class="eyebrow">${kicker}</p><h1>${title}</h1></div><button class="icon-button" data-action="options" aria-label="Options">${icon('settings')}</button></header>`;}
function render(){
  app.classList.toggle('reduce-motion',!profile.settings.motion);
  if(screen==='title')renderTitle();else if(screen==='select')renderSelect();else if(screen==='load')renderLoad();else if(screen==='battle')renderBattle();else if(screen==='camp')renderCamp();else if(screen==='expeditions')renderExpeditions();else if(screen==='ending')renderEnding();else renderRecords();
}
function renderTitle(){
  titleFx?.dispose();
  const r=current();app.innerHTML=`<main class="title-screen"><canvas id="title-atmosphere" class="title-atmosphere" aria-hidden="true"></canvas><div class="title-top"><span class="edition">A NEW OATH</span><button class="subtle title-sound" data-action="title-sound">${icon('sound')}${!soundRequested||profile.settings.muted?'Enable sound':'Mute sound'}</button><button class="icon-button" data-action="options" aria-label="Options">${icon('settings')}</button></div><div class="title-main"><p class="eyebrow">TWO SOULS. ONE OATH.</p><h1 class="game-title">HOLLOW<br><span>OATH</span><em>II</em></h1><div class="title-line"></div><p class="title-tagline">Beyond the hollow.<br>Into the unknown.</p><nav class="title-menu" aria-label="Main menu">${r?button('continue',`${icon('play')} Continue adventure`,'primary')+`<p class="continue-detail">${esc(r.name)} · Wave ${r.wave} · ${r.heroes.length===2?'Duo':'Solo'}</p>`:''}${button('new',`${icon('sword')} Begin a new oath`,r?'secondary':'primary')}${button('load','Your adventures <span>'+profile.runs.length+'</span>','text-button')}</nav><div class="title-tools">${!pwa.standalone()?button('install',`${icon('download')} Install game`,'subtle'):''}${button('records',`${icon('crown')} Records`,'subtle')}${button('guide',`${icon('book')} How to play`,'subtle')}</div></div><footer class="title-foot"><span>TACTICAL FANTASY RPG</span><span>INSTALL & PLAY OFFLINE · v1.3.1</span></footer></main>`;
  const canvas=document.querySelector<HTMLCanvasElement>('#title-atmosphere');if(canvas){titleFx?.dispose();titleFx=new TitleAtmosphere(canvas);titleFx.motion=profile.settings.motion;}
}
function renderSelect(){
  const r=current(),choices=CLASS_IDS.filter(id=>!selectRecruit||id!==r?.heroes[0]?.classId);
  if(!choices.includes(selected))selected=choices[0]!;
  const c=CLASSES[selected];
  app.innerHTML=`<main class="page select-page">${header(selectRecruit?'CHAPTER I COMPLETE':'A NEW ADVENTURE',selectRecruit?'Choose your companion':'Choose your first hero',selectRecruit?'camp':'title')}<p class="intro">${selectRecruit?'Your second soul joins the oath. Choose a companion for the rest of this adventure.':'Four paths into the unknown. Your companion joins after the first chapter.'}</p><div class="character-grid ${selectRecruit?'recruit-grid':''}">${choices.map(id=>{const c=CLASSES[id];return `<button class="character-card ${id===selected?'selected':''}" data-class="${id}" style="--class-color:${c.color}" aria-pressed="${id===selected}"><img src="${art(id)}" alt="${c.person}, the ${c.name}"><div class="character-caption"><strong>${c.name}</strong><small>${c.person}</small></div>${id===selected?'<span class="choice-mark">'+icon('star')+'</span>':''}</button>`;}).join('')}</div><section class="character-detail" style="--class-color:${c.color}"><p class="eyebrow">${c.role}</p><h2>${c.name}</h2><p>${c.description}</p><div class="skill-chips">${c.skills.map(id=>`<span>${icon(SKILLS[id as SkillId].icon)}${SKILLS[id as SkillId].name}</span>`).join('')}</div>${!selectRecruit?`<label class="name-label" for="hero-name">Your name<input id="hero-name" maxlength="24" placeholder="${c.person}" autocomplete="off"></label>`:''}</section><div class="sticky-action">${button('choose',`${selectRecruit?'Welcome '+c.person:'Swear the oath'} ${icon('next')}`,'primary wide')}<p class="fine">${selectRecruit?'All three combinations are viable. Your choice is permanent for this adventure.':'Progress is saved automatically on this device.'}</p></div></main>`;
}
function renderLoad(){
  app.innerHTML=`<main class="page">${header('YOUR OATHS','Adventures')}<div class="adventure-list">${profile.runs.length?profile.runs.map(r=>`<article class="adventure"><div class="duo-avatars">${r.heroes.map(h=>`<img src="${art(h.classId)}" alt="${CLASSES[h.classId].name}">`).join('')}</div><div><h2>${esc(r.name)}</h2><p>Wave ${r.wave} · ${r.heroes.map(h=>CLASSES[h.classId].name).join(' + ')}</p><small>${r.cleared===32?'Campaign complete':fmt(r.kills)+' enemies defeated'} · ${Math.floor(r.time/60)} min</small></div><div class="adventure-actions">${button('load-run',icon('play'),'icon-button',`data-id="${esc(r.id)}" aria-label="Load ${esc(r.name)}"`)}${button('delete-run',icon('close'),'icon-button danger',`data-id="${esc(r.id)}" aria-label="Delete ${esc(r.name)}"`)}</div></article>`).join(''):'<div class="empty-state">'+icon('book')+'<h2>Your story starts here.</h2><p>Begin an oath, or import an existing backup.</p></div>'}</div>${button('new','Begin a new oath','primary wide')}${button('import',`${icon('download')} Import backup`,'secondary wide')}<p class="fine">Backups from Hollow Oath II only. The first game has its own saves.</p></main>`;
}
function renderBattle(){
  const r=current();if(!r){setScreen('title');return;}
  const ch=CHAPTERS[chapterIndex(r.wave)]!;
  app.innerHTML=`<main class="battle-screen"><header class="battle-head"><button class="icon-button" data-action="retreat" aria-label="Return to camp">${icon('camp')}</button><div class="battle-heading"><p class="eyebrow" id="battle-kicker">${r.trip?'EXPEDITION':`CHAPTER ${Math.floor((r.wave-1)/4)+1}`}</p><h1 id="battle-place">${esc(r.trip?r.trip.mode==='abyss'?'The Abyss':r.trip.mode==='contract'?'Daily Contract':SANCTUARIES.find(s=>s.id===r.trip!.id)?.name??'Expedition':ch.place)}</h1></div><button class="icon-button" data-action="pause" aria-label="Pause combat">${icon('pause')}</button></header><div class="battle-progress"><span id="wave-text"></span><div class="thin-track"><i id="wave-fill"></i></div><span id="enemy-count"></span></div><div class="arena-wrap"><canvas id="arena" aria-label="Battle arena. Use the enemy buttons below to choose a target."></canvas><div class="arena-top"><span id="combat-status" class="arena-badge">AUTOMATIC COMBAT</span><button class="arena-info" data-action="enemy-info" aria-label="Inspect enemies">${icon('info')}</button></div><div id="arena-notice" aria-live="polite"></div><div class="arena-bottom"><span id="target-hint">Tap an enemy to focus your attacks</span></div></div><div id="enemy-targets" class="target-row" aria-label="Enemy targets"></div><section class="duo-panel" aria-label="Your heroes">${r.heroes.map((h,i)=>`<article class="hero-panel" id="hero-${i}" style="--class-color:${CLASSES[h.classId].color}"><img src="${art(h.classId)}" alt="${h.name}"><div class="hero-vitals"><div class="hero-name"><strong>${esc(h.name)}</strong><small id="level-${i}"></small></div><div class="vital hp"><i id="hp-fill-${i}"></i><span id="hp-${i}"></span></div><div class="vital mp"><i id="mp-fill-${i}"></i><span id="mp-${i}"></span></div><small class="hero-order" id="order-${i}"></small></div>${orderButtons(i)}</article>`).join('')}${r.heroes.length===1?`<article class="hero-panel locked-companion">${icon('shield')}<div><strong>One oath, for now.</strong><small>A companion joins after wave 4.</small></div></article>`:''}</section><div class="action-bar ${r.heroes.length===1?'solo':''}" aria-label="Hero abilities">${r.heroes.map((h,i)=>CLASSES[h.classId].skills.map((skill,j)=>{const s=SKILLS[skill as SkillId];return `<button class="skill-button" id="skill-${i}-${j}" data-cast="${i},${j}" style="--skill-color:${s.color}" aria-label="${esc(h.name)}: ${s.name}. ${s.text}"><span class="skill-icon">${icon(s.icon)}</span><strong>${s.name}</strong><span class="skill-cost" id="cost-${i}-${j}"></span><span class="skill-cooldown" id="cd-${i}-${j}"></span><span class="key-hint">${i*2+j+1}</span></button>`;}).join('')).join('')}</div><footer class="battle-foot"><span id="battle-currency">${cash(r)}</span><span>Hold a skill to inspect</span></footer></main>`;
  const canvas=document.querySelector<HTMLCanvasElement>('#arena')!;arena=new Arena(canvas);arena.motion=profile.settings.motion;
  canvas.addEventListener('pointerup',event=>{if(paused||modal)return;const id=arena?.hit(event.clientX,event.clientY);if(id!==null&&id!==undefined&&r.enemies.some(e=>e.id===id&&e.hp>0)){r.target=id;audio.sound('select');updateHud();}});
  app.querySelector('.battle-screen')!.insertAdjacentHTML('beforeend','<div id="boss-hud" class="boss-hud" hidden></div><section id="boss-scene" class="boss-scene" aria-label="Chapter guardian arrival" hidden></section>');
  const phaseHud=document.getElementById('boss-hud')!;document.querySelector('.battle-progress')!.insertAdjacentElement('afterend',phaseHud);
  lastPhase=r.phase;updateHud();updateBossPresentation(r);
}
function updateBossPresentation(r:Run){
  const e=r.enemies.find(e=>e.chapterBoss&&e.hp>0),node=document.getElementById('boss-scene'),hud=document.getElementById('boss-hud');if(!node||!hud)return;
  const wave=effectiveWave(r),stage=e?currentBossStage(r,e):1,phases=bossPhases(wave);
  hud.hidden=!e;const statusKey=e?`${wave}-${stage}-${e.ward??''}`:'';
  if(e&&hud.dataset.key!==statusKey){hud.dataset.key=statusKey;hud.innerHTML=`<span class="boss-phase-name">${esc(bossPhase(wave,stage))}</span><span class="boss-phase-marks" aria-label="Phase ${stage} of ${phases.length}">${phases.map((_,i)=>`<i class="${i+1<stage?'done':i+1===stage?'now':''}"></i>`).join('')}</span><small>${e.ward?'BREAK SEAL · '+MODE_INFO[e.ward].name.toUpperCase():`PHASE ${stage} / ${phases.length}`}</small>`;}
  if(!e||!r.bossScene){node.hidden=true;delete node.dataset.key;return;}
  const scene=r.bossScene,key=`${r.id}-${wave}-${r.trip?.floor??0}-${stage}-${scene.kind}`;
  if(node.dataset.key!==key){node.dataset.key=key;node.hidden=false;node.classList.toggle('phase-shift',scene.kind==='shift');node.style.setProperty('--boss-color',CHAPTERS[chapterIndex(wave)]!.color);
    node.innerHTML=`<div class="boss-scene-rune" aria-hidden="true"></div><div class="boss-scene-sparks" aria-hidden="true"></div><img src="${art(e.art+(e.form===2?'-form2':''))}" alt="${esc(e.name)}"><div class="boss-scene-copy"><p class="eyebrow">${scene.kind==='entrance'?(r.trip?'EXPEDITION GUARDIAN':`CHAPTER ${chapterIndex(wave)+1} GUARDIAN`):`PHASE ${stage} / ${phases.length}`}</p><h2>${esc(e.name)}</h2><p class="boss-scene-phase">${esc(bossPhase(wave,stage))}</p><p class="boss-scene-hint">${esc(CHAPTERS[chapterIndex(wave)]!.hint)}</p><button class="secondary" data-action="boss-begin">${scene.kind==='entrance'?'Begin battle':'Continue battle'} ${icon('next')}</button></div>`;
    audio.sound(scene.kind==='entrance'?'guard':'storm');setMusic();
  }
  node.classList.toggle('scene-paused',paused||Boolean(modal)||document.hidden);
  node.style.setProperty('--scene-progress',String(1-scene.remaining/scene.duration));
}
function updateHud(){
  const r=current();if(!r||screen!=='battle')return;
  const set=(id:string,text:string)=>{const e=document.getElementById(id);if(e&&e.textContent!==text)e.textContent=text;};
  const width=(id:string,value:number)=>{const e=document.getElementById(id);if(e)e.style.width=`${Math.max(0,Math.min(100,value*100))}%`;};
  set('wave-text',r.trip?.mode==='abyss'?`Depth ${r.trip.floor}`:r.trip?'Bonus trial':`Wave ${r.wave} / 32`);
  const done=cursor(r)+(r.phase==='fight'?r.enemies.filter(e=>e.hp<=0).length:0);set('enemy-count',`${Math.min(32,done)} / 32`);width('wave-fill',Math.min(32,done)/32);
  const focused=r.enemies.find(e=>e.id===r.target&&e.hp>0)??r.enemies.find(e=>e.hp>0);
  set('target-hint',focused?`FOCUS · ${focused.name}`:'The path opens…');
  const preparing=r.enemies.filter(e=>e.hp>0&&e.preparation>0);
  set('combat-status',preparing.length?'INTERRUPT · SHIELD · ENDURE':r.enemies.some(e=>e.boss)?'GUARDIAN ENCOUNTER':'AUTOMATIC COMBAT');
  document.getElementById('combat-status')?.classList.toggle('warning',preparing.length>0);
  r.heroes.forEach((h,i)=>{
    const s=stats(h);set(`level-${i}`,`Lv ${h.level}`);set(`hp-${i}`,`${Math.ceil(h.hp)} / ${Math.ceil(s.hp)}`);set(`mp-${i}`,`${Math.floor(h.mp)} / ${Math.floor(s.mp)} MP`);width(`hp-fill-${i}`,h.hp/s.hp);width(`mp-fill-${i}`,h.mp/s.mp);
    set(`order-${i}`,h.hp<=0?'Fallen':h.shield>0?`Shield · ${Math.ceil(h.shield)}`:`Auto · ${MODE_INFO[h.mode??'steel'].name}`);
    const selectedMode=h.mode??'steel',spell=['ember','rime','storm'].includes(selectedMode)?selectedMode:preferredSpell(h);
    for(const order of ['steel','magic','mend']){const b=document.querySelector<HTMLButtonElement>(`[data-order="${i},${order}"]`);if(b){const active=order==='magic'?['ember','rime','storm'].includes(selectedMode):selectedMode===order;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.disabled=h.hp<=0||Boolean(r.bossScene);if(order==='magic'){b.innerHTML=icon(MODE_INFO[spell].icon)+`<span>${MODE_INFO[spell].name}</span>`;b.title=`${MODE_INFO[spell].cost} MP per attack. Tap again to cycle Fire, Ice and Storm.`;}}}
    document.getElementById(`hero-${i}`)?.classList.toggle('fallen',h.hp<=0);
    h.cooldowns.forEach((cd,j)=>{const cost=skillCost(h,j),btn=document.getElementById(`skill-${i}-${j}`) as HTMLButtonElement|null;
      if(btn){btn.disabled=h.hp<=0||r.phase!=='fight'||Boolean(r.bossScene);btn.classList.toggle('unavailable',cd>0||h.mp<cost);btn.style.setProperty('--cooldown',String(cd/SKILLS[CLASSES[h.classId].skills[j] as SkillId].cooldown));}
      set(`cost-${i}-${j}`,`${cost} MP`);set(`cd-${i}-${j}`,cd>.05?`${cd.toFixed(1)}s`:h.mp<cost?'Low MP':'');
    });
  });
  const targetRow=document.getElementById('enemy-targets')!,signature=r.enemies.map(e=>`${e.id}-${e.hp>0}-${e.id===focused?.id}`).join(',');
  if(targetRow.dataset.signature!==signature){targetRow.dataset.signature=signature;targetRow.innerHTML=r.enemies.map(e=>`<button data-target="${e.id}" class="target-chip ${e.id===focused?.id?'active':''}" ${e.hp<=0?'disabled':''} aria-pressed="${e.id===focused?.id}">${e.role==='guard'?icon('shield'):e.role==='healer'?icon('heart'):icon('target')}<span>${e.name}</span></button>`).join('');}
  const money=document.getElementById('battle-currency');if(money&&money.dataset.gold!==`${r.gold}-${r.essence}`){money.innerHTML=cash(r);money.dataset.gold=`${r.gold}-${r.essence}`;}
}
function renderCamp(){
  const r=current();if(!r){setScreen('title');return;}
  if(r.phase==='recruit'){selectRecruit=true;selected=CLASS_IDS.find(id=>id!==r.heroes[0]!.classId)!;setScreen('select');return;}
  shopHero=Math.min(shopHero,r.heroes.length-1);const h=r.heroes[shopHero]!,s=stats(h);
  const defeat=r.phase==='defeat',complete=r.cleared===32&&!r.trip,cleared=r.phase==='expedition-clear';
  app.innerHTML=`<main class="page camp-page">${header(defeat?'THE OATH HOLDS':complete?'CAMPAIGN COMPLETE':'A MOMENT TO PREPARE',defeat?'Rise again':'The wayside camp')}<div class="camp-banner"><div><p class="eyebrow">${complete?'BEYOND THE LAST THRESHOLD':r.trip?`EXPEDITION · ${r.trip.mode.toUpperCase()}`:`NEXT · WAVE ${r.wave}`}</p><h2>${defeat?'Stronger on the return.':cleared?'Trial complete.':complete?'The dawn is yours.':'Make the next attempt count.'}</h2><p>${defeat?'Your gold, essence and experience are safe. Improve your duo, then try again.':cleared?'Your rewards are secured. Return to camp, or press deeper into the Abyss.':'Equip your heroes. Shape your abilities. Choose your next challenge.'}</p></div><div class="camp-currency">${cash(r)}</div></div><div class="camp-actions">${r.trip?.mode==='abyss'&&cleared?button('deeper',`Enter depth ${r.trip.floor+1} ${icon('next')}`,'primary wide'):!complete&&!cleared?button('resume',`${icon('play')} ${defeat?'Retry':'Continue'} ${r.trip?'expedition':'wave '+r.wave}`,'primary wide'):''}${r.trip?button('leave-trip','Return to campaign camp','secondary wide'):button('expeditions',`${icon('crown')} Expeditions`,'secondary wide',r.heroes.length<2?'disabled':'')}${r.heroes.length<2?'<p class="fine">Expeditions unlock when your companion joins after wave 4.</p>':''}</div><div class="section-head"><h2>Prepare your hero</h2><span>Equipment & abilities</span></div><div class="hero-tabs">${r.heroes.map((a,i)=>`<button data-shop-hero="${i}" class="hero-tab ${i===shopHero?'active':''}"><img src="${art(a.classId)}" alt=""><span>${esc(a.name)}<small>${CLASSES[a.classId].name} · Lv ${a.level}</small></span></button>`).join('')}</div><div class="stat-strip"><span>${icon('heart')} ${Math.round(s.hp)} HP</span><span>${icon('sword')} ${Math.round(s.atk)} ATK</span><span>${icon('shield')} ${Math.round(s.armor)} DEF</span><span>${icon('bolt')} ${s.speed.toFixed(2)}/s</span></div><div class="shop-grid">${(['weapon','armor','focus'] as const).map(slot=>`<article class="shop-item"><div class="shop-symbol">${icon(slot==='weapon'?'sword':slot==='armor'?'shield':'gem')}</div><div><h3>${slot==='weapon'?'Weapon':slot==='armor'?'Armor':'Focus'} <small>Rank ${h[slot]}</small></h3><p>${slot==='weapon'?'+5 attack · stronger strikes':slot==='armor'?'+15 HP · +2.4 defense':'+2 MP · better recovery'}</p></div>${button('buy-gear',h[slot]>=32?'MAX':`${icon('coin')} ${fmt(gearCost(h,slot))}`,'buy-button',`data-slot="${slot}" ${h[slot]>=32||r.gold<gearCost(h,slot)?'disabled':''}`)}</article>`).join('')}${CLASSES[h.classId].skills.map((id,i)=>{const skill=SKILLS[id as SkillId];return `<article class="shop-item skill-shop"><div class="shop-symbol" style="color:${skill.color}">${icon(skill.icon)}</div><div><h3>${skill.name} <small>Lv ${h.skills[i]} / 6</small></h3><p>${skill.text}</p></div>${button('buy-skill',h.skills[i]!>=6?'MAX':`${icon('gem')} ${upgradeCost(h,i)}`,'buy-button essence',`data-index="${i}" ${h.skills[i]!>=6||r.essence<upgradeCost(h,i)?'disabled':''}`)}</article>`;}).join('')}</div><div class="xp-line"><span>Level ${h.level} · ${fmt(h.xp)} / ${fmt(xpGoal(h.level))} XP</span><div class="thin-track"><i style="width:${h.xp/xpGoal(h.level)*100}%"></i></div></div>${r.relics.length?`<section class="relic-section"><div class="section-head"><h2>Bound relic</h2><span>One relic empowers the duo</span></div><div class="relic-list">${r.relics.map(id=>`<button data-relic="${id}" class="relic ${r.relic===id?'active':''}" aria-pressed="${r.relic===id}">${icon('gem')}<span><strong>${RELICS[id]!.name}</strong><small>${RELICS[id]!.text}</small></span></button>`).join('')}</div></section>`:''}<p class="fine">Equipment and upgrades are permanent. Retreating restarts the current wave and keeps all earnings.</p></main>`;
}
function renderExpeditions(){
  const r=current();if(!r){setScreen('title');return;}
  const rule=contractRule(dayKey());
  app.innerHTML=`<main class="page expeditions-page">${header('BEYOND THE MAIN ROAD','Expeditions','camp')}<p class="intro">Optional battles. Distinct rules. Rewards worth returning for.</p><article class="expedition-card abyss"><div class="expedition-art" style="background-image:url('${art('arena-4')}')"></div><div class="expedition-body"><p class="eyebrow">ENDLESS · 32 ENEMIES PER DEPTH</p><h2>The Abyss</h2><p>Descend through increasingly dangerous groups. Each depth brings a new rule. Recover a little between depths, then decide whether to press on.</p><div class="expedition-meta"><span>Best depth <b>${r.abyssBest}</b></span><span>Gold · Essence · Records</span></div>${button('enter-trip',`Begin the descent ${icon('next')}`,'primary wide','data-id="abyss"')}</div></article><div class="section-head"><h2>Sanctuary trials</h2><span>32 enemies · fixed challenges</span></div>${SANCTUARIES.map(s=>{const unlocked=r.cleared>=s.unlock,done=r.sanctuaries.includes(s.id);return `<article class="expedition-card ${!unlocked?'locked':''}"><div class="expedition-art" style="background-image:url('${art('arena-'+s.arena)}')"></div><div class="expedition-body"><p class="eyebrow">${done?'MASTERED · ':''}${s.subtitle.toUpperCase()}</p><h2>${s.name}</h2><p>${s.text}</p><div class="reward-line">${icon('gem')} ${s.reward}${done?' · earned':' · first-clear relic'}</div>${button('enter-trip',unlocked?`${done?'Return to the trial':'Enter the sanctuary'} ${icon('next')}`:`Clear wave ${s.unlock} to unlock`,'secondary wide',`data-id="${s.id}" ${unlocked?'':'disabled'}`)}</div></article>`;}).join('')}<div class="section-head"><h2>Daily contract</h2><span>UTC · no account required</span></div><article class="contract-card"><p class="eyebrow">${dayKey()} · ${r.contracts.includes(dayKey())?'COMPLETED':'AVAILABLE'}</p><h2>${rule==='swarm'?'A Gathering of Teeth':rule==='silence'?'The Quiet Flame':'No Time to Hesitate'}</h2><p>${rule==='swarm'?'Fallen enemies strengthen their companions.':'silence'===rule?'Mana recovery is reduced. Make every cast count.':'Enemy preparations are shorter. Keep a counter ready.'}</p>${button('enter-trip',`Take the contract ${icon('next')}`,'secondary wide','data-id="contract"')}${button('archive','Previous contracts','text-button')}</article><p class="fine">Bonus enemies are separate from the 1,024 enemies of the campaign. Replays grant smaller rewards. No timed reward disappears: previous contracts remain available.</p></main>`;
}
function renderEnding(){
  const r=current();if(!r){setScreen('title');return;}
  app.innerHTML=`<main class="ending-screen"><p class="eyebrow">THE LAST THRESHOLD IS OPEN</p><h1>An oath<br><em>fulfilled.</em></h1><div class="ending-duo">${r.heroes.map(h=>`<img src="${art(h.classId)}" alt="${CLASSES[h.classId].name}">`).join('')}</div><p>${esc(r.heroes.map(h=>h.name).join(' & '))}<br>Two souls. A dawn of your own.</p><div class="ending-records"><span><b>32</b> waves</span><span><b>${fmt(r.kills)}</b> foes</span><span><b>${Math.floor(r.time/60)}</b> minutes</span></div>${button('camp','Beyond the campaign '+icon('next'),'primary wide')}${button('new','Begin another oath','secondary wide')}${button('title','Return to title','text-button')}</main>`;
}
function renderRecords(){
  const runs=profile.runs,total=runs.reduce((n,r)=>n+r.kills,0),maxDepth=Math.max(0,...runs.map(r=>r.abyssBest));
  const achievements=[['First blood','Defeat your first enemy.',total>=1],['Two souls','Recruit a companion.',runs.some(r=>r.heroes.length===2)],['Dawnbringer','Complete all 32 waves.',runs.some(r=>r.cleared===32)],['Beyond the gate','Clear a sanctuary trial.',runs.some(r=>r.sanctuaries.length>0)],['Into the Abyss','Clear Abyss depth 5.',maxDepth>=5],['A practiced hand','Interrupt 50 preparations.',runs.reduce((n,r)=>n+r.interrupts,0)>=50],['Thousandfold','Defeat 1,000 enemies.',total>=1000]];
  app.innerHTML=`<main class="page">${header('YOUR JOURNEYS','Records')}<div class="records-grid"><div><b>${fmt(total)}</b><span>Enemies defeated</span></div><div><b>${maxDepth}</b><span>Best Abyss depth</span></div><div><b>${runs.filter(r=>r.cleared===32).length}</b><span>Oaths fulfilled</span></div><div><b>${runs.reduce((n,r)=>n+r.interrupts,0)}</b><span>Interruptions</span></div></div><div class="section-head"><h2>Milestones</h2><span>Across saved adventures</span></div>${achievements.map(([name,text,done])=>`<article class="milestone ${done?'earned':''}">${icon(done?'crown':'star')}<div><h3>${name}</h3><p>${text}</p></div><span>${done?'EARNED':'LOCKED'}</span></article>`).join('')}</main>`;
}
function closeModal(){modal?.close();modal?.remove();modal=null;paused=false;returnFocus?.focus();returnFocus=null;last=performance.now();}
function dialog(title:string,body:string,kicker='HOLLOW OATH II'){
  const focus=document.activeElement instanceof HTMLElement?document.activeElement:null;closeModal();returnFocus=focus;
  modal=document.createElement('dialog');modal.className='sheet';modal.innerHTML=`<div class="sheet-head"><div><p class="eyebrow">${kicker}</p><h2>${title}</h2></div><button class="icon-button" data-action="close" aria-label="Close">${icon('close')}</button></div><div class="sheet-body">${body}</div>`;document.body.append(modal);modal.addEventListener('cancel',e=>{e.preventDefault();closeModal();});modal.showModal();
}
function options(){
  dialog('Options',`<label class="toggle"><span>${icon('sound')} Mute all sound</span><input type="checkbox" data-setting="muted" ${profile.settings.muted?'checked':''}></label><label class="slider-label">Music <input type="range" min="0" max="1" step=".05" value="${profile.settings.music}" data-setting="music"></label><label class="slider-label">Sound effects <input type="range" min="0" max="1" step=".05" value="${profile.settings.sfx}" data-setting="sfx"></label><label class="toggle"><span>Battle animations</span><input type="checkbox" data-setting="motion" ${profile.settings.motion?'checked':''}></label><div class="menu-stack">${button('sound-test','Enable / test sound','secondary wide')}${!pwa.standalone()?button('install',`${icon('download')} Install game`,'secondary wide'):''}${button('guide',`${icon('book')} How to play`,'secondary wide')}${button('export','Export all adventures','secondary wide')}${button('import','Import a backup','secondary wide')}${button('check-update','Check for updates','secondary wide')}${pwa.hasUpdate()?button('apply-update','Install update','primary wide'):''}${current()?button('save-title','Save & return to title','text-button'):''}</div><p class="fine" id="offline-state">${pwa.offlineState()}</p><p class="fine">Version 1.3.1 · No account · No tracking<br>Progress stays in this browser. Export to move between devices.</p>`);
}
function guide(){dialog('A few good decisions.',`<div class="guide"><p><b>Automatic combat.</b> Each hero repeats the selected order. Steel is free. Magic spends MP: tap its button to select a spell, then tap again to cycle Fire, Ice and Storm. Heal spends 8 MP per action to restore that hero, then returns to Steel when HP is full or mana runs out. Every class can heal. After wave 4, recruit a companion with independent orders.</p><p><b>Break the seal.</b> Some foes resist most damage until struck with the order shown above them: Steel, Fire, Ice or Storm. A matching ability also breaks it. Boss transformations can reveal a new seal. Keep enough mana to answer.</p><p><b>Special abilities.</b> Each hero has two special abilities. Tap to cast; hold to inspect. Mana and cooldowns limit their use. Keys 1–4 activate them on desktop.</p><p><b>Choose a priority.</b> Tap a monster or its name to focus both heroes. When it falls, they select the next living enemy. Guards protect their companions; healers restore them.</p><p><b>Read the preparation.</b> Heavy blows, curses and healing have a visible countdown. Sunder, Rime Lance, Deathmark and Dawn Verdict interrupt it. Shields can absorb the danger instead.</p><p><b>Make a duo.</b> Exposed and marked foes take more damage from both allies. Shadow Fang exploits a mark. Bastion protects a spellcaster; Mend helps a fragile attacker survive.</p><p><b>Prepare your return.</b> Defeat restarts the current wave, but keeps gold, essence, experience and equipment. The camp button lets you retreat voluntarily. Shop at camp, after defeat or between chapters.</p><p><b>Chapter guardians.</b> Every fourth wave ends with an animated entrance and a much tougher guardian. Three to five phases change its seal and attack sequence. A phase break briefly freezes combat; HP never resets. Tap Begin battle or Continue battle to skip the presentation.</p><p><b>Keep going.</b> Each wave contains exactly 32 monsters, including its guardian. Eight chapters lead to the final threshold. Optional expeditions unlock with your companion.</p><p><b>Pause freely.</b> The pause button, menus, held descriptions and a hidden tab pause the simulation. Space pauses on desktop. No progress is simulated while the app is closed.</p><p><b>Keep your adventures.</b> Save automatically, export a backup from Options and import it on another device. Offline play becomes available once the download finishes.</p></div>${button('close','Ready to begin','primary wide')}`,'FIELD GUIDE');}
function inspectSkill(hero:number,index:number){const r=current(),h=r?.heroes[hero];if(!h)return;const skill=SKILLS[CLASSES[h.classId].skills[index] as SkillId];dialog(skill.name,`<div class="skill-inspect" style="color:${skill.color}">${icon(skill.icon)}</div><p>${skill.text}</p><div class="inspect-stats"><span>Level ${h.skills[index]} / 6</span><span>${skillCost(h,index)} MP</span><span>${skill.cooldown}s cooldown</span></div><p class="fine">Higher levels increase the ability’s strength by 22% per level. Mana cost rises once at level 4.</p>${button('close','Return to battle','primary wide')}`,`${h.name.toUpperCase()} · COMBAT PAUSED`);}
function playEvents(events:CombatEvent[]){
  const r=current();if(!r)return;arena?.events(events,r);
  for(const hit of combineHeroHits(events))showHeroHit(hit,stats(r.heroes[hit.target]!).hp,profile.settings.motion);
  const now=performance.now();
  for(const event of events){
    if(event.kind==='cast')audio.sound(event.skill==='ember'?'fire':event.skill==='rime'?'ice':event.skill==='mend'?'heal':event.skill==='bastion'?'guard':event.skill==='verdict'?'storm':'steel');
    else if(event.kind==='damage'&&!events.some(c=>c.kind==='cast'&&c.hero===event.hero)&&now-lastSound>100){audio.sound(event.action==='ember'?'fire':event.action==='rime'?'ice':event.action==='storm'?'storm':'steel');lastSound=now;}
    else if(event.kind==='heal'&&event.hero!==-1){audio.sound('heal');const panel=document.getElementById(`hero-${event.target}`);panel?.classList.remove('healing');requestAnimationFrame(()=>panel?.classList.add('healing'));}
    else if(event.kind==='ward-break'){audio.sound('guard');toast('Seal broken. Your attacks regain full strength.');}
    else if(event.kind==='transform'||event.kind==='boss-phase'){audio.sound('guard');}
    else if(event.kind==='hero-hit'){audio.sound((event.amount??0)>0?'hit':'guard');}
  }
}
function doCast(hero:number,index:number){
  const r=current();if(!r||paused||modal||r.bossScene)return;
  const h=r.heroes[hero];if(!h)return;
  if(h.cooldowns[index]!>0){toast('That ability is recovering.');return;}
  if(h.mp<skillCost(h,index)){toast('Not enough mana. Basic attacks continue automatically.');return;}
  playEvents(cast(r,hero,index));updateHud();save();
}
function goRun(){
  const r=current();if(!r){setScreen('title');return;}
  paused=false;
  if(r.phase==='recruit'){selectRecruit=true;selected=CLASS_IDS.find(id=>id!==r.heroes[0]!.classId)!;setScreen('select');}
  else if(r.phase==='complete')setScreen('ending');else if(['camp','defeat','expedition-clear'].includes(r.phase))setScreen('camp');else setScreen('battle');
}
function confirmAction(title:string,text:string,action:string,id=''){dialog(title,`<p>${text}</p>${button(action,'Confirm','primary wide',`data-id="${esc(id)}"`)}${button('close','Cancel','secondary wide')}`);}
async function action(name:string,el:HTMLElement){
  const r=current();
  switch(name){
    case 'title':save();setScreen('title');break;
    case 'new':audio.unlock('selection');soundRequested=true;if(profile.runs.length>=24){toast('Your 24 adventure slots are full. Export a backup, then delete an old adventure.');break;}selectRecruit=false;selected='vanguard';setScreen('select');break;
    case 'choose':{
      if(selectRecruit&&r){if(recruit(r,selected)){audio.sound('reward');save();setScreen('camp');}}
      else{const value=document.querySelector<HTMLInputElement>('#hero-name')?.value;const run=newRun(selected,value);profile.runs.push(run);profile.activeId=run.id;saveAllowed=true;save();audio.unlock('battle-1');soundRequested=true;warmArt();setScreen('battle');}break;
    }
    case 'continue':if(r)audio.unlock(runMusic(r));soundRequested=true;goRun();break;
    case 'load':setScreen('load');break;
    case 'load-run':profile.activeId=el.dataset.id!;save();if(current())audio.unlock(runMusic(current()!));soundRequested=true;goRun();break;
    case 'delete-run':confirmAction('Delete this adventure?','Export a backup first if you want to keep it. Other adventures will remain unchanged.','confirm-delete',el.dataset.id);break;
    case 'confirm-delete':profile.runs=profile.runs.filter(r=>r.id!==el.dataset.id);if(profile.activeId===el.dataset.id)profile.activeId=profile.runs[0]?.id??null;closeModal();save();setScreen('load');break;
    case 'camp':if(r&&r.phase==='recruit'){goRun();break;}setScreen('camp');break;
    case 'resume':if(r&&resume(r)){save();goRun();}break;
    case 'retreat':confirmAction('Return to camp?','The current wave restarts at its first group. All earned gold, essence and experience are kept.','confirm-retreat');break;
    case 'confirm-retreat':if(r){retreat(r);closeModal();save();goRun();}break;
    case 'boss-begin':if(r){finishBossScene(r);updateBossPresentation(r);updateHud();save();}break;
    case 'pause':paused=true;dialog('Take a breath.',`<p>Your heroes are waiting. Combat is paused.</p>${button('unpause','Resume battle '+icon('play'),'primary wide')}${button('options','Options','secondary wide')}${button('guide','Field guide','secondary wide')}${button('retreat','Retreat to camp','secondary wide')}${button('save-title','Save & return to title','text-button')}`,'COMBAT PAUSED');break;
    case 'unpause':paused=false;closeModal();break;
    case 'close':paused=false;closeModal();break;
    case 'options':options();break;
    case 'guide':guide();break;
    case 'title-sound':if(!soundRequested){profile.settings.muted=false;soundRequested=true;}else profile.settings.muted=!profile.settings.muted;audio.configure(profile.settings);audio.unlock(musicScene());save();renderTitle();break;
    case 'sound-test':audio.unlock(musicScene());audio.sound('steel');toast('Sound enabled.');break;
    case 'install':{const text=await pwa.install();dialog('Install Hollow Oath II',`<p>${text}</p><p class="fine">After the offline download finishes, the installed game can run without a connection. Export a backup before moving between browsers.</p>${button('close','Understood','primary wide')}`);break;}
    case 'check-update':toast(await pwa.checkUpdates());if(pwa.hasUpdate())options();break;
    case 'apply-update':save();pwa.applyUpdate();break;
    case 'save-title':save();closeModal();paused=false;setScreen('title');break;
    case 'export':{save();const url=URL.createObjectURL(new Blob([exportText(profile)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='hollow-oath-2-backup.json';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Backup exported.');break;}
    case 'import':{
      const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.append(input);input.addEventListener('cancel',()=>input.remove(),{once:true});input.addEventListener('change',async()=>{const file=input.files?.[0];input.remove();if(!file)return;if(file.size>4_000_000){toast('This backup is too large.');return;}const incoming=importText(await file.text());if(!incoming){toast('This is not a valid Hollow Oath II backup.');return;}
        const fresh=incoming.runs.filter(a=>!profile.runs.some(b=>b.id===a.id));const updates=incoming.runs.filter(a=>profile.runs.some(b=>b.id===a.id));
        const apply=()=>{for(const a of updates){const i=profile.runs.findIndex(b=>b.id===a.id);profile.runs[i]=a;}profile.runs.push(...fresh);profile.activeId=incoming.activeId??profile.activeId;saveAllowed=true;save();closeModal();setScreen('load');toast('Backup imported.');};
        if(profile.runs.length+fresh.length>24){toast('Import would exceed 24 adventures. Export and delete older ones first.');return;}
        if(updates.length){dialog('Replace matching adventures?',`<p>This backup contains ${updates.length} adventure(s) already on this device. Importing replaces those versions. Other adventures are kept.</p><button class="primary wide" id="confirm-import">Import and replace</button>${button('close','Cancel','secondary wide')}`);document.getElementById('confirm-import')!.addEventListener('click',apply,{once:true});}else apply();});input.click();break;
    }
    case 'buy-gear':if(r&&buyGear(r,shopHero,el.dataset.slot as 'weapon'|'armor'|'focus')){audio.sound('reward');save();renderCamp();}break;
    case 'buy-skill':if(r&&buySkill(r,shopHero,Number(el.dataset.index))){audio.sound('reward');save();renderCamp();}break;
    case 'expeditions':if(r&&r.heroes.length===2)setScreen('expeditions');break;
    case 'enter-trip':if(r&&enterExpedition(r,el.dataset.id!)){save();setScreen('battle');}break;
    case 'leave-trip':if(r){retreat(r);save();setScreen('camp');}break;
    case 'deeper':if(r&&nextDepth(r)){save();setScreen('battle');}break;
    case 'archive':{const dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-i-1);return dayKey(d);});dialog('Contract archive',`<p>Past contracts remain available. First-clear rewards are earned once per contract.</p><label class="name-label" for="contract-date">Choose any past contract<input id="contract-date" type="date" max="${dayKey()}" value="${dates[0]}"></label>${button('archive-date','Play selected contract','primary wide')}${dates.map(d=>button('archived-contract',`${d} · ${contractRule(d)}`,'secondary wide',`data-date="${d}"`)).join('')}`);break;}
    case 'archive-date':{const date=document.querySelector<HTMLInputElement>('#contract-date')?.value;if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=dayKey()&&r&&enterExpedition(r,'contract',date)){closeModal();save();setScreen('battle');}break;}
    case 'archived-contract':if(r&&enterExpedition(r,'contract',el.dataset.date)){closeModal();save();setScreen('battle');}break;
    case 'records':setScreen('records');break;
    case 'enemy-info':if(r)dialog('Read your opponents.',r.enemies.filter(e=>e.hp>0).map(e=>`<article class="enemy-inspect"><img src="${art(e.art+(e.form===2?'-form2':''))}" alt=""><div><h3>${e.name}</h3><p>${e.boss?CHAPTERS[chapterIndex(effectiveWave(r))]!.hint:FOES[e.family]!.description}</p><small>${Math.ceil(e.hp)} / ${e.maxHp} HP · ${e.chapterBoss?'Two forms':e.boss?'Guardian':'Weak to '+FOES[e.family]!.weakness}${e.ward?' · Seal: '+MODE_INFO[e.ward].name:''}</small></div></article>`).join('')+button('close','Return to battle','primary wide'),'COMBAT PAUSED');break;
  }
}
let held=false,holdTimer=0;
document.addEventListener('pointerdown',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-cast]');held=false;if(b){window.clearTimeout(holdTimer);holdTimer=window.setTimeout(()=>{held=true;const [h,i]=b.dataset.cast!.split(',').map(Number);inspectSkill(h!,i!);},450);}});
document.addEventListener('pointerup',()=>window.clearTimeout(holdTimer));document.addEventListener('pointercancel',()=>window.clearTimeout(holdTimer));
document.addEventListener('contextmenu',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-cast]');if(b){e.preventDefault();window.clearTimeout(holdTimer);held=true;const [h,i]=b.dataset.cast!.split(',').map(Number);inspectSkill(h!,i!);}});
document.addEventListener('click',e=>{
  const el=(e.target as HTMLElement).closest<HTMLElement>('button');if(!el||(el as HTMLButtonElement).disabled)return;
  if(el.dataset.order){const r=current();if(r&&!modal&&!paused){const [index,order]=el.dataset.order.split(',');const i=Number(index),h=r.heroes[i];if(h){let next=order as CombatMode;if(order==='magic'){const spells:CombatMode[]=['ember','rime','storm'];next=spells.includes(h.mode??'steel')?spells[(spells.indexOf(h.mode!)+1)%3]!:preferredSpell(h);}if(setMode(r,i,next)){audio.sound('select');updateHud();save();}}}}
  else if(el.dataset.cast){if(held){held=false;return;}const [h,i]=el.dataset.cast.split(',').map(Number);doCast(h!,i!);}
  else if(el.dataset.class){selected=el.dataset.class as ClassId;audio.sound('select');renderSelect();}
  else if(el.dataset.target){const r=current();if(r&&!modal){r.target=Number(el.dataset.target);updateHud();}}
  else if(el.dataset.shopHero){shopHero=Number(el.dataset.shopHero);renderCamp();}
  else if(el.dataset.relic){const r=current();if(r&&r.relics.includes(el.dataset.relic)){r.relic=el.dataset.relic;save();renderCamp();}}
  else if(el.dataset.action)void action(el.dataset.action,el);
});
document.addEventListener('input',e=>{const el=e.target as HTMLInputElement,key=el.dataset.setting;if(!key)return;if(key==='muted'||key==='motion')profile.settings[key]=el.checked;else if(key==='music'||key==='sfx')profile.settings[key]=Number(el.value);audio.configure(profile.settings);if(arena)arena.motion=profile.settings.motion;if(titleFx)titleFx.motion=profile.settings.motion;app.classList.toggle('reduce-motion',!profile.settings.motion);save();});
document.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,textarea,select'))return;
  if(screen==='battle'&&!modal&&/^[1-4]$/.test(e.key)){e.preventDefault();const n=Number(e.key)-1;doCast(Math.floor(n/2),n%2);}
  if(e.code==='Space'&&screen==='battle'&&!modal){e.preventDefault();void action('pause',app);}
});
document.addEventListener('visibilitychange',()=>{save();last=performance.now();if(document.hidden)audio.suspend();else audio.restore();});
window.addEventListener('pagehide',save);window.addEventListener('pwa-ready',()=>{if(modal?.querySelector('#offline-state'))modal.querySelector('#offline-state')!.textContent=pwa.offlineState();});
function loop(now:number){
  const dt=Math.min(.25,Math.max(0,(now-last)/1000));last=now;const r=current();if(screen==='title'&&!document.hidden)titleFx?.draw(now);
  if(screen==='battle'&&r){
    updateBossPresentation(r);
    const sceneImage=document.querySelector<HTMLImageElement>('#boss-scene img');
    const sceneReady=!r.bossScene||Boolean(sceneImage?.complete);
    if(!paused&&!modal&&!document.hidden&&sceneReady){playEvents(tick(r,dt));
      if(r.phase!==lastPhase){lastPhase=r.phase;save();if(!['fight','transition'].includes(r.phase)){goRun();}else setMusic();}
    }
    updateBossPresentation(r);arena?.draw(r,now);if(now-lastHud>90){updateHud();lastHud=now;}
    if(now-lastSave>3500){save();lastSave=now;}
  }
  requestAnimationFrame(loop);
}
audio.configure(profile.settings);warmArt();render();void pwa.register();requestAnimationFrame(loop);
if(loaded.error){window.setTimeout(()=>toast(loaded.error!),300);try{const raw=localStorage.getItem('hollow-oath-2.profile.v1');if(raw)localStorage.setItem('hollow-oath-2.recovery',raw);}catch{/* Keep original untouched when storage fails. */}}
