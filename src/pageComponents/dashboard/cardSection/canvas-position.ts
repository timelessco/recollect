// Procedural placement for canvas-view bookmarks. Positions are
// returned as fractions (0..1) of the wrapper's measured size, so the
// caller can multiply by live width/height — re-layout on resize is
// free and the layout stays constrained to the viewport.

export type DepthPlane = "far" | "near";

export interface CanvasPosition {
  plane: DepthPlane;
  // Per-card drag-parallax multiplier in [0.5, 1.0] — cards drift at
  // independent rates, matching the random `meshSpeed` in the reference.
  speed: number;
  // 0..1 — multiplied by wrapper width at render time.
  xFrac: number;
  // 0..1 — multiplied by wrapper height at render time.
  yFrac: number;
}

// Per-plane render scale. Picked to give a clear "in front / behind"
// read while staying readable at typical viewport sizes.
export const PLANE_SCALE: Record<DepthPlane, number> = {
  far: 0.7,
  near: 1,
};

// Margin (as fraction of viewport) kept clear at every edge so cards
// never render flush against the dashboard chrome.
const EDGE_MARGIN_FRAC = 0.06;
const PLACEMENT_RANGE = 1 - 2 * EDGE_MARGIN_FRAC;

// 0.5 → roughly half the deck lands on each plane. Tunable.
const NEAR_PLANE_PROBABILITY = 0.5;

// djb2 hash — bitwise-free variant matching hashCollectionId in
// axiom-client-events.ts so output is comparable across the codebase.
function djb2(input: string): number {
  const MOD = 2 ** 32;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.codePointAt(i) ?? 0;
    hash = (hash * 33 + code) % MOD;
  }
  return hash;
}

// Halton low-discrepancy sequence — spreads samples without the visible
// clumping pure random produces.
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

function pickPlane(seed: number): DepthPlane {
  // halton(seed, 7) gives a deterministic [0, 1) — distinct base from
  // the position halton calls so plane and position decisions don't
  // correlate visibly.
  return halton(seed, 7) < NEAR_PLANE_PROBABILITY ? "near" : "far";
}

// Stratified jitter: divide the canvas into `chunkSize` cells, give each
// card its own cell, jitter within the cell. Guarantees at most one card
// per cell — neighbors may stack lightly, but four-card pile-ups can't
// happen. Aspect multiplier 1.2 biases the grid wider than tall, matching
// typical desktop viewports.
export function procPos(
  bookmarkId: number | string,
  index: number,
  chunkSize: number,
): CanvasPosition {
  const seed = djb2(String(bookmarkId));
  const nCols = Math.max(1, Math.ceil(Math.sqrt(chunkSize * 1.2)));
  const nRows = Math.max(1, Math.ceil(chunkSize / nCols));
  const col = index % nCols;
  const row = Math.floor(index / nCols);
  // Cells use 80% of their footprint for jitter — cards spread further
  // toward cell edges so the layout looks airier.
  const jitterX = 0.1 + halton(seed, 2) * 0.8;
  const jitterY = 0.1 + halton(seed, 3) * 0.8;
  // Y-skew: power < 1 maps middle values higher (e.g. 0.5 → 0.62), so
  // cards from the middle rows drift toward the bottom and the top gets
  // visibly more breathing room.
  const skewedY = ((row + jitterY) / nRows) ** 0.7;
  return {
    plane: pickPlane(seed),
    xFrac: EDGE_MARGIN_FRAC + ((col + jitterX) / nCols) * PLACEMENT_RANGE,
    yFrac: EDGE_MARGIN_FRAC + skewedY * PLACEMENT_RANGE,
    // [0.5, 1.0] — same range as the reference's `Math.random() * 0.5 + 0.5`,
    // but deterministic per id so it's stable across renders.
    speed: 0.5 + halton(seed, 13) * 0.5,
  };
}
