// Find internal href/src references in dist that resolve to nothing (dist or public/remote).
// node build/tools/links.mjs
import fs from 'node:fs';
import path from 'node:path';

const roots = ['dist', 'public/remote'];
const pages = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) pages.push(p); } })('dist');
const exists = (u) => {
  const clean = decodeURIComponent(u.split(/[?#]/)[0]);
  return roots.some((r) => { const f = path.join(r, clean); return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html'))); });
};
const bad = new Map();
for (const p of pages) {
  const h = fs.readFileSync(p, 'utf8');
  for (const [, u] of h.matchAll(/(?:href|src|poster|data-src|data-model|data-x-model)="(\/[^"/][^"]*|\/)"/g)) {
    if (u.startsWith('//') || exists(u)) continue;
    if (!bad.has(u)) bad.set(u, []);
    bad.get(u).push(path.dirname(p).replace(/\\/g, '/'));
  }
}
for (const [u, ps] of bad) console.log(u, '←', ps.length, ps[0]);
console.log(`pages ${pages.length}, missing targets ${bad.size}`);
