import {
  FIGURE_SIZE_MIN,
  FIGURE_SIZE_MAX,
  formatFigureSize,
} from '../figures/size';
import type { FigureData, SceneController } from '../state/types';
export function FigureSizePicker({
  figure,
  controller,
}: {
  figure: FigureData;
  controller: SceneController;
}) {
  const label = formatFigureSize(figure.size);
  const id = `figure-size-${figure.id}`;
  return (
    <div className="figure-size-wrap">
      <div className="figure-size-dropdown is-open">
        <label className="figure-size-label" htmlFor={id}>
          Größe<output htmlFor={id}>{label}</output>
        </label>
        <input
          type="range"
          id={id}
          className="figure-size-slider"
          min={FIGURE_SIZE_MIN}
          max={FIGURE_SIZE_MAX}
          step="any"
          value={figure.size}
          aria-valuetext={label}
          onChange={(event) =>
            controller.setSize(figure.id, Number(event.target.value))
          }
          onClick={(event) => event.stopPropagation()}
        />
        <div className="figure-size-limits">
          <span>0,5×</span>
          <span>2×</span>
        </div>
      </div>
    </div>
  );
}
