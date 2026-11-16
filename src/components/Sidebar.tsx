import { useEffect, useRef, useState, type ReactNode } from 'react';
import { figureTypes, type FigureType } from '../figures';
import type { SceneController, SceneState } from '../state/types';
import { FigureRow } from './FigureRow';

export function Sidebar({ state, controller, children }: {
  state: SceneState;
  controller: SceneController | null;
  children: ReactNode;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const addWrap = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  const selected = state.figures.find((figure) => figure.id === state.selectedFigureId);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!addWrap.current?.contains(target)) setAddOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return <>
    {children}
    {selected && controller && <aside id="sidebar" aria-label="Figur bearbeiten">
      <div className="sidebar-top">
        <div><div className="eyebrow">System Magie</div><h1>Figur bearbeiten</h1></div>
        <button type="button" id="sidebar-close" aria-label="Auswahl aufheben" onClick={() => controller.selectFigure(null)}>×</button>
      </div>
      <ul id="fig-list">
        <FigureRow key={selected.id} figure={selected} selected controller={controller} />
      </ul>
    </aside>}
    <div id="add-figure-wrap" ref={addWrap}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { setAddOpen(false); addButton.current?.focus(); }
      }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setAddOpen(false); }}>
      <div id="add-figure-options" role="group" aria-label="Figurentyp wählen" hidden={!addOpen}>
        <div className="add-heading">Figur hinzufügen</div>
        {(Object.keys(figureTypes) as FigureType[]).map((type, index) => <button
          type="button" key={type} ref={index === 0 ? firstOption : undefined}
          disabled={!controller} data-figure-type={type}
          onClick={() => { controller?.addFigure(type); setAddOpen(false); addButton.current?.focus(); }}>
          {figureTypes[type].name}
        </button>)}
      </div>
      <button type="button" id="add-figure" ref={addButton} aria-label="Figur hinzufügen"
        title="Figur hinzufügen" aria-expanded={addOpen} aria-controls="add-figure-options"
        onClick={() => { setAddOpen(!addOpen); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault(); setAddOpen(true); requestAnimationFrame(() => firstOption.current?.focus());
          }
        }}><span aria-hidden="true">+</span></button>
    </div>
  </>;
}
