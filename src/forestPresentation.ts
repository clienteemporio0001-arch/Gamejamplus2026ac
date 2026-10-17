import type { ForestWorld } from './forest';

export const GUIDE_NAME = 'GUIA INDÍGENA';

/** One text source for Phaser and the HTML dialogue. Keep caboStep on the wire. */
export const GUIDE_DIALOGUES = [
  '',
  'GUIA INDÍGENA: "Vocês estão perdidos?"',
  'TÉO: "Estamos tentando encontrar o caminho de volta para casa."',
  'GUIA INDÍGENA: "Esta floresta é perigosa. Muitos caminhos parecem seguros, mas não são."',
  'GUIA INDÍGENA: "Sozinhos, vocês não vão conseguir atravessar."',
  'GUIA INDÍGENA: "Vou mostrar a Téo como alcançar os galhos mais altos. Depois, vocês precisarão trabalhar juntos."\nTÉO APRENDEU O SALTO DUPLO!',
] as const;

/** Root and final visual track the pre-existing solid Phaser body, 362 x 34 at (3709,645). */
export const TREE_BRIDGE = {
  rootX: 3528,
  rootY: 645,
  length: 362,
  collisionCenterX: 3709,
  collisionCenterY: 645,
  collisionWidth: 362,
  collisionHeight: 34,
  initialAngle: -69 * Math.PI / 180,
  fallMs: 1900,
} as const;

export type TreeStage = 'presa' | 'soltando' | 'caindo' | 'ponte';
export type TreeFrame = {
  stage: TreeStage;
  rotation: number;
  progress: number;
  openRopes: [boolean,boolean,boolean];
};

/** Identical bridge geometry before, during and after host-authorized fall. */
export function treeFrame(
  world: Pick<ForestWorld,'treeSteps'|'treeFallAt'|'bridge'>,
  now: number,
): TreeFrame {
  const released = world.treeSteps.filter(Boolean).length;
  const raw = world.treeFallAt > 0
    ? Math.max(0,Math.min(1,(now-world.treeFallAt)/TREE_BRIDGE.fallMs)) : 0;
  const progress = world.bridge ? 1 : raw;
  const eased = progress*progress*(3-2*progress);
  const stage:TreeStage=world.bridge?'ponte':
    world.treeFallAt>0?'caindo':released>0?'soltando':'presa';
  return {
    stage,
    rotation:TREE_BRIDGE.initialAngle*(1-eased),
    progress,
    openRopes:[
      !world.treeSteps[0] && stage!=='caindo' && stage!=='ponte',
      !world.treeSteps[1] && stage!=='caindo' && stage!=='ponte',
      !world.treeSteps[2] && stage!=='caindo' && stage!=='ponte',
    ],
  };
}
export function treeBridgeAligned():boolean {
  const left=TREE_BRIDGE.collisionCenterX-TREE_BRIDGE.collisionWidth/2;
  const right=TREE_BRIDGE.collisionCenterX+TREE_BRIDGE.collisionWidth/2;
  return Math.abs(left-TREE_BRIDGE.rootX)<.01
    && Math.abs(right-(TREE_BRIDGE.rootX+TREE_BRIDGE.length))<.01;
}
