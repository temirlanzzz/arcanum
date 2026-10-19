// Smoke test of the interactive build: loads, flies, opens a product, adds it to the satchel.
// Usage: npm run build && node scripts/smoke.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/home/user/temirlanzzz.github.io/node_modules/playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = spawn('npx', ['vite', 'preview', '--port', '4176', '--strictPort'], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const ok = (cond, msg) => { if (!cond) { errors.push(msg); console.log('FAIL', msg); } else console.log('ok  ', msg); };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:4176/');
  await page.waitForSelector('#loader.done', { timeout: 240000, state: 'attached' });
  // software GL renders a few frames per second, so finish glides instantly
  const skipGlide = () => page.evaluate(() => { const g = window.__arcanum.flyer.glide; if (g) g.dur = 0.001; });
  await page.waitForFunction(() => window.__arcanum, null, { timeout: 120000 });
  await skipGlide();
  await page.waitForFunction(() => !window.__arcanum.flyer.glide, null, { timeout: 120000 });
  const z0 = await page.evaluate(() => window.__arcanum.camera.position.z);
  await page.locator('#gl').focus();
  await page.keyboard.down('KeyW');
  await page.waitForFunction(z => window.__arcanum.camera.position.z < z - 0.05, z0, { timeout: 120000 }).catch(() => {});
  await page.keyboard.up('KeyW');
  const z1 = await page.evaluate(() => window.__arcanum.camera.position.z);
  ok(z1 < z0 - 0.02, `W flies forward (z ${z0.toFixed(2)} -> ${z1.toFixed(2)})`);
  await page.locator('#depts button', { hasText: 'Furniture' }).click();
  await skipGlide();
  await page.waitForFunction(() => !window.__arcanum.flyer.glide, null, { timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('#crumb').textContent === 'Furniture', null, { timeout: 60000 }).catch(() => {});
  ok((await page.locator('#crumb').textContent()) === 'Furniture', 'department tab glides into Furniture');
  // click the product nearest the centre of the view
  const pt = await page.evaluate(() => {
    const { camera, shop } = window.__arcanum;
    let best = null, bd = 1e9;
    for (const p of shop.placements) {
      const c = p.box.getCenter(camera.position.clone()).project(camera);
      if (c.z > 1 || Math.abs(c.x) > 0.6 || Math.abs(c.y) > 0.6) continue;
      const d = Math.hypot(c.x, c.y);
      if (d < bd) { bd = d; best = { x: (c.x + 1) / 2 * innerWidth, y: (1 - c.y) / 2 * innerHeight, name: p.sku.name }; }
    }
    return best;
  });
  ok(!!pt, `a product is in view (${pt?.name})`);
  await page.mouse.move(pt.x, pt.y); await page.waitForTimeout(600);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForFunction(() => document.body.classList.contains('pdp'), null, { timeout: 120000 });
  ok(true, `product page opens (${await page.locator('#p-name').textContent()})`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(root, 'out', 'smoke-pdp.png') });
  await page.locator('#p-add').click();
  await page.waitForFunction(() => document.querySelector('#bag-count').textContent === '1', null, { timeout: 60000 }).catch(() => {});
  ok((await page.locator('#bag-count').textContent()) === '1', 'bag count is 1 after adding');
  await page.waitForFunction(() => document.body.classList.contains('bag-open'), null, { timeout: 20000 }).catch(() => {});
  ok(await page.evaluate(() => document.body.classList.contains('bag-open') && document.querySelectorAll('#bag-list li:not(.empty)').length === 1), 'bag drawer lists the item');
  await page.screenshot({ path: join(root, 'out', 'smoke-bag.png') });
  await page.locator('#bag-close').click();
  await page.locator('#p-back').click();
  await page.waitForFunction(() => window.__arcanum.mode === 'store', null, { timeout: 60000 }).catch(() => {});
  ok(await page.evaluate(() => window.__arcanum.mode === 'store'), 'back to the store floor');
  await page.locator('#search').fill('watch');
  await page.waitForTimeout(300);
  ok((await page.locator('#results li').count()) > 0, 'search suggests products');
  await page.close();
  // mobile layout renders without horizontal scroll
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  m.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
  await m.goto('http://127.0.0.1:4176/', { timeout: 120000 });
  await m.waitForSelector('#loader.done', { timeout: 240000, state: 'attached' });
  await m.waitForTimeout(3500);
  ok(await m.locator('#touch').isVisible(), 'mobile: touch walk buttons shown');
  ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile: no horizontal scroll');
  await m.screenshot({ path: join(root, 'out', 'smoke-mobile.png') });
} finally {
  await browser.close();
  server.kill();
}
const bad = errors.filter(e => !e.startsWith('FAIL'));
if (errors.length) { console.log('\nERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('\nSMOKE PASS');
