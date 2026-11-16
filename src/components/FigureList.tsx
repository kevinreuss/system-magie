import type { SceneController, SceneState } from '../state/types';
import { FigureRow } from './FigureRow';
export function FigureList({
  state,
  controller,
}: {
  state: SceneState;
  controller: SceneController | null;
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
