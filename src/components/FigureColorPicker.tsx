import { FIGURE_COLORS } from '../figures/colors';
import { figureTypes } from '../figures';
import type { FigureData, SceneController } from '../state/types';
export function FigureColorPicker({
  figure,
  controller,
}: {
  figure: FigureData;
  controller: SceneController;
}) {
  const colorName = (hex: number | null) =>
    hex === null
      ? figureTypes[figure.type].defaultColorName
      : FIGURE_COLORS.find((c) => c.hex === hex)!.name;
  const preview = (hex: number | null) => ({
    backgroundImage: `url(${controller.getPreview(figure.type, hex)})`,
  });
  return (
    <div className="figure-color-wrap">
      <div
        className="figure-color-dropdown is-open"
        role="group"
        aria-label="Farbe wählen"
      >
        {FIGURE_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            className="figure-color-opt"
            title={colorName(color.hex)}
            aria-label={colorName(color.hex)}
            aria-pressed={figure.woodColor === color.hex}
            style={preview(color.hex)}
            onClick={(event) => {
              event.stopPropagation();
              controller.setColor(figure.id, color.hex);
            }}
          >
            {colorName(color.hex)}
          </button>
        ))}
      </div>
    </div>
  );
}
