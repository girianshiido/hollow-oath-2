import {chapterIndex} from './content.ts';
import type {CombatMode} from './content.ts';
export type BossMove='strike'|'heavy'|'curse'|'heal';
const PHASES=[
 ['The Rooted Watch','The Thorn Unbound','The Last Charge'],
 ['Iron Prison','The Furnace Opens','Heart of the Forge'],
 ['The Porcelain Veil','A Thousand Splinters','The Shattered Dance'],
 ['Beneath the Ice','The Deep Awakens','The Final Tide'],
 ['The Sleeping Garden','Roots of Hunger','The Wild Heart','The Last Bloom'],
 ['The Brass Vigil','Wings Unfurled','The Storm Unchained','Sunfall'],
 ['The Borrowed Gesture','The Strings Tighten','The Hand Revealed','Cut the Last Thread'],
 ['The Hollow Throne','The Crown Commands','The Unwritten Dawn','The Oath Unbound','The First Light']
] as const;
const PATTERNS:readonly (readonly BossMove[])[]=[
 ['heavy','strike','heavy'],['heavy','curse','strike'],['strike','curse','heavy'],['heavy','strike','curse'],
 ['heavy','heal','curse'],['strike','heavy','curse'],['curse','strike','heavy'],['heavy','curse','strike']
];
/** Relative to a warden of the same wave, independent of player level. */
export const chapterEndurance=(wave:number)=>[6,5.6,5.2,5,4.8,4.6,4.5,5.5][chapterIndex(wave)]!;
export const bossPhases=(wave:number):readonly string[]=>PHASES[chapterIndex(wave)]!;
export const bossPhase=(wave:number,stage:number)=>bossPhases(wave)[Math.max(0,Math.min(bossPhases(wave).length-1,stage-1))]!;
export const bossWard=(wave:number,stage:number):Exclude<CombatMode,'mend'>=>(['steel','ember','rime','storm'] as const)[(chapterIndex(wave)+stage-1)%4]!;
export function bossMove(wave:number,stage:number,attacks:number):BossMove{
 const pattern=PATTERNS[chapterIndex(wave)]!;
 // Later stages rotate the sequence and add a sweeping strike after transformation.
 return stage>=3&&attacks%3===0?'heavy':pattern[(attacks-1+stage-1)%pattern.length]!;
}
export const bossForm=(wave:number,stage:number):1|2=>stage>=Math.floor(bossPhases(wave).length/2)+1?2:1;
