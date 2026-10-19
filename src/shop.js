// Puts the scanned products on the shop floor, hangs a printed swing tag on each,
// and answers "what is under the cursor" for products and books.
import * as THREE from 'three';
import { BAYS, bayToWorld, faceNave, NAVE_HALF, BAY_BACK } from './layout.js';
import { SKUS, ASSETS, DEPTS, BAYS_LAYOUT, NAVE_TABLES, bookAt } from './catalog.js';
import { loadAsset, makeInstances } from './assets.js';

const UP = new THREE.Vector3(0, 1, 0);
const D2R = Math.PI / 180;
export const money = p => '$' + (p >= 100 ? Math.round(p).toLocaleString('en-US') : p.toFixed(2));

// Plan every placement before any model is loaded (sizes come from the catalog targets
// and are refined once the asset arrives).
function plan(hall) {
  const out = [];
  const add = (skuId, vi, x, y, z, yaw, opts = {}) => out.push({ skuId, sku: SKUS[skuId], vi, x, y, z, yaw, ...opts });
  for (const bay of BAYS) {
    const L = BAYS_LAYOUT[bay.b];
    for (const [skuRaw, vi, u, v, deg = 0, surf] of L.items) {
      const shelf = skuRaw.startsWith('shelf:'), skuId = shelf ? skuRaw.slice(6) : skuRaw;
      const dept = L.dept;
      if (shelf) {
        const S = hall.surfaces[`${bay.b}:${surf}`];
        add(skuId, vi, S.x, S.y, S.z, S.rot, { shelfRows: S.rows, shelfW: S.w, dept, bay: bay.b });
        continue;
      }
      const { x, z } = bayToWorld(bay, u, v);
      const yaw = faceNave(bay, deg);
      if (surf && surf.startsWith('wall')) {
        const y = surf.includes('@') ? +surf.split('@')[1] : 2.2;
        add(skuId, vi, x, y, z, yaw, { wall: true, dept, bay: bay.b });
      } else if (surf) {
        const S = hall.surfaces[`${bay.b}:${surf}`];
        add(skuId, vi, x, S.y, z, yaw, { onSurface: true, dept, bay: bay.b });
      } else add(skuId, vi, x, 0, z, yaw, { dept, bay: bay.b });
    }
  }
  for (const t of NAVE_TABLES) for (const [skuId, vi, dx, dz, deg] of t.items) add(skuId, vi, t.x + dx, t.plant ? 0 : 0.82, t.z + dz, deg * D2R, { onSurface: !t.plant, dept: SKUS[skuId].dept, bay: -1 });
  return out;
}

export function createShop(scene, hall) {
  const group = new THREE.Group(); scene.add(group);
  const items = plan(hall);
  const placements = []; // one per physical object
  const skuIndex = Object.keys(SKUS);
  const listings = {};   // skuId -> { sku, placements: [] }

  /* ---------- swing tag atlas ---------- */
  const CW = 256, CH = 256, COLS = 8;
  const atlas = document.createElement('canvas'); atlas.width = CW * COLS; atlas.height = CH * Math.ceil(skuIndex.length / COLS);
  const ax = atlas.getContext('2d');
  const wrap = (text, max) => { const words = text.split(' '), lines = ['']; for (const w of words) { if ((lines.at(-1) + ' ' + w).trim().length > max) lines.push(w); else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim(); } return lines; };
  skuIndex.forEach((id, i) => {
    const s = SKUS[id], ox = (i % COLS) * CW + 48, oy = Math.floor(i / COLS) * CH;
    const w = 160, h = 256;
    ax.save(); ax.translate(ox, oy);
    ax.fillStyle = '#b3131c'; ax.beginPath(); ax.roundRect(0, 0, w, h, 10); ax.fill();
    for (let k = 0; k < 500; k++) { ax.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},.05)`; ax.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    // eyelet
    ax.fillStyle = '#d9d6d0'; ax.beginPath(); ax.arc(w / 2, 20, 9, 0, 7); ax.fill();
    ax.fillStyle = '#7d7a75'; ax.beginPath(); ax.arc(w / 2, 20, 5, 0, 7); ax.fill();
    ax.fillStyle = 'rgba(255,255,255,.85)'; ax.font = '600 11px Helvetica, Arial, sans-serif'; ax.textAlign = 'center';
    ax.letterSpacing = '3px'; ax.fillText('ARCANUM', w / 2, 50); ax.letterSpacing = '0px';
    ax.fillStyle = '#fff'; ax.font = '700 40px Helvetica, Arial, sans-serif';
    ax.fillText(money(s.price), w / 2, 112);
    ax.font = '500 15px Helvetica, Arial, sans-serif';
    wrap(s.name, 17).slice(0, 3).forEach((l, k) => ax.fillText(l, w / 2, 146 + k * 19));
    ax.fillStyle = 'rgba(255,255,255,.7)'; ax.font = '500 11px Helvetica, Arial, sans-serif';
    ax.fillText(`SKU ${String(1000 + i * 37).padStart(5, '0')}`, w / 2, 236);
    ax.restore();
  });
  const tagTex = new THREE.CanvasTexture(atlas); tagTex.colorSpace = THREE.SRGBColorSpace; tagTex.anisotropy = 8;
  const back = document.createElement('canvas'); back.width = 160; back.height = 256;
  { const b = back.getContext('2d'); b.fillStyle = '#f3f0ea'; b.fillRect(0, 0, 160, 256); b.fillStyle = '#111';
    for (let x = 24; x < 136; x += 2 + Math.floor(Math.random() * 3)) b.fillRect(x, 150, Math.random() < 0.5 ? 1 : 2, 60);
    b.font = '600 10px Helvetica, Arial'; b.textAlign = 'center'; b.fillText('ARCANUM · LIBRARY STORE', 80, 230); }
  const backTex = new THREE.CanvasTexture(back); backTex.colorSpace = THREE.SRGBColorSpace;

  const TW = 0.05, TH = 0.08;
  const tagGeo = new THREE.PlaneGeometry(TW, TH, 4, 6);
  { // slight curl, origin at the eyelet
    const p = tagGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.003 * Math.cos(Math.PI * x / TW) + 0.002 * (y / TH)); p.setY(i, y - TH / 2 + 0.0063); }
    tagGeo.computeVertexNormals();
  }
  const backGeo = tagGeo.clone(); backGeo.rotateY(Math.PI);
  const cellAttr = (geo, n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); geo.setAttribute('aCell', a); return a; };
  const tagMat = new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.78 });
  const rows = atlas.height / CH;
  tagMat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute float aCell;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      vMapUv = vec2((mod(aCell, ${COLS}.0) * ${CW}.0 + 48.0 + uv.x * 160.0) / ${atlas.width}.0, 1.0 - (floor(aCell / ${COLS}.0) * ${CH}.0 + (1.0 - uv.y) * 256.0) / ${atlas.height}.0);`);
  };
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.8 });

  /* ---------- resolve placements ---------- */
  function addPlacement(it, m, size, tagged) {
    const box = new THREE.Box3(new THREE.Vector3(-size.x / 2, 0, -size.z / 2), new THREE.Vector3(size.x / 2, size.y, size.z / 2)).applyMatrix4(m);
    const p = { ...it, matrix: m, box, size, id: placements.length, tagged };
    placements.push(p);
    (listings[it.skuId] ||= { id: it.skuId, sku: it.sku, placements: [] }).placements.push(p);
    return p;
  }
  const tags = [];
  function hangTag(p, anchor, len, scale, resting) {
    tags.push({ p, anchor, len, scale, resting, cell: skuIndex.indexOf(p.skuId), phase: Math.random() * 6.28, yaw: p.yaw + (Math.random() - 0.5) * 0.8 });
  }

  const byGroup = {}; // `${asset}|${variant}` -> matrices
  const shadowSpots = [];
  async function realise(it) {
    const asset = await loadAsset(it.sku.asset);
    const size = asset.size;
    const listFor = vi => {
      const variant = it.sku.variants?.[vi]?.[1] || null;
      return (byGroup[`${it.sku.asset}|${variant || ''}`] ||= { asset, variant, mats: [] }).mats;
    };
    const list = listFor(it.vi);
    const q = new THREE.Quaternion().setFromAxisAngle(UP, it.yaw);
    if (it.shelfRows) {
      const along = new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, it.yaw);
      const step = Math.max(size.x, size.z) + 0.08, n = Math.max(1, Math.floor((it.shelfW - 0.25) / step));
      it.shelfRows.forEach((y, r) => {
        for (let k = 0; k < n; k++) {
          const off = (k - (n - 1) / 2) * step;
          const pos = new THREE.Vector3(it.x, y, it.z).addScaledVector(along, off);
          const qq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, ((k * 7 + r * 3) % 5 - 2) * 0.06));
          const m = new THREE.Matrix4().compose(pos, qq, new THREE.Vector3(1, 1, 1));
          // each shelf row shows the next colourway
          const vi = (it.vi + r) % (it.sku.variants?.length || 1);
          listFor(vi).push(m);
          const p = addPlacement({ ...it, vi, shelfRows: null }, m, size, k === 0);
          if (k === Math.floor(n / 2)) {
            // a tag hanging from the shelf lip in front of the row
            const lip = new THREE.Vector3(it.x, y, it.z).addScaledVector(new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, it.yaw), 0.15);
            hangTag(p, lip, 0.015, 1, false);
          }
        }
      });
      return;
    }
    let pos = new THREE.Vector3(it.x, it.y, it.z);
    if (it.wall) {
      // flush against the wall, centred on the mounting height
      const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, it.yaw);
      pos = new THREE.Vector3(Math.sign(it.x) * BAY_BACK, it.y - size.y / 2, it.z).addScaledVector(n, size.z / 2 + 0.005);
    }
    const m = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(1, 1, 1));
    list.push(m);
    const p = addPlacement(it, m, size, true);
    // tag: hang from a front-top corner; small things get a tag resting beside them
    const big = size.y > 0.5;
    const local = new THREE.Vector3(size.x * 0.32, size.y * (it.wall ? 0.2 : 0.94), size.z * 0.42);
    const anchor = local.applyMatrix4(m);
    const len = big ? 0.12 : 0.05;
    const resting = !big && !it.wall && anchor.y - len - TH < it.y + 0.01;
    hangTag(p, anchor, len, big ? 1.35 : 1, resting);
    if (!it.wall) shadowSpots.push([pos.x, pos.z, Math.max(size.x, size.z) * 1.35, 0.6, (it.onSurface ? it.y : 0) + 0.006]);
  }

  async function build(onProgress) {
    // load assets one by one so the bar moves steadily; order = first wings first
    const keys = [...new Set(items.map(i => i.sku.asset))];
    let done = 0;
    for (const k of keys) { await loadAsset(k, (got, total) => onProgress((done + got / total) / keys.length)); done++; onProgress(done / keys.length); }
    for (const it of items) await realise(it);
    for (const g of Object.values(byGroup)) group.add(await makeInstances(g.asset, g.variant, g.mats));
    hall.addShadows(shadowSpots);
    buildTags();
  }

  /* ---------- tags ---------- */
  let tagMesh, tagBack, strings;
  const strGeo = new THREE.CylinderGeometry(0.0011, 0.0011, 1, 5); strGeo.translate(0, 0.5, 0);
  function buildTags() {
    const n = tags.length;
    const tg = tagGeo.clone(), bg = backGeo.clone();
    tagMesh = new THREE.InstancedMesh(tg, tagMat, n); tagBack = new THREE.InstancedMesh(bg, backMat, n);
    const a1 = cellAttr(tg, n);
    tags.forEach((t, i) => { a1.array[i] = t.cell; });
    strings = new THREE.InstancedMesh(strGeo, new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.9 }), n);
    for (const m of [tagMesh, tagBack, strings]) { m.castShadow = true; m.frustumCulled = false; group.add(m); }
    updateTags(0, new THREE.Vector3(0, 1.6, 0), true);
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _d = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
  function updateTags(t, cam, all = false) {
    if (!tagMesh) return;
    tags.forEach((tag, i) => {
      if (!all && tag.anchor.distanceToSquared(cam) > 196) return;
      let hole;
      if (tag.resting) {
        // lying on the surface in front of the item, face up
        const f = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, tag.p.yaw);
        hole = tag.anchor.clone().addScaledVector(f, 0.05).setY(tag.p.y + 0.0015);
        _q.setFromAxisAngle(UP, tag.yaw).multiply(_q2.setFromAxisAngle(X, -Math.PI / 2));
        hole.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(_q), 0);
      } else {
        const sw = Math.sin(t * 1.3 + tag.phase) * 0.1, tw = Math.sin(t * 0.7 + tag.phase * 1.7) * 0.25;
        _q.setFromAxisAngle(UP, tag.yaw + tw).multiply(_q2.setFromAxisAngle(X, sw));
        hole = tag.anchor.clone().add(new THREE.Vector3(0, -tag.len, 0).applyQuaternion(_q));
      }
      _m.compose(hole, _q, _s.setScalar(tag.scale));
      tagMesh.setMatrixAt(i, _m); tagBack.setMatrixAt(i, _m);
      // string from the anchor down to the eyelet
      _d.subVectors(tag.anchor, hole); const L = _d.length();
      _q2.setFromUnitVectors(UP, _d.normalize());
      strings.setMatrixAt(i, _m.compose(hole, _q2, _s.set(1, L, 1)));
    });
    tagMesh.instanceMatrix.needsUpdate = tagBack.instanceMatrix.needsUpdate = strings.instanceMatrix.needsUpdate = true;
  }

  /* ---------- picking ---------- */
  const _hit = new THREE.Vector3();
  function pick(ray, maxDist = 18) {
    let best = null, bd = maxDist;
    for (const p of placements) {
      if (ray.intersectBox(p.box, _hit)) { const d = _hit.distanceTo(ray.origin); if (d < bd) { bd = d; best = { kind: 'product', p, listing: listings[p.skuId], dist: d }; } }
    }
    // bookcases: plane through the spines
    hall.cases.forEach((c, ci) => {
      const planePt = c.origin.clone().addScaledVector(c.n, c.depth - 0.03);
      const denom = ray.direction.dot(c.n);
      if (denom > -1e-4) return;
      const tt = planePt.clone().sub(ray.origin).dot(c.n) / denom;
      if (tt <= 0 || tt >= bd) return;
      const h = ray.origin.clone().addScaledVector(ray.direction, tt);
      const a = h.clone().sub(c.origin).dot(c.t);
      if (a < 0.03 || a > c.len - 0.03 || h.y < c.y0 || h.y > c.y1) return;
      const li = c.levels.findIndex((y, k) => h.y >= y && h.y < (c.levels[k + 1] ?? c.y1));
      if (li < 0 || h.y - c.levels[li] > 0.3) return;
      bd = tt;
      const seed = ci * 100000 + li * 1000 + Math.floor(a / 0.035);
      best = { kind: 'book', book: bookAt(seed), dist: tt, point: h };
    });
    return best;
  }

  return { group, build, updateTags, pick, placements, listings, items };
}
