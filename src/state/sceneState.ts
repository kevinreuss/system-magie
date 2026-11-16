import type { SceneState } from './types';
// Plain data only: no Three.js objects in the React state.
export function createSceneStore() {
  let snapshot: SceneState = {
    figures: [],
    selectedFigureId: null,
    figureViewId: null,
  };
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(next: SceneState) {
      snapshot = {
        ...next,
        figures: next.figures.map((figure) => ({
          ...figure,
          position: [...figure.position],
        })),
      };
      listeners.forEach((listener) => listener());
    },
  };
}
export type SceneStore = ReturnType<typeof createSceneStore>;
