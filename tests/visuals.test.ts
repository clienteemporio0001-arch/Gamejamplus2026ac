import { readFileSync } from 'node:fs';
import { pick, visualBudget, visualNoise } from '../src/visualMath';

let total=0;
const check=(yes:unknown,message:string):void=>{
  if(!yes)throw Error('FALHA VISUAL: '+message);total++;
};
for(const n of [0,1,5,117,4300,-20]) {
  const v=visualNoise(n);
  check(Number.isFinite(v)&&v>=0&&v<1,'ruído decorativo limitado '+n);
  check(visualNoise(n)===v,'arte determinística '+n);
  check(pick(n,10,25)>=10&&pick(n,10,25)<=25,'decoração dentro do intervalo '+n);
}
const desktop=visualBudget(4300,false),mobile=visualBudget(4300,true);
check(desktop.fireflies===24&&desktop.leaves===14,'efeitos desktop possuem limite');
check(mobile.fireflies<=10&&mobile.leaves<=6,'modo mobile reduz animações');
check(desktop.nearTrees<=70,'desenho de árvores em lote limita objetos');
check(visualBudget(20000,true).nearTrees===desktop.nearTrees,'largura visual limitada a 4300');
const art=readFileSync('src/visuals.ts','utf8');
check(!art.includes('physics.add.existing'),'renderização não adiciona corpos físicos');
check(!art.includes('setGravityY')&&!art.includes('setVelocityX'),'arte não toca nas velocidades');
check(art.includes('setScrollFactor(layer.scroll)'),'camadas usam parallax');
check(art.includes('material ===')&&art.includes('fillRoundedRect'),'texturas de plataformas por material');
check(art.includes('this.lowPower ? 6 : 14'),'partículas reduzidas no mobile');
check(art.includes('t.visible&&t.active')&&art.includes('skin.ink.setVisible(visible)'),'plataformas decorativas seguem visibilidade física e culling da câmera');
check(art.includes('skin.ink.setPosition(t.x,t.y)')&&art.includes('skin.ink.x!==t.x'),'skinning acompanha plataformas móveis sem recalcular corpos imóveis');
for(const file of ['src/forestScene.ts','src/journeyScene.ts','src/lateScene.ts']){
  const text=readFileSync(file,'utf8');
  check(text.includes('new NightArt(this,'),file+' aplica visual');
  check(text.includes('this.art.platform('),file+' reveste plataformas');
  check(text.includes('this.art.character('),file+' reveste personagens');
  check(text.includes('this.art.update(time)'),file+' atualiza animação e skin');
}
check(readFileSync('src/network.ts','utf8').includes('Peer'),'protocolo P2P não foi removido');
check(readFileSync('src/keyboard.ts','utf8').includes('ShiftLeft'),'controle Shift preservado');
console.log('APROVADO: '+total+' verificações puras de visual, limites e integração.');
