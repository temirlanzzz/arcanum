// Loads the scanned glTF products, normalises them to real-world size, resolves
// KHR_materials_variants colourways and builds instanced copies for the shop floor.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { ASSETS } from './catalog.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = {};

// Fetch with progress so the loading bar reflects real bytes.
async function fetchBuffer(url, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const total = +res.headers.get('content-length') || 0;
  if (!res.body || !total) { const b = await res.arrayBuffer(); onBytes(b.byteLength, b.byteLength); return b; }
  const reader = res.body.getReader(), chunks = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); got += value.length; onBytes(got, total);
  }
  const out = new Uint8Array(got); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}

export async function loadAsset(key, onBytes = () => {}) {
  if (cache[key]) return cache[key];
  const spec = ASSETS[key];
  const buf = await fetchBuffer(`./models/${spec.file}.glb`, onBytes);
  const gltf = await loader.parseAsync(buf, './models/');
  const root = gltf.scene;
  // Some sample scenes ship their own punctual lights; the shop provides the lighting.
  const lights = []; root.traverse(o => { if (o.isLight) lights.push(o); });
  lights.forEach(l => l.parent.remove(l));
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
  const measure = spec.fit === 'h' ? size.y : Math.max(size.x, size.z);
  const k = spec.size / measure;
  // normalised: bottom-centre at the origin, real size
  const norm = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2));
  const variantNames = gltf.userData?.gltfExtensions?.KHR_materials_variants?.variants?.map(v => v.name) || [];
  const parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const m = new THREE.Matrix4().multiplyMatrices(norm, o.matrixWorld);
    const mappings = o.userData?.gltfExtensions?.KHR_materials_variants?.mappings || [];
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        const im = new THREE.Matrix4(); o.getMatrixAt(i, im);
        parts.push({ geometry: o.geometry, material: o.material, matrix: m.clone().multiply(im), mappings });
      }
    } else parts.push({ geometry: o.geometry, material: o.material, matrix: m, mappings });
  });
  for (const p of parts) {
    const mats = Array.isArray(p.material) ? p.material : [p.material];
    for (const mt of mats) { if (mt.map) mt.map.anisotropy = 8; }
  }
  const asset = { key, spec, parts, size: size.clone().multiplyScalar(k), variantNames, parser: gltf.parser, variantCache: {} };
  cache[key] = asset;
  return asset;
}

// Materials for one part under a named variant (falls back to the default material).
export async function variantMaterial(asset, part, variant) {
  if (!variant) return part.material;
  const vi = asset.variantNames.indexOf(variant);
  if (vi < 0) return part.material;
  const map = part.mappings.find(m => m.variants.includes(vi));
  if (!map) return part.material;
  asset.variantCache[map.material] ??= asset.parser.getDependency('material', map.material);
  return asset.variantCache[map.material];
}

// A plain Object3D copy (used by the product viewer).
export async function makeObject(asset, variant) {
  const g = new THREE.Group();
  for (const p of asset.parts) {
    const mesh = new THREE.Mesh(p.geometry, await variantMaterial(asset, p, variant));
    mesh.matrixAutoUpdate = false; mesh.matrix.copy(p.matrix);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

// One InstancedMesh per part, covering every placement of this asset+variant.
export async function makeInstances(asset, variant, placements) {
  const group = new THREE.Group();
  const tmp = new THREE.Matrix4();
  for (const p of asset.parts) {
    const im = new THREE.InstancedMesh(p.geometry, await variantMaterial(asset, p, variant), placements.length);
    placements.forEach((m, i) => im.setMatrixAt(i, tmp.multiplyMatrices(m, p.matrix)));
    im.castShadow = im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
  }
  return group;
}
