// Product page viewer: the selected scan alone in a soft photo studio, on a shadow-catching
// floor, with drag to turn, wheel/pinch to zoom and a slow turntable.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadAsset, makeObject } from './assets.js';

export function createViewer(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f1ed);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 100);
  const key = new THREE.DirectionalLight(0xfff8f0, 1.5);
  key.position.set(1.5, 3, 2); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.blurSamples = 16; key.shadow.bias = -0.0005;
  scene.add(key, key.target, new THREE.HemisphereLight(0xffffff, 0xd8d0c4, 0.3));
  // seamless studio: an untoned floor the same colour as the background, plus a shadow catcher
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshBasicMaterial({ color: 0xf3f1ed, toneMapped: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.0005; scene.add(ground);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.ShadowMaterial({ opacity: 0.2 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const holder = new THREE.Group(); scene.add(holder);
  let obj = null, radius = 1, center = new THREE.Vector3();
  const st = { yaw: 0.6, pitch: 0.22, dist: 3, auto: true, vel: 0, target: new THREE.Vector3() };

  async function show(listing, variantIdx = 0) {
    let o;
    if (listing.book) o = bookObject(listing.book);
    else {
      const asset = await loadAsset(listing.sku.asset);
      o = await makeObject(asset, listing.sku.variants?.[variantIdx]?.[1] || null);
    }
    if (obj) holder.remove(obj);
    obj = o; holder.add(obj);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    radius = Math.max(0.03, sphere.radius); center.copy(sphere.center);
    st.target.copy(center);
    st.dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.08;
    st.min = st.dist * 0.45; st.max = st.dist * 2.2;
    key.position.set(radius * 2, radius * 4, radius * 2.5); key.target.position.copy(center);
    const sc = key.shadow.camera; sc.left = sc.bottom = -radius * 2; sc.right = sc.top = radius * 2; sc.near = 0.01; sc.far = radius * 12; sc.updateProjectionMatrix();
  }
  function setLayout(w, h, panelSide) {
    camera.aspect = w / h;
    // keep the product clear of the panel: shift the view's centre
    if (panelSide === 'right') camera.setViewOffset(w, h, w * 0.2, 0, w, h);
    else if (panelSide === 'bottom') camera.setViewOffset(w, h, 0, h * 0.24, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function update(dt) {
    if (st.auto) st.yaw += dt * 0.35;
    st.yaw += st.vel * dt; st.vel *= Math.exp(-4 * dt);
    const cp = Math.cos(st.pitch);
    camera.position.set(st.target.x + Math.sin(st.yaw) * cp * st.dist, st.target.y + Math.sin(st.pitch) * st.dist, st.target.z + Math.cos(st.yaw) * cp * st.dist);
    camera.lookAt(st.target);
  }
  function drag(dx, dy) { st.auto = false; st.yaw -= dx * 0.008; st.pitch = THREE.MathUtils.clamp(st.pitch + dy * 0.006, -0.1, 1.2); st.vel = -dx * 0.4; }
  function zoom(f) { st.dist = THREE.MathUtils.clamp(st.dist * f, st.min, st.max); }
  return { scene, camera, show, setLayout, update, drag, zoom, state: st };
}

// A hardback for the book listings: cloth boards, cream page block, gilt title.
const bookCache = {};
function bookObject(b) {
  if (bookCache[b.id]) return bookCache[b.id].clone();
  const c = document.createElement('canvas'); c.width = 512; c.height = 740;
  const x = c.getContext('2d');
  const hue = (b.book * 47) % 360;
  x.fillStyle = `hsl(${hue}, 32%, 24%)`; x.fillRect(0, 0, 512, 740);
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; x.fillRect(Math.random() * 512, Math.random() * 740, 2, 2); }
  x.strokeStyle = '#c9a65e'; x.lineWidth = 4; x.strokeRect(36, 36, 440, 668); x.lineWidth = 1.5; x.strokeRect(48, 48, 416, 644);
  x.fillStyle = '#d9b873'; x.textAlign = 'center'; x.font = '600 46px Georgia, serif';
  const words = b.name.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).length > 14) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } lines.push(cur);
  lines.forEach((l, i) => x.fillText(l, 256, 250 + i * 58));
  x.font = 'italic 28px Georgia, serif'; x.fillText(b.author, 256, 560);
  const cover = new THREE.CanvasTexture(c); cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
  const cloth = new THREE.MeshStandardMaterial({ color: `hsl(${hue}, 32%, 24%)`, roughness: 0.8 });
  const front = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.75 });
  const pages = new THREE.MeshStandardMaterial({ color: 0xf1e9d6, roughness: 0.9 });
  const g = new THREE.Group();
  const W = 0.16, H = 0.235, T = 0.035;
  const boards = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [pages, cloth, pages, pages, front, cloth]);
  boards.position.y = H / 2; boards.castShadow = true;
  const block = new THREE.Mesh(new THREE.BoxGeometry(W - 0.006, H - 0.008, T - 0.006), pages); block.position.set(0.004, H / 2, 0);
  g.add(boards, block);
  g.rotation.y = -0.4;
  const wrap = new THREE.Group(); wrap.add(g);
  bookCache[b.id] = wrap;
  return wrap.clone();
}
