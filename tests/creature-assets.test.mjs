import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {POSES,poseAsset} from '../src/animation.ts';

test('all 28 creature identities/forms ship five distinct real frame files',()=>{
 const stems=[...Array.from({length:12},(_,i)=>`foe-${i+1}`),...Array.from({length:8},(_,i)=>[`boss-${i+1}`,`boss-${i+1}-form2`]).flat()];
 let count=0;
 for(const stem of stems){
  const hashes=new Set();
  for(const pose of POSES){const path=new URL(`../public/art/${poseAsset(stem,pose)}.webp`,import.meta.url);assert.ok(existsSync(path),`${stem}: missing ${pose}`);const bytes=readFileSync(path);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length>500,`${stem}: empty ${pose}`);hashes.add(createHash('sha256').update(bytes).digest('hex'));count++;}
  assert.equal(hashes.size,5,`${stem}: duplicate drawings`);
 }
 assert.equal(count,140);
});
