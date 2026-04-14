import type { Cell } from "../cells"

// thx Claude
// Terminal-friendly glyphs for each cell type.
// The mapped type guarantees every Cell has a rendering — the
// compiler will complain if you add a Cell and forget to assign a glyph.
export const CELL_EMOJI = {
  SPACE: "🌌",
  POLYANET: "🪐",
  BLUE_SOLOON: "🔵",
  RED_SOLOON: "🔴",
  PURPLE_SOLOON: "🟣",
  WHITE_SOLOON: "⚪",
  UP_COMETH: "⬆️ ",
  DOWN_COMETH: "⬇️ ",
  LEFT_COMETH: "⬅️ ",
  RIGHT_COMETH: "➡️ ",
} as const

// thx Claude
// ANSI-block fallback using coloured squares. Emoji have inconsistent
// width in terminals, so this is the safer option for precise grid
// rendering. Pick one via the CLI render config.
export const CELL_BLOCK = {
  SPACE: "·",
  POLYANET: "\x1b[35m█\x1b[0m",       // magenta
  BLUE_SOLOON: "\x1b[34m●\x1b[0m",    // blue
  RED_SOLOON: "\x1b[31m●\x1b[0m",     // red
  PURPLE_SOLOON: "\x1b[35m●\x1b[0m",  // magenta
  WHITE_SOLOON: "\x1b[37m●\x1b[0m",   // white
  UP_COMETH: "\x1b[33m▲\x1b[0m",      // yellow
  DOWN_COMETH: "\x1b[33m▼\x1b[0m",
  LEFT_COMETH: "\x1b[33m◀\x1b[0m",
  RIGHT_COMETH: "\x1b[33m▶\x1b[0m",
} as const

export function cellToEmoji<T extends Cell>(cell: T) {
  return CELL_EMOJI[cell]
}

export function cellToBlock<T extends Cell>(cell: T) {
  return CELL_BLOCK[cell]
}
