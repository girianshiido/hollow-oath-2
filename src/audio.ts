import type {Settings} from './saves.ts';

export type Track='title'|'selection'|'camp'|'battle-1'|'battle-2'|'battle-3'|'boss'|'final'|'bonus'|'victory'|'defeat';
export type Sfx='steel'|'fire'|'ice'|'heal'|'guard'|'reward'|'select'|'hit'|'storm';
type Voice={source:AudioBufferSourceNode;gain:GainNode;track:Track};
type Cached={buffer:AudioBuffer;bytes:number;touched:number};
type Loading={ready:Promise<AudioBuffer|undefined>;abort:AbortController};
export interface AudioRuntime {
  createContext?:()=>AudioContext|undefined;
  fetch?:typeof fetch;
  hidden?:()=>boolean;
  now?:()=>number;
  maxDecodedBytes?:number;
}
// Exact source lengths exclude codec packet padding. Round at decoded sample rate.
const LOOP_SECONDS:Partial<Record<Track,number>>={
  title:83.47827664399092,selection:71.111179138322,camp:68.57145124716553,
  'battle-1':83.47834467120181,'battle-2':80.00006802721089,'battle-3':75.78950113378684,
  boss:72,final:68.57145124716553,bonus:90,
};
const NEXT:Partial<Record<Track,Track>>={title:'selection',selection:'battle-1',camp:'battle-1','battle-1':'battle-2','battle-2':'battle-3','battle-3':'boss',boss:'camp',bonus:'boss',final:'victory'};
const EFFECTS:Record<Sfx,readonly string[]>={
  steel:['sfx-steel-1','sfx-steel-2','sfx-steel-3'],fire:['sfx-fire'],ice:['sfx-ice'],
  heal:['sfx-heal'],guard:['sfx-guard'],reward:['sfx-reward'],select:['sfx-select'],hit:['sfx-hit'],storm:['sfx-storm'],
};
const LEVEL:Record<Sfx,number>={steel:.7,fire:.85,ice:.8,heal:.75,guard:.75,reward:.7,select:.5,hit:.65,storm:.85};
const clamp=(n:number)=>Number.isFinite(n)?Math.min(1,Math.max(0,n)):0;
const defaultHidden=()=>typeof document!=='undefined'&&document.hidden;
const createContext=()=>{
  const host=globalThis as typeof globalThis&{webkitAudioContext?:typeof AudioContext};
  const Constructor=host.AudioContext??host.webkitAudioContext;
  return Constructor?new Constructor({latencyHint:'interactive'}):undefined;
};

/** One graph controls every live voice, including on iOS. No media-element volume. */
export class GameAudio {
  private context?:AudioContext;
  private master?:GainNode;
  private musicBus?:GainNode;
  private effectsBus?:GainNode;
  private settings:Settings={music:.45,sfx:.65,muted:false,motion:true};
  private enabled=false;
  private suspended=false;
  private desired:Track='title';
  private music?:Voice;
  private fades=new Set<Voice>();
  private voices=new Map<AudioBufferSourceNode,GainNode>();
  private cache=new Map<string,Cached>();
  private loading=new Map<string,Loading>();
  private revision=0;
  private effectsRevision=0;
  private pending?:{track:Track;revision:number;ready:Promise<void>};
  private completed?:Track;
  private lastPlayed=new Map<Sfx,number>();
  private variant=0;
  private preferred:'ogg'|'m4a'='ogg';
  private resumeStarted:number|null=null;
  private gesturesBound=false;
  private effectsWarming=false;
  private lastError='';
  private readonly runtime:AudioRuntime;
  constructor(runtime:AudioRuntime={}){this.runtime=runtime;}
  private now(){return this.runtime.now?.()??performance.now();}
  private visible(){return !this.suspended&&!(this.runtime.hidden?.()??defaultHidden());}
  private running(){return this.context?.state==='running'&&this.visible();}
  private file(track:Track){return 'music-'+track;}

  configure(s:Settings):void {
    this.settings={...s,music:clamp(s.music),sfx:clamp(s.sfx)};
    this.applyVolumes();
    if(s.muted||s.sfx===0)this.stopEffects();
    if(this.enabled&&!s.muted&&(s.music>0||s.sfx>0)&&this.visible())void this.resume().then(()=>{this.warmEffects();return this.refresh();});
  }
  private applyVolumes(){
    if(!this.context||!this.master||!this.musicBus||!this.effectsBus)return;
    const at=this.context.currentTime;
    for(const [node,value] of [[this.master,this.settings.muted||!this.visible()?0:1],[this.musicBus,this.settings.music*.75],[this.effectsBus,this.settings.sfx*.75]] as const){
      node.gain.cancelScheduledValues(at);node.gain.setValueAtTime(value,at);
    }
  }
  private ensureContext(gesture=false):AudioContext|undefined {
    const old=this.context;
    // A later tap can recover a WebKit context whose previous resume stalled.
    const stalled=gesture&&this.resumeStarted!==null&&this.now()-this.resumeStarted>1800&&old?.state!=='running';
    if(old&&old.state!=='closed'&&!stalled)return old;
    if(old){
      this.stopAllMusic();this.stopEffects();
      for(const request of this.loading.values())request.abort.abort();this.loading.clear();
      old.onstatechange=null;void old.close().catch(()=>{});
    }
    try{
      const ctx=(this.runtime.createContext??createContext)();if(!ctx)return;
      this.context=ctx;this.resumeStarted=null;
      this.master=ctx.createGain();this.musicBus=ctx.createGain();this.effectsBus=ctx.createGain();
      this.musicBus.connect(this.master);this.effectsBus.connect(this.master);this.master.connect(ctx.destination);
      this.applyVolumes();
      ctx.onstatechange=()=>{if(this.context===ctx&&ctx.state==='running'&&this.visible()){this.resumeStarted=null;void this.refresh();}};
      return ctx;
    }catch(error){this.lastError=String(error);return;}
  }
  private bindGestures(){
    if(this.gesturesBound||typeof document==='undefined')return;
    this.gesturesBound=true;
    const recover=()=>{if(this.enabled&&this.visible()&&this.context?.state!=='running')void this.unlock();};
    document.addEventListener('pointerup',recover,{capture:true,passive:true});
    document.addEventListener('touchend',recover,{capture:true,passive:true});
    document.addEventListener('keydown',recover,{capture:true,passive:true});
  }
  private resume():Promise<void>{
    const ctx=this.context;if(!ctx||ctx.state==='closed'||!this.visible())return Promise.resolve();
    if(ctx.state==='running'){this.resumeStarted=null;return Promise.resolve();}
    this.resumeStarted??=this.now();
    // Synchronous call within the activating event, before network/decode awaits.
    try{return ctx.resume().then(()=>{if(ctx.state==='running')this.resumeStarted=null;}).catch(error=>{this.lastError=String(error);});}
    catch(error){this.lastError=String(error);return Promise.resolve();}
  }
  async unlock(next?:Track):Promise<void>{
    if(next)this.select(next);
    this.enabled=true;this.suspended=false;this.bindGestures();
    const ctx=this.ensureContext(true);if(!ctx||!this.visible())return;this.applyVolumes();
    const resumed=this.resume();
    // A zero-gain one-sample tick wakes legacy iOS without starting music twice.
    try{
      const tick=ctx.createBufferSource(),silent=ctx.createGain();
      silent.gain.value=0;tick.buffer=ctx.createBuffer(1,1,ctx.sampleRate);tick.connect(silent);silent.connect(this.master!);
      tick.onended=()=>{tick.disconnect();silent.disconnect();};tick.start();
    }catch{/* Regular playback still works when legacy warm-up is unsupported. */}
    void this.preload(this.desired);
    await resumed;if(!this.running())return;
    await this.refresh();this.warmEffects();
  }
  private select(next:Track){
    if(next===this.desired)return;
    this.desired=next;this.completed=undefined;this.revision++;this.cancelObsoleteMusic();
  }
  play(next:Track):Promise<void>{this.select(next);return this.refresh();}
  private cancelObsoleteMusic(){
    const keep=new Set([this.file(this.desired),this.music?this.file(this.music.track):'',NEXT[this.desired]?this.file(NEXT[this.desired]!):'']);
    for(const [name,request] of this.loading)if(name.startsWith('music-')&&!keep.has(name)){request.abort.abort();this.loading.delete(name);}
  }
  private load(name:string):Promise<AudioBuffer|undefined>{
    const cached=this.cache.get(name);if(cached){cached.touched=this.now();return Promise.resolve(cached.buffer);}
    const pending=this.loading.get(name);if(pending)return pending.ready;
    const ctx=this.context;if(!ctx)return Promise.resolve(undefined);
    const abort=new AbortController();
    const ready:Promise<AudioBuffer|undefined>=(async()=>{
      const extensions=this.preferred==='ogg'?['ogg','m4a'] as const:['m4a','ogg'] as const;
      for(const extension of extensions){
        if(abort.signal.aborted)return;
        try{
          const response=await (this.runtime.fetch??fetch)(`./audio/${name}.${extension}`,{signal:abort.signal});
          if(!response.ok)throw new Error(`Audio ${response.status}: ${name}.${extension}`);
          const bytes=await response.arrayBuffer();if(abort.signal.aborted)return;
          const buffer=await ctx.decodeAudioData(bytes);if(abort.signal.aborted)return;
          this.preferred=extension;this.lastError='';
          this.cache.set(name,{buffer,bytes:buffer.length*buffer.numberOfChannels*4,touched:this.now()});
          this.trimCache();return buffer;
        }catch(error){if(abort.signal.aborted)return;this.lastError=String(error);}
      }
      return undefined;
    })().finally(()=>{if(this.loading.get(name)?.ready===ready)this.loading.delete(name);});
    this.loading.set(name,{ready,abort});return ready;
  }
  private trimCache(){
    const budget=this.runtime.maxDecodedBytes??72*1024*1024;
    const protectedNames=new Set([this.file(this.desired),this.music?this.file(this.music.track):'']);
    const entries=[...this.cache].sort((a,b)=>a[1].touched-b[1].touched);
    let bytes=entries.reduce((sum,[,entry])=>sum+entry.bytes,0);
    let musicCount=entries.filter(([name])=>name.startsWith('music-')).length;
    for(const [name,entry] of entries){
      if(bytes<=budget&&musicCount<=2)break;
      if(protectedNames.has(name))continue;
      this.cache.delete(name);bytes-=entry.bytes;if(name.startsWith('music-'))musicCount--;
    }
  }
  async preload(...tracks:Track[]):Promise<void>{
    if(!this.enabled||!this.context||this.settings.muted||!this.settings.music)return;
    // Sequential decode limits transient CPU/memory pressure on older iPhones.
    for(const track of tracks)if(this.visible())await this.load(this.file(track));
  }
  private warmEffects(){
    if(this.effectsWarming||this.settings.muted||!this.settings.sfx)return;
    this.effectsWarming=true;
    void (async()=>{for(const name of Object.values(EFFECTS).flat()){if(!this.running()||this.settings.muted||!this.settings.sfx)break;await this.load(name);}})().finally(()=>{this.effectsWarming=false;});
  }
  private refresh():Promise<void>{
    const requested=this.desired,revision=this.revision;
    if(!this.enabled||!this.running()||!this.musicBus||this.settings.muted||!this.settings.music||this.completed===requested)return Promise.resolve();
    if(this.music?.track===requested)return Promise.resolve();
    if(this.pending?.track===requested&&this.pending.revision===revision)return this.pending.ready;
    const ready:Promise<void>=(async()=>{
      const buffer=await this.load(this.file(requested));
      if(!buffer||!this.running()||revision!==this.revision||requested!==this.desired||this.settings.muted||!this.settings.music||this.music?.track===requested)return;
      const ctx=this.context!,source=ctx.createBufferSource(),gain=ctx.createGain(),at=ctx.currentTime;
      source.buffer=buffer;source.loop=requested!=='victory'&&requested!=='defeat';
      if(source.loop){source.loopStart=0;source.loopEnd=Math.min(buffer.duration,Math.round((LOOP_SECONDS[requested]??buffer.duration)*buffer.sampleRate)/buffer.sampleRate);}
      const previous=this.music,voice={source,gain,track:requested};
      gain.gain.setValueAtTime(previous?0:1,at);if(previous)gain.gain.linearRampToValueAtTime(1,at+.16);
      source.connect(gain);gain.connect(this.musicBus!);
      source.onended=()=>{
        source.disconnect();gain.disconnect();this.fades.delete(voice);
        if(this.music===voice){this.music=undefined;if(!source.loop&&this.desired===requested)this.completed=requested;}
      };
      this.music=voice;source.start(at);
      if(previous){
        previous.gain.gain.cancelScheduledValues(at);previous.gain.gain.setValueAtTime(previous.gain.gain.value,at);
        previous.gain.gain.linearRampToValueAtTime(0,at+.16);this.fades.add(previous);
        try{previous.source.stop(at+.18);}catch{/* Previous stinger already ended. */}
      }
      this.trimCache();const next=NEXT[requested];if(next)void this.preload(next);
    })().catch(error=>{this.lastError=String(error);}).finally(()=>{if(this.pending?.ready===ready)this.pending=undefined;});
    this.pending={track:requested,revision,ready};return ready;
  }
  async sound(id:Sfx):Promise<void>{
    if(!this.enabled||!this.running()||!this.effectsBus||this.settings.muted||!this.settings.sfx)return;
    const now=this.now();if(now-(this.lastPlayed.get(id)??-Infinity)<(id==='steel'?65:110))return;
    this.lastPlayed.set(id,now);
    const names=EFFECTS[id],name=names[id==='steel'?(this.variant++%names.length):0]!;
    const revision=this.effectsRevision,buffer=await this.load(name);
    if(!buffer||revision!==this.effectsRevision||!this.running()||this.settings.muted||!this.settings.sfx||this.now()-now>250)return;
    const ctx=this.context!,source=ctx.createBufferSource(),gain=ctx.createGain();
    if(this.voices.size>=8){const oldest=this.voices.keys().next().value;if(oldest){try{oldest.stop();}catch{}this.voices.delete(oldest);}}
    source.buffer=buffer;source.playbackRate.value=id==='steel'?.97+(this.variant%3)*.03:1;
    gain.gain.value=LEVEL[id];source.connect(gain);gain.connect(this.effectsBus!);
    this.voices.set(source,gain);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();
  }
  private stopEffects(){
    this.effectsRevision++;for(const [source,gain] of this.voices){try{source.stop();}catch{}source.disconnect();gain.disconnect();}
    this.voices.clear();this.lastPlayed.clear();
  }
  private stopAllMusic(){
    const voices=[...this.fades];if(this.music)voices.push(this.music);
    for(const voice of voices){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();}
    this.fades.clear();this.music=undefined;this.pending=undefined;this.revision++;
  }
  suspend():void {this.suspended=true;this.applyVolumes();this.stopEffects();void this.context?.suspend().catch(()=>{});}
  restore():Promise<void>{this.suspended=false;this.applyVolumes();if(!this.enabled||!this.visible())return Promise.resolve();return this.resume().then(()=>this.refresh());}
  diagnostics(){return {enabled:this.enabled,desired:this.desired,playing:this.music?.track??null,pending:this.pending?.track??null,contextState:this.context?.state??'uninitialized',suspended:this.suspended,decodedBytes:[...this.cache.values()].reduce((n,c)=>n+c.bytes,0),decodedFiles:[...this.cache.keys()],activeEffects:this.voices.size,lastError:this.lastError};}
}

const audio=new GameAudio();
export const configure=(s:Settings)=>audio.configure(s);
export const unlock=(next?:Track)=>audio.unlock(next);
export const play=(next:Track)=>audio.play(next);
export const sound=(id:Sfx)=>audio.sound(id);
export const preload=(...tracks:Track[])=>audio.preload(...tracks);
export const suspend=()=>audio.suspend();
export const restore=()=>audio.restore();
export const diagnostics=()=>audio.diagnostics();
