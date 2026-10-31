// Builds the redesigned Allmarc site into dist/.
//   content/pages/*.html  crawled pages (one per sitemap URL, English)
//   public/remote/        images and 3D models mirrored from the original site
//   src/                  new design system: css, js, three.js scenes
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page } from './layout.mjs';
import { makeImagePass } from './imgsize.mjs';
import { makeCtx, loadPage, cleanModern, isLegacy, legacyToBlocks, renderLegacy, fixMedia, fixLinks } from './transform.mjs';
import { CONTACT, ORIGIN } from './site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const DIST = P('dist');
const REMOTE = P('public', 'remote');

const urls = fs.readFileSync(P('content/data/sitemap-urls.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
const routes = urls.map((u) => u.replace(ORIGIN, '').replace(/\/+$/, '') || '/');
const pages = new Set(routes);
const imagePass = makeImagePass([P('dist'), REMOTE, P('src/static')], path.join(REMOTE, '_opt'));
const ctx = makeCtx({ pages, remoteDir: REMOTE });
const fileFor = (r) => P('content/pages', (r === '/' ? 'home' : r.slice(1).replace(/\//g, '__')) + '.html');

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const search = [];
const stats = { modern: 0, legacy: 0, special: 0 };
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function bodyClassFor(r) {
  const seg = r.split('/')[1] || 'home';
  return `p-${seg}`;
}

// ------------------------------------------------------------------ home
function buildHome(d) {
  const { $, main } = d;
  const slides = [];
  main.find('.mod-stage-with-pagination__list-item').each((i, li) => {
    const $li = $(li);
    const v = $li.find('video');
    const src = v.find('source').attr('src') || v.attr('data-video-lg');
    const heads = $li.find('h3');
    const em = $(heads[0]).find('em');
    em.attr('class', 'x-accent');
    const on = ($li.find('[onclick]').attr('onclick') || '').match(/'([^']+)'/);
    slides.push({
      tag: $li.find('h2').first().text().trim(),
      title: $(heads[0]).html().trim(),
      sub: $(heads[1]).text().replace(/\s+/g, ' ').trim(),
      video: src ? ctx.asset(src) : '',
      poster: v.attr('poster') ? ctx.asset(v.attr('poster')) : '',
      href: on ? ctx.link(on[1]).href : '/projects/',
    });
  });
  main.find('#slider').remove();
  cleanModern($, main, ctx);
  // full-bleed live film stage like the original home page: one video per slide,
  // the headline and line beneath change with it, tabs along the bottom
  const n2 = (i) => String(i + 1).padStart(2, '0');
  const hero = `
<section class="x-hero" data-hero>
  <div class="x-hero__media" aria-hidden="true">
    ${slides.map((s, i) => `<video class="x-hero__vid${i === 0 ? ' is-on' : ''}" muted loop playsinline${i === 0 ? ' autoplay' : ''} preload="${i === 0 ? 'auto' : 'none'}" ${i === 0 ? 'src' : 'data-hero-src'}="${s.video}" ${i === 0 ? 'poster' : 'data-poster'}="${s.poster}"></video>`).join('')}
  </div>
  <div class="x-hero__veil" aria-hidden="true"></div>
  <div class="x-hero__in">
    <span class="x-hero__kicker"><i></i>Kanbha, Ahmedabad · 4 plants · since 2010</span>
    <div class="x-hero__slides">
      ${slides.map((s, i) => `
      <div class="x-hero__slide${i === 0 ? ' is-on' : ''}" data-i="${i}"${i ? ' aria-hidden="true"' : ''}>
        <span class="x-hero__tag">${n2(i)} / ${String(slides.length).padStart(2, '0')} · ${esc(s.tag)}</span>
        <${i === 0 ? 'h1' : 'h2'} class="x-hero__title">${s.title}</${i === 0 ? 'h1' : 'h2'}>
        <a class="x-hero__sub" href="${s.href}"${i ? ' tabindex="-1"' : ''}>${esc(s.sub)}<i aria-hidden="true"></i></a>
      </div>`).join('')}
    </div>
    <div class="x-hero__cta">
      <a class="x-btn x-btn--lg" href="/contact/">Send us a drawing<i></i></a>
      <a class="x-btn x-btn--glass x-btn--lg" href="/oil-and-gas/#plant-3d">Explore the plant in 3D</a>
      <button class="x-hero__pause" type="button" aria-pressed="false" aria-label="Pause the film"><i></i></button>
    </div>
  </div>
  <ol class="x-hero__nav">${slides.map((s, i) => `<li><button type="button" data-i="${i}"${i === 0 ? ' aria-current="true"' : ''}><i></i><small>${n2(i)}</small>${esc(s.tag)}</button></li>`).join('')}</ol>
</section>`;
  return hero + main.html();
}

// ------------------------------------------------------------------ contact
function buildContact(d) {
  const lead = 'Fill in the details to reach out to the Allmarc team for all your project needs. Our experts are ready to assist, and will respond within 24 hours to keep your plans moving forward efficiently.';
  return `
<section class="x-cover x-cover--plain x-cover--contact">
  <div class="x-cover__mesh" aria-hidden="true"></div>
  <div class="x-cover__body">
    <ol class="x-crumbs"><li><a href="/">Home</a></li><li><span aria-current="page">Contact</span></li></ol>
    <span class="x-label">Contact us</span>
    <h1 class="x-h1">Got questions? We are <em class="x-accent">all ears!</em></h1>
    <p class="x-lead">Connect with the Allmarc Team today!</p>
  </div>
</section>
<div class="x-sec x-contact">
  <div class="x-in">
    <form class="x-form" data-x-contact novalidate>
      <span class="x-label">Connect with your trusted manufacturing partner</span>
      <h2 class="x-h3">Send the scope. An engineer will tell you how we would build it.</h2>
      <p class="x-muted">${lead}</p>
      <div class="x-form__row">
        <label class="x-field"><span>Full name</span><input name="name" required autocomplete="name"></label>
        <label class="x-field"><span>Company name</span><input name="company" autocomplete="organization"></label>
      </div>
      <div class="x-form__row">
        <label class="x-field"><span>Phone</span><input name="phone" type="tel" required autocomplete="tel"></label>
        <label class="x-field"><span>Email ID</span><input name="email" type="email" required autocomplete="email"></label>
      </div>
      <label class="x-field"><span>Your message</span><textarea name="message" rows="5" required placeholder="What do you need fabricated? Quantities, standards, timeline…"></textarea></label>
      <div class="x-form__foot"><button class="x-btn x-btn--lg" type="submit">Send details<i></i></button><p class="x-form__note" role="status"></p></div>
    </form>
    <aside class="x-contact__info">
      <span class="x-label">Stay connected with Allmarc</span>
      <p class="x-muted">For quick support and seamless communication, reach out to us via phone, email, or visit our office. Our team is dedicated to providing prompt assistance and guiding you through every step of your project journey.</p>
      <div class="x-contact__card"><small>Telephone</small>${CONTACT.phones.map((p) => `<a href="tel:${p.replace(/\s/g, '')}">${p}</a>`).join('')}</div>
      <div class="x-contact__card"><small>Email</small>${CONTACT.emails.map((e) => `<a href="mailto:${e}">${e}</a>`).join('')}</div>
      <div class="x-contact__card"><small>Manufacturing facility</small><p>${CONTACT.factory}</p><a class="x-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Allmarc Industries Kanbha Ahmedabad')}">Open in Google Maps<i></i></a></div>
      <div class="x-contact__card"><small>Sales office</small><p>${CONTACT.office}</p></div>
      <div class="x-contact__card"><small>Website</small><a href="${ORIGIN}" target="_blank" rel="noopener">www.allmarcindia.com</a></div>
    </aside>
  </div>
</div>`;
}

// ------------------------------------------------------------------ brochure
function buildBrochure() {
  const items = [
    ['Detailed brochure', '172 pages: the whole company, every product line', '/download-brochure/Allmarc_Main_Brochure.pdf'],
    ['Building formwork', 'Slab, wall and column formwork systems', '/download-brochure/Building_Formwork_Allmarc.pdf'],
    ['Infrastructure formwork', 'Moulds and formwork for bridges, metro and tunnels', '/download-brochure/Infrastructure_Formwork_Allmarc.pdf'],
    ['Scaffolding & shoring', 'Cuplock, ring lock, AllShore and AllStage', '/Shoring_Scaffolding_Allmarc.pdf'],
    ['Decking solutions', 'Grip-Strut anti-slip decking and walkways', '/download-brochure/GripStrut_Decking_Allmarc.pdf'],
    ['Allmarc PMS', 'Project management system brochure', '/download-brochure/Allmarc_PMS_Brochure.pdf'],
  ];
  return `
<section class="x-cover x-cover--plain">
  <div class="x-cover__mesh" aria-hidden="true"></div>
  <div class="x-cover__body">
    <ol class="x-crumbs"><li><a href="/">Home</a></li><li><span aria-current="page">Download brochure</span></li></ol>
    <span class="x-label">Brochure download</span>
    <h1 class="x-h1">Download the Allmarc <em class="x-accent">catalogue.</em></h1>
    <p class="x-lead">Our product and capability brochures as PDFs. Pick one below.</p>
  </div>
</section>
<div class="x-sec"><div class="x-in x-in--block"><div class="x-docs">
  ${items.map(([t, s, u], i) => `<a class="x-doc" href="${ORIGIN}${u}" target="_blank" rel="noopener"><small>PDF · ${String(i + 1).padStart(2, '0')}</small><b>${t}</b><span>${s}</span><i aria-hidden="true">↓</i></a>`).join('')}
</div></div></div>
<div class="x-sec x-cta"><div class="x-in"><div><span class="x-label">Talk to us</span><h2 class="x-h2">Prefer a <em class="x-accent">call?</em></h2><p>Our team will walk you through the range.</p></div><a class="x-link x-link--light" href="tel:+919998656402">Call Allmarc<i></i></a></div></div>`;
}

// ------------------------------------------------------------------ pages
for (const r of routes) {
  const f = fileFor(r);
  if (!fs.existsSync(f)) {
    console.warn('missing source', r);
    continue;
  }
  const d = loadPage(f);
  let body;
  if (r === '/') {
    body = buildHome(d);
    stats.special++;
  } else if (r === '/contact') {
    body = buildContact(d);
    stats.special++;
  } else if (r === '/download-brochure') {
    body = buildBrochure();
    stats.special++;
  } else if (isLegacy(d.$, d.main)) {
    const blocks = legacyToBlocks(d.$, d.main, ctx);
    body = renderLegacy(blocks, { article: r.startsWith('/blog/') });
    stats.legacy++;
  } else {
    cleanModern(d.$, d.main, ctx);
    body = d.main.html();
    stats.modern++;
  }
  const title = (d.title || 'Allmarc Industries').replace(/\s+/g, ' ');
  const out = r === '/' ? P('dist', 'index.html') : P('dist', r.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, imagePass(page({ title, description: d.description, body, path: r === '/' ? '/' : r + '/', bodyClass: bodyClassFor(r) })));
  const h1 = (d.main.find('h1').first().text() || title.split('|')[0]).replace(/\s+/g, ' ').trim();
  search.push({ t: h1 || title, p: r === '/' ? '/' : r + '/', d: (d.description || '').slice(0, 160), s: (r.split('/')[1] || 'home').replace(/-/g, ' ') });
}

// 404
fs.writeFileSync(P('dist', '404.html'), page({
  title: 'Page not found | Allmarc Industries', path: '/404', bodyClass: 'p-404',
  body: `<section class="x-cover x-cover--plain x-cover--404"><div class="x-cover__mesh" aria-hidden="true"></div><div class="x-cover__body"><span class="x-label">Error 404</span><h1 class="x-h1">This beam is <em class="x-accent">not in the drawing.</em></h1><p class="x-lead">The page you asked for does not exist. Try the search, or start from the home page.</p><div class="x-hero__cta"><a class="x-btn" href="/">Back to home<i></i></a><button class="x-btn x-btn--ghost" data-search-open type="button">Search the site</button></div></div></section>`,
}));

// ------------------------------------------------------------------ assets
const copy = (from, to) => fs.cpSync(from, to, { recursive: true });
fs.mkdirSync(P('dist/assets/vendor/three/jsm'), { recursive: true });
// stylesheet parts are numbered; concatenate them in order into one file, lightly
// minified (comments and spacing; strings and url() are left alone)
fs.mkdirSync(P('dist/assets/css'), { recursive: true });
const KEEP = /("[^"]*"|'[^']*'|url\([^)]*\))/;
const minCSS = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').split(KEEP)
  .map((part, i) => (i % 2 ? part : part.replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}')))
  .join('').trim();
fs.writeFileSync(P('dist/assets/css/style.css'), minCSS(fs.readdirSync(P('src/css')).filter((f) => f.endsWith('.css')).sort().map((f) => fs.readFileSync(P('src/css', f), 'utf8')).join('\n')));
copy(P('src/fonts'), P('dist/assets/fonts'));
copy(P('src/js'), P('dist/assets/js'));
copy(P('src/static'), P('dist/assets'));
const NM = P('node_modules');
copy(path.join(NM, 'three/build/three.module.min.js'), P('dist/assets/vendor/three/three.module.min.js'));
for (const dir of ['loaders', 'controls', 'utils', 'libs', 'environments', 'postprocessing', 'shaders', 'math', 'geometries', 'lines', 'renderers'])
  copy(path.join(NM, 'three/examples/jsm', dir), P('dist/assets/vendor/three/jsm', dir));
for (const f of ['ammo.wasm.js', 'ammo.wasm.wasm', 'rhino3dm', 'basis', 'draco', 'mmdparser.module.js', 'opentype.module.js', 'chevrotain.module.min.js', 'lottie_canvas.module.js', 'surfaceNet.js', 'utif.module.js', 'tween.module.js', 'lil-gui.module.min.js', 'ecsy.module.js', 'motion-controllers.module.js', 'zstddec.module.js', 'ktx-parse.module.js', 'mikktspace.module.js'])
  fs.rmSync(P('dist/assets/vendor/three/jsm/libs', f), { recursive: true, force: true });
copy(path.join(NM, 'gsap/dist/gsap.min.js'), P('dist/assets/vendor/gsap.min.js'));
copy(path.join(NM, 'gsap/dist/ScrollTrigger.min.js'), P('dist/assets/vendor/ScrollTrigger.min.js'));
copy(path.join(NM, 'lenis/dist/lenis.min.js'), P('dist/assets/vendor/lenis.min.js'));
copy(path.join(NM, 'lenis/dist/lenis.css'), P('dist/assets/vendor/lenis.css'));
copy(P('content/data/plant-info.json'), P('dist/assets/data/plant-info.json'));
fs.writeFileSync(P('dist/assets/data/search.json'), JSON.stringify(search));
// mirrored images and models live at their original paths. The dev server reads
// them straight from public/remote; pass --copy-remote for a deployable dist/.
if (process.argv.includes('--copy-remote')) {
  for (const d of fs.readdirSync(REMOTE)) copy(path.join(REMOTE, d), P('dist', d));
}

console.log(`built ${routes.length} pages → dist/  (modern ${stats.modern}, legacy ${stats.legacy}, special ${stats.special}); search index ${search.length}`);
