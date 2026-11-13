import { useEffect, useState } from 'react';
import type { FigureData, SceneController } from '../state/types';
import { FigureColorPicker } from './FigureColorPicker';
import { FigureSizePicker } from './FigureSizePicker';
export type OpenPicker = {
  id: number;
  kind: 'color' | 'size';
} | null;
export function FigureRow({
  figure,
  selected,
  controller,
  picker,
  setPicker,
}: {
  figure: FigureData;
  selected: boolean;
  controller: SceneController;
  picker: OpenPicker;
  setPicker: (picker: OpenPicker) => void;
}) {
  const [name, setName] = useState(figure.name);
  useEffect(() => setName(figure.name), [figure.name]);
  const toggle = (kind: 'color' | 'size') =>
    setPicker(
      picker?.id === figure.id && picker.kind === kind
        ? null
        : { id: figure.id, kind },
    );
  return (
    <li
      className={`figure-row${selected ? ' is-selected' : ''}`}
      data-id={figure.id}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (
          (event.target as HTMLElement).closest(
            '.figure-color-wrap, .figure-size-wrap, .btn-delete-icon, .btn-figure-view, .figure-name-input',
          )
        )
          return;
        controller.selectFigure(figure.id);
      }}
    >
      <FigureColorPicker
        figure={figure}
        controller={controller}
        open={picker?.id === figure.id && picker.kind === 'color'}
        toggle={() => toggle('color')}
        close={() => setPicker(null)}
      />
      <FigureSizePicker
        figure={figure}
        controller={controller}
        open={picker?.id === figure.id && picker.kind === 'size'}
        toggle={() => toggle('size')}
      />
      <input
        type="text"
        className="figure-name-input"
        value={name}
        aria-label="Name der Figur"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            const normalized = name.trim() || `Figur ${figure.id}`;
            setName(normalized);
            controller.setName(figure.id, normalized);
          }
        }}
        onBlur={() => {
          const normalized = name.trim() || `Figur ${figure.id}`;
          setName(normalized);
          controller.setName(figure.id, normalized);
        }}
      />
      <button
        type="button"
        className="btn-figure-view"
        title="Figurensicht"
        aria-label="Figurensicht"
        onClick={() => {
          setPicker(null);
          controller.enterFigureView(figure.id);
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <ellipse cx="12" cy="12" rx="8" ry="4.5" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      </button>
      <button
        type="button"
        className="btn-delete-icon"
        title="Löschen"
        aria-label="Figur löschen"
        onClick={() => {
          setPicker(null);
          controller.removeFigure(figure.id);
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </li>
  );
}
