import * as THREE from 'three';
import { LIGHT_VARIANTS } from '../figures/lightVariants';
import type { createFigureLibrary } from '../figures';
import { figureScaleForSize } from '../figures/size';

/** Temporary side-by-side study; separate from draggable scene figures. */
export function createLightShowcase(
  scene: THREE.Scene,
  library: ReturnType<typeof createFigureLibrary>,
  boardTop: number,
  labelLayer: HTMLDivElement,
) {
  const root = new THREE.Group();
  root.name = 'Fünf Leuchtstudien';
  scene.add(root);
  const examples = LIGHT_VARIANTS.map((variant, index) => {
    const mesh = library.createLightVariant(variant);
    mesh.scale.setScalar(figureScaleForSize(1.25));
    mesh.position.set((index - 2) * 0.23, boardTop, 0);
    mesh.raycast = () => {};
    root.add(mesh);
    const label = document.createElement('div');
    label.className = 'figure-label light-study-label';
    const title = document.createElement('strong');
    title.textContent = `${index + 1} · ${variant.name}`;
    const subtitle = document.createElement('span');
    subtitle.textContent = variant.description;
    label.append(title, subtitle);
    labelLayer.append(label);
    return { mesh, label };
  });
  const heading = document.createElement('div');
  heading.className = 'light-study-heading';
  heading.textContent = 'Leuchtfigur · 5 Varianten';
  labelLayer.append(heading);
  const position = new THREE.Vector3();
  const nextPosition = new THREE.Vector3();
  return {
    update(camera: THREE.Camera, width: number, height: number) {
      for (const { mesh, label } of examples) {
        position.set(mesh.position.x, boardTop - 0.025, mesh.position.z + 0.065).project(camera);
        nextPosition.set(mesh.position.x + 0.23, boardTop - 0.025, mesh.position.z + 0.065).project(camera);
        const labelWidth = Math.min(190, Math.abs(nextPosition.x - position.x) * width / 2 - 10);
        label.style.width = `${Math.max(90, labelWidth)}px`;
        label.classList.toggle('is-compact', labelWidth < 120);
        label.hidden = position.z < -1 || position.z > 1;
        label.style.transform = `translate(-50%, 0) translate(${(position.x + 1) * width / 2}px, ${(1 - position.y) * height / 2}px)`;
      }
    },
    dispose() {
      for (const { mesh, label } of examples) {
        library.disposeMesh(mesh);
        label.remove();
      }
      heading.remove();
      scene.remove(root);
    },
  };
}
