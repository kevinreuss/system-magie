import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { defaultRoom } from '../rooms';
import { createTable } from './table';
import { createFigureLibrary, figureTypes, type FigureType } from '../figures';
import { createPreviewCache } from '../figures/previews';
import { figureScaleForSize } from '../figures/size';
import type { FigureMesh } from '../figures/types';
import type { FigureData, SceneController } from '../state/types';
import type { SceneStore } from '../state/sceneState';
import { createFigureView } from './figureView';
import { setupInteractions } from './interactions';
import { disposeScene, listenWithSignal } from './lifecycle';
export function createScene(
  wrap: HTMLDivElement,
  store: SceneStore,
  onError: (error: unknown) => void,
): SceneController {
  const room = defaultRoom;
  const BOARD_TOP_Y = room.board.top;
  const abort = new AbortController();
  const { signal } = abort;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.05,
    100,
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  wrap.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.fromArray(room.camera.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 0.35;
  controls.maxDistance = Infinity;
  // Start etwas im Raum (näher am target), weniger dominante Außenwand
  camera.position.fromArray(room.camera.position);
  controls.update();
  const cozyLightRig = room.setupLighting(scene, renderer);
  void room.build(scene, signal).catch((error) => {
    if (!signal.aborted) onError(error);
  });
  createTable(scene, renderer, signal);
  const library = createFigureLibrary(renderer);
  const getPreview = createPreviewCache(renderer, cozyLightRig, library);
  const figuresRoot = new THREE.Group();
  scene.add(figuresRoot);
  const placements: FigureData[] = [];
  const groups = new Map<number, THREE.Group>();
  let figureId = 0;
  const figureView = createFigureView(camera, controls, library.eye, () => {
    publish();
  });
  function publish() {
    for (const p of placements) {
      const group = groups.get(p.id)!;
      p.position = group.position.toArray();
      p.rotation = group.rotation.y;
    }
    store.publish({
      figures: placements,
      selectedFigureId,
      figureViewId: figureView.activeId,
    });
  }
  /** Auswahl: Sidebar; Drehen durch Ziehen am unteren Figurendrittel. */
  let selectedFigureId: number | null = null;
  function getPlacementById(id: number | null) {
    return placements.find((p) => p.id === id) ?? null;
  }
  function updateFigureMeshHighlights() {
    // Auswahl wird durch den Menürahmen angezeigt, ohne die Holzfarbe zu verändern.
    for (const p of placements) {
      const material = (groups.get(p.id)!.userData.mesh as FigureMesh).material;
      if ('emissive' in material) material.emissive.setHex(0x000000);
    }
  }
  function setSelectedFigureId(id: number | null) {
    selectedFigureId = id;
    updateFigureMeshHighlights();
    publish();
  }
  function addFigure(type: FigureType = 'human') {
    const group = new THREE.Group();
    const mesh = library.create(type);
    const defaultSize = 1;
    const meshScale = figureScaleForSize(defaultSize);
    mesh.scale.setScalar(meshScale);
    mesh.position.y = -mesh.geometry.boundingBox!.min.y * meshScale;
    const defaultColor = null;
    library.tint(mesh, type, defaultColor);
    group.add(mesh);
    group.position.set(0, BOARD_TOP_Y, 0);
    const id = ++figureId;
    group.userData.figureId = id;
    group.userData.mesh = mesh;
    figuresRoot.add(group);
    groups.set(id, group);
    placements.push({
      id,
      type,
      woodColor: defaultColor,
      size: defaultSize,
      name: `${figureTypes[type].name} ${id}`,
      position: group.position.toArray(),
      rotation: 0,
    });
    selectedFigureId = id;
    setSelectedFigureId(id);
    return group;
  }
  function removeFigure(id: number) {
    if (figureView.activeId === id) figureView.exit();
    const group = groups.get(id);
    if (!group) return;
    library.disposeMesh(group.userData.mesh);
    figuresRoot.remove(group);
    groups.delete(id);
    placements.splice(
      placements.findIndex((p) => p.id === id),
      1,
    );
    setSelectedFigureId(selectedFigureId === id ? null : selectedFigureId);
  }
  setupInteractions({
    camera,
    renderer,
    controls,
    figuresRoot,
    boardTop: room.board.top,
    boardHalf: room.board.half,
    figureView,
    setSelectedFigureId,
    onTransform: publish,
    signal,
  });
  listenWithSignal(signal)(window, 'resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  addFigure();
  let frame = 0;
  function animate() {
    frame = requestAnimationFrame(animate);
    if (figureView.activeId !== null) figureView.update();
    else controls.update();
    renderer.render(scene, camera);
  }
  animate();
  return {
    addFigure,
    removeFigure,
    selectFigure: setSelectedFigureId,
    getPreview,
    setColor(id, hex) {
      const p = getPlacementById(id);
      if (!p) return;
      p.woodColor = hex;
      library.tint(groups.get(id)!.userData.mesh, p.type, hex);
      publish();
    },
    setSize(id, size) {
      const p = getPlacementById(id);
      if (!p) return;
      p.size = size;
      const mesh = groups.get(id)!.userData.mesh as FigureMesh;
      const scale = figureScaleForSize(size);
      mesh.scale.setScalar(scale);
      mesh.position.y = -mesh.geometry.boundingBox!.min.y * scale;
      publish();
    },
    setName(id, name) {
      const p = getPlacementById(id);
      if (!p) return;
      p.name = name.trim() || `Figur ${id}`;
      publish();
    },
    enterFigureView(id) {
      const group = groups.get(id);
      if (!group) return;
      setSelectedFigureId(id);
      figureView.enter(group);
    },
    exitFigureView: figureView.exit,
    dispose() {
      if (signal.aborted) return;
      abort.abort();
      cancelAnimationFrame(frame);
      controls.dispose();
      for (const group of groups.values())
        library.disposeMesh(group.userData.mesh);
      figuresRoot.clear();
      groups.clear();
      library.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
