import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRun,newHero,stats,spawnGroup,tick,cast,recruit,buyGear,buySkill,retreat,resume,enterExpedition,nextDepth,dayKey,contractRule} from '../src/engine.ts';
import {CLASSES,CLASS_IDS} from '../src/content.ts';
import {defaults,decodeProfile,validRun,exportText,importText} from '../src/saves.ts';

test('32 monsters per wave, with stable group IDs and a final guardian',()=>{
 for(let wave=1;wave<=32;wave++){
  const r=newRun('vanguard');r.wave=wave;let count=0;
  while(r.cursor<32){spawnGroup(r);assert.ok(r.enemies.length>=1&&r.enemies.length<=3);assert.equal(new Set(r.enemies.map(e=>e.id)).size,r.enemies.length);assert.ok(r.enemies.every(e=>e.id<=31));if(r.cursor===31)assert.ok(r.enemies[0].boss);count+=r.enemies.length;r.cursor+=r.enemies.length;}
  assert.equal(count,32);assert.equal(r.cursor,32);
 }
});
test('solo start, companion after chapter one, no duplicate classes',()=>{
 const r=newRun('hexweaver');assert.equal(r.heroes.length,1);assert.equal(recruit(r,'nightblade'),false);
 r.phase='recruit';r.cleared=4;r.wave=5;
 assert.equal(recruit(r,'hexweaver'),false);assert.equal(recruit(r,'vanguard'),true);assert.equal(r.heroes.length,2);assert.equal(r.heroes[1].level,r.heroes[0].level);assert.equal(recruit(r,'oathkeeper'),false);
});
test('basic attacks remain free and fallen targets are replaced',()=>{
 const r=newRun('hexweaver');r.wave=5;spawnGroup(r);r.heroes[0].hp=1e6;r.heroes[0].mp=0;r.enemies[0].hp=1;r.target=r.enemies[0].id;
 const oldGold=r.gold;tick(r,1.2);assert.ok(r.gold>oldGold);assert.ok(r.heroes[0].mp<5);assert.ok(r.kills>=1);
});
test('cooldowns and mana prevent repeat casts; interruption stops preparation',()=>{
 const r=newRun('hexweaver');const e=r.enemies[0];e.hp=e.maxHp=1000;e.preparation=2;e.intent='heavy';
 const events=cast(r,0,1);assert.ok(events.some(e=>e.kind==='interrupt'));assert.equal(e.preparation,0);assert.equal(r.interrupts,1);
 const mp=r.heroes[0].mp;assert.equal(cast(r,0,1).length,0);assert.equal(r.heroes[0].mp,mp);
 r.heroes[0].cooldowns[0]=0;r.heroes[0].mp=0;assert.equal(cast(r,0,0).length,0);
});
test('mark and exposed states benefit both heroes; Shadow Fang exploits marks',()=>{
 const a=newRun('nightblade'),b=structuredClone(a);for(const r of [a,b])r.enemies[0].hp=r.enemies[0].maxHp=10000;
 const normal=cast(a,0,1).find(e=>e.kind==='damage').amount;cast(b,0,0);const marked=cast(b,0,1).find(e=>e.kind==='damage').amount;assert.ok(marked>normal*2);
});
test('Mend targets the most wounded living ally and never revives a fallen ally',()=>{
 const r=newRun('oathkeeper');r.heroes.push(newHero('nightblade'));r.heroes[1].hp=10;const before=r.heroes[1].hp;cast(r,0,0);assert.ok(r.heroes[1].hp>before);
 r.heroes[1].hp=0;r.heroes[0].cooldowns[0]=0;r.heroes[0].mp=100;cast(r,0,0);assert.equal(r.heroes[1].hp,0);
});
test('boss transformation changes behavior without replacing HP or losing progress',()=>{
 const r=newRun('vanguard');r.wave=4;r.cursor=31;spawnGroup(r);const e=r.enemies[0];e.hp=e.maxHp*.51;r.heroes[0].level=20;
 const oldSpeed=e.speed;cast(r,0,0);assert.equal(e.form,2);assert.ok(e.speed>oldSpeed);assert.ok(e.hp<=e.maxHp*.5);assert.ok(e.hp>0);
});
test('retreat preserves earnings, upgrades and XP while resetting only wave position',()=>{
 const r=newRun('vanguard');r.gold=500;r.essence=12;r.heroes[0].xp=30;r.cursor=10;
 assert.equal(buyGear(r,0,'weapon'),false);retreat(r);assert.equal(r.gold,500);assert.equal(r.cursor,0);assert.equal(r.heroes[0].xp,30);
 assert.ok(buyGear(r,0,'weapon'));assert.ok(buySkill(r,0,0));const weapon=r.heroes[0].weapon;assert.ok(resume(r));assert.equal(r.heroes[0].weapon,weapon);assert.equal(r.phase,'fight');
});
test('bonus expeditions do not advance or overwrite campaign progression',()=>{
 const r=newRun('vanguard');r.phase='recruit';r.cleared=4;r.wave=5;recruit(r,'hexweaver');assert.ok(enterExpedition(r,'lantern'));assert.equal(r.trip.mode,'sanctuary');assert.equal(r.wave,5);retreat(r);assert.equal(r.trip,null);assert.equal(r.wave,5);assert.equal(r.cleared,4);
});
test('sanctuary first-clear relic is awarded once; replays remain possible',()=>{
 const r=newRun('vanguard');r.phase='recruit';r.cleared=4;r.wave=5;recruit(r,'hexweaver');enterExpedition(r,'lantern');r.trip.cursor=31;spawnGroup(r);r.enemies[0].hp=1;r.heroes[0].clock=.99;tick(r,3);
 assert.equal(r.phase,'expedition-clear');assert.deepEqual(r.relics,['lantern']);assert.deepEqual(r.sanctuaries,['lantern']);retreat(r);enterExpedition(r,'lantern');r.trip.cursor=31;spawnGroup(r);r.enemies[0].hp=1;r.heroes[0].clock=.99;tick(r,3);assert.equal(r.relics.length,1);
});
test('Abyss continues by depths and offers limited recovery',()=>{
 const r=newRun('vanguard');r.phase='recruit';r.wave=5;r.cleared=4;recruit(r,'hexweaver');enterExpedition(r,'abyss');r.phase='expedition-clear';r.heroes[0].hp=10;const max=stats(r.heroes[0]).hp;assert.ok(nextDepth(r));assert.equal(r.trip.floor,2);assert.ok(r.heroes[0].hp>10&&r.heroes[0].hp<max);assert.equal(r.wave,5);
});
test('daily contracts are deterministic and old dates remain playable',()=>{
 const key=dayKey(new Date('2026-11-12T23:59:00Z'));assert.equal(key,'2026-11-12');assert.equal(contractRule(key),contractRule(key));
 const r=newRun('nightblade');r.phase='recruit';r.cleared=4;r.wave=5;recruit(r,'oathkeeper');assert.ok(enterExpedition(r,'contract','2026-10-29'));assert.equal(r.trip.id,'2026-10-29');
});
test('save round-trip preserves mid-combat state; malformed and old-game backups are rejected',()=>{
 const p=defaults();const r=newRun('hexweaver');tick(r,3);p.runs=[r];p.activeId=r.id;
 assert.ok(validRun(r));assert.deepEqual(importText(exportText(p)),p);
 const bad=structuredClone(p);bad.runs[0].heroes[0].weapon=NaN;assert.equal(decodeProfile(bad),null);
 const duplicate=structuredClone(p);duplicate.runs[0].heroes.push(structuredClone(duplicate.runs[0].heroes[0]));assert.equal(decodeProfile(duplicate),null);
 assert.equal(importText('{"game":"Hollow Oath","version":1}'),null);assert.equal(importText('{broken'),null);
});
test('invalid timesteps and paused/camp states never advance combat',()=>{
 const r=newRun('vanguard'),before=JSON.stringify(r);tick(r,NaN);tick(r,-1);assert.equal(JSON.stringify(r),before);retreat(r);const t=r.time;tick(r,30);assert.equal(r.time,t);
});
test('every class has exactly two distinct usable skills',()=>{for(const id of CLASS_IDS){const r=newRun(id);assert.equal(CLASSES[id].skills.length,2);assert.notEqual(CLASSES[id].skills[0],CLASSES[id].skills[1]);assert.ok(cast(r,0,0).length);}});
