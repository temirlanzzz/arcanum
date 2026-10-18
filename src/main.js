import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildWorld } from './world.js';
import { buildShop, hoverUniforms, makeProductMaterials } from './shop.js';
import { buildParts } from './products.js';
import { Flyer } from './controls.js';
import { BAYS, NAVE_HALF, BAY_HALF } from './layout.js';
import * as UI from './ui.js';

const PI = Math.PI;
const CAPTURE = new URLSearchParams(location.search).has('capture');
if (CAPTURE) document.body.classList.add('capture');
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('coarse');
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

// ---------------------------------------------------------------- renderer + scene
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, CAPTURE ? 1 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060c);
scene.fog = new THREE.FogExp2(0x0d0912, 0.0105);
const pmrem = new THREE.PMREMGenerator(renderer);
// A library-coloured environment for reflections: dusky vault above, warm floor below,
// a few candle-like hot spots and a cool stained-glass panel.
function libraryEnvironment() {
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y;
      vec3 top = vec3(0.10, 0.08, 0.20), mid = vec3(0.32, 0.22, 0.14), bot = vec3(0.12, 0.08, 0.05);
      vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, bot, smoothstep(0.0, -0.5, h));
      gl_FragColor = vec4(c, 1.0); }`
  }));
  env.add(sky);
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.6, 1.6) });
  for (const [x, y, z, r] of [[0, 30, -20, 4], [18, 12, 10, 2], [-20, 14, -6, 2.5], [6, 20, 24, 2], [-10, 26, 18, 2]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8), warm); m.position.set(x, y, z); env.add(m);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(14, 22), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.0, 2.2), side: THREE.DoubleSide }));
  glass.position.set(0, 16, -46); env.add(glass);
  const tex = pmrem.fromScene(env, 0.02).texture;
  return tex;
}
const envTex = libraryEnvironment();
scene.environment = envTex;
scene.environmentIntensity = 0.8;
scene.add(new THREE.HemisphereLight(0x8e94c8, 0x3a2614, 0.35));

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 320);
camera.position.set(0, 9, 4.5);

// Inspection happens in its own little scene, composited over a dimmed library.
const inspectScene = new THREE.Scene();
inspectScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
inspectScene.environmentIntensity = 0.9;
const key = new THREE.DirectionalLight(0xfff0dd, 2.6); key.position.set(2, 3, 2);
const rim = new THREE.DirectionalLight(0x9db8ff, 2.0); rim.position.set(-3, 1, -2);
inspectScene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.25));
inspectScene.visible = false;

class InspectPass extends Pass {
  constructor(sc, cam) { super(); this.sc = sc; this.cam = cam; this.needsSwap = false; }
  render(r, writeBuffer, readBuffer) {
    if (!this.sc.visible) return;
    r.setRenderTarget(this.renderToScreen ? null : readBuffer);
    const ac = r.autoClear; r.autoClear = false;
    r.clearDepth();
    r.render(this.sc, this.cam);
    r.autoClear = ac;
  }
}
const DimShader = {
  uniforms: { tDiffuse: { value: null }, uDim: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uDim; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = smoothstep(0.95, 0.25, length(d * vec2(1.2, 1.0)));
      c.rgb *= mix(0.62, 1.0, v);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, vec3(l) * vec3(0.55, 0.48, 0.7), uDim * 0.65) * (1.0 - uDim * 0.6);
      gl_FragColor = c; }`
};
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const dimPass = new ShaderPass(DimShader);
composer.addPass(dimPass);
composer.addPass(new InspectPass(inspectScene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.55, 0.86);
if (!new URLSearchParams(location.search).has('nobloom')) composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); composer.setSize(w, h);
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- build
let world, shop;
const flyer = new Flyer(camera, canvas);
flyer.enabled = false;

async function build() {
  UI.setLoading(0.05, 'Raising the nave…');
  await nextFrame();
  world = buildWorld(scene, renderer, p => UI.setLoading(p * 0.9));
  UI.setLoading(0.62, 'Stocking ten wings with treasures…');
  await nextFrame();
  shop = buildShop(scene, world.T.wood, p => UI.setLoading(p));
  UI.setLoading(0.92, 'Tying the price tags…');
  await nextFrame();
  renderer.compile(scene, camera);
  UI.setLoading(1, `${shop.listings.length} listings · ${world.stats.books.toLocaleString('en-US')} books`);
  window.__stats = { listings: shop.listings.length, books: world.stats.books, candles: world.stats.candles };
}

// ---------------------------------------------------------------- game rules
const QUESTS = [
  { id: 'kettle', text: 'Find a kettle under $40', xp: 60, test: c => c.inspected?.key === 'kettle' && c.inspected.price < 40 },
  { id: 'wings', text: 'Discover 4 wings', xp: 80, test: () => UI.state.visited.size >= 4, progress: () => `(${Math.min(4, UI.state.visited.size)}/4)` },
  { id: 'set', text: 'Inspect a piece of a furniture set', xp: 40, test: c => !!c.inspected?.setLabel },
  { id: 'bag', text: 'Put 3 treasures in your satchel', xp: 100, test: () => UI.state.satchel.length >= 3, progress: () => `(${Math.min(3, UI.state.satchel.length)}/3)` }
];

function wingTarget(b) {
  if (b < 0) return { pos: new THREE.Vector3(0, 9, 4), yaw: 0, pitch: -0.08 };
  const bay = BAYS[b];
  return { pos: new THREE.Vector3(bay.s * 7.2, 3.1, bay.zc), yaw: -bay.s * PI / 2, pitch: -0.07 };
}
function goWing(b) {
  if (inspect) closeInspect();
  const t = wingTarget(b);
  flyer.glideTo(t.pos, t.yaw, t.pitch, 2.6);
}
let currentWing = -1;
function updateWing() {
  const p = camera.position;
  let here = -1;
  for (const bay of BAYS) {
    if (Math.sign(p.x) === bay.s && Math.abs(p.x) > NAVE_HALF - 3.5 && Math.abs(p.z - bay.zc) < BAY_HALF) here = bay.b;
  }
  if (here !== currentWing) {
    currentWing = here;
    if (here >= 0 && !UI.state.visited.has(here)) {
      UI.state.visited.add(here);
      const cat = BAYS[here].cat;
      UI.toast(`<b>Wing discovered</b> — ${cat.glyph} ${cat.name} · <i>${cat.blurb}</i>`, 20);
      UI.gainXP(20);
      UI.checkQuests({});
    }
    UI.markNav(here, UI.state.visited);
  }
}

// ---------------------------------------------------------------- hover + inspect
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovered = null, mouse = null;
canvas.addEventListener('pointermove', e => { mouse = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' }; });
canvas.addEventListener('pointerleave', () => { mouse = null; });
function pickAt(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return shop.pick(ray.ray);
}
function updateHover() {
  if (inspect || flyer.glide || (!mouse && !flyer.locked) || (mouse && mouse.touch) || (flyer.dragging && flyer.moved > 4)) {
    if (hovered) { hovered = null; UI.hideTip(); canvas.classList.remove('hovering'); }
    if (!inspect) hoverUniforms.uHover.value = -1;
    return;
  }
  const x = flyer.locked ? innerWidth / 2 : mouse.x, y = flyer.locked ? innerHeight / 2 : mouse.y;
  const l = pickAt(x, y);
  hovered = l;
  hoverUniforms.uHover.value = l ? l.pid : -1;
  canvas.classList.toggle('hovering', !!l);
  if (l) UI.showTip(l, x, y); else UI.hideTip();
}

const cleanMats = {};
let inspect = null;
function buildInspectGroup(l) {
  if (!cleanMats.paint) Object.assign(cleanMats, makeProductMaterials(world.T.wood, false));
  const parts = buildParts(l.key, l.variant);
  const byMat = {};
  for (const p of parts) {
    const g = p.g;
    const c = new THREE.Color(p.c); if (p.m === 'glow') c.multiplyScalar(1.5);
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    (byMat[p.m] ||= []).push(g);
  }
  const inner = new THREE.Group();
  for (const [k, list] of Object.entries(byMat)) {
    const mesh = new THREE.Mesh(mergeGeometries(list), cleanMats[k]);
    if (k === 'glass') mesh.renderOrder = 2;
    inner.add(mesh);
  }
  const box = new THREE.Box3().setFromObject(inner), c = box.getCenter(new THREE.Vector3());
  inner.position.sub(c);              // pivot at the centre of the object
  const holder = new THREE.Group(); holder.add(inner);
  return { holder, size: box.getSize(new THREE.Vector3()), center: c };
}
// glowing pedestal ring under the inspected object
const halo = new THREE.Group();
{
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.8), transparent: true, opacity: 0.9 });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.006, 6, 96), ringMat);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.003, 6, 96), ringMat);
  r1.rotation.x = r2.rotation.x = PI / 2;
  halo.add(r1, r2);
  const motes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.012), ringMat, 24);
  halo.add(motes); halo.userData.motes = motes;
  inspectScene.add(halo);
}

function openInspect(l, sx, sy) {
  if (inspect || !l) return;
  const { holder, size, center } = buildInspectGroup(l);
  const unit = l.units[l.units.length - 1];
  const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
  unit.decompose(wp, wq, ws);
  const startPos = center.clone().applyMatrix4(unit);
  const fit = 0.5 / Math.max(size.x, size.y, size.z);
  inspect = { l, holder, t: 0, phase: 'in', startPos, startQuat: wq.clone(), startScale: ws.x, fit, dist: 1.25, rotY: 0, rotX: 0.15, velY: 0.6, spin: 0, out: null, flyT: 0 };
  // start orientation: face the camera
  inspect.rotY = 0;
  inspectScene.add(holder);
  inspectScene.visible = true;
  hoverUniforms.uHidden.value = l.pid;
  hoverUniforms.uHover.value = -1;
  flyer.enabled = false;
  UI.hideTip();
  UI.openCard(l);
  const first = !UI.state.inspected.has(l.pid);
  UI.state.inspected.add(l.pid);
  if (first) UI.gainXP(5, sx ?? innerWidth / 2, sy ?? innerHeight / 2);
  UI.checkQuests({ inspected: l });
}
function closeInspect() {
  if (!inspect || inspect.phase === 'out' || inspect.phase === 'bag') return;
  inspect.phase = 'out'; inspect.t = 0;
  UI.closeCard();
}
function addToSatchel() {
  if (!inspect || inspect.phase !== 'hold') return;
  const l = inspect.l;
  UI.state.satchel.push(l);
  inspect.phase = 'bag'; inspect.t = 0;
  const p = inspect.holder.position.clone().project(camera);
  const sx = (p.x * 0.5 + 0.5) * innerWidth, sy = (-p.y * 0.5 + 0.5) * innerHeight;
  UI.sparks(sx, sy, 24);
  UI.gainXP(15, sx, sy - 40);
  UI.closeCard();
  setTimeout(() => { UI.renderSatchel(true); UI.toast(`<b>Into the satchel</b> — ${l.name}`); UI.checkQuests({}); }, 700);
}
UI.bindStatic({ onAdd: addToSatchel, onClose: closeInspect });
addEventListener('keydown', e => {
  if (e.code === 'Escape') closeInspect();
  if (e.code === 'Enter' && inspect?.phase === 'hold') addToSatchel();
});
flyer.onClick = (x, y) => {
  if (inspect) return;
  const l = pickAt(x, y);
  if (l) openInspect(l, x, y);
};
flyer.onLock = locked => document.body.classList.toggle('locked', locked);
// drag-to-rotate and wheel-zoom while inspecting
{
  let dragging = false, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', e => { if (inspect) { dragging = true; lx = e.clientX; ly = e.clientY; } });
  addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointermove', e => {
    if (!inspect || !dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    inspect.velY = dx * 0.6; inspect.rotY += dx * 0.01;
    inspect.rotX = THREE.MathUtils.clamp(inspect.rotX + dy * 0.01, -1.2, 1.2);
  });
  canvas.addEventListener('wheel', e => { if (inspect) inspect.dist = THREE.MathUtils.clamp(inspect.dist + e.deltaY * 0.001, 0.7, 2.2); }, { passive: true });
}

const _f = new THREE.Vector3(), _target = new THREE.Vector3(), _q = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _e = new THREE.Euler();
const ease = t => 1 - Math.pow(1 - t, 3);
function updateInspect(dt, t) {
  const tDim = inspect && inspect.phase !== 'out' && inspect.phase !== 'bag' ? 1 : 0;
  dimPass.uniforms.uDim.value += (tDim - dimPass.uniforms.uDim.value) * (1 - Math.exp(-6 * dt));
  if (!inspect) { halo.visible = false; return; }
  const I = inspect;
  camera.getWorldDirection(_f);
  // place slightly right of centre on wide screens so the card does not cover it
  const rightShift = innerWidth > 760 ? -0.18 : 0;
  const up = innerWidth > 760 ? 0 : 0.12;
  const camRight = new THREE.Vector3().crossVectors(_f, camera.up).normalize();
  const camUp = new THREE.Vector3().crossVectors(camRight, _f).normalize();
  _target.copy(camera.position).addScaledVector(_f, I.dist).addScaledVector(camRight, rightShift * I.dist).addScaledVector(camUp, up * I.dist);
  if (I.phase !== 'hold') I.t = Math.min(1, I.t + dt / (I.phase === 'in' ? 0.75 : I.phase === 'bag' ? 0.8 : 0.6));
  if (I.phase === 'hold') { I.rotY += I.velY * dt * 0.02 + dt * 0.35; I.velY *= Math.exp(-3 * dt); }
  // orientation in hold: camera-facing frame + user rotation
  _q.copy(camera.quaternion).multiply(_qa.setFromEuler(_e.set(I.rotX, I.rotY, 0)));
  const s = I.fit;
  if (I.phase === 'in') {
    const k = ease(I.t);
    I.holder.position.lerpVectors(I.startPos, _target, k);
    I.holder.position.y += Math.sin(k * PI) * 0.25;
    I.holder.quaternion.slerpQuaternions(I.startQuat, _q, k);
    I.holder.scale.setScalar(THREE.MathUtils.lerp(I.startScale, s, k));
    if (I.t >= 1) I.phase = 'hold';
  } else if (I.phase === 'hold') {
    I.holder.position.copy(_target);
    I.holder.quaternion.copy(_q);
    I.holder.scale.setScalar(s);
  } else if (I.phase === 'out') {
    const k = ease(I.t);
    I.holder.position.lerpVectors(_target, I.startPos, k);
    I.holder.quaternion.slerpQuaternions(_q, I.startQuat, k);
    I.holder.scale.setScalar(THREE.MathUtils.lerp(s, I.startScale, k));
    if (I.t >= 1) finishInspect();
  } else if (I.phase === 'bag') {
    // shrink and arc into the satchel corner
    const k = I.t * I.t;
    const corner = new THREE.Vector3(0.88, 0.85, 0.5).unproject(camera);
    const corner2 = camera.position.clone().add(corner.sub(camera.position).normalize().multiplyScalar(I.dist));
    I.holder.position.lerpVectors(_target, corner2, k);
    I.holder.rotation.y += dt * 12;
    I.holder.scale.setScalar(s * (1 - k * 0.95));
    if (I.t >= 1) finishInspect();
  }
  // halo under the object
  halo.visible = I.phase === 'hold' || I.phase === 'in';
  if (halo.visible) {
    halo.position.copy(_target).addScaledVector(camUp, -0.3);
    halo.quaternion.copy(camera.quaternion);
    halo.rotateX(-0.25);
    halo.children[0].rotation.z = t * 0.6; halo.children[1].rotation.z = -t * 0.4;
    const k = I.phase === 'in' ? ease(I.t) : 1;
    halo.scale.setScalar(0.4 + 0.6 * k);
    const motes = halo.userData.motes, dmy = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const a = t * 0.8 + (i / 24) * PI * 2;
      dmy.position.set(Math.cos(a) * 0.46, Math.sin(t * 2 + i) * 0.08 + ((i * 37) % 10) / 10 * 0.5, Math.sin(a) * 0.46);
      dmy.rotation.set(t + i, t, 0); dmy.updateMatrix();
      motes.setMatrixAt(i, dmy.matrix);
    }
    motes.instanceMatrix.needsUpdate = true;
  }
}
function finishInspect() {
  inspectScene.remove(inspect.holder);
  inspect.holder.traverse(o => o.geometry?.dispose());
  inspect = null;
  inspectScene.visible = false;
  hoverUniforms.uHidden.value = -1;
  flyer.enabled = true;
}

// ---------------------------------------------------------------- loop
let time = 0;
function frame(dt) {
  time += dt;
  hoverUniforms.uTime.value = time;
  if (!CAPTURE) flyer.update(dt);
  world.update(time, dt, renderer.domElement.height, camera.position);
  shop.updateTags(time, camera.position);
  updateInspect(dt, time);
  updateHover();
  updateWing();
  composer.render(dt);
}

// Scripted camera for the capture: the nave, a glide into Electronics, an inspection.
const KEYS = [
  [0.0, [0, 11.5, 4.6], 0.0, -0.13],
  [2.4, [0.6, 7.6, -5.5], -0.12, -0.1],
  [4.3, [6.2, 3.6, -9.6], -1.05, -0.07],
  [6.0, [15.4, 1.95, -9.9], -PI / 2, -0.1],
  [7.5, [16.2, 1.85, -9.9], -PI / 2 - 0.02, -0.1],
  [10.5, [16.8, 1.8, -10.1], -PI / 2 - 0.05, -0.09]
];
const curve = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k[1])), false, 'centripetal');
function cinematic(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, , y0, p0] = KEYS[i], [t1, , y1, p1] = KEYS[i + 1];
  const u = THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1);
  const su = u * u * (3 - 2 * u);
  camera.position.copy(curve.getPoint((i + su) / (KEYS.length - 1)));
  flyer.yaw = y0 + (y1 - y0) * su; flyer.pitch = p0 + (p1 - p0) * su;
  flyer.apply();
}
let capEvents = null;
function captureStep(dt) {
  const t = time + dt;
  cinematic(t);
  if (!capEvents) {
    const cands = shop.listings.filter(l => l.cat.id === 'electronics' && ['headphones', 'laptop', 'orb', 'vr'].includes(l.key));
    capEvents = { hoverAt: 5.7, openAt: 6.6, addAt: 8.7, target: null, cands };
  }
  if (t >= capEvents.hoverAt && !capEvents.target) {
    // pick the candidate closest to the centre of view
    camera.updateMatrixWorld();
    let best = null, bd = 1e9;
    for (const l of capEvents.cands) {
      const c = l.worldBox.getCenter(new THREE.Vector3()).project(camera);
      if (c.z > 1) continue;
      const d = Math.hypot(c.x - 0.15, c.y + 0.05);
      if (d < bd) { bd = d; best = l; }
    }
    capEvents.target = best;
  }
  if (capEvents.target && t < capEvents.openAt) hoverUniforms.uHover.value = capEvents.target.pid;
  if (capEvents.target && t >= capEvents.openAt && !capEvents.opened) { capEvents.opened = true; openInspect(capEvents.target); }
  if (inspect && inspect.phase === 'hold') inspect.velY = 30;
  if (t >= capEvents.addAt && !capEvents.added && inspect?.phase === 'hold') { capEvents.added = true; addToSatchel(); }
  frame(dt);
}

async function start() {
  await build();
  UI.initQuests(QUESTS);
  UI.initNav(BAYS, goWing);
  UI.markNav(-1, UI.state.visited);
  flyer.set(new THREE.Vector3(0, 9, 4.5), 0, -0.08);
  if (CAPTURE) {
    UI.hideLoader();
    document.getElementById('loader').style.display = 'none';
    const px = new Uint8Array(4), gl = renderer.getContext();
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    window.__step = dt => { captureStep(dt); sync(); return time; };
    window.__scene = scene; window.__frame = () => frame(0.0001); window.__renderer = renderer;
    window.__pose = (x, y, z, yaw, pitch, t = 3) => { camera.position.set(x, y, z); flyer.yaw = yaw; flyer.pitch = pitch; flyer.apply(); time = t; frame(0.0001); sync(); };
    window.__readyResolve();
    return;
  }
  UI.hideLoader();
  flyer.enabled = true;
  window.__arcanum = { camera, shop, flyer, state: UI.state };
  // opening move: drift down the nave so the place feels alive
  flyer.set(new THREE.Vector3(0, 12, 5), 0, -0.14);
  flyer.glideTo(new THREE.Vector3(0, 6.5, -3), 0, -0.06, 3.2);
  setTimeout(() => document.getElementById('hint').classList.add('hide'), 12000);
  document.querySelectorAll('#touch button').forEach(b => {
    const h = b.dataset.h;
    b.addEventListener('pointerdown', e => { e.preventDefault(); flyer.hold.add(h); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => flyer.hold.delete(h));
  });
  let last = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    frame(dt);
  });
}
window.__ready = new Promise(r => { window.__readyResolve = r; });
start().catch(err => {
  console.error(err);
  UI.setLoading(1, 'Something went wrong: ' + err.message);
});
