import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRun,spawnGroup,tick,cast,finishBossScene,retreat} from '../src/engine.ts';
import {bossPhases,bossMove,bossPhase,chapterEndurance} from '../src/bosses.ts';
import {defaults,exportText,importText,validRun} from '../src/saves.ts';
function guardian(wave=4){const r=newRun('vanguard');r.wave=wave;r.cursor=31;spawnGroup(r);return r;}
test('only chapter guardians and expedition guardians receive a protected arrival',()=>{
 for(let wave=1;wave<=32;wave++){const r=guardian(wave);assert.equal(Boolean(r.bossScene),wave%4===0);if(r.bossScene){const before=JSON.stringify(r.heroes),hp=r.enemies[0].hp,t=r.time;tick(r,1);assert.equal(r.time,t);assert.equal(JSON.stringify(r.heroes),before);assert.equal(r.enemies[0].hp,hp);assert.deepEqual(cast(r,0,0),[]);assert.ok(r.bossScene.remaining<3.2);tick(r,3);assert.equal(r.bossScene,undefined);}}
});
test('every chapter has three to five named phases and 4.5 to 6 times warden endurance',()=>{
 for(let wave=4;wave<=32;wave+=4){const phases=bossPhases(wave);assert.ok(phases.length>=3&&phases.length<=5);assert.equal(new Set(phases).size,phases.length);assert.ok(chapterEndurance(wave)>=4.5&&chapterEndurance(wave)<=6);assert.equal(bossPhase(wave,phases.length),phases.at(-1));assert.notEqual(bossMove(wave,1,1),bossMove(wave,2,1));}
});
test('overwhelming hits still expose each phase, change seals and keep one HP pool',()=>{
 for(let wave=4;wave<=32;wave+=4){const r=guardian(wave),e=r.enemies[0],count=bossPhases(wave).length,max=e.maxHp;r.heroes[0].level=99;r.heroes[0].weapon=32;r.heroes[0].hp=1e9;
  finishBossScene(r);
  // Isolate phase mechanics from equipment balance with a finite small HP pool.
  e.hp=e.maxHp=90;e.armor=0;e.ward='steel';
  for(let phase=1;phase<count;phase++){r.heroes[0].mp=1000;r.heroes[0].cooldowns=[0,0];const before=e.hp;const events=cast(r,0,0);assert.equal(e.stage,phase+1);assert.ok(e.hp>0&&e.hp<before);assert.equal(e.maxHp,90);assert.ok(e.ward);assert.equal(r.bossScene.kind,'shift');assert.ok(events.some(e=>['transform','boss-phase'].includes(e.kind)));assert.equal(r.kills,0);const frozen=JSON.stringify(r);assert.deepEqual(cast(r,0,0),[]);assert.equal(JSON.stringify(r),frozen);finishBossScene(r);}
  r.heroes[0].mp=1000;r.heroes[0].cooldowns=[0,0];cast(r,0,0);assert.equal(e.hp,0);assert.equal(r.kills,1);assert.equal(r.phase,'transition');assert.ok(max>90);
 }
});
test('arrival/phase scenes survive save round trips and retreat clears their state',()=>{
 const r=guardian(32),p=defaults();p.runs=[r];p.activeId=r.id;tick(r,.4);assert.ok(validRun(r));assert.deepEqual(importText(exportText(p)),p);assert.ok(retreat(r));assert.equal(r.bossScene,undefined);assert.ok(validRun(r));
 const bad=guardian();bad.bossScene.remaining=4;assert.equal(validRun(bad),false);bad.bossScene={kind:'wrong',remaining:1,duration:2};assert.equal(validRun(bad),false);
});
test('old mid-boss saves stay valid and never gain HP when a new phase is reached',()=>{
 const r=guardian();finishBossScene(r);const e=r.enemies[0];delete e.stage;e.form=2;e.hp=e.maxHp*.1;assert.ok(validRun(r));const before=e.hp;r.heroes[0].clock=.999;tick(r,.05);assert.ok(e.hp<=before);assert.equal(r.bossScene,undefined);
});
test('Root Queen healing is finite and cannot restore a completed phase',()=>{
 const r=guardian(20);finishBossScene(r);const e=r.enemies[0];e.maxHp=900;e.hp=674;e.stage=2;e.form=1;e.healSpent=0;e.intent='heal';e.preparation=.05;tick(r,.05);assert.equal(e.hp,675);assert.equal(e.stage,2);
 e.hp=500;e.healSpent=107;e.intent='heal';e.preparation=.05;tick(r,.05);assert.equal(e.hp,501);assert.equal(e.healSpent,108);
});
