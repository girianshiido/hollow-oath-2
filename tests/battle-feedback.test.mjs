import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enemyCenter,enemyMeterWidth,fitLabel} from '../src/battle-layout.ts';
import {hitFeedback,combineHeroHits} from '../src/hero-feedback.ts';
import {newRun,newHero,tick} from '../src/engine.ts';

test('HP and preparation meters keep a real gap on narrow and wide battle screens',()=>{
 for(const width of [300,320,372,390,500,520])for(const count of [1,2,3]){
  const w=enemyMeterWidth(width,count),lanes=Array.from({length:count},(_,i)=>({left:enemyCenter(width,count,i)-w/2,right:enemyCenter(width,count,i)+w/2}));
  for(const lane of lanes){assert.ok(lane.left>=0);assert.ok(lane.right<=width);}
  for(let i=1;i<count;i++)assert.ok(lanes[i].left-lanes[i-1].right>=15.99,`${width}px / ${count}: touching meters`);
 }
});
test('long names fit the same lane without clipping short names',()=>{
 const measure=text=>text.length*6;assert.equal(fitLabel('Rime Bat',90,measure),'Rime Bat');
 const label=fitLabel('Carrion Acolyte',80,measure);assert.ok(label.endsWith('…'));assert.ok(measure(label)<=80);
});
test('feedback distinguishes HP loss, heavy blows, curses and fully absorbed strikes',()=>{
 assert.deepEqual(hitFeedback(12,0,'strike',100),{blocked:false,strong:false,label:'−12',detail:'HIT'});
 assert.equal(hitFeedback(2,0,'heavy',100).detail,'HEAVY HIT');assert.equal(hitFeedback(25,0,'strike',100).strong,true);
 assert.equal(hitFeedback(3,0,'curse',100).detail,'CURSE');assert.equal(hitFeedback(.2,4,'strike',100).label,'−1');
 assert.deepEqual(hitFeedback(0,40,'heavy',100),{blocked:true,strong:false,label:'BLOCKED',detail:'SHIELD'});
});
test('actual enemy impacts identify attacker, victim, attack and shield absorption',()=>{
 for(const impact of ['strike','heavy','curse']){
  const r=newRun('vanguard'),h=r.heroes[0],e=r.enemies[0];e.hp=e.maxHp=10000;e.atk=10;e.intent=impact;e.preparation=.01;h.shield=100;h.shieldUntil=100;
  const hp=h.hp,events=tick(r,.05),hit=events.find(e=>e.kind==='hero-hit');assert.ok(hit);assert.equal(hit.attacker,e.id);assert.equal(hit.target,0);assert.equal(hit.impact,impact);assert.equal(hit.amount,0);assert.ok(hit.absorbed>0);assert.equal(h.hp,hp);
 }
});
test('a sweeping heavy attack emits one impact per affected hero',()=>{
 const r=newRun('vanguard');r.heroes.push(newHero('oathkeeper'));const e=r.enemies[0];e.hp=e.maxHp=10000;e.boss=true;e.form=2;e.intent='heavy';e.preparation=.01;
 const hits=tick(r,.05).filter(e=>e.kind==='hero-hit');assert.deepEqual(hits.map(e=>e.target),[0,1]);assert.ok(hits.every(h=>h.attacker===e.id&&h.impact==='heavy'&&h.amount>0));
});

test('simultaneous hits on one hero report the total HP loss without altering combat events',()=>{
 const events=[{kind:'hero-hit',target:1,amount:33,absorbed:0,impact:'heavy'},{kind:'damage',target:1,amount:90},{kind:'hero-hit',target:1,amount:33,absorbed:2,impact:'strike'},{kind:'hero-hit',target:0,amount:0,absorbed:20,impact:'strike'}];
 const before=structuredClone(events),hits=combineHeroHits(events);assert.equal(hits.length,2);assert.equal(hits[0].amount,66);assert.equal(hits[0].absorbed,2);assert.equal(hits[0].impact,'heavy');assert.equal(hits[1].amount,0);assert.deepEqual(events,before);
});
