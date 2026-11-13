import * as THREE from 'three';
import { WINTER_ROOM_TEXTURES } from '../assets/textures/winter';
import { buildQuadGeometry, setQuadUVs } from '../scene/geometry';
import {
  W_ROOM,
  H_ROOM_HALF,
  BOARD_TOP_Y,
  BOARD_HALF,
} from '../scene/tableDimensions';
export const winterRoom = {
  id: 'winter',
  name: 'Winterraum',
  camera: { position: [0.88, 0.67, 1.91], target: [0, 0.2, 0] },
  board: { top: BOARD_TOP_Y, half: BOARD_HALF },
  setupLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    const cozyLightRig = (() => {
      const ambient = new THREE.AmbientLight(0xffffff, 0);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0);
      const key = new THREE.DirectionalLight(0xffffff, 0);
      const fill = new THREE.DirectionalLight(0xffffff, 0);
      const rim = new THREE.DirectionalLight(0xffffff, 0);
      function setupShadow(light: THREE.DirectionalLight) {
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 2048);
        light.shadow.bias = -0.0002;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 12;
        light.shadow.camera.left = light.shadow.camera.bottom = -4;
        light.shadow.camera.right = light.shadow.camera.top = 4;
      }
      setupShadow(key);
      fill.castShadow = false;
      rim.castShadow = false;
      scene.add(ambient, hemi, key, fill, rim);
      return { ambient, hemi, key, fill, rim };
    })();
    /** Beleuchtung für Tisch und Figuren; die Raumtexturen enthalten bereits ihr Licht. */
    const ROOM_LIGHT = {
      background: 0xd6d1c4,
      exposure: 1.02,
      ambient: { color: 0xf5e0c8, intensity: 0.2 },
      hemi: { sky: 0xf8eee4, ground: 0x4c4036, intensity: 0.5 },
      key: { color: 0xffd6a0, intensity: 0.75, pos: [2.2, 2.7, -1.2] },
      fill: { color: 0xa8c8f0, intensity: 0.38, pos: [-0.8, 1.6, 2.2] },
      rim: { color: 0xffa870, intensity: 0.32, pos: [-2.0, 0.7, -1.6] },
    };
    (function applyRoomLight() {
      const p = ROOM_LIGHT;
      const { ambient, hemi, key, fill, rim } = cozyLightRig;
      scene.background = new THREE.Color(p.background);
      renderer.toneMappingExposure = p.exposure;
      ambient.color.setHex(p.ambient.color);
      ambient.intensity = p.ambient.intensity;
      hemi.color.setHex(p.hemi.sky);
      hemi.groundColor.setHex(p.hemi.ground);
      hemi.intensity = p.hemi.intensity;
      key.color.setHex(p.key.color);
      key.intensity = p.key.intensity;
      key.position.fromArray(p.key.pos);
      fill.color.setHex(p.fill.color);
      fill.intensity = p.fill.intensity;
      fill.position.fromArray(p.fill.pos);
      rim.color.setHex(p.rim.color);
      rim.intensity = p.rim.intensity;
      rim.position.fromArray(p.rim.pos);
    })();
    return cozyLightRig;
  },
  async build(scene: THREE.Scene, signal: AbortSignal) {
    const seam = 0.06;
    const Ww = W_ROOM;
    const Hh = H_ROOM_HALF;
    const Dd = W_ROOM;
    async function loadWinterRoomTextures() {
      const loader = new THREE.TextureLoader();
      const keys = Object.keys(WINTER_ROOM_TEXTURES);
      const map: Record<string, THREE.Texture> = {};
      for (const key of keys) {
        const dataUrl = WINTER_ROOM_TEXTURES[key];
        try {
          // eslint-disable-next-line no-await-in-loop
          map[key] = await new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(
              dataUrl,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
                // Wie im Original: lineare Filterung ohne Mipmaps.
                tex.minFilter = tex.magFilter = THREE.LinearFilter;
                tex.generateMipmaps = false;
                resolve(tex);
              },
              undefined,
              reject,
            );
          });
        } catch (err) {
          Object.values(map).forEach((texture) => texture.dispose());
          throw new Error(
            `Winterraum-Textur konnte nicht geladen werden: ${key}`,
            { cause: err },
          );
        }
      }
      return map;
    }
    function buildWinterRoom(texMap: Record<string, THREE.Texture>) {
      const wallDefs = [
        {
          name: 'windowWallBacking',
          corners: [
            [-Ww, -Hh, -Dd],
            [Ww, -Hh, -Dd],
            [Ww, Hh, -Dd],
            [-Ww, Hh, -Dd],
          ],
          solid: [0.3, 0.34, 0.39],
        },
        {
          name: 'winterWindow',
          key: 'winterWindow',
          corners: [
            [-Ww - seam, -Hh, -Dd + 0.002],
            [Ww + seam, -Hh, -Dd + 0.002],
            [Ww + seam, Hh, -Dd + 0.002],
            [-Ww - seam, Hh, -Dd + 0.002],
          ],
        },
        {
          name: 'winterDoor',
          key: 'winterDoor',
          corners: [
            [-Ww + seam, -Hh, Dd + seam],
            [-Ww + seam, -Hh, -Dd - seam],
            [-Ww + seam, Hh, -Dd - seam],
            [-Ww + seam, Hh, Dd + seam],
          ],
          uMin: 0.018,
        },
        {
          name: 'winterSlats',
          key: 'winterSlats',
          corners: [
            [Ww - seam, -Hh, -Dd - seam],
            [Ww - seam, -Hh, Dd + seam],
            [Ww - seam, Hh, Dd + seam],
            [Ww - seam, Hh, -Dd - seam],
          ],
          uMin: 0.016,
          vMax: 0.988,
        },
        {
          name: 'winterShelf',
          key: 'winterShelf',
          corners: [
            [Ww + seam, -Hh, Dd + 0.002],
            [-Ww - seam, -Hh, Dd + 0.002],
            [-Ww - seam, Hh, Dd + 0.002],
            [Ww + seam, Hh, Dd + 0.002],
          ],
          vMax: 0.988,
        },
        {
          name: 'floor',
          key: 'floor',
          corners: [
            [-Ww, -Hh, -Dd],
            [Ww, -Hh, -Dd],
            [Ww, -Hh, Dd],
            [-Ww, -Hh, Dd],
          ],
        },
        {
          name: 'ceiling',
          key: 'ceiling',
          corners: [
            [-Ww, Hh, Dd],
            [Ww, Hh, Dd],
            [Ww, Hh, -Dd],
            [-Ww, Hh, -Dd],
          ],
        },
      ];
      for (const def of wallDefs) {
        let uMin = def.uMin ?? 0;
        let uMax = 1;
        let vMin = 0;
        let vMax = def.vMax ?? 1;
        // V20 gibt die Texturfarben direkt aus: Licht und Schatten sind bereits
        // im Bild enthalten. Zusätzliche Beleuchtung oder ACES würde sie verfälschen.
        const mat = new THREE.MeshBasicMaterial({
          map: def.solid ? null : texMap[def.key!] || null,
          color: def.solid
            ? new THREE.Color().setRGB(
                def.solid[0],
                def.solid[1],
                def.solid[2],
                THREE.SRGBColorSpace,
              )
            : 0xffffff,
          toneMapped: false,
          side: THREE.DoubleSide,
        });
        const geo = buildQuadGeometry(def.corners);
        setQuadUVs(geo, uMin, uMax, vMin, vMax);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = def.name;
        scene.add(mesh);
      }
    }
    const textures = await loadWinterRoomTextures();
    if (signal.aborted) {
      Object.values(textures).forEach((texture) => texture.dispose());
      return;
    }
    buildWinterRoom(textures);
  },
};
