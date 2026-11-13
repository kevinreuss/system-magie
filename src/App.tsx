import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { SceneViewport } from './components/SceneViewport';
import { Sidebar } from './components/Sidebar';
import { createSceneStore } from './state/sceneState';
import type { SceneController } from './state/types';
export function App() {
  const [store] = useState(createSceneStore);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [controller, setController] = useState<SceneController | null>(null);
  const [error, setError] = useState('');
  const showError = useCallback((reason: unknown) => {
    const detail =
      reason instanceof Error ? reason.stack || reason.message : String(reason);
    setError(detail);
    console.error(reason);
  }, []);
  useEffect(() => {
    const onError = (event: ErrorEvent) =>
      showError(event.error || event.message);
    const onRejection = (event: PromiseRejectionEvent) =>
      showError(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [showError]);
  return (
    <>
      <SceneViewport
        store={store}
        onReady={setController}
        onError={showError}
      />
      <Sidebar state={state} controller={controller}>
        <button
          type="button"
          id="exit-figure-view"
          aria-label="Figurensicht beenden"
          style={{ display: state.figureViewId === null ? 'none' : 'block' }}
          onClick={() => controller?.exitFigureView()}
        >
          Figurensicht beenden
        </button>
      </Sidebar>
      <div
        id="boot-error"
        role="alert"
        aria-live="assertive"
        style={{ display: error ? 'block' : 'none' }}
      >
        {error}
      </div>
    </>
  );
}
