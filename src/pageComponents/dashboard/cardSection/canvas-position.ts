// Procedural placement for canvas-view bookmarks. Positions are
// returned as fractions (0..1) of the wrapper's measured size, so the
// caller can multiply by live width/height — re-layout on resize is
// free and the layout stays constrained to the viewport.

export interface CanvasPosition {
  depth: number;
  // Per-card drag-parallax multiplier in [0.5, 1.0] — cards drift at
  // independent rates, matching the random `meshSpeed` in the reference.
  speed: number;
  // 0..1 — multiplied by wrapper width at render time.
  xFrac: number;
  // 0..1 — multiplied by wrapper height at render time.
  yFrac: number;
  // CSS translateZ depth in px. The page turns after the camera moves
  // beyond the configured depth spread.
  z: number;
}

export interface CanvasTuning {
  baseScale: number;
  cameraZoomZ: number;
  cardBaseWidth: number;
  depthScaleBoost: number;
  edgeMargin: number;
  gridAspect: number;
  jitterX: number;
  jitterY: number;
  lightboxWheelCooldownMs: number;
  pageTurnBuffer: number;
  panMaxX: number;
  panMaxY: number;
  parallaxMax: number;
  parallaxMin: number;
  perspective: number;
  scrollSensitivity: number;
  worldHeight: number;
  worldWidth: number;
  ySkew: number;
  zSpread: number;
}

export const CANVAS_DEFAULT_TUNING: CanvasTuning = {
  baseScale: 0.75,
  cameraZoomZ: 119,
  cardBaseWidth: 187,
  depthScaleBoost: 0.3,
  edgeMargin: 0.16,
  gridAspect: 1.35,
  jitterX: 0.41,
  jitterY: 0.25,
  lightboxWheelCooldownMs: 500,
  pageTurnBuffer: 80,
  panMaxX: 0.72,
  panMaxY: 0.62,
  parallaxMax: 1,
  parallaxMin: 0.25,
  perspective: 1500,
  scrollSensitivity: 1,
  worldHeight: 1.4,
  worldWidth: 1.3,
  ySkew: 0.83,
  zSpread: 206,
};

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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const jitterWithinCell = (seed: number, base: number, range: number) => {
  const clampedRange = clamp(range, 0, 1);
  const inset = (1 - clampedRange) / 2;
  return inset + halton(seed, base) * clampedRange;
};

// Stratified jitter: divide the canvas into `chunkSize` cells, give each
// card its own cell, jitter within the cell. Guarantees at most one card
// per cell — neighbors may stack lightly, but four-card pile-ups can't
// happen. Aspect multiplier 1.2 biases the grid wider than tall, matching
// typical desktop viewports.
export function procPos(
  bookmarkId: number | string,
  index: number,
  chunkSize: number,
  tuning: CanvasTuning = CANVAS_DEFAULT_TUNING,
): CanvasPosition {
  const seed = djb2(String(bookmarkId));
  const nCols = Math.max(1, Math.ceil(Math.sqrt(chunkSize * tuning.gridAspect)));
  const nRows = Math.max(1, Math.ceil(chunkSize / nCols));
  const col = index % nCols;
  const row = Math.floor(index / nCols);
  const edgeMargin = clamp(tuning.edgeMargin, 0, 0.3);
  const placementRange = 1 - 2 * edgeMargin;
  const jitterX = jitterWithinCell(seed, 2, tuning.jitterX);
  const jitterY = jitterWithinCell(seed, 3, tuning.jitterY);
  const depth = halton(seed, 5);
  // Y-skew: power < 1 maps middle values higher (e.g. 0.5 → 0.62), so
  // cards from the middle rows drift toward the bottom and the top gets
  // visibly more breathing room.
  const skewedY = ((row + jitterY) / nRows) ** tuning.ySkew;
  return {
    depth,
    xFrac: edgeMargin + ((col + jitterX) / nCols) * placementRange,
    yFrac: edgeMargin + skewedY * placementRange,
    // [0.5, 1.0] — same range as the reference's `Math.random() * 0.5 + 0.5`,
    // but deterministic per id so it's stable across renders.
    speed: tuning.parallaxMin + halton(seed, 13) * (tuning.parallaxMax - tuning.parallaxMin),
    z: depth * tuning.zSpread,
  };
}
