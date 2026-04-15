import type { Cell } from "../cells";
import { _, A, B, D, L, P, R, U, V, W } from "../constants";

// thx Claude
// Terminal-friendly glyphs for each cell type.
// The mapped type guarantees every Cell has a rendering — the
// compiler will complain if you add a Cell and forget to assign a glyph.
export const CELL_EMOJI = {
  [_]: "🌌",
  [P]: "🪐",
  [B]: "🔵",
  [R]: "🔴",
  [V]: "🟣",
  [W]: "⚪",
  [U]: "⬆️",
  [D]: "⬇️",
  [L]: "⬅️",
  [A]: "➡️",
} as const;

// thx Claude
// ANSI-block fallback using coloured squares. Emoji have inconsistent
// width in terminals, so this is the safer option for precise grid
// rendering. Pick one via the CLI render config.
export const CELL_BLOCK = {
  [_]: "·",
  [P]: "\x1b[35m█\x1b[0m", // magenta
  [B]: "\x1b[34m●\x1b[0m", // blue
  [R]: "\x1b[31m●\x1b[0m", // red
  [V]: "\x1b[35m●\x1b[0m", // magenta
  [W]: "\x1b[37m●\x1b[0m", // white
  [U]: "\x1b[33m▲\x1b[0m", // yellow
  [D]: "\x1b[33m▼\x1b[0m", // yellow
  [L]: "\x1b[33m◀\x1b[0m", // yellow
  [A]: "\x1b[33m▶\x1b[0m", // yellow
} as const;

export function cellToEmoji<T extends Cell>(cell: T) {
  return CELL_EMOJI[cell];
}

export function cellToBlock<T extends Cell>(cell: T) {
  return CELL_BLOCK[cell];
}
