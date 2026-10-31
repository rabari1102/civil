// Copy the videos the pages still stream from the original site into public/remote,
// at the same paths, so the build serves them locally (transform.mjs prefers local files).
//   node build/tools/mirror-media.mjs        (reads the remote .mp4 links from dist/)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const ORIGIN = 'https://allmarcindia.com';
const urls = new Set();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (e.name.endsWith('.html')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/https:\/\/allmarcindia\.com(\/[^"'\s)]+\.(?:mp4|webm))/g)) urls.add(m[1]);
});
walk(path.join(ROOT, 'dist'));
const list = [...urls];
let done = 0, bytes = 0, fail = 0;
const one = async (u) => {
  const dest = path.join(ROOT, 'public/remote', decodeURIComponent(u));
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { done++; return; }
  try {
    const r = await fetch(ORIGIN + u);
    if (!r.ok) throw new Error(r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest + '.part', buf); fs.renameSync(dest + '.part', dest);
    bytes += buf.length; done++;
  } catch (e) { fail++; console.log('FAIL', u, e.message); }
};
for (let i = 0; i < list.length; i += 6) await Promise.all(list.slice(i, i + 6).map(one));
console.log(`videos ${done}/${list.length} local, ${(bytes / 1048576).toFixed(0)} MB fetched, ${fail} failed`);
