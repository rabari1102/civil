// Home hero: a steel space-frame truss that assembles node by node while a
// welding arc travels along it throwing sparks. Pure geometry, no downloads.
import { THREE, makeRenderer, runLoop, webglOK, damp } from './core.js';

export default function hero(host) {
  if (!webglOK) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = makeRenderer(host);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x090d12, 0.035);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 2.2, 15);

  scene.add(new THREE.HemisphereLight(0x9fc8ff, 0x1a0c05, 0.6));
  const key = new THREE.DirectionalLight(0xffe6cc, 2.2); key.position.set(5, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x3fd8ff, 1.6); rim.position.set(-8, 2, -5); scene.add(rim);
  const arcLight = new THREE.PointLight(0xff7a2a, 40, 9, 2); scene.add(arcLight);

  // truss: two chords of a warren girder curving through space, plus a roof lattice
  const rig = new THREE.Group(); scene.add(rig);
  const N = 22, span = 26, nodes = [], struts = [];
  const curve = (u, side, top) => new THREE.Vector3((u - 0.5) * span, (top ? 1.4 : -1.4) + Math.sin(u * Math.PI) * 1.2, side * 1.6 + Math.sin(u * 5) * 0.4);
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    for (const side of [-1, 1]) {
      nodes.push({ p: curve(u, side, true), u, i });
      nodes.push({ p: curve(Math.min(1, u + 0.5 / (N - 1)), side, false), u, i });
    }
  }
  const at = (i, side, top) => nodes[i * 4 + (side < 0 ? 0 : 2) + (top ? 0 : 1)];
  for (let i = 0; i < N; i++) {
    for (const s of [-1, 1]) {
      if (i < N - 1) { struts.push([at(i, s, true), at(i + 1, s, true)], [at(i, s, false), at(i + 1, s, false)], [at(i + 1, s, true), at(i, s, false)]); }
      struts.push([at(i, s, true), at(i, s, false)]);
    }
    struts.push([at(i, -1, true), at(i, 1, true)], [at(i, -1, false), at(i, 1, false)]);
    if (i < N - 1) struts.push([at(i, -1, true), at(i + 1, 1, true)]);
  }

  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa6b2, metalness: 0.9, roughness: 0.32 });
  const hot = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff6a1a, emissiveIntensity: 2.2, metalness: 0.6, roughness: 0.4 });
  const tube = new THREE.CylinderGeometry(0.045, 0.045, 1, 6, 1, true);
  const ball = new THREE.IcosahedronGeometry(0.13, 1);
  const strutMesh = new THREE.InstancedMesh(tube, steel, struts.length);
  const ballMesh = new THREE.InstancedMesh(ball, hot, nodes.length);
  rig.add(strutMesh, ballMesh);
  const up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3();
  const strutU = struts.map(([a, b]) => Math.max(a.u, b.u));

  // sparks
  const SP = 900;
  const sGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(SP * 3), vel = new Float32Array(SP * 3), life = new Float32Array(SP);
  sGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sGeo.setAttribute('life', new THREE.BufferAttribute(life, 1));
  const sMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { px: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float life; varying float vL; uniform float px; void main(){ vL=life; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=(2.+life*5.)*px*(8./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vL; void main(){ float d=length(gl_PointCoord-.5); if(d>.5||vL<=0.) discard; vec3 c=mix(vec3(1.,.25,.04),vec3(1.,.85,.5),vL); gl_FragColor=vec4(c,(1.-d*2.)*vL); }`,
  });
  const sparks = new THREE.Points(sGeo, sMat); rig.add(sparks);
  let si = 0;
  const emit = (p, n) => { for (let k = 0; k < n; k++) { const j = si++ % SP; pos[j * 3] = p.x; pos[j * 3 + 1] = p.y; pos[j * 3 + 2] = p.z; vel[j * 3] = (Math.random() - 0.5) * 4; vel[j * 3 + 1] = Math.random() * 4 + 0.5; vel[j * 3 + 2] = (Math.random() - 0.5) * 4; life[j] = 0.6 + Math.random() * 0.4; } };

  // dust field
  const D = 500, dGeo = new THREE.BufferGeometry(), dp = new Float32Array(D * 3);
  for (let i = 0; i < D; i++) { dp[i * 3] = (Math.random() - 0.5) * 50; dp[i * 3 + 1] = (Math.random() - 0.5) * 20; dp[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5; }
  dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: 0x5c7a96, size: 0.05, transparent: true, opacity: 0.6 }));
  scene.add(dust);

  let mx = 0, my = 0, build = reduce ? 1 : 0, sy = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  addEventListener('scroll', () => (sy = Math.min(1, scrollY / innerHeight)), { passive: true });
  const arc = new THREE.Vector3();

  runLoop(host, renderer, camera, (dt, t) => {
    build = Math.min(1.08, build + dt * 0.09);
    const front = build * 1.02;
    // struts grow in as the front passes them
    struts.forEach(([a, b], k) => {
      const g = THREE.MathUtils.clamp((front - strutU[k]) * 14, 0, 1);
      dir.subVectors(b.p, a.p); const len = dir.length();
      mid.copy(a.p).addScaledVector(dir, g * 0.5);
      q.setFromUnitVectors(up, dir.normalize());
      sc.set(g ? 1 : 0, len * g || 1e-4, g ? 1 : 0);
      strutMesh.setMatrixAt(k, m4.compose(mid, q, sc));
    });
    nodes.forEach((n, k) => {
      const g = THREE.MathUtils.clamp((front - n.u) * 10, 0, 1);
      sc.setScalar(g * (1 + Math.max(0, 1 - (front - n.u) * 6) * 0.8));
      q.identity();
      ballMesh.setMatrixAt(k, m4.compose(n.p, q, sc));
    });
    strutMesh.instanceMatrix.needsUpdate = ballMesh.instanceMatrix.needsUpdate = true;
    hot.emissiveIntensity = 1.4 + Math.sin(t * 3) * 0.3;

    // arc point: rides the build front, then patrols the girder
    const u = build < 1 ? front : 0.5 + Math.sin(t * 0.35) * 0.48;
    arc.copy(curve(THREE.MathUtils.clamp(u, 0, 1), Math.sin(t * 1.3) > 0 ? 1 : -1, Math.sin(t * 0.7) > 0));
    arcLight.position.copy(arc).applyMatrix4(rig.matrixWorld);
    arcLight.intensity = 30 + Math.random() * 30;
    if (!reduce) emit(arc, 6);
    for (let j = 0; j < SP; j++) {
      if (life[j] <= 0) continue;
      vel[j * 3 + 1] -= 9 * dt;
      pos[j * 3] += vel[j * 3] * dt; pos[j * 3 + 1] += vel[j * 3 + 1] * dt; pos[j * 3 + 2] += vel[j * 3 + 2] * dt;
      life[j] -= dt * 0.9;
    }
    sGeo.attributes.position.needsUpdate = sGeo.attributes.life.needsUpdate = true;

    dust.rotation.y = t * 0.01;
    rig.rotation.y = damp(rig.rotation.y, -0.35 + mx * 0.35 + t * 0.0, 2, dt);
    rig.rotation.x = damp(rig.rotation.x, 0.12 + my * 0.12, 2, dt);
    const wide = host.clientWidth > 900;
    rig.position.x = damp(rig.position.x, wide ? 6 : 1, 2, dt);
    camera.position.z = damp(camera.position.z, (wide ? 20 : 28) - sy * 4, 3, dt);
    camera.position.y = damp(camera.position.y, 2.2 - sy * 2, 3, dt);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
}
