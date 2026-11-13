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
    ensureSelectionRing();
    syncSelectionRingVisual();
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
  /** Auswahl: Sidebar + gedämpftes Highlight; Drehen nur über Ring-Griff am Brett */
  let selectedFigureId: number | null = null;
  const SELECTION_ACCENT = 0x5a8f88;
  const SELECTION_RING_RADIUS = 0.105; /* Basis bei Größe M */
  /** Leicht über der Brettfläche, damit Raycasts den Griff treffen (nicht zuerst die Platte) */
  const SELECTION_RING_Y = 0.028;
  let selectionRingBuilt: {
    group: THREE.Group;
    handlePivot: THREE.Group;
    handle: THREE.Mesh;
    ring: THREE.Mesh;
  } | null = null;
  function ensureSelectionRing() {
    if (selectionRingBuilt) return selectionRingBuilt;
    const group = new THREE.Group();
    group.name = 'selectionRing';
    const ringThick = 0.0024;
    const ringGeo = new THREE.RingGeometry(
      SELECTION_RING_RADIUS - ringThick,
      SELECTION_RING_RADIUS + ringThick,
      72,
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: SELECTION_ACCENT,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = SELECTION_RING_Y;
    ring.renderOrder = 1;
    ring.raycast = () => {};
    group.add(ring);
    const handleMat = new THREE.MeshBasicMaterial({
      color: SELECTION_ACCENT,
      transparent: true,
      opacity: 0.92,
      depthTest: true,
    });
    /** Pivot um Y: Kegel fest bei +lokal Z (= R nach vorne), rotiert mit Figuren-Blickrichtung */
    const handlePivot = new THREE.Group();
    handlePivot.position.y = SELECTION_RING_Y + 0.004;
    const handle = new THREE.Mesh(
      new THREE.ConeGeometry(0.022, 0.052, 10),
      handleMat,
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.z = SELECTION_RING_RADIUS;
    handle.renderOrder = 2;
    handle.userData.isSelectionRingHandle = true;
    handlePivot.add(handle);
    group.add(handlePivot);
    scene.add(group);
    selectionRingBuilt = { group, handlePivot, handle, ring };
    return selectionRingBuilt;
  }
  function getPlacementById(id: number | null) {
    return placements.find((p) => p.id === id) ?? null;
  }
  function syncSelectionRingVisual() {
    const parts = selectionRingBuilt;
    if (!parts) return;
    const p =
      selectedFigureId != null ? getPlacementById(selectedFigureId) : null;
    if (!p || figureView.activeId !== null) {
      parts.group.visible = false;
      return;
    }
    parts.group.visible = true;
    const root = groups.get(p.id)!;
    const ry = root.rotation.y;
    const sizeMult = p.size;
    const ringR = SELECTION_RING_RADIUS * sizeMult;
    parts.group.position.set(root.position.x, BOARD_TOP_Y, root.position.z);
    parts.ring.scale.set(sizeMult, sizeMult, sizeMult);
    parts.handle.position.z = ringR;
    parts.handlePivot.rotation.y = ry;
  }
  function updateFigureMeshHighlights() {
    // Auswahl wird durch Bodenring und Menürahmen angezeigt, ohne die Holzfarbe zu verändern.
    for (const p of placements) {
      const material = (groups.get(p.id)!.userData.mesh as FigureMesh).material;
      if ('emissive' in material) material.emissive.setHex(0x000000);
    }
  }
  function setSelectedFigureId(id: number | null) {
    selectedFigureId = id;
    ensureSelectionRing();
    updateFigureMeshHighlights();
    syncSelectionRingVisual();
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
    scene,
    camera,
    renderer,
    controls,
    figuresRoot,
    boardTop: room.board.top,
    boardHalf: room.board.half,
    figureView,
    getSelectedRoot: () =>
      selectedFigureId === null ? null : (groups.get(selectedFigureId) ?? null),
    setSelectedFigureId,
    syncSelectionRingVisual,
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
      syncSelectionRingVisual();
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
