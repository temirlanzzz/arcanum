// The building: a daylit library department store. Static architecture is merged per
// material; books are one InstancedMesh with a spine atlas; fixtures report their tops
// so products can be set on them.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { NAVE_HALF, BAY_BACK, BAY_HALF, OPEN_HALF, OPEN_TOP, CEIL, Z_FRONT, Z_END, BAYS, bayToWorld, faceNave } from './layout.js';
import { DEPTS, BAYS_LAYOUT } from './catalog.js';
import { spineAtlas, rugTexture, signTexture, laylightTexture, contactShadow, artTexture } from './textures.js';

let seed = 1234567;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const UP = new THREE.Vector3(0, 1, 0);

// Collects transformed geometry per material and merges it at the end.
class Batch {
  constructor() { this.lists = {}; }
  add(key, geo, matrix, uvScale = 0) {
    const g = geo.index ? geo.clone() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(matrix);
    if (uvScale) worldUV(g, uvScale);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    (this.lists[key] ||= []).push(g);
  }
  box(key, w, h, d, x, y, z, rotY = 0, uvScale = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, rotY), new THREE.Vector3(1, 1, 1));
    this.add(key, new THREE.BoxGeometry(w, h, d), m, uvScale);
  }
  build(mats, parent, opts = {}) {
    for (const [k, list] of Object.entries(this.lists)) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mats[k]);
      mesh.receiveShadow = true; mesh.castShadow = !!opts.cast?.includes(k);
      mesh.name = k;
      parent.add(mesh);
    }
  }
}
function worldUV(g, s) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [u, v] = ax > 0.5 ? [p.getZ(i), p.getY(i)] : ay > 0.5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u * s; uv[i * 2 + 1] = v * s;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const FEATURE = [0xb7ae9f, 0xc9bfb2, 0x9fab9c, 0xbfb6a8, 0x2a3a33, 0xb8bcbd, 0x93a28a, 0xc4b29c];
const BOOK_COLORS = ['#5a1e1b', '#6b2420', '#1f2d4a', '#22314f', '#24382b', '#2f4733', '#7a5a2a', '#8a6b3b', '#d9cfb8', '#e4dccb', '#1d1c1b', '#3a2a22',
  '#4b2b3f', '#6f4a2c', '#9a3b26', '#355c6b', '#b8a37c', '#2a2420', '#7d1f2a', '#43513e'];

export function buildHall(scene, T, renderer) {
  const group = new THREE.Group(); scene.add(group);
  const wood = (tint, rough = 1, rep = 1) => {
    const m = new THREE.MeshPhysicalMaterial({ map: T.woodMap, roughnessMap: T.woodRough, bumpMap: T.woodBump, bumpScale: 0.6, color: tint, roughness: rough, clearcoat: 0.25, clearcoatRoughness: 0.35 });
    return m;
  };
  const mats = {
    floor: wood(0xd8cbbb, 0.85),
    walnut: wood(0x6a4a36, 0.9),
    oak: wood(0xd9c6ae, 0.85),
    plaster: new THREE.MeshStandardMaterial({ color: 0xece6db, roughness: 0.93 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf1ece4, roughness: 0.95 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xdcd6cd, roughness: 0.7 }),
    green: new THREE.MeshStandardMaterial({ color: 0x23332c, roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8a062, metalness: 1, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x1d1f22, metalness: 0.7, roughness: 0.42 }),
    marble: new THREE.MeshPhysicalMaterial({ color: 0xf2f0ec, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.006, ior: 1.5, transparent: false }),
    paneGlass: new THREE.MeshStandardMaterial({ color: 0xcfd8dd, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.18, depthWrite: false }),
    stone: new THREE.MeshStandardMaterial({ color: 0x9b968f, roughness: 0.85 })
  };
  const B = new Batch();
  const W = 0.3; // wall thickness

  /* ---------- floor, ceiling, laylights ---------- */
  {
    const f = new THREE.PlaneGeometry(2 * BAY_BACK, Z_FRONT - Z_END); f.rotateX(-Math.PI / 2); f.translate(0, 0, (Z_FRONT + Z_END) / 2);
    B.add('floor', f, new THREE.Matrix4(), 0.95);
    const c = new THREE.PlaneGeometry(2 * BAY_BACK, Z_FRONT - Z_END); c.rotateX(Math.PI / 2); c.translate(0, CEIL, (Z_FRONT + Z_END) / 2);
    B.add('ceiling', c, new THREE.Matrix4(), 0.5);
    // coffer beams across the nave and along the laylight edges
    for (let z = Z_FRONT - 1.5; z > Z_END; z -= 3.5) B.box('ceiling', 2 * NAVE_HALF, 0.32, 0.26, 0, CEIL - 0.16, z, 0, 0.5);
    for (const x of [-3.7, 3.7, -NAVE_HALF + 0.15, NAVE_HALF - 0.15]) B.box('ceiling', 0.26, 0.32, Z_FRONT - Z_END, x, CEIL - 0.16, (Z_FRONT + Z_END) / 2, 0, 0.5);
    // a moulded cornice line along the nave walls
    for (const s of [-1, 1]) B.box('plaster', 0.18, 0.22, Z_FRONT - Z_END, s * (NAVE_HALF - 0.09), CEIL - 0.42, (Z_FRONT + Z_END) / 2, 0, 0.5);
  }
  const lay = laylightTexture();
  const layMat = new THREE.MeshBasicMaterial({ map: lay, color: new THREE.Color(1.22, 1.24, 1.28) });
  const addLaylight = (w, d, x, z, rotY = 0) => {
    const t = lay.clone(); t.needsUpdate = true; t.repeat.set(w / 1.75, d / 1.75);
    const m = layMat.clone(); m.map = t;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    p.rotation.set(Math.PI / 2, 0, rotY); p.position.set(x, CEIL - 0.33, z);
    group.add(p);
    // the well the laylight sits in
    B.box('ceiling', w + 0.1, 0.34, 0.08, x, CEIL - 0.17, z - d / 2, 0, 0.5); B.box('ceiling', w + 0.1, 0.34, 0.08, x, CEIL - 0.17, z + d / 2, 0, 0.5);
  };
  addLaylight(7.1, 52, 0, -25.5);
  for (const bay of BAYS) { const { x, z } = bayToWorld(bay, 3.5, 0); addLaylight(3.4, 8.4, x, z); }

  /* ---------- walls ---------- */
  const openings = BAYS.map(b => [b.zc - OPEN_HALF, b.zc + OPEN_HALF, b.s]);
  for (const s of [-1, 1]) {
    const opens = openings.filter(o => o[2] === s).sort((a, b) => b[1] - a[1]);
    let z = Z_FRONT;
    const xw = s * (NAVE_HALF + W / 2);
    for (const [z0, z1] of opens) {
      if (z > z1) B.box('plaster', W, CEIL, z - z1, xw, CEIL / 2, (z + z1) / 2, 0, 0.5);
      B.box('plaster', W, CEIL - OPEN_TOP, z1 - z0, xw, (CEIL + OPEN_TOP) / 2, (z0 + z1) / 2, 0, 0.5); // lintel
      // pilasters framing the opening
      for (const zz of [z0 - 0.28, z1 + 0.28]) {
        B.box('plaster', 0.24, CEIL, 0.56, s * (NAVE_HALF - 0.12), CEIL / 2, zz, 0, 0.5);
        B.box('plaster', 0.34, 0.4, 0.66, s * (NAVE_HALF - 0.17), 0.2, zz, 0, 0.5);
      }
      z = z0;
    }
    if (z > Z_END) B.box('plaster', W, CEIL, z - Z_END, xw, CEIL / 2, (z + Z_END) / 2, 0, 0.5);
  }
  for (const bay of BAYS) {
    const xb = bay.s * (BAY_BACK + W / 2), xm = bay.s * (NAVE_HALF + BAY_BACK) / 2;
    B.box('plaster', W, CEIL, 2 * BAY_HALF, xb, CEIL / 2, bay.zc, 0, 0.5);
    for (const sz of [-1, 1]) B.box('plaster', BAY_BACK - NAVE_HALF, CEIL, W, xm, CEIL / 2, bay.zc + sz * (BAY_HALF + W / 2), 0, 0.5);
    // gilded sign on the lintel
    const dept = DEPTS.find(d => d.id === BAYS_LAYOUT[bay.b].dept);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.875), new THREE.MeshStandardMaterial({ map: signTexture(dept.name), roughness: 0.45, metalness: 0.15 }));
    sign.position.set(bay.s * (NAVE_HALF - 0.005), OPEN_TOP + 0.95, bay.zc); sign.rotation.y = -bay.s * Math.PI / 2;
    group.add(sign);
  }
  // entrance wall with glazed double doors
  {
    const z = Z_FRONT + W / 2, dw = 2.4, dh = 4.2;
    B.box('plaster', NAVE_HALF - dw, CEIL, W, -(NAVE_HALF + dw) / 2, CEIL / 2, z, 0, 0.5);
    B.box('plaster', NAVE_HALF - dw, CEIL, W, (NAVE_HALF + dw) / 2, CEIL / 2, z, 0, 0.5);
    B.box('plaster', 2 * dw, CEIL - dh, W, 0, (CEIL + dh) / 2, z, 0, 0.5);
    for (const x of [-dw, -dw / 2 - 0.6, 0, dw / 2 + 0.6, dw]) B.box('steel', 0.08, dh, 0.12, x, dh / 2, Z_FRONT + 0.05);
    B.box('steel', 2 * dw, 0.1, 0.12, 0, dh - 0.05, Z_FRONT + 0.05); B.box('steel', 2 * dw, 0.08, 0.12, 0, 2.6, Z_FRONT + 0.05);
    for (const x of [-0.12, 0.12]) B.box('brass', 0.03, 0.9, 0.05, x, 1.1, Z_FRONT - 0.04);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2 * dw, dh), mats.paneGlass); pane.position.set(0, dh / 2, Z_FRONT + 0.05); pane.rotation.y = Math.PI; group.add(pane);
    // the street outside: a slice of a real HDR panorama
    T.view.wrapS = THREE.RepeatWrapping; T.view.repeat.set(0.26, 0.42); T.view.offset.set(0.88, 0.36);
    const view = new THREE.Mesh(new THREE.PlaneGeometry(36, 20), new THREE.MeshBasicMaterial({ map: T.view, color: new THREE.Color(1.15, 1.12, 1.08), fog: false }));
    view.position.set(0, 4.5, Z_FRONT + 16); view.rotation.y = Math.PI; group.add(view);
    const walk = new THREE.PlaneGeometry(14, 16); walk.rotateX(-Math.PI / 2); walk.translate(0, -0.02, Z_FRONT + 8);
    B.add('stone', walk, new THREE.Matrix4(), 0.6);
  }
  B.box('plaster', 2 * NAVE_HALF, CEIL, W, 0, CEIL / 2, Z_END - W / 2, 0, 0.5);

  /* ---------- bookcases with instanced books ---------- */
  const books = []; // {m: Matrix4, color, cell}
  const cases = []; // pickable bookcase faces
  const tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  // origin: wall point at the left end (facing the room), t: unit along wall, n: unit into room
  function bookcase(origin, t, n, len, y0, y1, opts = {}) {
    const depth = 0.36, modules = Math.max(1, Math.round(len / 0.9)), mw = len / modules;
    const rot = Math.atan2(n.x, n.z); // yaw that maps local +z to n
    const at = (a, h, d) => origin.clone().addScaledVector(t, a).addScaledVector(n, d).setY(h);
    const boxAt = (key, w, h, d, a, y, dd) => { const p = at(a, y, dd); B.box(key, w, h, d, p.x, p.y, p.z, rot, 0.9); };
    boxAt('walnut', len, y1 - y0, 0.02, len / 2, (y0 + y1) / 2, 0.01); // back
    for (let i = 0; i <= modules; i++) boxAt('walnut', 0.045, y1 - y0, depth, i * mw, (y0 + y1) / 2, depth / 2);
    boxAt('walnut', len + 0.08, 0.12, depth + 0.06, len / 2, y1 + 0.06, depth / 2 + 0.03); // cornice
    if (y0 < 0.2) boxAt('walnut', len, 0.12, depth, len / 2, y0 + 0.06, depth / 2);    // plinth
    const shelfGap = 0.34, base = y0 < 0.2 ? y0 + 0.12 : y0;
    const levels = []; for (let y = base; y + 0.3 <= y1 - 0.02; y += shelfGap) levels.push(y);
    for (const y of levels) boxAt('walnut', len, 0.025, depth - 0.02, len / 2, y + 0.0125, depth / 2);
    cases.push({ origin: origin.clone(), t: t.clone(), n: n.clone(), len, y0: base, y1, levels, depth });
    if (opts.empty) return;
    for (let li = 0; li < levels.length; li++) for (let mi = 0; mi < modules; mi++) {
      let a = mi * mw + 0.035, end = (mi + 1) * mw - 0.03;
      const y = levels[li] + 0.025;
      while (a < end) {
        if (rnd() < 0.05) { a += 0.06 + rnd() * 0.12; continue; }
        const th = 0.018 + rnd() * rnd() * 0.05, h = 0.2 + rnd() * 0.095, d = 0.15 + rnd() * 0.12;
        if (a + th > end) break;
        let lean = 0;
        if (a + th + 0.07 > end && rnd() < 0.5) lean = 0.22 + rnd() * 0.2;
        const p = at(a + th / 2, y, depth - 0.025 - d / 2);
        tmpQ.setFromAxisAngle(UP, rot).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -lean));
        const m = new THREE.Matrix4().compose(p, tmpQ, tmpS.set(th, h, d));
        books.push({ m, color: BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)], cell: Math.floor(rnd() * 15), id: books.length });
        a += th + (lean ? 0.08 : 0.001);
      }
    }
  }
  const N_L = new THREE.Vector3(1, 0, 0), N_R = new THREE.Vector3(-1, 0, 0);
  // nave walls between openings
  for (const s of [-1, 1]) {
    const opens = openings.filter(o => o[2] === s).sort((a, b) => b[1] - a[1]);
    let z = Z_FRONT - 0.15;
    const segs = [];
    for (const [z0, z1] of opens) { segs.push([z1 + 0.6, z]); z = z0 - 0.6; }
    segs.push([Z_END + 0.15, z]);
    for (const [za, zb] of segs) {
      const len = zb - za; if (len < 0.8) continue;
      // origin at the left end as seen from the nave
      if (s < 0) bookcase(new THREE.Vector3(-NAVE_HALF, 0, zb), new THREE.Vector3(0, 0, -1), N_L, len, 0, CEIL - 0.55);
      else bookcase(new THREE.Vector3(NAVE_HALF, 0, za), new THREE.Vector3(0, 0, 1), N_R, len, 0, CEIL - 0.55);
    }
  }
  // end wall and above the entrance
  bookcase(new THREE.Vector3(-NAVE_HALF + 0.15, 0, Z_END), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), 2 * NAVE_HALF - 0.3, 0, CEIL - 0.55);
  for (const x0 of [-NAVE_HALF + 0.15, 2.75]) bookcase(new THREE.Vector3(x0, 0, Z_FRONT), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), 4.1, 0, CEIL - 0.55);
  // bay walls: upper library everywhere, lower shelves where the department leaves the wall free
  for (const bay of BAYS) {
    const L = BAYS_LAYOUT[bay.b], fx = L.fixtures;
    const usedBack = fx.some(f => f[1] === 'panel' || (f[1] === 'wallShelf' && f[2] > 6)) || L.items.some(i => i[0] === 'glassfront-cooler' || (i[5]?.startsWith?.('wall')));
    const usedSide = sv => fx.some(f => f[1] === 'wallShelf' && f[2] < 6 && Math.sign(f[3]) === sv) || L.items.some(i => Math.abs(i[3]) > 4.8 && Math.sign(i[3]) === sv && !i[5]);
    const back = bay.s * BAY_BACK, nIn = new THREE.Vector3(-bay.s, 0, 0);
    // back wall: origin at the left end as seen from inside the bay
    const bo = new THREE.Vector3(back, 0, bay.zc + bay.s * (BAY_HALF - 0.05)), bt = new THREE.Vector3(0, 0, -bay.s);
    bookcase(bo, bt, nIn, 2 * BAY_HALF - 0.1, usedBack ? 3.3 : 0, CEIL - 0.55);
    for (const sv of [-1, 1]) {
      const zw = bay.zc + sv * BAY_HALF, n = new THREE.Vector3(0, 0, -sv);
      bookcase(new THREE.Vector3(bay.s * (NAVE_HALF + 0.65), 0, zw), new THREE.Vector3(bay.s, 0, 0), n, BAY_BACK - NAVE_HALF - 1.05, usedSide(sv) ? 3.3 : 0, CEIL - 0.55);
    }
    // painted feature walls below the library shelves, with a walnut skirting
    const paint = 'wall' + bay.b;
    mats[paint] = new THREE.MeshStandardMaterial({ color: FEATURE[bay.b], roughness: 0.9 });
    if (usedBack) { B.box(paint, 0.02, 3.25, 2 * BAY_HALF, back - bay.s * 0.01, 1.625, bay.zc, 0, 0.5); B.box('walnut', 0.03, 0.12, 2 * BAY_HALF, back - bay.s * 0.025, 0.06, bay.zc, 0, 0.9); }
    for (const sv of [-1, 1]) if (usedSide(sv)) {
      const zw = bay.zc + sv * (BAY_HALF - 0.01), xm = bay.s * (NAVE_HALF + BAY_BACK) / 2;
      B.box(paint, BAY_BACK - NAVE_HALF, 3.25, 0.02, xm, 1.625, zw, 0, 0.5); B.box('walnut', BAY_BACK - NAVE_HALF, 0.12, 0.03, xm, 0.06, zw - sv * 0.015, 0, 0.9);
    }
  }
  // the book shop at the end: a round table with stacks
  {
    const z = -56;
    B.add('walnut', new THREE.CylinderGeometry(1.25, 1.25, 0.06, 48), new THREE.Matrix4().makeTranslation(0, 0.78, z));
    B.add('walnut', new THREE.CylinderGeometry(0.18, 0.28, 0.75, 24), new THREE.Matrix4().makeTranslation(0, 0.375, z));
    B.add('walnut', new THREE.CylinderGeometry(0.6, 0.65, 0.05, 32), new THREE.Matrix4().makeTranslation(0, 0.025, z));
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2, r = 0.55 + (k % 2) * 0.4;
      let y = 0.81;
      const n = 3 + Math.floor(rnd() * 5);
      for (let j = 0; j < n; j++) {
        const th = 0.03 + rnd() * 0.03, w = 0.16 + rnd() * 0.06, d = 0.23 + rnd() * 0.05;
        const p = new THREE.Vector3(Math.cos(a) * r, y, z + Math.sin(a) * r);
        // lying flat: the unit box's height axis becomes the book's thickness
        const q = new THREE.Quaternion().setFromAxisAngle(UP, a + (rnd() - 0.5) * 0.4);
        const m = new THREE.Matrix4().compose(p, q, new THREE.Vector3(w, th, d));
        books.push({ m, color: BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)], cell: 15, id: books.length, stack: true });
        y += th;
      }
    }
  }
  // rolling library ladders on two nave cases
  for (const [s, zc] of [[-1, -12], [1, -40]]) {
    const xr = s * (NAVE_HALF - 0.36 - 0.1);
    B.add('brass', new THREE.CylinderGeometry(0.018, 0.018, 4.6, 12).rotateX(Math.PI / 2), new THREE.Matrix4().makeTranslation(xr, 3.5, zc));
    const foot = xr - s * 1.1, top = xr;
    for (const dz of [-0.25, 0.25]) {
      const len = Math.hypot(foot - top, 3.5), ang = Math.atan2(top - foot, 3.5);
      const m = new THREE.Matrix4().compose(new THREE.Vector3((foot + top) / 2, 1.75, zc + dz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -ang), new THREE.Vector3(1, 1, 1));
      B.add('oak', new THREE.BoxGeometry(0.06, len, 0.05), m, 0.9);
    }
    for (let r = 0.3; r < 3.4; r += 0.3) {
      const x = foot + (top - foot) * (r / 3.5);
      B.add('brass', new THREE.CylinderGeometry(0.014, 0.014, 0.5, 8).rotateX(Math.PI / 2), new THREE.Matrix4().makeTranslation(x, r, zc));
    }
  }

  /* ---------- nave runner rug and featured tables ---------- */
  const fabricMat = (tex, tint = 0xffffff) => {
    const n = T.fabricNormal.clone(); n.needsUpdate = true; n.repeat.set(20, 20);
    return new THREE.MeshPhysicalMaterial({ map: tex, color: tint, roughness: 0.95, normalMap: n, normalScale: new THREE.Vector2(0.6, 0.6), sheen: 0.5, sheenRoughness: 0.8, sheenColor: 0x888888 });
  };
  {
    const rt = rugTexture('#5b1f22', '#2a1414', '#c7a464'); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(1, 18);
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 54), fabricMat(rt));
    runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.004, -24); runner.receiveShadow = true; group.add(runner);
  }
  const surfaces = {}; // `${bayIndex}:${fixtureId}` -> {x, y, z, rot}
  const shadowSpots = [];
  function table(x, z, w, d, h, rot, key = 'oak') {
    const tr = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(UP, rot).add(new THREE.Vector3(x, 0, z));
    const p = tr(0, 0);
    B.box(key, w, 0.045, d, p.x, h - 0.0225, p.z, rot, 0.9);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const q = tr(sx * (w / 2 - 0.07), sz * (d / 2 - 0.07)); B.box(key, 0.055, h - 0.045, 0.055, q.x, (h - 0.045) / 2, q.z, rot, 0.9); }
    for (const sz of [-1, 1]) { const q = tr(0, sz * (d / 2 - 0.07)); B.box(key, w - 0.18, 0.09, 0.025, q.x, h - 0.09, q.z, rot, 0.9); }
    shadowSpots.push([x, z, Math.max(w, d) * 0.95, 0.5]);
  }
  for (const t of [-12, -26, -40]) { table(0, t, 2.0, 0.95, 0.82, 0); surfaces[`nave:${t}`] = { x: 0, y: 0.82, z: t, rot: 0 }; }

  /* ---------- department fixtures ---------- */
  for (const bay of BAYS) {
    const L = BAYS_LAYOUT[bay.b];
    for (const f of L.fixtures) {
      const [id, type, u, v, w, d, h = 0, yawDeg = 0, extra] = f;
      const { x, z } = bayToWorld(bay, u, v);
      const rot = faceNave(bay, yawDeg);
      const key = `${bay.b}:${id}`;
      if (type === 'table') { table(x, z, w, d, h, rot); surfaces[key] = { x, y: h, z, rot }; }
      else if (type === 'coffee') { table(x, z, w, d, h, rot, 'walnut'); surfaces[key] = { x, y: h, z, rot }; }
      else if (type === 'sideRound') {
        B.add('marble', new THREE.CylinderGeometry(w / 2, w / 2, 0.03, 40), new THREE.Matrix4().makeTranslation(x, h - 0.015, z));
        B.add('brass', new THREE.CylinderGeometry(0.025, 0.025, h - 0.03, 16), new THREE.Matrix4().makeTranslation(x, (h - 0.03) / 2, z));
        B.add('brass', new THREE.CylinderGeometry(0.17, 0.18, 0.02, 32), new THREE.Matrix4().makeTranslation(x, 0.01, z));
        surfaces[key] = { x, y: h, z, rot }; shadowSpots.push([x, z, w * 1.3, 0.45]);
      } else if (type === 'plinth' || type === 'vitrine') {
        B.box('paint', w, h - 0.02, d, x, (h - 0.02) / 2 + 0.02, z, rot, 0);
        B.box('steel', w - 0.04, 0.02, d - 0.04, x, 0.01, z, rot, 0);
        if (type === 'vitrine') {
          const gh = 0.36;
          const gb = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, gh, d - 0.02), mats.glass); gb.position.set(x, h + gh / 2, z); gb.rotation.y = rot; group.add(gb);
          B.box('brass', w - 0.01, 0.012, d - 0.01, x, h + gh, z, rot, 0);
        }
        surfaces[key] = { x, y: h, z, rot }; shadowSpots.push([x, z, Math.max(w, d) * 1.5, 0.55]);
      } else if (type === 'counter') {
        B.box('walnut', w, h - 0.08, d, x, (h - 0.08) / 2 + 0.06, z, rot, 0.9);
        B.box('brass', w + 0.01, 0.06, d + 0.01, x, 0.03, z, rot, 0);
        B.box('marble', w + 0.06, 0.03, d + 0.06, x, h - 0.015, z, rot, 0);
        surfaces[key] = { x, y: h, z, rot }; shadowSpots.push([x, z, Math.max(w, d) * 1.1, 0.5]);
      } else if (type === 'panel') {
        const xb = bay.s * (BAY_BACK - 0.03);
        B.box('green', 0.04, d, w, xb, h + d / 2, z, 0, 0);
        surfaces[key] = { x: xb, y: 0, z, rot };
      } else if (type === 'board') {
        const parent = surfaces[`${bay.b}:${extra}`];
        B.box('oak', w, 0.02, d, x, parent.y + 0.01, z, rot, 2);
        surfaces[key] = { x, y: parent.y + 0.02, z, rot };
      } else if (type === 'rug') {
        const pal = [['#c9b79a', '#7a5b3a', '#4e3b29'], ['#8a9a8e', '#2f3d36', '#e0d5bf'], ['#b9a8a0', '#5e4040', '#2b2323']][bay.b % 3];
        const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fabricMat(rugTexture(...pal)));
        r.rotation.set(-Math.PI / 2, 0, rot); r.position.set(x, 0.006, z); r.receiveShadow = true; group.add(r);
      } else if (type === 'wallShelf') {
        const rows = extra || 4, ys = [];
        for (let i = 0; i < rows; i++) ys.push(0.55 + i * 0.42);
        const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, rot);
        for (const y of ys) {
          B.box('oak', w, 0.03, d, x - n.x * 0.0, y - 0.015, z - n.z * 0.0, rot, 0.9);
          for (const k of [-1, 1]) {
            const p = new THREE.Vector3(k * (w / 2 - 0.15), 0, 0).applyAxisAngle(UP, rot);
            B.box('brass', 0.02, 0.12, d * 0.8, x + p.x - n.x * 0.02, y - 0.08, z + p.z - n.z * 0.02, rot, 0);
          }
        }
        surfaces[key] = { x, y: ys[0], z, rot, rows: ys, w };
      }
    }
    // a pendant over each bay
  }

  /* ---------- framed art in the furniture room ---------- */
  {
    const bay = BAYS[0], xb = bay.s * (BAY_BACK - 0.02);
    // and two campaign prints beside the shoe wall
    const fb = BAYS[1], fxb = fb.s * (BAY_BACK - 0.02);
    for (const [v, pal] of [[-3.9, ['#c9bfb2', '#8c2f2f', '#24305e', '#e8e0d2']], [3.9, ['#d8c39a', '#24305e', '#f1ece2', '#6b6b6b']]]) {
      B.box('walnut', 0.04, 1.58, 1.18, fxb - fb.s * 0.02, 1.75, fb.zc + v, 0, 2);
      const art = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshStandardMaterial({ map: artTexture(pal, 360, 512), roughness: 0.85 }));
      art.position.set(fxb - fb.s * 0.045, 1.75, fb.zc + v); art.rotation.y = -fb.s * Math.PI / 2; group.add(art);
    }
    const pieces = [[0, 1.85, 1.5, 1.0, ['#d8cdbb', '#a65a3a', '#2f4a5c', '#e3b469', '#6d7a63']], [-4.3, 1.7, 0.8, 1.05, ['#e9e2d3', '#2b2b2b', '#b8a07a']], [4.3, 1.7, 0.8, 1.05, ['#d6d9d2', '#7c8c86', '#c87d54']]];
    for (const [v, y, w, h, pal] of pieces) {
      const z = bay.zc + v;
      B.box('walnut', 0.04, h + 0.08, w + 0.08, xb - bay.s * 0.02, y, z, 0, 2);
      const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: artTexture(pal), roughness: 0.85 }));
      art.position.set(xb - bay.s * 0.045, y, z); art.rotation.y = -bay.s * Math.PI / 2; group.add(art);
    }
  }

  /* ---------- pendants ---------- */
  const pendants = [];
  const globeMat = new THREE.MeshStandardMaterial({ color: 0xfff6ea, emissive: 0xffd9a8, emissiveIntensity: 2.2, roughness: 0.4 });
  const addPendant = (x, z, drop) => {
    const yb = CEIL - drop;
    B.add('brass', new THREE.CylinderGeometry(0.08, 0.08, 0.04, 20), new THREE.Matrix4().makeTranslation(x, CEIL - 0.02, z));
    B.add('steel', new THREE.CylinderGeometry(0.004, 0.004, drop - 0.2, 6), new THREE.Matrix4().makeTranslation(x, CEIL - (drop - 0.2) / 2, z));
    B.add('brass', new THREE.CylinderGeometry(0.05, 0.09, 0.08, 20), new THREE.Matrix4().makeTranslation(x, yb + 0.18, z));
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), globeMat); g.position.set(x, yb, z); group.add(g);
    pendants.push(new THREE.Vector3(x, yb - 0.1, z));
  };
  for (let z = 1; z > Z_END + 3; z -= 7) for (const x of [-5.1, 5.1]) addPendant(x, z, 2.6);
  for (const bay of BAYS) { const { x, z } = bayToWorld(bay, 3.4, 0); addPendant(x, z, 3.1); }
  addPendant(0, -56, 3.4);

  /* ---------- books ---------- */
  const atlas = spineAtlas();
  const bookGeo = new THREE.BoxGeometry(1, 1, 1); bookGeo.translate(0, 0.5, 0);
  const bookMat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.72, metalness: 0 });
  bookMat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute float aCell;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      float cell = normal.z > 0.5 ? aCell : 15.0;
      vMapUv = (uv + vec2(mod(cell, 4.0), floor(cell / 4.0))) / 4.0;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
      vec4 sp = texture2D(map, vMapUv);
      diffuseColor.rgb = mix(diffuseColor.rgb * (0.55 + 0.45 * sp.r), vec3(0.74, 0.56, 0.27), sp.g);`);
  };
  const bookMesh = new THREE.InstancedMesh(bookGeo, bookMat, books.length);
  const cellAttr = new Float32Array(books.length), col = new THREE.Color();
  books.forEach((b, i) => { bookMesh.setMatrixAt(i, b.m); bookMesh.setColorAt(i, col.set(b.color)); cellAttr[i] = b.cell; });
  bookGeo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cellAttr, 1));
  bookMesh.receiveShadow = true; bookMesh.frustumCulled = false;
  group.add(bookMesh);

  /* ---------- contact shadows ---------- */
  const shadowTex = contactShadow();
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x1a120b, alphaMap: shadowTex, transparent: true, depthWrite: false, opacity: 0.32, polygonOffset: true, polygonOffsetFactor: -2 });
  const shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2);
  function addShadows(spots) {
    const m = new THREE.InstancedMesh(shadowGeo, shadowMat, spots.length);
    spots.forEach(([x, z, s, a, y = 0.007], i) => m.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, 1, s))));
    m.renderOrder = 1; group.add(m);
  }
  addShadows(shadowSpots);

  B.build(mats, group, { cast: ['oak', 'walnut', 'paint', 'marble', 'brass'] });
  return { group, mats, surfaces, cases, books, bookMesh, pendants, addShadows };
}
