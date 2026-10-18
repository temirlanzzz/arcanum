// Procedural product models and the shop catalogue.
// Every builder adds parts in metres with the base at y = 0 and the front facing +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry.js';

const PI = Math.PI;
let PARTS = [];
const stack = [new THREE.Matrix4()];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
// Add a part: geometry, material kind, colour, then optional transform.
function add(g, m, c, x, y, z, rx, ry, rz, sx, sy, sz) {
  g.applyMatrix4(mat(x, y, z, rx, ry, rz, sx, sy, sz));
  g.applyMatrix4(stack[stack.length - 1]);
  PARTS.push({ g, m, c });
}
// Run fn with an extra local transform (sub-assemblies such as a laptop lid).
function at(x, y, z, rx, ry, rz, fn) {
  stack.push(stack[stack.length - 1].clone().multiply(mat(x, y, z, rx, ry, rz)));
  fn();
  stack.pop();
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const rbox = (w, h, d, r = Math.min(w, h, d) * 0.2) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
const cyl = (rt, rb, h, s = 16, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
const sph = (r, ws = 18, hs = 12) => new THREE.SphereGeometry(r, Math.min(ws, 16), Math.min(hs, 10));
const tor = (R, r, rs = 8, ts = 24, arc = PI * 2) => new THREE.TorusGeometry(R, r, Math.min(rs, 6), Math.min(ts, 20), arc);
const cone = (r, h, s = 16) => new THREE.ConeGeometry(r, h, s);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
const lathe = (pts, s = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), s);
const oct = r => new THREE.OctahedronGeometry(r, 0);

// Shared colours
const C = {
  copper: 0xb8693d, steel: 0xc6c9cf, gold: 0xd4a850, brass: 0xb08a3e, iron: 0x2b2b30, black: 0x1a1a1d, white: 0xeeeae2,
  cream: 0xeadfc4, wood: 0xa0703f, walnut: 0x6b4226, oak: 0xc49a62, ebony: 0x2a1c14, paper: 0xeee3c8, terracotta: 0xb4552f,
  soil: 0x2d1f15, leaf: 0x2f6b34, leafLight: 0x58a04a
};

// ---------------------------------------------------------------- builders
const B = {
  // Kitchen
  pot(v) {
    add(cyl(0.14, 0.13, 0.16, 28), v.m, v.c, 0, 0.08, 0);
    add(cyl(0.147, 0.147, 0.012, 28), v.m, v.c, 0, 0.166, 0);
    add(lathe([[0.145, 0], [0.12, 0.02], [0.05, 0.035], [0, 0.036]], 28), v.m, v.c, 0, 0.17, 0);
    add(sph(0.022), 'paint', C.black, 0, 0.215, 0);
    for (const sx of [-1, 1]) add(tor(0.03, 0.008, 6, 14), 'metal', C.steel, sx * 0.165, 0.13, 0, PI / 2, 0, 0);
  },
  pan(v) {
    add(lathe([[0, 0], [0.12, 0], [0.135, 0.01], [0.15, 0.05], [0.142, 0.05], [0.128, 0.012], [0, 0.012]], 28), v.m, v.c);
    add(rbox(0.24, 0.022, 0.035, 0.01), 'paint', C.black, 0.27, 0.042, 0, 0, 0, 0.12);
    add(sph(0.01), 'metal', C.steel, 0.155, 0.03, 0);
  },
  kettle(v) {
    add(lathe([[0, 0], [0.09, 0], [0.115, 0.03], [0.12, 0.08], [0.1, 0.15], [0.06, 0.19], [0.042, 0.2], [0, 0.2]], 28), v.m, v.c);
    add(sph(0.022), 'paint', C.black, 0, 0.215, 0);
    add(cyl(0.011, 0.024, 0.15, 12), v.m, v.c, 0.135, 0.11, 0, 0, 0, -0.95);
    add(tor(0.075, 0.011, 8, 20, PI), 'paint', C.black, 0, 0.165, 0);
  },
  teapot(v) {
    const g = new TeapotGeometry(0.075, 6);
    g.computeBoundingBox();
    add(g, v.m, v.c, 0, -g.boundingBox.min.y, 0);
  },
  knifeBlock(v) {
    at(0, 0, 0, -0.25, 0, 0, () => {
      add(rbox(0.13, 0.24, 0.16, 0.012), 'wood', v.c, 0, 0.12, 0);
      for (let i = 0; i < 5; i++) add(rbox(0.018, 0.1, 0.03, 0.007), 'paint', C.black, -0.045 + i * 0.022, 0.29, -0.02 + (i % 2) * 0.03);
    });
  },
  plates(v) {
    for (let i = 0; i < 6; i++) {
      add(lathe([[0, 0], [0.09, 0], [0.13, 0.012], [0.135, 0.016], [0.09, 0.006], [0, 0.006]], 32), 'gloss', i % 2 ? C.white : v.c, 0, i * 0.014, 0);
    }
    add(lathe([[0, 0], [0.04, 0], [0.085, 0.05], [0.08, 0.052], [0.035, 0.008], [0, 0.008]], 28), 'gloss', v.c, 0, 0.085, 0);
  },
  mugs(v) {
    for (let i = -1; i <= 1; i++) {
      add(cyl(0.042, 0.038, 0.1, 20), 'gloss', i ? v.c : C.white, i * 0.11, 0.05, 0);
      add(tor(0.026, 0.007, 6, 14), 'gloss', i ? v.c : C.white, i * 0.11 + 0.048, 0.055, 0);
    }
  },
  board(v) {
    add(rbox(0.38, 0.26, 0.022, 0.01), 'wood', v.c, 0, 0.13, 0, -0.18, 0, 0);
    add(rbox(0.28, 0.2, 0.022, 0.01), 'wood', C.walnut, 0.08, 0.1, 0.05, -0.12, 0, 0);
  },
  mixer(v) {
    add(rbox(0.3, 0.05, 0.18, 0.02), 'gloss', v.c, 0, 0.025, 0);
    add(rbox(0.08, 0.27, 0.11, 0.03), 'gloss', v.c, -0.1, 0.18, 0);
    add(rbox(0.3, 0.1, 0.13, 0.045), 'gloss', v.c, 0.02, 0.34, 0);
    add(lathe([[0, 0], [0.05, 0], [0.085, 0.05], [0.09, 0.13], [0.085, 0.13], [0.08, 0.05], [0.045, 0.006], [0, 0.006]], 24), 'metal', C.steel, 0.05, 0.05, 0);
    add(cyl(0.008, 0.008, 0.1), 'metal', C.steel, 0.05, 0.25, 0);
    add(cyl(0.012, 0.012, 0.03), 'metal', C.steel, 0.17, 0.34, 0, 0, 0, PI / 2);
  },
  espresso(v) {
    add(rbox(0.26, 0.34, 0.24, 0.03), 'metal', v.c, 0, 0.17, 0);
    add(rbox(0.24, 0.02, 0.1, 0.008), 'metal', C.steel, 0, 0.012, 0.15);
    add(cyl(0.035, 0.035, 0.04), 'metal', C.steel, 0, 0.21, 0.13);
    add(rbox(0.03, 0.025, 0.14, 0.01), 'paint', C.black, 0, 0.2, 0.22);
    add(cyl(0.03, 0.025, 0.06), 'gloss', C.white, 0, 0.055, 0.15);
    for (const x of [-0.06, 0.06]) add(cyl(0.018, 0.018, 0.015), 'metal', C.gold, x, 0.29, 0.122, PI / 2, 0, 0);
    add(box(0.07, 0.03, 0.003), 'glow', 0x7ef0ff, 0, 0.29, 0.121);
  },
  crock(v) {
    add(lathe([[0, 0], [0.06, 0], [0.068, 0.04], [0.065, 0.16], [0.07, 0.17], [0.064, 0.17], [0, 0.17]], 24), 'gloss', v.c);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3, rx = Math.cos(a) * 0.15, rz = Math.sin(a) * 0.15;
      add(cyl(0.006, 0.006, 0.26), 'wood', C.oak, Math.cos(a) * 0.02, 0.24, Math.sin(a) * 0.02, rz, 0, -rx);
      add(sph(0.02, 10, 8), 'wood', C.oak, Math.cos(a) * 0.04, 0.37, Math.sin(a) * 0.04, 0, 0, 0, 1, 0.4, 1.4);
    }
  },

  // Electronics
  laptop(v) {
    add(rbox(0.34, 0.018, 0.24, 0.006), 'metal', v.c, 0, 0.009, 0);
    add(box(0.3, 0.002, 0.1), 'paint', C.black, 0, 0.0185, -0.03);
    add(box(0.1, 0.002, 0.06), 'glow', v.g, 0, 0.0185, 0.08);
    at(0, 0.018, -0.12, -0.28, 0, 0, () => {
      add(rbox(0.34, 0.23, 0.01, 0.006), 'metal', v.c, 0, 0.115, -0.005);
      add(box(0.31, 0.2, 0.002), 'glow', v.g, 0, 0.118, 0.001);
      add(box(0.12, 0.12, 0.003), 'glow', 0xffffff, 0.04, 0.12, 0.002, 0, 0, PI / 4, 0.25, 0.25, 1);
    });
  },
  phone(v) {
    add(box(0.08, 0.02, 0.07), 'paint', C.black, 0, 0.01, 0);
    at(0, 0.02, -0.01, -0.2, 0, 0, () => {
      add(rbox(0.075, 0.155, 0.009, 0.009), 'metal', v.c, 0, 0.075, 0);
      add(box(0.068, 0.145, 0.002), 'glow', v.g, 0, 0.076, 0.0052);
    });
  },
  tablet(v) {
    add(box(0.16, 0.02, 0.1), 'paint', C.black, 0, 0.01, 0);
    at(0, 0.02, -0.02, -0.25, 0, 0, () => {
      add(rbox(0.25, 0.18, 0.008, 0.012), 'metal', v.c, 0, 0.09, 0);
      add(box(0.235, 0.165, 0.002), 'glow', v.g, 0, 0.09, 0.0048);
    });
  },
  headphones(v) {
    add(cyl(0.06, 0.07, 0.015), 'metal', C.iron, 0, 0.008, 0);
    add(cyl(0.01, 0.01, 0.2), 'metal', C.iron, 0, 0.11, 0);
    add(tor(0.085, 0.012, 8, 24, PI), 'paint', v.c, 0, 0.13, 0);
    for (const sx of [-1, 1]) {
      add(cyl(0.048, 0.048, 0.035, 24), 'paint', v.c, sx * 0.09, 0.115, 0, 0, 0, PI / 2);
      add(tor(0.035, 0.004, 6, 24), 'glow', v.g, sx * 0.109, 0.115, 0, 0, PI / 2, 0);
    }
  },
  speaker(v) {
    add(cyl(0.075, 0.075, 0.21, 28), 'fabric', v.c, 0, 0.105, 0);
    add(cyl(0.078, 0.078, 0.015, 28), 'metal', C.iron, 0, 0.2175, 0);
    add(tor(0.06, 0.004, 6, 32), 'glow', v.g, 0, 0.226, 0, PI / 2, 0, 0);
    add(cyl(0.078, 0.078, 0.01, 28), 'metal', C.iron, 0, 0.005, 0);
  },
  console(v) {
    add(rbox(0.32, 0.065, 0.21, 0.02), 'gloss', v.c, 0, 0.0325, 0);
    add(box(0.2, 0.004, 0.003), 'glow', v.g, 0, 0.045, 0.106);
    for (const [x, ry] of [[-0.1, 0.3], [0.13, -0.2]]) at(x, 0.065, 0.14, 0, ry, 0, () => {
      add(rbox(0.13, 0.03, 0.065, 0.02), 'gloss', C.black, 0, 0.015, 0);
      for (const sx of [-1, 1]) add(cyl(0.008, 0.008, 0.012), 'paint', 0x444444, sx * 0.03, 0.035, 0);
      add(sph(0.005), 'glow', v.g, 0.04, 0.03, -0.01);
    });
  },
  watch(v) {
    add(rbox(0.14, 0.05, 0.12, 0.02), 'fabric', 0x2a2440, 0, 0.025, 0);
    add(tor(0.035, 0.009, 8, 24), 'paint', v.c, 0, 0.088, 0, 0, 0, 0, 1, 1, 0.9);
    add(rbox(0.045, 0.052, 0.014, 0.01), 'metal', C.iron, 0, 0.088, 0.035);
    add(box(0.038, 0.044, 0.002), 'glow', v.g, 0, 0.088, 0.043);
  },
  camera(v) {
    add(rbox(0.15, 0.095, 0.065, 0.012), 'paint', v.c, 0, 0.0475, 0);
    add(rbox(0.05, 0.03, 0.04, 0.008), 'paint', v.c, -0.03, 0.1, 0);
    add(cyl(0.036, 0.036, 0.07, 24), 'metal', C.iron, 0.01, 0.048, 0.065, PI / 2, 0, 0);
    add(cyl(0.028, 0.028, 0.005, 24), 'glass', 0x6a8cff, 0.01, 0.048, 0.101, PI / 2, 0, 0);
    add(cyl(0.012, 0.012, 0.012), 'metal', C.steel, 0.045, 0.1, 0);
  },
  vr(v) {
    add(rbox(0.19, 0.1, 0.1, 0.04), 'gloss', v.c, 0, 0.07, 0);
    add(rbox(0.18, 0.085, 0.01, 0.03), 'gloss', C.black, 0, 0.07, 0.05);
    add(box(0.1, 0.006, 0.002), 'glow', v.g, 0, 0.07, 0.056);
    add(tor(0.1, 0.012, 6, 28, PI), 'paint', 0x333338, 0, 0.07, -0.05, PI / 2, 0, PI);
    add(box(0.12, 0.02, 0.08), 'paint', 0x333338, 0, 0.01, 0);
  },
  orb(v) {
    add(lathe([[0, 0], [0.08, 0], [0.085, 0.02], [0.05, 0.05], [0.055, 0.07], [0, 0.07]], 24), 'metal', C.gold);
    add(sph(0.09, 28, 20), 'glass', 0xcfe8ff, 0, 0.15, 0);
    add(sph(0.05, 18, 12), 'glow', v.g, 0, 0.15, 0);
    add(tor(0.1, 0.004, 6, 32), 'metal', C.gold, 0, 0.15, 0, 1.1, 0.4, 0);
  },

  // Furniture
  sofa(v) {
    const w = v.w || 2.0;
    add(rbox(w, 0.24, 0.92, 0.05), 'fabric', v.c, 0, 0.22, 0);
    add(rbox(w, 0.52, 0.22, 0.08), 'fabric', v.c, 0, 0.6, -0.35);
    for (const s of [-1, 1]) add(rbox(0.2, 0.44, 0.92, 0.08), 'fabric', v.c, s * (w / 2 - 0.1), 0.42, 0);
    const n = Math.max(1, Math.round((w - 0.4) / 0.6)), cw = (w - 0.4) / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 0.2 + cw * (i + 0.5);
      add(rbox(cw - 0.01, 0.14, 0.68, 0.06), 'fabric', v.c, x, 0.41, 0.07);
      add(rbox(cw - 0.03, 0.38, 0.16, 0.07), 'fabric', v.c, x, 0.67, -0.2, -0.12, 0, 0);
    }
    if (w > 1.2) add(rbox(0.36, 0.36, 0.12, 0.06), 'fabric', v.a || C.gold, -w / 2 + 0.42, 0.62, -0.08, -0.2, 0.3, 0.1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(cyl(0.025, 0.018, 0.1), 'wood', C.walnut, sx * (w / 2 - 0.08), 0.05, sz * 0.38);
  },
  coffeeTable(v) {
    add(rbox(1.1, 0.05, 0.6, 0.02), 'wood', v.c, 0, 0.42, 0);
    add(box(1.0, 0.02, 0.5), 'wood', v.c, 0, 0.12, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(cyl(0.025, 0.02, 0.4), 'wood', v.c, sx * 0.5, 0.2, sz * 0.25);
    add(rbox(0.22, 0.04, 0.16, 0.01), 'paint', 0x5a1a1a, -0.25, 0.465, 0.05);
    add(rbox(0.2, 0.035, 0.15, 0.01), 'paint', 0x1f3a2c, -0.25, 0.502, 0.05, 0, 0.2, 0);
    add(lathe([[0, 0], [0.04, 0], [0.06, 0.08], [0.03, 0.18], [0.035, 0.2], [0, 0.2]], 20), 'gloss', 0x2e4a6a, 0.28, 0.445, -0.05);
  },
  rug(v) {
    add(box(2.6, 0.012, 1.8), 'fabric', v.a || 0x6b1f2f, 0, 0.006, 0);
    add(box(2.3, 0.014, 1.5), 'fabric', v.c, 0, 0.007, 0);
    add(cyl(0.4, 0.4, 0.016, 6), 'fabric', v.a || 0x6b1f2f, 0, 0.008, 0, 0, PI / 6, 0, 1, 1, 0.7);
  },
  floorLamp(v) {
    add(cyl(0.16, 0.18, 0.03, 24), 'metal', v.m === 'metal' ? v.c : C.brass, 0, 0.015, 0);
    add(cyl(0.012, 0.012, 1.5, 10), 'metal', C.brass, 0, 0.78, 0);
    add(cyl(0.2, 0.27, 0.32, 28, true), 'fabric', v.c, 0, 1.58, 0);
    add(sph(0.06), 'glow', 0xffd9a0, 0, 1.52, 0);
  },
  armchair(v) {
    this.sofa({ ...v, w: 0.95 });
  },
  desk(v) {
    add(rbox(1.4, 0.04, 0.7, 0.015), 'wood', v.c, 0, 0.74, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(box(0.05, 0.72, 0.05), 'metal', C.iron, sx * 0.65, 0.36, sz * 0.3);
    add(box(0.4, 0.5, 0.6), 'wood', v.c, 0.45, 0.45, 0);
    for (let i = 0; i < 3; i++) add(box(0.02, 0.012, 0.01), 'metal', C.gold, 0.45, 0.3 + i * 0.15, 0.305);
  },
  officeChair(v) {
    add(rbox(0.5, 0.08, 0.5, 0.03), 'fabric', v.c, 0, 0.48, 0);
    add(rbox(0.46, 0.62, 0.07, 0.03), 'fabric', v.c, 0, 0.86, -0.24, 0.1, 0, 0);
    add(cyl(0.025, 0.025, 0.32), 'metal', C.steel, 0, 0.3, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      add(box(0.3, 0.03, 0.04), 'metal', C.iron, Math.cos(a) * 0.15, 0.1, Math.sin(a) * 0.15, 0, -a, 0);
      add(sph(0.03, 10, 8), 'paint', C.black, Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29);
    }
    for (const s of [-1, 1]) add(rbox(0.05, 0.03, 0.3, 0.012), 'paint', C.black, s * 0.26, 0.66, 0);
  },
  monitor(v) {
    add(cyl(0.1, 0.11, 0.015, 24), 'metal', C.iron, 0, 0.008, 0);
    add(box(0.04, 0.2, 0.02), 'metal', C.iron, 0, 0.11, -0.02);
    add(rbox(0.62, 0.38, 0.03, 0.01), 'paint', C.black, 0, 0.36, 0);
    add(box(0.59, 0.35, 0.002), 'glow', v.g, 0, 0.36, 0.016);
  },
  deskLamp(v) {
    add(cyl(0.07, 0.08, 0.02, 20), 'metal', v.c, 0, 0.01, 0);
    add(box(0.018, 0.3, 0.018), 'metal', v.c, 0.03, 0.15, 0, 0, 0, -0.35);
    add(box(0.018, 0.26, 0.018), 'metal', v.c, 0.12, 0.38, 0, 0, 0, 0.9);
    add(cone(0.065, 0.11, 20), 'metal', v.c, 0.2, 0.42, 0, 0, 0, 2.2);
    add(sph(0.03), 'glow', 0xffe4b0, 0.215, 0.39, 0);
  },
  diningTable(v) {
    add(rbox(1.8, 0.05, 0.95, 0.02), 'wood', v.c, 0, 0.75, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(cyl(0.035, 0.028, 0.73, 12), 'wood', v.c, sx * 0.8, 0.365, sz * 0.38);
    for (const x of [-0.45, 0.45]) {
      add(cyl(0.13, 0.13, 0.012, 28), 'gloss', C.white, x, 0.782, 0);
      add(cyl(0.025, 0.02, 0.06, 12), 'metal', C.gold, x + 0.2, 0.81, -0.1);
    }
    add(lathe([[0, 0], [0.05, 0], [0.07, 0.1], [0.03, 0.22], [0.04, 0.26], [0, 0.26]], 20), 'gloss', 0xc9b48a, 0, 0.775, 0);
  },
  diningChair(v) {
    add(rbox(0.45, 0.05, 0.45, 0.015), 'wood', v.c, 0, 0.46, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(cyl(0.02, 0.016, 0.45, 10), 'wood', v.c, sx * 0.19, 0.225, sz * 0.19);
    for (const sx of [-1, 1]) add(box(0.035, 0.5, 0.035), 'wood', v.c, sx * 0.19, 0.73, -0.2);
    for (let i = 0; i < 3; i++) add(box(0.36, 0.05, 0.02), 'wood', v.c, 0, 0.62 + i * 0.13, -0.2);
    add(rbox(0.4, 0.04, 0.4, 0.015), 'fabric', v.a || 0x6b1f2f, 0, 0.5, 0);
  },
  bed(v) {
    add(rbox(1.7, 0.3, 2.1, 0.03), 'wood', C.walnut, 0, 0.2, 0);
    add(rbox(1.6, 0.24, 2.0, 0.08), 'fabric', C.white, 0, 0.47, 0);
    add(rbox(1.66, 0.06, 1.3, 0.03), 'fabric', v.c, 0, 0.6, 0.38);
    for (const x of [-0.4, 0.4]) add(rbox(0.6, 0.14, 0.36, 0.07), 'fabric', C.cream, x, 0.66, -0.74, -0.25, 0, 0);
    add(rbox(1.8, 1.05, 0.12, 0.05), 'fabric', v.c, 0, 0.62, -1.06);
  },
  nightstand(v) {
    add(rbox(0.5, 0.55, 0.42, 0.02), 'wood', v.c, 0, 0.275, 0);
    for (const y of [0.18, 0.4]) { add(box(0.44, 0.003, 0.003), 'paint', C.ebony, 0, y + 0.1, 0.211); add(sph(0.014, 10, 8), 'metal', C.gold, 0, y, 0.215); }
  },
  tableLamp(v) {
    add(lathe([[0, 0], [0.07, 0], [0.09, 0.08], [0.06, 0.2], [0.02, 0.25], [0, 0.25]], 24), 'gloss', v.c);
    add(cyl(0.1, 0.15, 0.17, 24, true), 'fabric', C.cream, 0, 0.33, 0);
    add(sph(0.04), 'glow', 0xffd9a0, 0, 0.3, 0);
  },
  vase(v) {
    add(lathe([[0, 0], [0.06, 0], [0.11, 0.12], [0.1, 0.24], [0.05, 0.33], [0.06, 0.38], [0.055, 0.38], [0, 0.37]], 28), 'gloss', v.c);
    for (let i = 0; i < 4; i++) add(cyl(0.004, 0.004, 0.3), 'leaf', C.leaf, Math.cos(i * 1.6) * 0.03, 0.5, Math.sin(i * 1.6) * 0.03, Math.sin(i) * 0.25, 0, Math.cos(i) * 0.25);
    for (let i = 0; i < 4; i++) add(sph(0.035, 10, 8), 'fabric', v.a || 0xe0607e, Math.cos(i * 1.6) * 0.07, 0.65 + (i % 2) * 0.04, Math.sin(i * 1.6) * 0.07);
  },
  clock(v) {
    add(cyl(0.16, 0.16, 0.04, 40), 'wood', v.c, 0, 0.16, 0, PI / 2, 0, 0);
    add(cyl(0.14, 0.14, 0.005, 40), 'gloss', C.cream, 0, 0.16, 0.022, PI / 2, 0, 0);
    add(box(0.008, 0.1, 0.004), 'metal', C.black, 0.02, 0.19, 0.027, 0, 0, -0.5);
    add(box(0.006, 0.07, 0.004), 'metal', C.black, -0.02, 0.17, 0.028, 0, 0, 1.2);
    add(tor(0.155, 0.01, 6, 40), 'metal', C.gold, 0, 0.16, 0.02);
  },
  sculpture(v) {
    add(box(0.14, 0.06, 0.14), 'paint', C.ebony, 0, 0.03, 0);
    add(new THREE.TorusKnotGeometry(0.07, 0.022, 100, 12), 'metal', v.c, 0, 0.17, 0);
  },

  // Books
  tome(v) {
    add(rbox(0.19, 0.26, 0.055, 0.006), 'paint', v.c, 0, 0.13, 0);
    add(box(0.18, 0.245, 0.046), 'paint', C.paper, 0.006, 0.13, 0);
    add(box(0.12, 0.16, 0.003), 'metal', C.gold, 0, 0.14, 0.028);
    add(box(0.1, 0.14, 0.004), 'paint', v.c, 0, 0.14, 0.029);
    add(oct(0.016), 'glow', v.g || 0xffd27a, 0, 0.14, 0.033);
    for (const x of [-0.085, 0.085]) for (const y of [0.012, 0.248]) add(box(0.025, 0.025, 0.06), 'metal', C.gold, x, y, 0);
  },
  bookStack(v) {
    let y = 0;
    const cols = [v.c, 0x1f3a2c, 0x25304f, 0x7a5524];
    for (let i = 0; i < 4; i++) {
      const w = 0.24 - i * 0.02, h = 0.04 + (i % 2) * 0.012;
      add(rbox(w, h, 0.17 - i * 0.01, 0.004), 'paint', cols[i], 0, y + h / 2, 0, 0, (i - 1.5) * 0.12, 0);
      add(box(w - 0.012, h - 0.008, 0.165 - i * 0.01), 'paint', C.paper, 0.006, y + h / 2, 0, 0, (i - 1.5) * 0.12, 0);
      y += h;
    }
  },
  lectern(v) {
    add(box(0.3, 0.04, 0.25), 'wood', v.c, 0, 0.02, 0);
    add(box(0.06, 0.32, 0.06), 'wood', v.c, 0, 0.18, 0);
    at(0, 0.36, 0, 0.5, 0, 0, () => {
      add(box(0.38, 0.03, 0.28), 'wood', v.c, 0, 0, 0);
      for (const s of [-1, 1]) add(box(0.17, 0.012, 0.24), 'paint', C.paper, s * 0.088, 0.024, 0, 0, 0, s * -0.08);
      add(box(0.36, 0.008, 0.26), 'paint', 0x5a1a1a, 0, 0.018, 0);
    });
  },
  scroll(v) {
    add(cyl(0.035, 0.035, 0.3, 20), 'paint', C.paper, 0, 0.04, 0, 0, 0, PI / 2);
    for (const s of [-1, 1]) add(cyl(0.012, 0.012, 0.05, 10), 'wood', C.ebony, s * 0.175, 0.04, 0, 0, 0, PI / 2);
    for (const s of [-1, 1]) add(sph(0.016, 10, 8), 'metal', C.gold, s * 0.205, 0.04, 0);
    add(cyl(0.037, 0.037, 0.03, 20), 'fabric', v.c, 0, 0.04, 0, 0, 0, PI / 2);
  },
  globe(v) {
    add(cyl(0.08, 0.1, 0.03, 24), 'wood', C.walnut, 0, 0.015, 0);
    add(cyl(0.01, 0.01, 0.08), 'metal', C.brass, 0, 0.07, 0);
    add(sph(0.12, 32, 22), 'gloss', v.c, 0, 0.23, 0);
    for (let i = 0; i < 7; i++) add(sph(0.05, 10, 8), 'paint', 0xc9a76a, Math.cos(i * 2.1) * 0.095, 0.23 + Math.sin(i * 1.3) * 0.06, Math.sin(i * 2.1) * 0.095, 0, 0, 0, 1, 0.5, 0.6);
    add(tor(0.135, 0.006, 6, 40, PI * 1.4), 'metal', C.brass, 0, 0.23, 0, 0, 0, 2.2);
  },
  inkQuill(v) {
    add(lathe([[0, 0], [0.045, 0], [0.05, 0.03], [0.03, 0.06], [0.015, 0.075], [0.018, 0.085], [0, 0.085]], 20), 'glass', 0x223355);
    add(cyl(0.04, 0.042, 0.04, 20), 'glow', v.g || 0x3050ff, 0, 0.02, 0);
    add(cone(0.02, 0.3, 10), 'fabric', v.c, 0.03, 0.2, 0, 0, 0, -0.25, 1, 1, 0.25);
  },

  // Toys & games
  teddy(v) {
    add(sph(0.09), 'fabric', v.c, 0, 0.11, 0, 0, 0, 0, 1, 1.1, 0.9);
    add(sph(0.07), 'fabric', v.c, 0, 0.25, 0.01);
    for (const s of [-1, 1]) {
      add(sph(0.026, 12, 8), 'fabric', v.c, s * 0.05, 0.31, 0);
      add(cap(0.025, 0.06), 'fabric', v.c, s * 0.09, 0.13, 0.02, 0.5, 0, s * 0.7);
      add(sph(0.035, 12, 8), 'fabric', v.c, s * 0.05, 0.03, 0.05, 0, 0, 0, 1, 0.8, 1.2);
      add(sph(0.008, 8, 6), 'gloss', C.black, s * 0.025, 0.27, 0.07);
    }
    add(sph(0.03, 12, 8), 'fabric', C.cream, 0, 0.235, 0.065);
    add(sph(0.01, 8, 6), 'gloss', C.black, 0, 0.245, 0.093);
    add(tor(0.035, 0.008, 6, 16), 'fabric', 0xc0392b, 0, 0.19, 0.02, PI / 2.3, 0, 0);
  },
  blocks(v) {
    const cols = [0xd83a2c, 0x2f6fd8, 0xf2c230, 0x2fa05a, 0xe07a1f, 0x8e44ad];
    const pos = [[-0.065, 0], [0, 0], [0.065, 0], [-0.0325, 1], [0.0325, 1], [0, 2]];
    pos.forEach(([x, l], i) => add(rbox(0.06, 0.06, 0.06, 0.006), 'gloss', cols[(i + v.i) % 6], x, 0.03 + l * 0.061, 0, 0, i * 0.15, 0));
  },
  ball(v) {
    add(sph(0.1, 28, 20), 'gloss', v.c, 0, 0.1, 0);
    add(tor(0.1, 0.012, 8, 40), 'gloss', C.white, 0, 0.1, 0, PI / 2, 0, 0);
    add(tor(0.1, 0.012, 8, 40), 'gloss', C.white, 0, 0.1, 0, 0, 0, 0);
  },
  rocket(v) {
    add(cyl(0.04, 0.05, 0.22, 20), 'gloss', C.white, 0, 0.15, 0);
    add(cone(0.04, 0.09, 20), 'gloss', v.c, 0, 0.305, 0);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2; add(box(0.004, 0.08, 0.06), 'gloss', v.c, Math.sin(a) * 0.05, 0.07, Math.cos(a) * 0.05, 0, a, 0); }
    add(cyl(0.016, 0.016, 0.01, 16), 'glow', 0x7ad7ff, 0, 0.2, 0.044, PI / 2, 0, 0);
    add(cone(0.03, 0.05, 12), 'glow', 0xff8a3d, 0, 0.02, 0, PI, 0, 0);
  },
  car(v) {
    add(rbox(0.22, 0.06, 0.11, 0.02), 'gloss', v.c, 0, 0.055, 0);
    add(rbox(0.11, 0.05, 0.095, 0.02), 'glass', 0x99bbdd, -0.01, 0.1, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(cyl(0.025, 0.025, 0.02, 16), 'paint', C.black, sx * 0.07, 0.025, sz * 0.055, PI / 2, 0, 0);
    for (const sz of [-1, 1]) add(sph(0.008, 8, 6), 'glow', 0xfff2c0, 0.11, 0.06, sz * 0.035);
  },
  duck(v) {
    add(sph(0.08, 20, 14), 'gloss', v.c, 0, 0.07, 0, 0, 0, 0, 1.15, 0.85, 1);
    add(sph(0.05, 18, 12), 'gloss', v.c, 0.05, 0.16, 0);
    add(cone(0.02, 0.05, 12), 'gloss', 0xff8a1f, 0.11, 0.155, 0, 0, 0, -PI / 2, 1, 1, 0.6);
    for (const s of [-1, 1]) add(sph(0.007, 8, 6), 'gloss', C.black, 0.085, 0.18, s * 0.025);
  },
  boardGame(v) {
    add(box(0.32, 0.06, 0.32), 'paint', v.c, 0, 0.03, 0);
    add(box(0.322, 0.03, 0.322), 'paint', C.cream, 0, 0.045, 0);
    add(box(0.2, 0.002, 0.2), 'glow', v.g || 0xffd27a, 0, 0.061, 0);
    for (let i = 0; i < 2; i++) add(rbox(0.04, 0.04, 0.04, 0.008), 'gloss', C.white, -0.05 + i * 0.07, 0.082, 0.18, 0, i * 0.6, 0);
  },
  runeCube(v) {
    const cols = [0xd83a2c, 0x2f6fd8, 0xf2c230, 0x2fa05a, 0xe07a1f, C.white];
    for (let x = -1; x <= 1; x++) for (let y = 0; y < 3; y++) for (let z = -1; z <= 1; z++) {
      add(rbox(0.036, 0.036, 0.036, 0.005), 'gloss', cols[(x * 3 + y * 5 + z * 7 + 30 + v.i) % 6], x * 0.038, 0.02 + y * 0.038, z * 0.038);
    }
  },
  top(v) {
    add(lathe([[0, 0], [0.01, 0.01], [0.06, 0.05], [0.065, 0.065], [0.04, 0.085], [0.01, 0.09], [0.008, 0.14], [0, 0.14]], 24), 'gloss', v.c);
    add(tor(0.062, 0.006, 6, 30), 'metal', C.gold, 0, 0.06, 0, PI / 2, 0, 0);
  },

  // Fashion
  sneakers(v) {
    for (const s of [-1, 1]) at(s * 0.065, 0, 0, 0, s * 0.08, 0, () => {
      add(rbox(0.1, 0.03, 0.28, 0.012), 'gloss', C.white, 0, 0.015, 0);
      add(rbox(0.09, 0.075, 0.2, 0.035), 'fabric', v.c, 0, 0.065, -0.03);
      add(sph(0.05, 16, 10), 'fabric', v.c, 0, 0.045, 0.08, 0, 0, 0, 0.9, 0.7, 1.2);
      add(tor(0.028, 0.006, 6, 16), 'gloss', C.white, 0, 0.105, -0.07, PI / 2, 0, 0);
      add(box(0.004, 0.03, 0.12), 'gloss', v.a || C.white, s * 0.046, 0.06, 0.0);
    });
  },
  handbag(v) {
    add(rbox(0.28, 0.2, 0.12, 0.035), 'paint', v.c, 0, 0.1, 0);
    add(rbox(0.285, 0.07, 0.125, 0.03), 'paint', v.c, 0, 0.18, 0.005);
    add(tor(0.08, 0.009, 8, 22, PI), 'paint', v.c, 0, 0.2, 0);
    add(box(0.04, 0.025, 0.01), 'metal', C.gold, 0, 0.16, 0.064);
  },
  hat(v) {
    add(cyl(0.18, 0.18, 0.008, 40), 'fabric', v.c, 0, 0.004, 0);
    add(lathe([[0.095, 0], [0.09, 0.08], [0.06, 0.12], [0, 0.11]], 28), 'fabric', v.c, 0, 0.004, 0);
    add(cyl(0.097, 0.096, 0.026, 28), 'fabric', v.a || C.black, 0, 0.018, 0);
    add(cone(0.012, 0.12, 6), 'fabric', 0xc0392b, 0.09, 0.06, 0, 0, 0, -1.0);
  },
  sunglasses(v) {
    add(box(0.18, 0.012, 0.08), 'glass', 0xffffff, 0, 0.006, 0);
    at(0, 0.05, 0, -0.1, 0, 0, () => {
      for (const s of [-1, 1]) {
        add(cyl(0.03, 0.03, 0.004, 24), 'glass', 0x332222, s * 0.037, 0, 0, PI / 2, 0, 0);
        add(tor(0.031, 0.004, 6, 24), 'metal', v.c, s * 0.037, 0, 0);
        add(box(0.004, 0.006, 0.13), 'metal', v.c, s * 0.069, 0.01, -0.065);
      }
      add(tor(0.012, 0.003, 6, 12, PI), 'metal', v.c, 0, 0.008, 0);
    });
  },
  sweaters(v) {
    const cols = [v.c, v.a || 0xe8dcc2, 0x2c3e50];
    for (let i = 0; i < 3; i++) add(rbox(0.3, 0.06, 0.25, 0.026), 'fabric', cols[i], (i - 1) * 0.008, 0.03 + i * 0.058, 0, 0, (i - 1) * 0.04, 0);
  },
  boots(v) {
    for (const s of [-1, 1]) at(s * 0.065, 0, 0, 0, s * 0.06, 0, () => {
      add(rbox(0.09, 0.03, 0.25, 0.012), 'paint', C.ebony, 0, 0.015, 0.02);
      add(rbox(0.085, 0.07, 0.18, 0.03), 'paint', v.c, 0, 0.06, 0.04);
      add(rbox(0.085, 0.24, 0.11, 0.03), 'paint', v.c, 0, 0.15, -0.04);
      add(tor(0.044, 0.005, 6, 16), 'metal', C.brass, 0, 0.26, -0.04, PI / 2, 0, 0, 1, 1.25, 1);
    });
  },
  scarf(v) {
    add(tor(0.07, 0.035, 12, 28), 'fabric', v.c, 0, 0.035, 0, PI / 2, 0, 0, 1, 1, 0.9);
    add(rbox(0.1, 0.02, 0.22, 0.01), 'fabric', v.c, 0.05, 0.012, 0.1, 0, 0.5, 0);
    add(rbox(0.1, 0.02, 0.06, 0.008), 'fabric', v.a || C.cream, 0.08, 0.014, 0.2, 0, 0.5, 0);
  },
  backpack(v) {
    add(rbox(0.28, 0.38, 0.14, 0.06), 'fabric', v.c, 0, 0.19, 0);
    add(rbox(0.22, 0.16, 0.06, 0.03), 'fabric', v.c, 0, 0.12, 0.08);
    add(box(0.02, 0.012, 0.004), 'metal', C.gold, 0.04, 0.2, 0.111);
    add(tor(0.04, 0.01, 6, 14, PI), 'fabric', C.black, 0, 0.38, 0);
  },
  jewels(v) {
    add(rbox(0.16, 0.06, 0.12, 0.012), 'wood', C.walnut, 0, 0.03, 0);
    add(box(0.14, 0.01, 0.1), 'fabric', 0x4a1530, 0, 0.061, 0);
    at(0, 0.06, -0.06, -1.1, 0, 0, () => add(rbox(0.16, 0.06, 0.012, 0.006), 'wood', C.walnut, 0, 0.0, 0.0));
    add(tor(0.022, 0.005, 8, 20), 'metal', C.gold, -0.03, 0.08, 0.01, 0.3, 0, 0);
    add(oct(0.012), 'glow', v.g || 0xff3060, -0.03, 0.103, 0.01);
    add(oct(0.018), 'glow', v.g || 0xff3060, 0.035, 0.085, 0.0);
  },

  // Beauty
  potion(v) {
    add(lathe([[0, 0], [0.05, 0.004], [0.075, 0.05], [0.07, 0.1], [0.032, 0.135], [0.02, 0.15], [0.02, 0.19], [0.026, 0.2], [0, 0.2]], 28), 'glass', 0xd8eeff);
    add(sph(0.06, 22, 14), 'glow', v.g, 0, 0.062, 0, 0, 0, 0, 1, 0.9, 1);
    add(cyl(0.018, 0.015, 0.035, 12), 'wood', C.oak, 0, 0.21, 0);
    add(tor(0.022, 0.003, 6, 16), 'metal', C.gold, 0, 0.17, 0, PI / 2, 0, 0);
  },
  potionTall(v) {
    add(cyl(0.035, 0.035, 0.2, 20), 'glass', 0xd8eeff, 0, 0.1, 0);
    add(cyl(0.03, 0.03, 0.13, 20), 'glow', v.g, 0, 0.07, 0);
    add(cyl(0.015, 0.035, 0.04, 20), 'glass', 0xd8eeff, 0, 0.22, 0);
    add(sph(0.02, 12, 8), 'paint', 0x8a1020, 0, 0.25, 0);
    add(box(0.05, 0.06, 0.002), 'paint', C.paper, 0, 0.11, 0.036);
  },
  flask(v) {
    add(lathe([[0, 0], [0.08, 0.004], [0.075, 0.03], [0.025, 0.14], [0.022, 0.19], [0.026, 0.2], [0, 0.2]], 24), 'glass', 0xd8eeff);
    add(lathe([[0, 0.005], [0.074, 0.008], [0.07, 0.03], [0.04, 0.09], [0, 0.09]], 24), 'glow', v.g);
    add(cyl(0.02, 0.018, 0.03, 12), 'wood', C.oak, 0, 0.21, 0);
  },
  perfume(v) {
    add(cyl(0.055, 0.055, 0.09, 6), 'glass', 0xffe8f0, 0, 0.045, 0);
    add(cyl(0.045, 0.045, 0.07, 6), 'glow', v.g, 0, 0.04, 0);
    add(cyl(0.015, 0.015, 0.02, 12), 'metal', C.gold, 0, 0.1, 0);
    add(sph(0.022, 14, 10), 'metal', C.gold, 0, 0.125, 0);
  },
  jar(v) {
    add(cyl(0.06, 0.06, 0.06, 28), 'gloss', v.c, 0, 0.03, 0);
    add(cyl(0.062, 0.062, 0.025, 28), 'metal', C.gold, 0, 0.0725, 0);
  },
  lipsticks(v) {
    for (let i = -1; i <= 1; i++) {
      add(cyl(0.012, 0.012, 0.06, 16), 'metal', C.gold, i * 0.035, 0.03, 0);
      add(cyl(0.01, 0.01, 0.03, 16), 'gloss', i ? v.c : 0x8a1020, i * 0.035, 0.07, 0);
      add(sph(0.01, 12, 8), 'gloss', i ? v.c : 0x8a1020, i * 0.035, 0.085, 0, 0, 0, 0.3);
    }
  },
  mirror(v) {
    add(cyl(0.05, 0.06, 0.02, 20), 'metal', C.gold, 0, 0.01, 0);
    add(cyl(0.01, 0.01, 0.12), 'metal', C.gold, 0, 0.08, 0);
    add(cyl(0.09, 0.09, 0.01, 40), 'metal', 0xf2f4f8, 0, 0.23, 0, PI / 2 - 0.1, 0, 0);
    add(tor(0.092, 0.01, 8, 40), 'metal', v.c, 0, 0.23, 0, -0.1, 0, 0);
  },
  candle(v) {
    add(cyl(0.05, 0.05, 0.1, 24, true), 'glass', 0xfff0d8, 0, 0.05, 0);
    add(cyl(0.045, 0.045, 0.07, 24), 'paint', v.c, 0, 0.035, 0);
    add(cone(0.008, 0.03, 8), 'glow', 0xffb050, 0, 0.09, 0);
  },

  // Garden
  monstera(v) {
    add(lathe([[0, 0], [0.09, 0], [0.12, 0.2], [0.13, 0.215], [0.125, 0.225], [0, 0.22]], 24), 'paint', v.c);
    add(cyl(0.118, 0.118, 0.01, 24), 'paint', C.soil, 0, 0.21, 0);
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4, h = 0.3 + (i % 3) * 0.1, out = 0.1 + (i % 2) * 0.06;
      add(cyl(0.005, 0.006, h, 6), 'leaf', C.leaf, Math.cos(a) * out * 0.5, 0.21 + h / 2, Math.sin(a) * out * 0.5, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      add(sph(0.1, 14, 8), 'leaf', i % 2 ? C.leaf : C.leafLight, Math.cos(a) * out, 0.21 + h, Math.sin(a) * out, 0.4 * Math.sin(a), -a, 0.4, 1.0, 0.08, 1.4);
    }
  },
  cactus(v) {
    add(lathe([[0, 0], [0.06, 0], [0.075, 0.12], [0.08, 0.13], [0, 0.13]], 20), 'paint', v.c);
    add(cap(0.04, 0.16), 'leaf', 0x4f8a3c, 0, 0.25, 0);
    add(cap(0.022, 0.06), 'leaf', 0x4f8a3c, 0.05, 0.26, 0, 0, 0, -0.6);
    add(cap(0.02, 0.05), 'leaf', 0x4f8a3c, -0.045, 0.3, 0, 0, 0, 0.6);
    add(sph(0.018, 10, 8), 'fabric', 0xff6fae, 0, 0.36, 0);
  },
  fern(v) {
    add(lathe([[0, 0], [0.08, 0], [0.1, 0.16], [0.105, 0.17], [0, 0.17]], 22), 'gloss', v.c);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2, tilt = 0.6 + (i % 3) * 0.25;
      add(sph(0.16, 10, 6), 'leaf', i % 2 ? C.leaf : C.leafLight, Math.cos(a) * 0.1, 0.24, Math.sin(a) * 0.1, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt, 0.08, 1, 0.025);
    }
  },
  wateringCan(v) {
    add(cyl(0.09, 0.1, 0.18, 24), 'metal', v.c, 0, 0.09, 0);
    add(cyl(0.012, 0.018, 0.26, 12), 'metal', v.c, 0.17, 0.15, 0, 0, 0, -0.95);
    add(cyl(0.03, 0.015, 0.03, 16), 'metal', v.c, 0.28, 0.24, 0, 0, 0, -0.95);
    add(tor(0.07, 0.01, 8, 20, PI), 'metal', v.c, -0.04, 0.17, 0);
  },
  lantern(v) {
    add(box(0.14, 0.02, 0.14), 'metal', v.c, 0, 0.01, 0);
    add(box(0.12, 0.17, 0.12), 'glass', 0xfff0c8, 0, 0.105, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(box(0.012, 0.18, 0.012), 'metal', v.c, sx * 0.064, 0.105, sz * 0.064);
    add(cone(0.1, 0.07, 4), 'metal', v.c, 0, 0.225, 0, 0, PI / 4, 0);
    add(tor(0.022, 0.005, 6, 14), 'metal', v.c, 0, 0.275, 0);
    add(sph(0.03, 12, 8), 'glow', 0xffb050, 0, 0.09, 0);
  },
  bonsai(v) {
    add(rbox(0.28, 0.05, 0.18, 0.01), 'gloss', v.c, 0, 0.025, 0);
    add(cyl(0.014, 0.025, 0.2, 8), 'wood', C.walnut, 0.02, 0.14, 0, 0, 0, -0.35);
    add(cyl(0.008, 0.012, 0.14, 8), 'wood', C.walnut, -0.03, 0.2, 0, 0, 0, 0.9);
    for (const [x, y, z, r] of [[0.07, 0.25, 0, 0.06], [-0.1, 0.24, 0.02, 0.05], [0.0, 0.29, -0.02, 0.055], [0.03, 0.23, 0.05, 0.04]]) add(sph(r, 12, 8), 'leaf', C.leaf, x, y, z, 0, 0, 0, 1.3, 0.6, 1.1);
  },
  succulents(v) {
    for (let i = -1; i <= 1; i++) {
      add(cyl(0.04, 0.032, 0.06, 16), 'gloss', i ? v.c : C.white, i * 0.095, 0.03, 0);
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9;
        add(sph(0.02, 8, 6), 'leaf', 0x7aa86a, i * 0.095 + Math.cos(a) * 0.018, 0.07, Math.sin(a) * 0.018, Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8, 0.6, 1.4, 0.6);
      }
    }
  },
  birdhouse(v) {
    add(box(0.16, 0.18, 0.15), 'wood', v.c, 0, 0.09, 0);
    for (const s of [-1, 1]) add(box(0.13, 0.012, 0.19), 'paint', 0x7a2e1e, s * 0.05, 0.215, 0, 0, 0, s * -0.75);
    add(cyl(0.026, 0.026, 0.01, 18), 'paint', C.black, 0, 0.11, 0.076, PI / 2, 0, 0);
    add(cyl(0.006, 0.006, 0.05), 'wood', C.walnut, 0, 0.065, 0.09, PI / 2, 0, 0);
  },

  // Sports
  soccer(v) {
    add(sph(0.11, 30, 22), 'gloss', C.white, 0, 0.11, 0);
    const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute('position');
    const seen = [];
    for (let i = 0; i < ico.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
      if (seen.some(q => q.distanceTo(p) < 0.01)) continue;
      seen.push(p);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p);
      const g = cyl(0.036, 0.036, 0.008, 5);
      g.applyQuaternion(q);
      add(g, 'gloss', v.c, p.x * 0.108, 0.11 + p.y * 0.108, p.z * 0.108);
    }
  },
  basketball(v) {
    add(sph(0.12, 30, 22), 'paint', v.c, 0, 0.12, 0);
    add(tor(0.12, 0.003, 4, 48), 'paint', C.black, 0, 0.12, 0);
    add(tor(0.12, 0.003, 4, 48), 'paint', C.black, 0, 0.12, 0, 0, PI / 2, 0);
    add(tor(0.12, 0.003, 4, 48), 'paint', C.black, 0, 0.12, 0, PI / 2, 0, 0);
  },
  dumbbells(v) {
    for (const z of [-0.06, 0.06]) {
      add(cyl(0.015, 0.015, 0.3, 12), 'metal', C.steel, 0, 0.05, z, 0, 0, PI / 2);
      for (const s of [-1, 1]) {
        add(cyl(0.05, 0.05, 0.035, 20), 'gloss', v.c, s * 0.1, 0.05, z, 0, 0, PI / 2);
        add(cyl(0.042, 0.042, 0.03, 20), 'gloss', v.c, s * 0.135, 0.05, z, 0, 0, PI / 2);
      }
    }
  },
  kettlebell(v) {
    add(sph(0.1, 24, 18), 'gloss', v.c, 0, 0.1, 0);
    add(cyl(0.06, 0.06, 0.01, 20), 'gloss', v.c, 0, 0.004, 0);
    add(tor(0.06, 0.016, 10, 24, PI), 'gloss', v.c, 0, 0.17, 0);
  },
  racket(v) {
    add(box(0.12, 0.03, 0.06), 'paint', C.black, 0, 0.015, 0);
    add(cyl(0.014, 0.016, 0.24, 10), 'paint', C.black, 0, 0.15, 0);
    add(tor(0.11, 0.01, 8, 40), 'gloss', v.c, 0, 0.39, 0, 0, 0, 0, 1, 1.25, 1);
    for (let i = -4; i <= 4; i++) {
      add(box(0.0015, 0.26 * Math.sqrt(1 - (i / 5) ** 2), 0.0015), 'paint', C.white, i * 0.022, 0.39, 0);
      add(box(0.21 * Math.sqrt(1 - (i / 5) ** 2), 0.0015, 0.0015), 'paint', C.white, 0, 0.39 + i * 0.027, 0);
    }
  },
  skateboard(v) {
    at(0, 0.41, 0, 0, 0, PI / 2, () => {
      add(rbox(0.8, 0.016, 0.21, 0.008), 'wood', C.oak, 0, 0, -0.06);
      add(box(0.7, 0.002, 0.19), 'paint', v.c, 0, 0.009, -0.06);
      for (const x of [-0.27, 0.27]) {
        add(box(0.04, 0.03, 0.16), 'metal', C.steel, x, -0.022, -0.06);
        for (const z of [-0.14, 0.02]) add(cyl(0.027, 0.027, 0.03, 16), 'gloss', v.a || 0xf2c230, x, -0.045, z, PI / 2, 0, 0);
      }
    });
  },
  yogaMat(v) {
    add(cyl(0.06, 0.06, 0.6, 24), 'fabric', v.c, 0, 0.06, 0, 0, 0, PI / 2);
    add(cyl(0.035, 0.035, 0.61, 16), 'fabric', C.black, 0, 0.06, 0, 0, 0, PI / 2);
    for (const x of [-0.2, 0.2]) add(tor(0.062, 0.006, 6, 24), 'fabric', C.black, x, 0.06, 0, 0, PI / 2, 0);
  },
  helmet(v) {
    add(new THREE.SphereGeometry(0.13, 28, 14, 0, PI * 2, 0, PI / 2), 'gloss', v.c, 0, 0.01, 0, 0, 0, 0, 1, 0.95, 1.2);
    add(box(0.2, 0.02, 0.05), 'gloss', C.black, 0, 0.02, 0.15, -0.2, 0, 0);
    for (let i = -1; i <= 1; i++) add(box(0.02, 0.006, 0.18), 'paint', C.black, i * 0.05, 0.135, 0);
  },
  trophy(v) {
    add(box(0.12, 0.05, 0.12), 'paint', C.ebony, 0, 0.025, 0);
    add(cyl(0.012, 0.02, 0.08), 'metal', v.c, 0, 0.09, 0);
    add(lathe([[0, 0], [0.025, 0], [0.07, 0.06], [0.075, 0.12], [0.07, 0.12], [0, 0.03]], 24), 'metal', v.c, 0, 0.13, 0);
    for (const s of [-1, 1]) add(tor(0.03, 0.006, 6, 16, PI), 'metal', v.c, s * 0.075, 0.21, 0, 0, 0, s * -PI / 2);
  },
  bottle(v) {
    add(cyl(0.035, 0.035, 0.21, 24), 'metal', v.c, 0, 0.105, 0);
    add(cyl(0.025, 0.035, 0.03, 24), 'metal', v.c, 0, 0.225, 0);
    add(cyl(0.026, 0.026, 0.03, 20), 'paint', C.black, 0, 0.255, 0);
    add(tor(0.015, 0.004, 6, 12), 'paint', C.black, 0, 0.28, 0);
  },

  // Tools
  hammer(v) {
    add(cyl(0.014, 0.017, 0.34, 12), 'wood', C.oak, 0, 0.018, 0, 0, 0, PI / 2);
    add(box(0.035, 0.12, 0.035), 'metal', v.c, 0.18, 0.035, 0);
    add(box(0.06, 0.03, 0.03), 'metal', v.c, 0.18, 0.08, 0, 0, 0, 0);
  },
  wrench(v) {
    add(box(0.24, 0.012, 0.025), 'metal', v.c, 0, 0.006, 0);
    add(tor(0.025, 0.008, 6, 16), 'metal', v.c, 0.13, 0.008, 0, PI / 2, 0, 0);
    add(tor(0.02, 0.009, 6, 16, PI * 1.5), 'metal', v.c, -0.13, 0.008, 0, PI / 2, 0, 0);
  },
  screwdrivers(v) {
    add(rbox(0.3, 0.08, 0.08, 0.01), 'wood', C.walnut, 0, 0.04, 0);
    for (let i = 0; i < 6; i++) {
      const x = -0.125 + i * 0.05;
      add(cyl(0.004, 0.004, 0.08), 'metal', C.steel, x, 0.11, 0);
      add(cyl(0.013, 0.016, 0.08, 8), 'gloss', i % 2 ? v.c : C.black, x, 0.18, 0);
    }
  },
  drill(v) {
    add(rbox(0.2, 0.07, 0.065, 0.025), 'gloss', v.c, 0, 0.22, 0);
    add(rbox(0.055, 0.15, 0.055, 0.02), 'gloss', C.black, -0.04, 0.13, 0, 0, 0, -0.2);
    add(rbox(0.11, 0.06, 0.08, 0.015), 'gloss', C.black, -0.05, 0.03, 0);
    add(cyl(0.022, 0.018, 0.05, 16), 'metal', C.iron, 0.125, 0.22, 0, 0, 0, PI / 2);
    add(cyl(0.004, 0.004, 0.07, 8), 'metal', C.steel, 0.18, 0.22, 0, 0, 0, PI / 2);
    add(box(0.03, 0.006, 0.002), 'glow', 0x7cff8a, -0.05, 0.045, 0.041);
  },
  toolbox(v) {
    add(rbox(0.42, 0.18, 0.2, 0.015), 'gloss', v.c, 0, 0.09, 0);
    add(rbox(0.43, 0.04, 0.21, 0.012), 'gloss', v.c, 0, 0.195, 0);
    add(tor(0.06, 0.01, 8, 18, PI), 'metal', C.black, 0, 0.215, 0);
    for (const s of [-1, 1]) add(box(0.04, 0.035, 0.01), 'metal', C.steel, s * 0.14, 0.17, 0.104);
  },
  saw(v) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(0.42, 0.02); sh.lineTo(0.42, 0.07); sh.lineTo(0, 0.12); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false });
    add(g, 'metal', C.steel, -0.25, 0.0, 0, PI / 2, 0, 0);
    add(rbox(0.12, 0.022, 0.13, 0.01), 'wood', v.c, -0.3, 0.011, -0.06);
  },
  tape(v) {
    add(rbox(0.08, 0.08, 0.04, 0.018), 'gloss', v.c, 0, 0.04, 0);
    add(box(0.15, 0.003, 0.025), 'metal', 0xe8d24a, 0.11, 0.008, 0);
    add(cyl(0.016, 0.016, 0.042, 16), 'paint', C.black, 0, 0.04, 0, PI / 2, 0, 0);
  },
  level(v) {
    add(box(0.6, 0.06, 0.03), 'metal', v.c, 0, 0.03, 0);
    for (const x of [-0.2, 0, 0.2]) add(cyl(0.008, 0.008, 0.05, 10), 'glow', 0x7cff8a, x, 0.03, 0.016, 0, 0, PI / 2);
  },
  axe(v) {
    add(cyl(0.015, 0.018, 0.55, 10), 'wood', C.oak, 0, 0.018, 0, 0, 0, PI / 2);
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.03); sh.quadraticCurveTo(0.08, -0.09, 0.12, -0.11); sh.quadraticCurveTo(0.14, 0, 0.12, 0.11); sh.quadraticCurveTo(0.08, 0.09, 0, 0.03); sh.closePath();
    add(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }), 'metal', v.c, 0.24, 0.012, -0.006, PI / 2, 0, PI / 2);
    add(oct(0.012), 'glow', 0x55d6ff, 0.24, 0.03, 0.06);
  },
  anvil(v) {
    add(box(0.16, 0.06, 0.12), 'metal', v.c, 0, 0.03, 0);
    add(box(0.08, 0.08, 0.08), 'metal', v.c, 0, 0.1, 0);
    add(box(0.26, 0.05, 0.1), 'metal', v.c, 0.02, 0.165, 0);
    add(cone(0.04, 0.12, 4), 'metal', v.c, 0.2, 0.165, 0, 0, PI / 4, -PI / 2, 1, 1, 0.7);
  }
};

// ---------------------------------------------------------------- catalogue
// Variants: n = adjective used in the name, c = main colour, m = main material kind, g = glow colour.
const V = (n, c, m = 'paint', g, a) => ({ n, c, m, g, a });
const COPPER = V('Copper', C.copper, 'metal'), STEEL = V('Silversteel', C.steel, 'metal');
const GLOWS = [0x55d6ff, 0xb46bff, 0x5cffb0, 0xff6bd5, 0xffb347];

export const CATEGORIES = [
  {
    id: 'kitchen', name: 'Kitchen', glyph: '♨', color: '#ff9a4d', wood: 0xc08a52, brand: ['Hearthwright', 'Copperfold & Daughters', 'Ember Table'],
    blurb: 'Copper that remembers every recipe.',
    items: [
      ['pot', ['Stockpot of Plenty', 'Cauldron Pot', 'Simmerheart Pot'], [39, 189], [COPPER, STEEL, V('Ruby Enamel', 0xa8231c, 'gloss'), V('Cast Iron', C.iron)], 'Holds heat for hours; the lid hums softly when the broth is ready.'],
      ['pan', ['Searing Pan', 'Dragonscale Skillet', 'Sunrise Frypan'], [24, 129], [COPPER, V('Black Iron', C.iron), STEEL], 'Even heat from rim to centre, oven-safe to the temperature of a small star.'],
      ['kettle', ['Ever-Warm Kettle', 'Moonbrew Kettle', 'Whistling Kettle'], [19, 149], [COPPER, V('Teal Enamel', 0x2f7f7a, 'gloss'), V('Cream Enamel', 0xe8dcc2, 'gloss'), V('Ruby Enamel', 0xa8231c, 'gloss')], 'Boils in ninety seconds and keeps tea at the perfect steep.'],
      ['teapot', ['Teapot of Long Afternoons', 'Gossip Teapot'], [22, 89], [V('Porcelain', C.white, 'gloss'), V('Celadon', 0x8fb8a0, 'gloss'), V('Midnight', 0x22304f, 'gloss')], 'Pours without a single drip, which is its only magic and quite enough.'],
      ['knifeBlock', ['Knife Block, Seven Edges', 'Chef\'s Oath Block'], [59, 249], [V('Oak', C.oak, 'wood'), V('Walnut', C.walnut, 'wood')], 'Five forged blades that never dull, sheathed in end-grain wood.'],
      ['plates', ['Feast Plates, Set of 6', 'Banquet Service'], [29, 119], [V('Sage', 0x8fa98a, 'gloss'), V('Cobalt', 0x2b4c9b, 'gloss'), V('Blush', 0xe0a8a0, 'gloss')], 'Stoneware glazed twice; survives dishwashers and dwarven dinners.'],
      ['mugs', ['Hearth Mugs, Trio', 'Morning Mugs'], [18, 54], [V('Terracotta', C.terracotta, 'gloss'), V('Forest', 0x2f5a3a, 'gloss'), V('Sky', 0x7fb3d5, 'gloss')], 'Thick-walled mugs that keep cocoa warm through a long chapter.'],
      ['board', ['Carving Boards, Pair', 'Butcher\'s Slabs'], [25, 79], [V('Oak', C.oak, 'wood'), V('Acacia', 0xb07a45, 'wood')], 'Edge-grain hardwood, oiled with beeswax.'],
      ['mixer', ['Stand Mixer of Whirlwinds', 'Tempest Mixer'], [199, 499], [V('Mint', 0xa8d8c0, 'gloss'), V('Butter', 0xf3dd9a, 'gloss'), V('Crimson', 0xb3261e, 'gloss'), V('Onyx', 0x222226, 'gloss')], 'Ten speeds, from gentle fold to small hurricane.'],
      ['espresso', ['Alchemic Espresso Engine', 'Brass Barista'], [349, 1299], [STEEL, V('Brass', C.brass, 'metal')], 'Pulls a perfect shot; the dial glows when the boiler is ready.'],
      ['crock', ['Utensil Crock', 'Spoon Bouquet'], [16, 45], [V('Ivory', C.cream, 'gloss'), V('Indigo', 0x2e3d7a, 'gloss')], 'Five olive-wood spoons in a hand-thrown crock.']
    ]
  },
  {
    id: 'electronics', name: 'Electronics', glyph: '⚡', color: '#4cd2ff', wood: 0x2a2026, brand: ['Runewire', 'Aethertech', 'Lumen & Ley'],
    blurb: 'Arcane circuitry, warded against static.',
    items: [
      ['laptop', ['Spellbook Pro 14', 'Grimoire Air', 'Codex Ultra 16'], [699, 2899], [V('Space Slate', 0x3a3d44, 'metal', 0x55d6ff), V('Silver', 0xc9ccd2, 'metal', 0xb46bff), V('Rose Gold', 0xd8a59a, 'metal', 0xff6bd5)], 'Runes etched into the motherboard; battery lasts a full moon cycle.'],
      ['phone', ['Whisperstone 9', 'Farspeaker Mini', 'Mirrorphone X'], [299, 1399], [V('Obsidian', 0x1b1b20, 'metal', 0x55d6ff), V('Pearl', 0xe9e4da, 'metal', 0xff6bd5), V('Jade', 0x2f6b55, 'metal', 0x5cffb0)], 'Talks to anyone, anywhere, unless they are in a dungeon.'],
      ['tablet', ['Scrying Slate 11', 'Tablet of Many Tabs'], [249, 999], [V('Graphite', 0x3a3d44, 'metal', 0x55d6ff), V('Silver', 0xc9ccd2, 'metal', 0xffb347)], 'A window to everywhere; pairs with a quill.'],
      ['headphones', ['Siren Headphones', 'Echo Wardens', 'Quietus Cans'], [79, 549], [V('Midnight', 0x22242e, 'paint', 0x55d6ff), V('Bone', 0xe6dfd2, 'paint', 0xffb347), V('Crimson', 0x8a1c24, 'paint', 0xff6bd5)], 'Noise-cancelling strong enough to silence a banshee.'],
      ['speaker', ['Bardic Speaker', 'Lute-in-a-Can', 'Chorus Pillar'], [59, 399], [V('Charcoal', 0x2c2c32, 'fabric', 0x55d6ff), V('Moss', 0x4a5a3a, 'fabric', 0x5cffb0), V('Plum', 0x4a2346, 'fabric', 0xff6bd5)], 'Room-filling sound with a ring of light that dances to the bass.'],
      ['console', ['Arcade Altar', 'Dicebox Console'], [299, 599], [V('Ivory', 0xe8e4dc, 'gloss', 0x55d6ff), V('Onyx', 0x1d1d22, 'gloss', 0xb46bff)], 'Two controllers, a thousand worlds, zero loading screens.'],
      ['watch', ['Hourglass Watch', 'Chronomancer Band'], [149, 899], [V('Midnight', 0x22242e, 'paint', 0x5cffb0), V('Sand', 0xcbb594, 'paint', 0xffb347), V('Coral', 0xe0705a, 'paint', 0x55d6ff)], 'Tracks steps, sleep and the phases of three moons.'],
      ['camera', ['Memory Box Camera', 'Gazer Mk II'], [399, 2199], [V('Black', 0x1d1d22), V('Silver', 0xbfc3c9, 'metal')], 'Captures light, and occasionally the odd ghost.'],
      ['vr', ['Dreamwalker Visor', 'Veil Headset'], [299, 1499], [V('White', 0xeceae6, 'gloss', 0x55d6ff), V('Black', 0x222226, 'gloss', 0xb46bff)], 'Step into other worlds without leaving the library.'],
      ['orb', ['Scrying Orb Speaker', 'Oracle Hub'], [99, 349], [V('Azure', 0, 'glass', 0x55d6ff), V('Violet', 0, 'glass', 0xb46bff), V('Verdant', 0, 'glass', 0x5cffb0)], 'Answers questions, plays music, dims the candles on command.']
    ]
  },
  {
    id: 'furniture', name: 'Furniture', glyph: '⌂', color: '#e0b56a', wood: 0x8a5a34, brand: ['Oakhaven Joinery', 'Hollowmere Home', 'Kestrel & Vane'],
    blurb: 'Rooms that arrive together, ready to live in.',
    items: [
      ['vase', ['Amphora Vase', 'Bloom Vessel'], [29, 139], [V('Celadon', 0x8fb8a0, 'gloss'), V('Oxblood', 0x6b1f2f, 'gloss', 0, 0xf2e4c8), V('Ink', 0x1f2a44, 'gloss')], 'Hand-thrown and glazed in a dragon kiln.'],
      ['clock', ['Clock of Slow Hours', 'Tower Clock, Small'], [45, 189], [V('Walnut', C.walnut, 'wood'), V('Oak', C.oak, 'wood')], 'Ticks quietly; chimes only for good news.'],
      ['sculpture', ['Endless Knot', 'Mobius Charm'], [59, 299], [V('Gilded', C.gold, 'metal'), V('Copper', C.copper, 'metal'), V('Silver', C.steel, 'metal')], 'Cast bronze knot that has no beginning and no end.'],
      ['tableLamp', ['Glowroot Table Lamp', 'Ember Lamp'], [39, 179], [V('Sage', 0x8fa98a, 'gloss'), V('Ochre', 0xc9902e, 'gloss'), V('Ink', 0x1f2a44, 'gloss')], 'Warm light that brightens when someone opens a book.'],
      ['tome', ['Catalogue of Rooms', 'Joiner\'s Handbook'], [19, 49], [V('Walnut', 0x5a3a22, 'paint', 0xffd27a), V('Forest', 0x1f3a2c, 'paint', 0xffd27a)], 'Plans and patterns for every room in the house.']
    ],
    sets: [
      { key: 'living', label: 'Hearthside Lounge', items: [
        ['rug', 'Woven Hearth Rug', [149, 590], V('Saffron', 0xc9902e, 'fabric', 0, 0x6b1f2f), [0, 0, 0.2, 0]],
        ['sofa', 'Cloudbank Sofa, 3-seat', [899, 2499], V('Teal Velvet', 0x1f5a5e, 'fabric', 0, 0xd4a850), [0, 0, -0.75, 0]],
        ['armchair', 'Wingback Reading Chair', [399, 999], V('Rust Velvet', 0x8a3b1e, 'fabric', 0, 0xe8dcc2), [1.55, 0, 0.35, -1.25]],
        ['coffeeTable', 'Oakhaven Coffee Table', [249, 690], V('Oak', C.oak, 'wood'), [0, 0, 0.45, 0]],
        ['floorLamp', 'Lanternstalk Floor Lamp', [129, 380], V('Linen', 0xe8dcc2, 'fabric'), [-1.45, 0, -0.75, 0]]
      ] },
      { key: 'study', label: 'Wizard\'s Study', items: [
        ['rug', 'Starchart Rug', [129, 420], V('Indigo', 0x23305e, 'fabric', 0, 0xc9a25a), [0, 0, 0.1, 0]],
        ['desk', 'Scholar\'s Writing Desk', [349, 1190], V('Walnut', C.walnut, 'wood'), [0, 0, -0.35, 0]],
        ['officeChair', 'Ergonomic Throne', [199, 690], V('Charcoal', 0x2c2c32, 'fabric'), [-0.1, 0, 0.35, PI + 0.25]],
        ['monitor', 'Seeing-Glass Monitor 27"', [229, 690], V('Black', C.black, 'paint', 0x55d6ff), [-0.1, 0.76, -0.5, 0]],
        ['deskLamp', 'Owl-Eye Desk Lamp', [49, 160], V('Brass', C.brass, 'metal'), [-0.55, 0.76, -0.5, 0.4]]
      ] },
      { key: 'dining', label: 'Feasting Hall', items: [
        ['diningTable', 'Long Table of Feasts', [599, 1890], V('Oak', C.oak, 'wood'), [0, 0, 0, 0]],
        ['diningChair', 'Banquet Chair', [89, 290], V('Oak', C.oak, 'wood', 0, 0x6b1f2f), [-0.45, 0, -0.7, 0]],
        ['diningChair', 'Banquet Chair', [89, 290], V('Oak', C.oak, 'wood', 0, 0x6b1f2f), [0.45, 0, -0.7, 0]],
        ['diningChair', 'Banquet Chair, Moss', [89, 290], V('Oak', C.oak, 'wood', 0, 0x2f5a3a), [-0.45, 0, 0.7, PI]],
        ['diningChair', 'Banquet Chair, Moss', [89, 290], V('Oak', C.oak, 'wood', 0, 0x2f5a3a), [0.45, 0, 0.7, PI]]
      ] },
      { key: 'bedroom', label: 'Dreamer\'s Chamber', items: [
        ['bed', 'Featherdown Bed, Queen', [799, 2390], V('Midnight Velvet', 0x25304f, 'fabric'), [0, 0, 0.1, 0]],
        ['nightstand', 'Moonlit Nightstand', [129, 390], V('Walnut', C.walnut, 'wood'), [-1.15, 0, -0.75, 0]],
        ['nightstand', 'Moonlit Nightstand', [129, 390], V('Walnut', C.walnut, 'wood'), [1.15, 0, -0.75, 0]],
        ['tableLamp', 'Dreamglow Lamp', [49, 160], V('Sage', 0x8fa98a, 'gloss'), [-1.15, 0.55, -0.78, 0]],
        ['rug', 'Cloud Rug', [99, 390], V('Pearl', 0xd8d0c0, 'fabric', 0, 0x8a6a4a), [0, 0, 0.9, 0]]
      ] }
    ]
  },
  {
    id: 'books', name: 'Books', glyph: '❦', color: '#d9a35b', wood: 0x5a3a22, brand: ['Inkwell Press', 'Moth & Lantern', 'The Gilded Quill'],
    blurb: 'Every story ever told, and several not yet.',
    items: [
      ['tome', ['A Field Guide to Dragons', 'The Cartographer\'s Daughter', 'Spells for Rainy Days', 'Atlas of Lost Islands', 'The Clockwork Heart', 'Herbs of the Northern Wood'], [12, 69], [V('Oxblood', 0x6b1f2f, 'paint', 0xffd27a), V('Forest', 0x1f3a2c, 'paint', 0x5cffb0), V('Midnight', 0x1f2a44, 'paint', 0x55d6ff), V('Saffron', 0x9a6a1a, 'paint', 0xffd27a), V('Plum', 0x4a2346, 'paint', 0xff6bd5)], 'Gilt-edged hardcover, sewn binding, ribbon marker included.'],
      ['bookStack', ['Saga Box Set', 'Collected Riddles', 'The Seven Seasons'], [39, 149], [V('Oxblood', 0x6b1f2f), V('Ochre', 0x9a6a1a)], 'A complete series in matching leather.'],
      ['lectern', ['Reading Lectern', 'Orator\'s Stand'], [119, 390], [V('Walnut', C.walnut, 'wood'), V('Oak', C.oak, 'wood')], 'Holds the heaviest grimoire open at the perfect angle.'],
      ['scroll', ['Map of the Realm', 'Royal Decree (Replica)', 'Scroll of Recipes'], [9, 39], [V('Crimson Ribbon', 0xa01e2a, 'fabric'), V('Gold Ribbon', 0xc9a25a, 'fabric')], 'Hand-inked on heavy parchment, rolled on ebony rods.'],
      ['globe', ['Celestial Globe', 'Explorer\'s Globe'], [69, 299], [V('Ocean', 0x1e4a7a, 'gloss'), V('Antique', 0x6a7a5a, 'gloss')], 'Shows the old borders, and the sea monsters where they belong.'],
      ['inkQuill', ['Quill & Starlight Ink', 'Scribe\'s Set'], [14, 59], [V('Swan', 0xf4f0e8, 'fabric', 0x3050ff), V('Raven', 0x222228, 'fabric', 0xb46bff)], 'An inkwell that never runs dry and a quill that never blots.']
    ]
  },
  {
    id: 'beauty', name: 'Beauty', glyph: '❀', color: '#ff7eb6', wood: 0xd8c3b0, brand: ['Moonmere Apothecary', 'Rosewater & Rue', 'Lunaria'],
    blurb: 'Potions, tinctures and a little glamour.',
    items: [
      ['potion', ['Elixir of Radiance', 'Dewdrop Serum', 'Moonbeam Tonic', 'Draught of Calm'], [14, 89], GLOWS.map((g, i) => V(['Azure', 'Violet', 'Verdant', 'Rose', 'Amber'][i], 0, 'glass', g)), 'Brewed under a full moon; makes skin glow (slightly literally).'],
      ['potionTall', ['Tincture of Youth', 'Night Repair Draught'], [19, 79], GLOWS.map((g, i) => V(['Azure', 'Violet', 'Verdant', 'Rose', 'Amber'][i], 0, 'glass', g)), 'Twelve botanicals steeped for a hundred days.'],
      ['flask', ['Philter of Glow', 'Alchemist\'s Mist'], [16, 64], GLOWS.map((g, i) => V(['Azure', 'Violet', 'Verdant', 'Rose', 'Amber'][i], 0, 'glass', g)), 'A face mist that smells of rain on old stone.'],
      ['perfume', ['Eau de Grimoire', 'Midnight Orchard', 'Velvet Ember'], [39, 229], GLOWS.map((g, i) => V(['Azure', 'Violet', 'Verdant', 'Rose', 'Amber'][i], 0, 'glass', g)), 'Notes of vellum, amber and the first page of a new book.'],
      ['jar', ['Cloud Cream', 'Balm of Ages'], [12, 95], [V('Pearl', 0xf0ece4, 'gloss'), V('Blush', 0xe8b4b0, 'gloss'), V('Jade', 0x8fb8a0, 'gloss')], 'Whipped cream that melts like snow.'],
      ['lipsticks', ['Enchanted Lip Trio', 'Rose Hex Set'], [24, 69], [V('Rose', 0xd0506a, 'gloss'), V('Berry', 0x8a1f4a, 'gloss'), V('Coral', 0xe0705a, 'gloss')], 'Three shades that stay put through feasts and duels.'],
      ['mirror', ['Mirror That Only Flatters', 'Vanity Glass'], [34, 149], [V('Gilded', C.gold, 'metal'), V('Rose Gold', 0xd8a59a, 'metal')], 'Honest light, kind reflections.'],
      ['candle', ['Hearthfire Candle', 'Library Candle'], [18, 54], [V('Honey', 0xe8c06a), V('Lavender', 0xb8a8d8), V('Ivory', C.cream)], 'Smells of old books, cedar and a crackling fire.']
    ]
  },
  {
    id: 'garden', name: 'Garden', glyph: '☘', color: '#7ee08f', wood: 0xb89a6a, brand: ['Greenwhistle', 'Thornfield Gardens', 'Mossgrove'],
    blurb: 'Living things that are happy to see you.',
    items: [
      ['monstera', ['Monstera, Whispering', 'Swiss-Cheese Plant'], [29, 129], [V('Terracotta', C.terracotta), V('Slate', 0x4a5058), V('Cream', C.cream, 'gloss')], 'Grows a new leaf every time you finish a book.'],
      ['cactus', ['Blooming Cactus', 'Desert Sentinel'], [12, 49], [V('Terracotta', C.terracotta), V('Sky', 0x7fb3d5)], 'Thrives on neglect and flowers once a year, at midnight.'],
      ['fern', ['Feathered Fern', 'Fairy Fern'], [18, 69], [V('Ivory', C.cream), V('Moss', 0x4a5a3a), V('Indigo', 0x2e3d7a)], 'Lush fronds that purify the air and gossip quietly.'],
      ['wateringCan', ['Rainmaker Can', 'Drizzle Can'], [24, 89], [COPPER, V('Verdigris', 0x4f8a7a, 'metal'), V('Brass', C.brass, 'metal')], 'Pours a gentle rain that never floods the roots.'],
      ['lantern', ['Firefly Lantern', 'Path Lantern'], [29, 99], [V('Black Iron', C.iron, 'metal'), COPPER, V('Brass', C.brass, 'metal')], 'Glows softly from dusk until the last guest leaves.'],
      ['bonsai', ['Ancient Bonsai', 'Juniper Bonsai'], [59, 349], [V('Celadon', 0x8fb8a0, 'gloss'), V('Ink', 0x1f2a44, 'gloss')], 'Two hundred years old and still growing, very slowly.'],
      ['succulents', ['Succulent Trio', 'Rosette Family'], [19, 59], [V('Blush', 0xe8b4b0, 'gloss'), V('Sage', 0x8fa98a, 'gloss'), V('Sky', 0x7fb3d5, 'gloss')], 'Three sturdy friends for a sunny windowsill.'],
      ['birdhouse', ['Wren Cottage Birdhouse', 'Owl Loft'], [29, 89], [V('Cedar', 0xb07a45, 'wood'), V('Weathered', 0x9a8a7a, 'wood')], 'Cedar house with a copper-free roof and a tiny perch.']
    ]
  },
  {
    id: 'fashion', name: 'Fashion', glyph: '✡', color: '#b48cff', wood: 0x3a2a44, brand: ['Silk & Sigil', 'House of Wren', 'Velvet Raven'],
    blurb: 'Garments woven with a little moonlight.',
    items: [
      ['sneakers', ['Cloudstep Sneakers', 'Swiftfoot Runners', 'Leyline Trainers'], [69, 249], [V('Crimson', 0xb3261e, 'fabric'), V('Midnight', 0x1f2a44, 'fabric'), V('Mint', 0x8fd8b8, 'fabric'), V('Sunflower', 0xf2c230, 'fabric')], 'So light you might float an inch off the ground.'],
      ['handbag', ['Satchel of Holding', 'Courtier Bag'], [89, 690], [V('Cognac', 0x8a4a22), V('Black', 0x1d1d22), V('Emerald', 0x1f5a3a), V('Plum', 0x4a2346)], 'Bigger on the inside. Considerably.'],
      ['hat', ['Wanderer\'s Fedora', 'Bard\'s Cap'], [39, 159], [V('Charcoal', 0x3a3a40, 'fabric'), V('Camel', 0xb08a5a, 'fabric', 0, 0x3a2a1a), V('Forest', 0x2f4a3a, 'fabric')], 'Wool felt, with a feather from a very polite bird.'],
      ['sunglasses', ['Basilisk-Proof Shades', 'Sunward Glasses'], [49, 289], [V('Gold', C.gold, 'metal'), V('Gunmetal', 0x55585e, 'metal')], 'Polarised lenses rated for basilisk gazes up to level three.'],
      ['sweaters', ['Hearthknit Sweaters', 'Cloudwool Set'], [59, 199], [V('Oatmeal', 0xd8c8a8, 'fabric', 0, 0x8a3b1e), V('Burgundy', 0x6b1f2f, 'fabric', 0, 0xd8c8a8), V('Moss', 0x4a5a3a, 'fabric', 0, 0xe8dcc2)], 'Spun from sheep that graze on the clouds.'],
      ['boots', ['Rangers\' Boots', 'Cobblestone Boots'], [129, 459], [V('Cognac', 0x8a4a22), V('Black', 0x1d1d22), V('Oxblood', 0x5a1a1a)], 'Waterproof, mud-proof, and very nearly dragon-proof.'],
      ['scarf', ['Starweave Scarf', 'Winter Wyrm Scarf'], [29, 119], [V('Crimson', 0xa01e2a, 'fabric', 0, C.gold), V('Indigo', 0x2e3d7a, 'fabric', 0, C.cream), V('Mustard', 0xc9902e, 'fabric')], 'Long enough to wrap twice, warm enough for a frost giant.'],
      ['backpack', ['Adventurer\'s Pack', 'Scholar\'s Rucksack'], [79, 249], [V('Olive', 0x5a5a3a, 'fabric'), V('Navy', 0x22304f, 'fabric'), V('Rust', 0x8a3b1e, 'fabric')], 'Pockets for scrolls, snacks and one emergency potion.'],
      ['jewels', ['Heartstone Ring', 'Dragon\'s Tear Set'], [99, 1890], [V('Ruby', 0, 'wood', 0xff3060), V('Sapphire', 0, 'wood', 0x3a7dff), V('Emerald', 0, 'wood', 0x3dff8a)], 'Hand-cut gems that glow faintly in the dark.']
    ]
  },
  {
    id: 'toys', name: 'Toys & Games', glyph: '★', color: '#ff6b8b', wood: 0xd9a066, brand: ['Puckbright', 'Gnome & Gadget', 'Merrywick'],
    blurb: 'Play is the oldest magic there is.',
    items: [
      ['teddy', ['Sir Bartholomew Bear', 'Snuggle Bear', 'Honeypaw'], [19, 79], [V('Honey', 0xb07a45, 'fabric'), V('Cream', 0xe8dcc2, 'fabric'), V('Rose', 0xe0a0b0, 'fabric')], 'Guards against nightmares, and is excellent at hugs.'],
      ['blocks', ['Rune Blocks', 'Castle Builder Set'], [14, 49], [0, 1, 2].map(i => ({ ...V('Classic', 0, 'gloss'), i })), 'Solid beech blocks painted with non-toxic dyes.'],
      ['ball', ['Bouncing Comet', 'Beach Sphere'], [9, 29], [V('Crimson', 0xd83a2c, 'gloss'), V('Cobalt', 0x2f6fd8, 'gloss'), V('Sunny', 0xf2c230, 'gloss')], 'Bounces higher than any ball has a right to.'],
      ['rocket', ['Moonshot Rocket', 'Starhopper'], [24, 89], [V('Crimson', 0xd83a2c, 'gloss'), V('Cobalt', 0x2f6fd8, 'gloss')], 'Lights up and roars on launch (does not actually fly).'],
      ['car', ['Racer Mk I', 'Pocket Roadster'], [12, 49], [V('Crimson', 0xd83a2c, 'gloss'), V('Emerald', 0x2fa05a, 'gloss'), V('Sunny', 0xf2c230, 'gloss')], 'Die-cast metal with working headlights.'],
      ['duck', ['Admiral Duck', 'Bath Duck'], [6, 19], [V('Yellow', 0xf6d23c, 'gloss'), V('Pink', 0xff9ec0, 'gloss')], 'Floats, squeaks, commands the bathtub fleet.'],
      ['boardGame', ['Dungeons of Dice', 'Quest for the Crown'], [29, 89], [V('Crimson', 0xa01e2a, 'paint', 0xffd27a), V('Royal', 0x2e3d7a, 'paint', 0x55d6ff)], 'Two to six players, about an hour, many betrayals.'],
      ['runeCube', ['Rune Cube', 'Puzzle of Twelve Turns'], [9, 34], [0, 1, 2].map(i => ({ ...V('Classic', 0, 'gloss'), i })), 'Solve it and a tiny chime plays somewhere.'],
      ['top', ['Whirling Top', 'Dervish Top'], [7, 24], [V('Crimson', 0xd83a2c, 'gloss'), V('Teal', 0x2f8a8a, 'gloss')], 'Spins for a full minute on a polished table.']
    ]
  },
  {
    id: 'sports', name: 'Sports', glyph: '⚑', color: '#ffc94a', wood: 0x6a7a8a, brand: ['Gryphon Athletics', 'Ironhide', 'Swiftwind'],
    blurb: 'Train like a hero, recover like a dragon.',
    items: [
      ['soccer', ['Pitch Master Ball', 'Golden Boot Ball'], [24, 79], [V('Classic', C.black, 'gloss'), V('Royal', 0x2e3d7a, 'gloss'), V('Crimson', 0xa01e2a, 'gloss')], 'Hand-stitched panels, flies true in any weather.'],
      ['basketball', ['Court King Ball', 'Hoopfire'], [19, 69], [V('Orange', 0xd8651f), V('Bronze', 0xa8582a)], 'Grippy composite leather with a perfect bounce.'],
      ['dumbbells', ['Giant\'s Dumbbells, Pair', 'Strength Pair'], [29, 149], [V('Black', 0x222226, 'gloss'), V('Teal', 0x2f8a8a, 'gloss'), V('Crimson', 0xa01e2a, 'gloss')], 'Hex-free chrome handles and quiet rubber plates.'],
      ['kettlebell', ['Troll\'s Kettlebell', 'Iron Bell'], [34, 129], [V('Black', 0x222226, 'gloss'), V('Orange', 0xd8651f, 'gloss'), V('Purple', 0x6a3a9a, 'gloss')], 'Cast in one piece, wide handle for two hands.'],
      ['racket', ['Thunderstrike Racket', 'Court Wand'], [59, 249], [V('Crimson', 0xa01e2a, 'gloss'), V('Cobalt', 0x2f6fd8, 'gloss'), V('Lime', 0x9ad83a, 'gloss')], 'Carbon frame, lightning-fast swing.'],
      ['skateboard', ['Broomless Skateboard', 'Cobble Cruiser'], [69, 199], [V('Sunset', 0xe0705a, 'paint', 0, 0xf2c230), V('Galaxy', 0x2e3d7a, 'paint', 0, 0xff6bd5)], 'Seven-ply maple deck; the closest thing to a flying broom.'],
      ['yogaMat', ['Meditation Mat', 'Lotus Mat'], [24, 89], [V('Lavender', 0xa898d0, 'fabric'), V('Sage', 0x8fa98a, 'fabric'), V('Coral', 0xe0705a, 'fabric')], 'Grippy cork-backed mat for calm in a chaotic realm.'],
      ['helmet', ['Bulwark Bike Helmet', 'Featherguard'], [49, 189], [V('Matte Black', 0x222226, 'gloss'), V('Signal Red', 0xd83a2c, 'gloss'), V('Arctic', 0xe8ecf0, 'gloss')], 'Rated for falls from bicycles, ponies and small dragons.'],
      ['trophy', ['Champion\'s Cup', 'Victor\'s Chalice'], [29, 159], [V('Gold', C.gold, 'metal'), V('Silver', C.steel, 'metal')], 'Engraving included for your next legendary win.'],
      ['bottle', ['Bottomless Bottle', 'Hydra Flask'], [19, 49], [V('Teal', 0x2f8a8a, 'metal'), V('Coral', 0xe0705a, 'metal'), V('Steel', C.steel, 'metal')], 'Keeps water cold for 24 hours, potions for longer.']
    ]
  },
  {
    id: 'tools', name: 'Tools', glyph: '⚒', color: '#9fb4c8', wood: 0x4a4038, brand: ['Dwarvenforge', 'Hammerhold', 'Anvil & Ash'],
    blurb: 'Forged under the mountain, guaranteed for an age.',
    items: [
      ['hammer', ['Thunder Hammer', 'Smith\'s Hammer'], [19, 89], [V('Forged Steel', C.steel, 'metal'), V('Black Iron', C.iron, 'metal')], 'Perfect balance; returns to your hand if you whistle (results vary).'],
      ['wrench', ['Adjustable Wrench', 'Gearwright Spanner'], [12, 49], [V('Chrome', C.steel, 'metal'), V('Black Oxide', 0x3a3a40, 'metal')], 'Fits every nut from here to the Iron Hills.'],
      ['screwdrivers', ['Screwdriver Set, Six', 'Tinkerer\'s Set'], [24, 79], [V('Crimson', 0xa01e2a, 'gloss'), V('Amber', 0xd89a1f, 'gloss')], 'Magnetic tips and handles that never slip.'],
      ['drill', ['Stormdrill 20V', 'Gnomish Driver'], [89, 329], [V('Gold', 0xe0b020, 'gloss'), V('Teal', 0x1f8a8a, 'gloss'), V('Crimson', 0xc0302a, 'gloss')], 'Brushless motor, two batteries, a little rune that shows charge.'],
      ['toolbox', ['Dwarven Toolbox', 'Field Chest'], [39, 149], [V('Signal Red', 0xc0302a, 'gloss'), V('Forest', 0x2f5a3a, 'gloss'), V('Cobalt', 0x2f4f9a, 'gloss')], 'Steel chest with a cantilever tray and a stubborn latch.'],
      ['saw', ['Hand Saw of Clean Cuts', 'Woodsman\'s Saw'], [19, 69], [V('Beech', 0xc49a62, 'wood'), V('Walnut', C.walnut, 'wood')], 'Induction-hardened teeth; cuts on the push and the pull.'],
      ['tape', ['Measuring Tape, 8 m', 'Surveyor\'s Tape'], [9, 34], [V('Yellow', 0xf2c230, 'gloss'), V('Orange', 0xe07a1f, 'gloss')], 'Reads in metres, feet and dwarven spans.'],
      ['level', ['Spirit Level', 'True-Line Level'], [14, 59], [V('Aluminium', 0xb8bcc4, 'metal'), V('Bronze', C.brass, 'metal')], 'The bubbles glow, so you can level shelves by candlelight.'],
      ['axe', ['Runed Hatchet', 'Woodcleaver'], [39, 189], [V('Forged Steel', C.steel, 'metal'), V('Damascus', 0x6a6e78, 'metal')], 'Splits logs in one stroke; the rune glows when sharp.'],
      ['anvil', ['Desktop Anvil', 'Jeweller\'s Anvil'], [49, 199], [V('Black Iron', C.iron, 'metal'), V('Steel', 0x8a8e96, 'metal')], 'Small enough for a workbench, heavy enough for a troll.'],
      ['lantern', ['Miner\'s Lantern', 'Deep-Delve Lamp'], [29, 99], [V('Black Iron', C.iron, 'metal'), V('Brass', C.brass, 'metal')], 'Burns for a week on a single drop of oil.']
    ]
  }
];

// Build a product's parts from a template key and a variant.
export function buildParts(key, variant) {
  PARTS = [];
  stack.length = 1;
  const v = { ...variant, g: variant.g || GLOWS[0] };
  if (!v.c && v.m !== 'glass') v.c = 0x888888;
  B[key](v);
  const out = PARTS;
  PARTS = [];
  for (const p of out) {
    let g = p.g.index ? p.g.toNonIndexed() : p.g;
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    p.g = g;
  }
  return out;
}

export function partsBox(parts) {
  const b = new THREE.Box3();
  for (const p of parts) { p.g.computeBoundingBox(); b.union(p.g.boundingBox); }
  return b;
}
