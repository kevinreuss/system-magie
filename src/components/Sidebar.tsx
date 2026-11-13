import { useEffect, useRef, useState, type ReactNode } from 'react';
import { figureTypes, type FigureType } from '../figures';
import type { SceneController, SceneState } from '../state/types';
import { FigureList } from './FigureList';
import type { OpenPicker } from './FigureRow';
export function Sidebar({
  state,
  controller,
  children,
}: {
  state: SceneState;
  controller: SceneController | null;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [picker, setPicker] = useState<OpenPicker>(null);
  const addWrap = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const resize = () => {
      if (!media.matches) setSidebarOpen(false);
    };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen);
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.figure-color-wrap, .figure-size-wrap'))
        setPicker(null);
      if (!addWrap.current?.contains(target)) setAddOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return (
    <>
      <button
        type="button"
        id="sidebar-toggle"
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen(true)}
      >
        Figuren
      </button>
      <button
        type="button"
        id="sidebar-backdrop"
        aria-label="Seitenleiste schließen"
        tabIndex={-1}
        onClick={() => setSidebarOpen(false)}
      />
      {children}
      <aside id="sidebar">
        <div className="sidebar-top">
          <h1>System Magie</h1>
          <button
            type="button"
            id="sidebar-close"
            aria-label="Seitenleiste schließen"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>
        <div
          id="add-figure-wrap"
          ref={addWrap}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setAddOpen(false);
              addButton.current?.focus();
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setAddOpen(false);
          }}
        >
          <button
            type="button"
            id="add-figure"
            ref={addButton}
            aria-expanded={addOpen}
            aria-controls="add-figure-options"
            onClick={() => {
              setAddOpen(!addOpen);
              if (!addOpen) setPicker(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setAddOpen(true);
                setPicker(null);
                requestAnimationFrame(() => firstOption.current?.focus());
              }
            }}
          >
            Figur hinzufügen
          </button>
          <div
            id="add-figure-options"
            role="group"
            aria-label="Figurentyp wählen"
            hidden={!addOpen}
          >
            {(Object.keys(figureTypes) as FigureType[]).map((type, index) => (
              <button
                type="button"
                key={type}
                ref={index === 0 ? firstOption : undefined}
                data-figure-type={type}
                onClick={() => {
                  controller?.addFigure(type);
                  setPicker(null);
                  setAddOpen(false);
                  addButton.current?.focus();
                }}
              >
                {figureTypes[type].name}
              </button>
            ))}
          </div>
        </div>
        <div className="section-label">Figuren</div>
        <FigureList
          state={state}
          controller={controller}
          picker={picker}
          setPicker={setPicker}
        />
      </aside>
    </>
  );
}
