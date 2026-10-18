// The library itself: nave, bays, bookcases, vault, windows, candles, dust and orbs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import * as TX from './textures.js';
import { BAYS, NAVE_HALF, BAY_BACK, BAY_HALF, OPEN_HALF, ARCH_SPRING, HEIGHT, Z_FRONT, Z_END, SHELF_LEVELS, SHELF_TOP, PILLAR_Z } from './layout.js';

const PI = Math.PI;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

// Box with UVs scaled to its size so wood grain and stone do not stretch.
function boxUV(w, h, d, k = 0.5) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const j = f * 4 + i;
    uv.setXY(j, uv.getX(j) * dims[f][0] * k, uv.getY(j) * dims[f][1] * k);
  }
  return g;
}

class Merger {
  constructor() { this.buckets = {}; }
  add(key, geo, color = 0xffffff, matrix = null, intensity = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (matrix) g.applyMatrix4(matrix);
    const c = new THREE.Color(color).multiplyScalar(intensity), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    (this.buckets[key] ||= []).push(g);
  }
  build(scene, mats) {
    for (const [k, list] of Object.entries(this.buckets)) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mats[k]);
      mesh.matrixAutoUpdate = false;
      mesh.name = 'arch-' + k;
      scene.add(mesh);
    }
  }
}

export function buildWorld(scene, renderer, onProgress = () => {}) {
  RectAreaLightUniformsLib.init();
  const T = {
    wood: TX.woodTexture(), floor: TX.stoneFloorTexture(), books: TX.bookWallTexture(), spine: TX.spineTexture(),
    sky: TX.starSkyTexture(), rose: TX.roseWindowTexture(), lancet: TX.lancetTexture(), rune: TX.runeCircleTexture(),
    glow: TX.glowTexture(), ashlar: TX.ashlarTexture()
  };
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  for (const t of Object.values(T)) t.anisotropy = Math.min(8, maxAniso);

  const mats = {
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, map: T.ashlar, roughness: 0.88 }),
    wood: new THREE.MeshStandardMaterial({ vertexColors: true, map: T.wood, roughness: 0.62 }),
    gold: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.32 }),
    fabric: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.9, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0.5, 0.4, 0.4) }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    books: new THREE.MeshStandardMaterial({ vertexColors: true, map: T.books, roughness: 0.78, side: THREE.DoubleSide })
  };
  const mg = new Merger();
  const gold = 0xc9a25a;

  // ---------------------------------------------------------------- floor and runner
  T.floor.repeat.set(48 / 4.8, 100 / 4.8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 100), new THREE.MeshStandardMaterial({ map: T.floor, roughness: 0.34, metalness: 0.0, envMapIntensity: 1.0 }));
  floor.rotation.x = -PI / 2; floor.position.set(0, 0, -43);
  scene.add(floor);
  mg.add('fabric', boxUV(4, 0.012, 94), 0x5a0f18, M(0, 0.006, -44));
  for (const x of [-1.85, 1.85]) mg.add('gold', boxUV(0.12, 0.016, 94), gold, M(x, 0.008, -44));

  // ---------------------------------------------------------------- pillars
  for (const z of PILLAR_Z) for (const s of [-1, 1]) {
    const x = s * NAVE_HALF;
    mg.add('stone', boxUV(2.6, HEIGHT, 2.0), 0xd8cfc4, M(x, HEIGHT / 2, z));
    mg.add('stone', new THREE.CylinderGeometry(0.5, 0.5, HEIGHT, 24), 0xe8dccb, M(x - s * 1.45, HEIGHT / 2, z));
    mg.add('stone', boxUV(3.2, 0.7, 2.4), 0xbfb3a6, M(x - s * 0.1, 0.35, z));
    for (const y of [ARCH_SPRING, HEIGHT - 0.3]) {
      mg.add('stone', boxUV(3.2, 0.55, 2.4), 0xbfb3a6, M(x - s * 0.1, y, z));
      mg.add('gold', boxUV(3.25, 0.08, 2.45), gold, M(x - s * 0.1, y - 0.3, z));
    }
  }
  // entrance walls between the doors and the first pillar
  for (const s of [-1, 1]) {
    mg.add('stone', boxUV(1, HEIGHT, 7), 0xcfc5b8, M(s * (NAVE_HALF + 0.5), HEIGHT / 2, 3));
    const wall = new THREE.PlaneGeometry(6.6, HEIGHT - 1);
    const uv = wall.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.3, uv.getY(i) * (HEIGHT - 1) / 2);
    mg.add('books', wall, 0xffffff, M(s * (NAVE_HALF - 0.01), (HEIGHT - 1) / 2 + 0.5, 3, 0, -s * PI / 2, 0));
  }

  // ---------------------------------------------------------------- cornice + vault
  for (const s of [-1, 1]) {
    mg.add('stone', boxUV(1.0, 0.7, 98), 0xbfb3a6, M(s * (NAVE_HALF - 0.3), HEIGHT, -43));
    mg.add('gold', boxUV(1.05, 0.1, 98), gold, M(s * (NAVE_HALF - 0.3), HEIGHT - 0.4, -43));
  }
  T.sky.repeat.set(1, 3);
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(NAVE_HALF, NAVE_HALF, 98, 64, 1, true, -PI / 2, PI),
    new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, color: new THREE.Color(1.25, 1.25, 1.35) }));
  vault.rotation.x = -PI / 2; vault.position.set(0, HEIGHT, -43);
  scene.add(vault);
  for (let z = Z_FRONT - 1; z > Z_END; z -= 9) {
    mg.add('gold', new THREE.TorusGeometry(NAVE_HALF - 0.1, 0.22, 8, 64, PI), gold, M(0, HEIGHT, z));
  }
  mg.add('gold', boxUV(0.5, 0.5, 98), gold, M(0, HEIGHT + NAVE_HALF - 0.2, -43));

  // ---------------------------------------------------------------- end wall: rose window and lancets
  mg.add('stone', boxUV(20, 42, 1), 0xcfc5b8, M(0, 21, Z_END - 0.5));
  mg.add('stone', boxUV(20, 42, 1), 0xcfc5b8, M(0, 21, Z_FRONT + 0.5));
  const glassMat = (map, k) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(k, k, k) });
  const rose = new THREE.Mesh(new THREE.CircleGeometry(6.2, 64), glassMat(T.rose, 1.9));
  rose.position.set(0, 23, Z_END + 0.02); scene.add(rose);
  mg.add('gold', new THREE.TorusGeometry(6.3, 0.35, 10, 64), gold, M(0, 23, Z_END + 0.1));
  function lancetGeo(w, h) {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, 0, PI, false); sh.lineTo(-w / 2, 0);
    const g = new THREE.ShapeGeometry(sh, 16), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + w / 2) / w, uv.getY(i) / h);
    return g;
  }
  for (const [x, z, ry] of [[-6.2, Z_END + 0.02, 0], [6.2, Z_END + 0.02, 0], [-5.5, Z_FRONT - 0.02, PI], [5.5, Z_FRONT - 0.02, PI]]) {
    const l = new THREE.Mesh(lancetGeo(2.6, 11), glassMat(T.lancet, 1.6));
    l.position.set(x, 4, z); l.rotation.y = ry; scene.add(l);
  }
  // entrance doors
  mg.add('wood', boxUV(5.2, 8.5, 0.3), 0x4a2a16, M(0, 4.25, Z_FRONT - 0.1));
  mg.add('gold', new THREE.TorusGeometry(2.7, 0.2, 8, 32, PI), gold, M(0, 6, Z_FRONT - 0.2));
  for (const x of [-0.3, 0.3]) mg.add('gold', new THREE.TorusGeometry(0.25, 0.04, 8, 20), gold, M(x, 4, Z_FRONT - 0.3));

  // light shafts from the rose window
  const shaftMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(1.0, 0.82, 0.6) }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float edge = pow(abs(dot(vN, vV)), 2.0); float along = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
        float flick = 0.85 + 0.15 * sin(uTime * 0.7 + vUv.x * 40.0);
        gl_FragColor = vec4(uColor * edge * along * 0.075 * flick, 1.0); }`
  });
  const shafts = [];
  for (const [tx, tz, col] of [[0, -58, [1.0, 0.82, 0.6]], [-7, -66, [0.55, 0.62, 1.0]], [7, -64, [1.0, 0.55, 0.7]]]) {
    const from = new THREE.Vector3(0, 23, Z_END + 0.5), to = new THREE.Vector3(tx, 0, tz);
    const len = from.distanceTo(to);
    const g = new THREE.CylinderGeometry(9, 4.5, len, 32, 1, true);
    const m = shaftMat.clone(); m.uniforms.uColor.value = new THREE.Color(...col);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), from.clone().sub(to).normalize());
    scene.add(mesh); shafts.push(mesh);
  }
  onProgress(0.2);

  // ---------------------------------------------------------------- bays
  const books = [];        // instanced book transforms
  const balusters = [];    // instanced baluster positions
  const LEATHER = [0x5a1a1a, 0x6e2318, 0x1f3a2c, 0x25304f, 0x3d2414, 0x7a5524, 0x1b1b22, 0x4a2346, 0x2e4a4a, 0x8a3b1e, 0x50402a, 0x6b1f2f, 0x14324a, 0x9a7a3a];
  const rnd = TX.mulberry32(1234);
  const runes = [];
  const bayLights = [];
  const signs = [];

  function shelfRows(origin, along, normal, length, y0, y1, tint) {
    // planks + books for the reachable lower part of a bookcase wall
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const rows = Math.floor((y1 - y0) / 0.5);
    for (let r = 0; r <= rows; r++) {
      const y = y0 + r * 0.5;
      const c = origin.clone().addScaledVector(along, length / 2).addScaledVector(normal, 0.17);
      const mm = new THREE.Matrix4().compose(new THREE.Vector3(c.x, y, c.z), q, new THREE.Vector3(1, 1, 1));
      mg.add('wood', boxUV(length, 0.035, 0.34), tint, mm);
      if (r === rows) break;
      let u = 0.05;
      while (u < length - 0.08) {
        const th = 0.032 + rnd() * 0.05;
        if (rnd() < 0.035) { u += 0.12 + rnd() * 0.2; continue; }
        const h = 0.25 + rnd() * 0.19, d = 0.2 + rnd() * 0.1;
        const lean = rnd() < 0.06 ? (rnd() - 0.5) * 0.5 : 0;
        const p = origin.clone().addScaledVector(along, u + th / 2).addScaledVector(normal, 0.02 + d / 2);
        p.y = y + 0.018;
        const rot = new THREE.Quaternion().setFromAxisAngle(normal, lean).multiply(q);
        books.push({ bay: curBay, m: new THREE.Matrix4().compose(p, rot, new THREE.Vector3(th, h, d)), c: LEATHER[(rnd() * LEATHER.length) | 0], v: 0.75 + rnd() * 0.5 });
        u += th + (lean ? 0.03 : 0.002);
      }
    }
  }
  function textureWall(origin, along, normal, length, y0, y1) {
    const g = new THREE.PlaneGeometry(length, y1 - y0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * length / 2, uv.getY(i) * (y1 - y0) / 2);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const c = origin.clone().addScaledVector(along, length / 2).addScaledVector(normal, 0.005);
    mg.add('books', g, 0xffffff, new THREE.Matrix4().compose(new THREE.Vector3(c.x, (y0 + y1) / 2, c.z), q, new THREE.Vector3(1, 1, 1)));
  }
  function uprights(origin, along, normal, length, y0, y1, tint, step = 1.6) {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    for (let u = 0; u <= length + 1e-3; u += step) {
      const p = origin.clone().addScaledVector(along, u).addScaledVector(normal, 0.18);
      mg.add('wood', boxUV(0.08, y1 - y0, 0.36), tint, new THREE.Matrix4().compose(new THREE.Vector3(p.x, (y0 + y1) / 2, p.z), q, new THREE.Vector3(1, 1, 1)));
    }
  }
  function balcony(a, b, normal, y, tint) {
    // walkway from a to b (wall line), projecting along normal
    const along = b.clone().sub(a), len = along.length(); along.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), along);
    const mid = a.clone().add(b).multiplyScalar(0.5).addScaledVector(normal, 0.55);
    mg.add('wood', boxUV(len, 0.16, 1.1), tint, new THREE.Matrix4().compose(new THREE.Vector3(mid.x, y, mid.z), q, new THREE.Vector3(1, 1, 1)));
    const rail = a.clone().add(b).multiplyScalar(0.5).addScaledVector(normal, 1.05);
    mg.add('gold', boxUV(len, 0.07, 0.09), gold, new THREE.Matrix4().compose(new THREE.Vector3(rail.x, y + 1.0, rail.z), q, new THREE.Vector3(1, 1, 1)));
    mg.add('wood', boxUV(len, 0.1, 0.12), tint, new THREE.Matrix4().compose(new THREE.Vector3(rail.x, y + 0.13, rail.z), q, new THREE.Vector3(1, 1, 1)));
    for (let u = 0.1; u < len; u += 0.22) {
      const p = a.clone().addScaledVector(along, u).addScaledVector(normal, 1.05);
      balusters.push(new THREE.Vector3(p.x, y + 0.13, p.z));
    }
  }
  function archWall(s, zc) {
    const sh = new THREE.Shape();
    sh.moveTo(-BAY_HALF, 0); sh.lineTo(-OPEN_HALF, 0); sh.lineTo(-OPEN_HALF, ARCH_SPRING);
    sh.absarc(0, ARCH_SPRING, OPEN_HALF, PI, 0, true);
    sh.lineTo(OPEN_HALF, 0); sh.lineTo(BAY_HALF, 0); sh.lineTo(BAY_HALF, HEIGHT); sh.lineTo(-BAY_HALF, HEIGHT); sh.lineTo(-BAY_HALF, 0);
    const g = new THREE.ShapeGeometry(sh, 24), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    mg.add('books', g, 0xffffff, M(s * NAVE_HALF, 0, zc, 0, PI / 2, 0));
    mg.add('stone', new THREE.TorusGeometry(OPEN_HALF + 0.1, 0.32, 10, 48, PI), 0xe2d6c4, M(s * (NAVE_HALF - 0.05), ARCH_SPRING, zc, 0, PI / 2, 0));
    mg.add('gold', new THREE.TorusGeometry(OPEN_HALF + 0.45, 0.07, 6, 48, PI), gold, M(s * (NAVE_HALF - 0.2), ARCH_SPRING, zc, 0, PI / 2, 0));
    for (const dz of [-1, 1]) mg.add('stone', boxUV(0.6, ARCH_SPRING, 0.6), 0xe2d6c4, M(s * (NAVE_HALF - 0.05), ARCH_SPRING / 2, zc + dz * (OPEN_HALF + 0.1)));
    mg.add('gold', boxUV(0.7, 1.1, 0.9), gold, M(s * (NAVE_HALF - 0.1), ARCH_SPRING + OPEN_HALF + 0.35, zc));
  }

  let curBay = -1;
  for (const bay of BAYS) {
    const { s, zc, cat } = bay;
    curBay = bay.b;
    const catCol = new THREE.Color(cat.color);
    const tint = cat.wood;
    archWall(s, zc);
    // sign above the arch
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), new THREE.MeshStandardMaterial({ map: TX.signTexture(cat.name, cat.color), emissiveMap: null, roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0 }));
    sign.material.emissiveMap = sign.material.map; sign.material.emissiveIntensity = 1.15;
    sign.position.set(s * (NAVE_HALF - 0.08), ARCH_SPRING + OPEN_HALF + 2.6, zc); sign.rotation.y = -s * PI / 2;
    scene.add(sign); signs.push(sign);

    const x0 = s * (NAVE_HALF + 0.3), x1 = s * (BAY_BACK - 0.62);
    const sideLen = Math.abs(x1 - x0);
    // side walls (books up to 4.5 m, painted books above)
    for (const dz of [-1, 1]) {
      const z = zc + dz * BAY_HALF, normal = new THREE.Vector3(0, 0, -dz);
      const origin = new THREE.Vector3(x0, 0, z), along = new THREE.Vector3(s, 0, 0);
      shelfRows(origin, along, normal, sideLen, 0.06, 4.56, tint);
      textureWall(new THREE.Vector3(s * NAVE_HALF, 0, z), along, normal, BAY_BACK - NAVE_HALF, 4.56, HEIGHT);
      uprights(origin, along, normal, sideLen, 0, HEIGHT, tint);
      // back panel behind the real books
      textureWall(new THREE.Vector3(s * NAVE_HALF, 0, z), along, normal, BAY_BACK - NAVE_HALF, 0, 4.56);
    }
    // back wall: painted books, product shelving in front
    textureWall(new THREE.Vector3(s * BAY_BACK, 0, zc + s * BAY_HALF), new THREE.Vector3(0, 0, -s), new THREE.Vector3(-s, 0, 0), BAY_HALF * 2, 0, HEIGHT);
    uprights(new THREE.Vector3(s * BAY_BACK, 0, zc + s * BAY_HALF), new THREE.Vector3(0, 0, -s), new THREE.Vector3(-s, 0, 0), BAY_HALF * 2, SHELF_TOP, HEIGHT, tint, 2.0);
    const xs = s * (BAY_BACK - 0.31);
    for (const y of [...SHELF_LEVELS, SHELF_TOP]) {
      mg.add('wood', boxUV(0.62, y === SHELF_LEVELS[0] ? 0.12 : 0.045, 14.9), tint, M(xs, y === SHELF_LEVELS[0] ? 0.06 : y - 0.0225, zc));
      if (y > SHELF_LEVELS[0] && y < SHELF_TOP) mg.add('glow', boxUV(0.02, 0.012, 14.8), catCol, M(s * (BAY_BACK - 0.62), y - 0.05, zc), 1.25);
    }
    mg.add('glow', boxUV(0.02, 0.012, 14.8), catCol, M(s * (BAY_BACK - 0.62), SHELF_TOP - 0.06, zc), 1.25);
    for (let k = 0; k <= 6; k++) mg.add('wood', boxUV(0.62, SHELF_TOP, 0.06), tint, M(xs, SHELF_TOP / 2, zc - 7.2 + k * 2.4));
    mg.add('wood', boxUV(0.7, 0.12, 15.0), 0x3a281c, M(xs, SHELF_TOP + 0.06, zc));
    // balconies
    for (const y of [9, 18]) {
      for (const dz of [-1, 1]) balcony(new THREE.Vector3(s * (NAVE_HALF + 0.5), 0, zc + dz * BAY_HALF), new THREE.Vector3(s * (BAY_BACK - 0.1), 0, zc + dz * BAY_HALF), new THREE.Vector3(0, 0, -dz), y, tint);
      balcony(new THREE.Vector3(s * BAY_BACK, 0, zc - BAY_HALF + 1.1), new THREE.Vector3(s * BAY_BACK, 0, zc + BAY_HALF - 1.1), new THREE.Vector3(-s, 0, 0), y, tint);
    }
    // ceiling
    mg.add('wood', boxUV(BAY_BACK - NAVE_HALF, 0.4, BAY_HALF * 2), 0x3a281c, M(s * (NAVE_HALF + BAY_BACK) / 2, HEIGHT + 0.2, zc));
    for (let k = -3; k <= 3; k++) mg.add('gold', boxUV(BAY_BACK - NAVE_HALF, 0.25, 0.18), gold, M(s * (NAVE_HALF + BAY_BACK) / 2, HEIGHT - 0.1, zc + k * 2.2));
    // rolling ladder
    at3(s * 18.2, zc - BAY_HALF + 1.25, -0.32, (lx, lz, lean) => {
      for (const dx of [-0.25, 0.25]) mg.add('wood', boxUV(0.06, 6.4, 0.06), tint, M(lx + dx, 3.1, lz, lean, 0, 0));
      for (let k = 0; k < 17; k++) {
        const y = 0.3 + k * 0.36;
        mg.add('gold', new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), gold, M(lx, y, lz + Math.tan(lean) * (y - 3.1), 0, 0, PI / 2));
      }
    });
    // tables or furniture plinths
    if (cat.id !== 'furniture') {
      for (const dz of [-3.6, 3.6]) {
        const tx = s * 15.4, tz = zc + dz;
        mg.add('wood', new THREE.CylinderGeometry(1.15, 1.15, 0.07, 48), tint, M(tx, 0.815, tz));
        mg.add('fabric', new THREE.CylinderGeometry(1.17, 1.17, 0.012, 48), catCol.clone().multiplyScalar(0.18), M(tx, 0.855, tz));
        mg.add('gold', new THREE.TorusGeometry(1.155, 0.02, 6, 64), gold, M(tx, 0.815, tz, PI / 2, 0, 0));
        mg.add('wood', new THREE.CylinderGeometry(0.12, 0.2, 0.78, 16), tint, M(tx, 0.39, tz));
        mg.add('wood', new THREE.CylinderGeometry(0.5, 0.6, 0.06, 24), tint, M(tx, 0.03, tz));
      }
    }
    // hero plinth
    mg.add('stone', boxUV(1.2, 0.8, 1.2), 0xe2d6c4, M(s * 19.6, 0.4, zc));
    mg.add('gold', boxUV(1.26, 0.06, 1.26), gold, M(s * 19.6, 0.8, zc));
    mg.add('gold', boxUV(1.26, 0.06, 1.26), gold, M(s * 19.6, 0.06, zc));
    // floor rune circle
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), new THREE.MeshBasicMaterial({ map: T.rune, color: catCol.clone().multiplyScalar(1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    rune.rotation.x = -PI / 2; rune.position.set(s * 15.4, 0.02, zc);
    scene.add(rune); runes.push({ mesh: rune, speed: 0.08 * (bay.b % 2 ? 1 : -1) });
    // bay light: warm white tinted by the category
    bayLights.push({
      color: new THREE.Color(0xffe2c0).lerp(catCol, 0.3),
      rect: new THREE.Vector3(s * 21.3, 4.1, zc), look: new THREE.Vector3(s * BAY_BACK, 1.5, zc),
      point: new THREE.Vector3(s * 15.4, 4.5, zc), center: new THREE.Vector3(s * 17, 2, zc)
    });
  }
  function at3(x, z, lean, fn) { fn(x, z, lean); }
  onProgress(0.45);

  // Light pool: a soft strip light for the shelves of the two nearest wings and a warm
  // point light for the three nearest. Weights fade to zero before a light is handed to
  // another wing, so nothing pops; shaders keep a fixed light count (no recompiles).
  const rectPool = [0, 1].map(() => { const l = new THREE.RectAreaLight(0xffe8cc, 0, 15, 1.6); scene.add(l); return l; });
  const pointPool = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffe2c0, 0, 11, 1.2); scene.add(l); return l; });
  function assign(pool, camPos, base, place) {
    const ranked = bayLights.map(b => ({ b, d: b.center.distanceTo(camPos) })).sort((a, b) => a.d - b.d);
    const cut = ranked[pool.length].d;
    pool.forEach((light, i) => {
      const { b, d } = ranked[i];
      place(light, b);
      light.intensity = base * THREE.MathUtils.clamp((cut - d) / 5, 0, 1);
    });
  }
  function updateLights(camPos) {
    assign(rectPool, camPos, 6.5, (l, b) => { l.position.copy(b.rect); l.lookAt(b.look); });
    assign(pointPool, camPos, 18, (l, b) => { l.position.copy(b.point); l.color.copy(b.color); });
  }

  // ---------------------------------------------------------------- instanced books + balusters
  const bookGeo = new THREE.BoxGeometry(1, 1, 1); bookGeo.translate(0, 0.5, 0);
  // one instanced mesh per wing so whole wings are frustum-culled
  const bookMat = new THREE.MeshStandardMaterial({ map: T.spine, roughness: 0.66, metalness: 0.02 });
  const col = new THREE.Color();
  for (const bay of BAYS) {
    const list = books.filter(b => b.bay === bay.b);
    const bookMesh = new THREE.InstancedMesh(bookGeo, bookMat, list.length);
    list.forEach((b, i) => { bookMesh.setMatrixAt(i, b.m); bookMesh.setColorAt(i, col.setHex(b.c).multiplyScalar(b.v)); });
    bookMesh.instanceMatrix.needsUpdate = true; bookMesh.computeBoundingSphere();
    scene.add(bookMesh);
  }
  const balGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.87, 6, 1, true); balGeo.translate(0, 0.435, 0);
  const balMesh = new THREE.InstancedMesh(balGeo, mats.gold, balusters.length);
  { const gc = new THREE.Color(gold), n = balGeo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([gc.r, gc.g, gc.b], i * 3);
    balGeo.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
  balusters.forEach((p, i) => balMesh.setMatrixAt(i, _m.makeTranslation(p.x, p.y, p.z)));
  balMesh.instanceMatrix.needsUpdate = true; balMesh.computeBoundingSphere();
  scene.add(balMesh);

  // ---------------------------------------------------------------- banners
  const banners = [];
  BAYS.forEach(bay => {
    for (const dz of [-1, 1]) {
      const z = bay.zc + dz * 9;
      if (z > Z_FRONT - 2) continue;
      const g = new THREE.PlaneGeometry(1.7, 5.1, 1, 8); g.translate(0, -2.55, 0);
      const ban = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: TX.bannerTexture(bay.cat.color, bay.cat.glyph), side: THREE.DoubleSide, roughness: 0.85 }));
      ban.position.set(bay.s * 6.8, HEIGHT + 3.5, z + dz * 0.2);
      scene.add(ban); banners.push({ mesh: ban, ph: bay.b * 1.7 + dz });
    }
  });
  onProgress(0.55);

  // ---------------------------------------------------------------- orbs
  const orbs = [];
  for (const [z, y] of [[-19, 15.5], [-46, 17], [-73, 15.5]]) {
    const g = new THREE.Group(); g.position.set(0, y, z);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.9) })));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: new THREE.Color(1.0, 0.7, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
    halo.scale.set(7, 7, 1); g.add(halo);
    const rings = [];
    for (const [r, t, kind] of [[1.7, 0.05, 'gold'], [2.2, 0.025, 'glow'], [2.7, 0.06, 'gold']]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 96),
        kind === 'gold' ? new THREE.MeshStandardMaterial({ color: gold, metalness: 1, roughness: 0.25 }) : new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 2.6) }));
      g.add(ring); rings.push(ring);
    }
    // little runes orbiting
    const glyphs = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 0.9) }), 18);
    g.add(glyphs);
    scene.add(g);
    orbs.push({ g, rings, glyphs, ph: z });
    const circle = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: T.rune, color: new THREE.Color(0.9, 0.65, 0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    circle.rotation.x = -PI / 2; circle.position.set(0, 0.025, z);
    scene.add(circle); runes.push({ mesh: circle, speed: 0.05 });
  }

  const orbPool = [0, 1].map(() => { const l = new THREE.PointLight(0xffc88a, 0, 0, 2); scene.add(l); return l; });
  function updateOrbLights(camPos) {
    const ranked = orbs.map(o => ({ o, d: o.g.position.distanceTo(camPos) })).sort((a, b) => a.d - b.d);
    orbPool.forEach((l, i) => { l.position.copy(ranked[i].o.g.position); l.intensity = 420 * THREE.MathUtils.clamp((ranked[2].d - ranked[i].d) / 8, 0, 1); });
  }

  // ---------------------------------------------------------------- floating candles (bob in the shader)
  const timeU = { value: 0 };
  const candleN = 520, candles = [];
  for (let i = 0; i < candleN; i++) {
    let x, y, z;
    if (i < 300) { x = (rnd() - 0.5) * 16; y = 5 + rnd() * 22; z = Z_FRONT - 4 - rnd() * 92; }
    else { const bay = BAYS[i % BAYS.length]; x = bay.s * (11 + rnd() * 11.5); y = 4.6 + rnd() * 22; z = bay.zc + (rnd() - 0.5) * 14; }
    candles.push({ x, y, z, h: 0.12 + rnd() * 0.2, ph: rnd() * 6.28 });
  }
  const candleGeo = new THREE.CylinderGeometry(0.035, 0.038, 1, 10); candleGeo.translate(0, 0.5, 0);
  const candleMat = new THREE.MeshStandardMaterial({ color: 0xf4e6c8, roughness: 0.5, emissive: 0x3a2008 });
  const phaseAttr = new THREE.InstancedBufferAttribute(new Float32Array(candles.map(c => c.ph)), 1);
  candleGeo.setAttribute('aPhase', phaseAttr);
  candleMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = timeU;
    sh.vertexShader = 'attribute float aPhase;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <project_vertex>',
      'vec4 mvPosition = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\nmvPosition = instanceMatrix * mvPosition;\n#endif\nmvPosition.y += sin(uTime * 0.7 + aPhase) * 0.14;\nmvPosition = modelViewMatrix * mvPosition;\ngl_Position = projectionMatrix * mvPosition;');
  };
  const candleMesh = new THREE.InstancedMesh(candleGeo, candleMat, candleN);
  candles.forEach((c, i) => candleMesh.setMatrixAt(i, M(c.x, c.y, c.z, 0, 0, 0, 1, c.h, 1)));
  candleMesh.computeBoundingSphere(); candleMesh.frustumCulled = false;
  scene.add(candleMesh);

  const viewport = { value: 800 };
  const pointsMat = (size, color, extra = '') => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: timeU, uMap: { value: T.glow }, uSize: { value: size }, uColor: { value: color }, uViewport: viewport },
    vertexShader: `attribute float aPhase; uniform float uTime; uniform float uSize; uniform float uViewport; varying float vFade;
      void main(){ vec3 p = position; ${extra}
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * projectionMatrix[1][1] * uViewport * 0.5 / max(0.1, -mv.z); }`,
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uColor; varying float vFade;
      void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(uColor * t.a * vFade, 1.0); }`
  });
  const flameGeo = new THREE.BufferGeometry();
  flameGeo.setAttribute('position', new THREE.Float32BufferAttribute(candles.flatMap(c => [c.x, c.y + c.h + 0.05, c.z]), 3));
  flameGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(candles.map(c => c.ph), 1));
  const flames = new THREE.Points(flameGeo, pointsMat(0.34, new THREE.Color(2.6, 1.45, 0.55),
    'p.y += sin(uTime * 0.7 + aPhase) * 0.14; vFade = 0.8 + 0.2 * sin(uTime * 13.0 + aPhase * 7.0);'));
  flames.frustumCulled = false; scene.add(flames);

  // dust motes
  const dustN = 6000, dp = [], dph = [];
  for (let i = 0; i < dustN; i++) {
    const inBay = rnd() < 0.35, bay = BAYS[(rnd() * BAYS.length) | 0];
    dp.push(inBay ? bay.s * (10 + rnd() * 13) : (rnd() - 0.5) * 19, rnd() * 28, inBay ? bay.zc + (rnd() - 0.5) * 15 : Z_FRONT - rnd() * 97);
    dph.push(rnd() * 100);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  dustGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(dph, 1));
  const dust = new THREE.Points(dustGeo, pointsMat(0.05, new THREE.Color(1.2, 0.95, 0.65),
    'p += vec3(sin(uTime*0.21+aPhase)*0.7, sin(uTime*0.13+aPhase*1.7)*0.9, cos(uTime*0.17+aPhase*0.6)*0.7); vFade = 0.35 + 0.35 * sin(uTime*1.3 + aPhase*3.0);'));
  dust.frustumCulled = false; scene.add(dust);
  onProgress(0.65);

  mg.build(scene, mats);

  // ---------------------------------------------------------------- update
  const glyphDummy = new THREE.Object3D();
  function update(t, dt, viewportH, camPos) {
    updateLights(camPos);
    updateOrbLights(camPos);
    timeU.value = t;
    viewport.value = viewportH;
    for (const r of runes) r.mesh.rotation.z = t * r.speed;
    for (const s of shafts) s.material.uniforms.uTime.value = t;
    for (const b of banners) b.mesh.rotation.x = Math.sin(t * 0.6 + b.ph) * 0.05;
    for (const o of orbs) {
      o.rings[0].rotation.set(t * 0.4 + o.ph, t * 0.3, 0);
      o.rings[1].rotation.set(PI / 2 + Math.sin(t * 0.5) * 0.4, 0, t * 0.6);
      o.rings[2].rotation.set(-t * 0.25, t * 0.2 + 1, t * 0.1);
      for (let i = 0; i < 18; i++) {
        const a = t * 0.5 + (i / 18) * PI * 2, rr = 3.3 + Math.sin(t + i) * 0.2;
        glyphDummy.position.set(Math.cos(a) * rr, Math.sin(a * 2 + i) * 0.5, Math.sin(a) * rr);
        glyphDummy.rotation.set(t + i, t * 1.3, 0);
        glyphDummy.updateMatrix();
        o.glyphs.setMatrixAt(i, glyphDummy.matrix);
      }
      o.glyphs.instanceMatrix.needsUpdate = true;
      o.g.position.y += Math.sin(t * 0.8 + o.ph) * 0.002;
    }
  }
  return { update, mats, T, stats: { books: books.length, candles: candleN } };
}
