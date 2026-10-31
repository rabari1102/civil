// Shared three.js plumbing: renderer, studio lighting, GLB loading (meshopt),
// camera framing, loader ring and a render loop that sleeps off-screen.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export { THREE, OrbitControls };

export const webglOK = (() => {
  // probe context is released at once so the page holds only the renderer's own
  try { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); g?.getExtension('WEBGL_lose_context')?.loseContext(); return !!g; } catch { return false; }
})();

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
export function loadGLB(url, onProgress) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((res, rej) => loader.load(url, res, (e) => e.total && onProgress?.(e.loaded / e.total), rej)));
  } else onProgress?.(1);
  return cache.get(url).then((g) => ({ ...g, scene: g.scene.clone(true) }));
}

// Blender (Z-up) vectors stored in extras → three (Y-up)
export const fromBlender = (a) => new THREE.Vector3(a[0], a[2], -a[1]);

export function makeRenderer(host, { alpha = true, shadows = false } = {}) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha, powerPreference: 'high-performance' });
  // 1.5x is sharp on retina screens at about half the pixel work of 2x
  r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = shadows;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(r.domElement);
  return r;
}

export function studio(renderer, scene, { env = 0.9 } = {}) {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = env;
  const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
  key.position.set(6, 10, 7);
  const rim = new THREE.DirectionalLight(0x5ccfff, 1.3);
  rim.position.set(-8, 4, -6);
  const warm = new THREE.PointLight(0xff6a1a, 18, 0, 2);
  warm.position.set(-4, 2, 6);
  scene.add(key, rim, warm, new THREE.HemisphereLight(0xe8f2ff, 0x9aa8b8, 0.75));
  return { key, rim, warm };
}

// Size and frame
export function bounds(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return { box, size, center, radius: size.length() / 2 || 1 };
}
export function framing(camera, center, radius, { dir = new THREE.Vector3(1, 0.62, 1.1), pad = 1.25 } = {}) {
  const fov = (camera.fov * Math.PI) / 180;
  const fit = Math.max(radius / Math.sin(fov / 2), radius / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect)));
  const pos = center.clone().add(dir.clone().normalize().multiplyScalar(fit * pad));
  return { pos, target: center.clone() };
}

// Resize to host and a visibility-aware loop
export function runLoop(host, renderer, camera, tick) {
  let visible = false, raf = 0, last = performance.now();
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();
  const frame = (t) => {
    raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    tick(dt, t / 1000);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame); });
  return { resize };
}

export function loaderUI(host, label = 'Loading model') {
  const el = document.createElement('div');
  el.className = 'x-gl-load';
  el.innerHTML = `<div><div class="x-gl-load__ring"><svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="44"/><circle cx="46" cy="46" r="44"/></svg><b>0%</b></div><span>${label}</span></div>`;
  host.appendChild(el);
  const b = el.querySelector('b');
  return {
    set(p) { el.style.setProperty('--p', p); b.textContent = Math.round(p * 100) + '%'; },
    done() { this.set(1); el.classList.add('is-done'); setTimeout(() => el.remove(), 700); },
    fail(msg) { el.innerHTML = `<div class="x-gl-fallback">${msg}</div>`; },
  };
}

export function fallback(host, poster, msg = '3D needs WebGL, which this browser has turned off.') {
  const el = document.createElement('div');
  el.className = 'x-gl-fallback';
  el.innerHTML = poster ? `<img src="${poster}" alt="">` : `<p>${msg}</p>`;
  host.appendChild(el);
}

// Materials: make every mesh cast a bit more of the studio light
export function tuneMaterials(root, { env = 1 } = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach((m) => { if ('envMapIntensity' in m) m.envMapIntensity = env; m.side = THREE.FrontSide; });
  });
}

// Paint scheme: each labelled part gets a painted-steel colour from what it is,
// so ladders read as safety yellow, decks as teal, primary steel in signal colours.
// "(context)" items (tanks, equipment, ground) stay neutral so the fabrication stands out.
const PAINT = [
  [/stringer/, ['#ff6a1a', '#3f7bff']],
  [/ladder|handrail|railing|guardrail|stair|cage|toe.?guard|landing|catwalk|walkway|grip-strut|tread|lifeline|fence/, ['#ffc21a', '#b7f04a', '#2fd1bd', '#8fc1ff']],
  [/deck|platform|grating|floor|plank|chequer|mat\b|mudmat/, ['#22b8a6', '#4f8bff']],
  [/pipe|riser|nozzle|header|duct|spool|line|hose|tube|burner/, ['#3ddc97', '#5be3a8']],
  [/bolt|clamp|lug|padeye|clevis|flange|bracket|gusset|stiffen|pin\b|nut|shoe|anchor|plate|seat|cleat|hinge|trunnion|fin/, ['#e8505b', '#ff7a59']],
  [/shell|panel|cladding|roof|wall|louvre|canopy|door|enclosure|hood|cap|cover|housing|shroud|skin|casing|hatch/, ['#8fc1ff', '#b7a4ff', '#6fd3ff']],
  [/column|leg|beam|girder|frame|chassis|base|brac|truss|derrick|tower|pier|stringer|post|arm|ring|rib|skid|module|support|mould|structure|section|member/, ['#ff6a1a', '#3f7bff', '#a46bff', '#2cc6f0', '#ff4d6d']],
];
const FALLBACK = ['#ff6a1a', '#3f7bff', '#ffc21a', '#3ddc97', '#e8505b', '#2cc6f0', '#a46bff', '#ff9f43'];
const CONTEXT = new THREE.Color('#7d8794');
// one palette per model: each family counts its own parts, so two beams never share a colour
export function partPalette() {
  const n = new Map();
  return (label = '') => {
    const l = label.toLowerCase();
    if (/\(context/.test(l)) return null;
    const fam = PAINT.find(([re]) => re.test(l));
    const cols = fam ? fam[1] : FALLBACK, k = n.get(cols) || 0;
    n.set(cols, k + 1);
    return new THREE.Color(cols[k % cols.length]);
  };
}
// apply to one material (already cloned): painted steel, a little sheen
export function paintMaterial(m, color) {
  if (!m.color) return;
  if (color) m.color.copy(color);
  else m.color.lerp(CONTEXT, 0.55);
  if ('metalness' in m) { m.metalness = color ? 0.25 : 0.4; m.roughness = color ? 0.42 : 0.7; }
}
// paint a whole model: top-level labelled parts only, materials cloned per part
export function paintModel(root) {
  const partColor = partPalette();
  root.traverse((o) => {
    if (!o.userData?.label) return;
    for (let p = o.parent; p; p = p.parent) if (p.userData?.label) return;
    const col = partColor(o.userData.label);
    o.traverse((m) => {
      if (!m.isMesh) return;
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => paintMaterial(x, col));
    });
  });
}

// paint the labelled parts inside one node (a product in a plant scene); a product
// without labelled parts takes one colour from its own label
export function paintParts(node, partColor = partPalette()) {
  let labelled = false;
  node.traverse((o) => { if (o !== node && o.userData?.label) labelled = true; });
  const visit = (o, col) => {
    if (o !== node && col === undefined && o.userData?.label) col = partColor(o.userData.label);
    if (o.isMesh && col !== undefined) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => paintMaterial(m, col));
    o.children.forEach((c) => visit(c, col));
  };
  visit(node, labelled ? undefined : partColor(node.userData?.label || ''));
}

// Smooth damp toward targets
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export function dampV(v, to, k, dt) { v.x = damp(v.x, to.x, k, dt); v.y = damp(v.y, to.y, k, dt); v.z = damp(v.z, to.z, k, dt); return v; }

export const ACCENT = new THREE.Color('#ff6a1a');
export const ARC = new THREE.Color('#3fd8ff');
