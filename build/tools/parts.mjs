// Check that every data-parts name on product stages exists as a label in the GLB extras.
// node build/tools/parts.mjs
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist', remote = 'public/remote';
const norm = (s) => s.toLowerCase().replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function glbLabels(file) {
  const b = fs.readFileSync(file);
  const len = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
  return new Set((json.nodes || []).map((n) => n.extras?.label).filter(Boolean).map(norm));
}
const pages = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name === 'index.html') pages.push(p); } })(dist);
let bad = 0, checked = 0;
for (const p of pages) {
  const h = fs.readFileSync(p, 'utf8');
  const m = h.match(/class="x-stage[^"]*"[^>]*data-model="([^"]+)"/) || h.match(/data-model="([^"]+)"[^>]*class="x-stage/);
  if (!m) continue;
  const url = m[1];
  const file = path.join(remote, url.replace(/^https?:\/\/[^/]+/, ''));
  if (!fs.existsSync(file)) { console.log('missing glb', p, url); bad++; continue; }
  const labels = glbLabels(file);
  const want = new Set([...h.matchAll(/data-parts="([^"]*)"/g)].flatMap((x) => x[1].replace(/&amp;/g, "&").split(/;|,(?! )/)).map(norm).filter(Boolean));
  const miss = [...want].filter((w) => !labels.has(w));
  checked++;
  if (miss.length) { bad++; console.log(path.dirname(p).replace(/\\/g, '/'), '→', miss.join(' | '), ' have:', [...labels].slice(0, 8).join(' | ')); }
}
console.log(`stages checked ${checked}, with problems ${bad}`);
