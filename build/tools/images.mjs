// Lighter copies of the heavy images the pages use: for every referenced local image
// over 150 KB, writes public/remote/_opt/<path>.webp (at most 1600 px wide) and, for
// wide ones, <path>.w640.webp for phones. The build swaps them in (build/imgsize.mjs).
// Originals stay untouched. Needs the dev server (node build/serve.mjs) and Chrome.
//   node build/tools/images.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const REMOTE = path.join(ROOT, 'public/remote'), OPT = path.join(REMOTE, '_opt');
const BASE = process.env.BASE || 'http://127.0.0.1:5180';
const MIN = 150e3, MAXW = 1600, SMALL = 640, PORT = 9339;

const urls = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (e.name.endsWith('.html')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/(?:src|poster|data-poster|href)="(\/[^"?#]+\.(?:jpe?g|png|webp|gif))"|url\((?:&quot;|'|")?(\/[^)'"&]+\.(?:jpe?g|png|webp))/gi)) urls.add(m[1] || m[2]);
});
walk(path.join(ROOT, 'dist'));
const jobs = [...urls].filter((u) => !u.startsWith('/_opt/')).map((u) => ({ u, f: path.join(REMOTE, decodeURIComponent(u)) }))
  .filter(({ f }) => fs.existsSync(f) && fs.statSync(f).size > MIN)
  .map((j) => ({ ...j, out: path.join(OPT, decodeURIComponent(j.u).replace(/\.[a-z0-9]+$/i, '')) }))
  .filter((j) => process.argv.includes('--force') || !fs.existsSync(j.out + '.webp'));
console.log(`${jobs.length} images to optimise`);

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'imgopt-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver; for (let i = 0; i < 150 && !ver; i++) { await sleep(200); try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch {} }
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description?.split('\n')[0] || 'eval failed'); return r.result?.result?.value; };
await send('Page.navigate', { url: BASE + '/404.html' });
await sleep(1500);
await ev(`window.__opt = async (url, maxw, small) => {
  const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode();
  const enc = (w) => { const h = Math.round(img.naturalHeight * w / img.naturalWidth); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h); return c.toDataURL('image/webp', 0.8); };
  const w = Math.min(maxw, img.naturalWidth);
  return { w: img.naturalWidth, big: enc(w), small: img.naturalWidth > 900 ? enc(small) : null };
}; true`);

let before = 0, after = 0, n = 0;
for (const j of jobs) {
  try {
    const r = await ev(`__opt(${JSON.stringify(j.u)}, ${MAXW}, ${SMALL})`);
    const big = Buffer.from(r.big.split(',')[1], 'base64');
    const orig = fs.statSync(j.f).size;
    fs.mkdirSync(path.dirname(j.out), { recursive: true });
    // keep the lighter copy only when it really is lighter
    if (big.length < orig * 0.9) { fs.writeFileSync(j.out + '.webp', big); after += big.length; before += orig; n++; }
    if (r.small) fs.writeFileSync(j.out + '.w640.webp', Buffer.from(r.small.split(',')[1], 'base64'));
  } catch (e) { console.log('FAIL', j.u, e.message); }
}
console.log(`optimised ${n}: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB`);
ws.close(); chrome.kill(); process.exit(0);
