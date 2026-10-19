// Real photographed textures (wood, fabric) plus a few canvas-drawn ones that need
// text or patterns: book spines, rugs, department signs and laylight glazing.
import * as THREE from 'three';

const tl = new THREE.TextureLoader();
function load(url, srgb, repeat = 1) {
  const t = tl.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// The source planks are a warm pine; pull them toward a calm European oak.
function loadGraded(url, filter) {
  const c = document.createElement('canvas'), t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => { c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.filter = filter; x.drawImage(img, 0, 0); t.needsUpdate = true; };
  img.src = url;
  return t;
}
export function loadSurfaceTextures() {
  return {
    woodMap: loadGraded('./tex/wood_diffuse.webp', 'saturate(42%) contrast(88%) brightness(96%)'), woodBump: load('./tex/wood_bump.webp'), woodRough: load('./tex/wood_rough.webp'),
    fabricMap: load('./tex/fabric_basecolor.png', true), fabricNormal: load('./tex/fabric_normal.png'),
    view: (() => { const t = tl.load('./tex/venice_sunset_1k.jpg'); t.colorSpace = THREE.SRGBColorSpace; return t; })()
  };
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// 4x4 atlas of spine designs. R = cloth/leather luminance, G = gold-foil mask.
export function spineAtlas() {
  const S = 128, [c, x] = canvas(S * 4, S * 4);
  for (let cell = 0; cell < 16; cell++) {
    const ox = (cell % 4) * S, oy = Math.floor(cell / 4) * S;
    x.fillStyle = 'rgb(230,0,0)'; x.fillRect(ox, oy, S, S);
    // grain
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${150 + rnd() * 105},0,0,.25)`; x.fillRect(ox + rnd() * S, oy + rnd() * S, 1 + rnd() * 2, 1 + rnd() * 6); }
    if (cell === 15) continue; // plain cloth for covers
    const style = cell % 5;
    const gold = (y0, h) => { x.fillStyle = 'rgb(140,255,0)'; x.fillRect(ox + 6, oy + y0, S - 12, h); };
    if (style === 0) { gold(10, 3); gold(16, 1.5); gold(S - 18, 1.5); gold(S - 13, 3); }
    if (style === 1) { // raised leather bands
      for (const y of [18, 44, 70, 96]) { x.fillStyle = 'rgb(120,0,0)'; x.fillRect(ox, oy + y, S, 6); x.fillStyle = 'rgb(255,0,0)'; x.fillRect(ox, oy + y - 2, S, 2); }
    }
    if (style === 2) { x.fillStyle = 'rgb(40,0,0)'; x.fillRect(ox + 10, oy + 26, S - 20, 34); x.strokeStyle = 'rgb(140,255,0)'; x.lineWidth = 2; x.strokeRect(ox + 12, oy + 28, S - 24, 30); }
    if (style === 3) { x.fillStyle = 'rgb(255,0,0)'; x.fillRect(ox, oy + S * 0.62, S, S * 0.38); gold(S * 0.62, 2); }
    // title strokes (illegible at distance, like real spines)
    x.fillStyle = 'rgb(140,255,0)';
    const lines = 1 + (cell % 3);
    for (let l = 0; l < lines; l++) {
      const w = 20 + rnd() * (S - 50), y = (style === 2 ? 34 : 40) + l * 9;
      for (let k = 0; k < w; k += 5 + rnd() * 3) x.fillRect(ox + (S - w) / 2 + k, oy + y, 3 + rnd() * 2, 4);
    }
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  return t;
}

// Woven rug with a border, tinted per colourway.
export function rugTexture(base, border, motif) {
  const [c, x] = canvas(512, 512);
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '0,0,0'},${rnd() * 0.05})`; x.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
  x.globalAlpha = 0.8; x.strokeStyle = border; x.lineWidth = 16; x.strokeRect(20, 20, 472, 472);
  x.globalAlpha = 0.35; x.strokeStyle = motif; x.lineWidth = 2; x.strokeRect(36, 36, 440, 440);
  x.fillStyle = motif; x.globalAlpha = 0.12;
  for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
    const cx = 64 + i * 35, cy = 64 + j * 35;
    x.save(); x.translate(cx, cy); x.rotate(Math.PI / 4); x.fillRect(-4, -4, 8, 8); x.restore();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Gilded department name on a painted ink-green panel.
export function signTexture(text) {
  const [c, x] = canvas(1024, 160);
  const g = x.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#22322b'); g.addColorStop(1, '#17231e');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 160);
  x.strokeStyle = '#b8955a'; x.lineWidth = 3; x.strokeRect(14, 14, 996, 132);
  x.font = '500 64px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.letterSpacing = '10px';
  const gold = x.createLinearGradient(0, 40, 0, 120); gold.addColorStop(0, '#f1d9a0'); gold.addColorStop(0.5, '#c79c55'); gold.addColorStop(1, '#8f6a33');
  x.fillStyle = gold; x.fillText(text.toUpperCase(), 512, 84);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Frosted laylight glass with slim steel glazing bars.
export function laylightTexture() {
  const [c, x] = canvas(256, 256);
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 190); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e9ecef');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#3b3f44'; x.fillRect(0, 0, 256, 6); x.fillRect(0, 0, 6, 256); x.fillRect(0, 125, 256, 3); x.fillRect(125, 0, 3, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Soft contact shadow.
export function contactShadow() {
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// An abstract painting: soft colour fields with visible brushwork.
export function artTexture(palette, w = 512, h = 360) {
  const [c, x] = canvas(w, h);
  x.fillStyle = palette[0]; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    x.globalAlpha = 0.35 + rnd() * 0.4; x.fillStyle = palette[1 + (i % (palette.length - 1))];
    const cx = rnd() * w, cy = rnd() * h, r = 60 + rnd() * 160;
    x.beginPath(); x.ellipse(cx, cy, r, r * (0.4 + rnd() * 0.5), rnd() * 3, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  for (let i = 0; i < 2600; i++) { // brush texture
    x.strokeStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.06})`; x.lineWidth = 1 + rnd() * 3;
    const px = rnd() * w, py = rnd() * h, a = rnd() * 0.6 - 0.3; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 20, py + Math.sin(a) * 20); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
