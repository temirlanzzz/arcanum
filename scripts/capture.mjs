// Deterministic capture: renders the scripted fly-through frame by frame in headless
// Chromium (SwiftShader), then encodes out/arcanum-demo.mp4 and out/preview.webp with ffmpeg.
// Usage: npm run build && node scripts/capture.mjs [--still] [--seconds 10] [--fps 30]
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/home/user/temirlanzzz.github.io/node_modules/playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'out'), frames = join(out, 'frames');
const arg = (name, def) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; };
const STILL_ONLY = process.argv.includes('--still');
const SECONDS = +arg('--seconds', 10), FPS = +arg('--fps', 30);
const POSE = arg('--pose', null);   // "x,y,z,yaw,pitch,t" for a custom still

const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });
try {
  mkdirSync(out, { recursive: true });
  const shoot = async (w, h) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', e => console.error('pageerror', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
    await page.goto('http://127.0.0.1:4174/?capture' + (process.env.QS || ''), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready && window.__step, null, { timeout: 180000 });
    await page.evaluate(() => window.__ready);
    return page;
  };

  // hero still at 1600 x 1000
  {
    const page = await shoot(1600, 1000);
    if (POSE && POSE.includes(';')) {
      // debugging aid: several poses -> out/pose-N.png
      let i = 0;
      for (const ps of POSE.split(';')) {
        await page.evaluate(p => window.__pose(...p), ps.split(',').map(Number));
        await page.screenshot({ path: join(out, `pose-${i++}.png`) });
      }
      await page.close();
      await browser.close(); server.kill();
      process.exit(0);
    } else if (POSE) {
      const p = POSE.split(',').map(Number);
      await page.evaluate(p => window.__pose(...p), p);
    } else {
      // hero still: the Furniture wing seen from under its arch
      await page.evaluate(() => window.__pose(-8, 3.0, -24, 1.07, -0.2, 3));
    }
    await page.screenshot({ path: join(out, 'preview.png'), timeout: 180000 });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(out, 'preview.png'), '-quality', '86', join(out, 'preview.webp')]);
    console.log('preview.webp', statSync(join(out, 'preview.webp')).size, 'bytes', await page.evaluate(() => JSON.stringify(window.__stats)));
    await page.close();
  }
  if (!STILL_ONLY) {
    rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
    const page = await shoot(1280, 800);
    const n = Math.round(SECONDS * FPS), t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const ts = Date.now();
      await page.evaluate(dt => window.__step(dt), 1 / FPS);
      if (i < 3) console.log('step ms', Date.now() - ts);
      await page.screenshot({ path: join(frames, String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 92, timeout: 180000 });
      if (i % 30 === 0) console.log(`frame ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, '%04d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-vf', 'scale=1280:800', join(out, 'arcanum-demo.mp4')]);
    console.log('arcanum-demo.mp4', statSync(join(out, 'arcanum-demo.mp4')).size, 'bytes');
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
