// Compares the visible text of each crawled page with the built page and
// reports any sentence from the original that did not make it across.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
const urls = fs.readFileSync('content/data/sitemap-urls.txt', 'utf8').split(/\r?\n/).filter(Boolean);
const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
let worst = [], total = 0, miss = 0;
for (const u of urls) {
  const r = u.replace('https://allmarcindia.com', '').replace(/\/+$/, '') || '/';
  const src = 'content/pages/' + (r === '/' ? 'home' : r.slice(1).replace(/\//g, '__')) + '.html';
  const out = r === '/' ? 'dist/index.html' : 'dist' + r + '/index.html';
  if (!fs.existsSync(out)) { console.log('NO OUTPUT', r); continue; }
  const $ = cheerio.load(fs.readFileSync(src, 'utf8'));
  const m = $('main').last(); m.find('script,style,noscript,form,button,select,label,svg,.amk-gal__box,template').remove();
  const chunks = [];
  m.find('h1,h2,h3,h4,h5,p,li,td,th,dt,dd,figcaption,blockquote,summary,b,small,span').each((i, e) => {
    if ($(e).children('p,li,div,ul,h2,h3').length) return;
    const t = norm($(e).text()); if (t.length > 12) chunks.push(t);
  });
  const o = cheerio.load(fs.readFileSync(out, 'utf8'));
  const body = norm(o('main').text());
  const lost = [...new Set(chunks)].filter((c) => !body.includes(c));
  total += chunks.length; miss += lost.length;
  if (lost.length) worst.push([r, lost.length, new Set(chunks).size, lost.slice(0, 3)]);
}
worst.sort((a, b) => b[1] - a[1]);
console.log(`chunks ${total}, missing ${miss} (${(100 - miss / total * 100).toFixed(2)}% kept)`);
for (const w of worst.slice(0, +(process.argv[2] || 15))) console.log(w[0], `${w[1]}/${w[2]}`, JSON.stringify(w[3]).slice(0, 300));
