import * as THREE from 'three';
import { FIREPLACE_TEXTURES } from '../assets/textures/fireplace';
import { buildQuadGeometry, setQuadUVs } from '../scene/geometry';
import { H_ROOM_HALF } from '../scene/tableDimensions';

type TextureName = keyof typeof FIREPLACE_TEXTURES;
type Point = [number, number, number];

/** V137 uses 280 CSS pixels per metre (420 px = 150 cm).
 * Preserve its component coordinates; convert CSS's downward Y to world Y.
 */
export async function buildFireplace(scene: THREE.Scene, signal: AbortSignal) {
  const textures = {} as Record<TextureName, THREE.Texture>;
  try {
    for (const key of Object.keys(FIREPLACE_TEXTURES) as TextureName[]) {
      const texture = await new THREE.TextureLoader().loadAsync(FIREPLACE_TEXTURES[key]);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures[key] = texture;
      if (signal.aborted) {
        Object.values(textures).forEach((item) => item.dispose());
        return;
      }
    }
  } catch (error) {
    Object.values(textures).forEach((item) => item.dispose());
    throw error;
  }
  const fireplace = new THREE.Group();
  fireplace.name = 'Kamin V137';
  // Window at -Z; the empty opposite wall is +Z. The rear cap is at -69 px.
  fireplace.position.set(0, -H_ROOM_HALF, 2.6 - 69 / 280 - 0.006);
  fireplace.rotation.y = Math.PI;
  function surface(name: string, points: Point[], textureName: TextureName,
    tileSize?: [number, number]) {
    const geometry = buildQuadGeometry(points.map(([x, y, z]) => [x / 280, (42 - y) / 280, z / 280]));
    const texture = textures[textureName];
    if (tileSize) {
      // Repeat in the actual surface plane, like the source's CSS backgrounds.
      const origin = new THREE.Vector3(...points[0]);
      const across = new THREE.Vector3(...points[1]).sub(origin).normalize();
      const normal = new THREE.Vector3(...points[1]).sub(origin)
        .cross(new THREE.Vector3(...points[2]).sub(origin)).normalize();
      const down = normal.clone().cross(across).normalize();
      const uv = points.map((p) => {
        const delta = new THREE.Vector3(...p).sub(origin);
        return [delta.dot(across) / tileSize[0], delta.dot(down) / tileSize[1]];
      });
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(
        [0, 1, 2, 0, 2, 3].flatMap((i) => uv[i]), 2));
    } else {
      setQuadUVs(geometry, 0, 1, 0, 1);
    }
    const material = textureName === 'fire'
      ? new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false })
      : new THREE.MeshStandardMaterial({
          map: texture, side: THREE.DoubleSide, roughness: 0.9,
          // Soft ambient lift preserves the photographic surfaces in the room light.
          emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.12,
        });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = textureName !== 'fire';
    mesh.receiveShadow = textureName !== 'fire';
    fireplace.add(mesh);
  }
  function box(name: string, x: number, y: number, z: number,
    width: number, height: number, depth: number,
    maps: { front: TextureName; back?: TextureName; side: TextureName; left?: TextureName; top: TextureName },
    tiles?: { side: [number, number]; top: [number, number] }) {
    const l = x - width / 2, r = x + width / 2;
    const t = y, b = y + height, f = z + depth / 2, a = z - depth / 2;
    surface(`${name} vorne`, [[l,b,f],[r,b,f],[r,t,f],[l,t,f]], maps.front, tiles?.side);
    surface(`${name} hinten`, [[r,b,a],[l,b,a],[l,t,a],[r,t,a]], maps.back ?? maps.front, tiles?.side);
    surface(`${name} rechts`, [[r,b,f],[r,b,a],[r,t,a],[r,t,f]], maps.side, tiles?.side);
    surface(`${name} links`, [[l,b,a],[l,b,f],[l,t,f],[l,t,a]], maps.left ?? maps.side, tiles?.side);
    surface(`${name} oben`, [[l,t,f],[r,t,f],[r,t,a],[l,t,a]], maps.top, tiles?.top);
    surface(`${name} unten`, [[l,b,a],[r,b,a],[r,b,f],[l,b,f]], maps.side, tiles?.side);
  }
  box('Sockel', 0, -42, 0, 420, 84, 126,
    { front: 'baseFront', side: 'baseSide', left: 'baseLeft', top: 'baseTop' });
  for (const x of [-161, 161]) {
    box('Steinwange', x, -253, -21, 98, 210, 84,
      { front: 'pier', side: 'pier', top: 'pier' });
  }
  // V137's final arch has a straight lower edge (224 × 54 × 84 px).
  box('Mauerbogen', 0, -253, -21, 224, 54, 84,
    { front: 'archFront', back: 'archBack', side: 'archSide', top: 'archTop' });
  box('Holzbalken', 0, -303, -9, 470, 50, 108,
    { front: 'wood', side: 'woodEnd', top: 'wood' });
  surface('Feuerbild', [[-112,-42,-60],[112,-42,-60],[112,-199,-60],[-112,-199,-60]], 'fire');
  const fl: Point = [-210,-300,15], fr: Point = [210,-300,15];
  const bl: Point = [-210,-300,-63], br: Point = [210,-300,-63];
  const ftl: Point = [-126,-552,-3], ftr: Point = [126,-552,-3];
  const btl: Point = [-126,-552,-63], btr: Point = [126,-552,-63];
  surface('Aufbau vorne', [fl,fr,ftr,ftl], 'hood', [210,150]);
  surface('Aufbau hinten', [br,bl,btl,btr], 'hood', [210,150]);
  surface('Aufbau links', [bl,fl,ftl,btl], 'hoodSide', [82,180]);
  surface('Aufbau rechts', [fr,br,btr,ftr], 'hoodSide', [82,180]);
  box('Abschlussplatte', 0, -566, -36, 276, 14, 66,
    { front: 'cap', side: 'cap', top: 'capTop' },
    { side: [210,28], top: [210,150] });
  // Warm ceiling light, without changing any of the source geometry.
  const ceilingLight = new THREE.PointLight(0xffefcd, 0.65, 4, 2);
  ceilingLight.position.set(0, 1.05, 1.4);
  scene.add(fireplace, ceilingLight);
}
