import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/audio.ts';

class Param {
  value=1;events=[];
  cancelScheduledValues(at){this.events.push(['cancel',at]);}
  setValueAtTime(value,at){this.value=value;this.events.push(['set',value,at]);}
  linearRampToValueAtTime(value,at){this.value=value;this.events.push(['ramp',value,at]);}
}
class Node {
  connections=[];disconnected=false;
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.disconnected=true;}
}
class Gain extends Node {gain=new Param();}
class Source extends Node {
  playbackRate=new Param();loop=false;loopStart=0;loopEnd=0;starts=[];stops=[];
  start(at=0){this.starts.push(at);}
  stop(at=0){this.stops.push(at);}
  end(){this.onended?.();}
}
class Context {
  state='suspended';currentTime=10;sampleRate=48000;destination=new Node();gains=[];sources=[];resumeCalls=0;suspendCalls=0;closeCalls=0;
  constructor(options={}){this.options=options;}
  createGain(){const g=new Gain();this.gains.push(g);return g;}
  createBufferSource(){const s=new Source();this.sources.push(s);return s;}
  createBuffer(channels,length,sampleRate){return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate};}
  decodeAudioData(bytes){
    const name=new TextDecoder().decode(bytes);
    if(this.options.rejectOgg&&name.endsWith('.ogg'))return Promise.reject(new Error('Safari cannot decode OGG'));
    const deferred=this.options.decodes?.get(name);
    const length=name.includes('/music-')?(this.options.musicFrames??4_800_000):9600;
    const buffer={name,length,sampleRate:this.sampleRate,numberOfChannels:2,duration:length/this.sampleRate};
    return deferred?deferred.promise.then(()=>buffer):Promise.resolve(buffer);
  }
  resume(){this.resumeCalls++;if(this.options.hangResume)return new Promise(()=>{});this.state='running';this.onstatechange?.();return Promise.resolve();}
  suspend(){this.suspendCalls++;this.state='suspended';this.onstatechange?.();return Promise.resolve();}
  close(){this.closeCalls++;this.state='closed';return Promise.resolve();}
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const flush=async(n=60)=>{for(let i=0;i<n;i++)await Promise.resolve();};
const defaults={music:.45,sfx:.65,muted:false,motion:true};
function harness(options={}){
  const contexts=[],requests=[];let now=100,hidden=false,failMusic=false;
  const runtime={
    createContext(){const ctx=new Context(options.contexts?.[contexts.length]??options);contexts.push(ctx);return ctx;},
    async fetch(url){requests.push(url);return {ok:!(failMusic&&url.includes('music-')),status:failMusic?503:200,arrayBuffer:async()=>new TextEncoder().encode(url).buffer};},
    now:()=>now,hidden:()=>hidden,maxDecodedBytes:options.maxDecodedBytes,
  };
  const audio=new GameAudio(runtime);
  return {audio,contexts,requests,advance:n=>{now+=n;},hide:value=>{hidden=value;},failMusic:value=>{failMusic=value;},music:()=>contexts.flatMap(c=>c.sources).filter(s=>s.buffer?.name?.includes('music-')&&s.starts.length),effects:()=>contexts.flatMap(c=>c.sources).filter(s=>s.buffer?.name?.includes('sfx-')&&s.starts.length)};
}

test('music never starts before a gesture and atomic unlock starts only its requested scene',async()=>{
  const h=harness();await h.audio.play('selection');assert.equal(h.contexts.length,0);
  await h.audio.unlock('battle-1');await flush();
  assert.equal(h.music().length,1);assert.match(h.music()[0].buffer.name,/music-battle-1/);
  assert.ok(!h.requests.some(u=>u.includes('music-title')));
});

test('double unlock and repeated same-scene play schedule only one music source',async()=>{
  const h=harness();await Promise.all([h.audio.unlock('battle-1'),h.audio.unlock('battle-1'),h.audio.play('battle-1')]);await flush();
  assert.equal(h.music().length,1);assert.equal(h.requests.filter(u=>u.includes('music-battle-1')).length,1);
});

test('a stale title decode cannot intrude after starting a new game',async()=>{
  const title=deferred(),h=harness({decodes:new Map([['./audio/music-title.ogg',title]])});
  const old=h.audio.unlock('title');await flush(10);assert.equal(h.music().length,0);
  await h.audio.play('battle-1');title.resolve();await old;await flush();
  assert.deepEqual(h.music().map(s=>s.buffer.name),['./audio/music-battle-1.ogg']);
  assert.equal(h.audio.diagnostics().playing,'battle-1');
});

test('music switch keeps the existing source until the replacement has decoded',async()=>{
  const next=deferred(),h=harness({decodes:new Map([['./audio/music-boss.ogg',next]])});
  await h.audio.unlock('battle-1');const first=h.music()[0];
  const change=h.audio.play('boss');await flush(10);assert.deepEqual(first.stops,[]);assert.equal(h.audio.diagnostics().playing,'battle-1');
  next.resolve();await change;
  assert.equal(h.audio.diagnostics().playing,'boss');assert.equal(first.stops.length,1);assert.ok(first.stops[0]>h.contexts[0].currentTime);
});

test('live master/music/effects buses apply sliders and mute to every existing voice',async()=>{
  const h=harness();await h.audio.unlock('battle-1');await flush();await h.audio.sound('steel');
  const ctx=h.contexts[0],[master,music,effects]=ctx.gains,voice=h.effects()[0];
  assert.ok(voice);assert.equal(master.connections[0],ctx.destination);
  assert.equal(music.connections[0],master);assert.equal(effects.connections[0],master);
  const musicCount=h.music().length;
  h.audio.configure({...defaults,music:.2,sfx:.3});
  assert.ok(Math.abs(music.gain.value-.15)<1e-12);assert.ok(Math.abs(effects.gain.value-.225)<1e-12);
  h.audio.configure({...defaults,muted:true});assert.equal(master.gain.value,0);assert.equal(voice.stops.length,1);assert.equal(h.audio.diagnostics().activeEffects,0);
  h.audio.configure({...defaults,music:0,sfx:0});assert.equal(master.gain.value,1);assert.equal(music.gain.value,0);assert.equal(effects.gain.value,0);
  await flush();assert.equal(h.music().length,musicCount);
});

test('loop bounds use decoded sample boundaries and exclude AAC packet padding',async()=>{
  const h=harness({rejectOgg:true});await h.audio.unlock('title');
  const source=h.music()[0];assert.equal(source.loop,true);assert.equal(source.loopStart,0);
  assert.equal(source.loopEnd,Math.round(83.47827664399092*48000)/48000);
  assert.ok(source.loopEnd<source.buffer.duration);
  assert.ok(h.requests.includes('./audio/music-title.ogg'));assert.ok(h.requests.includes('./audio/music-title.m4a'));
});

test('failed audio fetches are retried rather than cached permanently',async()=>{
  const h=harness();h.failMusic(true);await h.audio.unlock('battle-1');assert.equal(h.music().length,0);
  assert.ok(h.requests.includes('./audio/music-battle-1.ogg'));assert.ok(h.requests.includes('./audio/music-battle-1.m4a'));
  h.failMusic(false);await h.audio.play('battle-1');assert.equal(h.music().length,1);
});

test('short stingers do not loop or replay on repeated renders, but replay on a new visit',async()=>{
  const h=harness();await h.audio.unlock('victory');const first=h.music()[0];assert.equal(first.loop,false);
  first.end();await h.audio.play('victory');assert.equal(h.music().filter(s=>s.buffer.name.includes('victory')).length,1);
  await h.audio.play('camp');await h.audio.play('victory');assert.equal(h.music().filter(s=>s.buffer.name.includes('victory')).length,2);
});

test('backgrounding mutes immediately and restoration resumes without restarting music',async()=>{
  const h=harness();await h.audio.unlock('battle-1');const source=h.music()[0],ctx=h.contexts[0];
  h.hide(true);h.audio.suspend();assert.equal(ctx.gains[0].gain.value,0);assert.equal(ctx.state,'suspended');
  h.hide(false);await h.audio.restore();assert.equal(ctx.gains[0].gain.value,1);assert.equal(ctx.state,'running');
  assert.equal(h.music().length,1);assert.equal(h.music()[0],source);
});

test('a later user gesture can replace a WebKit context stuck during resume',async()=>{
  const h=harness({contexts:[{hangResume:true},{}]});void h.audio.unlock('battle-1');await flush(10);
  h.advance(2000);await h.audio.unlock('battle-1');await flush();
  assert.equal(h.contexts.length,2);assert.equal(h.contexts[0].closeCalls,1);
  assert.equal(h.audio.diagnostics().contextState,'running');assert.equal(h.audio.diagnostics().playing,'battle-1');
});

test('decoded cache bounds music count and bytes on constrained devices',async()=>{
  const h=harness({musicFrames:100000,maxDecodedBytes:1_000_000});await h.audio.unlock('title');await flush(180);
  await h.audio.preload('battle-1','battle-2','battle-3','boss','final','bonus');await flush();
  const d=h.audio.diagnostics();assert.ok(d.decodedBytes<=1_000_000);assert.ok(d.decodedFiles.filter(f=>f.startsWith('music-')).length<=2);
  assert.ok(d.decodedFiles.includes('music-title'));
});

test('sword effects rotate three actual recordings; queued sounds respect subsequent mute',async()=>{
  const h=harness();await h.audio.unlock('battle-1');await flush(160);
  for(let i=0;i<3;i++){await h.audio.sound('steel');h.advance(100);}
  assert.deepEqual(h.effects().slice(-3).map(s=>s.buffer.name),['./audio/sfx-steel-1.ogg','./audio/sfx-steel-2.ogg','./audio/sfx-steel-3.ogg']);
  const pending=deferred(),other=harness({decodes:new Map([['./audio/sfx-fire.ogg',pending]])});
  await other.audio.unlock('battle-1');const loading=other.audio.sound('fire');other.audio.configure({...defaults,muted:true});pending.resolve();await loading;
  assert.equal(other.effects().length,0);
});
