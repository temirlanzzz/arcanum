// Floor plan in metres. A 14 m wide nave runs from the entrance (z = +6) to the
// book hall (z = -60); eight department bays open off it, four per side.
export const NAVE_HALF = 7;        // nave spans x in [-7, 7]
export const BAY_BACK = 14;        // bay back walls at x = +-14
export const BAY_HALF = 6;         // each bay spans zc +- 6
export const OPEN_HALF = 4.5;      // opening half-width into a bay
export const OPEN_TOP = 5.2;       // underside of the lintel above an opening
export const CEIL = 7.6;           // ceiling height
export const Z_FRONT = 6, Z_END = -60;
export const EYE = 1.65;           // standing eye height

export const BAYS = Array.from({ length: 8 }, (_, b) => ({ b, s: b % 2 === 0 ? -1 : 1, zc: -5 - 14 * (b >> 1) }));

// Bay-local frame: u runs from the opening (0) to the back wall (7), v along the bay (-6..6).
export function bayToWorld(bay, u, v) {
  return { x: bay.s * (NAVE_HALF + u), z: bay.zc + v };
}
// World yaw for a model whose front is +z: 0 deg faces the nave, +90 faces +v (world +z),
// 180 faces the back wall.
export function faceNave(bay, deg = 0) {
  return -bay.s * Math.PI / 2 + bay.s * deg * Math.PI / 180;
}
