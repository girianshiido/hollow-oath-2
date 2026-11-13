export type ClassId = 'vanguard' | 'hexweaver' | 'nightblade' | 'oathkeeper';
export const CLASS_IDS: ClassId[] = ['vanguard', 'hexweaver', 'nightblade', 'oathkeeper'];
export interface ClassDef { name: string; person: string; role: string; description: string; color: string; hp: number; mp: number; atk: number; armor: number; speed: number; magic: boolean; skills: [string,string]; }
export const CLASSES: Record<ClassId, ClassDef> = {
  vanguard: { name:'Vanguard', person:'Aldric', role:'Stand your ground.', description:'A steadfast fighter. Shatters armor and shields the duo against heavy blows.', color:'#ed6d66', hp:155,mp:28,atk:23,armor:9,speed:1.0,magic:false,skills:['sunder','bastion'] },
  hexweaver: { name:'Hexweaver', person:'Seris', role:'Make every spark count.', description:'An inventive spellcaster. Burns entire groups and freezes dangerous preparations.',color:'#b19af5',hp:108,mp:42,atk:29,armor:4,speed:0.91,magic:true,skills:['ember','rime'] },
  nightblade: { name:'Nightblade', person:'Nyx', role:'Find the opening.', description:'A swift opportunist. Marks a target, then exploits its weakness with a devastating strike.',color:'#67d49e',hp:122,mp:30,atk:18,armor:5,speed:1.47,magic:false,skills:['mark','execute'] },
  oathkeeper: { name:'Oathkeeper', person:'Ilyan', role:'Bring them home.', description:'A resourceful guardian. Restores the most wounded ally and interrupts with a radiant strike.',color:'#6fd6df',hp:139,mp:38,atk:22,armor:7,speed:1.02,magic:true,skills:['mend','verdict'] }
};
export type SkillId = 'sunder'|'bastion'|'ember'|'rime'|'mark'|'execute'|'mend'|'verdict';
export interface SkillDef { name:string; icon:string; cost:number; cooldown:number; text:string; color:string; }
export const SKILLS: Record<SkillId,SkillDef> = {
  sunder:{name:'Sunder',icon:'sword',cost:7,cooldown:5,text:'A heavy physical strike. Exposes the target for 6 seconds: all allies deal 35% more damage. Interrupts a preparation.',color:'#ffa37e'},
  bastion:{name:'Bastion',icon:'shield',cost:9,cooldown:11,text:'Shields both allies for 8 seconds. The Vanguard draws enemy attacks for 5 seconds.',color:'#f6d38f'},
  ember:{name:'Ember Arc',icon:'flame',cost:9,cooldown:6,text:'Fire sweeps through every enemy. Burns survivors for 5 seconds. Strong against frost.',color:'#ffac70'},
  rime:{name:'Rime Lance',icon:'snow',cost:8,cooldown:7,text:'Ice strikes the target and interrupts its preparation. Slows its attacks for 5 seconds. Strong against fire.',color:'#90e3ff'},
  mark:{name:'Deathmark',icon:'target',cost:6,cooldown:7,text:'Marks the target for 7 seconds. Both allies deal 30% more damage to it. Interrupts a preparation.',color:'#98edb6'},
  execute:{name:'Shadow Fang',icon:'dagger',cost:9,cooldown:6,text:'A swift physical strike. Deals double damage to a marked enemy or one below 40% HP.',color:'#c3e5af'},
  mend:{name:'Mend',icon:'heart',cost:10,cooldown:8,text:'Restores the living ally with the lowest HP percentage. Any excess becomes a short-lived shield.',color:'#89e7c3'},
  verdict:{name:'Dawn Verdict',icon:'sun',cost:8,cooldown:7,text:'A radiant strike that pierces armor and interrupts a preparation. Grants both allies a small shield.',color:'#f7df98'}
};
export const CHAPTERS = [
  {name:'The Briar Gate',short:'Briar',place:'Briar Abbey',color:'#57bfb1',arena:1,boss:'The Briar Stag',form:'The Thorn Unbound',hint:'Break its charge. Expose it before the roots close.'},
  {name:'Iron & Ember',short:'Ember',place:'Cinder Foundry',color:'#ef8e6f',arena:2,boss:'The Living Furnace',form:'Heart of the Forge',hint:'Ice interrupts the furnace. Fire feeds its armor.'},
  {name:'A Porcelain Moon',short:'Porcelain',place:'The Ivory Spire',color:'#ae9de0',arena:3,boss:'The Porcelain Widow',form:'A Thousand Splinters',hint:'Shattered porcelain trades protection for speed.'},
  {name:'The Frozen Crossing',short:'Frost',place:'Leviathan Shore',color:'#87d5ee',arena:3,boss:'The Frost Leviathan',form:'The Deep Awakens',hint:'Fire breaks the cold. Save protection for the tidal strike.'},
  {name:'Roots of the Crown',short:'Roots',place:'The Emerald Hollow',color:'#83c58a',arena:1,boss:'The Root Queen',form:'The Wild Heart',hint:'Interrupt her recovery. A broken phase cannot regrow.'},
  {name:'The Brass Aerie',short:'Brass',place:'Sunfall Bastion',color:'#e6bb72',arena:2,boss:'The Brass Gryphon',form:'The Storm Unchained',hint:'The second form is swift. Keep a counter ready.'},
  {name:'The Borrowed Hand',short:'Threads',place:'The Thread Sanctuary',color:'#bd9ae0',arena:4,boss:'The Thread Saint',form:'The Hand Revealed',hint:'Cut its preparation. Do not let the strings take hold.'},
  {name:'Beyond the Hollow',short:'Dawn',place:'The Last Threshold',color:'#e9d39e',arena:4,boss:'The Hollow Crown',form:'The Unwritten Dawn',hint:'Alternate pressure and protection. The final oath is yours.'}
] as const;
export const chapterIndex = (wave:number) => Math.min(7,Math.floor((wave-1)/4));
export const WAVE_NAMES = ['Approach','Crossing','Vigil','Threshold'];
export type EnemyRole = 'striker'|'guard'|'caster'|'healer'|'swift';
export const FOES: {name:string; role:EnemyRole; weakness:'fire'|'ice'|'physical'|'light'; description:string}[] = [
  {name:'Briar Wolf',role:'swift',weakness:'fire',description:'A swift hunter. Watch its pounce.'},
  {name:'Bone Guard',role:'guard',weakness:'light',description:'Protects its companions while it stands.'},
  {name:'Ember Scarab',role:'striker',weakness:'ice',description:'Resists fire. Its shell hides a burning core.'},
  {name:'Spore Apothecary',role:'healer',weakness:'fire',description:'Restores the most wounded enemy. Interrupt its remedy.'},
  {name:'Rime Bat',role:'swift',weakness:'fire',description:'A fragile frost hunter with a dangerous dive.'},
  {name:'Lantern Puppet',role:'caster',weakness:'physical',description:'Prepares a curse. Break its concentration.'},
  {name:'Jade Toad',role:'guard',weakness:'ice',description:'A stubborn bulwark that shelters its group.'},
  {name:'Hex Raven',role:'caster',weakness:'physical',description:'Its hex strikes through mundane armor.'},
  {name:'Crystal Mimic',role:'striker',weakness:'light',description:'A heavy bite gives away its disguise.'},
  {name:'Bell Golem',role:'guard',weakness:'light',description:'A walking wall with a crushing toll.'},
  {name:'Obsidian Mantis',role:'swift',weakness:'ice',description:'Fast blades. An exposed mantis falls quickly.'},
  {name:'Astral Jelly',role:'caster',weakness:'physical',description:'Its light is beautiful. Its spell is not.'},
  {name:'Gravehound',role:'swift',weakness:'fire',description:'Two jaws. One dangerous pounce.'},
  {name:'Iron Bowman',role:'striker',weakness:'light',description:'Break its aim before the piercing shot.'},
  {name:'Gargoyle',role:'guard',weakness:'ice',description:'A stone sentinel shielding its group.'},
  {name:'Thorn Widow',role:'swift',weakness:'fire',description:'Fast fangs punish an unguarded hero.'},
  {name:'Eel Wyrm',role:'caster',weakness:'ice',description:'Its electric curse drains mana.'},
  {name:'Carrion Acolyte',role:'healer',weakness:'light',description:'Interrupt the ritual before its allies recover.'},
  {name:'Moss Golem',role:'guard',weakness:'fire',description:'Living stone protects the creatures behind it.'},
  {name:'Bone Heron',role:'swift',weakness:'light',description:'A swift beak and a long reach.'},
  {name:'Siege Crawler',role:'striker',weakness:'ice',description:'Its ballista prepares a crushing shot.'},
  {name:'Censer Effigy',role:'caster',weakness:'physical',description:'Its incense gathers into a draining curse.'},
  {name:'Bladefin Koi',role:'swift',weakness:'ice',description:'A flash of fins, then a cutting strike.'},
  {name:'Veilmoth Oracle',role:'healer',weakness:'fire',description:'Its dust restores weakened enemies.'},
  {name:'Suncrest Raptor',role:'swift',weakness:'ice',description:'Golden claws move faster than armor.'},
  {name:'Sepulcher Tortoise',role:'guard',weakness:'light',description:'A chapel shell shelters its companions.'},
  {name:'Bellmaw',role:'striker',weakness:'light',description:'Silence the toll before the jaw closes.'},
  {name:'Glaivehorn Sentinel',role:'guard',weakness:'fire',description:'A jade bulwark with a bladed counterattack.'},
  {name:'Wickstalker',role:'swift',weakness:'ice',description:'Its lantern hides a sudden leap.'},
  {name:'Blood Scorpion',role:'striker',weakness:'ice',description:'Its raised sting signals a heavy blow.'},
  {name:'Crag Fiend',role:'striker',weakness:'light',description:'A ram of basalt with a crushing charge.'},
  {name:'Ivory Revenant',role:'guard',weakness:'fire',description:'Old armor still knows how to hold a line.'},
  {name:'Sporeguard',role:'guard',weakness:'fire',description:'A living shield beneath a broad cap.'},
  {name:'Astral Cuttle',role:'caster',weakness:'physical',description:'Its starry mantle prepares a mana-draining hex.'},
  {name:'Dune Scarab',role:'striker',weakness:'ice',description:'A hard shell and powerful mandibles.'},
  {name:'Chainbound Jackal',role:'swift',weakness:'light',description:'Chains tighten before its hunting lunge.'},
  {name:'Ash Salamander',role:'caster',weakness:'ice',description:'Flame gathers beneath its armored skin.'},
  {name:'Moon Hare',role:'swift',weakness:'fire',description:'A crescent horn turns speed into danger.'},
  {name:'Glass Basilisk',role:'caster',weakness:'physical',description:'Interrupt the gaze before the curse lands.'},
  {name:'Saltbound Crab',role:'guard',weakness:'fire',description:'Salt-crystal armor guards the group.'},
  {name:'Briar Duelist',role:'swift',weakness:'ice',description:'A poised blade gives away the next thrust.'},
  {name:'Clockwork Wasp',role:'swift',weakness:'ice',description:'A fragile machine with a rapid sting.'},
  {name:'Candle Wraith',role:'caster',weakness:'ice',description:'The candle feeds a draining spell.'},
  {name:'Mire Crocodile',role:'guard',weakness:'light',description:'A swamp wall with an armored back.'},
  {name:'Porcelain Doll',role:'healer',weakness:'fire',description:'Its delicate hands restore broken allies.'},
  {name:'Storm Roc',role:'caster',weakness:'physical',description:'Its stormcall threatens your mana reserves.'},
  {name:'Rootbound Boar',role:'striker',weakness:'fire',description:'Brace for the root-armored charge.'},
  {name:'Starless Knight',role:'guard',weakness:'light',description:'The final watcher protects its companions.'}
];
export interface Expedition {id:string;name:string;subtitle:string;text:string;unlock:number;wave:number;rule:'swarm'|'silence'|'fury';reward:string;arena:number;}
export const SANCTUARIES: Expedition[] = [
  {id:'lantern',name:'The Lantern Hunt',subtitle:'32 enemies · Relentless groups',text:'Three creatures at a time. Every fallen enemy strengthens its companions. Eliminate the threat before it grows.',unlock:4,wave:6,rule:'swarm',reward:'Lantern Shard',arena:1},
  {id:'glass',name:'The Glass Vigil',subtitle:'32 enemies · Scarce recovery',text:'Mana recovers more slowly. Plan your interruptions and make every spell matter.',unlock:8,wave:11,rule:'silence',reward:'Glass Promise',arena:3},
  {id:'forge',name:'The Unquiet Forge',subtitle:'32 enemies · Furious preparations',text:'Heavy blows arrive sooner. A short opening is all you need to break the forge.',unlock:12,wave:16,rule:'fury',reward:'Forgeheart',arena:2},
  {id:'stars',name:'The Starless Choir',subtitle:'32 enemies · The final trial',text:'A dangerous gathering beyond the last sanctuary. Preserve your resources for its transformed guardian.',unlock:20,wave:27,rule:'swarm',reward:'Dawnthread',arena:4}
];
export const RELICS: Record<string,{name:string;text:string}> = {
  lantern:{name:'Lantern Shard',text:'Defeating an enemy restores 2 MP to each living ally.'},
  glass:{name:'Glass Promise',text:'Interrupting an enemy grants a small shield to both allies.'},
  forge:{name:'Forgeheart',text:'Both allies deal 12% more physical damage.'},
  stars:{name:'Dawnthread',text:'Both allies recover 15% more mana over time.'}
};
export const ABYSS_RULES = ['swarm','silence','fury'] as const;
export const fmt = (n:number) => Math.floor(n).toLocaleString('en-US');

export type CombatMode='steel'|'ember'|'rime'|'storm'|'mend';
export const COMBAT_MODES:CombatMode[]=['steel','ember','rime','storm','mend'];
export const MODE_INFO:Record<CombatMode,{name:string;icon:string;cost:number;color:string;text:string}>={
 steel:{name:'Steel',icon:'sword',cost:0,color:'#f2d4a2',text:'Free sword attacks. Breaks steel seals and preserves mana.'},
 ember:{name:'Fire',icon:'flame',cost:4,color:'#ffaa67',text:'Repeats a fire spell. Strong against frost and plants. Breaks fire seals.'},
 rime:{name:'Ice',icon:'snow',cost:5,color:'#94e7ff',text:'Repeats an ice spell. Slows the target. Breaks ice seals.'},
 storm:{name:'Storm',icon:'bolt',cost:6,color:'#ccabff',text:'Repeats a piercing storm spell. Breaks storm seals.'},
 mend:{name:'Heal',icon:'heart',cost:8,color:'#8ff0bf',text:'Heals this hero on each action until full HP or insufficient mana, then returns to steel.'}
};
export const foeUnlockWave=(family:number)=>family<32?1:(family-31)*2;
