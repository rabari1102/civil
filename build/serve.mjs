// Static server for dist/, falling back to public/remote for mirrored media.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = [path.join(ROOT, 'dist'), path.join(ROOT, 'public', 'remote')];
const PORT = Number(process.env.PORT) || 5180;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.ico': 'image/x-icon',
};

const COMPRESS = /\.(html|css|js|mjs|json|svg|glb|txt|xml)$/i;
const packed = new Map();

function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\.\.+/g, '');
  for (const root of ROOTS) {
    let f = path.join(root, clean);
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (fs.existsSync(f)) return f;
    if (!path.extname(clean) && fs.existsSync(path.join(root, clean, 'index.html'))) return path.join(root, clean, 'index.html');
  }
  return null;
}

http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  // folder pages without trailing slash → redirect so relative anchors behave
  if (!path.extname(u) && !u.endsWith('/') && resolve(u + '/')) {
    res.writeHead(301, { Location: u + '/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '') });
    return res.end();
  }
  const f = resolve(u);
  if (!f) {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    return res.end(fs.readFileSync(path.join(ROOTS[0], '404.html')));
  }
  const type = TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream';
  const stat = fs.statSync(f);
  const range = req.headers.range;
  if (range && type.startsWith('video')) {
    const [s, e] = range.replace('bytes=', '').split('-');
    const start = +s, end = e ? +e : stat.size - 1;
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': type });
    return fs.createReadStream(f, { start, end }).pipe(res);
  }
  // caching: versioned CSS/JS (?v=build) and fonts never change → a year; media → a day;
  // everything else revalidates with an ETag so repeat visits get a cheap 304
  const etag = `"${stat.size.toString(36)}-${stat.mtimeMs.toString(36)}"`;
  const cache = /[?&]v=/.test(req.url) || u.startsWith('/assets/fonts/') ? 'public, max-age=31536000, immutable'
    : /\.(glb|mp4|webm|jpe?g|png|webp|avif|gif|pdf|woff2)$/i.test(f) ? 'public, max-age=86400' : 'no-cache';
  const head = { 'Content-Type': type, 'Cache-Control': cache, ETag: etag, Vary: 'Accept-Encoding', 'Accept-Ranges': type.startsWith('video') ? 'bytes' : 'none' };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, head); return res.end(); }
  // text and models compress well; brotli when the browser takes it, else gzip (kept in memory per file version)
  const enc = COMPRESS.test(f) ? (/\bbr\b/.test(req.headers['accept-encoding'] || '') ? 'br' : /\bgzip\b/.test(req.headers['accept-encoding'] || '') ? 'gzip' : null) : null;
  if (enc && stat.size > 1024 && stat.size < 8e6) {
    const key = `${f}|${etag}|${enc}`;
    let body = packed.get(key);
    if (!body) {
      const raw = fs.readFileSync(f);
      body = enc === 'br' ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }) : zlib.gzipSync(raw, { level: 9 });
      packed.set(key, body);
    }
    res.writeHead(200, { ...head, 'Content-Encoding': enc, 'Content-Length': body.length });
    return res.end(req.method === 'HEAD' ? undefined : body);
  }
  res.writeHead(200, { ...head, 'Content-Length': stat.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`Allmarc redesign → http://localhost:${PORT}`));
