import {test} from 'node:test';
import assert from 'node:assert/strict';
import {creaturePose,creatureStem,poseAsset,deathOpacity,POSES} from '../src/animation.ts';
import {newRun,tick} from '../src/engine.ts';
const enemy=()=>({id:0,hp:100,preparation:0,clock:.1});

test('idle alternates two real drawings and respects reduced motion',()=>{
 const e=enemy();assert.equal(creaturePose(e,{},0),'idle');assert.equal(creaturePose(e,{},.7),'idle2');assert.equal(creaturePose(e,{},1.3),'idle');assert.equal(creaturePose(e,{},.7,false),'idle');
});
test('ordinary attacks anticipate before their actual strike; preparation uses windup',()=>{
 const e=enemy();e.clock=.8;assert.equal(creaturePose(e,{},2),'windup');e.clock=0;assert.equal(creaturePose(e,{strikeAt:2},2.1),'attack');assert.notEqual(creaturePose(e,{strikeAt:2},2.3),'attack');e.preparation=1.2;assert.equal(creaturePose(e,{},3),'windup');
});
test('receiving damage visibly overrides other living poses without changing combat',()=>{
 const e=enemy();e.preparation=1;assert.equal(creaturePose(e,{hurtAt:2},2.1),'hurt');assert.equal(creaturePose(e,{hurtAt:2},2.25),'windup');assert.equal(e.hp,100);assert.equal(e.preparation,1);
});
test('death keeps the hurt drawing until disappearance, independent of attack state',()=>{
 const e=enemy();e.hp=0;assert.equal(creaturePose(e,{strikeAt:2,deathAt:2},2.3),'hurt');assert.equal(deathOpacity({deathAt:2},2),1);assert.ok(deathOpacity({deathAt:2},2.3)>0);assert.equal(deathOpacity({deathAt:2},2.6),0);
});
test('every boss form uses the same five-pose contract',()=>{
 for(let n=1;n<=8;n++)for(const form of [1,2]){const stem=creatureStem({art:`boss-${n}`,boss:true,form});assert.equal(stem,`boss-${n}${form===2?'-form2':''}`);assert.equal(new Set(POSES.map(p=>poseAsset(stem,p))).size,5);assert.ok(poseAsset(stem,'hurt').endsWith('-hurt'));}
});
test('actual enemy attack resolutions identify the attacker for animation',()=>{
 const r=newRun('vanguard');const e=r.enemies[0];e.atk=1;e.hp=e.maxHp=10000;const events=tick(r,5);assert.ok(events.some(event=>event.kind==='enemy-strike'&&event.target===e.id));
});
