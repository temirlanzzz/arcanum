// Every texture in Arcanum is painted at startup on a 2D canvas: no image downloads.
import * as THREE from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif";

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

export function woodTexture() {
  const [c, x] = canvas(512, 512);
  const r = mulberry32(11);
  x.fillStyle = '#e6d6c4';
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 220; i++) {
    const y0 = r() * 512, amp = 2 + r() * 7, f = 0.006 + r() * 0.02, ph = r() * 6;
    x.strokeStyle = r() < 0.5 ? `rgba(90,60,40,${0.08 + r() * 0.22})` : `rgba(255,240,220,${0.05 + r() * 0.12})`;
    x.lineWidth = 0.6 + r() * 2.4;
    x.beginPath();
    for (let px = 0; px <= 512; px += 8) {
      const py = y0 + Math.sin(px * f + ph) * amp + Math.sin(px * f * 3.1 + ph) * amp * 0.3;
      px ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const kx = r() * 512, ky = r() * 512, g = x.createRadialGradient(kx, ky, 0, kx, ky, 10 + r() * 14);
    g.addColorStop(0, 'rgba(80,50,30,.45)'); g.addColorStop(1, 'rgba(80,50,30,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(kx, ky, 26, 9, 0, 0, 7); x.fill();
  }
  return tex(c);
}

export function stoneFloorTexture() {
  const [c, x] = canvas(1024, 1024);
  const r = mulberry32(23);
  const n = 4, s = 1024 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const dark = (i + j) % 2 === 0;
    const base = dark ? [30, 27, 34] : [122, 102, 80];
    x.fillStyle = `rgb(${base.join(',')})`;
    x.fillRect(i * s, j * s, s, s);
    // mottling
    for (let k = 0; k < 140; k++) {
      const v = (r() - 0.5) * 30;
      x.fillStyle = `rgba(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0},.35)`;
      x.beginPath();
      x.ellipse(i * s + r() * s, j * s + r() * s, 4 + r() * 30, 3 + r() * 18, r() * 3, 0, 7);
      x.fill();
    }
    // marble veins
    for (let k = 0; k < 4; k++) {
      x.strokeStyle = dark ? `rgba(200,180,150,${0.08 + r() * 0.12})` : `rgba(80,60,40,${0.1 + r() * 0.15})`;
      x.lineWidth = 0.7 + r() * 1.6;
      x.beginPath();
      let px = i * s + r() * s, py = j * s;
      x.moveTo(px, py);
      while (py < (j + 1) * s) { px += (r() - 0.5) * 26; py += 10 + r() * 18; x.lineTo(px, py); }
      x.stroke();
    }
  }
  // grout + bevel
  x.strokeStyle = 'rgba(15,10,10,.85)'; x.lineWidth = 5;
  for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 1024); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(1024, i * s); x.stroke(); }
  // small inlaid gold diamonds at the tile corners
  x.fillStyle = '#b8903f';
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    x.save(); x.translate(i * s, j * s); x.rotate(Math.PI / 4); x.fillRect(-11, -11, 22, 22); x.restore();
  }
  return tex(c);
}

const LEATHER = ['#5a1a1a', '#6e2318', '#1f3a2c', '#25304f', '#3d2414', '#7a5524', '#1b1b22', '#4a2346', '#2e4a4a', '#8a3b1e', '#50402a', '#2c2238', '#6b1f2f', '#14324a'];

// A 2 m x 2 m tile of a bookcase wall (four shelves) for the high, distant levels.
export function bookWallTexture() {
  const [c, x] = canvas(1024, 1024);
  const r = mulberry32(5);
  const row = 256;
  x.fillStyle = '#120b07'; x.fillRect(0, 0, 1024, 1024);
  for (let ri = 0; ri < 4; ri++) {
    const top = ri * row, plank = 22, bottom = top + row - plank;
    let px = 0;
    while (px < 1024) {
      const w = 9 + r() * 22;
      if (r() < 0.04) { px += w * 1.4; continue; }
      const h = (row - plank) * (0.62 + r() * 0.33);
      const col = LEATHER[(r() * LEATHER.length) | 0];
      const g = x.createLinearGradient(px, 0, px + w, 0);
      g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.25, col); g.addColorStop(0.6, col); g.addColorStop(1, 'rgba(0,0,0,.6)');
      x.fillStyle = g;
      x.fillRect(px, bottom - h, w - 1, h);
      x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(px + w * 0.3, bottom - h, w * 0.18, h);
      // gilt bands
      x.fillStyle = `rgba(214,170,90,${0.35 + r() * 0.4})`;
      const bands = 1 + ((r() * 3) | 0);
      for (let b = 0; b < bands; b++) x.fillRect(px + 1, bottom - h + 10 + b * 7, w - 3, 2);
      x.fillRect(px + 1, bottom - 14, w - 3, 2);
      if (r() < 0.3) { x.fillRect(px + w * 0.3, bottom - h * 0.55, w * 0.4, h * 0.12); }
      px += w;
    }
    // shadow under the shelf above
    const sg = x.createLinearGradient(0, top, 0, top + 60);
    sg.addColorStop(0, 'rgba(0,0,0,.75)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sg; x.fillRect(0, top, 1024, 60);
    // plank
    const pg = x.createLinearGradient(0, bottom, 0, bottom + plank);
    pg.addColorStop(0, '#6a4325'); pg.addColorStop(0.3, '#4a2d18'); pg.addColorStop(1, '#1e120a');
    x.fillStyle = pg; x.fillRect(0, bottom, 1024, plank);
  }
  return tex(c);
}

export function spineTexture() {
  const [c, x] = canvas(64, 256);
  x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 256);
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  x.fillStyle = '#f0d9a0';
  for (const y of [18, 26, 222, 230]) x.fillRect(0, y, 64, 4);
  x.fillRect(14, 90, 36, 60);
  return tex(c, { repeat: [1, 1] });
}

export function starSkyTexture() {
  const [c, x] = canvas(2048, 1024);
  const r = mulberry32(99);
  const g = x.createLinearGradient(0, 0, 2048, 0);
  g.addColorStop(0, '#05081c'); g.addColorStop(0.5, '#141038'); g.addColorStop(1, '#05081c');
  x.fillStyle = g; x.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 26; i++) {
    const px = 500 + r() * 1048, py = r() * 1024, rad = 80 + r() * 260;
    const ng = x.createRadialGradient(px, py, 0, px, py, rad);
    const hue = r() < 0.5 ? '120,70,200' : (r() < 0.5 ? '40,140,190' : '200,90,140');
    ng.addColorStop(0, `rgba(${hue},.22)`); ng.addColorStop(1, `rgba(${hue},0)`);
    x.fillStyle = ng; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 4200; i++) {
    const px = r() * 2048, py = r() * 1024, s = r() ** 6 * 2.6 + 0.4;
    x.fillStyle = `rgba(255,${235 + r() * 20 | 0},${200 + r() * 55 | 0},${0.4 + r() * 0.6})`;
    x.beginPath(); x.arc(px, py, s, 0, 7); x.fill();
    if (s > 2) {
      const sg = x.createRadialGradient(px, py, 0, px, py, s * 6);
      sg.addColorStop(0, 'rgba(255,240,200,.5)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
      x.fillStyle = sg; x.fillRect(px - s * 6, py - s * 6, s * 12, s * 12);
    }
  }
  // gilded constellation lines
  x.strokeStyle = 'rgba(230,190,110,.35)'; x.lineWidth = 1.4;
  for (let k = 0; k < 14; k++) {
    let px = 400 + r() * 1248, py = r() * 1024;
    x.beginPath(); x.moveTo(px, py);
    for (let j = 0; j < 4; j++) {
      px += (r() - 0.5) * 160; py += (r() - 0.5) * 160; x.lineTo(px, py);
    }
    x.stroke();
  }
  return tex(c);
}

export function roseWindowTexture() {
  const [c, x] = canvas(1024, 1024);
  const r = mulberry32(3);
  const cx = 512, cy = 512;
  const glass = ['#c4152b', '#1d4fd8', '#0f8a5f', '#e8a317', '#7a2cc2', '#d4462a', '#1aa3c4'];
  x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 1024);
  const rings = [[500, 380, 24], [380, 240, 16], [240, 120, 12], [120, 0, 6]];
  for (const [ro, ri, n] of rings) {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      x.fillStyle = glass[(r() * glass.length) | 0];
      x.beginPath(); x.arc(cx, cy, ro, a0, a1); x.arc(cx, cy, ri, a1, a0, true); x.closePath(); x.fill();
      for (let k = 0; k < 3; k++) {
        x.fillStyle = `rgba(255,255,255,${r() * 0.18})`;
        const am = a0 + (a1 - a0) * r(), rm = ri + (ro - ri) * r();
        x.beginPath(); x.arc(cx + Math.cos(am) * rm, cy + Math.sin(am) * rm, 8 + r() * 20, 0, 7); x.fill();
      }
    }
  }
  x.strokeStyle = '#120c08'; x.lineWidth = 10;
  for (const [ro, ri, n] of rings) {
    x.beginPath(); x.arc(cx, cy, ro, 0, 7); x.stroke();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      x.beginPath(); x.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
      x.lineTo(cx + Math.cos(a) * ro, cy + Math.sin(a) * ro); x.stroke();
    }
  }
  const vg = x.createRadialGradient(cx, cy, 0, cx, cy, 512);
  vg.addColorStop(0, 'rgba(255,240,200,.35)'); vg.addColorStop(0.7, 'rgba(0,0,0,0)');
  x.fillStyle = vg; x.fillRect(0, 0, 1024, 1024);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function lancetTexture() {
  const [c, x] = canvas(256, 1024);
  const r = mulberry32(8);
  const glass = ['#1d4fd8', '#0f8a5f', '#e8a317', '#7a2cc2', '#1aa3c4', '#c4152b'];
  for (let j = 0; j < 16; j++) for (let i = 0; i < 4; i++) {
    x.fillStyle = glass[(r() * glass.length) | 0];
    x.fillRect(i * 64, j * 64, 64, 64);
    x.fillStyle = `rgba(255,255,255,${r() * 0.2})`; x.fillRect(i * 64 + 8, j * 64 + 8, 30, 30);
  }
  x.strokeStyle = '#120c08'; x.lineWidth = 7;
  for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 1024); x.stroke(); }
  for (let j = 0; j <= 16; j++) { x.beginPath(); x.moveTo(0, j * 64); x.lineTo(256, j * 64); x.stroke(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function runeCircleTexture() {
  const [c, x] = canvas(1024, 1024);
  const r = mulberry32(42);
  x.translate(512, 512);
  x.strokeStyle = '#fff'; x.fillStyle = '#fff';
  x.shadowColor = '#fff'; x.shadowBlur = 12;
  for (const [rad, w] of [[490, 6], [470, 2], [360, 3], [340, 1.5], [200, 3], [120, 2]]) {
    x.lineWidth = w; x.beginPath(); x.arc(0, 0, rad, 0, 7); x.stroke();
  }
  // glyph band
  const glyph = (size) => {
    x.beginPath();
    const n = 2 + ((r() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const a = r() * 6.28, b = r() * 6.28;
      x.moveTo(Math.cos(a) * size, Math.sin(a) * size);
      if (r() < 0.5) x.lineTo(Math.cos(b) * size, Math.sin(b) * size);
      else x.arc(0, 0, size * (0.3 + r() * 0.6), a, b);
    }
    x.stroke();
  };
  x.lineWidth = 4;
  for (let i = 0; i < 28; i++) {
    x.save(); x.rotate((i / 28) * Math.PI * 2); x.translate(0, -415); glyph(30); x.restore();
  }
  x.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    x.save(); x.rotate((i / 12) * Math.PI * 2); x.translate(0, -270); glyph(34); x.restore();
  }
  // hexagram
  x.lineWidth = 3;
  for (let k = 0; k < 2; k++) {
    x.beginPath();
    for (let i = 0; i <= 3; i++) { const a = (i / 3) * Math.PI * 2 + k * Math.PI / 3 - Math.PI / 2; i ? x.lineTo(Math.cos(a) * 340, Math.sin(a) * 340) : x.moveTo(Math.cos(a) * 340, Math.sin(a) * 340); }
    x.stroke();
  }
  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function signTexture(text, color) {
  const [c, x] = canvas(1024, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#1b120c'); g.addColorStop(1, '#0c0806');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 256);
  x.strokeStyle = '#c9a25a'; x.lineWidth = 8; x.strokeRect(14, 14, 996, 228);
  x.lineWidth = 2; x.strokeRect(30, 30, 964, 196);
  x.fillStyle = '#e8c982';
  x.font = `bold 108px ${SERIF}`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = 30;
  const spaced = text.toUpperCase().split('').join(String.fromCharCode(8202));
  x.fillText(spaced, 512, 132);
  x.shadowBlur = 0;
  x.fillStyle = color;
  for (const px of [90, 934]) { x.save(); x.translate(px, 128); x.rotate(Math.PI / 4); x.fillRect(-16, -16, 32, 32); x.restore(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function bannerTexture(color, glyph) {
  const [c, x] = canvas(256, 768);
  x.fillStyle = color; x.fillRect(0, 0, 256, 768);
  const g = x.createLinearGradient(0, 0, 256, 0);
  for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, i % 2 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.06)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 768);
  x.strokeStyle = '#d9b46a'; x.lineWidth = 8;
  x.strokeRect(16, 16, 224, 660);
  x.fillStyle = '#d9b46a';
  x.beginPath(); x.moveTo(0, 690); x.lineTo(128, 768); x.lineTo(256, 690); x.lineTo(256, 768); x.lineTo(0, 768); x.closePath();
  x.globalCompositeOperation = 'destination-out'; x.fill(); x.globalCompositeOperation = 'source-over';
  x.font = `140px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(glyph, 128, 300);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function glowTexture() {
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.6)'); g.addColorStop(0.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The price tag atlas: one red tag per listing, 16 columns x 40 rows on a 4096 px canvas.
export const TAG_COLS = 16, TAG_ROWS = 52;
export function tagAtlas(prices) {
  const W = 4096, H = 4096, cw = W / TAG_COLS, ch = H / TAG_ROWS;
  const [c, x] = canvas(W, H);
  prices.forEach((price, i) => {
    const col = i % TAG_COLS, row = (i / TAG_COLS) | 0;
    if (row >= TAG_ROWS) return;
    x.save();
    x.translate(col * cw, row * ch);
    const m = 5, w = cw - m * 2, h = ch - m * 2, cut = 16;
    x.beginPath();
    x.moveTo(m + cut, m); x.lineTo(m + w - cut, m); x.lineTo(m + w, m + cut); x.lineTo(m + w, m + h - 8);
    x.quadraticCurveTo(m + w, m + h, m + w - 8, m + h); x.lineTo(m + 8, m + h); x.quadraticCurveTo(m, m + h, m, m + h - 8);
    x.lineTo(m, m + cut); x.closePath();
    const g = x.createLinearGradient(0, m, 0, m + h);
    g.addColorStop(0, '#ef2b35'); g.addColorStop(1, '#a50f18');
    x.fillStyle = g; x.fill();
    x.strokeStyle = 'rgba(255,230,200,.75)'; x.lineWidth = 2; x.setLineDash([5, 4]);
    x.beginPath(); x.rect(m + 8, m + 20, w - 16, h - 26); x.stroke(); x.setLineDash([]);
    // grommet + hole
    x.fillStyle = '#d8d2c6'; x.beginPath(); x.arc(cw / 2, m + 10, 7, 0, 7); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(cw / 2, m + 10, 4, 0, 7); x.fill();
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#fff';
    x.font = `bold 40px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const [d, cents] = price.toFixed(2).split('.');
    const big = `$${Number(d).toLocaleString('en-US')}`;
    const bw = x.measureText(big).width;
    x.font = `bold 20px ${SERIF}`; const sw = x.measureText(cents).width;
    const left = cw / 2 - (bw + sw + 2) / 2;
    x.font = `bold 40px ${SERIF}`; x.textAlign = 'left'; x.fillText(big, left, m + h - 9);
    x.font = `bold 20px ${SERIF}`; x.fillText(cents, left + bw + 2, m + h - 27);
    x.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  return t;
}

// Ashlar stone blocks for pillars and end walls (one tile = 2 m x 2 m).
export function ashlarTexture() {
  const [c, x] = canvas(512, 512);
  const r = mulberry32(77);
  x.fillStyle = '#2a2420'; x.fillRect(0, 0, 512, 512);
  const rows = 4, rh = 512 / rows;
  for (let j = 0; j < rows; j++) {
    let px = j % 2 ? -64 : 0;
    while (px < 512) {
      const w = 110 + r() * 80, v = 88 + r() * 30;
      x.fillStyle = `rgb(${v + 14 | 0},${v + 4 | 0},${v - 8 | 0})`;
      x.fillRect(px + 3, j * rh + 3, w - 6, rh - 6);
      for (let k = 0; k < 40; k++) {
        const dv = (r() - 0.5) * 26;
        x.fillStyle = `rgba(${v + dv | 0},${v + dv - 6 | 0},${v + dv - 14 | 0},.5)`;
        x.fillRect(px + 3 + r() * (w - 10), j * rh + 3 + r() * (rh - 10), 2 + r() * 10, 2 + r() * 6);
      }
      const g = x.createLinearGradient(0, j * rh, 0, (j + 1) * rh);
      g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
      x.fillStyle = g; x.fillRect(px + 3, j * rh + 3, w - 6, rh - 6);
      px += w;
    }
  }
  return tex(c);
}
