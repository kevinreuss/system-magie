import * as THREE from 'three';
import type { FigureMesh } from './types';

/**
 * Leuchtfigur nach bild-material/1000001776.png und logo.png:
 * runde Kopfkugel, schmaler Hals, flaschenförmiger Körper aus verdrehten
 * Lichtbändern, heller Fußpunkt und feine Funken.
 * Alle Teile leuchten additiv und teilen sich eine Farbe, damit die
 * Farbwahl die ganze Figur gleichmäßig umfärbt.
 */

const BASE_GLOW = 0xffbe62;

// Vormultiplizierte Mischung: rgb ist das ausgestrahlte Licht, a die Deckkraft.
// Linien (a = 0) leuchten rein additiv; der weiche Schein deckt den Untergrund
// etwas ab, damit er auf hellem Holz nicht zu einer gelben Fläche ausbrennt.
const SCREEN_LIGHT = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  toneMapped: false,
} as const;

// Körperprofil als Anteil der Gesamthöhe: [Höhe, Radius].
const BODY: [number, number][] = [
  [0.0, 0.018],
  [0.02, 0.04],
  [0.06, 0.054],
  [0.12, 0.064],
  [0.2, 0.071],
  [0.28, 0.073],
  [0.35, 0.073],
  [0.41, 0.079],
  [0.47, 0.094],
  [0.53, 0.113],
  [0.59, 0.127],
  [0.645, 0.131],
  [0.695, 0.122],
  [0.74, 0.099],
  [0.775, 0.072],
  [0.8, 0.051],
  [0.825, 0.039],
  [0.85, 0.034],
  [0.875, 0.028],
  [0.9, 0.0],
];
const HEAD_RADIUS = 0.08;
const HEAD_CENTER = 1 - HEAD_RADIUS;

function bodyRadius(h: number) {
  if (h <= 0) return BODY[0][1];
  if (h >= BODY[BODY.length - 1][0]) return 0;
  let i = 0;
  while (BODY[i + 1][0] < h) i++;
  const p0 = BODY[Math.max(0, i - 1)], p1 = BODY[i], p2 = BODY[i + 1];
  const p3 = BODY[Math.min(BODY.length - 1, i + 2)];
  const dt = p2[0] - p1[0];
  const u = (h - p1[0]) / dt, u2 = u * u, u3 = u2 * u;
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0])) * dt;
  const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0])) * dt;
  return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 +
    (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
}

/** Radius der Silhouette als Anteil der Höhe: Körper und Kopfkugel weich verbunden. */
export function lightFigureRadius(h: number) {
  const body = Math.max(0, bodyRadius(h));
  const dy = h - HEAD_CENTER;
  const head = Math.sqrt(Math.max(0, HEAD_RADIUS * HEAD_RADIUS - dy * dy));
  if (h > 0.97) return head; // Kopf oben rein kugelig
  const k = 0.012;
  const m = THREE.MathUtils.clamp(0.5 + (0.5 * (body - head)) / k, 0, 1);
  return head + (body - head) * m + k * m * (1 - m);
}

// Verdrehte Lichtbänder: [Startwinkel, Windungen, Breite (rad), Phase, Einschnürungen, Radiusfaktor, Ende, Anfang].
const RIBBONS: [number, number, number, number, number, number, number, number?][] = [
  [0.0, 1.05, 0.95, 0.0, 1.2, 0.985, 0.975],
  [1.3, -0.9, 0.85, 1.3, 1.5, 0.985, 0.86],
  [2.6, 0.95, 0.9, 2.2, 1.0, 0.985, 0.95],
  [3.9, -1.1, 0.8, 0.7, 1.4, 0.97, 0.85],
  [5.1, 0.8, 0.85, 2.9, 1.1, 0.985, 0.88],
  [4.4, -0.65, 1.1, 0.4, 0.9, 0.62, 0.82],
  // Feine Wirbel in der Kopfkugel.
  [0.8, 2.6, 1.0, 0.5, 3.0, 0.9, 0.995, 0.85],
  [3.6, -2.2, 0.9, 1.7, 2.4, 0.82, 0.99, 0.855],
];

const SHARED_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  uniform float figureHeight;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    vHeight = position.y / figureHeight;
    gl_Position = projectionMatrix * mv;
  }`;

function shellMaterial(uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SHARED_VERTEX,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vHeight;
      uniform vec3 color;
      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(vView)));
        float edge = 1.0 - facing;
        float rim = pow(edge, 5.0);
        float sheen = pow(edge, 1.6);
        // Kopf und Fuß leuchten etwas stärker, wie in der Vorlage.
        float head = smoothstep(0.86, 0.9, vHeight);
        float foot = exp(-vHeight * 16.0);
        float alpha = rim * 1.15 + sheen * (0.08 + head * 0.3) + 0.02
          + head * (0.14 + 0.42 * sheen + 0.12 * smoothstep(0.92, 1.0, vHeight)) + foot * 0.25;
        vec3 tint = mix(color, vec3(1.0, 0.97, 0.9), clamp(rim * 1.4 + foot + head * 0.6, 0.0, 1.0));
        gl_FragColor = vec4(tint * alpha, clamp((alpha - rim * 1.15) * 0.7, 0.0, 0.7));
      }`,
    ...SCREEN_LIGHT,
  });
}

function ribbonMaterial(uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      attribute vec2 ribbon;
      varying vec2 vRibbon;
      ${SHARED_VERTEX.replace('void main() {', 'void main() {\n    vRibbon = ribbon;')}`,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vHeight;
      varying vec2 vRibbon;
      uniform vec3 color;
      uniform float pixelRatio;
      uniform float strength;
      void main() {
        float across = vRibbon.x;
        // Abstand zur Bandkante in Bildschirmpixeln: gleich feine Linien in jeder Größe.
        float pixels = (1.0 - abs(across)) / max(fwidth(across), 1e-5) / pixelRatio;
        float line = exp(-pixels * pixels * 0.3);
        float glow = exp(-pixels * 0.22) * 0.35;
        float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
        float fill = 0.07 + 0.16 * edge * edge;
        float ends = smoothstep(0.0, 0.08, vRibbon.y) * (1.0 - smoothstep(0.82, 1.0, vRibbon.y));
        float light = (line * 0.9 + glow + fill) * ends * strength;
        float cover = (fill + glow * 0.3) * 1.1 * ends * strength;
        vec3 tint = mix(color, vec3(1.0, 0.98, 0.93), clamp(line * 1.3, 0.0, 1.0));
        gl_FragColor = vec4(tint * light, cover);
      }`,
    side: THREE.DoubleSide,
    ...SCREEN_LIGHT,
  });
}

function ribbonGeometry(
  height: number,
  [start, turns, width, phase, pinches, radiusFactor, end, from = 0.004]: (typeof RIBBONS)[number],
) {
  const along = 260, across = 8;
  const positions: number[] = [], coords: number[] = [], index: number[] = [];
  for (let i = 0; i <= along; i++) {
    const u = i / along;
    const h = from + u * (end - from);
    const radius = lightFigureRadius(h) * radiusFactor * height;
    const center = start + 2 * Math.PI * turns * h + 0.28 * Math.sin(2 * Math.PI * (1.3 * h + phase));
    // Das Band dreht sich: an den Einschnürungen wird es zur einzelnen Linie.
    const half = width * (0.12 + 0.88 * Math.abs(Math.sin(Math.PI * pinches * h + phase)));
    for (let j = 0; j <= across; j++) {
      const s = (j / across) * 2 - 1;
      const angle = center + s * half;
      positions.push(radius * Math.cos(angle), h * height, radius * Math.sin(angle));
      coords.push(s, u);
    }
  }
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j, b = a + across + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('ribbon', new THREE.Float32BufferAttribute(coords, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Inneres Licht als Dichtefeld entlang der Silhouette, ohne sichtbare Hülle. */
function createInnerGlow(height: number, color: THREE.Color) {
  const data = new Uint8Array(256 * 4);
  // Rot: Radius der Silhouette. Grün: weich gemittelter Radius für einen Schein ohne Stufen.
  for (let i = 0; i < 256; i++) {
    let sum = 0, weight = 0;
    for (let k = -24; k <= 24; k++) {
      const w = Math.exp(-(k * k) / 200);
      sum += lightFigureRadius(THREE.MathUtils.clamp((i + k) / 255, 0, 1)) * w;
      weight += w;
    }
    const r = lightFigureRadius(i / 255);
    data.set([Math.round(r * 4 * 255), Math.round((sum / weight) * 4 * 255), 0, 255], i * 4);
  }
  const profile = new THREE.DataTexture(data, 256, 1);
  profile.minFilter = profile.magFilter = THREE.LinearFilter;
  profile.needsUpdate = true;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      profile: { value: profile },
      eye: { value: new THREE.Vector3() },
      glowColor: { value: color },
      time: { value: 0 },
    },
    vertexShader: `varying vec3 localPosition;
      void main() { localPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 localPosition;
      uniform sampler2D profile;
      uniform vec3 eye, glowColor;
      uniform mat4 projectionMatrix, modelViewMatrix;
      uniform float time;
      void main() {
        vec3 direction = normalize(localPosition - eye);
        vec3 safeDirection = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), direction)) * max(abs(direction), vec3(0.00001));
        vec3 t0 = (vec3(-0.36, -0.06, -0.36) - eye) / safeDirection;
        vec3 t1 = (vec3(0.36, 1.08, 0.36) - eye) / safeDirection;
        vec3 nearT = min(t0, t1), farT = max(t0, t1);
        float entry = max(0.0, max(nearT.x, max(nearT.y, nearT.z)));
        float exitT = min(farT.x, min(farT.y, farT.z));
        if (exitT <= entry) discard;
        float stepSize = (exitT - entry) / 40.0;
        float density = 0.0, peak = 0.0;
        vec3 lightPosition = localPosition;
        for (int i = 0; i < 40; i++) {
          vec3 p = eye + direction * (entry + (float(i) + 0.5) * stepSize);
          if (p.y < 0.0) continue;
          vec2 radii = texture2D(profile, vec2(clamp(p.y, 0.0, 1.0), 0.5)).rg * 0.25;
          float r = max(0.01, radii.r);
          float soft = max(0.02, radii.g);
          float radial = length(p.xz);
          float ends = smoothstep(-0.03, 0.02, p.y) * (1.0 - smoothstep(0.99, 1.05, p.y));
          float body = exp(-pow(radial / (r * 0.78), 2.0) * 1.6);
          float halo = exp(-pow(radial / (soft * 1.9 + 0.025), 2.0) * 1.6);
          float head = smoothstep(0.86, 0.92, p.y);
          float foot = 1.0 + 2.2 * exp(-p.y * 14.0);
          float mist = 0.82 + 0.18 * sin(p.y * 26.0 + p.x * 30.0 + time * 0.5) * sin(p.z * 28.0 - p.y * 17.0 + time * 0.35);
          float sampleDensity = (body * (0.8 + 1.4 * head) * mist + halo * 0.36) * foot * ends;
          if (sampleDensity > peak) { peak = sampleDensity; lightPosition = p; }
          density += sampleDensity * stepSize * 4.0;
        }
        // Tiefe am leuchtenden Kern prüfen, nicht an der Rückseite der Box.
        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(lightPosition, 1.0);
        gl_FragDepth = (clipPosition.z / clipPosition.w) * 0.5 + 0.5;
        float alpha = 1.0 - exp(-density);
        gl_FragColor = vec4(mix(glowColor, vec3(1.0), alpha * 0.55) * alpha * 0.6, alpha * 0.42);
      }`,
    ...SCREEN_LIGHT,
    side: THREE.BackSide,
  });
  const volume = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.14, 0.72), material);
  volume.geometry.translate(0, 0.51, 0);
  volume.scale.setScalar(height);
  volume.renderOrder = 1;
  const localEye = new THREE.Vector3();
  volume.onBeforeRender = (_renderer, _scene, camera) => {
    camera.getWorldPosition(localEye);
    volume.worldToLocal(localEye);
    material.uniforms.eye.value.copy(localEye);
    material.uniforms.time.value = performance.now() / 1000;
  };
  return { volume, profile };
}

/** Heller Fußpunkt mit weichem Lichtschein auf dem Brett. */
function createGroundLight(height: number, uniforms: Record<string, THREE.IUniform>) {
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 color;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float pool = exp(-r * r * 7.0) * 0.22;
        float hot = exp(-r * r * 260.0) * 1.1;
        float fade = 1.0 - smoothstep(0.8, 1.0, r);
        float alpha = (pool + hot) * fade;
        vec3 tint = mix(color, vec3(1.0, 0.97, 0.9), clamp(hot, 0.0, 1.0));
        gl_FragColor = vec4(tint * alpha, clamp(pool, 0.0, 1.0));
      }`,
    ...SCREEN_LIGHT,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(height * 0.7, height * 0.7), material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = height * 0.003;
  return ground;
}

/** Schwebende Lichtpunkte, einzelne davon als kleine Sterne. */
function createSparkles(height: number, color: THREE.Color) {
  const count = 70;
  const positions: number[] = [], phases: number[] = [], sizes: number[] = [];
  // Feste Zufallsfolge: jede Figur sieht gleich aus.
  const random = (i: number) => THREE.MathUtils.euclideanModulo(Math.sin(i * 127.1 + 37.7) * 43758.5453, 1);
  for (let i = 0; i < count; i++) {
    const h = 0.04 + random(i + 1) * 0.94;
    const angle = random(i + 200) * Math.PI * 2;
    const radius = (lightFigureRadius(h) + 0.01) * (0.7 + random(i + 400) * 1.3) * height;
    positions.push(Math.cos(angle) * radius, h * height, Math.sin(angle) * radius);
    phases.push(random(i + 600) * Math.PI * 2);
    sizes.push(i % 14 === 0 ? 0.11 : 0.012 + random(i + 800) * 0.022);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }, color: { value: color }, pixelHeight: { value: 1000 },
      worldScale: { value: 1 }, height: { value: height },
    },
    vertexShader: `attribute float phase, size; varying float brightness, star;
      uniform float time, pixelHeight, worldScale, height;
      void main(){
        vec3 p = position; p.y += sin(time * 0.45 + phase) * height * 0.012;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(size * height * worldScale * pixelHeight * projectionMatrix[1][1] / (-mv.z * 2.0), 1.5, 120.0);
        brightness = 0.2 + 0.8 * pow(0.5 + 0.5 * sin(time * 0.9 + phase), 4.0);
        star = step(0.1, size);
      }`,
    fragmentShader: `uniform vec3 color; varying float brightness, star;
      void main(){
        vec2 p = (gl_PointCoord - 0.5) * 2.0; float r = length(p);
        float glow = exp(-r * r * 9.0);
        float rays = (exp(-abs(p.x) * 60.0) * exp(-abs(p.y) * 4.5) + exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * 4.5)) * 0.6;
        float alpha = mix(glow, glow * 0.2 + rays, star) * (1.0 - smoothstep(0.7, 1.0, r)) * brightness;
        gl_FragColor = vec4(mix(color, vec3(1.0), 0.55), alpha * 0.8);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const sparkles = new THREE.Points(geometry, material);
  const worldScale = new THREE.Vector3();
  sparkles.onBeforeRender = (renderer) => {
    material.uniforms.time.value = performance.now() / 1000;
    material.uniforms.pixelHeight.value = renderer.domElement.height;
    sparkles.getWorldScale(worldScale);
    material.uniforms.worldScale.value = worldScale.x;
  };
  return sparkles;
}

/** Gedeckte Farbtöne der Farbwahl werden zu klar leuchtendem Licht. */
function glowColorFor(hex: number | null, target: THREE.Color) {
  if (hex == null) return target.setHex(BASE_GLOW);
  const hsl = { h: 0, s: 0, l: 0 };
  target.setHex(hex).getHSL(hsl);
  if (hsl.s < 0.05) return target.setHex(0xfff3e2);
  return target.setHSL(hsl.h, Math.max(hsl.s, 0.8), 0.64);
}

export function createLightFigureLibrary() {
  function createLightFigure(targetHeight: number) {
    const height = targetHeight;
    const silhouette: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 320; i++) {
      const h = i / 320;
      silhouette.push(new THREE.Vector2(lightFigureRadius(h) * height, h * height));
    }
    const geometry = new THREE.LatheGeometry(silhouette, 96);
    geometry.computeBoundingBox();
    // Unsichtbare Hülle nur zum Greifen und für die Randprüfung.
    const root = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }),
    );
    root.userData.figureType = 'light';

    const color = new THREE.Color(BASE_GLOW);
    const pixelRatio = { value: 1 };
    const shared = { color: { value: color }, figureHeight: { value: height }, pixelRatio };
    const add = <T extends THREE.Object3D>(object: T, order = 2) => {
      object.raycast = () => {};
      object.renderOrder = order;
      root.add(object);
      return object;
    };

    const { volume, profile } = createInnerGlow(height, color);
    add(volume, 1);
    add(new THREE.Mesh(geometry.clone(), shellMaterial(shared)));
    const ribbons = ribbonMaterial({ ...shared, strength: { value: 1 } });
    const headSwirls = ribbonMaterial({ ...shared, strength: { value: 0.35 } });
    for (const ribbon of RIBBONS) {
      const inHead = (ribbon[7] ?? 0) > 0.8;
      add(new THREE.Mesh(ribbonGeometry(height, ribbon), inHead ? headSwirls : ribbons));
    }
    const ground = add(createGroundLight(height, shared), 0);
    add(createSparkles(height, color), 3);
    ground.onBeforeRender = (renderer) => {
      pixelRatio.value = renderer.getPixelRatio();
    };

    root.userData.disposeLightEffects = () => profile.dispose();
    root.userData.tintLightEffects = (hex: number | null) => glowColorFor(hex, color);
    return root;
  }
  return { createLightFigure, dispose() {} };
}

export function tintLightFigure(mesh: FigureMesh, hex: number | null) {
  mesh.userData.tintLightEffects?.(hex);
}
