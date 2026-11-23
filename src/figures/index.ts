import * as THREE from 'three';
import { animalModels, animalTypes, createAnimalLibrary, isAnimalType, tintAnimal, type AnimalType } from './animals';
import { createHumanLibrary } from './human';
import { createLightFigureLibrary, tintLightFigure } from './light';
import { FIGURE_WOOD_COLOR } from './colors';
import type { FigureMesh } from './types';
import type { LightVariant } from './lightVariants';
type Libraries = {
  animals: ReturnType<typeof createAnimalLibrary>;
  human: ReturnType<typeof createHumanLibrary>;
  humanV49: ReturnType<typeof createHumanLibrary>;
  light: ReturnType<typeof createLightFigureLibrary>;
};
function tintHumanFigure(mesh: FigureMesh, hex: number | null) {
  mesh.material.color.setHex(hex ?? FIGURE_WOOD_COLOR);
  if (mesh.material instanceof THREE.MeshStandardMaterial)
    mesh.material.emissive.copy(mesh.material.color);
  for (const child of mesh.children as FigureMesh[]) {
    if (child.userData.isContrastMark)
      child.material.color.setHex(0x000000);
  }
}

const animalFigureTypes = Object.fromEntries(animalTypes.map((type) => [type, {
  name: animalModels[type].name,
  defaultColorName: 'Originalfarben',
  create: (libraries: Libraries) => libraries.animals.create(type),
  tint: tintAnimal,
}])) as Record<AnimalType, {
  name: string;
  defaultColorName: string;
  create: (libraries: Libraries) => FigureMesh;
  tint: typeof tintAnimal;
}>;
export const figureTypes = {
  ...animalFigureTypes,
  human: {
    name: 'Mensch',
    defaultColorName: 'Naturholz (Standard)',
    create: (libraries: Libraries) => libraries.human.create(),
    tint: tintHumanFigure,
  },
  humanV49: {
    name: 'Mensch geschwungen',
    defaultColorName: 'Naturholz (Standard)',
    create: (libraries: Libraries) => libraries.humanV49.create(),
    tint: tintHumanFigure,
  },
  light: {
    name: 'Leuchtfigur',
    defaultColorName: 'Originallicht (Standard)',
    create: (libraries: Libraries) =>
      libraries.light.createLightFigure(libraries.human.height),
    tint: tintLightFigure,
  },
};
export type FigureType = keyof typeof figureTypes;
export function createFigureLibrary(renderer: THREE.WebGLRenderer) {
  const human = createHumanLibrary(renderer);
  const libraries = {
    animals: createAnimalLibrary(human.height),
    human,
    humanV49: createHumanLibrary(renderer, 'humanV49'),
    light: createLightFigureLibrary(),
  };
  return {
    eye: libraries.human.eye,
    load: (type: FigureType) => isAnimalType(type) ? libraries.animals.load(type) : Promise.resolve(),
    createLightVariant: (variant: LightVariant) =>
      libraries.light.createLightFigure(libraries.human.height, variant),
    create: (type: FigureType) => figureTypes[type].create(libraries),
    tint: (mesh: FigureMesh, type: FigureType, hex: number | null) =>
      figureTypes[type].tint(mesh, hex),
    disposeMesh(mesh: FigureMesh) {
      mesh.userData.disposeLightEffects?.();
      mesh.traverse((object) => {
        if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;
        if (
          !libraries.human.sharedGeometries.has(object.geometry) &&
          !libraries.humanV49.sharedGeometries.has(object.geometry)
        )
          object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
    },
    dispose() {
      libraries.human.dispose();
      libraries.humanV49.dispose();
      libraries.light.dispose();
      libraries.animals.dispose();
    },
  };
}
