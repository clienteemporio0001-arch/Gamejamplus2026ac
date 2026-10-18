import type {Pose} from './network';

/** One data-driven cooperative exit definition, shared by all 4 host authorities
 * and visual scenes. No extra game-state or network protocol is needed. */
export type AdventureExitPhase=1|2|3|4;
export type CooperativeExit={phase:AdventureExitPhase;x:number;y:number;
 horizontal:number;vertical:number;title:string;hint:string;palette:'night'|'rain'|'canopy'|'river'};
export const ADVENTURE_EXITS:Readonly<Record<AdventureExitPhase,CooperativeExit>>={
 1:{phase:1,x:11240,y:606,horizontal:110,vertical:66,
   title:'TRILHA PARA A FLORESTA TEMPORAL',
   hint:'A floresta ainda guarda surpresas!',palette:'night'},
 2:{phase:2,x:4128.5,y:600,horizontal:58.5,vertical:60,
   title:'TRILHA PARA O CAMINHO DAS ÁRVORES',
   hint:'A chuva nos trouxe até as árvores gigantes!',palette:'rain'},
 3:{phase:3,x:5142,y:157,horizontal:88,vertical:44,
   title:'TRILHA PARA A FLORESTA EM CHAMAS',
   hint:'Uma região diferente nos espera adiante!',palette:'canopy'},
 4:{phase:4,x:5020,y:648,horizontal:100,vertical:58,
   title:'TRILHA PARA A MARGEM SEGURA',
   hint:'Conseguimos chegar a um lugar seguro!',palette:'river'}
} as const;
export function exitPresence(phase:AdventureExitPhase,poses:readonly Pose[],
 health:readonly number[]):{count:number;ready:boolean;seats:ReadonlyArray<number>}{
 const gate=ADVENTURE_EXITS[phase];
 const seats=poses.filter(p=>p.seat>=0&&p.seat<=2&&health[p.seat]>0&&
  Math.abs(p.x-gate.x)<=gate.horizontal&&Math.abs(p.y-gate.y)<=gate.vertical)
  .map(p=>p.seat);
 const unique=[...new Set(seats)];
 return {count:unique.length,ready:poses.length===3&&unique.length===3&&
   health.slice(0,3).every(h=>h>0),seats:unique};
}
export function exitMessage(phase:AdventureExitPhase,poses:readonly Pose[],
 health:readonly number[],unlocked:boolean):string{
 if(!unlocked)return '';
 const count=exitPresence(phase,poses,health).count;
 return 'AMIGOS REUNIDOS: '+count+'/3';
}
export function exitPipoLine(phase:AdventureExitPhase,count:number):string{
 if(count===1)return 'Esperem os outros! Ninguém fica para trás!';
 if(count===2)return 'Só falta mais um amigo!';
 if(count===3)return phase===4?'Estamos juntos! Encontramos um lugar seguro!':
  'Agora sim! Vamos descobrir o que existe depois dessa floresta!';
 return phase===1?'Conseguimos! Agora reúnam os três na trilha. A floresta ainda guarda surpresas!':
   ADVENTURE_EXITS[phase].hint+' Reúnam os três na trilha!';
}
