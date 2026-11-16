// --- Maße aus Original (Almhütte / Winterraum): Raum 4×4×2,4 m, Tischskalierung S ---
export const W_ROOM = 2.0;
export const H_ROOM_HALF = 1.2;
export const S = 0.36;
export const B_BOARD_LOCAL = 1.68;
export const TOP_LOCAL = 0.625;
export function localTableYToWorld(py: number) {
  return -H_ROOM_HALF + (py + 1.48) * S;
}
export const BOARD_TOP_Y = localTableYToWorld(TOP_LOCAL);
export const BOARD_HALF = B_BOARD_LOCAL * S;
