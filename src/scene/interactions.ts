import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { createFigureView } from './figureView';
import { listenWithSignal } from './lifecycle';
export function setupInteractions({
  scene,
  camera,
  renderer,
  controls,
  figuresRoot,
  boardTop,
  boardHalf,
  figureView,
  getSelectedRoot,
  setSelectedFigureId,
  syncSelectionRingVisual,
  onTransform,
  signal,
}: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  figuresRoot: THREE.Group;
  boardTop: number;
  boardHalf: number;
  figureView: ReturnType<typeof createFigureView>;
  getSelectedRoot: () => THREE.Group | null;
  setSelectedFigureId: (id: number | null) => void;
  syncSelectionRingVisual: () => void;
  onTransform: () => void;
  signal: AbortSignal;
}) {
  const BOARD_TOP_Y = boardTop;
  const BOARD_HALF = boardHalf;
  const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_TOP_Y);
  const listen = listenWithSignal(signal);
  const figureBoardBounds = new THREE.Box3();
  function clampToBoard(x: number, z: number, root: THREE.Object3D) {
    const mesh = root.userData.mesh;
    mesh.updateWorldMatrix(true, false);
    // Weltkoordinaten der gedrehten und skalierten Figur-Bounding-Box.
    // Auswahlring und andere Bedienhilfen gehören nicht zur Grundfläche.
    figureBoardBounds
      .copy(mesh.geometry.boundingBox)
      .applyMatrix4(mesh.matrixWorld);
    const minX = -BOARD_HALF - (figureBoardBounds.min.x - root.position.x);
    const maxX = BOARD_HALF - (figureBoardBounds.max.x - root.position.x);
    const minZ = -BOARD_HALF - (figureBoardBounds.min.z - root.position.z);
    const maxZ = BOARD_HALF - (figureBoardBounds.max.z - root.position.z);
    return {
      x: THREE.MathUtils.clamp(x, minX, maxX),
      z: THREE.MathUtils.clamp(z, minZ, maxZ),
    };
  }
  // --- Picking & Drag ---
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragState: {
    root: THREE.Object3D;
    mode: 'move' | 'rotateRing';
    pointerId: number;
    startClientX?: number;
    startClientY?: number;
    planeOffsetX?: number;
    planeOffsetZ?: number;
    lastAngle: number;
  } | null = null;
  let figureViewLookDrag: {
    pointerId: number;
    lastX: number;
    lastY: number;
  } | null = null;
  /** Kurzer Klick auf Figur = Auswahl; Ziehen = Verschieben; Drehen am Ring-Griff auf der Platte */
  let pendingFigurePick: {
    root: THREE.Object3D;
    pointerId: number;
    startX: number;
    startY: number;
  } | null = null;
  const FIGURE_CLICK_MAX_PX = 8;
  function getFigureRoots() {
    return figuresRoot.children;
  }
  listen(renderer.domElement, 'pointerdown', onPointerDown);
  listen(renderer.domElement, 'pointermove', onPointerMove);
  listen(renderer.domElement, 'pointerup', onPointerUp);
  listen(renderer.domElement, 'pointercancel', onPointerUp);
  function boardPlaneAngleForRoot(
    root: THREE.Object3D,
    ndcFromEvent: THREE.Vector2,
  ) {
    raycaster.setFromCamera(ndcFromEvent, camera);
    const pt = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(boardPlane, pt)) return null;
    const lx = pt.x - root.position.x;
    const lz = pt.z - root.position.z;
    return Math.atan2(lx, lz);
  }
  function beginFigureDrag(
    e: Pick<
      PointerEvent,
      'preventDefault' | 'clientX' | 'clientY' | 'pointerId'
    >,
    root: THREE.Object3D,
  ) {
    if (e.preventDefault) e.preventDefault();
    const fid = root.userData.figureId;
    if (fid != null) setSelectedFigureId(fid);
    const r = updatePointer(e);
    raycaster.setFromCamera(r, camera);
    controls.enabled = false;
    renderer.domElement.setPointerCapture(e.pointerId);
    dragState = {
      root,
      mode: 'move',
      lastAngle: 0,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
    };
    const planeHit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(boardPlane, planeHit)) {
      dragState.planeOffsetX = root.position.x - planeHit.x;
      dragState.planeOffsetZ = root.position.z - planeHit.z;
    } else {
      dragState.planeOffsetX = 0;
      dragState.planeOffsetZ = 0;
    }
  }
  function onPointerDown(e: PointerEvent) {
    if (figureView.activeId !== null) {
      if (e.target !== renderer.domElement) return;
      e.preventDefault();
      figureViewLookDrag = {
        pointerId: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      renderer.domElement.setPointerCapture(e.pointerId);
      return;
    }
    const r = updatePointer(e);
    raycaster.setFromCamera(r, camera);
    const hitObj = raycaster.intersectObjects(scene.children, true)[0]?.object;
    if (hitObj?.userData?.isSelectionRingHandle) {
      const p = getSelectedRoot();
      if (!p || figureView.activeId !== null) return;
      e.preventDefault();
      controls.enabled = false;
      renderer.domElement.setPointerCapture(e.pointerId);
      const ang = boardPlaneAngleForRoot(p, r);
      dragState = {
        mode: 'rotateRing',
        root: p,
        pointerId: e.pointerId,
        lastAngle: ang != null ? ang : p.rotation.y,
      };
      return;
    }
    const roots = getFigureRoots();
    const hits = raycaster.intersectObjects(roots, true);
    if (!hits.length) {
      if (e.button === 0) setSelectedFigureId(null);
      return;
    }
    let root = hits[0].object;
    while (root.parent && root.parent !== figuresRoot) root = root.parent;
    e.preventDefault();
    controls.enabled = false;
    renderer.domElement.setPointerCapture(e.pointerId);
    pendingFigurePick = {
      root,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
    };
  }
  function updatePointer(e: Pick<PointerEvent, 'clientX' | 'clientY'>) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return pointer;
  }
  function onPointerMove(e: PointerEvent) {
    if (
      pendingFigurePick &&
      e.pointerId === pendingFigurePick.pointerId &&
      !dragState
    ) {
      const dx = e.clientX - pendingFigurePick.startX;
      const dy = e.clientY - pendingFigurePick.startY;
      if (Math.hypot(dx, dy) >= FIGURE_CLICK_MAX_PX) {
        const pp = pendingFigurePick;
        pendingFigurePick = null;
        beginFigureDrag(
          {
            preventDefault: () => e.preventDefault(),
            clientX: e.clientX,
            clientY: e.clientY,
            pointerId: pp.pointerId,
          },
          pp.root,
        );
      }
    }
    if (figureViewLookDrag && e.pointerId === figureViewLookDrag.pointerId) {
      const dx = e.clientX - figureViewLookDrag.lastX;
      const dy = e.clientY - figureViewLookDrag.lastY;
      figureViewLookDrag.lastX = e.clientX;
      figureViewLookDrag.lastY = e.clientY;
      figureView.look(dx, dy);
      return;
    }
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const r = updatePointer(e);
    raycaster.setFromCamera(r, camera);
    if (dragState.mode === 'rotateRing') {
      const newAng = boardPlaneAngleForRoot(dragState.root, r);
      if (newAng == null) return;
      let d = newAng - dragState.lastAngle;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      dragState.root.rotation.y += d;
      dragState.lastAngle = newAng;
      syncSelectionRingVisual();
      return;
    }
    if (dragState.mode === 'move') {
      const pt = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(boardPlane, pt)) {
        const x = pt.x + (dragState.planeOffsetX ?? 0);
        const z = pt.z + (dragState.planeOffsetZ ?? 0);
        const c = clampToBoard(x, z, dragState.root);
        dragState.root.position.x = c.x;
        dragState.root.position.z = c.z;
        dragState.root.position.y = BOARD_TOP_Y;
      }
      syncSelectionRingVisual();
    }
  }
  function onPointerUp(e: PointerEvent) {
    if (figureViewLookDrag && e.pointerId === figureViewLookDrag.pointerId) {
      figureViewLookDrag = null;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch (_) {}
      return;
    }
    if (
      pendingFigurePick &&
      e.pointerId === pendingFigurePick.pointerId &&
      !dragState
    ) {
      const pp = pendingFigurePick;
      pendingFigurePick = null;
      const dx = e.clientX - pp.startX;
      const dy = e.clientY - pp.startY;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch (_) {}
      if (Math.hypot(dx, dy) < FIGURE_CLICK_MAX_PX) {
        const fid = pp.root.userData.figureId;
        if (fid != null) setSelectedFigureId(fid);
      }
      controls.enabled = figureView.activeId === null;
      return;
    }
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    dragState = null;
    onTransform();
    controls.enabled = figureView.activeId === null;
    syncSelectionRingVisual();
    try {
      renderer.domElement.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }
  listen(
    renderer.domElement,
    'wheel',
    (ev) => {
      if (figureView.activeId !== null) ev.preventDefault();
    },
    { passive: false },
  );
}
