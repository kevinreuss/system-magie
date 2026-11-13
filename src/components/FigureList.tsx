import type { SceneController, SceneState } from '../state/types';
import { FigureRow, type OpenPicker } from './FigureRow';
export function FigureList({
  state,
  controller,
  picker,
  setPicker,
}: {
  state: SceneState;
  controller: SceneController | null;
  picker: OpenPicker;
  setPicker: (picker: OpenPicker) => void;
}) {
  return (
    <ul id="fig-list">
      {controller &&
        (state.figures.length ? (
          state.figures.map((figure) => (
            <FigureRow
              key={figure.id}
              figure={figure}
              selected={figure.id === state.selectedFigureId}
              controller={controller}
              picker={picker}
              setPicker={setPicker}
            />
          ))
        ) : (
          <li style={{ opacity: 0.55, padding: 14, fontSize: 14 }}>
            Noch keine Figur
          </li>
        ))}
    </ul>
  );
}
