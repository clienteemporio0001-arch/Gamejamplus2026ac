import type {LoopWorld} from './forestLoop';
import type {TemporalWorld} from './temporalForest';
import type {TreeWorld} from './treetopForest';
import type {FireWorld} from './burningForest';

/** All guidance is determined by the authoritative phase snapshot, never guesses from the camera. */
export type HintSource={phase:1;world:LoopWorld}|{phase:2;world:TemporalWorld}|
 {phase:3;world:TreeWorld}|{phase:4;world:FireWorld};
export type PipoHint={objective:string;lines:readonly [string,string,string]};
const guidance=(objective:string,lines:readonly [string,string,string]):PipoHint=>({objective,lines});
export function pipoHint(source:HintSource):PipoHint{
 if(source.phase===1){
  const w=source.world;
  if(!w.observed)return guidance('explorar',[
   'Ei, ei! Esta floresta muda de lugar. Prestem atenção!',
   'Procurem os marcos antigos: árvore oca, pedra e tronco em arco.',
   'Explorem à esquerda. Memorizem os marcos antes de cada apagão!'
  ]);
  if(!w.marks[0])return guidance('árvore oca',[
   'Aquela árvore oca parece guardar alguma coisa...',
   'Téo pode investigar a abertura da árvore.',
   'Leve Téo até a árvore oca e pressione E perto do marco.'
  ]);
  if(!w.marks[1])return guidance('pedra rachada',[
   'Lia, seus olhos de águia acharam uma pedra diferente!',
   'A baladeira de Lia pode alcançar o marco à distância.',
   'Posicione Lia à esquerda da pedra e atire com J, mirando na altura do alvo.'
  ]);
  if(!w.marks[2])return guidance('tronco em arco',[
   'Nino, aquela passagem é estreita demais para andar!',
   'É hora de usar o dash e alcançar o mecanismo.',
   'Corra com Nino, use Shift para dash e pressione E na raiz marcada.'
  ]);
  if(w.lastRoute!=='right')return guidance('rota verdadeira',[
   'Nem toda passagem da floresta leva para a frente...',
   'Observem o vento: ele aponta a rota verdadeira deste estado.',
   'Sigam o vento até '+(w.layout===1?'a árvore oca':'a pedra rachada')+'. A outra rota devolve vocês à clareira!'
  ]);
  if(!w.stackMilestone)return guidance('escada humana',[
   'Três amigos e ninguém pensou em subir um no outro?',
   'Nino é a base, Lia sobe sobre ele e Téo sobe em Lia.',
   'Parem Nino junto à árvore, usem E com Lia e depois E com Téo.'
  ]);
  if(!w.teoSummitReached)return guidance('salto do Téo',[
   'Téo, aqueles galhos estão altos até para você!',
   'A escada humana ajuda Téo a alcançar o primeiro galho.',
   'Solte Téo da formação e use salto duplo para alcançar a plataforma superior!'
  ]);
  if(!w.bridge)return guidance('árvore ponte',[
   'Olhem os cipós! Essa árvore pode virar uma ponte.',
   'Cada amigo precisa soltar uma amarra com sua habilidade.',
   'Téo ativa o alto com E; Lia atira com J; Nino usa dash e E na raiz.'
  ]);
  if(!w.exit)return guidance('travas finais',[
   'A passagem ainda não está segura. Olhem o vento!',
   'Esperem o estado C e ativem os três mecanismos finais.',
   'No estado C, Téo usa E, Lia atira no alvo e Nino usa dash e E.'
  ]);
  return guidance('saída',[
   'Boa! Agora só falta reunir toda a equipe!',
   'A saída verdadeira está aberta. Não deixem ninguém para trás.',
   'Levem os três amigos juntos à saída da floresta!'
  ]);
 }
 if(source.phase===2){
  const w=source.world;
  if(!w.echo[0])return guidance('marco da chuva',[
   'Essa chuva está inclinada... prestem atenção no vento!',
   'Os marcos conhecidos indicam o caminho no meio da tempestade.',
   'Téo precisa alcançar o primeiro marco e pressionar E.'
  ]);
  if(!w.echo[1])return guidance('pedra alagada',[
   'Lia, aquela pedra está brilhando na chuva!',
   'A baladeira pode ativar o segundo marco à distância.',
   'Com Lia à esquerda do alvo, use J para disparar na altura certa.'
  ]);
  if(!w.echo[2])return guidance('tronco encharcado',[
   'Nino, cuidado com o chão escorregadio!',
   'O dash de Nino é a chave para a terceira marca.',
   'Use dash com Nino e pressione E na marca antes que a corrida termine.'
  ]);
  if(!w.stacked)return guidance('subida na chuva',[
   'Essa árvore molhada chega lá em cima das nuvens!',
   'Apoiem-se: Nino embaixo, Lia no meio e Téo no alto.',
   'Posicionem Nino na base e usem E com Lia e depois com Téo.'
  ]);
  if(!w.teoSummitReached)return guidance('copa encharcada',[
   'Téo, vai precisar de um salto muito alto!',
   'Solte-se da escada humana e alcance os dois galhos elevados.',
   'Com Téo, use o salto duplo para pousar no galho superior e depois no topo.'
  ]);
  if(!w.bridge)return guidance('árvore sobre a correnteza',[
   'Uma árvore encharcada pode se transformar numa ponte!',
   'Faltam amarras na árvore. Os três amigos precisam colaborar.',
   'Téo ativa a amarra alta; Lia usa J; Nino usa dash e E na raiz.'
  ]);
  if(!w.roots.every(Boolean))return guidance('raízes e tempestade',[
   'Ei, ei! A tempestade ainda esconde a saída!',
   'Aguardem o estado C e ativem as três raízes.',
   'No estado C: Téo pressiona E, Lia acerta o alvo e Nino usa dash com E.'
  ]);
  return guidance('saída da chuva',[
   'A correnteza ficou para trás! Boa equipe!',
   'Agora os três devem seguir juntos até a saída.',
   'Reúnam Téo, Lia e Nino no trecho final da Fase 2.'
  ]);
 }
 if(source.phase===4){
  const w=source.world;
  if(!w.logOpen)return guidance('tronco em chamas',[
   'Ei! O fogo bloqueou a passagem. Precisamos daquela árvore!',
   'Téo alcança a amarra alta, Lia acerta o alvo e Nino ativa a trava.',
   'Téo usa salto duplo e E no galho; Lia atira com J; Nino usa dash + E na alavanca.'
  ]);
  if(!w.smokeOpen)return guidance('corredor de fumaça',[
   'A fumaça está fechando o caminho! Não fiquem parados!',
   'Procurem três respiros na fumaça. O vento está movendo o perigo.',
   'Lia atira com J no respiro, Nino usa dash + E e Téo sobe e pressiona E.'
  ]);
  if(!w.treeOpen)return guidance('árvores caindo',[
   'A madeira está estalando! Aquela árvore vai cair!',
   'Os três precisam soltar os pontos certos para formar outra ponte.',
   'Téo solta a amarra alta com E; Lia usa J; Nino ativa a raiz com dash + E.'
  ]);
  return guidance('corrida final',[
   'Rápido! A margem do rio está logo ali! Eu vejo água!',
   'As chamas mudam com o vento: esperem a janela segura antes de correr.',
   'Evitem as chamas que crescem a cada ciclo. Reúnam Téo, Lia e Nino na margem!'
  ]);
 }
 const w=source.world;
 if(!w.bridgeOpen){
  const who=w.bridge[0]?'': 'Téo, ';
  return guidance('ponte dos três',[
   'Eu tenho asas, vocês não! Olhem antes de saltar!',
   'A Ponte dos Três só desce quando cada amigo cumprir sua tarefa.',
   who+'use E no galho alto; Lia atira na amarra; Nino usa dash e E na trava.'
  ]);
 }
 if(!w.ropeOpen)return guidance('escada humana das copas',[
  'Essa árvore é tão alta que até eu fico tonto!',
  'Nino serve de base; Lia sobe nele; Téo sobe em Lia.',
  'Use E para formar a escada; Téo chega ao topo e solta o cipó com E.'
 ]);
 if(!w.finalOpen)return guidance('galhos do tempo',[
  'Os galhos mudaram! O vento ainda sabe o caminho.',
  'Cada amigo tem um mecanismo em um estado diferente da floresta.',
  'Lia dispara no estado A; Téo usa E no B; Nino usa dash e E no C.'
 ]);
 return guidance('última copa',[
  'Muito bem! Só falta a última copa!',
  'As três travas estão liberadas; reúnam o grupo no galho final.',
  'Levem Téo, Lia e Nino juntos à árvore da saída, sem cair no vazio!'
 ]);
}
export function pipoLine(source:HintSource,depth:0|1|2):string{
 return pipoHint(source).lines[depth];
}
