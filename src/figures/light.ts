import * as THREE from 'three';
import type { FigureMesh } from './types';
export function createLightFigureLibrary() {
  const clamp = (v: number, a: number, b: number) =>
    Math.max(a, Math.min(b, v));
  const profile = [
    [0.0, 0.075],
    [0.025, 0.12],
    [0.07, 0.155],
    [0.13, 0.18],
    [0.2, 0.195],
    [0.27, 0.19],
    [0.34, 0.16],
    [0.39, 0.135],
    [0.43, 0.14],
    [0.48, 0.18],
    [0.54, 0.245],
    [0.6, 0.29],
    [0.66, 0.3],
    [0.71, 0.285],
    [0.755, 0.25],
    [0.795, 0.205],
    [0.825, 0.155],
    [0.85, 0.105],
    [0.875, 0.085],
    // Kopf: schmaler und hochkant oval statt flacher, breiter Kappe
    [0.89, 0.09],
    [0.905, 0.108],
    [0.92, 0.13],
    [0.94, 0.145],
    [0.96, 0.148],
    [0.972, 0.144],
    [0.982, 0.13],
    [0.989, 0.11],
    [0.994, 0.083],
    [0.997, 0.058],
    [0.999, 0.03],
    [1, 0],
  ];
  function radius(t: number) {
    // Der Kopf wird als echte, aufrecht stehende Ovalform berechnet:
    // unten sanft aus dem Hals verbreitert, oben als durchgehend runde Ellipsenkappe.
    if (t >= 0.875) {
      const h = clamp((t - 0.875) / 0.125, 0, 1);
      const join = 0.58,
        base = 0.085,
        widest = 0.15;
      if (h <= join) {
        const u = h / join;
        const smooth = u * u * (3 - 2 * u);
        return base + (widest - base) * smooth;
      }
      const q = clamp((h - join) / (1 - join), 0, 1);
      return Math.max(0.004, widest * Math.sqrt(Math.max(0, 1 - q * q)));
    }
    let i = 0;
    while (i < profile.length - 2 && profile[i + 1][0] < t) i++;
    const [ta, ra] = profile[i],
      [tb, rb] = profile[i + 1],
      u = (t - ta) / (tb - ta);
    const prev = profile[Math.max(0, i - 1)],
      next = profile[Math.min(profile.length - 1, i + 2)];
    const m0 = (rb - prev[1]) / (tb - prev[0]),
      m1 = (next[1] - ra) / (next[0] - ta);
    const u2 = u * u,
      u3 = u2 * u,
      dt = tb - ta;
    return Math.max(
      0.004,
      (2 * u3 - 3 * u2 + 1) * ra +
        (u3 - 2 * u2 + u) * dt * m0 +
        (-2 * u3 + 3 * u2) * rb +
        (u3 - u2) * dt * m1,
    );
  }
  // V41-Profil und Windungen, auf dieselbe Gesamthöhe wie die Holzfigur normiert.
  const sourceHeight = 1.96;
  function heightAt(t: number) {
    return t <= 0.875
      ? t * 1.72
      : 0.875 * 1.72 +
          ((t - 0.875) / 0.125) * 0.4 +
          0.055 * Math.pow((t - 0.875) / 0.125, 5);
  }
  function makeVeilTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i <= 112; i++) {
      const t = 0.012 + (0.976 * i) / 112;
      const y = (1 - heightAt(t) / sourceHeight) * 512;
      const r = ((radius(t) * 0.82) / 0.65) * 256;
      const fade = Math.max(0, Math.min(1, t / 0.075, (1 - t) / 0.075));
      for (const [width, height, opacity] of [
        [0.94, 0.021, 0.12],
        [1.9, 0.046, 0.028],
      ]) {
        ctx.save();
        ctx.translate(128, y);
        ctx.scale(r * width, 512 * height);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, `rgba(255,255,255,${opacity * fade})`);
        gradient.addColorStop(
          0.38,
          `rgba(255,255,255,${opacity * fade * 0.78})`,
        );
        gradient.addColorStop(
          0.72,
          `rgba(255,255,255,${opacity * fade * 0.34})`,
        );
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  let veilTexture: THREE.Texture | undefined;
  function createLightFigure(targetHeight: number) {
    const scale = targetHeight / sourceHeight;
    const points = [];
    for (let i = 0; i <= 240; i++) {
      const t = i / 240;
      points.push(
        new THREE.Vector2(radius(t) * 1.018 * scale, heightAt(t) * scale),
      );
    }
    const geometry = new THREE.LatheGeometry(points, 64);
    geometry.computeBoundingBox();
    // Unsichtbare Hülle nur zum Greifen und für die Randprüfung, kein fester Körper.
    const root = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    root.userData.figureType = 'light';
    const starts = [-2.72, -1.93, -0.73, 0.08, 0.92, 2.02, 2.73, 4.47];
    const turns = [1.05, -0.82, 0.63, -1.18, 0.92, -0.7, 0.48, -0.38];
    const waves = [0.18, -0.12, 0.23, 0.14, -0.2, 0.19, -0.11, 0.1];
    function addPart(
      geo: THREE.BufferGeometry,
      material: THREE.MeshBasicMaterial,
      warm: number,
    ) {
      const part = new THREE.Mesh(geo, material);
      part.userData.lightBaseColor = new THREE.Color(warm);
      part.material.color.copy(part.userData.lightBaseColor);
      part.raycast = () => {};
      root.add(part);
      return part;
    }
    for (let n = 0; n < 8; n++) {
      const path = [];
      for (let k = 0; k <= 240; k++) {
        const t = 0.001 + (0.998 * k) / 240;
        const r = radius(t) * 1.018 * scale;
        const angle =
          starts[n] +
          2 * Math.PI * turns[n] * t +
          waves[n] * Math.sin(2 * Math.PI * (1.15 * t + 0.08 * n));
        path.push(
          new THREE.Vector3(
            r * Math.cos(angle),
            heightAt(t) * scale,
            r * Math.sin(angle),
          ),
        );
      }
      const curve = new THREE.CatmullRomCurve3(path);
      for (const [width, opacity, warm] of [
        [0.024, 0.055, 0xffcd97],
        [0.012, 0.12, 0xffdcb2],
        [0.0037, 0.78, 0xffe7cb],
        [0.0014, 0.62, 0xfff6e5],
      ]) {
        addPart(
          new THREE.TubeGeometry(curve, 240, width * scale, 5, false),
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity,
            depthWrite: false,
            toneMapped: false,
          }),
          warm,
        );
      }
    }
    veilTexture ??= makeVeilTexture();
    for (const rotation of [0, Math.PI / 2]) {
      const veil = addPart(
        new THREE.PlaneGeometry(0.65 * scale, targetHeight),
        new THREE.MeshBasicMaterial({
          map: veilTexture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
        0xfff4e5,
      );
      veil.position.y = targetHeight / 2;
      veil.rotation.y = rotation;
    }
    return root;
  }
  return { createLightFigure, dispose: () => veilTexture?.dispose() };
}
export function tintLightFigure(mesh: FigureMesh, hex: number | null) {
  for (const part of mesh.children as FigureMesh[]) {
    if (!part.userData.lightBaseColor) continue;
    part.material.color.copy(part.userData.lightBaseColor);
    if (hex != null) part.material.color.setHex(hex);
  }
}
