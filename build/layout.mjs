import { NAV, FOOTER, CONTACT, CERTS, ORIGIN } from './site.mjs';

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ext = (h) => /^https?:/.test(h);
const href = (h) => (ext(h) ? h : h.replace(/^([^#?]*?)\/?(#|\?|$)/, (m, p, t) => (p === '' ? '/' : p + '/') + t));
const a = (h, inner, cls = '') =>
  `<a href="${esc(href(h))}"${cls ? ` class="${cls}"` : ''}${ext(h) ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>`;

const LOGO = `<svg class="x-logo__mark" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg-m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--molten-2)"/><stop offset="1" stop-color="var(--molten)"/></linearGradient></defs><path d="M24 3 44 14.5v19L24 45 4 33.5v-19Z" fill="none" stroke="url(#lg-m)" stroke-width="2.4"/><path d="M14 33 24 13l10 20M18.5 25h11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/></svg>`;

export const logo = (cls = '') =>
  `<a class="x-logo ${cls}" href="/" aria-label="Allmarc Industries, home">${LOGO}<span class="x-logo__word">ALLMARC<small>Industries</small></span></a>`;

function megaMenu() {
  return NAV.map((n, i) => `
    <li class="x-nav__item" data-mega="${i}">
      ${a(n.href, `<span>${esc(n.label)}</span><i aria-hidden="true"></i>`, 'x-nav__top')}
      <div class="x-mega" role="region" aria-label="${esc(n.label)}">
        <div class="x-mega__in">
          <div class="x-mega__intro">
            <span class="x-mega__idx">0${i + 1} / 0${NAV.length}</span>
            <b>${esc(n.label)}</b>
            <p>${esc(n.blurb)}</p>
            ${a(n.href, `Explore ${esc(n.label)}<i></i>`, 'x-btn x-btn--ghost')}
          </div>
          <div class="x-mega__cols">
            ${n.cols.map(([h, links]) => `<div class="x-mega__col"><span>${esc(h)}</span><ul>${links.map(([t, u]) => `<li>${a(u, esc(t))}</li>`).join('')}</ul></div>`).join('')}
          </div>
          ${a(n.feature.href, `<span class="x-mega__img"><img src="${n.feature.img}" alt="" loading="lazy"></span><b>${esc(n.feature.title)}</b><em>Open →</em>`, 'x-mega__feat')}
        </div>
      </div>
    </li>`).join('');
}

function mobileMenu() {
  return `
  <div class="x-drawer" id="x-drawer" aria-hidden="true">
    <div class="x-drawer__in">
      ${NAV.map((n, i) => `
        <details class="x-drawer__grp">
          <summary><small>0${i + 1}</small>${esc(n.label)}<i></i></summary>
          <div>${a(n.href, `Overview →`, 'x-drawer__ov')}${n.cols.map(([h, links]) => `<span>${esc(h)}</span>${links.map(([t, u]) => a(u, esc(t))).join('')}`).join('')}</div>
        </details>`).join('')}
      <div class="x-drawer__foot">
        ${a('/projects', 'Projects')} ${a('/gallery', 'Gallery')} ${a('/blog', 'News')} ${a('/careers', 'Careers')}
        ${a('/contact', 'Send us a drawing<i></i>', 'x-btn')}
      </div>
    </div>
  </div>`;
}

function header() {
  return `
<header class="x-hdr" id="x-hdr">
  <div class="x-hdr__bar">
    ${logo()}
    <nav class="x-nav" aria-label="Main"><ul class="x-nav__list">${megaMenu()}<li class="x-nav__item x-nav__item--plain">${a('/projects', '<span>Projects</span>', 'x-nav__top')}</li></ul></nav>
    <div class="x-hdr__act">
      <button class="x-search-btn" type="button" aria-label="Search" data-search-open><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button>
      ${a('/contact', '<span>Send a drawing</span><i></i>', 'x-btn x-btn--sm x-hdr__cta')}
      <button class="x-burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="x-drawer"><span></span><span></span></button>
    </div>
  </div>
  <div class="x-hdr__progress"><i></i></div>
</header>
${mobileMenu()}
<div class="x-search" hidden>
  <div class="x-search__box">
    <label><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input type="search" placeholder="Search 230+ pages: flare stacks, moulds, Grip-Strut…" aria-label="Search the site"></label>
    <ol class="x-search__res"></ol>
    <button type="button" class="x-search__x" aria-label="Close search">Esc</button>
  </div>
</div>`;
}

function footer() {
  return `
<footer class="x-foot">
  <div class="x-foot__cta">
    <div class="x-foot__cta-in">
      <span class="x-label">Start a project</span>
      <h2 class="x-foot__big">Have a drawing?<br><em>Let us build it.</em></h2>
      <div class="x-foot__cta-act">
        ${a('/contact', 'Send us a drawing<i></i>', 'x-btn x-btn--lg')}
        <a class="x-btn x-btn--ghost x-btn--lg" href="tel:${CONTACT.phones[1].replace(/\s/g, '')}">${CONTACT.phones[1]}</a>
      </div>
    </div>
    <canvas class="x-foot__sparks" aria-hidden="true"></canvas>
  </div>
  <div class="x-foot__grid">
    <div class="x-foot__brand">
      ${logo('x-logo--foot')}
      <p>Heavy, structural and precision fabrication for oil &amp; gas, infrastructure and industry, from Kanbha, Ahmedabad. Since 2010.</p>
      <address>
        <b>Works</b>${esc(CONTACT.factory)}<br>
        <b>Sales office</b>${esc(CONTACT.office)}<br>
        ${CONTACT.emails.map((e) => `<a href="mailto:${e}">${e}</a>`).join(' · ')}<br>
        ${CONTACT.phones.map((p) => `<a href="tel:${p.replace(/\s/g, '')}">${p}</a>`).join(' · ')}
      </address>
      <ul class="x-foot__certs">${CERTS.map((c) => `<li>${c}</li>`).join('')}</ul>
    </div>
    ${FOOTER.map(([h, links]) => `<div class="x-foot__col"><span>${esc(h)}</span><ul>${links.map(([t, u]) => `<li>${a(u, esc(t))}</li>`).join('')}</ul></div>`).join('')}
  </div>
  <div class="x-foot__bottom">
    <span>© ${new Date().getFullYear()} Allmarc Industries Pvt Ltd</span>
    <span class="x-foot__social">${CONTACT.social.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}</span>
    <span>${a('/privacy-policy', 'Privacy')} ${a('/terms-condition', 'Terms')} ${a('/download-brochure', 'Brochure')}</span>
  </div>
  <div class="x-foot__word" aria-hidden="true">ALLMARC</div>
</footer>`;
}

// build id: appended to CSS/JS URLs so browsers can cache them for a year and still get fresh files after a rebuild
export const VER = Date.now().toString(36);
// above-the-fold 3D (cover model): fetch three.js and the model while the page parses
const preload3d = (body) => {
  const m = /class="x-cover__3d"[^>]*data-model="([^"]+)"|data-model="([^"]+)"[^>]*class="x-cover__3d"/.exec(body);
  if (!m) return '';
  return ['/assets/vendor/three/three.module.min.js', '/assets/js/three/core.js', '/assets/js/three/viewer.js', '/assets/vendor/three/jsm/loaders/GLTFLoader.js']
    .map((u) => `<link rel="modulepreload" href="${u}">`).join('\n') + `\n<link rel="preload" as="fetch" href="${m[1] || m[2]}" crossorigin>`;
};

export function page({ title, description, body, path, bodyClass = '', canonical }) {
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
<link rel="canonical" href="${esc(canonical || ORIGIN + path)}">
<meta name="theme-color" content="#f6f8fc">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/style.css?v=${VER}">
${preload3d(body)}
<script type="speculationrules">{"prefetch":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/*.*"}}]},"eagerness":"moderate"}]}</script>
<script type="importmap">{"imports":{"three":"/assets/vendor/three/three.module.min.js","three/addons/":"/assets/vendor/three/jsm/"}}</script>
<script>document.documentElement.classList.add('js');</script>
</head>
<body class="${bodyClass}" data-path="${esc(path)}">
<a class="x-skip" href="#main">Skip to content</a>
<div class="x-cursor" aria-hidden="true"><i></i><span></span></div>
${header()}
<main id="main" class="x-main">
${body}
</main>
${footer()}
<div class="x-modal" hidden><div class="x-modal__in"><button class="x-modal__x" type="button" aria-label="Close">×</button><div class="x-modal__body"></div></div></div>
<script src="/assets/vendor/gsap.min.js?v=${VER}" defer></script>
<script src="/assets/vendor/ScrollTrigger.min.js?v=${VER}" defer></script>
<script src="/assets/vendor/lenis.min.js?v=${VER}" defer></script>
<script type="module" src="/assets/js/main.js?v=${VER}"></script>
</body>
</html>`;
}
