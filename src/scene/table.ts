import * as THREE from 'three';
import { TABLE_TEXTURES } from '../assets/textures/table';
import { buildQuadGeometry, setQuadUVs } from './geometry';
import {
  S,
  B_BOARD_LOCAL,
  TOP_LOCAL,
  localTableYToWorld,
} from './tableDimensions';
export function createTable(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  signal: AbortSignal,
) {
  // V88 zeichnet die Holzfotos ohne zusätzliche Lichtfärbung.
  // Feste UVs und GPU-Perspektivkorrektur halten die Maserung beim Zoomen stabil.
  const tableTextureLoader = new THREE.TextureLoader();
  const tableAnisotropy = renderer.capabilities.getMaxAnisotropy();
  function tableMaterial(
    color: THREE.ColorRepresentation,
    textureKey?: string,
  ) {
    const material = new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    if (textureKey) {
      const source = TABLE_TEXTURES[textureKey];
      if (!source)
        throw new Error(`Tischtextur fehlt: ${textureKey} (table-textures.js)`);
      tableTextureLoader.load(
        source,
        (texture) => {
          if (signal.aborted) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.magFilter = THREE.LinearFilter;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.generateMipmaps = true;
          texture.anisotropy = tableAnisotropy;
          material.map = texture;
          material.color.setHex(0xffffff);
          material.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.error(
            `Tischtextur konnte nicht geladen werden: ${textureKey}`,
            error,
          );
        },
      );
    }
    return material;
  }
  const tableTop = tableMaterial('#a97749', 'top');
  const tableSide = tableMaterial('#754b2c', 'tableSide');
  const tableLeg = tableMaterial('#79502f', 'leg');
  const boardTop = tableMaterial('#d8bd8d', 'board');
  const boardEdge = tableMaterial('#b29568', 'edgeStrip');
  const legTop = tableMaterial('#91633d');
  const underside = tableMaterial('#62452d');
  const boardBaseTop = tableMaterial('#b49767');
  const boardBaseFront = tableMaterial('#9e7c51');
  const boardBaseSide = tableMaterial('#a98758');
  const tableGroup = new THREE.Group();
  scene.add(tableGroup);
  function addBox(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    z1: number,
    z2: number,
    materials: THREE.Material[],
  ) {
    // Gleiche Eckpunkt- und Bildausrichtung wie die Canvas-Flächen der V88.
    // Jede Oberfläche existiert genau einmal; keine überlagerte Brett-Textur.
    const faces = [
      [
        [x1, y2, z1],
        [x2, y2, z1],
        [x2, y2, z2],
        [x1, y2, z2],
      ],
      [
        [x1, y1, z1],
        [x2, y1, z1],
        [x2, y2, z1],
        [x1, y2, z1],
      ],
      [
        [x2, y1, z1],
        [x2, y1, z2],
        [x2, y2, z2],
        [x2, y2, z1],
      ],
      [
        [x1, y1, z2],
        [x2, y1, z2],
        [x2, y2, z2],
        [x1, y2, z2],
      ],
      [
        [x1, y1, z1],
        [x1, y1, z2],
        [x1, y2, z2],
        [x1, y2, z1],
      ],
      [
        [x1, y1, z1],
        [x2, y1, z1],
        [x2, y1, z2],
        [x1, y1, z2],
      ],
    ];
    faces.forEach((corners, i) => {
      const geometry = buildQuadGeometry(corners);
      // Canvas-Bildursprung oben links, Three-Texturursprung unten links.
      setQuadUVs(geometry, 0, 1, 1, 0);
      const mesh = new THREE.Mesh(geometry, materials[i]);
      mesh.castShadow = true;
      tableGroup.add(mesh);
    });
  }
  function lw(py: number) {
    return py * S;
  }
  const leg = 0.24,
    inset = 1.68;
  const yLeg0 = localTableYToWorld(-1.48);
  const yLeg1 = localTableYToWorld(0.16);
  for (const xc of [-inset, inset]) {
    for (const zc of [-inset, inset]) {
      const lx1 = lw(xc - leg / 2),
        lx2 = lw(xc + leg / 2);
      const lz1 = lw(zc - leg / 2),
        lz2 = lw(zc + leg / 2);
      addBox(lx1, lx2, yLeg0, yLeg1, lz1, lz2, [
        legTop,
        tableLeg,
        tableLeg,
        tableLeg,
        tableLeg,
        underside,
      ]);
    }
  }
  const ttY0 = localTableYToWorld(0.19);
  const ttY1 = localTableYToWorld(0.52);
  const tw = lw(2);
  addBox(-tw, tw, ttY0, ttY1, -tw, tw, [
    tableTop,
    tableSide,
    tableSide,
    tableSide,
    tableSide,
    underside,
  ]);
  const b = B_BOARD_LOCAL;
  const bottom = 0.535,
    top = TOP_LOCAL;
  const bb0 = localTableYToWorld(0.52);
  const bb1 = localTableYToWorld(bottom);
  const bw = lw(b);
  addBox(-bw, bw, bb0, bb1, -bw, bw, [
    boardBaseTop,
    boardBaseFront,
    boardBaseSide,
    boardBaseFront,
    boardBaseSide,
    underside,
  ]);
  const be0 = localTableYToWorld(bottom);
  const be1 = localTableYToWorld(top);
  addBox(-bw, bw, be0, be1, -bw, bw, [
    boardTop,
    boardEdge,
    boardEdge,
    boardEdge,
    boardEdge,
    underside,
  ]);
  return tableGroup;
}
