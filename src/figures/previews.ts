import * as THREE from 'three';
import { FIGURE_COLORS } from './colors';
import { FIGURE_SCALE_M } from './size';
import { createFigureLibrary, type FigureType } from './index';
export function createPreviewCache(
  renderer: THREE.WebGLRenderer,
  cozyLightRig: Record<string, THREE.Light>,
  library: ReturnType<typeof createFigureLibrary>,
) {
  function renderPreviews(type: FigureType) {
    const previewRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    previewRenderer.setSize(96, 96);
    previewRenderer.setPixelRatio(1);
    previewRenderer.outputColorSpace = renderer.outputColorSpace;
    previewRenderer.toneMapping = renderer.toneMapping;
    previewRenderer.toneMappingExposure = renderer.toneMappingExposure;
    const previewScene = new THREE.Scene();
    for (const light of Object.values(cozyLightRig)) {
      const copy = light.clone();
      copy.castShadow = false;
      previewScene.add(copy);
    }
    const previewCamera = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
    previewCamera.position.set(0.28, 0.24, 0.64);
    previewCamera.lookAt(0, 0.12, 0);
    const mesh = library.create(type);
    mesh.scale.setScalar(FIGURE_SCALE_M);
    previewScene.add(mesh);
    const previews = new Map();
    for (const color of FIGURE_COLORS) {
      library.tint(mesh, type, color.hex);
      previewRenderer.render(previewScene, previewCamera);
      previews.set(color.hex, previewRenderer.domElement.toDataURL());
    }
    library.disposeMesh(mesh);
    previewRenderer.dispose();
    previewRenderer.forceContextLoss();
    return previews;
  }
  const cache = new Map<FigureType, Map<number | null, string>>();
  return (type: FigureType, hex: number | null) => {
    if (!cache.has(type)) cache.set(type, renderPreviews(type));
    return cache.get(type)!.get(hex)!;
  };
}
