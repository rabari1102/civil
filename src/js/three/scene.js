// Plant scenes: a whole site (onshore plant, offshore field, renewables park,
// cement plant…) where every Allmarc product is clickable. Flow lines pulse in
// the direction of the product they carry; flares burn; rotors turn.
import { THREE, OrbitControls, loadGLB, makeRenderer, studio, bounds, framing, runLoop, loaderUI, fallback, webglOK, tuneMaterials, damp, dampV, fromBlender, ACCENT, partPalette, paintParts } from './core.js';

const FLOW = { oil: ['#ffb23e', 'Crude oil'], gas: ['#3fd8ff', 'Gas'], flare: ['#ff4a1a', 'Flare relief'], water: ['#4aa8ff', 'Water'], power: ['#ffe14a', 'Power'], steam: ['#e8eef5', 'Steam'], product: ['#3ddc97', 'Product'] };
let INFO = null;
const info = () => (INFO ||= fetch('/assets/data/plant-info.json').then((r) => r.json()).catch(() => ({})));
const parsePath = (p) => { try { return (typeof p === 'string' ? JSON.parse(p) : p).map(fromBlender); } catch { return []; } };
const slash = (h) => (h && h.startsWith('/') && !h.endsWith('/') ? h.replace(/(#|$)/, '/$1') : h);

function flowMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(color) }, uLen: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uT; uniform vec3 uC; uniform float uLen; varying vec2 vUv; void main(){ float s = fract(vUv.x * uLen * .12 - uT * 1.2); float pulse = smoothstep(.0,.15,s) * smoothstep(.55,.15,s); float a = .18 + pulse * .9; gl_FragColor = vec4(uC * (0.6 + pulse * 1.6), a); }',
  });
}

function spriteTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (kind === 'smoke') { grd.addColorStop(0, 'rgba(200,205,212,.55)'); grd.addColorStop(1, 'rgba(200,205,212,0)'); }
  else { grd.addColorStop(0, 'rgba(255,240,200,1)'); grd.addColorStop(0.3, 'rgba(255,150,40,.85)'); grd.addColorStop(1, 'rgba(255,60,10,0)'); }
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// simple sprite particle emitter for flames and smoke
function emitter(kind, size) {
  const n = kind === 'smoke' ? 26 : 36;
  const group = new THREE.Group();
  const mat = new THREE.SpriteMaterial({ map: spriteTex(kind), transparent: true, depthWrite: false, blending: kind === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending });
  const ps = Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(mat.clone()); s.userData.age = i / n; group.add(s); return s; });
  const life = kind === 'smoke' ? 6 : 0.9;
  const rise = kind === 'smoke' ? size * 1.2 : size * 1.6;
  if (kind !== 'smoke') { const l = new THREE.PointLight(0xff7a2a, size * 6, size * 12, 1.6); l.position.y = size * 0.5; group.add(l); group.userData.light = l; }
  group.userData.tick = (dt, t) => {
    ps.forEach((s, i) => {
      let a = (s.userData.age += dt / life);
      if (a > 1) a = s.userData.age = a - 1;
      const sway = Math.sin(t * 2 + i) * size * 0.08 * a;
      s.position.set(sway + (kind === 'smoke' ? a * size * 0.8 : 0), a * rise, Math.cos(t * 1.7 + i) * size * 0.06 * a);
      const sc = kind === 'smoke' ? size * (0.5 + a * 2.2) : size * (1 - a * 0.7) * (0.8 + Math.sin(t * 20 + i) * 0.1);
      s.scale.setScalar(sc);
      s.material.opacity = kind === 'smoke' ? (1 - a) * 0.5 : (1 - a);
    });
    if (group.userData.light) group.userData.light.intensity = size * (5 + Math.sin(t * 17) * 1.5 + Math.sin(t * 7.3));
  };
  return group;
}

export default async function plantScene(root) {
  let scenes = [];
  try { scenes = JSON.parse(root.dataset.scenes); } catch {}
  if (!scenes.length) return;
  let groups = {};
  try { groups = JSON.parse(root.dataset.groups || '{}'); } catch {}
  if (!webglOK) return fallback(root, null);

  // ui
  root.innerHTML = '';
  const bar = document.createElement('div'); bar.className = 'x-p3d__bar';
  const legend = document.createElement('div'); legend.className = 'x-p3d__legend';
  const zoomUI = document.createElement('div'); zoomUI.className = 'x-p3d__zoom';
  zoomUI.innerHTML = '<button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="home" aria-label="Reset view">↺</button>';
  const list = document.createElement('nav'); list.className = 'x-p3d__list'; list.setAttribute('aria-label', 'Products in this scene');
  const hint = document.createElement('div'); hint.className = 'x-p3d__hint'; hint.textContent = 'Drag to turn · scroll or pinch to zoom · tap any steel to open it';
  const tip = document.createElement('div'); tip.className = 'x-tip';
  const labelLayer = document.createElement('div'); labelLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden';
  root.append(bar, legend, zoomUI, list, hint, tip, labelLayer);
  root.setAttribute('data-lenis-prevent', '');

  const renderer = makeRenderer(root);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe4edf8, 320, 1000);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 4000);
  studio(renderer, scene, { env: 0.75 });
  const sun = new THREE.DirectionalLight(0xffe6c8, 2.2); sun.position.set(120, 200, 80); scene.add(sun);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, maxPolarAngle: Math.PI * 0.47, autoRotate: true, autoRotateSpeed: 0.35, zoomSpeed: 0.8 });

  const opts = { labels: true, flow: true, fx: true, rotate: true };
  const left = document.createElement('div'), right = document.createElement('div');
  if (scenes.length > 1) left.innerHTML = scenes.map((s, i) => `<button type="button" data-scene="${i}" aria-pressed="${i === 0}">${s.label}</button>`).join('');
  else left.innerHTML = `<button type="button" aria-pressed="true" tabindex="-1">${scenes[0].label}</button>`;
  right.innerHTML = [['labels', 'Labels'], ['flow', 'Flow'], ['fx', 'Effects'], ['rotate', 'Rotate']].map(([k, l]) => `<button type="button" data-opt="${k}" aria-pressed="true">${l}</button>`).join('');
  bar.append(left, right);

  const ui = loaderUI(root, 'Loading the site');
  const meta = await info();
  let cur = null;
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const want = { pos: new THREE.Vector3(), target: new THREE.Vector3(), active: false };
  let home = null;

  async function load(i) {
    if (cur) { scene.remove(cur.root); labelLayer.innerHTML = ''; }
    ui.set(0);
    root.querySelector('.x-gl-load')?.classList.remove('is-done');
    let g;
    try { g = await loadGLB(scenes[i].src, (p) => ui.set(p)); } catch { ui.fail('This 3D scene could not be loaded.'); return; }
    ui.done();
    const m = g.scene;
    tuneMaterials(m, { env: 0.9 });
    const products = new Map(), flows = [], fxs = [], anims = [], partColor = partPalette();
    m.traverse((o) => {
      const e = o.userData || {};
      if (/^ENV_Sky/.test(o.name) || e.fx === 'none') o.visible = false;
      if (e.kind === 'product' && e.href) {
        const key = e.href;
        if (!products.has(key)) products.set(key, { href: key, label: e.label, objs: [], mats: [] });
        const p = products.get(key);
        p.objs.push(o);
        o.traverse((mm) => {
          if (!mm.isMesh) return;
          mm.material = mm.material.clone();
          mm.userData.product = key;
        });
        // each product in signal colours, part by part, so it stands out from the site around it
        paintParts(o, partColor);
        o.traverse((mm) => {
          if (!mm.isMesh) return;
          mm.material.userData.e0 = mm.material.emissive?.clone();
          p.mats.push(mm.material);
        });
      } else if (e.path && e.kind && FLOW[e.kind]) {
        const pts = parsePath(e.path);
        if (pts.length > 1) {
          const curve = new THREE.CurvePath();
          for (let k = 1; k < pts.length; k++) if (pts[k].distanceTo(pts[k - 1]) > 0.01) curve.add(new THREE.LineCurve3(pts[k - 1], pts[k]));
          const len = curve.getLength();
          const mat = flowMaterial(FLOW[e.kind][0]);
          mat.uniforms.uLen.value = len;
          const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, Math.round(len / 2)), 0.55, 6, false), mat);
          tube.userData.kind = e.kind;
          flows.push(tube);
        }
      } else if (e.anim) anims.push({ o, e, home: o.position.clone(), rot: o.rotation.clone(), path: e.path ? parsePath(e.path) : null, d: 0 });
      if (e.fx === 'flame' || e.fx === 'smoke' || e.fx === 'glow') fxs.push({ o, e });
      if (e.fx === 'water') o.traverse((mm) => { if (mm.isMesh) { mm.material = mm.material.clone(); mm.material.transparent = true; mm.material.opacity = 0.82; mm.userData.water = true; } });
    });
    const rootG = new THREE.Group();
    rootG.add(m);
    flows.forEach((f) => rootG.add(f));
    fxs.forEach(({ o, e }) => {
      const em = emitter(e.fx === 'smoke' ? 'smoke' : 'flame', (e.size || 5) * (e.fx === 'glow' ? 0.6 : 1));
      o.getWorldPosition(em.position);
      em.userData.isFx = true;
      rootG.add(em);
      e.em = em;
    });
    scene.add(rootG);

    // legend
    const kinds = [...new Set(flows.map((f) => f.userData.kind))];
    legend.hidden = !kinds.length;
    legend.innerHTML = kinds.map((k) => `<span><i style="background:${FLOW[k][0]}"></i>${FLOW[k][1]}</span>`).join('');

    // product list, grouped
    const byGroup = {};
    for (const p of products.values()) {
      const inf = meta[p.href] || {};
      p.info = inf;
      const grp = groups[p.href] || inf.g || 'Products';
      (byGroup[grp] ||= []).push(p);
    }
    list.innerHTML = Object.entries(byGroup).map(([gname, ps]) => `<small>${gname}</small>${ps.map((p) => `<a href="${slash(p.href)}" data-p="${p.href}">${p.info.t || p.label}</a>`).join('')}`).join('');
    list.hidden = !products.size;

    // labels: one pill per product, at the top of its first instance
    const tmpBox = new THREE.Box3();
    for (const p of products.values()) {
      tmpBox.makeEmpty(); tmpBox.expandByObject(p.objs[0]);
      p.anchor = new THREE.Vector3((tmpBox.min.x + tmpBox.max.x) / 2, tmpBox.max.y, (tmpBox.min.z + tmpBox.max.z) / 2);
      p.box = new THREE.Box3(); p.objs.forEach((o) => p.box.expandByObject(o));
      const el = document.createElement('span');
      el.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-100%);padding:4px 9px;border-radius:100px;font:600 11px Manrope,sans-serif;white-space:nowrap;color:#0d1b2e;background:rgba(255,255,255,.92);border:1px solid rgba(255,122,26,.55);box-shadow:0 6px 18px -8px rgba(16,38,74,.4);transition:opacity .3s';
      el.textContent = p.info.t || p.label;
      labelLayer.appendChild(el);
      p.el = el;
    }

    // frame the steel, not the ground plane and terrain around it
    const B = bounds(m);
    const pb = new THREE.Box3();
    for (const p of products.values()) pb.union(p.box);
    const PB = pb.isEmpty() ? B : { center: pb.getCenter(new THREE.Vector3()), radius: pb.getSize(new THREE.Vector3()).length() / 2 };
    home = framing(camera, PB.center, PB.radius * 0.8, { dir: new THREE.Vector3(1, 0.8, 1.1), pad: 1 });
    camera.position.copy(home.pos).multiplyScalar(1.4);
    controls.target.copy(home.target);
    controls.maxDistance = B.radius * 3;
    controls.minDistance = B.radius * 0.08;
    scene.fog.near = B.radius * 2.2; scene.fog.far = B.radius * 6;
    want.pos.copy(home.pos); want.target.copy(home.target); want.active = true;
    cur = { root: rootG, products, flows, fxs, anims, R: B.radius };
    applyOpts();
  }

  function applyOpts() {
    if (!cur) return;
    cur.flows.forEach((f) => (f.visible = opts.flow));
    cur.fxs.forEach(({ e }) => e.em && (e.em.visible = opts.fx));
    controls.autoRotate = opts.rotate;
    labelLayer.style.display = opts.labels ? '' : 'none';
  }

  let hot = null;
  const setHot = (key) => {
    if (hot === key || !cur) return;
    hot = key;
    for (const p of cur.products.values()) p.mats.forEach((mat) => mat.emissive && mat.emissive.copy(p.href === key ? ACCENT : mat.userData.e0 || new THREE.Color(0)).multiplyScalar(p.href === key ? 0.55 : 1));
    list.querySelectorAll('a').forEach((a) => a.classList.toggle('is-hot', a.dataset.p === key));
    renderer.domElement.style.cursor = key ? 'pointer' : '';
  };
  const flyTo = (p) => {
    const c = p.box.getCenter(new THREE.Vector3()), r = Math.max(p.box.getSize(new THREE.Vector3()).length() / 2, cur.R * 0.05);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const f = framing(camera, c, r, { dir, pad: 2.2 });
    want.pos.copy(f.pos); want.target.copy(f.target); want.active = true;
  };

  bar.addEventListener('click', (e) => {
    const s = e.target.closest('[data-scene]');
    if (s) { bar.querySelectorAll('[data-scene]').forEach((b) => b.setAttribute('aria-pressed', b === s)); load(+s.dataset.scene); }
    const o = e.target.closest('[data-opt]');
    if (o) { opts[o.dataset.opt] = !opts[o.dataset.opt]; o.setAttribute('aria-pressed', opts[o.dataset.opt]); applyOpts(); }
  });
  zoomUI.addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]')?.dataset.z; if (!z || !cur) return;
    if (z === 'home') { want.pos.copy(home.pos); want.target.copy(home.target); want.active = true; return; }
    const off = camera.position.clone().sub(controls.target).multiplyScalar(z === 'in' ? 0.7 : 1.4);
    want.target.copy(controls.target); want.pos.copy(controls.target).add(off); want.active = true;
  });
  list.addEventListener('pointerover', (e) => { const a = e.target.closest('[data-p]'); if (a && cur) { setHot(a.dataset.p); flyTo(cur.products.get(a.dataset.p)); } });
  controls.addEventListener('start', () => (want.active = false));

  const pick = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const h = cur && ray.intersectObject(cur.root, true).find((x) => x.object.userData.product);
    return { key: h?.object.userData.product || null, x: e.clientX - r.left, y: e.clientY - r.top };
  };
  renderer.domElement.addEventListener('pointermove', (e) => {
    const { key, x, y } = pick(e);
    setHot(key);
    if (key) {
      const p = cur.products.get(key), inf = p.info || {};
      tip.innerHTML = `<small>${inf.g || 'Allmarc product'}</small><b>${inf.t || p.label}</b>${inf.s ? `<span>${inf.s}</span>` : ''}${inf.d ? `<span style="display:block;margin-top:6px;color:#8d9bab">${inf.d}</span>` : ''}<em>Click to open →</em>`;
      tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('is-on');
    } else tip.classList.remove('is-on');
  });
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const { key } = pick(e);
    if (key) location.href = slash(key);
  });
  renderer.domElement.addEventListener('pointerleave', () => { setHot(null); tip.classList.remove('is-on'); });

  await load(0);
  const v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), xa = new THREE.Vector3(1, 0, 0);
  runLoop(root, renderer, camera, (dt, t) => {
    if (!cur) return;
    if (want.active) {
      dampV(camera.position, want.pos, 2.2, dt); dampV(controls.target, want.target, 2.6, dt);
      if (camera.position.distanceTo(want.pos) < cur.R * 0.004) want.active = false;
    }
    controls.update();
    cur.flows.forEach((f) => (f.material.uniforms.uT.value = t));
    if (opts.fx) cur.fxs.forEach(({ e }) => e.em?.userData.tick(dt, t));
    cur.anims.forEach((a) => {
      const sp = a.e.speed || 0.5;
      switch (a.e.anim) {
        case 'spin': a.o.rotateOnAxis(up, dt * sp * Math.PI * 2); break;
        case 'spinx': a.o.rotateOnAxis(xa, dt * sp * Math.PI * 2); break;
        case 'luff': a.o.rotation.z = a.rot.z + Math.sin(t * 0.4) * 0.18; break;
        case 'crane': a.o.rotation.y = a.rot.y + Math.sin(t * 0.25) * 0.9; break;
        case 'heli': a.o.position.y = a.home.y + Math.sin(t * 1.2) * 0.6; break;
        case 'shuttle': a.o.position.x = a.home.x + Math.sin(t * 0.3) * 6; break;
        case 'path': if (a.path?.length > 1) {
          const pts = a.path; let total = 0; const seg = [];
          for (let k = 1; k < pts.length; k++) { const l = pts[k].distanceTo(pts[k - 1]); seg.push(l); total += l; }
          a.d = (a.d + dt * sp) % total; let d = a.d, k = 0;
          while (d > seg[k]) { d -= seg[k]; k++; }
          v.lerpVectors(pts[k], pts[k + 1], d / seg[k]);
          a.o.position.copy(v);
          a.o.lookAt(pts[k + 1].x, v.y, pts[k + 1].z);
        } break;
      }
    });
    if (opts.labels) {
      const w = root.clientWidth, h = root.clientHeight;
      // nearest labels win; any label that would overlap one already placed fades out
      const placed = [];
      const items = [...cur.products.values()].map((p) => { v.copy(p.anchor).project(camera); return { p, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h - 6, z: v.z, on: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 }; }).sort((a, b) => (a.p.href === hot ? -1 : b.p.href === hot ? 1 : a.z - b.z));
      for (const it of items) {
        const ew = (it.p.ew ||= it.p.el.offsetWidth || 120), eh = 24;
        const r = [it.x - ew / 2 - 4, it.y - eh - 2, it.x + ew / 2 + 4, it.y + 2];
        const free = it.on && !placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
        if (free) placed.push(r);
        it.p.el.style.opacity = free ? (hot && hot !== it.p.href ? 0.35 : 1) : 0;
        if (it.on) it.p.el.style.translate = `${it.x}px ${it.y}px`;
      }
    }
    renderer.render(scene, camera);
  });
}
