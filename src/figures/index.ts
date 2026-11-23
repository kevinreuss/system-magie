import * as THREE from 'three';
import { createHumanLibrary } from './human';
import { createLightFigureLibrary, tintLightFigure } from './light';
import { FIGURE_WOOD_COLOR } from './colors';
import type { FigureMesh } from './types';
type Libraries = {
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

export const figureTypes = {
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
  const libraries = {
    human: createHumanLibrary(renderer),
    humanV49: createHumanLibrary(renderer, 'humanV49'),
    light: createLightFigureLibrary(),
  };
  return {
    eye: libraries.human.eye,
    create: (type: FigureType) => figureTypes[type].create(libraries),
    tint: (mesh: FigureMesh, type: FigureType, hex: number | null) =>
      figureTypes[type].tint(mesh, hex),
    disposeMesh(mesh: FigureMesh) {
      mesh.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
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
    },
  };
}
