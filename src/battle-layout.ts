export const arenaUiScale=(width:number)=>Math.max(1,Math.min(1.5,width/520));
/** Keep HP and preparation meters within each creature's own horizontal lane. */
export function enemyCenter(width:number,count:number,index:number){
 return count===1?width/2:count===2?width*(index===0?.28:.72):width*(index===0?.18:index===1?.5:.82);
}
export function enemyMeterWidth(width:number,count:number){
 const scale=arenaUiScale(width);
 return Math.max(1,count===1?Math.min(250*scale,width*.72,width-44):count===2?Math.min(132*scale,width*.38,width*.44-18):Math.min(100*scale,width*.27,width*.32-16));
}
export function fitLabel(text:string,width:number,measure:(s:string)=>number){
 if(measure(text)<=width)return text;
 let shortened=text;while(shortened.length&&measure(shortened+'…')>width)shortened=shortened.slice(0,-1);
 return shortened?shortened.trimEnd()+'…':'…';
}
