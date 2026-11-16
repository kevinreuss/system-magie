import type * as THREE from 'three';
export type FigureMesh = THREE.Mesh<
  THREE.BufferGeometry,
  THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
>;
