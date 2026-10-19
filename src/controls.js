// First-person flight: WASD/arrows + mouse-look (drag, or pointer lock with F),
// Space/E up, Shift/Q down, touch drag + on-screen buttons, and eased glides to a wing.
import * as THREE from 'three';
import { NAVE_HALF, BAY_BACK, BAYS, BAY_HALF, OPEN_HALF, OPEN_TOP, CEIL, Z_FRONT, Z_END } from './layout.js';

const PI = Math.PI;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Flyer {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.yaw = 0; this.pitch = -0.05;
    this.vel = new THREE.Vector3();
    this.keys = new Set();
    this.hold = new Set();     // on-screen buttons
    this.enabled = true;
    this.glide = null;
    this.dragging = false;
    this.moved = 0;
    this.locked = false;
    this.onClick = () => {};
    this.onLock = () => {};
    camera.rotation.order = 'YXZ';

    addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input,textarea')) return;
      this.keys.add(e.code);
      if (e.code === 'KeyF' && this.enabled) this.toggleLock();
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    let lx = 0, ly = 0, pid = null;
    dom.addEventListener('pointerdown', e => {
      if (this.locked) return;
      pid = e.pointerId; this.dragging = true; this.moved = 0; lx = e.clientX; ly = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', e => {
      if (this.locked) { if (this.enabled) this.look(e.movementX, e.movementY, 0.0022); return; }
      if (!this.dragging || e.pointerId !== pid) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.enabled && this.moved > 4) this.look(dx, dy, e.pointerType === 'touch' ? 0.005 : 0.0034);
    });
    const end = e => {
      if (!this.dragging || e.pointerId !== pid) return;
      this.dragging = false;
      if (this.moved <= 6) this.onClick(e.clientX, e.clientY);
    };
    dom.addEventListener('pointerup', end);
    dom.addEventListener('pointercancel', () => { this.dragging = false; });
    dom.addEventListener('click', e => { if (this.locked) this.onClick(innerWidth / 2, innerHeight / 2); });
    dom.addEventListener('wheel', e => {
      if (!this.enabled) return;
      e.preventDefault();
      const f = this.forward();
      this.vel.addScaledVector(f, -e.deltaY * 0.02);
    }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === dom; this.onLock(this.locked); });
  }
  toggleLock() {
    if (this.locked) document.exitPointerLock();
    else this.dom.requestPointerLock?.();
  }
  look(dx, dy, k) {
    if (this.glide) return;
    this.yaw -= dx * k;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * k, -1.45, 1.45);
  }
  forward() { return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)); }
  set(pos, yaw, pitch) { this.camera.position.copy(pos); this.yaw = yaw; this.pitch = pitch; this.vel.set(0, 0, 0); this.apply(); }
  glideTo(pos, yaw, pitch, dur = 2.4) {
    let dyaw = ((yaw - this.yaw + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
    this.glide = { t: 0, dur, p0: this.camera.position.clone(), p1: pos.clone(), y0: this.yaw, y1: this.yaw + dyaw, pi0: this.pitch, pi1: pitch,
      // arc upward mid-flight so long glides sweep over the nave
      lift: Math.min(1.2, this.camera.position.distanceTo(pos) * 0.04) };
    this.vel.set(0, 0, 0);
  }
  apply() {
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
  update(dt) {
    const cam = this.camera;
    if (this.glide) {
      const g = this.glide;
      g.t = Math.min(1, g.t + dt / g.dur);
      const k = ease(g.t);
      cam.position.lerpVectors(g.p0, g.p1, k);
      cam.position.y += Math.sin(k * PI) * g.lift;
      this.yaw = g.y0 + (g.y1 - g.y0) * k;
      this.pitch = g.pi0 + (g.pi1 - g.pi0) * k;
      this.apply();
      if (g.t >= 1) this.glide = null;
      return;
    }
    if (!this.enabled) { this.vel.multiplyScalar(Math.exp(-8 * dt)); this.apply(); return; }
    const k = this.keys, h = this.hold;
    const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const want = new THREE.Vector3();
    if (k.has('KeyW') || k.has('ArrowUp') || h.has('fwd')) want.add(this.forward());
    if (k.has('KeyS') || k.has('ArrowDown') || h.has('back')) want.sub(this.forward());
    if (k.has('KeyD') || k.has('ArrowRight')) want.add(r);
    if (k.has('KeyA') || k.has('ArrowLeft')) want.sub(r);
    if (k.has('Space') || k.has('KeyE') || h.has('up')) want.y += 1;
    if (k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyQ') || h.has('down')) want.y -= 1;
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(k.has('ControlLeft') ? 7 : 3.2);
    // critically damped approach to the wanted velocity
    this.vel.lerp(want, 1 - Math.exp(-6 * dt));
    const prev = cam.position.clone();
    cam.position.addScaledVector(this.vel, dt);
    this.constrain(prev);
    this.apply();
  }
  constrain(prev) {
    const p = this.camera.position;
    p.y = THREE.MathUtils.clamp(p.y, 0.6, CEIL - 0.5);
    p.z = THREE.MathUtils.clamp(p.z, Z_END + 0.9, Z_FRONT - 0.7);
    const lim = NAVE_HALF - 0.7;
    const inBay = Math.abs(prev.x) > lim;
    if (Math.abs(p.x) > lim) {
      const s = Math.sign(p.x);
      const bay = BAYS.find(b => b.s === s && Math.abs((inBay ? prev.z : p.z) - b.zc) < (inBay ? BAY_HALF : OPEN_HALF - 0.4));
      if (!bay || (!inBay && p.y > OPEN_TOP - 0.3)) p.x = s * lim;
      else {
        p.x = s * Math.min(Math.abs(p.x), BAY_BACK - 0.6);
        p.z = THREE.MathUtils.clamp(p.z, bay.zc - BAY_HALF + 0.6, bay.zc + BAY_HALF - 0.6);
        // leaving through the opening: stay under the lintel and inside the doorway
        if (Math.abs(p.x) < NAVE_HALF + 0.4) {
          p.y = Math.min(p.y, OPEN_TOP - 0.3);
          p.z = THREE.MathUtils.clamp(p.z, bay.zc - OPEN_HALF + 0.4, bay.zc + OPEN_HALF - 0.4);
        }
      }
    }
  }
}
