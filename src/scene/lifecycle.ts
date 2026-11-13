import * as THREE from 'three';
export function listenWithSignal(signal: AbortSignal) {
  return <K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options: AddEventListenerOptions = {},
  ) => {
    target.addEventListener(type, listener as EventListener, {
      ...options,
      signal,
    });
  };
}
// Dispose shared resources once, after all scene users have been removed.
export function disposeScene(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      const list = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of list) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    }
    if (object instanceof THREE.Light && 'shadow' in object) {
      (object as THREE.DirectionalLight).shadow?.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  root.clear();
}
