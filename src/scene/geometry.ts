import * as THREE from 'three';
export function buildQuadGeometry(corners: number[][]) {
  const [v0, v1, v2, v3] = corners;
  const positions = new Float32Array([
    ...v0,
    ...v1,
    ...v2,
    ...v0,
    ...v2,
    ...v3,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
export function setQuadUVs(
  geometry: THREE.BufferGeometry,
  uMin: number,
  uMax: number,
  vMin: number,
  vMax: number,
) {
  const uvs = new Float32Array([
    uMin,
    vMin,
    uMax,
    vMin,
    uMax,
    vMax,
    uMin,
    vMin,
    uMax,
    vMax,
    uMin,
    vMax,
  ]);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.attributes.uv.needsUpdate = true;
}
