// HUD, quests, XP and the satchel. Pure DOM; the 3D side calls in through these functions.
const $ = s => document.querySelector(s);
const money = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export { money };

const TITLES = ['Apprentice Shopper', 'Curious Browser', 'Seasoned Collector', 'Grand Hoarder', 'Archmage of Deals', 'Keeper of the Emporium'];

export const state = { xp: 0, level: 1, satchel: [], visited: new Set(), inspected: new Set(), quests: [] };

export function setLoading(p, msg) {
  $('#lbar').style.width = Math.round(p * 100) + '%';
  if (msg) $('#lmsg').textContent = msg;
}
export function hideLoader() { $('#loader').classList.add('done'); }

export function toast(html, xp) {
  const t = document.createElement('div');
  t.className = 'toast panel';
  t.innerHTML = html + (xp ? `<em>+${xp} XP</em>` : '');
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

export function gainXP(n, x, y) {
  state.xp += n;
  if (x !== undefined) {
    const f = document.createElement('div');
    f.className = 'xpfly'; f.textContent = `+${n} XP`;
    f.style.left = x + 'px'; f.style.top = y + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 1500);
  }
  const lvl = 1 + Math.floor(state.xp / 100);
  if (lvl > state.level) {
    state.level = lvl;
    $('#lvltext').textContent = `Level ${lvl}`;
    $('#lvlsub').textContent = TITLES[Math.min(lvl - 1, TITLES.length - 1)];
    const el = $('#levelup'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  }
  renderXP();
}
function renderXP() {
  $('#lv').textContent = `Level ${state.level} · ${state.xp} XP`;
  $('#ltitle').textContent = TITLES[Math.min(state.level - 1, TITLES.length - 1)];
  $('#xp i').style.width = (state.xp % 100) + '%';
}

export function initQuests(defs) {
  state.quests = defs.map(d => ({ ...d, done: false }));
  renderQuests();
  renderXP();
}
function renderQuests() {
  $('#qlist').innerHTML = state.quests.map(q => `<li class="${q.done ? 'done' : ''}"><i></i><span>${q.text}${q.progress ? ` <small style="color:var(--mute)">${q.progress()}</small>` : ''}</span><span class="x">${q.xp} XP</span></li>`).join('');
}
export function checkQuests(ctx) {
  for (const q of state.quests) {
    if (!q.done && q.test(ctx)) {
      q.done = true;
      toast(`<b>Quest complete</b> — ${q.text}`, q.xp);
      gainXP(q.xp);
    }
  }
  renderQuests();
}

export function initNav(bays, onGo) {
  const nav = $('#nav');
  nav.innerHTML = `<button data-b="-1"><i>&#10022;</i>Grand Hall</button>` + bays.map(b => `<button data-b="${b.b}" style="--c:${b.cat.color}"><i>${b.cat.glyph}</i>${b.cat.name}</button>`).join('');
  nav.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn) onGo(+btn.dataset.b);
  });
}
export function markNav(here, visited) {
  document.querySelectorAll('#nav button').forEach(b => {
    const id = +b.dataset.b;
    b.classList.toggle('here', id === here);
    b.classList.toggle('seen', visited.has(id));
  });
}

let tipShown = null;
export function showTip(l, x, y) {
  const tip = $('#tip');
  if (tipShown !== l) {
    tip.querySelector('b').textContent = l.name;
    tip.querySelector('span').textContent = money(l.price);
    tipShown = l;
  }
  tip.style.left = Math.min(x, innerWidth - 280) + 'px';
  tip.style.top = y + 'px';
  tip.classList.add('on');
}
export function hideTip() { $('#tip').classList.remove('on'); tipShown = null; }

export function openCard(l) {
  const c = $('#card');
  c.style.setProperty('--c', l.cat.color);
  $('#cchip').innerHTML = `${l.cat.glyph} ${l.cat.name} wing`;
  $('#cname').textContent = l.name;
  $('#cbrand').textContent = `by ${l.brand}`;
  const full = Math.floor(l.rating), half = l.rating - full >= 0.5;
  $('#cstars').innerHTML = '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(5 - full - (half ? 1 : 0)) + `<small>${l.rating.toFixed(1)} · ${l.reviews.toLocaleString('en-US')} reviews</small>`;
  $('#cprice').textContent = money(l.price);
  $('#cset').textContent = l.setLabel ? `Part of the “${l.setLabel}” set — pieces sized to stand together` : '';
  $('#cdesc').textContent = l.desc;
  c.classList.add('on');
  document.body.classList.add('inspecting');
}
export function closeCard() {
  $('#card').classList.remove('on');
  document.body.classList.remove('inspecting');
}

export function renderSatchel(bump) {
  const total = state.satchel.reduce((a, l) => a + l.price, 0);
  $('#count').textContent = state.satchel.length;
  $('#total').textContent = money(total);
  $('#bagtotal').textContent = money(total);
  $('#baglist').innerHTML = state.satchel.length ? state.satchel.map(l => `<li><span>${l.name}</span><b>${money(l.price)}</b></li>`).join('') : '<li class="empty">Empty — every tagged item can go in here.</li>';
  if (bump) { const s = $('#satchel'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
}

// Gold sparks that arc from a screen point into the satchel.
export function sparks(x, y, n = 18) {
  const r = $('#satchel .ico').getBoundingClientRect();
  const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, spread = 40 + Math.random() * 90;
    const mx = x + Math.cos(a) * spread, my = y + Math.sin(a) * spread - 60;
    const dur = 650 + Math.random() * 450, delay = Math.random() * 160;
    s.animate([
      { transform: `translate(${x}px, ${y}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${mx}px, ${my}px) scale(1.4)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${tx}px, ${ty}px) scale(.4)`, opacity: 0.2 }
    ], { duration: dur, delay, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
    s.style.left = '0'; s.style.top = '0';
    setTimeout(() => s.remove(), dur + delay + 50);
  }
}

export function bindStatic({ onAdd, onClose }) {
  $('#add').addEventListener('click', onAdd);
  $('#close').addEventListener('click', onClose);
  $('#satchel').addEventListener('click', () => $('#bag').classList.toggle('open'));
  $('#crest').addEventListener('click', () => $('#crest').classList.toggle('open'));
  renderSatchel(false);
}
