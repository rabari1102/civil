// Kanbha works, modelled from the plant facts on the site: four sheds sized by
// floor area, the 5.5 lakh sq ft plot beside them, trucks on the yard road and
// the 80 T Goliath running along the InfraCon bays.
import { THREE, OrbitControls, makeRenderer, studio, framing, runLoop, webglOK, fallback, damp, dampV } from './core.js';

const PLANTS = [
  { k: 'u2', name: 'Unit 2', when: 'Since June 2025', area: '1.8 lakh sq ft', spec: 'Oil & gas and marine fabrication.', facts: [['Bay', '30 m wide, 11.5 m under the hook'], ['Company', 'Allmarc Industries Pvt Ltd']], w: 62, d: 270, h: 22, x: -70, z: 0, roof: 0xff7a1a, wall: 0xffe6d6, band: 0xffc21a },
  { k: 'u1', name: 'Unit 1', when: 'Since 2020', area: '1.25 lakh sq ft', spec: 'Structural steel for infrastructure and cement plants.', facts: [['Capacity', '1,500 T a month'], ['Company', 'Allmarc Industries Pvt Ltd']], w: 70, d: 165, h: 18, x: 10, z: -50, roof: 0x1d7af3, wall: 0xdcebff, band: 0x38bdf8 },
  { k: 'sc', name: 'Allmarc Scafform', when: 'Since 2023', area: '75,000 sq ft', spec: 'Heavy automobile, mining and railway components; scaffolding, formwork and Grip-Strut.', facts: [['Company', 'Allmarc Scafform Pvt Ltd (ASPL)']], w: 46, d: 150, h: 15, x: 10, z: 95, roof: 0x10b9a6, wall: 0xd6f5ef, band: 0xb7f04a },
  { k: 'jv', name: 'Allmarc AM InfraCon (JV)', when: 'Opening November 2026', area: '1.5 lakh sq ft', spec: 'Stainless girders, piers and pier caps for BMC flyovers.', facts: [['Bays', '2 bays, 200 m long'], ['Crane', '80 T Goliath'], ['Capacity', '2,000 T a month'], ['Partner', 'JV with Aakshya Infra']], w: 70, d: 200, h: 20, x: 95, z: 0, roof: 0x7c5cff, wall: 0xe8e2ff, band: 0xff4d6d },
  { k: 'ex', name: 'Available for expansion', when: 'Express interest', area: '5.5 lakh sq ft', spec: 'Land beside our plants for your project or product-specific advanced fabrication, next to our people, machines and certifications.', facts: [['Where', 'Kanbha, Ahmedabad, Gujarat']], w: 150, d: 330, x: 230, z: 10, plot: true },
];

function shed(p) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: p.wall || 0xdfe6ee, metalness: 0.2, roughness: 0.55 });
  const roofM = new THREE.MeshStandardMaterial({ color: p.roof, metalness: 0.3, roughness: 0.4 });
  const bandM = new THREE.MeshStandardMaterial({ color: p.band, emissive: p.band, emissiveIntensity: 0.25, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), wall);
  body.position.y = p.h / 2; body.castShadow = body.receiveShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.4, 2.2, p.d + 0.4), bandM);
  band.position.y = p.h - 3;
  // gable roof
  const rise = p.w * 0.12;
  const shape = new THREE.Shape([new THREE.Vector2(-p.w / 2 - 1, 0), new THREE.Vector2(0, rise), new THREE.Vector2(p.w / 2 + 1, 0)]);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: p.d + 2, bevelEnabled: false }), roofM);
  roof.position.set(0, p.h, -p.d / 2 - 1); roof.castShadow = true;
  // skylight strips
  const sky = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.55 });
  for (let i = -2; i <= 2; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 0.38, 6), sky);
    s.position.set(-p.w * 0.25, p.h + rise * 0.5 + 0.3, (i * p.d) / 5.5);
    s.rotation.set(-Math.PI / 2, 0, 0); s.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0);
    s.rotation.x = -Math.PI / 2; s.rotation.y = Math.atan2(rise, p.w / 2);
    g.add(s);
  }
  // doors at the ends
  const doorM = new THREE.MeshStandardMaterial({ color: 0x2f4a6e, roughness: 0.8 });
  [-1, 1].forEach((sd) => { const d = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 0.45, p.h * 0.7), doorM); d.position.set(0, p.h * 0.35, sd * (p.d / 2 + 0.05)); if (sd < 0) d.rotation.y = Math.PI; g.add(d); });
  g.add(body, band, roof);
  g.userData.meshes = [body, roof, band];
  return g;
}

function plot(p) {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), new THREE.MeshBasicMaterial({ color: 0xff5a12, transparent: true, opacity: 0.08 }));
  fill.rotation.x = -Math.PI / 2; fill.position.y = 0.2;
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, b]) => new THREE.Vector3((a * p.w) / 2, 0.4, (b * p.d) / 2));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffb23e, dashSize: 6, gapSize: 4 }));
  line.computeLineDistances();
  // survey pegs
  const pegM = new THREE.MeshStandardMaterial({ color: 0xffb23e, emissive: 0xff5a12, emissiveIntensity: 0.6 });
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 8, 8), pegM); peg.position.set((a * p.w) / 2, 4, (b * p.d) / 2); g.add(peg); });
  g.add(fill, line);
  g.userData.meshes = [fill];
  g.userData.fill = fill;
  return g;
}

function truck() {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 3), new THREE.MeshStandardMaterial({ color: 0xff5a12, roughness: 0.4 }));
  cab.position.set(0, 2, 7.5);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 12), new THREE.MeshStandardMaterial({ color: 0x1d7af3, roughness: 0.5 }));
  bed.position.y = 1.2;
  const load = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.7, roughness: 0.3 }));
  load.position.y = 2.5;
  g.add(cab, bed, load);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

export default function campus(host) {
  if (!webglOK) return fallback(host, null);
  host.innerHTML = '';
  host.setAttribute('data-lenis-prevent', '');
  const renderer = makeRenderer(host, { shadows: true });
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe6f1fd, 900, 2600);
  renderer.toneMappingExposure = 1.1;
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 4000);
  studio(renderer, scene, { env: 1 });
  scene.add(new THREE.HemisphereLight(0xe6f2ff, 0x8a9a7a, 1.15));
  const sun = new THREE.DirectionalLight(0xffe2c0, 2.6);
  sun.position.set(-260, 340, 180); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, far: 1200 });
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, maxPolarAngle: Math.PI * 0.44, minDistance: 120, maxDistance: 1100, autoRotate: true, autoRotateSpeed: 0.25 });

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: 0xb9d3a6, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(330, 380), new THREE.MeshStandardMaterial({ color: 0xc9d2dc, roughness: 0.95 }));
  yard.rotation.x = -Math.PI / 2; yard.position.set(15, 0.05, 10); yard.receiveShadow = true; scene.add(yard);
  const grid = new THREE.GridHelper(2400, 120, 0x93aac4, 0xa9bdd2); grid.position.y = 0.1; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
  // road ring for trucks
  const road = [[-120, -175], [150, -175], [150, 195], [-120, 195]].map(([x, z]) => new THREE.Vector3(x, 0.3, z));
  road.push(road[0].clone());
  const roadM = new THREE.MeshStandardMaterial({ color: 0x7d8896, roughness: 0.9 });
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], len = a.distanceTo(b);
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(10, len + 10), roadM);
    seg.rotation.x = -Math.PI / 2; seg.rotation.z = -Math.atan2(b.x - a.x, b.z - a.z);
    seg.position.set((a.x + b.x) / 2, 0.12, (a.z + b.z) / 2); seg.receiveShadow = true; scene.add(seg);
  }
  // steel stock in the yard
  const stockM = ['#ff6a1a', '#3f7bff', '#22b8a6', '#ffc21a', '#a46bff'].map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.25, roughness: 0.45 }));
  for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 14 + Math.random() * 10), stockM[(i % 6) % stockM.length]); s.position.set(-20 + (i % 6) * 4, 0.75 + Math.floor(i / 13) * 1.5, 150 + (i % 13) * 1.2); s.castShadow = true; scene.add(s); }

  const objs = PLANTS.map((p) => {
    const g = p.plot ? plot(p) : shed(p);
    g.position.set(p.x, 0, p.z);
    g.traverse((o) => { if (o.isMesh) { o.userData.k = p.k; if (!p.plot) o.castShadow = true; } });
    scene.add(g);
    // floating marker
    const pin = new THREE.Mesh(new THREE.OctahedronGeometry(3.4), new THREE.MeshStandardMaterial({ color: p.band || 0xffb23e, emissive: p.band || 0xff5a12, emissiveIntensity: 0.8 }));
    pin.position.set(p.x, (p.h || 0) + 26, p.z);
    pin.userData.k = p.k;
    scene.add(pin);
    return { p, g, pin };
  });

  // Goliath crane on InfraCon
  const jv = PLANTS[3];
  const gol = new THREE.Group();
  const yel = new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.3, roughness: 0.5 });
  const legGeo = new THREE.BoxGeometry(1.6, 26, 1.6);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = new THREE.Mesh(legGeo, yel); l.position.set(a * (jv.w / 2 + 14), 13, b * 3); gol.add(l); });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(jv.w + 32, 2.4, 8), yel); beam.position.y = 26.5; gol.add(beam);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 7), new THREE.MeshStandardMaterial({ color: 0xe8505b, roughness: 0.4 })); trolley.position.y = 29; gol.add(trolley);
  gol.traverse((o) => o.isMesh && (o.castShadow = true));
  gol.position.set(jv.x, 0, jv.z);
  scene.add(gol);

  const trucks = [0, 0.33, 0.66].map((off) => { const t = truck(); scene.add(t); return { t, off }; });
  let roadLen = 0; const segs = [];
  for (let i = 1; i < road.length; i++) { const l = road[i].distanceTo(road[i - 1]); segs.push(l); roadLen += l; }
  const along = (u, out) => { let d = (((u % 1) + 1) % 1) * roadLen, k = 0; while (d > segs[k]) { d -= segs[k]; k++; } return out.lerpVectors(road[k], road[k + 1], d / segs[k]), road[k + 1]; };

  // card + tabs
  const card = document.createElement('div'); card.className = 'x-plant__card';
  const tabs = document.createElement('div'); tabs.className = 'x-plant__tabs';
  tabs.innerHTML = PLANTS.map((p) => `<button type="button" data-k="${p.k}" aria-pressed="false">${p.name.replace(' (JV)', '')}</button>`).join('');
  const tip = document.createElement('div'); tip.className = 'x-tip';
  host.append(card, tabs, tip);

  const want = { pos: new THREE.Vector3(), target: new THREE.Vector3(), active: true };
  const homeF = framing(camera, new THREE.Vector3(70, 0, 10), 215, { dir: new THREE.Vector3(-0.9, 0.85, 1.2), pad: 0.95 });
  camera.position.copy(homeF.pos).multiplyScalar(1.5); controls.target.copy(homeF.target);
  want.pos.copy(homeF.pos); want.target.copy(homeF.target);
  let sel = null;
  const select = (k, fly = true) => {
    sel = k;
    const o = objs.find((x) => x.p.k === k), p = o.p;
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === k));
    card.innerHTML = `<small>${p.when}</small><b>${p.name}</b><p>${p.spec}</p><dl><dt>Area</dt><dd>${p.area}</dd>${p.facts.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>${p.plot ? '<p style="margin:12px 0 0"><a class="x-link" href="/contact/?enquiry=Expression%20of%20interest%3A%20space%20at%20Kanbha">Express interest<i></i></a></p>' : ''}`;
    if (fly) {
      const c = new THREE.Vector3(p.x, (p.h || 0) / 2, p.z);
      const f = framing(camera, c, Math.max(p.w, p.d) * 0.62, { dir: camera.position.clone().sub(controls.target).normalize(), pad: 1.1 });
      want.pos.copy(f.pos); want.target.copy(f.target); want.active = true;
    }
  };
  tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { controls.autoRotate = false; select(b.dataset.k); } });
  controls.addEventListener('start', () => { want.active = false; controls.autoRotate = false; });

  const ray = new THREE.Raycaster(), m = new THREE.Vector2();
  const pick = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(m, camera);
    const h = ray.intersectObjects(objs.flatMap((o) => [o.g, o.pin]), true).find((x) => x.object.userData.k);
    return [h?.object.userData.k, e.clientX - r.left, e.clientY - r.top];
  };
  renderer.domElement.addEventListener('pointermove', (e) => {
    const [k, x, y] = pick(e);
    renderer.domElement.style.cursor = k ? 'pointer' : '';
    if (k) { const p = PLANTS.find((q) => q.k === k); tip.innerHTML = `<small>${p.when}</small><b>${p.name}</b><span>${p.area}</span><em>Click for details</em>`; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('is-on'); }
    else tip.classList.remove('is-on');
  });
  renderer.domElement.addEventListener('click', (e) => { const [k] = pick(e); if (k) { controls.autoRotate = false; select(k); } });
  select('u2', false);

  const tmp = new THREE.Vector3();
  runLoop(host, renderer, camera, (dt, t) => {
    if (want.active) { dampV(camera.position, want.pos, 2, dt); dampV(controls.target, want.target, 2.4, dt); if (camera.position.distanceTo(want.pos) < 1) want.active = false; }
    controls.update();
    objs.forEach(({ p, pin, g }) => {
      pin.rotation.y += dt * 1.5;
      pin.position.y = (p.h || 0) + 26 + Math.sin(t * 2 + p.x) * 2;
      pin.scale.setScalar(damp(pin.scale.x, sel === p.k ? 1.7 : 1, 6, dt));
      if (g.userData.fill) g.userData.fill.material.opacity = 0.07 + Math.sin(t * 2) * 0.04 + (sel === p.k ? 0.08 : 0);
    });
    gol.position.z = jv.z + Math.sin(t * 0.15) * (jv.d / 2 - 10);
    trolley.position.x = Math.sin(t * 0.4) * (jv.w / 2);
    trucks.forEach((tr) => { const next = along(t * 0.012 + tr.off, tmp); tr.t.position.copy(tmp); tr.t.lookAt(next.x, tmp.y, next.z); });
    renderer.render(scene, camera);
  });
}
