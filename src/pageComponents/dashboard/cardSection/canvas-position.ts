export const CANVAS_W = 4000;
export const CANVAS_H = 3000;
export const CARD_Z_MIN = 0.6;
export const CARD_Z_MAX = 1.4;

export interface CanvasPosition {
  x: number;
  y: number;
  z: number;
}

// djb2 hash — bitwise-free variant matching hashCollectionId in axiom-client-events.ts.
function djb2(input: string): number {
  const MOD = 2 ** 32;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.codePointAt(i) ?? 0;
    hash = (hash * 33 + code) % MOD;
  }
  return hash;
}

// Halton low-discrepancy sequence — spreads samples across the canvas without
// the visible clumping that pure random produces.
function halton(index: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

export function procPos(bookmarkId: number | string): CanvasPosition {
  const seed = djb2(String(bookmarkId));
  return {
    x: halton(seed, 2) * CANVAS_W,
    y: halton(seed + 1, 3) * CANVAS_H,
    z: CARD_Z_MIN + halton(seed + 2, 5) * (CARD_Z_MAX - CARD_Z_MIN),
  };
}

export function normalizeZ(z: number): number {
  return (z - CARD_Z_MIN) / (CARD_Z_MAX - CARD_Z_MIN);
}
