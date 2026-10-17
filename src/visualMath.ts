/** Pure deterministic decoration helpers. Never drive multiplayer physics. */
export function visualNoise(n: number): number {
  const v = Math.sin(n * 127.1 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}
export function pick(n: number, a: number, b: number): number {
  return a + (b - a) * visualNoise(n);
}
/** Decorative sky/tree/particles scale without changing world geometry. */
export function visualBudget(width: number, lowPower: boolean) {
  const safeWidth = Math.max(0, Math.min(4300, width));
  return {
    fog: lowPower ? 3 : 6,
    fireflies: lowPower ? 10 : 24,
    leaves: lowPower ? 6 : 14,
    nearTrees: Math.ceil(safeWidth / 69) + 4,
  };
}
