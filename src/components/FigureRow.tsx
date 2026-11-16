import { useEffect, useState } from 'react';
import type { FigureData, SceneController } from '../state/types';
import { FigureColorPicker } from './FigureColorPicker';
import { FigureSizePicker } from './FigureSizePicker';
export function FigureRow({
  figure,
  selected,
  controller,
}: {
  figure: FigureData;
  selected: boolean;
  controller: SceneController;
}) {
  const [name, setName] = useState(figure.name);
  useEffect(() => setName(figure.name), [figure.name]);
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
      <label className="property-field property-name"><span className="property-label">Name</span>
      <input
        type="text"
        className="figure-name-input"
        value={name}
        aria-label="Name der Figur"
        onChange={(event) => {
          setName(event.target.value);
          controller.setName(figure.id, event.target.value);
        }}
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
      </label>
      <div className="property-field"><span className="property-label">Farbe</span>
      <FigureColorPicker
        figure={figure}
        controller={controller}
      />
      </div>
      <div className="property-field">
      <FigureSizePicker
        figure={figure}
        controller={controller}
      />
      </div>
      <button
        type="button"
        className="btn-figure-view"
        title="Figurensicht"
        aria-label="Figurensicht"
        onClick={() => {
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
        Sicht einnehmen
      </button>
      <button
        type="button"
        className="btn-delete-icon"
        title="Löschen"
        aria-label="Figur löschen"
        onClick={() => {
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
        Figur löschen
      </button>
    </li>
  );
}
