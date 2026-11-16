import {chromium} from '../.qa-tools/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {newRun,newHero,spawnGroup,stats,retreat} from '../src/engine.ts';
import {defaults,validRun,SAVE_KEY} from '../src/saves.ts';

const address='http://127.0.0.1:4173';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:['ignore','pipe','pipe']});
let serverOutput='';server.stdout.on('data',b=>{serverOutput+=b;});server.stderr.on('data',b=>{serverOutput+=b;});
const report=[];let browser,lastPage;
function fixture(duo,{camp=false,boss=false,legacy=false}={}){
 const r=newRun('vanguard','Aldric');r.wave=duo?7:3;r.cleared=duo?4:0;
 if(duo)r.heroes.push(newHero('oathkeeper'));
 for(const h of r.heroes){h.level=10;h.weapon=4;h.armor=4;h.focus=4;const s=stats(h);h.hp=s.hp*.6;h.mp=s.mp;if(legacy)delete h.magic;}
 if(boss){r.wave=32;r.cleared=31;r.cursor=31;}spawnGroup(r);
 for(const e of r.enemies){e.hp=e.maxHp=1e6;e.atk=0;e.speed=0;}
 if(camp)retreat(r);r.essence=1000;r.gold=10000;assert.ok(validRun(r),'invalid UI fixture');
 const p=defaults();p.runs=[r];p.activeId=r.id;p.settings.muted=true;return p;
}
async function open(viewport,profile){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce'});
 await context.addInitScript(({key,profile})=>{localStorage.setItem(key,JSON.stringify(profile));},{key:SAVE_KEY,profile});
 const page=await context.newPage();lastPage=page;page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(address);await page.getByRole('button',{name:'Continue adventure',exact:true}).click();
 if(profile.runs[0].bossScene)await page.getByRole('button',{name:'Begin battle',exact:true}).click();
 await page.waitForLoadState('networkidle');return {context,page,errors};
}
async function checkLayout(page,viewport,label,duo,{checkCost=true}={}){
 const metrics=await page.evaluate(()=>{
  const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
  const game=document.querySelector('.battle-screen'),arena=document.querySelector('#arena');
  return {app:box(document.querySelector('#app')),game:box(game),arena:box(arena),scrollWidth:document.documentElement.scrollWidth,innerWidth,scrollHeight:game.scrollHeight,clientHeight:game.clientHeight,heroes:[...document.querySelectorAll('.party-controls .hero-panel')].map(e=>({box:box(e),buttons:[...e.querySelectorAll('.hero-actions button')].map(b=>({box:box(b),mode:b.dataset.order??null,cost:b.querySelector('.skill-cost').textContent,text:b.querySelector('strong').textContent,costOverflow:b.querySelector('.skill-cost').scrollWidth>b.querySelector('.skill-cost').clientWidth+1}))}))};
 });
 assert.ok(metrics.scrollWidth<=viewport.width+1,label+': horizontal overflow');
 assert.ok(metrics.scrollHeight<=metrics.clientHeight+1,label+': battle controls clipped vertically '+JSON.stringify(metrics));
 assert.equal(metrics.heroes.length,duo?2:1,label+': incorrect party');
 assert.ok(metrics.arena.h>=120,label+': arena collapsed');
 assert.ok(metrics.arena.w>=Math.min(viewport.width,1200)*((viewport.width>=700&&viewport.height<=600)?.4:.85),label+': arena does not use available width');
 if(viewport.width>=600)assert.ok(metrics.app.w>=Math.min(viewport.width,1200)-2,label+': tablet capped to phone width');
 if(duo)assert.ok(metrics.heroes[1].box.y>=metrics.heroes[0].box.bottom,label+': hero rows overlap');
 for(const [i,hero] of metrics.heroes.entries()){
  assert.equal(hero.buttons.length,7,label+': missing separate commands');const modes=hero.buttons.filter(b=>b.mode);
  assert.deepEqual(modes.map(b=>b.mode.split(',')[1]),['steel','ember','rime','storm','mend']);
  for(const b of hero.buttons){assert.ok(b.box.x>=-1&&b.box.right<=viewport.width+1,label+': button outside screen');assert.ok(b.box.y>=0&&b.box.bottom<=viewport.height+1,label+': button below viewport');assert.match(b.cost,/^\d+ MP$/);assert.equal(b.costOverflow,false,label+': clipped MP label');}
  for(const b of modes){assert.ok(Math.abs(b.box.w-modes[0].box.w)<1,label+': unequal spell widths');assert.ok(Math.abs(b.box.h-modes[0].box.h)<1,label+': unequal spell heights');assert.ok(Math.abs(b.box.y-modes[0].box.y)<1,label+': spell buttons not on one row');}
  if(checkCost)assert.deepEqual(modes.map(b=>b.cost),['0 MP','4 MP','5 MP','6 MP','8 MP'],label+': wrong level-one costs');
  if(viewport.width>=360)for(const b of hero.buttons)assert.ok(Math.abs(b.box.w-modes[0].box.w)<1,label+': unequal large action buttons');
  const fire=page.locator('[data-order="'+i+',ember"]');await fire.click();assert.equal(await fire.getAttribute('aria-pressed'),'true');await fire.click();assert.equal(await fire.getAttribute('aria-pressed'),'true',label+': Fire still cycles');
  const ice=page.locator('[data-order="'+i+',rime"]');await ice.click();assert.equal(await ice.getAttribute('aria-pressed'),'true');
 }
 report.push({label,viewport,arena:metrics.arena,heroRows:metrics.heroes.map(h=>h.box),spellButtons:metrics.heroes.map(h=>h.buttons.filter(b=>b.mode).map(b=>({name:b.text,cost:b.cost,width:b.box.w,height:b.box.h})))});
 await page.screenshot({path:'qa/responsive/'+label+'.png',fullPage:true});
}
try{
 await mkdir('qa/responsive',{recursive:true});let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(address)).ok){ready=true;break;}}catch{}await delay(100);}
 assert.ok(ready,'Preview server failed: '+serverOutput);
 browser=await chromium.launch({headless:true});
 const sizes=[[320,568],[375,667],[390,568],[390,844],[600,960],[768,1024],[800,1280],[1024,768],[1280,800],[1366,768],[844,390]];
 for(const [width,height] of sizes)for(const duo of [false,true]){
  const label=width+'x'+height+'-'+(duo?'duo':'solo');console.log('Checking '+label);
  const {context,page,errors}=await open({width,height},fixture(duo,{legacy:width===375}));
  await checkLayout(page,{width,height},label,duo);assert.deepEqual(errors,[],label+': browser errors');
  if(duo&&width===768){await page.setViewportSize({width:1024,height:768});await checkLayout(page,{width:1024,height:768},'live-rotation',true);}
  await context.close();
 }
 for(const [width,height] of [[320,568],[768,1024]]){
  const label=width+'x'+height+'-boss';console.log('Checking '+label);const {context,page,errors}=await open({width,height},fixture(true,{boss:true}));
  await checkLayout(page,{width,height},label,true);assert.deepEqual(errors,[]);await context.close();
 }
 for(const [width,height] of [[320,568],[768,1024],[1280,800]]){
  const label=width+'x'+height+'-training';console.log('Checking '+label);const {context,page,errors}=await open({width,height},fixture(true,{camp:true,legacy:true}));
  for(const mode of ['ember','rime','storm','mend'])for(let n=0;n<3;n++)await page.locator('[data-action="buy-magic"][data-mode="'+mode+'"]').click();
  for(const mode of ['ember','rime','storm','mend'])assert.match(await page.locator('[data-magic="'+mode+'"] h3').innerText(),/Lv 4/);
  await page.screenshot({path:'qa/responsive/'+label+'-camp.png',fullPage:true});
  await page.getByRole('button',{name:'Continue wave 7',exact:true}).click();
  assert.deepEqual(await page.locator('#hero-0 .order-button .skill-cost').allTextContents(),['0 MP','5 MP','6 MP','7 MP','9 MP']);
  assert.deepEqual(await page.locator('#hero-1 .order-button .skill-cost').allTextContents(),['0 MP','4 MP','5 MP','6 MP','8 MP']);
  await checkLayout(page,{width,height},label,true,{checkCost:false});assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Responsive browser checks passed: '+report.length+' scenarios.');
}catch(error){
 console.error(error);process.exitCode=1;
 if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:'qa/responsive/failure.png',fullPage:true}).catch(()=>{});
}finally{
 await writeFile('qa/responsive/report.json',JSON.stringify(report,null,2));await browser?.close();server.kill('SIGTERM');
}
