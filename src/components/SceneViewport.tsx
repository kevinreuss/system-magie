import { useEffect, useRef } from 'react';
import { createScene } from '../scene/createScene';
import type { SceneStore } from '../state/sceneState';
import type { SceneController } from '../state/types';
export function SceneViewport({
  store,
  onReady,
  onError,
}: {
  store: SceneStore;
  onReady: (controller: SceneController | null) => void;
  onError: (error: unknown) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let controller: SceneController | undefined;
    try {
      controller = createScene(container.current!, store, onError);
      onReady(controller);
    } catch (error) {
      onError(error);
    }
    return () => {
      controller?.dispose();
      onReady(null);
    };
  }, [store, onReady, onError]);
  return <div id="canvas-wrap" ref={container} />;
}
