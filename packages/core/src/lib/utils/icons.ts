import type { Cell } from "../cells";
import { _, A, B, D, L, P, R, U, V, W } from "../constants";

/**
 * Emoji glyphs for every supported Megaverse cell token.
 */
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

/**
 * Monospace-safe ANSI glyphs for terminals where emoji width is inconsistent.
 */
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

/**
 * Converts an internal cell token into its emoji representation.
 *
 * @typeParam T - Cell token type being rendered.
 * @param cell - Cell token to render.
 * @returns The emoji glyph for the provided cell.
 */
export function cellToEmoji<T extends Cell>(cell: T) {
  return CELL_EMOJI[cell];
}

/**
 * Converts an internal cell token into its monospace-safe ANSI block representation.
 *
 * @typeParam T - Cell token type being rendered.
 * @param cell - Cell token to render.
 * @returns The ANSI-safe glyph for the provided cell.
 */
export function cellToBlock<T extends Cell>(cell: T) {
  return CELL_BLOCK[cell];
}
