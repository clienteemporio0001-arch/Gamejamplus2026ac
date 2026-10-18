import type {LoopWorld} from './forestLoop';
import {LOOP_MARKS,LOOP_GEOMETRY,ROUTES} from './forestLoop';
import type {TemporalWorld} from './temporalForest';
import {TEMP_ECHO,TEMP_TREE,TEMP_ROOTS} from './temporalForest';
import type {TreeWorld} from './treetopForest';
import {TREE_TARGETS} from './treetopForest';
import type {FireWorld} from './burningForest';
import {FIRE_TARGETS} from './burningForest';
export type MissionPhase=1|2|3|4;
export type MissionWorld=LoopWorld|TemporalWorld|TreeWorld|FireWorld;
export type MissionBeat={id:string;phase:MissionPhase;group:string;seat:0|1|2;
 step:number;done:boolean;target:{x:number;y:number};action:string;
 hero:string;pipo:string;next:string};
export type MissionSnapshot={phase:MissionPhase;beats:readonly MissionBeat[];
 objective:string;next:MissionBeat|null;complete:boolean};
type PartialBeat={id:string;group:string;seat:0|1|2;done:boolean;
 target:{x:number;y:number};action:string;hero:string;pipo:string;next:string};
const names=['TÉO','LIA','NINO'] as const;
function beats(phase:MissionPhase,sections:PartialBeat[][],objective:string,complete:boolean):MissionSnapshot{
 const all=sections.flat().map((b,i)=>({...b,phase,step:i}));
 return {phase,beats:all,objective,next:all.find(b=>!b.done)??null,complete};
}
function part(id:string,group:string,seat:0|1|2,done:boolean,target:{x:number;y:number},
 action:string,hero:string,pipo:string,next:string):PartialBeat{
 return {id,group,seat,done,target,action,hero,pipo,next};
}
/** Only read real authority flags; never simulate or replicate another quest database. */
export function missionSnapshot(phase:1,world:LoopWorld):MissionSnapshot;
export function missionSnapshot(phase:2,world:TemporalWorld):MissionSnapshot;
export function missionSnapshot(phase:3,world:TreeWorld):MissionSnapshot;
export function missionSnapshot(phase:4,world:FireWorld):MissionSnapshot;
export function missionSnapshot(phase:MissionPhase,world:MissionWorld):MissionSnapshot{
 if(phase===1){
  const w=world as LoopWorld,route=ROUTES[w.layout].correct;
  const discovery:PartialBeat[]=[
   part('mark-tree','DESCOBERTA',0,w.marks[0],LOOP_MARKS[0],'E',
    'Encontrei uma marca escondida aqui dentro!',
    'Boa, Téo! Lia, investigue aquela pedra rachada!','LIA: INVESTIGUE A PEDRA RACHADA.'),
   part('mark-stone','DESCOBERTA',1,w.marks[1],LOOP_MARKS[1],'J',
    'Consegui! Tem outra marca aqui!',
    'Estamos perto! Nino, encontre o arco e use dash com E!',
    'NINO: ATIVE O ARCO DE MADEIRA.'),
   part('mark-arch','DESCOBERTA',2,w.marks[2],LOOP_MARKS[2],'SHIFT + E',
    'Funcionou! A passagem está aberta!',
    'TRILHAS LIBERADAS! Reúnam os três na passagem indicada pelo vento!',
    'REÚNAM OS TRÊS NA PASSAGEM CERTA.')];
  const tree:PartialBeat[]=([0,1,2] as const).map(i=>
   part('bridge-'+i,'ÁRVORE-PONTE',i,w.tree[i],
    // Correct coordinates are assigned from the authority's second challenge.
    [{x:2140,y:88},{x:2560,y:574},{x:2242,y:592}][i],
    ['E','J','SHIFT + E'][i],
    ['A amarra está solta!','Acertei a amarra!','A raiz cedeu!'][i],
    ['Boa, Téo! Lia, mire na próxima amarra!','Ótimo, Lia! Nino, solte a raiz!',
      'A árvore vai cair! Afastem-se!'][i],
    'TRABALHEM JUNTOS PARA FORMAR A PONTE.'));
  const final:PartialBeat[]=([0,1,2] as const).map(i=>
   part('final-'+i,'TRAVAS',i,w.final[i],
    [{x:3320,y:510},{x:3470,y:573},{x:3595,y:590}][i],
    ['E','J','SHIFT + E'][i],
    names[i]+': mecanismo liberado!',
    'Boa! Falta garantir que todos atravessem em segurança!',
    'LIBEREM AS TRAVAS FINAIS.'));
  const next=!w.observed?'OBSERVEM A FLORESTA ANTES DO APAGÃO.':
    !w.marks[0]?'TÉO: INVESTIGUE A ÁRVORE OCA.':
    !w.marks[1]?'LIA: INVESTIGUE A PEDRA RACHADA.':
    !w.marks[2]?'NINO: ATIVE O ARCO DE MADEIRA.':
    w.lastRoute!=='right'?'REÚNAM OS TRÊS NA PASSAGEM '+(route==='oca'?'DA ÁRVORE OCA.':'DA PEDRA RACHADA.') :
    !w.bridge?'LIBEREM A ÁRVORE-PONTE COM OS TRÊS AMIGOS.':
    !w.exit?'ABRAM AS TRAVAS E AGUARDEM O ESTADO C.':
    'REÚNAM OS TRÊS NA SAÍDA.';
  const s=beats(phase,[discovery,tree,final],next,w.completed);
  if(!w.observed)return {...s,next:null};
  if(!w.marks.every(Boolean))return {...s,next:discovery.find(b=>!b.done) as MissionBeat??null};
  if(w.lastRoute!=='right')return {...s,next:null};
  if(!w.bridge)return {...s,next:s.beats.find(b=>b.group==='ÁRVORE-PONTE'&&!b.done)??null};
  return {...s,next:s.beats.find(b=>b.group==='TRAVAS'&&!b.done)??null};
 }
 if(phase===2){
  const w=world as TemporalWorld;
  const echo=([0,1,2] as const).map(i=>part('echo-'+i,'MARCOS NA CHUVA',i,w.echo[i],TEMP_ECHO[i],
   ['E','J','SHIFT + E'][i],
   ['Encontrei a marca!','Acerteii!','Abri o terceiro marco!'][i],
   ['Boa, Téo! Lia, prepare a baladeira!','Funcionou! Nino, use seu dash!',
    'Marcos liberados! Sigam até a grande árvore!'][i],
   'ENCONTREM OS TRÊS MARCOS.'));
  const tree=([0,1,2] as const).map(i=>part('rain-tree-'+i,'ÁRVORE SOBRE A ÁGUA',i,w.tree[i],TEMP_TREE[i],
   ['E','J','SHIFT + E'][i],
   ['Soltei a amarra!','Acertei o cipó!','A raiz se soltou!'][i],
   ['Boa! Lia, prepare a baladeira!','Funcionou! Nino, libere a última raiz!',
    'A árvore está livre! Afastem-se, ela vai cair!'][i],
   'FAÇAM A ÁRVORE CAIR SOBRE A CORRENTEZA.'));
  const roots=([0,1,2] as const).map(i=>part('rain-roots-'+i,'RAÍZES DA TEMPESTADE',i,w.roots[i],
   TEMP_ROOTS[i],['E','J','SHIFT + E'][i],
   ['Uma raiz a menos!','Acertei!','Passagem desbloqueada!'][i],
   ['Bom trabalho! Falta uma raiz!','Nino, solte a raiz restante!',
    'Passagem liberada! Reúnam os três e atravessem!'][i],
   'LIBEREM AS RAÍZES NO ESTADO C.'));
  return beats(phase,[echo,tree,roots],
   !w.echo.every(Boolean)?'ENCONTREM OS TRÊS MARCOS NA CHUVA.':
   !w.bridge?'SOLTEM AS AMARRAS DA ÁRVORE SOBRE A ÁGUA.':
   !w.roots.every(Boolean)?'LIBEREM AS RAÍZES NO ESTADO C.':
   'REÚNAM OS TRÊS NA SAÍDA DA TEMPESTADE.',w.completed);
 }
 if(phase===3){
  const w=world as TreeWorld;
  const groups=[
   {id:'copas-bridge',name:'PONTE DOS TRÊS',flags:w.bridge,targets:TREE_TARGETS.bridge,
    heroes:['Soltei o primeiro galho!','Corda liberada!','A ponte se moveu!'],
    pipo:['Boa, Téo! Lia, procure a amarra suspensa!','Outra parte liberada! Nino, use seu dash!',
      'A ponte está pronta! Atravessem com cuidado!']},
   {id:'copas-tower',name:'ESCADA HUMANA',flags:w.tower,targets:TREE_TARGETS.tower,
    heroes:['O apoio está firme!','Consegui subir!','Alcancei o cipó!'],
    pipo:['Nino é a base! Formem a escada!','Téo, alcance o galho superior!',
      'O cipó está solto! Procurem os Galhos do Tempo!']},
   {id:'copas-time',name:'GALHOS DO TEMPO',flags:w.time,targets:TREE_TARGETS.time,
    heroes:['Essa trava está livre!','Alvo atingido!','O último galho se abriu!'],
    pipo:['Boa! Precisamos das outras travas!','Mais uma! Procurem a próxima!',
      'O caminho está livre! Reúnam os três!']}
  ];
  const arrays=groups.map(g=>([0,1,2] as const).map(i=>{
   const target=(Object.values(g.targets) as {x:number;y:number}[])[i]??{x:0,y:0};
   return part(g.id+'-'+i,g.name,i,g.flags[i],target,['E','J','SHIFT + E'][i],
    g.heroes[i],g.pipo[i],g.name+': '+g.flags.filter(Boolean).length+'/3');
  }));
  return beats(phase,arrays,!w.bridgeOpen?'CONCLUAM A PONTE DOS TRÊS.':
   !w.ropeOpen?'FORMEM A ESCADA HUMANA E SOLTEM O CIPÓ.':
   !w.finalOpen?'LIBEREM OS GALHOS DO TEMPO.':
   'REÚNAM OS TRÊS NO GALHO FINAL.',w.completed);
 }
 const w=world as FireWorld;
 const groups=[
  {id:'fire-log',name:'TRONCO EM CHAMAS',flags:w.log,targets:FIRE_TARGETS.log,
   hero:['Soltei a estrutura!','Acertei o suporte!','A passagem se abriu!'],
   bird:['Boa, Téo! Lia, aquele suporte ainda segura a passagem!',
    'Está quase! Nino, agora é com você!',
    'PASSAGEM LIBERADA! CORRAM, O FOGO ESTÁ CHEGANDO!']},
  {id:'fire-smoke',name:'CORREDOR DE FUMAÇA',flags:w.smoke,targets:FIRE_TARGETS.smoke,
   hero:['Abri um respiro!','Acertei o respiro!','O ar ficou mais limpo!'],
   bird:['Boa! Lia, libere outro respiro!','Nino, falta uma passagem de ar!',
    'O corredor abriu! Sigam juntos!']},
  {id:'fire-tree',name:'ÁRVORES CAINDO',flags:w.tree,targets:FIRE_TARGETS.tree,
   hero:['Soltei a amarra alta!','Acertei!','A árvore vai cair!'],
   bird:['Boa! Lia, libere outro suporte!','Nino, solte a raiz final!',
    'ÁRVORE CAINDO! AFASTEM-SE!']}
 ];
 const arrays=groups.map(g=>([0,1,2] as const).map(i=>part(
   g.id+'-'+i,g.name,i,g.flags[i],g.targets[names[i].toLowerCase() as 'teo'|'lia'|'nino'],
   ['E','J','SHIFT + E'][i],g.hero[i],g.bird[i],g.name+': '+g.flags.filter(Boolean).length+'/3')));
 return beats(phase,arrays,!w.logOpen?'LIBEREM O TRONCO EM CHAMAS.':
  !w.smokeOpen?'ABRAM O CORREDOR DE FUMAÇA.':
  !w.treeOpen?'DIRECIONEM A QUEDA DA ÁRVORE.':
  'REÚNAM OS TRÊS NA MARGEM SEGURA.',w.completed);
}
/** Snapshot differences are idempotent, so reconnect does not replay historic dialogue. */
export function newlyCompleted(oldSnapshot:MissionSnapshot|null,newSnapshot:MissionSnapshot):MissionBeat[]{
 if(!oldSnapshot||oldSnapshot.phase!==newSnapshot.phase)return [];
 const was=new Map(oldSnapshot.beats.map(b=>[b.id,b.done]));
 return newSnapshot.beats.filter(b=>b.done===true&&was.get(b.id)===false);
}
