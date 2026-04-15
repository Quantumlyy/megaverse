import type { Grid } from "@megaverse/core";
import { constants } from "@megaverse/core";

const { _, P, B, R, W, V, U, D, L, A } = constants;

// ── 1. Smoke test: single polyanet in a 3×3 ─────────────────────────────
export const single: Grid = [
  [_, _, _],
  [_, P, _],
  [_, _, _],
];

// ── 2. Phase 1 X-cross: classic 11×11 ───────────────────────────────────
export const xCross: Grid = [
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, P, _, _, _, _, _, P, _, _],
  [_, _, _, P, _, _, _, P, _, _, _],
  [_, _, _, _, P, _, P, _, _, _, _],
  [_, _, _, _, _, P, _, _, _, _, _],
  [_, _, _, _, P, _, P, _, _, _, _],
  [_, _, _, P, _, _, _, P, _, _, _],
  [_, _, P, _, _, _, _, _, P, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _],
];

// ── 3. Rainbow: all four soloon colors in a 7×9 ─────────────────────────
export const rainbow: Grid = [
  [_, _, _, _, _, _, _, _, _],
  [_, B, R, V, W, B, R, V, _],
  [_, R, V, W, B, R, V, W, _],
  [_, V, W, B, R, V, W, B, _],
  [_, W, B, R, V, W, B, R, _],
  [_, B, R, V, W, B, R, V, _],
  [_, _, _, _, _, _, _, _, _],
];

// ── 4. Compass: polyanet at center, comeths pointing outward on a 9×9 ──
export const compass: Grid = [
  [_, _, _, _, U, _, _, _, _],
  [_, _, _, _, U, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [L, L, _, _, P, _, _, A, A],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _],
  [_, _, _, _, D, _, _, _, _],
  [_, _, _, _, D, _, _, _, _],
];

// ── 5. Mosaic: mixed entities in a 10×10 with a pre-placed partial state ─
export const mosaicGoal: Grid = [
  [P, _, _, B, _, _, R, _, _, P],
  [_, U, _, _, _, _, _, _, D, _],
  [_, _, P, _, W, _, V, _, _, _],
  [A, _, _, P, _, _, _, P, _, L],
  [_, _, W, _, P, _, P, _, V, _],
  [_, _, V, _, P, _, P, _, W, _],
  [A, _, _, P, _, _, _, P, _, L],
  [_, _, P, _, V, _, W, _, _, _],
  [_, U, _, _, _, _, _, _, D, _],
  [P, _, _, R, _, _, B, _, _, P],
];

// Pre-place the four corner polyanets and the two top soloons so the
// solver has to diff against existing state rather than starting empty.
export const mosaicStart: Grid = [
  [P, _, _, B, _, _, _, _, _, P],
  [_, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  [P, _, _, _, _, _, _, _, _, P],
];
