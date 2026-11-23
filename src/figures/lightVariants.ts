import * as THREE from 'three';

export const LIGHT_VARIANTS = [
  { name: 'Lichtlinien', description: 'Klare Linien · feiner Schein', core: 0.10, aura: 0.20, spread: 1.25, rays: 0, particles: 0, warmth: 0xffdfa9 },
  { name: 'Lichtkörper', description: 'Weiches Licht · räumlicher Nebel', core: 1.1, aura: 0.38, spread: 1.45, rays: 0, particles: 0, warmth: 0xffe7c2 },
  { name: 'Strahlende Aura', description: 'Weiter Schein · sanfte Strahlen', core: 0.28, aura: 0.85, spread: 2.1, rays: 1, particles: 0, warmth: 0xffd18a },
  { name: 'Sternenlicht', description: 'Lichtpunkte · schwebender Staub', core: 0.18, aura: 0.25, spread: 1.5, rays: 0, particles: 140, warmth: 0xe5eeff },
  { name: 'Lebendiges Licht', description: 'Lichtkörper · Aura · Funkeln', core: 0.75, aura: 0.6, spread: 1.8, rays: 0.35, particles: 55, warmth: 0xffe1ac },
] as const;
export interface LightVariant {
  name: string;
  description: string;
  core: number;
  aura: number;
  spread: number;
  rays: number;
  particles: number;
  warmth: number;
}

// Selected study 2, tuned to bild-material/1000001776.png.
export const SELECTED_LIGHT_VARIANT: LightVariant = {
  ...LIGHT_VARIANTS[1],
  name: 'Goldenes Licht',
  description: 'Weicher Lichtkörper mit feinem Funkeln',
  aura: 0.42,
  spread: 1.65,
  warmth: 0xffd99a,
  particles: 42,
  rays: 0.08,
};

/** Integrate light through a 3D density field. No crossed planes or visible shell. */
export function addLightVariantEffects(
  root: THREE.Mesh,
  height: number,
  radiusAtHeight: (fraction: number) => number,
  variant: LightVariant,
) {
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const radius = radiusAtHeight(i / 255) / height;
    data.set([Math.round(radius * 255), 0, 0, 255], i * 4);
  }
  const profile = new THREE.DataTexture(data, 256, 1);
  profile.minFilter = profile.magFilter = THREE.LinearFilter;
  profile.needsUpdate = true;
  const color = new THREE.Color(variant.warmth);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      profile: { value: profile }, eye: { value: new THREE.Vector3() },
      glowColor: { value: color }, time: { value: 0 },
      core: { value: variant.core }, aura: { value: variant.aura },
      spread: { value: variant.spread },
    },
    vertexShader: `varying vec3 localPosition;
      void main() { localPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 localPosition;
      uniform sampler2D profile;
      uniform vec3 eye, glowColor;
      uniform mat4 projectionMatrix, modelViewMatrix;
      uniform float time, core, aura, spread;
      void main() {
        vec3 direction = normalize(localPosition - eye);
        vec3 safeDirection = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), direction)) * max(abs(direction), vec3(0.00001));
        vec3 t0 = (vec3(-0.58, -0.1, -0.58) - eye) / safeDirection;
        vec3 t1 = (vec3(0.58, 1.1, 0.58) - eye) / safeDirection;
        vec3 nearT = min(t0,t1), farT = max(t0,t1);
        float entry = max(0.0, max(nearT.x, max(nearT.y, nearT.z)));
        float exitT = min(farT.x, min(farT.y, farT.z));
        if (exitT <= entry) discard;
        float stepSize = (exitT - entry) / 40.0;
        float density = 0.0;
        float peak = 0.0;
        vec3 lightPosition = localPosition;
        for (int i = 0; i < 40; i++) {
          vec3 p = eye + direction * (entry + (float(i) + 0.5) * stepSize);
          if (p.y < 0.0) continue;
          float y = clamp(p.y, 0.0, 1.0);
          float r = max(0.012, texture2D(profile, vec2(y, 0.5)).r);
          float radial = length(p.xz);
          float ends = smoothstep(-0.06,0.035,p.y) * (1.0-smoothstep(0.985,1.06,p.y));
          float body = exp(-pow(radial / (r * 0.82), 2.0) * 1.5);
          float halo = exp(-pow(radial / (r * spread + 0.028), 2.0) * 1.8);
          float mist = 0.85 + 0.15 * sin(p.y*24.0 + p.x*30.0 + time*0.5)
            * sin(p.z*28.0 - p.y*17.0 + time*0.35);
          float sampleDensity = (body * core * mist + halo * aura) * ends;
          if (sampleDensity > peak) { peak = sampleDensity; lightPosition = p; }
          density += sampleDensity * stepSize * 4.0;
        }
        // Test depth at the luminous body, not the back of its bounding box.
        vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(lightPosition, 1.0);
        gl_FragDepth = (clipPosition.z / clipPosition.w) * 0.5 + 0.5;
        float alpha = 1.0-exp(-density);
        gl_FragColor = vec4(mix(glowColor, vec3(1.0), alpha*0.65), alpha*0.28);
      }`,
    transparent: true, depthWrite: false, depthTest: true, side: THREE.BackSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const volume = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.2, 1.16), material);
  volume.geometry.translate(0, 0.5, 0);
  volume.scale.setScalar(height);
  volume.raycast = () => {};
  volume.renderOrder = 1;
  const localEye = new THREE.Vector3();
  volume.onBeforeRender = (_renderer, _scene, camera) => {
    camera.getWorldPosition(localEye);
    volume.worldToLocal(localEye);
    material.uniforms.eye.value.copy(localEye);
    material.uniforms.time.value = performance.now() / 1000;
  };
  root.add(volume);

  // A soft pool on the board ties the emitted light to its surroundings.
  const poolMaterial = new THREE.ShaderMaterial({
    uniforms: { color: { value: color }, strength: { value: 0.18 + variant.aura * 0.22 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec2 vUv; uniform vec3 color; uniform float strength;
      void main(){float r=length(vUv-.5)*2.0; float a=exp(-r*r*5.0)*(1.0-smoothstep(.65,1.0,r)); gl_FragColor=vec4(color,a*strength);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(height * 0.85, height * 0.85), poolMaterial);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.008;
  pool.raycast = () => {};
  root.add(pool);

  if (variant.particles || variant.rays) {
    const count = variant.particles || 18;
    const positions: number[] = [], phases: number[] = [], sizes: number[] = [];
    // Deterministic positions make the alternatives reproducible.
    const random = (i: number) => THREE.MathUtils.euclideanModulo(Math.sin(i * 127.1 + 37.7) * 43758.5453, 1);
    for (let i = 0; i < count; i++) {
      const y = 0.04 + random(i + 1) * 0.94;
      const angle = random(i + 200) * Math.PI * 2;
      const radius = radiusAtHeight(y) * (0.6 + random(i + 400) * 1.4);
      positions.push(Math.cos(angle) * radius, y * height, Math.sin(angle) * radius);
      phases.push(random(i + 600) * Math.PI * 2);
      sizes.push(variant.rays && i % (variant.rays < 0.1 ? 17 : 5) === 0 ? (variant.rays < 0.1 ? 0.13 : 0.24 + variant.rays * 0.3) : 0.018 + random(i + 800) * 0.035);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, color: { value: color }, pixelHeight: { value: 1000 }, worldScale: { value: 1 }, height: { value: height } },
      vertexShader: `attribute float phase, size; varying float brightness, star;
        uniform float time, pixelHeight, worldScale, height;
        void main(){
          vec3 p=position; p.y+=sin(time*.45+phase)*height*.012;
          vec4 mv=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp(size*height*worldScale*pixelHeight*projectionMatrix[1][1]/(-mv.z*2.0),2.0,180.0);
          brightness=.15+.85*pow(.5+.5*sin(time*.9+phase),4.0); star=step(.1,size);
        }`,
      fragmentShader: `uniform vec3 color; varying float brightness, star;
        void main(){
          vec2 p=(gl_PointCoord-.5)*2.0; float r=length(p);
          float glow=exp(-r*r*10.0);
          float rays=(exp(-abs(p.x)*65.0)*exp(-abs(p.y)*4.0)+exp(-abs(p.y)*65.0)*exp(-abs(p.x)*4.0))*.55;
          float alpha=mix(glow, glow*.16+rays, star)*(1.0-smoothstep(.7,1.0,r))*brightness;
          gl_FragColor=vec4(mix(color,vec3(1.0),.5),alpha*.55);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const particles = new THREE.Points(geometry, particleMaterial);
    const worldScale = new THREE.Vector3();
    particles.onBeforeRender = (renderer) => {
      particleMaterial.uniforms.time.value = performance.now() / 1000;
      particleMaterial.uniforms.pixelHeight.value = renderer.domElement.height;
      particles.getWorldScale(worldScale);
      particleMaterial.uniforms.worldScale.value = worldScale.x;
    };
    particles.raycast = () => {};
    root.add(particles);
  }
  // This texture belongs to this effect, unlike the library's shared veil texture.
  root.userData.disposeLightEffects = () => profile.dispose();
  root.userData.tintLightEffects = (hex: number | null) => color.setHex(hex ?? variant.warmth);
}
