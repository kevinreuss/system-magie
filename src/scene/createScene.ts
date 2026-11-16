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
  controls.enablePan = false;
  controls.minDistance = 0.8;
  controls.maxDistance = 1.85;
  // Polarwinkel werden von oben gemessen: 15–50° über der Horizontalen.
  // Zusammen mit dem festen Abstand bleibt die Kamera unter der Decke
  // und mit Abstand innerhalb der Wände, auch beim Drehen um den Tisch.
  controls.minPolarAngle = THREE.MathUtils.degToRad(40);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(75);
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
  const labels = new Map<number, HTMLDivElement>();
  const labelLayer = document.createElement('div');
  labelLayer.className = 'figure-label-layer';
  wrap.appendChild(labelLayer);
  const projectedLabel = new THREE.Vector3();
  const figureBounds = new THREE.Box3();
  function updateAnnotations() {
    for (const [id, root] of groups) {
      const mesh = root.userData.mesh as FigureMesh;
      mesh.updateWorldMatrix(true, false);
      // Dieselbe transformierte Geometrie-Bounding-Box wie bei der Brettbegrenzung.
      figureBounds.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
      const label = labels.get(id)!;
      projectedLabel.set(root.position.x, figureBounds.max.y + 0.025, root.position.z).project(camera);
      const visible = figureView.activeId !== id && projectedLabel.z > -1 && projectedLabel.z < 1;
      label.hidden = !visible;
      if (visible) {
        label.style.transform = `translate(-50%, -100%) translate(${(projectedLabel.x + 1) * renderer.domElement.clientWidth / 2}px, ${(1 - projectedLabel.y) * renderer.domElement.clientHeight / 2}px)`;
      }
      label.classList.toggle('is-selected', selectedFigureId === id);

    }
  }
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
  function setSelectedFigureId(id: number | null) {
    selectedFigureId = id;
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
    const label = document.createElement('div');
    label.className = 'figure-label';
    label.textContent = `${figureTypes[type].name} ${id}`;
    labelLayer.appendChild(label);
    labels.set(id, label);
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
    labels.get(id)?.remove();
    labels.delete(id);
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
  setSelectedFigureId(null);
  let frame = 0;
  function animate() {
    frame = requestAnimationFrame(animate);
    if (figureView.activeId !== null) figureView.update();
    else controls.update();
    camera.updateMatrixWorld();
    updateAnnotations();
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
      p.name = name;
      labels.get(id)!.textContent = name.trim() || `Figur ${id}`;
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
      labels.clear();
      labelLayer.remove();
      library.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
