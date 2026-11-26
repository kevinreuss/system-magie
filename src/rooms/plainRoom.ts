import * as THREE from 'three';
import { buildQuadGeometry, setQuadUVs } from '../scene/geometry';
import { winterRoom } from './winterRoom';

export const plainRoom = {
  ...winterRoom,
  id: 'plain',
  name: 'Schlichter Raum',
  async build(scene: THREE.Scene, signal: AbortSignal) {
    if (signal.aborted) return;
    // Maße, Farben und feine Wandkanten aus der V6-Vorlage.
    const W = 2, H = 1.2, D = 2;
    const surfaces = [
      [[-W,-H,-D],[W,-H,-D],[W,H,-D],[-W,H,-D]],
      [[-W,-H,D],[-W,-H,-D],[-W,H,-D],[-W,H,D]],
      [[W,-H,-D],[W,-H,D],[W,H,D],[W,H,-D]],
      [[W,-H,D],[-W,-H,D],[-W,H,D],[W,H,D]],
      [[-W,-H,-D],[W,-H,-D],[W,-H,D],[-W,-H,D]],
      [[-W,H,D],[W,H,D],[W,H,-D],[-W,H,-D]],
    ];
    surfaces.forEach((corners, index) => {
      const color = index < 4 ? [0.910, 0.835, 0.757]
        : index === 4 ? [0.882, 0.812, 0.722] : [0.929, 0.878, 0.804];
      const material = new THREE.ShaderMaterial({
        uniforms: {
          surfaceColor: { value: new THREE.Vector3(...color) },
          wallShadow: { value: index < 4 ? 1 : 0 },
        },
        vertexShader: `varying vec2 surfaceUV;
          void main() {
            surfaceUV = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `varying vec2 surfaceUV;
          uniform vec3 surfaceColor;
          uniform float wallShadow;
          void main() {
            float edgeX = min(surfaceUV.x, 1.0 - surfaceUV.x);
            float seam = smoothstep(0.0, 0.0025, edgeX);
            vec3 color = surfaceColor * (mix(0.965, 1.0, seam) * wallShadow + 1.0 - wallShadow);
            gl_FragColor = vec4(color, 1.0);
          }`,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const geometry = buildQuadGeometry(corners);
      setQuadUVs(geometry, 0, 1, 0, 1);
      scene.add(new THREE.Mesh(geometry, material));
    });
  },
};
