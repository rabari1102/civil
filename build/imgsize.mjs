// Image pass over each built page: every local <img> gets its intrinsic width/height
// (so lazy images reserve space and only the ones near the screen download) and
// decoding="async". Where build/tools/images.mjs left a lighter copy in
// public/remote/_opt/, the tag points at it and offers the small size via srcset.
import fs from 'node:fs';
import path from 'node:path';

const cache = new Map();

// width/height from the file header: webp (VP8/VP8L/VP8X), png, gif, jpeg
export function imageSize(file) {
  if (cache.has(file)) return cache.get(file);
  let r = null;
  try {
    const fd = fs.openSync(file, 'r');
    const b = Buffer.alloc(64 * 1024);
    const n = fs.readSync(fd, b, 0, b.length, 0);
    fs.closeSync(fd);
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const k = b.toString('ascii', 12, 16);
      if (k === 'VP8 ') r = [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
      else if (k === 'VP8L') { const v = b.readUInt32LE(21); r = [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
      else if (k === 'VP8X') r = [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    } else if (b.readUInt32BE(0) === 0x89504e47) r = [b.readUInt32BE(16), b.readUInt32BE(20)];
    else if (b.toString('ascii', 0, 3) === 'GIF') r = [b.readUInt16LE(6), b.readUInt16LE(8)];
    else if (b[0] === 0xff && b[1] === 0xd8) {
      for (let i = 2; i < n - 9;) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1], len = b.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { r = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; break; }
        i += 2 + len;
      }
    }
  } catch {}
  if (r && !(r[0] > 0 && r[1] > 0)) r = null;
  cache.set(file, r);
  return r;
}

export function makeImagePass(roots, optRoot) {
  const find = (u) => {
    if (!u || !u.startsWith('/') || u.startsWith('//')) return null;
    const clean = decodeURIComponent(u.split(/[?#]/)[0]);
    for (const r of roots) { const f = path.join(r, clean); if (fs.existsSync(f)) return f; }
    return null;
  };
  // lighter copies: /_opt/<path>.webp (≤1600 px) and /_opt/<path>.w640.webp
  const opt = (u) => {
    const clean = decodeURIComponent(u.split(/[?#]/)[0]).replace(/\.[a-z0-9]+$/i, '');
    const big = path.join(optRoot, clean + '.webp'), small = path.join(optRoot, clean + '.w640.webp');
    return { big: fs.existsSync(big) ? '/_opt' + clean + '.webp' : null, small: fs.existsSync(small) ? '/_opt' + clean + '.w640.webp' : null };
  };
  const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag); return m ? m[1] : null; };
  // video posters and inline background images just take the lighter copy
  const swap = (u) => opt(u).big || u;
  const others = (html) => html
    .replace(/\b(poster|data-poster)="(\/[^"]+\.(?:jpe?g|png|webp))"/gi, (m, a, u) => `${a}="${swap(u)}"`)
    .replace(/url\((&quot;|'|"|)(\/[^)'"&]+\.(?:jpe?g|png|webp))\1\)/gi, (m, q, u) => `url(${q}${swap(u)}${q})`);
  return (html) => others(html).replace(/<img\b[^>]*>/g, (tag) => {
    let src = attr(tag, 'src');
    if (!src) return tag;
    const o = opt(src);
    let t = tag;
    if (o.big) { t = t.replace(` src="${src}"`, ` src="${o.big}"`); src = o.big; }
    if (o.small && !attr(t, 'srcset')) {
      const big = imageSize(find(src));
      // lazy images let the browser pick by their real laid-out width (sizes=auto)
      const sizes = (/\sloading="lazy"/.test(t) ? 'auto, ' : '') + '(max-width: 700px) 100vw, 50vw';
      if (big && big[0] > 700) t = t.replace(/<img\b/, `<img srcset="${o.small} 640w, ${src} ${big[0]}w" sizes="${sizes}"`);
    }
    if (!attr(t, 'width') && !attr(t, 'height')) {
      const s = imageSize(find(src));
      if (s) t = t.replace(/<img\b/, `<img width="${s[0]}" height="${s[1]}"`);
    }
    if (!attr(t, 'decoding')) t = t.replace(/<img\b/, '<img decoding="async"');
    return t;
  });
}
