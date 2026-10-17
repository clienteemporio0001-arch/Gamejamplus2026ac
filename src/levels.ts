/** Estrutura reservada para as cinco fases; somente a demonstração da primeira está implementada. */
export const LEVELS = [
  { id: 'boca-da-noite', title: 'A Boca da Noite', implemented: true },
  { id: 'ponte-quebrada', title: 'A Ponte Quebrada', implemented: false },
  { id: 'olhos-na-mata', title: 'Olhos na Mata', implemented: false },
  { id: 'trilha-que-mente', title: 'A Trilha que Mente', implemented: false },
  { id: 'ultimo-caminho', title: 'O Último Caminho', implemented: false },
] as const;
export type LevelId = typeof LEVELS[number]['id'];
export const DEMO_LEVEL = LEVELS[0];
