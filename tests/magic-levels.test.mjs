import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newRun,newHero,stats,retreat,buyMagic,setMode,tick} from '../src/engine.ts';
import {MAGIC_MODES,MAX_MAGIC_LEVEL} from '../src/content.ts';
import {magicLevel,magicPower,modeCost,magicCostAtLevel,magicUpgradeCost} from '../src/magic.ts';
import {defaults,validRun,exportText,importText} from '../src/saves.ts';

test('all four basic spells have independent permanent levels, with the same initial costs',()=>{
 const r=newRun('vanguard'),h=r.heroes[0];assert.deepEqual(MAGIC_MODES.map(mode=>magicLevel(h,mode)),[1,1,1,1]);
 assert.deepEqual(['steel',...MAGIC_MODES].map(mode=>modeCost(h,mode)),[0,4,5,6,8]);
 assert.equal(buyMagic(r,0,'ember'),false);retreat(r);r.essence=1000;r.heroes.push(newHero('oathkeeper'));
 assert.equal(buyMagic(r,0,'ember'),true);assert.equal(r.essence,994);assert.equal(magicLevel(h,'ember'),2);
 assert.equal(magicLevel(h,'mend'),1);assert.equal(magicLevel(r.heroes[1],'ember'),1);
 assert.equal(magicUpgradeCost(h,'ember'),10);
});
test('training caps at ten, enforces its essence cost and rejects invalid purchases',()=>{
 const r=newRun('hexweaver');retreat(r);r.essence=10000;const h=r.heroes[0];
 for(const mode of MAGIC_MODES){for(let level=1;level<MAX_MAGIC_LEVEL;level++)assert.equal(buyMagic(r,0,mode),true);const before=r.essence;assert.equal(buyMagic(r,0,mode),false);assert.equal(r.essence,before);assert.equal(magicLevel(h,mode),10);}
 assert.equal(buyMagic(r,0,'steel'),false);assert.equal(buyMagic(r,8,'rime'),false);
 const poor=newRun('vanguard');retreat(poor);poor.essence=5;assert.equal(buyMagic(poor,0,'ember'),false);assert.equal(poor.essence,5);
});
test('mana costs rise only at spell levels four, seven and ten, including Heal',()=>{
 assert.deepEqual([1,2,3,4,6,7,9,10].map(level=>magicCostAtLevel('mend',level)),[8,8,8,9,9,10,10,11]);
 assert.equal(magicCostAtLevel('ember',4),5);assert.equal(magicCostAtLevel('rime',7),7);assert.equal(magicCostAtLevel('storm',10),9);
 assert.equal(magicCostAtLevel('steel',0),0);
});
function action(mode,level){const r=newRun('hexweaver'),h=r.heroes[0];h.magic[mode]=level;h.hp=1;h.clock=.999;setMode(r,0,mode);r.enemies[0].hp=r.enemies[0].maxHp=10000;r.enemies[0].armor=0;return r;}
test('real Fire, Ice and Storm actions use learned power and the displayed MP cost',()=>{
 for(const mode of ['ember','rime','storm']){const weak=action(mode,1),strong=action(mode,4),before=strong.heroes[0].mp;
 const a=tick(weak,.05).find(e=>e.kind==='damage'),b=tick(strong,.05).find(e=>e.kind==='damage');
 assert.ok(b.amount>a.amount*1.4,mode);assert.ok(Math.abs(before-strong.heroes[0].mp-modeCost(strong.heroes[0],mode))<.1);
 if(mode==='rime')assert.ok(strong.enemies[0].slowUntil>weak.enemies[0].slowUntil);}
});
test('real Heal uses its learned healing power and upgraded mana cost',()=>{
 const weak=action('mend',1),strong=action('mend',4),before=strong.heroes[0].mp;
 const a=tick(weak,.05).find(e=>e.kind==='heal'),b=tick(strong,.05).find(e=>e.kind==='heal');
 assert.ok(b.amount>a.amount);assert.ok(Math.abs(before-strong.heroes[0].mp-9)<.1);
 const empty=action('mend',4);empty.heroes[0].mp=8;tick(empty,.05);assert.equal(empty.heroes[0].mode,'steel');assert.equal(empty.heroes[0].hp,1);
});
test('legacy saves default to level one; learned ranks round-trip and invalid ranks are rejected',()=>{
 const r=newRun('oathkeeper');delete r.heroes[0].magic;assert.ok(validRun(r));assert.equal(magicLevel(r.heroes[0],'mend'),1);
 retreat(r);r.essence=20;assert.ok(buyMagic(r,0,'mend'));assert.equal(magicLevel(r.heroes[0],'mend'),2);
 const p=defaults();p.runs=[r];p.activeId=r.id;assert.deepEqual(importText(exportText(p)),p);
 r.heroes[0].magic.mend=11;assert.equal(validRun(r),false);r.heroes[0].magic.mend=1.5;assert.equal(validRun(r),false);r.heroes[0].magic={};assert.equal(validRun(r),false);
});
test('training does not replace normal character scaling or mutate HP and MP at purchase time',()=>{
 const r=newRun('vanguard');retreat(r);r.essence=100;const h=r.heroes[0],hp=h.hp,mp=h.mp,attack=stats(h).atk;
 buyMagic(r,0,'ember');assert.equal(h.hp,hp);assert.equal(h.mp,mp);assert.equal(stats(h).atk,attack);assert.ok(magicPower(h,'ember')>1);
 h.level=10;assert.equal(magicLevel(h,'ember'),2);assert.ok(stats(h).atk>attack);
});
