import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildHall } from './hall.js';
import { createShop } from './shop.js';
import { createViewer } from './viewer.js';
import { loadSurfaceTextures } from './textures.js';
import { Flyer } from './controls.js';
import { BAYS, NAVE_HALF, EYE } from './layout.js';
import { DEPTS, BAYS_LAYOUT, SKUS } from './catalog.js';
import * as UI from './ui.js';

const PI = Math.PI;
const CAPTURE = new URLSearchParams(location.search).has('capture');
if (CAPTURE) document.body.classList.add('capture');
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('coarse');
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

/* ---------------- renderer, scene, light ---------------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, CAPTURE ? 1 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
// The sun and the hall never move, so the (expensive, blurred) shadow map is
// only redrawn when the shadow box steps to a new grid cell around the shopper.
renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e4dc);
const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = roomEnv;
scene.environmentIntensity = 0.55;
scene.add(new THREE.HemisphereLight(0xfff5e8, 0x5a4634, 0.65));
// daylight falling through the laylights; its shadow box follows the shopper
const sun = new THREE.DirectionalLight(0xfff0dc, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 0.5, far: 30 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 10; sun.shadow.blurSamples = 16;
scene.add(sun, sun.target);
// a small pool of warm lights moves to the nearest pendants
const pool = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xffcf94, 9, 10, 2); scene.add(l); return l; });

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.03, 140);
camera.position.set(0, EYE, 4.5);
const viewer = createViewer(renderer);

function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  viewer.setLayout(w, h, w > 760 ? 'right' : 'bottom');
}
addEventListener('resize', resize);
resize();

/* ---------------- build ---------------- */
let hall, shop;
const flyer = new Flyer(camera, canvas);
flyer.enabled = false;
async function build() {
  UI.setLoading(0.03, 'Setting out the shop floor…');
  await nextFrame();
  const T = loadSurfaceTextures();
  hall = buildHall(scene, T, renderer);
  shop = createShop(scene, hall);
  UI.setLoading(0.1, 'Bringing out the stock…');
  await shop.build(p => UI.setLoading(0.1 + p * 0.8, `Bringing out the stock… ${Math.round(p * 100)}%`));
  UI.setLoading(0.94, 'Lighting the floor…');
  await nextFrame();
  // bake the hall's own light into the reflection environment
  placeLights(new THREE.Vector3(0, EYE, -20));
  scene.environment = pmrem.fromScene(scene, 0.035, 0.1, 80, { position: new THREE.Vector3(0, 2.4, -22) }).texture;
  scene.environmentIntensity = 0.75;
  renderer.compile(scene, camera);
  window.__stats = { products: shop.placements.length, listings: Object.keys(shop.listings).length, books: hall.books.length };
  UI.setLoading(1, `${shop.placements.length} products · ${hall.books.length.toLocaleString('en-US')} books`);
}

const _v = new THREE.Vector3();
let sunCell = '';
function placeLights(cam) {
  const cx = Math.round(cam.x / 4) * 4, cz = Math.round(cam.z / 4) * 4, cell = cx + ',' + cz;
  if (cell !== sunCell) {
    sunCell = cell;
    sun.position.set(cx + 5, cam.y + 12, cz + 6);
    sun.target.position.set(cx, 0, cz);
    sun.target.updateMatrixWorld();
    renderer.shadowMap.needsUpdate = true;
  }
  const near = hall.pendants.map(p => [p, p.distanceToSquared(cam)]).sort((a, b) => a[1] - b[1]).slice(0, pool.length);
  near.forEach(([p], i) => pool[i].position.copy(p));
}

/* ---------------- departments and navigation ---------------- */
function deptView(i) {
  if (i === 8 || i < 0) return { pos: new THREE.Vector3(0, EYE, i < 0 ? 4.5 : -47), yaw: 0, pitch: -0.05 };
  const bay = BAYS.find(b => BAYS_LAYOUT[b.b].dept === DEPTS[i].id);
  return { pos: new THREE.Vector3(bay.s * (NAVE_HALF - 1.4), EYE, bay.zc), yaw: -bay.s * PI / 2, pitch: -0.14 };
}
function goDept(i) {
  if (UI.productOpen()) closeProduct();
  const t = deptView(i);
  flyer.glideTo(t.pos, t.yaw, t.pitch, 2.4);
}
let curDept = -2;
function updateDept() {
  const p = camera.position;
  let d = -1;
  if (Math.abs(p.x) > NAVE_HALF - 1.6) { const bay = BAYS.find(b => Math.sign(p.x) === b.s && Math.abs(p.z - b.zc) < 6); if (bay) d = DEPTS.findIndex(x => x.id === BAYS_LAYOUT[bay.b].dept); }
  else if (p.z < -50) d = 8;
  if (d !== curDept) { curDept = d; UI.markDepartment(d); }
}

/* ---------------- hover, click, product page ---------------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let mouse = null, hovered = null;
canvas.addEventListener('pointermove', e => { mouse = { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', moved: true }; });
canvas.addEventListener('pointerleave', () => { mouse = null; UI.hideTip(); });
function pickAt(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  camera.updateMatrixWorld();
  ray.setFromCamera(ndc, camera);
  return shop.pick(ray.ray);
}
function updateHover() {
  if (mode !== 'store' || flyer.glide || !mouse || mouse.touch || (flyer.dragging && flyer.moved > 4)) {
    if (hovered) { hovered = null; UI.hideTip(); canvas.classList.remove('hovering'); }
    return;
  }
  if (!mouse.moved) return;
  mouse.moved = false;
  hovered = pickAt(mouse.x, mouse.y);
  canvas.classList.toggle('hovering', !!hovered);
  if (hovered) UI.showTip(hovered, mouse.x, mouse.y); else UI.hideTip();
}

let mode = 'store', fade = 0, fadeTarget = 0, pending = null, pdpItem = null;
const fadeEl = document.getElementById('fade');
async function openProduct(h) {
  if (mode !== 'store') return;
  UI.hideTip(); canvas.classList.remove('hovering');
  const item = h.kind === 'book' ? { book: h.book } : { sku: h.listing.sku, listing: h.listing, vi: h.p?.vi || 0 };
  pdpItem = item;
  mode = 'to-pdp'; fadeTarget = 1; flyer.enabled = false;
  pending = async () => {
    await viewer.show(item.book ? { book: item.book } : item.listing, item.vi);
    viewer.state.auto = true; viewer.state.yaw = 0.7; viewer.state.pitch = 0.2;
    UI.openProduct(item);
    mode = 'pdp'; fadeTarget = 0;
  };
}
function closeProduct() {
  if (mode !== 'pdp') return;
  UI.closeProduct();
  mode = 'to-store'; fadeTarget = 1;
  pending = async () => { mode = 'store'; fadeTarget = 0; flyer.enabled = !CAPTURE; };
}
UI.bindProduct({ onVariant: vi => { if (pdpItem?.listing) viewer.show(pdpItem.listing, vi); }, onClose: closeProduct });
document.getElementById('p-back').onclick = closeProduct;
document.getElementById('p-add').addEventListener('click', () => setTimeout(() => document.body.classList.add('bag-open'), 350));
addEventListener('keydown', e => { if (e.code === 'Escape') { if (document.body.classList.contains('bag-open')) document.body.classList.remove('bag-open'); else closeProduct(); } });
flyer.onClick = (x, y) => { if (mode !== 'store') return; const h = pickAt(x, y); if (h) openProduct(h); };
// viewer controls while the product page is open
{
  let drag = false, lx = 0, ly = 0, pinch = 0;
  canvas.addEventListener('pointerdown', e => { if (mode === 'pdp') { drag = true; lx = e.clientX; ly = e.clientY; } });
  addEventListener('pointerup', () => { drag = false; });
  canvas.addEventListener('pointermove', e => {
    if (mode !== 'pdp' || !drag) return;
    viewer.drag(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY;
  });
  canvas.addEventListener('wheel', e => { if (mode === 'pdp') viewer.zoom(Math.exp(e.deltaY * 0.001)); }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (mode !== 'pdp' || e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) viewer.zoom(pinch / d); pinch = d;
  }, { passive: true });
  canvas.addEventListener('touchend', () => { pinch = 0; });
}

function goToSku(id) {
  const l = shop.listings[id]; if (!l) return;
  const p = l.placements.find(q => q.bay >= 0 && !q.shelfRows) || l.placements[0];
  const c = p.box.getCenter(new THREE.Vector3());
  const from = new THREE.Vector3(p.bay >= 0 ? Math.sign(c.x) * (NAVE_HALF - 0.6) : c.x, EYE, c.z + (p.bay >= 0 ? 0 : 2.2));
  if (p.bay >= 0) from.lerp(c, 0.45).setY(EYE);
  const d = c.clone().sub(from);
  flyer.glideTo(from, Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), 2.2);
  pendingOpen = { listing: l, p };
}
let pendingOpen = null;

/* ---------------- loop ---------------- */
let time = 0, skipRender = false;
function frame(dt) {
  time += dt;
  if (!CAPTURE) flyer.update(dt);
  if (pendingOpen && !flyer.glide) { const o = pendingOpen; pendingOpen = null; openProduct({ kind: 'product', listing: o.listing, p: o.p }); }
  // cross-fade between the store and the product studio
  fade += (fadeTarget - fade) * Math.min(1, dt * 14);
  if (Math.abs(fade - fadeTarget) < 0.02) fade = fadeTarget;
  fadeEl.style.opacity = fade.toFixed(3);
  if (pending && fade === 1) { const f = pending; pending = null; f(); }
  if (mode === 'pdp' || (mode === 'to-store' && fade > 0.5) || (mode === 'to-pdp' && fade === 1 && !pending)) {
    viewer.update(dt);
    if (!skipRender) renderer.render(viewer.scene, viewer.camera);
    return;
  }
  placeLights(camera.position);
  shop.updateTags(time, camera.position);
  updateHover();
  updateDept();
  if (!skipRender) renderer.render(scene, camera);
}

/* ---------------- capture: a scripted visit ---------------- */
const KEYS = [
  [0.0, [0, 1.72, 4.6], 0.0, -0.04],
  [2.6, [0, 1.7, -0.6], 0.04, -0.05],
  [4.4, [-3.2, 1.66, -4.2], 0.9, -0.1],
  [5.8, [-6.0, 1.64, -5.0], PI / 2 - 0.02, -0.15],
  [6.4, [-6.3, 1.63, -5.0], PI / 2 - 0.02, -0.15]
];
const curve = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k[1])), false, 'centripetal');
function cinematic(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, , y0, p0] = KEYS[i], [t1, , y1, p1] = KEYS[i + 1];
  const u = THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1), su = u * u * (3 - 2 * u);
  camera.position.copy(curve.getPoint((i + su) / (KEYS.length - 1)));
  flyer.yaw = y0 + (y1 - y0) * su; flyer.pitch = p0 + (p1 - p0) * su; flyer.apply();
}
const cap = {};
function captureStep(dt) {
  const t = time + dt;
  if (mode === 'store' && !cap.opened) cinematic(t);
  if (t > 5.9 && !cap.hover) {
    cap.hover = true;
    const l = shop.listings['lune-sofa'], p = l.placements[0];
    camera.updateMatrixWorld();
    const c = p.box.getCenter(new THREE.Vector3()).project(camera);
    cap.pt = { x: (c.x + 1) / 2 * innerWidth, y: (1 - c.y) / 2 * innerHeight - 30 };
    UI.showTip({ kind: 'product', listing: l, p }, cap.pt.x, cap.pt.y);
    cap.l = l; cap.p = p;
  }
  if (t > 6.6 && !cap.opened) { cap.opened = true; UI.hideTip(); openProduct({ kind: 'product', listing: cap.l, p: cap.p }); }
  if (t > 8.2 && !cap.variant && mode === 'pdp') { cap.variant = true; document.querySelector('#p-variants .sw button[data-i="1"]').click(); }
  if (t > 9.4 && !cap.added && mode === 'pdp') { cap.added = true; UI.addCurrent(); document.body.classList.add('bag-open'); }
  frame(dt);
}

async function start() {
  await build();
  UI.initDepartments(goDept);
  UI.initSearch(shop.listings, pick => { if (pick.dept !== undefined) goDept(pick.dept); else goToSku(pick.sku); });
  UI.initStatic();
  UI.renderBag();
  flyer.set(new THREE.Vector3(0, EYE + 0.05, 4.6), 0, -0.04);
  UI.hideLoader();
  if (CAPTURE) {
    document.getElementById('loader').style.display = 'none';
    for (const id of ['pdp', 'drawer', 'scrim', 'toast', 'fade', 'tip', 'p-back', 'p-hint', 'crumb', 'vignette']) document.getElementById(id).style.transition = 'none';
    const px = new Uint8Array(4), gl = renderer.getContext();
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    window.__step = dt => { captureStep(dt); sync(); return time; };
    window.__advance = dt => { skipRender = true; captureStep(dt); skipRender = false; return time; };
    window.__pose = (x, y, z, yaw, pitch, t = 3) => { camera.position.set(x, y, z); flyer.yaw = yaw; flyer.pitch = pitch; flyer.apply(); time = t; frame(0.0001); sync(); };
    window.__open = async (sku, vi = 0) => {
      const l = shop.listings[sku]; await openProduct({ kind: 'product', listing: l, p: { vi } });
      fade = 1; const f = pending; pending = null; await f(); fade = 0; fadeTarget = 0; frame(0.05); sync();
    };
    window.__close = () => { closeProduct(); fade = 1; const f = pending; pending = null; f(); fade = 0; };
    window.__readyResolve();
    return;
  }
  flyer.enabled = true;
  window.__arcanum = { camera, shop, flyer, bag: UI.bag, get mode() { return mode; } };
  flyer.glideTo(new THREE.Vector3(0, EYE, -1.5), 0, -0.05, 3.0);
  setTimeout(() => document.getElementById('hint').classList.add('hide'), 14000);
  document.querySelectorAll('#touch button').forEach(b => {
    const h = b.dataset.h;
    b.addEventListener('pointerdown', e => { e.preventDefault(); flyer.hold.add(h); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => flyer.hold.delete(h));
  });
  let last = performance.now();
  renderer.setAnimationLoop(now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt); });
}
window.__ready = new Promise(r => { window.__readyResolve = r; });
start().catch(err => { console.error(err); UI.setLoading(1, 'Something went wrong: ' + err.message); });
