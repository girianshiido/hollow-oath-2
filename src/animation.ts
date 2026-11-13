import type {Enemy} from './engine.ts';

export type CreaturePose='idle'|'idle2'|'windup'|'attack'|'hurt';
export interface CreatureMotion {hurtAt?:number;strikeAt?:number;deathAt?:number;}
export const POSES:CreaturePose[]=['idle','idle2','windup','attack','hurt'];
export function creatureStem(e:Pick<Enemy,'art'|'boss'|'form'>){return e.art+(e.boss&&e.form===2?'-form2':'');}
export function poseAsset(stem:string,pose:CreaturePose){return stem+(pose==='idle'?'':'-'+pose);}
/** Animation follows combat time: pausing a fight also freezes its poses. */
export function creaturePose(e:Pick<Enemy,'hp'|'preparation'|'clock'|'id'>,state:CreatureMotion,time:number,motion=true):CreaturePose {
  if(e.hp<=0)return'hurt';
  if(state.hurtAt!==undefined&&time-state.hurtAt>=0&&time-state.hurtAt<.19)return'hurt';
  if(state.strikeAt!==undefined&&time-state.strikeAt>=0&&time-state.strikeAt<.24)return'attack';
  if(e.preparation>0||e.clock>=.72)return'windup';
  return motion&&Math.floor(time*1.65+e.id*.37)%2===1?'idle2':'idle';
}
export function deathOpacity(state:CreatureMotion,time:number){return state.deathAt===undefined?0:Math.max(0,Math.min(1,1-(time-state.deathAt)/.55));}
