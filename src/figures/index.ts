import * as THREE from 'three';
import { createHumanLibrary } from './human';
import { createLightFigureLibrary, tintLightFigure } from './light';
import { FIGURE_COLORS } from './colors';
import type { FigureMesh } from './types';
type Libraries = {
  human: ReturnType<typeof createHumanLibrary>;
  light: ReturnType<typeof createLightFigureLibrary>;
};
export const figureTypes = {
  human: {
    name: 'Mensch',
    defaultColorName: 'Naturholz (Standard)',
    create: (libraries: Libraries) => libraries.human.create(),
    tint(mesh: FigureMesh, hex: number | null) {
      mesh.material.color.setHex(hex ?? 0xd6aa73);
      const color = FIGURE_COLORS.find((c) => c.hex === hex);
      const contrast = color?.group === 'Dunkel' ? 0xffffff : 0x000000;
      for (const child of mesh.children as FigureMesh[]) {
        if (child.userData.isContrastMark)
          child.material.color.setHex(contrast);
      }
    },
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
        if (!libraries.human.sharedGeometries.has(object.geometry))
          object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
    },
    dispose() {
      libraries.human.dispose();
      libraries.light.dispose();
    },
  };
}
