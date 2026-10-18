// Floor plan shared by the world, the shop and the flight controls (metres).
// A long nave runs along -z; five category bays open off each side.
import { CATEGORIES } from './products.js';

export const NAVE_HALF = 10;     // nave spans x in [-10, 10]
export const BAY_BACK = 24;      // bay back walls at x = +-24
export const BAY_HALF = 8;       // bays span zc +- 8
export const OPEN_HALF = 7.5;    // arch opening half-width
export const ARCH_SPRING = 12;   // arch springs at y = 12, crown at 19.5
export const HEIGHT = 30;        // wall height; the vault rises to 40
export const Z_FRONT = 6, Z_END = -92;
export const SHELF_LEVELS = [0.12, 1.08, 2.04, 3.0];
export const SHELF_TOP = 3.9;

export const BAYS = CATEGORIES.map((cat, b) => ({ b, cat, s: b % 2 === 0 ? -1 : 1, zc: -10 - 18 * (b >> 1) }));
export const PILLAR_Z = [-1, -19, -37, -55, -73, -91];
