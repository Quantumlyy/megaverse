/**
 * Shared Megaverse domain types, schemas, payload definitions, and grid utilities.
 */
import * as constants from "./lib/constants";
import * as utils from "./lib/utils";

export * from "./lib/cells";
export * from "./lib/placement";
export * from "./lib/wire";

/**
 * Named cell token constants used throughout the solver and mock server.
 */
const coreConstants = constants;
/**
 * Conversion and rendering helpers for Megaverse grid cells.
 */
const coreUtils = utils;

export { coreConstants as constants, coreUtils as utils };
