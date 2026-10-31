// Turntable viewer used by cover heroes and small industry viewers.
import { THREE, OrbitControls, loadGLB, makeRenderer, studio, bounds, framing, runLoop, loaderUI, fallback, webglOK, tuneMaterials, paintModel, damp } from './core.js';

export async function turntable(host, url, { offsetX = 0, poster, interactive = true, zoom = false, label = 'Loading model', onLive } = {}) {
  if (!webglOK) return fallback(host, poster);
  host.querySelector('canvas')?.remove();
  const renderer = makeRenderer(host);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 3000);
  studio(renderer, scene);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, enableZoom: zoom, enablePan: false, autoRotate: true, autoRotateSpeed: 0.7, enabled: interactive });
  const ui = loaderUI(host, label);
  let g;
  try { g = await loadGLB(url, (p) => ui.set(p)); } catch { ui.fail(''); return; }
  ui.done();
  const m = g.scene;
  tuneMaterials(m, { env: 1.1 });
  paintModel(m);
  const pivot = new THREE.Group();
  pivot.add(m);
  scene.add(pivot);
  const B = bounds(m);
  m.position.sub(B.center);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(B.radius * 1.05, 64), new THREE.MeshBasicMaterial({ color: 0xff5a12, transparent: true, opacity: 0.08 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -B.size.y / 2 - 0.001;
  pivot.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(B.radius * 1.03, B.radius * 1.05, 128), new THREE.MeshBasicMaterial({ color: 0xffb23e, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = floor.position.y;
  pivot.add(ring);

  const f = framing(camera, new THREE.Vector3(), B.radius, { dir: new THREE.Vector3(1, 0.5, 1.2), pad: offsetX ? 1.45 : 1.1 });
  camera.position.copy(f.pos).multiplyScalar(1.8);
  controls.target.set(0, 0, 0);
  let mx = 0, my = 0, intro = 0, shift = 0;
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; });
  onLive?.();
  runLoop(host, renderer, camera, (dt, t) => {
    intro = damp(intro, 1, 1.6, dt);
    camera.position.lerp(f.pos, intro * 0.04);
    // slide the projection so the model sits in the right part of the frame, clear of the text
    const w = host.clientWidth, h = host.clientHeight;
    shift = damp(shift, w > 900 ? w * Math.min(offsetX, 0.9) * 0.3 : 0, 3, dt);
    if (w && h) camera.setViewOffset(w, h, -shift, 0, w, h);
    pivot.position.y = Math.sin(t * 0.8) * B.radius * 0.015;
    pivot.rotation.x = damp(pivot.rotation.x, my * 0.12, 3, dt);
    ring.material.opacity = 0.3 + Math.sin(t * 2) * 0.15;
    controls.autoRotateSpeed = damp(controls.autoRotateSpeed, 0.7 + mx * 1.2, 2, dt);
    controls.update();
    renderer.render(scene, camera);
  });
}
