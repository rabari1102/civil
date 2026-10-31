// Re-render the product preview pictures (public/remote/models/renders/*.webp) from
// the GLB models with the site's paint scheme, so stills match the live 3D.
// Needs the dev server (node build/serve.mjs) and Chrome. Originals: build/backup/renders-grey/.
//   node build/tools/renders.mjs [name ...]
//   node build/tools/renders.mjs --scenes     (the plant pictures in public/remote/img/news)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const OUT = path.join(ROOT, 'public/remote/models/renders');
const BASE = process.env.BASE || 'http://127.0.0.1:5180';
const PORT = 9336;
// stills whose own model does not exist: the model their product page shows instead
const ALIAS = {
  'allstage-plank': 'allstage-staging-system',
  'scaffold-planks': 'scaffold-planks-and-toe-guards',
  'toe-guard': 'scaffold-planks-and-toe-guards',
  'cast-in-situ-moulds': 'pier-and-pier-cap-moulds',
  'speciality-formwork': 'allwell-deep-foundation',
};
// plant-scene stills: picture → [scene model, width, height]
const SCENES = {
  'plant-3d-onshore': ['plant-onshore', 1200, 780],
  'plant-3d-offshore': ['plant-offshore', 1200, 780],
  'renewables-3d': ['plant-renewables', 2400, 1200],
};
const sceneMode = process.argv[2] === '--scenes';
const names = sceneMode ? Object.keys(SCENES) : process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(OUT).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5));

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'renders-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver;
for (let i = 0; i < 150 && !ver; i++) { await sleep(200); try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch {} }
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed'); return r.result?.result?.value; };

await send('Page.navigate', { url: BASE + '/404.html' });
for (let i = 0; i < 60; i++) { await sleep(250); if ((await ev('document.readyState')) === 'complete') break; }

// one renderer in the page; window.__shot(url) returns a webp data URL
await ev(`(async () => {
  const { THREE, loadGLB, studio, bounds, framing, tuneMaterials, paintModel } = await import('/assets/js/three/core.js');
  const W = 1200, H = 900;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const c2 = out.getContext('2d');
  window.__shot = async (url) => {
    const scene = new THREE.Scene();
    studio(r, scene);
    const m = (await loadGLB(url)).scene;
    tuneMaterials(m, { env: 1.1 });
    paintModel(m);
    scene.add(m);
    const B = bounds(m);
    const cam = new THREE.PerspectiveCamera(30, W / H, B.radius * 0.01, B.radius * 40);
    const f = framing(cam, B.center, B.radius, { dir: new THREE.Vector3(1, 0.62, 1.1), pad: 0.92 });
    cam.position.copy(f.pos); cam.lookAt(f.target);
    r.setClearColor(0x000000, 0); r.render(scene, cam);
    // backdrop: soft cool studio sweep, then a contact shadow under the model
    const g = c2.createRadialGradient(W * 0.5, H * 0.42, 40, W * 0.5, H * 0.5, W * 0.72);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#eef3fa'); g.addColorStop(1, '#dfe8f5');
    c2.fillStyle = g; c2.fillRect(0, 0, W, H);
    const foot = new THREE.Vector3(B.center.x, B.box.min.y, B.center.z).project(cam);
    const ex = new THREE.Vector3(B.center.x + B.size.x / 2, B.box.min.y, B.center.z).project(cam);
    const fx = (foot.x + 1) / 2 * W, fy = (1 - foot.y) / 2 * H;
    const rx = Math.max(140, Math.min(W * 0.42, Math.abs((ex.x + 1) / 2 * W - fx) * 1.3 + 90));
    c2.save(); c2.filter = 'blur(28px)'; c2.fillStyle = 'rgba(16,38,74,.14)';
    c2.beginPath(); c2.ellipse(fx, Math.min(H - 40, fy + 18), rx, rx * 0.16, 0, 0, Math.PI * 2); c2.fill(); c2.restore();
    c2.drawImage(r.domElement, 0, 0);
    m.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach((x) => x.dispose()); } });
    scene.environment?.dispose();
    return out.toDataURL('image/webp', 0.88);
  };
  return true;
})()`);

// plant scenes: products painted part by part (as the live scene does), sky hidden,
// a light sky behind, framed on the products
await ev(`(async () => {
  const { THREE, loadGLB, studio, bounds, framing, tuneMaterials, partPalette, paintParts } = await import('/assets/js/three/core.js');
  window.__scene = async (url, W, H) => {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(W, H, false);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    studio(r, scene, { env: 0.75 }).warm.intensity = 0;
    const sun = new THREE.DirectionalLight(0xffe6c8, 2.2); sun.position.set(120, 200, 80); scene.add(sun);
    const m = (await loadGLB(url)).scene;
    tuneMaterials(m, { env: 0.9 });
    const partColor = partPalette(), pb = new THREE.Box3();
    m.traverse((o) => {
      const e = o.userData || {};
      if (/^ENV_Sky/.test(o.name) || e.fx === 'none') o.visible = false;
      if (e.fx === 'water' || /sea|water|ocean/i.test(o.name)) o.traverse((mm) => { if (mm.isMesh) { mm.material = mm.material.clone(); mm.material.roughness = 0.7; mm.material.metalness = 0; } });
      if (e.kind === 'product') { o.traverse((mm) => { if (mm.isMesh) mm.material = mm.material.clone(); }); paintParts(o, partColor); pb.expandByObject(o); }
    });
    scene.add(m);
    const B = bounds(m);
    const c = pb.isEmpty() ? B.center : pb.getCenter(new THREE.Vector3()), rad = pb.isEmpty() ? B.radius : pb.getSize(new THREE.Vector3()).length() / 2;
    const cam = new THREE.PerspectiveCamera(36, W / H, rad * 0.01, rad * 40);
    const f = framing(cam, c, rad * 0.8, { dir: new THREE.Vector3(1, 0.62, 1.1), pad: 0.78 });
    cam.position.copy(f.pos); cam.lookAt(f.target);
    r.setClearColor(0x000000, 0); r.render(scene, cam);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const c2 = out.getContext('2d');
    const g = c2.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#cfe6ff'); g.addColorStop(0.5, '#e9f3ff'); g.addColorStop(1, '#f4f8fd');
    c2.fillStyle = g; c2.fillRect(0, 0, W, H);
    c2.drawImage(r.domElement, 0, 0);
    const url2 = out.toDataURL('image/webp', 0.88);
    r.dispose();
    return url2;
  };
  return true;
})()`);

let ok = 0;
for (const n of names) {
  try {
    let url, dest;
    if (sceneMode) {
      const [mdl, w, h] = SCENES[n];
      url = await ev(`window.__scene(${JSON.stringify('/models/' + mdl + '.glb')}, ${w}, ${h})`);
      dest = path.join(ROOT, 'public/remote/img/news', n + '.webp');
    } else {
      url = await ev(`window.__shot(${JSON.stringify(`/models/${ALIAS[n] || n}.glb`)})`);
      dest = path.join(OUT, n + '.webp');
    }
    fs.writeFileSync(dest, Buffer.from(url.split(',')[1], 'base64'));
    ok++; console.log('ok  ', n);
  } catch (e) { console.log('FAIL', n, String(e.message).split('\n')[0]); }
}
console.log(`rendered ${ok}/${names.length}`);
ws.close(); chrome.kill();
process.exit(0);
