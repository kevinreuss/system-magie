import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { FigureMesh } from '../figures/types';
export function createFigureView(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  eye: {
    x: number;
    y: number;
    z: number;
  },
  onChange: () => void,
) {
  const { x: EYE_X, y: EYE_Y, z: EYE_Z } = eye;
  const startCameraPos = camera.position.clone();
  const startCameraQuat = camera.quaternion.clone();
  const startControlsTarget = controls.target.clone();
  /** Figurensicht: Mitte zwischen den Augen, Blick wie Pfeil (+lokal Z); nur umschauen, kein Zoom/Pan */
  let figureViewPlacement: THREE.Group | null = null;
  let figureViewYaw = 0;
  let figureViewPitch = 0;
  const _fvEyeL = new THREE.Vector3();
  const _fvEyeR = new THREE.Vector3();
  const _fvEyeMid = new THREE.Vector3();
  const _fvFwdBase = new THREE.Vector3();
  const _fvFwd = new THREE.Vector3();
  const _fvRight = new THREE.Vector3();
  const _fvUp = new THREE.Vector3(0, 1, 0);
  const _fvQuat = new THREE.Quaternion();
  function exitFigureView() {
    figureViewPlacement = null;
    camera.position.copy(startCameraPos);
    camera.quaternion.copy(startCameraQuat);
    controls.target.copy(startControlsTarget);
    camera.up.set(0, 1, 0);
    controls.enabled = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    onChange();
  }
  function enterFigureView(p: THREE.Group) {
    if (!p?.userData?.mesh) return;
    figureViewPlacement = p;
    figureViewYaw = 0;
    figureViewPitch = 0;
    controls.enabled = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    updateFigureViewCamera();
    onChange();
  }
  function updateFigureViewCamera() {
    if (!figureViewPlacement) return;
    const mesh = figureViewPlacement.userData.mesh as FigureMesh;
    mesh.updateWorldMatrix(true, true);
    _fvEyeL.set(-EYE_X, EYE_Y, EYE_Z).applyMatrix4(mesh.matrixWorld);
    _fvEyeR.set(EYE_X, EYE_Y, EYE_Z).applyMatrix4(mesh.matrixWorld);
    _fvEyeMid.copy(_fvEyeL).add(_fvEyeR).multiplyScalar(0.5);
    mesh.getWorldQuaternion(_fvQuat);
    _fvFwdBase.set(0, 0, 1).applyQuaternion(_fvQuat).normalize();
    const bx = _fvFwdBase.x;
    const by = _fvFwdBase.y;
    const bz = _fvFwdBase.z;
    const cosY = Math.cos(figureViewYaw);
    const sinY = Math.sin(figureViewYaw);
    _fvFwd.set(bx * cosY + bz * sinY, by, -bx * sinY + bz * cosY).normalize();
    _fvRight.crossVectors(_fvUp, _fvFwd);
    if (_fvRight.lengthSq() < 1e-10) _fvRight.set(1, 0, 0);
    else _fvRight.normalize();
    _fvFwd.applyAxisAngle(_fvRight, figureViewPitch).normalize();
    camera.position.copy(_fvEyeMid);
    camera.up.copy(_fvUp);
    camera.lookAt(
      _fvEyeMid.x + _fvFwd.x,
      _fvEyeMid.y + _fvFwd.y,
      _fvEyeMid.z + _fvFwd.z,
    );
  }
  return {
    get activeId(): number | null {
      return figureViewPlacement?.userData.figureId ?? null;
    },
    enter: enterFigureView,
    exit: exitFigureView,
    update: updateFigureViewCamera,
    look(dx: number, dy: number) {
      figureViewYaw -= dx * 0.005;
      figureViewPitch = THREE.MathUtils.clamp(
        figureViewPitch + dy * 0.005,
        -Math.PI / 2 + 0.12,
        Math.PI / 2 - 0.12,
      );
      updateFigureViewCamera();
    },
  };
}
