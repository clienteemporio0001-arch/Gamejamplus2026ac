/** Registro extensível das cinco fases; somente as duas primeiras são jogáveis. */
export const LEVELS = [
  { id: 'boca-da-noite', title: 'A Boca da Noite', implemented: true },
  { id: 'ponte-quebrada', title: 'A Ponte Quebrada', implemented: true },
  { id: 'olhos-na-mata', title: 'Olhos na Mata', implemented: true },
  { id: 'trilha-que-mente', title: 'A Trilha que Mente', implemented: true },
  { id: 'ultimo-caminho', title: 'O Último Caminho', implemented: false },
] as const;
export type LevelId = typeof LEVELS[number]['id'];
export const DEMO_LEVEL = LEVELS[0];
export const RIVER_LEVEL = LEVELS[1];
