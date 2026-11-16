import {MODE_INFO} from './content.ts';
import type {CombatMode,MagicMode} from './content.ts';
import type {Hero} from './engine.ts';
export const magicLevel=(hero:Hero,mode:CombatMode)=>mode==='steel'?0:hero.magic?.[mode]??1;
export const magicCostAtLevel=(mode:CombatMode,level:number)=>mode==='steel'?0:MODE_INFO[mode].cost+Math.floor((level-1)/3);
export const modeCost=(hero:Hero,mode:CombatMode)=>magicCostAtLevel(mode,magicLevel(hero,mode));
export const magicPower=(hero:Hero,mode:CombatMode)=>mode==='steel'?1:1+(magicLevel(hero,mode)-1)*(mode==='mend'?.12:.18);
export const magicUpgradeCost=(hero:Hero,mode:MagicMode)=>6+(magicLevel(hero,mode)-1)*4;
