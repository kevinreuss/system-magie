import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { FigureMesh } from './types';

const model = (name: string, heightMeters: number, url: URL) => ({ name, heightMeters, url: url.href });
export const animalModels = {
  dog: model('Hund', 0.8, new URL('../../animals/dog.glb', import.meta.url)),
  cat: model('Katze', 0.35, new URL('../../animals/cat.glb', import.meta.url)),
  rabbit: model('Kaninchen', 0.35, new URL('../../animals/rabbit.glb', import.meta.url)),
  pig: model('Schwein', 0.9, new URL('../../animals/pig.glb', import.meta.url)),
  sheep: model('Schaf', 1.0, new URL('../../animals/sheep.glb', import.meta.url)),
  goat: model('Ziege', 1.0, new URL('../../animals/goat.glb', import.meta.url)),
  hen: model('Huhn', 0.45, new URL('../../animals/hen.glb', import.meta.url)),
  rooster: model('Hahn', 0.6, new URL('../../animals/rooster.glb', import.meta.url)),
  duck: model('Ente', 0.45, new URL('../../animals/duck.glb', import.meta.url)),
  goose: model('Gans', 0.8, new URL('../../animals/goose.glb', import.meta.url)),
};
export type AnimalType = keyof typeof animalModels;
export const animalTypes = Object.keys(animalModels) as AnimalType[];
export function isAnimalType(type: string): type is AnimalType { return Object.hasOwn(animalModels, type); }

function disposeModel(root: THREE.Object3D, includeTextures: boolean) {
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (includeTextures) for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      material.dispose();
    }
  });
  textures.forEach((texture) => { texture.dispose(); });
}

// Mitte der obersten Punkte; mit minZ nur das vordere Ende (beim Schwein ist sonst der Rücken am höchsten).
function topCenter(root: THREE.Object3D, bounds: THREE.Box3, minZ = -Infinity) {
  const threshold = bounds.max.y - (bounds.max.y - bounds.min.y) * 0.2;
  const sum = new THREE.Vector3(), vertex = new THREE.Vector3();
  let count = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      if (vertex.y >= threshold && vertex.z >= minZ) { sum.add(vertex); count++; }
    }
  });
  // Augen liegen etwas tiefer als Ohrspitzen und Scheitel.
  return count ? sum.divideScalar(count).add(new THREE.Vector3(0, -(bounds.max.y - bounds.min.y) * 0.1, 0)) : undefined;
}

// Total height including head/ears, not shoulder height; reference adult = 1.75 m.
export const HUMAN_REFERENCE_HEIGHT_METERS = 1.75;
export function createAnimalLibrary(humanModelHeight: number) {
  const templates = new Map<AnimalType, THREE.Group>();
  const pending = new Map<AnimalType, Promise<void>>();
  let disposed = false;
  async function load(type: AnimalType) {
    if (templates.has(type)) return;
    if (pending.has(type)) return pending.get(type);
    const promise = (async () => {
      const gltf = await new GLTFLoader().loadAsync(animalModels[type].url);
      if (disposed) { disposeModel(gltf.scene, true); return; }
      const template = new THREE.Group();
      gltf.scene.updateMatrixWorld(true);
      let head = gltf.scene.getObjectByName('scull')?.getWorldPosition(new THREE.Vector3());
      // Bake the supplied resting pose into static meshes. Each animal is a tabletop figurine.
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (object instanceof THREE.SkinnedMesh) object.skeleton.update();
        const geometry = object.geometry.clone();
        const positions = geometry.getAttribute('position');
        const vertex = new THREE.Vector3();
        for (let i = 0; i < positions.count; i++) {
          object.getVertexPosition(i, vertex).applyMatrix4(object.matrixWorld);
          positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        geometry.deleteAttribute('skinIndex');
        geometry.deleteAttribute('skinWeight');
        geometry.computeVertexNormals();
        const materials = (Array.isArray(object.material) ? object.material : [object.material]).map((source) => {
          const material = source.clone();
          material.userData.originalColor = material.color?.getHex() ?? 0xffffff;
          return material;
        });
        const mesh = new THREE.Mesh(geometry, Array.isArray(object.material) ? materials : materials[0]);
        mesh.castShadow = mesh.receiveShadow = true;
        template.add(mesh);
      });
      disposeModel(gltf.scene, false);
      const bounds = new THREE.Box3().setFromObject(template);
      const center = bounds.getCenter(new THREE.Vector3());
      const hasHeadBone = !!head;
      // Ohne Kopfknochen: Die obersten Punkte liegen eher vorne und bestimmen die Blickrichtung.
      head ??= topCenter(template, bounds);
      // Orient the head toward local +Z, matching the other figures and figure view.
      const rotation = new THREE.Matrix4().makeRotationY(head && head.z < center.z ? Math.PI : 0);
      template.children.forEach((object) => (object as THREE.Mesh).geometry.applyMatrix4(rotation));
      head?.applyMatrix4(rotation);
      bounds.setFromObject(template);
      // Augen ohne Kopfknochen: oberste Punkte im vorderen Drittel des Körpers.
      if (!hasHeadBone) head = topCenter(template, bounds, bounds.max.z - (bounds.max.z - bounds.min.z) / 3) ?? head;
      const size = bounds.getSize(new THREE.Vector3());
      const targetHeight = humanModelHeight * animalModels[type].heightMeters / HUMAN_REFERENCE_HEIGHT_METERS;
      const factor = targetHeight / size.y;
      bounds.getCenter(center);
      const transform = new THREE.Matrix4().makeScale(factor, factor, factor)
        .multiply(new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
      template.children.forEach((object) => {
        const geometry = (object as THREE.Mesh).geometry;
        geometry.applyMatrix4(transform);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      });
      bounds.setFromObject(template);
      template.userData.bounds = bounds;
      template.userData.eyeLocal = head ? head.applyMatrix4(transform).add(new THREE.Vector3(0, 0, targetHeight * 0.04))
        : new THREE.Vector3(0, bounds.max.y * 0.8, bounds.max.z);
      templates.set(type, template);
    })();
    pending.set(type, promise);
    try { await promise; } finally { pending.delete(type); }
  }
  return {
    load,
    create(type: AnimalType): FigureMesh {
      const template = templates.get(type);
      if (!template) throw new Error(`${animalModels[type].name} ist noch nicht geladen.`);
      const bounds = template.userData.bounds as THREE.Box3;
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      geometry.translate(center.x, center.y, center.z);
      geometry.computeBoundingBox();
      const root = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
      root.raycast = () => {};
      root.userData.figureType = type;
      root.userData.eyeLocal = template.userData.eyeLocal.clone();
      for (const object of template.children) {
        const original = object as THREE.Mesh;
        const mesh = original.clone();
        mesh.geometry = original.geometry.clone();
        mesh.material = Array.isArray(original.material) ? original.material.map((m) => m.clone()) : original.material.clone();
        root.add(mesh);
      }
      return root;
    },
    dispose() {
      disposed = true;
      templates.forEach((template) => disposeModel(template, true));
      templates.clear();
    },
  };
}
export function tintAnimal(mesh: FigureMesh, hex: number | null) {
  mesh.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object === mesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial)
        material.color.setHex(hex ?? material.userData.originalColor ?? 0xffffff);
    }
  });
}
