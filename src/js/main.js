// Allmarc redesign: interaction layer. Every widget is progressive: the page
// reads fine without JS; this adds motion, filters, viewers and 3D.
import { paintIcons, paintProcs } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const doc = document.documentElement;

/* ---------------------------------------------------------------- smooth scroll */
let lenis = null;
function initScroll() {
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // nested scrollers keep native wheel
    $$('.x-show__tabs, .x-news2__list, .x-p3d__list, .x-search__res, .x-modal__in, .x-drawer, .x-rail').forEach((el) => el.setAttribute('data-lenis-prevent', ''));
  }
  if (window.gsap && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
}
export const scrollTo = (target, offset = -90) => (lenis ? lenis.scrollTo(target, { offset, duration: 1.4 }) : (typeof target === 'number' ? scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' })));

/* ---------------------------------------------------------------- header */
function initHeader() {
  const hdr = $('#x-hdr');
  if (!hdr) return;
  const bar = $('.x-hdr__progress', hdr);
  let last = 0, h = 1, queued = false;
  const measure = () => { h = doc.scrollHeight - innerHeight; };
  new ResizeObserver(measure).observe(document.body);
  const update = () => {
    queued = false;
    const y = scrollY;
    hdr.classList.toggle('is-solid', y > 30);
    hdr.classList.toggle('is-hidden', y > 300 && y > last + 2 && !hdr.classList.contains('is-open'));
    if (y < last - 2) hdr.classList.remove('is-hidden');
    last = y;
    bar.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  measure();
  onScroll();

  // current section
  const path = document.body.dataset.path || '/';
  $$('.x-nav__item').forEach((it) => {
    const a = $('.x-nav__top', it);
    const h = new URL(a.href, location.href).pathname;
    if (h !== '/' && path.startsWith(h)) it.classList.add('is-current');
  });

  // mega menu
  let openT, closeT, cur = null;
  const open = (it) => { if (cur === it) return; close(); cur = it; it.classList.add('is-open'); hdr.classList.add('is-open'); };
  const close = () => { if (!cur) return; cur.classList.remove('is-open'); hdr.classList.remove('is-open'); cur = null; };
  $$('.x-nav__item[data-mega]').forEach((it) => {
    it.addEventListener('mouseenter', () => { clearTimeout(closeT); clearTimeout(openT); openT = setTimeout(() => open(it), cur ? 0 : 110); });
    it.addEventListener('mouseleave', () => { clearTimeout(openT); closeT = setTimeout(close, 240); });
    it.addEventListener('focusin', () => open(it));
    $('.x-nav__top', it).addEventListener('click', (e) => { if (matchMedia('(hover: none)').matches && cur !== it) { e.preventDefault(); open(it); } });
  });
  addEventListener('keydown', (e) => e.key === 'Escape' && close());

  // drawer
  const burger = $('.x-burger'), drawer = $('#x-drawer');
  burger?.addEventListener('click', () => {
    const on = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', on);
    drawer.classList.toggle('is-open', on);
    drawer.setAttribute('aria-hidden', !on);
    hdr.classList.toggle('is-open', on);
    on ? lenis?.stop() : lenis?.start();
    document.body.style.overflow = on ? 'hidden' : '';
  });
}

/* ---------------------------------------------------------------- search */
function initSearch() {
  const box = $('.x-search');
  if (!box) return;
  const input = $('input', box), res = $('.x-search__res', box);
  let data = null, sel = 0;
  const show = async () => {
    box.hidden = false; lenis?.stop();
    setTimeout(() => input.focus(), 30);
    if (!data) data = await fetch('/assets/data/search.json').then((r) => r.json()).catch(() => []);
    render();
  };
  const hide = () => { box.hidden = true; lenis?.start(); };
  const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, ' ');
  const render = () => {
    const q = norm(input.value).trim().split(/\s+/).filter(Boolean);
    let list = data || [];
    if (q.length) {
      list = list.map((d) => {
        const hay = norm(d.t + ' ' + d.d + ' ' + d.s + ' ' + d.p);
        let s = 0;
        for (const w of q) { if (!hay.includes(w)) return null; s += norm(d.t).includes(w) ? 3 : 1; }
        return [s, d];
      }).filter(Boolean).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    } else list = list.filter((d) => d.p.split('/').length <= 3);
    sel = 0;
    res.innerHTML = list.slice(0, 40).map((d, i) => `<li><a href="${d.p}"${i === 0 ? ' class="is-sel"' : ''}><small>${d.s}</small><b>${d.t}</b>${d.d ? `<span>${d.d}</span>` : ''}</a></li>`).join('') || '<li class="x-search__none">Nothing found. Try “flare”, “mould” or “Grip-Strut”.</li>';
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    const items = $$('a', res);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.classList.toggle('is-sel', i === sel));
      items[sel]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && items[sel]) location.href = items[sel].href;
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-search-open]')) show(); });
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.x-search__x')) hide(); });
  addEventListener('keydown', (e) => {
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { e.preventDefault(); show(); }
    if (e.key === 'Escape' && !box.hidden) hide();
  });
}

/* ---------------------------------------------------------------- reveals */
function splitWords(el) {
  if (el.dataset.split) return;
  el.dataset.split = '1';
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w, k) => {
          if (!w) return;
          // punctuation glued to a preceding <em>/<b> stays on that word's line
          const prev = n.previousSibling;
          if (k === 0 && /^[.,;:!?)’”]+$/.test(w) && prev?.classList?.contains('x-split-line')) return (prev.firstChild.lastElementChild || prev.firstChild).append(w);
          if (/^\s+$/.test(w)) return frag.append(' ');
          const o = document.createElement('span'); o.className = 'x-split-line';
          const s = document.createElement('span'); s.style.setProperty('--i', i++); s.textContent = w;
          o.append(s); frag.append(o);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        if (n.matches('em, b, strong, a, span:not(.x-split-line)')) {
          const o = document.createElement('span'); o.className = 'x-split-line';
          const s = document.createElement('span'); s.style.setProperty('--i', i++);
          n.replaceWith(o); s.append(n); o.append(s);
        } else walk(n);
      }
    });
  };
  walk(el);
}

function initReveals() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  $$('.x-h1, .x-h2, .x-foot__big, .x-stage__step h2').forEach((h) => { if (!reduce) splitWords(h); io.observe(h); });
  const groups = [
    '.x-label', '.x-lead', '.x-cols', '.x-metric', '.x-card', '.x-nx-card', '.x-unit', '.x-cert', '.x-tile', '.x-chain__i', '.x-ind-tile', '.x-cs-tile', '.x-supply__card',
    '.x-exports__list > li', '.x-msteps > li', '.x-acc', '.x-feature__media', '.x-quote', '.x-spot__body', '.x-show__stage', '.x-news2__stage', '.x-news__grid',
    '.x-portal-band__act', '.x-space', '.x-car-role', '.x-doc', '.x-contact__card', '.x-form', '.x-car-form', '.x-lg__fig', '.x-prose > *', '.x-cs__facts', '.x-cs__cols', '.x-cs__how',
    '.x-cs__result', '.x-cs__gallery', '.x-ind-plants > div', '.x-plant__facts', '.x-sizes__in', '.x-clip', '.x-art__body > *', '.x-art__side', '.x-rail__i', '.x-mline__order', '.x-tunnel__media figure', '.x-specs li',
  ].join(',');
  $$(groups).forEach((el) => {
    if (el.closest('.x-hero, .x-mega, .x-drawer, .x-modal, .x-stage__steps, .x-show__slide') || el.closest('[data-rv]')) return;
    el.setAttribute('data-rv', '');
    const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(groups)) : [];
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 8));
    io.observe(el);
  });
  // a fully clipped element never intersects, so watch its parent and open the clip from there
  const clipIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.__clip.forEach((c) => c.classList.add('is-in')); clipIO.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('.x-feature__media img, .x-spot__media, .x-unit__media, .x-lg__fig').forEach((el) => {
    if (el.hasAttribute('data-rv')) return;
    el.setAttribute('data-rv', 'clip');
    const p = el.parentElement; (p.__clip ||= []).push(el); clipIO.observe(p);
  });
  // items in horizontal rails sit off-screen sideways; reveal them with their rail
  $$('.x-rail').forEach((r) => { const ri = new IntersectionObserver(([e]) => { if (e.isIntersecting) { $$('[data-rv]', r).forEach((c) => c.classList.add('is-in')); ri.disconnect(); } }); ri.observe(r); });
  $$('.x-cover, .x-ind-hero, .x-art__head, .x-nx-hero').forEach((el) => setTimeout(() => el.classList.add('is-in'), 80));

  // parallax on large media
  if (window.gsap && window.ScrollTrigger && !reduce) {
    const g = window.gsap;
    $$('.x-cover--photo .x-cover__media').forEach((m) => g.to(m, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: m.parentElement, start: 'top top', end: 'bottom top', scrub: true } }));
    $$('.x-spot__media img').forEach((m) => g.fromTo(m, { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: m.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    $$('.x-film__frame > video').forEach((m) => g.fromTo(m, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: m.parentElement, start: 'top bottom', end: 'center center', scrub: true } }));
    $$('.x-foot__word').forEach((m) => g.fromTo(m, { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom bottom', scrub: true } }));
  }
}

/* ---------------------------------------------------------------- counters */
function initCounters() {
  const fmt = (n, dec) => n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.xCount), suf = el.dataset.suf || '', pre = el.dataset.pre || '', dec = +(el.dataset.dec || (String(to).split('.')[1] || '').length);
    if (reduce) { el.textContent = pre + fmt(to, dec) + suf; return; }
    const t0 = performance.now(), dur = 1800;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur), v = to * (1 - Math.pow(1 - k, 4));
      el.textContent = pre + fmt(v, dec) + suf;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.4 });
  $$('[data-x-count]').forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------- videos */
function initVideos() {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.src && v.dataset.src) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  }), { rootMargin: '200px 0px' });
  $$('video[data-src]:not(.x-hero__vid), video[autoplay]:not(.x-hero__vid)').forEach((v) => { v.muted = true; v.playsInline = true; io.observe(v); });
}

/* ---------------------------------------------------------------- home film stage */
function initReel() {
  const hero = $('[data-hero]');
  if (!hero) return;
  const vids = $$('.x-hero__vid', hero), slides = $$('.x-hero__slide', hero), btns = $$('.x-hero__nav button', hero), pause = $('.x-hero__pause', hero);
  const DUR = 8000;
  let i = 0, elapsed = 0, paused = false, visible = true, last = performance.now();
  // words rise one after another when a slide comes in
  slides.forEach((s) => {
    const h = $('.x-hero__title', s); let k = 0;
    [...h.childNodes].forEach((n) => {
      const wrap = (node) => { const o = document.createElement('span'); o.className = 'x-hero__w'; const inner = document.createElement('span'); inner.style.setProperty('--k', k++); inner.append(node); o.append(inner); return o; };
      if (n.nodeType === 3) { const f = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach((w) => { if (!w) return; f.append(/^\s+$/.test(w) ? ' ' : wrap(document.createTextNode(w))); }); n.replaceWith(f); }
      else if (n.nodeType === 1) { const ph = document.createComment(''); n.replaceWith(ph); ph.replaceWith(wrap(n)); }
    });
  });
  const load = (v) => { if (v && !v.src && v.dataset.heroSrc) { if (v.dataset.poster) v.poster = v.dataset.poster; v.src = v.dataset.heroSrc; v.preload = 'auto'; } };
  const play = () => { const v = vids[i]; if (v && visible && !paused) v.play().catch(() => {}); };
  const go = (n) => {
    i = (n + slides.length) % slides.length; elapsed = 0;
    vids.forEach((v, k) => { v.classList.toggle('is-on', k === i); if (k !== i) setTimeout(() => !v.classList.contains('is-on') && v.pause(), 1200); });
    load(vids[i]); if (vids[i]) vids[i].currentTime = 0; play();
    load(vids[(i + 1) % vids.length]);
    slides.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.toggleAttribute('aria-hidden', k !== i); const a = $('a', s); if (a) a.tabIndex = k === i ? 0 : -1; });
    btns.forEach((b, k) => { b.toggleAttribute('aria-current', k === i); if (k === i) b.setAttribute('aria-current', 'true'); b.style.setProperty('--p', 0); });
  };
  // progress runs only while the film plays and the hero is on screen
  const tick = (t) => {
    const dt = t - last; last = t;
    if (!paused && visible && !document.hidden && !reduce) {
      elapsed += dt;
      btns[i]?.style.setProperty('--p', Math.min(1, elapsed / DUR));
      if (elapsed >= DUR) go(i + 1);
    }
    raf = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
  };
  let raf = requestAnimationFrame(tick);
  const wake = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', wake);
  btns.forEach((b, k) => b.addEventListener('click', () => go(k)));
  $('.x-hero__nav', hero).addEventListener('keydown', (e) => {
    if (!/Arrow(Left|Right)/.test(e.key)) return;
    go(i + (e.key === 'ArrowRight' ? 1 : -1)); btns[i].focus();
  });
  pause?.addEventListener('click', () => {
    paused = !paused;
    pause.setAttribute('aria-pressed', paused); pause.setAttribute('aria-label', paused ? 'Play the film' : 'Pause the film');
    hero.classList.toggle('is-paused', paused);
    paused ? vids[i]?.pause() : play();
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { play(); wake(); } else vids[i]?.pause(); }).observe(hero);
  if (reduce) { paused = true; hero.classList.add('is-paused'); pause?.setAttribute('aria-pressed', 'true'); }
  go(0);
  requestAnimationFrame(() => hero.classList.add('is-ready'));
}

/* ---------------------------------------------------------------- tabs (show) */
function initShows() {
  $$('.x-show').forEach((sec, si) => {
    const tabs = $$('.x-show__tab', sec), slides = $$('.x-show__slide', sec);
    if (!tabs.length) return;
    const dur = +(sec.dataset.interval || 6500);
    sec.style.setProperty('--dur', dur / 1000 + 's');
    let i = 0, t, paused = false, seen = false;
    tabs.forEach((b, k) => { b.id = `show${si}-t${k}`; b.setAttribute('aria-controls', `show${si}-p${k}`); if (slides[k]) { slides[k].id = `show${si}-p${k}`; slides[k].setAttribute('aria-labelledby', b.id); } });
    const go = (n, user) => {
      i = (n + tabs.length) % tabs.length;
      tabs.forEach((b, k) => { b.setAttribute('aria-selected', 'false'); b.tabIndex = k === i ? 0 : -1; });
      void tabs[i].offsetWidth;
      tabs[i].setAttribute('aria-selected', 'true');
      slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
      const box = tabs[i].parentElement;
      if (box.scrollWidth > box.clientWidth + 4) box.scrollTo({ left: tabs[i].offsetLeft - 20, behavior: 'smooth' });
      if (user) { paused = true; sec.classList.add('is-paused'); }
      clearTimeout(t);
      if (!paused && seen) t = setTimeout(() => go(i + 1), dur);
    };
    tabs.forEach((b, k) => {
      b.addEventListener('click', () => go(k, true));
      b.addEventListener('keydown', (e) => { if (/Arrow(Down|Right)/.test(e.key)) { e.preventDefault(); go(i + 1, true); tabs[i].focus(); } if (/Arrow(Up|Left)/.test(e.key)) { e.preventDefault(); go(i - 1, true); tabs[i].focus(); } });
    });
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen && !paused) go(i); else clearTimeout(t); }, { threshold: 0.3 }).observe(sec);
    go(0);
    sec.xGo = (k) => go(k, true);
  });
  // chain links → segment tab
  $$('[data-x-tab]').forEach((a) => a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.xGo?.(+a.dataset.xTab);
    scrollTo(target);
  }));
}

/* ---------------------------------------------------------------- filters */
function initFilters() {
  // careers roles
  $$('.x-cards__filter').forEach((bar) => {
    const scope = bar.closest('.x-sec');
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-f]'); if (!b) return;
      $$('button', bar).forEach((x) => x.setAttribute('aria-pressed', x === b));
      const f = b.dataset.f;
      $$('[data-cat]', scope).forEach((el) => (el.hidden = !(f === '*' || f === 'all' || el.dataset.cat.split(/\s+/).includes(f))));
    });
  });

  // pagination for long card grids
  $$('[data-per-page]').forEach((sec) => {
    const per = +sec.dataset.perPage, grid = $('.x-cards__grid', sec) || $('.x-cs-grid', sec);
    const pager = $('.x-pager', sec);
    if (!grid || !pager) return;
    const items = [...grid.children];
    const nums = $('.x-pager__nums', pager), next = $('.x-pager__next', pager);
    let page = 0;
    const pages = () => Math.ceil(items.filter((x) => !x.dataset.off).length / per);
    const draw = () => {
      const vis = items.filter((x) => !x.dataset.off);
      items.forEach((x) => (x.hidden = true));
      vis.slice(page * per, page * per + per).forEach((x) => (x.hidden = false));
      const n = pages();
      nums.innerHTML = Array.from({ length: n }, (_, k) => `<button type="button" data-p="${k}"${k === page ? ' aria-current="page"' : ''}>${String(k + 1).padStart(2, '0')}</button>`).join('');
      pager.hidden = n <= 1;
      next.disabled = page >= n - 1;
    };
    nums.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { page = +b.dataset.p; draw(); scrollTo(grid, -140); } });
    next.addEventListener('click', () => { page = Math.min(page + 1, pages() - 1); draw(); scrollTo(grid, -140); });
    sec.xRefilter = (pred) => { items.forEach((x) => (x.dataset.off = pred(x) ? '' : '1')); items.forEach((x) => { if (!x.dataset.off) delete x.dataset.off; }); page = 0; draw(); };
    draw();
  });

  // blog grid: chips + search + show more
  $$('.x-nx').forEach((sec) => {
    const cards = $$('.x-nx-card', sec), input = $('.x-nx__search input', sec), more = $('.x-nx__more', sec), none = $('.x-nx__none', sec);
    let k = 'all', limit = 12;
    const apply = () => {
      const q = (input?.value || '').toLowerCase().trim();
      const hits = cards.filter((c) => (k === 'all' || c.dataset.k === k) && (!q || (c.dataset.q || c.textContent.toLowerCase()).includes(q)));
      cards.forEach((c) => (c.hidden = true));
      hits.slice(0, limit).forEach((c) => (c.hidden = false));
      if (more) more.hidden = hits.length <= limit;
      if (none) none.hidden = hits.length > 0;
    };
    $('.x-nx__chips', sec)?.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]'); if (!b) return;
      $$('.x-nx__chips button', sec).forEach((x) => x.setAttribute('aria-pressed', x === b));
      k = b.dataset.k; limit = 12; apply();
    });
    input?.addEventListener('input', () => { limit = 12; apply(); });
    more?.addEventListener('click', () => { limit += 12; apply(); });
    apply();
  });

  // blog featured slider
  $$('.x-nx-feat').forEach((f) => {
    const slides = $$('.x-nx-feat__slide', f), dots = $$('.x-nx-feat__dots button', f);
    let i = 0, t;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
      dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
      clearTimeout(t); t = setTimeout(() => go(i + 1), 6500);
    };
    dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    f.addEventListener('mouseenter', () => clearTimeout(t));
    f.addEventListener('mouseleave', () => go(i));
    go(0);
  });

  // home news widget
  $$('.x-news2').forEach((sec) => {
    let data = [];
    try { data = JSON.parse($('.x-news2__data', sec)?.textContent || '[]'); } catch {}
    const feat = $('.x-news2__feature', sec), list = $$('.x-news2__list li', sec);
    let i = 0, t;
    const show = (n) => {
      const vis = list.filter((li) => !li.hidden);
      if (!vis.length) return;
      const li = vis[(n + vis.length) % vis.length], b = $('button', li), d = data[+b.dataset.i];
      i = vis.indexOf(li);
      list.forEach((x) => $('button', x).removeAttribute('aria-current'));
      void b.offsetWidth; b.setAttribute('aria-current', 'true');
      if (d && feat) {
        feat.href = d.h;
        const img = $('.x-news2__img img', feat);
        img.style.opacity = 0.2;
        const pre = new Image(); pre.onload = () => { img.src = d.i; img.style.opacity = 1; }; pre.src = d.i;
        $('.x-news2__meta', feat).innerHTML = `<em>${d.c}</em><span>${d.m} min read</span>`;
        $('.x-news2__title', feat).textContent = d.t;
        $('.x-news2__ex', feat).textContent = d.e;
      }
      clearTimeout(t); t = setTimeout(() => show(i + 1), 6000);
    };
    list.forEach((li) => $('button', li).addEventListener('click', () => show(list.filter((x) => !x.hidden).indexOf(li))));
    $('.x-news2__chips', sec)?.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-c]'); if (!b) return;
      $$('.x-news2__chips button', sec).forEach((x) => x.setAttribute('aria-pressed', x === b));
      list.forEach((li) => (li.hidden = !(b.dataset.c === 'All' || li.dataset.c === b.dataset.c)));
      show(0);
    });
    new IntersectionObserver(([e]) => (e.isIntersecting ? show(i) : clearTimeout(t)), { threshold: 0.2 }).observe(sec);
  });

  // gallery
  $$('.x-gal').forEach((sec) => {
    const items = $$('.x-gal__i', sec);
    $('.x-gal__chips', sec)?.addEventListener('click', (e) => {
      const b = e.target.closest('.x-gal__chip'); if (!b) return;
      $$('.x-gal__chip', sec).forEach((x) => x.classList.toggle('is-on', x === b));
      items.forEach((it) => (it.hidden = !(b.dataset.f === 'all' || it.dataset.cat === b.dataset.f)));
    });
    sec.addEventListener('click', (e) => {
      const b = e.target.closest('.x-gal__btn'); if (!b) return;
      const vis = items.filter((x) => !x.hidden).map((x) => {
        const v = $('video', x), im = $('img', x);
        return { type: v ? 'video' : 'img', src: v ? v.dataset.src || v.src : im.src, poster: v?.poster, cap: $('figcaption b', x)?.textContent || '' };
      });
      lightbox(vis, items.filter((x) => !x.hidden).indexOf(b.closest('.x-gal__i')));
    });
  });

  // drag-scroll rails
  $$('.x-rail').forEach((r) => {
    let down = false, sx = 0, sl = 0, moved = false;
    r.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = r.scrollLeft; });
    addEventListener('pointerup', () => { down = false; r.classList.remove('is-drag'); });
    r.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; r.classList.add('is-drag'); } r.scrollLeft = sl - dx; });
    r.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
  });
}

/* ---------------------------------------------------------------- modal + lightbox */
const modal = () => $('.x-modal');
function openModal(html, cls = '') {
  const m = modal(); if (!m) return;
  m.className = 'x-modal ' + cls;
  $('.x-modal__body', m).innerHTML = html;
  m.hidden = false; lenis?.stop(); document.body.style.overflow = 'hidden';
  $('.x-modal__x', m).focus();
  $$('video', m).forEach((v) => v.play().catch(() => {}));
}
function closeModal() {
  const m = modal(); if (!m || m.hidden) return;
  $$('video', m).forEach((v) => v.pause());
  m.hidden = true; $('.x-modal__body', m).innerHTML = ''; lenis?.start(); document.body.style.overflow = '';
}
function lightbox(items, start = 0) {
  let i = start;
  const draw = () => {
    const it = items[i];
    const media = it.type === 'video' ? `<video src="${it.src}" ${it.poster ? `poster="${it.poster}"` : ''} controls autoplay playsinline></video>` : `<img src="${it.src}" alt="${(it.cap || '').replace(/"/g, '&quot;')}">`;
    openModal(`<div class="x-modal__media">${media}</div><div class="x-modal__cap"><span>${it.cap || ''} <small style="color:var(--dim)">· ${i + 1} / ${items.length}</small></span>${items.length > 1 ? '<span class="x-modal__nav"><button type="button" data-nav="-1" aria-label="Previous">‹</button><button type="button" data-nav="1" aria-label="Next">›</button></span>' : ''}</div>`, 'x-modal--media');
  };
  const onNav = (e) => { const b = e.target.closest('[data-nav]'); if (b) { i = (i + +b.dataset.nav + items.length) % items.length; draw(); } };
  const onKey = (e) => { if (modal().hidden) return off(); if (e.key === 'ArrowRight') { i = (i + 1) % items.length; draw(); } if (e.key === 'ArrowLeft') { i = (i - 1 + items.length) % items.length; draw(); } };
  const off = () => { modal().removeEventListener('click', onNav); removeEventListener('keydown', onKey); };
  modal().addEventListener('click', onNav); addEventListener('keydown', onKey);
  draw();
}
function initModals() {
  const m = modal(); if (!m) return;
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.x-modal__x')) closeModal(); });
  addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());

  // company film
  $$('.x-film').forEach((f) => $('.x-film__play', f)?.addEventListener('click', () => {
    const v = $('video', f);
    openModal(`<div class="x-modal__media"><video src="${v.dataset.src || v.src}" controls autoplay playsinline></video></div>`, 'x-modal--media');
  }));

  // project detail
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x-project]'); if (!b) return;
    e.preventDefault();
    let p; try { p = JSON.parse(b.dataset.xProject); } catch { return; }
    const media = [p.vid ? `<video src="${p.vid}" controls muted autoplay loop playsinline></video>` : '', ...(p.imgs || []).map((s) => `<img src="${s}" alt="" loading="lazy">`)].join('');
    const st = { live: 'Ongoing', done: 'Delivered', build: 'Under execution' }[p.st] || p.st || '';
    openModal(`<div class="x-proj"><div class="x-proj__media">${media}</div><div class="x-proj__body"><span class="x-label">${p.sec || 'Project'}</span><h3>${p.t}</h3><p class="x-muted">${p.s || ''}</p><dl>${p.c ? `<dt>Client / where</dt><dd>${p.c}</dd>` : ''}${p.q ? `<dt>Scale</dt><dd>${p.q}</dd>` : ''}${st ? `<dt>Status</dt><dd>${st}</dd>` : ''}</dl>${p.h ? `<p style="margin-top:24px"><a class="x-btn" href="${p.h}">Read the case study<i></i></a></p>` : ''}</div></div>`);
  });

  // inline images in case studies & articles → lightbox
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.x-cs__gallery img, .x-article .x-prose figure img, .x-art__slides img, .x-lg__fig img');
    if (!img) return;
    const group = $$('img', img.closest('.x-cs__gallery, .x-prose, .x-art__slides, .x-lg__media') || img.parentElement);
    lightbox(group.map((g) => ({ type: 'img', src: g.src, cap: g.alt })), group.indexOf(img));
  });
}

/* ---------------------------------------------------------------- small widgets */
function initMisc() {
  paintIcons(); paintProcs();
  // machine popovers
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.x-how__m'); if (!b) return;
    const it = b.closest('.x-how__i'), on = !it.classList.contains('is-open');
    $$('.x-how__i.is-open', it.closest('.x-how')).forEach((x) => { x.classList.remove('is-open'); $('.x-how__m', x).setAttribute('aria-expanded', 'false'); });
    it.classList.toggle('is-open', on); b.setAttribute('aria-expanded', on);
  });
  // onclick links from legacy markup
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-href]'); if (el && !e.target.closest('a')) location.href = el.dataset.href; });
  // enquiry links prefill the contact form
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-x-enquire], a[data-x-role]'); if (!a) return;
    if (a.dataset.xRole) { const sel = $('.x-car-form select[name="role"]'); if (sel) sel.value = a.dataset.xRole; return; }
    e.preventDefault();
    location.href = '/contact/?enquiry=' + encodeURIComponent(a.dataset.xEnquire || '') + '&from=' + encodeURIComponent(location.pathname);
  });
  // smooth in-page anchors
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.dataset.xTab != null) return;
    const t = a.getAttribute('href').length > 1 && document.getElementById(a.getAttribute('href').slice(1));
    if (t) { e.preventDefault(); scrollTo(t); history.replaceState(null, '', a.getAttribute('href')); }
  });
  // accordions: one open at a time inside .x-acc
  $$('.x-acc').forEach((acc) => acc.addEventListener('toggle', (e) => { if (e.target.open) $$('details[open]', acc).forEach((d) => d !== e.target && (d.open = false)); }, true));
}

/* ---------------------------------------------------------------- forms */
function initForms() {
  const validate = (form) => {
    let ok = true;
    $$('[required]', form).forEach((f) => {
      const bad = f.type === 'file' ? !f.files.length : !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
      (f.closest('.x-field') || f.closest('label'))?.classList.toggle('is-bad', bad);
      if (bad && ok) { f.focus(); ok = false; }
    });
    return ok;
  };
  const contact = $('[data-x-contact]');
  if (contact) {
    const q = new URLSearchParams(location.search);
    if (q.get('enquiry')) contact.message.value = q.get('enquiry') + (q.get('from') ? `\n(From: ${location.origin}${q.get('from')})\n\n` : '\n\n');
    contact.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = $('.x-form__note', contact);
      if (!validate(contact)) { note.textContent = 'Please fill in the highlighted fields.'; note.classList.remove('is-ok'); return; }
      const d = Object.fromEntries(new FormData(contact));
      const body = `Name: ${d.name}\nCompany: ${d.company}\nPhone: ${d.phone}\nEmail: ${d.email}\n\n${d.message}`;
      location.href = `mailto:sales@allmarcindia.com?cc=info@allmarcindia.com&subject=${encodeURIComponent('Enquiry from ' + d.name + (d.company ? ' · ' + d.company : ''))}&body=${encodeURIComponent(body)}`;
      note.textContent = 'Your email app is opening with the message ready to send. Our team replies within 24 hours.';
      note.classList.add('is-ok');
    });
  }
  const car = $('[data-x-careers]');
  if (car) {
    $('input[type="file"]', car)?.addEventListener('change', (e) => { const s = $('.x-car-file b', car); if (s && e.target.files[0]) s.textContent = e.target.files[0].name; });
    car.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = $('.x-car-form__err', car) || car.appendChild(Object.assign(document.createElement('p'), { className: 'x-car-form__err' }));
      if (!validate(car)) { err.textContent = 'Please fill in the highlighted fields.'; return; }
      const d = Object.fromEntries(new FormData(car));
      const body = `Role: ${d.role}\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone}\nCity: ${d.city || ''}\nExperience: ${d.exp || ''} years\nNotice: ${d.notice || ''}\n\n${d.about || ''}\n\n(Please attach your CV to this email.)`;
      location.href = `mailto:info@allmarcindia.com?subject=${encodeURIComponent('Application: ' + d.role + ' · ' + d.name)}&body=${encodeURIComponent(body)}`;
      err.textContent = 'Your email app is opening. Attach your CV and send.';
      err.style.color = '#15803d';
    });
  }
}

/* ---------------------------------------------------------------- cursor, magnet, tilt */
function initPointer() {
  if (!fine || reduce) return;
  const c = $('.x-cursor'); if (!c) return;
  const dot = $('i', c), ring = $('span', c);
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  let raf = 0;
  const loop = () => {
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    dot.style.translate = `${x}px ${y}px`; ring.style.translate = `${rx}px ${ry}px`;
    raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.3 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; if (!c.classList.contains('is-on')) { rx = e.clientX; ry = e.clientY; c.classList.add('is-on'); } x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => c.classList.remove('is-on'));
  document.addEventListener('pointerover', (e) => {
    c.classList.toggle('is-link', !!e.target.closest('a, button, summary, [role="tab"], label.x-car-file'));
    c.classList.toggle('is-drag', !!e.target.closest('canvas'));
  });
  // magnetic buttons
  $$('.x-btn, .x-space__btn, .x-film__play b').forEach((b) => {
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`; });
    b.addEventListener('pointerleave', () => (b.style.transform = ''));
  });
  // card tilt
  $$('.x-card, .x-ind-tile, .x-doc, .x-cs-tile').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg) translateY(-6px)`;
    });
    card.addEventListener('pointerleave', () => (card.style.transform = ''));
  });
}

/* ---------------------------------------------------------------- page transitions */
function initTransitions() {
  const wipe = $('.x-wipe'); if (!wipe || reduce) return; // legacy wipe markup only; pages now cross-fade via @view-transition
  doc.classList.add('is-entering');
  requestAnimationFrame(() => requestAnimationFrame(() => { doc.classList.remove('is-entering'); doc.classList.add('is-entered'); }));
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || /\.(pdf|jpe?g|png|webp|mp4|glb)$/i.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.hash) return;
    e.preventDefault();
    doc.classList.remove('is-entered');
    wipe.classList.add('is-on');
    setTimeout(() => (location.href = u.href), 620);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) wipe.classList.remove('is-on'); });
}

/* ---------------------------------------------------------------- footer sparks */
function initSparks() {
  const cv = $('.x-foot__sparks'); if (!cv || reduce) return;
  const ctx = cv.getContext('2d');
  let w, h, ps = [], on = false;
  const size = () => { const r = cv.getBoundingClientRect(); w = cv.width = r.width * devicePixelRatio; h = cv.height = r.height * devicePixelRatio; };
  const spawn = () => ({ x: w * (0.3 + Math.random() * 0.4), y: h + 10, vx: (Math.random() - 0.5) * 3 * devicePixelRatio, vy: -(2 + Math.random() * 5) * devicePixelRatio, life: 1, s: (0.6 + Math.random() * 1.8) * devicePixelRatio });
  const loop = () => {
    if (!on) return;
    ctx.clearRect(0, 0, w, h);
    if (ps.length < 140) for (let i = 0; i < 3; i++) ps.push(spawn());
    ps = ps.filter((p) => p.life > 0);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.035 * devicePixelRatio; p.life -= 0.008;
      ctx.strokeStyle = `rgba(255,${120 + p.life * 100 | 0},40,${p.life})`;
      ctx.lineWidth = p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); ctx.stroke();
    }
    requestAnimationFrame(loop);
  };
  size(); addEventListener('resize', size);
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) loop(); }).observe(cv);
}

/* ---------------------------------------------------------------- 3D (lazy) */
function initThree() {
  const lazy = (sel, mod, margin = '300px') => {
    const els = $$(sel); if (!els.length) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      import(mod).then((m) => m.default(e.target, { lenis, scrollTo })).catch((err) => console.warn('3D module failed', mod, err));
    }), { rootMargin: margin });
    els.forEach((el) => io.observe(el));
  };
  lazy('.x-hero__gl', './three/hero.js', '0px');
  lazy('.x-cover__3d[data-model]', './three/cover.js', '0px');
  lazy('.x-3d[data-x-model]', './three/mini.js');
  lazy('.x-stage[data-model]', './three/stage.js', '600px');
  lazy('.x-p3d[data-scenes]', './three/scene.js', '400px');
  lazy('[data-x-plant]', './three/campus.js', '400px');
}

/* ---------------------------------------------------------------- boot */
function boot() {
  initScroll();
  initHeader();
  initSearch();
  initMisc();
  initReveals();
  initCounters();
  initVideos();
  initReel();
  initShows();
  initFilters();
  initModals();
  initForms();
  initPointer();
  initTransitions();
  initSparks();
  initThree();
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => scrollTo(t), 400); }
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
