// Stocks the library: generates listings, places them on shelves, tables and plinths,
// merges them into a few draw calls and hangs a swaying red price tag on each one.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildParts, partsBox, CATEGORIES } from './products.js';
import { BAYS, BAY_BACK, SHELF_LEVELS, SHELF_TOP } from './layout.js';
import { mulberry32, tagAtlas, TAG_COLS, TAG_ROWS } from './textures.js';

const PI = Math.PI;
const UP = new THREE.Vector3(0, 1, 0);

export const hoverUniforms = { uHover: { value: -1 }, uHidden: { value: -1 }, uTime: { value: 0 } };

export function makeProductMaterials(woodMap, patched) {
  const m = {
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
    gloss: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.26 }),
    wood: new THREE.MeshStandardMaterial({ vertexColors: true, map: woodMap, roughness: 0.6 }),
    fabric: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.88, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0.55, 0.55, 0.55) }),
    glass: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.04, transparent: true, opacity: 0.3, depthWrite: false, clearcoat: 1, envMapIntensity: 1.8 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    leaf: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide })
  };
  if (patched) for (const mat of Object.values(m)) patchPid(mat);
  return m;
}

// Per-vertex product id lets one merged mesh highlight or hide a single product.
function patchPid(mat) {
  const lit = !mat.isMeshBasicMaterial;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, hoverUniforms);
    sh.vertexShader = 'attribute float pid;\nvarying float vPid;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vPid = pid;');
    const glow = 'float hov = 1.0 - step(0.5, abs(vPid - uHover)); vec3 hovCol = vec3(1.0, 0.62, 0.22) * hov * (0.5 + 0.25 * sin(uTime * 6.0));';
    sh.fragmentShader = 'uniform float uHover;\nuniform float uHidden;\nuniform float uTime;\nvarying float vPid;\n' + sh.fragmentShader
      .replace('void main() {', 'void main() {\n if (abs(vPid - uHidden) < 0.5) discard;')
      .replace(lit ? '#include <emissivemap_fragment>' : '#include <color_fragment>',
        lit ? `#include <emissivemap_fragment>\n ${glow}\n totalEmissiveRadiance += hovCol;` : `#include <color_fragment>\n ${glow}\n diffuseColor.rgb += hovCol;`);
  };
  mat.customProgramCacheKey = () => 'pid-' + (lit ? 'lit' : 'basic');
}

export function buildShop(scene, woodMap, onProgress = () => {}) {
  const rnd = mulberry32(2026);
  const mats = makeProductMaterials(woodMap, true);
  const buckets = {};
  const listings = [];
  const MAX = TAG_COLS * TAG_ROWS;

  const tmpBox = new THREE.Box3();
  const fit = (box, maxW, maxH, maxD) => {
    const sz = box.getSize(new THREE.Vector3());
    return Math.min(maxW / sz.x, maxH / sz.y, maxD / sz.z);
  };

  function makeListing(cat, tpl, variant, nameOverride, priceRange) {
    if (listings.length >= MAX) return null;
    const [key, names, range, , desc] = tpl;
    const pr = priceRange || range;
    const base = nameOverride || names[(rnd() * names.length) | 0];
    const name = nameOverride ? base : `${base}${variant.n && rnd() < 0.7 ? ' — ' + variant.n : ''}`;
    const raw = pr[0] + (pr[1] - pr[0]) * rnd() ** 1.6;
    const price = raw < 300 ? Math.floor(raw) + [0.99, 0.49, 0.95, 0.99][(rnd() * 4) | 0] : Math.round(raw / 10) * 10 - 0.01;
    const parts = buildParts(key, variant);
    const box = partsBox(parts);
    const l = {
      pid: listings.length + 1, cat, key, name, price, variant, parts, box,
      brand: cat.brand[(rnd() * cat.brand.length) | 0],
      rating: Math.round((3.7 + rnd() * 1.3) * 10) / 10, reviews: Math.floor(8 + rnd() ** 2 * 9000),
      desc: desc || 'Hand-made in the realm, delivered by owl.', units: [], worldBox: new THREE.Box3(), tag: null
    };
    listings.push(l);
    return l;
  }

  function placeUnits(l, mats4) {
    l.units = mats4;
    for (const m of mats4) {
      for (const p of l.parts) {
        const g = p.g.clone().applyMatrix4(m);
        const n = g.attributes.position.count;
        const c = new THREE.Color(p.c);
        if (p.m === 'glow') c.multiplyScalar(1.5);
        const ca = new Float32Array(n * 3), pa = new Float32Array(n).fill(l.pid);
        for (let i = 0; i < n; i++) { ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
        g.setAttribute('pid', new THREE.BufferAttribute(pa, 1));
        (buckets[l.cat.id + '|' + p.m] ||= []).push(g);
      }
      tmpBox.copy(l.box).applyMatrix4(m);
      l.worldBox.union(tmpBox);
    }
    // tag hangs from the top front corner on the viewer's right of the last unit
    const m = mats4[mats4.length - 1];
    const b = l.box, size = b.getSize(new THREE.Vector3());
    const sc = new THREE.Vector3().setFromMatrixScale(m).x;
    const anchorLocal = new THREE.Vector3(b.max.x - size.x * 0.12, b.min.y + size.y * 0.92, b.max.z - size.z * 0.15);
    const anchor = anchorLocal.applyMatrix4(m);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(m));
    const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q), r = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    anchor.addScaledVector(f, 0.05);
    const maxDim = Math.max(size.x, size.y, size.z) * sc;
    const w = THREE.MathUtils.clamp(maxDim * 0.6, 0.22, 0.46);
    const len = THREE.MathUtils.clamp(maxDim * 0.22, 0.07, 0.26);
    const floorY = l.worldBox.min.y + 0.01;
    const tagH = w * (4096 / TAG_ROWS) / (4096 / TAG_COLS);
    if (anchor.y - len - tagH < floorY) anchor.y = floorY + len + tagH;
    l.tag = { anchor, f, r, w, len, ph: rnd() * 6.28, yaw: (rnd() - 0.5) * 0.4 };
  }

  const yawQ = yaw => new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  const mat4 = (x, y, z, yaw, s) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), yawQ(yaw), new THREE.Vector3(s, s, s));

  // Shelf filler: walks along a shelf segment placing listings of 1-3 identical units.
  function fillShelf(cat, pool, s, zc, level, zFrom, zTo, maxH) {
    const yaw = -s * PI / 2;                    // face the nave
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yawQ(yaw)); // viewer's right in world
    const x = s * (BAY_BACK - 0.33);
    // walk in the direction of the viewer's right
    const dir = Math.sign(right.z) || 1;
    let u = dir > 0 ? zFrom + 0.08 : zTo - 0.08;
    const end = dir > 0 ? zTo - 0.05 : zFrom + 0.05;
    let guard = 0;
    while (guard++ < 40) {
      const tpl = pool[(rnd() * pool.length) | 0];
      const variant = tpl[3][(rnd() * tpl[3].length) | 0];
      const parts = buildParts(tpl[0], variant), box = partsBox(parts), size = box.getSize(new THREE.Vector3());
      const sc = Math.min(fit(box, 0.9, maxH, 0.5), THREE.MathUtils.clamp(0.42 / size.y, 1, 1.8));
      const w = size.x * sc;
      const units = w < 0.22 ? 3 : w < 0.45 ? 2 : 1;
      const total = units * w + (units - 1) * 0.035;
      if ((end - u) * dir < total + 0.04) break;
      const l = makeListing(cat, tpl, variant);
      if (!l) return;
      const ms = [];
      for (let k = 0; k < units; k++) {
        const along = u + dir * (k * (w + 0.035) + w / 2) - dir * ((box.min.x + box.max.x) / 2) * sc;
        const zz = (box.min.z + box.max.z) / 2 * sc;
        ms.push(mat4(x + s * zz, level, along, yaw, sc));
      }
      placeUnits(l, ms);
      u += dir * (total + 0.09 + rnd() * 0.08);
    }
  }

  // Table: products around the rim, facing outward, one hero in the middle.
  function fillTable(cat, pool, cx, cz) {
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const tpl = pool[(rnd() * pool.length) | 0];
      const variant = tpl[3][(rnd() * tpl[3].length) | 0];
      const l = makeListing(cat, tpl, variant);
      if (!l) return;
      const size = l.box.getSize(new THREE.Vector3());
      let x = cx, z = cz, yaw = rnd() * PI * 2, sc;
      if (i < n) {
        const a = (i / n) * PI * 2 + 0.3;
        x = cx + Math.sin(a) * 0.72; z = cz + Math.cos(a) * 0.72; yaw = a;
        sc = Math.min(fit(l.box, 0.42, 0.55, 0.42), THREE.MathUtils.clamp(0.3 / size.y, 1, 1.7));
      } else sc = Math.min(fit(l.box, 0.6, 0.7, 0.6), THREE.MathUtils.clamp(0.45 / size.y, 1, 2));
      placeUnits(l, [mat4(x, 0.862, z, yaw, sc)]);
    }
  }

  const BIG = new Set(['mixer', 'espresso', 'skateboard', 'lectern', 'globe', 'monstera', 'fern', 'toolbox', 'level', 'axe']);
  let bayIdx = 0;
  for (const bay of BAYS) {
    const { cat, s, zc } = bay;
    const pool = cat.items;
    // back shelving: 6 segments between uprights x 4 levels
    for (let k = 0; k < 6; k++) {
      const z0 = zc - 7.2 + k * 2.4 + 0.03, z1 = z0 + 2.34;
      SHELF_LEVELS.forEach((y, li) => {
        const maxH = (SHELF_LEVELS[li + 1] || SHELF_TOP) - y - 0.16;
        const p = li === 0 ? pool : pool.filter(t => !BIG.has(t[0]) || li < 2);
        fillShelf(cat, p.length ? p : pool, s, zc, y, z0, z1, maxH);
      });
    }
    if (cat.id === 'furniture') {
      const quads = [[s * 14.4, zc - 3.75], [s * 14.4, zc + 3.75], [s * 19.4, zc - 3.75], [s * 19.4, zc + 3.75]];
      cat.sets.forEach((set, si) => {
        const [cx, cz] = quads[si];
        const setYaw = -s * PI / 2;
        const q = yawQ(setYaw);
        for (const [key, name, range, variant, [ox, oy, oz, ry]] of set.items) {
          const l = makeListing(cat, [key, [name], range, [variant], descFor(key)], variant, name, range);
          if (!l) continue;
          l.setLabel = set.label;
          const off = new THREE.Vector3(ox, oy, oz).applyQuaternion(q);
          placeUnits(l, [mat4(cx + off.x, oy, cz + off.z, setYaw + ry, 1)]);
        }
      });
    } else {
      fillTable(cat, pool, s * 15.4, zc - 3.6);
      fillTable(cat, pool, s * 15.4, zc + 3.6);
    }
    // hero on the plinth
    {
      const tpl = pool[(bay.b * 3) % pool.length];
      const variant = tpl[3][0];
      const l = makeListing(cat, tpl, variant);
      if (l) {
        const sc = Math.min(fit(l.box, 0.9, 0.9, 0.9), 2.4);
        l.hero = true;
        placeUnits(l, [mat4(s * 19.6, 0.83, zc, -s * PI / 2, Math.min(sc, 3))]);
      }
    }
    onProgress(0.65 + 0.25 * (++bayIdx / BAYS.length));
  }

  // Quest guarantee: at least one kettle under $40.
  const kettle = listings.find(l => l.key === 'kettle');
  if (kettle && !listings.some(l => l.key === 'kettle' && l.price < 40)) kettle.price = 34.99;

  // ---------------------------------------------------------------- merge
  const meshes = [];
  for (const [bk, list] of Object.entries(buckets)) {
    const k = bk.split('|')[1];
    const mesh = new THREE.Mesh(mergeGeometries(list), mats[k]);
    mesh.geometry.computeBoundingSphere();
    mesh.matrixAutoUpdate = false;
    if (k === 'glass') mesh.renderOrder = 2;
    scene.add(mesh); meshes.push(mesh);
  }

  // ---------------------------------------------------------------- tags
  const atlas = tagAtlas(listings.map(l => l.price));
  const tagGeo = new THREE.PlaneGeometry(1, TAG_COLS / TAG_ROWS);
  const tagH = TAG_COLS / TAG_ROWS;
  tagGeo.translate(0, -tagH / 2 + tagH * 0.19, 0);   // hole at the origin
  const cellAttr = new THREE.InstancedBufferAttribute(new Float32Array(listings.length * 2), 2);
  listings.forEach((l, i) => {
    const col = i % TAG_COLS, row = (i / TAG_COLS) | 0;
    cellAttr.setXY(i, col / TAG_COLS, 1 - (row + 1) / TAG_ROWS);
  });
  tagGeo.setAttribute('aCell', cellAttr);
  const tagMat = new THREE.MeshBasicMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, color: new THREE.Color(0.95, 0.9, 0.9) });
  tagMat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec2 aCell;\nvarying vec2 vCell;\n' + sh.vertexShader.replace('#include <uv_vertex>',
      `#include <uv_vertex>\n vMapUv = uv * vec2(${(1 / TAG_COLS).toFixed(8)}, ${(1 / TAG_ROWS).toFixed(8)}) + aCell; vCell = aCell;`);
    sh.fragmentShader = 'varying vec2 vCell;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `vec2 tuv = vMapUv; if (!gl_FrontFacing) tuv.x = 2.0 * vCell.x + ${(1 / TAG_COLS).toFixed(8)} - tuv.x;
       vec4 sampledDiffuseColor = texture2D(map, tuv); diffuseColor *= sampledDiffuseColor;`);
  };
  const tags = new THREE.InstancedMesh(tagGeo, tagMat, listings.length);
  tags.frustumCulled = false;
  scene.add(tags);
  const strPos = new Float32Array(listings.length * 6);
  const strGeo = new THREE.BufferGeometry();
  strGeo.setAttribute('position', new THREE.BufferAttribute(strPos, 3));
  const strings = new THREE.LineSegments(strGeo, new THREE.LineBasicMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0.85 }));
  strings.frustumCulled = false;
  scene.add(strings);

  const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m4 = new THREE.Matrix4();
  function updateTags(t, camPos) {
    for (let i = 0; i < listings.length; i++) {
      const l = listings[i], g = l.tag;
      if (l.pid === hoverUniforms.uHidden.value) {
        _m4.makeScale(0, 0, 0); tags.setMatrixAt(i, _m4);
        strPos.fill(0, i * 6, i * 6 + 6);
        continue;
      }
      const near = camPos.distanceToSquared(g.anchor) < 900;
      const a1 = near ? Math.sin(t * 1.4 + g.ph) * 0.2 : 0.0, a2 = near ? Math.sin(t * 0.9 + g.ph * 1.7) * 0.14 : 0;
      _q1.setFromAxisAngle(g.r, a1); _q2.setFromAxisAngle(g.f, a2); _q1.multiply(_q2);
      _d.set(0, -1, 0).applyQuaternion(_q1);
      _p.copy(g.anchor).addScaledVector(_d, g.len);
      // tag faces the product's front, swings with the string
      _q3.setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.f);
      _q2.setFromAxisAngle(UP, g.yaw);
      _q3.premultiply(_q2).premultiply(_q1);
      _m4.compose(_p, _q3, _s.set(g.w, g.w, g.w));
      tags.setMatrixAt(i, _m4);
      strPos[i * 6] = g.anchor.x; strPos[i * 6 + 1] = g.anchor.y; strPos[i * 6 + 2] = g.anchor.z;
      strPos[i * 6 + 3] = _p.x; strPos[i * 6 + 4] = _p.y; strPos[i * 6 + 5] = _p.z;
    }
    tags.instanceMatrix.needsUpdate = true;
    strGeo.attributes.position.needsUpdate = true;
  }

  // ---------------------------------------------------------------- picking
  const _hit = new THREE.Vector3();
  function pick(ray, maxDist = 22) {
    let best = null, bestD = maxDist;
    for (const l of listings) {
      if (l.pid === hoverUniforms.uHidden.value) continue;
      if (ray.intersectBox(l.worldBox, _hit)) {
        const d = _hit.distanceTo(ray.origin);
        // prefer smaller items when boxes overlap (an item on a table, a lamp on a desk)
        const vol = l.worldBox.getSize(_p).x * _p.y * _p.z;
        const score = d + Math.min(0.6, Math.cbrt(vol) * 0.4);
        if (score < bestD) { bestD = score; best = l; }
      }
    }
    return best;
  }

  return { listings, meshes, updateTags, pick, mats, stats: { listings: listings.length } };
}

function descFor(key) {
  const D = {
    sofa: 'Deep seats, feather-wrapped cushions and arms wide enough for a cup of tea.',
    armchair: 'A high-backed wingback that hides you from drafts and from chores.',
    coffeeTable: 'Solid oak with a lower shelf for the books you are pretending to read.',
    rug: 'Hand-knotted wool; feet are warmer on it, cats are happier on it.',
    floorLamp: 'A tall lantern of linen and brass that pools light exactly where you read.',
    desk: 'A wide writing desk with three drawers and one secret compartment.',
    officeChair: 'Adjustable lumbar support blessed by a guild of tired scribes.',
    monitor: '27 inches of crisp scrying glass, mounted at the perfect eye height.',
    deskLamp: 'Articulated arm, warm bulb, points wherever your quill goes.',
    diningTable: 'Seats eight comfortably, or twelve if they are hobbits.',
    diningChair: 'Ergonomic curved back with a cushioned seat for long feasts.',
    bed: 'Featherdown mattress and an upholstered headboard for reading in bed.',
    nightstand: 'Two soft-close drawers sized for a book, a candle and a glass of water.',
    tableLamp: 'Ceramic base and a linen shade; dims gently at bedtime.'
  };
  return D[key];
}
