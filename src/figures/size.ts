export const FIGURE_SCALE_M = 0.11;
export const FIGURE_SIZE_MIN = 0.5;
export const FIGURE_SIZE_MAX = 2;
export function figureScaleForSize(size = 1) {
  return (
    FIGURE_SCALE_M * Math.max(FIGURE_SIZE_MIN, Math.min(FIGURE_SIZE_MAX, size))
  );
}
export function formatFigureSize(size: number) {
  return size.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + '×';
}
