// Product stage: a sticky 3D model beside a column of scroll steps. Each step
// names the parts it is about (data-parts = part labels stored in the GLB
// extras); the camera flies to them, they glow, the rest turns to ghost steel.
import { THREE, OrbitControls, loadGLB, makeRenderer, studio, bounds, framing, runLoop, loaderUI, fallback, webglOK, tuneMaterials, damp, dampV, fromBlender, ACCENT, partPalette, paintMaterial } from './core.js';

export default async function stage(root) {
  const host = root.querySelector('.x-stage__canvas');
  const url = root.dataset.model;
  host.querySelector('canvas')?.remove();
  if (!webglOK) return fallback(host, null);

  const renderer = makeRenderer(host);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 2000);
  studio(renderer, scene);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enableZoom: false, enablePan: false, rotateSpeed: 0.7 });

  // HUD
  const hud = document.createElement('div');
  hud.className = 'x-stage__hud';
  hud.innerHTML = '<span>Step</span><b>01 <span>/ 01</span></b>';
  const chips = document.createElement('div');
  chips.className = 'x-stage__parts';
  const tip = document.createElement('div');
  tip.className = 'x-tip';
  host.append(hud, chips, tip);

  const ui = loaderUI(host);
  let gltf;
  try { gltf = await loadGLB(url, (p) => ui.set(p * 0.95)); } catch (e) { ui.fail('The 3D model could not be loaded.'); return; }
  ui.done();
  const model = gltf.scene;
  tuneMaterials(model, { env: 1.1 });
  scene.add(model);

  // ground glow + grid
  const B = bounds(model);
  const R = B.radius;
  const grid = new THREE.GridHelper(R * 6, 36, 0x9fb6d3, 0xc6d5e8);
  grid.position.y = B.box.min.y - R * 0.01;
  grid.material.transparent = true; grid.material.opacity = 0.7;
  scene.add(grid);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R * 1.4, 64), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.12 }));
  disc.rotation.x = -Math.PI / 2; disc.position.set(B.center.x, grid.position.y + 0.001, B.center.z);
  scene.add(disc);

  // parts
  const parts = [], partColor = partPalette();
  model.traverse((o) => {
    const ex = o.userData;
    if (!ex || !ex.label) return;
    for (let p = o.parent; p; p = p.parent) if (p.userData?.label) return;
    const mats = [], col = partColor(ex.label);
    o.traverse((m) => {
      if (!m.isMesh) return;
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
        paintMaterial(mat, col);
        mat.userData.base = { color: mat.color?.clone(), emissive: mat.emissive?.clone(), opacity: mat.opacity, transparent: mat.transparent };
        mats.push(mat);
      });
      m.userData.part = parts.length;
    });
    parts.push({ col, obj: o, label: ex.label, note: ex.note || '', group: ex.group || '', home: o.position.clone(), dir: ex.explode ? fromBlender(ex.explode) : new THREE.Vector3(), mats, glow: 0, ghost: 0 });
  });
  // explode scale: largest offset ≈ 40% of the model radius
  const maxLen = Math.max(...parts.map((p) => p.dir.length()), 1e-6);
  const exScale = (R * 0.42) / maxLen;
  // explode vectors are authored in world space; bring them into each part's parent space
  parts.forEach((p) => { if (p.obj.parent && p.obj.parent !== model) { const q = p.obj.parent.getWorldQuaternion(new THREE.Quaternion()).invert(); p.dir.applyQuaternion(q); } });

  // one chip per part name, with its paint colour as a swatch
  const chipCol = new Map(parts.map((p) => [p.label, p.col ? '#' + p.col.getHexString(THREE.SRGBColorSpace) : '#7d8794']));
  chips.innerHTML = [...chipCol].map(([l, c]) => `<span style="--c:${c}">${l}</span>`).join('');
  const chipEls = [...chips.children];

  // steps
  const steps = [...root.querySelectorAll('.x-stage__step')];
  const tools = Object.fromEntries([...root.querySelectorAll('[data-tool]')].map((b) => [b.dataset.tool, b]));
  const state = { step: 0, explode: 0, xray: false, spin: tools.spin?.getAttribute('aria-pressed') === 'true', userCam: false, hot: null };
  const want = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  const norm = (s) => s.toLowerCase().replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  const viewDirs = [new THREE.Vector3(1, 0.6, 1.15), new THREE.Vector3(-1, 0.55, 1), new THREE.Vector3(1.1, 0.9, -0.6), new THREE.Vector3(-0.8, 0.4, -1.1), new THREE.Vector3(0.2, 1.2, 1)];
  function aim(list) {
    const box = new THREE.Box3();
    (list.length ? list : parts.length ? parts : [{ obj: model }]).forEach((p) => box.expandByObject(p.obj));
    if (box.isEmpty()) box.setFromObject(model);
    const c = box.getCenter(new THREE.Vector3()), r = Math.max(box.getSize(new THREE.Vector3()).length() / 2, R * 0.25);
    const f = framing(camera, c, r, { dir: viewDirs[state.step % viewDirs.length], pad: list.length ? 1.35 : 1.15 });
    want.pos.copy(f.pos); want.target.copy(f.target);
  }

  function setStep(i) {
    state.step = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    const s = steps[i];
    const names = (s?.dataset.parts || '').split(/;|,(?! )/).map(norm).filter(Boolean);
    // exact label first; a few source pages name parts loosely ("Ladder" for "Ladder & Brackets")
    const match = (n, l) => n === l || (l.length > 3 && n.includes(l)) || (n.length > 3 && l.includes(n));
    const hits = parts.filter((p) => names.some((n) => n === norm(p.label))).concat(parts.filter((p) => !names.includes(norm(p.label)) && names.some((n) => match(n, norm(p.label)) && !parts.some((q) => norm(q.label) === n))));
    parts.forEach((p) => (p.on = hits.includes(p)));
    chipEls.forEach((c) => c.classList.toggle('is-on', hits.some((p) => norm(p.label) === norm(c.textContent))));
    const ex = parseFloat(s?.dataset.explode || '0');
    if (!(tools.explode?.getAttribute('aria-pressed') === 'true')) state.explode = isNaN(ex) ? 0 : Math.min(1, ex);
    hud.innerHTML = `<span>Step</span><b>${String(i + 1).padStart(2, '0')} <span>/ ${String(steps.length).padStart(2, '0')}</span></b>`;
    state.userCam = false;
    // aim after explode settles a little
    aim(hits);
  }

  const io = new IntersectionObserver((es) => {
    const vis = es.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (vis) setStep(steps.indexOf(vis.target));
  }, { rootMargin: '-42% 0px -42% 0px' });
  steps.forEach((s) => io.observe(s));

  // tools
  const press = (b, on) => b && b.setAttribute('aria-pressed', on);
  tools.explode?.addEventListener('click', () => { const on = tools.explode.getAttribute('aria-pressed') !== 'true'; press(tools.explode, on); state.explode = on ? 1 : parseFloat(steps[state.step]?.dataset.explode || 0); aim(parts.filter((p) => p.on)); });
  tools.xray?.addEventListener('click', () => { state.xray = tools.xray.getAttribute('aria-pressed') !== 'true'; press(tools.xray, state.xray); });
  tools.spin?.addEventListener('click', () => { state.spin = tools.spin.getAttribute('aria-pressed') !== 'true'; press(tools.spin, state.spin); });
  tools.reset?.addEventListener('click', () => { press(tools.explode, false); press(tools.xray, false); state.xray = false; state.explode = 0; parts.forEach((p) => (p.on = false)); chipEls.forEach((c) => c.classList.remove('is-on')); state.userCam = false; state.step = 0; aim([]); });
  controls.addEventListener('start', () => (state.userCam = true));

  // hover
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('pointermove', (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(model, true).find((h) => h.object.userData.part != null);
    state.hot = hit ? parts[hit.object.userData.part] : null;
    if (state.hot) {
      tip.innerHTML = `<small>${state.hot.group || 'Part'}</small><b>${state.hot.label}</b>${state.hot.note ? `<span>${state.hot.note}</span>` : ''}`;
      tip.style.left = e.clientX - r.left + 'px'; tip.style.top = e.clientY - r.top + 'px';
      tip.classList.add('is-on');
    } else tip.classList.remove('is-on');
  });
  renderer.domElement.addEventListener('pointerleave', () => { state.hot = null; tip.classList.remove('is-on'); });

  // initial camera
  setStep(0);
  camera.position.copy(want.pos).multiplyScalar(1.6);
  controls.target.copy(want.target);

  let ex = 0;
  const tmp = new THREE.Vector3();
  runLoop(host, renderer, camera, (dt, t) => {
    ex = damp(ex, state.explode, 4, dt);
    const anyOn = parts.some((p) => p.on);
    parts.forEach((p) => {
      p.obj.position.copy(p.home).addScaledVector(p.dir, ex * exScale);
      const g = p.on || p === state.hot ? 1 : 0;
      const ghost = state.xray ? (p.on ? 0 : 1) : anyOn && !p.on ? 0.65 : 0;
      p.glow = damp(p.glow, g, 6, dt);
      p.ghost = damp(p.ghost, ghost, 6, dt);
      p.mats.forEach((m) => {
        const b = m.userData.base;
        if (m.emissive) m.emissive.copy(b.emissive || tmp.set(0, 0, 0)).lerp(p.col || ACCENT, p.glow * (0.32 + 0.14 * Math.sin(t * 3)));
        const op = b.opacity * (1 - p.ghost * 0.82);
        m.transparent = b.transparent || op < 0.999;
        m.opacity = op;
        m.depthWrite = op > 0.6;
      });
    });
    if (!state.userCam) {
      dampV(camera.position, want.pos, 2.4, dt);
      dampV(controls.target, want.target, 2.8, dt);
    }
    if (state.spin && !state.userCam) {
      const off = camera.position.clone().sub(controls.target);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.12);
      camera.position.copy(controls.target).add(off);
      want.pos.sub(want.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.12).add(want.target);
    }
    controls.update();
    renderer.render(scene, camera);
  });
}
