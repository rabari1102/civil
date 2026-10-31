// Prints the first built instance of each given class, for styling reference.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
const want = process.argv.slice(2);
const found = {};
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'assets') walk(p); } else if (f === 'index.html') files.push(p); } })('dist');
for (const p of files) {
  const h = fs.readFileSync(p, 'utf8');
  const todo = want.filter((w) => !found[w] && h.includes(w));
  if (!todo.length) continue;
  const $ = cheerio.load(h);
  for (const w of todo) { const e = $('.' + w).first(); if (e.length) found[w] = [p.split(path.sep).join('/'), $.html(e).replace(/\s+/g, ' ')]; }
}
for (const w of want) console.log(`\n=== ${w} ${found[w] ? found[w][0] + '\n' + found[w][1].slice(0, +process.env.N || 900) : 'NOT FOUND'}`);
