import type {Settings} from './saves.ts';
export type Track='title'|'camp'|'battle-1'|'battle-2'|'battle-3'|'boss'|'final'|'bonus'|'victory'|'defeat';
export type Sfx='steel'|'fire'|'ice'|'heal'|'guard'|'reward'|'select'|'hit'|'storm';
let enabled=false,settings:Settings={music:.45,sfx:.65,muted:false,motion:true},desired:Track='title';
let playing:Track|null=null,track:HTMLAudioElement|null=null;
let suspended=false;
const extension=typeof Audio!=='undefined'&&new Audio().canPlayType('audio/ogg; codecs="vorbis"')?'ogg':'m4a';
const pools=new Map<Sfx,HTMLAudioElement[]>();
const url=(file:string)=>`./audio/${file}.${extension}`;
export function configure(s:Settings){settings=s;if(track)track.volume=s.muted?0:s.music*.75;}
export function unlock(){enabled=true;suspended=false;play(desired);}
export function play(next:Track){
  desired=next;if(!enabled||suspended)return;
  if(playing===next&&track){if(track.paused)void track.play().catch(()=>{});return;}
  if(track){track.pause();track.src='';}
  playing=next;track=new Audio(url('music-'+next));track.loop=next!=='victory'&&next!=='defeat';track.volume=settings.muted?0:settings.music*.75;
  void track.play().catch(()=>{playing=null;});
}
export function sound(id:Sfx){
  if(!enabled||suspended||settings.muted||settings.sfx===0)return;
  let pool=pools.get(id);if(!pool){pool=Array.from({length:3},()=>new Audio(url('sfx-'+id)));pools.set(id,pool);}
  const a=pool.find(a=>a.paused||a.ended);if(!a)return;a.volume=settings.sfx*.75;a.currentTime=0;void a.play().catch(()=>{});
}
export function suspend(){suspended=true;track?.pause();for(const pool of pools.values())for(const a of pool)a.pause();}
export function restore(){suspended=false;if(enabled)play(desired);}
