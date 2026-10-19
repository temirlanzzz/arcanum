// Storefront chrome: top bar with search and bag, department tabs, hover card,
// product detail page, bag drawer and toasts.
import { DEPTS } from './catalog.js';
import { money } from './shop.js';

const $ = s => document.querySelector(s);
export const bag = [];
const stars = r => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));
const deliveryDate = () => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };

export function setLoading(p, text) {
  $('#load-bar').style.transform = `scaleX(${Math.max(0.02, Math.min(1, p))})`;
  if (text) $('#load-text').textContent = text;
}
export function hideLoader() { $('#loader').classList.add('done'); }

export function initDepartments(onGo) {
  const nav = $('#depts');
  nav.innerHTML = DEPTS.map((d, i) => `<button data-i="${i}">${d.name}</button>`).join('');
  nav.addEventListener('click', e => { const b = e.target.closest('button'); if (b) onGo(+b.dataset.i); });
}
export function markDepartment(i) {
  document.querySelectorAll('#depts button').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
  $('#crumb').textContent = i >= 0 ? DEPTS[i].name : 'All departments';
}

export function initSearch(listings, onPick) {
  const input = $('#search'), list = $('#results');
  const all = Object.values(listings);
  const render = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { list.classList.remove('on'); return; }
    const hits = all.filter(l => (l.sku.name + ' ' + l.sku.dept).toLowerCase().includes(q)).slice(0, 6);
    const depts = DEPTS.filter(d => d.name.toLowerCase().includes(q)).slice(0, 2);
    list.innerHTML = depts.map(d => `<li data-d="${DEPTS.indexOf(d)}"><span class="k">Department</span>${d.name}</li>`).join('')
      + hits.map(l => `<li data-s="${l.id}"><span class="k">${money(l.sku.price)}</span>${l.sku.name}</li>`).join('')
      + (hits.length + depts.length ? '' : '<li class="none">No products found</li>');
    list.classList.add('on');
  };
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('blur', () => setTimeout(() => list.classList.remove('on'), 150));
  list.addEventListener('mousedown', e => {
    const li = e.target.closest('li'); if (!li) return;
    input.value = ''; list.classList.remove('on'); input.blur();
    if (li.dataset.s) onPick({ sku: li.dataset.s });
    if (li.dataset.d) onPick({ dept: +li.dataset.d });
  });
}

export function showTip(h, x, y) {
  const t = $('#tip');
  const name = h.kind === 'book' ? h.book.name : h.listing.sku.name;
  const sub = h.kind === 'book' ? `${h.book.author} · ${h.book.format}` : `${stars(h.listing.sku.rating)} ${h.listing.sku.reviews.toLocaleString('en-US')}`;
  const price = h.kind === 'book' ? h.book.price : h.listing.sku.price;
  t.innerHTML = `<b>${name}</b><span class="sub">${sub}</span><span class="pr">${money(price)}</span>`;
  t.style.transform = `translate(${Math.min(x + 16, innerWidth - 260)}px, ${Math.min(y + 18, innerHeight - 90)}px)`;
  t.classList.add('on');
}
export function hideTip() { $('#tip').classList.remove('on'); }

// ---- product page
let current = null, handlers = {};
export function bindProduct(h) { handlers = h; }
export function openProduct(item) {
  current = { ...item, vi: item.vi || 0, qty: 1 };
  const s = item.book || item.sku;
  const dept = DEPTS.find(d => d.id === s.dept);
  $('#p-crumb').textContent = `${dept.name}${item.book ? ' · ' + item.book.format : ''}`;
  $('#p-name').textContent = s.name;
  $('#p-by').textContent = item.book ? `by ${item.book.author}` : 'Arcanum Home';
  $('#p-rating').innerHTML = `<span class="st">${stars(s.rating)}</span> ${s.rating.toFixed(1)} · <u>${s.reviews.toLocaleString('en-US')} reviews</u>`;
  $('#p-price').textContent = money(s.price);
  $('#p-desc').textContent = s.desc;
  const v = item.sku?.variants;
  $('#p-variants').innerHTML = v ? `<div class="lbl">Colour: <b id="p-vname">${v[current.vi][0]}</b></div><div class="sw">${v.map((x, i) => `<button class="${i === current.vi ? 'on' : ''}" style="--c:${x[2]}" data-i="${i}" aria-label="${x[0]}"></button>`).join('')}</div>` : '';
  $('#p-qty').textContent = '1';
  $('#p-ship').innerHTML = `<div><b>Free delivery ${deliveryDate()}</b> on orders over $50</div><div>In stock · ships from the Arcanum warehouse</div><div>Free 30-day returns</div>`;
  document.body.classList.add('pdp');
}
export function closeProduct() { document.body.classList.remove('pdp'); current = null; }
export const productOpen = () => !!current;

export function initStatic() {
  $('#p-variants').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !current) return;
    current.vi = +b.dataset.i;
    document.querySelectorAll('#p-variants .sw button').forEach(x => x.classList.toggle('on', x === b));
    $('#p-vname').textContent = current.sku.variants[current.vi][0];
    handlers.onVariant?.(current.vi);
  });
  $('#p-minus').onclick = () => { if (current && current.qty > 1) $('#p-qty').textContent = --current.qty; };
  $('#p-plus').onclick = () => { if (current && current.qty < 9) $('#p-qty').textContent = ++current.qty; };
  $('#p-add').onclick = () => addCurrent();
  $('#p-close').onclick = () => handlers.onClose?.();
  $('#bag-btn').onclick = () => document.body.classList.toggle('bag-open');
  $('#bag-close').onclick = () => document.body.classList.remove('bag-open');
  $('#checkout').onclick = () => toast('This is a demo store — nothing is charged.');
  $('#scrim').onclick = () => document.body.classList.remove('bag-open');
  $('#bag-list').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    bag.splice(+b.dataset.rm, 1); renderBag();
  });
}
export function addCurrent() {
  if (!current) return null;
  const s = current.book || current.sku;
  const v = current.sku?.variants?.[current.vi];
  const swatch = v ? v[2] : current.book ? `hsl(${(current.book.book * 47) % 360},32%,24%)` : '#c9c4bb';
  const line = bag.find(l => l.name === s.name && l.variant === (v?.[0] || ''));
  if (line) line.qty += current.qty; else bag.push({ name: s.name, variant: v?.[0] || (current.book ? current.book.format : ''), price: s.price, qty: current.qty, swatch });
  renderBag(true);
  toast(`Added to bag — <b>${s.name}</b>`);
  return s;
}
export function renderBag(bump) {
  const n = bag.reduce((a, l) => a + l.qty, 0), sub = bag.reduce((a, l) => a + l.qty * l.price, 0);
  $('#bag-count').textContent = n; $('#bag-count').classList.toggle('zero', !n);
  if (bump) { const b = $('#bag-btn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  $('#bag-list').innerHTML = bag.length ? bag.map((l, i) => `<li><i style="background:${l.swatch}"></i><div><b>${l.name}</b><span>${l.variant ? l.variant + ' · ' : ''}Qty ${l.qty}</span><button data-rm="${i}">Remove</button></div><em>${money(l.price * l.qty)}</em></li>`).join('') : '<li class="empty">Your bag is empty.</li>';
  $('#bag-sub').textContent = money(sub);
  const ship = sub >= 50 || !sub ? 0 : 6.95;
  $('#bag-ship').textContent = ship ? money(ship) : 'Free';
  $('#bag-tot').textContent = money(sub + ship);
}
let toastTimer;
export function toast(html) {
  const t = $('#toast'); t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}
