// Turns a crawled allmarcindia.com page into the new site's markup.
// Modern pages (amk-* components) keep their semantic structure but move to the
// x-* design system; legacy pages (old bootstrap templates) are flattened into
// clean sections so no heading, paragraph, list, table, image or video is lost.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { ORIGIN } from './site.mjs';

export function makeCtx({ pages, remoteDir }) {
  const exists = new Map();
  const has = (p) => {
    if (!exists.has(p)) exists.set(p, fs.existsSync(path.join(remoteDir, decodeURIComponent(p))));
    return exists.get(p);
  };
  const asset = (u) => {
    if (!u) return u;
    u = u.trim();
    if (u.startsWith(ORIGIN)) u = u.slice(ORIGIN.length);
    if (!u.startsWith('/') || u.startsWith('//')) return u;
    const clean = u.split(/[?#]/)[0];
    if (/\.(mp4|webm|mov)$/i.test(clean)) return has(clean) ? clean : ORIGIN + clean;
    return has(clean) ? clean : ORIGIN + clean;
  };
  const link = (h) => {
    if (h == null) return { href: h };
    h = h.trim();
    if (h.startsWith(ORIGIN)) h = h.slice(ORIGIN.length) || '/';
    if (!h.startsWith('/') || h.startsWith('//')) return { href: h, ext: /^https?:/.test(h) };
    const m = h.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    let p = (m[1] || '/').replace(/\/+$/, '') || '/';
    const rest = (m[2] || '') + (m[3] || '');
    if (/\.(pdf|jpe?g|png|webp|mp4|glb|zip)$/i.test(p)) return { href: asset(p) + rest, ext: !has(p) };
    if (pages.has(p)) return { href: (p === '/' ? '/' : p + '/') + rest };
    return { href: ORIGIN + p + rest, ext: true };
  };
  return { asset, link, has, pages };
}

const KEEP_STYLE = /object-position\s*:[^;]+/i;

function renameClass(c) {
  return c
    .split(/\s+/)
    .filter((k) => k && k !== 'amk' && k !== 'amk-rv' && k !== 'is-in')
    .map((k) => (k === 'amk-script' ? 'x-accent' : k.replace(/^amk-/, 'x-').replace(/^am-/, 'x-')))
    .join(' ');
}

export function fixMedia($, root, ctx) {
  root.find('img').each((i, el) => {
    const $e = $(el);
    $e.attr('src', ctx.asset($e.attr('src') || $e.attr('data-src') || ''));
    $e.removeAttr('srcset').removeAttr('sizes').removeAttr('fetchpriority');
    if (!$e.attr('loading')) $e.attr('loading', 'lazy');
    $e.attr('decoding', 'async');
    if ($e.attr('alt') == null) $e.attr('alt', '');
  });
  root.find('video').each((i, el) => {
    const $v = $(el);
    const src = $v.find('source').attr('src') || $v.attr('data-src') || $v.attr('src') || $v.attr('data-video-lg');
    const poster = $v.attr('poster');
    const label = $v.attr('aria-label');
    const fresh = $('<video muted loop playsinline preload="none"></video>');
    if (src && /\.(mp4|webm)/i.test(src)) fresh.attr('data-src', ctx.asset(src));
    if (poster && /\.(png|jpe?g|webp)$/i.test(poster.split('?')[0])) fresh.attr('poster', ctx.asset(poster));
    if (label) fresh.attr('aria-label', label);
    $v.replaceWith(fresh);
    if (!fresh.attr('data-src') && !fresh.attr('poster')) fresh.remove();
  });
}

export function fixLinks($, root, ctx) {
  root.find('a[href]').each((i, el) => {
    const $a = $(el);
    const r = ctx.link($a.attr('href'));
    $a.attr('href', r.href);
    if (r.ext) $a.attr('target', '_blank').attr('rel', 'noopener');
    $a.removeAttr('title');
  });
  root.find('[onclick]').each((i, el) => {
    const m = ($(el).attr('onclick') || '').match(/location\.href\s*=\s*'([^']+)'/);
    if (m) $(el).attr('data-href', ctx.link(m[1]).href);
    $(el).removeAttr('onclick');
  });
}

// ------------------------------------------------------------ modern pages
export function cleanModern($, main, ctx) {
  // keep embedded JSON (widget data), rewriting the paths inside it
  main.find('script[type="application/json"]').each((i, el) => {
    try {
      const fix = (v) => (typeof v === 'string' && v.startsWith('/') ? (/\.\w{2,5}$/.test(v.split(/[?#]/)[0]) ? ctx.asset(v) : ctx.link(v).href) : Array.isArray(v) ? v.map(fix) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x)])) : v);
      $(el).text(JSON.stringify(fix(JSON.parse($(el).html()))).replace(/</g, '\\u003c'));
      $(el).attr('data-keep', '1');
    } catch {
      $(el).remove();
    }
  });
  main.find('script:not([data-keep]),style,link,noscript,.amk-gal__box,.amk-hp,template').remove();
  main.find('script[data-keep]').removeAttr('data-keep');
  main.find('*').each((i, el) => {
    const $e = $(el);
    const cls = $e.attr('class');
    if (cls != null) {
      const n = renameClass(cls);
      n ? $e.attr('class', n) : $e.removeAttr('class');
    }
    const st = $e.attr('style');
    if (st != null) {
      const k = st.match(KEEP_STYLE);
      k ? $e.attr('style', k[0]) : $e.removeAttr('style');
    }
    for (const name of Object.keys(el.attribs || {})) {
      if (name === 'data-d' || name === 'data-ignore' || name === 'data-am-autoplay') $e.removeAttr(name);
      else if (name.startsWith('data-amk-')) {
        const v = $e.attr(name);
        $e.removeAttr(name).attr('data-x-' + name.slice(9), v);
      } else if (name === 'data-amk') $e.removeAttr(name);
    }
  });
  // 3D model urls
  main.find('[data-model],[data-x-model]').each((i, el) => {
    for (const k of ['data-model', 'data-x-model']) if ($(el).attr(k)) $(el).attr(k, ctx.asset($(el).attr(k)));
  });
  main.find('[data-scenes]').each((i, el) => {
    try {
      const s = JSON.parse($(el).attr('data-scenes')).map((x) => ({ ...x, src: ctx.asset(x.src) }));
      $(el).attr('data-scenes', JSON.stringify(s));
    } catch {}
  });
  main.find('[data-x-project]').each((i, el) => {
    try {
      const p = JSON.parse($(el).attr('data-x-project'));
      if (p.imgs) p.imgs = p.imgs.map(ctx.asset);
      if (p.vid) p.vid = ctx.asset(p.vid);
      $(el).attr('data-x-project', JSON.stringify(p));
    } catch {}
  });
  main.find('a[data-img]').each((i, el) => $(el).attr('data-img', ctx.asset($(el).attr('data-img'))));
  fixMedia($, main, ctx);
  fixLinks($, main, ctx);
  // the original kept an empty <i> inside links for its arrow; ours draws its own
  main.find('.x-link > i, .x-space__btn > i').each((i, el) => $(el).replaceWith('<i aria-hidden="true"></i>'));
  // h1 used as section heading on the gallery
  return main;
}

// ------------------------------------------------------------ legacy pages
const ALLOWED = new Set(['a', 'strong', 'b', 'em', 'i', 'br', 'ul', 'ol', 'li', 'p', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'sup', 'sub', 'small', 'u', 'code', 'blockquote', 'h2', 'h3', 'h4', 'h5', 'caption']);

function sanitize($, el, ctx) {
  const walk = (node) => {
    if (node.type === 'text') return node.data.replace(/\s+/g, ' ');
    if (node.type !== 'tag') return '';
    const tag = node.name.toLowerCase();
    const inner = (node.children || []).map(walk).join('');
    if (tag === 'br') return '<br>';
    if (!ALLOWED.has(tag)) return inner;
    if (tag === 'a') {
      const r = ctx.link(node.attribs.href || '#');
      return `<a href="${r.href}"${r.ext ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>`;
    }
    if (tag === 'b') return `<strong>${inner}</strong>`;
    const span = ['td', 'th'].includes(tag) ? ['colspan', 'rowspan'].filter((k) => node.attribs[k]).map((k) => ` ${k}="${node.attribs[k]}"`).join('') : '';
    return `<${tag}${span}>${inner}</${tag}>`;
  };
  return walk(el).trim();
}

const textOf = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function legacyToBlocks($, main, ctx) {
  main.find('script,style,link,noscript,form,select,input,textarea,label,[hidden],.hidden,.d-none,.modal').remove();
  const intro = main.find('.mod-page-intro').first();
  const crumbs = [];
  main.find('#breadcrumbNavigation li a, .mod-breadcrumb li a').each((i, a) => {
    const t = $(a).text().trim();
    if (t && !crumbs.find((c) => c.t === t)) crumbs.push({ t, href: ctx.link($(a).attr('href')).href });
  });
  const h1 = textOf($.html(main.find('h1').first()));
  const lead = intro.find('p.intro, p').first().text().replace(/\s+/g, ' ').trim();
  let hero = null;
  const hv = intro.find('video source').attr('src') || intro.find('video').attr('data-video-lg');
  const hp = intro.find('video').attr('poster') || intro.find('img').attr('src');
  if (hv && /\.(mp4|webm)/.test(hv)) hero = { type: 'video', src: ctx.asset(hv), poster: hp ? ctx.asset(hp) : '' };
  else if (hp) hero = { type: 'img', src: ctx.asset(hp) };
  intro.remove();
  main.find('h1').remove();
  main.find('nav, .mod-breadcrumb-container').remove();

  const groups = [];
  let cur = { heading: '', items: [] };
  const push = (it) => cur.items.push(it);
  const seenMedia = new Set();
  const seenText = new Set();
  const captured = new Set();
  const isCaptured = (el) => {
    for (let p = el.parent; p; p = p.parent) if (captured.has(p)) return true;
    return false;
  };
  main.find('*').each((i, el) => {
    if (isCaptured(el)) return;
    const tag = el.name.toLowerCase();
    const $e = $(el);
    if (tag === 'a' && $e.find('img').length && textOf($e.text()).length > 2 && $e.attr('href') && !$e.attr('href').startsWith('#')) {
      const r = ctx.link($e.attr('href'));
      const img = ctx.asset($e.find('img').first().attr('src') || '');
      const title = textOf($e.find('h2,h3,h4,h5,strong,b,.title,span').first().text() || $e.text());
      const txt = textOf($e.find('p').first().text() || '');
      captured.add(el);
      push({ type: 'card', href: r.href, ext: r.ext, img, title, text: txt !== title ? txt : '' });
      return;
    }
    if (tag === 'h2') {
      const t = textOf($e.text());
      if (!t) return;
      captured.add(el);
      if (cur.heading || cur.items.length) groups.push(cur);
      cur = { heading: t, items: [] };
      return;
    }
    if (['h3', 'h4', 'h5', 'p', 'ul', 'ol', 'table', 'blockquote'].includes(tag)) {
      const html = sanitize($, el, ctx);
      const t = textOf(html);
      captured.add(el);
      if (!t || seenText.has(t)) return;
      seenText.add(t);
      push({ type: 'html', tag, html: tag === 'p' || tag === 'blockquote' ? `<${tag}>${html.replace(/^<p>|<\/p>$/g, '')}</${tag}>` : html.startsWith('<' + tag) ? html : `<${tag}>${html}</${tag}>` });
      return;
    }
    if (tag === 'img') {
      const src = ctx.asset($e.attr('src') || $e.attr('data-src') || '');
      if (!src || seenMedia.has(src) || /icon|logo|arrow/i.test(src)) return;
      seenMedia.add(src);
      const cap = textOf($e.closest('figure').find('figcaption').text() || '');
      push({ type: 'img', src, alt: $e.attr('alt') || cap || '', cap });
      return;
    }
    if (tag === 'video') {
      const src = $e.find('source').attr('src') || $e.attr('data-video-lg') || $e.attr('src');
      if (!src || !/\.(mp4|webm)/.test(src)) return;
      const s = ctx.asset(src);
      captured.add(el);
      if (seenMedia.has(s)) return;
      seenMedia.add(s);
      const cap = textOf($e.closest('figure').find('figcaption').text() || '');
      push({ type: 'video', src: s, poster: $e.attr('poster') ? ctx.asset($e.attr('poster')) : '', cap });
      return;
    }
    if (tag === 'iframe') {
      const src = $e.attr('src') || '';
      if (/youtube|vimeo|google\.com\/maps/.test(src)) push({ type: 'iframe', src });
      captured.add(el);
      return;
    }
    // Loose text: timeline captions in spans, FAQ questions in buttons, step labels in divs.
    if (['div', 'span', 'strong', 'b', 'button', 'h6', 'dt', 'dd', 'summary', 'em', 'i', 'figcaption', 'section', 'article'].includes(tag)) {
      if ($e.closest('figure').length && tag !== 'figcaption') return;
      const own = (el.children || []).filter((c) => c.type === 'text').map((c) => c.data).join(' ').replace(/\s+/g, ' ').trim();
      if (own.length < 3) return;
      const blocky = $e.find('p,ul,ol,table,h2,h3,h4,h5,div,img,video').length > 0;
      const html = blocky ? own : sanitize($, el, ctx);
      const t = textOf(html);
      if (!blocky) captured.add(el);
      if (!t || seenText.has(t)) return;
      seenText.add(t);
      const isQ = tag === 'button' || tag === 'h6' || tag === 'dt' || tag === 'summary' || /\?$/.test(t) || /^(step \d|[a-z]\.)\s/i.test(t);
      push({ type: 'html', tag: 'p', html: isQ ? `<h4>${html}</h4>` : `<p>${html}</p>` });
    }
  });
  if (cur.heading || cur.items.length) groups.push(cur);
  return { crumbs, h1, lead, hero, groups };
}

const escAttr = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function mediaHtml(m) {
  if (m.type === 'img') return `<figure class="x-lg__fig"><img src="${m.src}" alt="${escAttr(m.alt)}" loading="lazy" decoding="async">${m.cap ? `<figcaption>${m.cap}</figcaption>` : ''}</figure>`;
  if (m.type === 'video') return `<figure class="x-lg__fig x-lg__fig--vid"><video muted loop playsinline preload="none" data-src="${m.src}"${m.poster ? ` poster="${m.poster}"` : ''}></video>${m.cap ? `<figcaption>${m.cap}</figcaption>` : ''}</figure>`;
  if (m.type === 'iframe') return `<figure class="x-lg__fig x-lg__fig--frame"><iframe src="${m.src}" loading="lazy" allowfullscreen title="Embedded media"></iframe></figure>`;
  return '';
}

function cardHtml(c) {
  return `<a class="x-card" href="${c.href}"${c.ext ? ' target="_blank" rel="noopener"' : ''}><span class="x-card__media">${c.img ? `<img src="${c.img}" alt="" loading="lazy">` : ''}</span>${c.text ? `<span class="x-card__meta">${c.text}</span>` : ''}<span class="x-card__title">${c.title}</span></a>`;
}

export function renderLegacy(d, { article = false, label = '' } = {}) {
  const crumbs = d.crumbs.length ? `<ol class="x-crumbs" aria-label="Breadcrumb">${d.crumbs.map((c, i) => (i === d.crumbs.length - 1 ? `<li><span aria-current="page">${c.t}</span></li>` : `<li><a href="${c.href}">${c.t}</a></li>`)).join('')}</ol>` : '';
  const heroMedia = d.hero ? (d.hero.type === 'video' ? `<video muted loop playsinline preload="none" data-src="${d.hero.src}"${d.hero.poster ? ` poster="${d.hero.poster}"` : ''}></video>` : `<img src="${d.hero.src}" alt="" decoding="async">`) : '';
  const words = d.h1.split(' ');
  const h1 = words.length > 2 ? `${words.slice(0, -1).join(' ')} <em class="x-accent">${words.at(-1)}</em>` : d.h1;
  let out = `
<section class="x-cover ${heroMedia ? 'x-cover--photo' : 'x-cover--plain'} x-cover--legacy">
  ${heroMedia ? `<div class="x-cover__media">${heroMedia}</div>` : '<div class="x-cover__mesh" aria-hidden="true"></div>'}
  <div class="x-cover__body">
    ${crumbs}
    <span class="x-label">${label || (d.crumbs.length > 1 ? d.crumbs[d.crumbs.length - 2].t : 'Allmarc')}</span>
    <h1 class="x-h1">${h1}</h1>
    ${d.lead ? `<p class="x-lead">${d.lead}</p>` : ''}
  </div>
</section>`;
  if (article) {
    out += `<div class="x-sec x-article"><div class="x-in x-article__in"><div class="x-prose">`;
    d.groups.forEach((g) => {
      if (g.heading) out += `<h2>${g.heading}</h2>`;
      g.items.forEach((it) => (out += it.type === 'html' ? it.html : it.type === 'card' ? cardHtml(it) : mediaHtml(it)));
    });
    out += `</div></div></div>`;
    return out;
  }
  d.groups.forEach((g, gi) => {
    const text = g.items.filter((i) => i.type === 'html');
    const media = g.items.filter((i) => ['img', 'video', 'iframe'].includes(i.type));
    const cards = g.items.filter((i) => i.type === 'card');
    const head = g.heading ? `<span class="x-label">${String(gi + 1).padStart(2, '0')}</span><h2 class="x-h2">${g.heading}</h2>` : '';
    out += `<div class="x-sec x-lg ${gi % 2 ? 'x-lg--flip' : ''} ${media.length ? '' : 'x-lg--text'}"><div class="x-in">`;
    out += `<div class="x-lg__txt">${head}<div class="x-prose">${text.map((t) => t.html).join('')}</div></div>`;
    if (media.length) out += `<div class="x-lg__media ${media.length > 2 ? 'x-lg__media--many' : ''}">${media.map(mediaHtml).join('')}</div>`;
    out += `</div>`;
    if (cards.length) out += `<div class="x-in x-in--block"><div class="x-cards__grid">${cards.map(cardHtml).join('')}</div></div>`;
    out += `</div>`;
  });
  return out;
}

export function loadPage(file) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim();
  const description = $('meta[name="description"]').attr('content') || '';
  const main = $('main').last();
  return { $, main, title, description };
}

export function isLegacy($, main) {
  const first = main.children().first();
  return first.is('.row') || first.find('.mod-page-intro').length > 0;
}
