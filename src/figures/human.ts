import * as THREE from 'three';
import type { FigureMesh } from './types';
export function createHumanLibrary(renderer: THREE.WebGLRenderer) {
  // --- Menschenfigur V36: Lathe wie in System_Magie_Menschenfigur_Kontur_V36_anschauen.html ---
  const V36_CONTROL = [
    [0.3, 0.0],
    [0.307, 0.01],
    [0.316, 0.03],
    [0.323, 0.06],
    [0.328, 0.1],
    [0.337, 0.18],
    [0.356, 0.3],
    [0.378, 0.43],
    [0.39, 0.56],
    [0.4, 0.68],
    [0.407, 0.79],
    [0.41, 0.88],
    [0.409, 0.97],
    [0.398, 1.055],
    [0.375, 1.14],
    [0.348, 1.225],
    [0.319, 1.31],
    [0.29, 1.39],
    [0.261, 1.465],
    [0.231, 1.525],
    [0.205, 1.575],
    [0.184, 1.615],
    [0.175, 1.655],
    [0.1814, 1.6916],
    [0.2019, 1.7282],
    [0.2345, 1.7699],
    [0.2655, 1.8222],
    [0.2938, 1.8797],
    [0.3049, 1.9371],
    [0.305, 1.9999],
    [0.2917, 2.0625],
    [0.267, 2.12],
    [0.2348, 2.1723],
    [0.192, 2.2141],
    [0.1365, 2.2433],
    [0.0693, 2.258],
    [0.001, 2.2601],
  ];
  function buildCatmullRomProfile(control: number[][]) {
    const profile = [];
    for (let i = 0; i < control.length - 1; i++) {
      const p0 = control[Math.max(0, i - 1)],
        p1 = control[i],
        p2 = control[i + 1],
        p3 = control[Math.min(control.length - 1, i + 2)];
      for (let k = 0; k < 8; k++) {
        const t = k / 8,
          t2 = t * t,
          t3 = t2 * t;
        const r =
          0.5 *
          (2 * p1[0] +
            (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y =
          0.5 *
          (2 * p1[1] +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        profile.push([Math.max(0.001, r), y]);
      }
    }
    profile.push(control[control.length - 1]);
    return profile;
  }
  const V36_PROFILE = buildCatmullRomProfile(V36_CONTROL);
  const V36_Y_MAX = Math.max(...V36_PROFILE.map((p) => p[1]));
  function buildHumanV36Geometry() {
    const control = V36_CONTROL;
    function meshFromVerts(vertices: number[], indices: number[]) {
      const normals = new Array(vertices.length).fill(0);
      for (let i = 0; i < indices.length; i += 3) {
        let a = indices[i] * 3,
          b = indices[i + 1] * 3,
          c = indices[i + 2] * 3;
        const ab = [
          vertices[b] - vertices[a],
          vertices[b + 1] - vertices[a + 1],
          vertices[b + 2] - vertices[a + 2],
        ];
        const ac = [
          vertices[c] - vertices[a],
          vertices[c + 1] - vertices[a + 1],
          vertices[c + 2] - vertices[a + 2],
        ];
        const n = [
          ab[1] * ac[2] - ab[2] * ac[1],
          ab[2] * ac[0] - ab[0] * ac[2],
          ab[0] * ac[1] - ab[1] * ac[0],
        ];
        for (const j of [a, b, c])
          for (let k = 0; k < 3; k++) normals[j + k] += n[k];
      }
      for (let i = 0; i < normals.length; i += 3) {
        const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
        normals[i] /= l;
        normals[i + 1] /= l;
        normals[i + 2] /= l;
      }
      return { vertices, normals, indices };
    }
    const profile = buildCatmullRomProfile(control);
    const v = [];
    const uv = [];
    const ix = [];
    const seg = 96;
    for (let j = 0; j < profile.length; j++) {
      for (let i = 0; i <= seg; i++) {
        const a = (2 * Math.PI * i) / seg;
        v.push(
          profile[j][0] * Math.cos(a),
          profile[j][1],
          profile[j][0] * Math.sin(a),
        );
        uv.push(i / seg, profile[j][1] / V36_Y_MAX);
      }
    }
    for (let j = 0; j < profile.length - 1; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i,
          b = a + seg + 1;
        ix.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const side = meshFromVerts(v, ix);
    const cv = [0, profile[0][1], 0];
    const ci = [];
    for (let i = 0; i <= seg; i++) {
      const a = (2 * Math.PI * i) / seg;
      cv.push(
        profile[0][0] * Math.cos(a),
        profile[0][1],
        profile[0][0] * Math.sin(a),
      );
    }
    for (let i = 0; i < seg; i++) ci.push(0, i + 1, i + 2);
    const cap = meshFromVerts(cv, ci);
    uv.push(0.5, 0.5);
    for (let i = 0; i <= seg; i++) {
      const a = (2 * Math.PI * i) / seg;
      uv.push(0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a));
    }
    const pos = [...side.vertices, ...cap.vertices];
    const norm = [...side.normals, ...cap.normals];
    const idx = [
      ...side.indices,
      ...cap.indices.map((n) => n + side.vertices.length / 3),
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(pos), 3),
    );
    geo.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(new Float32Array(norm), 3),
    );
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
  }
  const figGeo = buildHumanV36Geometry();
  figGeo.computeBoundingBox();
  const figFootY = figGeo.boundingBox!.min.y;
  const FIG_BB_MAX_Y = figGeo.boundingBox!.max.y;
  // Nahtlose, längs verlaufende Fasern mit unregelmäßigen Jahresringen.
  function createFigureWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      const v = y / canvas.height;
      for (let x = 0; x < canvas.width; x++) {
        const u = (x / canvas.width) * Math.PI * 2;
        const warp =
          0.7 * Math.sin(v * 7 + Math.sin(u * 3)) +
          0.28 * Math.sin(v * 17 + Math.cos(u * 2));
        const grain = Math.sin(u * 22 + warp * 3);
        const fine = Math.sin(u * 91 + warp * 8);
        const pores = Math.sin(u * 173 + Math.sin(v * 53) * 0.6);
        const shade = Math.round(
          218 +
            grain * 17 +
            fine * 7 +
            pores * 3 -
            27 * Math.pow(Math.max(0, grain), 12),
        );
        const i = (y * canvas.width + x) * 4;
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade;
        pixels.data[i + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const figureWoodTexture = createFigureWoodTexture();
  const figMat = new THREE.MeshStandardMaterial({
    color: 0xd6aa73,
    map: figureWoodTexture,
    bumpMap: figureWoodTexture,
    bumpScale: 0.008,
    roughness: 0.72,
    metalness: 0,
  });
  // Augen: Im Original per Shader-Kreise in lokalem Raum. Three r169 mappt MeshStandard auf
  // Physical-Shader – onBeforeCompile-Hooks trafen zuverlässig nicht die finale Farbe.
  // Zwei kleine Kugeln an denselben Koordinaten wie die Original-Augenzentren (sichtbare Hemisphäre z>0.245).
  const eyeBallRadius = 0.027;
  const eyeGeo = new THREE.SphereGeometry(eyeBallRadius, 16, 12);
  const eyeMatTemplate = new THREE.MeshBasicMaterial({ color: 0x0c0a09 });
  const EYE_Y = 1.925;
  const EYE_X = 0.092;
  const EYE_R_PROFILE = 0.3;
  const EYE_Z = Math.sqrt(
    Math.max(0, EYE_R_PROFILE * EYE_R_PROFILE - EYE_X * EYE_X),
  );
  function attachFigurineEyes(parentMesh: FigureMesh) {
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMatTemplate.clone());
      eye.position.set(sign * EYE_X, EYE_Y, EYE_Z);
      eye.renderOrder = 2;
      eye.userData.isContrastMark = true;
      eye.material.toneMapped = false;
      parentMesh.add(eye);
    }
  }
  // Aufgedruckte Kopfmarkierung auf der gewölbten Oberfläche, Spitze nach lokal +Z.
  const FACING_DIR = new THREE.Vector3(0, 0, 1);
  const headMarkCanvas = document.createElement('canvas');
  headMarkCanvas.width = headMarkCanvas.height = 256;
  const headMarkContext = headMarkCanvas.getContext('2d')!;
  headMarkContext.fillStyle = '#ffffff';
  headMarkContext.beginPath();
  headMarkContext.moveTo(128, 32);
  headMarkContext.lineTo(193, 112);
  headMarkContext.lineTo(150, 112);
  headMarkContext.lineTo(150, 215);
  headMarkContext.lineTo(106, 215);
  headMarkContext.lineTo(106, 112);
  headMarkContext.lineTo(63, 112);
  headMarkContext.closePath();
  headMarkContext.fill();
  const headMarkTexture = new THREE.CanvasTexture(headMarkCanvas);
  headMarkTexture.colorSpace = THREE.SRGBColorSpace;
  headMarkTexture.anisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy(),
  );
  function attachHeadMark(parentMesh: FigureMesh) {
    // Identische Kopfkontur verhindert eine schwebende, flache Pfeilfläche.
    const geometry = figGeo.clone();
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const indices = [];
    for (let i = 0; i < positions.count; i++) {
      uv.setXY(
        i,
        0.5 + positions.getX(i) / 0.44,
        0.5 + positions.getZ(i) / 0.44,
      );
    }
    for (let i = 0; i < geometry.index!.count; i += 3) {
      const triangle = [
        geometry.index!.getX(i),
        geometry.index!.getX(i + 1),
        geometry.index!.getX(i + 2),
      ];
      if (triangle.every((v) => positions.getY(v) > 2.16))
        indices.push(...triangle);
    }
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({
      map: headMarkTexture,
      color: 0x000000,
      toneMapped: false,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mark = new THREE.Mesh(geometry, material);
    mark.renderOrder = 2;
    mark.userData.isContrastMark = true;
    mark.raycast = () => {};
    parentMesh.add(mark);
    parentMesh.userData.facingDirLocal = FACING_DIR.clone();
  }
  return {
    height: FIG_BB_MAX_Y - figFootY,
    eye: { x: EYE_X, y: EYE_Y, z: EYE_Z },
    sharedGeometries: new Set([figGeo, eyeGeo]),
    create(): FigureMesh {
      const mesh = new THREE.Mesh(figGeo, figMat.clone());
      mesh.userData.figureType = 'human';
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      attachFigurineEyes(mesh);
      attachHeadMark(mesh);
      return mesh;
    },
    dispose() {
      figGeo.dispose();
      eyeGeo.dispose();
      figMat.dispose();
      eyeMatTemplate.dispose();
      figureWoodTexture.dispose();
      headMarkTexture.dispose();
    },
  };
}
