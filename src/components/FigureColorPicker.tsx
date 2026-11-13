import { FIGURE_COLORS } from '../figures/colors';
import { figureTypes } from '../figures';
import type { FigureData, SceneController } from '../state/types';
export function FigureColorPicker({
  figure,
  controller,
  open,
  toggle,
  close,
}: {
  figure: FigureData;
  controller: SceneController;
  open: boolean;
  toggle: () => void;
  close: () => void;
}) {
  const colorName = (hex: number | null) =>
    hex === null
      ? figureTypes[figure.type].defaultColorName
      : FIGURE_COLORS.find((c) => c.hex === hex)!.name;
  const preview = (hex: number | null) => ({
    backgroundImage: `url(${controller.getPreview(figure.type, hex)})`,
  });
  const name = colorName(figure.woodColor);
  return (
    <div className="figure-color-wrap">
      <button
        type="button"
        className="figure-color-trigger"
        title={name}
        aria-label={`Farbe wählen: ${name}`}
        aria-expanded={open}
        style={preview(figure.woodColor)}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      />
      <div
        className={`figure-color-dropdown${open ? ' is-open' : ''}`}
        role="listbox"
      >
        {FIGURE_COLORS.map((color) => (
          <button
            key={color.name}
            type="button"
            className="figure-color-opt"
            title={colorName(color.hex)}
            aria-label={colorName(color.hex)}
            role="option"
            aria-selected={figure.woodColor === color.hex}
            style={preview(color.hex)}
            onClick={(event) => {
              event.stopPropagation();
              controller.setColor(figure.id, color.hex);
              close();
            }}
          >
            {colorName(color.hex)}
          </button>
        ))}
      </div>
    </div>
  );
}
