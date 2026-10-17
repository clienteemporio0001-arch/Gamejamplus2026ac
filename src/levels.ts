/** Roteiro DEFINITIVO: quatro fases cooperativas. */
export const LEVELS = [
  { id: 'boca-da-noite', title: 'A Boca da Noite', implemented: true },
  { id: 'ponte-quebrada', title: 'A Ponte Quebrada / Travessia dos Cipós', implemented: true },
  { id: 'olhos-na-mata', title: 'Olhos na Mata', implemented: true },
  { id: 'trilha-que-mente', title: 'A Trilha que Mente', implemented: true },
] as const;
export type LevelId = typeof LEVELS[number]['id'];
export const DEMO_LEVEL = LEVELS[0];
export const RIVER_LEVEL = LEVELS[1];
/** A próxima etapa futura ampliará o encerramento da Fase 4, não criará uma quinta fase. */
export function nextPlayableLevel(level:number):2|3|4|null {
  const next=level+1;return next===2||next===3||next===4?next:null;
}
