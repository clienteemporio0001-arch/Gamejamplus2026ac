import { readFileSync } from 'node:fs';
import { GUIDE_DIALOGUES, GUIDE_NAME, TREE_BRIDGE, treeFrame, treeBridgeAligned } from '../src/forestPresentation';
import { ForestAuthority, TREE_ACTIONS, initialForest, forestHint } from '../src/forest';
import { nextPlayableLevel } from '../src/levels';
import type { Pose, Seat } from '../src/network';

let count=0;
function ok(condition:unknown,message:string):void {
  if(!condition)throw Error('FALHA 07-B: '+message);
  count++;
}
const names=readFileSync('src/forestScene.ts','utf8')+
  readFileSync('src/forest.ts','utf8')+
  readFileSync('src/main.ts','utf8');
ok(!/CABOQUIM|Caboquim/.test(names),'nome antigo ausente dos textos públicos');
ok(GUIDE_NAME==='GUIA INDÍGENA','nome do guia correto');
ok(GUIDE_DIALOGUES.length===6,'cinco etapas de diálogo em caboStep, índice zero reservado');
for(let i=1;i<6;i++)ok(GUIDE_DIALOGUES[i].length>34,'diálogo completo etapa '+i);
ok(GUIDE_DIALOGUES[1].includes('Vocês estão perdidos?'),'guia inicia conversa');
ok(GUIDE_DIALOGUES[2].includes('TÉO'),'Téo participa do diálogo');
ok(GUIDE_DIALOGUES[5].includes('TÉO APRENDEU O SALTO DUPLO!'),'salto duplo é aprendizado, não magia');

const world=initialForest(1000);
const start=treeFrame(world,2000);
ok(start.stage==='presa','árvore visível desde o início');
ok(start.rotation===TREE_BRIDGE.initialAngle,'árvore antes da queda inclinada');
ok(start.openRopes.every(Boolean),'três amarras visíveis no início');
world.treeSteps[0]=true;
const first=treeFrame(world,2200);
ok(first.stage==='soltando'&&!first.openRopes[0]&&first.openRopes[1]&&first.openRopes[2],
  'primeira amarra solta altera visual de modo idempotente');
world.treeSteps[1]=true;
const second=treeFrame(world,2400);
ok(!second.openRopes[0]&&!second.openRopes[1]&&second.openRopes[2],
  'segunda amarra desaparece');
world.treeSteps[2]=true;world.treeFallAt=2500;
const falling=treeFrame(world,3200);
ok(falling.stage==='caindo'&&falling.progress>0&&falling.progress<1,
  'árvore animando na janela do host');
ok(falling.rotation>TREE_BRIDGE.initialAngle&&falling.rotation<0,
  'árvore gira continuamente até ficar na horizontal');
ok(falling.openRopes.every(x=>!x),'cordas liberadas antes da queda');
world.bridge=true;
const done=treeFrame(world,9000);
ok(done.stage==='ponte'&&done.progress===1&&done.rotation===0,'árvore permanece horizontal após completar ponte');
ok(treeBridgeAligned(),'posição final coincide com a colisão Arcade');
ok(TREE_BRIDGE.rootX+TREE_BRIDGE.length===3890,'árvore alcança outra margem');
ok(TREE_BRIDGE.collisionHeight===34,'altura física da ponte preservada');
world.caboStep=5;world.unlocked=true;world.vines=[true,true,true];
ok(forestHint(world,0,3500).includes('PONTE DE ÁRVORE PRONTA'),'orientação depois da travessia');
world.bridge=false;
ok(forestHint(world,0,3500).includes('AFASTEM-SE'),'alerta de impacto antes da conclusão');
world.treeFallAt=0;
world.treeSteps=[false,false,false];
ok(forestHint(world,0,3500).includes('TÉO')&&forestHint(world,0,3500).includes('E'),
  'primeiro objetivo identifica Téo e E');
world.treeSteps[0]=true;
ok(forestHint(world,1,3500).includes('LIA')&&forestHint(world,1,3500).includes('J'),
  'segundo objetivo identifica Lia e J');
world.treeSteps[1]=true;
ok(forestHint(world,2,3500).includes('NINO')&&forestHint(world,2,3500).includes('SHIFT'),
  'terceiro objetivo identifica Nino e Shift');

const f=new ForestAuthority();
f.world.caboStep=5;f.world.unlocked=true;f.world.vines=[true,true,true];
const poses:Pose[]=[0,1,2].map(seat=>({seat:seat as Seat,x:3050,y:595,vx:0,vy:0}));
poses[0]={...poses[0],x:TREE_ACTIONS.teo.x,y:TREE_ACTIONS.teo.y};
ok(!f.act(1,{kind:'lever'},poses,1000),'Lia não pode soltar primeira amarra');
ok(f.act(0,{kind:'lever'},poses,1200),'Téo libera alavanca do alto');
poses[1]={...poses[1],x:3310,y:599};
ok(!f.act(0,{kind:'shoot',facing:1},poses,1500),'Téo não pode usar baladeira');
ok(f.act(1,{kind:'shoot',facing:1},poses,1700),'Lia acerta alvo com direção e altura válidas');
poses[2]={...poses[2],x:3260,y:590};
ok(!f.act(2,{kind:'dash',facing:1},poses,2000),'Nino inicia dash na marca');
poses[2]={...poses[2],x:TREE_ACTIONS.nino.x,y:TREE_ACTIONS.nino.y};
ok(f.act(2,{kind:'switch'},poses,2500),'Nino aciona E dentro do tempo do dash');
ok(f.world.treeSteps.every(Boolean)&&f.world.treeFallAt===2500,'estado de 3 amarras e queda controlado pelo host');
ok(!f.tick(poses,4200).reset&&!f.world.bridge,'ponte sem colisão enquanto anima');
ok(f.tick(poses,4400).changed&&f.world.bridge,'ponte sólida quando decorrem 1900ms');
poses.forEach(p=>{p.x=4160;p.y=592;});
ok(f.hasWon(poses),'vitória conjunta depois da ponte pronta');
ok(nextPlayableLevel(1)===2,'transição para Fase 2 preservada');

const scene=readFileSync('src/forestScene.ts','utf8');
const art=readFileSync('src/forestArt.ts','utf8');
const ui=readFileSync('src/main.ts','utf8');
ok(scene.includes('this.treeVisual=new GiantBridgeTree(this)'),'uma árvore construída na fase');
ok(scene.includes('this.treeVisual.update(w,now)'),'árvore atualizada pelo snapshot compartilhado');
ok(scene.includes('this.solid(this.fallen,w.bridge)'),'colisão habilitada exclusivamente pelo host');
ok(scene.includes('this.fallen.setVisible(false)'),'bloco da colisão não desenha segunda ponte');
ok(art.includes('this.root.setRotation(frame.rotation+shake)'),'árvore animada mesmo antes de w.bridge=true');
ok(art.includes('this.root=scene.add.container('),'árvore é renderizada permanentemente em um container');
ok(art.includes('fillRoundedRect')&&art.includes('fillEllipse'),'guia tem corpo humano e rosto detalhados');
ok(art.includes('demonstrate()'),'guia demonstra salto por movimento');
ok(scene.includes('this.guide.demonstrate()'),'treinamento acionado ao desbloquear habilidade');
ok(scene.includes('AMARRAS '),'HUD mostra amarras em lugar de ÁRVORE 0/3');
ok(scene.includes("this.interactionPrompt.setVisible(nearTeo||nearNino)"),'E contextual nas ações próximas');
ok(scene.includes("this.ground(3166,534,133,19"),'degrau adicional para chegar à alavanca');
const gravity=850,velocity=465,maxRise=velocity*velocity/(2*gravity);
const floorCenter=599,firstTop=534-19/2,secondTop=428-18/2,halfChar=22;
const firstRise=floorCenter-(firstTop-halfChar);
const secondRise=(firstTop-halfChar)-(secondTop-halfChar);
ok(firstRise<maxRise&&secondRise<maxRise,
  'os dois saltos até a alavanca cabem na física');
ok(Math.abs(599-18-TREE_ACTIONS.lia.y)<65&&
  TREE_ACTIONS.lia.x>3310&&TREE_ACTIONS.lia.x-3310<350,
  'Lia tem posição de disparo acessível à esquerda');
ok(TREE_ACTIONS.nino.x-3260>95&&TREE_ACTIONS.nino.x-3260<329*.8,
  'Nino alcança a raiz usando Shift e dash de 0,8s');
ok(ui.includes('GUIDE_DIALOGUES[net.forest.caboStep]'),'diálogos HTML compartilham a mesma fonte');
ok(ui.includes('net.act({kind:'), 'UI mantém interação remota');
ok(readFileSync('src/network.ts','utf8').includes("t: 'forest'"),'mensagens forest continuam tipadas');
ok(readFileSync('src/keyboard.ts','utf8').includes("case 'KeyJ'"),'baladeira J preservada');
ok(readFileSync('src/keyboard.ts','utf8').includes("case 'ShiftLeft'"),'dash Shift preservado');
console.log('APROVADO: '+count+' verificações da Etapa 07-B (guia, árvore e 3 amarras).');
