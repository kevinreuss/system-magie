// Klassisches Script, damit direktes Öffnen über file:// funktioniert.
window.createLightFigureLibrary = function (THREE) {
'use strict';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const profile=[
[0.00,.075],[.025,.12],[.07,.155],[.13,.18],[.20,.195],
[.27,.19],[.34,.16],[.39,.135],[.43,.14],[.48,.18],
[.54,.245],[.60,.29],[.66,.30],[.71,.285],[.755,.25],
[.795,.205],[.825,.155],[.85,.105],[.875,.085],
// Kopf: schmaler und hochkant oval statt flacher, breiter Kappe
[.89,.09],[.905,.108],[.92,.13],[.94,.145],[.96,.148],
[.972,.144],[.982,.13],[.989,.11],[.994,.083],[.997,.058],[.999,.03],[1,0]
];
function radius(t){
 // Der Kopf wird als echte, aufrecht stehende Ovalform berechnet:
 // unten sanft aus dem Hals verbreitert, oben als durchgehend runde Ellipsenkappe.
 if(t>=.875){
  const h=clamp((t-.875)/.125,0,1);
  const join=.58, base=.085, widest=.15;
  if(h<=join){const u=h/join;const smooth=u*u*(3-2*u);return base+(widest-base)*smooth;}
  const q=clamp((h-join)/(1-join),0,1);
  return Math.max(.004,widest*Math.sqrt(Math.max(0,1-q*q)));
 }
 let i=0;while(i<profile.length-2&&profile[i+1][0]<t)i++;
 const [ta,ra]=profile[i],[tb,rb]=profile[i+1],u=(t-ta)/(tb-ta);
 const prev=profile[Math.max(0,i-1)],next=profile[Math.min(profile.length-1,i+2)];
 const m0=(rb-prev[1])/(tb-prev[0]),m1=(next[1]-ra)/(next[0]-ta);
 const u2=u*u,u3=u2*u,dt=tb-ta;
 return Math.max(.004,(2*u3-3*u2+1)*ra+(u3-2*u2+u)*dt*m0+(-2*u3+3*u2)*rb+(u3-u2)*dt*m1);
}

// V41-Profil und Windungen, auf dieselbe Gesamthöhe wie die Holzfigur normiert.
const sourceHeight = 1.96;
function heightAt(t) {
  return t <= .875 ? t * 1.72 : .875 * 1.72 + ((t - .875) / .125) * .40 + .055 * Math.pow((t - .875) / .125, 5);
}
function makeVeilTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i <= 112; i++) {
    const t = .012 + .976 * i / 112;
    const y = (1 - heightAt(t) / sourceHeight) * 512;
    const r = radius(t) * .82 / .65 * 256;
    const fade = Math.max(0, Math.min(1, t / .075, (1 - t) / .075));
    for (const [width, height, opacity] of [[.94, .021, .12], [1.9, .046, .028]]) {
      ctx.save(); ctx.translate(128, y); ctx.scale(r * width, 512 * height);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gradient.addColorStop(0, `rgba(255,255,255,${opacity * fade})`);
      gradient.addColorStop(.38, `rgba(255,255,255,${opacity * fade * .78})`);
      gradient.addColorStop(.72, `rgba(255,255,255,${opacity * fade * .34})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
let veilTexture;
function createLightFigure(targetHeight) {
  const scale = targetHeight / sourceHeight;
  const points = [];
  for (let i = 0; i <= 240; i++) {
    const t = i / 240;
    points.push(new THREE.Vector2(radius(t) * 1.018 * scale, heightAt(t) * scale));
  }
  const geometry = new THREE.LatheGeometry(points, 64);
  geometry.computeBoundingBox();
  // Unsichtbare Hülle nur zum Greifen und für die Randprüfung, kein fester Körper.
  const root = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
  }));
  root.userData.figureType = 'light';
  const starts = [-2.72,-1.93,-.73,.08,.92,2.02,2.73,4.47];
  const turns = [1.05,-.82,.63,-1.18,.92,-.70,.48,-.38];
  const waves = [.18,-.12,.23,.14,-.20,.19,-.11,.10];
  function addPart(geo, material, warm) {
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
      const t = .001 + .998 * k / 240;
      const r = radius(t) * 1.018 * scale;
      const angle = starts[n] + 2 * Math.PI * turns[n] * t + waves[n] * Math.sin(2 * Math.PI * (1.15 * t + .08 * n));
      path.push(new THREE.Vector3(r * Math.cos(angle), heightAt(t) * scale, r * Math.sin(angle)));
    }
    const curve = new THREE.CatmullRomCurve3(path);
    for (const [width, opacity, warm] of [[.024,.055,0xffcd97],[.012,.12,0xffdcb2],[.0037,.78,0xffe7cb],[.0014,.62,0xfff6e5]]) {
      addPart(new THREE.TubeGeometry(curve, 240, width * scale, 5, false),
        new THREE.MeshBasicMaterial({ transparent: true, opacity, depthWrite: false, toneMapped: false }), warm);
    }
  }
  veilTexture ??= makeVeilTexture();
  for (const rotation of [0, Math.PI / 2]) {
    const veil = addPart(new THREE.PlaneGeometry(.65 * scale, targetHeight),
      new THREE.MeshBasicMaterial({ map: veilTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), 0xfff4e5);
    veil.position.y = targetHeight / 2;
    veil.rotation.y = rotation;
  }
  return root;
}
function tintLightFigure(mesh, hex) {
  for (const part of mesh.children) {
    if (!part.userData.lightBaseColor) continue;
    part.material.color.copy(part.userData.lightBaseColor);
    if (hex != null) part.material.color.setHex(hex);
  }
}

return { createLightFigure, tintLightFigure };
};
