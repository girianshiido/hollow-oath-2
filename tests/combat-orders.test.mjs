import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CLASS_IDS,FOES,foeUnlockWave,MODE_INFO} from '../src/content.ts';
import {newRun,newHero,setMode,tick,stats,spawnGroup} from '../src/engine.ts';
import {validRun,defaults,exportText,importText} from '../src/saves.ts';
import {CREATURE_BOUNDS} from '../src/creature-bounds.ts';
import {impactPoint,swordEndpoints} from '../src/combat-fx.ts';

function action(classId,mode){const r=newRun(classId),h=r.heroes[0];h.hp=10;h.clock=.999;h.mp=stats(h).mp;r.enemies[0].hp=r.enemies[0].maxHp=10000;setMode(r,0,mode);return r;}
test('all four classes can spend a turn and mana healing themselves',()=>{
 for(const id of CLASS_IDS){const r=action(id,'mend'),h=r.heroes[0],mp=h.mp;const events=tick(r,.05);assert.ok(h.hp>10,id);assert.ok(h.mp<mp-7,id);assert.ok(events.some(e=>e.kind==='heal'&&e.hero===0&&e.target===0&&e.action==='mend'));assert.ok(!events.some(e=>e.kind==='damage'));}
});
test('healing finishes at full HP and insufficient MP returns to free Steel',()=>{
 const r=action('nightblade','mend'),h=r.heroes[0];h.hp=stats(h).hp-1;tick(r,.05);assert.equal(h.hp,stats(h).hp);assert.equal(h.mode,'steel');
 h.mode='mend';h.mp=0;h.hp=10;h.clock=.999;const events=tick(r,.05);assert.equal(h.mode,'steel');assert.equal(h.hp,10);assert.ok(events.some(e=>e.kind==='damage'&&e.action==='steel'));
 h.hp=0;assert.equal(setMode(r,0,'mend'),false);tick(r,.2);assert.equal(h.hp,0);
});
test('each offensive order produces its own action and spends the advertised mana',()=>{
 for(const mode of ['steel','ember','rime','storm']){const r=action('vanguard',mode),h=r.heroes[0],mp=h.mp;const events=tick(r,.05);assert.ok(events.some(e=>e.kind==='damage'&&e.action===mode));assert.ok(Math.abs(h.mp-(mp-MODE_INFO[mode].cost))<.1);}
});
test('a matching attack breaks a seal; wrong magic remains strongly resisted',()=>{
 const wrong=action('hexweaver','storm'),right=action('hexweaver','rime');wrong.enemies[0].ward=right.enemies[0].ward='rime';
 const a=tick(wrong,.05),b=tick(right,.05);assert.equal(wrong.enemies[0].ward,'rime');assert.equal(right.enemies[0].ward,undefined);assert.ok(b.some(e=>e.kind==='ward-break'));
 assert.ok(b.find(e=>e.kind==='damage').amount>a.find(e=>e.kind==='damage').amount*3);
});
test('48 distinct regular families include 16 introductions every second wave',()=>{
 assert.equal(FOES.length,48);assert.equal(new Set(FOES.map(f=>f.name)).size,48);
 for(let family=0;family<32;family++)assert.equal(foeUnlockWave(family),1);
 const seen=new Set();
 for(let wave=1;wave<=32;wave++){const r=newRun('vanguard');r.wave=wave;r.cursor=0;spawnGroup(r);if(wave%2===0)assert.equal(r.enemies[0].family,31+wave/2);
 while(r.cursor<32){spawnGroup(r);for(const e of r.enemies){if(!e.boss)seen.add(e.family);assert.ok(foeUnlockWave(e.family)<=wave);}r.cursor+=r.enemies.length;}}
 assert.equal(seen.size,48);
});
test('version-one backups without orders remain valid; new families and seals round-trip',()=>{
 const legacy=newRun('vanguard');delete legacy.heroes[0].mode;assert.ok(validRun(legacy));
 const r=newRun('hexweaver');r.wave=32;spawnGroup(r);r.heroes.push(newHero('oathkeeper'));r.heroes[1].mode='mend';r.enemies[0].ward='storm';assert.equal(r.enemies[0].family,47);assert.ok(validRun(r));
 const p=defaults();p.runs=[legacy,r];p.activeId=r.id;assert.deepEqual(importText(exportText(p)),p);
 r.heroes[0].mode='invalid';assert.equal(validRun(r),false);
});
test('three sword paths cross the visible body for every creature, including Ilyan and Seris attacks',()=>{
 for(const bounds of Object.values(CREATURE_BOUNDS)){const [left,top,right,bottom]=bounds,box={x:10+left*300,y:15+top*300,w:(right-left)*300,h:(bottom-top)*300};const center=impactPoint(box);
  assert.ok(center.y>box.y&&center.y<box.y+box.h*.6);
  const paths=[0,1,2].map(i=>swordEndpoints(box,i));assert.equal(new Set(paths.map(JSON.stringify)).size,3);
  for(const p of paths){assert.ok(Math.abs((p.ax+p.bx)/2-center.x)<.001);assert.ok(Math.abs((p.ay+p.by)/2-center.y)<.001);}
 }
});
